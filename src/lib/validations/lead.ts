/**
 * @file lead.ts
 * @description Schemas de validação Zod para ingestão externa de leads (API v1).
 */

import { z } from "zod";
import { sanitizeWhatsAppPhone } from "@/lib/services/whatsapp/client";

/**
 * Validador e normalizador de telefone para padrão E.164 brasileiro (+55...)
 */
const phoneSchema = z
  .string()
  .trim()
  .min(1, "O telefone é obrigatório")
  .refine(
    (val) => {
      const digits = val.replace(/\D/g, "");
      // Aceita telefone brasileiro com DDD: 10 dígitos (fixo) ou 11 dígitos (celular)
      // Ou com DDI 55: 12 ou 13 dígitos
      return digits.length >= 10 && digits.length <= 13;
    },
    { message: "Número de telefone ou WhatsApp brasileiro inválido (informe DDD + número)" }
  )
  .transform((val) => {
    const sanitized = sanitizeWhatsAppPhone(val);
    return sanitized.startsWith("+") ? sanitized : `+${sanitized}`;
  });

/**
 * Validador de email tolerante a campos vazios ou nulos
 */
const emailOptionalSchema = z
  .string()
  .trim()
  .email("Formato de e-mail inválido")
  .optional()
  .or(z.literal("").transform(() => undefined))
  .or(z.null().transform(() => undefined));

const segmentSchema = z.preprocess(
  (val) => {
    if (typeof val === "string") {
      const lower = val.toLowerCase().trim();
      if (
        lower === "seminovos" ||
        lower === "usados" ||
        lower === "used" ||
        lower === "used_cars"
      ) {
        return "used_cars";
      }
      if (
        lower === "novos" ||
        lower === "zero_km" ||
        lower === "0km" ||
        lower === "new" ||
        lower === "new_cars"
      ) {
        return "new_cars";
      }
      if (lower === "f&i" || lower === "financiamento" || lower === "f_and_i") {
        return "f_and_i";
      }
      if (lower === "geral" || lower === "todos" || lower === "all") {
        return "all";
      }
    }
    return val;
  },
  z.enum(["new_cars", "used_cars", "f_and_i", "all"]).default("all")
);

/**
 * Schema principal de validação de payload para ingestão externa (/api/v1/leads e /api/v1/leads/ingest)
 */
export const leadIngestSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "O nome deve ter no mínimo 2 caracteres"),
  phone: phoneSchema,
  email: emailOptionalSchema,
  source: z
    .enum([
      "meta_ads",
      "webmotors",
      "icarros",
      "olx",
      "landing_page",
      "google_ads",
      "other",
    ])
    .default("other"),
  segment: segmentSchema,
  vehicle_of_interest: z.string().trim().optional().or(z.null().transform(() => undefined)),
  notes: z.string().trim().optional().or(z.null().transform(() => undefined)),
  utm_source: z.string().trim().optional().or(z.null().transform(() => undefined)),
  utm_medium: z.string().trim().optional().or(z.null().transform(() => undefined)),
  utm_campaign: z.string().trim().optional().or(z.null().transform(() => undefined)),
});

export type LeadIngestInput = z.input<typeof leadIngestSchema>;
export type LeadIngestOutput = z.infer<typeof leadIngestSchema>;
