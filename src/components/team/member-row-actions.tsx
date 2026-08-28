/**
 * @file member-row-actions.tsx
 * @description Componente de ações de linha de equipe (Reenviar Convite / Remover com confirmação AlertDialog).
 */

"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Trash2, Loader2, Send, Check } from "lucide-react";
import { removeTeamMember, resendInviteEmailAction } from "@/app/actions/team";

export interface MemberRowActionsProps {
  member: {
    id: string;
    email: string;
    name?: string;
    fullName?: string;
    role?: string;
    isOwner?: boolean;
  };
  onDeleted?: (memberId: string) => void;
}

export function MemberRowActions({ member, onDeleted }: MemberRowActionsProps) {
  let router: ReturnType<typeof useRouter> | null = null;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    router = useRouter();
  } catch {
    // Graceful fallback para testes de integração onde AppRouterContext não está montado
  }

  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [isResending, setIsResending] = useState(false);
  const [copiedRecently, setCopiedRecently] = useState(false);

  const isOwner =
    member.role === "admin" ||
    member.role === "owner" ||
    Boolean(member.isOwner);

  const handleConfirmDelete = () => {
    startTransition(async () => {
      const result = await removeTeamMember(member.id, member.email);

      if (result && result.success) {
        toast.success(result.message || "Colaborador removido com sucesso!");
        setOpen(false);
        onDeleted?.(member.id);
        if (router) {
          router.refresh();
        }
      } else {
        toast.error(result?.error || "Erro ao remover colaborador.");
      }
    });
  };

  const handleResendInvite = async () => {
    if (!member.email || isResending) return;

    setIsResending(true);
    try {
      const result = await resendInviteEmailAction(
        member.email,
        member.name || member.fullName,
        member.role
      );

      if (result.success) {
        if (result.fallbackInviteLink && typeof navigator !== "undefined" && navigator.clipboard) {
          try {
            await navigator.clipboard.writeText(result.fallbackInviteLink);
            setCopiedRecently(true);
            setTimeout(() => setCopiedRecently(false), 3000);
            toast.success("E-mail reenviado e link copiado para a área de transferência!");
            return;
          } catch {}
        }
        toast.success("Novo e-mail de convite enviado com sucesso para o colaborador!");
      } else {
        toast.error(result.error || "Não foi possível reenviar o convite.");
      }
    } catch {
      toast.error("Erro ao processar o reenvio do convite.");
    } finally {
      setIsResending(false);
    }
  };

  if (isOwner) {
    return (
      <Button
        id={`btn-remove-${member.id}`}
        data-testid={`btn-remove-member-${member.id}`}
        type="button"
        size="sm"
        variant="ghost"
        disabled
        className="text-xs h-7 gap-1 text-muted-foreground/40 cursor-not-allowed"
        title="O proprietário admin não pode ser removido"
      >
        <Trash2 className="h-3.5 w-3.5" />
        <span>Remover</span>
      </Button>
    );
  }

  const displayName = member.name || member.fullName || member.email;

  return (
    <div className="flex items-center gap-1.5">
      {/* Botão Reenviar Convite */}
      <Button
        id={`btn-resend-${member.id}`}
        data-testid={`btn-resend-member-${member.id}`}
        type="button"
        size="sm"
        variant="outline"
        disabled={isResending || isPending}
        onClick={handleResendInvite}
        className="h-7 px-2.5 text-xs gap-1.5 text-orange-400 border-orange-500/30 hover:bg-orange-500/10 hover:text-orange-300 hover:border-orange-500/50 transition-colors"
        title="Reenviar e-mail de acesso e copiar link"
      >
        {isResending ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin text-orange-400" />
        ) : copiedRecently ? (
          <Check className="w-3.5 h-3.5 text-emerald-400" />
        ) : (
          <Send className="w-3.5 h-3.5" />
        )}
        <span>{copiedRecently ? "Link Copiado!" : "Reenviar Acesso"}</span>
      </Button>

      {/* Botão Remover */}
      <Button
        id={`btn-remove-${member.id}`}
        data-testid={`btn-remove-member-${member.id}`}
        type="button"
        size="sm"
        variant="ghost"
        disabled={isPending || isResending}
        onClick={() => setOpen(true)}
        className="text-red-500 hover:text-red-400 hover:bg-red-500/10 h-7 text-xs gap-1 cursor-pointer"
        title="Remover colaborador"
      >
        {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
        <span>Remover</span>
      </Button>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Colaborador?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover <strong className="text-white">{displayName}</strong> da equipe? 
              Ele perderá o acesso ao painel e à distribuição de leads desta concessionária.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault(); // Evita fechamento automático antes de concluir a action
                handleConfirmDelete();
              }}
              disabled={isPending}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Sim, Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
