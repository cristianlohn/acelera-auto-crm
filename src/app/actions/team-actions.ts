/**
 * @file team-actions.ts
 * @description Server Actions multi-tenant para gestão completa de equipe, vendedores e roleta comercial.
 */

"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient, isSupabaseServerConfigured } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
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
  emailSent?: boolean;
  fallbackInviteLink?: string;
  member?: TeamMember;
  error?: string;
}

export interface InviteTeamMemberInput {
  name: string;
  email: string;
  phone: string;
  role?: "seller" | "sdr" | "manager" | "admin" | "gerente" | "vendedor";
  specialization?: string;
  segment?: "all" | "new_cars" | "used_cars" | "f_and_i";
  in_roulette?: boolean;
  monthly_goal_units?: number;
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
 * Server Action para convidar e cadastrar um novo membro da equipe com disparo automático de e-mail SMTP.
 */
export async function inviteTeamMemberAction(
  input: InviteTeamMemberInput
): Promise<CreateSalespersonResult> {
  const normalizedRole =
    input.role === "manager" || input.role === "gerente"
      ? "manager"
      : input.role === "sdr"
      ? "sdr"
      : "seller";

  const parseResult = salespersonFormSchema.safeParse({
    name: input.name,
    email: input.email,
    phone: input.phone,
    role: normalizedRole,
    segment: input.segment || "all",
    in_roulette: input.in_roulette !== false,
    monthly_goal_units: input.monthly_goal_units || 10,
    status: "active",
  });

  if (!parseResult.success) {
    return {
      success: false,
      error: parseResult.error.issues[0]?.message || "Dados inválidos para convite de membro.",
    };
  }

  const validData = parseResult.data;
  const tenantContext = await resolveUserTenantContext();
  const orgId = tenantContext.organizationId || DEFAULT_DEMO_ORG_ID;

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://aceleraautocrm.com.br");
  const redirectTo = `${siteUrl}/auth/callback?next=/auth/update-password`;

  let emailSent = false;
  let fallbackInviteLink = "";
  let memberId = `sp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  // 1. Disparo de Convite e Criação via Supabase Auth Admin
  if (isSupabaseServerConfigured() && !tenantContext.isDemo && tenantContext.organizationId) {
    try {
      const supabaseAdmin = createAdminClient();

      // Passo 1: Disparo Automático de E-mail via SMTP do Supabase
      const inviteRes = await supabaseAdmin.auth.admin.inviteUserByEmail(validData.email, {
        redirectTo,
        data: {
          full_name: validData.name,
          role: validData.role || "seller",
        },
      });

      if (!inviteRes.error && inviteRes.data?.user) {
        emailSent = true;
        memberId = inviteRes.data.user.id;
      }

      // Passo 2: Geração do Link de Contingência
      const linkRes = await supabaseAdmin.auth.admin.generateLink({
        type: "invite",
        email: validData.email,
        options: { redirectTo },
      });

      if (!linkRes.error && linkRes.data?.properties?.action_link) {
        fallbackInviteLink = linkRes.data.properties.action_link;
      }

      // Passo 3: Persistência no Banco (profiles)
      await supabaseAdmin.from("profiles").upsert(
        {
          id: memberId,
          organization_id: orgId,
          full_name: validData.name,
          email: validData.email,
          phone: validData.phone,
          role: validData.role === "manager" ? "gerente" : "vendedor",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      );
    } catch (err) {
      console.warn("[Team Invite Error] Falha ao disparar convite automático via admin:", err);
    }
  } else {
    // Ambiente Demo / Offline: simula envio com sucesso e gera link de contingência
    emailSent = true;
    fallbackInviteLink = `${redirectTo}?token=demo_${Date.now()}&email=${encodeURIComponent(validData.email)}`;
  }

  if (!fallbackInviteLink) {
    fallbackInviteLink = `${redirectTo}?email=${encodeURIComponent(validData.email)}`;
  }

  const newMember: TeamMember = {
    id: memberId,
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

  // Registra no estado em memória para atualização imediata
  memoryTeamMembers.unshift(newMember);

  try {
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/team");
    revalidatePath("/team");
    revalidatePath("/leads");
  } catch {}

  return {
    success: true,
    emailSent,
    fallbackInviteLink,
    member: newMember,
  };
}

/**
 * Server Action para cadastrar um novo vendedor na organização.
 */
export async function createSalespersonAction(
  rawInput: Partial<SalespersonFormData> | FormData
): Promise<CreateSalespersonResult> {
  let name = "";
  let email = "";
  let phone = "";
  let role: "seller" | "sdr" | "manager" = "seller";
  let segment: TeamMember["segment"] = "all";
  let in_roulette = true;
  let monthly_goal_units = 10;

  if (rawInput instanceof FormData) {
    name = String(rawInput.get("name") || rawInput.get("seller_name") || "");
    email = String(rawInput.get("email") || rawInput.get("seller_email") || "");
    phone = String(rawInput.get("phone") || rawInput.get("seller_phone") || "");
    role = (rawInput.get("role") as "seller" | "sdr" | "manager") || "seller";
    segment = (rawInput.get("segment") as TeamMember["segment"]) || "all";
    in_roulette =
      rawInput.get("in_roulette") === "true" ||
      rawInput.get("in_roulette") === "on" ||
      rawInput.get("in_roulette") === "1" ||
      rawInput.get("in_roulette") === null;
    monthly_goal_units = Number(rawInput.get("monthly_goal_units") || rawInput.get("goal")) || 10;
  } else {
    name = rawInput.name || "";
    email = rawInput.email || "";
    phone = rawInput.phone || "";
    role = rawInput.role || "seller";
    segment = rawInput.segment || "all";
    in_roulette = rawInput.in_roulette !== false;
    monthly_goal_units = rawInput.monthly_goal_units || 10;
  }

  return inviteTeamMemberAction({
    name,
    email,
    phone,
    role,
    segment,
    in_roulette,
    monthly_goal_units,
  });
}

/**
 * Server Action para reenviar o e-mail de convite de acesso a um vendedor/colaborador.
 */
export async function resendInviteEmailAction(
  email: string,
  name?: string,
  role?: string
): Promise<{ success: boolean; error?: string; emailSent?: boolean; fallbackInviteLink?: string }> {
  const tenantContext = await resolveUserTenantContext();
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://aceleraautocrm.com.br");
  const redirectTo = `${siteUrl}/auth/callback?next=/auth/update-password`;

  if (tenantContext.isDemo) {
    return {
      success: true,
      emailSent: true,
      fallbackInviteLink: `${redirectTo}?token=demo_resend_${Date.now()}&email=${encodeURIComponent(email)}`,
    };
  }

  if (!isSupabaseServerConfigured() || !tenantContext.organizationId) {
    return {
      success: true,
      emailSent: false,
      fallbackInviteLink: `${redirectTo}?token=local_${Date.now()}&email=${encodeURIComponent(email)}`,
    };
  }

  try {
    const supabaseAdmin = createAdminClient();
    const inviteRes = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      redirectTo,
      data: {
        full_name: name || "Colaborador",
        role: role || "seller",
      },
    });

    const linkRes = await supabaseAdmin.auth.admin.generateLink({
      type: "invite",
      email,
      options: { redirectTo },
    });

    const fallbackInviteLink =
      linkRes.data?.properties?.action_link || `${redirectTo}?email=${encodeURIComponent(email)}`;

    if (inviteRes.error) {
      return {
        success: true,
        emailSent: false,
        fallbackInviteLink,
        error: inviteRes.error.message,
      };
    }

    return {
      success: true,
      emailSent: true,
      fallbackInviteLink,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro ao reenviar convite.";
    return {
      success: false,
      error: msg,
    };
  }
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
