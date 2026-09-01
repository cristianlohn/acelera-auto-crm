/**
 * @file webhook.ts
 * @description Schemas de validação Zod para Webhooks de Ingestão de Leads e Portais Automotivos.
 */

import { z } from "zod";

/**
 * Sanitizador e validador de número de telefone/WhatsApp brasileiro
 */
export const webhookPhoneSchema = z
  .string()
  .trim()
  .min(1, "O campo 'phone' é obrigatório.")
  .refine(
    (val) => {
      const digits = val.replace(/\D/g, "");
      // Aceita telefone BR: DDD (2) + 8 ou 9 dígitos (total 10 ou 11) ou com DDI 55 (12 ou 13 dígitos)
      return digits.length >= 10 && digits.length <= 13;
    },
    { message: "Número de telefone ou WhatsApp inválido. Forneça DDD + número (ex: 11987654321)." }
  )
  .transform((val) => {
    const digits = val.replace(/\D/g, "");
    return digits;
  });

/**
 * Validador de email opcional
 */
export const webhookEmailSchema = z
  .string()
  .trim()
  .email("Formato de e-mail inválido.")
  .optional()
  .or(z.literal("").transform(() => undefined))
  .or(z.null().transform(() => undefined));

/**
 * Schema principal para ingestão genérica de leads via Webhook (/api/v1/webhooks/leads)
 */
export const leadIngestionSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "O campo 'name' deve ter no mínimo 2 caracteres."),
  phone: webhookPhoneSchema,
  email: webhookEmailSchema,
  vehicle_interest: z
    .string()
    .trim()
    .optional()
    .or(z.null().transform(() => undefined)),
  origin: z
    .string()
    .trim()
    .default("site"),
  notes: z
    .string()
    .trim()
    .optional()
    .or(z.null().transform(() => undefined)),
  seller_name: z
    .string()
    .trim()
    .optional()
    .or(z.null().transform(() => undefined)),
  custom_fields: z
    .record(z.string(), z.unknown())
    .optional()
    .or(z.null().transform(() => undefined)),
});

export type LeadIngestionInput = z.infer<typeof leadIngestionSchema>;

/**
 * Schema para validação do payload do Webhook do Meta Lead Ads (Facebook / Instagram)
 */
export const metaWebhookPayloadSchema = z.object({
  object: z.string().default("page"),
  entry: z.array(
    z.object({
      id: z.string(),
      time: z.number().optional(),
      changes: z.array(
        z.object({
          field: z.string(),
          value: z.object({
            leadgen_id: z.string().optional(),
            page_id: z.string().optional(),
            form_id: z.string().optional(),
            ad_id: z.string().optional(),
            created_time: z.number().optional(),
            // Suporte a dados diretos quando pré-processados
            name: z.string().optional(),
            phone: z.string().optional(),
            email: z.string().optional(),
            vehicle: z.string().optional(),
          }),
        })
      ),
    })
  ),
});

export type MetaWebhookPayload = z.infer<typeof metaWebhookPayloadSchema>;

/**
 * Schema para validação do payload de Proposta / Lead da Webmotors
 */
export const webmotorsLeadSchema = z.object({
  leadId: z.string().optional(),
  nome: z.string().trim().min(2, "Nome do proponente na Webmotors é obrigatório."),
  telefone: webhookPhoneSchema,
  email: webhookEmailSchema,
  veiculo: z
    .object({
      marca: z.string().optional(),
      modelo: z.string().optional(),
      versao: z.string().optional(),
      anoFabricacao: z.number().optional(),
      anoModelo: z.number().optional(),
      preco: z.number().optional(),
      placa: z.string().optional(),
    })
    .optional(),
  proposta: z
    .object({
      valor: z.number().optional(),
      mensagem: z.string().optional(),
      possuiTroca: z.boolean().optional(),
      veiculoTroca: z.string().optional(),
    })
    .optional(),
  custom_fields: z.record(z.string(), z.unknown()).optional(),
});

export type WebmotorsLeadInput = z.infer<typeof webmotorsLeadSchema>;
