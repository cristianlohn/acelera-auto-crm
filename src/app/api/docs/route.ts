/**
 * @file route.ts
 * @description Redirecionamento amigável de /api/docs para a página de documentação Swagger UI (/docs).
 */

import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  return NextResponse.redirect(new URL("/docs", request.url));
}
