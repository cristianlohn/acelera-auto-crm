/**
 * @file route.ts
 * @description Endpoint de Login de Usuários (POST /api/v1/auth/login).
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { loginSchema } from "@/lib/validations/auth";

/**
 * @swagger
 * /api/v1/auth/login:
 *   post:
 *     summary: Autenticação de usuário por e-mail e senha
 *     description: Realiza o login do usuário no Acelera Auto CRM e retorna os tokens JWT de acesso (access_token) e renovação (refresh_token).
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: usuario@concessionaria.com.br
 *               password:
 *                 type: string
 *                 format: password
 *                 example: "senha_exemplo_123"
 *     responses:
 *       200:
 *         description: Autenticação realizada com sucesso.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 access_token:
 *                   type: string
 *                   description: Token JWT de autenticação para o cabeçalho Authorization Bearer.
 *                   example: "sample_jwt_access_token_example"
 *                 refresh_token:
 *                   type: string
 *                   description: Token utilizado para renovação da sessão.
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
 *         description: Payload incompleto ou formato de dados inválido.
 *       401:
 *         description: Credenciais incorretas ou usuário não autorizado.
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

    const validation = loginSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Dados de login inválidos.",
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { email, password } = validation.data;

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

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.session || !data.user) {
      return NextResponse.json(
        {
          error: "Credenciais inválidas.",
          detail: error?.message || "E-mail ou senha incorretos.",
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
          email: data.user.email || email,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[Login Route Error]", error);
    return NextResponse.json(
      { error: "Erro interno no servidor ao processar o login." },
      { status: 500 }
    );
  }
}
