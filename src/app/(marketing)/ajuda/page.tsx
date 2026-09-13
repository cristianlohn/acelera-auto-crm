/**
 * @file page.tsx
 * @description Central de Ajuda & FAQ do Acelera Auto CRM (/ajuda).
 *
 * Funcionalidades:
 * - Header com busca instantânea e filtros por categorias canônicas.
 * - Guia de Início Rápido em 3 Passos.
 * - 4 Seções de Accordions Canônicas:
 *   1. "Como Conectar Webhooks de Portais"
 *   2. "Roleta e Regras de SLA"
 *   3. "Gestão de Equipe e Assentos Extras"
 *   4. "Segurança e Exportação de Dados"
 * - Canais de Suporte Direto (WhatsApp e E-mail Oficial) e Guia de Integração.
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
  Users,
  ShieldCheck,
  Zap,
  Mail,
  FileCode2,
  CheckCircle2,
  BookOpen,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { CONTACT_CONFIG, getSupportWhatsAppUrl } from "@/config/contact";

export interface HelpTopicItem {
  id: string;
  category: "webhooks" | "roleta" | "equipe" | "seguranca";
  categoryLabel: string;
  question: string;
  answer: string;
  highlight?: string;
}

export const CANONICAL_HELP_TOPICS: HelpTopicItem[] = [
  // 1. Como Conectar Webhooks de Portais
  {
    id: "webhooks-1",
    category: "webhooks",
    categoryLabel: "Como Conectar Webhooks de Portais",
    question: "Como conectar Webmotors, iCarros, OLX e portais automotivos via Webhook?",
    answer:
      "Configure o webhook no portal parceiro apontando para a URL canônica https://app.aceleraautocrm.com.br/api/v1/webhooks/leads. No cabeçalho da requisição HTTP, envie a sua chave de autenticação x-api-key gerada no menu 'Configurações > Integrações'. Novos leads são recebidos em milissegundos, classificados e inseridos automaticamente na coluna 'Novo' do Funil Kanban e na roleta de distribuição da equipe.",
    highlight: "Recebimento instantâneo em tempo real com validação segura de API Key.",
  },
  {
    id: "webhooks-2",
    category: "webhooks",
    categoryLabel: "Como Conectar Webhooks de Portais",
    question: "Como integrar formulários do site e campanhas de Meta Ads / Google Ads?",
    answer:
      "Basta utilizar o mesmo endpoint POST /api/v1/webhooks/leads enviando o payload no formato JSON. Se você utiliza ferramentas de automação como Zapier, Make, n8n ou formulários Elementor e RD Station, basta mapear os campos 'name', 'phone', 'email' e 'notes' (com o modelo do veículo). O CRM faz a sanitização do número de WhatsApp e atribuição imediata ao vendedor da vez.",
    highlight: "Compatível com Zapier, Make, n8n, Meta Lead Ads e formulários de sites.",
  },
  {
    id: "webhooks-3",
    category: "webhooks",
    categoryLabel: "Como Conectar Webhooks de Portais",
    question: "Quais campos são aceitos no payload JSON do Webhook de Leads?",
    answer:
      "O payload suporta: name (nome completo do cliente), phone (telefone com DDD), email, model (veículo de interesse), origin (ex: webmotors, icarros, olx, site, meta_ads), notes (mensagem original do lead) e plate (placa do carro ofertado na troca). O sistema possui tratamento tolerante a falhas (graceful degradation), garantindo taxa zero de perda de leads mesmo que campos secundários venham em branco.",
    highlight: "Processamento tolerante a falhas: nenhum lead é descartado.",
  },

  // 2. Roleta e Regras de SLA
  {
    id: "roleta-1",
    category: "roleta",
    categoryLabel: "Roleta e Regras de SLA",
    question: "Como funciona a Roleta Automática (Round-Robin) na distribuição de leads?",
    answer:
      "A Roleta de Vendedores distribui os novos leads de forma rigorosamente sequencial e balanceada entre todos os consultores comerciais ativos da concessionária. Caso algum vendedor esteja ausente, de folga ou inativo, o sistema pula para o próximo automaticamente. O gestor também pode efetuar atribuição manual ou remanejamento de leads a qualquer momento pelo Kanban.",
    highlight: "Distribuição sequencial justa e automática entre vendedores ativos.",
  },
  {
    id: "roleta-2",
    category: "roleta",
    categoryLabel: "Roleta e Regras de SLA",
    question: "Quais são os limites de tempo e o funcionamento do semáforo de SLA?",
    answer:
      "O Acelera Auto CRM adota uma régua visual canônica de SLA no Kanban: 🟢 Verde (ótimo atendimento, até 5 minutos), 🟡 Amarelo (atenção necessária, entre 5 e 10 minutos) e 🔴 Vermelho (SLA Estourado, acima de 10 minutos sem primeiro contato). Assim que o vendedor aciona o botão de WhatsApp ou avança o lead para 'Em Atendimento', o cronômetro do SLA é automaticamente interrompido e a métrica de tempo de resposta é salva nos relatórios.",
    highlight: "Meta canônica de primeiro contato em até 10 minutos.",
  },
  {
    id: "roleta-3",
    category: "roleta",
    categoryLabel: "Roleta e Regras de SLA",
    question: "O que é o cockpit 'Dinheiro na Mesa' e como cobrar vendedores em atraso?",
    answer:
      "O painel executivo 'Dinheiro na Mesa' rastreia gargalos e negócios parados em tempo real: leads com primeiro contato atrasado (>10 min), propostas enviadas sem retorno (>24h) e clientes com financiamento pendente (>48h). O gestor conta com um botão de cobrança rápida em 1 clique que abre o WhatsApp do vendedor com mensagem personalizada para destravar a negociação.",
    highlight: "Cobrança via WhatsApp em 1 clique pelo gestor comercial.",
  },

  // 3. Gestão de Equipe e Assentos Extras
  {
    id: "equipe-1",
    category: "equipe",
    categoryLabel: "Gestão de Equipe e Assentos Extras",
    question: "Qual a capacidade de vendedores nos planos Starter e Pro?",
    answer:
      "O Plano Starter contempla capacidade de até 3 (três) vendedores comerciais simultâneos na roleta de distribuição. O Plano Pro contempla capacidade nativa para até 8 (oito) vendedores comerciais. Para redes e grandes grupos com mais de 8 vendedores que demandem arquitetura dedicada, disponibilizamos o Plano Enterprise com capacidade customizada.",
    highlight: "Starter: 3 vendedores • Pro: 8 vendedores • Enterprise: customizado.",
  },
  {
    id: "equipe-2",
    category: "equipe",
    categoryLabel: "Gestão de Equipe e Assentos Extras",
    question: "Como funciona a contratação de Assentos Extras (R$ 49/mês)?",
    answer:
      "Se sua loja crescer e precisar de mais vendedores sem necessidade de migrar para uma categoria superior de plano, você pode contratar assentos adicionais de vendedores comerciais por apenas R$ 49,00/mês por assento extra. O valor é consolidado de forma transparente na fatura recorrente do Asaas e a liberação de novos vendedores no painel ocorre de forma imediata.",
    highlight: "Assentos adicionais por R$ 49/mês sem upgrade forçado de plano.",
  },
  {
    id: "equipe-3",
    category: "equipe",
    categoryLabel: "Gestão de Equipe e Assentos Extras",
    question: "Cargos de gestão (Admin, Gerente e Diretor) ocupam vagas de vendedores?",
    answer:
      "Não! De acordo com a arquitetura canônica do produto, usuários com papéis de Administrador, Gerente ou Diretor são 100% isentos da cota de vagas da roleta. Eles possuem acesso administrativo irrestrito ao sistema, visualizam todos os dados e configuram regras sem consumir os assentos de vendedores contratados.",
    highlight: "Isenção total: Admin, Gerente e Diretor não consomem vagas de vendedores.",
  },

  // 4. Segurança e Exportação de Dados
  {
    id: "seguranca-1",
    category: "seguranca",
    categoryLabel: "Segurança e Exportação de Dados",
    question: "Como o Acelera Auto CRM garante o isolamento multi-tenant dos dados?",
    answer:
      "A segurança dos dados é garantida por políticas estritas de Row Level Security (RLS) no PostgreSQL / Supabase. Cada requisição ao banco de dados valida criptograficamente a organização do usuário logado, impedindo em nível de infraestrutura qualquer possibilidade de uma loja concorrente visualizar leads, dados de estoque ou conversas de outra empresa.",
    highlight: "Isolamento lógico absoluto multi-tenant via Row Level Security (RLS).",
  },
  {
    id: "seguranca-2",
    category: "seguranca",
    categoryLabel: "Segurança e Exportação de Dados",
    question: "Quais são os subprocessadores autorizados sob a LGPD?",
    answer:
      "Operamos com infraestrutura de nuvem de padrão corporativo: Supabase Inc. (banco de dados PostgreSQL com RLS, backups criptografados e autenticação segura), Asaas Gestão Financeira S.A. (gateway financeiro regulado pelo Banco Central e certificado PCI-DSS) e Vercel Inc. (hospedagem em nuvem de borda com certificações SOC 2 Tipo II e ISO 27001).",
    highlight: "Subprocessadores homologados: Supabase, Asaas e Vercel.",
  },
  {
    id: "seguranca-3",
    category: "seguranca",
    categoryLabel: "Segurança e Exportação de Dados",
    question: "Como funciona a exportação em CSV e a política 'Cancele quando quiser'?",
    answer:
      "Sua concessionária tem total soberania sobre suas informações. O administrador pode a qualquer momento exportar os dados completos de leads, histórico e estoque de veículos em formato padrão (.CSV). Além disso, em planos mensais vigora a política 'Cancele quando quiser', permitindo o cancelamento a qualquer momento sem multas rescisórias ou amarras.",
    highlight: "Exportação irrestrita em CSV e política 'Cancele quando quiser' sem multas.",
  },
];

const HELP_CATEGORIES = [
  { id: "todos", label: "Todas as Dúvidas", icon: Sparkles },
  { id: "webhooks", label: "Como Conectar Webhooks de Portais", icon: Cpu },
  { id: "roleta", label: "Roleta e Regras de SLA", icon: MessageCircle },
  { id: "equipe", label: "Gestão de Equipe e Assentos Extras", icon: Users },
  { id: "seguranca", label: "Segurança e Exportação de Dados", icon: ShieldCheck },
];

export default function MarketingHelpPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("todos");
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({
    "webhooks-1": true,
    "roleta-1": true,
    "equipe-1": true,
    "seguranca-1": true,
  });

  const toggleItem = (id: string) => {
    setOpenItems((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredQuestions = useMemo(() => {
    return CANONICAL_HELP_TOPICS.filter((item) => {
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

  // Agrupamento das perguntas pelas 4 categorias canônicas para visualização estruturada
  const groupedSections = useMemo(() => {
    const categories: { id: "webhooks" | "roleta" | "equipe" | "seguranca"; title: string; icon: typeof Cpu }[] = [
      { id: "webhooks", title: "Como Conectar Webhooks de Portais", icon: Cpu },
      { id: "roleta", title: "Roleta e Regras de SLA", icon: MessageCircle },
      { id: "equipe", title: "Gestão de Equipe e Assentos Extras", icon: Users },
      { id: "seguranca", title: "Segurança e Exportação de Dados", icon: ShieldCheck },
    ];

    return categories
      .map((cat) => ({
        ...cat,
        items: filteredQuestions.filter((item) => item.category === cat.id),
      }))
      .filter((cat) => cat.items.length > 0);
  }, [filteredQuestions]);

  return (
    <div className="min-h-screen bg-[#09090b] text-white py-12 sm:py-20">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        {/* Cabeçalho da Central de Ajuda */}
        <div className="text-center max-w-3xl mx-auto">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Link
              href="/dashboard/leads"
              className="inline-flex items-center gap-1.5 rounded-full border border-orange-500/30 bg-orange-500/10 px-3.5 py-1 text-xs font-semibold text-orange-400 hover:bg-orange-500/20 transition-all hover:scale-105"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Voltar ao CRM</span>
            </Link>
            <Link
              href="/#simulador"
              className="inline-flex items-center gap-1.5 rounded-full border border-zinc-700 bg-zinc-800/80 px-3.5 py-1 text-xs font-semibold text-zinc-300 hover:bg-zinc-700 hover:text-white transition-all hover:scale-105"
            >
              <Sparkles className="h-3.5 w-3.5 text-orange-400" />
              <span>Simulador de Operação</span>
            </Link>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-orange-500/30 bg-orange-500/10 px-4 py-1 text-xs font-semibold text-orange-400">
            <BookOpen className="h-3.5 w-3.5" />
            Base de Conhecimento & Suporte
          </div>
          <h1 className="mt-4 text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
            Central de Ajuda & Guia Comercial
          </h1>
          <p className="mt-3 text-sm sm:text-base text-zinc-400">
            Respostas completas sobre a operação do Acelera Auto CRM, conexão de webhooks, roleta de SLA, gestão de equipe e conformidade com a LGPD.
          </p>

          {/* Barra de Busca Instantânea */}
          <div className="mt-8 max-w-lg mx-auto relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <Input
              id="help-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por webhook, roleta, SLA, assentos extras, LGPD..."
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

        {/* 4 Seções de Accordions Canônicas */}
        <div className="mt-10 space-y-8">
          {groupedSections.length === 0 ? (
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
            groupedSections.map((section) => {
              const SectionIcon = section.icon;
              return (
                <section key={section.id} className="space-y-3">
                  <div className="flex items-center gap-2.5 pb-2 border-b border-zinc-800/80">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-500/10 text-orange-400 border border-orange-500/20">
                      <SectionIcon className="h-4 w-4" />
                    </div>
                    <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                      {section.title}
                    </h2>
                    <span className="ml-auto text-xs font-semibold px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400">
                      {section.items.length} {section.items.length === 1 ? "tópico" : "tópicos"}
                    </span>
                  </div>

                  <div className="space-y-3">
                    {section.items.map((item) => {
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
                    })}
                  </div>
                </section>
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
                Fale com nossos especialistas em implantação e tire dúvidas em tempo real:{" "}
                <span className="text-white font-medium">{CONTACT_CONFIG.support.displayPhone}</span>.
              </p>
            </div>
            <a
              href={getSupportWhatsAppUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4"
            >
              <Button size="sm" className="w-full bg-green-600 hover:bg-green-500 text-xs">
                Chamar no WhatsApp ({CONTACT_CONFIG.support.displayPhone})
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
            <Link href="/settings?tab=integracoes" className="mt-4">
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
