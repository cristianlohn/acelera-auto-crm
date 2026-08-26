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
                1.1. <strong>Loja/Concessionária Contratante (CONTROLADORA):</strong> É a titular e responsável direta pela coleta, consentimento e base legal do tratamento dos dados de seus clientes, potenciais compradores e leads automotivos.
              </p>
              <p>
                1.2. <strong>Acelera Auto CRM / Catuto Soluções Digitais (OPERADORA):</strong> Atua estritamente como provedora da infraestrutura técnica de software, armazenamento em nuvem e processamento dos dados, sob as ordens e instruções da Loja Controladora.
              </p>
            </div>
          </section>

          {/* Cláusula 2 */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-base sm:text-lg font-bold text-white">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400 text-xs font-bold">
                2
              </div>
              <h2>Coleta e Finalidade dos Dados</h2>
            </div>
            <div className="pl-9 space-y-2">
              <p>
                2.1. <strong>Dados da Loja Contratante:</strong> Coletamos Razão Social, Nome Fantasia, CNPJ/CPF, e-mail corporativo, telefone e dados de login estritamente para a emissão de faturamento, autenticação segura e suporte técnico.
              </p>
              <p>
                2.2. <strong>Dados de Leads e Compradores:</strong> O sistema armazena Nome, Telefone/WhatsApp, e-mail, veículo de interesse e histórico de interações enviados via Webhook, formulários integrados ou cadastro manual, com a finalidade exclusiva de organização do Funil Kanban e roteamento ágil de vendas.
              </p>
              <p>
                2.3. Em nenhuma circunstância o Acelera Auto CRM comercializa, compartilha ou utiliza os dados de leads da sua concessionária para finalidades alheias à execução do serviço contratado.
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
                3.2. Os dados residem em bancos relacionais PostgreSQL com <strong>Row Level Security (RLS)</strong> ativado, garantindo isolamento lógico estrito entre tenants (lojas). Nenhuma concessionária possui visibilidade sobre estoques, leads ou métricas de outra empresa.
              </p>
              <p>
                3.3. As senhas de acesso são irreversivelmente criptografadas através de algoritmos de hashing seguro (bcrypt/argon2).
              </p>
            </div>
          </section>

          {/* Cláusula 4 */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-base sm:text-lg font-bold text-white">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400 text-xs font-bold">
                4
              </div>
              <h2>Direitos dos Titulares de Dados</h2>
            </div>
            <div className="pl-9 space-y-2">
              <p>
                4.1. Conforme previsto no Artigo 18 da LGPD, os titulares de dados pessoais possuem direito de:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-zinc-400">
                <li>Confirmar a existência e obter acesso aos seus dados pessoais armazenados;</li>
                <li>Solicitar a retificação de dados incompletos, inexatos ou desatualizados;</li>
                <li>Requerer a exclusão definitiva ou anonimização de seus registros;</li>
                <li>Obter a portabilidade dos dados através de exportação padrão em formato CSV.</li>
              </ul>
              <p>
                4.2. As solicitações devem ser geridas diretamente pelo painel administrativo da Loja Controladora ou encaminhadas ao nosso canal de privacidade.
              </p>
            </div>
          </section>

          {/* Cláusula 5 */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-base sm:text-lg font-bold text-white">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400 text-xs font-bold">
                5
              </div>
              <h2>Canal de Contato e Encarregado (DPO)</h2>
            </div>
            <div className="pl-9 space-y-2">
              <p>
                5.1. Para exercer quaisquer direitos decorrentes da LGPD ou esclarecer dúvidas operacionais sobre esta Política de Privacidade, entre em contato com nosso Encarregado de Proteção de Dados:
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
