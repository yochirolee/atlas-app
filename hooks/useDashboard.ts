import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { FinancialDashboard } from '../data/types';

export const dashboardKeys = {
  all: ['dashboard'] as const,
  main: () => [...dashboardKeys.all, 'main'] as const,
};

export const useDashboard = () => {
  return useQuery<FinancialDashboard>({
    queryKey: dashboardKeys.main(),
    queryFn: () => api.financialReports.getDashboard(),
  });
};
