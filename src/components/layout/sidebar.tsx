/**
 * @file sidebar.tsx
 * @description Sidebar de navegação desktop do Acelera Auto CRM.
 *
 * Renderiza:
 * - Logomarca do CRM.
 * - Links de navegação com indicação da rota ativa.
 * - Rodapé com dados dinâmicos do usuário logado (UserNav) e botão de logout.
 */

"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Car,
  BarChart3,
  Settings,
  HelpCircle,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { UserNav } from "@/components/layout/user-nav";
import { useDemoRole } from "@/context/demo-role-context";
import { getCurrentUserProfileAction } from "@/app/actions/auth";
import {
  canManageTeam,
  canViewExecutiveReports,
  canManageIntegrationsAndBilling,
  isSuperAdmin,
  normalizeRole,
} from "@/lib/permissions";

export interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  target?: string;
  rel?: string;
}

export const navItems: NavItem[] = [
  { href: "/dashboard", label: "Cockpit Geral", icon: BarChart3 },
  { href: "/dashboard/leads", label: "Funil de Vendas", icon: LayoutDashboard },
  { href: "/dashboard/team", label: "Equipe & Roleta", icon: Users },
  { href: "/clients", label: "Clientes", icon: Users },
  { href: "/vehicles", label: "Estoque", icon: Car },
  { href: "/reports", label: "Relatórios", icon: BarChart3 },
  { href: "/settings", label: "Configurações", icon: Settings },
  {
    href: "/ajuda",
    label: "Central de Ajuda",
    icon: HelpCircle,
    target: "_blank",
    rel: "noopener noreferrer",
  },
];

/**
 * Retorna a lista de itens de navegação filtrada estritamente pelo papel do usuário (RBAC).
 */
export function getNavItemsForRole(role?: string | null): NavItem[] {
  const norm = normalizeRole(role);
  const items: NavItem[] = [];

  // Cockpit
  items.push({
    href: "/dashboard",
    label: norm === "seller" ? "Meu Cockpit" : "Cockpit Geral",
    icon: BarChart3,
  });

  // Funil de Vendas / Leads
  items.push({
    href: "/dashboard/leads",
    label: norm === "seller" ? "Meus Leads / Kanban" : "Funil de Vendas",
    icon: LayoutDashboard,
  });

  // Equipe & Roleta (Manager, Admin, Superadmin)
  if (canManageTeam(norm)) {
    items.push({
      href: "/dashboard/team",
      label: "Equipe & Roleta",
      icon: Users,
    });
  }

  // Clientes
  items.push({
    href: "/clients",
    label: "Clientes",
    icon: Users,
  });

  // Estoque
  items.push({
    href: "/vehicles",
    label: "Estoque",
    icon: Car,
  });

  // Relatórios (Manager, Admin, Superadmin)
  if (canViewExecutiveReports(norm)) {
    items.push({
      href: "/reports",
      label: "Relatórios",
      icon: BarChart3,
    });
  }

  // Configurações & Integrações (Admin, Superadmin)
  if (canManageIntegrationsAndBilling(norm)) {
    items.push({
      href: "/settings",
      label: "Configurações",
      icon: Settings,
    });
  }

  // Central de Ajuda (Todos)
  items.push({
    href: "/ajuda",
    label: "Central de Ajuda",
    icon: HelpCircle,
    target: "_blank",
    rel: "noopener noreferrer",
  });

  return items;
}

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center shrink-0", className)}>
      <Image
        src="/logo.png"
        alt="Acelera Auto CRM"
        width={180}
        height={48}
        className="h-10 md:h-12 w-auto object-contain"
        priority
      />
    </div>
  );
}

export function NavLink({
  item,
  onClick,
}: {
  item: NavItem;
  onClick?: () => void;
}) {
  const pathname = usePathname();
  const isActive = (() => {
    if (item.href === "/dashboard") {
      return pathname === "/dashboard";
    }
    if (item.href === "/dashboard/leads" || item.href === "/leads") {
      return (
        pathname === "/dashboard/leads" ||
        pathname.startsWith("/dashboard/leads/") ||
        pathname === "/leads" ||
        pathname.startsWith("/leads/")
      );
    }
    if (item.href === "/clients" || item.href === "/clientes") {
      return (
        pathname === "/clients" ||
        pathname.startsWith("/clients/") ||
        pathname === "/clientes" ||
        pathname.startsWith("/clientes/")
      );
    }
    return pathname === item.href || pathname.startsWith(item.href + "/");
  })();
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      onClick={onClick}
      prefetch={item.target ? undefined : true}
      target={item.target}
      rel={item.rel}
      className={cn(
        "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
        isActive
          ? "bg-gradient-to-r from-orange-500/15 to-red-500/10 text-orange-600 dark:text-orange-400 shadow-sm"
          : "text-muted-foreground hover:bg-accent hover:text-foreground"
      )}
    >
      <Icon
        className={cn(
          "h-4 w-4 shrink-0 transition-colors",
          isActive
            ? "text-orange-500"
            : "text-muted-foreground group-hover:text-foreground"
        )}
      />
      {item.label}
      {isActive && (
        <div className="ml-auto h-1.5 w-1.5 rounded-full bg-orange-500" />
      )}
    </Link>
  );
}

export function Sidebar({ className = "" }: { className?: string }) {
  const { role: demoRole, isDemoMode } = useDemoRole();
  const [realRole, setRealRole] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    if (!isDemoMode) {
      getCurrentUserProfileAction()
        .then((profile) => {
          if (isMounted && profile?.role) {
            setRealRole(profile.role);
          }
        })
        .catch(() => {});
    }
    return () => {
      isMounted = false;
    };
  }, [isDemoMode]);

  const activeRole = isDemoMode ? demoRole : realRole || "admin";
  const isSuper = isSuperAdmin(activeRole);
  const visibleNavItems = getNavItemsForRole(activeRole);

  return (
    <aside
      className={cn(
        "hidden lg:flex lg:w-64 lg:flex-col lg:border-r lg:bg-card",
        className
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center border-b px-5">
        <Logo />
      </div>

      {/* Botão de Destaque Exclusivo do Superadmin */}
      {isSuper && (
        <div className="px-3 pt-3">
          <Link
            href="/superadmin"
            prefetch={true}
            data-testid="btn-superadmin-portal"
            id="btn-superadmin-portal"
            className="flex items-center justify-between gap-2 rounded-xl bg-gradient-to-r from-amber-500/20 via-amber-900/10 to-yellow-500/15 border border-amber-500/40 p-2.5 text-xs font-bold text-amber-400 hover:text-amber-300 hover:border-amber-400 hover:shadow-amber-500/10 transition-all shadow-md group"
          >
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-400 fill-amber-400 group-hover:scale-110 transition-transform" />
              <span>⚡ Painel Superadmin</span>
            </div>
            <span className="text-[10px] bg-amber-500/20 text-amber-300 font-extrabold px-1.5 py-0.5 rounded border border-amber-500/40 uppercase tracking-wider">
              MASTER
            </span>
          </Link>
        </div>
      )}

      {/* Navegação Dinâmica RBAC */}
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3" data-testid="sidebar-nav">
        {visibleNavItems.map((item) => (
          <NavLink key={item.href} item={item} />
        ))}
      </nav>

      {/* Rodapé com Dados Reais do Usuário e Logout */}
      <UserNav logoutButtonId="btn-logout-sidebar" />
    </aside>
  );
}
