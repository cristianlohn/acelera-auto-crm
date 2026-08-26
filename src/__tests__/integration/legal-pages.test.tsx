/**
 * @file legal-pages.test.tsx
 * @description Suíte de Testes de Integração para as Páginas Legais (Termos de Uso e Política de Privacidade).
 *
 * ============================================================================
 * ESCOPO DE TESTE & RASTREABILIDADE
 * ============================================================================
 * Funcionalidades Testadas:
 *   - [IT-16.1]: Renderização completa da página de Termos de Uso (/termos) com as 6 cláusulas essenciais e enquadramento legal.
 *   - [IT-16.2]: Renderização completa da página de Política de Privacidade (/privacidade) em conformidade com a LGPD e dados de contato do DPO.
 *   - [IT-16.3]: Validação de links cruzados e navegação entre Termos, Privacidade e Home.
 *
 * Padrão Estrutural: AAA (Arrange, Act, Assert)
 * Ambiente de Execução: Happy-DOM / Vitest / Testing Library
 * ============================================================================
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import TermosPage from "@/app/(marketing)/termos/page";
import PrivacidadePage from "@/app/(marketing)/privacidade/page";

describe("[IT-16] Páginas Públicas de Termos de Uso e Política de Privacidade (Legal Tech)", () => {
  describe("Termos de Uso (/termos)", () => {
    it("[IT-16.1] Deve renderizar o título oficial, marco regulatório e as 6 cláusulas essenciais de SaaS", () => {
      // Arrange & Act
      render(<TermosPage />);

      // Assert: Título e Enquadramento Legal
      expect(
        screen.getByRole("heading", {
          name: /termos de uso e licenciamento de software \(saas\)/i,
        })
      ).toBeInTheDocument();
      expect(
        screen.getByText(/marco civil da internet & lei nº 9\.609\/98/i)
      ).toBeInTheDocument();
      expect(
        screen.getAllByText(/catuto soluções digitais/i).length
      ).toBeGreaterThanOrEqual(1);

      // Assert: Cláusulas Essenciais
      expect(
        screen.getByRole("heading", {
          name: /objeto e concessão de licença de uso/i,
        })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("heading", {
          name: /propriedade intelectual e vedação à engenharia reversa/i,
        })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("heading", {
          name: /natureza da plataforma \(obrigação de meio\)/i,
        })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("heading", {
          name: /planos, taxa de implantação \(setup\) e pagamentos/i,
        })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("heading", {
          name: /exportação de dados e rescisão contratual/i,
        })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("heading", { name: /foro de eleição/i })
      ).toBeInTheDocument();

      // Assert: Link de retorno à Home e link para Privacidade
      expect(
        screen.getByRole("link", { name: /voltar para a página inicial/i })
      ).toHaveAttribute("href", "/");
      expect(
        screen.getByRole("link", { name: /ver política de privacidade \(lgpd\)/i })
      ).toHaveAttribute("href", "/privacidade");
    });
  });

  describe("Política de Privacidade (/privacidade)", () => {
    it("[IT-16.2] Deve renderizar a política em conformidade com a LGPD, papéis de Controladora/Operadora e canal de contato", () => {
      // Arrange & Act
      render(<PrivacidadePage />);

      // Assert: Título e LGPD
      expect(
        screen.getByRole("heading", {
          name: /política de privacidade e proteção de dados/i,
        })
      ).toBeInTheDocument();
      expect(
        screen.getByText(/conformidade com a lgpd \(lei nº 13\.709\/2018\)/i)
      ).toBeInTheDocument();

      // Assert: Papéis sob a LGPD
      expect(
        screen.getByRole("heading", { name: /definição de papéis sob a lgpd/i })
      ).toBeInTheDocument();
      expect(screen.getAllByText(/controladora/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/operadora/i).length).toBeGreaterThanOrEqual(1);

      // Assert: Segurança e RLS
      expect(
        screen.getByRole("heading", {
          name: /segurança da informação e isolamento multi-tenant/i,
        })
      ).toBeInTheDocument();
      expect(screen.getByText(/row level security \(rls\)/i)).toBeInTheDocument();

      // Assert: Direitos dos Titulares e DPO
      expect(
        screen.getByRole("heading", { name: /direitos dos titulares de dados/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("heading", { name: /canal de contato e encarregado \(dpo\)/i })
      ).toBeInTheDocument();
      expect(
        screen.getByText(/contato@aceleraautocrm\.com\.br/i)
      ).toBeInTheDocument();

      // Assert: Link para Termos
      expect(
        screen.getByRole("link", {
          name: /ver termos de licenciamento de software/i,
        })
      ).toHaveAttribute("href", "/termos");
    });
  });
});
