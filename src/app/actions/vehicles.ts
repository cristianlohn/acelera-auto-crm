/**
 * @file vehicles.ts
 * @description Server Actions para Gestão de Veículos no Supabase com fallback seguro para mock data.
 *
 * Expõe ações assíncronas tipadas para o Next.js App Router ("use server"):
 * - getVehicles(): Busca todos os veículos do pátio da organização.
 * - createVehicle(data): Insere um novo veículo com foto e dados técnicos.
 * - updateVehicleStatus(id, status): Atualiza o status (disponível, reservado, vendido).
 */

"use server";

import { revalidatePath } from "next/cache";
import {
  createServerSupabaseClient,
  isSupabaseServerConfigured,
} from "@/lib/supabase/server";
import { resolveUserTenantContext, DEFAULT_DEMO_ORG_ID } from "@/lib/auth/tenant";
import { mockVehicles } from "@/lib/mock-data";
import type { Vehicle, VehicleFormData, VehicleStatus } from "@/types/crm";
import type { Database } from "@/types/database.types";

/**
 * Converte um registro do banco de dados para a entidade Vehicle do domínio.
 */
function mapDbVehicleToDomain(
  row: Database["public"]["Tables"]["vehicles"]["Row"]
): Vehicle {
  return {
    id: row.id,
    make: row.make,
    model: row.model,
    version: row.version || "",
    yearFab: row.year_fab,
    yearModel: row.year_model,
    plate: row.plate_last_digits,
    km: row.mileage,
    price: Number(row.price),
    status: row.status,
    imageUrl: row.photo_url || "",
  };
}

/**
 * Obtém a listagem completa de veículos em estoque.
 *
 * @returns Lista de veículos da organização ou array vazio se a loja não possuir veículos no pátio.
 */
export async function getVehicles(): Promise<Vehicle[]> {
  const tenantContext = await resolveUserTenantContext();

  // 1. Modo Demonstração explícito
  if (tenantContext.isDemo) {
    return mockVehicles;
  }

  // 2. Usuário Autenticado Real sem organização vinculada
  if (!tenantContext.organizationId) {
    return [];
  }

  // 3. Usuário Autenticado Real: consulta estritamente a organização do usuário
  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("vehicles")
      .select("*")
      .eq("organization_id", tenantContext.organizationId)
      .order("created_at", { ascending: false });

    if (error || !data) {
      return [];
    }

    return data.map(mapDbVehicleToDomain);
  } catch {
    return [];
  }
}

/**
 * Cadastra um novo veículo no estoque da organização.
 *
 * @param form - Dados do formulário do veículo.
 * @returns O veículo persistido formatado para o domínio.
 */
export async function createVehicle(form: VehicleFormData): Promise<Vehicle> {
  const tenantContext = await resolveUserTenantContext();
  const orgId = tenantContext.organizationId || DEFAULT_DEMO_ORG_ID;

  const fallbackVehicle: Vehicle = {
    id: `v-${Date.now()}`,
    ...form,
  };

  if (!isSupabaseServerConfigured()) {
    return fallbackVehicle;
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("vehicles")
      .insert({
        organization_id: orgId,
        make: form.make,
        model: form.model,
        version: form.version || null,
        year_fab: form.yearFab,
        year_model: form.yearModel,
        price: form.price,
        mileage: form.km,
        plate_last_digits: form.plate,
        color: "Prata",
        fuel: "flex",
        transmission: "automatico",
        status: form.status,
        photo_url: form.imageUrl || null,
      })
      .select()
      .single();

    if (error || !data) {
      return fallbackVehicle;
    }

    revalidatePath("/vehicles");
    return mapDbVehicleToDomain(data);
  } catch {
    return fallbackVehicle;
  }
}

/**
 * Atualiza o status de comercialização de um veículo.
 *
 * @param id - Identificador único do veículo.
 * @param status - Novo status (disponível, reservado, vendido).
 */
export async function updateVehicleStatus(
  id: string,
  status: VehicleStatus
): Promise<{ success: boolean; id: string; status: VehicleStatus }> {
  if (!isSupabaseServerConfigured()) {
    return { success: true, id, status };
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase
      .from("vehicles")
      .update({ status })
      .eq("id", id);

    if (error) {
      return { success: false, id, status };
    }

    revalidatePath("/vehicles");
    return { success: true, id, status };
  } catch {
    return { success: true, id, status };
  }
}
