import { TrackingResponse, TrackingParcel } from '../data/types';
import { getDeliveryCoordinates } from './tracking-events';

function dedupeUrls(urls: string[]): string[] {
  return [...new Set(urls.filter(Boolean))];
}

function extractPhotoUrls(source: any): string[] {
  const direct = (source?.photos ?? []).map((p: any) => (typeof p === 'string' ? p : p?.url)).filter(Boolean);
  const fromEvents = (source?.events ?? []).flatMap((event: any) =>
    (event?.photos ?? []).map((p: any) => (typeof p === 'string' ? p : p?.url)).filter(Boolean),
  );
  return dedupeUrls([...direct, ...fromEvents]);
}

function normalizeParcel(raw: any): TrackingParcel {
  const events = raw.events ?? [];
  const coords = getDeliveryCoordinates({ latitude: raw.latitude, longitude: raw.longitude, events });
  return {
    hbl: raw.hbl ?? raw.tracking_number ?? '',
    tracking_number: raw.tracking_number ?? raw.hbl,
    weight: raw.weight != null ? String(raw.weight) : '',
    description: raw.description ?? '',
    status: raw.status,
    events,
    photos: extractPhotoUrls(raw),
    latitude: coords?.latitude ?? raw.latitude,
    longitude: coords?.longitude ?? raw.longitude,
  };
}

/** Normalize both legacy lookup and /parcels/:id/tracking responses. */
export function normalizeTrackingResponse(raw: any): TrackingResponse {
  if (!raw) return raw;

  const receiver = raw.order?.receiver;
  const agencyName = typeof raw.agency === 'object' ? raw.agency?.name : raw.agency;
  const city = raw.city ?? receiver?.city;
  const province = raw.province ?? receiver?.province;
  const orderId = raw.orderId ?? raw.order_id ?? raw.order?.id;

  // Flat single-parcel response (/parcels/:tracking_number/tracking)
  if (raw.tracking_number && !raw.parcels?.length) {
    return {
      invoiceId: orderId ?? 0,
      orderId,
      order_id: orderId,
      agency: agencyName ?? '',
      city: city ?? '',
      province: province ?? '',
      status: raw.status,
      weight: raw.weight != null ? String(raw.weight) : '',
      parcels: [normalizeParcel(raw)],
    };
  }

  // Legacy multi-parcel response
  if (raw.parcels?.length) {
    return {
      ...raw,
      orderId,
      order_id: orderId,
      agency: agencyName ?? raw.agency ?? '',
      city: city ?? raw.city ?? '',
      province: province ?? raw.province ?? '',
      weight: raw.weight != null ? String(raw.weight) : raw.weight,
      parcels: raw.parcels.map(normalizeParcel),
    };
  }

  return raw;
}
