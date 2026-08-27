/**
 * @file team-actions.ts
 * @description Server Actions multi-tenant para cadastro e gestão de vendedores e membros da equipe.
 */

"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient, isSupabaseServerConfigured } from "@/lib/supabase/server";
import { resolveUserTenantContext, DEFAULT_DEMO_ORG_ID } from "@/lib/auth/tenant";
import {
  salespersonSchema,
  type SalespersonInput,
  type SalespersonMember,
  type CreateSalespersonResult,
} from "@/lib/team-schema";

export type {
  SalespersonInput,
  SalespersonOutput,
  SalespersonMember,
  CreateSalespersonResult,
} from "@/lib/team-schema";

// Armazenamento em memória para ambiente demo/offline
const memorySalespeople: SalespersonMember[] = [
  {
    id: "sp-001",
    organizationId: DEFAULT_DEMO_ORG_ID,
    name: "Rafael Alves",
    email: "rafael.alves@aceleraauto.com.br",
    phone: "+5511988887777",
    role: "seller",
    segment: "all",
    inRoulette: true,
    monthlyGoalUnits: 15,
    createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
  },
  {
    id: "sp-002",
    organizationId: DEFAULT_DEMO_ORG_ID,
    name: "Juliana Costa",
    email: "juliana.costa@aceleraauto.com.br",
    phone: "+5511977776666",
    role: "seller",
    segment: "new_cars",
    inRoulette: true,
    monthlyGoalUnits: 12,
    createdAt: new Date(Date.now() - 20 * 86400000).toISOString(),
  },
  {
    id: "sp-003",
    organizationId: DEFAULT_DEMO_ORG_ID,
    name: "Marcos Ferreira",
    email: "marcos.ferreira@aceleraauto.com.br",
    phone: "+5511966665555",
    role: "seller",
    segment: "used_cars",
    inRoulette: true,
    monthlyGoalUnits: 10,
    createdAt: new Date(Date.now() - 10 * 86400000).toISOString(),
  },
];

/**
 * Server Action para cadastrar um novo vendedor ou membro na organização.
 */
export async function createSalespersonAction(
  rawInput: SalespersonInput | FormData
): Promise<CreateSalespersonResult> {
  // 1. Extrai os dados se vier como FormData
  let dataToValidate: unknown = rawInput;
  if (rawInput instanceof FormData) {
    dataToValidate = {
      name: rawInput.get("name"),
      email: rawInput.get("email"),
      phone: rawInput.get("phone"),
      role: rawInput.get("role") || "seller",
      segment: rawInput.get("segment") || "all",
      in_roulette: rawInput.get("in_roulette") === "true" || rawInput.get("in_roulette") === "on",
      monthly_goal_units: rawInput.get("monthly_goal_units") ? Number(rawInput.get("monthly_goal_units")) : 0,
    };
  }

  // 2. Validação com Zod
  const parseResult = salespersonSchema.safeParse(dataToValidate);
  if (!parseResult.success) {
    const firstIssue = parseResult.error.issues[0];
    return {
      success: false,
      error: firstIssue ? firstIssue.message : "Dados inválidos para cadastro do vendedor.",
    };
  }

  const validData = parseResult.data;

  // 3. Obtenção do Tenant Context
  const tenantContext = await resolveUserTenantContext();
  const orgId = tenantContext.organizationId || DEFAULT_DEMO_ORG_ID;

  // 4. Criação do Membro
  const newMember: SalespersonMember = {
    id: `sp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    organizationId: orgId,
    name: validData.name,
    email: validData.email,
    phone: validData.phone,
    role: validData.role,
    segment: validData.segment,
    inRoulette: validData.in_roulette,
    monthlyGoalUnits: validData.monthly_goal_units || 0,
    createdAt: new Date().toISOString(),
  };

  // 5. Persistência no Supabase com isolamento multi-tenant (se configurado)
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

  // Registra no estado em memória para renderização imediata
  memorySalespeople.unshift(newMember);

  // 6. Revalidação de cache das rotas
  try {
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/team");
    revalidatePath("/leads");
  } catch {
    // Revalidação silenciosa em testes
  }

  return {
    success: true,
    member: newMember,
  };
}

/**
 * Consulta a lista de vendedores da organização.
 */
export async function getSalespeopleAction(explicitOrgId?: string): Promise<SalespersonMember[]> {
  const tenantContext = await resolveUserTenantContext();
  const orgId = explicitOrgId || tenantContext.organizationId || DEFAULT_DEMO_ORG_ID;

  if (tenantContext.isDemo) {
    return memorySalespeople.filter((sp) => sp.organizationId === DEFAULT_DEMO_ORG_ID);
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
          organizationId: p.organization_id,
          name: p.full_name,
          email: p.email,
          phone: p.phone || "",
          role: p.role === "gerente" ? "manager" : p.role === "admin" ? "manager" : "seller",
          segment: "all",
          inRoulette: true,
          monthlyGoalUnits: 15,
          createdAt: p.created_at,
        }));
      }
    } catch {
      // Fallback
    }
  }

  return memorySalespeople.filter((sp) => sp.organizationId === orgId);
}
