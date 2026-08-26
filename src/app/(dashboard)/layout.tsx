/**
 * @file layout.tsx
 * @description Layout responsivo para as páginas do dashboard do Acelera Auto CRM.
 *
 * Implementa:
 * - Sidebar de navegação lateral (desktop ≥ lg)
 * - Header com menu retrátil via Sheet (mobile)
 * - Paleta de cores e gradientes da identidade Acelera Auto
 */

"use client";

import React, { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Car,
  BarChart3,
  Settings,
  Menu,
  Phone,
  TrendingUp,
  HelpCircle,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DemoRoleProvider } from "@/context/demo-role-context";
import { RoleSimulatorBar } from "@/components/demo/RoleSimulatorBar";
import { GuidedTour } from "@/components/demo/GuidedTour";
import { VerifiedAccountToast } from "@/components/dashboard/VerifiedAccountToast";

// ---------------------------------------------------------------------------
// Configuração dos itens de navegação
// ---------------------------------------------------------------------------

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
  { href: "/leads", label: "Funil de Vendas", icon: LayoutDashboard },
  { href: "/clients", label: "Clientes", icon: Users },
  { href: "/vehicles", label: "Estoque", icon: Car },
  { href: "/reports", label: "Relatórios", icon: BarChart3 },
  { href: "/settings", label: "Configurações", icon: Settings },
  { href: "/ajuda", label: "Central de Ajuda", icon: HelpCircle },
];

// ---------------------------------------------------------------------------
// Componente: Logo
// ---------------------------------------------------------------------------

function Logo({ className }: { className?: string }) {
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

// ---------------------------------------------------------------------------
// Componente: Link de navegação
// ---------------------------------------------------------------------------

function NavLink({
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

// ---------------------------------------------------------------------------
// Componente: Sidebar (desktop)
// ---------------------------------------------------------------------------

function Sidebar() {
  return (
    <aside className="hidden lg:flex lg:w-60 lg:flex-col lg:border-r lg:bg-card">
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

      {/* Rodapé da sidebar */}
      <div className="border-t p-4">
        <div className="flex items-center gap-3 rounded-lg bg-gradient-to-r from-orange-500/10 to-red-500/5 px-3 py-3 ring-1 ring-orange-500/20">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-red-500 text-xs font-bold text-white shadow">
            LA
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-foreground">Loja Principal</p>
            <p className="truncate text-[10px] text-muted-foreground">Plano Pro • Ativo</p>
          </div>
          <TrendingUp className="h-3.5 w-3.5 shrink-0 text-orange-500" />
        </div>
      </div>
    </aside>
  );
}

// ---------------------------------------------------------------------------
// Componente: Header (mobile)
// ---------------------------------------------------------------------------

function MobileHeader() {
  return (
    <header className="flex h-14 items-center justify-between border-b bg-card/80 px-4 backdrop-blur-sm lg:hidden">
      {/* Menu sheet */}
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label="Abrir menu">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 p-0">
          <SheetHeader className="border-b px-5 py-4">
            <SheetTitle className="sr-only">Menu de navegação</SheetTitle>
            <Logo />
          </SheetHeader>
          <nav className="flex flex-col gap-1 p-3">
            {navItems.map((item) => (
              <NavLink key={item.href} item={item} />
            ))}
          </nav>
          <div className="border-t p-4">
            <div className="flex items-center gap-3 rounded-lg bg-gradient-to-r from-orange-500/10 to-red-500/5 px-3 py-3 ring-1 ring-orange-500/20">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-red-500 text-xs font-bold text-white shadow">
                LA
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-foreground">Loja Principal</p>
                <p className="truncate text-[10px] text-muted-foreground">Plano Pro • Ativo</p>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Logo centralizado no mobile */}
      <Logo />

      {/* Ação rápida */}
      <Button variant="ghost" size="icon-sm" aria-label="Ligar para lead">
        <Phone className="h-4 w-4" />
      </Button>
    </header>
  );
}

// ---------------------------------------------------------------------------
// Layout principal
// ---------------------------------------------------------------------------

export default function DashboardLayout(props: { children: React.ReactNode }) {
  return (
    <DemoRoleProvider>
      <Suspense fallback={null}>
        <VerifiedAccountToast />
      </Suspense>
      <div className="flex h-full min-h-screen w-full max-w-full overflow-x-hidden flex-col lg:flex-row">
        <Sidebar />

        <div className="flex flex-1 flex-col w-full max-w-full overflow-hidden">
          <RoleSimulatorBar />
          <MobileHeader />
          <main className="flex-1 w-full max-w-full overflow-y-auto bg-background">
            {props.children}
          </main>
        </div>
      </div>
      <GuidedTour />
    </DemoRoleProvider>
  );
}
