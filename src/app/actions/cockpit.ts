/**
 * @file cockpit.ts
 * @description Server Action para consulta e cálculo de métricas executivas do Cockpit do Gestor no Supabase.
 */

"use server";

import {
  createServerSupabaseClient,
  isSupabaseServerConfigured,
} from "@/lib/supabase/server";
import { resolveUserTenantContext } from "@/lib/auth/tenant";
import { mockLeads } from "@/lib/mock-data";
import {
  calculateManagerCockpitMetrics,
  type ManagerCockpitMetrics,
  type LeadAnalyticsInput,
} from "@/lib/crm/analytics";

/**
 * Retorna as métricas consolidadas do Cockpit do Gestor para a organização ativa com isolamento multi-tenant.
 */
export async function getManagerCockpitMetrics(
  explicitOrgId?: string
): Promise<ManagerCockpitMetrics> {
  const tenantContext = await resolveUserTenantContext();

  // 1. Modo Demo Explícito (Sandbox)
  if (tenantContext.isDemo) {
    const demoLeadsInput: LeadAnalyticsInput[] = mockLeads.map((l) => ({
      id: l.id,
      name: l.name,
      phone: l.phone,
      status: l.status,
      sellerName: l.sellerName,
      vehicleInterest: l.vehicleInterest,
      lastContactAt: l.lastContactAt,
      createdAt: l.createdAt || l.lastContactAt || new Date(Date.now() - 3600000).toISOString(),
      estimatedValue: l.estimatedValue,
      notes: l.notes,
      proposalFi: l.proposalFi,
    }));
    return calculateManagerCockpitMetrics(demoLeadsInput, { defaultTicket: 140000, isDemo: true });
  }

  const targetOrgId = explicitOrgId || tenantContext.organizationId;

  // 2. Usuário real autenticado sem organização vinculada
  if (!targetOrgId) {
    return calculateManagerCockpitMetrics([], { defaultTicket: 0 });
  }

  // 3. Consulta estritamente filtrada por organization_id
  if (isSupabaseServerConfigured()) {
    try {
      const supabase = await createServerSupabaseClient();
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .eq("organization_id", targetOrgId);

      if (error || !data) {
        return calculateManagerCockpitMetrics([], { defaultTicket: 0 });
      }

      const dbLeadsInput: LeadAnalyticsInput[] = data.map((row) => {
        const rawRow = row as unknown as Record<string, unknown>;
        const customFields = (rawRow.custom_fields && typeof rawRow.custom_fields === "object"
          ? (rawRow.custom_fields as Record<string, unknown>)
          : {}) as Record<string, unknown>;

        const estVal =
          typeof rawRow.estimated_value === "number"
            ? (rawRow.estimated_value as number)
            : typeof customFields.estimated_value === "number"
            ? (customFields.estimated_value as number)
            : typeof rawRow.price === "number"
            ? (rawRow.price as number)
            : undefined;

        return {
          id: row.id,
          name: row.name,
          phone: row.phone,
          status: row.status,
          sellerName: row.seller_name,
          vehicleInterest: row.vehicle_interest,
          firstContactAt: typeof rawRow.first_contact_at === "string" ? rawRow.first_contact_at : undefined,
          lastContactAt: row.last_contact_at || undefined,
          createdAt: row.created_at,
          organizationId: row.organization_id,
          estimatedValue: estVal,
          notes: row.notes || undefined,
        };
      });

      return calculateManagerCockpitMetrics(dbLeadsInput, { defaultTicket: 0 });
    } catch {
      return calculateManagerCockpitMetrics([], { defaultTicket: 0 });
    }
  }

  return calculateManagerCockpitMetrics([], { defaultTicket: 0 });
}
