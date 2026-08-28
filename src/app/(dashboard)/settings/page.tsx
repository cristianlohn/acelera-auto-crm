/**
 * @file page.tsx
 * @description Módulo de Configurações, Parâmetros do CRM, Perfil e Gestão de Equipe (SettingsPage).
 *
 * Funcionalidades organizadas em 5 Abas:
 * 1. Perfil do Usuário (Nome, E-mail, Telefone, Função/Cargo, Avatar).
 * 2. Concessionária & Loja (Razão Social, Nome Fantasia, CNPJ, Telefone, Endereço, Horários).
 * 3. Parâmetros do CRM & SLA (Meta de Vendas BRL, SLA Alvo de Primeiro Contato, Alertas Urgentes).
 * 4. Preferências & Notificações (Alertas WhatsApp, Digest E-mail, Tema Visual).
 * 5. Equipe & Vendedores (Capacidade do plano, listagem de colaboradores, convite com trava de cota e upgrade).
 */

"use client";

import { useState, useEffect, useTransition } from "react";
import {
  User,
  Building2,
  Sliders,
  Bell,
  Save,
  CheckCircle2,
  Sparkles,
  Users,
  UserPlus,
  Trash2,
  Crown,
  MessageSquare,
  AlertCircle,
  X,
  Lock,
  Webhook,
  Copy,
  Check,
  Eye,
  EyeOff,
  Code,
  FileJson,
  Key,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useDemoRole } from "@/context/demo-role-context";
import {
  INITIAL_TEAM_MEMBERS,
  INITIAL_CAPACITY,
  type TeamMember,
  type TeamCapacity,
  type UserRole,
  type InviteMemberInput,
} from "@/lib/team-data";
import {
  inviteTeamMember,
  removeTeamMember,
  getTeamMembers,
} from "@/app/actions/team";
import {
  getCurrentUserProfileAction,
  updateOrganizationSettingsAction,
} from "@/app/actions/auth";
import { formatDocument, formatPhone } from "@/lib/validations/document";

// ---------------------------------------------------------------------------
// Tipos das Abas e Configurações
// ---------------------------------------------------------------------------

export type SettingsTab =
  | "perfil"
  | "loja"
  | "sla"
  | "preferencias"
  | "equipe"
  | "integracoes";

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

const TAB_ITEMS: {
  id: SettingsTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: "perfil", label: "Perfil do Usuário", icon: User },
  { id: "loja", label: "Concessionária & Loja", icon: Building2 },
  { id: "sla", label: "Parâmetros do CRM & SLA", icon: Sliders },
  { id: "preferencias", label: "Preferências & Notificações", icon: Bell },
  { id: "equipe", label: "Equipe & Vendedores", icon: Users },
  { id: "integracoes", label: "Integrações & Webhooks", icon: Webhook },
];

const ROLE_CONFIG: Record<
  UserRole,
  { label: string; bg: string; text: string; border: string }
> = {
  admin: {
    label: "Admin / Proprietário",
    bg: "bg-red-500/15",
    text: "text-red-400",
    border: "border-red-500/30",
  },
  gerente: {
    label: "Gerente Comercial",
    bg: "bg-purple-500/15",
    text: "text-purple-400",
    border: "border-purple-500/30",
  },
  vendedor: {
    label: "Vendedor",
    bg: "bg-blue-500/15",
    text: "text-blue-400",
    border: "border-blue-500/30",
  },
};

// ---------------------------------------------------------------------------
// Componente Principal: SettingsPage
// ---------------------------------------------------------------------------

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("perfil");
  const [isSaving, startSavingTransition] = useTransition();
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);

  const { role, sellerName, isDemoMode } = useDemoRole();

  // Estados dos formulários das abas existentes
  const [profile, setProfile] = useState<UserProfileState>(() => {
    if (isDemoMode) {
      return {
        fullName: "Rafael Alves",
        email: "rafael.alves@aceleraauto.com.br",
        phone: "11987654321",
        role: "gerente",
      };
    }
    return {
      fullName: "",
      email: "",
      phone: "",
      role: "admin",
    };
  });

  const [store, setStore] = useState<StoreState>({
    legalName: "",
    tradeName: "",
    cnpj: "",
    phone: "",
    email: "",
    address: "",
    businessHours: "",
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

  // Estados do Módulo de Equipe & Capacidade
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>(() =>
    isDemoMode ? INITIAL_TEAM_MEMBERS : []
  );
  const [teamCapacity] = useState<TeamCapacity>(INITIAL_CAPACITY);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState<InviteMemberInput>({
    fullName: "",
    email: "",
    phone: "",
    role: "vendedor",
  });
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [teamFeedback, setTeamFeedback] = useState<string | null>(null);
  const [isTeamPending, startTeamTransition] = useTransition();

  // Estados do Módulo de Integrações & Webhooks
  const [showApiKey, setShowApiKey] = useState(false);
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [copiedApiKey, setCopiedApiKey] = useState(false);
  const [copiedPayload, setCopiedPayload] = useState(false);

  const webhookEndpoint = "https://aceleraautocrm.com.br/api/webhooks/leads";
  const storeApiKey = "sk_live_acelera_loja_8849bf21a7c0";
  const examplePayloadJson = JSON.stringify(
    {
      name: "Carlos Mendonça",
      phone: "11987654321",
      email: "carlos@gmail.com",
      vehicle_interest: "Honda Civic EXL 2023",
      source: "Webmotors",
      notes: "Cliente interessado em dar seminovo na troca.",
    },
    null,
    2
  );

  const handleCopyClipboard = (text: string, type: "webhook" | "key" | "payload") => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text).catch(() => {});
    }
    if (type === "webhook") {
      setCopiedWebhook(true);
      setTimeout(() => setCopiedWebhook(false), 2000);
    } else if (type === "key") {
      setCopiedApiKey(true);
      setTimeout(() => setCopiedApiKey(false), 2000);
    } else if (type === "payload") {
      setCopiedPayload(true);
      setTimeout(() => setCopiedPayload(false), 2000);
    }
  };

  // Carrega dinamicamente o perfil e a equipe do usuário autenticado
  useEffect(() => {
    let isMounted = true;
    if (!isDemoMode) {
      getCurrentUserProfileAction()
        .then((userProfile) => {
          if (isMounted && userProfile) {
            setProfile((prev) => ({
              ...prev,
              fullName: userProfile.fullName || prev.fullName,
              email: userProfile.email || prev.email,
              phone: userProfile.phone || prev.phone,
              role: (userProfile.role as UserRole) || prev.role,
            }));
            setStore((prev) => ({
              ...prev,
              tradeName: userProfile.organizationTradeName || userProfile.organizationName || prev.tradeName,
              legalName: userProfile.organizationLegalName || prev.legalName,
              cnpj: userProfile.organizationDocument ? formatDocument(userProfile.organizationDocument, "CNPJ") : prev.cnpj,
              phone: userProfile.organizationPhone ? formatPhone(userProfile.organizationPhone) : prev.phone,
              address: userProfile.organizationAddress || prev.address,
              businessHours: userProfile.organizationBusinessHours || prev.businessHours,
            }));
          }
        })
        .catch(() => {});

      getTeamMembers()
        .then((members) => {
          if (isMounted) {
            setTeamMembers(members || []);
          }
        })
        .catch(() => {});
    }
    return () => {
      isMounted = false;
    };
  }, [isDemoMode]);

  const isVendedorRole = role === "vendedor";

  // Disparo de salvamento das configurações gerais
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    startSavingTransition(() => {
      if (!isDemoMode) {
        updateOrganizationSettingsAction({
          name: store.tradeName,
          legalName: store.legalName,
          document: store.cnpj,
          phone: store.phone,
          address: store.address,
          businessHours: store.businessHours,
        }).catch(() => {});
      }
      setTimeout(() => {
        setSaveFeedback("Configurações Salvas com Sucesso!");
        setTimeout(() => setSaveFeedback(null), 3000);
      }, 300);
    });
  };

  // Disparo do clique no botão de Adicionar Vendedor
  const handleOpenAddMember = () => {
    if (teamMembers.length >= teamCapacity.maxSellers) {
      setIsUpgradeModalOpen(true);
    } else {
      setInviteError(null);
      setInviteForm({ fullName: "", email: "", phone: "", role: "vendedor" });
      setIsInviteModalOpen(true);
    }
  };

  // Submissão do Convite de Colaborador
  const handleInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError(null);

    const cleanPhone = inviteForm.phone.replace(/\D/g, "");
    if (cleanPhone.length < 10 || cleanPhone.length > 11) {
      setInviteError("Informe um número de WhatsApp/celular com DDD válido (10 ou 11 dígitos).");
      return;
    }

    startTeamTransition(async () => {
      const res = await inviteTeamMember({
        ...inviteForm,
        phone: cleanPhone,
      });

      if (!res.success) {
        if (res.requiresUpgrade) {
          setIsInviteModalOpen(false);
          setIsUpgradeModalOpen(true);
        } else {
          setInviteError(res.error || "Erro ao convidar colaborador.");
        }
        return;
      }

      if (res.member) {
        setTeamMembers((prev) => [...prev, res.member!]);
        setIsInviteModalOpen(false);
        setTeamFeedback("Colaborador convidado com sucesso!");
        setTimeout(() => setTeamFeedback(null), 3500);
      }
    });
  };

  // Remoção de Colaborador
  const handleRemoveMember = (memberId: string) => {
    startTeamTransition(async () => {
      const res = await removeTeamMember(memberId);
      if (!res.success) {
        setTeamFeedback(res.error || "Erro ao remover colaborador.");
        setTimeout(() => setTeamFeedback(null), 4000);
        return;
      }

      setTeamMembers((prev) => prev.filter((m) => m.id !== memberId));
      setTeamFeedback("Colaborador removido da equipe com sucesso!");
      setTimeout(() => setTeamFeedback(null), 3500);
    });
  };

  const occupancyPercent = Math.min(
    100,
    Math.round((teamMembers.length / teamCapacity.maxSellers) * 100)
  );

  const upgradeWhatsappUrl = `https://wa.me/5511999999999?text=${encodeURIComponent(
    `Olá! Sou da ${store.tradeName} e atingi o limite de ${teamCapacity.maxSellers} vagas da minha equipe. Gostaria de saber mais sobre o upgrade para o Plano Pro!`
  )}`;

  return (
    <div className="flex h-full flex-col overflow-x-hidden">
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
              {isVendedorRole && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                  <Lock className="h-3 w-3" />
                  Perfil Vendedor ({sellerName})
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {isVendedorRole
                ? "Edição restrita aos seus dados de perfil de usuário"
                : "Gerencie dados da loja, equipe, metas comerciais e preferências"}
            </p>
          </div>

          {/* Feedback de Sucesso Geral */}
          {(saveFeedback || teamFeedback) && (
            <div
              role="status"
              className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/15 px-3 py-1.5 text-xs font-semibold text-emerald-300 animate-in fade-in"
            >
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <span>{saveFeedback || teamFeedback}</span>
            </div>
          )}
        </div>

        {/* Abas Organizacionais */}
        <div
          role="tablist"
          aria-label="Abas de Configuração"
          className="mt-4 flex gap-1 overflow-x-auto border-b border-border/40 pb-px"
        >
          {TAB_ITEMS.map((tab) => {
            const Icon = tab.icon;
            const isRestricted = isVendedorRole && tab.id !== "perfil";
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`tab-${tab.id}`}
                role="tab"
                aria-selected={isActive}
                aria-disabled={isRestricted}
                disabled={isRestricted}
                title={isRestricted ? "Acesso Restrito: Apenas Gestores e Administradores" : tab.label}
                onClick={() => {
                  if (!isRestricted) {
                    setActiveTab(tab.id);
                  }
                }}
                className={cn(
                  "inline-flex items-center gap-2 border-b-2 px-3 py-2 text-xs font-medium transition-all whitespace-nowrap",
                  isRestricted
                    ? "opacity-40 cursor-not-allowed border-transparent text-muted-foreground"
                    : isActive
                    ? "border-orange-500 text-orange-600 dark:text-orange-400 font-semibold"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
                {isRestricted && <Lock className="h-3 w-3 ml-0.5 text-muted-foreground" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Conteúdo Principal das Abas                                        */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        {/* Banner Informativo RBAC */}
        {isVendedorRole && (
          <div
            id="banner-rbac-settings"
            className="mb-4 rounded-xl border border-amber-300/80 bg-amber-50/90 dark:border-amber-900/60 dark:bg-amber-950/40 p-3.5 text-amber-900 dark:text-amber-200 shadow-sm flex items-center gap-2.5"
          >
            <Lock className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span className="text-xs font-medium">
              Modo Vendedor ({sellerName}): Apenas a edição do seu Perfil de Usuário está liberada. As abas Loja, SLA e Equipe estão bloqueadas para o seu nível de acesso.
            </span>
          </div>
        )}
        <form onSubmit={handleSave} className="max-w-4xl space-y-6">
          {/* ================================================================ */}
          {/* ABA 1: Perfil do Usuário                                         */}
          {/* ================================================================ */}
          {activeTab === "perfil" && (
            <section aria-label="Perfil do Usuário" className="space-y-4">
              <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
                <div className="flex items-center gap-3 border-b pb-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-tr from-orange-500 to-amber-500 text-white font-bold text-base shadow-sm">
                    {profile.fullName
                      .trim()
                      .split(/\s+/)
                      .filter(Boolean)
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase() || "GE"}
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-foreground">
                      {profile.fullName}
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      {profile.email} • {profile.role.toUpperCase()}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="profile-fullName"
                      className="text-xs font-medium text-muted-foreground block mb-1"
                    >
                      Nome Completo *
                    </label>
                    <Input
                      id="profile-fullName"
                      value={profile.fullName}
                      onChange={(e) =>
                        setProfile((prev) => ({
                          ...prev,
                          fullName: e.target.value,
                        }))
                      }
                      className="text-xs h-8"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="profile-email"
                      className="text-xs font-medium text-muted-foreground block mb-1"
                    >
                      E-mail Corporativo *
                    </label>
                    <Input
                      id="profile-email"
                      type="email"
                      value={profile.email}
                      onChange={(e) =>
                        setProfile((prev) => ({
                          ...prev,
                          email: e.target.value,
                        }))
                      }
                      className="text-xs h-8"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="profile-phone"
                      className="text-xs font-medium text-muted-foreground block mb-1"
                    >
                      WhatsApp / Celular
                    </label>
                    <Input
                      id="profile-phone"
                      name="phone"
                      type="tel"
                      maxLength={15}
                      placeholder="(11) 98888-8888"
                      value={profile.phone}
                      onChange={(e) =>
                        setProfile((prev) => ({
                          ...prev,
                          phone: formatPhone(e.target.value),
                        }))
                      }
                      className="text-xs h-8"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="profile-role"
                      className="text-xs font-medium text-muted-foreground block mb-1"
                    >
                      Função no Sistema (Cargo)
                    </label>
                    <select
                      id="profile-role"
                      value={profile.role}
                      onChange={(e) =>
                        setProfile((prev) => ({
                          ...prev,
                          role: e.target.value as UserProfileState["role"],
                        }))
                      }
                      className="h-8 w-full rounded-md border border-input bg-background px-2.5 text-xs font-medium text-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                    >
                      <option value="admin">Administrador (Master)</option>
                      <option value="gerente">Gerente Comercial</option>
                      <option value="vendedor">Vendedor / Consultor</option>
                    </select>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* ================================================================ */}
          {/* ABA 2: Concessionária & Loja                                     */}
          {/* ================================================================ */}
          {activeTab === "loja" && (
            <section aria-label="Dados da Concessionária" className="space-y-4">
              <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
                <h2 className="text-sm font-bold text-foreground border-b pb-2">
                  Dados Cadastrais da Concessionária
                </h2>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="store-tradeName"
                      className="text-xs font-medium text-muted-foreground block mb-1"
                    >
                      Nome Fantasia *
                    </label>
                    <Input
                      id="store-tradeName"
                      value={store.tradeName}
                      placeholder="Ex: Minha Concessionária"
                      onChange={(e) =>
                        setStore((prev) => ({
                          ...prev,
                          tradeName: e.target.value,
                        }))
                      }
                      className="text-xs h-8"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="store-legalName"
                      className="text-xs font-medium text-muted-foreground block mb-1"
                    >
                      Razão Social *
                    </label>
                    <Input
                      id="store-legalName"
                      value={store.legalName}
                      placeholder="Ex: Minha Concessionária LTDA"
                      onChange={(e) =>
                        setStore((prev) => ({
                          ...prev,
                          legalName: e.target.value,
                        }))
                      }
                      className="text-xs h-8"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="store-cnpj"
                      className="text-xs font-medium text-muted-foreground block mb-1"
                    >
                      CNPJ *
                    </label>
                    <Input
                      id="store-cnpj"
                      value={store.cnpj}
                      placeholder="00.000.000/0000-00 ou 000.000.000-00"
                      onChange={(e) =>
                        setStore((prev) => ({
                          ...prev,
                          cnpj: formatDocument(e.target.value, "CNPJ"),
                        }))
                      }
                      className="text-xs h-8"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="store-phone"
                      className="text-xs font-medium text-muted-foreground block mb-1"
                    >
                      Telefone da Loja
                    </label>
                    <Input
                      id="store-phone"
                      value={store.phone}
                      placeholder="(11) 99999-9999"
                      onChange={(e) =>
                        setStore((prev) => ({
                          ...prev,
                          phone: formatPhone(e.target.value),
                        }))
                      }
                      className="text-xs h-8"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label
                      htmlFor="store-address"
                      className="text-xs font-medium text-muted-foreground block mb-1"
                    >
                      Endereço Completo
                    </label>
                    <Input
                      id="store-address"
                      value={store.address}
                      placeholder="Ex: Av. Brasil, 1500 - Centro, São Paulo - SP"
                      onChange={(e) =>
                        setStore((prev) => ({
                          ...prev,
                          address: e.target.value,
                        }))
                      }
                      className="text-xs h-8"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label
                      htmlFor="store-businessHours"
                      className="text-xs font-medium text-muted-foreground block mb-1"
                    >
                      Horário de Funcionamento
                    </label>
                    <Input
                      id="store-businessHours"
                      value={store.businessHours}
                      placeholder="Ex: Segunda a Sexta: 08:00 - 18:00 | Sábado: 08:00 - 12:00"
                      onChange={(e) =>
                        setStore((prev) => ({
                          ...prev,
                          businessHours: e.target.value,
                        }))
                      }
                      className="text-xs h-8"
                    />
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* ================================================================ */}
          {/* ABA 3: Parâmetros do CRM & SLA                                   */}
          {/* ================================================================ */}
          {activeTab === "sla" && (
            <section aria-label="Parâmetros do CRM e SLA" className="space-y-4">
              <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
                <h2 className="text-sm font-bold text-foreground border-b pb-2">
                  Metas Comerciais & SLA de Atendimento
                </h2>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="crm-monthlySalesGoal"
                      className="text-xs font-medium text-muted-foreground block mb-1"
                    >
                      Meta Mensal de Vendas da Loja (R$)
                    </label>
                    <Input
                      id="crm-monthlySalesGoal"
                      type="number"
                      value={crmParams.monthlySalesGoal}
                      onChange={(e) =>
                        setCrmParams((prev) => ({
                          ...prev,
                          monthlySalesGoal: Number(e.target.value),
                        }))
                      }
                      className="text-xs h-8"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="crm-slaTargetMinutes"
                      className="text-xs font-medium text-muted-foreground block mb-1"
                    >
                      SLA Alvo de 1º Contato (minutos)
                    </label>
                    <Input
                      id="crm-slaTargetMinutes"
                      type="number"
                      value={crmParams.slaTargetMinutes}
                      onChange={(e) =>
                        setCrmParams((prev) => ({
                          ...prev,
                          slaTargetMinutes: Number(e.target.value),
                        }))
                      }
                      className="text-xs h-8"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <label className="flex items-center gap-2 text-xs font-medium text-foreground cursor-pointer">
                    <input
                      id="crm-urgentAlertsEnabled"
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
                    <span>
                      Ativar alertas visuais de urgência para leads sem contato há mais de 6 horas
                    </span>
                  </label>
                </div>
              </div>
            </section>
          )}

          {/* ================================================================ */}
          {/* ABA 4: Preferências & Notificações                               */}
          {/* ================================================================ */}
          {activeTab === "preferencias" && (
            <section aria-label="Preferências do Sistema" className="space-y-4">
              <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
                <h2 className="text-sm font-bold text-foreground border-b pb-2">
                  Preferências de Alertas & Tema Visual
                </h2>

                <div className="space-y-3">
                  <label className="flex items-center justify-between p-3 rounded-lg border bg-muted/20 cursor-pointer">
                    <div>
                      <p className="text-xs font-semibold text-foreground">
                        Notificações de Novos Leads via WhatsApp
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        Receba avisos instantâneos quando um novo lead entrar no funil
                      </p>
                    </div>
                    <input
                      id="pref-whatsappNotifications"
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

                  <label className="flex items-center justify-between p-3 rounded-lg border bg-muted/20 cursor-pointer">
                    <div>
                      <p className="text-xs font-semibold text-foreground">
                        Resumo Diário por E-mail (Daily Digest)
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        Receba o relatório matinal de vendas e pendências às 08:00
                      </p>
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

          {/* ================================================================ */}
          {/* ABA 5: Equipe & Vendedores                                       */}
          {/* ================================================================ */}
          {activeTab === "equipe" && (
            <section aria-label="Gestão de Equipe e Vendedores" className="space-y-4">
              {/* Card de Resumo de Capacidade */}
              <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-sm font-bold text-foreground">
                      Capacidade de Vendedores do Plano
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      {teamMembers.length}/{teamCapacity.maxSellers} Vagas ocupadas no {teamCapacity.planName}
                    </p>
                  </div>

                  <Button
                    id="btn-add-member"
                    type="button"
                    size="sm"
                    onClick={handleOpenAddMember}
                    className="gap-1.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md shadow-orange-500/20 hover:from-orange-600 hover:to-amber-600 text-xs h-8"
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    <span>Convidar Vendedor</span>
                  </Button>
                </div>

                {/* Barra de Progresso Visual de Ocupação */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-medium">
                    <span className="text-muted-foreground">Ocupação de Vagas</span>
                    <span
                      className={cn(
                        "font-bold",
                        occupancyPercent >= 100
                          ? "text-orange-500"
                          : "text-emerald-500"
                      )}
                    >
                      {occupancyPercent}%
                    </span>
                  </div>
                  <div
                    role="progressbar"
                    aria-valuenow={teamMembers.length}
                    aria-valuemin={0}
                    aria-valuemax={teamCapacity.maxSellers}
                    className="h-2 w-full overflow-hidden rounded-full bg-muted/60"
                  >
                    <div
                      className={cn(
                        "h-full transition-all duration-300 rounded-full",
                        occupancyPercent >= 100
                          ? "bg-orange-500"
                          : "bg-emerald-500"
                      )}
                      style={{ width: `${occupancyPercent}%` }}
                    />
                  </div>
                  {teamMembers.length >= teamCapacity.maxSellers ? (
                    <p className="text-[11px] text-orange-400 font-medium">
                      ⚠️ Limite atingido. Faça upgrade para adicionar mais vendedores à equipe.
                    </p>
                  ) : (
                    <p className="text-[11px] text-muted-foreground">
                      {teamCapacity.maxSellers - teamMembers.length} vaga(s) disponível(is) no seu plano atual.
                    </p>
                  )}
                </div>
              </div>

              {/* Tabela de Membros da Equipe */}
              <div className="rounded-xl border bg-card p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between border-b pb-2">
                  <h3 className="text-sm font-bold text-foreground">
                    Membros da Equipe ({teamMembers.length})
                  </h3>
                </div>

                <div className="divide-y divide-border/40">
                  {teamMembers.map((member) => {
                    const roleCfg = ROLE_CONFIG[member.role] || ROLE_CONFIG.vendedor;
                    const initials = member.fullName
                      .split(" ")
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join("");

                    return (
                      <div
                        key={member.id}
                        className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-slate-700 to-slate-800 text-white text-xs font-bold border border-border">
                            {initials}
                          </div>
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-xs font-bold text-foreground">
                                {member.fullName}
                              </p>
                              <span
                                className={cn(
                                  "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                                  roleCfg.bg,
                                  roleCfg.text,
                                  roleCfg.border
                                )}
                              >
                                {roleCfg.label}
                              </span>
                              {member.status === "pending" ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-[10px] font-semibold text-amber-400">
                                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                                  Pendente (Aguardando Aceite)
                                </span>
                              ) : (
                                <span className="inline-flex items-center rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                                  Ativo
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-muted-foreground">
                              {member.email} • {member.phone}
                            </p>
                          </div>
                        </div>

                        {/* Ações por membro */}
                        <div className="flex items-center gap-2">
                          <Button
                            id={`btn-remove-${member.id}`}
                            type="button"
                            size="sm"
                            variant="ghost"
                            disabled={isTeamPending || member.role === "admin"}
                            onClick={() => handleRemoveMember(member.id)}
                            className={cn(
                              "text-xs h-7 gap-1",
                              member.role === "admin"
                                ? "text-muted-foreground/40 cursor-not-allowed"
                                : "text-muted-foreground hover:text-red-400 hover:bg-red-500/10"
                            )}
                            title={
                              member.role === "admin"
                                ? "O proprietário admin não pode ser removido"
                                : "Remover colaborador"
                            }
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span>Remover</span>
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          )}

          {/* ============================================================== */}
          {/* ABA 6: Integrações & Webhooks de Leads                         */}
          {/* ============================================================== */}
          {activeTab === "integracoes" && (
            <section id="tab-integracoes" className="space-y-6 animate-in fade-in duration-200">
              {/* Header da Aba */}
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-foreground">
                    Integrações & Webhooks de Leads
                  </h2>
                  <span className="inline-flex items-center gap-1 rounded-full bg-orange-500/15 border border-orange-500/30 px-2 py-0.5 text-[10px] font-bold text-orange-400">
                    <Sparkles className="h-3 w-3" />
                    Ingestão Automática
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Conecte seu site, campanhas do Meta Ads, Webmotors, iCarros e plataformas externas diretamente ao Funil Kanban do Acelera Auto CRM.
                </p>
              </div>

              {/* 1. Card: URL do Webhook */}
              <div className="rounded-xl border bg-card p-4 sm:p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/15 text-orange-400 border border-orange-500/30">
                      <Webhook className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-foreground">
                        URL do Endpoint de Ingestão (Webhook)
                      </h3>
                      <p className="text-[11px] text-muted-foreground">
                        Recebe requisições HTTP via método POST
                      </p>
                    </div>
                  </div>
                  <span className="rounded bg-orange-500/20 text-orange-400 px-2 py-0.5 text-[10px] font-mono font-bold border border-orange-500/30">
                    POST
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <div className="relative flex-1">
                    <Input
                      id="input-webhook-url"
                      readOnly
                      value={webhookEndpoint}
                      className="bg-muted/40 font-mono text-xs text-foreground pr-20 h-9"
                    />
                  </div>
                  <Button
                    id="btn-copy-webhook"
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopyClipboard(webhookEndpoint, "webhook")}
                    className={cn(
                      "h-9 gap-1.5 text-xs font-semibold shrink-0 transition-all",
                      copiedWebhook && "border-emerald-500/40 text-emerald-400 bg-emerald-950/20"
                    )}
                  >
                    {copiedWebhook ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                        <span>Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>Copiar URL</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* 2. Card: Chave de API da Loja (Token) */}
              <div className="rounded-xl border bg-card p-4 sm:p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/15 text-blue-400 border border-blue-500/30">
                      <Key className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-foreground">
                        Chave de API da Loja (Token do Lojista)
                      </h3>
                      <p className="text-[11px] text-muted-foreground">
                        Utilizada para autenticar as requisições enviadas ao Webhook
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <div className="relative flex-1">
                    <Input
                      id="input-store-api-key"
                      readOnly
                      value={showApiKey ? storeApiKey : "sk_live_acelera_loja_••••••••••••"}
                      className="bg-muted/40 font-mono text-xs text-foreground pr-10 h-9"
                    />
                    <button
                      type="button"
                      id="btn-toggle-show-key"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5"
                      title={showApiKey ? "Ocultar chave" : "Mostrar chave"}
                      aria-label={showApiKey ? "Ocultar chave" : "Mostrar chave"}
                    >
                      {showApiKey ? (
                        <EyeOff className="h-3.5 w-3.5" />
                      ) : (
                        <Eye className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                  <Button
                    id="btn-copy-api-key"
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopyClipboard(storeApiKey, "key")}
                    className={cn(
                      "h-9 gap-1.5 text-xs font-semibold shrink-0 transition-all",
                      copiedApiKey && "border-emerald-500/40 text-emerald-400 bg-emerald-950/20"
                    )}
                  >
                    {copiedApiKey ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                        <span>Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>Copiar Chave</span>
                      </>
                    )}
                  </Button>
                </div>

                <p className="text-[11px] text-muted-foreground">
                  💡 <strong>Instrução de Header:</strong> Envie o token no header HTTP <code className="bg-muted px-1.5 py-0.5 rounded text-orange-400 font-mono">x-api-key: {storeApiKey}</code> ou <code className="bg-muted px-1.5 py-0.5 rounded text-orange-400 font-mono">Authorization: Bearer {storeApiKey}</code>.
                </p>
              </div>

              {/* 3. Card: Guia Passo a Passo "Como conectar seus leads" */}
              <div className="rounded-xl border bg-card p-4 sm:p-5 shadow-sm space-y-4">
                <div className="flex items-center gap-2 border-b pb-3">
                  <Code className="h-4 w-4 text-orange-400" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                    Como conectar seus leads em 3 passos
                  </h3>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <div className="rounded-lg border bg-muted/20 p-3.5 space-y-1.5">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-orange-500/20 text-xs font-bold text-orange-400">
                      1
                    </div>
                    <h4 className="text-xs font-bold text-foreground">
                      Copie os Dados de Acesso
                    </h4>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Copie a URL do Webhook e sua Chave de API exclusiva da sua loja exibidas nos cartões acima.
                    </p>
                  </div>

                  <div className="rounded-lg border bg-muted/20 p-3.5 space-y-1.5">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-orange-500/20 text-xs font-bold text-orange-400">
                      2
                    </div>
                    <h4 className="text-xs font-bold text-foreground">
                      Configure no seu Canal
                    </h4>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Configure no seu site, campanhas do Meta Ads (Zapier, Make, n8n) ou integrador de portais enviando um POST com <code className="text-foreground font-mono">name</code> e <code className="text-foreground font-mono">phone</code>.
                    </p>
                  </div>

                  <div className="rounded-lg border bg-muted/20 p-3.5 space-y-1.5">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-orange-500/20 text-xs font-bold text-orange-400">
                      3
                    </div>
                    <h4 className="text-xs font-bold text-foreground">
                      Ação Imediata no Funil
                    </h4>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Receba os leads em tempo real no Funil Kanban com o semáforo de SLA ativo para o vendedor agir em menos de 15 minutos.
                    </p>
                  </div>
                </div>
              </div>

              {/* 4. Card: Exemplo Prático de Payload JSON */}
              <div className="rounded-xl border bg-card p-4 sm:p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileJson className="h-4 w-4 text-emerald-400" />
                    <h3 className="text-xs font-bold text-foreground">
                      Exemplo Prático de Payload (JSON)
                    </h3>
                  </div>
                  <Button
                    id="btn-copy-payload"
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopyClipboard(examplePayloadJson, "payload")}
                    className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
                  >
                    {copiedPayload ? (
                      <>
                        <Check className="h-3 w-3 text-emerald-400" />
                        <span>Copiado</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        <span>Copiar JSON</span>
                      </>
                    )}
                  </Button>
                </div>

                <div className="overflow-x-auto rounded-lg border bg-zinc-950 p-3 font-mono text-[11px] text-zinc-300">
                  <pre>{examplePayloadJson}</pre>
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-muted-foreground">
                  <span>
                    ✅ <strong>Campos Obrigatórios:</strong> <code className="text-orange-400 font-mono">name</code>, <code className="text-orange-400 font-mono">phone</code>
                  </span>
                  <span>
                    ℹ️ <strong>Campos Opcionais:</strong> <code className="text-zinc-400 font-mono">email</code>, <code className="text-zinc-400 font-mono">vehicle_interest</code>, <code className="text-zinc-400 font-mono">source</code>, <code className="text-zinc-400 font-mono">notes</code>
                  </span>
                </div>
              </div>
            </section>
          )}

          {/* Botão de Salvar Alterações (Geral) */}
          {activeTab !== "equipe" && activeTab !== "integracoes" && (
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
          )}
        </form>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Modal de Convite de Colaborador                                    */}
      {/* ------------------------------------------------------------------ */}
      {isInviteModalOpen && (
        <div
          id="modal-invite-member"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-invite-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-in fade-in"
        >
          <div className="relative w-full max-w-md rounded-xl border bg-card p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-orange-500" />
                <h3
                  id="modal-invite-title"
                  className="text-sm font-bold text-foreground"
                >
                  Convidar Novo Vendedor
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsInviteModalOpen(false)}
                className="rounded-lg p-1 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {inviteError && (
              <div
                role="alert"
                className="rounded-lg border border-red-500/30 bg-red-500/10 p-2.5 text-xs text-red-400 flex items-center gap-2"
              >
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{inviteError}</span>
              </div>
            )}

            <form onSubmit={handleInviteSubmit} className="space-y-3">
              <div>
                <label
                  htmlFor="input-member-name"
                  className="text-xs font-medium text-muted-foreground block mb-1"
                >
                  Nome Completo *
                </label>
                <Input
                  id="input-member-name"
                  name="fullName"
                  required
                  placeholder="Ex: João da Silva"
                  value={inviteForm.fullName}
                  onChange={(e) =>
                    setInviteForm((prev) => ({
                      ...prev,
                      fullName: e.target.value,
                    }))
                  }
                  className="text-xs h-8"
                />
              </div>

              <div>
                <label
                  htmlFor="input-member-email"
                  className="text-xs font-medium text-muted-foreground block mb-1"
                >
                  E-mail Corporativo *
                </label>
                <Input
                  id="input-member-email"
                  name="email"
                  type="email"
                  required
                  placeholder="vendedor@concessionaria.com.br"
                  value={inviteForm.email}
                  onChange={(e) =>
                    setInviteForm((prev) => ({
                      ...prev,
                      email: e.target.value,
                    }))
                  }
                  className="text-xs h-8"
                />
              </div>

              <div>
                <label
                  htmlFor="input-member-phone"
                  className="text-xs font-medium text-muted-foreground block mb-1"
                >
                  WhatsApp / Celular *
                </label>
                <Input
                  id="input-member-phone"
                  name="phone"
                  type="tel"
                  required
                  maxLength={15}
                  placeholder="(11) 98888-8888"
                  value={inviteForm.phone}
                  onChange={(e) =>
                    setInviteForm((prev) => ({
                      ...prev,
                      phone: formatPhone(e.target.value),
                    }))
                  }
                  className="text-xs h-8"
                />
              </div>

              <div>
                <label
                  htmlFor="select-member-role"
                  className="text-xs font-medium text-muted-foreground block mb-1"
                >
                  Cargo / Nível de Acesso
                </label>
                <select
                  id="select-member-role"
                  value={inviteForm.role}
                  onChange={(e) =>
                    setInviteForm((prev) => ({
                      ...prev,
                      role: e.target.value as UserRole,
                    }))
                  }
                  className="h-8 w-full rounded-md border border-input bg-background px-2.5 text-xs font-medium text-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <option value="vendedor">Vendedor / Consultor</option>
                  <option value="gerente">Gerente Comercial</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsInviteModalOpen(false)}
                  className="text-xs h-8"
                >
                  Cancelar
                </Button>
                <Button
                  id="btn-submit-invite"
                  type="submit"
                  size="sm"
                  disabled={isTeamPending}
                  className="bg-orange-500 text-white hover:bg-orange-600 text-xs h-8"
                >
                  {isTeamPending ? "Enviando..." : "Enviar Convite"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Modal de Upgrade de Vagas (Trigger de Bloqueio)                    */}
      {/* ------------------------------------------------------------------ */}
      {isUpgradeModalOpen && (
        <div
          id="modal-upgrade-capacity"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-upgrade-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-in fade-in"
        >
          <div className="relative w-full max-w-md rounded-2xl border border-orange-500/40 bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/20 text-orange-400 border border-orange-500/30">
                  <Crown className="h-5 w-5" />
                </div>
                <div>
                  <h3
                    id="modal-upgrade-title"
                    className="text-base font-bold text-foreground"
                  >
                    Limite de Vagas Atingido 🚀
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Sua loja atingiu a cota máxima do {teamCapacity.planName}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsUpgradeModalOpen(false)}
                className="rounded-lg p-1 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="rounded-xl border bg-muted/20 p-4 space-y-2 text-xs">
              <p className="text-foreground font-semibold">
                Diferenciais do Plano Pro:
              </p>
              <ul className="space-y-1.5 text-muted-foreground list-disc pl-4">
                <li>Até <strong>8 vendedores simultâneos</strong> vinculados à concessionária.</li>
                <li>Relatórios avançados de ranking comercial e metas individuais.</li>
                <li>Suporte prioritário via WhatsApp com SLA de 15 minutos.</li>
                <li>Integração oficial de estoque Webmotors e iCarros.</li>
              </ul>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <a
                id="btn-upgrade-whatsapp"
                href={upgradeWhatsappUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-emerald-500/25 hover:from-emerald-600 hover:to-teal-700 transition"
              >
                <MessageSquare className="h-4 w-4" />
                <span>Falar com Consultor / Fazer Upgrade via WhatsApp</span>
              </a>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsUpgradeModalOpen(false)}
                className="text-xs text-muted-foreground"
              >
                Continuar com meu plano atual
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
