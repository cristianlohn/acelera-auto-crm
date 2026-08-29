/**
 * @file page.tsx  –  /leads
 * @description Funil Kanban de Leads do Acelera Auto CRM (Server Component).
 *
 * Realiza a busca inicial de leads diretamente no servidor (0ms de atraso visual)
 * e hidrata o LeadsPageClient.
 */

import React from "react";
import { Metadata } from "next";
import { getLeads } from "@/app/actions/leads";
import { getTeamMembersAction } from "@/app/actions/team-actions";
import { resolveUserTenantContext } from "@/lib/auth/tenant";
import { LeadsPageClient } from "@/components/leads/leads-page-client";

export const metadata: Metadata = {
  title: "Funil de Vendas & Kanban de Leads | Acelera Auto CRM",
  description:
    "Funil Kanban interativo de leads com controle de SLA e pipeline em tempo real.",
};

export default async function LeadsPage() {
  const [leads, teamMembers, tenantContext] = await Promise.all([
    getLeads(),
    getTeamMembersAction(),
    resolveUserTenantContext(),
  ]);

  return (
    <LeadsPageClient
      initialLeads={leads}
      initialTeamMembers={teamMembers}
      initialOrganizationId={tenantContext.organizationId || null}
      userRole={tenantContext.profile?.role || (tenantContext.isDemo ? undefined : "seller")}
    />
  );
}
