import React from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getTeamMembersAction, getTeamSummaryMetricsAction } from "@/app/actions/team-actions";
import { TeamPageClient } from "@/components/team/team-page-client";
import { resolveUserTenantContext } from "@/lib/auth/tenant";
import { canManageTeam } from "@/lib/permissions";

export default async function TeamPage() {
  const tenantContext = await resolveUserTenantContext();
  let userRole: string = (tenantContext.profile?.role as string) || "admin";

  try {
    const cookieStore = await cookies();
    const demoRoleCookie = cookieStore.get("acelera_demo_role")?.value;
    if (tenantContext.isDemo && demoRoleCookie) {
      userRole = demoRoleCookie;
    }
  } catch {
    //
  }

  if (!canManageTeam(userRole)) {
    redirect("/dashboard");
  }

  const [members, metrics] = await Promise.all([
    getTeamMembersAction(),
    getTeamSummaryMetricsAction(),
  ]);

  return <TeamPageClient initialMembers={members} initialMetrics={metrics} />;
}
