export const userKeys = {
  all: ["users"] as const,
  lists: () => [...userKeys.all, "list"] as const,
  list: (page: number, limit: number) => [...userKeys.lists(), { page, limit }] as const,
  session: () => [...userKeys.all, "session"] as const,
};

export const agencyKeys = {
  all: ["agencies"] as const,
  users: (agencyId: number) => [...agencyKeys.all, agencyId, "users"] as const,
};
