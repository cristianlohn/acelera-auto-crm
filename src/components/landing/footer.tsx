/**
 * @file footer.tsx
 * @description Componente de rodapé da landing page pública com informações institucionais,
 * segurança de dados, redes de contato e dados jurídicos oficiais (Razão Social, CNPJ e Sede).
 */

import Link from "next/link";
import Image from "next/image";
import { ShieldCheck, MessageCircle } from "lucide-react";
import { siteConfig } from "@/config/site";

function InstagramIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

function LinkedinIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
      <rect width="4" height="12" x="2" y="9" />
      <circle cx="4" cy="4" r="2" />
    </svg>
  );
}

export function Footer() {
  return (
    <footer className="bg-neutral-950 text-slate-400 border-t border-slate-900 pt-16 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 pb-12 border-b border-slate-900">
          {/* Coluna 1: Marca, Descrição, Redes e Segurança (5 colunas) */}
          <div className="md:col-span-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center h-8">
                <Image
                  src="/logo.png"
                  alt="Acelera Auto CRM"
                  width={140}
                  height={32}
                  className="h-8 w-auto object-contain"
                />
              </div>
              <p className="text-sm text-slate-400 mt-4 max-w-sm leading-relaxed">
                Plataforma de alta performance desenvolvida para acelerar a gestão de leads,
                giro de pátio e produtividade em concessionárias e revendas.
              </p>

              {/* Redes e Contatos */}
              <div className="flex items-center gap-2.5 mt-5">
                <a
                  href="https://wa.me/5547996348698"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Atendimento via WhatsApp"
                  className="p-2 rounded-lg bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-emerald-400 hover:border-emerald-500/40 transition-colors"
                >
                  <MessageCircle className="w-4 h-4" />
                </a>
                <a
                  href="https://instagram.com/aceleraautocrm"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Siga no Instagram"
                  className="p-2 rounded-lg bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-pink-400 hover:border-pink-500/40 transition-colors"
                >
                  <InstagramIcon className="w-4 h-4" />
                </a>
                <a
                  href="https://linkedin.com/company/aceleraautocrm"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Conecte-se no LinkedIn"
                  className="p-2 rounded-lg bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-sky-400 hover:border-sky-500/40 transition-colors"
                >
                  <LinkedinIcon className="w-4 h-4" />
                </a>
              </div>
            </div>

            <div className="inline-flex items-center gap-2 text-xs text-slate-400 mt-6">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Criptografia ponta a ponta & RLS</span>
            </div>
          </div>

          {/* Coluna 2: Produto (2 colunas) */}
          <div className="md:col-span-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-white h-8 flex items-center">
              Produto
            </h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li>
                <Link className="hover:text-white transition-colors" href="/leads">
                  Funil Kanban de Leads
                </Link>
              </li>
              <li>
                <Link className="hover:text-white transition-colors" href="/vehicles">
                  Gestão de Estoque e Pátio
                </Link>
              </li>
              <li>
                <Link className="hover:text-white transition-colors" href="/ajuda">
                  Integração WhatsApp Direta
                </Link>
              </li>
              <li>
                <Link className="hover:text-white transition-colors" href="/relatorios">
                  Relatórios & Indicadores
                </Link>
              </li>
            </ul>
          </div>

          {/* Coluna 3: Infraestrutura & Segurança (3 colunas) */}
          <div className="md:col-span-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-white h-8 flex items-center">
              Infraestrutura & Segurança
            </h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li className="flex items-center gap-2 text-amber-500/90">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                PostgreSQL & Supabase Realtime
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
                <span className="text-slate-400">Backup Automatizado Diário</span>
              </li>
            </ul>
          </div>

          {/* Coluna 4: Acesso (2 colunas) */}
          <div className="md:col-span-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-white h-8 flex items-center">
              Acesso
            </h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li>
                <Link
                  className="text-orange-400 hover:text-orange-300 font-medium transition-colors"
                  href="/leads"
                >
                  Acessar Demonstração
                </Link>
              </li>
              <li>
                <Link className="hover:text-white transition-colors" href="/login">
                  Login no Sistema
                </Link>
              </li>
              <li>
                <Link className="hover:text-white transition-colors" href="/billing">
                  Tabela de Preços
                </Link>
              </li>
              <li>
                <Link className="hover:text-white transition-colors" href="/#calculadora">
                  Calculadora de ROI
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Rodapé Inferior: Direitos, CNPJ e Links Legais */}
        <div className="pt-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4 text-xs text-slate-500">
          <div>
            <p>© {new Date().getFullYear()} {siteConfig.company.tradeName}. Todos os direitos reservados.</p>
            <p className="mt-1 text-slate-400">
              Operado por <span className="text-slate-300 font-medium">{siteConfig.company.legalName}</span> • CNPJ: <span className="text-slate-300">{siteConfig.company.cnpj}</span> • {siteConfig.company.cityState}
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

