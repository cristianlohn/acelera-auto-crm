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

import React, { useState, useCallback } from "react";
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
import { createLead as persistLead } from "@/app/actions/leads";
import { useDemoRole } from "@/context/demo-role-context";
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
  whatsapp: "WhatsApp",
  instagram: "Instagram",
  site: "Site",
  indicacao: "Indicação",
  telefone: "Telefone",
  olx: "OLX",
  icarros: "iCarros",
};

const ORIGIN_COLORS: Record<LeadOrigin, string> = {
  whatsapp: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400",
  instagram: "bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-400",
  site: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400",
  indicacao: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400",
  telefone: "bg-slate-100 text-slate-700 dark:bg-slate-900/40 dark:text-slate-400",
  olx: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400",
  icarros: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400",
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
    <div className="relative overflow-hidden rounded-xl border bg-card p-4 shadow-sm transition-all hover:shadow-md">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
          {trend && (
            <p className="mt-1 text-xs font-medium text-green-600 dark:text-green-400">
              {trend}
            </p>
          )}
        </div>
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-xl",
            bgGradient
          )}
        >
          <Icon className={cn("h-5 w-5", color)} />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Componente: Modal Novo Lead
// ---------------------------------------------------------------------------

const EMPTY_FORM = {
  name: "",
  phone: "",
  email: "",
  vehicleInterest: "",
  sellerName: "",
  origin: "whatsapp" as LeadOrigin,
};

interface AddLeadModalProps {
  onAdd: (lead: Lead) => void;
}

function AddLeadModal({ onAdd }: AddLeadModalProps) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.phone || !form.vehicleInterest) return;

    const newLead: Lead = {
      id: `l-${Date.now()}`,
      name: form.name,
      phone: form.phone,
      email: form.email || undefined,
      vehicleInterest: form.vehicleInterest,
      status: "novo",
      sellerName: form.sellerName || "Sem vendedor",
      lastContactAt: null,
      origin: form.origin as LeadOrigin,
    };
    onAdd(newLead);
    setForm(EMPTY_FORM);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          id="btn-add-lead"
          className="gap-2 bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg shadow-orange-500/25 hover:from-orange-600 hover:to-red-600 hover:shadow-orange-500/35"
          aria-label="Adicionar novo lead"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Novo Lead</span>
        </Button>
      </DialogTrigger>

      <DialogContent
        id="modal-add-lead"
        className="sm:max-w-md"
        aria-describedby="modal-add-lead-desc"
      >
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-red-600 shadow-lg shadow-orange-500/30">
              <Zap className="h-4 w-4 text-white" />
            </div>
            <div>
              <DialogTitle>Adicionar Novo Lead</DialogTitle>
              <p
                id="modal-add-lead-desc"
                className="text-xs text-muted-foreground"
              >
                Preencha os dados do potencial cliente
              </p>
            </div>
          </div>
        </DialogHeader>

        <form id="form-add-lead" onSubmit={handleSubmit} className="mt-2 grid gap-4">
          {/* Nome */}
          <div className="grid gap-1.5">
            <label
              htmlFor="lead-name"
              className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"
            >
              <User className="h-3.5 w-3.5" />
              Nome completo *
            </label>
            <Input
              id="lead-name"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Ex: Carlos Mendonça"
              required
            />
          </div>

          {/* Telefone */}
          <div className="grid gap-1.5">
            <label
              htmlFor="lead-phone"
              className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"
            >
              <Phone className="h-3.5 w-3.5" />
              Telefone (WhatsApp) *
            </label>
            <Input
              id="lead-phone"
              name="phone"
              value={form.phone}
              onChange={handleChange}
              placeholder="Ex: 11987654321"
              type="tel"
              required
            />
          </div>

          {/* E-mail */}
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
              value={form.email}
              onChange={handleChange}
              placeholder="Ex: cliente@email.com"
              type="email"
            />
          </div>

          {/* Veículo de interesse */}
          <div className="grid gap-1.5">
            <label
              htmlFor="lead-vehicle"
              className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"
            >
              <Car className="h-3.5 w-3.5" />
              Veículo de interesse *
            </label>
            <Input
              id="lead-vehicle"
              name="vehicleInterest"
              value={form.vehicleInterest}
              onChange={handleChange}
              placeholder="Ex: Honda Civic EXL 2023"
              required
            />
          </div>

          {/* Grid: vendedor + origem */}
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <label
                htmlFor="lead-seller"
                className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"
              >
                <User className="h-3.5 w-3.5" />
                Vendedor
              </label>
              <Input
                id="lead-seller"
                name="sellerName"
                value={form.sellerName}
                onChange={handleChange}
                placeholder="Ex: Rafael Alves"
              />
            </div>

            <div className="grid gap-1.5">
              <label
                htmlFor="lead-origin"
                className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"
              >
                <Tag className="h-3.5 w-3.5" />
                Origem
              </label>
              <select
                id="lead-origin"
                name="origin"
                value={form.origin}
                onChange={handleChange}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus:outline-none focus:ring-1 focus:ring-ring"
              >
                {Object.entries(ORIGIN_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <DialogFooter className="-mx-4 -mb-4 mt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              className="gap-1.5"
            >
              <X className="h-4 w-4" />
              Cancelar
            </Button>
            <Button
              id="btn-submit-lead"
              type="submit"
              className="gap-2 bg-gradient-to-r from-orange-500 to-red-500 text-white hover:from-orange-600 hover:to-red-600"
            >
              <Plus className="h-4 w-4" />
              Adicionar Lead
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

  // Tempo médio de resposta: média em horas de leads com contato
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

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>(mockLeads);
  const { role, sellerName } = useDemoRole();

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
    }).catch(() => {
      // Fallback silencioso mantendo estado local
    });
  }, []);

  const { active, visits, proposals, avgHrs } = computeMetrics(visibleLeads);

  return (
    <div className="flex h-full flex-col">
      {/* ---------------------------------------------------------------- */}
      {/* Cabeçalho da página                                               */}
      {/* ---------------------------------------------------------------- */}
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

        {/* Métricas */}
        <div className="grid grid-cols-2 gap-3 px-4 pb-4 sm:grid-cols-4 sm:px-6">
          <MetricCard
            label="Leads Ativos"
            value={active}
            icon={Users}
            trend="+3 esta semana"
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

      {/* ---------------------------------------------------------------- */}
      {/* Kanban board – scroll horizontal                                   */}
      {/* ---------------------------------------------------------------- */}
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
          {/* Espaço final para respirar no scroll horizontal */}
          <div className="w-4 shrink-0" aria-hidden />
        </div>
      </div>
    </div>
  );
}
