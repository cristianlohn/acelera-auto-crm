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

import { MarketingHeader } from "@/components/layout/marketing-header";
import { LandingFooter } from "@/components/landing/footer";

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
      {/* Header Fixo com Blur */}
      <MarketingHeader />

      {/* Conteúdo Principal */}
      <main className="flex-1">{children}</main>

      {/* Footer Institucional */}
      <LandingFooter />
    </div>
  );
}
