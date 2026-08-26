/**
 * @file trial-calculation.test.tsx
 * @description Suíte de Testes Unitários para Cálculo Dinâmico de Trial e Concordância Gramatical do Banner.
 *
 * Cenários Testados:
 * 1. Organização criada na data atual calcula exatamente 14 dias restantes.
 * 2. SubscriptionBanner exibe o texto correto dinâmico sem números estáticos para múltiplos dias ("Restam 14 dias").
 * 3. SubscriptionBanner exibe a formatação no singular para 1 dia restante ("Resta 1 dia").
 * 4. SubscriptionBanner exibe a formatação especial para 0 dias restantes ("Último dia de teste").
 */

import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { calculateTrialDaysRemaining } from "@/lib/utils/date";
import { SubscriptionBanner } from "@/components/dashboard/SubscriptionBanner";
import type { Organization } from "@/types/crm";

describe("[UT-TRIAL] Cálculo Dinâmico de Período de Testes e Banner de Assinatura", () => {
  it("1. Deve validar que uma organização criada na data atual calcula exatamente 14 dias restantes", () => {
    const now = new Date();
    const trialEndsAt = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString();

    const org: Organization = {
      id: "org_nova",
      name: "Concessionária Nova",
      slug: "concessionaria-nova",
      plan: "trial",
      subscription_status: "trialing",
      trial_ends_at: trialEndsAt,
    };

    const daysRemaining = calculateTrialDaysRemaining(org.trial_ends_at);
    expect(daysRemaining).toBe(14);
  });

  it("2. Deve renderizar 'Restam 14 dias' dinamicamente sem valores estáticos quando restam 14 dias", () => {
    // Arrange & Act
    render(
      <SubscriptionBanner
        status={{
          hasAccess: true,
          reason: "TRIAL_ACTIVE",
          daysRemaining: 14,
        }}
      />
    );

    // Assert
    expect(screen.getByText(/período de testes:/i)).toBeInTheDocument();
    expect(screen.getByText(/restam/i)).toBeInTheDocument();
    expect(screen.getByText(/14 dias/i)).toBeInTheDocument();
  });

  it("3. Deve renderizar concordância no singular 'Resta 1 dia' quando resta apenas 1 dia", () => {
    // Arrange & Act
    render(
      <SubscriptionBanner
        status={{
          hasAccess: true,
          reason: "TRIAL_ACTIVE",
          daysRemaining: 1,
        }}
      />
    );

    // Assert
    expect(screen.getByText(/período de testes:/i)).toBeInTheDocument();
    expect(screen.getByText(/resta/i)).toBeInTheDocument();
    expect(screen.getByText(/1 dia/i)).toBeInTheDocument();
    expect(screen.queryByText(/restam/i)).not.toBeInTheDocument();
  });

  it("4. Deve renderizar 'Último dia de teste' quando restam 0 dias", () => {
    // Arrange & Act
    render(
      <SubscriptionBanner
        status={{
          hasAccess: true,
          reason: "TRIAL_ACTIVE",
          daysRemaining: 0,
        }}
      />
    );

    // Assert
    expect(screen.getByText(/período de testes:/i)).toBeInTheDocument();
    expect(screen.getByText(/último dia de teste/i)).toBeInTheDocument();
    expect(screen.queryByText(/restam/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/resta 1 dia/i)).not.toBeInTheDocument();
  });
});
