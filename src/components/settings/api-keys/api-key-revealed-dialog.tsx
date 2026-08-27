/**
 * @file api-key-revealed-dialog.tsx
 * @description Diálogo de revelação única da Chave de API recém-gerada.
 */

"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  Copy,
  Check,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ApiKeyRevealedDialogProps {
  isOpen: boolean;
  onClose: () => void;
  rawKey: string;
  keyName: string;
}

export function ApiKeyRevealedDialog({
  isOpen,
  onClose,
  rawKey,
  keyName,
}: ApiKeyRevealedDialogProps) {
  const [hasCopied, setHasCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(rawKey).catch(() => {});
    }
    setHasCopied(true);
    toast.success("Chave de API copiada com sucesso!", {
      description: "Guarde-a em um gerenciador de segredos seguro.",
    });
    setTimeout(() => setHasCopied(false), 3000);
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-lg rounded-3xl bg-zinc-950 border border-orange-500/30 p-6 shadow-2xl space-y-6">
        {/* Cabeçalho de Sucesso */}
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shadow-md">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white tracking-tight">
              Chave de API Criada com Sucesso!
            </h2>
            <p className="text-xs text-zinc-400 mt-1">
              Identificador: <span className="font-semibold text-zinc-200">{keyName}</span>
            </p>
          </div>
        </div>

        {/* Alerta Crítico de Revelação Única */}
        <div className="rounded-2xl bg-amber-500/10 border border-amber-500/30 p-4 space-y-1.5 text-amber-300">
          <div className="flex items-center gap-2 font-bold text-xs">
            <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
            <span>Copie sua chave agora</span>
          </div>
          <p className="text-[11px] text-amber-200/90 leading-relaxed">
            Por questões rigorosas de segurança, nós armazenamos apenas o hash criptográfico SHA-256 no banco de dados.
            <strong> Esta chave nunca mais será exibida ou recuperada.</strong>
          </p>
        </div>

        {/* Campo com a Chave Bruta e Ação de Cópia */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-zinc-300">
            Sua Chave de API Secreta
          </label>
          <div className="flex items-center gap-2">
            <Input
              data-testid="input-revealed-api-key"
              readOnly
              value={rawKey}
              className="h-11 font-mono text-xs bg-zinc-900 border-white/10 text-orange-400 select-all font-semibold rounded-xl"
            />
            <Button
              type="button"
              onClick={handleCopy}
              data-testid="btn-copy-api-key"
              className="h-11 shrink-0 bg-white/10 hover:bg-white/20 text-white rounded-xl px-4 text-xs font-bold transition-all border border-white/10"
            >
              {hasCopied ? (
                <>
                  <Check className="h-4 w-4 text-emerald-400 mr-1.5" />
                  <span className="text-emerald-400">Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-1.5" />
                  <span>Copiar</span>
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Rodapé e Fechamento */}
        <div className="pt-2 flex justify-end">
          <Button
            type="button"
            onClick={onClose}
            data-testid="btn-close-revealed-dialog"
            className="w-full sm:w-auto bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-bold rounded-xl text-xs px-6 py-2.5 shadow-lg shadow-orange-500/20"
          >
            Já Guardei Minha Chave
          </Button>
        </div>
      </div>
    </div>
  );
}
