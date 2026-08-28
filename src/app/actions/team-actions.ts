/**
 * @file team-actions.ts
 * @description Server Actions multi-tenant para gestão completa de equipe, vendedores e roleta comercial.
 */

"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient, isSupabaseServerConfigured } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveUserTenantContext, DEFAULT_DEMO_ORG_ID } from "@/lib/auth/tenant";
import { sendInviteEmailViaResend } from "@/lib/services/email/resend-service";
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

      const members: TeamMember[] = (!error && data) ? data.map((p) => ({
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
      })) : [];

      // Consulta convites pendentes
      const { data: invites } = (await supabase
        .from("organization_invites")
        ?.select?.("*")
        ?.eq?.("organization_id", orgId)
        ?.eq?.("status", "pending")) || { data: null };

      if (invites && invites.length > 0) {
        invites.forEach((inv) => {
          if (!members.some((m) => m.email.toLowerCase() === inv.email.toLowerCase())) {
            members.push({
              id: `inv-${inv.id}`,
              organization_id: inv.organization_id,
              name: inv.full_name,
              email: inv.email,
              phone: inv.phone || "",
              role: (inv.role === "gerente" || inv.role === "manager" ? "manager" : "seller") as TeamMember["role"],
              segment: "all",
              in_roulette: false,
              status: "pending",
              monthly_goal_units: 10,
              current_sales_units: 0,
              avg_sla_minutes: 0,
              created_at: inv.created_at,
            });
          }
        });
      }

      if (members.length > 0) {
        return members;
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
 * Server Action para convidar vendedores com ciclo inteligente (usuário novo vs existente via Resend).
 */
export async function inviteSellerAction(formData: {
  fullName: string;
  email: string;
  phone: string;
  role: string;
}): Promise<{
  success: boolean;
  error?: string;
  message?: string;
  data?: unknown;
  inviteToken?: string;
  isExistingUser?: boolean;
}> {
  try {
    const cleanEmail = (formData.email || "").trim().toLowerCase();
    const cleanPhone = (formData.phone || "").replace(/\D/g, "");

    if (!cleanEmail || !cleanEmail.includes("@")) {
      return {
        success: false,
        error: "Informe um endereço de e-mail corporativo válido.",
      };
    }

    const tenantContext = await resolveUserTenantContext();
    const currentOrgId = tenantContext.organizationId || DEFAULT_DEMO_ORG_ID;
    const currentOrgName = tenantContext.organization?.name || "Acelera Auto Concessionária";

    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://aceleraautocrm.com.br");

    if (isSupabaseServerConfigured() && !tenantContext.isDemo && tenantContext.organizationId) {
      const supabaseAdmin = createAdminClient();

      // 1. Verifica se o usuário já existe no Auth / Profiles
      const { data: existingUser } = (await supabaseAdmin
        .from("profiles")
        ?.select?.("id, email, full_name, organization_id")
        ?.eq?.("email", cleanEmail)
        ?.maybeSingle?.()) || { data: null };

      if (existingUser) {
        // 2A. USUÁRIO JÁ EXISTE:
        // Verifica se já é membro ativo desta mesma organização
        const { data: existingMember } = (await supabaseAdmin
          .from("organization_members")
          ?.select?.("id, status")
          ?.eq?.("organization_id", currentOrgId)
          ?.eq?.("user_id", existingUser.id)
          ?.maybeSingle?.()) || { data: null };

        if ((existingMember && existingMember.status === "active") || existingUser.organization_id === currentOrgId) {
          return { success: false, error: "Este vendedor já faz parte da sua equipe." };
        }

        // Cria/atualiza convite pendente
        const inviteToken = crypto.randomUUID();
        await supabaseAdmin.from("organization_invites").upsert(
          {
            organization_id: currentOrgId,
            email: cleanEmail,
            full_name: formData.fullName,
            phone: cleanPhone,
            role: formData.role || "seller",
            token: inviteToken,
            status: "pending",
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "token" }
        );

        // Dispara e-mail de convite via Resend com o link de aceite
        const acceptUrl = `${appUrl}/invite/accept?token=${inviteToken}`;
        await sendInviteEmailViaResend({
          to: cleanEmail,
          recipientName: formData.fullName,
          storeName: currentOrgName,
          acceptUrl,
          isExistingUser: true,
        });

        try {
          revalidatePath("/team");
          revalidatePath("/dashboard/team");
          revalidatePath("/settings");
        } catch {}

        return {
          success: true,
          message: "Convite de transferência/admissão enviado por e-mail.",
          inviteToken,
          isExistingUser: true,
        };
      } else {
        // 2B. NOVO USUÁRIO:
        // Cria convite pendente no banco
        const inviteToken = crypto.randomUUID();
        await supabaseAdmin.from("organization_invites").upsert(
          {
            organization_id: currentOrgId,
            email: cleanEmail,
            full_name: formData.fullName,
            phone: cleanPhone,
            role: formData.role || "seller",
            token: inviteToken,
            status: "pending",
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "token" }
        );

        // Dispara convite oficial do Supabase Auth para definição de senha
        const { error: authError } = await supabaseAdmin.auth.admin.inviteUserByEmail(cleanEmail, {
          data: {
            full_name: formData.fullName,
            organization_id: currentOrgId,
            role: formData.role || "seller",
            phone: cleanPhone,
          },
          redirectTo: `${appUrl}/auth/callback?next=/reset-password`,
        });

        if (authError) {
          console.error("[SUPABASE_INVITE_ERROR]:", authError);
          return { success: false, error: `Erro no envio: ${authError.message}` };
        }

        try {
          revalidatePath("/team");
          revalidatePath("/dashboard/team");
          revalidatePath("/settings");
        } catch {}

        return {
          success: true,
          message: "Convite para novo usuário enviado com sucesso.",
          inviteToken,
          isExistingUser: false,
        };
      }
    }

    // Ambiente Demo / Offline:
    return {
      success: true,
      message: "Convite para novo usuário enviado com sucesso.",
      isExistingUser: false,
    };
  } catch (err: unknown) {
    console.error("[SUPABASE_INVITE_ERROR]:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Erro ao disparar e-mail de convite.",
    };
  }
}

/**
 * Server Action para aceitar convite de organização via token.
 */
export async function acceptInviteAction(token: string): Promise<{
  success: boolean;
  error?: string;
  organizationId?: string;
  storeName?: string;
  redirectUrl?: string;
}> {
  try {
    if (!token) {
      return { success: false, error: "Token de convite não fornecido." };
    }

    const tenantContext = await resolveUserTenantContext();
    if (tenantContext.isDemo) {
      return {
        success: true,
        organizationId: "demo-org",
        storeName: "Acelera Auto Demonstração",
      };
    }

    if (!isSupabaseServerConfigured()) {
      return {
        success: true,
        organizationId: "local-org",
        storeName: "Loja Local",
      };
    }

    const supabaseAdmin = createAdminClient();

    // 1. Busca convite pelo token
    const { data: invite, error: inviteErr } = (await supabaseAdmin
      .from("organization_invites")
      ?.select?.("*, organizations(name)")
      ?.eq?.("token", token)
      ?.maybeSingle?.()) || { data: null };

    if (inviteErr || !invite) {
      return { success: false, error: "Convite não encontrado ou token inválido." };
    }

    const typedInvite = invite as {
      id: string;
      organization_id: string;
      role: string;
      status: string;
      expires_at: string;
      organizations?: { name?: string } | null;
    };

    if (typedInvite.status === "accepted") {
      return {
        success: true,
        organizationId: typedInvite.organization_id,
        storeName: typedInvite.organizations?.name || "Loja",
      };
    }

    if (typedInvite.status === "revoked" || typedInvite.status === "expired") {
      return { success: false, error: "Este convite foi revogado ou expirou." };
    }

    if (typedInvite.expires_at && new Date(typedInvite.expires_at).getTime() < Date.now()) {
      await supabaseAdmin
        .from("organization_invites")
        ?.update?.({ status: "expired" })
        ?.eq?.("id", typedInvite.id);
      return { success: false, error: "Este convite expirou (validade de 7 dias)." };
    }

    // 2. Se o usuário estiver autenticado, vincula imediatamente
    if (tenantContext.userId) {
      const user = { id: tenantContext.userId };
      const newOrgId = typedInvite.organization_id;
      const isSeller =
        typedInvite.role === "seller" ||
        typedInvite.role === "vendedor" ||
        typedInvite.role === "sdr";

      // 1. Se for vendedor, busca se ele possui vínculos ativos em OUTRAS organizações
      if (isSeller) {
        const { data: previousMemberships } = (await supabaseAdmin
          .from("organization_members")
          ?.select?.("id, organization_id, role")
          ?.eq?.("user_id", user.id)
          ?.eq?.("status", "active")
          ?.neq?.("organization_id", newOrgId)) || { data: null };

        if (previousMemberships && previousMemberships.length > 0) {
          for (const prev of previousMemberships) {
            // Dupla checagem de segurança em memória: permite múltiplos vínculos ativos para owner ou admin
            if (prev.role === "owner" || prev.role === "admin") {
              continue;
            }

            // A. Desativa apenas o vínculo de vendedor na loja antiga
            await supabaseAdmin
              .from("organization_members")
              ?.update?.({
                status: "transferred",
                updated_at: new Date().toISOString(),
              })
              ?.eq?.("id", prev.id);

            // B. Remove da roleta de distribuição de leads da loja antiga
            try {
              await (supabaseAdmin as unknown as { from: (table: string) => { delete: () => { eq: (k: string, v: string) => { eq: (k: string, v: string) => Promise<unknown> } } } })
                .from("roleta_sellers")
                ?.delete?.()
                ?.eq?.("organization_id", prev.organization_id)
                ?.eq?.("user_id", user.id);
            } catch {}

            // C. Encontra um Admin/Owner/Gerente da loja antiga para receber os leads em aberto
            const { data: adminMember } = (await supabaseAdmin
              .from("organization_members")
              ?.select?.("user_id")
              ?.eq?.("organization_id", prev.organization_id)
              ?.in?.("role", ["owner", "admin", "gerente"])
              ?.eq?.("status", "active")
              ?.limit?.(1)
              ?.maybeSingle?.()) || { data: null };

            if (adminMember?.user_id) {
              await supabaseAdmin
                .from("leads")
                ?.update?.({
                  seller_id: adminMember.user_id,
                  updated_at: new Date().toISOString(),
                })
                ?.eq?.("organization_id", prev.organization_id)
                ?.eq?.("seller_id", user.id)
                ?.neq?.("status", "fechado");
            }
          }
        }
      }

      // 3. Vincula o usuário à nova organização como 'active'
      await supabaseAdmin.from("organization_members")?.upsert?.(
        {
          organization_id: newOrgId,
          user_id: user.id,
          role: typedInvite.role || "seller",
          status: "active",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "organization_id,user_id" }
      );

      // 4. Marca o convite como aceito
      await supabaseAdmin
        .from("organization_invites")
        ?.update?.({ status: "accepted", updated_at: new Date().toISOString() })
        ?.eq?.("id", typedInvite.id);

      // 5. Atualiza a organização ativa no profile/sessão
      await supabaseAdmin
        .from("profiles")
        ?.update?.({
          organization_id: newOrgId,
          role: typedInvite.role === "manager" ? "gerente" : "vendedor",
          updated_at: new Date().toISOString(),
        })
        ?.eq?.("id", user.id);
    }

    return {
      success: true,
      organizationId: typedInvite.organization_id,
      storeName: typedInvite.organizations?.name || "Loja",
      redirectUrl: "/cockpit",
    };
  } catch (err: unknown) {
    console.error("[ACCEPT_INVITE_ERROR]:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Erro ao processar aceite do convite.",
    };
  }
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
  const cleanEmail = validData.email.trim().toLowerCase();
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

      // Passo 0: Validação de usuário já existente
      const { data: existingUser } = (await supabaseAdmin
        .from("profiles")
        ?.select?.("id, full_name, organization_id")
        ?.eq?.("email", cleanEmail)
        ?.maybeSingle?.()) || { data: null };

      if (existingUser && existingUser.organization_id === orgId) {
        return {
          success: false,
          error: `O e-mail ${cleanEmail} já faz parte da equipe da sua loja.`,
        };
      }

      if (existingUser) {
        memberId = existingUser.id;
        try {
          const linkRes = await supabaseAdmin.auth.admin.generateLink({
            type: "magiclink",
            email: cleanEmail,
            options: { redirectTo },
          });
          if (!linkRes.error && linkRes.data?.properties?.action_link) {
            fallbackInviteLink = linkRes.data.properties.action_link;
            emailSent = true;
          }
        } catch {}
      } else {
        // Passo 1: Disparo Automático de E-mail via SMTP do Supabase
        const inviteRes = await supabaseAdmin.auth.admin.inviteUserByEmail(cleanEmail, {
          redirectTo,
          data: {
            full_name: validData.name,
            phone: validData.phone.replace(/\D/g, ""),
            role: validData.role || "seller",
          },
        });

        if (inviteRes.error) {
          if (
            inviteRes.error.message?.includes("already been registered") ||
            inviteRes.error.message?.includes("already exists") ||
            (inviteRes.error as { status?: number }).status === 422
          ) {
            try {
              const linkRes = await supabaseAdmin.auth.admin.generateLink({
                type: "magiclink",
                email: cleanEmail,
                options: { redirectTo },
              });
              if (!linkRes.error && linkRes.data?.properties?.action_link) {
                fallbackInviteLink = linkRes.data.properties.action_link;
                emailSent = true;
                if (linkRes.data?.user?.id) {
                  memberId = linkRes.data.user.id;
                }
              }
            } catch {}
          } else {
            console.error("[SUPABASE_INVITE_ERROR]:", inviteRes.error);
            return {
              success: false,
              error: inviteRes.error.message || "Erro ao disparar e-mail de convite.",
            };
          }
        } else if (inviteRes.data?.user) {
          emailSent = true;
          memberId = inviteRes.data.user.id;
        }

        // Passo 2: Geração do Link de Contingência
        if (!fallbackInviteLink) {
          try {
            const linkRes = await supabaseAdmin.auth.admin.generateLink({
              type: "invite",
              email: cleanEmail,
              options: { redirectTo },
            });
            if (!linkRes.error && linkRes.data?.properties?.action_link) {
              fallbackInviteLink = linkRes.data.properties.action_link;
            }
          } catch {}
        }
      }

      // Passo 3: Persistência no Banco (profiles)
      await supabaseAdmin.from("profiles").upsert(
        {
          id: memberId,
          organization_id: orgId,
          full_name: validData.name,
          email: cleanEmail,
          phone: validData.phone,
          role: validData.role === "manager" ? "gerente" : "vendedor",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      );
    } catch (err) {
      console.error("[SUPABASE_INVITE_ERROR]:", err);
      return {
        success: false,
        error: err instanceof Error ? err.message : "Erro ao disparar e-mail de convite.",
      };
    }
  } else {
    // Ambiente Demo / Offline: simula envio com sucesso e gera link de contingência
    emailSent = true;
    fallbackInviteLink = `${redirectTo}?token=demo_${Date.now()}&email=${encodeURIComponent(cleanEmail)}`;
  }

  if (!fallbackInviteLink) {
    fallbackInviteLink = `${redirectTo}?email=${encodeURIComponent(cleanEmail)}`;
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
 * Bloqueia categoricamente a exclusão de Dono ('owner') ou Administrador ('admin').
 */
export async function deleteSalespersonAction(memberId: string): Promise<ActionResult> {
  const cleanId = memberId.startsWith("inv-") ? memberId.replace(/^inv-/, "") : memberId;
  const tenantContext = await resolveUserTenantContext();
  const orgId = tenantContext.organizationId || DEFAULT_DEMO_ORG_ID;

  // 1. Checagem em memória
  const memoryMember = memoryTeamMembers.find(
    (m) => (m.id === memberId || m.id === cleanId) && m.organization_id === orgId
  );
  if (memoryMember && (String(memoryMember.role) === "admin" || String(memoryMember.role) === "owner")) {
    return {
      success: false,
      error: "O proprietário da loja não pode ser desvinculado.",
    };
  }

  // 2. Checagem e remoção no Supabase se configurado
  if (isSupabaseServerConfigured() && !tenantContext.isDemo && tenantContext.organizationId) {
    try {
      const supabaseAdmin = createAdminClient();

      // Deleta convite pendente se existir
      try {
        const { data: invite } = await supabaseAdmin
          .from("organization_invites")
          .select("id, organization_id, email")
          .eq("organization_id", orgId)
          .eq("id", cleanId)
          .maybeSingle();

        if (invite) {
          await supabaseAdmin.from("organization_invites").delete().eq("id", invite.id);
          if (invite.email) {
            await supabaseAdmin
              .from("profiles")
              .update({ organization_id: null as unknown as string })
              .eq("email", invite.email.toLowerCase())
              .eq("organization_id", orgId);
          }
        }
      } catch {}

      // Checa se o membro alvo tem papel de owner ou admin em profiles
      const { data: targetProfile } = (await supabaseAdmin
        .from("profiles")
        ?.select?.("id, role, organization_id, email")
        ?.eq?.("id", cleanId)
        ?.eq?.("organization_id", orgId)
        ?.maybeSingle?.()) || { data: null };

      if (targetProfile && (targetProfile.role === "admin" || (targetProfile.role as string) === "owner")) {
        return {
          success: false,
          error: "O proprietário da loja não pode ser desvinculado.",
        };
      }

      // Checa se o membro alvo tem papel de owner ou admin em organization_members
      const { data: targetMember } = (await supabaseAdmin
        .from("organization_members")
        ?.select?.("id, role, status")
        ?.eq?.("user_id", cleanId)
        ?.eq?.("organization_id", orgId)
        ?.maybeSingle?.()) || { data: null };

      if (targetMember && (targetMember.role === "owner" || targetMember.role === "admin")) {
        return {
          success: false,
          error: "O proprietário da loja não pode ser desvinculado.",
        };
      }

      // Desvincula em profiles
      if (targetProfile) {
        await supabaseAdmin
          .from("profiles")
          .update({ organization_id: null as unknown as string })
          .eq("id", cleanId);

        if (targetProfile.email) {
          await supabaseAdmin
            .from("organization_invites")
            .delete()
            .eq("organization_id", orgId)
            .eq("email", targetProfile.email.toLowerCase());
        }
      }

      // Desativa vínculo em organization_members
      await supabaseAdmin
        .from("organization_members")
        ?.delete?.()
        ?.eq?.("user_id", cleanId)
        ?.eq?.("organization_id", orgId);

      // Remove da roleta de vendedores
      await supabaseAdmin
        .from("roleta_sellers")
        ?.delete?.()
        ?.eq?.("organization_id", orgId)
        ?.eq?.("user_id", cleanId);
    } catch (err) {
      console.error("[DELETE_SELLER_ERROR]:", err);
    }
  }

  const index = memoryTeamMembers.findIndex(
    (m) => (m.id === memberId || m.id === cleanId) && m.organization_id === orgId
  );
  if (index !== -1) {
    memoryTeamMembers.splice(index, 1);
  }

  try {
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/team");
    revalidatePath("/team");
    revalidatePath("/settings");
  } catch {
    // Silencioso
  }

  return { success: true };
}

export const removeMemberAction = deleteSalespersonAction;
export const deleteSellerAction = deleteSalespersonAction;
export const acceptOrganizationInviteAction = acceptInviteAction;
