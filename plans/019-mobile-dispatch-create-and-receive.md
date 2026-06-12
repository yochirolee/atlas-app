# Plan 019: Mobile dispatch flows — one-call batch create + hardened smart-receive

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 21371e2..HEAD -- src/routes/dispatch.routes.ts src/controllers/dispatch.controller.ts src/repositories/dispatch.repository.ts src/services/dispatch.services.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED (touches the dispatch creation flow used by the web app; mitigated by keeping existing endpoints untouched in behavior)
- **Depends on**: none hard. **Coordinate with** plans 003, 015, 016 (they edit the same controller/repository files — land sequentially, not in parallel).
- **Category**: direction
- **Planned at**: commit `21371e2`, 2026-06-11

## Why this matters

The mobile app (agency/warehouse staff) needs to create dispatches and receive
dispatches. The backend already has both flows for the web app, but they are
mobile-hostile in two ways:

1. **Creation is chatty**: web does `POST /dispatches` (DRAFT) → one
   `POST /dispatches/:id/add-by-scan` HTTP call **per scanned parcel** →
   `POST /dispatches/:id/finalize-create`. On a warehouse floor with flaky
   connectivity, the mobile app scans offline into a local queue and needs to
   sync **one batch request** that creates and finalizes the dispatch in a
   single call. The repository function for this (`createDispatchFromParcels`)
   already exists; its route is commented out and it never finalizes
   (no receiver, no pricing).
2. **Reception** already has a batch endpoint (`POST /dispatches/smart-receive`)
   that handles every scenario (full, partial, surplus, no-dispatch) and is
   safe to retry — but its body is unvalidated (`body: any`, manual checks
   only) and accepts duplicates and unbounded arrays.

After this plan: mobile creates a dispatch with one authenticated POST of
tracking numbers (receiver defaults to the parent agency, exactly like the web
finalize step), and `smart-receive` rejects malformed/oversized payloads via
the repo's standard Zod `validate` middleware. The interactive web endpoints
keep working unchanged — online mobile clients may also use them.

Product decisions already made by the maintainer (do not re-ask):

- Create = batch endpoint (create + finalize in one call) **and** keep the
  interactive endpoints for online use. Receive = reuse `smart-receive`.
- Users are agency staff with their existing roles → plain `authMiddleware`,
  same as the other dispatch routes. No new policies.
- No GPS / photo proof on dispatch operations.

## Current state

Files (all paths from repo root):

- `src/routes/dispatch.routes.ts` — dispatch routes. The batch-create route is
  commented out; `smart-receive` has no `validate` middleware:

```47:57:src/routes/dispatch.routes.ts
// POST /dispatches/from-parcels - Create dispatch from scanned parcels
// MUST be before /:id routes
//router.post("/from-parcels", authMiddleware, dispatchController.createFromParcels);

// POST /dispatches/receive-parcels - Receive parcels without prior dispatch
// Groups by sender agency and creates RECEIVED dispatches
//router.post("/receive-parcels", authMiddleware, dispatchController.receiveParcelsWithoutDispatch);

// POST /dispatches/smart-receive - Intelligent parcel reception (RECOMMENDED)
// Handles all scenarios: new dispatches, pending dispatches, and existing dispatches
router.post("/smart-receive", authMiddleware, dispatchController.smartReceive);
```

- `src/controllers/dispatch.controller.ts` — dispatch controller.
  `createFromParcels` (lines 347–362) calls the repo but never finalizes:

```347:362:src/controllers/dispatch.controller.ts
   createFromParcels: async (req: DispatchRequest, res: Response): Promise<void> => {
      const user = req.user!;
      const { tracking_numbers } = req.body;

      if (!user.agency_id) {
         throw new AppError(HttpStatusCodes.BAD_REQUEST, "User must be associated with an agency");
      }

      if (!Array.isArray(tracking_numbers) || tracking_numbers.length === 0) {
         throw new AppError(HttpStatusCodes.BAD_REQUEST, "tracking_numbers array is required");
      }

      const result = await repository.dispatch.createDispatchFromParcels(tracking_numbers, user.agency_id, user.id);

      res.status(201).json(result);
   },
```

  The receiver-resolution logic the batch flow must reuse lives inline in
  `finalizeCreate` (lines 545–596). Core of it:

```559:587:src/controllers/dispatch.controller.ts
      // Determine receiver agency: use provided value or default to sender's parent agency
      let receiverAgencyId: number;

      if (requestedReceiverId) {
         // Validate that requested receiver agency exists
         const receiverAgency = await repository.agencies.getById(requestedReceiverId);
         if (!receiverAgency) {
            throw new AppError(HttpStatusCodes.NOT_FOUND, `Receiver agency with id ${requestedReceiverId} not found`);
         }
         receiverAgencyId = requestedReceiverId;
      } else {
         // Default to parent agency of the SENDER (dispatch.sender_agency_id), not the user's agency
         const parentAgency = await repository.agencies.getParent(dispatch.sender_agency_id);
         if (!parentAgency) {
            throw new AppError(
               HttpStatusCodes.BAD_REQUEST,
               "Sender agency has no parent. Please specify receiver_agency_id",
            );
         }
         receiverAgencyId = parentAgency.id;
      }

      // Validate: agency cannot receive dispatch from itself
      if (receiverAgencyId === dispatch.sender_agency_id) {
         throw new AppError(
            HttpStatusCodes.BAD_REQUEST,
            "An agency cannot receive dispatches from itself. Please specify a different receiver_agency_id",
         );
      }
```

  `smartReceive` controller (lines 401–423) does manual body checks
  (`Array.isArray`) and then generates inter-agency debts per reception
  dispatch via `generateDispatchDebtsBetweenAgencies`.

- `src/repositories/dispatch.repository.ts` — data layer (do not restructure;
  it is a known 3,000-line god-module deliberately left alone).
  - `createDispatchFromParcels` (line 1660): transactional, validates
    ownership (sender + child agencies), status, not-in-another-dispatch;
    optimistic locking (`dispatch_id: null` condition); creates a `LOADING`
    dispatch with declared counts/weight and `ADDED_TO_DISPATCH` parcel
    events. Returns `{ dispatch, added, skipped, details }` where `details`
    items are `{ tracking_number, status: "added" | "skipped", reason? }`.
    Throws `AppError(400, "No valid parcels to add to dispatch")` when nothing
    is addable.
  - `finalizeDispatchCreation(dispatchId, receiver_agency_id, sender_agency_id)`
    (line 1354): computes `declared_cost_in_cents`, sets `receiver_agency_id`
    and `status: DISPATCHED`. Debt creation is intentionally deferred to
    reception (`smartReceive`) — do not add debt creation to the create flow.
  - `smartReceive(tracking_numbers, receiver_agency_id, user_id)` (line 2286):
    transactional; skips not-found, already-in-your-agency, and
    already-processed parcels with per-parcel `details`; safe to call again
    with the same list (replays are skipped, and
    `generateDispatchDebtsBetweenAgencies` cancels PENDING debts before
    recreating — see `src/services/dispatch.services.ts:202-209`).

- `src/services/dispatch.services.ts` — service layer for dispatch business
  logic (debt generation). New multi-step logic goes here, per repo
  convention ("Controllers never use Prisma directly"; services own
  multi-step workflows). This file imports `prisma` directly — acceptable for
  services in this repo.

- Conventions to match:
  - Validation: Zod schemas defined at top of the route file, applied with
    `validate({ params, body })` from `src/middlewares/validate.middleware.ts`.
    Exemplar: `addParcelByScanSchema` + its route in
    `src/routes/dispatch.routes.ts:14-16,129-134`.
  - Errors: `throw new AppError(HttpStatusCodes.X, "message")` from
    `src/common/app-errors` (see any controller method).
  - Explicit return types on all functions. Functional style, no classes.

- Already mobile-usable, requires no changes (mention to the mobile team, do
  NOT modify): `GET /dispatches/ready-for-dispatch` (parcels eligible for
  dispatch in the user's agency), `GET /dispatches/verify-parcel/:hbl`
  (single-scan lookup), `GET /dispatches/:id/parcels` (reconciliation view),
  `POST /dispatches` + `/:id/add-by-scan` + `/:id/finalize-create`
  (interactive online flow).

## Commands you will need

| Purpose   | Command            | Expected on success |
|-----------|--------------------|---------------------|
| Install   | `npm install`      | exit 0              |
| Typecheck | `npx tsc --noEmit` | exit 0, no output   |
| Tests     | `npx jest`         | all suites pass     |

There is no lint script. Note: `npx jest` currently runs one suite
(`src/tests/customs/customs-matcher.test.ts`); it must stay green.

## Scope

**In scope** (the only files you should modify or create):

- `src/routes/dispatch.routes.ts`
- `src/controllers/dispatch.controller.ts`
- `src/services/dispatch.services.ts`
- `src/tests/dispatch/mobile-dispatch.test.ts` (create, incl. directory)
- `plans/README.md` (status row only)

**Out of scope** (do NOT touch, even though they look related):

- `src/repositories/dispatch.repository.ts` — both repo functions you need
  already exist. If they appear insufficient, that is a STOP condition, not a
  license to edit a 3,000-line money-bearing module.
- `src/services/dispatch.services.ts` debt functions
  (`generateDispatchDebtsBetweenAgencies` and helpers) — you only ADD a new
  exported function to this file; never modify the existing ones (plan 012
  owns their transactional rework).
- The response shape of `POST /dispatches/smart-receive` — the web app
  consumes it. You may add validation in front of it, not change its output.
- The interactive endpoints (`POST /dispatches`, `/:id/add-by-scan`,
  `/:id/finalize-create`) — behavior must remain byte-identical except that
  `finalizeCreate` delegates receiver resolution to the new service function
  (same inputs → same outcomes, including identical error messages).
- `src/routes/dispatch.legacy.routes.ts`, auth middleware, policies — agency
  staff use plain `authMiddleware`, already in place.
- No GPS/photos on dispatch ops (explicit product decision; plan 018 covers
  delivery proof separately).

## Git workflow

- Branch: `advisor/019-mobile-dispatch-create-and-receive`
- Commit per step; short lowercase imperative messages match the repo's style
  (e.g. `dispatch mark as received` — see `git log --oneline -5`).
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Extract receiver resolution into the service layer

In `src/services/dispatch.services.ts`, add (do not modify anything existing):

```typescript
/**
 * Resolve the receiver agency for a dispatch being finalized.
 * - If requestedReceiverId is provided: it must exist.
 * - Otherwise: defaults to the SENDER's parent agency.
 * - The receiver can never equal the sender.
 * Mirrors the rules previously inlined in dispatchController.finalizeCreate.
 */
export const resolveReceiverAgencyId = async (
   senderAgencyId: number,
   requestedReceiverId?: number,
): Promise<number> => { ... };
```

Implementation rules (use `prisma` already imported in this file, plus
`AppError` / `HttpStatusCodes` — add those imports, matching the controller's
import paths `../common/app-errors` and `../common/https-status-codes`):

1. If `requestedReceiverId` is truthy: `prisma.agency.findUnique({ where: { id: requestedReceiverId }, select: { id: true } })`;
   if null → `throw new AppError(HttpStatusCodes.NOT_FOUND, \`Receiver agency with id ${requestedReceiverId} not found\`)`.
2. Else: look up the sender's parent via
   `prisma.agency.findUnique({ where: { id: senderAgencyId }, select: { parent_agency_id: true } })`;
   if no row or `parent_agency_id` is null →
   `throw new AppError(HttpStatusCodes.BAD_REQUEST, "Sender agency has no parent. Please specify receiver_agency_id")`.
3. If the resolved id equals `senderAgencyId` →
   `throw new AppError(HttpStatusCodes.BAD_REQUEST, "An agency cannot receive dispatches from itself. Please specify a different receiver_agency_id")`.
4. Return the resolved id.

The three error messages must match the existing `finalizeCreate` strings
exactly (excerpted in "Current state") — clients may match on them.

Then update `dispatchController.finalizeCreate`
(`src/controllers/dispatch.controller.ts:545-596`): replace the inline
resolution block (lines 559–587 in the excerpt) with
`const receiverAgencyId = await resolveReceiverAgencyId(dispatch.sender_agency_id, requestedReceiverId);`
and import the function from `../services/dispatch.services` (the controller
already imports `generateDispatchDebtsBetweenAgencies` from there — extend
that import). Everything else in `finalizeCreate` stays as-is.

**Verify**: `npx tsc --noEmit` → exit 0.

### Step 2: Make the batch-create controller finalize in one call

Rewrite `dispatchController.createFromParcels`
(`src/controllers/dispatch.controller.ts:347-362`) to:

1. Read `tracking_numbers` and optional `receiver_agency_id` from `req.body`
   (Zod, added in step 3, guarantees shape — keep the existing
   `user.agency_id` check, drop the manual `Array.isArray` check).
2. **Resolve the receiver FIRST** (so a bad receiver fails before any dispatch
   row exists):
   `const receiverAgencyId = await resolveReceiverAgencyId(user.agency_id, receiver_agency_id);`
3. `const result = await repository.dispatch.createDispatchFromParcels(tracking_numbers, user.agency_id, user.id);`
4. `const dispatch = await repository.dispatch.finalizeDispatchCreation(result.dispatch.id, receiverAgencyId, user.agency_id);`
5. Respond `res.status(201).json({ dispatch, added: result.added, skipped: result.skipped, details: result.details });`
   — same keys as the repo result, but `dispatch` is the finalized
   (DISPATCHED, priced, receiver-assigned) row.

Update the method's JSDoc to say it creates AND finalizes (one-call mobile
flow; receiver defaults to the sender's parent agency).

Keep the method name `createFromParcels`. Explicit `Promise<void>` return
type, per repo convention.

**Verify**: `npx tsc --noEmit` → exit 0.

### Step 3: Enable the route with Zod validation

In `src/routes/dispatch.routes.ts`:

1. Define and **export** (exported so tests can import them):

```typescript
export const trackingNumbersSchema = z
   .array(z.string().trim().min(1, "Tracking number cannot be empty"))
   .min(1, "At least one tracking number is required")
   .max(2000, "Too many tracking numbers in one request")
   .transform((tns) => Array.from(new Set(tns)));

export const createFromParcelsBodySchema = z.object({
   tracking_numbers: trackingNumbersSchema,
   receiver_agency_id: z.number().int().positive().optional(),
});

export const smartReceiveBodySchema = z.object({
   tracking_numbers: trackingNumbersSchema,
});
```

2. Replace the commented-out `from-parcels` line (line 49) with an active
   route — it must stay **above** all `/:id` routes, where the comment block
   already sits:

```typescript
router.post(
   "/from-parcels",
   authMiddleware,
   validate({ body: createFromParcelsBodySchema }),
   dispatchController.createFromParcels,
);
```

3. Add validation to the existing smart-receive route (line 57), changing
   nothing else about it:

```typescript
router.post(
   "/smart-receive",
   authMiddleware,
   validate({ body: smartReceiveBodySchema }),
   dispatchController.smartReceive,
);
```

Leave the commented `receive-parcels` route (line 53) as-is — superseded by
smart-receive, but removing dead comments is not this plan's job.

**Verify**: `npx tsc --noEmit` → exit 0, and
`grep -n "from-parcels" src/routes/dispatch.routes.ts` → shows the active
(uncommented) `router.post("/from-parcels"...` registration.

### Step 4: Tests

Create `src/tests/dispatch/mobile-dispatch.test.ts`. Model the file structure
(describe/it, ts-jest, no DB) after
`src/tests/customs/customs-matcher.test.ts`. Two groups:

1. **Schema tests** (pure, import the exported schemas from
   `../../routes/dispatch.routes`):
   - `trackingNumbersSchema` rejects `[]` and `[""]`; rejects 2001 entries.
   - It dedupes: parsing `["A", "A", "B"]` returns `["A", "B"]`.
   - It trims: `[" CTE1 "]` parses to `["CTE1"]`.
   - `createFromParcelsBodySchema` accepts a body without
     `receiver_agency_id` and rejects `receiver_agency_id: 0` and `-1`.
2. **`resolveReceiverAgencyId` unit tests** (mock Prisma — `jest.mock` the
   module `../../lib/prisma.client` so `prisma.agency.findUnique` is a
   `jest.fn()` you control per test):
   - explicit receiver that exists → returns it;
   - explicit receiver missing → throws `AppError` with status 404;
   - no receiver, sender has parent → returns parent id;
   - no receiver, no parent → throws 400 with the exact
     "Sender agency has no parent..." message;
   - resolved receiver === sender → throws 400 with the exact
     "An agency cannot receive dispatches from itself..." message.

Do NOT write DB-backed integration tests in this plan — there is no test
database harness yet (plan 006 establishes the baseline). The transactional
behavior you'd want to integration-test already lives in repo functions this
plan does not modify.

**Verify**: `npx jest` → all suites pass, including the new file
(≥ 9 new passing tests); the pre-existing customs suite still passes.

### Step 5: Update the index

In `plans/README.md`, set this plan's status row to DONE (or your dispatcher's
convention).

**Verify**: `git diff plans/README.md` shows only the status cell change.

## Test plan

Covered in step 4: schema validation (empty/oversize/dedupe/trim, optional
receiver) and receiver-resolution rules (explicit/default/missing-parent/self),
modeled on `src/tests/customs/customs-matcher.test.ts`, no database required.
Verification: `npx jest` → all pass.

Manual smoke (optional, only if a local stack is already running — see
`docs/LOCAL_DOCKER_TESTING.md`; do not set one up just for this):
`POST /dispatches/from-parcels` with two valid tracking numbers → 201, body
has `dispatch.status === "DISPATCHED"`, `dispatch.receiver_agency_id` set,
`added: 2`; replaying the same body → 400 "No valid parcels to add to
dispatch" with per-parcel `details` saying `Already in dispatch <id>`.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `npx tsc --noEmit` exits 0
- [ ] `npx jest` exits 0; `src/tests/dispatch/mobile-dispatch.test.ts` exists with ≥ 9 passing tests
- [ ] `grep -n "//router.post(\"/from-parcels\"" src/routes/dispatch.routes.ts` returns no matches (route is no longer commented out)
- [ ] `grep -n "validate({ body: smartReceiveBodySchema })" src/routes/dispatch.routes.ts` returns one match
- [ ] `grep -n "resolveReceiverAgencyId" src/controllers/dispatch.controller.ts` shows it used in BOTH `finalizeCreate` and `createFromParcels`
- [ ] `git status` shows no modified files outside the in-scope list
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The drift check shows changes in the in-scope files and the "Current state"
  excerpts no longer match (especially: `createFromParcels` already finalizes,
  or the `from-parcels` route is already active — someone built this).
- `repository.dispatch.createDispatchFromParcels` or
  `finalizeDispatchCreation` does not exist or has a different signature than
  excerpted — do NOT modify the repository to compensate.
- `finalizeDispatchCreation` turns out to create debts or other financial
  side effects beyond `declared_cost_in_cents`/`receiver_agency_id`/`status`
  — the one-call flow would then change money behavior, which needs the
  maintainer's sign-off.
- Reusing `resolveReceiverAgencyId` in `finalizeCreate` would change any of
  its observable behavior (status codes or messages) for some input.
- The Zod `.transform(...)` on the body breaks the `validate` middleware
  (e.g. typing of `req.body` after `parse`) in a way a type assertion in the
  route file cannot cleanly fix.

## Maintenance notes

- **Idempotency on retry (deferred)**: a mobile retry of `from-parcels` after
  a network failure gets 400 "No valid parcels to add" with per-parcel
  `Already in dispatch <id>` details — safe (no duplicates) but not a clean
  replay. If the mobile team wants true replay semantics, add a
  client-generated idempotency key following the pattern plan 013 establishes
  for partner orders. Same option exists for `smart-receive`, though its
  skip-already-processed behavior plus PENDING-debt regeneration
  (`src/services/dispatch.services.ts:202-209`) already make retries safe.
- **Plan collisions**: 003 edits `markAsReceived` in the same controller; 015
  and 016 edit `dispatch.repository.ts`. Land this plan before or after those,
  never concurrently.
- **Reviewer focus**: confirm `finalizeCreate` behavior is unchanged (the
  extraction in step 1 is the riskiest diff), and that the new route sits
  above the `/:id` matchers.
- The mobile client should use `GET /dispatches/ready-for-dispatch` to drive
  its scan screen and `GET /dispatches/verify-parcel/:hbl` for per-scan
  feedback when online; both already exist and were left untouched.
- `max(2000)` on the batch size is a guess at warehouse scale; raise it
  deliberately if real dispatches exceed it (web's `markAsReceived` pages up
  to 6000 parcels).
