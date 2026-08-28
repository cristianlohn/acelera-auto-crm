/**
 * @file team-table.tsx
 * @description Tabela rica e responsiva para gestão da equipe, controle otimista da roleta e metas.
 */

"use client";

import React, { useState, useTransition } from "react";
import {
  Search,
  Sparkles,
  Phone,
  Mail,
  UserX,
  MoreVertical,
  Edit2,
  Trash2,
  Filter,
  Send,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { TeamMember, TeamSegment } from "@/types/team";
import {
  toggleRouletteStatusAction,
  deleteSalespersonAction,
  resendInviteEmailAction,
} from "@/app/actions/team-actions";

export interface TeamTableProps {
  members: TeamMember[];
  onEditMember?: (member: TeamMember) => void;
  onMemberDeleted?: (memberId: string) => void;
}

export function TeamTable({
  members,
  onEditMember,
  onMemberDeleted,
}: TeamTableProps) {
  const [localOverrides, setLocalOverrides] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [segmentFilter, setSegmentFilter] = useState<TeamSegment | "all">("all");
  const [, startTransition] = useTransition();

  // Aplica overrides otimistas
  const activeMembers = members.map((m) =>
    localOverrides[m.id] !== undefined ? { ...m, in_roulette: localOverrides[m.id] } : m
  );

  // Filtro de busca e segmento
  const filteredMembers = activeMembers.filter((member) => {
    const matchesSearch =
      member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.phone.includes(searchQuery);

    const matchesSegment =
      segmentFilter === "all" || member.segment === segmentFilter;

    return matchesSearch && matchesSegment;
  });

  // Toggle Otimista da Roleta
  const handleToggleRoulette = (memberId: string, currentInRoulette: boolean) => {
    const newInRoulette = !currentInRoulette;

    // Atualização otimista imediata na UI
    setLocalOverrides((prev) => ({ ...prev, [memberId]: newInRoulette }));

    const targetMember = members.find((m) => m.id === memberId);
    const memberName = targetMember?.name || "Vendedor";

    toast.success(
      newInRoulette
        ? `${memberName} entrou no plantão da Roleta de Leads.`
        : `${memberName} foi pausado da Roleta de Leads.`
    );

    // Disparo assíncrono da Server Action
    startTransition(async () => {
      try {
        const result = await toggleRouletteStatusAction(memberId, newInRoulette);
        if (!result.success) {
          // Rollback em caso de erro
          setLocalOverrides((prev) => ({ ...prev, [memberId]: currentInRoulette }));
          toast.error("Não foi possível atualizar o status na roleta.");
        }
      } catch {
        setLocalOverrides((prev) => ({ ...prev, [memberId]: currentInRoulette }));
        toast.error("Erro ao sincronizar status da roleta.");
      }
    });
  };

  // Reenvio de e-mail de convite
  const handleResendInvite = async (email: string, name: string, role?: string) => {
    toast.loading(`Reenviando e-mail de convite para ${email}...`, { id: `resend-${email}` });
    try {
      const res = await resendInviteEmailAction(email, name, role);
      if (res.success && res.emailSent) {
        toast.success(`E-mail de convite reenviado com sucesso para ${email}!`, {
          id: `resend-${email}`,
          description: "O vendedor já pode acessar sua caixa de entrada para criar a senha.",
        });
      } else if (res.success) {
        toast.success(`Convite gerado com sucesso para ${email}!`, {
          id: `resend-${email}`,
        });
      } else {
        toast.error(`Falha ao reenviar e-mail: ${res.error || "Erro desconhecido"}`, {
          id: `resend-${email}`,
        });
      }
    } catch {
      toast.error("Erro ao comunicar com o servidor.", { id: `resend-${email}` });
    }
  };

  // Exclusão de membro
  const handleDelete = async (memberId: string, memberName: string) => {
    if (!confirm(`Deseja realmente remover o vendedor ${memberName}?`)) return;

    toast.success(`${memberName} foi removido com sucesso.`);
    onMemberDeleted?.(memberId);

    try {
      await deleteSalespersonAction(memberId);
    } catch {
      toast.error("Erro ao remover vendedor do servidor.");
    }
  };

  return (
    <div
      data-testid="team-table"
      className="rounded-2xl border border-white/10 bg-[#121216] p-4 sm:p-6 shadow-xl space-y-4"
    >
      {/* Barra de Filtros e Busca */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nome, e-mail ou WhatsApp..."
            className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-zinc-500 h-9 text-xs focus-visible:ring-orange-500"
          />
        </div>

        {/* Filtro por Segmento */}
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-zinc-400 shrink-0 hidden sm:inline-block" />
          <select
            value={segmentFilter}
            onChange={(e) => setSegmentFilter(e.target.value as TeamSegment | "all")}
            className="h-9 rounded-xl bg-white/5 border border-white/10 px-3 text-xs font-semibold text-white focus:outline-none focus:ring-1 focus:ring-orange-500"
          >
            <option value="all" className="bg-zinc-900 text-white">Todos os Segmentos</option>
            <option value="new_cars" className="bg-zinc-900 text-white">Veículos Novos (0km)</option>
            <option value="used_cars" className="bg-zinc-900 text-white">Seminovos</option>
            <option value="f_and_i" className="bg-zinc-900 text-white">Financiamento & F&I</option>
          </select>
        </div>
      </div>

      {/* Tabela de Vendedores */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-zinc-300">
          <thead>
            <tr className="border-b border-white/10 text-zinc-400 font-semibold uppercase tracking-wider">
              <th className="py-3 px-3">Vendedor</th>
              <th className="py-3 px-3">Segmento / Papel</th>
              <th className="py-3 px-3">Plantão Roleta</th>
              <th className="py-3 px-3">Meta Individual</th>
              <th className="py-3 px-3">SLA Médio</th>
              <th className="py-3 px-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filteredMembers.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-zinc-500">
                  Nenhum vendedor encontrado com os filtros aplicados.
                </td>
              </tr>
            ) : (
              filteredMembers.map((member) => {
                const goalPercent =
                  member.monthly_goal_units > 0
                    ? Math.min(
                        100,
                        Math.round((member.current_sales_units / member.monthly_goal_units) * 100)
                      )
                    : 0;

                const slaBadgeColor =
                  member.avg_sla_minutes <= 5
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                    : member.avg_sla_minutes <= 15
                    ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                    : "bg-red-500/10 border-red-500/30 text-red-400";

                return (
                  <tr key={member.id} className="hover:bg-white/[0.02] transition-colors">
                    {/* Vendedor info */}
                    <td className="py-3.5 px-3">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-orange-500 to-red-600 text-xs font-bold text-white flex items-center justify-center shrink-0 shadow">
                          {member.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-white flex items-center gap-2">
                            <span>{member.name}</span>
                            {member.status === "active" ? (
                              <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-semibold">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                                <span>Ativo</span>
                              </span>
                            ) : member.status === "pending" ? (
                              <span className="inline-flex items-center gap-1 text-[10px] bg-amber-500/15 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full font-semibold">
                                <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                                <span>Pendente (Aguardando Aceite)</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] bg-zinc-500/15 text-zinc-400 border border-zinc-500/30 px-2 py-0.5 rounded-full font-semibold">
                                <UserX className="h-2.5 w-2.5" />
                                <span>Pausado</span>
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-zinc-400 mt-0.5">
                            <span className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {member.email}
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1 font-mono">
                              <Phone className="h-3 w-3" />
                              {member.phone}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Segmento & Papel */}
                    <td className="py-3.5 px-3">
                      <div className="space-y-1">
                        <span className="inline-block rounded-md bg-white/5 border border-white/10 px-2 py-0.5 text-[10px] font-semibold text-zinc-300">
                          {member.segment === "new_cars"
                            ? "0km / Novos"
                            : member.segment === "used_cars"
                            ? "Seminovos"
                            : member.segment === "f_and_i"
                            ? "F&I / Financiamento"
                            : "Geral (Todos)"}
                        </span>
                        <div className="text-[10px] text-zinc-500 capitalize">
                          {member.role === "manager" ? "Gerente" : member.role === "sdr" ? "SDR / Pré-venda" : "Vendedor"}
                        </div>
                      </div>
                    </td>

                    {/* Toggle Otimista Roleta */}
                    <td className="py-3.5 px-3">
                      <div className="flex items-center gap-2.5">
                        <Switch
                          data-testid="toggle-roulette-status"
                          checked={member.in_roulette}
                          onCheckedChange={() => handleToggleRoulette(member.id, member.in_roulette)}
                          className="data-[state=checked]:bg-orange-500"
                        />
                        <span
                          className={cn(
                            "text-[11px] font-bold flex items-center gap-1",
                            member.in_roulette ? "text-orange-400" : "text-zinc-500"
                          )}
                        >
                          {member.in_roulette ? (
                            <>
                              <Sparkles className="h-3 w-3" />
                              <span>No Plantão</span>
                            </>
                          ) : (
                            <span>Pausado</span>
                          )}
                        </span>
                      </div>
                    </td>

                    {/* Meta Individual */}
                    <td className="py-3.5 px-3 min-w-[140px]">
                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px]">
                          <span className="font-bold text-white">
                            {member.current_sales_units} / {member.monthly_goal_units} un
                          </span>
                          <span className="text-zinc-400 font-semibold">{goalPercent}%</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all",
                              goalPercent >= 100
                                ? "bg-emerald-500"
                                : goalPercent >= 50
                                ? "bg-orange-500"
                                : "bg-zinc-500"
                            )}
                            style={{ width: `${goalPercent}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* SLA Médio */}
                    <td className="py-3.5 px-3">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold border",
                          slaBadgeColor
                        )}
                      >
                        <span
                          className={cn(
                            "h-1.5 w-1.5 rounded-full",
                            member.avg_sla_minutes <= 5
                              ? "bg-emerald-500"
                              : member.avg_sla_minutes <= 15
                              ? "bg-amber-500"
                              : "bg-red-500 animate-pulse"
                          )}
                        />
                        {member.avg_sla_minutes > 0
                          ? `${member.avg_sla_minutes} min`
                          : "Aguardando"}
                      </span>
                    </td>

                    {/* Ações */}
                    <td className="py-3.5 px-3 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon-sm" className="h-7 w-7 text-zinc-400 hover:text-white">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-[#18181b] border-white/10 text-xs">
                          <DropdownMenuItem
                            data-testid={`btn-resend-invite-${member.id}`}
                            onClick={() => handleResendInvite(member.email, member.name, member.role)}
                            className="cursor-pointer hover:bg-white/10 gap-2 text-orange-400 hover:text-orange-300"
                          >
                            <Send className="h-3.5 w-3.5" />
                            <span>Reenviar E-mail de Convite</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => onEditMember?.(member)}
                            className="cursor-pointer hover:bg-white/10 gap-2"
                          >
                            <Edit2 className="h-3.5 w-3.5 text-zinc-400" />
                            <span>Editar Vendedor</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(member.id, member.name)}
                            className="cursor-pointer text-red-400 hover:bg-red-500/10 hover:text-red-300 gap-2"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span>Remover da Equipe</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
