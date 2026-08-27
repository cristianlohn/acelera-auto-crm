/**
 * @file salesperson-modal.tsx
 * @description Modal acessível com Radix UI / Shadcn para cadastro de vendedor e membro da equipe com validação Zod.
 */

"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  UserPlus,
  Mail,
  Phone,
  Target,
  Briefcase,
  Layers,
  Sparkles,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { createSalespersonAction } from "@/app/actions/team-actions";
import type { SalespersonMember } from "@/lib/team-schema";

export interface SalespersonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (newMember: SalespersonMember) => void;
}

export function SalespersonModal({
  isOpen,
  onClose,
  onSuccess,
}: SalespersonModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<"seller" | "sdr" | "manager">("seller");
  const [segment, setSegment] = useState<"new_cars" | "used_cars" | "all">("all");
  const [inRoulette, setInRoulette] = useState(true);
  const [monthlyGoal, setMonthlyGoal] = useState("15");
  const [isLoading, setIsLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Formatação amigável do telefone (BR)
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, "");
    if (val.length > 11) val = val.slice(0, 11);

    if (val.length > 6) {
      val = `(${val.slice(0, 2)}) ${val.slice(2, 7)}-${val.slice(7)}`;
    } else if (val.length > 2) {
      val = `(${val.slice(0, 2)}) ${val.slice(2)}`;
    } else if (val.length > 0) {
      val = `(${val}`;
    }

    setPhone(val);
    setFormError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (name.trim().length < 3) {
      setFormError("O nome deve conter ao menos 3 caracteres.");
      return;
    }

    if (!email.includes("@")) {
      setFormError("Informe um e-mail válido.");
      return;
    }

    const digits = phone.replace(/\D/g, "");
    if (digits.length < 10) {
      setFormError("Informe um número de telefone com DDD válido.");
      return;
    }

    setIsLoading(true);

    try {
      const result = await createSalespersonAction({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        role,
        segment,
        in_roulette: inRoulette,
        monthly_goal_units: Number(monthlyGoal) || 0,
      });

      if (!result.success || !result.member) {
        setFormError(result.error || "Erro ao adicionar vendedor.");
        toast.error(result.error || "Erro ao adicionar vendedor.");
        return;
      }

      toast.success("Vendedor adicionado com sucesso!");
      if (onSuccess) {
        onSuccess(result.member);
      }

      // Limpa o formulário e fecha
      setName("");
      setEmail("");
      setPhone("");
      setRole("seller");
      setSegment("all");
      setInRoulette(true);
      setMonthlyGoal("15");
      onClose();
    } catch {
      setFormError("Falha na comunicação com o servidor.");
      toast.error("Falha ao salvar vendedor. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg bg-[#141418] border-white/10 text-white shadow-2xl p-0 overflow-hidden">
        {/* Topo com Ícone e Título */}
        <div className="bg-gradient-to-r from-orange-600/20 via-orange-500/10 to-transparent p-5 border-b border-white/10">
          <DialogHeader>
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 text-white flex items-center justify-center shadow-lg shadow-orange-500/20">
                <UserPlus className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-white tracking-tight">
                  Cadastrar Vendedor / Membro da Equipe
                </DialogTitle>
                <DialogDescription className="text-xs text-zinc-400">
                  Adicione um vendedor para receber leads na Roleta Automática e acompanhar métricas de SLA.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {formError && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/30 p-2.5 text-xs text-red-400 flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-red-500 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* Nome Completo */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-300">
              Nome Completo <span className="text-orange-500">*</span>
            </label>
            <Input
              type="text"
              name="name"
              placeholder="Ex: Carlos Eduardo Silveira"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setFormError(null);
              }}
              data-testid="input-salesperson-name"
              required
              className="bg-black/40 border-white/10 text-white placeholder:text-zinc-500 h-9 text-xs"
            />
          </div>

          {/* E-mail e Telefone (Grid) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-orange-400" />
                E-mail de Acesso <span className="text-orange-500">*</span>
              </label>
              <Input
                type="email"
                name="email"
                placeholder="vendedor@concessionaria.com.br"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setFormError(null);
                }}
                data-testid="input-salesperson-email"
                required
                className="bg-black/40 border-white/10 text-white placeholder:text-zinc-500 h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 text-emerald-400" />
                WhatsApp / Telefone <span className="text-orange-500">*</span>
              </label>
              <Input
                type="tel"
                name="phone"
                placeholder="(11) 98888-7777"
                value={phone}
                onChange={handlePhoneChange}
                data-testid="input-salesperson-phone"
                required
                className="bg-black/40 border-white/10 text-white placeholder:text-zinc-500 h-9 text-xs font-mono"
              />
            </div>
          </div>

          {/* Função, Segmento e Meta (Grid) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                <Briefcase className="h-3.5 w-3.5 text-blue-400" />
                Cargo / Função
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as "seller" | "sdr" | "manager")}
                data-testid="select-salesperson-role"
                className="w-full h-9 rounded-md border border-white/10 bg-black/40 px-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-orange-500"
              >
                <option value="seller" className="bg-zinc-900 text-white">Vendedor / Closer</option>
                <option value="sdr" className="bg-zinc-900 text-white">SDR / Pré-vendas</option>
                <option value="manager" className="bg-zinc-900 text-white">Gerente Comercial</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-amber-400" />
                Segmento
              </label>
              <select
                value={segment}
                onChange={(e) => setSegment(e.target.value as "new_cars" | "used_cars" | "all")}
                data-testid="select-salesperson-segment"
                className="w-full h-9 rounded-md border border-white/10 bg-black/40 px-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-orange-500"
              >
                <option value="all" className="bg-zinc-900 text-white">Todos os Veículos</option>
                <option value="new_cars" className="bg-zinc-900 text-white">Veículos Novos 0km</option>
                <option value="used_cars" className="bg-zinc-900 text-white">Seminovos / Usados</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                <Target className="h-3.5 w-3.5 text-purple-400" />
                Meta Mensal (Unid.)
              </label>
              <Input
                type="number"
                min="0"
                value={monthlyGoal}
                onChange={(e) => setMonthlyGoal(e.target.value)}
                data-testid="input-salesperson-goal"
                className="bg-black/40 border-white/10 text-white placeholder:text-zinc-500 h-9 text-xs"
              />
            </div>
          </div>

          {/* Switch / Toggle: Participação na Roleta Automática */}
          <div className="rounded-xl border border-white/10 bg-black/30 p-3.5 flex items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-orange-400" />
                <span className="text-xs font-bold text-white">
                  Participar da Roleta de Leads (Distribuição Automática)
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 leading-tight">
                Recebe novas oportunidades automaticamente via Webhook e Roleta Round-Robin.
              </p>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={inRoulette}
              data-testid="switch-in-roulette"
              onClick={() => setInRoulette(!inRoulette)}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                inRoulette ? "bg-orange-500" : "bg-zinc-700"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                  inRoulette ? "translate-x-4" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          <DialogFooter className="pt-3 border-t border-white/10 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={isLoading}
              className="h-8 px-3 text-xs text-zinc-400 hover:text-white"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              data-testid="btn-submit-salesperson"
              className="h-8 px-4 text-xs font-bold bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white shadow-lg shadow-orange-500/20"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                  <span>Salvando Vendedor...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="h-3.5 w-3.5 mr-1.5" />
                  <span>Salvar Vendedor</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
