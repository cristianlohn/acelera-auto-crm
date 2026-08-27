/**
 * @file kanban-filters.tsx
 * @description Barra de filtros de topo do Funil Kanban com busca dinâmica por texto,
 * filtragem por vendedor responsável e especialidade de estoque.
 */

"use client";

import React from "react";
import { Search, X, DollarSign, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { KanbanFilterState } from "@/types/kanban";

interface KanbanFiltersProps {
  filters: KanbanFilterState;
  onFilterChange: (newFilters: Partial<KanbanFilterState>) => void;
  onResetFilters: () => void;
  sellers: { id: string; name: string }[];
  totalLeadsCount: number;
  totalPipelineValue: number;
}

function formatCurrencyBRL(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);
}

export function KanbanFilters({
  filters,
  onFilterChange,
  onResetFilters,
  sellers,
  totalLeadsCount,
  totalPipelineValue,
}: KanbanFiltersProps) {
  const hasActiveFilters =
    filters.search.trim() !== "" ||
    filters.sellerId !== "all" ||
    filters.segment !== "all";

  return (
    <div className="rounded-2xl bg-zinc-900/80 border border-white/10 p-3.5 backdrop-blur-md shadow-lg space-y-3">
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* Controles de Filtros */}
        <div className="flex flex-1 flex-wrap items-center gap-2.5">
          {/* Busca Textual */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <Input
              data-testid="input-search-kanban"
              placeholder="Buscar cliente, telefone ou veículo..."
              value={filters.search}
              onChange={(e) => onFilterChange({ search: e.target.value })}
              className="pl-9 h-9 bg-white/5 border-white/10 text-white placeholder:text-zinc-500 text-xs rounded-xl focus-visible:ring-orange-500"
            />
          </div>

          {/* Filtro por Vendedor */}
          <div className="relative min-w-[160px]">
            <select
              data-testid="select-seller-filter"
              value={filters.sellerId}
              onChange={(e) => onFilterChange({ sellerId: e.target.value })}
              className="w-full h-9 rounded-xl bg-white/5 border border-white/10 px-3 text-xs font-medium text-white focus:outline-none focus:ring-1 focus:ring-orange-500"
            >
              <option value="all" className="bg-zinc-900 text-white">Todos os Vendedores</option>
              {sellers.map((s) => (
                <option key={s.id} value={s.name} className="bg-zinc-900 text-white">
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro por Segmento */}
          <div className="relative min-w-[150px]">
            <select
              data-testid="select-segment-filter"
              value={filters.segment}
              onChange={(e) => onFilterChange({ segment: e.target.value as KanbanFilterState["segment"] })}
              className="w-full h-9 rounded-xl bg-white/5 border border-white/10 px-3 text-xs font-medium text-white focus:outline-none focus:ring-1 focus:ring-orange-500"
            >
              <option value="all" className="bg-zinc-900 text-white">Todos os Segmentos</option>
              <option value="new_cars" className="bg-zinc-900 text-white">Veículos Novos (0km)</option>
              <option value="used_cars" className="bg-zinc-900 text-white">Seminovos / Usados</option>
              <option value="f_and_i" className="bg-zinc-900 text-white">Financiamento (F&I)</option>
            </select>
          </div>

          {/* Botão de Limpar Filtros */}
          {hasActiveFilters && (
            <button
              onClick={onResetFilters}
              data-testid="btn-reset-kanban-filters"
              className="flex items-center gap-1.5 h-9 rounded-xl bg-white/10 hover:bg-white/15 px-3 text-xs font-semibold text-zinc-300 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
              <span>Limpar</span>
            </button>
          )}
        </div>

        {/* Resumo Rápido de Pipeline */}
        <div className="flex items-center gap-4 pl-2 text-xs">
          <div className="flex items-center gap-1.5 text-zinc-300">
            <Users className="h-4 w-4 text-orange-400" />
            <span className="font-semibold text-white">{totalLeadsCount}</span>
            <span className="text-zinc-500">leads ativos</span>
          </div>
          <div className="h-4 w-px bg-white/10 hidden sm:block" />
          <div className="flex items-center gap-1.5 text-zinc-300">
            <DollarSign className="h-4 w-4 text-emerald-400" />
            <span className="font-bold text-emerald-400">{formatCurrencyBRL(totalPipelineValue)}</span>
            <span className="text-zinc-500 hidden sm:inline">em negociação</span>
          </div>
        </div>
      </div>
    </div>
  );
}
