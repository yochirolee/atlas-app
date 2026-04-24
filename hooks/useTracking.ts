import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { TrackingResponse } from '../data/types';

export const packageKeys = {
  all: ['packages'] as const,
  tracking: (orderId: string) => [...packageKeys.all, 'tracking', orderId] as const,
};

export const usePackageTracking = (orderId: string) => {
  return useQuery<TrackingResponse>({
    queryKey: packageKeys.tracking(orderId),
    queryFn: () => api.tracking.lookup(orderId),
    enabled: !!orderId,
  });
};
