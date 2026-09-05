/**
 * @file mobile-kanban-tabs.tsx
 * @description Visualização Mobile dedicada para o Funil de Vendas / Kanban do Acelera Auto CRM.
 *
 * Apresenta:
 * - Barra horizontal de abas deslizantes no topo com contagem de leads por etapa.
 * - Lista vertical em coluna única (100% de largura) com touch targets confortáveis (>= 44px).
 * - Ações rápidas no rodapé do card: Botão WhatsApp Direto e Botão Avançar Etapa / Mover via Drawer.
 * - Sincronização em tempo real e atualização otimista.
 */

"use client";

import React, { useState, useMemo } from "react";
import {
  MessageCircle,
  Car,
  Clock,
  AlertTriangle,
  ArrowRight,
  ChevronRight,
  Layers,
  Inbox,
  CheckCircle2,
  XCircle,
  Sparkles,
  SlidersHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import type { KanbanLead, LeadStage, KanbanColumnConfig } from "@/types/kanban";
import type { Lead, LeadStatus } from "@/types/crm";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Definições de Estágios e Mapeamentos Unificados
// ---------------------------------------------------------------------------

export interface FunnelStageDef {
  id: string;
  stageKey: LeadStage | LeadStatus;
  title: string;
  shortTitle: string;
  color: string;
  dotColor: string;
  badgeColor: string;
}

export const FUNNEL_STAGES: FunnelStageDef[] = [
  {
    id: "new",
    stageKey: "new",
    title: "Novos Leads",
    shortTitle: "Novos",
    color: "text-blue-500 dark:text-blue-400",
    dotColor: "bg-blue-500",
    badgeColor: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  },
  {
    id: "contact",
    stageKey: "in_contact",
    title: "Primeiro Contato",
    shortTitle: "1º Contato",
    color: "text-cyan-500 dark:text-cyan-400",
    dotColor: "bg-cyan-500",
    badgeColor: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20",
  },
  {
    id: "visit",
    stageKey: "test_drive",
    title: "Visita / Test-Drive",
    shortTitle: "Visitas",
    color: "text-amber-500 dark:text-amber-400",
    dotColor: "bg-amber-500",
    badgeColor: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  },
  {
    id: "proposal",
    stageKey: "proposal",
    title: "Proposta & F&I",
    shortTitle: "Propostas",
    color: "text-orange-500 dark:text-orange-400",
    dotColor: "bg-orange-500",
    badgeColor: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
  },
  {
    id: "won",
    stageKey: "won",
    title: "Venda Fechada",
    shortTitle: "Fechados",
    color: "text-emerald-500 dark:text-emerald-400",
    dotColor: "bg-emerald-500",
    badgeColor: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  },
  {
    id: "lost",
    stageKey: "lost",
    title: "Perdido / Descarte",
    shortTitle: "Perdidos",
    color: "text-rose-500 dark:text-rose-400",
    dotColor: "bg-rose-500",
    badgeColor: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
  },
];

const NEXT_STAGE_FLOW: Record<string, string | null> = {
  new: "in_contact",
  novo: "atendimento",
  in_contact: "test_drive",
  atendimento: "visita",
  visit_scheduled: "test_drive",
  test_drive: "proposal",
  visita: "proposta",
  proposal: "won",
  proposal_fi: "won",
  proposta: "fechado",
  won: null,
  fechado: null,
  lost: null,
  perdido: null,
};

// ---------------------------------------------------------------------------
// Helpers de Normalização
// ---------------------------------------------------------------------------

export interface NormalizedLead {
  id: string;
  name: string;
  phone: string;
  email?: string;
  vehicle: string;
  sellerName: string;
  stage: string;
  origin: string;
  value?: number;
  slaMinutes?: number;
  lastContactText?: string;
  raw: unknown;
}

function normalizeToMobileLead(lead: KanbanLead | Lead): NormalizedLead {
  // Se for KanbanLead
  if ("vehicle_of_interest" in lead) {
    const kl = lead as KanbanLead;
    return {
      id: kl.id,
      name: kl.name || "Cliente",
      phone: kl.phone || "",
      email: kl.email,
      vehicle: kl.vehicle_of_interest || "Veículo não especificado",
      sellerName: kl.assigned_to_name || kl.assigned_to?.name || "Vendedor",
      stage: kl.stage,
      origin: kl.source || "Origem Direta",
      value: kl.value || kl.estimated_value,
      slaMinutes: kl.sla_minutes_elapsed ?? kl.sla_minutes ?? 0,
      lastContactText: kl.sla_minutes_elapsed ? `${kl.sla_minutes_elapsed}m atrás` : undefined,
      raw: kl,
    };
  }

  // Se for Lead do domínio leads-page-client
  const dl = lead as Lead;
  return {
    id: dl.id,
    name: dl.name || "Cliente",
    phone: dl.phone || "",
    email: dl.email,
    vehicle: dl.vehicleInterest || "Veículo não especificado",
    sellerName: dl.sellerName || "Vendedor",
    stage: dl.status,
    origin: dl.origin || "site",
    value: dl.estimatedValue,
    slaMinutes: 0,
    lastContactText: dl.lastContactAt || undefined,
    raw: dl,
  };
}

function formatBrlCurrency(value?: number): string {
  if (!value || isNaN(value)) return "Sob consulta";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);
}

function getMobileSourceBadge(origin: string) {
  const o = (origin || "").toLowerCase();
  if (o.includes("meta") || o.includes("insta") || o.includes("face")) {
    return { label: "Meta Ads", bg: "bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20" };
  }
  if (o.includes("webmotors")) {
    return { label: "Webmotors", bg: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20" };
  }
  if (o.includes("icarros")) {
    return { label: "iCarros", bg: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20" };
  }
  if (o.includes("olx")) {
    return { label: "OLX Autos", bg: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20" };
  }
  if (o.includes("site") || o.includes("landing")) {
    return { label: "Site Próprio", bg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" };
  }
  if (o.includes("indicacao")) {
    return { label: "Indicação", bg: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" };
  }
  return { label: origin || "Direto", bg: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20" };
}

// ---------------------------------------------------------------------------
// Propriedades do Componente MobileKanbanTabs
// ---------------------------------------------------------------------------

export interface MobileKanbanTabsProps {
  columns?: KanbanColumnConfig[];
  leads?: (KanbanLead | Lead)[];
  onMoveStage?: (leadId: string, targetStage: LeadStage) => void;
  onMoveLead?: (leadId: string, newStatus: LeadStatus) => void;
  onSelectLead?: (lead: any) => void;
  className?: string;
}

export function MobileKanbanTabs({
  columns,
  leads,
  onMoveStage,
  onMoveLead,
  onSelectLead,
  className,
}: MobileKanbanTabsProps) {
  // 1. Extração e normalização dos leads
  const allLeads: NormalizedLead[] = useMemo(() => {
    if (columns && columns.length > 0) {
      return columns.flatMap((col) => col.leads.map(normalizeToMobileLead));
    }
    if (leads && leads.length > 0) {
      return leads.map(normalizeToMobileLead);
    }
    return [];
  }, [columns, leads]);

  // 2. Mapeamento de contagem por etapa
  const stageGroups = useMemo(() => {
    const map = new Map<string, NormalizedLead[]>();

    FUNNEL_STAGES.forEach((s) => map.set(s.id, []));

    allLeads.forEach((lead) => {
      const st = lead.stage;
      if (st === "new" || st === "novo") {
        map.get("new")?.push(lead);
      } else if (st === "in_contact" || st === "atendimento") {
        map.get("contact")?.push(lead);
      } else if (st === "test_drive" || st === "visit_scheduled" || st === "visita") {
        map.get("visit")?.push(lead);
      } else if (st === "proposal" || st === "proposal_fi" || st === "proposta") {
        map.get("proposal")?.push(lead);
      } else if (st === "won" || st === "fechado") {
        map.get("won")?.push(lead);
      } else if (st === "lost" || st === "perdido") {
        map.get("lost")?.push(lead);
      } else {
        map.get("new")?.push(lead);
      }
    });

    return map;
  }, [allLeads]);

  // 3. Etapa ativa padrão (primeira etapa que tem leads ou "new")
  const defaultStage = useMemo(() => {
    for (const s of FUNNEL_STAGES) {
      if ((stageGroups.get(s.id)?.length ?? 0) > 0) {
        return s.id;
      }
    }
    return "new";
  }, [stageGroups]);

  const [activeStageId, setActiveStageId] = useState<string>(defaultStage);
  const [drawerLead, setDrawerLead] = useState<NormalizedLead | null>(null);

  const activeStageDef = FUNNEL_STAGES.find((s) => s.id === activeStageId) || FUNNEL_STAGES[0];
  const activeLeads = stageGroups.get(activeStageId) || [];

  // Handler de movimentação de estágio unificado
  const handlePerformMove = (leadId: string, targetKey: string) => {
    if (onMoveStage) {
      onMoveStage(leadId, targetKey as LeadStage);
    } else if (onMoveLead) {
      onMoveLead(leadId, targetKey as LeadStatus);
    }
    setDrawerLead(null);
  };

  const handleAdvanceStep = (lead: NormalizedLead, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = NEXT_STAGE_FLOW[lead.stage];
    if (next) {
      handlePerformMove(lead.id, next);
    } else {
      setDrawerLead(lead);
    }
  };

  const handleOpenWhatsApp = (lead: NormalizedLead, e: React.MouseEvent) => {
    e.stopPropagation();
    const cleanPhone = lead.phone.replace(/\D/g, "");
    if (!cleanPhone) {
      toast.error("Lead sem telefone cadastrado");
      return;
    }
    const fullPhone = cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`;
    const defaultMsg = encodeURIComponent(
      `Olá ${lead.name}, tudo bem? Sou ${lead.sellerName} da Acelera Auto. Vi seu interesse no ${lead.vehicle}. Como posso ajudar hoje?`
    );
    window.open(`https://wa.me/${fullPhone}?text=${defaultMsg}`, "_blank", "noopener,noreferrer");
  };

  return (
    <div
      data-testid="mobile-kanban-tabs"
      className={cn("w-full space-y-3 select-none", className)}
    >
      {/* ------------------------------------------------------------------ */}
      {/* 1. Barra de Abas Deslizante no Topo                                */}
      {/* ------------------------------------------------------------------ */}
      <div
        role="tablist"
        aria-label="Etapas do Funil de Vendas"
        className="flex items-center gap-2 overflow-x-auto py-2 px-1 border-b border-border/60 dark:border-zinc-800 scrollbar-none"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {FUNNEL_STAGES.map((stage) => {
          const count = stageGroups.get(stage.id)?.length || 0;
          const isActive = activeStageId === stage.id;

          return (
            <button
              key={stage.id}
              role="tab"
              id={`tab-mobile-funnel-${stage.id}`}
              aria-selected={isActive}
              aria-controls={`tabpanel-mobile-funnel-${stage.id}`}
              onClick={() => setActiveStageId(stage.id)}
              data-testid={`tab-stage-${stage.id}`}
              className={cn(
                "flex items-center gap-1.5 shrink-0 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-200 active:scale-95 touch-manipulation",
                isActive
                  ? "bg-orange-500 text-white shadow-md shadow-orange-500/25 ring-1 ring-orange-400"
                  : "bg-card text-muted-foreground hover:text-foreground hover:bg-muted/70 border border-border/60 dark:border-zinc-800"
              )}
            >
              <span
                className={cn(
                  "h-2 w-2 rounded-full",
                  isActive ? "bg-white" : stage.dotColor
                )}
              />
              <span>{stage.shortTitle}</span>
              <span
                data-testid={`badge-count-${stage.id}`}
                className={cn(
                  "px-1.5 py-0.2 rounded-full text-[10px] font-bold",
                  isActive
                    ? "bg-white/20 text-white"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* 2. Cabeçalho da Etapa Ativa com Totalizador                        */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex items-center justify-between px-1 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5 font-medium text-foreground">
          <span className={cn("h-2.5 w-2.5 rounded-full", activeStageDef.dotColor)} />
          <span className="font-bold text-sm">{activeStageDef.title}</span>
        </div>
        <span className="font-semibold text-xs">
          {activeLeads.length} {activeLeads.length === 1 ? "lead ativo" : "leads ativos"}
        </span>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* 3. Lista Vertical de Cards (1 Coluna 100% Largura)                 */}
      {/* ------------------------------------------------------------------ */}
      <div
        id={`tabpanel-mobile-funnel-${activeStageId}`}
        role="tabpanel"
        aria-labelledby={`tab-mobile-funnel-${activeStageId}`}
        className="space-y-3"
      >
        {activeLeads.length === 0 ? (
          <div
            data-testid="empty-stage-state"
            className="flex flex-col items-center justify-center py-12 px-4 text-center rounded-2xl border border-dashed border-border/80 dark:border-zinc-800 bg-muted/20"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-500 mb-3">
              <Inbox className="h-6 w-6" />
            </div>
            <p className="text-sm font-bold text-foreground">
              Nenhum lead nesta etapa
            </p>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs">
              Os leads que avançarem para <strong>{activeStageDef.title}</strong> aparecerão listados aqui.
            </p>
          </div>
        ) : (
          activeLeads.map((lead) => {
            const sourceBadge = getMobileSourceBadge(lead.origin);
            const isCriticalSla = (lead.slaMinutes || 0) > 15 && activeStageId === "new";
            const nextKey = NEXT_STAGE_FLOW[lead.stage];

            return (
              <div
                key={lead.id}
                data-testid={`mobile-lead-card-${lead.id}`}
                onClick={() => onSelectLead?.(lead.raw)}
                className={cn(
                  "relative rounded-2xl border bg-card p-4 shadow-sm transition-all active:scale-[0.99] touch-manipulation cursor-pointer",
                  "border-border/80 dark:border-zinc-800/80 hover:border-orange-500/40",
                  isCriticalSla && "ring-1 ring-red-500/40 border-red-500/30 bg-red-500/[0.02]"
                )}
              >
                {/* Alerta de Urgência de SLA */}
                {isCriticalSla && (
                  <div className="mb-2.5 flex items-center gap-1.5 w-fit rounded-md bg-red-500/15 border border-red-500/30 px-2 py-0.5 text-[10px] font-bold text-red-500 uppercase">
                    <AlertTriangle className="h-3 w-3 shrink-0" />
                    <span>SLA Estourado (&gt; 15 min)</span>
                  </div>
                )}

                {/* Cabeçalho do Card */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-red-500 text-xs font-bold text-white shadow-sm">
                      {lead.name
                        .split(" ")
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join("")
                        .toUpperCase() || "CL"}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-foreground">
                        {lead.name}
                      </p>
                      <p className="truncate text-[11px] text-muted-foreground">
                        Resp: {lead.sellerName}
                      </p>
                    </div>
                  </div>

                  {/* Badges de Origem & SLA */}
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span
                      className={cn(
                        "inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-bold border",
                        sourceBadge.bg
                      )}
                    >
                      {sourceBadge.label}
                    </span>
                    {lead.lastContactText && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground font-medium">
                        <Clock className="h-3 w-3" />
                        <span>{lead.lastContactText}</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Corpo do Card: Veículo & Valor */}
                <div className="mt-3 rounded-xl bg-muted/40 dark:bg-zinc-900/60 border border-border/50 dark:border-zinc-800 p-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <Car className="h-4 w-4 text-orange-500 shrink-0" />
                    <span className="text-xs font-semibold text-foreground truncate">
                      {lead.vehicle}
                    </span>
                  </div>
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 shrink-0 ml-2">
                    {formatBrlCurrency(lead.value)}
                  </span>
                </div>

                {/* Rodapé de Ações Rápidas (Touch Targets >= 44px) */}
                <div className="mt-3.5 grid grid-cols-12 gap-2 pt-2 border-t border-border/40 dark:border-zinc-800/60">
                  {/* Botão WhatsApp */}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={(e) => handleOpenWhatsApp(lead, e)}
                    data-testid={`btn-whatsapp-${lead.id}`}
                    aria-label={`Chamar ${lead.name} no WhatsApp`}
                    className="col-span-6 h-11 min-h-[44px] gap-1.5 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-xs font-bold active:scale-95 transition-all"
                  >
                    <MessageCircle className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>WhatsApp</span>
                  </Button>

                  {/* Botão Avançar Etapa ou Mover */}
                  {nextKey ? (
                    <div className="col-span-6 flex gap-1">
                      <Button
                        type="button"
                        onClick={(e) => handleAdvanceStep(lead, e)}
                        data-testid={`btn-advance-stage-${lead.id}`}
                        aria-label={`Avançar etapa de ${lead.name}`}
                        className="flex-1 h-11 min-h-[44px] gap-1 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white text-xs font-bold shadow-md shadow-orange-500/20 active:scale-95 transition-all"
                      >
                        <span>Avançar</span>
                        <ArrowRight className="h-3.5 w-3.5 shrink-0" />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDrawerLead(lead);
                        }}
                        data-testid={`btn-open-drawer-${lead.id}`}
                        aria-label="Escolher etapa específica"
                        className="h-11 min-h-[44px] px-2.5 border-border/80 text-muted-foreground hover:text-foreground active:scale-95"
                      >
                        <SlidersHorizontal className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDrawerLead(lead);
                      }}
                      data-testid={`btn-open-drawer-${lead.id}`}
                      aria-label="Mover lead de etapa"
                      className="col-span-6 h-11 min-h-[44px] gap-1.5 border-orange-500/30 text-orange-600 dark:text-orange-400 hover:bg-orange-500/10 text-xs font-bold active:scale-95"
                    >
                      <span>Mover Etapa</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* 4. Bottom Sheet (Drawer) para Seleção Direta de Etapa              */}
      {/* ------------------------------------------------------------------ */}
      <Sheet open={Boolean(drawerLead)} onOpenChange={(open) => !open && setDrawerLead(null)}>
        <SheetContent
          side="bottom"
          data-testid="drawer-move-stage"
          className="rounded-t-3xl border-t border-border/80 dark:border-zinc-800 bg-background dark:bg-zinc-950 p-5 space-y-4 max-h-[85vh] overflow-y-auto"
        >
          <div className="mx-auto h-1.5 w-12 rounded-full bg-muted-foreground/30 mb-1" />

          <SheetHeader className="p-0 text-left">
            <SheetTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <Layers className="h-5 w-5 text-orange-500" />
              Mover Lead de Etapa
            </SheetTitle>
            <SheetDescription className="text-xs text-muted-foreground">
              Selecione a etapa de destino para{" "}
              <strong className="text-foreground">{drawerLead?.name}</strong>:
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-2 py-2">
            {FUNNEL_STAGES.map((st) => {
              const isCurrent =
                drawerLead?.stage === st.stageKey ||
                (st.id === "new" && (drawerLead?.stage === "new" || drawerLead?.stage === "novo")) ||
                (st.id === "contact" && (drawerLead?.stage === "in_contact" || drawerLead?.stage === "atendimento")) ||
                (st.id === "visit" && (drawerLead?.stage === "test_drive" || drawerLead?.stage === "visit_scheduled" || drawerLead?.stage === "visita")) ||
                (st.id === "proposal" && (drawerLead?.stage === "proposal" || drawerLead?.stage === "proposal_fi" || drawerLead?.stage === "proposta")) ||
                (st.id === "won" && (drawerLead?.stage === "won" || drawerLead?.stage === "fechado")) ||
                (st.id === "lost" && (drawerLead?.stage === "lost" || drawerLead?.stage === "perdido"));

              return (
                <button
                  key={st.id}
                  type="button"
                  disabled={isCurrent}
                  onClick={() => drawerLead && handlePerformMove(drawerLead.id, st.stageKey as string)}
                  data-testid={`drawer-stage-option-${st.id}`}
                  className={cn(
                    "w-full h-12 min-h-[48px] px-4 rounded-xl flex items-center justify-between text-xs font-bold transition-all touch-manipulation active:scale-98",
                    isCurrent
                      ? "bg-muted/70 text-muted-foreground border border-border/40 cursor-not-allowed opacity-60"
                      : "bg-card border border-border/80 dark:border-zinc-800 text-foreground hover:border-orange-500/50 hover:bg-orange-500/5"
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <span className={cn("h-3 w-3 rounded-full shrink-0", st.dotColor)} />
                    <span className="text-sm">{st.title}</span>
                  </div>

                  {isCurrent ? (
                    <span className="text-[11px] font-semibold text-muted-foreground">
                      (Etapa Atual)
                    </span>
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
              );
            })}
          </div>

          <Button
            variant="outline"
            onClick={() => setDrawerLead(null)}
            className="w-full h-11 min-h-[44px] text-xs font-semibold"
          >
            Cancelar
          </Button>
        </SheetContent>
      </Sheet>
    </div>
  );
}
