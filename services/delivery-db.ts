import * as SQLite from 'expo-sqlite';
import * as Crypto from 'expo-crypto';

const DB_NAME = 'deliveries.db';

let db: SQLite.SQLiteDatabase | null = null;

export async function getDB(): Promise<SQLite.SQLiteDatabase> {
  if (!db) {
    db = await SQLite.openDatabaseAsync(DB_NAME);
    
    // Initial creation
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS delivery_stops (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        local_id TEXT NOT NULL UNIQUE,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        latitude REAL,
        longitude REAL,
        accuracy REAL,
        status TEXT NOT NULL DEFAULT 'pending',
        retry_count INTEGER NOT NULL DEFAULT 0,
        last_error TEXT,
        last_sync_attempt_at TEXT,
        synced_at TEXT
      );

      CREATE TABLE IF NOT EXISTS delivery_photos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        stop_id INTEGER NOT NULL,
        photo_uri TEXT NOT NULL,
        cloud_url TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        FOREIGN KEY (stop_id) REFERENCES delivery_stops (id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS scanned_deliveries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        hbl TEXT NOT NULL UNIQUE,
        scanned_at TEXT NOT NULL DEFAULT (datetime('now')),
        status TEXT NOT NULL DEFAULT 'pending',
        stop_id INTEGER,
        latitude REAL,
        longitude REAL,
        accuracy REAL,
        photo_uri TEXT,
        error_msg TEXT,
        synced_at TEXT,
        FOREIGN KEY (stop_id) REFERENCES delivery_stops (id)
      );
    `);

    // Migration for existing tables missing new columns
    try {
      // scanned_deliveries migration
      const scanInfo = await db.getAllAsync<{ name: string }>('PRAGMA table_info(scanned_deliveries)');
      const scanColumns = scanInfo.map((c) => c.name.toLowerCase());
      
      if (!scanColumns.includes('stop_id')) {
        await db.execAsync('ALTER TABLE scanned_deliveries ADD COLUMN stop_id INTEGER;');
      }
      if (!scanColumns.includes('latitude')) {
        await db.execAsync('ALTER TABLE scanned_deliveries ADD COLUMN latitude REAL;');
        await db.execAsync('ALTER TABLE scanned_deliveries ADD COLUMN longitude REAL;');
        await db.execAsync('ALTER TABLE scanned_deliveries ADD COLUMN accuracy REAL;');
      }
      if (!scanColumns.includes('photo_uri')) {
        await db.execAsync('ALTER TABLE scanned_deliveries ADD COLUMN photo_uri TEXT;');
      }

      // delivery_stops migration
      const stopInfo = await db.getAllAsync<{ name: string }>('PRAGMA table_info(delivery_stops)');
      const stopColumns = stopInfo.map((c) => c.name.toLowerCase());
      
      if (!stopColumns.includes('local_id')) {
        await db.execAsync("ALTER TABLE delivery_stops ADD COLUMN local_id TEXT;");
        // Backfill local_id for legacy rows if any
        const legacyStops = await db.getAllAsync<{id: number}>('SELECT id FROM delivery_stops WHERE local_id IS NULL');
        for (const ls of legacyStops) {
          await db.runAsync('UPDATE delivery_stops SET local_id = ? WHERE id = ?', [Crypto.randomUUID(), ls.id]);
        }
      }
      if (!stopColumns.includes('status')) {
        await db.execAsync("ALTER TABLE delivery_stops ADD COLUMN status TEXT NOT NULL DEFAULT 'pending';");
        await db.execAsync("ALTER TABLE delivery_stops ADD COLUMN retry_count INTEGER NOT NULL DEFAULT 0;");
        await db.execAsync("ALTER TABLE delivery_stops ADD COLUMN last_error TEXT;");
        await db.execAsync("ALTER TABLE delivery_stops ADD COLUMN last_sync_attempt_at TEXT;");
        await db.execAsync("ALTER TABLE delivery_stops ADD COLUMN synced_at TEXT;");
      }

      // delivery_photos migration
      const photoInfo = await db.getAllAsync<{ name: string }>('PRAGMA table_info(delivery_photos)');
      const photoColumns = photoInfo.map((c) => c.name.toLowerCase());
      if (!photoColumns.includes('cloud_url')) {
        await db.execAsync("ALTER TABLE delivery_photos ADD COLUMN cloud_url TEXT;");
        await db.execAsync("ALTER TABLE delivery_photos ADD COLUMN status TEXT NOT NULL DEFAULT 'pending';");
      }
    } catch (e) {
      console.error('Migration error handling failed:', e);
    }
  }
  return db;
}

export interface ScannedDelivery {
  id: number;
  hbl: string;
  scanned_at: string;
  status: 'pending' | 'synced' | 'error';
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  photo_uri: string | null;
  stop_id: number | null;
  error_msg: string | null;
  synced_at: string | null;
}

export interface DeliveryStop {
  id: number;
  local_id: string;
  created_at: string;
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  status: 'pending' | 'syncing' | 'synced' | 'partial' | 'failed';
  retry_count: number;
  last_error: string | null;
  last_sync_attempt_at: string | null;
  synced_at: string | null;
}

export interface DeliveryPhoto {
  id: number;
  stop_id: number;
  photo_uri: string;
  cloud_url: string | null;
  status: 'pending' | 'uploaded' | 'failed';
}

export interface GroupedStop extends DeliveryStop {
  photos: string[];
  scans: ScannedDelivery[];
}

/** Add only the HBL for later proof of delivery. Returns the new row ID if successful, null if duplicate. */
export async function addScanHbl(hbl: string): Promise<number | null> {
  const database = await getDB();
  try {
    const result = await database.runAsync(
      `INSERT INTO scanned_deliveries (hbl, scanned_at, status) VALUES (?, datetime('now'), 'pending')`,
      [hbl]
    );
    return result.lastInsertRowId;
  } catch (e: any) {
    if (e?.message?.includes('UNIQUE')) return null;
    throw e;
  }
}

/** Create a delivery stop with multiple photos and associate it with multiple parcels. */
export async function createStopWithPhotos(
  parcelIds: number[],
  location: { latitude: number; longitude: number; accuracy: number },
  photoUris: string[]
): Promise<number> {
  const database = await getDB();
  
  // 1. Create the stop
  const localId = Crypto.randomUUID();
  const stopResult = await database.runAsync(
    `INSERT INTO delivery_stops (local_id, latitude, longitude, accuracy, status) VALUES (?, ?, ?, ?, 'pending')`,
    [localId, location.latitude, location.longitude, location.accuracy]
  );
  const stopId = stopResult.lastInsertRowId;

  // 2. Add photos
  for (const uri of photoUris) {
    await database.runAsync(
      `INSERT INTO delivery_photos (stop_id, photo_uri, status) VALUES (?, ?, 'pending')`,
      [stopId, uri]
    );
  }

  // 3. Update parcels
  if (parcelIds.length > 0) {
    const placeholders = parcelIds.map(() => '?').join(',');
    await database.runAsync(
      `UPDATE scanned_deliveries SET 
        stop_id = ?, 
        latitude = ?, 
        longitude = ?, 
        accuracy = ?, 
        photo_uri = ? 
       WHERE id IN (${placeholders})`,
      [stopId, location.latitude, location.longitude, location.accuracy, photoUris[0] || null, ...parcelIds]
    );
  }

  return stopId;
}

/** Legacy update function for backward compatibility if needed */
export async function updateBatchProof(
  ids: number[],
  location: { latitude: number; longitude: number; accuracy: number },
  photo_uri: string
): Promise<void> {
  await createStopWithPhotos(ids, location, [photo_uri]);
}

/** Get all local scanned deliveries (excluding those specifically marked for deletion) */
export async function getLocalScans(): Promise<ScannedDelivery[]> {
  const database = await getDB();
  return database.getAllAsync<ScannedDelivery>(
    'SELECT * FROM scanned_deliveries ORDER BY scanned_at DESC'
  );
}

/** Mark rows as synced */
export async function markSynced(ids: number[]): Promise<void> {
  if (ids.length === 0) return;
  const database = await getDB();
  const placeholders = ids.map(() => '?').join(',');
  await database.runAsync(
    `UPDATE scanned_deliveries SET status = 'synced', synced_at = datetime('now') WHERE id IN (${placeholders})`,
    ids
  );
}

/** Mark a stop as synced and set finished timestamp */
export async function markStopSynced(stopId: number): Promise<void> {
  const database = await getDB();
  await database.runAsync(
    `UPDATE delivery_stops SET status = 'synced', synced_at = datetime('now'), last_error = NULL WHERE id = ?`,
    [stopId]
  );
  await database.runAsync(
    `UPDATE scanned_deliveries SET status = 'synced', synced_at = datetime('now') WHERE stop_id = ?`,
    [stopId]
  );
}

/** Update the status and error tracking for a stop */
export async function markStopStatus(stopId: number, status: DeliveryStop['status'], error?: string): Promise<void> {
  const database = await getDB();
  await database.runAsync(
    `UPDATE delivery_stops SET 
      status = ?, 
      last_error = ?, 
      retry_count = CASE WHEN ? = 'failed' THEN retry_count + 1 ELSE retry_count END,
      last_sync_attempt_at = datetime('now')
     WHERE id = ?`,
    [status, error || null, status, stopId]
  );
}

/** Mark a specific photo as uploaded with its cloud URL */
export async function markPhotoUploaded(photoId: number, cloudUrl: string): Promise<void> {
  const database = await getDB();
  await database.runAsync(
    `UPDATE delivery_photos SET cloud_url = ?, status = 'uploaded' WHERE id = ?`,
    [cloudUrl, photoId]
  );
}

/** Mark a row as error */
export async function markError(id: number, msg: string): Promise<void> {
  const database = await getDB();
  await database.runAsync(
    'UPDATE scanned_deliveries SET status = \'error\', error_msg = ? WHERE id = ?',
    [msg, id]
  );
}

/** Get all pending stops (stops not fully synced or with partial errors) */
export async function getPendingStops(): Promise<GroupedStop[]> {
  const database = await getDB();
  const stops = await database.getAllAsync<DeliveryStop>(
    `SELECT DISTINCT s.* FROM delivery_stops s 
     WHERE s.status IN ('pending', 'failed', 'partial')
     ORDER BY s.created_at ASC`
  );
  
  const results: GroupedStop[] = [];
  for (const stop of stops) {
    const [photos, scans] = await Promise.all([
      database.getAllAsync<DeliveryPhoto>('SELECT * FROM delivery_photos WHERE stop_id = ?', [stop.id]),
      database.getAllAsync<ScannedDelivery>('SELECT * FROM scanned_deliveries WHERE stop_id = ?', [stop.id])
    ]);
    results.push({ 
      ...stop, 
      photos: photos.map(p => p.photo_uri),
      photos_full: photos, 
      scans 
    });
  }
  return results;
}

export interface GroupedStop extends DeliveryStop {
  photos: string[]; // for UI compatibility
  photos_full: DeliveryPhoto[];
  scans: ScannedDelivery[];
}

/** Get all stops with their scans and photos */
export async function getAllStops(): Promise<GroupedStop[]> {
  const database = await getDB();
  
  // 1. Get all stops
  const stops = await database.getAllAsync<DeliveryStop>(
    'SELECT * FROM delivery_stops ORDER BY created_at DESC'
  );
  
  const groupedStops: GroupedStop[] = [];
  
  for (const stop of stops) {
    const [photos, scans] = await Promise.all([
      database.getAllAsync<DeliveryPhoto>(
        'SELECT * FROM delivery_photos WHERE stop_id = ?',
        [stop.id]
      ),
      database.getAllAsync<ScannedDelivery>(
        'SELECT * FROM scanned_deliveries WHERE stop_id = ?',
        [stop.id]
      )
    ]);
    
    groupedStops.push({
      ...stop,
      photos: photos.map(p => p.photo_uri),
      photos_full: photos,
      scans: scans
    });
  }
  
  // Also get "orphan" scans (no stop_id)
  const orphanScans = await database.getAllAsync<ScannedDelivery>(
    'SELECT * FROM scanned_deliveries WHERE stop_id IS NULL ORDER BY scanned_at DESC'
  );
  
  if (orphanScans.length > 0) {
    // Add a virtual stop for orphan scans or just treat them specially
    // For now, let's keep it simple and focus on stops
  }
  
  return groupedStops;
}

/** Get IDs of scans that have not been assigned to a stop yet (orphaned scans) */
export async function getOrphanedScanIds(): Promise<number[]> {
  const database = await getDB();
  const rows = await database.getAllAsync<{ id: number }>(
    'SELECT id FROM scanned_deliveries WHERE stop_id IS NULL ORDER BY scanned_at ASC'
  );
  return rows.map(r => r.id);
}

/** Get parcel counts by status */
export async function getParcelStats(): Promise<{ total: number; pending: number; synced: number; error: number }> {
  const database = await getDB();
  const rows = await database.getAllAsync<{ status: string; cnt: number }>(
    'SELECT status, COUNT(*) as cnt FROM scanned_deliveries GROUP BY status'
  );
  const stats = { total: 0, pending: 0, synced: 0, error: 0 };
  for (const r of rows) {
    stats[r.status as keyof typeof stats] = r.cnt;
    stats.total += r.cnt;
  }
  return stats;
}

/** Get stop counts by status */
export async function getStopStats(): Promise<{ total: number; pending: number; synced: number; error: number }> {
  const stops = await getAllStops();
  const stats = { total: stops.length, pending: 0, synced: 0, error: 0 };
  
  for (const stop of stops) {
    const hasPending = stop.scans.some(s => s.status === 'pending');
    const hasError = stop.scans.some(s => s.status === 'error');
    const allSynced = stop.scans.length > 0 && stop.scans.every(s => s.status === 'synced' || s.status === 'error');
    
    // A stop is pending if it has any pending scans
    if (hasPending) {
      stats.pending++;
    } 
    // A stop is in error if it has NO pending scans but HAS error scans
    else if (hasError) {
      stats.error++;
    }
    // A stop is synced if all its scans are either synced or errors (processed)
    else if (allSynced) {
      stats.synced++;
    }
  }
  return stats;
}

/** Clear all synced records */
export async function clearSynced(): Promise<void> {
  const database = await getDB();
  await database.runAsync('DELETE FROM scanned_deliveries WHERE status = \'synced\'');
}

/** Clear all records (reset) */
export async function clearAll(): Promise<void> {
  const database = await getDB();
  await database.runAsync('DELETE FROM delivery_photos');
  await database.runAsync('DELETE FROM delivery_stops');
  await database.runAsync('DELETE FROM scanned_deliveries');
}
/** Get all photos for a given HBL from the local database. */
export async function getPhotosByHbl(hbl: string): Promise<string[]> {
  const database = await getDB();
  const scan = await database.getFirstAsync<ScannedDelivery>(
    'SELECT * FROM scanned_deliveries WHERE hbl = ?',
    [hbl]
  );
  if (!scan || !scan.stop_id) return [];
  
  const photos = await database.getAllAsync<DeliveryPhoto>(
    'SELECT * FROM delivery_photos WHERE stop_id = ?',
    [scan.stop_id]
  );
  return photos.map(p => p.cloud_url || p.photo_uri);
}
/** Get delivery location (lat, lng) for a given HBL. */
export async function getLocationByHbl(hbl: string): Promise<{ latitude: number; longitude: number } | null> {
  const database = await getDB();
  const scan = await database.getFirstAsync<ScannedDelivery>(
    'SELECT latitude, longitude FROM scanned_deliveries WHERE hbl = ?',
    [hbl]
  );
  if (!scan || !scan.latitude || !scan.longitude) return null;
  return { latitude: scan.latitude, longitude: scan.longitude };
}
