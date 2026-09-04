/**
 * @file SubscriptionLayoutGuard.tsx
 * @description Guarda de assinatura no Layout do Dashboard.
 * Anti-Loop: Se o usuário estiver navegando em /billing, NUNCA executa redirect.
 * Se estiver fora de /billing e o status não for válido ('active' ou 'trialing'),
 * redireciona imediatamente para /billing?status=blocked.
 */

"use client";

import React, { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useDemoRole } from "@/context/demo-role-context";
import { checkUserSubscriptionGuardAction } from "@/app/actions/auth";

export function SubscriptionLayoutGuard({ children }: { children: React.ReactNode }) {
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
