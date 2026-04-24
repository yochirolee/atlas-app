import { AppState, AppStateStatus } from 'react-native';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { syncPendingDeliveries, startSyncListener, stopSyncListener } from './delivery-sync';

let currentAppState = AppState.currentState;
let isInitialized = false;

/**
 * Initialize all system listeners for delivery synchronization.
 * Call this in the root layout or main entry point.
 */
export function initDeliveryListeners() {
  if (isInitialized) return;
  isInitialized = true;

  // 1. Connectivity Listener (already exists in sync service, but we wrap it here)
  startSyncListener((result) => {
    console.log(`[delivery-listeners] Connectivity sync complete: ${result.synced} synced, ${result.errors} errors`);
  });

  // 2. AppState Listener (Foreground trigger)
  const subscription = AppState.addEventListener('change', async (nextAppState: AppStateStatus) => {
    const isReturningToForeground = 
      currentAppState.match(/inactive|background/) && 
      nextAppState === 'active';
    
    currentAppState = nextAppState;

    if (isReturningToForeground) {
      console.log('[delivery-listeners] App returned to foreground, triggering sync...');
      try {
        await syncPendingDeliveries();
      } catch (e) {
        console.error('[delivery-listeners] Foreground sync failed:', e);
      }
    }
  });

  return () => {
    subscription.remove();
    stopSyncListener();
    isInitialized = false;
  };
}
