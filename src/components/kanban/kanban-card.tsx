/**
 * @file kanban-card.tsx
 * @description Card individual de Lead no Quadro Kanban com suporte a Drag & Drop,
 * cronômetro visual de SLA, atalho direto para WhatsApp e detalhes do veículo.
 */

"use client";

import React from "react";
import {
  MessageCircle,
  Car,
  Clock,
  AlertTriangle,
  ThumbsDown,
  ChevronRight,
} from "lucide-react";
import type { KanbanLead, LeadStage } from "@/types/kanban";
import { cn } from "@/lib/utils";

interface KanbanCardProps {
  lead: KanbanLead;
  onMoveStage?: (leadId: string, targetStage: LeadStage) => void;
  onSelectLead?: (lead: KanbanLead) => void;
}

const NEXT_STAGE_MAP: Record<LeadStage, LeadStage | null> = {
  new: "in_contact",
  in_contact: "test_drive",
  visit_scheduled: "test_drive",
  test_drive: "proposal",
  proposal: "won",
  proposal_fi: "won",
  won: null,
  lost: null,
};

/**
 * Normaliza a formatação de moedas em BRL
 */
function formatCurrencyBRL(value?: number): string {
  if (!value) return "Sob consulta";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Retorna classes de estilo para o badge de SLA com feedback visual de urgência
 */
function getSlaBadgeConfig(minutes: number, stage: LeadStage) {
  if (stage === "won" || stage === "lost") {
    return {
      label: "Concluído",
      className: "bg-zinc-800 text-zinc-400 border-zinc-700",
      isCritical: false,
    };
  }

  if (minutes < 5) {
    return {
      label: `${minutes}m atrás`,
      className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
      isCritical: false,
    };
  }

  if (minutes <= 15) {
    return {
      label: `${minutes}m atrás`,
      className: "bg-amber-500/10 text-amber-400 border-amber-500/20",
      isCritical: false,
    };
  }

  return {
    label: `SLA Crítico: ${minutes}m`,
    className: "bg-red-500/15 text-red-400 border-red-500/30 animate-pulse font-bold",
    isCritical: true,
  };
}

/**
 * Retorna o rótulo amigável da origem do lead
 */
function getSourceBadge(source: string) {
  const s = source.toLowerCase();
  if (s.includes("meta") || s.includes("insta") || s.includes("face")) {
    return { label: "Meta Ads", className: "bg-pink-500/10 text-pink-400 border-pink-500/20" };
  }
  if (s.includes("webmotors")) {
    return { label: "Webmotors", className: "bg-red-500/10 text-red-400 border-red-500/20" };
  }
  if (s.includes("icarros")) {
    return { label: "iCarros", className: "bg-orange-500/10 text-orange-400 border-orange-500/20" };
  }
  if (s.includes("olx")) {
    return { label: "OLX", className: "bg-purple-500/10 text-purple-400 border-purple-500/20" };
  }
  if (s.includes("landing") || s.includes("site")) {
    return { label: "Site / LP", className: "bg-blue-500/10 text-blue-400 border-blue-500/20" };
  }
  return { label: "Direto", className: "bg-zinc-800 text-zinc-300 border-zinc-700" };
}

export function KanbanCard({ lead, onMoveStage, onSelectLead }: KanbanCardProps) {
  const slaConfig = getSlaBadgeConfig(lead.sla_minutes_elapsed, lead.stage);
  const sourceConfig = getSourceBadge(lead.source);
  const cleanPhone = lead.phone ? lead.phone.replace(/\D/g, "") : "";
  const nextStage = NEXT_STAGE_MAP[lead.stage];

  const whatsappDirectMessage = encodeURIComponent(
    `Olá ${lead.name}, tudo bem? Sou ${lead.assigned_to_name} da concessionária. Vi seu interesse no ${lead.vehicle_of_interest}. Como posso te ajudar hoje?`
  );
  const whatsappUrl = cleanPhone
    ? `https://wa.me/${cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`}?text=${whatsappDirectMessage}`
    : "#";

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    e.dataTransfer.setData("leadId", lead.id);
    e.dataTransfer.setData("text/plain", lead.id);
    e.dataTransfer.effectAllowed = "move";
  };

  return (
    <div
      draggable={true}
      onDragStart={handleDragStart}
      onClick={() => onSelectLead?.(lead)}
      data-testid="kanban-card"
      data-card-id={lead.id}
      id={`kanban-card-${lead.id}`}
      className={cn(
        "group relative rounded-2xl p-4 transition-all duration-200 cursor-grab active:cursor-grabbing",
        "bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 hover:border-orange-500/40 shadow-md hover:shadow-orange-500/5",
        slaConfig.isCritical && "ring-1 ring-red-500/40 border-red-500/30"
      )}
    >
      {/* Alerta de Urgência de SLA */}
      {slaConfig.isCritical && (
        <div className="absolute -top-2.5 left-4 flex items-center gap-1 rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold text-white shadow-md animate-bounce">
          <AlertTriangle className="h-3 w-3" />
          <span>URGENTE</span>
        </div>
      )}

      {/* Topo do Card: Nome e Badges */}
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1 min-w-0">
          <h4 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight truncate group-hover:text-orange-500 transition-colors">
            {lead.name}
          </h4>
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className={cn(
                "inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold border",
                sourceConfig.className
              )}
            >
              {sourceConfig.label}
            </span>
            <span
              data-testid="badge-sla-timer"
              className={cn(
                "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium border",
                slaConfig.className
              )}
            >
              <Clock className="h-3 w-3" />
              <span>{slaConfig.label}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Veículo de Interesse em Destaque */}
      <div className="mt-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 p-2.5 space-y-1">
        <div className="flex items-center gap-2 text-slate-700 dark:text-zinc-300">
          <Car className="h-4 w-4 text-orange-500 shrink-0" />
          <span
            data-testid="lead-vehicle"
            className="text-xs font-semibold text-slate-900 dark:text-white truncate"
          >
            {lead.vehicle_of_interest}
          </span>
        </div>
        {lead.value && (
          <div className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 pl-6">
            {formatCurrencyBRL(lead.value)}
          </div>
        )}
      </div>

      {/* Rodapé do Card: Vendedor Responsável & Ações Rápidas */}
      <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-white/10 flex items-center justify-between gap-2">
        {/* Vendedor Atribuído */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-red-600 text-[10px] font-bold text-white shadow-sm">
            {lead.assigned_to_name.charAt(0).toUpperCase()}
          </div>
          <span
            data-testid="lead-seller-name"
            className="text-xs text-slate-600 dark:text-zinc-300 truncate max-w-[95px]"
          >
            {lead.assigned_to_name}
          </span>
        </div>

        {/* Botões de Ação */}
        <div className="flex items-center gap-1.5">
          {/* Botão de Descarte / Perda */}
          {lead.stage !== "lost" && lead.stage !== "won" && onMoveStage && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onMoveStage(lead.id, "lost");
              }}
              data-testid="btn-discard-lead"
              title="Descartar oportunidade"
              className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-all"
            >
              <ThumbsDown className="h-3.5 w-3.5" />
            </button>
          )}

          {/* Botão de Avanço Rápido de Etapa */}
          {nextStage && onMoveStage && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onMoveStage(lead.id, nextStage);
              }}
              data-testid="btn-advance-stage"
              title="Avançar para a próxima etapa"
              className="flex h-7 items-center gap-0.5 rounded-lg bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/20 px-1.5 text-[10px] font-semibold transition-all"
            >
              <span>Avançar</span>
              <ChevronRight className="h-3 w-3" />
            </button>
          )}

          {/* Botão de WhatsApp Web */}
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            data-testid="btn-whatsapp-lead"
            title="Chamar cliente no WhatsApp"
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-white border border-emerald-500/20 transition-all shadow-sm"
          >
            <MessageCircle className="h-4 w-4" />
          </a>
        </div>
      </div>
    </div>
  );
}
