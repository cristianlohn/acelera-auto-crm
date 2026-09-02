"use client";

import React, { Suspense, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { DemoRoleProvider, useDemoRole } from "@/context/demo-role-context";
import { RoleSimulatorBar } from "@/components/demo/RoleSimulatorBar";
import { GuidedTour } from "@/components/demo/GuidedTour";
import { VerifiedAccountToast } from "@/components/dashboard/VerifiedAccountToast";
import { SubscriptionBanner } from "@/components/dashboard/SubscriptionBanner";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileHeader } from "@/components/layout/header";
import { checkUserSubscriptionGuardAction } from "@/app/actions/auth";

/**
 * Guarda de assinatura no Layout do Dashboard.
 * Anti-Loop: Se o usuário estiver navegando em /billing, NUNCA executa redirect.
 * Se estiver fora de /billing e o status não for válido ('active' ou 'trialing'),
 * redireciona imediatamente para /billing?status=blocked.
 */
function SubscriptionLayoutGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isDemoMode } = useDemoRole();

  useEffect(() => {
    // Exceção crítica de rota (Anti-Loop): /billing e modo demonstração nunca são bloqueados
    if (
      isDemoMode ||
      !pathname ||
      pathname.startsWith("/billing") ||
      pathname.startsWith("/assinatura")
    ) {
      return;
    }

    let isMounted = true;
    checkUserSubscriptionGuardAction()
      .then((res) => {
        if (!isMounted) return;
        if (!res.isDemo && !res.isValid) {
          router.replace("/billing?status=blocked");
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [pathname, isDemoMode, router]);

  return <>{children}</>;
}

export default function DashboardLayout(props: { children: React.ReactNode }) {
  return (
    <DemoRoleProvider>
      <SubscriptionLayoutGuard>
        <Suspense fallback={null}>
          <VerifiedAccountToast />
        </Suspense>
        <div className="flex h-full min-h-screen w-full max-w-full overflow-x-hidden flex-col lg:flex-row">
          <Sidebar />

          <div className="flex flex-1 flex-col w-full max-w-full overflow-hidden">
            <SubscriptionBanner />
            <RoleSimulatorBar />
            <MobileHeader />
            <main className="flex-1 w-full max-w-full overflow-y-auto bg-background">
              {props.children}
            </main>
          </div>
        </div>
        <GuidedTour />
      </SubscriptionLayoutGuard>
    </DemoRoleProvider>
  );
}

