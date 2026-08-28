/**
 * @file page.tsx
 * @description Tela de Primeiro Acesso e Definição de Senha (/auth/update-password).
 *
 * Permite que novos vendedores convidados definam sua senha segura após validação
 * do link de convite PKCE/OTP, redirecionando-os diretamente para a esteira de vendas (/leads).
 */

"use client";

import React, { useState, useEffect, useTransition, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Loader2,
  ShieldCheck,
  Sparkles,
  Mail,
} from "lucide-react";
import { toast } from "sonner";
import { BrandLogo } from "@/components/ui/brand-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateUserPassword } from "@/app/actions/auth";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

function UpdatePasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const verified = searchParams.get("verified") === "true";
  const urlEmail = searchParams.get("email") || "";

  const [email, setEmail] = useState(urlEmail);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Sincroniza sessão local com o browser caso tenha vindo por PKCE / Hash / OTP
  useEffect(() => {
    if (typeof window !== "undefined" && isSupabaseConfigured()) {
      const supabase = createClient();

      // 1. Captura código PKCE se presente na URL
      const code = searchParams.get("code");
      if (code) {
        supabase.auth.exchangeCodeForSession(code).then(({ data, error }) => {
          if (!error && data.user?.email) {
            setEmail(data.user.email);
          }
        });
      }

      // 2. Captura token_hash se presente
      const token_hash = searchParams.get("token_hash") || searchParams.get("token");
      const type = (searchParams.get("type") || "invite") as "invite" | "recovery" | "magiclink" | "email";
      if (token_hash) {
        supabase.auth.verifyOtp({ token_hash, type }).then(({ data, error }) => {
          if (!error && data.user?.email) {
            setEmail(data.user.email);
          }
        });
      }

      // 3. Captura usuário ativo
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user?.email) {
          setEmail(user.email);
        }
      });
    }
  }, [searchParams]);

  // Validações em tempo real
  const hasMinLength = password.length >= 6;
  const passwordsMatch = password.length > 0 && password === confirmPassword;
  const isFormValid = hasMinLength && passwordsMatch;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!hasMinLength) {
      const msg = "A senha deve conter no mínimo 6 caracteres.";
      setErrorMessage(msg);
      toast.error(msg);
      return;
    }

    if (!passwordsMatch) {
      const msg = "As senhas informadas não coincidem. Verifique a digitação.";
      setErrorMessage(msg);
      toast.error(msg);
      return;
    }

    const targetEmail = email || urlEmail || searchParams.get("email") || undefined;

    startTransition(async () => {
      try {
        // 1. Atualização via Browser Client (se houver sessão PKCE local)
        if (isSupabaseConfigured()) {
          try {
            const supabase = createClient();
            const { error: clientError } = await supabase.auth.updateUser({
              password,
            });

            if (!clientError) {
              setIsSuccess(true);
              toast.success("Senha cadastrada com sucesso! Bem-vindo à equipe.");
              setTimeout(() => {
                router.push("/leads");
              }, 1200);
              return;
            }
          } catch {
            // Se falhar no client, tenta via Server Action
          }
        }

        // 2. Fallback via Server Action com contingência Admin por e-mail
        const result = targetEmail
          ? await updateUserPassword(password, targetEmail)
          : await updateUserPassword(password);

        if (!result.success) {
          const err =
            result.error ||
            "Não foi possível salvar a nova senha. O link pode ter expirado.";
          setErrorMessage(err);
          toast.error(err);
          return;
        }

        setIsSuccess(true);
        toast.success("Senha cadastrada com sucesso! Bem-vindo à equipe.");

        setTimeout(() => {
          router.push("/leads");
        }, 1200);
      } catch (err) {
        console.error("[Update Password Error]", err);
        const msg =
          err instanceof Error
            ? err.message
            : "Falha na comunicação com o servidor ao atualizar senha.";
        setErrorMessage(msg);
        toast.error(msg);
      }
    });
  };

  return (
    <div className="w-full max-w-md space-y-6">
      {/* Card Principal */}
      <div className="relative rounded-3xl border border-zinc-800/80 bg-[#121218]/90 p-6 sm:p-8 backdrop-blur-xl shadow-2xl shadow-black/60 space-y-6 animate-in fade-in zoom-in-95 duration-300">
        {/* Cabeçalho */}
        <div className="text-center space-y-3">
          <div className="flex justify-center">
            <BrandLogo priority />
          </div>

          <div className="inline-flex items-center gap-1.5 rounded-full border border-orange-500/30 bg-orange-950/40 px-3 py-1 text-xs font-bold text-orange-400">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Primeiro Acesso • Definir Senha</span>
          </div>

          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
              Crie sua senha de acesso
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400">
              Defina sua nova senha para acessar o painel de atendimento e acelerar suas vendas.
            </p>
          </div>
        </div>

        {/* Banner de Verificação Positiva */}
        {verified && (
          <div
            role="status"
            className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-950/30 p-3 text-xs text-emerald-300 animate-in fade-in"
          >
            <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>Link de convite autenticado com sucesso. Defina sua senha abaixo:</span>
          </div>
        )}

        {/* Banner de Erro */}
        {errorMessage && (
          <div
            role="alert"
            id="banner-update-password-error"
            className="flex items-center gap-2.5 rounded-xl border border-red-500/30 bg-red-950/40 p-3.5 text-xs text-red-300 animate-in fade-in"
          >
            <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
            <span className="leading-snug">{errorMessage}</span>
          </div>
        )}

        {/* Feedback de Sucesso */}
        {isSuccess ? (
          <div
            role="status"
            className="rounded-2xl border border-emerald-500/40 bg-emerald-950/40 p-6 text-center space-y-3 animate-in zoom-in-95"
          >
            <div className="flex justify-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 animate-pulse">
                <CheckCircle2 className="h-6 w-6" />
              </div>
            </div>
            <h3 className="text-base font-bold text-white">Senha Definida com Sucesso!</h3>
            <p className="text-xs text-zinc-300">
              Redirecionando você para o Funil de Vendas do CRM...
            </p>
            <div className="flex justify-center pt-2">
              <Loader2 className="h-5 w-5 animate-spin text-orange-500" />
            </div>
          </div>
        ) : (
          /* Formulário */
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* Campo Opcional/Identificador de E-mail se não identificado */}
            {email ? (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-900/50 border border-zinc-800/80 text-xs text-zinc-400">
                <Mail className="h-3.5 w-3.5 text-orange-400" />
                <span className="text-zinc-300 font-medium truncate">{email}</span>
              </div>
            ) : (
              <div className="space-y-1.5">
                <label
                  htmlFor="email"
                  className="text-xs font-semibold text-zinc-300"
                >
                  Seu E-mail Corporativo
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                    <Mail className="h-4 w-4" />
                  </div>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="seu.email@concessionaria.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isPending}
                    required
                    autoComplete="email"
                    className="pl-10 h-11 bg-zinc-900/90 border-zinc-800 text-white text-xs sm:text-sm placeholder:text-zinc-600 focus-visible:border-orange-500 focus-visible:ring-orange-500/20 rounded-xl"
                  />
                </div>
              </div>
            )}

            {/* Campo: Nova Senha */}
            <div className="space-y-1.5">
              <label
                htmlFor="password"
                className="text-xs font-semibold text-zinc-300"
              >
                Nova Senha
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                  <Lock className="h-4 w-4" />
                </div>
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Mínimo 6 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isPending}
                  required
                  autoComplete="new-password"
                  data-testid="input-new-password"
                  className="pl-10 pr-10 h-11 bg-zinc-900/90 border-zinc-800 text-white text-xs sm:text-sm placeholder:text-zinc-600 focus-visible:border-orange-500 focus-visible:ring-orange-500/20 rounded-xl"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                  aria-label={showPassword ? "Ocultar senha" : "Exibir senha"}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Campo: Confirmar Nova Senha */}
            <div className="space-y-1.5">
              <label
                htmlFor="confirmPassword"
                className="text-xs font-semibold text-zinc-300"
              >
                Confirmar Nova Senha
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                  <Lock className="h-4 w-4" />
                </div>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Repita a nova senha"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isPending}
                  required
                  autoComplete="new-password"
                  data-testid="input-confirm-password"
                  className="pl-10 pr-10 h-11 bg-zinc-900/90 border-zinc-800 text-white text-xs sm:text-sm placeholder:text-zinc-600 focus-visible:border-orange-500 focus-visible:ring-orange-500/20 rounded-xl"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  tabIndex={-1}
                  aria-label={
                    showConfirmPassword ? "Ocultar confirmação" : "Exibir confirmação"
                  }
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Checklist de Validação */}
            <div className="rounded-xl bg-zinc-900/60 border border-zinc-800/60 p-3 space-y-1.5 text-[11px]">
              <div className="flex items-center gap-2">
                <CheckCircle2
                  className={`h-3.5 w-3.5 transition-colors ${
                    hasMinLength ? "text-emerald-400" : "text-zinc-600"
                  }`}
                />
                <span className={hasMinLength ? "text-zinc-200" : "text-zinc-500"}>
                  Pelo menos 6 caracteres
                </span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2
                  className={`h-3.5 w-3.5 transition-colors ${
                    passwordsMatch ? "text-emerald-400" : "text-zinc-600"
                  }`}
                />
                <span className={passwordsMatch ? "text-zinc-200" : "text-zinc-500"}>
                  As duas senhas são idênticas
                </span>
              </div>
            </div>

            {/* Botão de Submissão */}
            <Button
              type="submit"
              disabled={isPending || !isFormValid}
              data-testid="btn-submit-password"
              className="w-full h-11 bg-gradient-to-r from-orange-500 via-orange-600 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg shadow-orange-500/20 transition-all gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Salvando nova senha...</span>
                </>
              ) : (
                <>
                  <span>Salvar Senha e Acessar CRM</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </form>
        )}
      </div>

      {/* Rodapé / Informação de Segurança */}
      <div className="text-center text-xs text-zinc-500 flex items-center justify-center gap-1.5">
        <ShieldCheck className="h-3.5 w-3.5 text-zinc-400" />
        <span>Ambiente seguro protegido por criptografia de ponta a ponta</span>
      </div>
    </div>
  );
}

export default function UpdatePasswordPage() {
  return (
    <div className="min-h-screen bg-[#09090b] flex items-center justify-center p-4 sm:p-6 selection:bg-orange-500/30 selection:text-orange-200">
      <Suspense
        fallback={
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <Loader2 className="h-4 w-4 animate-spin text-orange-500" />
            <span>Carregando formulário de acesso...</span>
          </div>
        }
      >
        <UpdatePasswordForm />
      </Suspense>
    </div>
  );
}
