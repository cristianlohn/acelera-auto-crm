/**
 * @file page.tsx
 * @description Módulo de Configurações, Parâmetros do CRM e Perfil (SettingsPage).
 *
 * Funcionalidades organizadas em 4 Abas:
 * 1. Perfil do Usuário (Nome, E-mail, Telefone, Função/Cargo, Avatar).
 * 2. Concessionária & Loja (Razão Social, Nome Fantasia, CNPJ, Telefone, Endereço, Horários).
 * 3. Parâmetros do CRM & SLA (Meta de Vendas BRL, SLA Alvo de Primeiro Contato, Alertas Urgentes).
 * 4. Preferências & Notificações (Alertas WhatsApp, Digest E-mail, Tema Visual).
 */

"use client";

import { useState, useTransition } from "react";
import {
  User,
  Building2,
  Sliders,
  Bell,
  Save,
  CheckCircle2,
  Sparkles,
  Phone,
  Mail,
  Shield,
  Clock,
  DollarSign,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Tipos das Abas e Configurações
// ---------------------------------------------------------------------------

export type SettingsTab = "perfil" | "loja" | "sla" | "preferencias";

export interface UserProfileState {
  fullName: string;
  email: string;
  phone: string;
  role: "admin" | "gerente" | "vendedor";
}

export interface StoreState {
  legalName: string;
  tradeName: string;
  cnpj: string;
  phone: string;
  email: string;
  address: string;
  businessHours: string;
}

export interface CRMParamsState {
  monthlySalesGoal: number;
  slaTargetMinutes: number;
  urgentAlertsEnabled: boolean;
}

export interface PreferencesState {
  whatsappNotifications: boolean;
  emailDailyDigest: boolean;
  theme: "light" | "dark" | "system";
}

const TAB_ITEMS: { id: SettingsTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "perfil", label: "Perfil do Usuário", icon: User },
  { id: "loja", label: "Concessionária & Loja", icon: Building2 },
  { id: "sla", label: "Parâmetros do CRM & SLA", icon: Sliders },
  { id: "preferencias", label: "Preferências & Notificações", icon: Bell },
];

// ---------------------------------------------------------------------------
// Componente Principal: SettingsPage
// ---------------------------------------------------------------------------

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("perfil");
  const [isSaving, startSavingTransition] = useTransition();
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);

  // Estados dos formulários das abas
  const [profile, setProfile] = useState<UserProfileState>({
    fullName: "Rafael Alves",
    email: "rafael.alves@aceleraauto.com.br",
    phone: "11987654321",
    role: "gerente",
  });

  const [store, setStore] = useState<StoreState>({
    legalName: "Acelera Auto Comércio de Veículos LTDA",
    tradeName: "Acelera Auto Matriz",
    cnpj: "12.345.678/0001-90",
    phone: "1133334444",
    email: "contato@aceleraauto.com.br",
    address: "Av. das Nações Unidas, 12901 - Brooklin Paulista, São Paulo - SP",
    businessHours: "Segunda a Sexta: 08:00 - 19:00 | Sábado: 09:00 - 16:00",
  });

  const [crmParams, setCrmParams] = useState<CRMParamsState>({
    monthlySalesGoal: 2000000,
    slaTargetMinutes: 15,
    urgentAlertsEnabled: true,
  });

  const [preferences, setPreferences] = useState<PreferencesState>({
    whatsappNotifications: true,
    emailDailyDigest: true,
    theme: "system",
  });

  // Disparo de salvamento com feedback visual
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    startSavingTransition(() => {
      setTimeout(() => {
        setSaveFeedback("Configurações Salvas com Sucesso!");
        setTimeout(() => setSaveFeedback(null), 3000);
      }, 300);
    });
  };

  return (
    <div className="flex h-full flex-col">
      {/* ------------------------------------------------------------------ */}
      {/* Topo / Header da Página                                            */}
      {/* ------------------------------------------------------------------ */}
      <div className="sticky top-0 z-10 border-b bg-background/95 px-4 py-3 backdrop-blur-sm sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight text-foreground sm:text-xl">
                Configurações do Sistema
              </h1>
              <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-semibold text-orange-700 dark:bg-orange-950/60 dark:text-orange-300">
                <Sparkles className="h-3 w-3" />
                Ajustes
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Gerencie seu perfil, dados da concessionária, metas de vendas e preferências
            </p>
          </div>

          {/* Feedback Global de Salvamento */}
          {saveFeedback && (
            <div
              role="status"
              className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 dark:border-emerald-800/60 dark:bg-emerald-950/60 dark:text-emerald-300 animate-in fade-in"
            >
              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span>{saveFeedback}</span>
            </div>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Navegação por Abas                                                 */}
      {/* ------------------------------------------------------------------ */}
      <div className="border-b bg-muted/30 px-4 sm:px-6">
        <div
          role="tablist"
          aria-label="Abas de configuração"
          className="flex space-x-2 overflow-x-auto max-w-full py-2 text-xs"
        >
          {TAB_ITEMS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`tab-${tab.id}`}
                role="tab"
                aria-selected={isActive}
                aria-controls={`panel-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3.5 py-2 font-medium transition-all duration-200 whitespace-nowrap",
                  isActive
                    ? "bg-background text-foreground shadow-sm font-semibold ring-1 ring-border"
                    : "text-muted-foreground hover:bg-background/50 hover:text-foreground"
                )}
              >
                <Icon
                  className={cn(
                    "h-4 w-4",
                    isActive ? "text-orange-500" : "text-muted-foreground"
                  )}
                />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Painéis das Abas                                                   */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex-1 p-4 sm:p-6 max-w-4xl">
        <form onSubmit={handleSave}>
          {/* =============================================================== */}
          {/* Aba 1: Perfil do Usuário                                         */}
          {/* =============================================================== */}
          {activeTab === "perfil" && (
            <section
              id="panel-perfil"
              role="tabpanel"
              aria-labelledby="tab-perfil"
              className="space-y-6"
            >
              <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
                <div className="flex items-center gap-3 border-b pb-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-red-500 text-sm font-bold text-white shadow-md">
                    {profile.fullName
                      .split(" ")
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-foreground">
                      {profile.fullName}
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      Cargo atual:{" "}
                      <span className="capitalize font-semibold text-orange-600 dark:text-orange-400">
                        {profile.role}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="grid gap-1.5">
                    <label
                      htmlFor="profile-name"
                      className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"
                    >
                      <User className="h-3.5 w-3.5" />
                      Nome Completo *
                    </label>
                    <Input
                      id="profile-name"
                      name="fullName"
                      value={profile.fullName}
                      onChange={(e) =>
                        setProfile((prev) => ({ ...prev, fullName: e.target.value }))
                      }
                      required
                    />
                  </div>

                  <div className="grid gap-1.5">
                    <label
                      htmlFor="profile-email"
                      className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"
                    >
                      <Mail className="h-3.5 w-3.5" />
                      E-mail Corporativo *
                    </label>
                    <Input
                      id="profile-email"
                      name="email"
                      type="email"
                      value={profile.email}
                      onChange={(e) =>
                        setProfile((prev) => ({ ...prev, email: e.target.value }))
                      }
                      required
                    />
                  </div>

                  <div className="grid gap-1.5">
                    <label
                      htmlFor="profile-phone"
                      className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"
                    >
                      <Phone className="h-3.5 w-3.5" />
                      Telefone / WhatsApp
                    </label>
                    <Input
                      id="profile-phone"
                      name="phone"
                      value={profile.phone}
                      onChange={(e) =>
                        setProfile((prev) => ({ ...prev, phone: e.target.value }))
                      }
                    />
                  </div>

                  <div className="grid gap-1.5">
                    <label
                      htmlFor="profile-role"
                      className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"
                    >
                      <Shield className="h-3.5 w-3.5" />
                      Função no Sistema
                    </label>
                    <select
                      id="profile-role"
                      name="role"
                      value={profile.role}
                      onChange={(e) =>
                        setProfile((prev) => ({
                          ...prev,
                          role: e.target.value as UserProfileState["role"],
                        }))
                      }
                      className="h-8 w-full rounded-md border border-input bg-background px-2.5 text-xs font-medium text-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                    >
                      <option value="vendedor">Vendedor (Consultor)</option>
                      <option value="gerente">Gerente Comercial</option>
                      <option value="admin">Administrador Geral</option>
                    </select>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* =============================================================== */}
          {/* Aba 2: Concessionária & Loja                                     */}
          {/* =============================================================== */}
          {activeTab === "loja" && (
            <section
              id="panel-loja"
              role="tabpanel"
              aria-labelledby="tab-loja"
              className="space-y-6"
            >
              <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
                <div className="border-b pb-3">
                  <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-orange-500" />
                    Dados Cadastrais da Concessionária
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Informações exibidas em propostas, fichas técnicas e comunicações com o cliente
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="grid gap-1.5 sm:col-span-2">
                    <label
                      htmlFor="store-legalName"
                      className="text-xs font-medium text-muted-foreground"
                    >
                      Razão Social *
                    </label>
                    <Input
                      id="store-legalName"
                      value={store.legalName}
                      onChange={(e) =>
                        setStore((prev) => ({ ...prev, legalName: e.target.value }))
                      }
                      required
                    />
                  </div>

                  <div className="grid gap-1.5">
                    <label
                      htmlFor="store-tradeName"
                      className="text-xs font-medium text-muted-foreground"
                    >
                      Nome Fantasia *
                    </label>
                    <Input
                      id="store-tradeName"
                      value={store.tradeName}
                      onChange={(e) =>
                        setStore((prev) => ({ ...prev, tradeName: e.target.value }))
                      }
                      required
                    />
                  </div>

                  <div className="grid gap-1.5">
                    <label
                      htmlFor="store-cnpj"
                      className="text-xs font-medium text-muted-foreground"
                    >
                      CNPJ *
                    </label>
                    <Input
                      id="store-cnpj"
                      value={store.cnpj}
                      onChange={(e) =>
                        setStore((prev) => ({ ...prev, cnpj: e.target.value }))
                      }
                      required
                    />
                  </div>

                  <div className="grid gap-1.5">
                    <label
                      htmlFor="store-phone"
                      className="text-xs font-medium text-muted-foreground"
                    >
                      Telefone Principal
                    </label>
                    <Input
                      id="store-phone"
                      value={store.phone}
                      onChange={(e) =>
                        setStore((prev) => ({ ...prev, phone: e.target.value }))
                      }
                    />
                  </div>

                  <div className="grid gap-1.5">
                    <label
                      htmlFor="store-email"
                      className="text-xs font-medium text-muted-foreground"
                    >
                      E-mail Comercial
                    </label>
                    <Input
                      id="store-email"
                      type="email"
                      value={store.email}
                      onChange={(e) =>
                        setStore((prev) => ({ ...prev, email: e.target.value }))
                      }
                    />
                  </div>

                  <div className="grid gap-1.5 sm:col-span-2">
                    <label
                      htmlFor="store-address"
                      className="text-xs font-medium text-muted-foreground"
                    >
                      Endereço Completo do Pátio / Showroom
                    </label>
                    <Input
                      id="store-address"
                      value={store.address}
                      onChange={(e) =>
                        setStore((prev) => ({ ...prev, address: e.target.value }))
                      }
                    />
                  </div>

                  <div className="grid gap-1.5 sm:col-span-2">
                    <label
                      htmlFor="store-hours"
                      className="text-xs font-medium text-muted-foreground"
                    >
                      Horário de Funcionamento
                    </label>
                    <Input
                      id="store-hours"
                      value={store.businessHours}
                      onChange={(e) =>
                        setStore((prev) => ({ ...prev, businessHours: e.target.value }))
                      }
                    />
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* =============================================================== */}
          {/* Aba 3: Parâmetros do CRM & SLA                                   */}
          {/* =============================================================== */}
          {activeTab === "sla" && (
            <section
              id="panel-sla"
              role="tabpanel"
              aria-labelledby="tab-sla"
              className="space-y-6"
            >
              <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
                <div className="border-b pb-3">
                  <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Sliders className="h-4 w-4 text-orange-500" />
                    Parâmetros Comerciais & SLA de Atendimento
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Defina metas de receita e regras automáticas de urgência para contato
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="grid gap-1.5">
                    <label
                      htmlFor="crm-salesGoal"
                      className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"
                    >
                      <DollarSign className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                      Meta Mensal de Vendas da Loja (R$)
                    </label>
                    <Input
                      id="crm-salesGoal"
                      type="number"
                      value={crmParams.monthlySalesGoal}
                      onChange={(e) =>
                        setCrmParams((prev) => ({
                          ...prev,
                          monthlySalesGoal: Number(e.target.value),
                        }))
                      }
                      min={0}
                      step={50000}
                    />
                  </div>

                  <div className="grid gap-1.5">
                    <label
                      htmlFor="crm-slaTarget"
                      className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"
                    >
                      <Clock className="h-3.5 w-3.5 text-amber-500" />
                      SLA Alvo de 1º Contato ao Lead (minutos)
                    </label>
                    <Input
                      id="crm-slaTarget"
                      type="number"
                      value={crmParams.slaTargetMinutes}
                      onChange={(e) =>
                        setCrmParams((prev) => ({
                          ...prev,
                          slaTargetMinutes: Number(e.target.value),
                        }))
                      }
                      min={1}
                      max={120}
                    />
                  </div>

                  <div className="sm:col-span-2 pt-2">
                    <label className="flex items-center gap-3 rounded-lg border bg-muted/30 p-3 cursor-pointer hover:bg-muted/60 transition-colors">
                      <input
                        id="crm-urgentAlerts"
                        type="checkbox"
                        checked={crmParams.urgentAlertsEnabled}
                        onChange={(e) =>
                          setCrmParams((prev) => ({
                            ...prev,
                            urgentAlertsEnabled: e.target.checked,
                          }))
                        }
                        className="h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                      />
                      <div className="text-xs">
                        <span className="font-semibold text-foreground block">
                          Alerta visual/sonoro para leads sem contato &gt; 6 horas
                        </span>
                        <span className="text-muted-foreground block text-[11px]">
                          Destaca automaticamente cards no Kanban em cor vermelha e envia aviso aos vendedores.
                        </span>
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* =============================================================== */}
          {/* Aba 4: Preferências & Notificações                               */}
          {/* =============================================================== */}
          {activeTab === "preferencias" && (
            <section
              id="panel-preferencias"
              role="tabpanel"
              aria-labelledby="tab-preferencias"
              className="space-y-6"
            >
              <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
                <div className="border-b pb-3">
                  <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Bell className="h-4 w-4 text-orange-500" />
                    Preferências de Notificação e Interface
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Controle de canais de aviso e personalização visual
                  </p>
                </div>

                <div className="space-y-3">
                  <label className="flex items-center justify-between rounded-lg border bg-muted/20 p-3.5 cursor-pointer hover:bg-muted/40 transition-colors">
                    <div>
                      <span className="text-xs font-semibold text-foreground block">
                        Notificações de Novos Leads via WhatsApp
                      </span>
                      <span className="text-[11px] text-muted-foreground block">
                        Receba uma notificação instantânea quando um novo lead entrar pelo site ou redes sociais.
                      </span>
                    </div>
                    <input
                      id="pref-whatsappNotify"
                      type="checkbox"
                      checked={preferences.whatsappNotifications}
                      onChange={(e) =>
                        setPreferences((prev) => ({
                          ...prev,
                          whatsappNotifications: e.target.checked,
                        }))
                      }
                      className="h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                    />
                  </label>

                  <label className="flex items-center justify-between rounded-lg border bg-muted/20 p-3.5 cursor-pointer hover:bg-muted/40 transition-colors">
                    <div>
                      <span className="text-xs font-semibold text-foreground block">
                        Resumo Diário Executivo por E-mail
                      </span>
                      <span className="text-[11px] text-muted-foreground block">
                        Envio matinal às 08:00 com indicadores de vendas e estoque pendente.
                      </span>
                    </div>
                    <input
                      id="pref-emailDailyDigest"
                      type="checkbox"
                      checked={preferences.emailDailyDigest}
                      onChange={(e) =>
                        setPreferences((prev) => ({
                          ...prev,
                          emailDailyDigest: e.target.checked,
                        }))
                      }
                      className="h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                    />
                  </label>

                  {/* Seleção de Tema Visual */}
                  <div className="pt-2">
                    <label
                      htmlFor="pref-theme"
                      className="text-xs font-medium text-muted-foreground block mb-2"
                    >
                      Tema Visual da Aplicação
                    </label>
                    <select
                      id="pref-theme"
                      value={preferences.theme}
                      onChange={(e) =>
                        setPreferences((prev) => ({
                          ...prev,
                          theme: e.target.value as PreferencesState["theme"],
                        }))
                      }
                      className="h-8 w-full max-w-xs rounded-md border border-input bg-background px-2.5 text-xs font-medium text-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                    >
                      <option value="system">Automático (Padrão do Sistema)</option>
                      <option value="light">Tema Claro (Light Mode)</option>
                      <option value="dark">Tema Escuro (Dark Mode)</option>
                    </select>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Botão de Salvar Alterações */}
          <div className="mt-6 flex items-center justify-end gap-3 border-t pt-4">
            <Button
              id="btn-save-settings"
              type="submit"
              size="sm"
              disabled={isSaving}
              className="gap-2 bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-md shadow-orange-500/25 hover:from-orange-600 hover:to-red-600"
            >
              <Save className="h-4 w-4" />
              <span>{isSaving ? "Salvando..." : "Salvar Alterações"}</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
