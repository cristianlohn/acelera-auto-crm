/**
 * @file lead-actions.ts
 * @description Server Actions para gestão de leads, cadastro manual com atribuição direta e transferência de titularidade.
 */

"use server";

import { revalidatePath } from "next/cache";
import {
  createServerSupabaseClient,
  isSupabaseServerConfigured,
} from "@/lib/supabase/server";
import { resolveUserTenantContext, DEFAULT_DEMO_ORG_ID } from "@/lib/auth/tenant";
import { mockLeads } from "@/lib/mock-data";
import { getTeamMembersAction } from "@/app/actions/team-actions";
import type { CreateLeadInput, LeadOrigin } from "@/types/crm";
import type { KanbanLead } from "@/types/kanban";

const memoryLocalLeads: KanbanLead[] = [];

export type { CreateLeadInput };

export interface TransferLeadResult {
  success: boolean;
  lead?: Partial<KanbanLead>;
  error?: string;
}

/**
 * Cadastra um novo lead manualmente no CRM com Atribuição Direta (Bypass da Roleta).
 */
export async function createLeadAction(
  input: CreateLeadInput
): Promise<{ success: boolean; lead?: KanbanLead; error?: string }> {
  try {
    const tenantContext = await resolveUserTenantContext();
    const orgId = tenantContext.organizationId || DEFAULT_DEMO_ORG_ID;

    if (!input.name || input.name.trim().length < 2) {
      return { success: false, error: "Nome do cliente é obrigatório." };
    }
    if (!input.phone || input.phone.trim().length < 8) {
      return { success: false, error: "Telefone do cliente é obrigatório." };
    }

    const isSeller = tenantContext.profile?.role === "vendedor";
    const currentUserId = tenantContext.userId || "user-current";
    const currentUserName = tenantContext.profile?.full_name || (tenantContext.isDemo ? "Rafael Alves" : "Consultor");

    // Vendedor sempre assume a posse direta; Gestores/Admins podem atribuir a um membro específico
    let finalAssignedToId = isSeller
      ? currentUserId
      : (input.assignedTo || input.assigned_to || input.seller_id || currentUserId);
    let finalAssignedToName = isSeller ? currentUserName : (input.sellerName || currentUserName);

    // Se o gestor passou um ID, tenta resolver o nome do membro
    if (!isSeller && (input.assignedTo || input.assigned_to || input.seller_id)) {
      try {
        const team = await getTeamMembersAction();
        const found = team.find(
          (m) =>
            m.id === finalAssignedToId ||
            m.name === input.sellerName ||
            m.name === input.assignedTo
        );
        if (found) {
          finalAssignedToId = found.id;
          finalAssignedToName = found.name;
        }
      } catch {
        // Fallback gracioso
      }
    }

    const vehicleId = input.vehicleId || input.vehicle_id;
    const vehicleName =
      input.vehicleName ||
      input.vehicle_name ||
      input.vehicle_of_interest ||
      input.vehicleInterest ||
      "Interesse Geral";
    const estimatedValue =
      typeof input.estimatedValue === "number" && !isNaN(input.estimatedValue)
        ? input.estimatedValue
        : typeof input.estimated_value === "number" && !isNaN(input.estimated_value)
        ? input.estimated_value
        : typeof input.value === "number" && !isNaN(input.value)
        ? input.value
        : undefined;

    const nowIso = new Date().toISOString();
    const firstContactAt = input.source === "patio" ? nowIso : null;

    // Se o veículo foi informado, registra nota inicial de histórico
    const vehicleHistoryNote =
      vehicleName && vehicleName !== "Interesse Geral"
        ? `Interesse registrado no veículo: ${vehicleName}${
            estimatedValue && estimatedValue > 0
              ? ` - R$ ${Number(estimatedValue).toLocaleString("pt-BR")}`
              : ""
          }`
        : undefined;

    const finalNotes = [vehicleHistoryNote, input.notes?.trim()].filter(Boolean).join("\n") || undefined;

    const newLead: KanbanLead = {
      id: `lead-k-${Date.now()}`,
      organization_id: orgId,
      name: input.name.trim(),
      phone: input.phone.trim(),
      email: input.email?.trim() || undefined,
      vehicle_of_interest: vehicleName,
      vehicle_id: vehicleId,
      vehicle_name: vehicleName,
      source: input.source,
      stage: (input.stage as KanbanLead["stage"]) || "new",
      assigned_to_name: finalAssignedToName,
      assigned_to: {
        id: finalAssignedToId,
        name: finalAssignedToName,
      },
      sla_minutes: 0,
      sla_minutes_elapsed: 0,
      created_at: nowIso,
      updated_at: nowIso,
      value: estimatedValue,
      estimated_value: estimatedValue,
      segment: (input.segment as KanbanLead["segment"]) || "all",
      notes: finalNotes,
    };

    if (tenantContext.isDemo || !isSupabaseServerConfigured() || !tenantContext.organizationId) {
      memoryLocalLeads.unshift(newLead);
      mockLeads.unshift({
        id: newLead.id,
        name: newLead.name,
        phone: newLead.phone,
        email: newLead.email,
        vehicleInterest: newLead.vehicle_of_interest,
        vehicleId: vehicleId,
        vehicleName: vehicleName,
        estimatedValue: estimatedValue,
        status: "novo",
        sellerName: newLead.assigned_to_name,
        lastContactAt: firstContactAt,
        origin: input.source as LeadOrigin,
        notes: finalNotes,
      });

      try {
        revalidatePath("/leads");
        revalidatePath("/dashboard");
      } catch {}

      return { success: true, lead: newLead };
    }

    const supabase = await createServerSupabaseClient();
    const dbOrigin = (input.source === "patio" ? "patio_balcao" : (input.source || "patio_balcao")) as LeadOrigin;
    const { data, error } = await supabase
      .from("leads")
      .insert({
        organization_id: orgId,
        name: input.name.trim(),
        phone: input.phone.trim(),
        email: input.email?.trim() || null,
        vehicle_interest: vehicleName,
        status: "novo",
        seller_name: finalAssignedToName,
        seller_id: finalAssignedToId.length === 36 ? finalAssignedToId : null,
        origin: dbOrigin,
        last_contact_at: firstContactAt,
        notes: finalNotes || null,
        custom_fields: {
          vehicle_id: vehicleId,
          vehicle_name: vehicleName,
          estimated_value: estimatedValue,
        },
      })
      .select()
      .single();

    if (error || !data) {
      return { success: false, error: error?.message || "Erro ao persistir lead." };
    }

    try {
      revalidatePath("/leads");
      revalidatePath("/dashboard");
    } catch {}

    return {
      success: true,
      lead: {
        ...newLead,
        id: data.id,
      },
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Falha ao cadastrar lead.";
    return { success: false, error: errorMsg };
  }
}

/**
 * Transfere a titularidade de um lead para outro vendedor da equipe comercial com auditoria.
 */
export async function transferLeadAction(
  leadId: string,
  targetUserId: string,
  reason?: string
): Promise<TransferLeadResult> {
  try {
    const tenantContext = await resolveUserTenantContext();
    if (!tenantContext.userId && !tenantContext.isDemo) {
      return { success: false, error: "Não autorizado." };
    }

    const isSeller = tenantContext.profile?.role === "vendedor";
    const currentUserId = tenantContext.userId;
    const currentUserName = tenantContext.profile?.full_name || (tenantContext.isDemo ? "Rafael Alves" : "Consultor");

    // 1. Resolução do novo responsável
    let targetName = targetUserId;
    try {
      const team = await getTeamMembersAction();
      const targetMember = team.find((m) => m.id === targetUserId || m.name === targetUserId);
      if (targetMember) {
        targetName = targetMember.name;
      }
    } catch {
      // Fallback
    }

    const nowIso = new Date().toISOString();
    const auditLogMessage = `Lead transferido de ${currentUserName} para ${targetName} por ${currentUserName}.${reason ? ` Motivo: ${reason}` : ""}`;

    // 2. Modo Demonstração ou Fallback em Memória
    if (tenantContext.isDemo || !isSupabaseServerConfigured() || !tenantContext.organizationId) {
      const memoryLead = memoryLocalLeads.find((l) => l.id === leadId);
      const mockLead = mockLeads.find((l) => l.id === leadId);

      if (isSeller) {
        const leadOwnerId = memoryLead?.assigned_to?.id;
        const leadOwnerName = memoryLead?.assigned_to_name || mockLead?.sellerName;
        if (
          (leadOwnerId && leadOwnerId !== currentUserId) ||
          (leadOwnerName && leadOwnerName !== currentUserName)
        ) {
          return {
            success: false,
            error: "Você só pode transferir leads sob sua responsabilidade.",
          };
        }
      }

      if (memoryLead) {
        memoryLead.assigned_to_name = targetName;
        memoryLead.assigned_to = {
          id: targetUserId,
          name: targetName,
        };
        memoryLead.updated_at = nowIso;
        memoryLead.notes = memoryLead.notes
          ? `${memoryLead.notes}\n[${nowIso.slice(0, 10)}] ${auditLogMessage}`
          : auditLogMessage;
      }

      if (mockLead) {
        mockLead.sellerName = targetName;
      }

      try {
        revalidatePath("/leads");
        revalidatePath("/dashboard");
      } catch {}

      return {
        success: true,
        lead: memoryLead || (mockLead ? { id: mockLead.id, name: mockLead.name, assigned_to_name: targetName } : undefined),
      };
    }

    // 3. Supabase Real
    const supabase = await createServerSupabaseClient();
    const { data: existingLead, error: findError } = await supabase
      .from("leads")
      .select("*")
      .eq("id", leadId)
      .eq("organization_id", tenantContext.organizationId)
      .single();

    if (findError || !existingLead) {
      return { success: false, error: "Lead não encontrado na organização." };
    }

    // Validação RBAC estrita
    if (isSeller) {
      if (
        existingLead.seller_id !== currentUserId &&
        existingLead.seller_name !== currentUserName
      ) {
        return {
          success: false,
          error: "Você só pode transferir leads sob sua responsabilidade.",
        };
      }
    }

    const safeTargetId = targetUserId.length === 36 ? targetUserId : null;
    const updatedNotes = existingLead.notes
      ? `${existingLead.notes}\n[${nowIso.slice(0, 10)}] ${auditLogMessage}`
      : auditLogMessage;

    const { data: updatedRecord, error: updateError } = await supabase
      .from("leads")
      .update({
        seller_id: safeTargetId,
        seller_name: targetName,
        notes: updatedNotes,
        updated_at: nowIso,
      })
      .eq("id", leadId)
      .eq("organization_id", tenantContext.organizationId)
      .select()
      .single();

    if (updateError || !updatedRecord) {
      return { success: false, error: updateError?.message || "Erro ao transferir titularidade." };
    }

    try {
      revalidatePath("/leads");
      revalidatePath("/dashboard");
    } catch {}

    return {
      success: true,
      lead: {
        id: updatedRecord.id,
        name: updatedRecord.name,
        assigned_to_name: targetName,
      },
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Falha ao processar transferência.";
    return { success: false, error: errorMsg };
  }
}
