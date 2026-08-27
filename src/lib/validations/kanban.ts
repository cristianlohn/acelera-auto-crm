/**
 * @file kanban.ts
 * @description Schemas de validação Zod para o Quadro Kanban de Leads.
 */

import { z } from "zod";

export const leadStageEnum = z.enum([
  "new",
  "in_contact",
  "test_drive",
  "proposal",
  "won",
  "lost",
  "visit_scheduled",
  "proposal_fi",
]);

export const updateLeadStageSchema = z
  .object({
    lead_id: z.string().min(1, "ID do lead é obrigatório"),
    stage: leadStageEnum,
    lost_reason: z.string().optional().nullable(),
  })
  .refine(
    (data) => {
      if (data.stage === "lost") {
        return !!data.lost_reason && data.lost_reason.trim().length >= 3;
      }
      return true;
    },
    {
      message: "O motivo de descarte é obrigatório ao marcar o lead como perdido.",
      path: ["lost_reason"],
    }
  );

export type UpdateLeadStageInput = z.infer<typeof updateLeadStageSchema>;

export const LOST_REASON_OPTIONS = [
  "Comprou na concorrência",
  "Preço/Sem margem",
  "Financiamento reprovado",
  "Desistiu da compra",
  "Sem resposta / Contato inválido",
  "Outro motivo",
] as const;
