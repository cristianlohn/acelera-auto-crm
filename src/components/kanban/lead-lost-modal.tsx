/**
 * @file lead-lost-modal.tsx
 * @description Modal acessível para registro obrigatório de motivo de descarte/perda de lead.
 */

"use client";

import React, { useState } from "react";
import { AlertOctagon, X, Loader2, ThumbsDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LOST_REASON_OPTIONS } from "@/lib/validations/kanban";
import type { KanbanLead } from "@/types/kanban";

interface LeadLostModalProps {
  isOpen: boolean;
  lead: KanbanLead | null;
  onClose: () => void;
  onConfirmLost: (leadId: string, reason: string) => Promise<boolean>;
}

export function LeadLostModal({
  isOpen,
  lead,
  onClose,
  onConfirmLost,
}: LeadLostModalProps) {
  const [selectedReason, setSelectedReason] = useState<string>(LOST_REASON_OPTIONS[0]);
  const [customReason, setCustomReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen || !lead) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalReason =
      selectedReason === "Outro motivo" ? customReason.trim() : selectedReason;

    if (!finalReason || finalReason.length < 3) {
      setErrorMsg("Por favor, detalhe o motivo do descarte (mínimo 3 caracteres).");
      return;
    }

    setErrorMsg(null);
    setIsSubmitting(true);

    const success = await onConfirmLost(lead.id, finalReason);
    setIsSubmitting(false);

    if (success) {
      setCustomReason("");
      setSelectedReason(LOST_REASON_OPTIONS[0]);
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      data-testid="lead-lost-modal"
    >
      <div className="relative w-full max-w-md rounded-3xl bg-zinc-950 border border-red-500/30 p-6 shadow-2xl space-y-5">
        {/* Botão Fechar */}
        <button
          onClick={onClose}
          disabled={isSubmitting}
          className="absolute right-5 top-5 rounded-full p-1 text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Cabeçalho */}
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-bold text-red-400 uppercase tracking-wider">
            <AlertOctagon className="h-4 w-4" />
            <span>Auditoria de Conversão</span>
          </div>
          <h2 className="text-xl font-black text-white tracking-tight">
            Descartar Oportunidade
          </h2>
          <p className="text-xs text-zinc-400">
            Cliente: <span className="font-semibold text-white">{lead.name}</span> (
            <span className="text-orange-400">{lead.vehicle_of_interest}</span>)
          </p>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {errorMsg && (
            <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-xs text-red-400">
              {errorMsg}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-200">
              Qual foi o motivo principal da perda?
            </label>
            <select
              data-testid="select-lost-reason"
              value={selectedReason}
              onChange={(e) => setSelectedReason(e.target.value)}
              disabled={isSubmitting}
              className="w-full h-10 rounded-xl bg-zinc-900 border border-white/10 px-3 text-xs font-medium text-white focus:outline-none focus:ring-1 focus:ring-red-500"
            >
              {LOST_REASON_OPTIONS.map((opt) => (
                <option key={opt} value={opt} className="bg-zinc-900 text-white">
                  {opt}
                </option>
              ))}
            </select>
          </div>

          {selectedReason === "Outro motivo" && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-200">
                Descreva o motivo
              </label>
              <Input
                data-testid="input-custom-lost-reason"
                placeholder="Ex: Cliente vai viajar e adiou compra para o ano que vem"
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                disabled={isSubmitting}
                autoFocus
                className="h-10 bg-white/5 border-white/10 text-white placeholder:text-zinc-500 text-xs rounded-xl focus-visible:ring-red-500"
              />
            </div>
          )}

          <div className="rounded-xl bg-red-500/5 border border-red-500/20 p-3 text-[11px] text-zinc-400 leading-relaxed">
            Este registro alimenta os relatórios analíticos de taxa de perda e objeções da concessionária.
          </div>

          {/* Botões */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              data-testid="btn-cancel-lost"
              onClick={onClose}
              disabled={isSubmitting}
              className="border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10 hover:text-white rounded-xl text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              data-testid="btn-confirm-lost"
              disabled={isSubmitting}
              className="bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-700 hover:to-rose-800 text-white font-bold rounded-xl text-xs shadow-lg shadow-red-500/20"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                  <span>Salvando...</span>
                </>
              ) : (
                <>
                  <ThumbsDown className="h-3.5 w-3.5 mr-1.5" />
                  <span>Confirmar Descarte</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
