/**
 * @file RoleSimulatorBar.tsx
 * @description Barra Flutuante Interativa do Simulador de Papéis Demo (RBAC Demo Switcher).
 *
 * Apresenta aos visitantes e avaliadores do SaaS a experiência de alternar instantaneamente
 * as visões de Vendedor, Gerente Comercial e Administrador.
 */

"use client";

import React from "react";
import { Sparkles, User, ShieldCheck, Crown, X, CheckCircle2, LogOut } from "lucide-react";
import { useDemoRole, type DemoRole } from "@/context/demo-role-context";
import { cn } from "@/lib/utils";

const emptySubscribe = () => () => {};

export function RoleSimulatorBar() {
  const { role, setRole, isDemoMode, notification, clearNotification } = useDemoRole();
  const mounted = React.useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  if (!mounted || !isDemoMode) {
    return null;
  }

  const handleExitDemo = () => {
    if (typeof document !== "undefined") {
      document.cookie =
        "acelera_demo_mode=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
      document.cookie =
        "sb-demo-auth=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
      document.cookie =
        "demo_mode=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
      document.cookie =
        "acelera_demo_session=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
    }
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = "/login";
  };

  const rolesList: {
    id: DemoRole;
    label: string;
    shortLabel: string;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    {
      id: "vendedor",
      label: "👤 Vendedor (Rafael Alves)",
      shortLabel: "Vendedor",
      icon: User,
    },
    {
      id: "gerente",
      label: "👔 Gerente Comercial",
      shortLabel: "Gerente",
      icon: ShieldCheck,
    },
    {
      id: "admin",
      label: "⚡ Admin (Dono da Loja)",
      shortLabel: "Admin",
      icon: Crown,
    },
  ];

  return (
    <div
      id="rbac-role-simulator"
      aria-label="Simulador de Papéis Demo"
      className="w-full border-b border-orange-500/20 bg-gradient-to-r from-orange-500/10 via-amber-500/5 to-orange-500/10 px-4 py-2.5 backdrop-blur-md dark:from-orange-950/40 dark:via-background dark:to-orange-950/40"
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        {/* Badge e Descritivo */}
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-orange-500 text-white shadow-sm shadow-orange-500/30">
            <Sparkles className="h-3.5 w-3.5" />
          </span>
          <div className="flex flex-col">
            <span className="text-xs font-bold text-foreground">
              🎭 Modo Demonstração Interativo
            </span>
            <span className="text-[11px] text-muted-foreground hidden sm:inline">
              Experimente as permissões de acesso da plataforma:
            </span>
          </div>
        </div>

        {/* Botões de Alternância de Papéis & Botão Sair da Demo */}
        <div
          role="group"
          aria-label="Selecionar Perfil de Acesso Demo"
          className="flex flex-wrap items-center gap-1.5"
        >
          {rolesList.map((item) => {
            const isActive = role === item.id;
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                type="button"
                id={`role-btn-${item.id}`}
                onClick={() => setRole(item.id)}
                aria-pressed={isActive}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all duration-200 active:scale-95 whitespace-nowrap",
                  isActive
                    ? "bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-sm shadow-orange-500/30 ring-2 ring-orange-500/30"
                    : "bg-background/80 text-muted-foreground border border-border/60 hover:bg-accent hover:text-foreground"
                )}
              >
                <Icon className={cn("h-3.5 w-3.5", isActive ? "text-white" : "text-orange-500")} />
                <span>{item.label}</span>
              </button>
            );
          })}

          <button
            type="button"
            id="btn-exit-demo"
            data-testid="btn-exit-demo"
            onClick={handleExitDemo}
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 transition-all active:scale-95 whitespace-nowrap ml-1 cursor-pointer"
            aria-label="Sair da Demonstração"
          >
            <LogOut className="h-3.5 w-3.5 shrink-0" />
            <span>Sair da Demonstração</span>
          </button>
        </div>
      </div>

      {/* Toast / Feedback Informativo */}
      {notification && (
        <div
          role="status"
          className="mt-2 flex items-center justify-between gap-2 rounded-lg bg-orange-100/90 dark:bg-orange-950/60 px-3 py-1.5 text-xs text-orange-900 dark:text-orange-200 border border-orange-200 dark:border-orange-800/60 animate-in fade-in slide-in-from-top-1"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-3.5 w-3.5 text-orange-600 dark:text-orange-400 shrink-0" />
            <span className="font-medium">{notification}</span>
          </div>
          <button
            type="button"
            onClick={clearNotification}
            aria-label="Fechar notificação"
            className="rounded p-0.5 text-orange-700 hover:bg-orange-200/60 dark:text-orange-300 dark:hover:bg-orange-900/60"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  );
}
