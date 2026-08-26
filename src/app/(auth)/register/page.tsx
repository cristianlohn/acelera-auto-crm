/**
 * @file page.tsx
 * @description Página de Cadastro Self-Service de Concessionária (RegisterPage).
 *
 * Funcionalidades:
 * - Provisionamento de nova concessionária (novo tenant) com teste grátis de 14 dias.
 * - Validação client-side com feedback visual em tempo real.
 * - Integração com a Server Action `registerNewDealership`.
 * - Design moderno Dark Mode (Split Screen no desktop e Card Responsivo Mobile-First).
 * - Links de navegação para a tela de Login (/login) e Landing Page (/).
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
  Building2,
  User,
  Phone,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Rocket,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { registerNewDealership } from "@/app/actions/auth";

export default function RegisterPage() {
  const router = useRouter();
  const [storeName, setStoreName] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Submissão do formulário de provisionamento
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Validação Client-Side
    if (!storeName.trim()) {
      setErrorMessage("Por favor, informe o nome da sua concessionária ou loja.");
      return;
    }
    if (!fullName.trim()) {
      setErrorMessage("Por favor, informe o nome completo do gestor.");
      return;
    }
    if (!email.trim() || !email.includes("@") || !email.includes(".")) {
      setErrorMessage("Por favor, informe um e-mail corporativo válido.");
      return;
    }
    if (!phone.trim()) {
      setErrorMessage("Por favor, informe o telefone ou WhatsApp.");
      return;
    }
    if (!password || password.length < 6) {
      setErrorMessage("A senha deve ter no mínimo 6 caracteres.");
      return;
    }
    if (!confirmPassword) {
      setErrorMessage("Por favor, confirme sua senha.");
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage("As senhas não coincidem. Verifique e tente novamente.");
      return;
    }

    startTransition(async () => {
      try {
        const result = await registerNewDealership({
          storeName,
          fullName,
          email,
          phone,
          password,
        });

        if (!result.success) {
          setErrorMessage(result.error || "Ocorreu um erro ao criar a conta.");
          return;
        }

        // Sucesso: Redireciona para o CRM
        router.push("/leads");
      } catch {
        setErrorMessage("Erro de conexão ao criar conta. Tente novamente.");
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

        {/* Benefícios do Trial */}
        <div className="space-y-6 max-w-lg z-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-orange-500/30 bg-orange-500/10 px-3.5 py-1 text-xs font-semibold text-orange-400">
            <Rocket className="h-3.5 w-3.5" />
            <span>Teste Grátis de 14 Dias • Sem Cartão</span>
          </div>

          <h2 className="text-3xl lg:text-4xl font-extrabold text-white leading-tight">
            Transforme visitantes da Web em clientes fiéis da sua loja.
          </h2>

          <div className="space-y-3 pt-2 text-sm text-zinc-300">
            <div className="flex items-center gap-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-orange-500/20 text-orange-400">
                <Clock className="h-3.5 w-3.5" />
              </div>
              <span>Setup instantâneo e pronto para uso em menos de 2 minutos</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5" />
              </div>
              <span>Acesso irrestrito a todos os recursos profissionais</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500/20 text-blue-400">
                <ShieldCheck className="h-3.5 w-3.5" />
              </div>
              <span>Isolamento e segurança multi-tenant no Supabase</span>
            </div>
          </div>
        </div>

        {/* Rodapé do Painel */}
        <div className="text-xs text-zinc-400 z-10">
          © {new Date().getFullYear()} Acelera Auto CRM. Todos os direitos reservados.
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Painel Direito: Formulário de Cadastro                             */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex flex-1 flex-col justify-center px-4 py-8 sm:px-6 lg:px-12 xl:px-16 w-full max-w-lg mx-auto lg:max-w-none">
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
              href="/login"
              className="text-xs font-semibold text-zinc-400 hover:text-white"
            >
              Já tem conta? Entrar
            </Link>
          </div>

          {/* Cabeçalho do Formulário */}
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-orange-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-orange-400 mb-2">
              <Sparkles className="h-3 w-3" />
              <span>14 dias de teste grátis</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Criar Conta da Concessionária
            </h1>
            <p className="mt-1 text-xs text-zinc-400">
              Comece agora sem compromisso e sem precisar cadastrar cartão
            </p>
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

          {/* Formulário de Cadastro */}
          <form id="form-register" onSubmit={handleRegister} className="space-y-3.5" noValidate>
            {/* Nome da Loja */}
            <div className="space-y-1">
              <label
                htmlFor="register-store-name"
                className="flex items-center gap-1.5 text-xs font-medium text-zinc-300"
              >
                <Building2 className="h-3.5 w-3.5 text-zinc-400" />
                Nome da Concessionária / Loja *
              </label>
              <Input
                id="register-store-name"
                name="storeName"
                placeholder="Ex: Imperial Motors"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                className="bg-white/5 border-white/10 text-white placeholder:text-zinc-500 text-xs h-9"
                required
              />
            </div>

            {/* Nome do Gestor */}
            <div className="space-y-1">
              <label
                htmlFor="register-full-name"
                className="flex items-center gap-1.5 text-xs font-medium text-zinc-300"
              >
                <User className="h-3.5 w-3.5 text-zinc-400" />
                Nome Completo do Gestor *
              </label>
              <Input
                id="register-full-name"
                name="fullName"
                placeholder="Ex: Roberto Silva"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="bg-white/5 border-white/10 text-white placeholder:text-zinc-500 text-xs h-9"
                required
              />
            </div>

            {/* Grid: E-mail e Telefone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label
                  htmlFor="register-email"
                  className="flex items-center gap-1.5 text-xs font-medium text-zinc-300"
                >
                  <Mail className="h-3.5 w-3.5 text-zinc-400" />
                  E-mail Corporativo *
                </label>
                <Input
                  id="register-email"
                  name="email"
                  type="email"
                  placeholder="gestor@loja.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-white/5 border-white/10 text-white placeholder:text-zinc-500 text-xs h-9"
                  required
                />
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="register-phone"
                  className="flex items-center gap-1.5 text-xs font-medium text-zinc-300"
                >
                  <Phone className="h-3.5 w-3.5 text-zinc-400" />
                  WhatsApp / Celular *
                </label>
                <Input
                  id="register-phone"
                  name="phone"
                  type="tel"
                  placeholder="(11) 99999-8888"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="bg-white/5 border-white/10 text-white placeholder:text-zinc-500 text-xs h-9"
                  required
                />
              </div>
            </div>

            {/* Grid: Senha e Confirmar Senha */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label
                  htmlFor="register-password"
                  className="flex items-center gap-1.5 text-xs font-medium text-zinc-300"
                >
                  <Lock className="h-3.5 w-3.5 text-zinc-400" />
                  Senha de Acesso *
                </label>
                <Input
                  id="register-password"
                  name="password"
                  type="password"
                  placeholder="Mínimo de 6 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-white/5 border-white/10 text-white placeholder:text-zinc-500 text-xs h-9"
                  required
                />
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="register-confirm-password"
                  className="flex items-center gap-1.5 text-xs font-medium text-zinc-300"
                >
                  <Lock className="h-3.5 w-3.5 text-zinc-400" />
                  Confirmar Senha *
                </label>
                <Input
                  id="register-confirm-password"
                  name="confirmPassword"
                  type="password"
                  placeholder="Repita sua senha"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="bg-white/5 border-white/10 text-white placeholder:text-zinc-500 text-xs h-9"
                  required
                />
              </div>
            </div>

            {/* Botão de Submissão */}
            <Button
              id="btn-submit-register"
              type="submit"
              disabled={isPending}
              className="w-full gap-2 bg-gradient-to-r from-orange-500 via-orange-600 to-red-600 text-white font-bold text-xs sm:text-sm h-10 shadow-lg shadow-orange-500/25 hover:from-orange-600 hover:to-red-700 hover:shadow-orange-500/40 transition-all mt-2"
            >
              <span>{isPending ? "Provisionando seu CRM..." : "Criar Conta e Começar"}</span>
              <ArrowRight className="h-4 w-4 shrink-0" />
            </Button>
          </form>

          {/* Links de Apoio */}
          <div className="text-center space-y-2 pt-1">
            <p className="text-xs text-zinc-400">
              Já possui uma conta ativa?{" "}
              <Link
                id="link-go-login"
                href="/login"
                className="font-semibold text-orange-400 hover:text-orange-300 transition-colors"
              >
                Entrar no CRM
              </Link>
            </p>

            <div>
              <Link
                id="link-back-home"
                href="/"
                className="inline-flex items-center gap-1.5 text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                <span>Voltar para a página inicial</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
