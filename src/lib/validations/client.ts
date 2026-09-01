/**
 * @file client.ts
 * @description Schemas de validação Zod para a carteira de clientes do CRM.
 */

import { z } from "zod";

export const clientStatusEnum = z.enum(["ativo", "comprador", "inativo"]);

export const saveClientSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2, "Nome deve conter pelo menos 2 caracteres"),
  phone: z.string().trim().min(8, "Telefone inválido"),
  email: z
    .string()
    .trim()
    .email("E-mail inválido")
    .optional()
    .or(z.literal("").transform(() => undefined))
    .or(z.null().transform(() => undefined)),
  document: z
    .string()
    .trim()
    .optional()
    .or(z.literal("").transform(() => undefined))
    .or(z.null().transform(() => undefined)),
  status: clientStatusEnum.optional().default("ativo"),
  sellerName: z.string().trim().optional().default("Roleta Automática"),
  sellerId: z.string().optional().nullable(),
  vehiclePreference: z
    .string()
    .trim()
    .optional()
    .or(z.literal("").transform(() => undefined))
    .or(z.null().transform(() => undefined)),
  totalPurchased: z.number().min(0).optional().default(0),
  purchasesCount: z.number().int().min(0).optional().default(0),
  notes: z
    .string()
    .trim()
    .optional()
    .or(z.literal("").transform(() => undefined))
    .or(z.null().transform(() => undefined)),
});

export type SaveClientInput = z.input<typeof saveClientSchema>;
export type SaveClientOutput = z.output<typeof saveClientSchema>;

export const clientFiltersSchema = z.object({
  search: z.string().optional(),
  status: z.enum(["todos", "ativo", "comprador", "inativo"]).optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(50),
});

export type ClientFilters = z.infer<typeof clientFiltersSchema>;
