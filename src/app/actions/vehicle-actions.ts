/**
 * @file vehicle-actions.ts
 * @description Server Actions para upload de fotos no Supabase Storage e gestão CRUD completa de veículos.
 */

"use server";

import { revalidatePath } from "next/cache";
import {
  createServerSupabaseClient,
  isSupabaseServerConfigured,
} from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveUserTenantContext, DEFAULT_DEMO_ORG_ID } from "@/lib/auth/tenant";
import { mockVehicles } from "@/lib/mock-data";
import type { Vehicle, VehicleFormData } from "@/types/crm";
import type { Database } from "@/types/database.types";

/**
 * Converte um registro do banco de dados para a entidade Vehicle do domínio com suporte a galeria.
 */
function mapDbVehicleToDomain(
  row: Database["public"]["Tables"]["vehicles"]["Row"]
): Vehicle {
  let images: string[] = [];
  if (row.photo_url) {
    images.push(row.photo_url);
  }

  // Se houver notas com JSON de galeria de fotos, recupera
  if (row.notes) {
    try {
      const parsed = JSON.parse(row.notes);
      if (Array.isArray(parsed.images)) {
        images = parsed.images;
      }
    } catch {
      // Notas são texto simples
    }
  }

  return {
    id: row.id,
    organizationId: row.organization_id,
    make: row.make,
    brand: row.make,
    model: row.model,
    version: row.version || "",
    yearFab: row.year_fab,
    yearModel: row.year_model,
    year: `${row.year_fab}/${row.year_model}`,
    plate: row.plate_last_digits,
    plateEnd: row.plate_last_digits,
    km: row.mileage,
    mileage: row.mileage,
    price: Number(row.price),
    status: row.status,
    imageUrl: row.photo_url || (images[0] || "/vehicles/civic.jpg"),
    images: images.length > 0 ? images : [row.photo_url || "/vehicles/civic.jpg"],
    color: row.color,
    fuel: row.fuel,
    transmission: row.transmission,
    notes: row.notes || undefined,
  };
}

/**
 * Realiza o upload de uma imagem (WebP) para o Supabase Storage no bucket 'vehicles'.
 */
export async function uploadVehicleImageAction(
  formData: FormData
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const tenantContext = await resolveUserTenantContext();
    const orgId = tenantContext.organizationId || DEFAULT_DEMO_ORG_ID;

    const file = formData.get("file") as File | null;
    if (!file) {
      return { success: false, error: "Nenhum arquivo enviado para upload." };
    }

    const fileName = (formData.get("fileName") as string) || file.name || `photo-${Date.now()}.webp`;
    const cleanFileName = `${Date.now()}-${fileName.replace(/[^a-zA-Z0-9_.-]/g, "_")}`;
    const storagePath = `${orgId}/${cleanFileName}`;

    // Modo Demonstração ou ambiente sem Supabase configurado
    if (tenantContext.isDemo || !isSupabaseServerConfigured()) {
      // Simula URL persistente para teste / demonstração
      const demoUrl = `/vehicles/${fileName.includes("corolla") ? "corolla.jpg" : "civic.jpg"}`;
      return { success: true, url: demoUrl };
    }

    const adminClient = createAdminClient();
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Garante que o bucket 'vehicles' exista
    try {
      await adminClient.storage.createBucket("vehicles", { public: true });
    } catch {
      // Bucket já existe
    }

    const { data: uploadData, error: uploadError } = await adminClient.storage
      .from("vehicles")
      .upload(storagePath, buffer, {
        contentType: file.type || "image/webp",
        upsert: true,
      });

    if (uploadError || !uploadData) {
      // Fallback gracioso para URL pública do bucket
      const { data: publicUrlData } = adminClient.storage
        .from("vehicles")
        .getPublicUrl(storagePath);

      if (publicUrlData?.publicUrl) {
        return { success: true, url: publicUrlData.publicUrl };
      }
      return { success: false, error: uploadError?.message || "Erro no upload da imagem." };
    }

    const { data: publicUrlData } = adminClient.storage
      .from("vehicles")
      .getPublicUrl(uploadData.path);

    return {
      success: true,
      url: publicUrlData.publicUrl,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Falha ao processar upload.";
    return { success: false, error: errorMsg };
  }
}

/**
 * Cria um novo veículo no catálogo da organização.
 */
export async function createVehicleAction(
  form: VehicleFormData & { brand?: string; mileage?: number; images?: string[] }
): Promise<{ success: boolean; vehicle?: Vehicle; error?: string }> {
  try {
    const tenantContext = await resolveUserTenantContext();
    const orgId = tenantContext.organizationId || DEFAULT_DEMO_ORG_ID;

    const make = form.make || form.brand || "Marca";
    const km = form.km !== undefined ? form.km : (form.mileage || 0);
    const imageUrl = form.imageUrl || (form.images && form.images[0]) || "/vehicles/civic.jpg";
    const images = form.images && form.images.length > 0 ? form.images : [imageUrl];

    const notesPayload = JSON.stringify({
      images,
      notes: form.notes || "",
    });

    if (tenantContext.isDemo || !isSupabaseServerConfigured()) {
      const newVehicle: Vehicle = {
        id: `v-${Date.now()}`,
        organizationId: orgId,
        make,
        brand: make,
        model: form.model,
        version: form.version || "",
        yearFab: form.yearFab || new Date().getFullYear(),
        yearModel: form.yearModel || new Date().getFullYear() + 1,
        year: `${form.yearFab || new Date().getFullYear()}/${form.yearModel || new Date().getFullYear() + 1}`,
        plate: form.plate || "ABC1D23",
        plateEnd: form.plate || "ABC1D23",
        km,
        mileage: km,
        price: form.price || 0,
        status: form.status || "disponivel",
        imageUrl,
        images,
        color: form.color || "Prata",
        fuel: form.fuel || "Flex",
        transmission: form.transmission || "Automático",
        notes: form.notes,
      };

      revalidatePath("/vehicles");
      return { success: true, vehicle: newVehicle };
    }

    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("vehicles")
      .insert({
        organization_id: orgId,
        make,
        model: form.model,
        version: form.version || null,
        year_fab: form.yearFab,
        year_model: form.yearModel,
        price: form.price,
        mileage: km,
        plate_last_digits: form.plate,
        color: form.color || "Prata",
        fuel: (form.fuel as Database["public"]["Tables"]["vehicles"]["Insert"]["fuel"]) || "flex",
        transmission: (form.transmission as Database["public"]["Tables"]["vehicles"]["Insert"]["transmission"]) || "automatico",
        status: form.status || "disponivel",
        photo_url: imageUrl,
        notes: notesPayload,
      })
      .select()
      .single();

    if (error || !data) {
      return { success: false, error: error?.message || "Erro ao cadastrar veículo no banco." };
    }

    revalidatePath("/vehicles");
    return { success: true, vehicle: mapDbVehicleToDomain(data) };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Falha ao cadastrar veículo.";
    return { success: false, error: errorMsg };
  }
}

/**
 * Atualiza os dados técnicos, comerciais e fotos de um veículo existente.
 */
export async function updateVehicleAction(
  vehicleId: string,
  data: Partial<Vehicle> & { brand?: string; mileage?: number; images?: string[] }
): Promise<{ success: boolean; vehicle?: Vehicle; error?: string }> {
  try {
    const tenantContext = await resolveUserTenantContext();
    const orgId = tenantContext.organizationId;

    const make = data.make || data.brand;
    const km = data.km !== undefined ? data.km : data.mileage;
    const imageUrl = data.imageUrl || (data.images && data.images[0]);
    const images = data.images;

    if (tenantContext.isDemo || !isSupabaseServerConfigured() || !orgId) {
      const idx = mockVehicles.findIndex((v) => v.id === vehicleId);
      const existing = idx !== -1 ? mockVehicles[idx] : {
        id: vehicleId,
        make: make || "Honda",
        model: data.model || "Civic",
        version: data.version || "EXL",
        yearFab: data.yearFab || 2023,
        yearModel: data.yearModel || 2024,
        plate: data.plate || "ABC1D23",
        km: km !== undefined ? km : 15000,
        price: data.price || 150000,
        status: data.status || "disponivel",
        imageUrl: imageUrl || "/vehicles/civic.jpg",
      };

      const updatedVehicle: Vehicle = {
        ...existing,
        ...data,
        make: make || existing.make,
        brand: make || existing.make,
        km: km !== undefined ? km : existing.km,
        mileage: km !== undefined ? km : existing.km,
        imageUrl: imageUrl !== undefined ? imageUrl : existing.imageUrl,
        images: images !== undefined ? images : (existing.images || [imageUrl || existing.imageUrl]),
      };

      if (idx !== -1) {
        mockVehicles[idx] = updatedVehicle;
      }

      try {
        revalidatePath("/vehicles");
        revalidatePath("/dashboard");
      } catch {}
      return { success: true, vehicle: updatedVehicle };
    }

    const supabase = await createServerSupabaseClient();

    const updatePayload: Database["public"]["Tables"]["vehicles"]["Update"] = {};
    if (make) updatePayload.make = make;
    if (data.model) updatePayload.model = data.model;
    if (data.version !== undefined) updatePayload.version = data.version;
    if (data.yearFab !== undefined) updatePayload.year_fab = data.yearFab;
    if (data.yearModel !== undefined) updatePayload.year_model = data.yearModel;
    if (data.price !== undefined) updatePayload.price = data.price;
    if (km !== undefined) updatePayload.mileage = km;
    if (data.plate) updatePayload.plate_last_digits = data.plate;
    if (data.color) updatePayload.color = data.color;
    if (data.status) updatePayload.status = data.status;
    if (imageUrl !== undefined) updatePayload.photo_url = imageUrl || null;

    if (images !== undefined || data.notes !== undefined) {
      updatePayload.notes = JSON.stringify({
        images: images !== undefined ? images : (imageUrl ? [imageUrl] : []),
        notes: data.notes || "",
      });
    }

    const { data: updatedData, error } = await supabase
      .from("vehicles")
      .update(updatePayload)
      .eq("id", vehicleId)
      .eq("organization_id", orgId)
      .select()
      .single();

    if (error || !updatedData) {
      return { success: false, error: error?.message || "Erro ao atualizar veículo." };
    }

    try {
      revalidatePath("/vehicles");
      revalidatePath("/dashboard");
    } catch {}
    return { success: true, vehicle: mapDbVehicleToDomain(updatedData) };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Falha ao atualizar veículo.";
    return { success: false, error: errorMsg };
  }
}

/**
 * Remove permanentemente um veículo do estoque com isolamento multi-tenant.
 */
export async function deleteVehicleAction(
  vehicleId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const tenantContext = await resolveUserTenantContext();
    const orgId = tenantContext.organizationId;

    // Modo demonstração ou ambiente sem banco conectado
    if (tenantContext.isDemo || !isSupabaseServerConfigured() || !orgId) {
      const idx = mockVehicles.findIndex((v) => v.id === vehicleId);
      if (idx !== -1) {
        mockVehicles.splice(idx, 1);
      }
      try {
        revalidatePath("/vehicles");
        revalidatePath("/dashboard");
      } catch {}
      return { success: true };
    }

    const supabase = await createServerSupabaseClient();
    const { error } = await supabase
      .from("vehicles")
      .delete()
      .eq("id", vehicleId)
      .eq("organization_id", orgId);

    if (error) {
      return { success: false, error: `Falha ao remover veículo: ${error.message}` };
    }

    try {
      revalidatePath("/vehicles");
      revalidatePath("/dashboard");
    } catch {}
    return { success: true };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Falha ao remover veículo.";
    return { success: false, error: errorMsg };
  }
}

/**
 * Consulta a lista de veículos com mapeamento completo de galeria.
 */
export async function getVehiclesAction(explicitOrgId?: string): Promise<Vehicle[]> {
  const tenantContext = await resolveUserTenantContext();

  if (tenantContext.isDemo) {
    return mockVehicles;
  }

  const orgId = explicitOrgId || tenantContext.organizationId;
  if (!orgId) {
    return [];
  }

  if (isSupabaseServerConfigured()) {
    try {
      const supabase = await createServerSupabaseClient();
      const { data, error } = await supabase
        .from("vehicles")
        .select("*")
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false });

      if (error || !data) {
        return [];
      }

      return data.map(mapDbVehicleToDomain);
    } catch {
      return [];
    }
  }

  return [];
}

/**
 * Reativa um veículo vendido de volta para o pátio ativo como disponível.
 */
export async function reactivateVehicleAction(
  vehicleId: string
): Promise<{ success: boolean; vehicle?: Vehicle; error?: string }> {
  return updateVehicleAction(vehicleId, { status: "disponivel" });
}

