/**
 * @file create-api-key-modal.tsx
 * @description Modal acessível para criação de nova Chave de API de integração.
 */

"use client";

import React, { useState } from "react";
import { Key, X, Sparkles, Loader2, ShieldCheck, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface CreateApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: { name: string; expires_in_days?: number | null }) => Promise<boolean>;
}

export function CreateApiKeyModal({
  isOpen,
  onClose,
  onSubmit,
}: CreateApiKeyModalProps) {
  const [name, setName] = useState("");
  const [expiresInDays, setExpiresInDays] = useState<string>("never");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || name.trim().length < 3) {
      setErrorMsg("O nome da chave deve ter no mínimo 3 caracteres.");
      return;
    }

    setErrorMsg(null);
    setIsSubmitting(true);

    const days = expiresInDays === "never" ? null : Number(expiresInDays);
    const success = await onSubmit({
      name: name.trim(),
      expires_in_days: days,
    });

    setIsSubmitting(false);
    if (success) {
      setName("");
      setExpiresInDays("never");
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-md rounded-3xl bg-zinc-950 border border-white/10 p-6 shadow-2xl space-y-5">
        {/* Botão de Fechar */}
        <button
          onClick={onClose}
          disabled={isSubmitting}
          className="absolute right-5 top-5 rounded-full p-1 text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Cabeçalho do Modal */}
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-bold text-orange-400 uppercase tracking-wider">
            <Key className="h-4 w-4" />
            <span>Segurança & Acesso</span>
          </div>
          <h2 className="text-xl font-black text-white tracking-tight">
            Criar Nova Chave de API
          </h2>
          <p className="text-xs text-zinc-400">
            Dê um nome identificador para a aplicação ou campanha externa que consumirá o endpoint.
          </p>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {errorMsg && (
            <div className="flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-xs text-red-400">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-200">
              Nome da Chave / Identificador
            </label>
            <Input
              data-testid="input-key-name"
              placeholder="Ex: Meta Ads Campanha São Paulo 2026"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isSubmitting}
              autoFocus
              className="h-10 bg-white/5 border-white/10 text-white placeholder:text-zinc-500 text-xs rounded-xl focus-visible:ring-orange-500"
            />
            <p className="text-[11px] text-zinc-500">
              Recomendamos usar o nome da plataforma e objetivo da campanha.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-200">
              Prazo de Validade / Expiração
            </label>
            <select
              value={expiresInDays}
              onChange={(e) => setExpiresInDays(e.target.value)}
              disabled={isSubmitting}
              className="w-full h-10 rounded-xl bg-zinc-900 border border-white/10 px-3 text-xs font-medium text-white focus:outline-none focus:ring-1 focus:ring-orange-500"
            >
              <option value="never">Sem Expiração (Recomendado)</option>
              <option value="30">Expira em 30 dias</option>
              <option value="90">Expira em 90 dias</option>
              <option value="365">Expira em 1 ano (365 dias)</option>
            </select>
          </div>

          <div className="rounded-xl bg-orange-500/5 border border-orange-500/20 p-3 flex items-start gap-2.5 text-xs text-orange-300">
            <ShieldCheck className="h-4 w-4 shrink-0 text-orange-400 mt-0.5" />
            <p className="text-[11px] leading-relaxed">
              A chave bruta é gerada criptograficamente e só poderá ser visualizada <strong>uma única vez</strong>.
            </p>
          </div>

          {/* Botões de Ação */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10 hover:text-white rounded-xl text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              data-testid="btn-create-api-key"
              disabled={isSubmitting}
              className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-bold rounded-xl text-xs shadow-lg shadow-orange-500/20"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                  <span>Gerando Chave...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                  <span>Gerar Chave de API</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
