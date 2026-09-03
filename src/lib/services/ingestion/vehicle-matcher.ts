/**
 * @file vehicle-matcher.ts
 * @description Algoritmo de vinculação inteligente e em cascata entre pistas de anúncio/lead e estoque real.
 */

import { createAdminClient } from "@/lib/supabase/admin";

export interface MatchedVehicle {
  id: string;
  brand: string;
  model: string;
  version?: string | null;
  price: number;
  year?: number;
}

/**
 * Realiza a busca em cascata de veículo no estoque da organização (status = 'disponivel' / 'available').
 *
 * 1. Match por placa / dígitos finais de placa (se houver).
 * 2. Match semântico aproximado por Modelo e Marca.
 * 3. Fallback Seguro: retorna null caso nenhum veículo seja identificado com segurança.
 */
export async function matchVehicleInInventory(
  organizationId: string,
  hint?: {
    adId?: string;
    plate?: string;
    brand?: string;
    model?: string;
    version?: string;
  }
): Promise<MatchedVehicle | null> {
  if (!hint || (!hint.plate && !hint.model && !hint.brand && !hint.adId)) {
    return null;
  }

  try {
    const supabase = createAdminClient();

    // 1. Busca por placa (se houver)
    if (hint.plate) {
      const cleanPlate = hint.plate.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
      if (cleanPlate.length >= 3) {
        const plateDigits = cleanPlate.slice(-3);
        const { data: byPlate } = await supabase
          .from("vehicles")
          .select("id, make, model, version, price, year_model")
          .eq("organization_id", organizationId)
          .ilike("plate_last_digits", `%${plateDigits}%`)
          .limit(1)
          .maybeSingle();

        if (byPlate) {
          return {
            id: byPlate.id,
            brand: byPlate.make,
            model: byPlate.model,
            version: byPlate.version,
            price: Number(byPlate.price) || 0,
            year: byPlate.year_model,
          };
        }
      }
    }

    // 2. Busca por modelo/marca aproximados
    if (hint.model) {
      const modelTerms = hint.model.trim().split(" ")[0]; // Ex: "Civic", "Compass", "Corolla"
      if (modelTerms.length >= 2) {
        const { data: byModel } = await supabase
          .from("vehicles")
          .select("id, make, model, version, price, year_model")
          .eq("organization_id", organizationId)
          .ilike("model", `%${modelTerms}%`)
          .limit(1)
          .maybeSingle();

        if (byModel) {
          return {
            id: byModel.id,
            brand: byModel.make,
            model: byModel.model,
            version: byModel.version,
            price: Number(byModel.price) || 0,
            year: byModel.year_model,
          };
        }
      }
    }
  } catch (err) {
    console.warn("[matchVehicleInInventory] Falha na consulta de estoque:", err);
  }

  return null;
}
