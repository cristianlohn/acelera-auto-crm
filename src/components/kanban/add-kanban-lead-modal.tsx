/**
 * @file add-kanban-lead-modal.tsx
 * @description Modal executivo de cadastro de novo lead diretamente no Funil Kanban
 * com suporte a Roleta Automática, vendedores reais da loja e máscara de telefone.
 */

"use client";

import React, { useState, useEffect } from "react";
import { Plus, User, Phone, Mail, Car, Compass, FileText } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { formatPhone } from "@/lib/validations/document";
import { createKanbanLeadAction, type CreateKanbanLeadInput } from "@/app/actions/kanban-actions";
import { getTeamMembersAction } from "@/app/actions/team-actions";
import type { KanbanLead } from "@/types/kanban";
import type { TeamMember } from "@/types/team";

export interface AddKanbanLeadModalProps {
  onLeadAdded: (lead: KanbanLead) => void;
  triggerClassName?: string;
  triggerLabel?: string;
  availableSellers?: { id: string; name: string }[];
}

const INITIAL_LEAD_FORM: CreateKanbanLeadInput = {
  name: "",
  phone: "",
  email: "",
  vehicle_of_interest: "",
  source: "patio",
  stage: "new",
  assigned_to_name: "roleta",
  value: 120000,
  segment: "all",
  notes: "",
};

export function AddKanbanLeadModal({
  onLeadAdded,
  triggerClassName,
  triggerLabel = "Novo Lead",
  availableSellers,
}: AddKanbanLeadModalProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState<CreateKanbanLeadInput>(INITIAL_LEAD_FORM);
  const [team, setTeam] = useState<TeamMember[]>([]);

  useEffect(() => {
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
  }, []);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;
    if (name === "phone") {
      setForm((prev) => ({ ...prev, phone: formatPhone(value) }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const isFormValid =
    form.name.trim().length >= 2 &&
    form.phone.trim().length >= 10 &&
    form.vehicle_of_interest.trim().length >= 2;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const res = await createKanbanLeadAction(form);
      if (res.success && res.lead) {
        onLeadAdded(res.lead);
        toast.success(`🎯 Lead "${res.lead.name}" cadastrado com sucesso!`, {
          description: `Vendedor: ${res.lead.assigned_to_name} • Veículo: ${res.lead.vehicle_of_interest}`,
          duration: 4000,
        });
        setForm(INITIAL_LEAD_FORM);
        setOpen(false);
      } else {
        toast.error(res.error || "Erro ao cadastrar lead.");
      }
    } catch {
      toast.error("Falha na comunicação ao cadastrar lead.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Vendedores exibidos no select: combina teamMembers e availableSellers
  const sellersOptions = React.useMemo(() => {
    const map = new Map<string, string>();
    if (team && team.length > 0) {
      team
        .filter(
          (m) =>
            m.status === "active" &&
            !m.name.toLowerCase().includes("fila") &&
            !m.name.toLowerCase().includes("roleta")
        )
        .forEach((m) => map.set(m.name, m.name));
    }
    if (availableSellers && availableSellers.length > 0) {
      availableSellers.forEach((s) => {
        if (
          s.name &&
          !s.name.toLowerCase().includes("fila") &&
          !s.name.toLowerCase().includes("roleta")
        ) {
          map.set(s.name, s.name);
        }
      });
    }
    return Array.from(map.values());
  }, [team, availableSellers]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          id="btn-add-lead-kanban"
          data-testid="btn-add-lead-kanban"
          className={
            triggerClassName ||
            "gap-1.5 bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg shadow-orange-500/25 hover:from-orange-600 hover:to-red-600 font-bold text-xs"
          }
          aria-label="Cadastrar novo lead diretamente no funil"
        >
          <Plus className="h-4 w-4" />
          <span>{triggerLabel}</span>
        </Button>
      </DialogTrigger>

      <DialogContent
        id="modal-add-kanban-lead"
        className="max-h-[92vh] overflow-y-auto sm:max-w-lg bg-zinc-950 border-white/10 text-white"
      >
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-red-600 shadow-lg shadow-orange-500/30">
              <Plus className="h-5 w-5 text-white" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-white">
                Cadastrar Novo Lead no Funil
              </DialogTitle>
              <p className="text-xs text-zinc-400">
                Insira as informações de contato e o veículo de interesse para iniciar o atendimento.
              </p>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-3 grid gap-3.5">
          {/* Nome do Cliente */}
          <div className="grid gap-1.5">
            <label
              htmlFor="lead-name"
              className="flex items-center gap-1.5 text-xs font-semibold text-zinc-300"
            >
              <User className="h-3.5 w-3.5 text-orange-400" />
              Nome completo do Cliente *
            </label>
            <Input
              id="lead-name"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Ex: Carlos Silva"
              required
              className="bg-white/5 border-white/10 text-white placeholder:text-zinc-500 text-xs rounded-xl focus-visible:ring-orange-500"
            />
          </div>

          {/* Telefone e E-mail */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <label
                htmlFor="lead-phone"
                className="flex items-center gap-1.5 text-xs font-semibold text-zinc-300"
              >
                <Phone className="h-3.5 w-3.5 text-orange-400" />
                Telefone / WhatsApp *
              </label>
              <Input
                id="lead-phone"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                placeholder="(11) 98888-7777"
                type="tel"
                required
                className="bg-white/5 border-white/10 text-white placeholder:text-zinc-500 text-xs rounded-xl focus-visible:ring-orange-500"
              />
            </div>

            <div className="grid gap-1.5">
              <label
                htmlFor="lead-email"
                className="flex items-center gap-1.5 text-xs font-semibold text-zinc-300"
              >
                <Mail className="h-3.5 w-3.5 text-orange-400" />
                E-mail (opcional)
              </label>
              <Input
                id="lead-email"
                name="email"
                value={form.email || ""}
                onChange={handleChange}
                placeholder="carlos@email.com"
                type="email"
                className="bg-white/5 border-white/10 text-white placeholder:text-zinc-500 text-xs rounded-xl focus-visible:ring-orange-500"
              />
            </div>
          </div>

          {/* Veículo de Interesse e Origem */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <label
                htmlFor="lead-vehicle"
                className="flex items-center gap-1.5 text-xs font-semibold text-zinc-300"
              >
                <Car className="h-3.5 w-3.5 text-orange-400" />
                Veículo de Interesse *
              </label>
              <Input
                id="lead-vehicle"
                name="vehicle_of_interest"
                value={form.vehicle_of_interest}
                onChange={handleChange}
                placeholder="Ex: Jeep Compass Longitude 2024"
                required
                className="bg-white/5 border-white/10 text-white placeholder:text-zinc-500 text-xs rounded-xl focus-visible:ring-orange-500"
              />
            </div>

            <div className="grid gap-1.5">
              <label
                htmlFor="lead-source"
                className="flex items-center gap-1.5 text-xs font-semibold text-zinc-300"
              >
                <Compass className="h-3.5 w-3.5 text-orange-400" />
                Origem do Lead
              </label>
              <select
                id="lead-source"
                name="source"
                value={form.source}
                onChange={handleChange}
                className="h-9 w-full rounded-xl border border-white/10 bg-white/5 px-2.5 text-xs font-medium text-white focus:outline-none focus:ring-1 focus:ring-orange-500"
              >
                <option value="patio" className="bg-zinc-900 text-white">🚶 Pátio / Balcão</option>
                <option value="indicacao" className="bg-zinc-900 text-white">🤝 Indicação do Dono</option>
                <option value="whatsapp" className="bg-zinc-900 text-white">💬 WhatsApp Direto</option>
                <option value="site" className="bg-zinc-900 text-white">🌐 Site Oficial</option>
                <option value="instagram" className="bg-zinc-900 text-white">📸 Instagram Direct</option>
                <option value="meta_ads" className="bg-zinc-900 text-white">🎯 Meta Ads (Facebook/Insta)</option>
                <option value="webmotors" className="bg-zinc-900 text-white">🚗 Webmotors</option>
                <option value="icarros" className="bg-zinc-900 text-white">🚙 iCarros</option>
                <option value="olx" className="bg-zinc-900 text-white">🏷️ OLX Autos</option>
              </select>
            </div>
          </div>

          {/* Vendedor Responsável e Estágio Inicial */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <label
                htmlFor="lead-seller"
                className="text-xs font-semibold text-zinc-300"
              >
                Vendedor Responsável
              </label>
              <select
                id="lead-seller"
                name="assigned_to_name"
                value={form.assigned_to_name}
                onChange={handleChange}
                className="h-9 w-full rounded-xl border border-orange-500/40 bg-orange-500/10 px-2.5 text-xs font-semibold text-orange-200 focus:outline-none focus:ring-1 focus:ring-orange-500"
              >
                <option value="roleta" className="bg-zinc-900 text-orange-400 font-bold">
                  🎯 Roleta Automática (Distribuir por Roleta)
                </option>
                {sellersOptions.map((sName) => (
                  <option key={sName} value={sName} className="bg-zinc-900 text-white">
                    👤 {sName}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-1.5">
              <label
                htmlFor="lead-stage"
                className="text-xs font-semibold text-zinc-300"
              >
                Estágio Inicial no Funil
              </label>
              <select
                id="lead-stage"
                name="stage"
                value={form.stage}
                onChange={handleChange}
                className="h-9 w-full rounded-xl border border-white/10 bg-white/5 px-2.5 text-xs font-medium text-white focus:outline-none focus:ring-1 focus:ring-orange-500"
              >
                <option value="new" className="bg-zinc-900 text-white">Novo Lead (Aguardando Resposta)</option>
                <option value="in_contact" className="bg-zinc-900 text-white">Primeiro Contato Realizado</option>
                <option value="visit_scheduled" className="bg-zinc-900 text-white">Visita / Test-Drive Agendado</option>
                <option value="proposal_fi" className="bg-zinc-900 text-white">Proposta / Financiamento F&I</option>
              </select>
            </div>
          </div>

          {/* Observações / Histórico */}
          <div className="grid gap-1.5">
            <label
              htmlFor="lead-notes"
              className="flex items-center gap-1.5 text-xs font-semibold text-zinc-300"
            >
              <FileText className="h-3.5 w-3.5 text-orange-400" />
              Observações Iniciais
            </label>
            <textarea
              id="lead-notes"
              name="notes"
              value={form.notes || ""}
              onChange={handleChange}
              rows={2}
              placeholder="Ex: Cliente tem interesse em dar carro na troca e financiar o restante..."
              className="w-full resize-none rounded-xl border border-white/10 bg-white/5 p-2.5 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-orange-500 outline-none"
            />
          </div>

          {/* Ações */}
          <div className="mt-2 flex justify-end gap-2 border-t border-white/10 pt-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setOpen(false)}
              className="h-8 border-white/10 bg-white/5 hover:bg-white/10 text-xs text-zinc-300"
            >
              Cancelar
            </Button>
            <Button
              id="btn-submit-kanban-lead"
              data-testid="btn-submit-kanban-lead"
              type="submit"
              size="sm"
              disabled={!isFormValid || isSubmitting}
              className="h-8 gap-1.5 bg-gradient-to-r from-orange-500 to-red-500 text-white hover:from-orange-600 hover:to-red-600 font-bold text-xs shadow-md shadow-orange-500/20"
            >
              {isSubmitting ? "Cadastrando..." : "Cadastrar Lead"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
