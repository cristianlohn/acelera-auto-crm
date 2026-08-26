/**
 * @file page.tsx
 * @description Página de Redefinição de Senha (ResetPasswordPage).
 *
 * Funcionalidades:
 * - Formulário para definição de Nova Senha e Confirmação de Senha.
 * - Alternância independente de visibilidade de senha com ícones Eye / EyeOff.
 * - Validação client-side e server-side de integridade e tamanho mínimo (>= 6 caracteres).
 * - Integração com Supabase Auth via Server Action `updateUserPassword`.
 * - Redirecionamento para `/login?password_updated=true` após sucesso.
 */

"use client";

import React, { useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateUserPassword } from "@/app/actions/auth";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!password || password.length < 6) {
      setErrorMessage("A nova senha deve conter no mínimo 6 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("As senhas não coincidem. Digite a mesma senha em ambos os campos.");
      return;
    }

    startTransition(async () => {
      try {
        const result = await updateUserPassword(password);

        if (!result.success) {
          setErrorMessage(result.error || "Não foi possível atualizar a senha. Tente novamente.");
          return;
        }

        setSuccessMessage("Senha alterada com sucesso! Redirecionando para o login...");
        setTimeout(() => {
          router.push("/login?password_updated=true");
        }, 1500);
      } catch {
        setErrorMessage("Ocorreu um erro ao atualizar a senha. Tente novamente mais tarde.");
      }
    });
  };

  return (
    <div className="flex min-h-screen w-full max-w-full overflow-x-hidden bg-[#09090b] text-[#f4f4f5]">
      {/* Painel Esquerdo: Vitrine Institucional (Desktop) */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between border-r border-white/10 bg-gradient-to-br from-[#121218] via-[#0e0e14] to-[#09090b] p-12 relative overflow-hidden">
        <div
          className="pointer-events-none absolute top-0 left-0 h-96 w-96 rounded-full bg-orange-500/10 blur-3xl"
          aria-hidden="true"
        />

        <Link href="/" className="inline-block relative z-10">
          <Image
            src="/logo.png"
            alt="Acelera Auto CRM"
            width={200}
            height={52}
            className="h-10 md:h-12 w-auto object-contain"
            priority
          />
        </Link>

        <div className="relative z-10 space-y-6 max-w-lg">
          <div className="inline-flex items-center gap-2 rounded-full border border-orange-500/30 bg-orange-500/10 px-3 py-1 text-xs font-semibold text-orange-400">
            <ShieldCheck className="h-4 w-4" />
            <span>Segurança da Conta</span>
          </div>

          <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl leading-tight">
            Defina uma nova senha forte para proteger seus leads e estoque.
          </h2>

          <p className="text-sm text-zinc-400 leading-relaxed">
            Recomendamos utilizar uma combinação de letras maiúsculas, minúsculas, números e caracteres especiais.
          </p>
        </div>

        <div className="relative z-10 text-xs text-zinc-500">
          © {new Date().getFullYear()} Acelera Auto CRM. Todos os direitos reservados.
        </div>
      </div>

      {/* Painel Direito: Formulário */}
      <div className="flex flex-1 flex-col justify-center px-4 py-12 sm:px-6 lg:px-16 xl:px-24">
        <div className="mx-auto w-full max-w-sm space-y-6">
          <div className="flex items-center justify-between lg:hidden">
            <Link href="/" className="inline-block">
              <Image
                src="/logo.png"
                alt="Acelera Auto CRM"
                width={160}
                height={40}
                className="h-9 w-auto object-contain"
                priority
              />
            </Link>
          </div>

          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Criar Nova Senha
            </h1>
            <p className="mt-1.5 text-xs text-zinc-400">
              Digite e confirme sua nova senha de acesso ao CRM.
            </p>
          </div>

          {/* Feedback de Sucesso */}
          {successMessage && (
            <div
              role="status"
              className="flex items-center gap-2.5 rounded-xl border border-emerald-500/40 bg-emerald-950/40 p-3.5 text-xs text-emerald-300 shadow-lg shadow-emerald-950/30 animate-in fade-in"
            >
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Feedback de Erro */}
          {errorMessage && (
            <div
              role="alert"
              className="flex items-center gap-2.5 rounded-xl border border-red-500/30 bg-red-950/40 p-3.5 text-xs text-red-300 animate-in fade-in"
            >
              <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form id="form-reset-password" onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* Campo Nova Senha */}
            <div className="space-y-1.5">
              <label
                htmlFor="reset-new-password"
                className="flex items-center gap-1.5 text-xs font-medium text-zinc-300"
              >
                <Lock className="h-3.5 w-3.5 text-zinc-400" />
                Nova Senha
              </label>
              <div className="relative">
                <Input
                  id="reset-new-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Mínimo de 6 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-white/5 border-white/10 text-white placeholder:text-zinc-400 text-xs h-9 pr-10"
                  required
                />
                <button
                  type="button"
                  id="btn-toggle-reset-password"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Ocultar senha" : "Exibir senha"}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200 transition-colors p-0.5 rounded"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-orange-400" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Campo Confirmar Nova Senha */}
            <div className="space-y-1.5">
              <label
                htmlFor="reset-confirm-password"
                className="flex items-center gap-1.5 text-xs font-medium text-zinc-300"
              >
                <Lock className="h-3.5 w-3.5 text-zinc-400" />
                Confirmar Nova Senha
              </label>
              <div className="relative">
                <Input
                  id="reset-confirm-password"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Repita a nova senha"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="bg-white/5 border-white/10 text-white placeholder:text-zinc-400 text-xs h-9 pr-10"
                  required
                />
                <button
                  type="button"
                  id="btn-toggle-reset-confirm-password"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label={
                    showConfirmPassword
                      ? "Ocultar confirmação de senha"
                      : "Exibir confirmação de senha"
                  }
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200 transition-colors p-0.5 rounded"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4 text-orange-400" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <Button
              id="btn-submit-reset-password"
              type="submit"
              disabled={isPending}
              className="w-full bg-gradient-to-r from-orange-500 via-orange-600 to-red-600 text-white font-bold text-xs sm:text-sm h-9 mt-2 hover:from-orange-600 hover:to-red-700 shadow-md shadow-orange-500/20 transition-all"
            >
              <span>{isPending ? "Atualizando senha..." : "Salvar Nova Senha"}</span>
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </form>

          <div className="text-center pt-2">
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors"
            >
              <span>Lembrou da senha? Ir para o Login</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
