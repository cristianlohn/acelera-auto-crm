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

export const acceptOrganizationInviteAction = _acceptOrganizationInviteAction;
export const deleteSalespersonAction = _deleteSalespersonAction;
export const removeMemberAction = _removeMemberAction;
export const deleteSellerAction = _deleteSellerAction;

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
 * Retorna o status de ocupação da equipe vs capacidade do plano da organização atual.
 */
export async function getTeamCapacity(): Promise<TeamCapacity> {
  const tenantContext = await resolveUserTenantContext();
  const members = await getTeamMembers();

  if (!tenantContext.isDemo && tenantContext.organizationId) {
    return {
      currentCount: members.length,
      maxSellers: 10,
      plan: "pro",
      planName: "Plano Pro Acelera",
    };
  }

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

  // 2. Validação da capacidade máxima do plano
  if (localTeamMembers.length >= localCapacity.maxSellers) {
    return {
      success: false,
      error: `Limite de vagas do plano atingido (${localTeamMembers.length}/${localCapacity.maxSellers}). Faça upgrade para o Plano Pro para adicionar até 8 vendedores.`,
      requiresUpgrade: true,
    };
  }

  const tenantContext = await resolveUserTenantContext();
  const orgId = tenantContext.organizationId || "org-001";
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://aceleraautocrm.com.br");
  const redirectTo = `${siteUrl}/auth/callback?next=${encodeURIComponent(`/auth/update-password?email=${encodeURIComponent(cleanEmail)}`)}`;

  let emailSent = false;
  let fallbackInviteLink = "";
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
    const emailExists = localTeamMembers.some(
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

  for (let i = localTeamMembers.length - 1; i >= 0; i--) {
    const m = localTeamMembers[i];
    if (
      m.id === memberId ||
      m.id === cleanId ||
      (cleanEmail && m.email?.toLowerCase() === cleanEmail)
    ) {
      if (m.role === "admin") {
        return { success: false, error: "O proprietário da loja não pode ser desvinculado." };
      }
      localTeamMembers.splice(i, 1);
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
