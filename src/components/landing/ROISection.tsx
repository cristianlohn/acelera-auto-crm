/**
 * @file ROISection.tsx
 * @description Calculadora Comercial Transparente de Retorno sobre Investimento (ROI).
 *
 * Transforma a "calculadora mágica" em um simulador comercial transparente com:
 * - Sliders & Inputs para Leads, Conversão Atual, Conversão Projetada, Ticket Médio e Margem.
 * - Caixa explicativa "Como calculamos?" com premissas matemáticas visíveis.
 */

"use client";

import React, { useState } from "react";
import { Calculator, Info, TrendingUp, Sparkles } from "lucide-react";
import { formatCurrency } from "@/lib/mock-data";

export function ROISection() {
  const [monthlyLeads, setMonthlyLeads] = useState<number>(200);
  const [currentConversion, setCurrentConversion] = useState<number>(2.0);
  const [projectedConversion, setProjectedConversion] = useState<number>(3.5);
  const [avgTicket, setAvgTicket] = useState<number>(85000);
  const [avgMargin, setAvgMargin] = useState<number>(5.0);

  // Cálculos dinâmicos transparentes
  const conversionDelta = Math.max(0.1, Number((projectedConversion - currentConversion).toFixed(1))) / 100;
  const additionalSales = Math.max(1, Math.round(monthlyLeads * conversionDelta));
  const estimatedRevenue = additionalSales * avgTicket;
  const estimatedCommissionProfit = Math.round(estimatedRevenue * (avgMargin / 100));

  return (
    <section
      id="calculadora"
      className="border-y border-white/10 bg-[#0c0c10] py-16 sm:py-28 w-full max-w-full overflow-hidden"
    >
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-orange-500/20 bg-gradient-to-b from-[#16161c] to-[#0d0d11] p-5 sm:p-10 shadow-2xl">
          {/* Header */}
          <div className="flex items-center gap-2 text-xs font-bold text-orange-400 uppercase tracking-wider">
            <Calculator className="h-4 w-4 shrink-0" />
            <span>Calculadora Comercial de Retorno (ROI)</span>
          </div>

          <h2 className="mt-2 text-xl sm:text-3xl font-extrabold text-white">
            Descubra quanto sua revenda ganha reduzindo o tempo de resposta
          </h2>
          <p className="mt-2 text-xs sm:text-sm text-zinc-400">
            Aumente sua taxa de conversão respondendo com rapidez antes que a oportunidade esfrie.
          </p>

          {/* Grid de Inputs / Controles Interativos */}
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {/* 1. Leads Mensais */}
            <div className="space-y-2 rounded-xl border border-white/5 bg-black/40 p-4">
              <div className="flex items-center justify-between text-xs font-medium text-zinc-300">
                <label htmlFor="lead-slider">Leads Recebidos/mês</label>
                <span className="font-bold text-orange-400">{monthlyLeads} leads/mês</span>
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
              <div className="flex justify-between text-[10px] text-zinc-500">
                <span>30 leads</span>
                <span>500</span>
                <span>1.000 leads</span>
              </div>
            </div>

            {/* 2. Conversão Atual */}
            <div className="space-y-2 rounded-xl border border-white/5 bg-black/40 p-4">
              <div className="flex items-center justify-between text-xs font-medium text-zinc-300">
                <label htmlFor="current-conv-input">Conversão Atual (%)</label>
                <span className="font-bold text-zinc-400">{currentConversion}%</span>
              </div>
              <input
                id="current-conv-input"
                type="range"
                min="0.5"
                max="10"
                step="0.5"
                value={currentConversion}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setCurrentConversion(val);
                  if (val >= projectedConversion) {
                    setProjectedConversion(Number((val + 1.0).toFixed(1)));
                  }
                }}
                className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-zinc-700 accent-zinc-400"
              />
              <div className="flex justify-between text-[10px] text-zinc-500">
                <span>0.5%</span>
                <span>Média: 2.0%</span>
                <span>10%</span>
              </div>
            </div>

            {/* 3. Conversão Projetada */}
            <div className="space-y-2 rounded-xl border border-white/5 bg-black/40 p-4">
              <div className="flex items-center justify-between text-xs font-medium text-zinc-300">
                <label htmlFor="projected-conv-input">Conversão com Acelera (%)</label>
                <span className="font-bold text-emerald-400">{projectedConversion}%</span>
              </div>
              <input
                id="projected-conv-input"
                type="range"
                min="1.0"
                max="20"
                step="0.5"
                value={projectedConversion}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setProjectedConversion(val);
                  if (val <= currentConversion) {
                    setCurrentConversion(Math.max(0.5, Number((val - 0.5).toFixed(1))));
                  }
                }}
                className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-zinc-700 accent-emerald-500"
              />
              <div className="flex justify-between text-[10px] text-zinc-500">
                <span>Ganho: +{((projectedConversion - currentConversion)).toFixed(1)}%</span>
                <span>Projetado: {projectedConversion}%</span>
              </div>
            </div>

            {/* 4. Ticket Médio */}
            <div className="space-y-2 rounded-xl border border-white/5 bg-black/40 p-4">
              <div className="flex items-center justify-between text-xs font-medium text-zinc-300">
                <label htmlFor="ticket-slider">Ticket Médio (R$)</label>
                <span className="font-bold text-orange-400">{formatCurrency(avgTicket)}</span>
              </div>
              <input
                id="ticket-slider"
                type="range"
                min="30000"
                max="250000"
                step="5000"
                value={avgTicket}
                onChange={(e) => setAvgTicket(Number(e.target.value))}
                className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-zinc-700 accent-orange-500"
              />
              <div className="flex justify-between text-[10px] text-zinc-500">
                <span>R$ 30k</span>
                <span>R$ 85k</span>
                <span>R$ 250k</span>
              </div>
            </div>

            {/* 5. Margem Média / Lucro Bruto */}
            <div className="space-y-2 rounded-xl border border-white/5 bg-black/40 p-4 sm:col-span-2 lg:col-span-2">
              <div className="flex items-center justify-between text-xs font-medium text-zinc-300">
                <label htmlFor="margin-slider">Margem Média Bruta (%)</label>
                <span className="font-bold text-emerald-400">{avgMargin}% ({formatCurrency(avgTicket * (avgMargin / 100))}/carro)</span>
              </div>
              <input
                id="margin-slider"
                type="range"
                min="2.0"
                max="15.0"
                step="0.5"
                value={avgMargin}
                onChange={(e) => setAvgMargin(Number(e.target.value))}
                className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-zinc-700 accent-emerald-500"
              />
              <div className="flex justify-between text-[10px] text-zinc-500">
                <span>2%</span>
                <span>Padrão Mercado: 5% a 8%</span>
                <span>15%</span>
              </div>
            </div>
          </div>

          {/* Área Transparente: Como calculamos? */}
          <div className="mt-6 rounded-2xl border border-white/10 bg-zinc-950/60 p-4 sm:p-5 text-xs text-zinc-300">
            <div className="flex items-center gap-2 font-bold text-white mb-2">
              <Info className="h-4 w-4 text-orange-400" />
              <span>Como calculamos o retorno da sua revenda?</span>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5 text-[11px] text-zinc-400">
              <div>
                <span className="block text-zinc-500">Leads recebidos:</span>
                <span className="font-semibold text-white">{monthlyLeads} leads</span>
              </div>
              <div>
                <span className="block text-zinc-500">Conversão atual:</span>
                <span className="font-semibold text-white">{currentConversion}%</span>
              </div>
              <div>
                <span className="block text-zinc-500">Conversão projetada:</span>
                <span className="font-semibold text-emerald-400">{projectedConversion}%</span>
              </div>
              <div>
                <span className="block text-zinc-500">Ticket médio:</span>
                <span className="font-semibold text-white">{formatCurrency(avgTicket)}</span>
              </div>
              <div>
                <span className="block text-zinc-500">Margem média:</span>
                <span className="font-semibold text-white">{avgMargin}%</span>
              </div>
            </div>
          </div>

          {/* Grid de Resultados Estimados */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 pt-6 mt-6 border-t border-white/10">
            <div className="rounded-xl border border-white/5 bg-black/40 p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-zinc-400">Vendas Adicionais</p>
                <TrendingUp className="h-4 w-4 text-orange-400" />
              </div>
              <p className="mt-1 text-2xl font-black text-white">
                +{additionalSales} <span className="text-xs font-normal text-zinc-400">carros/mês</span>
              </p>
            </div>

            <div className="rounded-xl border border-orange-500/30 bg-orange-950/20 p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-orange-300">Volume de Vendas Extra</p>
                <Sparkles className="h-4 w-4 text-orange-400" />
              </div>
              <p className="mt-1 text-2xl font-black text-orange-400 truncate">
                {formatCurrency(estimatedRevenue)}
              </p>
            </div>

            <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-emerald-300">Lucro Bruto Adicional</p>
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950 px-1.5 py-0.5 rounded border border-emerald-800/50">LUCRO</span>
              </div>
              <p className="mt-1 text-2xl font-black text-emerald-400 truncate">
                {formatCurrency(estimatedCommissionProfit)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
