/**
 * @file api-key.ts
 * @description Schema de validação com Zod para criação e gerenciamento de chaves de API.
 */

import { z } from "zod";

export const createApiKeySchema = z.object({
  name: z
    .string({
      error: "O nome da chave é obrigatório",
    })
    .trim()
    .min(3, "O nome da chave deve ter no mínimo 3 caracteres")
    .max(80, "O nome da chave deve ter no máximo 80 caracteres"),
  expires_in_days: z
    .number()
    .int("O prazo deve ser um número inteiro de dias")
    .positive("O prazo de validade deve ser positivo")
    .optional()
    .nullable(),
});

export type CreateApiKeyInput = z.infer<typeof createApiKeySchema>;
