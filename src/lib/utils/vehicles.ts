/**
 * @file vehicles.ts
 * @description Utilitários puros de domínio para sanitização e normalização de dados de veículos.
 */

import type { Database } from "@/types/database.types";

/**
 * Normaliza o tipo de combustível para o enum estrito do PostgreSQL (public.fuel_type).
 */
export function normalizeFuel(val?: string | null): Database["public"]["Enums"]["fuel_type"] {
  if (!val) return "flex";
  const clean = val.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (clean.includes("gasolina")) return "gasolina";
  if (clean.includes("etanol") || clean.includes("alcool")) return "etanol";
  if (clean.includes("diesel")) return "diesel";
  if (clean.includes("hibrid") || clean.includes("hev") || clean.includes("phev")) return "hibrido";
  if (clean.includes("eletric") || clean.includes("bev")) return "eletrico";
  return "flex";
}

/**
 * Normaliza o tipo de câmbio/transmissão para o enum estrito do PostgreSQL (public.transmission_type).
 */
export function normalizeTransmission(val?: string | null): Database["public"]["Enums"]["transmission_type"] {
  if (!val) return "automatico";
  const clean = val.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (clean.includes("manual") || clean.includes("mecanic")) return "manual";
  if (clean.includes("cvt")) return "cvt";
  if (clean.includes("automat")) return "automatico";
  return "automatico";
}

/**
 * Sanitiza a placa do veículo mantendo entre 1 e 7 caracteres alfanuméricos em caixa alta,
 * respeitando o check constraint do Postgres (length between 1 and 7).
 */
export function sanitizePlate(val?: string | null): string {
  if (!val) return "ABC1D23";
  const sanitized = val.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  if (sanitized.length === 0) return "ABC1D23";
  return sanitized.slice(0, 7);
}
