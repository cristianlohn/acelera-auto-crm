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

import { useState } from "react";
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
  Play,
  Calculator,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/mock-data";
import { PricingSection } from "@/components/landing/PricingSection";

export default function MarketingPage() {
  // Estado da calculadora interativa de ROI
  const [monthlyLeads, setMonthlyLeads] = useState<number>(200);

  // Cálculos dinâmicos da calculadora
  // Taxa base de conversão lenta (6h+): ~4%
  // Taxa com SLA rápido (15min): ~12% (ganho de +8% de conversão)
  const additionalSales = Math.max(1, Math.round(monthlyLeads * 0.08));
  const estimatedRevenue = additionalSales * 85000; // Ticket médio base de R$ 85.000
  const estimatedCommissionProfit = additionalSales * 4200; // Lucro bruto médio estimado por veículo

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
      <section className="relative w-full max-w-full pt-12 pb-16 sm:pt-24 sm:pb-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center w-full">
          {/* Badge Animado */}
          <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-orange-500/30 bg-orange-500/10 px-3 py-1 text-[11px] sm:text-xs font-semibold text-orange-400 shadow-sm transition hover:bg-orange-500/20">
            <span className="flex h-2 w-2 rounded-full bg-orange-500 animate-pulse shrink-0" />
            <span className="truncate sm:whitespace-normal">
              🚀 Novo: Integração direta com WhatsApp e Funil Kanban de Alta Velocidade
            </span>
          </div>

          {/* Headline Principal */}
          <h1 className="mt-5 text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-white max-w-4xl mx-auto leading-tight sm:leading-tight break-words">
            O CRM Automotivo construído para{" "}
            <span className="bg-gradient-to-r from-orange-400 via-orange-500 to-red-500 bg-clip-text text-transparent">
              acelerar o fechamento
            </span>{" "}
            de vendas de veículos
          </h1>

          {/* Subheadline com Foco na Dor */}
          <p className="mt-4 sm:mt-6 text-xs sm:text-base md:text-lg text-zinc-400 max-w-2xl mx-auto leading-relaxed break-words px-1">
            Elimine o atraso no atendimento de leads do WhatsApp, Instagram e portais. Aumente o giro do pátio e organize sua equipe comercial em um só lugar.
          </p>

          {/* Duplo CTA */}
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
                      <span className="text-emerald-400 font-medium">🟢 há 15 min</span>
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
                Acompanhe o lead desde o primeiro contato até o fechamento com semáforo visual de urgência. Alertas sonoros e visuais impedem que leads fiquem parados mais de 6 horas sem resposta.
              </p>
              <div className="mt-3.5 sm:mt-4 inline-flex items-center gap-2 text-xs font-semibold text-orange-400">
                <Clock className="h-4 w-4 shrink-0" />
                <span>Atendimento 4x mais rápido que a média de mercado</span>
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
      {/* 4. Calculadora Interativa de Ganho Comercial                       */}
      {/* ------------------------------------------------------------------ */}
      <section
        id="calculadora"
        className="border-y border-white/10 bg-[#0c0c10] py-16 sm:py-28 w-full max-w-full overflow-hidden"
      >
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-orange-500/20 bg-gradient-to-b from-[#16161c] to-[#0d0d11] p-5 sm:p-10 shadow-2xl">
            <div className="flex items-center gap-2 text-xs font-bold text-orange-400 uppercase tracking-wider">
              <Calculator className="h-4 w-4 shrink-0" />
              <span>Simulador de Retorno Comercial</span>
            </div>

            <h2 className="mt-2 text-xl sm:text-3xl font-extrabold text-white">
              Descubra quanto sua loja ganha reduzindo o tempo de resposta
            </h2>
            <p className="mt-2 text-xs sm:text-sm text-zinc-400">
              Leads atendidos em menos de 15 minutos convertem até 3x mais do que contatos respondidos após horas.
            </p>

            <div className="mt-6 sm:mt-8 space-y-5 sm:space-y-6">
              {/* Slider de Leads */}
              <div className="space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-xs font-medium text-zinc-300">
                  <label htmlFor="lead-slider">
                    Quantos leads sua loja recebe por mês?
                  </label>
                  <span className="text-sm sm:text-base font-bold text-orange-400">
                    {monthlyLeads} leads/mês
                  </span>
                </div>
                <input
                  id="lead-slider"
                  type="range"
                  min="30"
                  max="1000"
                  step="10"
                  value={monthlyLeads}
                  onChange={(e) => setMonthlyLeads(Number(e.target.value))}
                  className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-zinc-700 accent-orange-500"
                />
                <div className="flex justify-between text-[10px] text-zinc-400">
                  <span>30 leads</span>
                  <span>500 leads</span>
                  <span>1.000 leads</span>
                </div>
              </div>

              {/* Grid de Resultados Estimados */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 pt-4 border-t border-white/10">
                <div className="rounded-xl border border-white/5 bg-black/40 p-3.5 sm:p-4">
                  <p className="text-xs text-zinc-400">Vendas Adicionais Estimadas</p>
                  <p className="mt-1 text-xl sm:text-2xl font-black text-white">
                    +{additionalSales} <span className="text-xs font-normal text-zinc-400">carros/mês</span>
                  </p>
                </div>

                <div className="rounded-xl border border-orange-500/30 bg-orange-950/20 p-3.5 sm:p-4">
                  <p className="text-xs text-orange-300">Volume de Vendas Extra</p>
                  <p className="mt-1 text-xl sm:text-2xl font-black text-orange-400 truncate">
                    {formatCurrency(estimatedRevenue)}
                  </p>
                </div>

                <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-3.5 sm:p-4">
                  <p className="text-xs text-emerald-300">Lucro Bruto Adicional</p>
                  <p className="mt-1 text-xl sm:text-2xl font-black text-emerald-400 truncate">
                    {formatCurrency(estimatedCommissionProfit)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

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
              Acesse o ambiente de demonstração completo agora mesmo. Sem necessidade de cartão de crédito.
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
