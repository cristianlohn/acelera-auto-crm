/**
 * @file subscription-management-card.tsx
 * @description Cockpit de Gestão de Assinatura Ativa (SubscriptionManagementCard).
 *
 * Exibe de forma transparente e destacada:
 * - Status em tempo real (Ativa, Vencida/Inadimplente, Período de Testes).
 * - Ciclo de Faturamento (Mensal vs. Anual com badge de economia).
 * - Valor recorrente consolidado.
 * - Data de ancoragem do próximo vencimento (DD/MM/YYYY) com contador de dias restantes.
 * - Método de pagamento cadastrado (Cartão mascarado, Pix ou Boleto).
 * - Ações contextuais de regularização e troca de plano.
 */

"use client";

import React from "react";
import {
  CreditCard,
  QrCode,
  Barcode,
  Calendar,
  Clock,
  AlertCircle,
  Sparkles,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { SubscriptionOverviewData } from "@/app/actions/billing-actions";

export interface SubscriptionManagementCardProps {
  subscription: SubscriptionOverviewData;
  onChangePlan?: () => void;
  onPayOverdue?: () => void;
  className?: string;
}

/**
 * Formata data ISO ou string YYYY-MM-DD para o padrão brasileiro DD/MM/YYYY.
 */
export function formatToDateBR(dateInput?: string | Date | null): string {
  if (!dateInput) return "--/--/----";
  if (typeof dateInput === "string" && dateInput.includes("-")) {
    const clean = dateInput.split("T")[0];
    const parts = clean.split("-");
    if (parts.length === 3) {
      const [year, month, day] = parts;
      return `${day.padStart(2, "0")}/${month.padStart(2, "0")}/${year}`;
    }
  }
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return "--/--/----";
  return d.toLocaleDateString("pt-BR");
}

export function SubscriptionManagementCard({
  subscription,
  onChangePlan,
  onPayOverdue,
  className,
}: SubscriptionManagementCardProps) {
  const {
    planName,
    status,
    billingCycle,
    price,
    nextDueDate,
    daysRemaining,
    paymentMethod,
  } = subscription;

  const isAnnual = billingCycle === "anual";
  const formattedDueDate = formatToDateBR(nextDueDate);

  const formattedPrice = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(price);

  return (
    <div
      data-testid="subscription-management-card"
      className={cn(
        "relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-zinc-900/90 via-zinc-900/60 to-zinc-950/90 p-6 shadow-2xl backdrop-blur-md",
        status === "overdue" && "border-red-500/30 ring-1 ring-red-500/20",
        className
      )}
    >
      {/* Luz ambiente de fundo */}
      <div className="absolute -top-24 -right-24 h-56 w-56 rounded-full bg-orange-500/10 blur-3xl pointer-events-none" />
      {status === "active" && (
        <div className="absolute -bottom-20 -left-20 h-48 w-48 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
      )}
      {status === "overdue" && (
        <div className="absolute -bottom-20 -left-20 h-48 w-48 rounded-full bg-red-500/15 blur-3xl pointer-events-none" />
      )}

      {/* Cabeçalho do Card */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/10 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Assinatura Vigente
            </span>
            {isAnnual ? (
              <Badge
                variant="outline"
                className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-[11px] font-medium"
              >
                Cobrança Anual (Economia Aplicada)
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="border-blue-500/30 bg-blue-500/10 text-blue-400 text-[11px] font-medium"
              >
                Cobrança Mensal
              </Badge>
            )}
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            {planName}
            {status === "active" && (
              <Sparkles className="h-5 w-5 text-amber-400 fill-amber-400/20" />
            )}
          </h2>
        </div>

        {/* Badge de Status em Tempo Real */}
        <div className="flex items-center gap-2">
          {status === "active" && (
            <div
              data-testid="badge-status-active"
              className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1.5 text-xs font-semibold text-emerald-400"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span>Assinatura Ativa</span>
            </div>
          )}

          {status === "trialing" && (
            <div
              data-testid="badge-status-trialing"
              className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3.5 py-1.5 text-xs font-semibold text-amber-400"
            >
              <Clock className="h-3.5 w-3.5" />
              <span>
                Período de Testes ({daysRemaining !== null ? `${daysRemaining} dias restantes` : "Ativo"})
              </span>
            </div>
          )}

          {status === "overdue" && (
            <div
              data-testid="badge-status-overdue"
              className="inline-flex items-center gap-2 rounded-full border border-red-500/30 bg-red-500/10 px-3.5 py-1.5 text-xs font-semibold text-red-400 animate-pulse"
            >
              <AlertCircle className="h-3.5 w-3.5" />
              <span>Fatura Vencida / Inadimplente</span>
            </div>
          )}

          {(status === "canceled" || status === "inactive") && (
            <div
              data-testid="badge-status-canceled"
              className="inline-flex items-center gap-2 rounded-full border border-zinc-700 bg-zinc-800/80 px-3.5 py-1.5 text-xs font-semibold text-zinc-400"
            >
              <AlertCircle className="h-3.5 w-3.5" />
              <span>Assinatura Suspensa</span>
            </div>
          )}
        </div>
      </div>

      {/* Grid de Informações Financeiras */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 py-6">
        {/* Bloco 1: Valor Recorrente */}
        <div className="rounded-xl border border-white/5 bg-zinc-950/40 p-4 space-y-1">
          <span className="text-xs font-medium text-zinc-400">Valor do Plano</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-extrabold text-white tracking-tight">
              {formattedPrice}
            </span>
            <span className="text-xs text-zinc-400 font-medium">
              / {isAnnual ? "ano" : "mês"}
            </span>
          </div>
          <p className="text-[11px] text-zinc-500">
            {isAnnual ? "Economia de 2 meses grátis inclusa" : "Cobrança recorrente a cada 30 dias"}
          </p>
        </div>

        {/* Bloco 2: Próximo Vencimento / Renovação */}
        <div className="rounded-xl border border-white/5 bg-zinc-950/40 p-4 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">
              {status === "trialing" ? "Expiração do Trial" : "Próxima Renovação"}
            </span>
            <Calendar className="h-4 w-4 text-zinc-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold text-zinc-100">{formattedDueDate}</span>
            {daysRemaining !== null && (
              <span
                className={cn(
                  "text-xs font-semibold",
                  daysRemaining <= 3
                    ? "text-red-400"
                    : daysRemaining <= 7
                    ? "text-amber-400"
                    : "text-emerald-400"
                )}
              >
                {daysRemaining === 0
                  ? "Vence hoje"
                  : daysRemaining === 1
                  ? "Vence amanhã"
                  : `Renova em ${daysRemaining} dias`}
              </span>
            )}
          </div>
          <p className="text-[11px] text-zinc-500">
            Ciclo ancorado na data oficial de vencimento
          </p>
        </div>

        {/* Bloco 3: Forma de Pagamento */}
        <div className="rounded-xl border border-white/5 bg-zinc-950/40 p-4 space-y-1 sm:col-span-2 lg:col-span-1">
          <span className="text-xs font-medium text-zinc-400">Forma de Pagamento</span>
          <div className="flex items-center gap-2.5 pt-0.5">
            {paymentMethod?.type === "credit_card" && (
              <>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 shrink-0">
                  <CreditCard className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-zinc-100 flex items-center gap-1.5">
                    <span>{paymentMethod.brand || "Cartão de Crédito"}</span>
                    <span className="text-xs text-zinc-400">•••• {paymentMethod.last4 || "4242"}</span>
                  </p>
                  <p className="text-[11px] text-emerald-400">Cobrança automática ativa</p>
                </div>
              </>
            )}

            {paymentMethod?.type === "pix" && (
              <>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                  <QrCode className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-zinc-100">Pix Instantâneo</p>
                  <p className="text-[11px] text-zinc-400">QR Code dinâmico emitido a cada ciclo</p>
                </div>
              </>
            )}

            {paymentMethod?.type === "boleto" && (
              <>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
                  <Barcode className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-zinc-100">Boleto Bancário</p>
                  <p className="text-[11px] text-zinc-400">Compensação em até 48 horas úteis</p>
                </div>
              </>
            )}

            {(!paymentMethod || paymentMethod.type === "unknown") && (
              <>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/10 text-orange-400 border border-orange-500/20 shrink-0">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-zinc-100">Gateway Asaas</p>
                  <p className="text-[11px] text-zinc-400">Ambiente seguro com liberação imediata</p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Barra de Ações Contextuais */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-white/10 pt-5">
        <div className="flex items-center gap-2 text-xs text-zinc-400">
          <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>Faturamento gerenciado com segurança via Asaas Pagamentos</span>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {status === "overdue" && onPayOverdue && (
            <Button
              onClick={onPayOverdue}
              data-testid="btn-pay-overdue"
              className="w-full sm:w-auto bg-red-600 hover:bg-red-500 text-white font-semibold shadow-lg shadow-red-950/40 gap-2"
            >
              <AlertCircle className="h-4 w-4" />
              <span>Regularizar Fatura Pendente</span>
            </Button>
          )}

          {onChangePlan && (
            <Button
              onClick={onChangePlan}
              variant={status === "overdue" ? "outline" : "default"}
              data-testid="btn-change-plan"
              className={cn(
                "w-full sm:w-auto gap-2 text-sm font-medium",
                status !== "overdue" &&
                  "bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white shadow-md shadow-orange-950/20"
              )}
            >
              <span>{status === "trialing" ? "Ativar Plano Definitivo" : "Trocar de Plano / Upgrade"}</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
