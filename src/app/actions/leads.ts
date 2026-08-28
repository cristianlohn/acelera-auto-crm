/**
 * @file leads.ts
 * @description Server Actions para gerenciamento de Leads no Supabase com fallback seguro para mock data.
 *
 * Expõe ações assíncronas tipadas para o Next.js App Router ("use server"):
 * - getLeads(): Busca todos os leads da organização ativa.
 * - createLead(data): Insere um novo lead no banco.
 * - updateLeadStatus(id, status): Atualiza a etapa do lead no funil Kanban.
 */

"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import {
  createServerSupabaseClient,
  isSupabaseServerConfigured,
} from "@/lib/supabase/server";
import { resolveUserTenantContext, DEFAULT_DEMO_ORG_ID } from "@/lib/auth/tenant";
import { notifyAssignedSellerViaWhatsApp } from "@/lib/crm/roleta";
import { mockLeads } from "@/lib/mock-data";
import type { Lead, LeadStatus, LeadOrigin } from "@/types/crm";
import type { Database } from "@/types/database.types";

/**
 * Converte um registro do banco de dados para a entidade Lead do domínio.
 */
function mapDbLeadToDomain(
  row: Database["public"]["Tables"]["leads"]["Row"]
): Lead {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email || undefined,
    vehicleInterest: row.vehicle_interest,
    status: row.status,
    sellerName: row.seller_name,
    lastContactAt: row.last_contact_at,
    origin: row.origin,
  };
}

import { canViewAllLeads } from "@/lib/permissions";

/**
 * Obtém a listagem completa de leads ordenados por data de criação com RBAC.
 *
 * @returns Lista de leads da organização ou array vazio caso a loja não possua leads cadastrados.
 */
export async function getLeads(overrideRole?: string): Promise<Lead[]> {
  const tenantContext = await resolveUserTenantContext();
  let effectiveRole =
    overrideRole || tenantContext.profile?.role || (tenantContext.isDemo ? "gerente" : "seller");
  try {
    const cookieStore = await cookies();
    const demoRoleCookie = cookieStore.get("acelera_demo_role")?.value;
    if (!overrideRole && tenantContext.isDemo && demoRoleCookie) {
      effectiveRole = demoRoleCookie;
    }
  } catch {
    //
  }

  const allowAll = canViewAllLeads(effectiveRole);

  // 1. Modo Demonstração explícito (sandbox) ou ambiente de testes offline
  if (tenantContext.isDemo || (!tenantContext.organizationId && !isSupabaseServerConfigured())) {
    if (!allowAll) {
      return mockLeads.filter(
        (l) => l.sellerName === "Rafael Alves" || l.sellerName?.toLowerCase().includes("vendedor")
      );
    }
    return mockLeads;
  }

  // 2. Usuário Autenticado Real sem organização vinculada
  if (!tenantContext.organizationId) {
    return [];
  }

  // 3. Usuário Autenticado Real: consulta estritamente a organização do usuário logado
  try {
    const supabase = await createServerSupabaseClient();
    let query = supabase
      .from("leads")
      .select("*")
      .eq("organization_id", tenantContext.organizationId);

    if (!allowAll) {
      const userId = tenantContext.userId;
      const userName = tenantContext.profile?.full_name;
      if (userId && userName) {
        query = query.or(`seller_id.eq.${userId},seller_name.eq.${userName}`);
      } else if (userId) {
        query = query.eq("seller_id", userId);
      }
    }

    const { data, error } = await query.order("created_at", { ascending: false });

    if (error || !data) {
      return [];
    }

    return data.map(mapDbLeadToDomain);
  } catch {
    return [];
  }
}

/** DTO para criação de lead a partir do formulário do modal */
export interface CreateLeadInput {
  name: string;
  phone: string;
  email?: string;
  vehicleInterest: string;
  status?: LeadStatus;
  sellerName?: string;
  origin?: LeadOrigin;
  notes?: string;
}

/**
 * Cria um novo lead na organização ativa do usuário.
 *
 * @param input - Dados do novo lead.
 * @returns O lead criado formatado para o domínio.
 */
export async function createLead(input: CreateLeadInput): Promise<Lead> {
  const tenantContext = await resolveUserTenantContext();
  const orgId = tenantContext.organizationId || DEFAULT_DEMO_ORG_ID;

  const fallbackLead: Lead = {
    id: `l-${Date.now()}`,
    name: input.name,
    phone: input.phone,
    email: input.email,
    vehicleInterest: input.vehicleInterest,
    status: input.status || "novo",
    sellerName: input.sellerName || "Rafael Alves",
    lastContactAt: new Date().toISOString(),
    origin: input.origin || "site",
  };

  if (!isSupabaseServerConfigured()) {
    return fallbackLead;
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("leads")
      .insert({
        organization_id: orgId,
        name: input.name,
        phone: input.phone,
        email: input.email || null,
        vehicle_interest: input.vehicleInterest,
        status: input.status || "novo",
        seller_name: input.sellerName || "Rafael Alves",
        origin: input.origin || "site",
        notes: input.notes || null,
      })
      .select()
      .single();

    if (error || !data) {
      return fallbackLead;
    }

    revalidatePath("/leads");
    const domainLead = mapDbLeadToDomain(data);

    void notifyAssignedSellerViaWhatsApp({
      lead: {
        id: domainLead.id,
        name: domainLead.name,
        phone: domainLead.phone,
        email: domainLead.email,
        vehicleInterest: domainLead.vehicleInterest,
        source: domainLead.origin,
      },
      sellerName: domainLead.sellerName,
      organizationId: orgId,
    });

    return domainLead;
  } catch {
    return fallbackLead;
  }
}


/**
 * Atualiza o status (etapa do funil) de um lead existente.
 *
 * @param id - Identificador único do lead.
 * @param status - Nova etapa do funil Kanban.
 */
export async function updateLeadStatus(
  id: string,
  status: LeadStatus
): Promise<{ success: boolean; id: string; status: LeadStatus }> {
  // Modo Demonstração: leads são mock data — não existem no banco real
  const tenantContext = await resolveUserTenantContext();
  if (tenantContext.isDemo) {
    return { success: true, id, status };
  }

  if (!isSupabaseServerConfigured()) {
    return { success: true, id, status };
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase
      .from("leads")
      .update({
        status,
        last_contact_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      return { success: false, id, status };
    }

    revalidatePath("/leads");
    return { success: true, id, status };
  } catch {
    return { success: true, id, status };
  }
}
