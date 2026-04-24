import { Colors } from './theme';

/**
 * Status configurations for visual display
 * Moved to a standalone constant to avoid circular dependencies
 * and ensure availability during concurrent rendering (React 19).
 */

export const STATUS_CONFIG = Object.freeze({
  'DELIVERED': { label: 'Delivered', icon: 'checkmark-circle', color: Colors.green, dimColor: Colors.greenDim },
  'PENDING': { label: 'Pending', icon: 'time', color: Colors.amber, dimColor: Colors.amberDim },
  'PENDING_SYNC': { label: 'Queued', icon: 'cloud-offline', color: Colors.textSecondary, dimColor: Colors.elevated },
  'SYNCING': { label: 'Syncing', icon: 'sync', color: '#3B82F6', dimColor: 'rgba(59,130,246,0.10)' },
  'PARTIAL': { label: 'Partial', icon: 'warning', color: Colors.amber, dimColor: Colors.amberDim },
  'IN_TRANSIT': { label: 'Transit', icon: 'airplane', color: '#3B82F6', dimColor: 'rgba(59,130,246,0.10)' },
  'CANCELLED': { label: 'Cancelled', icon: 'close-circle', color: Colors.red, dimColor: Colors.redDim },
  'ERROR': { label: 'Error', icon: 'alert-circle', color: Colors.red, dimColor: Colors.redDim },
  'DEFAULT': { label: 'Unknown', icon: 'help-circle', color: Colors.textMuted, dimColor: Colors.elevated },
});

export type StatusKey = keyof typeof STATUS_CONFIG;

export function isValidStatus(key: string): key is StatusKey {
  return key in STATUS_CONFIG;
}
