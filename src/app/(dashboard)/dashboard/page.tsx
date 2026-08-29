/**
 * @file page.tsx
 * @description Cockpit Inteligente com renderização adaptativa para Vendedor ou Gestor (RBAC).
 */

import React from "react";
import { resolveUserTenantContext } from "@/lib/auth/tenant";
import { normalizeRole } from "@/lib/permissions";
import { getManagerCockpitMetrics } from "@/app/actions/cockpit";
import { DashboardPageClient } from "@/components/dashboard/dashboard-page-client";

export default async function DashboardPage() {
  const tenantContext = await resolveUserTenantContext();
  const metrics = await getManagerCockpitMetrics();
  const rawRole = tenantContext.profile?.role;
  const userRole = normalizeRole(rawRole);
  const userName = tenantContext.profile?.full_name || "Vendedor";

  return (
    <DashboardPageClient
      initialMetrics={metrics}
      serverRole={userRole}
      userName={userName}
      isDemo={tenantContext.isDemo}
    />
  );
}
