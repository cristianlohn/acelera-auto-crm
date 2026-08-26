/**
 * @file page.tsx
 * @description Tela de Planos, Assinatura e Paywall (BillingPage).
 *
 * Funcionalidades:
 * - Paywall estrito quando o período de teste expirou (`expired=true`).
 * - Escolha de ciclo de faturamento (Mensal / Anual com 2 meses grátis).
 * - Seleção de plano (Starter R$ 297, Pro R$ 497, Enterprise R$ 997).
 * - Checkout direto simulado com suporte a Cartão de Crédito e Pix.
 * - Feedback visual de segurança e garantia de 7 dias.
 */

"use client";

import React, { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Check,
  Sparkles,
  ShieldCheck,
  CreditCard,
  QrCode,
  Lock,
  ArrowRight,
  AlertCircle,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Plan {
  id: string;
  name: string;
  badge?: string;
  description: string;
  monthlyPrice: number;
  annualPrice: number;
  sellersLimit: string;
  features: string[];
  popular?: boolean;
}

const plans: Plan[] = [
  {
    id: "starter",
    name: "Plano Starter",
    description: "Ideal para lojas compactas e revendas independentes.",
    monthlyPrice: 297,
    annualPrice: 2970,
    sellersLimit: "Até 3 vendedores inclusos",
    features: [
      "Funil Kanban com SLA em tempo real",
      "Roleta de Leads Automática (Round-Robin)",
      "Integração WhatsApp 1-clique",
      "Estoque até 50 veículos",
      "Webhooks de Ingestão de Leads",
    ],
  },
  {
    id: "pro",
    name: "Plano Pro",
    popular: true,
    badge: "Mais Escolhido",
    description: "Para concessionárias em crescimento acelerado.",
    monthlyPrice: 497,
    annualPrice: 4970,
    sellersLimit: "Até 10 vendedores inclusos",
    features: [
      "Tudo do Plano Starter",
      "Cockpit do Gestor 'Dinheiro na Mesa'",
      "Estoque ilimitado de veículos",
      "Relatórios de conversão e perda de leads",
      "Suporte prioritário via WhatsApp",
    ],
  },
  {
    id: "enterprise",
    name: "Plano Enterprise",
    description: "Para grandes grupos automotivos e redes de lojas.",
    monthlyPrice: 997,
    annualPrice: 9970,
    sellersLimit: "Vendedores Ilimitados",
    features: [
      "Tudo do Plano Pro",
      "Multi-lojas e multi-CNPJs consolidados",
      "Gerente de contas dedicado",
      "Treinamento ao vivo da equipe de vendas",
      "SLA de atendimento contratual 99.9%",
    ],
  },
];

function BillingContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const isExpired = searchParams.get("expired") === "true";

  const [billingCycle, setBillingCycle] = useState<"mensal" | "anual">("mensal");
  const [selectedPlan, setSelectedPlan] = useState<string>("pro");
  const [isProcessing, setIsProcessing] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const isAnnual = billingCycle === "anual";

  const handleCheckout = (planId: string) => {
    setSelectedPlan(planId);
    setIsProcessing(true);

    setTimeout(() => {
      setIsProcessing(false);
      // Remove o cookie de demo expirado se houver
      document.cookie = "acelera_demo_expired=; path=/; max-age=0;";
      document.cookie = "acelera_subscription_status=active; path=/; max-age=86400;";
      setSuccessMessage("Assinatura ativada com sucesso! Redirecionando para o CRM...");

      setTimeout(() => {
        router.push("/leads");
      }, 1200);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-[#f4f4f5] p-4 sm:p-8 lg:p-12">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Cabeçalho Condicional: Paywall Expirado vs Gestão de Faturamento */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          {isExpired ? (
            <div className="space-y-2 animate-in fade-in slide-in-from-top-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-red-500/30 bg-red-950/40 px-3.5 py-1 text-xs font-bold text-red-400">
                <AlertCircle className="h-4 w-4" />
                <span>Período de Testes Expirado</span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
                Seu período de teste grátis chegou ao fim
              </h1>
              <p className="text-xs sm:text-sm text-zinc-400">
                Para continuar recebendo leads na roleta e acelerando suas vendas sem interrupções, selecione seu plano abaixo.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-orange-500/30 bg-orange-950/40 px-3.5 py-1 text-xs font-bold text-orange-400">
                <Sparkles className="h-4 w-4" />
                <span>Gestão de Planos & Assinatura</span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
                Escolha o plano ideal para a sua concessionária
              </h1>
              <p className="text-xs sm:text-sm text-zinc-400">
                Aumente a capacidade da sua equipe e acelere a conversão de leads com ferramentas profissionais.
              </p>
            </div>
          )}

          {/* Toggle Mensal / Anual */}
          <div className="pt-4 flex items-center justify-center">
            <div className="relative inline-flex items-center rounded-full bg-zinc-900 p-1 border border-white/10 shadow-inner">
              <button
                type="button"
                onClick={() => setBillingCycle("mensal")}
                className={cn(
                  "px-5 py-2 text-xs sm:text-sm font-semibold rounded-full transition-all",
                  !isAnnual
                    ? "bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-md"
                    : "text-zinc-400 hover:text-white"
                )}
              >
                Mensal
              </button>
              <button
                type="button"
                onClick={() => setBillingCycle("anual")}
                className={cn(
                  "px-5 py-2 text-xs sm:text-sm font-semibold rounded-full transition-all flex items-center gap-1.5",
                  isAnnual
                    ? "bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-md"
                    : "text-zinc-400 hover:text-white"
                )}
              >
                <span>Anual</span>
                <span className="rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold uppercase">
                  2 Meses Grátis
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Feedback de Sucesso */}
        {successMessage && (
          <div
            role="status"
            className="flex items-center justify-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-950/50 p-4 text-sm font-semibold text-emerald-300 shadow-xl"
          >
            <Zap className="h-5 w-5 text-emerald-400 animate-bounce" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Grade de Planos */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {plans.map((plan) => {
            const price = isAnnual ? plan.annualPrice : plan.monthlyPrice;

            return (
              <div
                key={plan.id}
                className={cn(
                  "relative flex flex-col justify-between rounded-3xl p-6 sm:p-8 transition-all duration-300",
                  plan.popular
                    ? "border-2 border-orange-500 bg-gradient-to-b from-orange-950/30 via-[#131118] to-[#09090b] shadow-2xl shadow-orange-950/40 scale-[1.02]"
                    : "border border-white/10 bg-[#121218]/80 hover:border-white/20"
                )}
              >
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-orange-500 to-red-600 px-3.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-white shadow-md">
                    {plan.badge}
                  </div>
                )}

                <div>
                  <h3 className="text-lg font-bold text-white">{plan.name}</h3>
                  <p className="mt-1 text-xs text-zinc-400 min-h-[32px]">{plan.description}</p>

                  {/* Capacidade */}
                  <div className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-white/5 px-2.5 py-1 text-[11px] font-semibold text-orange-300 border border-orange-500/20">
                    <Zap className="h-3.5 w-3.5 text-orange-400" />
                    <span>{plan.sellersLimit}</span>
                  </div>

                  {/* Preço */}
                  <div className="mt-6">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl sm:text-4xl font-black text-white">
                        R$ {price.toLocaleString("pt-BR")}
                      </span>
                      <span className="text-xs text-zinc-400">
                        {isAnnual ? "/ano" : "/mês"}
                      </span>
                    </div>
                    {isAnnual && (
                      <p className="mt-1 text-[11px] font-medium text-emerald-400">
                        Equivale a R$ {Math.round(price / 12).toLocaleString("pt-BR")}/mês
                      </p>
                    )}
                  </div>

                  {/* Benefícios */}
                  <ul className="mt-6 space-y-3 text-xs text-zinc-300">
                    {plan.features.map((feat, idx) => (
                      <li key={idx} className="flex items-start gap-2.5">
                        <Check className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Ação de Contratação */}
                <div className="mt-8 pt-6 border-t border-white/10 space-y-3">
                  <Button
                    type="button"
                    onClick={() => handleCheckout(plan.id)}
                    disabled={isProcessing}
                    className={cn(
                      "w-full h-11 text-xs sm:text-sm font-bold gap-2 shadow-lg transition-all",
                      plan.popular
                        ? "bg-gradient-to-r from-orange-500 via-orange-600 to-red-600 text-white hover:from-orange-600 hover:to-red-700 shadow-orange-500/25"
                        : "bg-white/10 hover:bg-white/15 text-white"
                    )}
                  >
                    <span>
                      {isProcessing && selectedPlan === plan.id
                        ? "Processando..."
                        : `Ativar ${plan.name}`}
                    </span>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                  <p className="text-center text-[10px] text-zinc-500 flex items-center justify-center gap-1">
                    <Lock className="h-3 w-3" />
                    <span>Pagamento Seguro Asaas (Pix ou Cartão)</span>
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Garantia & Segurança */}
        <div className="rounded-2xl border border-white/10 bg-[#121218]/50 p-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">Garantia Incondicional de 7 Dias</p>
              <p className="text-xs text-zinc-400">
                Se o Acelera Auto CRM não aumentar sua velocidade de atendimento, devolvemos 100% do seu investimento.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <CreditCard className="h-4 w-4 text-zinc-400" />
            <span>Cartão de Crédito</span>
            <span className="text-zinc-600">•</span>
            <QrCode className="h-4 w-4 text-emerald-400" />
            <span className="text-emerald-400 font-semibold">Pix Instantâneo</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BillingPage() {
  return (
    <Suspense fallback={<div className="p-8 text-zinc-400 text-xs">Carregando planos...</div>}>
      <BillingContent />
    </Suspense>
  );
}
