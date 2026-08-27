/**
 * @file marketing-header.tsx
 * @description Header Institucional dinâmico sensível à autenticação do usuário.
 */

"use client";

import React, { useSyncExternalStore } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

export interface MarketingHeaderProps {
  initialAuthenticated?: boolean;
}

function getAuthSnapshot() {
  if (typeof document === "undefined") return false;
  return (
    document.cookie.includes("sb-test-user=true") ||
    document.cookie.includes("acelera_demo_mode=true") ||
    document.cookie.includes("sb-demo-auth=true")
  );
}

function subscribe(callback: () => void) {
  if (typeof window !== "undefined") {
    window.addEventListener("storage", callback);
    return () => window.removeEventListener("storage", callback);
  }
  return () => {};
}

export function MarketingHeader({ initialAuthenticated = false }: MarketingHeaderProps) {
  const hasCookieAuth = useSyncExternalStore(
    subscribe,
    getAuthSnapshot,
    () => false
  );

  const isAuthenticated = initialAuthenticated || hasCookieAuth;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-[#09090b]/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-3 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 transition-transform hover:scale-105 shrink-0"
          aria-label="Acelera Auto CRM Página Inicial"
        >
          <Image
            src="/logo.png"
            alt="Acelera Auto CRM"
            width={180}
            height={48}
            className="h-10 md:h-12 w-auto object-contain"
            priority
          />
        </Link>

        {/* Links de Navegação (Desktop) */}
        <nav
          aria-label="Navegação Principal"
          className="hidden md:flex items-center gap-8 text-sm font-medium text-zinc-300"
        >
          <a
            href="#recursos"
            className="transition-colors hover:text-orange-400"
          >
            Recursos
          </a>
          <a
            href="#como-funciona"
            className="transition-colors hover:text-orange-400"
          >
            Como Funciona
          </a>
          <a
            href="#calculadora"
            className="transition-colors hover:text-orange-400"
          >
            Calculadora
          </a>
          <a
            href="#planos"
            className="transition-colors hover:text-orange-400"
          >
            Planos
          </a>
          <a
            href="#demonstracao"
            className="transition-colors hover:text-orange-400"
          >
            Demonstração
          </a>
        </nav>

        {/* CTAs de Topo */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <ThemeToggle className="bg-white/5 border-white/10 text-white hover:bg-white/10 dark:bg-white/5 dark:border-white/10" />

          {isAuthenticated ? (
            <Link href="/leads">
              <Button
                size="sm"
                className="gap-1.5 sm:gap-2 bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-lg shadow-orange-500/25 hover:from-orange-600 hover:to-red-700 hover:shadow-orange-500/40 text-xs sm:text-sm font-semibold px-3 sm:px-4"
              >
                <span>Voltar ao CRM</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          ) : (
            <>
              <Link href="/login" className="hidden sm:inline-block">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-zinc-300 hover:bg-white/5 hover:text-white text-xs sm:text-sm font-semibold"
                >
                  Entrar no CRM
                </Button>
              </Link>

              <Link href="/leads">
                <Button
                  size="sm"
                  className="gap-1.5 sm:gap-2 bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-lg shadow-orange-500/25 hover:from-orange-600 hover:to-red-700 hover:shadow-orange-500/40 text-xs sm:text-sm font-semibold px-2.5 sm:px-3.5"
                >
                  <span className="sm:hidden">Demonstração</span>
                  <span className="hidden sm:inline">Testar Demonstração Grátis</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
