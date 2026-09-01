/**
 * @file route.ts
 * @description Endpoint de Renovação de Sessão (POST /api/v1/auth/refresh).
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { refreshTokenSchema } from "@/lib/validations/auth";

/**
 * @swagger
 * /api/v1/auth/refresh:
 *   post:
 *     summary: Renovação de sessão de autenticação (Refresh Token)
 *     description: Emite um novo par de tokens JWT (access_token e refresh_token) utilizando um refresh_token válido.
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refresh_token
 *             properties:
 *               refresh_token:
 *                 type: string
 *                 description: Token de renovação de sessão previamente obtido no login.
 *                 example: "refresh_token_example_0000000000000000"
 *     responses:
 *       200:
 *         description: Sessão renovada com sucesso.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 access_token:
 *                   type: string
 *                   example: "sample_jwt_access_token_example"
 *                 refresh_token:
 *                   type: string
 *                   example: "refresh_token_example_0000000000000000"
 *                 token_type:
 *                   type: string
 *                   example: Bearer
 *                 expires_in:
 *                   type: integer
 *                   example: 3600
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                       example: "00000000-0000-0000-0000-000000000000"
 *                     email:
 *                       type: string
 *                       example: "usuario@concessionaria.com.br"
 *       400:
 *         description: Parâmetro refresh_token ausente ou malformatado.
 *       401:
 *         description: Refresh token expirado ou inválido.
 *       500:
 *         description: Erro interno no servidor.
 */
export async function POST(request: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Bad Request: JSON malformatado ou corpo da requisição ausente." },
        { status: 400 }
      );
    }

    const validation = refreshTokenSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Dados de refresh inválidos.",
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { refresh_token } = validation.data;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { error: "Configuração do Supabase ausente nas variáveis de ambiente" },
        { status: 500 }
      );
    }

    const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { data, error } = await supabase.auth.refreshSession({
      refresh_token,
    });

    if (error || !data.session || !data.user) {
      return NextResponse.json(
        {
          error: "Sessão expirada ou inválida.",
          detail: error?.message || "O refresh_token informado não é válido.",
        },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        token_type: "Bearer",
        expires_in: data.session.expires_in,
        user: {
          id: data.user.id,
          email: data.user.email || "",
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[Refresh Token Error]", error);
    return NextResponse.json(
      { error: "Erro interno no servidor ao renovar a sessão." },
      { status: 500 }
    );
  }
}
