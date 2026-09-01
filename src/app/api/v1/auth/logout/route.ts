/**
 * @file route.ts
 * @description Endpoint de Logout e Encerramento de Sessão (POST /api/v1/auth/logout).
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { isSupabaseServerConfigured } from "@/lib/supabase/server";

/**
 * Extrai o token JWT Bearer do cabeçalho de autorização.
 */
function extractBearerToken(request: NextRequest): string | null {
  const authHeader = request.headers.get("authorization");
  if (!authHeader) return null;

  const parts = authHeader.split(" ");
  if (parts.length === 2 && parts[0].toLowerCase() === "bearer" && parts[1].trim()) {
    return parts[1].trim();
  }

  return null;
}

/**
 * @swagger
 * /api/v1/auth/logout:
 *   post:
 *     summary: Encerramento de sessão (Logout)
 *     description: Invalida o token JWT de acesso e encerra a sessão ativa do usuário no Supabase Auth.
 *     tags:
 *       - Auth
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Sessão encerrada com sucesso.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Sessão encerrada com sucesso"
 *       401:
 *         description: Token de autorização JWT ausente ou malformatado.
 *       500:
 *         description: Erro interno no servidor.
 */
export async function POST(request: NextRequest) {
  try {
    const token = extractBearerToken(request);

    if (!token) {
      return NextResponse.json(
        { error: "Token de autorização JWT não fornecido no cabeçalho Authorization (Bearer <token>)." },
        { status: 401 }
      );
    }

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
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });

    // Executa o signOut com o contexto do token
    await supabase.auth.signOut();

    return NextResponse.json(
      { message: "Sessão encerrada com sucesso" },
      { status: 200 }
    );
  } catch (error) {
    console.error("[Logout Error]", error);
    return NextResponse.json(
      { error: "Erro interno no servidor ao processar o logout." },
      { status: 500 }
    );
  }
}
