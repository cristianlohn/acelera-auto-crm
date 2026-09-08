/**
 * @file kanban-list-view.tsx
 * @description Visualização em Tabela / Lista dos Leads filtrados no Funil,
 * permitindo alternar de modo ágil entre Kanban e Lista.
 */

"use client";

import React from "react";
import { MessageCircle, Clock, AlertTriangle, ChevronRight, Eye } from "lucide-react";
import type { KanbanLead, LeadStage } from "@/types/kanban";
import { KANBAN_STAGES_CONFIG } from "@/types/kanban";

interface KanbanListViewProps {
  leads: KanbanLead[];
  onSelectLead: (lead: KanbanLead) => void;
}

function formatCurrencyBRL(value?: number): string {
  if (!value) return "Sob consulta";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPhoneDisplay(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 13 && digits.startsWith("55")) {
    return `(${digits.slice(2, 4)}) ${digits.slice(4, 9)}-${digits.slice(9)}`;
  }
  return phone;
}

const STAGE_FALLBACK_CONFIG: Record<
  string,
  { title: string; badgeColor: string }
> = {
  new: { title: "Novo Lead", badgeColor: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  in_contact: { title: "Em Atendimento", badgeColor: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
  test_drive: { title: "Visita / Test-Drive", badgeColor: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
  visit_scheduled: { title: "Visita / Test-Drive", badgeColor: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
  proposal: { title: "Proposta / F&I", badgeColor: "bg-orange-500/20 text-orange-400 border-orange-500/30" },
  proposal_fi: { title: "Proposta / F&I", badgeColor: "bg-orange-500/20 text-orange-400 border-orange-500/30" },
  won: { title: "Fechado", badgeColor: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
  lost: { title: "Descartado", badgeColor: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30" },
};

export function KanbanListView({ leads, onSelectLead }: KanbanListViewProps) {
  if (leads.length === 0) {
    return (
      <div
        data-testid="kanban-list-empty"
        className="flex flex-col items-center justify-center p-12 rounded-2xl bg-zinc-900/60 border border-white/10 text-center space-y-3"
      >
        <p className="text-zinc-400 text-sm font-medium">
          Nenhum lead encontrado com os filtros selecionados.
        </p>
      </div>
    );
  }

  return (
    <div
      data-testid="kanban-list-view"
      className="rounded-2xl bg-zinc-900/80 border border-white/10 backdrop-blur-md overflow-hidden shadow-xl"
    >
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/10 bg-white/[0.02] text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
              <th className="py-3.5 px-4">Cliente</th>
              <th className="py-3.5 px-4">WhatsApp</th>
              <th className="py-3.5 px-4">Veículo</th>
              <th className="py-3.5 px-4">Vendedor</th>
              <th className="py-3.5 px-4">Etapa</th>
              <th className="py-3.5 px-4">SLA</th>
              <th className="py-3.5 px-4 text-right">Valor</th>
              <th className="py-3.5 px-4 text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 text-xs text-zinc-300">
            {leads.map((lead) => {
              const stageConfig =
                KANBAN_STAGES_CONFIG.find((s) => s.id === lead.stage) ||
                STAGE_FALLBACK_CONFIG[lead.stage] || {
                  title: lead.stage,
                  badgeColor: "bg-zinc-800 text-zinc-300 border-zinc-700",
                };

              const isSlaBreached =
                lead.sla_minutes_elapsed > lead.sla_minutes &&
                lead.stage !== "won" &&
                lead.stage !== "lost";

              const rawPhone = lead.phone.replace(/\D/g, "");
              const waLink = `https://wa.me/${rawPhone.startsWith("55") ? rawPhone : `55${rawPhone}`}`;

              return (
                <tr
                  key={lead.id}
                  data-testid={`lead-row-${lead.id}`}
                  onClick={() => onSelectLead(lead)}
                  className="group hover:bg-white/[0.04] transition-colors cursor-pointer"
                >
                  {/* Cliente */}
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-white group-hover:text-orange-400 transition-colors">
                      {lead.name}
                    </div>
                    {lead.email && (
                      <div className="text-[11px] text-zinc-500 truncate max-w-[180px]">
                        {lead.email}
                      </div>
                    )}
                  </td>

                  {/* WhatsApp */}
                  <td className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
                    <a
                      href={waLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 font-medium transition-colors"
                      title="Abrir no WhatsApp"
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                      <span>{formatPhoneDisplay(lead.phone)}</span>
                    </a>
                  </td>

                  {/* Veículo */}
                  <td className="py-3.5 px-4">
                    <span className="font-medium text-zinc-200">
                      {lead.vehicle_of_interest || "Não informado"}
                    </span>
                  </td>

                  {/* Vendedor */}
                  <td className="py-3.5 px-4">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[11px] text-zinc-300 font-medium">
                      {lead.assigned_to_name || "Sem atribuição"}
                    </span>
                  </td>

                  {/* Etapa */}
                  <td className="py-3.5 px-4">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${stageConfig.badgeColor}`}
                    >
                      {stageConfig.title}
                    </span>
                  </td>

                  {/* SLA */}
                  <td className="py-3.5 px-4">
                    {lead.stage === "won" || lead.stage === "lost" ? (
                      <span className="text-[11px] text-zinc-500">Concluído</span>
                    ) : isSlaBreached ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-red-400">
                        <AlertTriangle className="h-3 w-3" />
                        <span>+{lead.sla_minutes_elapsed - lead.sla_minutes}m</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-zinc-400">
                        <Clock className="h-3 w-3 text-emerald-400" />
                        <span>{lead.sla_minutes_elapsed}m</span>
                      </span>
                    )}
                  </td>

                  {/* Valor */}
                  <td className="py-3.5 px-4 text-right">
                    <span className="font-semibold text-white">
                      {formatCurrencyBRL(lead.value)}
                    </span>
                  </td>

                  {/* Ações */}
                  <td className="py-3.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      data-testid={`btn-open-lead-${lead.id}`}
                      onClick={() => onSelectLead(lead)}
                      className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white border border-white/10 transition-colors"
                      title="Ver detalhes do lead"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
