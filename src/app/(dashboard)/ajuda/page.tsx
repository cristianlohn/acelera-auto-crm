/**
 * @file page.tsx
 * @description Central de Ajuda & Guia Rápido do Acelera Auto CRM (/ajuda).
 *
 * Funcionalidades:
 * - Header com busca instantânea e filtros por categorias.
 * - Guia Rápido "Comece por Aqui (3 Passos)".
 * - Accordions explicativos: Funil & SLA, Catálogo de Veículos, Perfis e Permissões (RBAC).
 * - FAQ Automotivo interativo.
 * - Card de Suporte Técnico via WhatsApp.
 */

"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  Search,
  Zap,
  MessageSquare,
  Car,
  Clock,
  HelpCircle,
  ChevronDown,
  ArrowRight,
  Sparkles,
  Users,
  CheckCircle2,
  PhoneCall,
  ExternalLink,
  BookOpen,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Estrutura de Dados dos Tópicos de Ajuda
// ---------------------------------------------------------------------------

interface FaqItem {
  question: string;
  answer: string;
  category: "faq";
  tags: string[];
}

const FAQ_ITEMS: FaqItem[] = [
  {
    question: "Como recuperar um lead marcado como perdido?",
    answer:
      "Acesse o Funil de Vendas ou a listagem de Clientes, utilize o filtro de status 'Perdido' para localizar o lead desejado e clique no botão 'Reativar Lead'. O lead retornará imediatamente à coluna 'Novo Lead' com o temporizador de SLA zerado.",
    category: "faq",
    tags: ["recuperar", "perdido", "reativar", "funil", "lead"],
  },
  {
    question: "O sistema funciona perfeitamente em celulares e tablets?",
    answer:
      "Sim! O Acelera Auto CRM foi projetado com arquitetura 100% Mobile-First e funciona como PWA. Você e seus vendedores podem acessar todas as funções, atualizar o estoque e responder leads direto pelo navegador do celular sem necessidade de instalação pesada.",
    category: "faq",
    tags: ["celular", "mobile", "responsivo", "pwa", "smartphone", "tablet"],
  },
  {
    question: "Como exportar relatórios de vendas e desempenho da equipe?",
    answer:
      "No módulo de Relatórios (/reports), selecione o período desejado (Hoje, 7 dias, 30 dias ou Mês Atual) e clique no botão 'Exportar Relatório' para gerar uma planilha com métricas de conversão, tempo médio de primeiro contato (SLA) e volume financeiro.",
    category: "faq",
    tags: ["exportar", "relatorios", "planilha", "metricas", "desempenho"],
  },
  {
    question: "Como convidar novos vendedores e gerenciar limites do plano?",
    answer:
      "Acesse Configurações (/settings) > aba 'Equipe & Vendedores'. Clique no botão '+ Convidar Vendedor', preencha nome, e-mail e perfil de acesso. Caso atinja o limite de vagas do seu plano contratado, clique em 'Solicitar Vagas Adicionais' para upgrade instantâneo.",
    category: "faq",
    tags: ["equipe", "convidar", "vendedores", "limite", "plano", "vagas"],
  },
];

export default function HelpPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<
    "todos" | "comece" | "sla" | "estoque" | "permissoes" | "faq"
  >("todos");

  // Estado de controle dos accordions (abertos por padrão)
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    sla: true,
    estoque: true,
    permissoes: true,
    faq: true,
  });

  const toggleSection = (key: string) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Filtragem inteligente por busca e categoria
  const normalizedQuery = searchQuery.trim().toLowerCase();

  const isCategoryVisible = useCallback(
    (category: string) => {
      if (activeCategory === "todos") return true;
      return activeCategory === category;
    },
    [activeCategory]
  );

  const matchesSearch = useCallback(
    (text: string, tags: string[] = []) => {
      if (!normalizedQuery) return true;
      return (
        text.toLowerCase().includes(normalizedQuery) ||
        tags.some((tag) => tag.toLowerCase().includes(normalizedQuery))
      );
    },
    [normalizedQuery]
  );

  // Verificação de visibilidade dos blocos
  const showQuickStart =
    isCategoryVisible("comece") &&
    (matchesSearch("como criar seu primeiro lead", ["lead", "criar", "novo"]) ||
      matchesSearch("atendimento em 1 clique via whatsapp", [
        "whatsapp",
        "sla",
        "contato",
      ]) ||
      matchesSearch("cadastrando carros no pátio", [
        "estoque",
        "carros",
        "patio",
        "veiculo",
      ]));

  const showSlaSection =
    isCategoryVisible("sla") &&
    (matchesSearch("funil kanban regras de sla", ["kanban", "sla", "tempo"]) ||
      matchesSearch("verde menos de 15 min", ["verde", "15"]) ||
      matchesSearch("laranja 15 a 60 min", ["laranja", "esfriando"]) ||
      matchesSearch("vermelho mais de 60 min", ["vermelho", "atrasado"]));

  const showEstoqueSection =
    isCategoryVisible("estoque") &&
    (matchesSearch("catálogo de veículos e pátio", ["catalogo", "fotos", "fipe"]) ||
      matchesSearch("baixa automática e ficha técnica", ["baixa", "venda", "ficha"]));

  const showPermissoesSection =
    isCategoryVisible("permissoes") &&
    (matchesSearch("perfis e permissões rbac", ["vendedor", "gerente", "admin", "rbac"]) ||
      matchesSearch("controle de acesso da concessionária", ["proprietario", "acesso"]));

  const filteredFaqs = useMemo(() => {
    if (!isCategoryVisible("faq") && activeCategory !== "todos") return [];
    return FAQ_ITEMS.filter((item) =>
      matchesSearch(`${item.question} ${item.answer}`, item.tags)
    );
  }, [activeCategory, isCategoryVisible, matchesSearch]);

  const hasAnyResults =
    showQuickStart ||
    showSlaSection ||
    showEstoqueSection ||
    showPermissoesSection ||
    filteredFaqs.length > 0;

  return (
    <div className="min-h-full w-full max-w-full bg-[#09090b] text-[#f4f4f5] p-4 sm:p-6 lg:p-8 space-y-8">
      {/* ------------------------------------------------------------------ */}
      {/* Header & Barra de Busca                                            */}
      {/* ------------------------------------------------------------------ */}
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#18181b] via-[#111116] to-[#09090b] p-6 sm:p-8 shadow-xl">
        <div
          className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-orange-500/10 blur-3xl"
          aria-hidden="true"
        />

        <div className="relative z-10 space-y-4 max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-orange-500/30 bg-orange-500/10 px-3 py-1 text-xs font-semibold text-orange-400">
            <BookOpen className="h-3.5 w-3.5" />
            <span>Base de Conhecimento Oficial</span>
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white">
            Central de Ajuda & Guia Rápido
          </h1>

          <p className="text-sm sm:text-base text-zinc-400 leading-relaxed">
            Tudo o que você e sua equipe precisam para dominar o Acelera Auto CRM,
            acelerar o atendimento de leads e multiplicar o giro de estoque.
          </p>

          {/* Campo de Busca Rápida */}
          <div className="relative pt-2">
            <div className="relative flex items-center">
              <Search className="absolute left-3.5 h-5 w-5 text-zinc-400 pointer-events-none" />
              <Input
                type="search"
                id="input-search-help"
                placeholder="Buscar por SLA, WhatsApp, cadastro de veículos, permissões..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-12 pl-11 pr-10 bg-[#09090b]/80 border-white/15 text-white placeholder:text-zinc-500 rounded-xl focus-visible:ring-orange-500 focus-visible:border-orange-500 text-sm shadow-inner"
                aria-label="Buscar tópicos de ajuda"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 p-1 rounded-md text-zinc-400 hover:text-white transition-colors"
                  aria-label="Limpar busca"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Filtros por Categoria (Badges) */}
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <span className="text-xs font-medium text-zinc-500">Filtrar:</span>
            {[
              { id: "todos", label: "Todos os Tópicos" },
              { id: "comece", label: "Comece por Aqui" },
              { id: "sla", label: "Funil & SLA" },
              { id: "estoque", label: "Pátio & Estoque" },
              { id: "permissoes", label: "Perfis & Equipe" },
              { id: "faq", label: "FAQ Automotivo" },
            ].map((cat) => (
              <button
                key={cat.id}
                id={`filter-cat-${cat.id}`}
                aria-label={`Filtrar por ${cat.label}`}
                onClick={() =>
                  setActiveCategory(
                    cat.id as
                      | "todos"
                      | "comece"
                      | "sla"
                      | "estoque"
                      | "permissoes"
                      | "faq"
                  )
                }
                className={cn(
                  "px-3 py-1 rounded-full text-xs font-semibold transition-all border",
                  activeCategory === cat.id
                    ? "bg-orange-500 text-white border-orange-400 shadow-md shadow-orange-500/20"
                    : "bg-zinc-900/80 text-zinc-400 border-white/10 hover:text-white hover:border-white/20"
                )}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Estado Vazio de Busca                                              */}
      {/* ------------------------------------------------------------------ */}
      {!hasAnyResults && (
        <div
          role="status"
          className="rounded-2xl border border-white/10 bg-zinc-950/60 p-12 text-center space-y-4"
        >
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-orange-500/10 text-orange-400">
            <Search className="h-6 w-6" />
          </div>
          <h3 className="text-lg font-bold text-white">
            Nenhum tópico encontrado para &quot;{searchQuery}&quot;
          </h3>
          <p className="text-sm text-zinc-400 max-w-md mx-auto">
            Tente pesquisar por outros termos como &quot;SLA&quot;, &quot;WhatsApp&quot;, &quot;veículo&quot; ou fale com nosso suporte.
          </p>
          <Button
            variant="outline"
            onClick={() => {
              setSearchQuery("");
              setActiveCategory("todos");
            }}
            className="border-white/15 text-white hover:bg-white/5"
          >
            Limpar filtros de busca
          </Button>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* 1. Comece por Aqui (3 Passos Rápidos)                              */}
      {/* ------------------------------------------------------------------ */}
      {showQuickStart && (
        <section className="space-y-4" aria-labelledby="heading-quick-start">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-orange-400" />
            <h2
              id="heading-quick-start"
              className="text-lg sm:text-xl font-bold text-white tracking-tight"
            >
              Comece por Aqui (3 Passos Rápidos)
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
            {/* Passo 1 */}
            <div className="group relative rounded-xl border border-white/10 bg-gradient-to-b from-[#18181b] to-[#101014] p-5 sm:p-6 transition-all duration-200 hover:border-orange-500/40 hover:shadow-lg hover:shadow-orange-500/10">
              <div className="flex items-center justify-between pb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/10 text-orange-400 ring-1 ring-orange-500/20">
                  <Zap className="h-5 w-5 fill-current" />
                </div>
                <Badge variant="outline" className="border-orange-500/30 text-orange-400 font-mono text-[10px]">
                  Passo 1
                </Badge>
              </div>
              <h3 className="text-base font-bold text-white pt-1">
                Como criar seu primeiro lead
              </h3>
              <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed pt-2">
                Clique no botão <span className="text-white font-semibold">&quot;+ Novo Lead&quot;</span> no topo do funil. Preencha nome, WhatsApp e veículo de interesse para ativar o acompanhamento imediato.
              </p>
              <div className="pt-4">
                <Link
                  href="/leads"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-orange-400 hover:text-orange-300 transition-colors"
                >
                  <span>Ir para o Funil</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>

            {/* Passo 2 */}
            <div className="group relative rounded-xl border border-white/10 bg-gradient-to-b from-[#18181b] to-[#101014] p-5 sm:p-6 transition-all duration-200 hover:border-emerald-500/40 hover:shadow-lg hover:shadow-emerald-500/10">
              <div className="flex items-center justify-between pb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20">
                  <MessageSquare className="h-5 w-5" />
                </div>
                <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 font-mono text-[10px]">
                  Passo 2
                </Badge>
              </div>
              <h3 className="text-base font-bold text-white pt-1">
                Atendimento em 1 clique via WhatsApp
              </h3>
              <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed pt-2">
                Abra o card do lead e clique no ícone do WhatsApp. O CRM abre a conversa diretamente com texto pronto e reseta o SLA para garantir velocidade de resposta.
              </p>
              <div className="pt-4">
                <Link
                  href="/leads"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors"
                >
                  <span>Testar SLA no Funil</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>

            {/* Passo 3 */}
            <div className="group relative rounded-xl border border-white/10 bg-gradient-to-b from-[#18181b] to-[#101014] p-5 sm:p-6 transition-all duration-200 hover:border-blue-500/40 hover:shadow-lg hover:shadow-blue-500/10">
              <div className="flex items-center justify-between pb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/20">
                  <Car className="h-5 w-5" />
                </div>
                <Badge variant="outline" className="border-blue-500/30 text-blue-400 font-mono text-[10px]">
                  Passo 3
                </Badge>
              </div>
              <h3 className="text-base font-bold text-white pt-1">
                Cadastrando carros no pátio
              </h3>
              <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed pt-2">
                No menu Estoque, cadastre veículos com foto, quilometragem, placa e preço. Copie fichas técnicas formatadas para enviar ao cliente com 1 clique.
              </p>
              <div className="pt-4">
                <Link
                  href="/vehicles"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-400 hover:text-blue-300 transition-colors"
                >
                  <span>Ver Gestão de Pátio</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* 2. Módulo: Funil Kanban e Regras de SLA                            */}
      {/* ------------------------------------------------------------------ */}
      {showSlaSection && (
        <section className="rounded-xl border border-white/10 bg-[#121216] overflow-hidden">
          <button
            type="button"
            onClick={() => toggleSection("sla")}
            className="w-full flex items-center justify-between p-5 sm:p-6 text-left hover:bg-white/[0.02] transition-colors"
            aria-expanded={openSections.sla}
            aria-controls="content-section-sla"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-500/10 text-orange-400">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white">
                  1. Funil Kanban e Regras de SLA de Atendimento
                </h3>
                <p className="text-xs text-zinc-400">
                  Como monitorar a temperatura do lead e nunca perder vendas por atraso.
                </p>
              </div>
            </div>
            <ChevronDown
              className={cn(
                "h-5 w-5 text-zinc-400 transition-transform duration-200",
                openSections.sla && "rotate-180 text-orange-400"
              )}
            />
          </button>

          {openSections.sla && (
            <div
              id="content-section-sla"
              className="border-t border-white/10 p-5 sm:p-6 space-y-6 bg-[#0c0c10]"
            >
              <p className="text-sm text-zinc-300 leading-relaxed">
                O Acelera Auto CRM calcula em tempo real o tempo decorrido desde o recebimento do lead. Leads que recebem contato rápido possuem até 8x mais probabilidade de fechar negócio.
              </p>

              {/* Grid dos Semáforos de SLA */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* SLA Verde */}
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-3 w-3 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-sm font-bold text-emerald-400">
                      Verde (&lt; 15 minutos)
                    </span>
                  </div>
                  <p className="text-xs text-zinc-300 leading-relaxed">
                    Lead recém-chegado com máxima propensão de conversão. Faça o primeiro contato de imediato para garantir exclusividade antes que o comprador consulte concorrentes.
                  </p>
                </div>

                {/* SLA Laranja */}
                <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-3 w-3 rounded-full bg-amber-400" />
                    <span className="text-sm font-bold text-amber-400">
                      Laranja (15 a 60 minutos)
                    </span>
                  </div>
                  <p className="text-xs text-zinc-300 leading-relaxed">
                    Lead esfriando, prioridade alta de contato. O cliente já iniciou outras pesquisas e necessita de atenção urgente do vendedor responsável.
                  </p>
                </div>

                {/* SLA Vermelho */}
                <div className="rounded-xl border border-red-500/30 bg-red-950/20 p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-3 w-3 rounded-full bg-red-500" />
                    <span className="text-sm font-bold text-red-400">
                      Vermelho (&gt; 60 minutos)
                    </span>
                  </div>
                  <p className="text-xs text-zinc-300 leading-relaxed">
                    Lead atrasado em nível crítico. Dispara alerta nos relatórios para o gerente da loja realizar cobrança imediata ou redistribuir o atendimento.
                  </p>
                </div>
              </div>

              {/* Fases do Funil */}
              <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-4 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                  Fases Padrão do Funil Comercial
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs font-medium">
                  <div className="rounded-lg bg-orange-500/10 border border-orange-500/20 p-2.5 text-orange-400">
                    1. Novo Lead
                  </div>
                  <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-2.5 text-blue-400">
                    2. Em Atendimento
                  </div>
                  <div className="rounded-lg bg-purple-500/10 border border-purple-500/20 p-2.5 text-purple-400">
                    3. Proposta Enviada
                  </div>
                  <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-2.5 text-amber-400">
                    4. Visita / Test Drive
                  </div>
                  <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-2.5 text-emerald-400 col-span-2 sm:col-span-1">
                    5. Venda Fechada 🎉
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* 3. Módulo: Catálogo de Veículos e Gestão de Pátio                   */}
      {/* ------------------------------------------------------------------ */}
      {showEstoqueSection && (
        <section className="rounded-xl border border-white/10 bg-[#121216] overflow-hidden">
          <button
            type="button"
            onClick={() => toggleSection("estoque")}
            className="w-full flex items-center justify-between p-5 sm:p-6 text-left hover:bg-white/[0.02] transition-colors"
            aria-expanded={openSections.estoque}
            aria-controls="content-section-estoque"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400">
                <Car className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white">
                  2. Catálogo de Veículos & Gestão de Pátio
                </h3>
                <p className="text-xs text-zinc-400">
                  Organização de estoque, cópia rápida de ficha técnica e baixa automática.
                </p>
              </div>
            </div>
            <ChevronDown
              className={cn(
                "h-5 w-5 text-zinc-400 transition-transform duration-200",
                openSections.estoque && "rotate-180 text-blue-400"
              )}
            />
          </button>

          {openSections.estoque && (
            <div
              id="content-section-estoque"
              className="border-t border-white/10 p-5 sm:p-6 space-y-4 bg-[#0c0c10]"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 rounded-lg border border-white/5 bg-zinc-900/40 p-4">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    <span>Ficha Técnica Completa & Fotos em Alta</span>
                  </h4>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Cadastre fotos nítidas, ano/modelo, quilometragem, cor, combustível e observações do veículo. Os vendedores podem copiar a ficha completa com 1 clique para enviar direto no WhatsApp do comprador.
                  </p>
                </div>

                <div className="space-y-2 rounded-lg border border-white/5 bg-zinc-900/40 p-4">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    <span>Baixa Automática no Fechamento</span>
                  </h4>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Ao arrastar o lead para a coluna &quot;Vendido / Fechado&quot;, o sistema atualiza automaticamente o status do carro no estoque para &quot;Vendido&quot;, evitando duplicidade de ofertas por outros vendedores.
                  </p>
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* 4. Módulo: Perfis e Permissões (RBAC)                               */}
      {/* ------------------------------------------------------------------ */}
      {showPermissoesSection && (
        <section className="rounded-xl border border-white/10 bg-[#121216] overflow-hidden">
          <button
            type="button"
            onClick={() => toggleSection("permissoes")}
            className="w-full flex items-center justify-between p-5 sm:p-6 text-left hover:bg-white/[0.02] transition-colors"
            aria-expanded={openSections.permissoes}
            aria-controls="content-section-permissoes"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-500/10 text-purple-400">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white">
                  3. Perfis e Permissões de Acesso (RBAC)
                </h3>
                <p className="text-xs text-zinc-400">
                  Isolamento seguro de informações entre Vendedor, Gerente e Administrador.
                </p>
              </div>
            </div>
            <ChevronDown
              className={cn(
                "h-5 w-5 text-zinc-400 transition-transform duration-200",
                openSections.permissoes && "rotate-180 text-purple-400"
              )}
            />
          </button>

          {openSections.permissoes && (
            <div
              id="content-section-permissoes"
              className="border-t border-white/10 p-5 sm:p-6 space-y-4 bg-[#0c0c10]"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Vendedor */}
                <div className="rounded-xl border border-white/10 bg-zinc-900/60 p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="border-blue-500/30 text-blue-400">
                      Vendedor
                    </Badge>
                  </div>
                  <h4 className="text-sm font-bold text-white">Foco em Atendimento</h4>
                  <ul className="text-xs text-zinc-400 space-y-1.5 list-disc list-inside">
                    <li>Visualiza apenas seus próprios leads</li>
                    <li>Acesso completo ao catálogo de estoque</li>
                    <li>Disparo rápido de WhatsApp e registro de notas</li>
                  </ul>
                </div>

                {/* Gerente */}
                <div className="rounded-xl border border-white/10 bg-zinc-900/60 p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="border-purple-500/30 text-purple-400">
                      Gerente Comercial
                    </Badge>
                  </div>
                  <h4 className="text-sm font-bold text-white">Auditoria & SLA</h4>
                  <ul className="text-xs text-zinc-400 space-y-1.5 list-disc list-inside">
                    <li>Visualiza leads de todos os vendedores</li>
                    <li>Redistribuição de leads em tempo real</li>
                    <li>Acompanhamento de relatórios e tempo de resposta</li>
                  </ul>
                </div>

                {/* Administrador / Dono */}
                <div className="rounded-xl border border-white/10 bg-zinc-900/60 p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="border-orange-500/30 text-orange-400">
                      Proprietário / Admin
                    </Badge>
                  </div>
                  <h4 className="text-sm font-bold text-white">Gestão Total do Negócio</h4>
                  <ul className="text-xs text-zinc-400 space-y-1.5 list-disc list-inside">
                    <li>Controle de faturamento e assinaturas</li>
                    <li>Gestão e convite de novos vendedores</li>
                    <li>Configurações de SLA e metas da concessionária</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* 5. Módulo: FAQ Automotivo                                          */}
      {/* ------------------------------------------------------------------ */}
      {filteredFaqs.length > 0 && (
        <section className="rounded-xl border border-white/10 bg-[#121216] overflow-hidden">
          <button
            type="button"
            onClick={() => toggleSection("faq")}
            className="w-full flex items-center justify-between p-5 sm:p-6 text-left hover:bg-white/[0.02] transition-colors"
            aria-expanded={openSections.faq}
            aria-controls="content-section-faq"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
                <HelpCircle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white">
                  4. Perguntas Frequentes (FAQ Automotivo)
                </h3>
                <p className="text-xs text-zinc-400">
                  Dúvidas comuns sobre o dia a dia da revenda e recursos da plataforma.
                </p>
              </div>
            </div>
            <ChevronDown
              className={cn(
                "h-5 w-5 text-zinc-400 transition-transform duration-200",
                openSections.faq && "rotate-180 text-emerald-400"
              )}
            />
          </button>

          {openSections.faq && (
            <div
              id="content-section-faq"
              className="border-t border-white/10 p-5 sm:p-6 space-y-4 bg-[#0c0c10]"
            >
              <div className="space-y-3">
                {filteredFaqs.map((faq, index) => (
                  <div
                    key={index}
                    className="rounded-lg border border-white/5 bg-zinc-900/40 p-4 space-y-2 transition-colors hover:border-white/15"
                  >
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <span className="text-orange-400 font-mono text-xs">P:</span>
                      {faq.question}
                    </h4>
                    <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed pl-4 border-l-2 border-orange-500/30">
                      {faq.answer}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* 6. Card de Suporte Humano Técnico                                  */}
      {/* ------------------------------------------------------------------ */}
      <section className="relative overflow-hidden rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-emerald-950/30 via-zinc-900 to-[#121218] p-6 sm:p-8 shadow-xl">
        <div
          className="pointer-events-none absolute right-0 top-0 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl"
          aria-hidden="true"
        />

        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
              <PhoneCall className="h-3.5 w-3.5" />
              <span>Suporte Especializado</span>
            </div>

            <h3 className="text-xl sm:text-2xl font-extrabold text-white">
              Ainda precisa de ajuda? Fale direto com nosso suporte técnico.
            </h3>

            <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
              Nosso time técnico e especialistas em vendas automotivas estão prontos para ajudar você e sua equipe via WhatsApp.
            </p>
          </div>

          <a
            href="https://wa.me/5511999999999?text=Ol%C3%A1%2C%20preciso%20de%20ajuda%20com%20o%20Acelera%20Auto%20CRM"
            target="_blank"
            rel="noopener noreferrer"
            id="link-suporte-whatsapp"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-emerald-600/30 hover:bg-emerald-500 transition-all hover:scale-105 shrink-0"
          >
            <MessageSquare className="h-4 w-4 fill-white text-white" />
            <span>Falar no WhatsApp</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </section>
    </div>
  );
}
