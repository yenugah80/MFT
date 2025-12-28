import { useQuery } from '@tanstack/react-query';
import apiClient from '../services/apiClient';
import { aggregateMoodInsights } from '../utils/moodAggregation';

const DEFAULT_WINDOW_DAYS = 30;
const DEFAULT_TREND_DAYS = 7;
const MAX_HISTORY_LIMIT = 500;

const buildHistoryUrl = (days) => {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const start = encodeURIComponent(startDate.toISOString());
  const end = encodeURIComponent(endDate.toISOString());
  return `/mood/history?startDate=${start}&endDate=${end}&limit=${MAX_HISTORY_LIMIT}`;
};

export const useMoodInsights = ({ windowDays = DEFAULT_WINDOW_DAYS, trendDays = DEFAULT_TREND_DAYS } = {}) => {
  return useQuery({
    queryKey: ['moodInsights', windowDays, trendDays],
    queryFn: async () => {
      const response = await apiClient.get(buildHistoryUrl(windowDays));
      const logs = Array.isArray(response) ? response : [];
      return aggregateMoodInsights({
        logs,
        windowDays,
        trendDays,
      });
    },
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
};
