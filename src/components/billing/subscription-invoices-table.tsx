/**
 * @file subscription-invoices-table.tsx
 * @description Tabela minimalista e responsiva de Histórico de Faturas & Pagamentos (SubscriptionInvoicesTable).
 *
 * Funcionalidades:
 * - Listagem cronológica de faturas/cobranças emitidas via gateway Asaas.
 * - Formatação de datas em padrão brasileiro (DD/MM/YYYY).
 * - Valores formatados em BRL (R$ 597,00).
 * - Badges táteis para formas de pagamento (Pix, Cartão, Boleto).
 * - Badges de status (Pago, Pendente, Vencido).
 * - Ação de download / visualização de comprovante/PDF em nova aba.
 * - Empty state limpo e elegante.
 */

"use client";

import React, { useEffect, useState } from "react";
import {
  FileText,
  Download,
  CreditCard,
  QrCode,
  Barcode,
  Clock,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Receipt,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatToDateBR } from "@/components/billing/subscription-management-card";
import {
  getSubscriptionInvoicesAction,
  type SubscriptionInvoice,
} from "@/app/actions/billing-actions";

export interface SubscriptionInvoicesTableProps {
  organizationId?: string;
  className?: string;
  initialInvoices?: SubscriptionInvoice[];
}

export function SubscriptionInvoicesTable({
  className,
  initialInvoices,
}: SubscriptionInvoicesTableProps) {
  const [invoices, setInvoices] = useState<SubscriptionInvoice[]>(initialInvoices || []);
  const [isLoading, setIsLoading] = useState<boolean>(!initialInvoices);

  useEffect(() => {
    if (initialInvoices) return;

    let isMounted = true;
    getSubscriptionInvoicesAction()
      .then((res) => {
        if (isMounted && res.success && res.data) {
          setInvoices(res.data);
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [initialInvoices]);

  const renderPaymentBadge = (billingType?: string) => {
    const norm = (billingType || "").toUpperCase();
    if (norm.includes("CREDIT") || norm.includes("CARD")) {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-md bg-blue-500/10 px-2 py-0.5 text-xs font-medium text-blue-400 border border-blue-500/20">
          <CreditCard className="h-3 w-3" />
          Cartão
        </span>
      );
    }
    if (norm.includes("BOLETO")) {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-400 border border-amber-500/20">
          <Barcode className="h-3 w-3" />
          Boleto
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-400 border border-emerald-500/20">
        <QrCode className="h-3 w-3" />
        Pix
      </span>
    );
  };

  const renderStatusBadge = (status?: string) => {
    const norm = (status || "").toUpperCase();
    if (norm === "RECEIVED" || norm === "CONFIRMED" || norm === "PAGO") {
      return (
        <Badge
          variant="outline"
          className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs font-medium gap-1"
        >
          <CheckCircle2 className="h-3 w-3" />
          Pago
        </Badge>
      );
    }
    if (norm === "OVERDUE" || norm === "VENCIDO") {
      return (
        <Badge
          variant="outline"
          className="border-red-500/30 bg-red-500/10 text-red-400 text-xs font-medium gap-1"
        >
          <AlertCircle className="h-3 w-3" />
          Vencido
        </Badge>
      );
    }
    return (
      <Badge
        variant="outline"
        className="border-amber-500/30 bg-amber-500/10 text-amber-400 text-xs font-medium gap-1"
      >
        <Clock className="h-3 w-3" />
        Pendente
      </Badge>
    );
  };

  return (
    <div
      data-testid="subscription-invoices-table"
      className={cn(
        "rounded-2xl border border-white/10 bg-[#121218]/80 p-5 sm:p-6 shadow-xl backdrop-blur-sm space-y-4",
        className
      )}
    >
      {/* Cabeçalho da Seção */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-white/10 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-500/10 text-orange-400 border border-orange-500/20">
            <Receipt className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
              Histórico de Faturas & Pagamentos
            </h3>
            <p className="text-xs text-zinc-400">
              Acompanhe todas as cobranças emitidas para sua concessionária.
            </p>
          </div>
        </div>
      </div>

      {/* Tabela de Faturas */}
      {isLoading ? (
        <div className="py-8 text-center text-xs text-zinc-400">
          <Clock className="h-5 w-5 animate-spin mx-auto mb-2 text-orange-400" />
          Carregando histórico de pagamentos...
        </div>
      ) : invoices.length === 0 ? (
        <div
          data-testid="invoices-empty-state"
          className="rounded-xl border border-white/5 bg-zinc-950/40 p-8 text-center space-y-2"
        >
          <FileText className="h-8 w-8 text-zinc-600 mx-auto" />
          <p className="text-sm font-semibold text-zinc-300">Nenhuma fatura anterior registrada.</p>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto">
            Assim que seu primeiro ciclo for faturado ou regularizado, o comprovante e recibo fiscal aparecerão aqui.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/5 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                <th className="pb-3 px-3">Vencimento</th>
                <th className="pb-3 px-3">Valor</th>
                <th className="pb-3 px-3">Forma</th>
                <th className="pb-3 px-3">Status</th>
                <th className="pb-3 px-3 text-right">Comprovante</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {invoices.map((inv) => {
                const targetUrl = inv.receiptUrl || inv.invoiceUrl || inv.bankSlipUrl;
                const formattedValue = new Intl.NumberFormat("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                }).format(inv.value);

                return (
                  <tr key={inv.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 px-3 font-medium text-zinc-200">
                      {formatToDateBR(inv.dueDate)}
                    </td>
                    <td className="py-3 px-3 font-bold text-white tracking-tight">
                      {formattedValue}
                    </td>
                    <td className="py-3 px-3">
                      {renderPaymentBadge(inv.billingType)}
                    </td>
                    <td className="py-3 px-3">
                      {renderStatusBadge(inv.status)}
                    </td>
                    <td className="py-3 px-3 text-right">
                      {targetUrl ? (
                        <Button
                          asChild
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2.5 text-xs text-orange-400 hover:text-orange-300 hover:bg-orange-500/10 gap-1.5"
                        >
                          <a href={targetUrl} target="_blank" rel="noopener noreferrer">
                            <Download className="h-3.5 w-3.5" />
                            <span>PDF / Recibo</span>
                            <ExternalLink className="h-3 w-3 opacity-60" />
                          </a>
                        </Button>
                      ) : (
                        <span className="text-xs text-zinc-500">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
