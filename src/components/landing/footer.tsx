/**
 * @file footer.tsx
 * @description Componente de rodapé da landing page pública com informações institucionais,
 * segurança de dados, redes de contato e dados jurídicos oficiais (Razão Social, CNPJ e Sede).
 */

import Link from "next/link";
import Image from "next/image";
import { ShieldCheck } from "lucide-react";
import { siteConfig } from "@/config/site";

export function Footer() {
  return (
    <footer className="bg-neutral-950 text-slate-400 border-t border-slate-900 pt-16 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-10 pb-12 border-b border-slate-900">
          {/* Coluna 1: Marca, Descrição, Redes e Segurança (4 colunas) */}
          <div className="md:col-span-4 lg:col-span-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center h-10">
                <Image
                  src="/logo.png"
                  alt="Acelera Auto CRM"
                  width={175}
                  height={40}
                  className="h-10 w-auto object-contain"
                />
              </div>
              <p className="text-sm text-slate-400 mt-4 max-w-sm leading-relaxed">
                Plataforma de alta performance desenvolvida para acelerar a gestão de leads,
                giro de pátio e produtividade em concessionárias e revendas.
              </p>

              {/* Container de Redes e Contatos */}
              <div className="flex items-center gap-3 mt-5">
                {/* WhatsApp Oficial */}
                <a
                  href="https://wa.me/5547996348698"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Atendimento Oficial via WhatsApp"
                  className="w-9 h-9 flex items-center justify-center rounded-lg bg-slate-900 border border-slate-700/80 text-slate-400 hover:text-[#25D366] hover:border-[#25D366]/40 hover:bg-[#25D366]/10 transition-colors"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.598 2.664-.699c.971.532 1.77.822 2.796.822 3.18 0 5.766-2.586 5.766-5.766.001-3.18-2.585-5.768-5.766-5.768zm0-2.172c4.418 0 8 3.582 8 8 0 4.419-3.582 8-8 8-1.42 0-2.75-.371-3.905-1.021l-4.126 1.082 1.101-4.025c-.714-1.196-1.12-2.58-1.12-4.036 0-4.418 3.582-8 8-8zm3.565 11.458c-.148.416-.761.765-1.047.808-.287.042-.647.064-2.072-.525-1.815-.75-2.986-2.597-3.076-2.717-.091-.12-1.748-2.327-1.748-4.439 0-2.112 1.106-3.151 1.5-3.559.395-.408.86-.51 1.147-.51.287 0 .574.004.825.016.264.013.619-.1.968.742.361.868 1.233 3.013 1.341 3.23.108.217.18.47.037.757-.143.288-.215.467-.428.718-.214.252-.449.562-.642.755-.215.215-.439.449-.189.879.25.43 1.114 1.834 2.389 2.97 1.64 1.462 3.023 1.916 3.453 2.13.43.215.681.18.932-.108.251-.287 1.076-1.254 1.363-1.684.287-.43.573-.359.968-.215.395.143 2.51 1.183 2.94 1.398.43.215.717.323.825.502.107.179.107 1.04-.041 1.456z"/>
                  </svg>
                </a>

                {/* Instagram Oficial */}
                <a
                  href="https://instagram.com/aceleraautocrm"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Perfil Oficial no Instagram"
                  className="w-9 h-9 flex items-center justify-center rounded-lg bg-slate-900 border border-slate-700/80 text-slate-400 hover:text-[#E4405F] hover:border-[#E4405F]/40 hover:bg-[#E4405F]/10 transition-colors"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                </a>

                {/* LinkedIn Oficial */}
                <a
                  href="https://linkedin.com/company/aceleraautocrm"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Página Oficial no LinkedIn"
                  className="w-9 h-9 flex items-center justify-center rounded-lg bg-slate-900 border border-slate-700/80 text-slate-400 hover:text-[#0A66C2] hover:border-[#0A66C2]/40 hover:bg-[#0A66C2]/10 transition-colors"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.2V10.9H6.46M7.83 6.25c-.91 0-1.64.73-1.64 1.64s.73 1.64 1.64 1.64 1.64-.73 1.64-1.64-.73-1.64-1.64-1.64z"/>
                  </svg>
                </a>
              </div>
            </div>

            <div className="inline-flex items-center gap-2 text-xs text-slate-400 mt-6">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Criptografia ponta a ponta & RLS</span>
            </div>
          </div>

          {/* Coluna 2: Produto (3 colunas) */}
          <div className="md:col-span-3 lg:col-span-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-white h-10 flex items-center">
              Produto
            </h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li>
                <a className="hover:text-white transition-colors whitespace-nowrap" href="#recursos">
                  Funil Kanban de Leads
                </a>
              </li>
              <li>
                <a className="hover:text-white transition-colors whitespace-nowrap" href="#recursos">
                  Gestão de Estoque e Pátio
                </a>
              </li>
              <li>
                <a className="hover:text-white transition-colors whitespace-nowrap" href="#recursos">
                  Integração WhatsApp Direta
                </a>
              </li>
              <li>
                <a className="hover:text-white transition-colors whitespace-nowrap" href="#recursos">
                  Relatórios & Indicadores
                </a>
              </li>
            </ul>
          </div>

          {/* Coluna 3: Infraestrutura & Segurança (3 colunas) */}
          <div className="md:col-span-3 lg:col-span-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-white h-10 flex items-center">
              Infraestrutura & Segurança
            </h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li>
                <span className="text-slate-400 whitespace-nowrap">PostgreSQL & Supabase Realtime</span>
              </li>
              <li>
                <Link className="hover:text-white transition-colors" href="/privacidade">
                  Conformidade LGPD & Privacidade
                </Link>
              </li>
              <li>
                <Link className="hover:text-white transition-colors" href="/termos">
                  Termos de Licenciamento (SaaS)
                </Link>
              </li>
              <li>
                <span className="text-slate-400 whitespace-nowrap">Backup Automatizado Diário</span>
              </li>
            </ul>
          </div>

          {/* Coluna 4: Acesso (2 colunas) */}
          <div className="md:col-span-2 lg:col-span-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-white h-10 flex items-center">
              Acesso
            </h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li>
                <Link
                  className="text-orange-500 hover:text-orange-400 font-semibold transition-colors whitespace-nowrap"
                  href="/leads"
                >
                  Acessar Demonstração
                </Link>
              </li>
              <li>
                <Link className="hover:text-white transition-colors whitespace-nowrap" href="/login">
                  Login no Sistema
                </Link>
              </li>
              <li>
                <a className="hover:text-white transition-colors whitespace-nowrap" href="#planos">
                  Tabela de Preços
                </a>
              </li>
              <li>
                <a className="hover:text-white transition-colors whitespace-nowrap" href="#calculadora">
                  Calculadora de ROI
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Rodapé Inferior: Direitos, CNPJ e Links Legais */}
        <div className="pt-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4 text-xs text-slate-400">
          <div>
            <p>© {new Date().getFullYear()} {siteConfig.company.tradeName}. Todos os direitos reservados.</p>
            <p className="mt-1 text-slate-400">
              Operado por <strong className="text-slate-300 font-medium">{siteConfig.company.legalName}</strong> • CNPJ: <span className="text-slate-300">{siteConfig.company.cnpj}</span> • {siteConfig.company.cityState}
            </p>
          </div>

          <div className="flex items-center gap-6 text-slate-400">
            <Link className="hover:text-white transition-colors" href="/termos">
              Termos de Uso
            </Link>
            <Link className="hover:text-white transition-colors" href="/privacidade">
              Política de Privacidade
            </Link>
            <Link className="hover:text-white transition-colors" href="/ajuda">
              Central de Ajuda
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

export const LandingFooter = Footer;
export default Footer;

