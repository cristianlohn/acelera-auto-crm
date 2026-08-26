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

export type BillingCycle = "mensal" | "anual";

export function PricingSection() {
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("mensal");

  const isAnnual = billingCycle === "anual";

  const enterpriseWhatsAppUrl =
    "https://wa.me/5547999999999?text=" +
    encodeURIComponent(
      "Olá! Gostaria de falar com um consultor sobre o Plano Enterprise do Acelera Auto CRM."
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
                  Plano Starter
                </h3>
              </div>
              <p className="mt-1 text-xs text-zinc-400">
                Para revendas pequenas e lojas de entrada
              </p>

              {/* Badge de capacidade de vendedores */}
              <div className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-white/5 px-2.5 py-1 text-[11px] font-medium text-orange-300 border border-orange-500/20">
                <span>Até 3 vendedores inclusos</span>
              </div>

              {/* Preço Dinâmico */}
              <div className="mt-5 sm:mt-6">
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl sm:text-4xl font-black text-white">
                    {isAnnual ? "R$ 2.970" : "R$ 297"}
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
                  <span>Funil Kanban com SLA em tempo real</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-orange-400 shrink-0" />
                  <span>Integração WhatsApp 1-clique</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-orange-400 shrink-0" />
                  <span>Catálogo até 50 veículos no estoque</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-orange-400 shrink-0" />
                  <span>Suporte ágil via WhatsApp</span>
                </li>
              </ul>
            </div>

            <Link href="/leads" className="mt-6 sm:mt-8">
              <Button
                variant="outline"
                className="w-full border-white/20 text-xs font-semibold text-white hover:bg-white/10"
              >
                Começar com Starter
              </Button>
            </Link>
          </div>

          {/* 2. Plano Pro (Destaque / Recomendado) */}
          <div className="relative flex flex-col justify-between rounded-2xl border-2 border-orange-500 bg-gradient-to-b from-[#181822] to-[#121216] p-6 sm:p-8 shadow-2xl shadow-orange-500/15">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-orange-500 to-red-500 px-3.5 py-0.5 text-[10px] font-bold text-white tracking-wider uppercase shadow flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              <span>Mais Popular</span>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <h3 className="text-base sm:text-lg font-bold text-white">
                  Plano Pro
                </h3>
              </div>
              <p className="mt-1 text-xs text-zinc-400">
                Para concessionárias e lojas em expansão
              </p>

              {/* Badge de capacidade */}
              <div className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-orange-500/10 px-2.5 py-1 text-[11px] font-semibold text-orange-300 border border-orange-500/30">
                <span>Até 8 vendedores inclusos</span>
              </div>

              {/* Preço Dinâmico */}
              <div className="mt-5 sm:mt-6">
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl sm:text-4xl font-black text-white">
                    {isAnnual ? "R$ 5.970" : "R$ 597"}
                  </span>
                  <span className="text-xs text-zinc-400">
                    {isAnnual ? "/ano" : "/mês"}
                  </span>
                </div>
                {isAnnual && (
                  <p className="mt-1 text-[11px] text-emerald-400 font-medium">
                    Equivale a R$ 497,50/mês (Economia de R$ 1.194)
                  </p>
                )}
              </div>

              {/* Lista de Recursos */}
              <ul className="mt-5 sm:mt-6 space-y-2.5 sm:space-y-3 text-xs text-zinc-300">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-orange-400 shrink-0" />
                  <span className="font-medium text-white">
                    Todos os recursos do Starter +
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-orange-400 shrink-0" />
                  <span>Catálogo ilimitado de veículos</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-orange-400 shrink-0" />
                  <span>Relatórios avançados de conversão por vendedor</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-orange-400 shrink-0" />
                  <span>Simulação de taxas e propostas comerciais</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-orange-400 shrink-0" />
                  <span>Suporte prioritário via WhatsApp</span>
                </li>
              </ul>
            </div>

            <Link href="/leads" className="mt-6 sm:mt-8">
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
                  Plano Enterprise
                </h3>
              </div>
              <p className="mt-1 text-xs text-zinc-400">
                Para redes de lojas e grandes pátios
              </p>

              {/* Badge de capacidade */}
              <div className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-purple-500/10 px-2.5 py-1 text-[11px] font-medium text-purple-300 border border-purple-500/20">
                <span>Vendedores e filiais ilimitados</span>
              </div>

              {/* Preço */}
              <div className="mt-5 sm:mt-6">
                <div className="flex items-baseline gap-1">
                  <span className="text-xl sm:text-3xl font-black text-white">
                    A partir de R$ 1.297
                  </span>
                  <span className="text-xs text-zinc-400">/mês</span>
                </div>
                <p className="mt-1 text-[11px] text-zinc-400">
                  Customizado para a volumetria da sua rede
                </p>
              </div>

              {/* Lista de Recursos */}
              <ul className="mt-5 sm:mt-6 space-y-2.5 sm:space-y-3 text-xs text-zinc-300">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-purple-400 shrink-0" />
                  <span>Multi-filiais e estoques integrados</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-purple-400 shrink-0" />
                  <span>Onboarding dedicado e personalizado</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-purple-400 shrink-0" />
                  <span>SLA de atendimento VIP</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-purple-400 shrink-0" />
                  <span>Personalização de funis e regras de distribuição</span>
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
                <span>Falar com Consultor</span>
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
                  Inclui configuração inicial da loja, importação do estoque
                  atual, treinamento ao vivo da equipe de vendas e parametrização
                  dos SLAs de atendimento.
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
              <Link href="/leads">
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
