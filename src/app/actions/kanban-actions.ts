"use server";

/**
 * @file kanban-actions.ts
 * @description Server Actions multi-tenant para gerenciamento do Funil de Vendas e Kanban de Leads.
 */

import { DEMO_KANBAN_LEADS } from "@/lib/demo/demo-dataset";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createServerSupabaseClient, isSupabaseServerConfigured } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveUserTenantContext, DEFAULT_DEMO_ORG_ID } from "@/lib/auth/tenant";
import { resolveAssignedSellerInfo, notifyAssignedSellerViaWhatsApp } from "@/lib/crm/roleta";
import { getTeamMembersAction } from "@/app/actions/team-actions";
import type { LeadStage, KanbanLead, KanbanBoardData, KanbanColumnConfig } from "@/types/kanban";
import { KANBAN_STAGES_CONFIG } from "@/types/kanban";
import type { LeadStatus, LeadOrigin } from "@/types/database.types";
import type { TeamMember } from "@/types/team";
import { updateLeadStageSchema } from "@/lib/validations/kanban";
import {
  normalizeLeadOrigin,
  leadOriginEnum,
  createKanbanLeadSchema,
} from "@/lib/validations/lead";
import { generateShortCode } from "@/lib/utils/nanoid";
import { syncVehicleStockOnStageChange } from "@/lib/services/vehicles/vehicle-stock-service";

export interface CreateKanbanLeadInput {
  name: string;
  phone: string;
  email?: string;
  vehicle_of_interest: string;
  source?: string;
  stage?: LeadStage;
  assigned_to_name?: string;
  value?: number;
  segment?: "all" | "new_cars" | "used_cars" | "f_and_i";
  notes?: string;
}

export interface KanbanActionResult {
  success: boolean;
  error?: string;
  lead?: KanbanLead;
}

// Leads padrão em memória com dados ricos para o ambiente demo e offline (24 cards com modelos brasileiros)
const enrichedMemoryKanbanLeads: KanbanLead[] = [...DEMO_KANBAN_LEADS];

const initialMemoryKanbanLeads: KanbanLead[] = enrichedMemoryKanbanLeads;

const memoryKanbanLeads: KanbanLead[] = initialMemoryKanbanLeads.map((l) => ({
  ...l,
  assigned_to: l.assigned_to ? { ...l.assigned_to } : null,
}));

export async function resetMemoryKanbanLeads(): Promise<void> {
  memoryKanbanLeads.length = 0;
  memoryKanbanLeads.push(
    ...initialMemoryKanbanLeads.map((l) => ({
      ...l,
      assigned_to: l.assigned_to ? { ...l.assigned_to } : null,
    }))
  );
}

/**
 * Normaliza o status legado do banco de dados para os estágios ricos do Kanban
 */
function normalizeDbStatusToStage(status?: string): LeadStage {
  switch (status?.toLowerCase()) {
    case "novo":
    case "new":
      return "new";
    case "atendimento":
    case "in_contact":
    case "em_atendimento":
      return "in_contact";
    case "visita":
    case "visit_scheduled":
    case "visita_agendada":
    case "test_drive":
      return "test_drive";
    case "proposta":
    case "proposal":
    case "proposal_fi":
    case "proposta_enviada":
      return "proposal";
    case "fechado":
    case "won":
    case "venda_ganha":
      return "won";
    case "perdido":
    case "lost":
      return "lost";
    default:
      return "new";
  }
}

/**
 * Mapeia o LeadStage para o enum relacional `LeadStatus` do Supabase
 */
function mapStageToDbStatus(stage: LeadStage): LeadStatus {
  switch (stage) {
    case "new":
      return "novo";
    case "in_contact":
      return "atendimento";
    case "visit_scheduled":
    case "test_drive":
      return "visita";
    case "proposal":
    case "proposal_fi":
      return "proposta";
    case "won":
    case "lost":
    default:
      return "fechado";
  }
}

import { canViewAllLeads } from "@/lib/permissions";

/**
 * Consulta os leads do funil Kanban com métricas de SLA, isolamento multi-tenant e RBAC.
 */
export async function getKanbanLeadsAction(
  explicitOrgId?: string,
  overrideRole?: string
): Promise<KanbanLead[]> {
  const tenantContext = await resolveUserTenantContext();
  const orgId = explicitOrgId || tenantContext.organizationId || DEFAULT_DEMO_ORG_ID;

  let effectiveRole =
    overrideRole || tenantContext.profile?.role || (tenantContext.isDemo ? "gerente" : "admin");
  try {
    const cookieStore = await cookies();
    const demoRoleCookie = cookieStore.get("acelera_demo_role")?.value;
    if (!overrideRole && tenantContext.isDemo && demoRoleCookie) {
      effectiveRole = demoRoleCookie;
    }
  } catch {
    // Contexto sem cookies (ex: testes unitários isolados)
  }

  const allowAll = canViewAllLeads(effectiveRole);

  if (tenantContext.isDemo) {
    const activeCount = memoryKanbanLeads.filter(
      (l) => l.stage !== "lost" && l.stage !== "won"
    ).length;
    if (activeCount === 0) {
      await resetMemoryKanbanLeads();
    }
    const allOrgLeads = memoryKanbanLeads.filter((l) => l.organization_id === DEFAULT_DEMO_ORG_ID);
    if (!allowAll) {
      // Vendedor: visualiza apenas os leads atribuídos a si ("Rafael Alves" ou "sp-001")
      return allOrgLeads.filter(
        (l) => l.assigned_to_name === "Rafael Alves" || l.assigned_to?.id === "sp-001"
      );
    }
    return allOrgLeads;
  }

  if (isSupabaseServerConfigured() && tenantContext.organizationId) {
    try {
      const supabase = await createServerSupabaseClient();
      let query = supabase
        .from("leads")
        .select("*")
        .eq("organization_id", orgId);

      if (!allowAll) {
        const userId = tenantContext.userId;
        const userName = tenantContext.profile?.full_name;
        const userFilterParts = [
          "seller_name.eq.Fila de Atendimento",
          "seller_name.eq.Fila Geral",
          "seller_name.eq.Roleta Automática",
          "seller_name.is.null",
          "seller_id.is.null"
        ];
        if (userId) userFilterParts.push(`seller_id.eq.${userId}`);
        if (userName) userFilterParts.push(`seller_name.eq.${userName}`);
        query = query.or(userFilterParts.join(","));
      }

      const { data, error } = await query.order("created_at", { ascending: false });

      if (!error && Array.isArray(data)) {
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
            const createdAtDate = new Date(row.created_at || Date.now());
            const minutesElapsed = Math.max(
              0,
              Math.round((Date.now() - createdAtDate.getTime()) / 60000)
            );

            const stage = normalizeDbStatusToStage(row.status);

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

              // Atualiza no banco de dados
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

            const rawRow = row as unknown as Record<string, unknown>;
            const customFields = (rawRow.custom_fields && typeof rawRow.custom_fields === "object"
              ? rawRow.custom_fields
              : {}) as Record<string, unknown>;

            const rawVal =
              typeof rawRow.value === "number"
                ? rawRow.value
                : typeof rawRow.estimated_value === "number"
                ? rawRow.estimated_value
                : typeof customFields.estimated_value === "number"
                ? Number(customFields.estimated_value)
                : typeof customFields.value === "number"
                ? Number(customFields.value)
                : typeof customFields.price === "number"
                ? Number(customFields.price)
                : typeof rawRow.price === "number"
                ? rawRow.price
                : undefined;

            const leadValue = rawVal !== undefined && !isNaN(Number(rawVal)) ? Number(rawVal) : undefined;
            const vehicleId = (rawRow.vehicle_id as string) || (customFields.vehicle_id as string) || undefined;
            const vehicleName = (rawRow.vehicle_name as string) || (customFields.vehicle_name as string) || row.vehicle_interest;
            const shortCode = (rawRow.short_code as string) || (customFields.short_code as string) || undefined;

            return {
              id: row.id,
              organization_id: row.organization_id,
              name: row.name,
              phone: row.phone,
              email: row.email || undefined,
              source: row.origin || "site",
              vehicle_of_interest: row.vehicle_interest || "Veículo não especificado",
              vehicle_id: vehicleId,
              vehicle_name: vehicleName,
              value: leadValue,
              estimated_value: leadValue,
              assigned_to: sellerId || sellerName
                ? {
                    id: sellerId || `sp-${Date.now()}`,
                    name: sellerName || "Vendedor",
                  }
                : null,
              assigned_to_name: sellerName || "Vendedor de Plantão",
              stage,
              sla_minutes: minutesElapsed,
              sla_minutes_elapsed: minutesElapsed,
              created_at: row.created_at,
              updated_at: row.updated_at,
              notes: row.notes || undefined,
              short_code: shortCode,
            };
          })
        );
      }
    } catch {
      // Fallback
    }
  }

  const allFallbackLeads = memoryKanbanLeads.filter((l) => l.organization_id === orgId);
  if (!allowAll) {
    return allFallbackLeads.filter(
      (l) =>
        !l.assigned_to_name ||
        l.assigned_to_name === "Fila de Atendimento" ||
        l.assigned_to_name === "Fila Geral" ||
        l.assigned_to_name === "Roleta Automática" ||
        l.assigned_to?.id === tenantContext.userId ||
        l.assigned_to_name === tenantContext.profile?.full_name ||
        l.assigned_to_name === "Rafael Alves" ||
        l.assigned_to?.id === "sp-001"
    );
  }
  return allFallbackLeads;
}

/**
 * Retorna o quadro Kanban completo com agregação por colunas e métricas executivas.
 */
export async function getKanbanBoardAction(
  explicitOrgId?: string,
  overrideRole?: string
): Promise<KanbanBoardData> {
  const leads = await getKanbanLeadsAction(explicitOrgId, overrideRole);

  const columns: KanbanColumnConfig[] = KANBAN_STAGES_CONFIG.map((colConfig) => {
    const colLeads = leads.filter((lead) => {
      if (colConfig.id === "test_drive") {
        return lead.stage === "test_drive" || lead.stage === "visit_scheduled";
      }
      if (colConfig.id === "proposal") {
        return lead.stage === "proposal" || lead.stage === "proposal_fi";
      }
      return lead.stage === colConfig.id;
    });

    const totalValue = colLeads.reduce((acc, curr) => acc + (curr.value || 0), 0);

    return {
      ...colConfig,
      leads: colLeads,
      totalValue,
    };
  });

  const totalLeadsCount = leads.length;
  const wonLeadsCount = leads.filter((l) => l.stage === "won").length;
  const totalPipelineValue = leads
    .filter((l) => l.stage !== "lost")
    .reduce((acc, curr) => acc + (curr.value || 0), 0);
  const conversionRate = totalLeadsCount > 0 ? Math.round((wonLeadsCount / totalLeadsCount) * 100) : 0;

  return {
    columns,
    totalLeadsCount,
    totalPipelineValue,
    wonLeadsCount,
    conversionRate,
  };
}

/**
 * Atualiza o estágio do lead no funil Kanban com persistência, validação Zod e isolamento RLS.
 */
export async function updateLeadStageAction(
  leadId: string,
  newStage: LeadStage,
  lostReason?: string
): Promise<KanbanActionResult> {
  const tenantContext = await resolveUserTenantContext();
  const orgId = tenantContext.organizationId || DEFAULT_DEMO_ORG_ID;

  // 1. Validação do schema Zod
  const validation = updateLeadStageSchema.safeParse({
    lead_id: leadId,
    stage: newStage,
    lost_reason: lostReason,
  });

  if (!validation.success) {
    return {
      success: false,
      error: validation.error.issues[0]?.message || "Dados inválidos para alteração de estágio.",
    };
  }

  // 2. Busca o lead e valida isolamento de organização (RLS)
  const memLead = memoryKanbanLeads.find((l) => l.id === leadId);
  if (memLead && memLead.organization_id !== orgId && !tenantContext.isDemo) {
    return {
      success: false,
      error: "Acesso negado: o lead não pertence à sua organização.",
    };
  }

  const previousStage = memLead?.stage || null;
  let vehicleId: string | null = memLead?.vehicle_id || null;
  const nowIso = new Date().toISOString();

  // Atualiza no registro em memória (demo e fallback)
  if (memLead) {
    memLead.stage = newStage;
    memLead.updated_at = nowIso;
    memLead.stage_changed_at = nowIso;
    if (newStage === "lost" && lostReason) {
      memLead.lost_reason = lostReason;
    }
  }

  // 3. Persistência no Supabase se configurado
  if (isSupabaseServerConfigured() && !tenantContext.isDemo && tenantContext.organizationId) {
    try {
      const supabase = await createServerSupabaseClient();
      const dbStatus = mapStageToDbStatus(newStage);

      // Se não temos o vehicleId da memória, busca no banco defensivamente
      if (!vehicleId) {
        try {
          const fromLeads = supabase.from("leads");
          if (fromLeads && typeof fromLeads.select === "function") {
            const { data: currentLead } = await fromLeads
              .select("*" as never)
              .eq("id", leadId)
              .eq("organization_id", orgId)
              .maybeSingle();

            if (currentLead) {
              const rawLead = currentLead as unknown as Record<string, unknown>;
              vehicleId =
                (rawLead.vehicle_id as string) ||
                ((rawLead.custom_fields as Record<string, unknown>)?.vehicle_id as string) ||
                null;
            }
          }
        } catch {}
      }

      const updatePayload: {
        status?: LeadStatus;
        updated_at?: string;
        notes?: string;
      } = {
        status: dbStatus,
        updated_at: nowIso,
      };

      const { error } = await supabase
        .from("leads")
        .update(updatePayload)
        .eq("id", leadId)
        .eq("organization_id", orgId);

      if (error) {
        return { success: false, error: error.message };
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Falha ao atualizar lead no banco.";
      console.warn("[Kanban Update Error] Falha ao atualizar lead no banco:", errorMsg);
      return { success: false, error: errorMsg };
    }
  }

  // 4. Sincronização Automática de Baixa / Rollback de Estoque de Veículos
  await syncVehicleStockOnStageChange({
    organizationId: orgId,
    vehicleId,
    targetStage: newStage,
    previousStage,
    isDemo: tenantContext.isDemo,
  });

  try {
    revalidatePath("/vehicles");
    revalidatePath("/estoque");
    revalidatePath("/dashboard/leads");
    revalidatePath("/dashboard");
    revalidatePath("/leads");
  } catch {
    // Revalidação silenciosa em testes
  }

  return { success: true, lead: memLead };
}

/**
 * Registra o motivo de perda do lead e move para a coluna de descarte.
 */
export async function updateLeadLostReasonAction(
  leadId: string,
  reason: string
): Promise<KanbanActionResult> {
  return updateLeadStageAction(leadId, "lost", reason);
}

/**
 * Atualiza as observações/anotações de um lead no CRM.
 */
export async function updateLeadNotesAction(
  leadId: string,
  notes: string
): Promise<KanbanActionResult> {
  const tenantContext = await resolveUserTenantContext();
  const orgId = tenantContext.organizationId || DEFAULT_DEMO_ORG_ID;

  const memLead = memoryKanbanLeads.find((l) => l.id === leadId);
  if (memLead && memLead.organization_id !== orgId && !tenantContext.isDemo) {
    return {
      success: false,
      error: "Acesso negado: o lead não pertence à sua organização.",
    };
  }

  const nowIso = new Date().toISOString();
  if (memLead) {
    memLead.notes = notes;
    memLead.updated_at = nowIso;
  }

  if (isSupabaseServerConfigured() && !tenantContext.isDemo && tenantContext.organizationId) {
    try {
      let updateSuccess = false;
      try {
        const supabase = await createServerSupabaseClient();
        const { error } = await supabase
          .from("leads")
          .update({ notes, updated_at: nowIso })
          .eq("id", leadId)
          .eq("organization_id", orgId);
        if (!error) updateSuccess = true;
      } catch {}

      if (!updateSuccess) {
        try {
          const adminClient = createAdminClient();
          await adminClient
            .from("leads")
            .update({ notes, updated_at: nowIso })
            .eq("id", leadId)
            .eq("organization_id", orgId);
        } catch {}
      }
    } catch (err) {
      console.warn("[Kanban Notes Update Error]:", err);
    }
  }

  try {
    revalidatePath("/dashboard/leads");
    revalidatePath("/dashboard");
    revalidatePath("/leads");
  } catch {}

  return { success: true, lead: memLead };
}

/**
 * Consulta um lead por ID garantindo isolamento estrito de tenant (RLS).
 */
export async function getLeadByIdAction(
  leadId: string
): Promise<KanbanLead | null> {
  const tenantContext = await resolveUserTenantContext();
  if (!tenantContext.organizationId && !tenantContext.isDemo) {
    return null;
  }
  const orgId = tenantContext.organizationId || DEFAULT_DEMO_ORG_ID;

  if (tenantContext.isDemo) {
    const memLead = memoryKanbanLeads.find(
      (l) => l.id === leadId && l.organization_id === orgId
    );
    return memLead || null;
  }

  if (isSupabaseServerConfigured() && tenantContext.organizationId) {
    try {
      const supabase = await createServerSupabaseClient();
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .eq("id", leadId)
        .eq("organization_id", orgId)
        .single();

      if (error || !data) {
        return null;
      }

      return {
        id: data.id,
        organization_id: data.organization_id,
        name: data.name,
        phone: data.phone,
        email: data.email || undefined,
        source: data.origin || "site",
        vehicle_of_interest: data.vehicle_interest || "Veículo",
        assigned_to: data.seller_id
          ? { id: data.seller_id, name: data.seller_name || "Vendedor" }
          : null,
        assigned_to_name: data.seller_name || "Vendedor de Plantão",
        stage: normalizeDbStatusToStage(data.status),
        sla_minutes: 0,
        sla_minutes_elapsed: 0,
        created_at: data.created_at,
        updated_at: data.updated_at,
        notes: data.notes || undefined,
      };
    } catch {
      return null;
    }
  }

  return null;
}

/**
 * Remove um lead do CRM garantindo isolamento estrito de tenant (RLS).
 */
export async function deleteLeadAction(
  leadId: string
): Promise<KanbanActionResult> {
  const tenantContext = await resolveUserTenantContext();
  const orgId = tenantContext.organizationId || DEFAULT_DEMO_ORG_ID;

  const memIndex = memoryKanbanLeads.findIndex(
    (l) => l.id === leadId && l.organization_id === orgId
  );
  if (memIndex !== -1) {
    memoryKanbanLeads.splice(memIndex, 1);
  }

  if (isSupabaseServerConfigured() && !tenantContext.isDemo && tenantContext.organizationId) {
    try {
      const supabase = await createServerSupabaseClient();
      const { error } = await supabase
        .from("leads")
        .delete()
        .eq("id", leadId)
        .eq("organization_id", orgId);

      if (error) {
        return { success: false, error: error.message };
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao remover lead.";
      return { success: false, error: msg };
    }
  }

  return { success: true };
}

/**
 * Reatribui o vendedor responsável por um lead no Kanban com persistência e revalidação.
 */
export async function updateLeadAssignedSellerAction(
  leadId: string,
  sellerName: string,
  sellerId?: string
): Promise<KanbanActionResult> {
  const tenantContext = await resolveUserTenantContext();
  const orgId = tenantContext.organizationId || DEFAULT_DEMO_ORG_ID;

  const memLead = memoryKanbanLeads.find((l) => l.id === leadId);
  const nowIso = new Date().toISOString();

  if (memLead) {
    memLead.assigned_to_name = sellerName;
    if (sellerId) {
      memLead.assigned_to = {
        id: sellerId,
        name: sellerName,
      };
    } else {
      memLead.assigned_to = {
        id: `seller-${Date.now()}`,
        name: sellerName,
      };
    }
    memLead.updated_at = nowIso;
  }

  if (isSupabaseServerConfigured() && !tenantContext.isDemo && tenantContext.organizationId) {
    try {
      const isUUID = sellerId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sellerId.trim());
      const updatePayload: { seller_name: string; seller_id?: string | null; updated_at: string } = {
        seller_name: sellerName,
        seller_id: isUUID ? sellerId : null,
        updated_at: nowIso,
      };

      let updateSuccess = false;

      try {
        const supabase = await createServerSupabaseClient();
        const { error } = await supabase
          .from("leads")
          .update(updatePayload)
          .eq("id", leadId)
          .eq("organization_id", orgId);

        if (!error) updateSuccess = true;
      } catch {}

      if (!updateSuccess) {
        try {
          const adminClient = createAdminClient();
          await adminClient
            .from("leads")
            .update(updatePayload)
            .eq("id", leadId)
            .eq("organization_id", orgId);
        } catch {}
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao transferir lead.";
      return { success: false, error: msg };
    }
  }

  try {
    revalidatePath("/dashboard/leads");
    revalidatePath("/dashboard");
    revalidatePath("/leads");
  } catch {}

  return { success: true, lead: memLead };
}

/**
 * Cria um novo lead diretamente no Kanban / Funil de Vendas com distribuição por Roleta ou vendedor direto.
 */
export async function createKanbanLeadAction(
  input: CreateKanbanLeadInput
): Promise<KanbanActionResult> {
  // 1. Validação Zod Prévia do Schema de Entrada
  const validation = createKanbanLeadSchema.safeParse(input);
  if (!validation.success) {
    return {
      success: false,
      error: validation.error.issues[0]?.message || "Dados inválidos para criação do lead.",
    };
  }

  const tenantContext = await resolveUserTenantContext();
  const orgId = tenantContext.organizationId || DEFAULT_DEMO_ORG_ID;

  // Resolve vendedor responsável pela roleta ou pelo nome informado
  const isRoulette =
    !input.assigned_to_name ||
    input.assigned_to_name.toLowerCase().includes("roleta") ||
    input.assigned_to_name.toLowerCase().includes("fila") ||
    input.assigned_to_name === "all";

  const sellerInfo = await resolveAssignedSellerInfo(
    isRoulette ? undefined : input.assigned_to_name,
    orgId
  );
  let resolvedSeller = sellerInfo.sellerName?.trim();
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
    sellerInfo.sellerId ||
    (tenantContext.profile?.full_name === resolvedSeller ? tenantContext.userId : undefined);
  const nowIso = new Date().toISOString();
  const shortCode = generateShortCode(6);

  // 2. Normalização e Validação Estrita do Enum de Origem
  const dbOrigin: LeadOrigin = normalizeLeadOrigin(input.source);
  const originValidation = leadOriginEnum.safeParse(dbOrigin);
  if (!originValidation.success) {
    return {
      success: false,
      error: "Canal de origem inválido. Selecione uma opção válida.",
    };
  }

  const newKanbanLead: KanbanLead = {
    id: `lead-k-${Date.now()}`,
    organization_id: orgId,
    name: input.name.trim(),
    phone: input.phone.trim(),
    email: input.email?.trim() || undefined,
    vehicle_of_interest: input.vehicle_of_interest.trim(),
    source: (input.source || dbOrigin) as KanbanLead["source"],
    stage: input.stage || "new",
    assigned_to_name: resolvedSeller,
    assigned_to: {
      id: resolvedSellerId || `sp-${Date.now()}`,
      name: resolvedSeller,
    },
    sla_minutes: 0,
    sla_minutes_elapsed: 0,
    created_at: nowIso,
    updated_at: nowIso,
    value: typeof input.value === "number" && !isNaN(input.value) ? input.value : undefined,
    segment: input.segment || "all",
    notes: input.notes?.trim() || undefined,
    short_code: shortCode,
  };

  function isValidUUID(val?: string | null): boolean {
    if (!val) return false;
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val.trim());
  }

  const isOfflineOrDemo =
    tenantContext.isDemo || (!tenantContext.organizationId && !isSupabaseServerConfigured());

  if (!isOfflineOrDemo && !tenantContext.organizationId) {
    return {
      success: false,
      error: "Organização não encontrada para o usuário autenticado.",
    };
  }

  if (isSupabaseServerConfigured() && !tenantContext.isDemo && tenantContext.organizationId) {
    const dbStatus: LeadStatus =
      input.stage === "won"
        ? "fechado"
        : input.stage === "visit_scheduled" || input.stage === "test_drive"
        ? "visita"
        : input.stage === "proposal" || input.stage === "proposal_fi"
        ? "proposta"
        : input.stage === "in_contact"
        ? "atendimento"
        : "novo";

    const safeSellerId = isValidUUID(resolvedSellerId) ? resolvedSellerId : null;
    const insertPayload = {
      organization_id: orgId,
      name: input.name.trim(),
      phone: input.phone.trim(),
      email: input.email?.trim() || null,
      vehicle_interest: input.vehicle_of_interest.trim(),
      status: dbStatus,
      seller_name: resolvedSeller,
      seller_id: safeSellerId,
      origin: dbOrigin,
      notes: input.notes?.trim() || null,
      short_code: shortCode,
    };

    let insertedRecord: { id: string } | null = null;
    let lastError: string | null = null;

    // 1. Tenta inserir com o client de sessão do usuário
    try {
      const supabase = await createServerSupabaseClient();
      const { data, error } = await supabase
        .from("leads")
        .insert(insertPayload)
        .select("id")
        .single();

      if (!error && data) {
        insertedRecord = data;
      } else if (error) {
        lastError = error.message;
      }
    } catch (err) {
      lastError = err instanceof Error ? err.message : "Erro ao conectar ao banco de dados.";
    }

    // 2. Se falhou (por exemplo, RLS ou credenciais da sessão), insere com Admin Client (service_role)
    if (!insertedRecord) {
      try {
        const adminClient = createAdminClient();
        const { data: adminData, error: adminErr } = await adminClient
          .from("leads")
          .insert(insertPayload)
          .select("id")
          .single();

        if (!adminErr && adminData) {
          insertedRecord = adminData;
          lastError = null;
        } else if (adminErr) {
          console.error("[Kanban Lead Admin Insert Error]", adminErr);
          lastError = adminErr.message;
        }
      } catch (adminEx) {
        console.error("[Kanban Lead Admin Exception]", adminEx);
        lastError = adminEx instanceof Error ? adminEx.message : "Exceção ao persistir lead via serviço de administração.";
      }
    }

    if (!insertedRecord) {
      return {
        success: false,
        error: lastError || "Falha ao persistir lead no banco de dados. O registro foi rejeitado.",
      };
    }

    newKanbanLead.id = insertedRecord.id;
  }

  // Registra no estado em memória apenas se persistido com sucesso ou em modo sandbox/demo
  memoryKanbanLeads.unshift(newKanbanLead);

  try {
    void notifyAssignedSellerViaWhatsApp({
      lead: {
        id: newKanbanLead.id,
        name: newKanbanLead.name,
        phone: newKanbanLead.phone,
        email: newKanbanLead.email,
        vehicleInterest: newKanbanLead.vehicle_of_interest,
        source: newKanbanLead.source,
        short_code: shortCode,
      },
      sellerName: resolvedSeller,
      organizationId: orgId,
    });
  } catch {
    // Silencioso
  }

  try {
    revalidatePath("/dashboard/leads");
    revalidatePath("/dashboard");
    revalidatePath("/leads");
  } catch {}

  return { success: true, lead: newKanbanLead };
}
