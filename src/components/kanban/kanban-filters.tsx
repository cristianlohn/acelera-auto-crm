/**
 * @file kanban-filters.tsx
 * @description Barra de filtros de topo do Funil Kanban com busca dinâmica por texto,
 * filtragem por vendedor responsável e especialidade de estoque.
 */

"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, X, DollarSign, Users, LayoutDashboard, List, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import type { KanbanFilterState, KanbanLead } from "@/types/kanban";
import { useDemoRole } from "@/context/demo-role-context";
import { resetDemoStateAction } from "@/app/actions/demo-reset-actions";
import { AddKanbanLeadModal } from "./add-kanban-lead-modal";

interface KanbanFiltersProps {
  filters: KanbanFilterState;
  onFilterChange: (newFilters: Partial<KanbanFilterState>) => void;
  onResetFilters: () => void;
  sellers: { id: string; name: string }[];
  totalLeadsCount: number;
  totalPipelineValue?: number;
  negotiatingValue?: number;
  activeLeadsCount?: number;
  wonLeadsCount?: number;
  onLeadAdded?: (lead: KanbanLead) => void;
  viewMode?: "kanban" | "list";
  onViewModeChange?: (mode: "kanban" | "list") => void;
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
  totalPipelineValue = 0,
  negotiatingValue,
  activeLeadsCount,
  wonLeadsCount,
  onLeadAdded,
  viewMode = "kanban",
  onViewModeChange,
}: KanbanFiltersProps) {
  const { isDemoMode } = useDemoRole();
  let router: ReturnType<typeof useRouter> | null = null;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    router = useRouter();
  } catch {
    // Graceful fallback para testes e ambientes fora do AppRouterContext
  }
  const [isResetting, setIsResetting] = useState(false);

  const handleResetDemo = async () => {
    setIsResetting(true);
    try {
      const res = await resetDemoStateAction();
      if (res.success) {
        toast.success(res.message);
        if (router) {
          router.refresh();
        } else if (typeof window !== "undefined") {
          window.location.reload();
        }
      } else {
        toast.error(res.message);
      }
    } catch {
      toast.error("Erro ao restaurar demonstração.");
    } finally {
      setIsResetting(false);
    }
  };

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

        {/* Resumo Rápido de Pipeline & Ação de Novo Lead */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs self-stretch sm:self-end lg:self-center justify-between sm:justify-end">
          {/* Alternador Kanban | Lista */}
          <div className="flex items-center rounded-xl bg-white/5 border border-white/10 p-0.5">
            <button
              type="button"
              data-testid="btn-view-kanban"
              onClick={() => onViewModeChange?.("kanban")}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                viewMode === "kanban"
                  ? "bg-orange-500 text-white shadow-sm font-semibold"
                  : "text-zinc-400 hover:text-white"
              }`}
              title="Visualização em Kanban"
            >
              <LayoutDashboard className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Kanban</span>
            </button>
            <button
              type="button"
              data-testid="btn-view-list"
              onClick={() => onViewModeChange?.("list")}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                viewMode === "list"
                  ? "bg-orange-500 text-white shadow-sm font-semibold"
                  : "text-zinc-400 hover:text-white"
              }`}
              title="Visualização em Lista"
            >
              <List className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Lista</span>
            </button>
          </div>

          <div className="h-4 w-px bg-white/10 hidden sm:block" />
          <div className="flex items-center gap-1.5 text-zinc-300">
            <Users className="h-4 w-4 text-orange-400" />
            {activeLeadsCount !== undefined ? (
              <>
                <span className="font-semibold text-white">{activeLeadsCount}</span>
                <span className="text-zinc-500">
                  {activeLeadsCount === 1 ? "lead ativo" : "leads ativos"}
                  {wonLeadsCount !== undefined && wonLeadsCount > 0 ? ` (${wonLeadsCount} ${wonLeadsCount === 1 ? "fechado" : "fechados"})` : ""}
                </span>
              </>
            ) : (
              <>
                <span className="font-semibold text-white">{totalLeadsCount}</span>
                <span className="text-zinc-500">
                  {totalLeadsCount === 1 ? "oportunidade no total" : "oportunidades no total"}
                </span>
              </>
            )}
          </div>
          <div className="h-4 w-px bg-white/10 hidden sm:block" />
          <div className="flex items-center gap-1.5 text-zinc-300">
            <DollarSign className="h-4 w-4 text-emerald-400" />
            <span className="font-bold text-emerald-400">
              {formatCurrencyBRL(negotiatingValue ?? totalPipelineValue)}
            </span>
            <span className="text-zinc-500 hidden sm:inline">em negociação</span>
          </div>
          <div className="h-4 w-px bg-white/10" />
          {isDemoMode && (
            <button
              id="btn-kanban-reset-demo"
              type="button"
              disabled={isResetting}
              onClick={handleResetDemo}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-orange-500/10 border border-orange-500/30 text-orange-400 hover:bg-orange-500/20 text-xs font-medium transition-all shadow-sm active:scale-95 disabled:opacity-50"
              title="Restaurar dados iniciais da demonstração"
            >
              <RotateCcw className={`h-3.5 w-3.5 ${isResetting ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">{isResetting ? "..." : "Reset Demo"}</span>
            </button>
          )}
          <AddKanbanLeadModal
            onLeadAdded={onLeadAdded || (() => {})}
            availableSellers={sellers}
          />
        </div>
      </div>
    </div>
  );
}
