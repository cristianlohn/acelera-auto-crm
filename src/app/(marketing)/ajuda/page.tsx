/**
 * @file page.tsx
 * @description Central de Ajuda & FAQ Público do Acelera Auto CRM (/ajuda).
 *
 * Funcionalidades:
 * - Header com busca instantânea e filtros por categorias.
 * - Guia de Início Rápido em 3 Passos.
 * - Respostas Comerciais e Técnicas Estruturadas (Roleta de Vendedores, ERPs Legados, Estoque/CSV, LGPD).
 * - Canais de Suporte Direto e Integração.
 */

"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Search,
  ChevronDown,
  Sparkles,
  MessageCircle,
  Cpu,
  Layers,
  ShieldCheck,
  Zap,
  Mail,
  FileCode2,
  CheckCircle2,
  BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { FAQ_QUESTIONS } from "@/components/landing/FAQSection";

const HELP_CATEGORIES = [
  { id: "todos", label: "Todas as Dúvidas", icon: Sparkles },
  { id: "roleta", label: "Atendimento & Roleta", icon: MessageCircle },
  { id: "erps", label: "ERPs & Webhooks", icon: Cpu },
  { id: "estoque", label: "Estoque & Fotos", icon: Layers },
  { id: "seguranca", label: "Segurança & LGPD", icon: ShieldCheck },
];

export default function MarketingHelpPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("todos");
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({
    "faq-roleta-1": true,
    "faq-roleta-2": true,
    "faq-erps-1": true,
  });

  const toggleItem = (id: string) => {
    setOpenItems((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredQuestions = useMemo(() => {
    return FAQ_QUESTIONS.filter((item) => {
      const matchCategory =
        selectedCategory === "todos" || item.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        item.question.toLowerCase().includes(q) ||
        item.answer.toLowerCase().includes(q) ||
        item.categoryLabel.toLowerCase().includes(q);

      return matchCategory && matchSearch;
    });
  }, [selectedCategory, searchQuery]);

  return (
    <div className="min-h-screen bg-[#09090b] text-white py-12 sm:py-20">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        {/* Cabeçalho da Central de Ajuda */}
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full border border-orange-500/30 bg-orange-500/10 px-4 py-1 text-xs font-semibold text-orange-400">
            <BookOpen className="h-3.5 w-3.5" />
            Base de Conhecimento & Suporte
          </div>
          <h1 className="mt-4 text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
            Central de Ajuda & Guia Comercial
          </h1>
          <p className="mt-3 text-sm sm:text-base text-zinc-400">
            Respostas completas sobre a operação do Acelera Auto CRM, automação de WhatsApp, integração com ERPs e segurança.
          </p>

          {/* Barra de Busca Instantânea */}
          <div className="mt-8 max-w-lg mx-auto relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <Input
              id="help-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Digite sua dúvida (ex: roleta, ERP Altimus, webhook, LGPD)..."
              className="pl-11 pr-4 bg-zinc-900/90 border-zinc-800 text-white placeholder:text-zinc-500 focus-visible:ring-orange-500 h-12 rounded-2xl text-sm"
              aria-label="Buscar na central de ajuda"
            />
          </div>
        </div>

        {/* Guia Rápido de 3 Passos */}
        <div className="mt-12 rounded-3xl border border-white/10 bg-gradient-to-b from-zinc-900/80 to-zinc-950 p-6 sm:p-8 shadow-xl">
          <div className="flex items-center gap-2.5 mb-6">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-orange-500 text-white">
              <Zap className="h-4 w-4" />
            </div>
            <h2 className="text-lg font-bold text-white">
              Como começar em menos de 15 minutos
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
              <div className="flex items-center gap-2 text-xs font-bold text-orange-400 mb-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-orange-500/20 text-[11px]">
                  1
                </span>
                <span>Conectar Webhook de Leads</span>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Integre seu site, formulários ou portais automotivos via API Key para inserção automática no funil.
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
              <div className="flex items-center gap-2 text-xs font-bold text-orange-400 mb-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-orange-500/20 text-[11px]">
                  2
                </span>
                <span>Cadastrar Equipe & Roleta</span>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Adicione seus vendedores para que a distribuição sequencial (Round-Robin) passe a direcionar leads no WhatsApp.
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
              <div className="flex items-center gap-2 text-xs font-bold text-orange-400 mb-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-orange-500/20 text-[11px]">
                  3
                </span>
                <span>Importar Estoque (CSV)</span>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Suba sua planilha modelo com veículos, preços e fotos para envio ágil em 1 clique durante o atendimento.
              </p>
            </div>
          </div>
        </div>

        {/* Filtros de Categoria */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-2">
          {HELP_CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-medium transition-all",
                  isSelected
                    ? "bg-orange-500 text-white shadow-lg shadow-orange-500/25"
                    : "bg-zinc-900 text-zinc-400 border border-zinc-800 hover:border-zinc-700 hover:text-white"
                )}
                aria-pressed={isSelected}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tópicos de Ajuda / FAQ Accordion */}
        <div className="mt-8 space-y-3">
          {filteredQuestions.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-zinc-800 rounded-2xl bg-zinc-950 p-6">
              <p className="text-sm text-zinc-400">
                Nenhum tópico encontrado para &ldquo;{searchQuery}&rdquo;.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCategory("todos");
                }}
                className="mt-3 text-xs border-zinc-700"
              >
                Ver todas as perguntas
              </Button>
            </div>
          ) : (
            filteredQuestions.map((item) => {
              const isOpen = Boolean(openItems[item.id]);
              return (
                <article
                  key={item.id}
                  className={cn(
                    "rounded-2xl border transition-all duration-200 overflow-hidden",
                    isOpen
                      ? "border-orange-500/40 bg-zinc-900/80 shadow-lg shadow-orange-950/20"
                      : "border-zinc-800/80 bg-zinc-950/60 hover:border-zinc-700 hover:bg-zinc-900/40"
                  )}
                >
                  <button
                    id={`help-btn-${item.id}`}
                    onClick={() => toggleItem(item.id)}
                    className="w-full flex items-center justify-between p-5 text-left text-white gap-3 transition-colors"
                    aria-expanded={isOpen}
                    aria-controls={`help-content-${item.id}`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="shrink-0 flex h-6 w-6 items-center justify-center rounded-lg bg-orange-500/10 text-orange-400 text-xs font-bold border border-orange-500/20">
                        ?
                      </span>
                      <div>
                        <span className="text-sm sm:text-base font-semibold text-zinc-100 leading-snug">
                          {item.question}
                        </span>
                        <span className="ml-2 text-[10px] uppercase font-bold text-orange-400/80 tracking-wider">
                          [{item.categoryLabel}]
                        </span>
                      </div>
                    </div>
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 shrink-0 text-zinc-400 transition-transform duration-200",
                        isOpen && "rotate-180 text-orange-400"
                      )}
                    />
                  </button>

                  {isOpen && (
                    <div
                      id={`help-content-${item.id}`}
                      className="px-5 pb-5 pt-0 border-t border-zinc-800/60 mt-1"
                    >
                      <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed pt-3">
                        {item.answer}
                      </p>
                      {item.highlight && (
                        <div className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-orange-500/10 px-3 py-1.5 text-xs font-medium text-orange-300 border border-orange-500/20">
                          <CheckCircle2 className="h-3.5 w-3.5 text-orange-400 shrink-0" />
                          <span>{item.highlight}</span>
                        </div>
                      )}
                    </div>
                  )}
                </article>
              );
            })
          )}
        </div>

        {/* Canais de Atendimento e Suporte Direto */}
        <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5 flex flex-col justify-between">
            <div>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-green-500/10 text-green-400 mb-3 border border-green-500/20">
                <MessageCircle className="h-4 w-4" />
              </div>
              <h3 className="text-sm font-bold text-white">Suporte via WhatsApp</h3>
              <p className="mt-1 text-xs text-zinc-400">
                Fale com nossos especialistas em implantação e tire dúvidas em tempo real.
              </p>
            </div>
            <a
              href="https://wa.me/5511988887777?text=Ol%C3%A1%2C%20preciso%20de%20ajuda%20com%20o%20Acelera%20Auto%20CRM"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4"
            >
              <Button size="sm" className="w-full bg-green-600 hover:bg-green-500 text-xs">
                Chamar no WhatsApp
              </Button>
            </a>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5 flex flex-col justify-between">
            <div>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400 mb-3 border border-blue-500/20">
                <Mail className="h-4 w-4" />
              </div>
              <h3 className="text-sm font-bold text-white">E-mail Oficial</h3>
              <p className="mt-1 text-xs text-zinc-400">
                Envie suas solicitações de suporte, contratos e dúvidas técnicas para a nossa equipe.
              </p>
            </div>
            <a href="mailto:contato@aceleraautocrm.com.br" className="mt-4">
              <Button variant="outline" size="sm" className="w-full border-zinc-700 text-xs">
                contato@aceleraautocrm.com.br
              </Button>
            </a>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5 flex flex-col justify-between">
            <div>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500/10 text-orange-400 mb-3 border border-orange-500/20">
                <FileCode2 className="h-4 w-4" />
              </div>
              <h3 className="text-sm font-bold text-white">Documentação de API</h3>
              <p className="mt-1 text-xs text-zinc-400">
                Consulte as especificações do webhook para conectar seus sistemas externos.
              </p>
            </div>
            <Link href="/configuracoes" className="mt-4">
              <Button variant="outline" size="sm" className="w-full border-zinc-700 text-xs text-white hover:bg-zinc-800">
                Ver Guia de Webhook
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
