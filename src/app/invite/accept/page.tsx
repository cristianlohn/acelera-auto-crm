/**
 * @file page.tsx
 * @description Página de Confirmação e Aceite de Convite de Equipe / Organização (/invite/accept).
 */

"use client";

import React, { useState, useTransition, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  CheckCircle2,
  AlertCircle,
  Building2,
  ShieldCheck,
  ArrowRight,
  Loader2,
  Sparkles,
  UserCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { acceptInviteAction } from "@/app/actions/team-actions";
import { toast } from "sonner";

function InviteAcceptContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">(() =>
    token ? "idle" : "error"
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(() =>
    token ? null : "Token de convite não encontrado na URL."
  );
  const [storeName, setStoreName] = useState<string>("Concessionária");

  const handleAcceptInvite = () => {
    if (!token) return;

    setStatus("loading");
    startTransition(async () => {
      try {
        const result = await acceptInviteAction(token);
        if (result.success) {
          setStatus("success");
          if (result.storeName) {
            setStoreName(result.storeName);
          }
          toast.success("Convite aceito com sucesso! Bem-vindo à equipe.");
          setTimeout(() => {
            router.push("/leads");
          }, 2000);
        } else {
          setStatus("error");
          setErrorMessage(result.error || "Falha ao aceitar o convite.");
          toast.error(result.error || "Erro ao processar o convite.");
        }
      } catch (err: unknown) {
        setStatus("error");
        const msg = err instanceof Error ? err.message : "Erro inesperado ao aceitar o convite.";
        setErrorMessage(msg);
        toast.error(msg);
      }
    });
  };

  return (
    <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#121216]/90 p-6 sm:p-8 backdrop-blur-xl shadow-2xl space-y-6">
      {/* Header com Logo */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-400 text-xs font-bold">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Convite de Equipe Comercial</span>
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight text-white">
          Acelera Auto CRM
        </h1>
        <p className="text-xs text-zinc-400">
          Você foi convidado para ingressar em uma concessionária parceira.
        </p>
      </div>

      {/* Card de Conteúdo do Status */}
      {status === "idle" && (
        <div className="space-y-6">
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-center space-y-3">
            <Building2 className="h-10 w-10 text-orange-500 mx-auto" />
            <div>
              <p className="text-xs text-zinc-400">Convite para fazer parte da equipe</p>
              <h3 className="text-base font-bold text-white mt-0.5">
                Aceitar Vínculo de Vendedor
              </h3>
            </div>
            <p className="text-xs text-zinc-300 leading-relaxed">
              Ao aceitar o convite, seu perfil terá acesso aos leads, funil comercial e estoque desta concessionária.
            </p>
          </div>

          <Button
            onClick={handleAcceptInvite}
            disabled={isPending || !token}
            className="w-full h-11 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-bold text-sm shadow-lg shadow-orange-500/25 transition-all"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                <span>Confirmando Vínculo...</span>
              </>
            ) : (
              <>
                <UserCheck className="h-4 w-4 mr-2" />
                <span>Aceitar Convite e Entrar</span>
              </>
            )}
          </Button>
        </div>
      )}

      {status === "loading" && (
        <div className="py-8 text-center space-y-3">
          <Loader2 className="h-10 w-10 text-orange-500 animate-spin mx-auto" />
          <h3 className="text-sm font-bold text-white">Processando seu convite...</h3>
          <p className="text-xs text-zinc-400">Vinculando seu perfil à organização.</p>
        </div>
      )}

      {status === "success" && (
        <div className="py-4 text-center space-y-4">
          <div className="h-12 w-12 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Convite Aceito com Sucesso!</h3>
            <p className="text-xs text-zinc-300 mt-1">
              Você agora faz parte da equipe de <strong>{storeName}</strong>. Redirecionando para o CRM...
            </p>
          </div>
          <Button
            asChild
            className="w-full h-10 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
          >
            <Link href="/leads">
              <span>Ir para o Funil de Leads</span>
              <ArrowRight className="h-4 w-4 ml-1.5" />
            </Link>
          </Button>
        </div>
      )}

      {status === "error" && (
        <div className="py-4 text-center space-y-4">
          <div className="h-12 w-12 rounded-full bg-red-500/20 border border-red-500/40 text-red-400 flex items-center justify-center mx-auto shadow-lg shadow-red-500/20">
            <AlertCircle className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Não foi possível aceitar o convite</h3>
            <p className="text-xs text-red-300 mt-1">{errorMessage}</p>
          </div>
          <div className="space-y-2 pt-2">
            <Button
              asChild
              variant="outline"
              className="w-full h-10 border-white/10 bg-white/5 hover:bg-white/10 text-white text-xs"
            >
              <Link href="/login">Ir para a Página de Login</Link>
            </Button>
          </div>
        </div>
      )}

      {/* Footer Segurança */}
      <div className="border-t border-white/5 pt-4 flex items-center justify-center gap-1.5 text-[11px] text-zinc-500">
        <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
        <span>Conexão Segura & Isolamento Multi-Tenant</span>
      </div>
    </div>
  );
}

export default function InviteAcceptPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0c] text-white flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background glow visual */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
      <Suspense
        fallback={
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <Loader2 className="h-4 w-4 animate-spin text-orange-500" />
            <span>Carregando convite...</span>
          </div>
        }
      >
        <InviteAcceptContent />
      </Suspense>
    </div>
  );
}
