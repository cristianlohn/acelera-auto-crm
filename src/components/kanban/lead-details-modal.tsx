/**
 * @file lead-details-modal.tsx
 * @description Modal / Drawer Executivo de Detalhes do Lead no Funil de Vendas Kanban.
 *
 * Funcionalidades:
 * - Visualização completa dos dados do cliente (Nome, Telefone, E-mail, Origem).
 * - Disparo rápido de atendimento via WhatsApp Web com mensagem contextualizada.
 * - Detalhes do veículo de interesse e valor negociado.
 * - Vendedor responsável e tempo de SLA decorrido.
 * - Seletor rápido de Etapa do Funil com avanço ou recuo imediato.
 * - Edição e persistência de anotações/observações comerciais.
 * - Fechamento com atalho de teclado Esc ou clique no backdrop.
 */

"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Phone,
  Mail,
  Car,
  Clock,
  MessageCircle,
  Sparkles,
  Save,
  CheckCircle2,
  Send,
  ArrowRightLeft,
} from "lucide-react";
import type { KanbanLead, LeadStage } from "@/types/kanban";
import { KANBAN_STAGES_CONFIG } from "@/types/kanban";
import { cn } from "@/lib/utils";
import { TransferLeadModal } from "@/components/leads/transfer-lead-modal";

export interface LeadDetailsModalProps {
  isOpen: boolean;
  lead: KanbanLead | null;
  onClose: () => void;
  onUpdateStage: (leadId: string, newStage: LeadStage) => void;
  onUpdateNotes?: (leadId: string, notes: string) => Promise<void> | void;
  onReassignSeller?: (leadId: string, sellerName: string, sellerId?: string) => Promise<void> | void;
  availableSellers?: Array<{ id: string; name: string }>;
}

function formatCurrencyBRL(value?: number): string {
  if (!value) return "Sob consulta";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDateBR(dateString?: string): string {
  if (!dateString) return "—";
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(dateString));
  } catch {
    return dateString;
  }
}

export function LeadDetailsModal({
  isOpen,
  lead,
  onClose,
  onUpdateStage,
  onUpdateNotes,
  onReassignSeller,
  availableSellers,
}: LeadDetailsModalProps) {
  const [prevLeadId, setPrevLeadId] = useState<string | null>(null);
  const [notes, setNotes] = useState(lead?.notes || "");
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [notesSaved, setNotesSaved] = useState(false);
  const [isChangingSeller, setIsChangingSeller] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);

  if (lead && lead.id !== prevLeadId) {
    setPrevLeadId(lead.id);
    setNotes(lead.notes || "");
    setNotesSaved(false);
    setIsChangingSeller(false);
    setIsTransferModalOpen(false);
  }

  // Listener para tecla Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  if (!isOpen || !lead) return null;

  const cleanPhone = lead.phone ? lead.phone.replace(/\D/g, "") : "";
  const whatsappDirectMessage = encodeURIComponent(
    `Olá ${lead.name}, tudo bem? Sou ${lead.assigned_to_name || "da concessionária"}. Vi seu interesse no ${lead.vehicle_of_interest}. Como posso te ajudar hoje?`
  );
  const whatsappUrl = cleanPhone
    ? `https://wa.me/${cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`}?text=${whatsappDirectMessage}`
    : "#";

  const handleSaveNotes = async () => {
    if (!lead || !onUpdateNotes) return;
    setIsSavingNotes(true);
    try {
      await onUpdateNotes(lead.id, notes);
      setNotesSaved(true);
      setTimeout(() => setNotesSaved(false), 2500);
    } finally {
      setIsSavingNotes(false);
    }
  };

  const handleStageSelect = (stageId: LeadStage) => {
    if (stageId !== lead.stage) {
      onUpdateStage(lead.id, stageId);
    }
  };

  const currentStageConfig = KANBAN_STAGES_CONFIG.find((c) => c.id === lead.stage);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-lead-details-title"
      data-testid="lead-details-modal"
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-6 animate-in fade-in duration-200"
    >
      {/* Backdrop com Blur */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Conteúdo do Modal / Bottom Sheet no Mobile */}
      <div className="relative w-full md:max-w-2xl max-h-[88vh] md:max-h-[90vh] flex flex-col rounded-t-3xl md:rounded-2xl border-t md:border border-slate-200 dark:border-slate-800 bg-white dark:bg-zinc-950 text-slate-900 dark:text-slate-100 shadow-2xl overflow-hidden z-10 animate-in slide-in-from-bottom-6 md:slide-in-from-bottom-2 duration-200">
        {/* Pull Handle Visual no Mobile */}
        <div className="w-12 h-1.5 bg-slate-300 dark:bg-zinc-700 rounded-full mx-auto md:hidden mt-2.5 mb-0.5 shrink-0" />

        {/* Cabeçalho do Modal */}
        <div className="flex items-start justify-between border-b border-slate-200 dark:border-slate-800/80 p-4 sm:p-5 bg-slate-50/50 dark:bg-zinc-900/50">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="flex h-11 w-11 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 text-base font-extrabold text-white shadow-md shadow-orange-500/20">
              {lead.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2
                  id="modal-lead-details-title"
                  data-testid="lead-details-name"
                  className="text-base sm:text-lg font-bold text-slate-900 dark:text-white truncate"
                >
                  {lead.name}
                </h2>
                <span className="inline-flex items-center gap-1 rounded-full bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 text-[10px] font-bold text-orange-600 dark:text-orange-400">
                  <Sparkles className="h-3 w-3" />
                  {lead.source.toUpperCase()}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Lead ID: <span className="font-mono">{lead.id}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            data-testid="btn-close-lead-details"
            aria-label="Fechar detalhes do lead"
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Corpo com Scroll */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 sm:space-y-5 custom-scrollbar">
          {/* Seletor de Etapa do Funil */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800/80 bg-slate-50 dark:bg-zinc-900/70 p-3 sm:p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Etapa no Funil de Vendas
              </span>
              <span
                className={cn(
                  "text-[10px] font-bold px-2 py-0.5 rounded-full border",
                  currentStageConfig?.badgeColor || "bg-slate-500/10 text-slate-400 border-slate-500/20"
                )}
              >
                Atual: {currentStageConfig?.title || lead.stage}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {KANBAN_STAGES_CONFIG.map((stage) => {
                const isActive = lead.stage === stage.id;
                return (
                  <button
                    key={stage.id}
                    type="button"
                    onClick={() => handleStageSelect(stage.id)}
                    data-testid={`btn-stage-${stage.id}`}
                    className={cn(
                      "flex items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold border transition-all text-left min-h-[44px] active:scale-95",
                      isActive
                        ? "bg-gradient-to-r from-orange-500 to-red-600 text-white border-transparent shadow-sm font-bold ring-2 ring-orange-500/40"
                        : "bg-white dark:bg-zinc-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-orange-500/40 hover:bg-orange-500/5"
                    )}
                  >
                    <span className="truncate">{stage.shortTitle}</span>
                    {isActive && <CheckCircle2 className="h-4 w-4 shrink-0 text-white" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Grid de Informações: Contato e Veículo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Contato & WhatsApp */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-zinc-900/50 p-3.5 space-y-3">
              <h3 className="text-xs font-bold text-slate-900 dark:text-slate-200 uppercase tracking-wider">
                Contato do Cliente
              </h3>

              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                  <Phone className="h-4 w-4 text-orange-500 shrink-0" />
                  <span data-testid="lead-details-phone" className="font-semibold font-mono">
                    {lead.phone || "Não informado"}
                  </span>
                </div>

                {lead.email && (
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                    <Mail className="h-4 w-4 text-slate-400 shrink-0" />
                    <span className="truncate">{lead.email}</span>
                  </div>
                )}
              </div>

              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                data-testid="btn-modal-whatsapp"
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 text-xs font-semibold shadow-sm transition-all active:scale-[0.98]"
              >
                <MessageCircle className="h-4 w-4" />
                <span>Iniciar Conversa no WhatsApp</span>
                <Send className="h-3 w-3 ml-auto opacity-80" />
              </a>
            </div>

            {/* Veículo de Interesse & Valor */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-zinc-900/50 p-3.5 space-y-3">
              <h3 className="text-xs font-bold text-slate-900 dark:text-slate-200 uppercase tracking-wider">
                Veículo de Interesse
              </h3>

              <div className="space-y-2 text-xs">
                <div className="flex items-start gap-2 text-slate-900 dark:text-white">
                  <Car className="h-4 w-4 text-orange-500 shrink-0 mt-0.5" />
                  <div>
                    <span data-testid="lead-details-vehicle" className="font-bold text-sm">
                      {lead.vehicle_of_interest}
                    </span>
                    {lead.segment && (
                      <span className="block text-[10px] text-slate-500 dark:text-slate-400 capitalize">
                        Categoria: {lead.segment.replace("_", " ")}
                      </span>
                    )}
                  </div>
                </div>

                <div className="pt-1">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">
                    Valor Estimado / Pipeline:
                  </span>
                  <div className="text-base font-extrabold text-emerald-600 dark:text-emerald-400">
                    {formatCurrencyBRL(lead.value)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Vendedor Responsável & Tempo de SLA */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="flex items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-zinc-900/50 p-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-red-500 text-xs font-bold text-white shadow">
                {lead.assigned_to_name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">
                    Vendedor Responsável
                  </span>
                  {onReassignSeller && (
                    <button
                      type="button"
                      onClick={() => setIsChangingSeller(!isChangingSeller)}
                      className="text-[10px] font-bold text-orange-500 hover:text-orange-400 hover:underline transition-colors"
                    >
                      {isChangingSeller ? "Cancelar" : "Alterar"}
                    </button>
                  )}
                </div>
                {isChangingSeller ? (
                  <select
                    id="select-reassign-seller"
                    defaultValue={lead.assigned_to_name}
                    onChange={(e) => {
                      const newName = e.target.value;
                      if (!newName) return;
                      const matchedSeller = availableSellers?.find((s) => s.name === newName);
                      onReassignSeller?.(lead.id, newName, matchedSeller?.id);
                      setIsChangingSeller(false);
                    }}
                    className="mt-1 w-full rounded border border-orange-500/40 bg-zinc-950 px-2 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-orange-500"
                  >
                    <option value={lead.assigned_to_name}>{lead.assigned_to_name} (Atual)</option>
                    {(() => {
                      const uniqueMap = new Map<string, { id: string; name: string }>();
                      availableSellers?.forEach((s) => {
                        if (
                          s.name &&
                          s.name !== lead.assigned_to_name &&
                          !s.name.toLowerCase().includes("fila") &&
                          !s.name.toLowerCase().includes("roleta")
                        ) {
                          uniqueMap.set(s.name, s);
                        }
                      });
                      return Array.from(uniqueMap.values()).map((seller) => (
                        <option key={seller.id} value={seller.name}>
                          {seller.name}
                        </option>
                      ));
                    })()}
                  </select>
                ) : (
                  <p
                    onClick={() => onReassignSeller && setIsChangingSeller(true)}
                    className={cn(
                      "text-xs font-bold text-slate-900 dark:text-slate-100 truncate",
                      onReassignSeller && "cursor-pointer hover:text-orange-500 transition-colors"
                    )}
                    title={onReassignSeller ? "Clique para transferir lead" : undefined}
                  >
                    {lead.assigned_to_name}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-zinc-900/50 p-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-500/10 text-orange-500 border border-orange-500/20">
                <Clock className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] text-slate-500 dark:text-slate-400">
                  SLA / Tempo de Espera
                </span>
                <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                  {lead.sla_minutes_elapsed} minutos decorridos
                </p>
              </div>
            </div>
          </div>

          {/* Anotações & Observações do Atendimento */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-zinc-900/50 p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <label
                htmlFor="lead-notes-textarea"
                className="text-xs font-bold text-slate-900 dark:text-slate-200"
              >
                Anotações e Histórico de Atendimento
              </label>
              {notesSaved && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 animate-in fade-in">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Salvo com sucesso!
                </span>
              )}
            </div>

            <textarea
              id="lead-notes-textarea"
              data-testid="lead-notes-textarea"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Cliente prefere financiamento pelo Banco Santander em 48x. Agendado retorno amanhã às 14h."
              className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-zinc-900 p-2.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 transition-all resize-none"
            />

            <div className="flex justify-end pt-1">
              <button
                type="button"
                disabled={isSavingNotes || notes === (lead.notes || "")}
                onClick={handleSaveNotes}
                data-testid="btn-save-lead-notes"
                className="inline-flex items-center gap-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white px-3 py-1.5 text-xs font-semibold shadow-sm transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="h-3.5 w-3.5" />
                <span>{isSavingNotes ? "Salvando..." : "Salvar Anotação"}</span>
              </button>
            </div>
          </div>

          {/* Metadados / Timeline */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 text-[10px] text-slate-400 border-t border-slate-200 dark:border-slate-800/60">
            <span>Criado em: {formatDateBR(lead.created_at)}</span>
            <span>Última atualização: {formatDateBR(lead.updated_at)}</span>
          </div>
        </div>

        {/* Rodapé do Modal */}
        <div className="flex items-center justify-between gap-2 border-t border-slate-200 dark:border-slate-800/80 p-4 bg-slate-50/50 dark:bg-zinc-900/50">
          <button
            type="button"
            onClick={() => setIsTransferModalOpen(true)}
            data-testid="btn-open-transfer-lead"
            className="flex items-center gap-1.5 rounded-lg border border-orange-500/30 bg-orange-500/10 px-3 py-2 text-xs font-semibold text-orange-400 hover:bg-orange-500/20 transition-all"
          >
            <ArrowRightLeft className="h-3.5 w-3.5" />
            <span>Transferir Lead</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-zinc-900 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-all"
          >
            Fechar
          </button>
        </div>
      </div>

      {/* Modal de Transferência de Titularidade */}
      {lead && (
        <TransferLeadModal
          isOpen={isTransferModalOpen}
          onClose={() => setIsTransferModalOpen(false)}
          lead={lead}
          availableSellers={availableSellers}
          onTransferred={(leadId, newSeller) => {
            onReassignSeller?.(leadId, newSeller.name, newSeller.id);
            setIsTransferModalOpen(false);
          }}
        />
      )}
    </div>
  );
}
