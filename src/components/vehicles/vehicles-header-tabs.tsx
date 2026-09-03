/**
 * @file vehicles-header-tabs.tsx
 * @description Abas superiores de navegação entre Pátio Ativo e Histórico de Vendas.
 */

"use client";

import React from "react";
import { Car, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type VehiclesViewTab = "active" | "sold";

export interface VehiclesHeaderTabsProps {
  activeTab: VehiclesViewTab;
  onTabChange: (tab: VehiclesViewTab) => void;
  activeCount: number;
  soldCount: number;
}

export function VehiclesHeaderTabs({
  activeTab,
  onTabChange,
  activeCount,
  soldCount,
}: VehiclesHeaderTabsProps) {
  return (
    <div
      className="flex items-center gap-2 border-b border-white/10 pb-3"
      role="tablist"
      aria-label="Contexto do Estoque"
    >
      <button
        type="button"
        role="tab"
        id="tab-active-stock"
        aria-selected={activeTab === "active"}
        onClick={() => onTabChange("active")}
        className={cn(
          "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all border",
          activeTab === "active"
            ? "bg-orange-500/10 text-orange-400 border-orange-500/30 shadow-sm"
            : "text-zinc-400 border-transparent hover:text-white hover:bg-white/5"
        )}
      >
        <Car className="h-4 w-4" />
        <span>Pátio Ativo</span>
        <span
          className={cn(
            "ml-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold",
            activeTab === "active"
              ? "bg-orange-500/20 text-orange-300"
              : "bg-zinc-800 text-zinc-400"
          )}
        >
          {activeCount}
        </span>
      </button>

      <button
        type="button"
        role="tab"
        id="tab-sold-stock"
        aria-selected={activeTab === "sold"}
        onClick={() => onTabChange("sold")}
        className={cn(
          "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all border",
          activeTab === "sold"
            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-sm"
            : "text-zinc-400 border-transparent hover:text-white hover:bg-white/5"
        )}
      >
        <CheckCircle2 className="h-4 w-4" />
        <span>Histórico de Vendas</span>
        <span
          className={cn(
            "ml-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold",
            activeTab === "sold"
              ? "bg-emerald-500/20 text-emerald-300"
              : "bg-zinc-800 text-zinc-400"
          )}
        >
          {soldCount}
        </span>
      </button>
    </div>
  );
}
