/**
 * @file crm.ts
 * @description Schemas de validação Zod para os módulos operacionais de domínio do CRM (Leads, Veículos, Roleta e Chaves de API).
 */

import { z } from "zod";
import { webhookPhoneSchema, webhookEmailSchema } from "@/lib/validations/webhook";

/**
 * Schema de query params para listagem paginada de leads (/api/v1/leads)
 */
export const leadQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  status: z
    .enum(["novo", "atendimento", "visita", "proposta", "fechado", "all"])
    .optional()
    .default("all"),
  origin: z.string().trim().optional(),
  assigned_to: z.string().trim().optional(),
  search: z.string().trim().optional(),
});

export type LeadQueryInput = z.infer<typeof leadQuerySchema>;

/**
 * Schema para criação manual de Lead no CRM (/api/v1/leads)
 */
export const createCrmLeadSchema = z.object({
  name: z.string().trim().min(2, "O nome deve ter no mínimo 2 caracteres."),
  phone: webhookPhoneSchema,
  email: webhookEmailSchema,
  vehicle_interest: z.string().trim().optional().default("Interesse Geral"),
  origin: z.string().trim().default("patio_balcao"),
  status: z
    .enum(["novo", "atendimento", "visita", "proposta", "fechado"])
    .default("novo"),
  seller_name: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});

export type CreateCrmLeadInput = z.infer<typeof createCrmLeadSchema>;

/**
 * Schema para atualização de dados do Lead (/api/v1/leads/[id])
 */
export const updateCrmLeadSchema = z.object({
  name: z.string().trim().min(2).optional(),
  phone: webhookPhoneSchema.optional(),
  email: webhookEmailSchema,
  vehicle_interest: z.string().trim().optional(),
  status: z
    .enum(["novo", "atendimento", "visita", "proposta", "fechado"])
    .optional(),
  origin: z.string().trim().optional(),
  seller_name: z.string().trim().optional(),
  seller_id: z.string().uuid().optional().or(z.null().transform(() => undefined)),
  notes: z.string().trim().optional(),
});

export type UpdateCrmLeadInput = z.infer<typeof updateCrmLeadSchema>;

/**
 * Schema para atribuição manual de lead para vendedor (/api/v1/distribution/assign)
 */
export const manualAssignSchema = z.object({
  lead_id: z.string().min(1, "O ID do lead é obrigatório."),
  seller_id: z.string().optional(),
  seller_name: z.string().optional(),
  trigger_roleta: z.boolean().optional().default(false),
});

export type ManualAssignInput = z.infer<typeof manualAssignSchema>;

/**
 * Schema para cadastro de veículo no estoque (/api/v1/vehicles)
 */
export const vehicleSchema = z.object({
  make: z.string().trim().min(2, "Marca do veículo é obrigatória."),
  model: z.string().trim().min(1, "Modelo do veículo é obrigatório."),
  version: z.string().trim().optional().default(""),
  year_fab: z.coerce.number().min(1970).max(new Date().getFullYear() + 2),
  year_model: z.coerce.number().min(1970).max(new Date().getFullYear() + 2),
  price: z.coerce.number().min(0, "O preço não pode ser negativo."),
  mileage: z.coerce.number().min(0, "A quilometragem não pode ser negativa."),
  plate_last_digits: z.string().trim().min(1).max(7),
  color: z.string().trim().default("Indefinida"),
  fuel: z
    .enum(["flex", "gasolina", "etanol", "diesel", "hibrido", "eletrico"])
    .default("flex"),
  transmission: z.enum(["automatico", "manual", "cvt"]).default("automatico"),
  status: z.enum(["disponivel", "reservado", "vendido"]).default("disponivel"),
  photo_url: z.string().url().optional().or(z.literal("").transform(() => undefined)),
  notes: z.string().trim().optional(),
});

export type VehicleInput = z.infer<typeof vehicleSchema>;

/**
 * Schema para criação de Chave de API (/api/v1/settings/api-keys)
 */
export const createApiKeyPayloadSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "O nome da chave deve ter no mínimo 2 caracteres.")
    .max(64, "O nome da chave pode ter no máximo 64 caracteres."),
  expires_in_days: z.coerce.number().positive().optional().or(z.null().transform(() => null)),
});

export type CreateApiKeyInput = z.infer<typeof createApiKeyPayloadSchema>;
