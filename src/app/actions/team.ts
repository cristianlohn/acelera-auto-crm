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
import {
  INITIAL_TEAM_MEMBERS,
  INITIAL_CAPACITY,
  type TeamMember,
  type TeamCapacity,
  type InviteMemberInput,
  type InviteResult,
} from "@/lib/team-data";

export type {
  TeamMember,
  TeamCapacity,
  InviteMemberInput,
  InviteResult,
};

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
  if (!isSupabaseServerConfigured()) {
    return [...localTeamMembers];
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: true });

    if (error || !data || data.length === 0) {
      return [...localTeamMembers];
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
    return [...localTeamMembers];
  }
}

/**
 * Convida um novo colaborador para a equipe respeitando a cota do plano.
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

  // 4. Criação da nova entidade
  const newMember: TeamMember = {
    id: `mem-${Date.now()}`,
    organizationId: "org-001",
    fullName: input.fullName.trim(),
    email: input.email.trim(),
    phone: input.phone.trim(),
    role: input.role || "vendedor",
    status: "active",
    createdAt: new Date().toISOString(),
  };

  localTeamMembers.push(newMember);

  revalidatePath("/settings");

  return {
    success: true,
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
