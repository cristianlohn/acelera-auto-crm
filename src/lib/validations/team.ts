/**
 * @file team.ts
 * @description Schemas de validação Zod para cadastro e atualização de vendedores e membros de equipe.
 */

import { z } from "zod";
import { sanitizeWhatsAppPhone } from "@/lib/services/whatsapp/client";

export const salespersonFormSchema = z.object({
  name: z.string().trim().min(3, "O nome deve ter no mínimo 3 caracteres"),
  email: z.string().trim().email("Formato de e-mail inválido"),
  phone: z
    .string()
    .trim()
    .refine(
      (val) => {
        const digits = val.replace(/\D/g, "");
        return digits.length >= 10 && digits.length <= 13;
      },
      { message: "Número de telefone ou WhatsApp brasileiro inválido (informe DDD + número)" }
    )
    .transform((val) => {
      const sanitized = sanitizeWhatsAppPhone(val);
      return sanitized.startsWith("+") ? sanitized : `+${sanitized}`;
    }),
  role: z.enum(["seller", "sdr", "manager"]).default("seller"),
  segment: z.enum(["new_cars", "used_cars", "f_and_i", "all"]).default("all"),
  in_roulette: z.boolean().default(true),
  status: z.enum(["active", "paused", "vacation"]).default("active"),
  monthly_goal_units: z.coerce.number().min(1, "A meta mensal deve ser de no mínimo 1 veículo").default(10),
});

export const updateSalespersonSchema = salespersonFormSchema.partial();

export type SalespersonFormData = z.infer<typeof salespersonFormSchema>;
export type UpdateSalespersonFormData = z.infer<typeof updateSalespersonSchema>;
