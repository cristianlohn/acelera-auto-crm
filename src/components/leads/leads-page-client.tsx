/**
 * @file leads-page-client.tsx
 * @description Componente Client interativo do Funil Kanban de Leads do Acelera Auto CRM.
 *
 * Recebe initialLeads e initialOrganizationId via Server-Side Fetching para renderização imediata sem flash.
 */

"use client";

import React, { useState, useCallback, useEffect, useMemo } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Users,
  CalendarCheck,
  FileText,
  Clock,
  Plus,
  ChevronRight,
  Car,
  User,
  Phone,
  Mail,
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
import { formatPhone } from "@/lib/validations/document";
import { createLead as persistLead, getLeads, updateLeadStatus, updateLeadSeller } from "@/app/actions/leads";
import { getTeamMembersAction } from "@/app/actions/team-actions";
import { getCurrentUserProfileAction } from "@/app/actions/auth";
import { useDemoRole } from "@/context/demo-role-context";
import {
  canViewAllLeads,
  normalizeRole,
  canManageIntegrationsAndBilling,
} from "@/lib/permissions";
import { useLeadsRealtime } from "@/hooks/useLeadsRealtime";
import { ManagerActionCockpit } from "@/components/dashboard/ManagerActionCockpit";
import { calculateManagerCockpitMetrics, type LeadAnalyticsInput } from "@/lib/crm/analytics";
import { LeadDetailsModal } from "@/components/leads/lead-details-modal";
import { Skeleton } from "@/components/ui/skeleton";
import type { Lead, LeadStatus, LeadOrigin } from "@/types/crm";
import type { KanbanLead, LeadStage } from "@/types/kanban";
import type { TeamMember } from "@/types/team";

function mapStatusToStage(status: LeadStatus): LeadStage {
  switch (status) {
    case "novo":
      return "new";
    case "atendimento":
      return "in_contact";
    case "visita":
      return "test_drive";
    case "proposta":
      return "proposal";
    case "fechado":
      return "won";
    default:
      return "new";
  }
}

function mapStageToStatus(stage: LeadStage): LeadStatus {
  switch (stage) {
    case "new":
      return "novo";
    case "in_contact":
      return "atendimento";
    case "test_drive":
    case "visit_scheduled":
      return "visita";
    case "proposal":
    case "proposal_fi":
      return "proposta";
    case "won":
    case "lost":
    default:
      return "fechado";
  }
}

function convertDomainLeadToKanban(lead: Lead): KanbanLead {
  const elapsedMinutes = lead.lastContactAt
    ? Math.max(0, Math.round((Date.now() - new Date(lead.lastContactAt).getTime()) / 60000))
    : 5;
  return {
    id: lead.id,
    organization_id: "demo-org",
    name: lead.name,
    phone: lead.phone,
    email: lead.email,
    source: lead.origin || "site",
    vehicle_of_interest: lead.vehicleInterest,
    assigned_to: lead.sellerName ? { id: lead.sellerName, name: lead.sellerName } : null,
    assigned_to_name: lead.sellerName || "Vendedor Responsável",
    stage: mapStatusToStage(lead.status),
    sla_minutes: 15,
    sla_minutes_elapsed: elapsedMinutes,
    created_at: lead.lastContactAt || new Date().toISOString(),
    updated_at: new Date().toISOString(),
    value: undefined,
    segment: "used_cars",
    notes: "",
  };
}

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

const ORIGIN_LABELS: Record<LeadOrigin, string> = {
  webmotors: "Webmotors",
  icarros: "iCarros",
  instagram: "Instagram / Meta Ads",
  site: "Site Próprio",
  whatsapp: "WhatsApp Direto",
  indicacao: "Indicação",
  telefone: "Ligação Telefônica",
  olx: "OLX Autos",
  indicacao_dono: "Indicação do Dono",
  cliente_carteira: "Carteira Antiga",
  patio_balcao: "Visita no Pátio",
};

const ORIGIN_COLORS: Record<LeadOrigin, string> = {
  webmotors: "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400 border border-red-500/20",
  icarros: "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400 border border-blue-500/20",
  instagram: "bg-pink-100 text-pink-700 dark:bg-pink-950/50 dark:text-pink-400 border border-pink-500/20",
  site: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-500/20",
  whatsapp: "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400 border border-green-500/20",
  indicacao: "bg-yellow-100 text-yellow-700 dark:bg-yellow-950/50 dark:text-yellow-400 border border-yellow-500/20",
  telefone: "bg-slate-100 text-slate-700 dark:bg-slate-900/40 dark:text-slate-400 border border-slate-500/20",
  olx: "bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-400 border border-violet-500/20",
  indicacao_dono: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400 border border-amber-500/20",
  cliente_carteira: "bg-cyan-100 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-400 border border-cyan-500/20",
  patio_balcao: "bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-400 border border-purple-500/20",
};

// ---------------------------------------------------------------------------
// Componente: Card de Lead
// ---------------------------------------------------------------------------

interface LeadCardProps {
  lead: Lead;
  onSelectLead?: (lead: Lead) => void;
}

function LeadCard({ lead, onSelectLead }: LeadCardProps) {
  const handleDragStart = (e: React.DragEvent<HTMLElement>) => {
    e.dataTransfer.setData("leadId", lead.id);
    e.dataTransfer.setData("text/plain", lead.id);
    e.dataTransfer.effectAllowed = "move";
  };

  return (
    <article
      draggable={true}
      onDragStart={handleDragStart}
      onClick={() => onSelectLead?.(lead)}
      data-testid="kanban-card"
      data-card-id={lead.id}
      id={`kanban-card-${lead.id}`}
      className="group relative rounded-xl border bg-card p-4 shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 hover:border-orange-500/40 cursor-grab active:cursor-grabbing"
      aria-label={`Lead: ${lead.name}`}
    >
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
            <p className="truncate text-sm font-semibold text-foreground group-hover:text-orange-500 transition-colors">
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

      <div className="mb-3 flex items-center gap-1.5 rounded-lg bg-muted/60 px-2.5 py-1.5">
        <Car className="h-3 w-3 shrink-0 text-orange-500" />
        <span className="truncate text-xs font-medium text-foreground">
          {lead.vehicleInterest}
        </span>
      </div>

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
            <span className="truncate max-w-[120px] text-[11px]">
              {lead.email}
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between border-t pt-3">
        <span className="text-xs text-muted-foreground">{lead.phone}</span>
        <a
          href={whatsappUrl(lead)}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center gap-1.5 rounded-lg bg-green-500 hover:bg-green-600 px-2.5 py-1 text-xs font-medium text-white shadow-sm transition-colors"
          aria-label={`Conversar com ${lead.name} no WhatsApp`}
        >
          <span>WhatsApp</span>
        </a>
      </div>
    </article>
  );
}

// ---------------------------------------------------------------------------
// Componente: Coluna do Kanban
// ---------------------------------------------------------------------------

interface KanbanColumnProps {
  column: KanbanColumn;
  leads: Lead[];
  onDropLead?: (leadId: string, newStatus: LeadStatus) => void;
  onSelectLead?: (lead: Lead) => void;
}

function KanbanColumnCard({
  column,
  leads,
  onDropLead,
  onSelectLead,
}: KanbanColumnProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent<HTMLElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (!isDragOver) setIsDragOver(true);
  };

  const handleDragEnter = (e: React.DragEvent<HTMLElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const leadId = e.dataTransfer.getData("leadId") || e.dataTransfer.getData("text/plain");
    if (leadId && onDropLead) {
      onDropLead(leadId, column.id);
    }
  };

  return (
    <section
      data-testid="kanban-column"
      data-stage-id={column.id}
      id={`kanban-column-${column.id}`}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        "flex w-72 shrink-0 flex-col gap-3 rounded-2xl p-2 transition-all duration-200 border border-transparent",
        isDragOver && "border-amber-500/50 bg-amber-500/5 ring-2 ring-amber-500/30"
      )}
      aria-label={`Coluna: ${column.label}`}
    >
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
          data-testid={`counter-${column.id}`}
          id={`column-count-${column.id}`}
          className={cn(
            "flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-bold",
            column.bgColor,
            column.color
          )}
        >
          {leads.length}
        </span>
      </div>

      <div className="flex flex-col gap-3 min-h-[140px]">
        {leads.length === 0 ? (
          <div
            className={cn(
              "flex flex-col items-center justify-center rounded-xl border border-dashed py-8 text-center transition-all",
              isDragOver && "border-amber-500/50 bg-amber-500/10"
            )}
          >
            <div className="mb-2 text-2xl opacity-30">🚗</div>
            <p className="text-xs text-muted-foreground">Nenhum lead aqui</p>
            <p className="text-[10px] text-muted-foreground/80 mt-0.5">Arraste um card para cá</p>
          </div>
        ) : (
          leads.map((lead) => (
            <LeadCard
              key={lead.id}
              lead={lead}
              onSelectLead={onSelectLead}
            />
          ))
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
  mobileLabel?: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  trend?: string;
  color: string;
  bgGradient: string;
}

function MetricCard({
  label,
  mobileLabel,
  value,
  icon: Icon,
  trend,
  color,
  bgGradient,
}: MetricCardProps) {
  return (
    <div className="flex items-center gap-2.5 sm:gap-3 rounded-xl border bg-card p-3 sm:p-4 shadow-sm min-w-0 overflow-hidden">
      <div className={cn("flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-lg sm:rounded-xl", bgGradient)}>
        <Icon className={cn("h-4 w-4 sm:h-5 sm:w-5", color)} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] sm:text-xs font-medium text-muted-foreground leading-tight truncate">
          <span className="inline sm:hidden">{mobileLabel || label}</span>
          <span className="hidden sm:inline">{label}</span>
        </p>
        <div className="flex items-baseline gap-1.5 mt-0.5">
          <span className="text-lg sm:text-xl font-bold tracking-tight text-foreground truncate">{value}</span>
          {trend && (
            <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 hidden sm:inline">
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
  teamMembers,
}: {
  onAdd: (lead: Lead, requestedSellerName?: string) => void;
  triggerLabel?: string;
  triggerId?: string;
  teamMembers?: TeamMember[];
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    if (name === "phone") {
      setForm((prev) => ({ ...prev, phone: formatPhone(value) }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim() || !form.vehicleInterest.trim()) {
      return;
    }

    const isRoulette =
      !form.sellerName ||
      form.sellerName.includes("Roleta Automática") ||
      form.sellerName === "roleta";

    let optimisticSellerName = form.sellerName;
    if (isRoulette) {
      const onDuty = teamMembers?.filter((m) => m.in_roulette && m.status === "active");
      if (onDuty && onDuty.length > 0) {
        optimisticSellerName = onDuty[0].name;
      } else if (teamMembers && teamMembers.length > 0) {
        optimisticSellerName = teamMembers[0].name;
      } else {
        optimisticSellerName = "Roleta Automática";
      }
    }

    const newLead: Lead = {
      id: `lead_${Date.now()}`,
      name: form.name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim() || undefined,
      vehicleInterest: form.vehicleInterest.trim(),
      status: form.status,
      sellerName: optimisticSellerName,
      lastContactAt: new Date().toISOString(),
      origin: form.origin,
    };

    onAdd(newLead, isRoulette ? "roleta" : form.sellerName);
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
                Telefone / WhatsApp *
              </label>
              <Input
                id="lead-phone"
                name="phone"
                required
                placeholder="(11) 98765-4321"
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
                placeholder="carlos@email.com"
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
              placeholder="Ex: Honda Civic EXL 2021"
              value={form.vehicleInterest}
              onChange={handleChange}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <label
                htmlFor="lead-origin"
                className="text-xs font-medium text-muted-foreground"
              >
                Canal de Origem
              </label>
              <select
                id="lead-origin"
                name="origin"
                value={form.origin}
                onChange={handleChange}
                className="h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="whatsapp">WhatsApp Direto</option>
                <option value="webmotors">Webmotors</option>
                <option value="icarros">iCarros</option>
                <option value="instagram">Instagram Ads</option>
                <option value="site">Site Próprio</option>
                <option value="olx">OLX Autos</option>
                <option value="indicacao">Indicação</option>
                <option value="telefone">Telefone</option>
              </select>
            </div>

            <div className="grid gap-1.5">
              <label
                htmlFor="lead-status"
                className="text-xs font-medium text-muted-foreground"
              >
                Etapa Inicial
              </label>
              <select
                id="lead-status"
                name="status"
                value={form.status}
                onChange={handleChange}
                className="h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="novo">Novo Lead</option>
                <option value="atendimento">Em Atendimento</option>
                <option value="visita">Visita Agendada</option>
                <option value="proposta">Proposta</option>
                <option value="fechado">Venda Concluída</option>
              </select>
            </div>
          </div>

          <div className="grid gap-1.5">
            <label
              htmlFor="lead-seller"
              className="text-xs font-medium text-muted-foreground"
            >
              Vendedor Responsável
            </label>
            <select
              id="lead-seller"
              name="sellerName"
              value={form.sellerName}
              onChange={handleChange}
              className="h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="Roleta Automática (Equipe)">
                ⚡ Roleta Automática (Distribuição Inteligente)
              </option>
              {teamMembers && teamMembers.length > 0 ? (
                teamMembers.map((m) => (
                  <option key={m.id} value={m.name}>
                    {m.name} {m.in_roulette ? "🟢 (Plantão)" : "⏸️ (Pausado)"}
                  </option>
                ))
              ) : (
                <>
                  <option value="Rafael Alves">Rafael Alves (Você)</option>
                  <option value="Juliana Costa">Juliana Costa (Vendedora)</option>
                  <option value="Marcos Ferreira">Marcos Ferreira (Gerente)</option>
                </>
              )}
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

export interface LeadsPageClientProps {
  initialLeads?: Lead[];
  initialTeamMembers?: TeamMember[];
  initialOrganizationId?: string | null;
  userRole?: string;
  userName?: string;
}

export function LeadsPageClient({
  initialLeads,
  initialTeamMembers,
  initialOrganizationId,
  userRole,
  userName,
}: LeadsPageClientProps = {}) {
  const { role, sellerName: demoSellerName, isDemoMode, currentUser } = useDemoRole();
  const [authenticatedName, setAuthenticatedName] = useState<string | null>(userName || null);
  const effectiveRole = normalizeRole(isDemoMode ? role : (userRole || role));
  const isVendedorRole = effectiveRole === "seller";
  const canConfigureIntegrations = canManageIntegrationsAndBilling(effectiveRole);

  const [teamMembers, setTeamMembers] = useState<TeamMember[]>(
    initialTeamMembers || []
  );
  const [organizationId, setOrganizationId] = useState<string | null>(
    initialOrganizationId || null
  );
  const [isLoading, setIsLoading] = useState<boolean>(
    initialLeads === undefined && !isDemoMode
  );
  const [leads, setLeads] = useState<Lead[]>(() => {
    if (initialLeads !== undefined) return initialLeads;
    return mockLeads;
  });
  const [prevInitialLeads, setPrevInitialLeads] = useState(initialLeads);

  if (initialLeads !== prevInitialLeads) {
    setPrevInitialLeads(initialLeads);
    if (initialLeads !== undefined) {
      setLeads(initialLeads);
    }
  }

  useEffect(() => {
    if (initialTeamMembers || isDemoMode) return;
    getTeamMembersAction()
      .then(setTeamMembers)
      .catch(() => {});
  }, [isDemoMode, initialTeamMembers]);

  useEffect(() => {
    if (isDemoMode) return;

    let isMounted = true;
    getCurrentUserProfileAction()
      .then((profile) => {
        if (isMounted) {
          if (profile.fullName) {
            setAuthenticatedName(profile.fullName);
          } else if (profile.email) {
            setAuthenticatedName(profile.email.split("@")[0]);
          }
          if (profile.organizationId) {
            setOrganizationId(profile.organizationId);
          }
        }
      })
      .catch(() => {});

    if (initialLeads !== undefined) return;

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
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });
    return () => {
      isMounted = false;
    };
  }, [isDemoMode, initialLeads]);

  const handlePollSync = useCallback(async () => {
    try {
      const freshLeads = await getLeads();
      if (!freshLeads || freshLeads.length === 0) return;

      setLeads((prev) => {
        const newLeads = freshLeads.filter(
          (fl) => !prev.some((pl) => pl.id === fl.id)
        );

        if (newLeads.length > 0) {
          newLeads.forEach((nl) => {
            toast.success(`🎯 Novo Lead Recebido: ${nl.name || "Cliente"}`, {
              description: `Interesse: ${nl.vehicleInterest || "Veículo"} • Vendedor: ${nl.sellerName}`,
              duration: 5000,
            });
          });

          const existingUpdated = prev.map((pl) => {
            const fresh = freshLeads.find((fl) => fl.id === pl.id);
            return fresh ? { ...pl, ...fresh } : pl;
          });
          return [...newLeads, ...existingUpdated];
        }

        let hasChanges = false;
        const updated = prev.map((pl) => {
          const fresh = freshLeads.find((fl) => fl.id === pl.id);
          if (
            fresh &&
            (fresh.status !== pl.status ||
              fresh.sellerName !== pl.sellerName ||
              fresh.lastContactAt !== pl.lastContactAt)
          ) {
            hasChanges = true;
            return { ...pl, ...fresh };
          }
          return pl;
        });

        return hasChanges ? updated : prev;
      });
    } catch {
      // Silencioso
    }
  }, [setLeads]);

  // Sincronização e reconciliação reativa via Supabase Realtime + Heartbeat Sync
  useLeadsRealtime({
    organizationId,
    isDemo: isDemoMode,
    onLeadInserted: useCallback((newLead: Lead) => {
      setLeads((prev) => {
        if (prev.some((l) => l.id === newLead.id)) {
          return prev;
        }
        return [newLead, ...prev];
      });
    }, [setLeads]),
    onLeadUpdated: useCallback((updatedLead: Lead) => {
      setLeads((prev) =>
        prev.map((l) => (l.id === updatedLead.id ? { ...l, ...updatedLead } : l))
      );
    }, [setLeads]),
    onLeadDeleted: useCallback((deletedLeadId: string) => {
      setLeads((prev) => prev.filter((l) => l.id !== deletedLeadId));
    }, [setLeads]),
    onPollSync: handlePollSync,
  });

  const effectiveSellerName = isDemoMode
    ? demoSellerName
    : (authenticatedName?.trim() || userName?.trim() || currentUser?.name || null);

  const allowAllLeads = canViewAllLeads(effectiveRole);
  const visibleLeads = !allowAllLeads && isDemoMode
    ? leads.filter(
        (l) =>
          l.sellerName === demoSellerName ||
          l.sellerName?.toLowerCase().includes("rafael") ||
          l.sellerName?.toLowerCase().includes("vendedor")
      )
    : !allowAllLeads && !isDemoMode
    ? leads.filter(
        (l) =>
          (effectiveSellerName && l.sellerName === effectiveSellerName) ||
          l.sellerName === "Vendedor de Plantão" ||
          l.sellerName === "Roleta Automática" ||
          !l.sellerName
      )
    : leads;

  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  const availableSellersList = useMemo(() => {
    if (teamMembers && teamMembers.length > 0) {
      return teamMembers.map((m) => ({ id: m.id, name: m.name }));
    }
    const map = new Map<string, { id: string; name: string }>();
    leads.forEach((l) => {
      if (l.sellerName && l.sellerName !== "Fila de Atendimento") {
        map.set(l.sellerName, { id: l.sellerName, name: l.sellerName });
      }
    });
    return Array.from(map.values());
  }, [teamMembers, leads]);

  const handleAddLead = useCallback(
    (lead: Lead, requestedSellerName?: string) => {
      setLeads((prev) => [lead, ...prev]);
      persistLead({
        name: lead.name,
        phone: lead.phone,
        email: lead.email,
        vehicleInterest: lead.vehicleInterest,
        status: lead.status,
        sellerName: requestedSellerName ?? lead.sellerName,
        origin: lead.origin,
      })
        .then((createdLead) => {
          setLeads((prev) =>
            prev.map((l) => (l.id === lead.id ? { ...l, ...createdLead } : l))
          );
        })
        .catch(() => {});
    },
    [setLeads]
  );

  const handleReassignSeller = useCallback(
    async (leadId: string, newSellerName: string, newSellerId?: string) => {
      // 1. Atualização Otimista
      setLeads((prev) =>
        prev.map((l) => (l.id === leadId ? { ...l, sellerName: newSellerName } : l))
      );
      setSelectedLead((prev) =>
        prev && prev.id === leadId ? { ...prev, sellerName: newSellerName } : prev
      );

      toast.success(`Lead transferido para ${newSellerName} com sucesso!`);

      try {
        await updateLeadSeller(leadId, newSellerName, newSellerId);
      } catch {
        // Silencioso
      }
    },
    [setLeads]
  );

  const handleMoveLead = useCallback(
    async (leadId: string, newStatus: LeadStatus) => {
      const targetLead = leads.find((l) => l.id === leadId);
      if (!targetLead || targetLead.status === newStatus) return;

      const previousStatus = targetLead.status;
      const targetColumn = KANBAN_COLUMNS.find((c) => c.id === newStatus);

      // 1. Atualização Otimista
      setLeads((prev) =>
        prev.map((l) => (l.id === leadId ? { ...l, status: newStatus } : l))
      );

      toast.success(`${targetLead.name} movido para "${targetColumn?.label || newStatus}"`, {
        description: `Veículo: ${targetLead.vehicleInterest}`,
      });

      // 2. Persistência no Supabase / Server Action
      try {
        const res = await updateLeadStatus(leadId, newStatus);
        if (!res.success) {
          setLeads((prev) =>
            prev.map((l) => (l.id === leadId ? { ...l, status: previousStatus } : l))
          );
          toast.error("Falha ao atualizar o lead no servidor", {
            description: "Ação revertida automaticamente.",
          });
        }
      } catch {
        setLeads((prev) =>
          prev.map((l) => (l.id === leadId ? { ...l, status: previousStatus } : l))
        );
      }
    },
    [leads, setLeads]
  );

      const { active, visits, proposals, avgHrs } = computeMetrics(visibleLeads);

  const cockpitMetrics = useMemo(() => {
    if (isDemoMode) {
      return undefined;
    }
    const analyticsInput: LeadAnalyticsInput[] = visibleLeads.map((l) => ({
      id: l.id,
      name: l.name,
      phone: l.phone,
      status: l.status,
      sellerName: l.sellerName,
      vehicleInterest: l.vehicleInterest,
      lastContactAt: l.lastContactAt,
      createdAt: l.lastContactAt || undefined,
    }));
    return calculateManagerCockpitMetrics(analyticsInput, { defaultTicket: 0 });
  }, [visibleLeads, isDemoMode]);

  return (
    <div className="flex-1 space-y-4 sm:space-y-6 p-4 sm:p-6 md:p-8 pt-4 sm:pt-6">
      {/* Cabeçalho e Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-4">
        <div>
          <nav className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1.5">
            <Link
              href="/dashboard"
              className="hover:text-foreground transition-colors"
            >
              Cockpit
            </Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-orange-500 font-semibold">Funil de Vendas</span>
          </nav>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-foreground sm:text-2xl">
              Funil de Vendas
            </h1>
            {isVendedorRole && (
              <span
                id="badge-vendedor-filter"
                className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-semibold text-orange-700 dark:bg-orange-950/60 dark:text-orange-300"
              >
                <User className="h-3 w-3" />
                {effectiveSellerName ? `Meus Leads (${effectiveSellerName})` : "Meus Leads"}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {isVendedorRole
              ? `${visibleLeads.length} leads atribuídos a você`
              : `${visibleLeads.length} leads no total da loja`}
          </p>
        </div>
        <AddLeadModal onAdd={handleAddLead} teamMembers={teamMembers} />
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 sm:grid-cols-4">
        <MetricCard
          label="Leads Ativos"
          mobileLabel="Leads Ativos"
          value={active}
          icon={Users}
          trend={visibleLeads.length > 0 ? "+3 esta semana" : undefined}
          color="text-blue-600"
          bgGradient="bg-blue-100 dark:bg-blue-900/40"
        />
        <MetricCard
          label="Visitas Agendadas"
          mobileLabel="Visitas"
          value={visits}
          icon={CalendarCheck}
          color="text-amber-600"
          bgGradient="bg-amber-100 dark:bg-amber-900/40"
        />
        <MetricCard
          label="Propostas em Análise"
          mobileLabel="Propostas"
          value={proposals}
          icon={FileText}
          color="text-orange-600"
          bgGradient="bg-orange-100 dark:bg-orange-900/40"
        />
        <MetricCard
          label="Tempo Médio de Resposta"
          mobileLabel="Tempo Resp."
          value={avgHrs > 0 ? `${avgHrs}h` : "—"}
          icon={Clock}
          color="text-violet-600"
          bgGradient="bg-violet-100 dark:bg-violet-900/40"
        />
      </div>

      {!isVendedorRole && visibleLeads.length > 0 && (
        <div className="px-4 pt-4 sm:px-6">
          <ManagerActionCockpit metrics={cockpitMetrics} />
        </div>
      )}

      {isLoading ? (
        <div className="flex-1 overflow-x-auto">
          <div
            className="flex min-h-full gap-4 p-4 sm:p-6"
            role="region"
            aria-label="Carregando Funil Kanban"
          >
            {KANBAN_COLUMNS.map((col) => (
              <div
                key={col.id}
                className="flex w-72 shrink-0 flex-col rounded-2xl border border-border/40 bg-card/50 p-3 space-y-3 shadow-sm"
              >
                <div className="flex items-center justify-between pb-2 border-b border-border/40">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-2.5 w-2.5 rounded-full" />
                    <Skeleton className="h-4 w-24 rounded" />
                  </div>
                  <Skeleton className="h-5 w-6 rounded-full" />
                </div>
                <div className="space-y-3">
                  <Skeleton className="h-32 w-full rounded-xl" />
                  <Skeleton className="h-32 w-full rounded-xl" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : visibleLeads.length === 0 ? (
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
              teamMembers={teamMembers}
            />
            {canConfigureIntegrations && (
              <a
                href="/settings"
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted hover:border-orange-500/40 transition-all shadow-sm"
              >
                <Zap className="h-4 w-4 text-orange-500" />
                Configurar Integrações / Webhooks
              </a>
            )}
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
                onDropLead={handleMoveLead}
                onSelectLead={(lead) => setSelectedLead(lead)}
              />
            ))}
            <div className="w-4 shrink-0" aria-hidden />
          </div>
        </div>
      )}

      {/* Modal de Detalhes do Lead */}
      {selectedLead && (
        <LeadDetailsModal
          isOpen={!!selectedLead}
          lead={convertDomainLeadToKanban(selectedLead)}
          onClose={() => setSelectedLead(null)}
          onUpdateStage={(leadId, newStage) => {
            const newStatus = mapStageToStatus(newStage);
            handleMoveLead(leadId, newStatus);
            setSelectedLead((prev) =>
              prev && prev.id === leadId ? { ...prev, status: newStatus } : prev
            );
          }}
          onReassignSeller={handleReassignSeller}
          availableSellers={availableSellersList}
        />
      )}
    </div>
  );
}

export default LeadsPageClient;
