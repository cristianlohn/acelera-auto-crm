/**
 * @file change-plan-modal.tsx
 * @description Modal compacta para Upgrade ou Downgrade de Plano (ChangePlanModal).
 *
 * Funcionalidades:
 * - Exibição comparativa dos 3 planos disponíveis (Starter, Pro, Enterprise).
 * - Identificação visual do plano atualmente contratado com badge "Seu Plano Atual".
 * - Botão de ação dinâmico ("Fazer Upgrade", "Solicitar Downgrade" ou desabilitado para o plano vigente).
 * - Acionamento de checkout ou migração de plano via callback.
 */

"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Zap, Sparkles, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ChangePlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPlan?: string;
  onSelectPlan?: (planId: string) => void;
}

interface PlanOption {
  id: "starter" | "pro" | "enterprise";
  tier: number;
  name: string;
  monthlyPrice: number;
  sellersLimit: string;
  description: string;
  highlights: string[];
}

const PLAN_OPTIONS: PlanOption[] = [
  {
    id: "starter",
    tier: 1,
    name: "Plano Starter",
    monthlyPrice: 297,
    sellersLimit: "Até 3 vendedores",
    description: "Para lojas de entrada iniciando automação comercial",
    highlights: ["Roleta Round-Robin", "Kanban com SLA", "WhatsApp em 1 clique"],
  },
  {
    id: "pro",
    tier: 2,
    name: "Plano Pro",
    monthlyPrice: 597,
    sellersLimit: "Até 8 vendedores",
    description: "Para lojas em expansão com visão executiva e auditoria",
    highlights: ["Cockpit do Gestor", "Roleta Novos & Seminovos", "Auditoria de SLA"],
  },
  {
    id: "enterprise",
    tier: 3,
    name: "Plano Enterprise",
    monthlyPrice: 1297,
    sellersLimit: "Vendedores ilimitados",
    description: "Para redes e grandes concessionárias com múltiplos pátios",
    highlights: ["Múltiplos Pátios & Filiais", "Gerente de Conta Dedicado", "Webhooks & API Custom"],
  },
];

export function ChangePlanModal({
  isOpen,
  onClose,
  currentPlan = "pro",
  onSelectPlan,
}: ChangePlanModalProps) {
  const normCurrent = (currentPlan || "pro").toLowerCase().trim();
  const currentTier =
    normCurrent === "enterprise" ? 3 : normCurrent === "starter" ? 1 : 2;

  const handleAction = (planId: string) => {
    if (onSelectPlan) {
      onSelectPlan(planId);
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        data-testid="change-plan-modal"
        className="max-w-3xl border-white/10 bg-[#0f0f14] text-white p-6 sm:p-8"
      >
        <DialogHeader className="space-y-1.5 text-left border-b border-white/10 pb-4">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-500/10 text-orange-400 border border-orange-500/20">
              <Sparkles className="h-4 w-4" />
            </div>
            <DialogTitle className="text-xl font-bold tracking-tight text-white">
              Trocar de Plano ou Fazer Upgrade
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs sm:text-sm text-zinc-400">
            Selecione o plano ideal para acompanhar o crescimento da sua concessionária.
          </DialogDescription>
        </DialogHeader>

        {/* Grade de Comparação de Planos */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          {PLAN_OPTIONS.map((plan) => {
            const isCurrent = plan.id === normCurrent;
            const isUpgrade = plan.tier > currentTier;

            return (
              <div
                key={plan.id}
                data-testid={`change-plan-card-${plan.id}`}
                className={cn(
                  "relative flex flex-col justify-between rounded-2xl p-5 transition-all",
                  isCurrent
                    ? "border-2 border-emerald-500/60 bg-emerald-950/20 shadow-lg shadow-emerald-950/30"
                    : isUpgrade
                    ? "border border-orange-500/30 bg-gradient-to-b from-orange-950/20 to-zinc-900/40 hover:border-orange-500/50"
                    : "border border-white/10 bg-zinc-900/40 hover:border-white/20"
                )}
              >
                {isCurrent && (
                  <Badge
                    data-testid="badge-current-plan"
                    className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-500 text-zinc-950 text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 shadow-md"
                  >
                    Seu Plano Atual
                  </Badge>
                )}

                <div className="space-y-3">
                  <div>
                    <h4 className="text-base font-bold text-white tracking-tight">{plan.name}</h4>
                    <p className="text-[11px] text-zinc-400 mt-0.5 leading-snug">{plan.description}</p>
                  </div>

                  <div className="inline-flex items-center gap-1.5 rounded-md bg-white/5 px-2 py-0.5 text-[11px] font-semibold text-orange-300 border border-orange-500/20">
                    <Zap className="h-3 w-3 text-orange-400" />
                    <span>{plan.sellersLimit}</span>
                  </div>

                  <div className="pt-2">
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-black text-white">
                        R$ {plan.monthlyPrice.toLocaleString("pt-BR")}
                      </span>
                      <span className="text-[11px] text-zinc-400">/mês</span>
                    </div>
                  </div>

                  <ul className="space-y-2 pt-2 border-t border-white/5 text-[11px] text-zinc-300">
                    {plan.highlights.map((h, i) => (
                      <li key={i} className="flex items-center gap-1.5">
                        <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                        <span>{h}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-5 mt-4 border-t border-white/5">
                  {isCurrent ? (
                    <Button
                      disabled
                      variant="outline"
                      data-testid={`btn-current-${plan.id}`}
                      className="w-full h-9 text-xs font-semibold bg-emerald-500/10 border-emerald-500/30 text-emerald-400 cursor-not-allowed opacity-90"
                    >
                      Plano Atual
                    </Button>
                  ) : isUpgrade ? (
                    <Button
                      onClick={() => handleAction(plan.id)}
                      data-testid={`btn-upgrade-${plan.id}`}
                      className="w-full h-9 text-xs font-bold gap-1.5 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white shadow-md shadow-orange-950/30"
                    >
                      <span>Fazer Upgrade</span>
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </Button>
                  ) : (
                    <Button
                      onClick={() => handleAction(plan.id)}
                      variant="outline"
                      data-testid={`btn-downgrade-${plan.id}`}
                      className="w-full h-9 text-xs font-medium gap-1.5 border-white/10 hover:bg-white/10 text-zinc-300 hover:text-white"
                    >
                      <span>Solicitar Downgrade</span>
                      <ArrowDownRight className="h-3.5 w-3.5 text-zinc-400" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="pt-3 text-center">
          <p className="text-[11px] text-zinc-500">
            A alteração de plano recalcula a vigência e limites de vendedores na roleta imediatamente.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
