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

import React from "react";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { UserNav } from "@/components/layout/user-nav";

export interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const navItems: NavItem[] = [
  { href: "/leads", label: "Funil de Vendas", icon: LayoutDashboard },
  { href: "/clients", label: "Clientes", icon: Users },
  { href: "/vehicles", label: "Estoque", icon: Car },
  { href: "/reports", label: "Relatórios", icon: BarChart3 },
  { href: "/settings", label: "Configurações", icon: Settings },
  { href: "/ajuda", label: "Central de Ajuda", icon: HelpCircle },
];

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
  const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      onClick={onClick}
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
  return (
    <aside
      className={cn(
        "hidden lg:flex lg:w-60 lg:flex-col lg:border-r lg:bg-card",
        className
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center border-b px-5">
        <Logo />
      </div>

      {/* Navegação */}
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
        {navItems.map((item) => (
          <NavLink key={item.href} item={item} />
        ))}
      </nav>

      {/* Rodapé com Dados Reais do Usuário e Logout */}
      <UserNav logoutButtonId="btn-logout-sidebar" />
    </aside>
  );
}
