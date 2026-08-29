/**
 * @file kanban-actions.ts
 * @description Server Actions multi-tenant para gerenciamento do Funil de Vendas e Kanban de Leads.
 */

"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createServerSupabaseClient, isSupabaseServerConfigured } from "@/lib/supabase/server";
import { resolveUserTenantContext, DEFAULT_DEMO_ORG_ID } from "@/lib/auth/tenant";
import { resolveAssignedSeller, notifyAssignedSellerViaWhatsApp } from "@/lib/crm/roleta";
import type { LeadStage, KanbanLead, KanbanBoardData, KanbanColumnConfig } from "@/types/kanban";
import { KANBAN_STAGES_CONFIG } from "@/types/kanban";
import type { LeadStatus, LeadOrigin } from "@/types/database.types";
import { updateLeadStageSchema } from "@/lib/validations/kanban";

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

// Leads padrão em memória com dados ricos para o ambiente demo e offline
const initialMemoryKanbanLeads: KanbanLead[] = [
  {
    id: "lead-k-101",
    organization_id: DEFAULT_DEMO_ORG_ID,
    name: "Carlos Henrique Silveira",
    phone: "+5511988881234",
    email: "carlos.silveira@email.com",
    source: "meta_ads",
    vehicle_of_interest: "Jeep Compass Longitude 2024",
    assigned_to: {
      id: "sp-001",
      name: "Rafael Alves",
      phone: "+5511988887777",
    },
    assigned_to_name: "Rafael Alves",
    stage: "new",
    sla_minutes: 3,
    sla_minutes_elapsed: 3,
    created_at: new Date(Date.now() - 3 * 60000).toISOString(),
    updated_at: new Date(Date.now() - 3 * 60000).toISOString(),
    value: 189900,
    segment: "new_cars",
    notes: "Cliente quer financiar com 40% de entrada.",
  },
  {
    id: "lead-k-102",
    organization_id: DEFAULT_DEMO_ORG_ID,
    name: "Mariana Costa Albuquerque",
    phone: "+5511977772345",
    email: "mariana.costa@email.com",
    source: "webmotors",
    vehicle_of_interest: "Toyota Corolla Cross XRE 2024",
    assigned_to: {
      id: "sp-002",
      name: "Juliana Costa",
      phone: "+5511977776666",
    },
    assigned_to_name: "Juliana Costa",
    stage: "new",
    sla_minutes: 18,
    sla_minutes_elapsed: 18, // Alerta vermelho de SLA (>15min)
    created_at: new Date(Date.now() - 18 * 60000).toISOString(),
    updated_at: new Date(Date.now() - 18 * 60000).toISOString(),
    value: 178500,
    segment: "new_cars",
    notes: "Possui Toyota Yaris 2020 para avaliação na troca.",
  },
  {
    id: "lead-k-103",
    organization_id: DEFAULT_DEMO_ORG_ID,
    name: "Roberto Mendes Junior",
    phone: "+5511966663456",
    email: "roberto.mendes@email.com",
    source: "icarros",
    vehicle_of_interest: "Honda Civic Touring 2022",
    assigned_to: {
      id: "sp-003",
      name: "Marcos Ferreira",
      phone: "+5511966665555",
    },
    assigned_to_name: "Marcos Ferreira",
    stage: "in_contact",
    sla_minutes: 8,
    sla_minutes_elapsed: 8,
    created_at: new Date(Date.now() - 45 * 60000).toISOString(),
    updated_at: new Date(Date.now() - 45 * 60000).toISOString(),
    value: 154900,
    segment: "used_cars",
    notes: "Enviado vídeo do laudo cautelar aprovado pelo WhatsApp.",
  },
  {
    id: "lead-k-104",
    organization_id: DEFAULT_DEMO_ORG_ID,
    name: "Fernanda Lima de Paula",
    phone: "+5511955554567",
    email: "fernanda.lima@email.com",
    source: "site",
    vehicle_of_interest: "VW Nivus Highline 2023",
    assigned_to: {
      id: "sp-001",
      name: "Rafael Alves",
      phone: "+5511988887777",
    },
    assigned_to_name: "Rafael Alves",
    stage: "test_drive",
    sla_minutes: 4,
    sla_minutes_elapsed: 4,
    created_at: new Date(Date.now() - 120 * 60000).toISOString(),
    updated_at: new Date(Date.now() - 120 * 60000).toISOString(),
    value: 139900,
    segment: "used_cars",
    notes: "Test drive confirmado para sábado às 10h com o esposo.",
  },
  {
    id: "lead-k-105",
    organization_id: DEFAULT_DEMO_ORG_ID,
    name: "Lucas Gabriel Antunes",
    phone: "+5511944445678",
    email: "lucas.antunes@email.com",
    source: "meta_ads",
    vehicle_of_interest: "BMW 320i GP 2021",
    assigned_to: {
      id: "sp-002",
      name: "Juliana Costa",
      phone: "+5511977776666",
    },
    assigned_to_name: "Juliana Costa",
    stage: "test_drive",
    sla_minutes: 2,
    sla_minutes_elapsed: 2,
    created_at: new Date(Date.now() - 240 * 60000).toISOString(),
    updated_at: new Date(Date.now() - 240 * 60000).toISOString(),
    value: 239000,
    segment: "used_cars",
    notes: "Test drive agendado hoje às 16h.",
  },
  {
    id: "lead-k-106",
    organization_id: DEFAULT_DEMO_ORG_ID,
    name: "Patrícia Helena Soares",
    phone: "+5511933336789",
    email: "patricia.soares@email.com",
    source: "meta_ads",
    vehicle_of_interest: "Hyundai Creta Ultimate 2024",
    assigned_to: {
      id: "sp-003",
      name: "Marcos Ferreira",
      phone: "+5511966665555",
    },
    assigned_to_name: "Marcos Ferreira",
    stage: "proposal",
    sla_minutes: 5,
    sla_minutes_elapsed: 5,
    created_at: new Date(Date.now() - 360 * 60000).toISOString(),
    updated_at: new Date(Date.now() - 360 * 60000).toISOString(),
    value: 169900,
    segment: "new_cars",
    notes: "Ficha de financiamento aprovada no Banco Santander (taxa 0,99%).",
  },
  {
    id: "lead-k-107",
    organization_id: DEFAULT_DEMO_ORG_ID,
    name: "Eduardo Camargo Barros",
    phone: "+5511922227890",
    email: "eduardo.barros@email.com",
    source: "olx",
    vehicle_of_interest: "Chevrolet Tracker Premier 2022",
    assigned_to: {
      id: "sp-001",
      name: "Rafael Alves",
      phone: "+5511988887777",
    },
    assigned_to_name: "Rafael Alves",
    stage: "won",
    sla_minutes: 1,
    sla_minutes_elapsed: 1,
    created_at: new Date(Date.now() - 1440 * 60000).toISOString(),
    updated_at: new Date(Date.now() - 1440 * 60000).toISOString(),
    value: 124900,
    segment: "used_cars",
    notes: "Sinal de R$ 5.000 pago via PIX. Faturamento em andamento.",
  },
  {
    id: "lead-k-108",
    organization_id: DEFAULT_DEMO_ORG_ID,
    name: "Renato Gonçalves Dias",
    phone: "+5511911118901",
    email: "renato.dias@email.com",
    source: "webmotors",
    vehicle_of_interest: "Ford Ranger XLT 2023",
    assigned_to: {
      id: "sp-003",
      name: "Marcos Ferreira",
      phone: "+5511966665555",
    },
    assigned_to_name: "Marcos Ferreira",
    stage: "lost",
    sla_minutes: 15,
    sla_minutes_elapsed: 15,
    created_at: new Date(Date.now() - 2880 * 60000).toISOString(),
    updated_at: new Date(Date.now() - 2880 * 60000).toISOString(),
    lost_reason: "Comprou na concorrência",
    value: 219000,
    segment: "used_cars",
    notes: "Cliente optou por comprar em outra concessionária com bônus de troca.",
  },
  {
    id: "lead-k-109",
    organization_id: DEFAULT_DEMO_ORG_ID,
    name: "Guilherme Santos Prado",
    phone: "+5511988776655",
    email: "guilherme.prado@email.com",
    source: "meta_ads",
    vehicle_of_interest: "Honda HR-V Touring 2024",
    assigned_to: {
      id: "sp-001",
      name: "Rafael Alves",
      phone: "+5511988887777",
    },
    assigned_to_name: "Rafael Alves",
    stage: "new",
    sla_minutes: 2,
    sla_minutes_elapsed: 2,
    created_at: new Date(Date.now() - 2 * 60000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 60000).toISOString(),
    value: 199900,
    segment: "new_cars",
    notes: "Interessado em test-drive no final de semana.",
  },
  {
    id: "lead-k-110",
    organization_id: DEFAULT_DEMO_ORG_ID,
    name: "Camila Rodrigues Silva",
    phone: "+5511988774433",
    email: "camila.rodrigues@email.com",
    source: "site",
    vehicle_of_interest: "Jeep Renegade Trailhawk 2023",
    assigned_to: {
      id: "sp-002",
      name: "Juliana Costa",
      phone: "+5511977776666",
    },
    assigned_to_name: "Juliana Costa",
    stage: "new",
    sla_minutes: 5,
    sla_minutes_elapsed: 5,
    created_at: new Date(Date.now() - 5 * 60000).toISOString(),
    updated_at: new Date(Date.now() - 5 * 60000).toISOString(),
    value: 144900,
    segment: "used_cars",
    notes: "Solicitou cotação de seguro e entrada facilitada.",
  },
];

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
    overrideRole || tenantContext.profile?.role || (tenantContext.isDemo ? "gerente" : "seller");
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
        .select(`
          id,
          organization_id,
          name,
          phone,
          email,
          vehicle_interest,
          status,
          origin,
          seller_id,
          seller_name,
          notes,
          created_at,
          updated_at,
          last_contact_at
        `)
        .eq("organization_id", orgId);

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

      if (!error && Array.isArray(data)) {
        return data.map((row) => {
          const createdAtDate = new Date(row.created_at || Date.now());
          const minutesElapsed = Math.max(
            0,
            Math.round((Date.now() - createdAtDate.getTime()) / 60000)
          );

          const stage = normalizeDbStatusToStage(row.status);

          return {
            id: row.id,
            organization_id: row.organization_id,
            name: row.name,
            phone: row.phone,
            email: row.email || undefined,
            source: row.origin || "site",
            vehicle_of_interest: row.vehicle_interest || "Veículo não especificado",
            assigned_to: row.seller_id
              ? {
                  id: row.seller_id,
                  name: row.seller_name || "Vendedor",
                }
              : null,
            assigned_to_name: row.seller_name || "Fila Geral",
            stage,
            sla_minutes: minutesElapsed,
            sla_minutes_elapsed: minutesElapsed,
            created_at: row.created_at,
            updated_at: row.updated_at,
            notes: row.notes || undefined,
          };
        });
      }
    } catch {
      // Fallback
    }
  }

  const allFallbackLeads = memoryKanbanLeads.filter((l) => l.organization_id === orgId);
  if (!allowAll) {
    return allFallbackLeads.filter(
      (l) =>
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

      const updatePayload: {
        status?: LeadStatus;
        updated_at?: string;
        notes?: string;
      } = {
        status: dbStatus,
        updated_at: nowIso,
      };

      if (newStage === "lost" && lostReason) {
        updatePayload.notes = `[Motivo Perda]: ${lostReason}`;
      }

      const { error } = await supabase
        .from("leads")
        .update(updatePayload)
        .eq("id", leadId)
        .eq("organization_id", orgId);

      if (error) {
        return { success: false, error: error.message };
      }
    } catch (err) {
      console.warn("[Kanban Update Error] Falha ao atualizar lead no banco:", err);
    }
  }

  try {
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
      const supabase = await createServerSupabaseClient();
      await supabase
        .from("leads")
        .update({ notes, updated_at: nowIso })
        .eq("id", leadId)
        .eq("organization_id", orgId);
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
        assigned_to_name: data.seller_name || "Fila Geral",
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
      const supabase = await createServerSupabaseClient();
      const updatePayload: { seller_name: string; seller_id?: string; updated_at: string } = {
        seller_name: sellerName,
        updated_at: nowIso,
      };
      if (sellerId) {
        updatePayload.seller_id = sellerId;
      }

      const { error } = await supabase
        .from("leads")
        .update(updatePayload)
        .eq("id", leadId)
        .eq("organization_id", orgId);

      if (error) {
        return { success: false, error: error.message };
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
  const tenantContext = await resolveUserTenantContext();
  const orgId = tenantContext.organizationId || DEFAULT_DEMO_ORG_ID;

  // Resolve vendedor responsável pela roleta ou pelo nome informado
  const isRoulette =
    !input.assigned_to_name ||
    input.assigned_to_name.toLowerCase().includes("roleta") ||
    input.assigned_to_name === "all";

  const resolvedSeller = await resolveAssignedSeller(
    isRoulette ? undefined : input.assigned_to_name,
    orgId
  );
  const nowIso = new Date().toISOString();

  const newKanbanLead: KanbanLead = {
    id: `lead-k-${Date.now()}`,
    organization_id: orgId,
    name: input.name.trim(),
    phone: input.phone.trim(),
    email: input.email?.trim() || undefined,
    vehicle_of_interest: input.vehicle_of_interest.trim(),
    source: (input.source || "patio") as KanbanLead["source"],
    stage: input.stage || "new",
    assigned_to_name: resolvedSeller,
    assigned_to: {
      id: `sp-${Date.now()}`,
      name: resolvedSeller,
    },
    sla_minutes: 0,
    sla_minutes_elapsed: 0,
    created_at: nowIso,
    updated_at: nowIso,
    value: input.value || 120000,
    segment: input.segment || "all",
    notes: input.notes?.trim() || undefined,
  };

  memoryKanbanLeads.unshift(newKanbanLead);

  if (isSupabaseServerConfigured() && !tenantContext.isDemo && tenantContext.organizationId) {
    try {
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

      const dbOrigin: LeadOrigin =
        input.source === "indicacao"
          ? "indicacao"
          : input.source === "instagram" || input.source === "meta_ads"
          ? "instagram"
          : input.source === "site"
          ? "site"
          : input.source === "webmotors"
          ? "webmotors"
          : input.source === "icarros"
          ? "icarros"
          : input.source === "olx"
          ? "olx"
          : input.source === "patio" || input.source === "patio_balcao"
          ? "patio_balcao"
          : "whatsapp";

      const supabase = await createServerSupabaseClient();
      const { data, error } = await supabase
        .from("leads")
        .insert({
          organization_id: orgId,
          name: input.name.trim(),
          phone: input.phone.trim(),
          email: input.email?.trim() || null,
          vehicle_interest: input.vehicle_of_interest.trim(),
          status: dbStatus,
          seller_name: resolvedSeller,
          origin: dbOrigin,
          notes: input.notes?.trim() || null,
        })
        .select()
        .single();

      if (!error && data) {
        newKanbanLead.id = data.id;
      }
    } catch {
      // Fallback
    }
  }

  try {
    void notifyAssignedSellerViaWhatsApp({
      lead: {
        id: newKanbanLead.id,
        name: newKanbanLead.name,
        phone: newKanbanLead.phone,
        email: newKanbanLead.email,
        vehicleInterest: newKanbanLead.vehicle_of_interest,
        source: newKanbanLead.source,
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
