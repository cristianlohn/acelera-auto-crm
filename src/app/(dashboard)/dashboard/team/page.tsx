/**
 * @file page.tsx
 * @description Página de Gestão de Equipe e Roleta de Vendas em /dashboard/team.
 */

import React from "react";
import { getTeamMembersAction, getTeamSummaryMetricsAction } from "@/app/actions/team-actions";
import { TeamPageClient } from "@/components/team/team-page-client";

export default async function TeamPage() {
  const [members, metrics] = await Promise.all([
    getTeamMembersAction(),
    getTeamSummaryMetricsAction(),
  ]);

  return <TeamPageClient initialMembers={members} initialMetrics={metrics} />;
}
