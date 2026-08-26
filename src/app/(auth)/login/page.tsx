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

import { useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isDemoPending, startDemoTransition] = useTransition();

  // Acesso rápido instantâneo ao modo Sandbox / Demo
  const handleDemoAccess = () => {
    startDemoTransition(() => {
      // Define cookie para indicar modo demonstração
      document.cookie =
        "acelera_demo_mode=true; path=/; max-age=86400; SameSite=Lax";
      router.push("/leads");
    });
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
        if (isSupabaseConfigured()) {
          const { error } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
          });

          if (error) {
            setErrorMessage("E-mail ou senha incorretos. Verifique seus dados.");
            return;
          }
        }

        // Sucesso / Fallback para modo ativo
        document.cookie =
          "acelera_demo_mode=true; path=/; max-age=86400; SameSite=Lax";
        router.push("/leads");
      } catch {
        setErrorMessage("Ocorreu um erro ao autenticar. Tente novamente.");
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
          id="link-brand-home"
          className="flex items-center gap-2.5 z-10 transition-transform hover:scale-105"
          aria-label="Ir para a página inicial"
        >
          <Image
            src="/logo.png"
            alt="Acelera Auto CRM"
            width={180}
            height={48}
            className="h-10 md:h-12 w-auto object-contain"
            priority
          />
        </Link>

        {/* Mensagem de Destaque */}
        <div className="space-y-6 max-w-lg z-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-orange-500/30 bg-orange-500/10 px-3.5 py-1 text-xs font-semibold text-orange-400">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Acelerando mais de 500 revendas</span>
          </div>

          <h2 className="text-3xl lg:text-4xl font-extrabold text-white leading-tight">
            Aumente o giro do seu pátio com atendimento em menos de 15 minutos.
          </h2>

          <div className="space-y-3 pt-2 text-sm text-zinc-300">
            <div className="flex items-center gap-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-orange-500/20 text-orange-400">
                <LayoutDashboard className="h-3.5 w-3.5" />
              </div>
              <span>Funil Kanban com alertas de SLA em tempo real</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                <Car className="h-3.5 w-3.5" />
              </div>
              <span>Gestão ágil de estoque e cópia rápida de ficha técnica</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500/20 text-blue-400">
                <ShieldCheck className="h-3.5 w-3.5" />
              </div>
              <span>Segurança avançada multi-tenant com Supabase RLS</span>
            </div>
          </div>
        </div>

        {/* Rodapé do Painel */}
        <div className="text-xs text-zinc-400 z-10">
          © {new Date().getFullYear()} Acelera Auto CRM. Todos os direitos reservados.
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Painel Direito: Formulário e Acesso Demo                           */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex flex-1 flex-col justify-center px-4 py-12 sm:px-6 lg:px-12 xl:px-16 w-full max-w-md mx-auto lg:max-w-none">
        <div className="w-full max-w-md mx-auto space-y-6">
          {/* Logo Header Form & Mobile */}
          <div className="flex items-center justify-between">
            <Link
              href="/"
              className="flex items-center gap-2 transition-transform hover:scale-105"
              aria-label="Ir para a página inicial"
            >
              <Image
                src="/logo.png"
                alt="Acelera Auto CRM"
                width={180}
                height={48}
                className="h-10 md:h-12 w-auto object-contain"
                priority
              />
            </Link>

            <Link
              href="/"
              className="text-xs font-semibold text-zinc-400 hover:text-white"
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
          <div className="rounded-2xl border-2 border-orange-500/40 bg-gradient-to-b from-orange-500/10 to-transparent p-4 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-orange-400 uppercase tracking-wider">
                  Avaliação & Demonstração
                </p>
                <p className="text-xs text-zinc-300 mt-0.5">
                  Teste o CRM com dados reais pré-carregados
                </p>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                <CheckCircle2 className="h-3 w-3" />
                Sem Senha
              </span>
            </div>

            <Button
              id="btn-demo-login"
              type="button"
              onClick={handleDemoAccess}
              disabled={isDemoPending}
              className="mt-3.5 w-full gap-2 bg-gradient-to-r from-orange-500 via-orange-600 to-red-600 text-xs sm:text-sm font-bold text-white shadow-lg shadow-orange-500/25 hover:from-orange-600 hover:to-red-700 hover:shadow-orange-500/40 transition-all hover:scale-[1.02] active:scale-98"
              aria-label="Entrar como Concessionária Demo"
            >
              <span>{isDemoPending ? "Acessando..." : "🚀 Entrar como Concessionária Demo (Acesso Rápido)"}</span>
              <ArrowRight className="h-4 w-4 shrink-0" />
            </Button>
          </div>

          {/* Divisor Visual */}
          <div className="relative flex items-center justify-center">
            <div className="w-full border-t border-white/10" />
            <span className="bg-[#09090b] px-3 text-[11px] font-medium text-zinc-400 uppercase tracking-wider shrink-0">
              ou com e-mail corporativo
            </span>
          </div>

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
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setErrorMessage("Para redefinir a senha, utilize o modo demonstração ou contate o administrador.");
                  }}
                  className="text-[11px] text-orange-400 hover:text-orange-300 transition-colors"
                >
                  Esqueceu a senha?
                </a>
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
    </div>
  );
}
