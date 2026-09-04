"use client";

import React, { Suspense, useState, useEffect } from "react";
import { DemoRoleProvider, type DemoRole } from "@/context/demo-role-context";
import { RoleSimulatorBar } from "@/components/demo/RoleSimulatorBar";
import { GuidedTour } from "@/components/demo/GuidedTour";
import { VerifiedAccountToast } from "@/components/dashboard/VerifiedAccountToast";
import { SubscriptionBanner } from "@/components/dashboard/SubscriptionBanner";
import { SubscriptionLayoutGuard } from "@/components/dashboard/SubscriptionLayoutGuard";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileHeader } from "@/components/layout/header";
import { getCurrentUserProfileAction } from "@/app/actions/auth";

export default function DashboardLayout(props: {
  children: React.ReactNode;
  initialRole?: string;
  initialProfile?: unknown;
}) {
  const [resolvedRole, setResolvedRole] = useState<string>(() => {
    if (props.initialRole) return props.initialRole;
    if (typeof document !== "undefined") {
      const match = document.cookie.match(/(?:acelera_user_role|acelera_demo_role|sb_user_role)=([^;]+)/);
      if (match && match[1]) return match[1];
      try {
        const stored = localStorage.getItem("acelera_user_role");
        if (stored) return stored;
      } catch {}
    }
    return "admin"; // Padrão seguro para evitar FOUC de vendedor para gestores no primeiro render
  });

  useEffect(() => {
    let isMounted = true;
    getCurrentUserProfileAction()
      .then((p) => {
        if (isMounted && p?.role) {
          setResolvedRole(p.role);
          if (typeof document !== "undefined") {
            document.cookie = `acelera_user_role=${p.role}; path=/; max-age=86400; SameSite=Lax`;
            try {
              localStorage.setItem("acelera_user_role", p.role);
            } catch {}
          }
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <DemoRoleProvider initialRole={resolvedRole as DemoRole}>
      <SubscriptionLayoutGuard>
        <Suspense fallback={null}>
          <VerifiedAccountToast />
        </Suspense>
        <div className="flex h-screen w-full overflow-hidden bg-background">
          {/* Sidebar Fixa com initialRole resolvido imediatamente */}
          <Sidebar
            className="hidden lg:flex shrink-0 h-screen sticky top-0"
            initialRole={resolvedRole}
            profile={props.initialProfile}
          />

          {/* Conteúdo Principal com Scroll Independente */}
          <div className="flex flex-1 flex-col h-screen overflow-y-auto overflow-x-hidden min-w-0">
            <SubscriptionBanner />
            <RoleSimulatorBar />
            <MobileHeader initialRole={resolvedRole} initialProfile={props.initialProfile} />
            <main className="flex-1 w-full max-w-full bg-background">
              {props.children}
            </main>
          </div>
        </div>
        <GuidedTour />
      </SubscriptionLayoutGuard>
    </DemoRoleProvider>
  );
}
