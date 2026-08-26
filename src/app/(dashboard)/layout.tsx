/**
 * @file layout.tsx
 * @description Layout responsivo para as páginas do dashboard do Acelera Auto CRM.
 *
 * Implementa:
 * - Sidebar de navegação lateral (desktop ≥ lg)
 * - Header com menu retrátil via Sheet (mobile)
 * - Banner de assinatura, simulador de papéis e tour guiado
 */

"use client";

import React, { Suspense } from "react";
import { DemoRoleProvider } from "@/context/demo-role-context";
import { RoleSimulatorBar } from "@/components/demo/RoleSimulatorBar";
import { GuidedTour } from "@/components/demo/GuidedTour";
import { VerifiedAccountToast } from "@/components/dashboard/VerifiedAccountToast";
import { SubscriptionBanner } from "@/components/dashboard/SubscriptionBanner";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileHeader } from "@/components/layout/header";

export default function DashboardLayout(props: { children: React.ReactNode }) {
  return (
    <DemoRoleProvider>
      <Suspense fallback={null}>
        <VerifiedAccountToast />
      </Suspense>
      <div className="flex h-full min-h-screen w-full max-w-full overflow-x-hidden flex-col lg:flex-row">
        <Sidebar />

        <div className="flex flex-1 flex-col w-full max-w-full overflow-hidden">
          <SubscriptionBanner
            status={{ hasAccess: true, reason: "TRIAL_ACTIVE", daysRemaining: 12 }}
          />
          <RoleSimulatorBar />
          <MobileHeader />
          <main className="flex-1 w-full max-w-full overflow-y-auto bg-background">
            {props.children}
          </main>
        </div>
      </div>
      <GuidedTour />
    </DemoRoleProvider>
  );
}
