/**
 * @file page.tsx - /termos
 * @description Termos de Uso e Licenciamento de Software (SaaS) do Acelera Auto CRM.
 * Em conformidade com a Lei do Software (Lei nº 9.609/98), Marco Civil da Internet (Lei nº 12.965/14) e Código Civil Brasileiro.
 */

import React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Scale,
  Clock,
  Building2,
} from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Termos de Uso e Licenciamento de Software (SaaS) | Acelera Auto CRM",
  description:
    "Termos de uso, condições de licenciamento de software e diretrizes operacionais do Acelera Auto CRM sob as leis brasileiras.",
};

export default function TermosPage() {
  return (
    <div className="relative w-full max-w-full overflow-hidden py-12 sm:py-20 px-4 sm:px-6 lg:px-8">
      {/* Background Glow */}
      <div
        className="pointer-events-none absolute -top-40 left-1/2 -z-10 h-[500px] w-[90vw] max-w-[700px] -translate-x-1/2 rounded-full bg-gradient-to-tr from-orange-600/15 via-red-600/10 to-transparent blur-[120px]"
        aria-hidden="true"
      />

      <div className="mx-auto max-w-4xl">
        {/* Navegação de Retorno */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-400 hover:text-white transition-colors mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Voltar para a página inicial</span>
        </Link>

        {/* Cabeçalho do Documento */}
        <div className="border-b border-white/10 pb-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-orange-500/30 bg-orange-500/10 px-3 py-1 text-xs font-semibold text-orange-400 mb-3">
            <Scale className="h-3.5 w-3.5" />
            <span>Marco Civil da Internet & Lei nº 9.609/98</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
            Termos de Uso e Licenciamento de Software (SaaS)
          </h1>

          <p className="mt-2 text-xs sm:text-sm text-zinc-400 flex items-center gap-2">
            <Clock className="h-4 w-4 text-orange-400 shrink-0" />
            <span>Vigência e última atualização: 2026 • Catuto Soluções Digitais</span>
          </p>
        </div>

        {/* Conteúdo Jurídico Estruturado */}
        <div className="mt-8 space-y-8 text-xs sm:text-sm text-zinc-300 leading-relaxed">
          {/* Apresentação */}
          <div className="rounded-xl border border-white/10 bg-[#121216]/80 p-4 sm:p-6">
            <p className="text-zinc-200">
              Estes Termos de Uso e Licenciamento de Software regulam o acesso e a utilização da plataforma tecnológica <strong>Acelera Auto CRM</strong>, de propriedade e operada por <strong>Catuto Soluções Digitais</strong>, doravante denominada &quot;LICENCIANTE&quot;, e a pessoa física ou jurídica contratante, doravante denominada &quot;LOJA CONTRATANTE&quot; ou &quot;USUÁRIO&quot;.
            </p>
          </div>

          {/* Cláusula 1 */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-base sm:text-lg font-bold text-white">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-500/20 text-orange-400 text-xs font-bold">
                1
              </div>
              <h2>Objeto e Concessão de Licença de Uso</h2>
            </div>
            <div className="pl-9 space-y-2">
              <p>
                1.1. O presente instrumento concede à Loja Contratante uma <strong>licença de uso temporária, revogável, onerosa, não-exclusiva e intransferível</strong> da plataforma Acelera Auto CRM, sob a modalidade <em>Software as a Service (SaaS)</em>, via internet.
              </p>
              <p>
                1.2. A licença outorgada não implica, em hipótese alguma, na cessão, venda ou transferência definitiva do código-fonte, marca, algoritmos ou infraestrutura de software do Acelera Auto CRM.
              </p>
            </div>
          </section>

          {/* Cláusula 2 */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-base sm:text-lg font-bold text-white">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-500/20 text-orange-400 text-xs font-bold">
                2
              </div>
              <h2>Propriedade Intelectual e Vedação à Engenharia Reversa</h2>
            </div>
            <div className="pl-9 space-y-2">
              <p>
                2.1. Todos os direitos de propriedade intelectual relativos ao Acelera Auto CRM — incluindo, mas não se limitando a, código-fonte, interfaces gráficas, wireframes, arquitetura de SLA, componentes Kanban, textos, bases de dados e logotipos — pertencem exclusivamente à <strong>Catuto Soluções Digitais</strong>, protegidos pela Lei de Software (Lei nº 9.609/1998) e pela Lei de Direitos Autorais (Lei nº 9.610/1998).
              </p>
              <p>
                2.2. É <strong>expressamente proibido</strong> à Loja Contratante ou a seus colaboradores:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-zinc-400">
                <li>Descompilar, aplicar engenharia reversa ou tentar extrair o código-fonte da aplicação;</li>
                <li>Clonar, copiar a arquitetura de cronometragem de SLA ou duplicar elementos visuais para fins comerciais concorrenciais;</li>
                <li>Sublicenciar, alugar, ceder ou revender o acesso a terceiros sem prévia autorização por escrito.</li>
              </ul>
            </div>
          </section>

          {/* Cláusula 3 */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-base sm:text-lg font-bold text-white">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-500/20 text-orange-400 text-xs font-bold">
                3
              </div>
              <h2>Natureza da Plataforma (Obrigação de Meio)</h2>
            </div>
            <div className="pl-9 space-y-2">
              <p>
                3.1. O Acelera Auto CRM consiste em uma <strong>ferramenta tecnológica de apoio à gestão comercial, controle de estoque e agilidade no atendimento</strong> (obrigação de meio).
              </p>
              <p>
                3.2. A Licenciante <strong>não garante</strong> faturamento mínimo, lucro garantido ou volume de vendas fechadas pela Loja Contratante. A negociação de preços, vistoria de veículos, condições de pagamento, simulação de financiamento e entrega dos veículos automotores são de responsabilidade integral e exclusiva da Loja Contratante perante o consumidor final.
              </p>
            </div>
          </section>

          {/* Cláusula 4 */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-base sm:text-lg font-bold text-white">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-500/20 text-orange-400 text-xs font-bold">
                4
              </div>
              <h2>Planos, Taxa de Implantação (Setup) e Pagamentos</h2>
            </div>
            <div className="pl-9 space-y-2">
              <p>
                4.1. O acesso ao sistema está condicionado ao pagamento da mensalidade correspondente ao plano escolhido (Starter, Pro ou Enterprise) e da respectiva <strong>Taxa de Implantação e Onboarding Guiado (Setup)</strong> no valor estipulado na contratação.
              </p>
              <p>
                4.2. Em caso de inadimplência superior a <strong>5 (cinco) dias úteis</strong> a contar da data de vencimento da fatura, o acesso ao painel do CRM poderá ser suspenso temporariamente até a regularização financeira, sem prejuízo da manutenção dos dados cadastrais pelo prazo regulamentar.
              </p>
            </div>
          </section>

          {/* Cláusula 5 */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-base sm:text-lg font-bold text-white">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-500/20 text-orange-400 text-xs font-bold">
                5
              </div>
              <h2>Exportação de Dados e Rescisão Contratual</h2>
            </div>
            <div className="pl-9 space-y-2">
              <p>
                5.1. A Loja Contratante poderá solicitar o cancelamento de sua assinatura a qualquer momento, sem fidelidade forçada, respeitadas as condições e eventuais descontos concedidos em planos de periodicidade anual.
              </p>
              <p>
                5.2. Antes do encerramento definitivo da conta, o administrador poderá efetuar o download e a <strong>exportação completa dos dados cadastrais de leads e veículos em formato aberto padrão (CSV)</strong>.
              </p>
            </div>
          </section>

          {/* Cláusula 6 */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-base sm:text-lg font-bold text-white">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-500/20 text-orange-400 text-xs font-bold">
                6
              </div>
              <h2>Foro de Eleição</h2>
            </div>
            <div className="pl-9 space-y-2">
              <p>
                6.1. Fica eleito o Foro da Comarca da sede da Licenciante no Brasil para dirimir quaisquer controvérsias decorrentes destes Termos de Uso, com expressa renúncia a qualquer outro, por mais privilegiado que seja.
              </p>
            </div>
          </section>
        </div>

        {/* Footer do Card */}
        <div className="mt-12 pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-400">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-orange-400" />
            <span>Operado por Catuto Soluções Digitais</span>
          </div>
          <Link
            href="/privacidade"
            className="text-orange-400 hover:text-orange-300 font-semibold"
          >
            Ver Política de Privacidade (LGPD) →
          </Link>
        </div>
      </div>
    </div>
  );
}
