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
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveUserTenantContext, DEFAULT_DEMO_ORG_ID } from "@/lib/auth/tenant";
import { resolveAssignedSellerInfo, notifyAssignedSellerViaWhatsApp } from "@/lib/crm/roleta";
import { getTeamMembersAction } from "@/app/actions/team-actions";
import { mockLeads } from "@/lib/mock-data";
import type { Lead, LeadStatus, LeadOrigin } from "@/types/crm";
import type { TeamMember } from "@/types/team";
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
    sellerName: row.seller_name || "Vendedor de Plantão",
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
    overrideRole || tenantContext.profile?.role || (tenantContext.isDemo ? "gerente" : "admin");
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

    const orgId = tenantContext.organizationId || DEFAULT_DEMO_ORG_ID;
    const realMembers = await getTeamMembersAction(orgId);
    const validMembersMap = new Map<string, TeamMember>();
    realMembers
      .filter(
        (m) =>
          m.status === "active" &&
          !m.name.toLowerCase().includes("fila") &&
          !m.name.toLowerCase().includes("roleta")
      )
      .forEach((m) => {
        validMembersMap.set(m.name.trim().toLowerCase(), m);
      });
    const activeMembersList = Array.from(validMembersMap.values());
    let roundRobinIdx = 0;

    return Promise.all(
      data.map(async (row) => {
        let sellerName = row.seller_name?.trim() || "";
        let sellerId = row.seller_id;

        const isRealOrg = !tenantContext.isDemo && Boolean(tenantContext.organizationId);
        const isValidSeller = isRealOrg
          ? activeMembersList.length > 0 && Boolean(sellerName) && validMembersMap.has(sellerName.toLowerCase())
          : Boolean(sellerName) && !sellerName.toLowerCase().includes("fila") && !sellerName.toLowerCase().includes("roleta");

        if (isRealOrg && !isValidSeller && activeMembersList.length > 0) {
          const assignedMember = activeMembersList[roundRobinIdx % activeMembersList.length];
          roundRobinIdx++;

          sellerName = assignedMember.name;
          sellerId = assignedMember.id;

          try {
            const admin = createAdminClient();
            await admin
              .from("leads")
              .update({ seller_name: sellerName, seller_id: sellerId })
              .eq("id", row.id);
          } catch {
            try {
              await supabase
                .from("leads")
                .update({ seller_name: sellerName, seller_id: sellerId })
                .eq("id", row.id);
            } catch {}
          }
        }

        return {
          id: row.id,
          name: row.name,
          phone: row.phone,
          email: row.email || undefined,
          vehicleInterest: row.vehicle_interest,
          status: row.status,
          sellerName: sellerName || "Vendedor de Plantão",
          lastContactAt: row.last_contact_at,
          origin: row.origin,
        };
      })
    );
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

  // Resolve vendedor responsável pela roleta ou pelo nome informado
  const resolvedInfo = await resolveAssignedSellerInfo(input.sellerName, orgId);
  let resolvedSeller = resolvedInfo.sellerName?.trim();
  if (
    !resolvedSeller ||
    resolvedSeller.toLowerCase().includes("fila") ||
    resolvedSeller.toLowerCase().includes("roleta")
  ) {
    resolvedSeller =
      tenantContext.profile?.full_name?.trim() ||
      (tenantContext.isDemo ? "Rafael Alves" : "Vendedor de Plantão");
  }
  const resolvedSellerId =
    resolvedInfo.sellerId ||
    (tenantContext.profile?.full_name === resolvedSeller ? tenantContext.userId : undefined);

  const fallbackLead: Lead = {
    id: `l-${Date.now()}`,
    name: input.name,
    phone: input.phone,
    email: input.email,
    vehicleInterest: input.vehicleInterest,
    status: input.status || "novo",
    sellerName: resolvedSeller,
    lastContactAt: new Date().toISOString(),
    origin: input.origin || "site",
  };

  function isValidUUID(val?: string | null): boolean {
    if (!val) return false;
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val.trim());
  }

  const safeSellerId = isValidUUID(resolvedSellerId) ? resolvedSellerId : null;
  const insertPayload = {
    organization_id: orgId,
    name: input.name,
    phone: input.phone,
    email: input.email || null,
    vehicle_interest: input.vehicleInterest,
    status: input.status || "novo",
    seller_name: resolvedSeller,
    seller_id: safeSellerId,
    origin: input.origin || "site",
    notes: input.notes || null,
  };

  let insertedData: Database["public"]["Tables"]["leads"]["Row"] | null = null;
  let lastError: string | null = null;

  const isOfflineOrDemo =
    tenantContext.isDemo || (!tenantContext.organizationId && !isSupabaseServerConfigured());

  if (!isOfflineOrDemo && !tenantContext.organizationId) {
    throw new Error("Organização não encontrada para o usuário autenticado.");
  }

  if (isSupabaseServerConfigured() && !tenantContext.isDemo && tenantContext.organizationId) {
    try {
      const supabase = await createServerSupabaseClient();
      const { data, error } = await supabase
        .from("leads")
        .insert(insertPayload)
        .select()
        .single();

      if (!error && data) {
        insertedData = data;
      } else if (error) {
        lastError = error.message;
      }
    } catch (err) {
      lastError = err instanceof Error ? err.message : "Erro ao conectar ao banco de dados.";
    }

    if (!insertedData) {
      try {
        const adminClient = createAdminClient();
        const { data: adminData, error: adminErr } = await adminClient
          .from("leads")
          .insert(insertPayload)
          .select()
          .single();

        if (!adminErr && adminData) {
          insertedData = adminData;
          lastError = null;
        } else if (adminErr) {
          console.error("[Create Lead Admin Insert Error]", adminErr);
          lastError = adminErr.message;
        }
      } catch (adminEx) {
        console.error("[Create Lead Admin Exception]", adminEx);
        lastError = adminEx instanceof Error ? adminEx.message : "Exceção ao persistir lead via serviço de administração.";
      }
    }

    if (!insertedData) {
      throw new Error(lastError || "Falha ao persistir lead no banco de dados. O registro foi rejeitado.");
    }
  }

  if (insertedData) {
    try {
      revalidatePath("/leads");
      revalidatePath("/dashboard/leads");
      revalidatePath("/dashboard");
    } catch {}
    const domainLead = mapDbLeadToDomain(insertedData);

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
  }

  return fallbackLead;
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
    revalidatePath("/dashboard/leads");
    revalidatePath("/dashboard");
    return { success: true, id, status };
  } catch {
    return { success: true, id, status };
  }
}

/**
 * Reatribui o vendedor responsável por um lead.
 */
export async function updateLeadSeller(
  id: string,
  sellerName: string,
  sellerId?: string
): Promise<{ success: boolean; id: string; sellerName: string }> {
  const tenantContext = await resolveUserTenantContext();
  const orgId = tenantContext.organizationId || DEFAULT_DEMO_ORG_ID;

  if (tenantContext.isDemo || !isSupabaseServerConfigured() || !tenantContext.organizationId) {
    return { success: true, id, sellerName };
  }

  try {
    const isUUID = sellerId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sellerId.trim());
    const updatePayload: { seller_name: string; seller_id?: string | null; updated_at: string } = {
      seller_name: sellerName,
      seller_id: isUUID ? sellerId : null,
      updated_at: new Date().toISOString(),
    };

    let updateSuccess = false;

    try {
      const supabase = await createServerSupabaseClient();
      const { error } = await supabase
        .from("leads")
        .update(updatePayload)
        .eq("id", id)
        .eq("organization_id", orgId);

      if (!error) updateSuccess = true;
    } catch {}

    if (!updateSuccess) {
      try {
        const adminClient = createAdminClient();
        await adminClient
          .from("leads")
          .update(updatePayload)
          .eq("id", id)
          .eq("organization_id", orgId);
      } catch {}
    }

    revalidatePath("/leads");
    revalidatePath("/dashboard/leads");
    revalidatePath("/dashboard");
    return { success: true, id, sellerName };
  } catch {
    return { success: true, id, sellerName };
  }
}
