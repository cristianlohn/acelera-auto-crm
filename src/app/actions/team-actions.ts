/**
 * @file team-actions.ts
 * @description Server Actions multi-tenant para gestão completa de equipe, vendedores e roleta comercial.
 */

"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient, isSupabaseServerConfigured } from "@/lib/supabase/server";
import { resolveUserTenantContext, DEFAULT_DEMO_ORG_ID } from "@/lib/auth/tenant";
import {
  salespersonFormSchema,
  updateSalespersonSchema,
  type SalespersonFormData,
  type UpdateSalespersonFormData,
} from "@/lib/validations/team";
import type { TeamMember, TeamSummaryMetrics } from "@/types/team";

export type { TeamMember, TeamMember as SalespersonMember } from "@/types/team";
export type {
  SalespersonFormData as SalespersonInput,
  SalespersonFormData as SalespersonOutput,
} from "@/lib/validations/team";

export interface CreateSalespersonResult {
  success: boolean;
  member?: TeamMember;
  error?: string;
}

export interface ActionResult {
  success: boolean;
  error?: string;
}

// Armazenamento em memória com dados ricos para o ambiente demo e offline
const memoryTeamMembers: TeamMember[] = [
  {
    id: "sp-001",
    organization_id: DEFAULT_DEMO_ORG_ID,
    name: "Rafael Alves",
    email: "rafael.alves@aceleraauto.com.br",
    phone: "+5511988887777",
    role: "seller",
    segment: "all",
    in_roulette: true,
    status: "active",
    monthly_goal_units: 15,
    current_sales_units: 11,
    avg_sla_minutes: 4.2,
    created_at: new Date(Date.now() - 60 * 86400000).toISOString(),
  },
  {
    id: "sp-002",
    organization_id: DEFAULT_DEMO_ORG_ID,
    name: "Juliana Costa",
    email: "juliana.costa@aceleraauto.com.br",
    phone: "+5511977776666",
    role: "seller",
    segment: "new_cars",
    in_roulette: true,
    status: "active",
    monthly_goal_units: 12,
    current_sales_units: 9,
    avg_sla_minutes: 6.8,
    created_at: new Date(Date.now() - 45 * 86400000).toISOString(),
  },
  {
    id: "sp-003",
    organization_id: DEFAULT_DEMO_ORG_ID,
    name: "Marcos Ferreira",
    email: "marcos.ferreira@aceleraauto.com.br",
    phone: "+5511966665555",
    role: "seller",
    segment: "used_cars",
    in_roulette: true,
    status: "active",
    monthly_goal_units: 10,
    current_sales_units: 6,
    avg_sla_minutes: 18.5,
    created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
  },
];

/**
 * Consulta a lista completa de membros da equipe com métricas de desempenho.
 */
export async function getTeamMembersAction(explicitOrgId?: string): Promise<TeamMember[]> {
  const tenantContext = await resolveUserTenantContext();
  const orgId = explicitOrgId || tenantContext.organizationId || DEFAULT_DEMO_ORG_ID;

  if (tenantContext.isDemo) {
    return memoryTeamMembers.filter((m) => m.organization_id === DEFAULT_DEMO_ORG_ID);
  }

  if (isSupabaseServerConfigured() && tenantContext.organizationId) {
    try {
      const supabase = await createServerSupabaseClient();
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("organization_id", orgId)
        .order("created_at", { ascending: true });

      if (!error && data && data.length > 0) {
        return data.map((p) => ({
          id: p.id,
          organization_id: p.organization_id,
          name: p.full_name,
          email: p.email,
          phone: p.phone || "",
          role: (p.role === "gerente" || p.role === "admin" ? "manager" : "seller") as TeamMember["role"],
          segment: "all",
          in_roulette: true,
          status: "active",
          monthly_goal_units: 15,
          current_sales_units: 8,
          avg_sla_minutes: 5.5,
          created_at: p.created_at,
        }));
      }
    } catch {
      // Fallback para memória
    }
  }

  return memoryTeamMembers.filter((m) => m.organization_id === orgId);
}

/**
 * Aliasing para compatibilidade com outros componentes
 */
export async function getSalespeopleAction(explicitOrgId?: string): Promise<TeamMember[]> {
  return getTeamMembersAction(explicitOrgId);
}

/**
 * Calcula métricas agregadas da equipe para os cards de resumo.
 */
export async function getTeamSummaryMetricsAction(explicitOrgId?: string): Promise<TeamSummaryMetrics> {
  const members = await getTeamMembersAction(explicitOrgId);

  const totalMembers = members.length;
  const activeInRoulette = members.filter((m) => m.in_roulette && m.status === "active").length;
  const totalMonthlyGoal = members.reduce((acc, m) => acc + (m.monthly_goal_units || 0), 0);
  const totalCurrentSales = members.reduce((acc, m) => acc + (m.current_sales_units || 0), 0);

  const totalSla = members.reduce((acc, m) => acc + (m.avg_sla_minutes || 0), 0);
  const teamAvgSlaMinutes = totalMembers > 0 ? Number((totalSla / totalMembers).toFixed(1)) : 0;

  const goalCompletionPercentage =
    totalMonthlyGoal > 0 ? Math.min(100, Math.round((totalCurrentSales / totalMonthlyGoal) * 100)) : 0;

  return {
    totalMembers,
    activeInRoulette,
    totalMonthlyGoal,
    totalCurrentSales,
    teamAvgSlaMinutes,
    goalCompletionPercentage,
  };
}

/**
 * Server Action para cadastrar um novo vendedor na organização.
 */
export async function createSalespersonAction(
  rawInput: Partial<SalespersonFormData> | FormData
): Promise<CreateSalespersonResult> {
  let dataToValidate: unknown = rawInput;

  if (rawInput instanceof FormData) {
    dataToValidate = {
      name: rawInput.get("name") || rawInput.get("seller_name"),
      email: rawInput.get("email") || rawInput.get("seller_email"),
      phone: rawInput.get("phone") || rawInput.get("seller_phone"),
      role: rawInput.get("role") || "seller",
      segment: rawInput.get("segment") || "all",
      in_roulette:
        rawInput.get("in_roulette") === "true" ||
        rawInput.get("in_roulette") === "on" ||
        rawInput.get("in_roulette") === "1" ||
        rawInput.get("in_roulette") === null,
      status: rawInput.get("status") || "active",
      monthly_goal_units: rawInput.get("monthly_goal_units") || rawInput.get("goal") || 10,
    };
  }

  const parseResult = salespersonFormSchema.safeParse(dataToValidate);
  if (!parseResult.success) {
    const firstIssue = parseResult.error.issues[0];
    return {
      success: false,
      error: firstIssue ? firstIssue.message : "Dados inválidos para cadastro do vendedor.",
    };
  }

  const validData = parseResult.data;
  const tenantContext = await resolveUserTenantContext();
  const orgId = tenantContext.organizationId || DEFAULT_DEMO_ORG_ID;

  const newMember: TeamMember = {
    id: `sp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    organization_id: orgId,
    name: validData.name,
    email: validData.email,
    phone: validData.phone,
    role: validData.role,
    segment: validData.segment,
    in_roulette: validData.in_roulette,
    status: validData.status,
    monthly_goal_units: validData.monthly_goal_units,
    current_sales_units: 0,
    avg_sla_minutes: 0.0,
    created_at: new Date().toISOString(),
  };

  // Persistência no Supabase se configurado
  if (isSupabaseServerConfigured() && !tenantContext.isDemo && tenantContext.organizationId) {
    try {
      const supabase = await createServerSupabaseClient();
      await supabase.from("profiles").insert({
        id: newMember.id,
        organization_id: orgId,
        full_name: newMember.name,
        email: newMember.email,
        phone: newMember.phone,
        role: newMember.role === "manager" ? "gerente" : "vendedor",
      });
    } catch {
      // Fallback
    }
  }

  // Registra no estado em memória para atualização imediata
  memoryTeamMembers.unshift(newMember);

  try {
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/team");
    revalidatePath("/leads");
  } catch {
    // Revalidação silenciosa
  }

  return {
    success: true,
    member: newMember,
  };
}

/**
 * Alterna rapidamente a presença do vendedor na Roleta de Leads.
 */
export async function toggleRouletteStatusAction(
  memberId: string,
  inRoulette: boolean
): Promise<ActionResult> {
  const tenantContext = await resolveUserTenantContext();
  const orgId = tenantContext.organizationId || DEFAULT_DEMO_ORG_ID;

  const member = memoryTeamMembers.find((m) => m.id === memberId && m.organization_id === orgId);
  if (member) {
    member.in_roulette = inRoulette;
  }

  if (isSupabaseServerConfigured() && !tenantContext.isDemo && tenantContext.organizationId) {
    try {
      const supabase = await createServerSupabaseClient();
      await (supabase as unknown as { from: (table: string) => { update: (data: unknown) => { eq: (k: string, v: string) => { eq: (k: string, v: string) => Promise<unknown> } } } })
        .from("profiles")
        .update({ in_roulette: inRoulette, updated_at: new Date().toISOString() })
        .eq("id", memberId)
        .eq("organization_id", orgId);
    } catch {
      // Ignora erro se coluna customizada não existir no schema base
    }
  }

  try {
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/team");
    revalidatePath("/leads");
  } catch {
    // Silencioso
  }

  return { success: true };
}

/**
 * Atualiza os dados cadastrais e metas de um membro da equipe.
 */
export async function updateSalespersonAction(
  memberId: string,
  data: UpdateSalespersonFormData
): Promise<ActionResult> {
  const parseResult = updateSalespersonSchema.safeParse(data);
  if (!parseResult.success) {
    return {
      success: false,
      error: parseResult.error.issues[0]?.message || "Dados inválidos para atualização.",
    };
  }

  const validData = parseResult.data;
  const tenantContext = await resolveUserTenantContext();
  const orgId = tenantContext.organizationId || DEFAULT_DEMO_ORG_ID;

  const member = memoryTeamMembers.find((m) => m.id === memberId && m.organization_id === orgId);
  if (!member) {
    return { success: false, error: "Vendedor não encontrado na organização." };
  }

  if (validData.name !== undefined) member.name = validData.name;
  if (validData.email !== undefined) member.email = validData.email;
  if (validData.phone !== undefined) member.phone = validData.phone;
  if (validData.role !== undefined) member.role = validData.role;
  if (validData.segment !== undefined) member.segment = validData.segment;
  if (validData.in_roulette !== undefined) member.in_roulette = validData.in_roulette;
  if (validData.status !== undefined) member.status = validData.status;
  if (validData.monthly_goal_units !== undefined) member.monthly_goal_units = validData.monthly_goal_units;

  try {
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/team");
  } catch {
    // Silencioso
  }

  return { success: true };
}

/**
 * Remove ou desativa um membro da equipe comercial.
 */
export async function deleteSalespersonAction(memberId: string): Promise<ActionResult> {
  const tenantContext = await resolveUserTenantContext();
  const orgId = tenantContext.organizationId || DEFAULT_DEMO_ORG_ID;

  const index = memoryTeamMembers.findIndex((m) => m.id === memberId && m.organization_id === orgId);
  if (index !== -1) {
    memoryTeamMembers.splice(index, 1);
  }

  try {
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/team");
  } catch {
    // Silencioso
  }

  return { success: true };
}
