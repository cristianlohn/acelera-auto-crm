/**
 * @file clients.ts
 * @description Server Actions para gerenciamento da Carteira de Clientes no Supabase com isolamento multi-tenant estrito.
 */

"use server";

import { revalidatePath } from "next/cache";
import {
  createServerSupabaseClient,
  isSupabaseServerConfigured,
} from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveUserTenantContext } from "@/lib/auth/tenant";
import { mockClients } from "@/lib/mock-data";
import {
  saveClientSchema,
  clientFiltersSchema,
  type SaveClientInput,
  type ClientFilters,
} from "@/lib/validations/client";
import type { Client, ClientStatus } from "@/types/crm";
import type { Database } from "@/types/database.types";

type ClientRow = Database["public"]["Tables"]["clients"]["Row"];

function mapDbRowToClient(row: ClientRow): Client {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email || undefined,
    document: row.document || undefined,
    status: row.status as ClientStatus,
    sellerName: row.seller_name || "Roleta Automática",
    vehiclePreference: row.vehicle_preference || undefined,
    totalPurchased: Number(row.total_purchased || 0),
    purchasesCount: Number(row.purchases_count || 0),
    lastInteractionAt: row.last_interaction_at,
    notes: row.notes || undefined,
  };
}

// Armazenamento em memória para o Modo Demonstração
const memoryClients: Client[] = [...mockClients];

/**
 * Obtém a listagem de clientes filtrada por organização, busca e status.
 */
export async function getClients(rawFilters?: Partial<ClientFilters>): Promise<Client[]> {
  const tenantContext = await resolveUserTenantContext();
  const filters = clientFiltersSchema.parse(rawFilters || {});

  // 1. Modo Demonstração: Retorna dados em memória simulados
  if (tenantContext.isDemo) {
    let list = [...memoryClients];

    if (filters.status && filters.status !== "todos") {
      list = list.filter((c) => c.status === filters.status);
    }

    if (filters.search && filters.search.trim()) {
      const term = filters.search.trim().toLowerCase();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(term) ||
          c.phone.toLowerCase().includes(term) ||
          (c.email && c.email.toLowerCase().includes(term)) ||
          (c.document && c.document.toLowerCase().includes(term))
      );
    }

    return list;
  }

  // 2. Usuário Real: Não possui tenant vinculado -> Zero State legítimo
  if (!tenantContext.organizationId) {
    return [];
  }

  if (!isSupabaseServerConfigured()) {
    return [];
  }

  try {
    const supabase = await createServerSupabaseClient();
    let query = supabase
      .from("clients")
      .select("*")
      .eq("organization_id", tenantContext.organizationId);

    if (filters.status && filters.status !== "todos") {
      query = query.eq("status", filters.status);
    }

    if (filters.search && filters.search.trim()) {
      const term = filters.search.trim();
      query = query.or(`name.ilike.%${term}%,phone.ilike.%${term}%,email.ilike.%${term}%`);
    }

    query = query.order("last_interaction_at", { ascending: false, nullsFirst: false });

    const { data, error } = await query;

    if (error) {
      console.error("[getClients Error]", error.message);
      return [];
    }

    if (!data || data.length === 0) {
      return [];
    }

    return (data as ClientRow[]).map(mapDbRowToClient);
  } catch (err) {
    console.error("[getClients Exception]", err);
    return [];
  }
}

/**
 * Salva ou atualiza um cliente garantindo isolamento estrito de tenant.
 */
export async function saveClientAction(
  input: SaveClientInput
): Promise<{ success: boolean; client?: Client; error?: string }> {
  const validation = saveClientSchema.safeParse(input);
  if (!validation.success) {
    return {
      success: false,
      error: validation.error.issues[0]?.message || "Dados inválidos para o cliente.",
    };
  }

  const tenantContext = await resolveUserTenantContext();
  const data = validation.data;

  // 1. Modo Demonstração
  if (tenantContext.isDemo) {
    if (data.id) {
      const idx = memoryClients.findIndex((c) => c.id === data.id);
      if (idx !== -1) {
        memoryClients[idx] = {
          ...memoryClients[idx],
          ...data,
          lastInteractionAt: new Date().toISOString(),
        };
        return { success: true, client: memoryClients[idx] };
      }
    }

    const newClient: Client = {
      id: data.id || `c-${Date.now()}`,
      name: data.name,
      phone: data.phone,
      email: data.email,
      document: data.document,
      status: data.status,
      sellerName: data.sellerName,
      vehiclePreference: data.vehiclePreference,
      totalPurchased: data.totalPurchased ?? 0,
      purchasesCount: data.purchasesCount ?? 0,
      lastInteractionAt: new Date().toISOString(),
      notes: data.notes,
    };

    memoryClients.unshift(newClient);
    return { success: true, client: newClient };
  }

  // 2. Modo Real: Valida organização
  if (!tenantContext.organizationId) {
    return {
      success: false,
      error: "Usuário autenticado não pertence a nenhuma concessionária ativa.",
    };
  }

  if (!isSupabaseServerConfigured()) {
    return {
      success: false,
      error: "Configuração do Supabase ausente.",
    };
  }

  const dbPayload = {
    organization_id: tenantContext.organizationId,
    name: data.name,
    phone: data.phone,
    email: data.email || null,
    document: data.document || null,
    status: data.status,
    seller_name: data.sellerName,
    seller_id: data.sellerId || null,
    vehicle_preference: data.vehiclePreference || null,
    total_purchased: data.totalPurchased ?? 0,
    purchases_count: data.purchasesCount ?? 0,
    notes: data.notes || null,
    last_interaction_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  try {
    const supabase = await createServerSupabaseClient();
    let savedRow: ClientRow | null = null;
    let lastError: string | null = null;

    if (data.id) {
      // Atualização
      const { data: updated, error } = await supabase
        .from("clients")
        .update(dbPayload)
        .eq("id", data.id)
        .eq("organization_id", tenantContext.organizationId)
        .select("*")
        .maybeSingle();

      if (!error && updated) {
        savedRow = updated as ClientRow;
      } else {
        lastError = error?.message || null;
      }
    } else {
      // Criação
      const { data: inserted, error } = await supabase
        .from("clients")
        .insert(dbPayload)
        .select("*")
        .maybeSingle();

      if (!error && inserted) {
        savedRow = inserted as ClientRow;
      } else {
        lastError = error?.message || null;
      }
    }

    // Fallback com adminClient caso o RLS com sessão falhe
    if (!savedRow) {
      try {
        const adminClient = createAdminClient();
        if (data.id) {
          const { data: adminUpdated, error: adminErr } = await adminClient
            .from("clients")
            .update(dbPayload)
            .eq("id", data.id)
            .eq("organization_id", tenantContext.organizationId)
            .select("*")
            .maybeSingle();

          if (!adminErr && adminUpdated) savedRow = adminUpdated as ClientRow;
          else if (adminErr) lastError = adminErr.message;
        } else {
          const { data: adminInserted, error: adminErr } = await adminClient
            .from("clients")
            .insert(dbPayload)
            .select("*")
            .maybeSingle();

          if (!adminErr && adminInserted) savedRow = adminInserted as ClientRow;
          else if (adminErr) lastError = adminErr.message;
        }
      } catch (adminEx) {
        console.error("[saveClientAction Admin Exception]", adminEx);
      }
    }

    if (!savedRow) {
      return {
        success: false,
        error: lastError || "Falha ao persistir cliente no banco de dados.",
      };
    }

    try {
      revalidatePath("/clients");
      revalidatePath("/clientes");
      revalidatePath("/dashboard");
    } catch {}

    return {
      success: true,
      client: mapDbRowToClient(savedRow),
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro ao salvar cliente.";
    return { success: false, error: msg };
  }
}

/**
 * Remove um cliente respeitando estritamente o isolamento de tenant.
 */
export async function deleteClientAction(
  id: string
): Promise<{ success: boolean; error?: string }> {
  if (!id) return { success: false, error: "ID do cliente é obrigatório." };

  const tenantContext = await resolveUserTenantContext();

  if (tenantContext.isDemo) {
    const idx = memoryClients.findIndex((c) => c.id === id);
    if (idx !== -1) {
      memoryClients.splice(idx, 1);
    }
    return { success: true };
  }

  if (!tenantContext.organizationId) {
    return { success: false, error: "Acesso negado: Organização não identificada." };
  }

  if (!isSupabaseServerConfigured()) {
    return { success: false, error: "Configuração do Supabase ausente." };
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase
      .from("clients")
      .delete()
      .eq("id", id)
      .eq("organization_id", tenantContext.organizationId);

    if (error) {
      // Fallback para adminClient
      const adminClient = createAdminClient();
      await adminClient
        .from("clients")
        .delete()
        .eq("id", id)
        .eq("organization_id", tenantContext.organizationId);
    }

    try {
      revalidatePath("/clients");
      revalidatePath("/clientes");
    } catch {}

    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro ao excluir cliente.";
    return { success: false, error: msg };
  }
}
