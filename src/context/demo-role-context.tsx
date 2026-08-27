/**
 * @file demo-role-context.tsx
 * @description Contexto do Simulador de Papéis (RBAC Demo Switcher) para o Acelera Auto CRM.
 *
 * Permite que usuários no Modo Demonstração alternem entre:
 * - Vendedor: Visão individualizada (apenas seus leads, sem acesso a relatórios globais ou configurações avançadas).
 * - Gerente: Visão panorâmica (todos os leads, relatórios executivos completos, metas de loja e SLA).
 * - Admin: Visão irrestrita (controle de equipe, limites de plano, parametrizações e permissões).
 */

"use client";

import React, { createContext, useContext, useState, useCallback } from "react";

export type DemoRole = "vendedor" | "gerente" | "admin" | "superadmin" | "seller" | "manager";

export interface RoleConfig {
  role: DemoRole;
  label: string;
  name: string;
  email: string;
  description: string;
  feedbackMessage: string;
}

export const ROLE_CONFIGS: Record<DemoRole, RoleConfig> = {
  vendedor: {
    role: "vendedor",
    label: "👤 Vendedor (Rafael Alves)",
    name: "Rafael Alves",
    email: "rafael.alves@autoprime.com.br",
    description: "Visão focada nos próprios leads com restrição a dados estratégicos e equipe.",
    feedbackMessage: "Visão de Vendedor ativada: exibindo apenas leads de Rafael Alves e perfil pessoal.",
  },
  seller: {
    role: "seller",
    label: "👤 Vendedor (Rafael Alves)",
    name: "Rafael Alves",
    email: "rafael.alves@autoprime.com.br",
    description: "Visão focada nos próprios leads com restrição a dados estratégicos e equipe.",
    feedbackMessage: "Visão de Vendedor ativada: exibindo apenas leads de Rafael Alves e perfil pessoal.",
  },
  gerente: {
    role: "gerente",
    label: "👔 Gerente Comercial",
    name: "Juliana Costa",
    email: "juliana.costa@autoprime.com.br",
    description: "Visão de gestão com acesso a todos os leads, funil, métricas de equipe e SLA.",
    feedbackMessage: "Visão de Gerente Comercial ativada: métricas executivas, relatórios e funil completo liberados.",
  },
  manager: {
    role: "manager",
    label: "👔 Gerente Comercial",
    name: "Juliana Costa",
    email: "juliana.costa@autoprime.com.br",
    description: "Visão de gestão com acesso a todos os leads, funil, métricas de equipe e SLA.",
    feedbackMessage: "Visão de Gerente Comercial ativada: métricas executivas, relatórios e funil completo liberados.",
  },
  admin: {
    role: "admin",
    label: "⚡ Admin (Dono da Loja)",
    name: "Roberto Silva",
    email: "roberto.silva@autoprime.com.br",
    description: "Controle total da concessionária, gestão de equipe, limites de plano e configurações.",
    feedbackMessage: "Visão de Administrador (Dono) ativada: controle total de equipe, quotas e configurações.",
  },
  superadmin: {
    role: "superadmin",
    label: "👑 Superadmin (SaaS Owner)",
    name: "Super Administrador",
    email: "superadmin@aceleraautocrm.com.br",
    description: "Visão executiva global do SaaS, controle de todas as concessionárias, MRR e métricas.",
    feedbackMessage: "Visão de Superadmin ativada: acesso ao Portal Executivo /superadmin liberado.",
  },
};

export interface DemoRoleContextType {
  role: DemoRole;
  setRole: (role: DemoRole) => void;
  roleConfig: RoleConfig;
  sellerName: string;
  isDemoMode: boolean;
  setIsDemoMode: (isDemo: boolean) => void;
  notification: string | null;
  clearNotification: () => void;
}

const DemoRoleContext = createContext<DemoRoleContextType | undefined>(undefined);

export function DemoRoleProvider({
  children,
  initialRole = "admin",
  initialDemoMode,
}: {
  children: React.ReactNode;
  initialRole?: DemoRole;
  initialDemoMode?: boolean;
}) {
  const [role, setRoleState] = useState<DemoRole>(() => {
    if (typeof document !== "undefined") {
      const match = document.cookie.match(/acelera_demo_role=([^;]+)/);
      if (match && match[1] && match[1] in ROLE_CONFIGS) {
        return match[1] as DemoRole;
      }
    }
    return initialRole;
  });
  const [isDemoMode, setIsDemoMode] = useState<boolean>(() => {
    if (typeof initialDemoMode === "boolean") return initialDemoMode;
    if (typeof document !== "undefined") {
      return (
        document.cookie.includes("acelera_demo_mode=true") ||
        document.cookie.includes("sb-demo-auth=true")
      );
    }
    return false;
  });
  const [notification, setNotification] = useState<string | null>(null);

  const setRole = useCallback((newRole: DemoRole) => {
    setRoleState(newRole);
    if (typeof document !== "undefined") {
      document.cookie = `acelera_demo_role=${newRole}; path=/; max-age=86400; SameSite=Lax`;
    }
    setNotification(ROLE_CONFIGS[newRole]?.feedbackMessage || `Papel alterado para ${newRole}`);
  }, []);

  const clearNotification = useCallback(() => {
    setNotification(null);
  }, []);

  const roleConfig = ROLE_CONFIGS[role];

  return (
    <DemoRoleContext.Provider
      value={{
        role,
        setRole,
        roleConfig,
        sellerName: roleConfig.name,
        isDemoMode,
        setIsDemoMode,
        notification,
        clearNotification,
      }}
    >
      {children}
    </DemoRoleContext.Provider>
  );
}

export function useDemoRole() {
  const context = useContext(DemoRoleContext);
  if (!context) {
    // Fallback gracioso se renderizado fora do Provider
    return {
      role: "admin" as DemoRole,
      setRole: () => {},
      roleConfig: ROLE_CONFIGS.admin,
      sellerName: ROLE_CONFIGS.admin.name,
      isDemoMode: false,
      setIsDemoMode: () => {},
      notification: null,
      clearNotification: () => {},
    };
  }
  return context;
}
