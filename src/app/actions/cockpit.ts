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
import { getDemoDataset } from "@/lib/demo/demo-dataset";
import {
  calculateManagerCockpitMetrics,
  type ManagerCockpitMetrics,
  type LeadAnalyticsInput,
} from "@/lib/crm/analytics";
import {
  DEFAULT_AUTOMOTIVE_SCHEDULE,
  parseStoreBusinessHours,
} from "@/types/business-hours";

/**
 * Retorna as métricas consolidadas do Cockpit do Gestor para a organização ativa com isolamento multi-tenant.
 */
export async function getManagerCockpitMetrics(
  explicitOrgId?: string
): Promise<ManagerCockpitMetrics> {
  const tenantContext = await resolveUserTenantContext();

  // 1. Modo Demo Explícito (Sandbox Canônico Dinâmico contra Stale Timestamps)
  if (tenantContext.isDemo) {
    const demo = getDemoDataset(Date.now());
    const demoLeadsInput: LeadAnalyticsInput[] = demo.leads.map((l) => {
      const raw = l as unknown as Record<string, unknown>;
      return {
        id: l.id,
        name: l.name,
        phone: l.phone,
        status: l.status,
        stage: typeof raw.stage === "string" ? raw.stage : undefined,
        sellerId: typeof raw.sellerId === "string" ? raw.sellerId : undefined,
        sellerName: l.sellerName,
        sellerPhone: typeof raw.sellerPhone === "string" ? raw.sellerPhone : undefined,
        vehicleInterest: l.vehicleInterest,
        firstContactAt: typeof raw.firstContactAt === "string" ? raw.firstContactAt : undefined,
        lastContactAt: l.lastContactAt,
        createdAt: l.createdAt || l.lastContactAt || new Date(Date.now() - 3600000).toISOString(),
        estimatedValue: l.estimatedValue,
        notes: l.notes,
        proposalFi: l.proposalFi,
        scheduledFollowUpAt: typeof raw.scheduledFollowUpAt === "string" ? raw.scheduledFollowUpAt : undefined,
      };
    });
    return calculateManagerCockpitMetrics(demoLeadsInput, {
      defaultTicket: demo.kpis.averageTicket,
      isDemo: true,
      activeSellers: demo.activeSellerNames,
      sellerProfiles: demo.sellers.map((s) => ({
        id: s.id,
        name: s.name,
        phone: s.phone,
      })),
      recommendedActions: demo.cockpitActions,
      businessHours: DEFAULT_AUTOMOTIVE_SCHEDULE,
    });
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

      // Busca de vendedores ativos da organização para o ranking completo
      const activeSellerNames: string[] = [];
      const sellerProfiles: Array<{ id: string; name: string; phone: string }> = [];
      const profilesMap = new Map<string, { id: string; name: string; phone: string }>();

      try {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, full_name, role, phone")
          .eq("organization_id", targetOrgId);

        const rawProfiles = (profilesData || []) as unknown as Array<Record<string, unknown>>;
        for (const raw of rawProfiles) {
          if (raw && raw.role !== "inativo" && typeof raw.full_name === "string" && raw.full_name.trim()) {
            const fullName = raw.full_name.trim();
            const id = typeof raw.id === "string" ? raw.id : "";
            const phone = typeof raw.phone === "string" ? raw.phone : "";
            activeSellerNames.push(fullName);
            const prof = { id, name: fullName, phone };
            sellerProfiles.push(prof);
            if (id) profilesMap.set(id, prof);
            profilesMap.set(fullName.toLowerCase(), prof);
          }
        }
      } catch {
        // Silencioso em caso de isolamento ou ausência de perfis
      }

      // Consulta de horários de funcionamento da organização
      let storeBusinessHours = DEFAULT_AUTOMOTIVE_SCHEDULE;
      try {
        const { data: orgData } = await supabase
          .from("organizations")
          .select("business_hours")
          .eq("id", targetOrgId)
          .maybeSingle();
        if (orgData?.business_hours) {
          storeBusinessHours = parseStoreBusinessHours(orgData.business_hours);
        }
      } catch {
        // Fallback seguro para DEFAULT_AUTOMOTIVE_SCHEDULE
      }

      // Consulta de leads da organização
      let leadsData: Array<Record<string, unknown>> | null = null;
      let leadsError = null;

      try {
        const resWithVehicles = await supabase
          .from("leads")
          .select("*, vehicles(price)")
          .eq("organization_id", targetOrgId);
        if (!resWithVehicles.error && resWithVehicles.data) {
          leadsData = resWithVehicles.data as unknown as Array<Record<string, unknown>>;
        } else {
          const resSimple = await supabase
            .from("leads")
            .select("*")
            .eq("organization_id", targetOrgId);
          leadsData = resSimple.data as unknown as Array<Record<string, unknown>>;
          leadsError = resSimple.error;
        }
      } catch {
        const resSimple = await supabase
          .from("leads")
          .select("*")
          .eq("organization_id", targetOrgId);
        leadsData = resSimple.data as unknown as Array<Record<string, unknown>>;
        leadsError = resSimple.error;
      }

      if (leadsError || !leadsData) {
        return calculateManagerCockpitMetrics([], {
          defaultTicket: 0,
          activeSellers: activeSellerNames,
          sellerProfiles,
          businessHours: storeBusinessHours,
        });
      }

      const dbLeadsInput: LeadAnalyticsInput[] = leadsData.map((row) => {
        const rawRow = row as Record<string, unknown>;
        const customFields = (rawRow.custom_fields && typeof rawRow.custom_fields === "object"
          ? (rawRow.custom_fields as Record<string, unknown>)
          : {}) as Record<string, unknown>;

        const vehicleObj = rawRow.vehicles as { price?: number } | undefined;
        const vehiclePrice = typeof vehicleObj?.price === "number" ? vehicleObj.price : undefined;

        const estVal =
          typeof rawRow.estimated_value === "number" && rawRow.estimated_value > 0
            ? (rawRow.estimated_value as number)
            : typeof rawRow.value === "number" && rawRow.value > 0
            ? (rawRow.value as number)
            : typeof rawRow.price === "number" && rawRow.price > 0
            ? (rawRow.price as number)
            : typeof rawRow.vehicle_price === "number" && rawRow.vehicle_price > 0
            ? (rawRow.vehicle_price as number)
            : typeof customFields.estimated_value === "number" && (customFields.estimated_value as number) > 0
            ? (customFields.estimated_value as number)
            : typeof customFields.value === "number" && (customFields.value as number) > 0
            ? (customFields.value as number)
            : typeof customFields.price === "number" && (customFields.price as number) > 0
            ? (customFields.price as number)
            : typeof customFields.vehicle_price === "number" && (customFields.vehicle_price as number) > 0
            ? (customFields.vehicle_price as number)
            : vehiclePrice;

        const sellerId = (rawRow.seller_id as string) || undefined;
        let sellerName = (row.seller_name as string) || undefined;
        let sellerPhone: string | undefined;

        if (sellerId && profilesMap.has(sellerId)) {
          const prof = profilesMap.get(sellerId)!;
          if (!sellerName || sellerName === "Sem vendedor") {
            sellerName = prof.name;
          }
          sellerPhone = prof.phone;
        } else if (sellerName && profilesMap.has(sellerName.toLowerCase())) {
          const prof = profilesMap.get(sellerName.toLowerCase())!;
          sellerPhone = prof.phone;
        }

        const scheduledFollowUp =
          (rawRow.scheduled_followup_at as string) ||
          (rawRow.scheduledFollowUpAt as string) ||
          (customFields.scheduled_followup_at as string) ||
          (customFields.scheduledFollowUpAt as string) ||
          undefined;

        const isProposalFi =
          Boolean(rawRow.proposal_fi) ||
          Boolean(rawRow.proposalFi) ||
          Boolean(customFields.proposal_fi) ||
          Boolean(customFields.proposalFi) ||
          rawRow.stage === "proposal_fi" ||
          rawRow.stage === "financing";

        return {
          id: (row.id as string) || undefined,
          name: (row.name as string) || undefined,
          phone: (row.phone as string) || undefined,
          status: (row.status as string) || "novo",
          stage: typeof rawRow.stage === "string" ? (rawRow.stage as string) : undefined,
          sellerId,
          sellerName,
          sellerPhone,
          vehicleInterest: (row.vehicle_interest as string) || undefined,
          firstContactAt: typeof rawRow.first_contact_at === "string" ? (rawRow.first_contact_at as string) : undefined,
          lastContactAt: (row.last_contact_at as string) || undefined,
          createdAt: (row.created_at as string) || undefined,
          organizationId: (row.organization_id as string) || undefined,
          estimatedValue: estVal,
          vehiclePrice: estVal,
          price: estVal,
          notes: (row.notes as string) || undefined,
          proposalFi: isProposalFi,
          scheduledFollowUpAt: scheduledFollowUp,
        };
      });

      return calculateManagerCockpitMetrics(dbLeadsInput, {
        defaultTicket: 0,
        activeSellers: activeSellerNames,
        sellerProfiles,
        businessHours: storeBusinessHours,
      });
    } catch {
      return calculateManagerCockpitMetrics([], { defaultTicket: 0 });
    }
  }

  return calculateManagerCockpitMetrics([], { defaultTicket: 0 });
}
