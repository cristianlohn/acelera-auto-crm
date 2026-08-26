/**
 * @file FAQSection.tsx
 * @description Seção de Perguntas Frequentes (FAQ) Interativa e Acessível para a Landing Page.
 *
 * Tópicos Abordados:
 * 1. Atendimento, WhatsApp & Roleta de Vendedores.
 * 2. Compatibilidade com ERPs Legados (Altimus, DMSs de Mercado).
 * 3. Estoque, Importação e Fotos.
 * 4. Segurança, LGPD e Contratos.
 */

"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  HelpCircle,
  ChevronDown,
  MessageCircle,
  Cpu,
  Layers,
  ShieldCheck,
  Search,
  Sparkles,
  ArrowRight,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface FaqQuestionItem {
  id: string;
  category: "roleta" | "erps" | "estoque" | "seguranca";
  categoryLabel: string;
  question: string;
  answer: string;
  highlight?: string;
}

export const FAQ_QUESTIONS: FaqQuestionItem[] = [
  // 1. Atendimento, WhatsApp & Roleta de Vendedores
  {
    id: "faq-roleta-1",
    category: "roleta",
    categoryLabel: "Atendimento & Roleta",
    question: "Como funciona a Roleta Automática (Round-Robin) na distribuição de leads?",
    answer:
      "O Acelera Auto CRM distribui automaticamente novos leads recebidos via Webhooks (Webmotors, iCarros, Meta Ads, Site da Loja) de forma sequencial e balanceada entre os vendedores ativos da loja. Caso algum vendedor esteja indisponível ou fora do expediente, o gestor pode atribuir manualmente ou direcionar para a fila de triagem geral.",
    highlight: "Distribuição balanceada em tempo real com semáforo de SLA.",
  },
  {
    id: "faq-roleta-2",
    category: "roleta",
    categoryLabel: "Atendimento & Roleta",
    question: "Como cadastrar leads que chegam diretamente no WhatsApp particular do vendedor ou do dono?",
    answer:
      "No Funil Kanban, basta clicar em '+ Novo Lead' e selecionar as origens especiais 'Indicação do Dono', 'Cliente de Carteira' ou 'Pátio / Balcão'. O lead entra instantaneamente no funil com o semáforo de SLA ativo para início do atendimento formal.",
    highlight: "Sem perda de negócios que chegam fora dos canais tradicionais.",
  },
  {
    id: "faq-roleta-3",
    category: "roleta",
    categoryLabel: "Atendimento & Roleta",
    question: "Como o painel 'Dinheiro na Mesa' combate a perda de vendas por lentidão?",
    answer:
      "O cockpit executivo do gestor rastreia gargalos operacionais em tempo real: leads sem primeiro contato além do SLA (🔴 SLA Estourado >15 min), propostas enviadas sem follow-up (🟠 >24h) e clientes aguardando resposta de financiamento (🟡 >48h), com disparo de cobrança com 1 clique para o WhatsApp do vendedor responsável.",
    highlight: "Disparo de cobrança via WhatsApp em 1 clique pelo gestor.",
  },

  // 2. Compatibilidade com ERPs Legados
  {
    id: "faq-erps-1",
    category: "erps",
    categoryLabel: "ERPs & Webhooks",
    question: "Preciso trocar o sistema fiscal/financeiro ou ERP que minha loja já usa (ex: Altimus, AutoCon, NBS)?",
    answer:
      "Não! O Acelera Auto CRM opera como uma camada especializada de alta velocidade para atendimento comercial e conversão de leads, convivendo em harmonia com seu ERP de emissão de NF-e, contratos e gestão contábil. Nenhum processo fiscal precisa ser alterado.",
    highlight: "Operação conjunta e sem fricção com seus sistemas legados.",
  },
  {
    id: "faq-erps-2",
    category: "erps",
    categoryLabel: "ERPs & Webhooks",
    question: "Como conectar campanhas de tráfego pago (Meta Ads, Google) e portais ao Acelera Auto?",
    answer:
      "Através do nosso endpoint seguro de Webhook (/api/webhooks/leads) e chave de API dedicada da sua loja. Você pode integrar diretamente via Zapier, Make, n8n, formulários do site ou integradores de portais automotivos enviando um simples POST em JSON com os dados do lead.",
    highlight: "Webhook nativo JSON autenticado por Header e chave de API.",
  },

  // 3. Estoque, Importação e Fotos
  {
    id: "faq-estoque-1",
    category: "estoque",
    categoryLabel: "Estoque & Fotos",
    question: "Como funciona a importação em lote do estoque de veículos da minha loja?",
    answer:
      "Disponibilizamos uma planilha modelo padrão (CSV/Excel) com colunas pré-formatadas (Marca, Modelo, Versão, Ano, Km, Preço, Placa, Status). Na Taxa de Implantação e Setup (R$ 997), nossa equipe técnica realiza a importação assistida de todo o seu pátio de veículos sem trabalho manual para você.",
    highlight: "Planilha modelo oficial CSV para download direto no painel.",
  },
  {
    id: "faq-estoque-2",
    category: "estoque",
    categoryLabel: "Estoque & Fotos",
    question: "Como a equipe gerencia e envia fotos dos veículos aos clientes no WhatsApp?",
    answer:
      "Cada veículo possui cadastro com link direto de fotos e especificações técnicas. Na conversa do WhatsApp integrada ao funil, o vendedor acessa o catálogo e envia dados e fotos ao cliente em menos de 10 segundos.",
    highlight: "Envio rápido de especificações e imagens diretamente pelo celular.",
  },

  // 4. Segurança, LGPD e Contratos
  {
    id: "faq-seguranca-1",
    category: "seguranca",
    categoryLabel: "Segurança & LGPD",
    question: "Meus dados de clientes e estoque estão protegidos sob a LGPD?",
    answer:
      "Sim. O Acelera Auto CRM adota isolamento estrito de dados por loja através de Row Level Security (RLS) no PostgreSQL e tráfego 100% criptografado com TLS 1.3. A sua loja é a CONTROLADORA dos dados e o Acelera Auto CRM atua estritamente como OPERADOR técnico conforme a Lei nº 13.709/18.",
    highlight: "Isolamento multi-tenant real e banco protegido com RLS.",
  },
  {
    id: "faq-seguranca-2",
    category: "seguranca",
    categoryLabel: "Segurança & LGPD",
    question: "Existe contrato de fidelidade forçada ou multa rescisória?",
    answer:
      "Não há fidelidade obrigatória nos planos mensais. Você pode cancelar sua assinatura a qualquer momento através do painel, com garantia de exportação integral de todos os seus dados cadastrais de leads e veículos em formato aberto (CSV).",
    highlight: "Liberdade total e exportação transparente dos seus dados.",
  },
];

const CATEGORIES = [
  { id: "todos", label: "Todas as Perguntas", icon: Sparkles },
  { id: "roleta", label: "Atendimento & Roleta", icon: MessageCircle },
  { id: "erps", label: "ERPs & Webhooks", icon: Cpu },
  { id: "estoque", label: "Estoque & Fotos", icon: Layers },
  { id: "seguranca", label: "Segurança & LGPD", icon: ShieldCheck },
];

export function FAQSection() {
  const [selectedCategory, setSelectedCategory] = useState<string>("todos");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({
    "faq-roleta-1": true,
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
    <section
      id="faq"
      className="py-16 sm:py-24 w-full max-w-full overflow-hidden bg-[#09090b] border-t border-white/10"
      aria-label="Perguntas Frequentes (FAQ)"
    >
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        {/* Cabeçalho da Seção */}
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full border border-orange-500/30 bg-orange-500/10 px-3.5 py-1 text-xs font-semibold text-orange-400">
            <HelpCircle className="h-3.5 w-3.5" />
            Tire Suas Dúvidas
          </div>
          <h2 className="mt-3 text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
            Perguntas Frequentes & Detalhes Técnicos
          </h2>
          <p className="mt-2.5 sm:mt-3 text-xs sm:text-base text-zinc-400">
            Tudo o que você precisa saber sobre a Roleta de Vendedores, integração com seus ERPs, estoque e segurança.
          </p>
        </div>

        {/* Barra de Busca Rápida */}
        <div className="mt-8 max-w-md mx-auto relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <Input
            id="faq-search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar dúvida (ex: roleta, ERP, WhatsApp, estoque)..."
            className="pl-10 pr-4 bg-zinc-900/90 border-zinc-800 text-white placeholder:text-zinc-500 focus-visible:ring-orange-500 h-10 rounded-xl"
            aria-label="Campo de busca no FAQ"
          />
        </div>

        {/* Filtros de Categorias (Pills) */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition-all",
                  isSelected
                    ? "bg-orange-500 text-white shadow-lg shadow-orange-500/25"
                    : "bg-zinc-900/80 text-zinc-400 border border-zinc-800 hover:border-zinc-700 hover:text-white"
                )}
                aria-pressed={isSelected}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Lista de Perguntas (Accordions) */}
        <div className="mt-8 space-y-3">
          {filteredQuestions.length === 0 ? (
            <div className="text-center py-10 border border-dashed border-zinc-800 rounded-2xl bg-zinc-950/50 p-6">
              <p className="text-sm text-zinc-400">
                Nenhuma pergunta encontrada com o termo &ldquo;{searchQuery}&rdquo;.
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
                Limpar filtros de busca
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
                      ? "border-orange-500/40 bg-zinc-900/70 shadow-lg shadow-orange-950/20"
                      : "border-zinc-800/80 bg-zinc-950/50 hover:border-zinc-700 hover:bg-zinc-900/40"
                  )}
                >
                  <button
                    id={`btn-${item.id}`}
                    onClick={() => toggleItem(item.id)}
                    className="w-full flex items-center justify-between p-4 sm:p-5 text-left text-white gap-3 transition-colors"
                    aria-expanded={isOpen}
                    aria-controls={`content-${item.id}`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="shrink-0 flex h-6 w-6 items-center justify-center rounded-lg bg-orange-500/10 text-orange-400 text-xs font-bold border border-orange-500/20">
                        ?
                      </span>
                      <span className="text-sm sm:text-base font-semibold text-zinc-100 leading-snug">
                        {item.question}
                      </span>
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
                      id={`content-${item.id}`}
                      className="px-4 pb-4 sm:px-5 sm:pb-5 pt-0 border-t border-zinc-800/60 mt-1"
                    >
                      <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed pt-3">
                        {item.answer}
                      </p>
                      {item.highlight && (
                        <div className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-orange-500/10 px-2.5 py-1 text-[11px] font-medium text-orange-300 border border-orange-500/20">
                          <Zap className="h-3 w-3 text-orange-400 shrink-0" />
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

        {/* Card de Ajuda Adicional / Central Completa */}
        <div className="mt-10 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 sm:p-6 text-center sm:flex sm:items-center sm:justify-between gap-4">
          <div className="text-center sm:text-left">
            <h3 className="text-sm sm:text-base font-bold text-white">
              Ainda ficou com alguma dúvida sobre o Acelera Auto CRM?
            </h3>
            <p className="mt-1 text-xs text-zinc-400">
              Acesse a Central de Ajuda completa ou fale diretamente com nossos especialistas.
            </p>
          </div>
          <div className="mt-4 sm:mt-0 flex flex-col sm:flex-row gap-2.5 justify-center">
            <Link href="/ajuda">
              <Button
                variant="outline"
                size="sm"
                className="w-full sm:w-auto border-zinc-700 text-xs text-white hover:bg-zinc-800 gap-1.5"
              >
                <span>Central de Ajuda</span>
                <ArrowRight className="h-3.5 w-3.5 text-orange-400" />
              </Button>
            </Link>
            <a
              href="https://wa.me/5511988887777?text=Ol%C3%A1%2C%20tenho%20d%C3%BAvidas%20sobre%20o%20Acelera%20Auto%20CRM"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button
                size="sm"
                className="w-full sm:w-auto bg-green-600 text-white hover:bg-green-500 text-xs gap-1.5"
              >
                <MessageCircle className="h-3.5 w-3.5" />
                <span>Chamar no WhatsApp</span>
              </Button>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
