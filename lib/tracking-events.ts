import { StatusKey } from '../constants/status';

export interface TrackingEventLike {
  location?: string | null;
  timestamp?: string;
  updatedAt?: string;
  created_at?: string;
  latitude?: string | number | null;
  longitude?: string | number | null;
  status?: string;
  statusCode?: string;
  statusName?: string;
  status_details?: string;
  statusDescription?: string;
  notes?: string | null;
}

export function getEventTimestamp(event: TrackingEventLike): string {
  return event.timestamp || event.created_at || event.updatedAt || '';
}

export function sortEventsNewestFirst(events: TrackingEventLike[] = []): TrackingEventLike[] {
  return [...events].sort(
    (a, b) => new Date(getEventTimestamp(b)).getTime() - new Date(getEventTimestamp(a)).getTime(),
  );
}

export function getLatestEvent(events: TrackingEventLike[] = []): TrackingEventLike | undefined {
  return sortEventsNewestFirst(events)[0];
}

export function getDeliveryCoordinates(
  source: { latitude?: string | number | null; longitude?: string | number | null; events?: TrackingEventLike[] } | undefined,
): { latitude: number; longitude: number } | null {
  if (!source) return null;

  if (source.latitude != null && source.longitude != null) {
    const latitude = Number(source.latitude);
    const longitude = Number(source.longitude);
    if (!Number.isNaN(latitude) && !Number.isNaN(longitude)) {
      return { latitude, longitude };
    }
  }

  const events = sortEventsNewestFirst(source.events || []);
  const delivered = events.find(
    (event) =>
      (event.status || event.statusCode || '').toUpperCase() === 'DELIVERED' &&
      event.latitude != null &&
      event.longitude != null,
  );
  const withCoords = delivered || events.find((event) => event.latitude != null && event.longitude != null);
  if (!withCoords?.latitude || !withCoords?.longitude) return null;

  const latitude = Number(withCoords.latitude);
  const longitude = Number(withCoords.longitude);
  if (Number.isNaN(latitude) || Number.isNaN(longitude)) return null;
  return { latitude, longitude };
}

export function getEventLabel(event: TrackingEventLike): string {
  return (
    event.statusName ||
    event.status_details ||
    event.statusDescription ||
    event.status ||
    event.location ||
    'Status update'
  );
}

export function getEventSubtitle(event: TrackingEventLike): string | null {
  const label = getEventLabel(event);
  const detail = event.notes || event.statusDescription;
  if (!detail || detail === label) return null;
  return detail;
}

export function getEventStatusKey(event: TrackingEventLike | undefined, parcelStatus?: string): StatusKey {
  const code = (parcelStatus || event?.statusCode || event?.status || '').toUpperCase();
  if (code === 'DELIVERED') return 'DELIVERED';
  if (code.includes('CANCEL')) return 'CANCELLED';
  if (code) return 'IN_TRANSIT';

  const label = getEventLabel(event || {}).toUpperCase();
  if (label.includes('RECIBIDO') || label.includes('DELIVERED')) return 'DELIVERED';
  return 'DEFAULT';
}
