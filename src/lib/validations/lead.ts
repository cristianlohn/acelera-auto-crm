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

/**
 * Enum Zod canônico correspondente ao ENUM `lead_origin` do banco de dados (PostgreSQL/Supabase).
 */
export const leadOriginEnum = z.enum([
  "whatsapp",
  "instagram",
  "site",
  "indicacao",
  "telefone",
  "olx",
  "icarros",
  "webmotors",
  "indicacao_dono",
  "cliente_carteira",
  "patio_balcao",
]);

export type LeadOriginValue = z.infer<typeof leadOriginEnum>;

/**
 * Normaliza qualquer variação ou abreviação de canal de origem para o enum canônico do banco de dados.
 */
export function normalizeLeadOrigin(source?: string | null): LeadOriginValue {
  if (!source) return "site";
  const s = source.toLowerCase().trim();
  if (s === "patio" || s === "balcao" || s === "patio_balcao") return "patio_balcao";
  if (s === "indicacao_dono" || s === "dono") return "indicacao_dono";
  if (s === "cliente_carteira" || s === "carteira") return "cliente_carteira";
  if (s === "indicacao" || s.includes("indica")) return "indicacao";
  if (s === "webmotors" || s.includes("webmotors")) return "webmotors";
  if (s === "icarros" || s.includes("icarros")) return "icarros";
  if (s === "instagram" || s === "meta_ads" || s.includes("insta") || s.includes("meta") || s.includes("face")) return "instagram";
  if (s === "whatsapp" || s.includes("whats") || s.includes("zap")) return "whatsapp";
  if (s === "olx" || s.includes("olx")) return "olx";
  if (s === "telefone" || s.includes("fone") || s.includes("tel")) return "telefone";
  if (s === "site" || s === "landing_page" || s === "google_ads") return "site";

  const parsed = leadOriginEnum.safeParse(s);
  if (parsed.success) return parsed.data;

  return "site";
}

/**
 * Schema de validação Zod para criação de lead pelo CRM geral
 */
export const createLeadSchema = z.object({
  name: z.string().trim().min(1, "Nome do lead é obrigatório"),
  phone: z.string().trim().min(8, "Telefone deve ter no mínimo 8 dígitos"),
  email: emailOptionalSchema,
  vehicleInterest: z.string().trim().min(1, "Veículo de interesse é obrigatório"),
  status: z.enum(["novo", "atendimento", "visita", "proposta", "fechado"]).optional().default("novo"),
  sellerName: z.string().trim().optional(),
  origin: leadOriginEnum.optional().default("site"),
  notes: z.string().trim().optional().nullable(),
});

/**
 * Schema de validação Zod para criação de lead diretamente no Funil Kanban
 */
export const createKanbanLeadSchema = z.object({
  name: z.string().trim().min(1, "Nome do lead é obrigatório"),
  phone: z.string().trim().min(8, "Telefone deve ter no mínimo 8 dígitos"),
  email: emailOptionalSchema,
  vehicle_of_interest: z.string().trim().min(1, "Veículo de interesse é obrigatório"),
  source: z.string().trim().optional(),
  stage: z.enum([
    "new",
    "in_contact",
    "test_drive",
    "proposal",
    "won",
    "lost",
    "visit_scheduled",
    "proposal_fi",
  ]).optional().default("new"),
  assigned_to_name: z.string().trim().optional(),
  value: z.number().nonnegative().optional(),
  segment: z.enum(["all", "new_cars", "used_cars", "f_and_i"]).optional().default("all"),
  notes: z.string().trim().optional().nullable(),
});

export type LeadIngestInput = z.input<typeof leadIngestSchema>;
export type LeadIngestOutput = z.infer<typeof leadIngestSchema>;
export type CreateLeadSchemaInput = z.input<typeof createLeadSchema>;
export type CreateKanbanLeadSchemaInput = z.input<typeof createKanbanLeadSchema>;
