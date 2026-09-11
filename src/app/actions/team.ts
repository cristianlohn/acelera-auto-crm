/**
 * @file team.ts
 * @description Server Actions para gestão de equipe, convite de colaboradores e controle de capacidade por plano.
 *
 * Regras de Negócio:
 * - Validação estrita do limite de vagas da organização (`max_sellers`).
 * - Bloqueio de novos membros com disparo de trigger de upgrade caso o limite seja atingido.
 * - Proteção do perfil administrativo proprietário (`admin`) contra exclusão acidental.
 * - Persistência relacional com isolamento multi-tenant e fallback em memória.
 */

"use server";

import { revalidatePath } from "next/cache";
import {
  createServerSupabaseClient,
  isSupabaseServerConfigured,
} from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  INITIAL_CAPACITY,
  INITIAL_TEAM_MEMBERS,
  type TeamMember,
  type TeamCapacity,
  type InviteMemberInput,
  type InviteResult,
} from "@/lib/team-data";
import { CANONICAL_PLANS, isSalesRole } from "@/config/plans";
import { memoryTeamMembers } from "@/lib/crm/team-memory";
import type { TeamMember as SharedTeamMember } from "@/types/team";
import { resolveUserTenantContext, DEFAULT_DEMO_ORG_ID } from "@/lib/auth/tenant";

import {
  inviteTeamMemberAction as _inviteTeamMemberAction,
  resendInviteEmailAction as _resendInviteEmailAction,
  inviteSellerAction as _inviteSellerAction,
  acceptInviteAction as _acceptInviteAction,
  deleteSalespersonAction as _deleteSalespersonAction,
  removeMemberAction as _removeMemberAction,
  deleteSellerAction as _deleteSellerAction,
  removeTeamMemberAction,
  acceptOrganizationInviteAction as _acceptOrganizationInviteAction,
  type InviteTeamMemberInput,
} from "./team-actions";

export { removeTeamMemberAction };

export type {
  TeamMember,
  TeamCapacity,
  InviteMemberInput,
  InviteResult,
  InviteTeamMemberInput,
};

/**
 * Server Action unificada para convidar membros de equipe.
 */
export async function inviteTeamMemberAction(input: InviteTeamMemberInput) {
  return _inviteTeamMemberAction(input);
}

/**
 * Server Action para convidar vendedores.
 */
export async function inviteSellerAction(formData: {
  fullName: string;
  email: string;
  phone: string;
  role: string;
}) {
  return _inviteSellerAction(formData);
}

/**
 * Server Action para aceitar convite de organização.
 */
export async function acceptInviteAction(token: string) {
  return _acceptInviteAction(token);
}

export async function acceptOrganizationInviteAction(token: string) {
  return _acceptOrganizationInviteAction(token);
}
export async function deleteSalespersonAction(memberId: string, orgId?: string) {
  return _deleteSalespersonAction(memberId, orgId);
}
export async function removeMemberAction(memberId: string, orgId?: string) {
  return _removeMemberAction(memberId, orgId);
}
export async function deleteSellerAction(memberId: string, orgId?: string) {
  return _deleteSellerAction(memberId, orgId);
}

/**
 * Server Action unificada para reenviar convite por e-mail.
 */
export async function resendInviteEmailAction(email: string, name?: string, role?: string) {
  return _resendInviteEmailAction(email, name, role);
}

// Estado local para capacidade e fallback de equipe
let localCapacity: TeamCapacity = { ...INITIAL_CAPACITY };

function getSharedDemoTeamMembers(): TeamMember[] {
  const roleOrder: Record<string, number> = { admin: 1, manager: 2, gerente: 2, seller: 3, vendedor: 3 };
  const sorted = [...memoryTeamMembers].sort((a, b) => (roleOrder[a.role] || 9) - (roleOrder[b.role] || 9));
  return sorted.map((m) => ({
    id: m.id,
    organizationId: m.organization_id,
    fullName: m.name,
    email: m.email,
    phone: m.phone,
    role: (m.role === "manager" ? "gerente" : m.role === "seller" ? "vendedor" : "admin") as "admin" | "gerente" | "vendedor",
    status: (m.status === "pending" ? "pending" : "active") as "active" | "pending",
    avatarUrl: null,
    createdAt: m.created_at,
  }));
}

/**
 * Retorna o status de ocupação da equipe vs capacidade do plano da organização atual.
 */
export async function getTeamCapacity(): Promise<TeamCapacity> {
  const tenantContext = await resolveUserTenantContext();
  const members = await getTeamMembers();

  // Gestores e Admins NÃO consomem vagas comerciais (apenas vendedores contam)
  const sellersOnly = members.filter((m) => isSalesRole(m.role));
  const currentCount = sellersOnly.length;

  if (!tenantContext.isDemo && tenantContext.organizationId) {
    const org = tenantContext.organization;
    const plan = ((org?.plan || "starter") as string).toLowerCase();
    const planKey = (plan === "enterprise" || plan === "pro" ? plan : "starter") as "starter" | "pro" | "enterprise";
    const planConfig = CANONICAL_PLANS[planKey] || CANONICAL_PLANS.starter;

    let maxSellers: number | null = planConfig.sellerLimit;
    let hasAvailableSlots = false;

    if (planKey === "enterprise") {
      const orgMaxSellers = (org as unknown as { max_sellers?: number | null })?.max_sellers;
      const isUnlimited =
        (org as unknown as { enterprise_unlimited?: boolean; unlimited_sellers?: boolean })?.enterprise_unlimited === true ||
        (org as unknown as { enterprise_unlimited?: boolean; unlimited_sellers?: boolean })?.unlimited_sellers === true;

      if (typeof orgMaxSellers === "number") {
        maxSellers = orgMaxSellers;
        hasAvailableSlots = currentCount < orgMaxSellers;
      } else if (isUnlimited) {
        maxSellers = null;
        hasAvailableSlots = true;
      } else {
        maxSellers = null;
        hasAvailableSlots = false;
      }
    } else {
      maxSellers = (org as unknown as { max_sellers?: number | null })?.max_sellers ?? planConfig.sellerLimit;
      hasAvailableSlots = maxSellers !== null ? currentCount < maxSellers : false;
    }

    return {
      currentCount,
      maxSellers,
      plan: planKey,
      planName: planConfig.name,
      hasAvailableSlots,
    };
  }

  const hasAvailableSlots =
    localCapacity.maxSellers === null ? false : currentCount < localCapacity.maxSellers;

  return {
    ...localCapacity,
    currentCount,
    hasAvailableSlots,
  };
}

/**
 * Consulta a lista de colaboradores vinculados à organização logada.
 */
export async function getTeamMembers(): Promise<TeamMember[]> {
  const tenantContext = await resolveUserTenantContext();

  // 1. Modo Demonstração explícito
  if (tenantContext.isDemo) {
    return getSharedDemoTeamMembers();
  }

  // 2. Sem organização ativa (offline / teste)
  if (!tenantContext.organizationId) {
    return INITIAL_TEAM_MEMBERS;
  }

  // 3. Usuário Autenticado Real: consulta estritamente a organização do usuário logado
  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("organization_id", tenantContext.organizationId)
      .order("created_at", { ascending: true });

    const members: TeamMember[] = (!error && data) ? data.map((p) => ({
      id: p.id,
      organizationId: p.organization_id,
      fullName: p.full_name,
      email: p.email,
      phone: p.phone || "",
      role: (p.role as "admin" | "gerente" | "vendedor") || "vendedor",
      status: "active",
      avatarUrl: p.avatar_url,
      createdAt: p.created_at,
    })) : [];

    // Convites pendentes
    const { data: pendingInvites } = (await supabase
      .from("organization_invites")
      ?.select?.("*")
      ?.eq?.("organization_id", tenantContext.organizationId)
      ?.eq?.("status", "pending")) || { data: null };

    if (pendingInvites && pendingInvites.length > 0) {
      pendingInvites.forEach((inv) => {
        if (!members.some((m) => m.email.toLowerCase() === inv.email.toLowerCase())) {
          members.push({
            id: `inv-${inv.id}`,
            organizationId: inv.organization_id,
            fullName: inv.full_name,
            email: inv.email,
            phone: inv.phone || "",
            role: (inv.role === "manager" || inv.role === "gerente" ? "gerente" : "vendedor") as "admin" | "gerente" | "vendedor",
            status: "pending",
            createdAt: inv.created_at,
          });
        }
      });
    }

    return members;
  } catch {
    return [];
  }
}

/**
 * Convida um novo colaborador para a equipe respeitando a cota do plano com disparo automático de e-mail.
 */
export async function inviteTeamMember(
  input: InviteMemberInput
): Promise<InviteResult> {
  // 1. Validação de campos obrigatórios
  if (!input.fullName?.trim() || !input.email?.trim() || !input.phone?.trim()) {
    return {
      success: false,
      error: "Preencha todos os campos obrigatórios (Nome, E-mail e Telefone).",
    };
  }

  const cleanEmail = input.email.trim().toLowerCase();
  const tenantContext = await resolveUserTenantContext();
  const orgId = tenantContext.organizationId || DEFAULT_DEMO_ORG_ID;

  const allMembers = tenantContext.isDemo || !tenantContext.organizationId
    ? memoryTeamMembers.filter((m) => m.organization_id === orgId)
    : (await getTeamMembers());

  // Gestores e Admins NÃO consomem vaga comercial (apenas papéis de vendas contam)
  const currentSellersCount = allMembers.filter((m) => isSalesRole(m.role)).length;
  const isInvitingSeller = isSalesRole(input.role);

  // Capacidade efetiva da organização
  let effectiveMaxSellers: number | null = null;
  let hasAvailableSlots = false;

  if (tenantContext.isDemo) {
    effectiveMaxSellers = CANONICAL_PLANS.pro.sellerLimit;
    hasAvailableSlots = effectiveMaxSellers !== null ? currentSellersCount < effectiveMaxSellers : false;
  } else if (tenantContext.organizationId) {
    const org = tenantContext.organization;
    const plan = ((org?.plan || "starter") as string).toLowerCase();
    const planKey = (plan === "enterprise" || plan === "pro" ? plan : "starter") as "starter" | "pro" | "enterprise";
    const planConfig = CANONICAL_PLANS[planKey] || CANONICAL_PLANS.starter;

    if (planKey === "enterprise") {
      const orgMaxSellers = (org as unknown as { max_sellers?: number | null })?.max_sellers;
      const isUnlimited =
        (org as unknown as { enterprise_unlimited?: boolean; unlimited_sellers?: boolean })?.enterprise_unlimited === true ||
        (org as unknown as { enterprise_unlimited?: boolean; unlimited_sellers?: boolean })?.unlimited_sellers === true;

      if (typeof orgMaxSellers === "number") {
        effectiveMaxSellers = orgMaxSellers;
        hasAvailableSlots = currentSellersCount < orgMaxSellers;
      } else if (isUnlimited) {
        effectiveMaxSellers = null;
        hasAvailableSlots = true;
      } else {
        effectiveMaxSellers = null;
        hasAvailableSlots = false;
      }
    } else {
      effectiveMaxSellers = (org as unknown as { max_sellers?: number | null })?.max_sellers ?? planConfig.sellerLimit;
      hasAvailableSlots = effectiveMaxSellers !== null ? currentSellersCount < effectiveMaxSellers : false;
    }
  } else {
    effectiveMaxSellers = localCapacity.maxSellers;
    hasAvailableSlots = effectiveMaxSellers !== null ? currentSellersCount < effectiveMaxSellers : false;
  }

  // 2. Validação da capacidade máxima do plano (apenas novos vendedores consomem slots)
  if (isInvitingSeller && !hasAvailableSlots) {
    const limitLabel = effectiveMaxSellers !== null ? `${currentSellersCount}/${effectiveMaxSellers}` : `${currentSellersCount} (limite atingido)`;
    return {
      success: false,
      error: `Limite de vagas do plano atingido (${limitLabel}). Faça upgrade para o ${CANONICAL_PLANS.pro.name} ou contate o suporte comercial para expandir sua equipe.`,
      requiresUpgrade: true,
    };
  }
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://aceleraautocrm.com.br");
  const inviteToken = crypto.randomUUID();
  const redirectTo = `${siteUrl}/auth/update-password?token=${inviteToken}&email=${encodeURIComponent(cleanEmail)}`;

  let emailSent = false;
  let fallbackInviteLink = `${siteUrl}/auth/update-password?token=${inviteToken}&email=${encodeURIComponent(cleanEmail)}`;
  let memberId = `mem-${Date.now()}`;

  // Disparo de e-mail via Supabase Auth Admin se configurado
  if (isSupabaseServerConfigured() && !tenantContext.isDemo && tenantContext.organizationId) {
    try {
      const supabaseAdmin = createAdminClient();

      // 1. Verifica se o usuário já tem registro e se já pertence à MESMA loja
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
        const inviteRes = await supabaseAdmin.auth.admin.inviteUserByEmail(cleanEmail, {
          redirectTo,
          data: {
            full_name: input.fullName.trim(),
            organization_id: orgId,
            phone: input.phone.replace(/\D/g, ""),
            role: input.role || "vendedor",
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

      await supabaseAdmin.from("profiles").upsert(
        {
          id: memberId,
          organization_id: orgId,
          full_name: input.fullName.trim(),
          email: cleanEmail,
          phone: input.phone.trim(),
          role: input.role || "vendedor",
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
    // 3. Verifica duplicidade de e-mail na equipe local (em modo demo/offline)
    const emailExists = memoryTeamMembers.some(
      (m) => m.email.toLowerCase() === cleanEmail
    );
    if (emailExists) {
      return {
        success: false,
        error: "Já existe um colaborador cadastrado com este endereço de e-mail.",
      };
    }

    emailSent = true;
    fallbackInviteLink = `${redirectTo}?token=demo_${Date.now()}&email=${encodeURIComponent(cleanEmail)}`;
  }

  if (!fallbackInviteLink) {
    fallbackInviteLink = `${redirectTo}?email=${encodeURIComponent(cleanEmail)}`;
  }

  // 4. Criação da nova entidade
  const newMember: TeamMember = {
    id: memberId,
    organizationId: orgId,
    fullName: input.fullName.trim(),
    email: cleanEmail,
    phone: input.phone.trim(),
    role: input.role || "vendedor",
    status: "active",
    createdAt: new Date().toISOString(),
  };

  // Sincroniza com o estado em memória compartilhado (team-memory)
  const sharedMember: SharedTeamMember = {
    id: memberId,
    organization_id: orgId,
    name: input.fullName.trim(),
    email: cleanEmail,
    phone: input.phone.trim(),
    role: (input.role === "gerente" ? "manager" : "seller") as "manager" | "seller",
    segment: "all",
    in_roulette: true,
    status: "active",
    monthly_goal_units: 10,
    current_sales_units: 0,
    avg_sla_minutes: 0,
    created_at: newMember.createdAt,
  };
  if (!memoryTeamMembers.some((m) => m.email.toLowerCase() === cleanEmail)) {
    memoryTeamMembers.unshift(sharedMember);
  }

  try {
    revalidatePath("/settings");
    revalidatePath("/dashboard/team");
    revalidatePath("/team");
  } catch {}

  return {
    success: true,
    emailSent,
    fallbackInviteLink,
    member: newMember,
  };
}

/**
 * Remove um colaborador da equipe de forma resiliente.
 *
 * Estratégia em 3 etapas:
 *  A) Busca em `organization_invites` por `id` ou `cleanId` (convites ainda pendentes).
 *  B) Busca em `organization_members` por `id` ou `user_id` (membros confirmados).
 *  C) Fallback em `profiles` por `id` com mesmo `organization_id` (vínculo direto via perfil).
 *
 * Em modo demo/offline atua sobre o array em memória para garantir compatibilidade com testes.
 */
export async function removeTeamMember(
  memberId: string,
  memberEmail?: string
): Promise<{ success: boolean; error?: string; message?: string }> {
  const cleanId = memberId.startsWith("inv-") ? memberId.replace(/^inv-/, "") : memberId;
  const cleanEmail = memberEmail?.trim().toLowerCase();

  for (let i = memoryTeamMembers.length - 1; i >= 0; i--) {
    const m = memoryTeamMembers[i];
    if (
      m.id === memberId ||
      m.id === cleanId ||
      (cleanEmail && m.email?.toLowerCase() === cleanEmail)
    ) {
      if ((m.role as string) === "admin") {
        return { success: false, error: "O proprietário da loja não pode ser desvinculado." };
      }
      memoryTeamMembers.splice(i, 1);
    }
  }

  const result = await removeTeamMemberAction(memberId, memberEmail);

  try {
    revalidatePath("/settings");
    revalidatePath("/configuracoes");
    revalidatePath("/team");
    revalidatePath("/dashboard/team");
    revalidatePath("/dashboard");
    revalidatePath("/", "layout");
  } catch {}

  return {
    success: result.success,
    error: result.error,
    message: result.message || (result.success ? "Colaborador removido com sucesso." : undefined),
  };
}

/**
 * Atualiza o limite de vagas (usado para testes ou pós-upgrade).
 */
export async function updateCapacityForPlan(
  plan: "starter" | "pro" | "enterprise"
): Promise<TeamCapacity> {
  const targetPlan = CANONICAL_PLANS[plan] || CANONICAL_PLANS.starter;
  const sellersCount = memoryTeamMembers.filter((m) => isSalesRole(m.role)).length;

  localCapacity = {
    currentCount: sellersCount,
    maxSellers: targetPlan.sellerLimit,
    plan,
    planName: targetPlan.name,
    hasAvailableSlots: targetPlan.sellerLimit === null ? false : sellersCount < targetPlan.sellerLimit,
  };

  revalidatePath("/settings");
  return { ...localCapacity };
}
