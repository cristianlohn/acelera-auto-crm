/**
 * @file VerifiedAccountToast.tsx
 * @description Toast de Notificação de Conta/E-mail Verificado com Sucesso.
 *
 * Detecta o parâmetro `verified=true` na URL, exibe uma notificação flutuante
 * estilizada em Verde Esmeralda e remove o parâmetro da URL sem recarregar a página.
 */

"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, X, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export function VerifiedAccountToast() {
  const searchParams = useSearchParams();
  const isVerified = searchParams.get("verified") === "true";
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (isVerified) {
      // Limpa o parâmetro da URL suavemente sem disparar reload
      if (typeof window !== "undefined") {
        const url = new URL(window.location.href);
        url.searchParams.delete("verified");
        window.history.replaceState({}, "", url.pathname + (url.search ? url.search : ""));
      }

      // Auto-dispensa após 6 segundos
      const timer = setTimeout(() => {
        setDismissed(true);
      }, 6000);

      return () => clearTimeout(timer);
    }
  }, [isVerified]);

  if (!isVerified || dismissed) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      id="toast-verified-account"
      className={cn(
        "fixed top-4 right-4 z-50 flex items-start gap-3 max-w-md rounded-2xl border border-emerald-500/40 bg-[#09090b]/95 p-4 text-white shadow-2xl shadow-emerald-950/40 backdrop-blur-md transition-all duration-300 animate-in fade-in slide-in-from-top-4"
      )}
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-inner">
        <CheckCircle2 className="h-5 w-5" />
      </div>

      <div className="flex-1 min-w-0 pt-0.5">
        <div className="flex items-center gap-1.5">
          <p className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
            Verificação Concluída
          </p>
          <Sparkles className="h-3 w-3 text-emerald-400" />
        </div>
        <p className="mt-0.5 text-xs sm:text-sm font-semibold text-zinc-100">
          Conta e e-mail verificados com sucesso!
        </p>
        <p className="text-xs text-zinc-400 mt-0.5 leading-snug">
          Bem-vindo ao Acelera Auto CRM. Seu acesso está liberado.
        </p>
      </div>

      <button
        onClick={() => setDismissed(true)}
        className="shrink-0 text-zinc-400 hover:text-zinc-100 transition-colors p-1 rounded-lg hover:bg-white/10"
        aria-label="Fechar notificação"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
