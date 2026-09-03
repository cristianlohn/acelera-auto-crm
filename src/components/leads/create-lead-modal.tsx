/**
 * @file create-lead-modal.tsx
 * @description Modal de cadastro manual de novo lead com vinculação a veículo do estoque, valor estimado e atribuição direta por RBAC.
 */

"use client";

import React, { useState, useEffect } from "react";
import { Plus, User, Phone, Mail, Car, Compass, FileText, UserCheck, ShieldCheck, DollarSign } from "lucide-react";
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
import { createLeadAction } from "@/app/actions/lead-actions";
import { getTeamMembersAction } from "@/app/actions/team-actions";
import { getVehicles } from "@/app/actions/vehicles";
import { useDemoRole } from "@/context/demo-role-context";
import { ALLOWED_MANUAL_SOURCES, type CreateLeadInput, type Vehicle } from "@/types/crm";
import type { KanbanLead } from "@/types/kanban";
import type { TeamMember } from "@/types/team";

export interface CreateLeadModalProps {
  onLeadAdded: (lead: KanbanLead) => void;
  triggerClassName?: string;
  triggerLabel?: string;
  triggerId?: string;
  availableSellers?: { id: string; name: string }[];
  availableVehicles?: Vehicle[];
}

export function CreateLeadModal({
  onLeadAdded,
  triggerClassName,
  triggerLabel = "Novo Lead",
  triggerId,
  availableSellers,
  availableVehicles: propVehicles,
}: CreateLeadModalProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>(propVehicles || []);
  const { role, sellerName } = useDemoRole();

  const isSeller = role === "vendedor";
  const currentUserName = sellerName || "Você";

  const [form, setForm] = useState<CreateLeadInput>({
    name: "",
    phone: "",
    email: "",
    vehicle_of_interest: "",
    vehicleId: "",
    vehicleName: "",
    estimatedValue: undefined,
    value: undefined,
    source: "patio",
    assignedTo: isSeller ? currentUserName : "",
    sellerName: isSeller ? currentUserName : "",
    notes: "",
  });

  useEffect(() => {
    let isMounted = true;
    getTeamMembersAction()
      .then((members) => {
        if (isMounted && members) {
          setTeam(members);
        }
      })
      .catch(() => {});

    if (!propVehicles || propVehicles.length === 0) {
      getVehicles()
        .then((vList) => {
          if (isMounted && vList) {
            setVehicles(vList);
          }
        })
        .catch(() => {});
    }

    return () => {
      isMounted = false;
    };
  }, [propVehicles]);

  const stockVehicles = React.useMemo(() => {
    return vehicles.filter(
      (v) =>
        v.status === "disponivel" ||
        (v.status as string) === "available" ||
        !v.status
    );
  }, [vehicles]);

  const handleVehicleSelect = (vehicleId: string) => {
    if (!vehicleId) {
      setForm((prev) => ({
        ...prev,
        vehicleId: "",
        vehicleName: "",
        vehicle_of_interest: "",
        estimatedValue: undefined,
        value: undefined,
      }));
      return;
    }

    const selected = stockVehicles.find((v) => v.id === vehicleId);
    if (selected) {
      const brand = selected.brand || selected.make;
      const fullModel = `${brand} ${selected.model} ${selected.version || ""}`.trim();
      const priceNum = Number(selected.price);

      setForm((prev) => ({
        ...prev,
        vehicleId: selected.id,
        vehicleName: fullModel,
        vehicle_of_interest: fullModel,
        estimatedValue: priceNum,
        value: priceNum,
      }));
    }
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;
    if (name === "phone") {
      setForm((prev) => ({ ...prev, phone: formatPhone(value) }));
    } else if (name === "estimatedValue") {
      const parsed = Number(value.replace(/\D/g, ""));
      setForm((prev) => ({
        ...prev,
        estimatedValue: isNaN(parsed) ? undefined : parsed,
        value: isNaN(parsed) ? undefined : parsed,
      }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const isFormValid =
    form.name.trim().length >= 2 &&
    form.phone.trim().length >= 10 &&
    ((form.vehicle_of_interest || "").trim().length >= 2 || Boolean(form.vehicleId));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const res = await createLeadAction(form);
      if (res.success && res.lead) {
        onLeadAdded(res.lead as KanbanLead);
        toast.success(`🎯 Lead "${res.lead.name}" cadastrado com sucesso!`, {
          description: `Atribuído diretamente a ${(res.lead as KanbanLead).assigned_to_name || currentUserName}`,
          duration: 4000,
        });
        setForm({
          name: "",
          phone: "",
          email: "",
          vehicle_of_interest: "",
          vehicleId: "",
          vehicleName: "",
          estimatedValue: undefined,
          value: undefined,
          source: "patio",
          assignedTo: isSeller ? currentUserName : "",
          sellerName: isSeller ? currentUserName : "",
          notes: "",
        });
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

  // Vendedores elegíveis para seleção por gestores
  const sellersOptions = React.useMemo(() => {
    const list: Array<{ id: string; name: string }> = [];
    const seen = new Set<string>();

    if (team && team.length > 0) {
      team
        .filter(
          (m) =>
            m.status === "active" &&
            !m.name.toLowerCase().includes("fila") &&
            !m.name.toLowerCase().includes("roleta")
        )
        .forEach((m) => {
          seen.add(m.name);
          list.push({ id: m.id, name: m.name });
        });
    }

    if (availableSellers && availableSellers.length > 0) {
      availableSellers.forEach((s) => {
        if (
          s.name &&
          !s.name.toLowerCase().includes("fila") &&
          !s.name.toLowerCase().includes("roleta") &&
          !seen.has(s.name)
        ) {
          list.push(s);
        }
      });
    }

    return list;
  }, [team, availableSellers]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          id={triggerId || "btn-add-lead-kanban"}
          data-testid={triggerId || "btn-add-lead-kanban"}
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
        className="max-h-[92vh] max-w-[calc(100vw-2rem)] sm:max-w-lg overflow-y-auto bg-zinc-950 border-white/10 text-white p-4 sm:p-6"
      >
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-red-600 shadow-lg shadow-orange-500/30">
              <Plus className="h-5 w-5 text-white" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-white">
                Cadastrar Novo Lead Manual
              </DialogTitle>
              <p className="text-xs text-zinc-400">
                Atendimento presencial, telefone ou direto (Bypass da Roleta Comercial).
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

          {/* Veículo de Interesse (Estoque) */}
          <div className="grid gap-1.5">
            <label
              htmlFor="stock-vehicle-select"
              className="flex items-center gap-1.5 text-xs font-semibold text-zinc-300"
            >
              <Car className="h-3.5 w-3.5 text-orange-400" />
              Veículo de Interesse (Estoque)
            </label>
            <select
              id="stock-vehicle-select"
              data-testid="stock-vehicle-select"
              value={form.vehicleId || ""}
              onChange={(e) => handleVehicleSelect(e.target.value)}
              className="h-9 w-full rounded-xl border border-white/10 bg-zinc-900 px-2.5 text-xs font-medium text-white focus:outline-none focus:ring-1 focus:ring-orange-500"
            >
              <option value="" className="bg-zinc-900 text-zinc-400">
                Nenhum veículo vinculado no momento
              </option>
              {stockVehicles.map((v) => {
                const brand = v.brand || v.make;
                const year = v.yearModel || v.year || v.yearFab;
                const formattedPrice = Number(v.price).toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                  maximumFractionDigits: 0,
                });
                return (
                  <option key={v.id} value={v.id} className="bg-zinc-950 text-white">
                    🚗 {brand} {v.model} {v.version || ""} ({year}) — {formattedPrice}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Modelo Personalizado e Valor do Negócio */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <label
                htmlFor="lead-vehicle"
                className="flex items-center gap-1.5 text-xs font-semibold text-zinc-300"
              >
                <Car className="h-3.5 w-3.5 text-zinc-400" />
                Modelo / Descrição *
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

            {/* Valor do Negócio (R$) */}
            <div className="grid gap-1.5">
              <label
                htmlFor="lead-value"
                className="flex items-center justify-between text-xs font-semibold text-zinc-300"
              >
                <span className="flex items-center gap-1.5">
                  <DollarSign className="h-3.5 w-3.5 text-emerald-400" />
                  Valor Estimado (R$)
                </span>
                {form.estimatedValue && form.estimatedValue > 0 && (
                  <span className="text-[10px] text-emerald-400 font-bold">
                    Preço de Tabela
                  </span>
                )}
              </label>
              <Input
                id="lead-value"
                name="estimatedValue"
                value={
                  form.estimatedValue
                    ? Number(form.estimatedValue).toLocaleString("pt-BR")
                    : ""
                }
                onChange={handleChange}
                placeholder="R$ 0"
                className="bg-white/5 border-white/10 text-emerald-400 font-bold placeholder:text-zinc-500 text-xs rounded-xl focus-visible:ring-orange-500"
              />
            </div>
          </div>

          {/* Origem Restrita e Vendedor Responsável */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {/* Dropdown de Origens Manuais */}
            <div className="grid gap-1.5">
              <label
                htmlFor="lead-source"
                className="flex items-center gap-1.5 text-xs font-semibold text-zinc-300"
              >
                <Compass className="h-3.5 w-3.5 text-orange-400" />
                Canal de Atendimento *
              </label>
              <select
                id="lead-source"
                name="source"
                value={form.source}
                onChange={handleChange}
                className="h-9 w-full rounded-xl border border-white/10 bg-white/5 px-2.5 text-xs font-medium text-white focus:outline-none focus:ring-1 focus:ring-orange-500"
              >
                {ALLOWED_MANUAL_SOURCES.map((src) => (
                  <option key={src.value} value={src.value} className="bg-zinc-900 text-white">
                    {src.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Vendedor Responsável (RBAC: Auto-atribuição para vendedor ou Seletor para Gestor) */}
            <div className="grid gap-1.5">
              <label
                htmlFor="lead-seller"
                className="flex items-center gap-1.5 text-xs font-semibold text-zinc-300"
              >
                <UserCheck className="h-3.5 w-3.5 text-orange-400" />
                Vendedor Responsável
              </label>

              {isSeller ? (
                <div className="flex h-9 items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-3 text-xs text-zinc-300">
                  <span className="font-semibold text-white truncate">👤 {currentUserName}</span>
                  <span className="flex items-center gap-1 text-[10px] text-orange-400 font-medium shrink-0">
                    <ShieldCheck className="h-3 w-3" />
                    Atribuído a você
                  </span>
                </div>
              ) : (
                <select
                  id="lead-seller"
                  name="assignedTo"
                  value={form.assignedTo || ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    const matched = sellersOptions.find((s) => s.id === val || s.name === val);
                    setForm((prev) => ({
                      ...prev,
                      assignedTo: val,
                      sellerName: matched?.name || val,
                    }));
                  }}
                  className="h-9 w-full rounded-xl border border-orange-500/40 bg-orange-500/10 px-2.5 text-xs font-semibold text-orange-200 focus:outline-none focus:ring-1 focus:ring-orange-500"
                >
                  <option value="" className="bg-zinc-900 text-white">
                    👤 Atribuir ao Gestor ({currentUserName})
                  </option>
                  {sellersOptions.map((s) => (
                    <option key={s.id || s.name} value={s.id || s.name} className="bg-zinc-900 text-white">
                      👤 {s.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Observações */}
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
