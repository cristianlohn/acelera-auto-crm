/**
 * @file business-hours.ts
 * @description Server Actions para leitura e persistência dos horários de atendimento da loja e regras de SLA.
 */

"use server";

import { revalidatePath } from "next/cache";
import { resolveUserTenantContext } from "@/lib/auth/tenant";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseServerConfigured } from "@/lib/supabase/server";
import {
  StoreBusinessHours,
  DEFAULT_AUTOMOTIVE_SCHEDULE,
  parseStoreBusinessHours,
} from "@/types/business-hours";

export interface SaveBusinessHoursResult {
  success: boolean;
  error?: string;
  isDemo?: boolean;
}

/**
 * Salva a configuração de horários de funcionamento e modo de SLA da loja.
 */
export async function saveBusinessHoursAction(
  organizationId?: string,
  businessHours: StoreBusinessHours = DEFAULT_AUTOMOTIVE_SCHEDULE
): Promise<SaveBusinessHoursResult> {
  try {
    const tenantContext = await resolveUserTenantContext();

    if (tenantContext.isDemo) {
      return { success: true, isDemo: true };
    }

    const targetOrgId = organizationId || tenantContext.organizationId;
    if (!targetOrgId) {
      return { success: false, error: "Organização não identificada." };
    }

    if (isSupabaseServerConfigured()) {
      const adminClient = createAdminClient();
      const serialized = JSON.stringify(businessHours);

      const { error } = await (
        adminClient.from("organizations") as unknown as {
          update: (data: Record<string, unknown>) => {
            eq: (col: string, val: string) => Promise<{ error: Error | null }>;
          };
        }
      )
        .update({
          business_hours: serialized,
          updated_at: new Date().toISOString(),
        })
        .eq("id", targetOrgId);

      if (error) {
        throw error;
      }
    }

    try {
      revalidatePath("/settings");
      revalidatePath("/dashboard");
      revalidatePath("/cockpit");
      revalidatePath("/leads");
    } catch {}

    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro ao salvar horários de atendimento.";
    return { success: false, error: msg };
  }
}

/**
 * Recupera os horários de funcionamento configurados para a organização.
 */
export async function getBusinessHoursAction(
  organizationId?: string
): Promise<StoreBusinessHours> {
  try {
    const tenantContext = await resolveUserTenantContext();

    if (tenantContext.isDemo) {
      return DEFAULT_AUTOMOTIVE_SCHEDULE;
    }

    const targetOrgId = organizationId || tenantContext.organizationId;
    if (!targetOrgId) {
      return DEFAULT_AUTOMOTIVE_SCHEDULE;
    }

    if (isSupabaseServerConfigured()) {
      const adminClient = createAdminClient();
      const { data } = await (
        adminClient.from("organizations") as unknown as {
          select: (cols: string) => {
            eq: (col: string, val: string) => {
              maybeSingle: () => Promise<{ data: { business_hours?: string } | null }>;
            };
          };
        }
      )
        .select("business_hours")
        .eq("id", targetOrgId)
        .maybeSingle();

      if (data?.business_hours) {
        return parseStoreBusinessHours(data.business_hours);
      }
    }

    return DEFAULT_AUTOMOTIVE_SCHEDULE;
  } catch {
    return DEFAULT_AUTOMOTIVE_SCHEDULE;
  }
}
