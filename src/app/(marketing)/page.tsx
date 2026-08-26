/**
 * @file page.tsx
 * @description Website Institucional e Landing Page de Alta Conversão (MarketingPage).
 *
 * Otimizada com arquitetura 100% Mobile-First e Zero Horizontal Overflow.
 *
 * Seções:
 * 1. Hero Section de Alta Conversão com Mockup Interativo do Funil.
 * 2. Prova Social e Barra de Métricas (Stats Bar).
 * 3. Bento Grid com as 4 Principais Funcionalidades Comerciais.
 * 4. Calculadora Interativa de Ganho Comercial e ROI de Atendimento.
 * 5. Tabela Transparente de Planos e Preços (Pricing).
 * 6. Bottom Call to Action (CTA) para o Ambiente Demo.
 */

"use client";

import Link from "next/link";
import {
  Zap,
  ArrowRight,
  MessageCircle,
  LayoutDashboard,
  Car,
  BarChart3,
  TrendingUp,
  Clock,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Hero } from "@/components/landing/Hero";
import { ROISection } from "@/components/landing/ROISection";
import { PricingSection } from "@/components/landing/PricingSection";

export default function MarketingPage() {
  return (
    <div className="relative w-full max-w-full overflow-x-hidden">
      {/* Elementos de Iluminação / Background Glow */}
      <div
        className="pointer-events-none absolute -top-40 left-1/2 -z-10 h-[500px] w-[90vw] max-w-[700px] -translate-x-1/2 rounded-full bg-gradient-to-tr from-orange-600/20 via-red-600/15 to-transparent blur-[120px]"
        aria-hidden="true"
      />

      {/* ------------------------------------------------------------------ */}
      {/* 1. Hero Section de Alta Conversão                                  */}
      {/* ------------------------------------------------------------------ */}
      <Hero />

      {/* ------------------------------------------------------------------ */}
      {/* 2. Prova Social & Stats Bar                                        */}
      {/* ------------------------------------------------------------------ */}
      <section className="border-y border-white/10 bg-[#0c0c10] py-8 sm:py-10 w-full max-w-full overflow-hidden">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-4 sm:gap-6 text-center md:grid-cols-4">
            <div className="p-1 sm:p-2">
              <p className="text-xl sm:text-3xl font-extrabold text-white tracking-tight">
                +R$ 1.8M
              </p>
              <p className="mt-0.5 sm:mt-1 text-[11px] sm:text-xs font-medium text-zinc-400">
                em veículos geridos
              </p>
            </div>
            <div className="p-1 sm:p-2">
              <p className="text-xl sm:text-3xl font-extrabold text-orange-400 tracking-tight">
                18 min
              </p>
              <p className="mt-0.5 sm:mt-1 text-[11px] sm:text-xs font-medium text-zinc-400">
                de SLA médio de resposta
              </p>
            </div>
            <div className="p-1 sm:p-2">
              <p className="text-xl sm:text-3xl font-extrabold text-emerald-400 tracking-tight">
                100%
              </p>
              <p className="mt-0.5 sm:mt-1 text-[11px] sm:text-xs font-medium text-zinc-400">
                em Nuvem com RLS
              </p>
            </div>
            <div className="p-1 sm:p-2">
              <p className="text-xl sm:text-3xl font-extrabold text-white tracking-tight">
                Zero
              </p>
              <p className="mt-0.5 sm:mt-1 text-[11px] sm:text-xs font-medium text-zinc-400">
                instalação necessária
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* 3. Bento Grid de Funcionalidades Principais                        */}
      {/* ------------------------------------------------------------------ */}
      <section id="recursos" className="py-16 sm:py-28 w-full max-w-full overflow-hidden">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-xs font-bold uppercase tracking-widest text-orange-400">
              Recursos de Alta Performance
            </h2>
            <p className="mt-2 text-xl sm:text-3xl md:text-4xl font-extrabold text-white tracking-tight">
              Tudo o que sua equipe precisa para vender mais carros
            </p>
            <p className="mt-2 sm:mt-3 text-xs sm:text-sm text-zinc-400">
              Desenvolvido com foco total na velocidade do atendimento móvel e no controle do estoque.
            </p>
          </div>

          <div className="mt-10 sm:mt-12 grid grid-cols-1 gap-5 sm:gap-6 md:grid-cols-2">
            {/* Card 1: Funil Kanban Visual com SLA */}
            <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#121216] p-5 sm:p-7 shadow-lg transition-all hover:border-orange-500/40">
              <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl bg-orange-500/10 text-orange-400">
                <LayoutDashboard className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <h3 className="mt-3.5 sm:mt-4 text-base sm:text-lg font-bold text-white">
                Funil Kanban Visual com SLA de Atendimento
              </h3>
              <p className="mt-2 text-xs sm:text-sm text-zinc-400 leading-relaxed">
                Acompanhe o lead desde o primeiro contato até o fechamento com semáforo visual de urgência. Alertas visuais e temporizadores automáticos impedem que leads esfriem sem resposta.
              </p>
              <div className="mt-3.5 sm:mt-4 inline-flex items-center gap-2 text-xs font-semibold text-orange-400">
                <Clock className="h-4 w-4 shrink-0" />
                <span>Monitoramento ativo de tempo de resposta</span>
              </div>
            </div>

            {/* Card 2: Gestão Inteligente de Pátio e Estoque */}
            <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#121216] p-5 sm:p-7 shadow-lg transition-all hover:border-orange-500/40">
              <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
                <Car className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <h3 className="mt-3.5 sm:mt-4 text-base sm:text-lg font-bold text-white">
                Gestão Inteligente de Pátio e Estoque
              </h3>
              <p className="mt-2 text-xs sm:text-sm text-zinc-400 leading-relaxed">
                Catálogo digital instantâneo com fotos, versão, ano, placa, quilometragem e cópia rápida de ficha técnica formatada com emojis para envio no WhatsApp com 1 clique.
              </p>
              <div className="mt-3.5 sm:mt-4 inline-flex items-center gap-2 text-xs font-semibold text-emerald-400">
                <Sparkles className="h-4 w-4 shrink-0" />
                <span>Cópia de ficha técnica com 1 toque</span>
              </div>
            </div>

            {/* Card 3: Botão de Ação Imediata WhatsApp */}
            <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#121216] p-5 sm:p-7 shadow-lg transition-all hover:border-orange-500/40">
              <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl bg-green-500/10 text-green-400">
                <MessageCircle className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <h3 className="mt-3.5 sm:mt-4 text-base sm:text-lg font-bold text-white">
                Botão de Ação Imediata WhatsApp
              </h3>
              <p className="mt-2 text-xs sm:text-sm text-zinc-400 leading-relaxed">
                Inicie conversas no WhatsApp sem precisar salvar o contato na agenda do celular. Mensagens personalizadas com o nome do cliente e veículo de interesse pré-formatadas.
              </p>
              <div className="mt-3.5 sm:mt-4 inline-flex items-center gap-2 text-xs font-semibold text-green-400">
                <Zap className="h-4 w-4 shrink-0" />
                <span>Deep link instantâneo com DDI 55 automático</span>
              </div>
            </div>

            {/* Card 4: Relatórios Executivos e Métricas */}
            <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#121216] p-5 sm:p-7 shadow-lg transition-all hover:border-orange-500/40">
              <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl bg-violet-500/10 text-violet-400">
                <BarChart3 className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <h3 className="mt-3.5 sm:mt-4 text-base sm:text-lg font-bold text-white">
                Relatórios Executivos e Métricas em Tempo Real
              </h3>
              <p className="mt-2 text-xs sm:text-sm text-zinc-400 leading-relaxed">
                Painel gerencial completo com taxa de conversão por etapa de funil, eficiência de canais (Instagram, OLX, WebMotors, WhatsApp) e ranking de performance da equipe de vendas.
              </p>
              <div className="mt-3.5 sm:mt-4 inline-flex items-center gap-2 text-xs font-semibold text-violet-400">
                <TrendingUp className="h-4 w-4 shrink-0" />
                <span>Análise de ROI por canal de atração</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* 4. Calculadora Interativa de Ganho Comercial (ROI)                 */}
      {/* ------------------------------------------------------------------ */}
      <ROISection />

      {/* ------------------------------------------------------------------ */}
      {/* 5. Tabela Transparente de Planos e Preços (Pricing)                 */}
      {/* ------------------------------------------------------------------ */}
      <PricingSection />

      {/* ------------------------------------------------------------------ */}
      {/* 6. Seção de Chamada Final (Bottom CTA)                             */}
      {/* ------------------------------------------------------------------ */}
      <section className="py-14 sm:py-24 w-full max-w-full overflow-hidden">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-3xl border border-orange-500/30 bg-gradient-to-r from-orange-600/30 via-red-600/20 to-black p-6 sm:p-12 text-center shadow-2xl">
            <h2 className="text-xl sm:text-3xl md:text-4xl font-extrabold text-white tracking-tight break-words">
              Pronto para transformar o atendimento da sua revenda?
            </h2>
            <p className="mt-2.5 sm:mt-3 text-xs sm:text-sm text-zinc-300 max-w-xl mx-auto">
              Não acredite em uma apresentação. Entre e use. Explore uma revenda fictícia e veja o Acelera funcionando como se fosse sua loja.
            </p>

            <div className="mt-6 sm:mt-8 flex justify-center">
              <Link href="/leads" className="w-full sm:w-auto">
                <Button
                  size="lg"
                  className="w-full sm:w-auto gap-2 bg-white px-6 py-5 sm:px-8 sm:py-6 text-xs sm:text-sm font-bold text-black shadow-xl hover:bg-zinc-100 transition-all hover:scale-105"
                >
                  <span>Acessar Demonstração Agora</span>
                  <ArrowRight className="h-4 w-4 text-orange-600 shrink-0" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

