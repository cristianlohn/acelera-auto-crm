/**
 * @file billing-management.test.tsx
 * @description Suíte de Testes Unitários para a Governança RBAC e Gestão de Assinatura (SubscriptionManagementCard & Actions).
 *
 * Cenários Testados:
 * - [TEST-BILL-RBAC-1]: Bloqueio de getSubscriptionOverviewAction para papéis operacionais (seller, member, manager).
 * - [TEST-BILL-RBAC-2]: Liberação de getSubscriptionOverviewAction para papéis administrativos (owner, admin, superadmin).
 * - [TEST-BILL-RBAC-3]: Bloqueio de createSubscriptionCheckoutAction para papéis não autorizados.
 * - [TEST-BILL-RBAC-4]: Ocultação do item de menu /billing na Sidebar para seller e manager, e exibição para admin/owner.
 * - [TEST-BILL-CARD-1]: Renderização do SubscriptionManagementCard com cobrança mensal e cartão de crédito.
 * - [TEST-BILL-CARD-2]: Renderização do SubscriptionManagementCard com cobrança anual e boleto bancário.
 * - [TEST-BILL-CARD-3]: Renderização de alerta de fatura vencida (overdue) com botão prioritário de regularização.
 * - [TEST-BILL-CARD-4]: Função formatToDateBR formata corretamente datas ISO no padrão brasileiro DD/MM/YYYY.
 */

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import {
  getSubscriptionOverviewAction,
  createSubscriptionCheckoutAction,
  type SubscriptionInvoice,
} from "@/app/actions/billing-actions";
import * as billingActions from "@/app/actions/billing-actions";
import { getNavItemsForRole } from "@/components/layout/sidebar";
import {
  SubscriptionManagementCard,
  formatToDateBR,
} from "@/components/billing/subscription-management-card";
import { SubscriptionInvoicesTable } from "@/components/billing/subscription-invoices-table";
import { ChangePlanModal } from "@/components/billing/change-plan-modal";
import BillingPage from "@/app/(dashboard)/billing/page";
import * as tenantModule from "@/lib/auth/tenant";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
}));

type MockProfile = NonNullable<tenantModule.TenantContextResult["profile"]>;
type MockOrg = NonNullable<tenantModule.TenantContextResult["organization"]>;

describe("[UNIT-BILLING-MANAGEMENT] Governança RBAC e Cockpit de Assinatura", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("1. Controle de Acesso RBAC em Server Actions", () => {
    it("[TEST-BILL-RBAC-1] deve bloquear getSubscriptionOverviewAction para usuários com papel 'seller'", async () => {
      vi.spyOn(tenantModule, "resolveUserTenantContext").mockResolvedValue({
        userId: "user-seller-1",
        organizationId: "org-1",
        isDemo: false,
        needsOnboarding: false,
        profile: { role: "seller", full_name: "Vendedor Teste", email: "seller@loja.com" } as unknown as MockProfile,
        organization: { id: "org-1", name: "Loja Teste", plan: "pro" } as unknown as MockOrg,
      });

      const res = await getSubscriptionOverviewAction();

      expect(res.success).toBe(false);
      expect(res.error).toMatch(/acesso restrito/i);
      expect(res.data).toBeUndefined();
    });

    it("[TEST-BILL-RBAC-1.1] deve bloquear getSubscriptionOverviewAction para usuários com papel 'manager'", async () => {
      vi.spyOn(tenantModule, "resolveUserTenantContext").mockResolvedValue({
        userId: "user-manager-1",
        organizationId: "org-1",
        isDemo: false,
        needsOnboarding: false,
        profile: { role: "manager", full_name: "Gestor Loja", email: "manager@loja.com" } as unknown as MockProfile,
        organization: { id: "org-1", name: "Loja Teste", plan: "pro" } as unknown as MockOrg,
      });

      const res = await getSubscriptionOverviewAction();

      expect(res.success).toBe(false);
      expect(res.error).toMatch(/acesso restrito/i);
    });

    it("[TEST-BILL-RBAC-2] deve liberar getSubscriptionOverviewAction para usuários com papel 'admin'", async () => {
      vi.spyOn(tenantModule, "resolveUserTenantContext").mockResolvedValue({
        userId: "user-admin-1",
        organizationId: "org-1",
        isDemo: false,
        needsOnboarding: false,
        profile: { role: "admin", full_name: "Admin Loja", email: "admin@loja.com" } as unknown as MockProfile,
        organization: {
          id: "org-1",
          name: "Loja Teste",
          plan: "pro",
          subscription_status: "active",
          current_period_end: "2026-10-15T23:59:59.999Z",
        } as unknown as MockOrg,
      });

      const res = await getSubscriptionOverviewAction();

      expect(res.success).toBe(true);
      expect(res.data?.status).toBe("active");
      expect(res.data?.planName).toBe("Plano Pro");
    });

    it("[TEST-BILL-RBAC-2.1] deve liberar getSubscriptionOverviewAction para papel 'owner'", async () => {
      vi.spyOn(tenantModule, "resolveUserTenantContext").mockResolvedValue({
        userId: "user-owner-1",
        organizationId: "org-1",
        isDemo: false,
        needsOnboarding: false,
        profile: { role: "owner", full_name: "Proprietário", email: "owner@loja.com" } as unknown as MockProfile,
        organization: {
          id: "org-1",
          name: "Loja Teste",
          plan: "enterprise",
          subscription_status: "active",
        } as unknown as MockOrg,
      });

      const res = await getSubscriptionOverviewAction();

      expect(res.success).toBe(true);
      expect(res.data?.planName).toBe("Plano Enterprise");
    });

    it("[TEST-BILL-RBAC-3] deve bloquear createSubscriptionCheckoutAction para perfis operacionais", async () => {
      vi.spyOn(tenantModule, "resolveUserTenantContext").mockResolvedValue({
        userId: "user-seller-2",
        organizationId: "org-1",
        isDemo: false,
        needsOnboarding: false,
        profile: { role: "seller", full_name: "Vendedor 2", email: "seller2@loja.com" } as unknown as MockProfile,
        organization: { id: "org-1", name: "Loja Teste" } as unknown as MockOrg,
      });

      const res = await createSubscriptionCheckoutAction({ planId: "pro" });

      expect(res.success).toBe(false);
      expect(res.error).toMatch(/acesso restrito/i);
    });
  });

  describe("2. Visibilidade Condicional do Menu na Sidebar", () => {
    it("[TEST-BILL-RBAC-4] NÃO deve conter /billing para vendedor (seller)", () => {
      const items = getNavItemsForRole("seller");
      const hasBilling = items.some((item) => item.href === "/billing");
      expect(hasBilling).toBe(false);
    });

    it("[TEST-BILL-RBAC-4.1] NÃO deve conter /billing para gerente (manager)", () => {
      const items = getNavItemsForRole("manager");
      const hasBilling = items.some((item) => item.href === "/billing");
      expect(hasBilling).toBe(false);
    });

    it("[TEST-BILL-RBAC-4.2] DEVE conter /billing para administrador (admin)", () => {
      const items = getNavItemsForRole("admin");
      const billingItem = items.find((item) => item.href === "/billing");
      expect(billingItem).toBeDefined();
      expect(billingItem?.label).toBe("Faturamento");
    });

    it("[TEST-BILL-RBAC-4.3] DEVE conter /billing para proprietário (owner)", () => {
      const items = getNavItemsForRole("owner");
      const billingItem = items.find((item) => item.href === "/billing");
      expect(billingItem).toBeDefined();
      expect(billingItem?.label).toBe("Faturamento");
    });
  });

  describe("3. Componente SubscriptionManagementCard", () => {
    it("[TEST-BILL-CARD-1] deve renderizar dados de plano ativo mensal com Cartão de Crédito", () => {
      const mockSub = {
        planId: "pro",
        planName: "Plano Pro",
        status: "active" as const,
        billingCycle: "mensal" as const,
        price: 597,
        nextDueDate: "2026-10-15T23:59:59.999Z",
        daysRemaining: 18,
        paymentMethod: {
          type: "credit_card" as const,
          brand: "Mastercard",
          last4: "4242",
        },
      };

      render(<SubscriptionManagementCard subscription={mockSub} />);

      expect(screen.getByText("Plano Pro")).toBeInTheDocument();
      expect(screen.getByText("Cobrança Mensal")).toBeInTheDocument();
      expect(screen.getByText("Assinatura Ativa")).toBeInTheDocument();
      expect(screen.getByText(/r\$\s*597,00/i)).toBeInTheDocument();
      expect(screen.getByText("15/10/2026")).toBeInTheDocument();
      expect(screen.getByText(/renova em 18 dias/i)).toBeInTheDocument();
      expect(screen.getByText("Mastercard")).toBeInTheDocument();
      expect(screen.getByText(/•••• 4242/i)).toBeInTheDocument();
    });

    it("[TEST-BILL-CARD-2] deve renderizar dados de plano anual com Boleto Bancário", () => {
      const mockSub = {
        planId: "enterprise",
        planName: "Plano Enterprise",
        status: "active" as const,
        billingCycle: "anual" as const,
        price: 12970,
        nextDueDate: "2027-09-01T23:59:59.999Z",
        daysRemaining: 364,
        paymentMethod: {
          type: "boleto" as const,
        },
      };

      render(<SubscriptionManagementCard subscription={mockSub} />);

      expect(screen.getByText("Plano Enterprise")).toBeInTheDocument();
      expect(screen.getByText("Cobrança Anual (Economia Aplicada)")).toBeInTheDocument();
      expect(screen.getByText("Boleto Bancário")).toBeInTheDocument();
      expect(screen.getByText("01/09/2027")).toBeInTheDocument();
    });

    it("[TEST-BILL-CARD-3] deve exibir alerta e botão de regularização quando status for 'overdue'", () => {
      const paySpy = vi.fn();
      const mockSub = {
        planId: "pro",
        planName: "Plano Pro",
        status: "overdue" as const,
        billingCycle: "mensal" as const,
        price: 597,
        nextDueDate: "2026-08-10T23:59:59.999Z",
        daysRemaining: 0,
        paymentMethod: {
          type: "pix" as const,
        },
      };

      render(
        <SubscriptionManagementCard
          subscription={mockSub}
          onPayOverdue={paySpy}
          onChangePlan={vi.fn()}
        />
      );

      expect(screen.getByText("Fatura Vencida / Inadimplente")).toBeInTheDocument();
      const payBtn = screen.getByTestId("btn-pay-overdue");
      expect(payBtn).toBeInTheDocument();
      expect(payBtn).toHaveTextContent(/regularizar fatura pendente/i);

      fireEvent.click(payBtn);
      expect(paySpy).toHaveBeenCalledTimes(1);
    });

    it("[TEST-BILL-CARD-4] formatToDateBR formata corretamente strings de data brasileiras", () => {
      expect(formatToDateBR("2026-10-15")).toBe("15/10/2026");
      expect(formatToDateBR("2026-10-15T23:59:59.999Z")).toBe("15/10/2026");
      expect(formatToDateBR(null)).toBe("--/--/----");
      expect(formatToDateBR(undefined)).toBe("--/--/----");
    });
  });

  describe("4. Componente SubscriptionInvoicesTable", () => {
    it("[TEST-BILL-INV-1] deve renderizar tabela de faturas com dados formatados e botão de comprovante", () => {
      const mockInvoices: SubscriptionInvoice[] = [
        {
          id: "inv-1",
          dueDate: "2026-09-15",
          paymentDate: "2026-09-15",
          value: 597,
          billingType: "CREDIT_CARD",
          status: "RECEIVED",
          receiptUrl: "https://asaas.com/recibo/1",
        },
      ];

      render(<SubscriptionInvoicesTable initialInvoices={mockInvoices} />);

      expect(screen.getByText("Histórico de Faturas & Pagamentos")).toBeInTheDocument();
      expect(screen.getByText("15/09/2026")).toBeInTheDocument();
      expect(screen.getByText(/r\$\s*597,00/i)).toBeInTheDocument();
      expect(screen.getByText("Cartão")).toBeInTheDocument();
      expect(screen.getByText("Pago")).toBeInTheDocument();
      expect(screen.getByText(/pdf \/ recibo/i)).toBeInTheDocument();
    });

    it("[TEST-BILL-INV-2] deve exibir empty state amigável quando não houver faturas registradas", () => {
      render(<SubscriptionInvoicesTable initialInvoices={[]} />);

      expect(screen.getByTestId("invoices-empty-state")).toBeInTheDocument();
      expect(screen.getByText(/nenhuma fatura anterior registrada/i)).toBeInTheDocument();
    });
  });

  describe("5. Componente ChangePlanModal", () => {
    it("[TEST-BILL-MODAL-1] deve exibir plano atual com badge e botão desabilitado, e botão de upgrade para planos superiores", () => {
      const selectSpy = vi.fn();
      render(
        <ChangePlanModal
          isOpen={true}
          onClose={vi.fn()}
          currentPlan="pro"
          onSelectPlan={selectSpy}
        />
      );

      expect(screen.getByText("Trocar de Plano ou Fazer Upgrade")).toBeInTheDocument();
      expect(screen.getByTestId("badge-current-plan")).toBeInTheDocument();
      expect(screen.getByTestId("btn-current-pro")).toBeDisabled();

      const upgradeBtn = screen.getByTestId("btn-upgrade-enterprise");
      expect(upgradeBtn).toHaveTextContent(/fazer upgrade/i);
      fireEvent.click(upgradeBtn);
      expect(selectSpy).toHaveBeenCalledWith("enterprise");
    });
  });

  describe("6. Renderização Condicional da Página de Faturamento (BillingPage)", () => {
    it("[TEST-BILL-COND-1] deve confirmar que a vitrine de planos NÃO é renderizada quando subscription_status === 'active'", async () => {
      vi.spyOn(billingActions, "getSubscriptionOverviewAction").mockResolvedValue({
        success: true,
        data: {
          planId: "pro",
          planName: "Plano Pro",
          status: "active",
          billingCycle: "mensal",
          price: 597,
          nextDueDate: "2026-10-15T23:59:59.999Z",
          daysRemaining: 20,
          paymentMethod: { type: "credit_card", brand: "Visa", last4: "1234" },
        },
      });

      vi.spyOn(billingActions, "getBillingInitialDataAction").mockResolvedValue({
        success: true,
        data: {
          name: "Auto Prime Motors",
          email: "financeiro@autoprime.com.br",
          phone: "11988887777",
          document: "12.345.678/0001-90",
          documentType: "CNPJ",
        },
      });

      render(<BillingPage />);

      await waitFor(() => {
        expect(screen.getByTestId("subscription-management-card")).toBeInTheDocument();
      });

      // NÃO deve exibir a vitrine pública de planos
      expect(screen.queryByText(/escolha o plano ideal para a sua concessionária/i)).not.toBeInTheDocument();
      expect(screen.queryByTestId("subscribe-pro-btn")).not.toBeInTheDocument();
    });

    it("[TEST-BILL-COND-2] deve confirmar que a tabela de faturas e dados de cobrança são renderizados para assinante ativo", async () => {
      vi.spyOn(billingActions, "getSubscriptionOverviewAction").mockResolvedValue({
        success: true,
        data: {
          planId: "pro",
          planName: "Plano Pro",
          status: "active",
          billingCycle: "mensal",
          price: 597,
          nextDueDate: "2026-10-15T23:59:59.999Z",
          daysRemaining: 20,
        },
      });

      vi.spyOn(billingActions, "getSubscriptionInvoicesAction").mockResolvedValue({
        success: true,
        data: [],
      });

      render(<BillingPage />);

      await waitFor(() => {
        expect(screen.getByTestId("subscription-invoices-table")).toBeInTheDocument();
        expect(screen.getByTestId("billing-customer-info-card")).toBeInTheDocument();
      });
    });

    it("[TEST-BILL-COND-3] deve confirmar que a vitrine de planos PERMANECE visível quando em 'trialing' ou sem assinatura", async () => {
      vi.spyOn(billingActions, "getSubscriptionOverviewAction").mockResolvedValue({
        success: true,
        data: {
          planId: "pro",
          planName: "Plano Pro",
          status: "trialing",
          billingCycle: "mensal",
          price: 597,
          nextDueDate: "2026-09-10T23:59:59.999Z",
          daysRemaining: 7,
        },
      });

      render(<BillingPage />);

      await waitFor(() => {
        expect(screen.getByText(/escolha o plano ideal para a sua concessionária/i)).toBeInTheDocument();
        expect(screen.getByTestId("subscribe-pro-btn")).toBeInTheDocument();
      });
    });
  });
});
