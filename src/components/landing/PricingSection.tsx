/**
 * @file PricingSection.tsx
 * @description Seção de Tabela de Preços e Planos (Pricing) do Website Institucional.
 * Suporta alternância dinâmica entre ciclo Mensal e Anual (com desconto de 2 meses grátis)
 * e exibe o bloco informativo de Implantação & Onboarding Guiado (Setup).
 */

"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Sparkles, Rocket, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

import { CONTACT_CONFIG, getSalesWhatsAppUrl } from "@/config/contact";
import { CANONICAL_PLANS, formatPlanSellerLimit } from "@/config/plans";

export type BillingCycle = "mensal" | "anual";

export function PricingSection() {
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("mensal");

  const isAnnual = billingCycle === "anual";

  const enterpriseWhatsAppUrl = getSalesWhatsAppUrl(
    CONTACT_CONFIG.sales.enterpriseMessage
  );

  return (
    <section
      id="planos"
      className="py-16 sm:py-28 w-full max-w-full overflow-hidden"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Cabeçalho da Seção */}
        <div className="text-center max-w-3xl mx-auto">
          <h2 className="text-xs font-bold uppercase tracking-widest text-orange-400">
            Planos Transparentes
          </h2>
          <p className="mt-2 text-xl sm:text-3xl md:text-4xl font-extrabold text-white tracking-tight">
            Investimento simples para impulsionar suas vendas
          </p>
          <p className="mt-2 sm:mt-3 text-xs sm:text-sm text-zinc-400">
            Sem contratos de fidelidade abusivos. Cancele quando quiser.
          </p>

          {/* Toggle Mensal / Anual */}
          <div className="mt-8 flex items-center justify-center">
            <div className="relative inline-flex items-center rounded-full bg-zinc-900/90 p-1.5 border border-white/10 shadow-inner">
              <button
                type="button"
                onClick={() => setBillingCycle("mensal")}
                className={`relative px-4 sm:px-6 py-2 text-xs sm:text-sm font-semibold rounded-full transition-all ${
                  !isAnnual
                    ? "bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-md shadow-orange-500/20"
                    : "text-zinc-400 hover:text-white"
                }`}
                aria-pressed={!isAnnual}
              >
                Mensal
              </button>
              <button
                type="button"
                onClick={() => setBillingCycle("anual")}
                className={`relative px-4 sm:px-6 py-2 text-xs sm:text-sm font-semibold rounded-full transition-all flex items-center gap-1.5 ${
                  isAnnual
                    ? "bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-md shadow-orange-500/20"
                    : "text-zinc-400 hover:text-white"
                }`}
                aria-pressed={isAnnual}
              >
                <span>Anual</span>
                <span className="rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                  2 Meses Grátis
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Grade de 3 Planos */}
        <div className="mt-10 sm:mt-12 grid grid-cols-1 gap-6 sm:gap-8 lg:grid-cols-3">
          {/* 1. Plano Starter */}
          <div className="flex flex-col justify-between rounded-2xl border border-white/10 bg-[#121216] p-6 sm:p-8 shadow-sm transition hover:border-white/20">
            <div>
              <div className="flex items-center justify-between">
                <h3 className="text-base sm:text-lg font-bold text-white">
                  {CANONICAL_PLANS.starter.name}
                </h3>
              </div>
              <p className="mt-1 text-xs text-zinc-400">
                Para lojas e revendas de entrada
              </p>

              {/* Badge de capacidade de vendedores */}
              <div className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-white/5 px-2.5 py-1 text-[11px] font-medium text-orange-300 border border-orange-500/20">
                <span>Até {CANONICAL_PLANS.starter.sellerLimit} vendedores inclusos</span>
              </div>

              {/* Preço Dinâmico */}
              <div className="mt-5 sm:mt-6">
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl sm:text-4xl font-black text-white">
                    {isAnnual ? `R$ ${CANONICAL_PLANS.starter.annualPrice?.toLocaleString("pt-BR")}` : `R$ ${CANONICAL_PLANS.starter.monthlyPrice}`}
                  </span>
                  <span className="text-xs text-zinc-400">
                    {isAnnual ? "/ano" : "/mês"}
                  </span>
                </div>
                {isAnnual && (
                  <p className="mt-1 text-[11px] text-emerald-400 font-medium">
                    Equivale a R$ 247,50/mês (Economia de R$ 594)
                  </p>
                )}
              </div>

              {/* Lista de Recursos */}
              <ul className="mt-5 sm:mt-6 space-y-2.5 sm:space-y-3 text-xs text-zinc-300">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-orange-400 shrink-0" />
                  <span>Roleta Comercial com distribuição justa (Round-Robin)</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-orange-400 shrink-0" />
                  <span>Controle de plantão dos vendedores (Ligar / Pausar)</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-orange-400 shrink-0" />
                  <span>Funil Kanban de Vendas com cronômetro de SLA</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-orange-400 shrink-0" />
                  <span>Contato com o lead via WhatsApp em 1 clique</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-orange-400 shrink-0" />
                  <span>Chave de API para ingestão automática de leads externos</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-orange-400 shrink-0" />
                  <span>Gestão de estoque integrada</span>
                </li>
              </ul>
            </div>

            <Link href="/dashboard/leads" className="mt-6 sm:mt-8">
              <Button
                variant="outline"
                className="w-full border-white/20 text-xs font-semibold text-white hover:bg-white/10"
              >
                Testar Grátis por 14 Dias
              </Button>
            </Link>
          </div>

          {/* 2. Plano Pro (Destaque / Recomendado) */}
          <div className="relative flex flex-col justify-between rounded-2xl border-2 border-orange-500 bg-gradient-to-b from-[#181822] to-[#121216] p-6 sm:p-8 shadow-2xl shadow-orange-500/15">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-orange-500 to-red-500 px-3.5 py-0.5 text-[10px] font-bold text-white tracking-wider uppercase shadow flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              <span>{CANONICAL_PLANS.pro.badge ?? "Mais escolhido"}</span>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <h3 className="text-base sm:text-lg font-bold text-white">
                  {CANONICAL_PLANS.pro.name}
                </h3>
              </div>
              <p className="mt-1 text-xs text-zinc-400">
                Para concessionárias e lojas em expansão
              </p>

              {/* Badge de capacidade */}
              <div className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-orange-500/10 px-2.5 py-1 text-[11px] font-semibold text-orange-300 border border-orange-500/30">
                <span>Até {CANONICAL_PLANS.pro.sellerLimit} vendedores inclusos</span>
              </div>

              {/* Preço Dinâmico */}
              <div className="mt-5 sm:mt-6">
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl sm:text-4xl font-black text-white">
                    {isAnnual ? `R$ ${CANONICAL_PLANS.pro.annualPrice?.toLocaleString("pt-BR")}` : `R$ ${CANONICAL_PLANS.pro.monthlyPrice}`}
                  </span>
                  <span className="text-xs text-zinc-400">
                    {isAnnual ? "/ano" : "/mês"}
                  </span>
                </div>
                {isAnnual && (
                  <p className="mt-1 text-[11px] text-emerald-400 font-medium">
                    Equivale a R$ 414,17/mês (Economia de R$ 994)
                  </p>
                )}
              </div>

              {/* Lista de Recursos */}
              <ul className="mt-5 sm:mt-6 space-y-2.5 sm:space-y-3 text-xs text-zinc-300">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-orange-400 shrink-0" />
                  <span className="font-medium text-white">
                    Todos os recursos do Plano Starter +
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-orange-400 shrink-0" />
                  <span>Roleta com especialização por segmento (Novos e Seminovos)</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-orange-400 shrink-0" />
                  <span>Cockpit do Gestor com auditoria de tempo de resposta da equipe</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-orange-400 shrink-0" />
                  <span>Isolamento total de permissões (Visão Gestor vs. Vendedor)</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-orange-400 shrink-0" />
                  <span>Múltiplas Chaves de API para diferentes canais de captação</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-orange-400 shrink-0" />
                  <span>Suporte prioritário via WhatsApp</span>
                </li>
              </ul>
            </div>

            <Link href="/dashboard/leads" className="mt-6 sm:mt-8">
              <Button className="w-full bg-gradient-to-r from-orange-500 to-red-600 text-xs font-bold text-white shadow-lg shadow-orange-500/30 hover:from-orange-600 hover:to-red-700">
                Testar Plano Pro Grátis
              </Button>
            </Link>
          </div>

          {/* 3. Plano Enterprise */}
          <div className="flex flex-col justify-between rounded-2xl border border-white/10 bg-[#121216] p-6 sm:p-8 shadow-sm transition hover:border-white/20">
            <div>
              <div className="flex items-center justify-between">
                <h3 className="text-base sm:text-lg font-bold text-white">
                  {CANONICAL_PLANS.enterprise.name}
                </h3>
              </div>
              <p className="mt-1 text-xs text-zinc-400">
                Para grandes concessionárias e redes
              </p>

              {/* Badge de capacidade */}
              <div className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-purple-500/10 px-2.5 py-1 text-[11px] font-medium text-purple-300 border border-purple-500/20">
                <span>{formatPlanSellerLimit(CANONICAL_PLANS.enterprise.sellerLimit)}</span>
              </div>

              {/* Preço */}
              <div className="mt-5 sm:mt-6">
                <div className="flex items-baseline gap-1">
                  {isAnnual ? (
                    <span className="text-xl sm:text-3xl font-black text-white">
                      Sob consulta
                    </span>
                  ) : (
                    <>
                      <span className="text-xl sm:text-3xl font-black text-white">
                        A partir de R$ {(CANONICAL_PLANS.enterprise.startingMonthlyPrice ?? 897).toLocaleString("pt-BR")}
                      </span>
                      <span className="text-xs text-zinc-400">/mês</span>
                    </>
                  )}
                </div>
                <p className="mt-1 text-[11px] text-zinc-400">
                  {isAnnual ? "Condições especiais sob medida para redes" : "Customizado para a volumetria da sua rede"}
                </p>
              </div>

              {/* Lista de Recursos */}
              <ul className="mt-5 sm:mt-6 space-y-2.5 sm:space-y-3 text-xs text-zinc-300">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-purple-400 shrink-0" />
                  <span className="font-medium text-white">Todos os recursos do Plano Pro +</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-purple-400 shrink-0" />
                  <span>Equipe e capacidade sob consulta</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-purple-400 shrink-0" />
                  <span>Múltiplas lojas e filiais</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-purple-400 shrink-0" />
                  <span>API dedicada e integrações customizadas</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-purple-400 shrink-0" />
                  <span>Onboarding assistido e gerente de contas</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-purple-400 shrink-0" />
                  <span>SLA de suporte dedicado</span>
                </li>
              </ul>
            </div>

            <a
              href={enterpriseWhatsAppUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 sm:mt-8 block"
            >
              <Button
                variant="outline"
                className="w-full border-purple-500/30 text-xs font-semibold text-purple-200 hover:bg-purple-500/10 flex items-center justify-center gap-2"
              >
                <MessageCircle className="w-4 h-4 text-purple-400" />
                <span>Falar com o Acelera</span>
              </Button>
            </a>
          </div>
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* Bloco Informativo: Taxa de Implantação e Onboarding Guiado (Setup) */}
        {/* ------------------------------------------------------------------ */}
        <div className="mt-10 sm:mt-12 rounded-2xl border border-orange-500/20 bg-gradient-to-r from-orange-950/30 via-zinc-900/60 to-zinc-900/40 p-6 sm:p-8 backdrop-blur-sm">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-orange-500/10 text-orange-400 border border-orange-500/20">
                <Rocket className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <span>🚀 Implantação e Onboarding Guiado</span>
                </h3>
                <p className="mt-1 text-xs sm:text-sm text-zinc-300 max-w-3xl leading-relaxed">
                  <strong className="text-orange-400 font-semibold">
                    Taxa única de setup: R$ 997.
                  </strong>{" "}
                  Configuração inicial da concessionária, importação do estoque via planilha (CSV/Excel) e treinamento ao vivo do time de vendas.
                </p>
                <p className="mt-2 text-xs text-emerald-400 font-medium flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    Consulte condições especiais de isenção de setup para
                    contratações no plano anual.
                  </span>
                </p>
              </div>
            </div>

            <div className="shrink-0 w-full md:w-auto">
              <Link href="/dashboard/leads">
                <Button
                  variant="outline"
                  className="w-full md:w-auto border-orange-500/30 text-xs font-semibold text-orange-300 hover:bg-orange-500/10"
                >
                  Conhecer em Detalhes
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
