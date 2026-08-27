/**
 * @file integration-docs-card.tsx
 * @description Card interativo de documentação técnica com exemplos de cURL, Meta Ads e Webmotors.
 */

"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import {
  Copy,
  Check,
  Terminal,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

const INGESTION_ENDPOINT = "https://aceleraautocrm.com.br/api/v1/leads/ingest";

const CURL_EXAMPLE = `curl -X POST "${INGESTION_ENDPOINT}" \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: SEU_TOKEN_AQUI" \\
  -d '{
    "name": "Carlos Eduardo Silva",
    "phone": "(11) 98765-4321",
    "email": "carlos.silva@email.com",
    "source": "meta_ads",
    "vehicle_of_interest": "Honda Civic Touring 2024",
    "segment": "new_cars",
    "notes": "Cliente interessado em test drive no sábado"
  }'`;

const META_ADS_PAYLOAD = `{
  "name": "{{lead.full_name}}",
  "phone": "{{lead.phone_number}}",
  "email": "{{lead.email}}",
  "source": "meta_ads",
  "vehicle_of_interest": "{{form.vehicle_model}}",
  "segment": "new_cars"
}`;

const WEBMOTORS_PAYLOAD = `{
  "name": "{{prospect.nome}}",
  "phone": "{{prospect.telefone}}",
  "email": "{{prospect.email}}",
  "source": "webmotors",
  "vehicle_of_interest": "{{veiculo.marca}} {{veiculo.modelo}}",
  "segment": "used_cars"
}`;

export function IntegrationDocsCard() {
  const [activeTab, setActiveTab] = useState<"curl" | "meta" | "webmotors">("curl");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (text: string, label: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).catch(() => {});
    }
    setCopiedKey(label);
    toast.success(`${label} copiado para a área de transferência!`);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  return (
    <div className="rounded-3xl bg-zinc-900/80 border border-white/10 p-6 backdrop-blur-md shadow-xl space-y-6">
      {/* Header do Guia de Integração */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-orange-400 uppercase tracking-wider mb-1">
            <Terminal className="h-4 w-4" />
            <span>Guia Rápido de Integração</span>
          </div>
          <h3 className="text-lg font-black text-white tracking-tight">
            Endpoint Universal de Ingestão de Leads
          </h3>
          <p className="text-xs text-zinc-400 mt-0.5">
            Conecte suas campanhas do Meta Ads, portais automotivos e formulários externos via webhook HTTP seguro.
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 text-xs text-emerald-400">
          <ShieldCheck className="h-4 w-4 shrink-0" />
          <span className="font-semibold">Criptografia SHA-256</span>
        </div>
      </div>

      {/* URL de Ingestão com Botão de Cópia */}
      <div className="rounded-2xl bg-zinc-950/80 border border-white/10 p-3.5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0 font-mono text-xs text-zinc-300">
          <span className="rounded-lg bg-orange-500/20 text-orange-400 font-bold px-2 py-0.5 text-[11px]">
            POST
          </span>
          <span className="truncate text-white font-medium" data-testid="text-ingest-url">
            {INGESTION_ENDPOINT}
          </span>
        </div>

        <button
          onClick={() => handleCopy(INGESTION_ENDPOINT, "Endpoint de Ingestão")}
          data-testid="btn-copy-endpoint-url"
          className="flex items-center justify-center gap-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:text-white transition-all shrink-0"
        >
          {copiedKey === "Endpoint de Ingestão" ? (
            <>
              <Check className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-emerald-400">Copiado!</span>
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              <span>Copiar URL</span>
            </>
          )}
        </button>
      </div>

      {/* Abas de Exemplos de Código */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 border-b border-white/10 pb-2">
          <button
            onClick={() => setActiveTab("curl")}
            data-testid="tab-curl-docs"
            className={cn(
              "rounded-xl px-3 py-1.5 text-xs font-semibold transition-all",
              activeTab === "curl"
                ? "bg-orange-500/20 text-orange-400 border border-orange-500/30"
                : "text-zinc-400 hover:text-white hover:bg-white/5"
            )}
          >
            cURL / Bash
          </button>
          <button
            onClick={() => setActiveTab("meta")}
            data-testid="tab-meta-docs"
            className={cn(
              "rounded-xl px-3 py-1.5 text-xs font-semibold transition-all",
              activeTab === "meta"
                ? "bg-pink-500/20 text-pink-400 border border-pink-500/30"
                : "text-zinc-400 hover:text-white hover:bg-white/5"
            )}
          >
            Meta Ads (Zapier / Webhook)
          </button>
          <button
            onClick={() => setActiveTab("webmotors")}
            data-testid="tab-webmotors-docs"
            className={cn(
              "rounded-xl px-3 py-1.5 text-xs font-semibold transition-all",
              activeTab === "webmotors"
                ? "bg-red-500/20 text-red-400 border border-red-500/30"
                : "text-zinc-400 hover:text-white hover:bg-white/5"
            )}
          >
            Webmotors Pro
          </button>
        </div>

        {/* Bloco de Código com Syntax Highlighting Escuro */}
        <div className="relative rounded-2xl bg-zinc-950 border border-white/10 p-4 font-mono text-xs text-zinc-300 overflow-x-auto">
          <button
            onClick={() =>
              handleCopy(
                activeTab === "curl"
                  ? CURL_EXAMPLE
                  : activeTab === "meta"
                  ? META_ADS_PAYLOAD
                  : WEBMOTORS_PAYLOAD,
                activeTab === "curl" ? "Comando cURL" : "Payload JSON"
              )
            }
            data-testid="btn-copy-code-snippet"
            title="Copiar código"
            className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 hover:bg-white/15 text-zinc-400 hover:text-white transition-all"
          >
            {copiedKey ? (
              <Check className="h-3.5 w-3.5 text-emerald-400" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </button>

          <pre className="pr-10 leading-relaxed">
            {activeTab === "curl" && CURL_EXAMPLE}
            {activeTab === "meta" && META_ADS_PAYLOAD}
            {activeTab === "webmotors" && WEBMOTORS_PAYLOAD}
          </pre>
        </div>
      </div>
    </div>
  );
}
