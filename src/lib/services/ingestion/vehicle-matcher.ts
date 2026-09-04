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
 * Remove acentos, caracteres especiais e converte para minúsculas.
 * Ex: "Ká 2020" -> "ka 2020"
 */
export function normalizeText(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/**
 * Realiza a busca em cascata de veículo no estoque da organização (status = 'disponivel' / 'available').
 *
 * 1. Match por placa / dígitos finais de placa (se houver).
 * 2. Match semântico aproximado com normalização de acentos por Modelo e Marca.
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
          .select("id, make, model, version, price, year_model, year_fab")
          .eq("organization_id", organizationId)
          .ilike("plate_last_digits", `%${plateDigits}%`)
          .limit(1)
          .maybeSingle();

        if (byPlate) {
          const raw = byPlate as Record<string, unknown>;
          const price = Number(raw.price ?? raw.sale_price ?? raw.selling_price ?? raw.preco ?? raw.valor ?? 0);
          return {
            id: String(raw.id),
            brand: String(raw.make || raw.brand || ""),
            model: String(raw.model || ""),
            version: raw.version ? String(raw.version) : null,
            price: isNaN(price) ? 0 : price,
            year: Number(raw.year_model || raw.year_fab || raw.year || 0) || undefined,
          };
        }
      }
    }

    // 2. Busca por modelo/marca aproximados com normalização de acentos (ex: "Ká" <-> "Ka")
    if (hint.model || hint.brand) {
      const rawModel = (hint.model || "").trim();
      const normalizedSearch = normalizeText(rawModel);
      const firstTerm = normalizedSearch.split(" ")[0]; // Ex: "ka", "civic", "corolla"

      // 2.1 Busca por padrão no banco
      if (firstTerm.length >= 2) {
        const { data: byModel } = await supabase
          .from("vehicles")
          .select("id, make, model, version, price, year_model, year_fab")
          .eq("organization_id", organizationId)
          .ilike("model", `%${firstTerm}%`)
          .limit(1)
          .maybeSingle();

        if (byModel) {
          const raw = byModel as Record<string, unknown>;
          const price = Number(raw.price ?? raw.sale_price ?? raw.selling_price ?? raw.preco ?? raw.valor ?? 0);
          return {
            id: String(raw.id),
            brand: String(raw.make || raw.brand || ""),
            model: String(raw.model || ""),
            version: raw.version ? String(raw.version) : null,
            price: isNaN(price) ? 0 : price,
            year: Number(raw.year_model || raw.year_fab || raw.year || 0) || undefined,
          };
        }
      }

      // 2.2 Fallback com normalização em memória sobre o estoque da organização
      const { data: allVehicles } = await supabase
        .from("vehicles")
        .select("id, make, model, version, price, year_model, year_fab")
        .eq("organization_id", organizationId)
        .limit(100);

      if (allVehicles && Array.isArray(allVehicles)) {
        const matched = allVehicles.find((v) => {
          const raw = v as Record<string, unknown>;
          const vModel = normalizeText(String(raw.model || ""));
          const vMake = normalizeText(String(raw.make || raw.brand || ""));

          if (normalizedSearch) {
            if (vModel.includes(normalizedSearch) || normalizedSearch.includes(vModel)) {
              return true;
            }
            if (firstTerm && firstTerm.length >= 2 && (vModel.includes(firstTerm) || firstTerm.includes(vModel))) {
              return true;
            }
          }

          if (hint.brand) {
            const normalizedBrand = normalizeText(hint.brand);
            if (vMake.includes(normalizedBrand) || normalizedBrand.includes(vMake)) {
              return true;
            }
          }

          return false;
        });

        if (matched) {
          const raw = matched as Record<string, unknown>;
          const price = Number(raw.price ?? raw.sale_price ?? raw.selling_price ?? raw.preco ?? raw.valor ?? 0);
          return {
            id: String(raw.id),
            brand: String(raw.make || raw.brand || ""),
            model: String(raw.model || ""),
            version: raw.version ? String(raw.version) : null,
            price: isNaN(price) ? 0 : price,
            year: Number(raw.year_model || raw.year_fab || raw.year || 0) || undefined,
          };
        }
      }
    }
  } catch (err) {
    console.warn("[matchVehicleInInventory] Falha na consulta de estoque:", err);
  }

  return null;
}
