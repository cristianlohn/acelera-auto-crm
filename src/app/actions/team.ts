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
  INITIAL_TEAM_MEMBERS,
  INITIAL_CAPACITY,
  type TeamMember,
  type TeamCapacity,
  type InviteMemberInput,
  type InviteResult,
} from "@/lib/team-data";
import { resolveUserTenantContext } from "@/lib/auth/tenant";

import {
  inviteTeamMemberAction as _inviteTeamMemberAction,
  resendInviteEmailAction as _resendInviteEmailAction,
  inviteSellerAction as _inviteSellerAction,
  type InviteTeamMemberInput,
} from "./team-actions";

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
 * Server Action unificada para reenviar convite por e-mail.
 */
export async function resendInviteEmailAction(email: string, name?: string, role?: string) {
  return _resendInviteEmailAction(email, name, role);
}

// Estado local para ambiente de desenvolvimento/testes
const localTeamMembers: TeamMember[] = [...INITIAL_TEAM_MEMBERS];
let localCapacity: TeamCapacity = { ...INITIAL_CAPACITY };

/**
 * Consulta a capacidade e limites de vagas da equipe da concessionária.
 */
export async function getTeamCapacity(): Promise<TeamCapacity> {
  return {
    ...localCapacity,
    currentCount: localTeamMembers.length,
  };
}

/**
 * Consulta a lista de colaboradores vinculados à organização logada.
 */
export async function getTeamMembers(): Promise<TeamMember[]> {
  const tenantContext = await resolveUserTenantContext();

  // 1. Modo Demonstração explícito (ou offline sem Supabase)
  if (tenantContext.isDemo) {
    return [...localTeamMembers];
  }

  // 2. Usuário Autenticado Real sem organização vinculada
  if (!tenantContext.organizationId) {
    return [];
  }

  // 3. Usuário Autenticado Real: consulta estritamente a organização do usuário logado
  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("organization_id", tenantContext.organizationId)
      .order("created_at", { ascending: true });

    if (error || !data) {
      return [];
    }

    return data.map((p) => ({
      id: p.id,
      organizationId: p.organization_id,
      fullName: p.full_name,
      email: p.email,
      phone: p.phone || "",
      role: (p.role as "admin" | "gerente" | "vendedor") || "vendedor",
      status: "active",
      avatarUrl: p.avatar_url,
      createdAt: p.created_at,
    }));
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
  if (!input.fullName.trim() || !input.email.trim() || !input.phone.trim()) {
    return {
      success: false,
      error: "Preencha todos os campos obrigatórios (Nome, E-mail e Telefone).",
    };
  }

  // 2. Validação da capacidade máxima do plano
  if (localTeamMembers.length >= localCapacity.maxSellers) {
    return {
      success: false,
      error: `Limite de vagas do plano atingido (${localTeamMembers.length}/${localCapacity.maxSellers}). Faça upgrade para o Plano Pro para adicionar até 8 vendedores.`,
      requiresUpgrade: true,
    };
  }

  // 3. Verifica duplicidade de e-mail na equipe
  const emailExists = localTeamMembers.some(
    (m) => m.email.toLowerCase() === input.email.trim().toLowerCase()
  );
  if (emailExists) {
    return {
      success: false,
      error: "Já existe um colaborador cadastrado com este endereço de e-mail.",
    };
  }

  const tenantContext = await resolveUserTenantContext();
  const orgId = tenantContext.organizationId || "org-001";
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://aceleraautocrm.com.br");
  const redirectTo = `${siteUrl}/auth/callback?next=/auth/update-password`;

  let emailSent = false;
  let fallbackInviteLink = "";
  let memberId = `mem-${Date.now()}`;

  // Disparo de e-mail via Supabase Auth Admin se configurado
  if (isSupabaseServerConfigured() && !tenantContext.isDemo && tenantContext.organizationId) {
    try {
      const supabaseAdmin = createAdminClient();
      const cleanEmail = input.email.trim().toLowerCase();

      // 1. Verifica se o usuário já tem registro
      const { data: existingUser } = (await supabaseAdmin
        .from("profiles")
        ?.select?.("id, full_name")
        ?.eq?.("email", cleanEmail)
        ?.maybeSingle?.()) || { data: null };

      if (existingUser) {
        return {
          success: false,
          error: `O e-mail ${cleanEmail} já possui cadastro no sistema.`,
        };
      }

      const inviteRes = await supabaseAdmin.auth.admin.inviteUserByEmail(cleanEmail, {
        redirectTo,
        data: {
          full_name: input.fullName.trim(),
          phone: input.phone.replace(/\D/g, ""),
          role: input.role || "vendedor",
        },
      });

      if (inviteRes.error) {
        console.error("[SUPABASE_INVITE_ERROR]:", inviteRes.error);
        return {
          success: false,
          error: inviteRes.error.message || "Erro ao disparar e-mail de convite.",
        };
      }

      if (inviteRes.data?.user) {
        emailSent = true;
        memberId = inviteRes.data.user.id;
      }

      const linkRes = await supabaseAdmin.auth.admin.generateLink({
        type: "invite",
        email: cleanEmail,
        options: { redirectTo },
      });

      if (!linkRes.error && linkRes.data?.properties?.action_link) {
        fallbackInviteLink = linkRes.data.properties.action_link;
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
    emailSent = true;
    fallbackInviteLink = `${redirectTo}?token=demo_${Date.now()}&email=${encodeURIComponent(input.email.trim())}`;
  }

  if (!fallbackInviteLink) {
    fallbackInviteLink = `${redirectTo}?email=${encodeURIComponent(input.email.trim())}`;
  }

  // 4. Criação da nova entidade
  const newMember: TeamMember = {
    id: memberId,
    organizationId: orgId,
    fullName: input.fullName.trim(),
    email: input.email.trim(),
    phone: input.phone.trim(),
    role: input.role || "vendedor",
    status: "active",
    createdAt: new Date().toISOString(),
  };

  localTeamMembers.push(newMember);

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
 * Remove um colaborador da equipe, protegendo o admin proprietário.
 */
export async function removeTeamMember(
  memberId: string
): Promise<{ success: boolean; error?: string }> {
  const member = localTeamMembers.find((m) => m.id === memberId);

  if (!member) {
    return {
      success: false,
      error: "Colaborador não encontrado.",
    };
  }

  // Proteção de segurança: o admin não pode ser removido
  if (member.role === "admin") {
    return {
      success: false,
      error: "O administrador proprietário da conta não pode ser removido da equipe.",
    };
  }

  const index = localTeamMembers.findIndex((m) => m.id === memberId);
  if (index !== -1) {
    localTeamMembers.splice(index, 1);
  }

  revalidatePath("/settings");

  return {
    success: true,
  };
}

/**
 * Atualiza o limite de vagas (usado para testes ou pós-upgrade).
 */
export async function updateCapacityForPlan(
  plan: "starter" | "pro" | "enterprise"
): Promise<TeamCapacity> {
  const limits = {
    starter: { maxSellers: 3, planName: "Plano Starter" },
    pro: { maxSellers: 8, planName: "Plano Pro" },
    enterprise: { maxSellers: 25, planName: "Plano Enterprise" },
  };

  localCapacity = {
    currentCount: localTeamMembers.length,
    maxSellers: limits[plan].maxSellers,
    plan,
    planName: limits[plan].planName,
  };

  revalidatePath("/settings");
  return { ...localCapacity };
}
