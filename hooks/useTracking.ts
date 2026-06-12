import { useQuery } from "@tanstack/react-query";
import api from "../services/api";
import { TrackingResponse } from "../data/types";
import { normalizeTrackingResponse } from "../lib/normalize-tracking";

export const packageKeys = {
   all: ["packages"] as const,
   tracking: (orderId: string) => [...packageKeys.all, "tracking", orderId] as const,
};

/* export const usePackageTracking = (orderId: string) => {
   return useQuery<TrackingResponse>({
      queryKey: packageKeys.tracking(orderId),
      queryFn: () => api.tracking.lookup(orderId),
      enabled: !!orderId,
   });r
}; */

export const useParcelTracking = (hbl: string) => {
   return useQuery<TrackingResponse>({
      queryKey: packageKeys.tracking(hbl),
      queryFn: async () => normalizeTrackingResponse(await api.tracking.lookup(hbl)),
      enabled: !!hbl,
   });
};
