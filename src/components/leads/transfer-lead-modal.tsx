/**
 * @file transfer-lead-modal.tsx
 * @description Modal de transferência de titularidade e reatribuição de leads com auditoria e RBAC.
 */

"use client";

import React, { useState, useEffect, useTransition } from "react";
import { ArrowRightLeft, User, UserCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { transferLeadAction } from "@/app/actions/lead-actions";
import { getTeamMembersAction } from "@/app/actions/team-actions";
import type { TeamMember } from "@/types/team";

export interface TransferLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: {
    id: string;
    name: string;
    assigned_to_name?: string;
    sellerName?: string;
    assigned_to?: { id: string; name: string } | null;
    seller_id?: string;
  } | null;
  availableSellers?: Array<{ id: string; name: string }>;
  onTransferred?: (
    leadId: string,
    newSeller: { id: string; name: string },
    reason?: string
  ) => void;
}

export function TransferLeadModal({
  isOpen,
  onClose,
  lead,
  availableSellers,
  onTransferred,
}: TransferLeadModalProps) {
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [selectedSellerId, setSelectedSellerId] = useState("");
  const [reason, setReason] = useState("");
  const [isPending, startTransition] = useTransition();

  const currentSellerName =
    lead?.assigned_to_name || lead?.sellerName || lead?.assigned_to?.name || "Vendedor Atual";

  useEffect(() => {
    if (isOpen) {
      let isMounted = true;
      getTeamMembersAction()
        .then((members) => {
          if (isMounted && members) {
            setTeam(members);
          }
        })
        .catch(() => {});
      return () => {
        isMounted = false;
      };
    }
  }, [isOpen]);

  // Lista de vendedores elegíveis (exclui o atual e filas)
  const eligibleSellers = React.useMemo(() => {
    const list: Array<{ id: string; name: string }> = [];
    const seen = new Set<string>();

    if (team && team.length > 0) {
      team
        .filter(
          (m) =>
            m.status === "active" &&
            m.name !== currentSellerName &&
            !m.name.toLowerCase().includes("roleta") &&
            !m.name.toLowerCase().includes("fila")
        )
        .forEach((m) => {
          seen.add(m.id);
          seen.add(m.name);
          list.push({ id: m.id, name: m.name });
        });
    }

    if (availableSellers && availableSellers.length > 0) {
      availableSellers
        .filter(
          (s) =>
            s.name !== currentSellerName &&
            !s.name.toLowerCase().includes("roleta") &&
            !s.name.toLowerCase().includes("fila") &&
            !seen.has(s.id) &&
            !seen.has(s.name)
        )
        .forEach((s) => list.push(s));
    }

    return list;
  }, [team, availableSellers, currentSellerName]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!lead || !selectedSellerId || isPending) return;

    const targetSeller =
      eligibleSellers.find((s) => s.id === selectedSellerId || s.name === selectedSellerId) || {
        id: selectedSellerId,
        name: selectedSellerId,
      };

    startTransition(async () => {
      const result = await transferLeadAction(lead.id, targetSeller.id, reason.trim());
      if (result.success) {
        toast.success(`🎯 Lead "${lead.name}" transferido com sucesso!`, {
          description: `Novo Responsável: ${targetSeller.name}`,
          duration: 4000,
        });
        onTransferred?.(lead.id, targetSeller, reason.trim());
        onClose();
        setReason("");
        setSelectedSellerId("");
      } else {
        toast.error(result.error || "Erro ao transferir lead.");
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        id="modal-transfer-lead"
        data-testid="modal-transfer-lead"
        className="sm:max-w-md bg-zinc-950 border-white/10 text-white shadow-2xl p-6"
      >
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 shadow">
              <ArrowRightLeft className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-white">
                Transferir Titularidade do Lead
              </DialogTitle>
              <p className="text-xs text-zinc-400">
                Altere o consultor responsável pelo atendimento de <span className="font-semibold text-white">{lead?.name}</span>.
              </p>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Card Vendedor Atual */}
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800 text-xs font-bold text-zinc-300">
                <User className="h-4 w-4" />
              </div>
              <div>
                <span className="block text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">
                  Responsável Atual
                </span>
                <span className="text-xs font-bold text-zinc-200">{currentSellerName}</span>
              </div>
            </div>
            <span className="rounded-full bg-zinc-800/80 px-2 py-0.5 text-[10px] font-medium text-zinc-400 border border-white/5">
              Titular
            </span>
          </div>

          {/* Seleção do Novo Vendedor */}
          <div className="space-y-1.5">
            <label
              htmlFor="target-seller-select"
              className="flex items-center gap-1.5 text-xs font-semibold text-zinc-300"
            >
              <UserCheck className="h-3.5 w-3.5 text-orange-400" />
              Novo Vendedor Responsável *
            </label>
            <select
              id="target-seller-select"
              data-testid="target-seller-select"
              value={selectedSellerId}
              onChange={(e) => setSelectedSellerId(e.target.value)}
              required
              className="flex h-9 w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-1 text-xs text-white shadow-sm focus:outline-none focus:ring-1 focus:ring-orange-500"
            >
              <option value="" disabled className="text-zinc-500">
                Selecione um vendedor da equipe...
              </option>
              {eligibleSellers.map((seller) => (
                <option key={seller.id} value={seller.id} className="bg-zinc-950 text-white">
                  👤 {seller.name}
                </option>
              ))}
            </select>
          </div>

          {/* Motivo da Transferência */}
          <div className="space-y-1.5">
            <label
              htmlFor="transfer-reason"
              className="text-xs font-semibold text-zinc-300 flex items-center justify-between"
            >
              <span>Motivo da Transferência (Opcional)</span>
              <span className="text-[10px] text-zinc-500 font-normal">Ficará registrado no histórico</span>
            </label>
            <textarea
              id="transfer-reason"
              data-testid="transfer-reason"
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex: Especialista no modelo pretendido, vendedor titular em folga..."
              className="w-full rounded-xl border border-white/10 bg-white/5 p-2.5 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
            />
          </div>

          <DialogFooter className="pt-2 border-t border-white/10 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              disabled={isPending}
              className="text-xs text-zinc-400 hover:text-white"
            >
              Cancelar
            </Button>

            <Button
              type="submit"
              size="sm"
              disabled={!selectedSellerId || isPending}
              data-testid="btn-confirm-transfer"
              className="text-xs font-bold bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white shadow-md shadow-orange-500/20 gap-1.5"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Transferindo...</span>
                </>
              ) : (
                <>
                  <ArrowRightLeft className="h-3.5 w-3.5" />
                  <span>Confirmar Transferência</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
