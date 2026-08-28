/**
 * @file team-members-list.tsx
 * @description Lista e gerenciamento visual de colaboradores com diálogo de confirmação AlertDialog.
 */

"use client";

import React, { useState, useTransition } from "react";
import { Trash2, Loader2, Mail, Phone, ShieldCheck, UserCheck } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { removeTeamMemberAction } from "@/app/actions/team-actions";
import type { TeamMember } from "@/types/team";

export interface TeamMembersListProps {
  members: TeamMember[];
  onMemberDeleted?: (memberId: string) => void;
}

export function TeamMembersList({ members, onMemberDeleted }: TeamMembersListProps) {
  const [isPending, startTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleRemoveMember = async (memberId: string, memberEmail?: string, memberName?: string) => {
    setDeletingId(memberId);
    startTransition(async () => {
      try {
        const res = await removeTeamMemberAction(memberId, memberEmail);
        if (res.success) {
          toast.success(res.message || `${memberName || "Colaborador"} foi removido com sucesso.`);
          onMemberDeleted?.(memberId);
        } else {
          toast.error(res.error || "Erro ao remover colaborador do servidor.");
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Erro ao remover colaborador.";
        toast.error(msg);
      } finally {
        setDeletingId(null);
      }
    });
  };

  if (members.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 bg-[#121216] p-8 text-center text-zinc-400 text-xs">
        Nenhum colaborador cadastrado.
      </div>
    );
  }

  return (
    <div className="space-y-3" data-testid="team-members-list">
      {members.map((member) => {
        const isOwner =
          (member.role as string) === "admin" ||
          (member.role as string) === "owner" ||
          Boolean((member as { isOwner?: boolean }).isOwner);
        const isCurrentlyDeleting = isPending && deletingId === member.id;

        return (
          <div
            key={member.id}
            className="flex items-center justify-between p-4 rounded-xl border border-white/10 bg-[#121216] text-white"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm">{member.name || member.email}</span>
                {isOwner && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20 px-2 py-0.5 text-[10px] font-bold">
                    <ShieldCheck className="h-3 w-3" />
                    Proprietário
                  </span>
                )}
                {member.status === "active" && !isOwner && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold">
                    <UserCheck className="h-3 w-3" />
                    Ativo
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4 text-xs text-zinc-400">
                <span className="flex items-center gap-1">
                  <Mail className="h-3.5 w-3.5 text-zinc-500" />
                  {member.email}
                </span>
                {member.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5 text-zinc-500" />
                    {member.phone}
                  </span>
                )}
              </div>
            </div>

            <div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={isCurrentlyDeleting || isOwner}
                    className="text-red-500 hover:text-red-400 hover:bg-red-500/10 h-8 px-3 text-xs"
                    data-testid={`btn-remove-member-${member.id}`}
                  >
                    {isCurrentlyDeleting ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-1" />
                    ) : (
                      <Trash2 className="w-4 h-4 mr-1" />
                    )}
                    Remover
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Remover Colaborador?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Tem certeza que deseja remover <strong>{member.name || member.email}</strong> da concessionária? 
                      O colaborador perderá o acesso imediato ao CRM e à roleta de distribuição de leads.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => handleRemoveMember(member.id, member.email, member.name)}
                      className="bg-red-600 hover:bg-red-700 text-white"
                    >
                      {isCurrentlyDeleting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                      Sim, Remover Colaborador
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        );
      })}
    </div>
  );
}
