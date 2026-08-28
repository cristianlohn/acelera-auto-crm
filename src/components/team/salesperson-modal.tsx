/**
 * @file salesperson-modal.tsx
 * @description Modal acessível com Radix UI / Shadcn para cadastro e edição de vendedor e membro da equipe com validação Zod e máscara.
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
import { Switch } from "@/components/ui/switch";
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
  CheckCircle2,
  Copy,
  Check,
  MessageCircle,
} from "lucide-react";
import { toast } from "sonner";
import {
  createSalespersonAction,
  updateSalespersonAction,
  type CreateSalespersonResult,
} from "@/app/actions/team-actions";
import { formatPhone } from "@/lib/validations/document";
import type { TeamMember } from "@/types/team";

export interface SalespersonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (member: TeamMember) => void;
  initialData?: TeamMember | null;
}

interface FormInnerProps {
  initialData?: TeamMember | null;
  onClose: () => void;
  onSuccess?: (member: TeamMember) => void;
}

function SalespersonFormInner({ initialData, onClose, onSuccess }: FormInnerProps) {
  const [name, setName] = useState(initialData?.name || "");
  const [email, setEmail] = useState(initialData?.email || "");
  const [phone, setPhone] = useState(initialData ? formatPhone(initialData.phone || "") : "");
  const [role, setRole] = useState<TeamMember["role"]>(initialData?.role || "seller");
  const [segment, setSegment] = useState<TeamMember["segment"]>(initialData?.segment || "all");
  const [inRoulette, setInRoulette] = useState(initialData?.in_roulette !== false);
  const [monthlyGoal, setMonthlyGoal] = useState(String(initialData?.monthly_goal_units || 10));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [createdResult, setCreatedResult] = useState<CreateSalespersonResult | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhone(formatPhone(e.target.value));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Validações locais
    if (!name.trim() || name.trim().length < 3) {
      setFormError("O nome completo deve ter no mínimo 3 caracteres.");
      return;
    }

    if (!email.trim() || !email.includes("@")) {
      setFormError("Informe um endereço de e-mail corporativo válido.");
      return;
    }

    const cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.length < 10 || cleanPhone.length > 11) {
      setFormError("Informe um número de WhatsApp/celular com DDD válido (10 ou 11 dígitos, ex: (11) 98888-8888).");
      return;
    }

    setIsSubmitting(true);

    try {
      if (initialData?.id) {
        // Atualização de vendedor existente
        const result = await updateSalespersonAction(initialData.id, {
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          role,
          segment,
          in_roulette: inRoulette,
          monthly_goal_units: Number(monthlyGoal) || 10,
        });

        if (!result.success) {
          setFormError(result.error || "Erro ao atualizar vendedor.");
          setIsSubmitting(false);
          return;
        }

        toast.success(`Vendedor ${name.trim()} atualizado com sucesso!`);
        onSuccess?.({
          ...initialData,
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          role,
          segment,
          in_roulette: inRoulette,
          monthly_goal_units: Number(monthlyGoal) || 10,
        });
        onClose();
      } else {
        // Criação de novo vendedor com disparo automático de convite
        const result = await createSalespersonAction({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          role,
          segment,
          in_roulette: inRoulette,
          monthly_goal_units: Number(monthlyGoal) || 10,
        });

        if (!result.success || !result.member) {
          setFormError(result.error || "Erro ao cadastrar vendedor.");
          setIsSubmitting(false);
          return;
        }

        toast.success(
          `Vendedor cadastrado! E-mail de convite enviado automaticamente para ${email.trim()}.`
        );
        onSuccess?.(result.member);
        setCreatedResult(result);
      }
    } catch {
      setFormError("Falha na comunicação com o servidor. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Se o cadastro foi concluído com sucesso, exibe o painel de confirmação e contingência
  if (createdResult && createdResult.member) {
    const cleanPhone = createdResult.member.phone.replace(/\D/g, "");
    const formattedPhone = cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`;
    const inviteUrl = createdResult.fallbackInviteLink || "";
    const whatsappMsg = encodeURIComponent(
      `Olá ${createdResult.member.name}! Você foi convidado para a equipe de vendas no Acelera Auto CRM. Acesse o link abaixo para definir sua senha de acesso:\n\n${inviteUrl}`
    );
    const whatsappUrl = `https://wa.me/${formattedPhone}?text=${whatsappMsg}`;

    const handleCopyLink = () => {
      if (inviteUrl) {
        navigator.clipboard.writeText(inviteUrl);
        setCopiedLink(true);
        toast.success("Link de acesso copiado com sucesso!");
        setTimeout(() => setCopiedLink(false), 3000);
      }
    };

    return (
      <div className="space-y-4 pt-2" data-testid="invite-success-container">
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-center space-y-2">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <h3 className="text-sm font-bold text-white">
            Vendedor Cadastrado com Sucesso!
          </h3>
          <p className="text-xs text-zinc-300">
            O e-mail de convite foi enviado automaticamente para{" "}
            <span className="font-semibold text-emerald-400">{createdResult.member.email}</span>.
          </p>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/5 p-3.5 space-y-3">
          <p className="text-xs text-zinc-400 leading-relaxed">
            O convite foi enviado para o e-mail do vendedor. Caso ele relate dificuldades no recebimento, utilize as opções de contingência abaixo:
          </p>

          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleCopyLink}
              data-testid="btn-copy-invite-link"
              className="flex-1 bg-white/5 border-white/10 text-white hover:bg-white/10 text-xs font-semibold gap-2 h-9"
            >
              {copiedLink ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4 text-zinc-400" />}
              <span>{copiedLink ? "Link Copiado!" : "Copiar Link de Acesso"}</span>
            </Button>

            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              data-testid="btn-send-invite-whatsapp"
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 text-xs font-semibold shadow-sm transition-all h-9"
            >
              <MessageCircle className="h-4 w-4" />
              <span>Enviar via WhatsApp</span>
            </a>
          </div>
        </div>

        <DialogFooter className="pt-2">
          <Button
            type="button"
            onClick={onClose}
            data-testid="btn-finish-invite"
            className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white text-xs font-bold h-9"
          >
            Concluir
          </Button>
        </DialogFooter>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-2">
      {formError && (
        <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-xs text-red-400 font-medium">
          {formError}
        </div>
      )}

      {/* Nome Completo */}
      <div className="space-y-1.5">
        <label htmlFor="name" className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
          <span>Nome Completo do Vendedor</span>
          <span className="text-orange-500">*</span>
        </label>
        <div>
          <Input
            data-testid="input-seller-name"
            id="name"
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: João da Silva"
            className="bg-white/5 border-white/10 text-white placeholder:text-zinc-500 focus-visible:ring-orange-500 h-9 text-xs"
            required
          />
        </div>
      </div>

      {/* Email e Telefone em Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* E-mail */}
        <div className="space-y-1.5">
          <label htmlFor="email" className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
            <Mail className="h-3.5 w-3.5 text-zinc-400" />
            <span>E-mail Corporativo</span>
            <span className="text-orange-500">*</span>
          </label>
          <div>
            <Input
              data-testid="input-seller-email"
              id="email"
              name="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="vendedor@concessionaria.com.br"
              className="bg-white/5 border-white/10 text-white placeholder:text-zinc-500 focus-visible:ring-orange-500 h-9 text-xs"
              required
            />
          </div>
        </div>

        {/* Telefone / WhatsApp */}
        <div className="space-y-1.5">
          <label htmlFor="phone" className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
            <Phone className="h-3.5 w-3.5 text-emerald-400" />
            <span>WhatsApp (com DDD)</span>
            <span className="text-orange-500">*</span>
          </label>
          <div>
            <Input
              data-testid="input-seller-phone"
              id="phone"
              name="phone"
              type="tel"
              value={phone}
              onChange={handlePhoneChange}
              placeholder="(11) 98888-8888"
              maxLength={15}
              className="bg-white/5 border-white/10 text-white placeholder:text-zinc-500 focus-visible:ring-orange-500 h-9 text-xs font-mono"
              required
            />
          </div>
        </div>
      </div>

      {/* Papel e Segmento em Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Papel / Função */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
            <Briefcase className="h-3.5 w-3.5 text-zinc-400" />
            <span>Função Comercial</span>
          </label>
          <select
            data-testid="select-seller-role"
            value={role}
            onChange={(e) => setRole(e.target.value as TeamMember["role"])}
            className="w-full h-9 rounded-xl bg-white/5 border border-white/10 px-3 text-xs font-medium text-white focus:outline-none focus:ring-1 focus:ring-orange-500"
          >
            <option value="seller" className="bg-zinc-900 text-white">Vendedor / Consultor</option>
            <option value="sdr" className="bg-zinc-900 text-white">SDR / Pré-vendedor</option>
            <option value="manager" className="bg-zinc-900 text-white">Gerente Comercial</option>
          </select>
        </div>

        {/* Segmento de Veículos */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5 text-zinc-400" />
            <span>Especialidade de Estoque</span>
          </label>
          <select
            data-testid="select-seller-segment"
            value={segment}
            onChange={(e) => setSegment(e.target.value as TeamMember["segment"])}
            className="w-full h-9 rounded-xl bg-white/5 border border-white/10 px-3 text-xs font-medium text-white focus:outline-none focus:ring-1 focus:ring-orange-500"
          >
            <option value="all" className="bg-zinc-900 text-white">Geral (Novos e Usados)</option>
            <option value="new_cars" className="bg-zinc-900 text-white">Veículos Novos (0km)</option>
            <option value="used_cars" className="bg-zinc-900 text-white">Seminovos / Usados</option>
            <option value="f_and_i" className="bg-zinc-900 text-white">Financiamentos & F&I</option>
          </select>
        </div>
      </div>

      {/* Meta Mensal de Unidades */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
          <Target className="h-3.5 w-3.5 text-orange-400" />
          <span>Meta Mensal de Vendas (Unidades/mês)</span>
        </label>
        <Input
          data-testid="input-seller-goal"
          type="number"
          min="1"
          max="200"
          value={monthlyGoal}
          onChange={(e) => setMonthlyGoal(e.target.value)}
          placeholder="10"
          className="bg-white/5 border-white/10 text-white placeholder:text-zinc-500 focus-visible:ring-orange-500 h-9 text-xs"
        />
      </div>

      {/* Switch de Roleta */}
      <div className="rounded-xl border border-orange-500/20 bg-orange-500/5 p-3.5 flex items-center justify-between gap-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-orange-400">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Ativar na Roleta de Leads Imediatamente</span>
          </div>
          <p className="text-[11px] text-zinc-400">
            Quando ativado, este vendedor receberá novas oportunidades do WhatsApp e Webhooks automaticamente.
          </p>
        </div>
        <Switch
          data-testid="switch-in-roulette"
          checked={inRoulette}
          onCheckedChange={setInRoulette}
          className="data-[state=checked]:bg-orange-500"
        />
      </div>

      <DialogFooter className="pt-3 border-t border-white/10 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1 text-[11px] text-zinc-500">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
          <span>Isolamento multi-tenant ativo</span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={isSubmitting}
            className="text-xs h-9 px-3 hover:bg-white/10 text-zinc-400 hover:text-white"
          >
            Cancelar
          </Button>

          <Button
            type="submit"
            disabled={isSubmitting}
            data-testid="btn-save-salesperson"
            className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white text-xs font-bold h-9 px-4 shadow-lg shadow-orange-500/20 gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Salvando...</span>
              </>
            ) : (
              <span>{initialData ? "Atualizar Vendedor" : "Salvar Vendedor"}</span>
            )}
          </Button>

          {/* Botão invisível com testid legado para manter retrocompatibilidade */}
          <button
            type="submit"
            data-testid="btn-submit-salesperson"
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
          >
            Salvar
          </button>
        </div>
      </DialogFooter>
    </form>
  );
}

export function SalespersonModal({
  isOpen,
  onClose,
  onSuccess,
  initialData,
}: SalespersonModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg bg-[#121216] border border-white/10 text-white shadow-2xl p-6">
        <DialogHeader className="space-y-2 pb-2 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center text-white shadow-md shadow-orange-500/20">
              <UserPlus className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-white tracking-tight">
                {initialData ? "Editar Vendedor / Membro" : "Cadastrar Vendedor / Membro da Equipe"}
              </DialogTitle>
              <DialogDescription className="text-xs text-zinc-400">
                Configure os dados de contato, permissões e presença no rodízio da Roleta.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {isOpen && (
          <SalespersonFormInner
            key={initialData?.id || "new-form"}
            initialData={initialData}
            onClose={onClose}
            onSuccess={onSuccess}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
