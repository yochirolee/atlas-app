import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { getLocalScans } from '../services/delivery-db';

export const parcelKeys = {
  all: ['parcels'] as const,
  list: (params: any) => [...parcelKeys.all, 'list', params] as const,
};

export const useParcels = (params: {
  search?: string;
  page?: number;
  limit?: number;
  status?: string;
}) => {
  return useQuery({
    queryKey: parcelKeys.list(params),
    queryFn: async () => {
      // 1. Fetch local scans
      const localScans = await getLocalScans();
      
      // 2. Fetch API scans (with graceful failure)
      let apiRows: any[] = [];
      let apiTotal = 0;
      
      try {
        const apiResult = await api.parcels.search(
          params.search || '',
          params.page || 0,
          params.limit || 20,
          params.status || undefined
        );
        apiRows = apiResult?.rows || [];
        apiTotal = apiResult?.total || 0;
      } catch (err) {
        console.warn('[useParcels] API search failed, showing local data only:', err);
      }
      
      // 3. Convert local scans to expected HistoryRow format
      const formattedLocals = localScans.map(s => ({
        id: `local-${s.id}`,
        tracking_number: s.hbl,
        status: s.status === 'pending' ? 'PENDING_SYNC' : s.status.toUpperCase(),
        scanned_at: s.scanned_at,
        isLocal: true,
        order: {
          customer: { name: 'Local Delivery' },
          receiver: { city: 'Pending sync...' },
          agency: 'Offline Scan'
        }
      }));

      // 4. Merge, avoiding duplicates (if API has the same tracking_number, skip the local one)
      const apiHbls = new Set(apiRows.map((r: any) => r.tracking_number));
      const filteredLocals = formattedLocals.filter(l => !apiHbls.has(l.tracking_number));

      // 5. Combine and sort by date descending
      const merged = [...filteredLocals, ...apiRows].sort((a: any, b: any) => {
        const dateA = new Date(a.scanned_at || a.created_at || 0).getTime();
        const dateB = new Date(b.scanned_at || b.created_at || 0).getTime();
        return dateB - dateA;
      });
      
      return { 
        rows: merged, 
        total: apiTotal + filteredLocals.length 
      };
    },
  });
};


