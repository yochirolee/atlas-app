import { useQuery } from '@tanstack/react-query';
import api from '../services/api';

export const financeKeys = {
  all: ['finance'] as const,
  dailyClosing: (filters: any) => [...financeKeys.all, 'daily-closing', filters] as const,
};

export const useDailyClosing = (filters?: {
  date?: string;
  period?: 'day' | 'week' | 'month';
  start_date?: string;
  end_date?: string;
}) => {
  return useQuery({
    queryKey: financeKeys.dailyClosing(filters),
    queryFn: () => api.financialReports.getDailyClosing(filters),
  });
};
