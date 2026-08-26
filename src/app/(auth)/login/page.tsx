/**
 * @file page.tsx
 * @description Página de Autenticação e Login (LoginPage).
 *
 * Funcionalidades:
 * - Acesso Rápido ao Modo Demonstração (Tenant Sandbox) com 1 clique.
 * - Autenticação por credenciais tradicionais (E-mail e Senha) integrada ao Supabase Auth.
 * - Layout responsivo com design moderno Dark Mode e painel institucional.
 * - Validação de campos e feedback visual amigável.
 * - Link de navegação de volta para a Landing Page institucional.
 */

"use client";

import React, { useState, useTransition, Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowRight,
  Lock,
  Mail,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Car,
  LayoutDashboard,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { requestPasswordReset, loginAction } from "@/app/actions/auth";

function LoginAuthBanner() {
  const searchParams = useSearchParams();
  const verified = searchParams.get("verified");
  const error = searchParams.get("error");
  const passwordUpdated = searchParams.get("password_updated");

  if (passwordUpdated === "true") {
    return (
      <div
        role="status"
        id="banner-password-updated"
        className="flex items-center gap-2.5 rounded-xl border border-emerald-500/40 bg-emerald-950/40 p-3.5 text-xs text-emerald-300 shadow-lg shadow-emerald-950/30 animate-in fade-in"
      >
        <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
        <span className="leading-snug">
          Senha redefinida com sucesso! Você já pode entrar com sua nova senha.
        </span>
      </div>
    );
  }

  if (verified === "true") {
    return (
      <div
        role="status"
        id="banner-email-verified"
        className="flex items-center gap-2.5 rounded-xl border border-emerald-500/40 bg-emerald-950/40 p-3.5 text-xs text-emerald-300 shadow-lg shadow-emerald-950/30 animate-in fade-in"
      >
        <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
        <span className="leading-snug">
          E-mail confirmado com sucesso! Você já pode entrar com suas credenciais.
        </span>
      </div>
    );
  }

  if (error === "auth_callback_error" || error === "missing_code") {
    return (
      <div
        role="alert"
        id="banner-auth-callback-error"
        className="flex items-center gap-2.5 rounded-xl border border-red-500/30 bg-red-950/40 p-3.5 text-xs text-red-300 animate-in fade-in"
      >
        <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
        <span className="leading-snug">
          Não foi possível validar o link de autenticação. Tente novamente ou solicite um novo e-mail.
        </span>
      </div>
    );
  }

  return null;
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isDemoLoading, setIsDemoLoading] = useState(false);

  // Estados do Modal de Recuperação de Senha
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotStatus, setForgotStatus] = useState<string | null>(null);
  const [forgotError, setForgotError] = useState<string | null>(null);
  const [isForgotPending, startForgotTransition] = useTransition();

  // Redirecionamento automático se já estiver autenticado
  React.useEffect(() => {
    if (typeof document !== "undefined") {
      const isTestAuth = document.cookie.includes("sb-test-user=true");
      if (isTestAuth) {
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
        window.location.href = "/leads";
      }
    }
  }, []);

  // Acesso rápido instantâneo ao modo Sandbox / Demo
  const handleDemoAccess = () => {
    setIsDemoLoading(true);
    if (typeof document !== "undefined") {
      document.cookie =
        "acelera_demo_mode=true; path=/; max-age=86400; SameSite=Lax";
    }
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = "/leads";
  };

  // Submissão do formulário tradicional de login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email.trim() || !password.trim()) {
      setErrorMessage("Por favor, preencha seu e-mail e senha.");
      return;
    }

    startTransition(async () => {
      try {
        const result = await loginAction({
          email: email.trim(),
          password,
        });

        if (!result.success) {
          setErrorMessage(result.error || "E-mail ou senha incorretos. Verifique seus dados.");
          return;
        }

        // Ao autenticar com credenciais reais, limpa explicitamente qualquer cookie de demonstração
        if (typeof document !== "undefined") {
          document.cookie =
            "sb-test-user=true; path=/; max-age=86400; SameSite=Lax";
          document.cookie =
            "acelera_demo_mode=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
          document.cookie =
            "sb-demo-auth=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
          document.cookie =
            "demo_mode=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
          document.cookie =
            "acelera_demo_session=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
        }
        window.location.href = result.redirectUrl || "/leads";
      } catch {
        setErrorMessage("Ocorreu um erro ao autenticar. Tente novamente.");
      }
    });
  };

  // Submissão da recuperação de senha
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError(null);
    setForgotStatus(null);

    if (!forgotEmail.trim() || !forgotEmail.includes("@") || !forgotEmail.includes(".")) {
      setForgotError("Informe um endereço de e-mail corporativo válido.");
      return;
    }

    startForgotTransition(async () => {
      try {
        const origin =
          typeof window !== "undefined" && window.location.origin
            ? window.location.origin
            : "https://aceleraautocrm.com.br";
        const redirectUrl = `${origin}/auth/callback?next=/reset-password`;

        const result = await requestPasswordReset(forgotEmail.trim(), redirectUrl);
        if (!result.success) {
          setForgotError(result.error || "Não foi possível enviar o link de recuperação.");
          return;
        }
        setForgotStatus(result.message || "Enviamos um link de recuperação para o seu e-mail.");
      } catch {
        setForgotError("Erro inesperado ao solicitar recuperação. Tente novamente.");
      }
    });
  };

  return (
    <div className="flex min-h-screen w-full max-w-full overflow-x-hidden bg-[#09090b] text-[#f4f4f5]">
      {/* ------------------------------------------------------------------ */}
      {/* Painel Esquerdo: Vitrine Institucional (Desktop)                   */}
      {/* ------------------------------------------------------------------ */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between border-r border-white/10 bg-gradient-to-br from-[#121218] via-[#0e0e14] to-[#09090b] p-12 relative overflow-hidden">
        {/* Glow de fundo */}
        <div
          className="pointer-events-none absolute top-0 left-0 h-96 w-96 rounded-full bg-orange-500/10 blur-3xl"
          aria-hidden="true"
        />

        {/* Logo */}
        <Link
          href="/"
          className="inline-block relative z-10 transition-transform hover:scale-105"
        >
          <Image
            src="/logo.png"
            alt="Acelera Auto CRM"
            width={200}
            height={52}
            className="h-10 md:h-12 w-auto object-contain"
            priority
          />
        </Link>

        {/* Mensagem e Proposta de Valor */}
        <div className="relative z-10 space-y-6 max-w-lg">
          <div className="inline-flex items-center gap-2 rounded-full border border-orange-500/30 bg-orange-500/10 px-3 py-1 text-xs font-semibold text-orange-400">
            <Sparkles className="h-4 w-4" />
            <span>CRM Automotivo #1 em Velocidade</span>
          </div>

          <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl leading-tight">
            Centralize leads, estoque e vendedores em uma única tela.
          </h2>

          <p className="text-sm text-zinc-400 leading-relaxed">
            Elimine o tempo de resposta lento no WhatsApp e aumente a conversão do seu estoque em até 35% com o Kanban inteligente.
          </p>

          {/* Mini Indicadores de Destaque */}
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-orange-400 text-xs font-bold">
                <Car className="h-4 w-4" />
                <span>Gestão de Estoque</span>
              </div>
              <p className="text-xs text-zinc-400">
                Fotos, preços e status do pátio integrados aos leads.
              </p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
                <LayoutDashboard className="h-4 w-4" />
                <span>Roleta de Leads</span>
              </div>
              <p className="text-xs text-zinc-400">
                Distribuição equitativa e SLA de atendimento automático.
              </p>
            </div>
          </div>
        </div>

        {/* Rodapé do Painel Institucional */}
        <div className="relative z-10 flex items-center justify-between text-xs text-zinc-500 border-t border-white/5 pt-6">
          <span>© {new Date().getFullYear()} Acelera Auto CRM</span>
          <div className="flex items-center gap-1 text-emerald-400 font-medium">
            <ShieldCheck className="h-4 w-4" />
            <span>Dados 100% Protegidos (LGPD)</span>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Painel Direito: Formulário de Autenticação                         */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex flex-1 flex-col justify-center px-4 py-12 sm:px-6 lg:px-16 xl:px-24">
        <div className="mx-auto w-full max-w-sm space-y-6">
          {/* Logo Mobile e Link de Retorno */}
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
            <Link
              href="/"
              className="text-xs text-zinc-400 hover:text-white transition-colors"
            >
              Voltar ao site
            </Link>
          </div>

          {/* Cabeçalho do Formulário */}
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Acessar sua Conta
            </h1>
            <p className="mt-1.5 text-xs text-zinc-400">
              Entre com suas credenciais ou experimente o modo demonstração
            </p>
          </div>

          {/* Botão de Destaque: Acesso Rápido ao Modo Demonstração */}
          <div
            data-testid="demo-card"
            className="rounded-2xl border border-orange-500/30 bg-gradient-to-b from-orange-500/10 to-transparent p-4 shadow-lg w-full box-border"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-orange-400 uppercase tracking-wider truncate">
                  Avaliação & Demonstração
                </p>
                <p className="text-xs text-zinc-300 mt-0.5 leading-snug">
                  Teste o CRM com dados reais pré-carregados
                </p>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-400 shrink-0">
                <CheckCircle2 className="h-3 w-3" />
                Sem Senha
              </span>
            </div>

            <Button
              id="btn-enter-demo"
              data-testid="demo-login-button"
              type="button"
              onClick={handleDemoAccess}
              disabled={isDemoLoading || isPending}
              className="mt-3.5 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 via-orange-600 to-red-600 text-xs sm:text-sm font-bold text-white shadow-md shadow-orange-500/20 hover:from-orange-600 hover:to-red-700 transition-all active:scale-[0.99] h-auto min-h-[38px] box-border max-w-full disabled:opacity-75 cursor-pointer"
              aria-label="Entrar como Concessionária Demo"
            >
              {isDemoLoading ? (
                <div
                  data-testid="demo-spinner"
                  className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent shrink-0"
                />
              ) : null}
              <span className="truncate">
                {isDemoLoading ? "Acessando demonstração..." : "🚀 Entrar como Concessionária Demo"}
              </span>
              {!isDemoLoading && <ArrowRight className="h-4 w-4 shrink-0" />}
            </Button>
          </div>

          {/* Divisor Visual */}
          <div className="relative flex items-center justify-center">
            <div className="w-full border-t border-white/10" />
            <span className="bg-[#09090b] px-3 text-[11px] font-medium text-zinc-400 uppercase tracking-wider shrink-0">
              ou com e-mail corporativo
            </span>
          </div>

          {/* Alerta de Verificação ou Erro de Callback */}
          <Suspense fallback={null}>
            <LoginAuthBanner />
          </Suspense>

          {/* Alerta de Erro */}
          {errorMessage && (
            <div
              role="alert"
              className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-950/40 p-3 text-xs text-red-300"
            >
              <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Formulário Tradicional */}
          <form id="form-login" onSubmit={handleLogin} className="space-y-4" noValidate>
            <div className="space-y-1.5">
              <label
                htmlFor="login-email"
                className="flex items-center gap-1.5 text-xs font-medium text-zinc-300"
              >
                <Mail className="h-3.5 w-3.5 text-zinc-400" />
                E-mail
              </label>
              <Input
                id="login-email"
                name="email"
                type="email"
                placeholder="seu.email@concessionaria.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-white/5 border-white/10 text-white placeholder:text-zinc-400 text-xs h-9"
                required
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="login-password"
                  className="flex items-center gap-1.5 text-xs font-medium text-zinc-300"
                >
                  <Lock className="h-3.5 w-3.5 text-zinc-400" />
                  Senha
                </label>
                <button
                  type="button"
                  id="btn-forgot-password"
                  onClick={() => {
                    setForgotEmail(email);
                    setForgotError(null);
                    setForgotStatus(null);
                    setIsForgotModalOpen(true);
                  }}
                  className="text-[11px] text-orange-400 hover:text-orange-300 transition-colors"
                >
                  Esqueceu a senha?
                </button>
              </div>
              <Input
                id="login-password"
                name="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-white/5 border-white/10 text-white placeholder:text-zinc-400 text-xs h-9"
                required
              />
            </div>

            <Button
              id="btn-submit-login"
              type="submit"
              disabled={isPending}
              className="w-full bg-white text-black font-bold hover:bg-zinc-200 text-xs sm:text-sm h-9 mt-2 transition-all"
            >
              {isPending ? "Validando credenciais..." : "Entrar no CRM"}
            </Button>
          </form>

          {/* Links de Rodapé */}
          <div className="text-center pt-2">
            <Link
              id="link-back-home"
              href="/"
              className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors"
            >
              <span>Voltar para a página inicial</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Modal de Recuperação de Senha */}
      {isForgotModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-forgot-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in"
        >
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#121218] p-6 shadow-2xl space-y-5">
            <div>
              <h2 id="modal-forgot-title" className="text-lg font-bold text-white">
                Recuperar Acesso
              </h2>
              <p className="text-xs text-zinc-400 mt-1">
                Digite o e-mail cadastrado da sua conta. Enviaremos um link seguro para você redefinir sua senha.
              </p>
            </div>

            {forgotStatus && (
              <div
                role="status"
                className="flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-950/40 p-3 text-xs text-emerald-300"
              >
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>{forgotStatus}</span>
              </div>
            )}

            {forgotError && (
              <div
                role="alert"
                className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-950/40 p-3 text-xs text-red-300"
              >
                <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
                <span>{forgotError}</span>
              </div>
            )}

            {!forgotStatus && (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div className="space-y-1.5">
                  <label
                    htmlFor="forgot-email-input"
                    className="flex items-center gap-1.5 text-xs font-medium text-zinc-300"
                  >
                    <Mail className="h-3.5 w-3.5 text-zinc-400" />
                    E-mail Corporativo
                  </label>
                  <Input
                    id="forgot-email-input"
                    type="email"
                    placeholder="seu.email@concessionaria.com"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    className="bg-white/5 border-white/10 text-white placeholder:text-zinc-400 text-xs h-9"
                    required
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setIsForgotModalOpen(false)}
                    className="text-xs text-zinc-400 hover:text-white"
                  >
                    Cancelar
                  </Button>
                  <Button
                    id="btn-send-recovery"
                    type="submit"
                    disabled={isForgotPending}
                    className="bg-gradient-to-r from-orange-500 to-red-600 text-white text-xs font-bold hover:from-orange-600 hover:to-red-700"
                  >
                    {isForgotPending ? "Enviando..." : "Enviar Link de Recuperação"}
                  </Button>
                </div>
              </form>
            )}

            {forgotStatus && (
              <div className="pt-2 flex justify-end">
                <Button
                  type="button"
                  onClick={() => setIsForgotModalOpen(false)}
                  className="bg-white text-black font-bold text-xs hover:bg-zinc-200"
                >
                  Fechar
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
