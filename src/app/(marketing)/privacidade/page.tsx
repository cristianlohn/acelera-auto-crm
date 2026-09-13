/**
 * @file page.tsx - /privacidade
 * @description Política de Privacidade e Tratamento de Dados Pessoais do Acelera Auto CRM.
 * Em conformidade com a Lei Geral de Proteção de Dados Pessoais (LGPD - Lei nº 13.709/18).
 */

import React from "react";
import Link from "next/link";
import {
  ShieldCheck,
  ArrowLeft,
  Clock,
  Building2,
  Mail,
} from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Política de Privacidade e Proteção de Dados (LGPD) | Acelera Auto CRM",
  description:
    "Diretrizes de privacidade, segurança da informação e tratamento de dados pessoais conforme a Lei Geral de Proteção de Dados (LGPD).",
};

export default function PrivacidadePage() {
  return (
    <div className="relative w-full max-w-full overflow-hidden py-12 sm:py-20 px-4 sm:px-6 lg:px-8">
      {/* Background Glow */}
      <div
        className="pointer-events-none absolute -top-40 left-1/2 -z-10 h-[500px] w-[90vw] max-w-[700px] -translate-x-1/2 rounded-full bg-gradient-to-tr from-emerald-600/15 via-orange-600/10 to-transparent blur-[120px]"
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
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400 mb-3">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Conformidade com a LGPD (Lei nº 13.709/2018)</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
            Política de Privacidade e Proteção de Dados
          </h1>

          <p className="mt-2 text-xs sm:text-sm text-zinc-400 flex items-center gap-2">
            <Clock className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>Vigência e última atualização: 2026 • Catuto Soluções Digitais</span>
          </p>
        </div>

        {/* Conteúdo Jurídico Estruturado */}
        <div className="mt-8 space-y-8 text-xs sm:text-sm text-zinc-300 leading-relaxed">
          {/* Apresentação */}
          <div className="rounded-xl border border-white/10 bg-[#121216]/80 p-4 sm:p-6">
            <p className="text-zinc-200">
              A <strong>Catuto Soluções Digitais</strong>, operadora do <strong>Acelera Auto CRM</strong>, reafirma seu compromisso inegociável com a segurança, privacidade e confidencialidade dos dados pessoais de seus clientes e usuários, em total conformidade com a <strong>Lei Geral de Proteção de Dados Pessoais (LGPD - Lei nº 13.709/18)</strong>.
            </p>
          </div>

          {/* Cláusula 1 */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-base sm:text-lg font-bold text-white">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400 text-xs font-bold">
                1
              </div>
              <h2>Definição de Papéis sob a LGPD</h2>
            </div>
            <div className="pl-9 space-y-2">
              <p>
                1.1. <strong>Loja/Concessionária Contratante (CONTROLADORA):</strong> É a titular e responsável direta pelas decisões referentes ao tratamento de dados pessoais, coleta de consentimento, legítimo interesse e definição das diretrizes de atendimento aos clientes e potenciais compradores (leads automotivos).
              </p>
              <p>
                1.2. <strong>Acelera Auto CRM / Catuto Soluções Digitais (OPERADORA):</strong> Atua estritamente como agente de tratamento na qualidade de Operadora, fornecendo a infraestrutura tecnológica de software, processamento automatizado de regras de roleta e armazenamento seguro em nuvem, sob as ordens e instruções lícitas da Loja Controladora.
              </p>
            </div>
          </section>

          {/* Cláusula 2 */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-base sm:text-lg font-bold text-white">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400 text-xs font-bold">
                2
              </div>
              <h2>Bases Legais e Finalidade do Tratamento</h2>
            </div>
            <div className="pl-9 space-y-2">
              <p>
                2.1. O tratamento de dados pessoais realizado no âmbito da plataforma Acelera Auto CRM está estritamente fundamentado nas seguintes hipóteses legais previstas no <strong>Artigo 7º da Lei Geral de Proteção de Dados (Lei nº 13.709/2018)</strong>:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-zinc-400">
                <li>
                  <strong>Art. 7º, V (Execução de Contrato):</strong> Tratamento estritamente necessário para a execução do contrato de prestação de serviços de CRM e licenciamento de software SaaS, incluindo autenticação de usuários, faturamento de assinaturas, automação de funil comercial e distribuição de leads.
                </li>
                <li>
                  <strong>Art. 7º, IX (Legítimo Interesse):</strong> Tratamento voltado ao apoio, fomento e monitoramento de qualidade do atendimento comercial automotivo (como cronometragem de SLA de primeiro contato), prevenção a fraudes e garantia da segurança das redes e sistemas.
                </li>
              </ul>
              <p>
                2.2. <strong>Dados Coletados:</strong>
              </p>
              <ul className="list-disc pl-5 space-y-1 text-zinc-400">
                <li><strong>Dados da Loja Contratante:</strong> Razão Social, Nome Fantasia, CNPJ/CPF, e-mail corporativo, telefone e credenciais criptografadas de acesso.</li>
                <li><strong>Dados de Leads e Compradores:</strong> Nome completo, telefone/WhatsApp, e-mail, veículo de interesse e histórico de conversas capturados via formulários, portais parceiros (Webmotors, iCarros, OLX) ou inserção manual no painel.</li>
              </ul>
              <p>
                2.3. <strong>Compromisso Categórico de Não-Comercialização:</strong> A Licenciante assume o compromisso irrevogável de que <strong>em nenhuma hipótese comercializa, aluga, monetiza, cede ou compartilha os dados de clientes, estoques ou leads de sua concessionária com terceiros</strong> para finalidades publicitárias, campanhas não autorizadas ou enriquecimento de bases externas.
              </p>
            </div>
          </section>

          {/* Cláusula 3 */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-base sm:text-lg font-bold text-white">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400 text-xs font-bold">
                3
              </div>
              <h2>Segurança da Informação e Isolamento Multi-Tenant</h2>
            </div>
            <div className="pl-9 space-y-2">
              <p>
                3.1. Toda a comunicação trafegada entre o navegador do usuário e nossos servidores é protegida por criptografia de ponta a ponta via <strong>HTTPS / TLS 1.3</strong>.
              </p>
              <p>
                3.2. <strong>Isolamento Lógico Multi-Tenant:</strong> Os dados residem em bancos relacionais PostgreSQL com <strong>Row Level Security (RLS)</strong> ativado e auditado. Cada consulta ao banco de dados valida criptograficamente o identificador único do tenant da loja (organização), impedindo categoricamente vazamentos cruzados de estoques, leads ou métricas financeiras entre lojas concorrentes.
              </p>
              <p>
                3.3. As senhas de acesso e tokens de integração são irreversivelmente processados com algoritmos de hashing seguro de última geração (bcrypt e HMAC-SHA256).
              </p>
            </div>
          </section>

          {/* Cláusula 4 */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-base sm:text-lg font-bold text-white">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400 text-xs font-bold">
                4
              </div>
              <h2>Subprocessadores Autorizados de Infraestrutura</h2>
            </div>
            <div className="pl-9 space-y-2">
              <p>
                4.1. Para a prestação de serviços com nível corporativo de segurança e disponibilidade, a Operadora mantém contrato de subprocessamento com os seguintes provedores homologados:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-zinc-400">
                <li>
                  <strong>Supabase Inc.:</strong> Infraestrutura de banco de dados PostgreSQL relacional gerenciado, autenticação com isolamento RLS e backups contínuos em nuvem de alta segurança.
                </li>
                <li>
                  <strong>Asaas Gestão Financeira S.A.:</strong> Gateway financeiro e processamento seguro de cobranças (Pix, cartões de crédito e boletos) sob certificação PCI-DSS e regulação do Banco Central do Brasil.
                </li>
                <li>
                  <strong>Vercel Inc.:</strong> Infraestrutura de computação de borda (Edge Network) e hospedagem de aplicação com proteção anti-DDoS e certificações SOC 2 Tipo II e ISO 27001.
                </li>
              </ul>
            </div>
          </section>

          {/* Cláusula 5 */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-base sm:text-lg font-bold text-white">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400 text-xs font-bold">
                5
              </div>
              <h2>Direitos dos Titulares de Dados</h2>
            </div>
            <div className="pl-9 space-y-2">
              <p>
                5.1. Conforme previsto no Artigo 18 da LGPD, os titulares de dados pessoais possuem direito de:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-zinc-400">
                <li>Confirmar a existência e obter acesso aos seus dados pessoais armazenados;</li>
                <li>Solicitar a retificação de dados incompletos, inexatos ou desatualizados;</li>
                <li>Requerer a exclusão definitiva ou anonimização de seus registros;</li>
                <li>Obter a portabilidade dos dados através de exportação padrão em formato CSV.</li>
              </ul>
              <p>
                5.2. As solicitações devem ser geridas diretamente pelo painel administrativo da Loja Controladora ou encaminhadas ao nosso canal de privacidade.
              </p>
            </div>
          </section>

          {/* Cláusula 6 */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-base sm:text-lg font-bold text-white">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400 text-xs font-bold">
                6
              </div>
              <h2>Canal de Contato e Encarregado (DPO)</h2>
            </div>
            <div className="pl-9 space-y-2">
              <p>
                6.1. Para exercer quaisquer direitos decorrentes da LGPD ou esclarecer dúvidas operacionais sobre esta Política de Privacidade, entre em contato com nosso Encarregado de Proteção de Dados:
              </p>
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-950/20 p-3.5 text-emerald-300 font-medium space-y-1">
                <p className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-emerald-400" />
                  <span>E-mail Oficial: <strong>contato@aceleraautocrm.com.br</strong></span>
                </p>
                <p className="text-xs text-zinc-400">
                  Responsável: Setor de Governança e Segurança da Informação — Catuto Soluções Digitais
                </p>
              </div>
            </div>
          </section>
        </div>

        {/* Footer do Card */}
        <div className="mt-12 pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-400">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-emerald-400" />
            <span>Operado por Catuto Soluções Digitais</span>
          </div>
          <Link
            href="/termos"
            className="text-orange-400 hover:text-orange-300 font-semibold"
          >
            Ver Termos de Licenciamento de Software →
          </Link>
        </div>
      </div>
    </div>
  );
}
