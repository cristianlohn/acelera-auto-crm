/**
 * @file page.tsx
 * @description Página Server Component de Documentação Interativa Swagger UI (/docs).
 */

import { Metadata } from "next";
import { notFound } from "next/navigation";
import { isSwaggerEnabled } from "@/lib/swagger";
import SwaggerUIClient from "@/components/docs/swagger-ui-client";

export const metadata: Metadata = {
  title: "API Documentation | Acelera Auto CRM",
  description: "Documentação OpenAPI 3.0 interativa para desenvolvedores e integradores do Acelera Auto CRM.",
};

export default function DocsPage() {
  // 1. Verificação de segurança no servidor (bloqueia em produção sem ENABLE_SWAGGER=true)
  if (!isSwaggerEnabled()) {
    notFound();
  }

  return <SwaggerUIClient url="/api/doc" />;
}
