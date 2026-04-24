import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import { 
  getPendingStops, 
  markStopSynced, 
  markSynced, 
  markError, 
  markStopStatus, 
  markPhotoUploaded 
} from './delivery-db';
import { uploadToCloudinary } from './cloudinary';
import api from './api';

const BACKGROUND_SYNC_TASK = 'background-delivery-sync';

let isSyncing = false;
let unsubscribe: (() => void) | null = null;

// 1. Define the background task
TaskManager.defineTask(BACKGROUND_SYNC_TASK, async () => {
  try {
    console.log('[delivery-sync] Background fetch execution...');
    const result = await syncPendingDeliveries();
    return result.synced > 0 || result.errors > 0 
      ? BackgroundFetch.BackgroundFetchResult.NewData 
      : BackgroundFetch.BackgroundFetchResult.NoData;
  } catch (error) {
    console.error('[delivery-sync] Background fetch failed:', error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

// 2. Export registration function
export async function registerBackgroundSync() {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_SYNC_TASK);
    if (!isRegistered) {
      console.log(`[delivery-sync] Registering task ${BACKGROUND_SYNC_TASK}...`);
      await BackgroundFetch.registerTaskAsync(BACKGROUND_SYNC_TASK, {
        minimumInterval: 15 * 60, // 15 minutes (minimum allowed by OS)
        stopOnTerminate: false,
        startOnBoot: true,
      });
      console.log(`[delivery-sync] SUCCESS: Task ${BACKGROUND_SYNC_TASK} registered.`);
    } else {
      console.log(`[delivery-sync] Task ${BACKGROUND_SYNC_TASK} already registered.`);
    }
  } catch (err) {
    console.error('[delivery-sync] CRITICAL: Background task registration failed:', err);
    console.error('[delivery-sync] Ensure fetch is enabled in UIBackgroundModes in Info.plist');
  }
}

/**
 * Sync pending stops and their parcels to the API.
 */
export async function syncPendingDeliveries(): Promise<{
  synced: number;
  errors: number;
}> {
  if (isSyncing) return { synced: 0, errors: 0 };
  
  const online = await isOnline();
  if (!online) return { synced: 0, errors: 0 };

  isSyncing = true;
  let totalSynced = 0;
  let totalErrors = 0;

  try {
    const stops = await getPendingStops();
    if (stops.length === 0) return { synced: 0, errors: 0 };

    console.log(`[delivery-sync] Starting sync for ${stops.length} stops...`);

    for (const stop of stops) {
      try {
        // --- 1. Exponential Backoff Check ---
        if (stop.retry_count > 0 && stop.last_sync_attempt_at) {
          const lastAttempt = new Date(stop.last_sync_attempt_at).getTime();
          const now = Date.now();
          const waitMinutes = Math.min(Math.pow(2, stop.retry_count), 60); // 2, 4, 8, 16, 32, 60...
          
          if (now - lastAttempt < waitMinutes * 60 * 1000) {
            console.log(`[delivery-sync] Skipping stop ${stop.id} (backoff: ${waitMinutes}m)`);
            continue;
          }
        }

        // Mark as syncing now
        await markStopStatus(stop.id, 'syncing');

        // --- 2. Parallel Photo Uploads ---
        const firstHbl = stop.scans.length > 0 ? stop.scans[0].hbl : 'batch';
        const photoSyncPromises = stop.photos_full.map(async (photo, idx) => {
          if (photo.status === 'uploaded' && photo.cloud_url) {
            return photo.cloud_url;
          }
          try {
            const url = await uploadToCloudinary(photo.photo_uri, `${firstHbl}_${idx}`);
            await markPhotoUploaded(photo.id, url);
            return url;
          } catch (err) {
            console.warn(`[delivery-sync] Photo upload failed for photo ${photo.id}`, err);
            return null;
          }
        });

        const photoUrlsResults = await Promise.all(photoSyncPromises);
        const validPhotoUrls = photoUrlsResults.filter((url): url is string => !!url);

        // --- 3. Backend Sync (Idempotent) ---
        const result = await api.delivery.syncStop({
          local_id: stop.local_id,
          latitude: stop.latitude,
          longitude: stop.longitude,
          accuracy: stop.accuracy,
          photos: validPhotoUrls,
          hbls: stop.scans.map((s) => s.hbl),
        });

        // --- 4. Process Results ---
        const { updated = [], not_found = [], already_delivered = [] } = result;
        const successHbls = [...updated, ...already_delivered];
        const successIds = stop.scans
          .filter((s) => successHbls.includes(s.hbl))
          .map((s) => s.id);
        
        if (successIds.length > 0) {
          await markSynced(successIds);
          totalSynced += successIds.length;
        }

        // Update stop status based on scan results
        if (successHbls.length === stop.scans.length) {
          await markStopSynced(stop.id);
        } else if (successHbls.length > 0) {
          await markStopStatus(stop.id, 'partial', `Synced ${successHbls.length}/${stop.scans.length}`);
        } else {
          await markStopStatus(stop.id, 'failed', 'No HBLs were accepted by backend');
        }

        // Log specific errors for not_found
        for (const hbl of not_found) {
          const scan = stop.scans.find((s) => s.hbl === hbl);
          if (scan) await markError(scan.id, 'HBL no encontrado');
        }

      } catch (e) {
        console.error(`[delivery-sync] Error syncing stop ${stop.id}:`, e);
        await markStopStatus(stop.id, 'failed', String(e));
        totalErrors++;
      }
    }
  } finally {
    isSyncing = false;
  }

  return { synced: totalSynced, errors: totalErrors };
}

/** Start listening for connectivity changes and auto-sync */
export function startSyncListener(onSyncComplete?: (result: { synced: number; errors: number }) => void) {
  if (unsubscribe) return; // Already listening

  unsubscribe = NetInfo.addEventListener(async (state: NetInfoState) => {
    if (state.isConnected && state.isInternetReachable !== false) {
      try {
        const result = await syncPendingDeliveries();
        if (result.synced > 0 || result.errors > 0) {
          onSyncComplete?.(result);
        }
      } catch (e) {
        console.error('[delivery-sync] Auto-sync error:', e);
      }
    }
  });
}

/** Stop the connectivity listener */
export function stopSyncListener() {
  unsubscribe?.();
  unsubscribe = null;
}

/** Check if currently online */
export async function isOnline(): Promise<boolean> {
  const state = await NetInfo.fetch();
  return !!(state.isConnected && state.isInternetReachable !== false);
}
