/**
 * @file empty-states-and-isolation.test.tsx
 * @description Suíte de Testes para Validação do Empty State Legítimo e Eliminação de Injeção de Dados Mock em Contas Reais.
 *
 * Cenários Testados:
 * - [IT-EMPTY.1]: getLeads() para usuário real autenticado com 0 registros retorna [] (sem injeção de mockLeads).
 * - [IT-EMPTY.2]: getVehicles() para usuário real autenticado com 0 registros retorna [] (sem injeção de mockVehicles).
 * - [IT-EMPTY.3]: getTeamMembers() para usuário real sem equipe retorna [] (sem injeção de INITIAL_TEAM_MEMBERS).
 * - [IT-EMPTY.4]: Modo Demonstração explícito mantém dados mockados de sandbox.
 * - [IT-EMPTY.5]: LeadsPage renderiza Empty State autêntico quando a lista de leads estiver vazia.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { getLeads } from "@/app/actions/leads";
import { getVehicles } from "@/app/actions/vehicles";
import { getTeamMembers } from "@/app/actions/team";
import * as tenantAuthModule from "@/lib/auth/tenant";
import * as supabaseServerModule from "@/lib/supabase/server";
import { render, screen } from "@testing-library/react";
import LeadsPage from "@/app/(dashboard)/leads/page";
import { DemoRoleProvider } from "@/context/demo-role-context";

// Mock de navegação
vi.mock("next/navigation", () => ({
  usePathname: () => "/leads",
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

describe("[IT-EMPTY] Empty State Legítimo & Isolamento de Dados Mock", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("[IT-EMPTY.1] Usuário Real Autenticado com 0 leads deve receber array vazio [] e nunca mockLeads", async () => {
    // Arrange: Usuário Real autenticado na organização org-real-123
    vi.spyOn(tenantAuthModule, "resolveUserTenantContext").mockResolvedValue({
      isDemo: false,
      userId: "user-real-uuid",
      organizationId: "org-real-123",
      profile: null,
      organization: null,
      needsOnboarding: false,
    });

    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      }),
    };

    vi.spyOn(supabaseServerModule, "createServerSupabaseClient").mockResolvedValue(
      mockSupabase as unknown as Awaited<ReturnType<typeof supabaseServerModule.createServerSupabaseClient>>
    );

    // Act
    const leads = await getLeads();

    // Assert
    expect(leads).toEqual([]);
    expect(leads.length).toBe(0);
    expect(mockSupabase.from).toHaveBeenCalledWith("leads");
  });

  it("[IT-EMPTY.2] Usuário Real Autenticado com 0 veículos deve receber array vazio [] e nunca mockVehicles", async () => {
    // Arrange: Usuário Real autenticado na organização org-real-123
    vi.spyOn(tenantAuthModule, "resolveUserTenantContext").mockResolvedValue({
      isDemo: false,
      userId: "user-real-uuid",
      organizationId: "org-real-123",
      profile: null,
      organization: null,
      needsOnboarding: false,
    });

    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      }),
    };

    vi.spyOn(supabaseServerModule, "createServerSupabaseClient").mockResolvedValue(
      mockSupabase as unknown as Awaited<ReturnType<typeof supabaseServerModule.createServerSupabaseClient>>
    );

    // Act
    const vehicles = await getVehicles();

    // Assert
    expect(vehicles).toEqual([]);
    expect(vehicles.length).toBe(0);
    expect(mockSupabase.from).toHaveBeenCalledWith("vehicles");
  });

  it("[IT-EMPTY.3] Usuário Real Autenticado com 0 colaboradores deve receber array vazio []", async () => {
    // Arrange: Usuário Real autenticado na organização org-real-123
    vi.spyOn(tenantAuthModule, "resolveUserTenantContext").mockResolvedValue({
      isDemo: false,
      userId: "user-real-uuid",
      organizationId: "org-real-123",
      profile: null,
      organization: null,
      needsOnboarding: false,
    });

    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      }),
    };

    vi.spyOn(supabaseServerModule, "createServerSupabaseClient").mockResolvedValue(
      mockSupabase as unknown as Awaited<ReturnType<typeof supabaseServerModule.createServerSupabaseClient>>
    );

    // Act
    const members = await getTeamMembers();

    // Assert
    expect(members).toEqual([]);
    expect(members.length).toBe(0);
    expect(mockSupabase.from).toHaveBeenCalledWith("profiles");
  });

  it("[IT-EMPTY.4] Modo Demonstração Explícito: getLeads e getVehicles continuam provendo sandbox mock data", async () => {
    // Arrange: Modo demo ativo
    vi.spyOn(tenantAuthModule, "resolveUserTenantContext").mockResolvedValue({
      isDemo: true,
      userId: "demo-user",
      organizationId: tenantAuthModule.DEFAULT_DEMO_ORG_ID,
      profile: null,
      organization: null,
      needsOnboarding: false,
    });

    // Act
    const leads = await getLeads();
    const vehicles = await getVehicles();

    // Assert
    expect(leads.length).toBeGreaterThan(0);
    expect(vehicles.length).toBeGreaterThan(0);
  });

  it("[IT-EMPTY.5] LeadsPage renderiza Empty State visual e ações de primeiro lead quando initialLeads=[]", () => {
    // Arrange & Act
    render(
      <DemoRoleProvider initialDemoMode={false}>
        <LeadsPage initialLeads={[]} />
      </DemoRoleProvider>
    );

    // Assert
    expect(screen.getByTestId("leads-empty-state")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /nenhum lead cadastrado ainda/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /cadastrar primeiro lead/i })
    ).toBeInTheDocument();
  });
});
