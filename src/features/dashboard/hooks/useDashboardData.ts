import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import {
  getDashboardMetrics,
  getAnnualPerformance,
} from "@/lib/dashboard.functions";

export const dashboardKeys = {
  all: ["dashboard"] as const,
  metrics: () => [...dashboardKeys.all, "metrics"] as const,
  annual: (year: number) => [...dashboardKeys.all, "annual", year] as const,
};

export const metricsQueryOptions = () =>
  queryOptions({
    queryKey: dashboardKeys.metrics(),
    queryFn: () => getDashboardMetrics(),
  });

export const annualPerformanceQueryOptions = (year: number) =>
  queryOptions({
    queryKey: dashboardKeys.annual(year),
    queryFn: () => getAnnualPerformance({ data: { year } }),
  });

export function useDashboardMetrics() {
  return useSuspenseQuery(metricsQueryOptions());
}

export function useAnnualPerformance(year?: number) {
  const y = year ?? new Date().getFullYear();
  return useSuspenseQuery(annualPerformanceQueryOptions(y));
}

export function useDashboardData(year?: number) {
  const metrics = useDashboardMetrics();
  const annual = useAnnualPerformance(year);
  return { metrics: metrics.data, annual: annual.data };
}
