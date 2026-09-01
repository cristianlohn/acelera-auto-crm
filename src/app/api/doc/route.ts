/**
 * @file route.ts
 * @description Endpoint que serve a especificação OpenAPI 3.0 em formato JSON (GET /api/doc).
 */

import { NextResponse } from "next/server";
import { getApiDocs, isSwaggerEnabled } from "@/lib/swagger";

export async function GET() {
  // 1. Verificação de segurança de ambiente
  if (!isSwaggerEnabled()) {
    return NextResponse.json(
      {
        error: "Documentação da API desabilitada neste ambiente.",
        hint: "Defina ENABLE_SWAGGER=true nas variáveis de ambiente para habilitar.",
      },
      { status: 404 }
    );
  }

  try {
    const spec = getApiDocs();

    return NextResponse.json(spec, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control":
          process.env.NODE_ENV === "production"
            ? "public, max-age=3600, stale-while-revalidate=86400"
            : "no-store, no-cache, must-revalidate",
      },
    });
  } catch (error) {
    console.error("[OpenAPI Spec Error]", error);
    return NextResponse.json(
      { error: "Erro interno ao gerar a especificação OpenAPI." },
      { status: 500 }
    );
  }
}
