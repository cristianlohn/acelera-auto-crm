/**
 * @file recommended-actions.tsx
 * @description Componente de Ações Recomendadas do Cockpit com Badges Dinâmicos e Ação Direta.
 */

"use client";

import React from "react";
import Link from "next/link";
import {
  AlertTriangle,
  AlertCircle,
  Flame,
  CheckCircle2,
  Users,
  LayoutDashboard,
  RotateCcw,
  ExternalLink,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { SystemRecommendation } from "@/lib/crm/analytics";

export interface RecommendedActionsProps {
  recommendations?: SystemRecommendation[];
  className?: string;
  onActionClick?: (recommendation: SystemRecommendation) => void;
}

export function RecommendedActions({
  recommendations = [],
  className,
  onActionClick,
}: RecommendedActionsProps) {
  if (!recommendations || recommendations.length === 0) {
    return (
      <div
        data-testid="recommended-actions-empty"
        className={cn(
          "flex flex-col items-center justify-center rounded-xl border border-dashed border-white/10 bg-black/20 p-6 text-center",
          className
        )}
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mb-2">
          <CheckCircle2 className="h-5 w-5" />
        </div>
        <p className="text-xs font-bold text-white">Nenhuma ação crítica pendente</p>
        <p className="text-[11px] text-zinc-400 mt-0.5 max-w-sm">
          Excelente! Toda a equipe comercial está atendendo dentro dos SLAs estabelecidos.
        </p>
      </div>
    );
  }

  const getBadgeStyle = (type: SystemRecommendation["type"]) => {
    switch (type) {
      case "critical":
        return {
          container: "bg-red-500/10 border-red-500/30 text-red-400",
          icon: AlertCircle,
          iconColor: "text-red-400",
          buttonClass:
            "bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white shadow-md shadow-red-500/20",
          tag: "Crítico",
        };
      case "warning":
        return {
          container: "bg-amber-500/10 border-amber-500/30 text-amber-400",
          icon: AlertTriangle,
          iconColor: "text-amber-400",
          buttonClass:
            "bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white shadow-md shadow-amber-500/20",
          tag: "Atenção",
        };
      case "opportunity":
      default:
        return {
          container: "bg-blue-500/10 border-blue-500/30 text-blue-400",
          icon: Flame,
          iconColor: "text-blue-400",
          buttonClass:
            "bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white shadow-md shadow-blue-500/20",
          tag: "Oportunidade",
        };
    }
  };

  const getActionIcon = (actionType: SystemRecommendation["actionType"]) => {
    switch (actionType) {
      case "reassign_roleta":
        return <RotateCcw className="h-3.5 w-3.5" />;
      case "notify_seller":
        return <Users className="h-3.5 w-3.5" />;
      case "filter_kanban":
        return <LayoutDashboard className="h-3.5 w-3.5" />;
      case "pause_seller":
        return <AlertTriangle className="h-3.5 w-3.5" />;
      default:
        return <ExternalLink className="h-3.5 w-3.5" />;
    }
  };

  return (
    <div
      data-testid="recommended-actions-container"
      className={cn("space-y-2.5", className)}
    >
      {recommendations.map((rec) => {
        const style = getBadgeStyle(rec.type);
        const IconComponent = style.icon;

        return (
          <div
            key={rec.id}
            data-testid={`rec-card-${rec.id}`}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-white/5 bg-zinc-900/60 p-3 sm:p-3.5 transition-all hover:bg-zinc-900/90"
          >
            {/* Lado Esquerdo: Ícone, Título e Descrição */}
            <div className="flex items-start sm:items-center gap-3 min-w-0">
              <div
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border",
                  style.container
                )}
              >
                <IconComponent className={cn("h-4 w-4", style.iconColor)} />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-xs sm:text-sm font-bold text-white tracking-tight">
                    {rec.title}
                  </p>
                  <span
                    className={cn(
                      "inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold border",
                      style.container
                    )}
                  >
                    {style.tag}
                  </span>
                  {typeof rec.count === "number" && rec.count > 0 && (
                    <span className="rounded-full bg-white/10 px-2 py-0.2 text-[10px] font-mono text-zinc-300">
                      {rec.count} {rec.count === 1 ? "lead" : "leads"}
                    </span>
                  )}
                </div>
                <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed">
                  {rec.description}
                </p>
              </div>
            </div>

            {/* Lado Direito: Botão de Ação Direta */}
            <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
              {rec.href ? (
                <Button
                  asChild
                  size="sm"
                  data-testid={`btn-rec-action-${rec.id}`}
                  className={cn(
                    "h-8 gap-1.5 px-3 text-xs font-bold transition-all",
                    style.buttonClass
                  )}
                >
                  <Link
                    href={rec.href}
                    onClick={() => onActionClick?.(rec)}
                  >
                    {getActionIcon(rec.actionType)}
                    <span>{rec.actionLabel}</span>
                    <ChevronRight className="h-3 w-3 opacity-70" />
                  </Link>
                </Button>
              ) : (
                <Button
                  size="sm"
                  data-testid={`btn-rec-action-${rec.id}`}
                  onClick={() => onActionClick?.(rec)}
                  className={cn(
                    "h-8 gap-1.5 px-3 text-xs font-bold transition-all",
                    style.buttonClass
                  )}
                >
                  {getActionIcon(rec.actionType)}
                  <span>{rec.actionLabel}</span>
                  <ChevronRight className="h-3 w-3 opacity-70" />
                </Button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
