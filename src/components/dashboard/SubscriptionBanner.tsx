/**
 * @file SubscriptionBanner.tsx
 * @description Banner Dinâmico de Ciclo de Vida da Assinatura (Trial Ativo e Alerta de Inadimplência).
 *
 * Renderiza avisos contextuais no topo do dashboard:
 * - TRIAL_ACTIVE: Notificação de dias restantes de teste grátis com CTA de contratação.
 * - PAST_DUE_GRACE: Alerta âmbar/vermelho sobre pendência financeira.
 */

"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Clock, AlertTriangle, ArrowRight, X } from "lucide-react";
import type { OrganizationAccessStatus } from "@/lib/auth/subscription";
import { getSubscriptionStatusAction } from "@/app/actions/auth";
import { useDemoRole } from "@/context/demo-role-context";
import { isSuperAdmin } from "@/lib/permissions";

interface SubscriptionBannerProps {
  status?: OrganizationAccessStatus;
}

export function SubscriptionBanner({ status: initialStatus }: SubscriptionBannerProps) {
  const { role } = useDemoRole();
  const [dismissed, setDismissed] = useState(false);
  const [accessStatus, setAccessStatus] = useState<OrganizationAccessStatus | undefined>(
    initialStatus
  );

  useEffect(() => {
    if (initialStatus) {
      return;
    }

    let isMounted = true;
    getSubscriptionStatusAction()
      .then((res) => {
        if (isMounted) {
          setAccessStatus(res);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [initialStatus]);

  if (dismissed || isSuperAdmin(role)) return null;

  const currentStatus = initialStatus || accessStatus;
  if (
    !currentStatus ||
    currentStatus.reason === "SUPERADMIN_BYPASS" ||
    currentStatus.reason === "ACTIVE_SUBSCRIPTION"
  ) {
    return null;
  }

  // Estado 1: Período de Testes Ativo (Trial)
  if (currentStatus.reason === "TRIAL_ACTIVE") {
    const days = currentStatus.daysRemaining ?? 14;
    return (
      <aside
        aria-label="Aviso de Período de Testes"
        className="relative z-20 flex items-center justify-between gap-3 border-b border-orange-500/20 bg-gradient-to-r from-orange-950/40 via-[#131118] to-orange-950/30 px-4 py-2 text-xs text-orange-200 backdrop-blur-sm"
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-orange-500/20 text-orange-400">
            <Clock className="h-3 w-3" />
          </div>
          <p className="truncate">
            <span className="font-semibold text-white">Período de Testes:</span>{" "}
            {days === 0 ? (
              <strong className="text-orange-400 font-bold">Último dia de teste</strong>
            ) : days === 1 ? (
              <>
                Resta <strong className="text-orange-400 font-bold">1 dia</strong>
              </>
            ) : (
              <>
                Restam <strong className="text-orange-400 font-bold">{days} dias</strong>
              </>
            )}{" "}
            gratuitos para acelerar suas vendas.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/billing"
            className="inline-flex items-center gap-1 rounded-lg bg-gradient-to-r from-orange-500 to-red-600 px-2.5 py-1 text-[11px] font-bold text-white shadow-sm shadow-orange-500/20 hover:from-orange-600 hover:to-red-700 transition-all hover:scale-105"
          >
            <span>Ativar Plano Definitivo</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
          <button
            onClick={() => setDismissed(true)}
            className="text-orange-400/70 hover:text-orange-300 p-1 rounded-md transition-colors"
            aria-label="Fechar banner de trial"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </aside>
    );
  }

  // Estado 2: Inadimplência em Período de Tolerância (Past Due)
  if (currentStatus.reason === "PAST_DUE_GRACE") {
    return (
      <aside
        aria-label="Alerta de Pagamento Pendente"
        className="relative z-20 flex items-center justify-between gap-3 border-b border-amber-500/30 bg-gradient-to-r from-amber-950/60 via-[#18130e] to-red-950/50 px-4 py-2 text-xs text-amber-200 backdrop-blur-sm"
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-amber-400">
            <AlertTriangle className="h-3 w-3" />
          </div>
          <p className="truncate">
            <span className="font-semibold text-amber-300">Pendência Financeira:</span> Houve uma falha no processamento da sua última fatura. Atualize seus dados para manter os serviços ativos.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/billing"
            className="inline-flex items-center gap-1 rounded-lg bg-amber-500 px-2.5 py-1 text-[11px] font-bold text-zinc-950 hover:bg-amber-400 transition-all"
          >
            <span>Regularizar Agora</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </aside>
    );
  }

  return null;
}
