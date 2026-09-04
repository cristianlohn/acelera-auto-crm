/**
 * @file kanban-column.tsx
 * @description Coluna do Funil de Vendas Kanban com header analítico, contador de leads,
 * soma de valor do pipeline e zona de drop otimista para drag-and-drop.
 */

"use client";

import React, { useState } from "react";
import type { KanbanColumnConfig, KanbanLead, LeadStage } from "@/types/kanban";
import { KanbanCard } from "./kanban-card";
import { cn } from "@/lib/utils";
import { Plus } from "lucide-react";

interface KanbanColumnProps {
  column: KanbanColumnConfig;
  onDropLead: (leadId: string, targetStage: LeadStage) => void;
  onMoveStage?: (leadId: string, targetStage: LeadStage) => void;
  onSelectLead?: (lead: KanbanLead) => void;
  onAddLeadClick?: (initialStage: LeadStage) => void;
}

function formatPipelineSum(value: number): string {
  if (value === 0) return "R$ 0";
  if (value >= 1_000_000) {
    return `R$ ${(value / 1_000_000).toFixed(1).replace(".", ",")}M`;
  }
  if (value >= 1_000) {
    return `R$ ${(value / 1_000).toFixed(0)}k`;
  }
  return `R$ ${value.toLocaleString("pt-BR")}`;
}

export function KanbanColumn({
  column,
  onDropLead,
  onMoveStage,
  onSelectLead,
  onAddLeadClick,
}: KanbanColumnProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (!isDragOver) setIsDragOver(true);
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const leadId = e.dataTransfer.getData("leadId") || e.dataTransfer.getData("text/plain");
    if (leadId) {
      onDropLead(leadId, column.id);
    }
  };

  return (
    <div
      data-testid="kanban-column"
      data-stage-id={column.id}
      id={`kanban-column-${column.id}`}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        "flex flex-col flex-shrink-0 w-80 rounded-3xl p-3.5 transition-all duration-200 border",
        "bg-slate-100/80 dark:bg-zinc-950/60 backdrop-blur-md",
        column.borderColor,
        isDragOver
          ? "ring-2 ring-amber-500 border-amber-500/50 bg-amber-500/5 dark:bg-amber-500/10"
          : "hover:border-slate-300 dark:hover:border-white/20"
      )}
    >
      {/* Cabeçalho da Coluna */}
      <div className="flex items-center justify-between gap-2 px-1 pb-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className={cn("h-2.5 w-2.5 rounded-full shrink-0", column.dotColor)} />
          <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate tracking-tight">
            {column.title}
          </h3>
          <span
            data-testid={`counter-${column.id}`}
            id={`column-count-${column.id}`}
            className={cn(
              "inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-bold border",
              column.badgeColor
            )}
          >
            {column.leads.length}
          </span>
        </div>

        {/* Soma de Pipeline */}
        <div className="text-right">
          <div className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400">
            {formatPipelineSum(column.totalValue)}
          </div>
        </div>
      </div>

      {/* Lista de Cards da Coluna */}
      <div className="flex-1 space-y-3 overflow-y-auto max-h-[calc(100vh-280px)] pt-1 pb-2 pr-0.5 custom-scrollbar min-h-[140px]">
        {column.leads.map((lead) => (
          <KanbanCard
            key={lead.id}
            lead={lead}
            onMoveStage={onMoveStage}
            onSelectLead={onSelectLead}
          />
        ))}

        {column.leads.length === 0 && (
          <div
            className={cn(
              "flex flex-col items-center justify-center h-32 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700/60 bg-white/60 dark:bg-slate-900/40 p-4 text-center transition-all",
              isDragOver && "border-amber-500/50 bg-amber-500/10"
            )}
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-200 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 mb-1.5 border border-slate-300 dark:border-slate-700/50">
              <Plus className="h-3.5 w-3.5" />
            </div>
            <p className="font-semibold text-xs text-slate-700 dark:text-slate-300">Nenhum lead nesta etapa</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Arraste um card para cá</p>
          </div>
        )}
      </div>

      {/* Botão de Adição Rápida na Coluna */}
      {onAddLeadClick && column.id === "new" && (
        <button
          onClick={() => onAddLeadClick("new")}
          data-testid="btn-add-lead-column"
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 dark:border-white/10 py-2 text-xs font-semibold text-slate-600 dark:text-zinc-400 hover:border-orange-500/40 hover:bg-orange-500/5 hover:text-orange-500 transition-all"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Novo Lead</span>
        </button>
      )}
    </div>
  );
}
