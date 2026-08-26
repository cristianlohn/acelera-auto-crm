/**
 * @file page.tsx  –  /leads
 * @description Funil Kanban de Leads do Acelera Auto CRM.
 *
 * Funcionalidades:
 * - Métricas de topo (Leads Ativos, Visitas, Propostas, Tempo Médio)
 * - Funil Kanban com 5 colunas (Novo, Atendimento, Visita, Proposta, Fechado)
 * - Cards com dados do cliente, veículo, tempo decorrido e botão WhatsApp
 * - Modal para adicionar novo lead
 */

"use client";

import React, { useState, useCallback, useEffect } from "react";
import {
  Users,
  CalendarCheck,
  FileText,
  Clock,
  MessageCircle,
  Plus,
  ChevronRight,
  Car,
  User,
  Phone,
  Mail,
  Tag,
  X,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { mockLeads } from "@/lib/mock-data";
import { timeAgo, urgencyClass, whatsappUrl } from "@/lib/lead-utils";
import { createLead as persistLead, getLeads } from "@/app/actions/leads";
import { useDemoRole } from "@/context/demo-role-context";
import { ManagerActionCockpit } from "@/components/dashboard/ManagerActionCockpit";
import type { Lead, LeadStatus, LeadOrigin } from "@/types/crm";

// ---------------------------------------------------------------------------
// Configuração das colunas do Kanban
// ---------------------------------------------------------------------------

interface KanbanColumn {
  id: LeadStatus;
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  dotColor: string;
}

const KANBAN_COLUMNS: KanbanColumn[] = [
  {
    id: "novo",
    label: "Novo Lead",
    color: "text-blue-600",
    bgColor: "bg-blue-50 dark:bg-blue-950/30",
    borderColor: "border-blue-200 dark:border-blue-800",
    dotColor: "bg-blue-500",
  },
  {
    id: "atendimento",
    label: "Em Atendimento",
    color: "text-violet-600",
    bgColor: "bg-violet-50 dark:bg-violet-950/30",
    borderColor: "border-violet-200 dark:border-violet-800",
    dotColor: "bg-violet-500",
  },
  {
    id: "visita",
    label: "Visita / Test-Drive",
    color: "text-amber-600",
    bgColor: "bg-amber-50 dark:bg-amber-950/30",
    borderColor: "border-amber-200 dark:border-amber-800",
    dotColor: "bg-amber-500",
  },
  {
    id: "proposta",
    label: "Proposta / Financ.",
    color: "text-orange-600",
    bgColor: "bg-orange-50 dark:bg-orange-950/30",
    borderColor: "border-orange-200 dark:border-orange-800",
    dotColor: "bg-orange-500",
  },
  {
    id: "fechado",
    label: "Venda Concluída",
    color: "text-green-600",
    bgColor: "bg-green-50 dark:bg-green-950/30",
    borderColor: "border-green-200 dark:border-green-800",
    dotColor: "bg-green-500",
  },
];

// ---------------------------------------------------------------------------
// Badges de origem
// ---------------------------------------------------------------------------

const ORIGIN_LABELS: Record<LeadOrigin, string> = {
  webmotors: "Webmotors",
  icarros: "iCarros",
  instagram: "Instagram / Meta Ads",
  site: "Site da Loja",
  indicacao_dono: "Indicação do Dono",
  cliente_carteira: "Cliente de Carteira",
  patio_balcao: "Pátio / Balcão",
  whatsapp: "WhatsApp",
  indicacao: "Indicação Geral",
  telefone: "Telefone",
  olx: "OLX",
};

const ORIGIN_COLORS: Record<LeadOrigin, string> = {
  webmotors: "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400 border border-red-500/20",
  icarros: "bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-400 border border-orange-500/20",
  instagram: "bg-pink-100 text-pink-700 dark:bg-pink-950/50 dark:text-pink-400 border border-pink-500/20",
  site: "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400 border border-blue-500/20",
  indicacao_dono: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400 border border-amber-500/20",
  cliente_carteira: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-500/20",
  patio_balcao: "bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-400 border border-purple-500/20",
  whatsapp: "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400 border border-green-500/20",
  indicacao: "bg-yellow-100 text-yellow-700 dark:bg-yellow-950/50 dark:text-yellow-400 border border-yellow-500/20",
  telefone: "bg-slate-100 text-slate-700 dark:bg-slate-900/40 dark:text-slate-400 border border-slate-500/20",
  olx: "bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-400 border border-violet-500/20",
};

// ---------------------------------------------------------------------------
// Componente: Card de Lead
// ---------------------------------------------------------------------------

interface LeadCardProps {
  lead: Lead;
}

function LeadCard({ lead }: LeadCardProps) {
  return (
    <article
      className="group relative rounded-xl border bg-card p-4 shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 hover:border-border/80"
      aria-label={`Lead: ${lead.name}`}
    >
      {/* Cabeçalho: nome + badge origem */}
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-red-500 text-xs font-bold text-white shadow">
            {lead.name
              .split(" ")
              .map((n) => n[0])
              .slice(0, 2)
              .join("")
              .toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">
              {lead.name}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {lead.sellerName}
            </p>
          </div>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium",
            ORIGIN_COLORS[lead.origin]
          )}
        >
          {ORIGIN_LABELS[lead.origin]}
        </span>
      </div>

      {/* Interesse no veículo */}
      <div className="mb-3 flex items-center gap-1.5 rounded-lg bg-muted/60 px-2.5 py-1.5">
        <Car className="h-3 w-3 shrink-0 text-orange-500" />
        <span className="truncate text-xs font-medium text-foreground">
          {lead.vehicleInterest}
        </span>
      </div>

      {/* Tempo decorrido */}
      <div className="mb-3 flex items-center justify-between text-xs">
        <div className="flex items-center gap-1">
          <Clock className={cn("h-3 w-3", urgencyClass(lead.lastContactAt))} />
          <span className={cn("font-medium", urgencyClass(lead.lastContactAt))}>
            {timeAgo(lead.lastContactAt)}
          </span>
        </div>
        {lead.email && (
          <div className="flex items-center gap-1 text-muted-foreground">
            <Mail className="h-3 w-3" />
            <span className="max-w-[100px] truncate">{lead.email}</span>
          </div>
        )}
      </div>

      {/* Botão WhatsApp */}
      <a
        id={`whatsapp-${lead.id}`}
        href={whatsappUrl(lead)}
        target="_blank"
        rel="noopener noreferrer"
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-green-500 to-green-600 px-3 py-2 text-xs font-semibold text-white shadow-sm shadow-green-500/20 transition-all duration-200 hover:from-green-600 hover:to-green-700 hover:shadow-md hover:shadow-green-500/30 active:scale-95"
        aria-label={`Abrir conversa WhatsApp com ${lead.name}`}
      >
        <MessageCircle className="h-3.5 w-3.5" />
        Chamar no WhatsApp
        <ChevronRight className="ml-auto h-3 w-3 opacity-70" />
      </a>
    </article>
  );
}

// ---------------------------------------------------------------------------
// Componente: Coluna do Kanban
// ---------------------------------------------------------------------------

interface KanbanColumnProps {
  column: KanbanColumn;
  leads: Lead[];
}

function KanbanColumnCard({ column, leads }: KanbanColumnProps) {
  return (
    <section
      className="flex w-72 shrink-0 flex-col gap-3"
      aria-label={`Coluna: ${column.label}`}
    >
      {/* Cabeçalho da coluna */}
      <div
        className={cn(
          "flex items-center justify-between rounded-xl border px-3 py-2.5",
          column.bgColor,
          column.borderColor
        )}
      >
        <div className="flex items-center gap-2">
          <div className={cn("h-2 w-2 rounded-full", column.dotColor)} />
          <h2 className={cn("text-sm font-semibold", column.color)}>
            {column.label}
          </h2>
        </div>
        <span
          className={cn(
            "flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-bold",
            column.bgColor,
            column.color
          )}
        >
          {leads.length}
        </span>
      </div>

      {/* Lista de cards */}
      <div className="flex flex-col gap-3">
        {leads.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-8 text-center">
            <div className="mb-2 text-2xl opacity-30">🚗</div>
            <p className="text-xs text-muted-foreground">Nenhum lead aqui</p>
          </div>
        ) : (
          leads.map((lead) => <LeadCard key={lead.id} lead={lead} />)
        )}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Componente: Cartão de Métrica
// ---------------------------------------------------------------------------

interface MetricCardProps {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  trend?: string;
  color: string;
  bgGradient: string;
}

function MetricCard({
  label,
  value,
  icon: Icon,
  trend,
  color,
  bgGradient,
}: MetricCardProps) {
  return (
    <div className="flex items-center gap-3 rounded-xl border bg-card p-3 shadow-sm">
      <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", bgGradient)}>
        <Icon className={cn("h-5 w-5", color)} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs text-muted-foreground">{label}</p>
        <div className="flex items-baseline gap-1.5">
          <span className="text-xl font-bold text-foreground">{value}</span>
          {trend && (
            <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
              {trend}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Modal para Adicionar Novo Lead
// ---------------------------------------------------------------------------

const INITIAL_FORM: {
  name: string;
  phone: string;
  email: string;
  vehicleInterest: string;
  status: LeadStatus;
  sellerName: string;
  origin: LeadOrigin;
} = {
  name: "",
  phone: "",
  email: "",
  vehicleInterest: "",
  status: "novo",
  sellerName: "Roleta Automática (Equipe)",
  origin: "whatsapp",
};

function AddLeadModal({
  onAdd,
  triggerLabel = "Novo Lead",
  triggerId = "btn-add-lead",
}: {
  onAdd: (lead: Lead) => void;
  triggerLabel?: string;
  triggerId?: string;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim() || !form.vehicleInterest.trim()) {
      return;
    }

    const newLead: Lead = {
      id: `lead_${Date.now()}`,
      name: form.name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim() || undefined,
      vehicleInterest: form.vehicleInterest.trim(),
      status: form.status,
      sellerName:
        form.sellerName === "Roleta Automática (Equipe)"
          ? "Rafael Alves"
          : form.sellerName,
      lastContactAt: new Date().toISOString(),
      origin: form.origin,
    };

    onAdd(newLead);
    setForm(INITIAL_FORM);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          id={triggerId}
          data-testid={triggerId}
          size="sm"
          className="gap-1.5 bg-gradient-to-r from-orange-500 to-red-500 text-white hover:from-orange-600 hover:to-red-600 shadow-sm"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>{triggerLabel}</span>
        </Button>
      </DialogTrigger>
      <DialogContent id="modal-add-lead" className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cadastrar Novo Lead</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3.5 pt-2">
          <div className="grid gap-1.5">
            <label
              htmlFor="lead-name"
              className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"
            >
              <User className="h-3.5 w-3.5" />
              Nome do Cliente *
            </label>
            <Input
              id="lead-name"
              name="name"
              required
              placeholder="Ex: Carlos Mendes"
              value={form.name}
              onChange={handleChange}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <label
                htmlFor="lead-phone"
                className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"
              >
                <Phone className="h-3.5 w-3.5" />
                WhatsApp / Tel *
              </label>
              <Input
                id="lead-phone"
                name="phone"
                required
                placeholder="(11) 99999-9999"
                value={form.phone}
                onChange={handleChange}
              />
            </div>
            <div className="grid gap-1.5">
              <label
                htmlFor="lead-email"
                className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"
              >
                <Mail className="h-3.5 w-3.5" />
                E-mail (opcional)
              </label>
              <Input
                id="lead-email"
                name="email"
                type="email"
                placeholder="cliente@email.com"
                value={form.email}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="grid gap-1.5">
            <label
              htmlFor="lead-vehicle"
              className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"
            >
              <Car className="h-3.5 w-3.5" />
              Veículo de Interesse *
            </label>
            <Input
              id="lead-vehicle"
              name="vehicleInterest"
              required
              placeholder="Ex: Toyota Corolla 2.0 XEi 2023"
              value={form.vehicleInterest}
              onChange={handleChange}
            />
          </div>

          <div className="grid gap-1.5">
            <label
              htmlFor="lead-origin"
              className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"
            >
              <Tag className="h-3.5 w-3.5" />
              Canal de Origem
            </label>
            <select
              id="lead-origin"
              name="origin"
              value={form.origin}
              onChange={handleChange}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="whatsapp">WhatsApp Direto</option>
              <option value="site">Site da Concessionária</option>
              <option value="webmotors">Webmotors</option>
              <option value="icarros">iCarros</option>
              <option value="olx">OLX</option>
              <option value="instagram">Instagram / Meta Ads</option>
              <option value="indicacao">Indicação</option>
              <option value="telefone">Telefone</option>
            </select>
          </div>

          <div className="grid gap-1.5">
            <label
              htmlFor="lead-seller"
              className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"
            >
              <User className="h-3.5 w-3.5" />
              Vendedor Responsável
            </label>
            <select
              id="lead-seller"
              name="sellerName"
              value={form.sellerName}
              onChange={handleChange}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="Roleta Automática (Equipe)">Roleta Automática (Equipe)</option>
              <option value="Rafael Alves">Rafael Alves (Vendedor)</option>
              <option value="Juliana Costa">Juliana Costa (Vendedora)</option>
              <option value="Marcos Ferreira">Marcos Ferreira (Gerente)</option>
            </select>
          </div>

          <DialogFooter className="pt-2 flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="w-full sm:w-auto"
            >
              <X className="mr-1 h-3.5 w-3.5" />
              Cancelar
            </Button>
            <Button
              id="btn-submit-lead"
              data-testid="btn-submit-lead"
              type="submit"
              className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white hover:from-orange-600 hover:to-red-600 sm:w-auto"
            >
              Confirmar Cadastro
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Cálculo de métricas
// ---------------------------------------------------------------------------

function computeMetrics(leads: Lead[]) {
  const active = leads.filter((l) => l.status !== "fechado").length;
  const visits = leads.filter((l) => l.status === "visita").length;
  const proposals = leads.filter((l) => l.status === "proposta").length;

  const withContact = leads.filter((l) => l.lastContactAt !== null);
  const avgHrs =
    withContact.length > 0
      ? Math.round(
          withContact.reduce((acc, l) => {
            const diff =
              (Date.now() - new Date(l.lastContactAt!).getTime()) / 3_600_000;
            return acc + diff;
          }, 0) / withContact.length
        )
      : 0;

  return { active, visits, proposals, avgHrs };
}

// ---------------------------------------------------------------------------
// Página principal: /leads
// ---------------------------------------------------------------------------

export interface LeadsPageProps {
  initialLeads?: Lead[];
}

export default function LeadsPage({ initialLeads }: LeadsPageProps = {}) {
  const { role, sellerName, isDemoMode } = useDemoRole();
  const [leads, setLeads] = useState<Lead[]>(() => {
    if (initialLeads !== undefined) return initialLeads;
    if (!isDemoMode) return [];
    return mockLeads;
  });

  useEffect(() => {
    if (initialLeads !== undefined) return;
    if (!isDemoMode) {
      let isMounted = true;
      getLeads()
        .then((fetchedLeads) => {
          if (isMounted) {
            setLeads(fetchedLeads);
          }
        })
        .catch(() => {
          if (isMounted) {
            setLeads([]);
          }
        });
      return () => {
        isMounted = false;
      };
    }
  }, [isDemoMode, initialLeads]);

  const isVendedorRole = role === "vendedor";
  const visibleLeads = isVendedorRole
    ? leads.filter((l) => l.sellerName?.toLowerCase().includes("rafael") || l.sellerName === sellerName)
    : leads;

  const handleAddLead = useCallback((lead: Lead) => {
    setLeads((prev) => [lead, ...prev]);
    persistLead({
      name: lead.name,
      phone: lead.phone,
      email: lead.email,
      vehicleInterest: lead.vehicleInterest,
      status: lead.status,
      sellerName: lead.sellerName,
      origin: lead.origin,
    }).catch(() => {});
  }, []);

  const { active, visits, proposals, avgHrs } = computeMetrics(visibleLeads);

  return (
    <div className="flex h-full flex-col">
      <div className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur-sm">
        <div className="flex items-center justify-between px-4 py-3 sm:px-6">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-foreground sm:text-xl">
                Funil de Vendas
              </h1>
              {isVendedorRole && (
                <span
                  id="badge-vendedor-filter"
                  className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-semibold text-orange-700 dark:bg-orange-950/60 dark:text-orange-300"
                >
                  <User className="h-3 w-3" />
                  Meus Leads ({sellerName})
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {isVendedorRole
                ? `${visibleLeads.length} leads atribuídos a você`
                : `${visibleLeads.length} leads no total da loja`}
            </p>
          </div>
          <AddLeadModal onAdd={handleAddLead} />
        </div>

        <div className="grid grid-cols-2 gap-3 px-4 pb-4 sm:grid-cols-4 sm:px-6">
          <MetricCard
            label="Leads Ativos"
            value={active}
            icon={Users}
            trend={visibleLeads.length > 0 ? "+3 esta semana" : undefined}
            color="text-blue-600"
            bgGradient="bg-blue-100 dark:bg-blue-900/40"
          />
          <MetricCard
            label="Visitas Agendadas"
            value={visits}
            icon={CalendarCheck}
            color="text-amber-600"
            bgGradient="bg-amber-100 dark:bg-amber-900/40"
          />
          <MetricCard
            label="Propostas em Análise"
            value={proposals}
            icon={FileText}
            color="text-orange-600"
            bgGradient="bg-orange-100 dark:bg-orange-900/40"
          />
          <MetricCard
            label="Tempo Médio de Resposta"
            value={avgHrs > 0 ? `${avgHrs}h` : "—"}
            icon={Clock}
            color="text-violet-600"
            bgGradient="bg-violet-100 dark:bg-violet-900/40"
          />
        </div>
      </div>

      {!isVendedorRole && visibleLeads.length > 0 && (
        <div className="px-4 pt-4 sm:px-6">
          <ManagerActionCockpit />
        </div>
      )}

      {visibleLeads.length === 0 ? (
        <div
          data-testid="leads-empty-state"
          className="flex flex-1 flex-col items-center justify-center p-8 text-center"
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-500/10 border border-orange-500/20 text-orange-500 mb-4 shadow-lg shadow-orange-500/5">
            <Users className="h-8 w-8" />
          </div>
          <h2 className="text-lg font-bold text-foreground sm:text-xl">
            Nenhum lead cadastrado ainda
          </h2>
          <p className="mt-1.5 max-w-md text-sm text-muted-foreground">
            Sua concessionária ainda não recebeu novos leads. Você pode cadastrar manualmente um cliente agora ou conectar seus canais de vendas via Webhook.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <AddLeadModal
              onAdd={handleAddLead}
              triggerLabel="Cadastrar Primeiro Lead"
              triggerId="btn-empty-add-lead"
            />
            <a
              href="/settings"
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted hover:border-orange-500/40 transition-all shadow-sm"
            >
              <Zap className="h-4 w-4 text-orange-500" />
              Configurar Integrações / Webhooks
            </a>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-x-auto">
          <div
            className="flex min-h-full gap-4 p-4 sm:p-6"
            role="region"
            aria-label="Funil Kanban de Leads"
          >
            {KANBAN_COLUMNS.map((col) => (
              <KanbanColumnCard
                key={col.id}
                column={col}
                leads={visibleLeads.filter((l) => l.status === col.id)}
              />
            ))}
            <div className="w-4 shrink-0" aria-hidden />
          </div>
        </div>
      )}
    </div>
  );
}
