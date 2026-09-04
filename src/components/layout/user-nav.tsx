/**
 * @file user-nav.tsx
 * @description Componente de Perfil, Identificação e Logout do Usuário Autenticado.
 *
 * Funcionalidades:
 * - Exibe o nome real do usuário autenticado (profile.full_name -> user_metadata -> prefixo do e-mail -> 'Gestor').
 * - Exibe o e-mail corporativo real do usuário autenticado.
 * - Calcula as iniciais do avatar dinamicamente a partir do nome real.
 * - Integra com o Modo Demonstração (RBAC Simulator) quando isDemoMode for ativo.
 * - Botão de Logout com confirmação visual e transição limpa para /login.
 */

"use client";

import React, { useState, useEffect } from "react";
import { LogOut, TrendingUp } from "lucide-react";
import { useDemoRole } from "@/context/demo-role-context";
import {
  logoutAction,
  getCurrentUserProfileAction,
  type UserProfileInfo,
} from "@/app/actions/auth";
import { isSuperAdmin, normalizeRole } from "@/lib/permissions";
import { ThemeToggle } from "@/components/theme-toggle";
import { SoundToggle } from "@/components/audio/sound-toggle";
import { cn } from "@/lib/utils";

export interface UserNavProps {
  logoutButtonId?: string;
  className?: string;
  initialProfile?: UserProfileInfo | null;
}

export function UserNav({
  logoutButtonId = "btn-logout-sidebar",
  className = "",
  initialProfile,
}: UserNavProps) {
  const { role, sellerName, isDemoMode } = useDemoRole();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [realProfile, setRealProfile] = useState<UserProfileInfo | null>(initialProfile || null);

  // Busca dados reais do usuário autenticado quando não estiver no Modo Demonstração
  useEffect(() => {
    let isMounted = true;
    if (!isDemoMode) {
      getCurrentUserProfileAction()
        .then((info) => {
          if (isMounted) {
            setRealProfile(info);
          }
        })
        .catch(() => {
          // Mantém fallback limpo
        });
    }
    return () => {
      isMounted = false;
    };
  }, [isDemoMode]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logoutAction();
    } finally {
      if (typeof document !== "undefined") {
        document.cookie =
          "acelera_demo_mode=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
        document.cookie =
          "sb-demo-auth=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
        document.cookie =
          "demo_mode=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
        document.cookie =
          "acelera_demo_session=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
        document.cookie =
          "sb-test-user=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
      }
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.href = "/login";
    }
  };

  // Cálculo dinâmico das iniciais do avatar
  const getInitials = (name: string) => {
    return (
      name
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .map((part) => part[0])
        .slice(0, 2)
        .join("")
        .toUpperCase() || "GE"
    );
  };

  // Resolução dinâmica do nome e e-mail:
  // Se for Modo Demonstração -> usa o perfil da persona selecionada no simulador
  // Se for Usuário Real -> usa os dados retornados do Supabase / sessão real (NUNCA nomes mockados)
  const displayName = isDemoMode
    ? sellerName || "Gestor Demonstração"
    : realProfile?.fullName || "Colaborador";

  const displayEmail = isDemoMode
    ? "demo@aceleraautocrm.com.br"
    : realProfile?.email || "";

  const activeRole = isDemoMode ? role : realProfile?.role || "seller";
  const normalized = normalizeRole(activeRole);

  const displayRole =
    normalized === "admin" || normalized === "superadmin"
      ? "Administrador"
      : normalized === "manager"
      ? "Gerente Comercial"
      : "Vendedor";

  return (
    <div className={cn("border-t p-3 space-y-2.5 bg-card/60", className)}>
      <div className="flex items-center gap-2.5 rounded-lg bg-gradient-to-r from-orange-500/10 to-red-500/5 p-2.5 ring-1 ring-orange-500/20">
        <div
          data-testid="user-avatar-initials"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-red-500 text-xs font-bold text-white shadow"
        >
          {getInitials(displayName)}
        </div>
        <div className="flex flex-col min-w-0 flex-1 overflow-hidden">
          <div className="flex items-center gap-1.5 min-w-0">
            <span
              data-testid="user-display-name"
              className="text-slate-900 dark:text-slate-100 font-semibold text-xs truncate max-w-[130px]"
              title={displayName}
            >
              {displayName}
            </span>
            {isSuperAdmin(activeRole) && (
              <span
                data-testid="badge-superadmin-user"
                className="shrink-0 text-[8px] font-black bg-amber-100 dark:bg-amber-500/20 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-500/40 px-1 py-0.5 rounded uppercase tracking-wider leading-none"
              >
                SUPERADMIN
              </span>
            )}
          </div>
          {displayEmail ? (
            <span
              data-testid="user-display-email"
              className="text-slate-600 dark:text-slate-400 text-[10px] truncate max-w-[150px] mt-0.5"
              title={displayEmail}
            >
              {displayEmail}
            </span>
          ) : (
            <span className="text-slate-600 dark:text-slate-400 text-[10px] truncate max-w-[150px] mt-0.5">
              {displayRole} • Ativo
            </span>
          )}
        </div>
        <TrendingUp className="h-3.5 w-3.5 shrink-0 text-orange-500" />
      </div>

      <div className="flex items-center gap-2">
        <ThemeToggle className="flex-1" showLabel={true} />
        <SoundToggle size="icon-sm" />
        <button
          id={logoutButtonId}
          type="button"
          disabled={isLoggingOut}
          onClick={handleLogout}
          className="flex h-9 items-center justify-center gap-1.5 rounded-lg border border-red-200 dark:border-red-800/40 bg-red-50 dark:bg-red-950/40 px-3 text-xs font-medium text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/40 hover:text-red-800 dark:hover:text-red-200 hover:border-red-300 dark:hover:border-red-700/40 transition-all active:scale-[0.98] disabled:opacity-50"
          aria-label="Sair da Conta"
          title="Sair da Conta"
        >
          <LogOut className="h-3.5 w-3.5 shrink-0" />
          <span className="font-semibold">{isLoggingOut ? "..." : "Sair"}</span>
        </button>
      </div>
    </div>
  );
}
