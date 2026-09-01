/**
 * @file swagger-ui-client.tsx
 * @description Componente cliente para renderizar a interface interativa do Swagger UI com carregamento dinâmico no browser.
 */

"use client";

import React from "react";
import dynamic from "next/dynamic";
import "swagger-ui-react/swagger-ui.css";

interface SwaggerUIProps {
  url?: string;
  spec?: Record<string, unknown>;
}

// Carregamento dinâmico exclusivo no cliente (Browser) para evitar erros de SSR no Swagger UI
const SwaggerUI = dynamic(
  () => import("swagger-ui-react"),
  {
    ssr: false,
    loading: () => (
      <div className="p-12 flex flex-col items-center justify-center space-y-4">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
        <p className="text-sm text-zinc-500 font-medium">Carregando interface do Swagger UI...</p>
      </div>
    ),
  }
);

interface SwaggerUIClientProps {
  url?: string;
  spec?: Record<string, unknown>;
}

export default function SwaggerUIClient({
  url = "/api/doc",
  spec,
}: SwaggerUIClientProps) {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 antialiased p-4 sm:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Cabeçalho Customizado */}
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
          <div>
            <div className="flex items-center gap-3">
              <span className="text-2xl">🚗</span>
              <h1 className="text-2xl font-bold tracking-tight text-white">
                Acelera Auto CRM — API Explorer
              </h1>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-500/10 text-orange-400 border border-orange-500/20">
                OpenAPI 3.0
              </span>
            </div>
            <p className="text-sm text-zinc-400 mt-1">
              Documentação interativa com suporte a autenticação por{" "}
              <code className="text-orange-400 bg-white/5 px-1.5 py-0.5 rounded text-xs font-mono">
                x-api-key
              </code>{" "}
              e{" "}
              <code className="text-orange-400 bg-white/5 px-1.5 py-0.5 rounded text-xs font-mono">
                Bearer JWT
              </code>
              .
            </p>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="/api/doc"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white/5 hover:bg-white/10 text-zinc-200 border border-white/10 transition-colors"
            >
              <span>Visualizar JSON OpenAPI</span>
              <span>↗</span>
            </a>
          </div>
        </header>

        {/* Container do Swagger UI */}
        <div className="rounded-2xl border border-white/10 bg-white p-4 sm:p-6 shadow-2xl overflow-hidden text-zinc-900">
          {spec ? (
            <SwaggerUI spec={spec} />
          ) : (
            <SwaggerUI url={url} />
          )}
        </div>
      </div>
    </div>
  );
}
