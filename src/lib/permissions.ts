/**
 * @file permissions.ts
 * @description Matriz centralizada de controle de acesso baseado em papéis (RBAC - Role-Based Access Control)
 * para o Acelera Auto CRM.
 */

export type UserRole =
  | "seller"
  | "manager"
  | "admin"
  | "superadmin"
  | "vendedor"
  | "gerente"
  | "owner";

export type NormalizedRole = "seller" | "manager" | "admin" | "superadmin";

/**
 * Normaliza variações textuais e papéis legados em inglês/português para a tipagem canônica (case-insensitive).
 */
export function normalizeRole(role?: string | null): NormalizedRole {
  if (!role) return "seller";
  const r = String(role).trim().toLowerCase();
  if (r === "superadmin" || r === "super_admin" || r === "super") {
    return "superadmin";
  }
  if (r === "admin" || r === "owner" || r === "proprietario" || r === "dono") {
    return "admin";
  }
  if (r === "manager" || r === "gerente" || r === "gestor") {
    return "manager";
  }
  return "seller";
}

/**
 * Gestão de Equipe & Roleta Comercial (/dashboard/team):
 * Permitido apenas para Gestores, Administradores e Superadmin.
 */
export function canManageTeam(role?: string | null): boolean {
  const norm = normalizeRole(role);
  return norm === "manager" || norm === "admin" || norm === "superadmin";
}

/**
 * Visão Panorâmica de Leads (/dashboard/leads e Cockpit):
 * - Gestores, Administradores e Superadmin visualizam todos os leads da organização.
 * - Vendedores (seller) visualizam apenas os leads atribuídos a si próprios.
 */
export function canViewAllLeads(role?: string | null): boolean {
  const norm = normalizeRole(role);
  return norm === "manager" || norm === "admin" || norm === "superadmin";
}

/**
 * Relatórios Executivos & Exportação CSV/PDF (/dashboard/reports ou /reports):
 * Permitido apenas para Gestores, Administradores e Superadmin.
 */
export function canViewExecutiveReports(role?: string | null): boolean {
  const norm = normalizeRole(role);
  return norm === "manager" || norm === "admin" || norm === "superadmin";
}

/**
 * Gestão de Integrações, Chaves de API e Faturamento (/dashboard/settings/integrations ou /billing):
 * Permitido apenas para Administradores da loja e Superadmin.
 */
export function canManageIntegrationsAndBilling(role?: string | null): boolean {
  const norm = normalizeRole(role);
  return norm === "admin" || norm === "superadmin";
}

/**
 * Painel Administrativo Global (/superadmin):
 * Restrito exclusivamente ao dono do SaaS (Superadmin).
 */
export function isSuperAdmin(role?: string | null): boolean {
  const norm = normalizeRole(role);
  return norm === "superadmin";
}
