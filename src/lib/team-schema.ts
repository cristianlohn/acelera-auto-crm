/**
 * @file team-schema.ts
 * @description Schema de validação Zod e tipagens para cadastro de vendedores e equipe.
 */

import { z } from "zod";
import { sanitizeWhatsAppPhone } from "@/lib/services/whatsapp/client";

export const salespersonSchema = z.object({
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
  segment: z.enum(["new_cars", "used_cars", "all"]).default("all"),
  in_roulette: z.boolean().default(true),
  monthly_goal_units: z.coerce.number().min(0, "A meta mensal deve ser maior ou igual a 0").default(0).optional(),
});

export type SalespersonInput = z.input<typeof salespersonSchema>;
export type SalespersonOutput = z.output<typeof salespersonSchema>;

export interface SalespersonMember {
  id: string;
  organizationId: string;
  name: string;
  email: string;
  phone: string;
  role: "seller" | "sdr" | "manager";
  segment: "new_cars" | "used_cars" | "all";
  inRoulette: boolean;
  monthlyGoalUnits: number;
  createdAt: string;
}

export interface CreateSalespersonResult {
  success: boolean;
  member?: SalespersonMember;
  error?: string;
}
