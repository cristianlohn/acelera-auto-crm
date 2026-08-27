/**
 * @file page.tsx
 * @description Painel Backoffice Super Admin para gestão de concessionárias e assinaturas B2B.
 *
 * Funcionalidades:
 * - Visão executiva consolidada (MRR, Lojas Ativas, Contas em Trial e Alertas de Expiração).
 * - Busca instantânea e filtragem por abas de status.
 * - Ativação manual de planos (Pix/Boleto) e extensão rápida de trial (+7 dias).
 * - Suspensão/Reativação de tenants de concessionárias.
 * - Deep-link com mensagem customizada para WhatsApp do gestor.
 */

"use client";

import React, { useState, useMemo, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ShieldCheck,
  DollarSign,
  Building2,
  AlertTriangle,
  Search,
  CheckCircle2,
  Calendar,
  Users,
  Car,
  MessageSquare,
  Sparkles,
  RefreshCw,
  PlusCircle,
  Ban,
  Check,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/mock-data";
import { sanitizePhone } from "@/lib/lead-utils";
import {
  mockDealerships,
  isExpiringSoon,
  type DealershipAccount,
  type SubscriptionStatus,
} from "@/lib/superadmin-data";
import {
  activateSubscription,
  extendDealershipTrial,
  toggleDealershipStatus,
} from "@/app/actions/superadmin";
import { useDemoRole } from "@/context/demo-role-context";
import { isSuperAdmin } from "@/lib/permissions";

// ---------------------------------------------------------------------------
// Configurações de Abas
// ---------------------------------------------------------------------------

type TabFilter = "all" | "active" | "trialing" | "past_due" | "canceled";

const STATUS_TABS: { id: TabFilter; label: string }[] = [
  { id: "all", label: "Todas as Lojas" },
  { id: "active", label: "Ativas / Pagantes" },
  { id: "trialing", label: "Em Trial" },
  { id: "past_due", label: "Vencidas / Alerta" },
  { id: "canceled", label: "Suspensas" },
];

const STATUS_CONFIG: Record<
  SubscriptionStatus,
  { label: string; bg: string; text: string; dot: string }
> = {
  active: {
    label: "Ativa (Pro)",
    bg: "bg-emerald-500/15 border-emerald-500/30",
    text: "text-emerald-400",
    dot: "bg-emerald-400",
  },
  trialing: {
    label: "Em Teste (Trial)",
    bg: "bg-amber-500/15 border-amber-500/30",
    text: "text-amber-400",
    dot: "bg-amber-400",
  },
  past_due: {
    label: "Assinatura Vencida",
    bg: "bg-rose-500/15 border-rose-500/30",
    text: "text-rose-400",
    dot: "bg-rose-400",
  },
  canceled: {
    label: "Acesso Suspenso",
    bg: "bg-zinc-500/15 border-zinc-500/30",
    text: "text-zinc-400",
    dot: "bg-zinc-400",
  },
  unpaid: {
    label: "Não Pago",
    bg: "bg-red-500/15 border-red-500/30",
    text: "text-red-400",
    dot: "bg-red-400",
  },
};

const PLAN_BADGES: Record<string, { label: string; class: string }> = {
  starter: { label: "Plano Starter", class: "bg-blue-500/15 text-blue-400 border-blue-500/30" },
  pro: { label: "Plano Pro", class: "bg-orange-500/15 text-orange-400 border-orange-500/30" },
  enterprise: { label: "Enterprise", class: "bg-purple-500/15 text-purple-400 border-purple-500/30" },
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

// ---------------------------------------------------------------------------
// Cartão de KPI
// ---------------------------------------------------------------------------

interface StatCardProps {
  label: string;
  value: string | number;
  subtext: string;
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  iconColor: string;
  alert?: boolean;
  dataTestId?: string;
}

function StatCard({
  label,
  value,
  subtext,
  icon: Icon,
  iconBg,
  iconColor,
  alert,
  dataTestId,
}: StatCardProps) {
  return (
    <div
      data-testid={dataTestId}
      className={cn(
        "relative overflow-hidden rounded-xl border bg-card p-4 shadow-sm transition-all duration-200 hover:shadow-md",
        alert && "border-amber-500/50 bg-gradient-to-br from-amber-500/10 to-transparent"
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-bold tracking-tight text-foreground">
            {value}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">{subtext}</p>
        </div>
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
            iconBg
          )}
        >
          <Icon className={cn("h-5 w-5", iconColor)} />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Página Principal Super Admin
// ---------------------------------------------------------------------------

export default function SuperAdminPage() {
  const router = useRouter();
  const { role } = useDemoRole();
  const [dealerships, setDealerships] = useState<DealershipAccount[]>(mockDealerships);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<TabFilter>("all");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const effectiveRole = useMemo(() => {
    if (typeof document !== "undefined") {
      const cookieMatch = document.cookie.match(/acelera_demo_role=([^;]+)/);
      if (cookieMatch && cookieMatch[1]) return cookieMatch[1];
    }
    return role;
  }, [role]);

  useEffect(() => {
    if (!isSuperAdmin(effectiveRole)) {
      router.replace("/dashboard");
    }
  }, [effectiveRole, router]);

  // Métricas calculadas
  const metrics = useMemo(() => {
    const totalStores = dealerships.length;
    const activeStores = dealerships.filter((d) => d.status === "active").length;
    const mrr = dealerships
      .filter((d) => d.status === "active")
      .reduce((acc, curr) => acc + curr.monthlyFee, 0);

    const totalLeads = dealerships.reduce((acc, curr) => acc + (curr.leadsCount || 0), 0);

    return { totalStores, mrr, activeStores, totalLeads };
  }, [dealerships]);

  // Filtro por termo de busca e aba de status
  const filteredDealerships = useMemo(() => {
    return dealerships.filter((d) => {
      const matchSearch =
        d.name.toLowerCase().includes(search.toLowerCase()) ||
        d.document.includes(search) ||
        d.city.toLowerCase().includes(search.toLowerCase()) ||
        d.managerName.toLowerCase().includes(search.toLowerCase()) ||
        d.managerEmail.toLowerCase().includes(search.toLowerCase());

      const matchTab =
        activeTab === "all"
          ? true
          : activeTab === "past_due"
          ? d.status === "past_due" || d.status === "unpaid"
          : d.status === activeTab;

      return matchSearch && matchTab;
    });
  }, [dealerships, search, activeTab]);

  if (!isSuperAdmin(effectiveRole)) {
    return null;
  }

  // Ação: Ativar assinatura manual
  const handleActivate = (orgId: string) => {
    startTransition(async () => {
      const res = await activateSubscription(orgId, "pro", 30);
      setDealerships((prev) =>
        prev.map((d) =>
          d.id === orgId
            ? {
                ...d,
                status: "active",
                plan: "pro",
                currentPeriodEnd: new Date(Date.now() + 30 * 86_400_000).toISOString(),
              }
            : d
        )
      );
      setFeedback(res.message);
      setTimeout(() => setFeedback(null), 4000);
    });
  };

  // Ação: Estender trial (+7 dias)
  const handleExtendTrial = (orgId: string) => {
    startTransition(async () => {
      const res = await extendDealershipTrial(orgId, 7);
      setDealerships((prev) =>
        prev.map((d) =>
          d.id === orgId
            ? {
                ...d,
                status: "trialing",
                trialEndsAt: res.newTrialEnd,
                currentPeriodEnd: res.newTrialEnd,
              }
            : d
        )
      );
      setFeedback(res.message);
      setTimeout(() => setFeedback(null), 4000);
    });
  };

  // Ação: Suspender ou Reativar
  const handleToggleStatus = (orgId: string, currentStatus: SubscriptionStatus) => {
    const nextStatus: SubscriptionStatus =
      currentStatus === "canceled" ? "active" : "canceled";

    startTransition(async () => {
      const res = await toggleDealershipStatus(orgId, nextStatus);
      setDealerships((prev) =>
        prev.map((d) => (d.id === orgId ? { ...d, status: nextStatus } : d))
      );
      setFeedback(res.message);
      setTimeout(() => setFeedback(null), 4000);
    });
  };

  return (
    <div className="flex h-full w-full max-w-full flex-col overflow-x-hidden">
      {/* ------------------------------------------------------------------ */}
      {/* Cabeçalho da Página Super Admin                                    */}
      {/* ------------------------------------------------------------------ */}
      <div className="sticky top-0 z-10 border-b bg-background/95 px-4 py-3.5 backdrop-blur-sm sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight text-foreground sm:text-xl">
                Super Admin Backoffice
              </h1>
              <span className="inline-flex items-center gap-1 rounded-full bg-red-500/15 border border-red-500/30 px-2 py-0.5 text-[10px] font-bold text-red-400">
                <ShieldCheck className="h-3 w-3" />
                Master Access
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Gestão multi-tenant, controle de assinaturas e acompanhamento de receita
            </p>
          </div>

          {/* Feedback de Sucesso */}
          {feedback && (
            <div
              role="status"
              className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/15 px-3 py-1.5 text-xs font-semibold text-emerald-300 animate-in fade-in"
            >
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <span>{feedback}</span>
            </div>
          )}
        </div>

        {/* Grid de KPIs B2B */}
        <div className="mt-4 grid grid-cols-2 gap-3 pb-1 sm:grid-cols-4">
          <StatCard
            label="Total de Concessionárias"
            value={metrics.totalStores}
            subtext="Lojas cadastradas no CRM"
            icon={Building2}
            iconBg="bg-blue-500/15"
            iconColor="text-blue-500"
            dataTestId="kpi-total-dealerships"
          />
          <StatCard
            label="Concessionárias Ativas"
            value={metrics.activeStores}
            subtext="Assinaturas ativas pagantes"
            icon={CheckCircle2}
            iconBg="bg-emerald-500/15"
            iconColor="text-emerald-500"
            dataTestId="kpi-active-dealerships"
          />
          <StatCard
            label="MRR Estimado"
            value={formatCurrency(metrics.mrr)}
            subtext="Receita recorrente mensal"
            icon={DollarSign}
            iconBg="bg-purple-500/15"
            iconColor="text-purple-500"
            dataTestId="kpi-mrr-dealerships"
          />
          <StatCard
            label="Total de Leads Trafegados"
            value={metrics.totalLeads.toLocaleString("pt-BR")}
            subtext="Volume transacionado no CRM"
            icon={Sparkles}
            iconBg="bg-orange-500/15"
            iconColor="text-orange-500"
            dataTestId="kpi-leads-dealerships"
          />
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Barra de Filtros e Busca                                           */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex flex-col gap-3 border-b bg-muted/20 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        {/* Campo de Busca Instantânea */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            data-testid="input-search-dealerships"
            type="search"
            aria-label="Buscar concessionárias por nome, CNPJ ou gestor"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por loja, CNPJ, cidade ou gestor..."
            className="pl-8 text-xs h-8 bg-background/80"
          />
        </div>

        {/* Abas de Filtro de Status */}
        <div className="flex flex-wrap items-center gap-1.5" role="tablist">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "rounded-lg px-2.5 py-1 text-xs font-medium transition-colors",
                activeTab === tab.id
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Listagem de Concessionárias / Tabela Responsiva                    */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs font-medium text-muted-foreground">
            Exibindo {filteredDealerships.length} de {dealerships.length} concessionárias
          </p>
        </div>

        {filteredDealerships.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed p-12 text-center">
            <Building2 className="h-10 w-10 text-muted-foreground/50" />
            <h3 className="mt-3 text-sm font-semibold text-foreground">
              Nenhuma concessionária encontrada
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Tente alterar os termos de busca ou o filtro de status selecionado.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4" data-testid="dealerships-list">
            {filteredDealerships.map((dealership) => {
              const statusCfg = STATUS_CONFIG[dealership.status];
              const planCfg = PLAN_BADGES[dealership.plan] || PLAN_BADGES.pro;
              const expiring =
                dealership.status === "trialing" &&
                isExpiringSoon(dealership.trialEndsAt);

              const whatsappUrl = `https://wa.me/55${sanitizePhone(
                dealership.managerPhone
              )}?text=${encodeURIComponent(
                `Olá ${dealership.managerName}! Sou do time Acelera Auto. Como está a experiência da ${dealership.name} com a nossa plataforma?`
              )}`;

              return (
                <div
                  key={dealership.id}
                  data-testid="dealership-card"
                  className="group relative flex flex-col justify-between rounded-xl border bg-card p-4 shadow-sm transition-all duration-200 hover:border-orange-500/40 hover:shadow-md sm:p-5"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    {/* Informações da Loja e Gestor */}
                    <div className="space-y-1.5 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-base font-bold text-foreground">
                          {dealership.name}
                        </h2>
                        <Badge variant="outline" className={cn("text-[10px]", planCfg.class)}>
                          {planCfg.label}
                        </Badge>
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                            statusCfg.bg,
                            statusCfg.text
                          )}
                        >
                          <span
                            className={cn("h-1.5 w-1.5 rounded-full", statusCfg.dot)}
                          />
                          {statusCfg.label}
                        </span>

                        {expiring && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-orange-500/20 border border-orange-500/40 px-2 py-0.5 text-[10px] font-bold text-orange-400 animate-pulse">
                            <AlertTriangle className="h-3 w-3" />
                            Expira em &le; 48h!
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span>CNPJ: <strong>{dealership.document}</strong></span>
                        <span>•</span>
                        <span>{dealership.city} - {dealership.state}</span>
                        <span>•</span>
                        <span>Criada em: <strong>{formatDate(dealership.createdAt)}</strong></span>
                        <span>•</span>
                        <span>Gestor: <strong className="text-foreground">{dealership.managerName}</strong> ({dealership.managerEmail})</span>
                      </div>

                      {/* Métricas do Tenant */}
                      <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Users className="h-3.5 w-3.5 text-blue-500" />
                          <span>{dealership.sellersCount} vendedores</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Car className="h-3.5 w-3.5 text-emerald-500" />
                          <span>{dealership.vehiclesCount} veículos em pátio</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Sparkles className="h-3.5 w-3.5 text-orange-500" />
                          <span>{dealership.leadsCount} leads cadastrados</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5 text-violet-500" />
                          <span>
                            {dealership.status === "trialing"
                              ? `Fim do Trial: ${formatDate(dealership.trialEndsAt)}`
                              : `Próximo Vencimento: ${formatDate(dealership.currentPeriodEnd)}`}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Ações Administrativas */}
                    <div className="flex flex-wrap items-center gap-2 pt-2 lg:pt-0 shrink-0">
                      {/* Visualizar Loja */}
                      <Link href="/dashboard" data-testid="btn-view-store">
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1 text-xs h-8 hover:bg-orange-500/10 hover:border-orange-500/30 hover:text-orange-400"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          <span>Visualizar Loja</span>
                        </Button>
                      </Link>

                      {/* Ativar Assinatura Manual */}
                      <Button
                        id={`btn-activate-${dealership.id}`}
                        size="sm"
                        variant="outline"
                        disabled={isPending}
                        onClick={() => handleActivate(dealership.id)}
                        className="gap-1.5 text-xs h-8 bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 hover:text-emerald-300"
                        title="Confirmar pagamento e ativar por 30 dias"
                      >
                        <Check className="h-3.5 w-3.5" />
                        <span>Ativar Assinatura</span>
                      </Button>

                      {/* Estender Trial */}
                      <Button
                        id={`btn-extend-${dealership.id}`}
                        size="sm"
                        variant="outline"
                        disabled={isPending}
                        onClick={() => handleExtendTrial(dealership.id)}
                        className="gap-1.5 text-xs h-8 bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20 hover:text-amber-300"
                        title="Adicionar +7 dias de teste"
                      >
                        <PlusCircle className="h-3.5 w-3.5" />
                        <span>+7 Dias Trial</span>
                      </Button>

                      {/* Contatar via WhatsApp */}
                      <a
                        id={`btn-whatsapp-${dealership.id}`}
                        href={whatsappUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1.5 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/20 hover:text-emerald-300 transition"
                        title="Abrir conversa no WhatsApp com o gestor"
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                        <span>WhatsApp</span>
                      </a>

                      {/* Suspender / Bloquear Acesso */}
                      <Button
                        id={`btn-toggle-status-${dealership.id}`}
                        size="sm"
                        variant="ghost"
                        disabled={isPending}
                        onClick={() => handleToggleStatus(dealership.id, dealership.status)}
                        className="gap-1 text-xs h-8 text-muted-foreground hover:text-red-400 hover:bg-red-500/10"
                        title={dealership.status === "canceled" ? "Reativar loja" : "Suspender loja"}
                      >
                        {dealership.status === "canceled" ? (
                          <>
                            <RefreshCw className="h-3.5 w-3.5" />
                            <span>Reativar</span>
                          </>
                        ) : (
                          <>
                            <Ban className="h-3.5 w-3.5" />
                            <span>Suspender</span>
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
