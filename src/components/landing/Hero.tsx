/**
 * @file Hero.tsx
 * @description Hero Section de Alta Conversão da Landing Page Institucional.
 *
 * Posicionamento Estratégico:
 * - "O CRM que não deixa sua revenda perder leads por demora no atendimento"
 * - Combate ativo ao lead frio e tempo de resposta lento.
 * - Demonstração interativa imediata: "Não acredite em uma apresentação. Entre e use."
 */

import React from "react";
import Link from "next/link";
import { ArrowRight, Play, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Hero() {
  return (
    <section className="relative w-full max-w-full pt-12 pb-16 sm:pt-24 sm:pb-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center w-full">
        {/* Badge de Posicionamento */}
        <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-orange-500/30 bg-orange-500/10 px-3 py-1 text-[11px] sm:text-xs font-semibold text-orange-400 shadow-sm transition hover:bg-orange-500/20">
          <span className="flex h-2 w-2 rounded-full bg-orange-500 animate-pulse shrink-0" />
          <span className="truncate sm:whitespace-normal">
            ⚡ O CRM que não deixa sua revenda perder leads por demora no atendimento
          </span>
        </div>

        {/* Headline Principal de Alto Impacto Comercial */}
        <h1 className="mt-5 text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-white max-w-4xl mx-auto leading-tight sm:leading-tight break-words">
          O CRM que não deixa sua revenda{" "}
          <span className="bg-gradient-to-r from-orange-400 via-orange-500 to-red-500 bg-clip-text text-transparent">
            perder leads por demora
          </span>{" "}
          no atendimento
        </h1>

        {/* Subheadline com a História Comercial */}
        <p className="mt-4 sm:mt-6 text-xs sm:text-base md:text-lg text-zinc-300 max-w-2xl mx-auto leading-relaxed break-words px-1 font-medium">
          <span className="text-orange-400 font-semibold">Lead entrou</span> → vendedor precisa agir → sistema acompanha → gestor é avisado → oportunidade não fica esquecida.
        </p>

        <p className="mt-2 text-xs sm:text-sm text-zinc-400 max-w-2xl mx-auto leading-relaxed">
          Reduza o tempo de resposta e aumente suas chances de conversão. O Acelera monitora o SLA de cada contato em tempo real e alerta sua equipe antes que uma oportunidade esfrie.
        </p>

        {/* Duplo CTA de Ação Imediata */}
        <div className="mt-7 sm:mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 w-full max-w-md sm:max-w-none mx-auto">
          <Link href="/leads" className="w-full sm:w-auto">
            <Button
              size="lg"
              className="w-full sm:w-auto gap-2 bg-gradient-to-r from-orange-500 via-orange-600 to-red-600 px-5 py-5 sm:px-6 sm:py-6 text-sm sm:text-base font-bold text-white shadow-xl shadow-orange-500/30 hover:from-orange-600 hover:to-red-700 hover:shadow-orange-500/50 transition-all hover:scale-105 active:scale-95"
            >
              <span>Experimentar Demonstração Gratuita</span>
              <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
            </Button>
          </Link>

          <a href="#calculadora" className="w-full sm:w-auto">
            <Button
              variant="outline"
              size="lg"
              className="w-full sm:w-auto gap-2 border-white/15 bg-white/5 px-5 py-5 sm:px-6 sm:py-6 text-sm sm:text-base font-semibold text-zinc-200 hover:bg-white/10 hover:text-white transition"
            >
              <Play className="h-4 w-4 text-orange-400 fill-orange-400 shrink-0" />
              <span>Agendar Tour Guiado</span>
            </Button>
          </a>
        </div>

        {/* Chamada para a Demo Aberta */}
        <div className="mt-4 flex items-center justify-center gap-2 text-xs text-zinc-400">
          <Sparkles className="h-3.5 w-3.5 text-orange-400" />
          <span>Não acredite em uma apresentação. Entre e use como se fosse sua loja.</span>
        </div>

        {/* Mockup Flutuante da Interface */}
        <div
          id="demonstracao"
          className="mt-10 sm:mt-14 relative mx-auto w-full max-w-5xl overflow-hidden rounded-2xl border border-white/10 bg-[#121216] p-3 sm:p-5 shadow-2xl shadow-orange-500/10 ring-1 ring-white/10 text-left"
        >
          <div className="flex items-center justify-between border-b border-white/10 pb-2.5 mb-3 px-1 sm:px-2">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <div className="h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full bg-red-500/80" />
              <div className="h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full bg-yellow-500/80" />
              <div className="h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full bg-green-500/80" />
              <span className="ml-1 sm:ml-2 text-[11px] sm:text-xs font-mono text-zinc-400 truncate max-w-[140px] sm:max-w-none">
                acelera-auto-crm.app/leads
              </span>
            </div>
            <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-2 py-0.5 rounded-md shrink-0">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Em Tempo Real
            </span>
          </div>

          {/* Visual Mini Kanban Mock */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Coluna 1: Novo Lead */}
            <div className="rounded-xl border border-white/5 bg-zinc-900/60 p-3">
              <div className="flex items-center justify-between pb-2 border-b border-white/5 text-xs font-bold text-zinc-200">
                <span>Novo Lead (WhatsApp)</span>
                <span className="rounded bg-orange-500/20 text-orange-400 px-1.5 py-0.5 text-[10px]">
                  3 novos
                </span>
              </div>
              <div className="mt-2.5 space-y-2">
                <div className="rounded-lg border border-white/5 bg-black/40 p-2.5">
                  <p className="text-xs font-semibold text-white">Carlos Mendonça</p>
                  <p className="text-[11px] text-zinc-400">Honda Civic EXL 2023</p>
                  <div className="mt-2 flex items-center justify-between text-[10px]">
                    <span className="text-emerald-400 font-medium">🟢 há 12 min</span>
                    <span className="text-zinc-400">Rafael Alves</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Coluna 2: Em Atendimento */}
            <div className="rounded-xl border border-white/5 bg-zinc-900/60 p-3">
              <div className="flex items-center justify-between pb-2 border-b border-white/5 text-xs font-bold text-zinc-200">
                <span>Visita / Test-Drive</span>
                <span className="rounded bg-blue-500/20 text-blue-400 px-1.5 py-0.5 text-[10px]">
                  2 hoje
                </span>
              </div>
              <div className="mt-2.5 space-y-2">
                <div className="rounded-lg border border-white/5 bg-black/40 p-2.5">
                  <p className="text-xs font-semibold text-white">Mariana Souza</p>
                  <p className="text-[11px] text-zinc-400">Toyota Corolla Cross XRE</p>
                  <div className="mt-2 flex items-center justify-between text-[10px]">
                    <span className="text-blue-400 font-medium">Sábado às 10h</span>
                    <span className="text-zinc-400">Juliana Costa</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Coluna 3: Venda Fechada */}
            <div className="rounded-xl border border-white/5 bg-zinc-900/60 p-3">
              <div className="flex items-center justify-between pb-2 border-b border-white/5 text-xs font-bold text-zinc-200">
                <span>Venda Concluída</span>
                <span className="rounded bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 text-[10px]">
                  R$ 1.8M
                </span>
              </div>
              <div className="mt-2.5 space-y-2">
                <div className="rounded-lg border border-emerald-500/20 bg-emerald-950/20 p-2.5">
                  <p className="text-xs font-semibold text-white">Roberto Silveira</p>
                  <p className="text-[11px] text-emerald-300">Jeep Compass Limited 4x4</p>
                  <div className="mt-2 flex items-center justify-between text-[10px]">
                    <span className="text-emerald-400 font-bold">R$ 219.900</span>
                    <span className="text-zinc-400">Rafael Alves</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
