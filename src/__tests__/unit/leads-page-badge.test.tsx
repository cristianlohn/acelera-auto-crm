/**
 * @file leads-page-badge.test.tsx
 * @description Testes unitários para o badge de filtro do vendedor em Funil de Vendas (/leads).
 */

import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { LeadsPageClient } from "@/components/leads/leads-page-client";
import { DemoRoleProvider } from "@/context/demo-role-context";

describe("[UT-LEADS-BADGE] Badge do Vendedor no Funil de Vendas", () => {
  it("Em produção com vendedor logado, exibe o nome real do usuário autenticado no badge (ex: 'Cris Test of') e NUNCA 'Roberto Silva'", async () => {
    render(
      <DemoRoleProvider initialRole="vendedor" initialDemoMode={false}>
        <LeadsPageClient
          initialLeads={[]}
          initialTeamMembers={[]}
          userRole="seller"
          userName="Cris Test of"
        />
      </DemoRoleProvider>
    );

    // Deve exibir o badge com o nome do usuário autenticado
    await waitFor(() => {
      expect(screen.getByText(/Meus Leads \(Cris Test of\)/i)).toBeInTheDocument();
    });
    expect(screen.queryByText(/Roberto Silva/i)).not.toBeInTheDocument();
  });

  it("Em produção sem nome carregado, exibe fallback gracioso 'Meus Leads' sem vazar nomes fictícios", async () => {
    render(
      <DemoRoleProvider initialRole="vendedor" initialDemoMode={false}>
        <LeadsPageClient
          initialLeads={[]}
          initialTeamMembers={[]}
          userRole="seller"
        />
      </DemoRoleProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/^Meus Leads$/i)).toBeInTheDocument();
    });
    expect(screen.queryByText(/Roberto Silva/i)).not.toBeInTheDocument();
  });

  it("Em modo demonstração (isDemoMode=true), preserva persona simulada no badge ('Rafael Alves')", () => {
    render(
      <DemoRoleProvider initialRole="vendedor" initialDemoMode={true}>
        <LeadsPageClient
          initialLeads={[]}
          initialTeamMembers={[]}
          userRole="seller"
        />
      </DemoRoleProvider>
    );

    expect(screen.getByText(/Meus Leads \(Rafael Alves\)/i)).toBeInTheDocument();
  });
});
