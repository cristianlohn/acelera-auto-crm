/**
 * @file auth.ts
 * @description Schemas de validação Zod para autenticação e gestão de tokens da API v1.
 */

import { z } from "zod";

/**
 * Schema de validação para login de usuário por e-mail e senha.
 */
export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "O campo 'email' é obrigatório.")
    .email("Formato de e-mail inválido."),
  password: z
    .string()
    .min(1, "O campo 'password' é obrigatório."),
});

export type LoginInput = z.infer<typeof loginSchema>;

/**
 * Schema de validação para renovação de sessão via refresh_token.
 */
export const refreshTokenSchema = z.object({
  refresh_token: z
    .string()
    .trim()
    .min(1, "O campo 'refresh_token' é obrigatório."),
});

export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
