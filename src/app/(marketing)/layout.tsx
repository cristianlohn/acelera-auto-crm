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

import Image from "next/image";
import Link from "next/link";
import { ShieldCheck, Database, ArrowRight } from "lucide-react";
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
                <Image
                  src="/logo.png"
                  alt="Acelera Auto CRM"
                  width={140}
                  height={36}
                  className="h-8 md:h-9 w-auto object-contain"
                />
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
                  <Link href="/privacidade" className="hover:text-white transition">
                    Conformidade LGPD & Privacidade
                  </Link>
                </li>
                <li>
                  <Link href="/termos" className="hover:text-white transition">
                    Termos de Licenciamento (SaaS)
                  </Link>
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
                  <Link href="/login" className="hover:text-white transition">
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
              © {new Date().getFullYear()} Acelera Auto CRM. Um produto operado por Catuto Soluções Digitais.
            </p>
            <div className="flex gap-4">
              <Link href="/termos" className="hover:text-zinc-300 transition-colors">
                Termos de Uso
              </Link>
              <Link href="/privacidade" className="hover:text-zinc-300 transition-colors">
                Política de Privacidade
              </Link>
              <Link href="/ajuda" className="hover:text-zinc-300 transition-colors">
                Central de Ajuda
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
