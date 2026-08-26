/**
 * @file layout.tsx
 * @description Layout Institucional e Comercial do Acelera Auto CRM ((marketing)).
 *
 * Inclui:
 * - Header fixo com efeito de blur (backdrop-blur) e navegação por âncoras.
 * - Logotipo institucional com ícone de raio ⚡.
 * - Ações no topo: "Entrar no CRM" e "Testar Demonstração Grátis".
 * - Rodapé com informações institucionais, segurança de dados e links rápidos.
 */

import Link from "next/link";
import { Zap, ShieldCheck, Database, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Acelera Auto CRM — O CRM Automotivo de Alta Velocidade",
  description:
    "Acelere o fechamento de vendas de veículos na sua loja ou concessionária com Funil Kanban, integração WhatsApp e gestão de pátio em tempo real.",
};

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-[#09090b] text-[#f4f4f5] antialiased selection:bg-orange-500 selection:text-white flex flex-col">
      {/* ------------------------------------------------------------------ */}
      {/* Header Fixo com Blur                                               */}
      {/* ------------------------------------------------------------------ */}
      <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-[#09090b]/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-3 sm:px-6 lg:px-8">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2 transition-transform hover:scale-105 shrink-0"
            aria-label="Acelera Auto CRM Página Inicial"
          >
            <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 via-orange-600 to-red-600 shadow-lg shadow-orange-500/25 ring-1 ring-orange-400/30 shrink-0">
              <Zap className="h-4 w-4 sm:h-5 sm:w-5 fill-white text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-extrabold tracking-tight text-white sm:text-lg">
                Acelera<span className="text-orange-500">Auto</span>
              </span>
              <span className="hidden sm:inline text-[10px] font-semibold tracking-wider text-muted-foreground uppercase -mt-1">
                CRM Automotivo
              </span>
            </div>
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
            <Link href="/leads" className="hidden sm:inline-block">
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
          </div>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="flex-1">{children}</main>

      {/* ------------------------------------------------------------------ */}
      {/* Footer Institucional                                               */}
      {/* ------------------------------------------------------------------ */}
      <footer className="border-t border-white/10 bg-[#050507] py-12 text-xs text-zinc-400">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
            {/* Coluna 1: Sobre */}
            <div className="space-y-3 md:col-span-1">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-500 text-white font-bold">
                  <Zap className="h-4 w-4 fill-current" />
                </div>
                <span className="text-sm font-bold text-white">
                  Acelera<span className="text-orange-500">Auto</span>
                </span>
              </div>
              <p className="text-zinc-400 leading-relaxed">
                Plataforma de alta performance desenvolvida para acelerar a
                gestão de leads, giro de pátio e produtividade em concessionárias
                e revendas.
              </p>
              <div className="flex items-center gap-2 text-zinc-400 pt-2">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                <span>Criptografia ponta a ponta & RLS</span>
              </div>
            </div>

            {/* Coluna 2: Produto */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Produto
              </h3>
              <ul className="space-y-1.5">
                <li>
                  <a href="#recursos" className="hover:text-white transition">
                    Funil Kanban de Leads
                  </a>
                </li>
                <li>
                  <a href="#recursos" className="hover:text-white transition">
                    Gestão de Estoque e Pátio
                  </a>
                </li>
                <li>
                  <a href="#recursos" className="hover:text-white transition">
                    Integração WhatsApp Direta
                  </a>
                </li>
                <li>
                  <a href="#recursos" className="hover:text-white transition">
                    Relatórios & Indicadores
                  </a>
                </li>
              </ul>
            </div>

            {/* Coluna 3: Empresa & Segurança */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Infraestrutura & Segurança
              </h3>
              <ul className="space-y-1.5">
                <li className="flex items-center gap-1.5">
                  <Database className="h-3.5 w-3.5 text-orange-400" />
                  <span>PostgreSQL & Supabase Realtime</span>
                </li>
                <li>
                  <span className="hover:text-white">Conformidade LGPD</span>
                </li>
                <li>
                  <span className="hover:text-white">SLA de 99.9% em Nuvem</span>
                </li>
                <li>
                  <span className="hover:text-white">Backup Automatizado</span>
                </li>
              </ul>
            </div>

            {/* Coluna 4: Acesso Rápido */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Acesso
              </h3>
              <ul className="space-y-1.5">
                <li>
                  <Link href="/leads" className="hover:text-white transition">
                    Acessar Demonstração Gratuita
                  </Link>
                </li>
                <li>
                  <Link href="/leads" className="hover:text-white transition">
                    Login no Sistema
                  </Link>
                </li>
                <li>
                  <a href="#planos" className="hover:text-white transition">
                    Tabela de Preços
                  </a>
                </li>
                <li>
                  <a href="#calculadora" className="hover:text-white transition">
                    Calculadora de ROI
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-8 border-t border-white/5 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-zinc-400">
            <p>
              © {new Date().getFullYear()} Acelera Auto CRM. Todos os direitos
              reservados.
            </p>
            <div className="flex gap-4">
              <span className="hover:text-zinc-300">Termos de Uso</span>
              <span className="hover:text-zinc-300">Privacidade</span>
              <span className="hover:text-zinc-300">Suporte Técnico</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
