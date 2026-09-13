/**
 * @file page.tsx – /reports
 * @description Módulo de Relatórios Executivos e Inteligência Comercial (Server Component).
 */

export const dynamic = "force-dynamic";
export const revalidate = 0;

import React from "react";
import { Metadata } from "next";
import ReportsPageClient from "@/components/reports/reports-page-client";

export const metadata: Metadata = {
  title: "Relatórios Executivos & Inteligência Comercial | Acelera Auto CRM",
  description:
    "Painel de inteligência comercial, funil de conversão, performance de canais e equipe.",
};

export default function ReportsPage() {
  return <ReportsPageClient />;
}

export type {
  ReportPeriod,
  PeriodOption,
  KPIStats,
  FunnelStageData,
  ChannelPerformance,
  SellerPerformance,
  TopVehicle,
  ExecutiveReportData,
} from "@/lib/reports/types";
export { PERIOD_OPTIONS, PERIOD_METRICS, EMPTY_METRICS } from "@/lib/reports/fixtures";
