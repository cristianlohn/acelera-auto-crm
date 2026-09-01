/**
 * @file use-reports.ts
 * @description Hook customizado TanStack Query v5 para relatórios executivos com suporte Dual-Engine.
 */

import { useQuery } from "@tanstack/react-query";
import { getExecutiveReportData } from "@/app/actions/reports";
import type {
  ReportPeriod,
  ReportFilterOptions,
  ExecutiveReportData,
} from "@/lib/reports/types";

export const REPORTS_QUERY_KEY = ["reports"] as const;

export function useExecutiveReports(
  filterOrPeriod?: ReportPeriod | ReportFilterOptions,
  isDemo = false,
  initialData?: ExecutiveReportData,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: [...REPORTS_QUERY_KEY, filterOrPeriod, isDemo],
    queryFn: () => getExecutiveReportData(filterOrPeriod, isDemo),
    initialData,
    staleTime: 1000 * 60 * 5, // 5 minutos de cache
    enabled: options?.enabled ?? true,
  });
}
