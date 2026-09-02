/**
 * @file page.tsx
 * @description Tela de Planos, Assinatura e Paywall (BillingPage).
 *
 * Funcionalidades:
 * - Paywall estrito quando o período de teste expirou (`expired=true`).
 * - Escolha de ciclo de faturamento (Mensal / Anual com 2 meses grátis).
 * - Seleção de plano (Starter R$ 297, Pro R$ 597, Enterprise R$ 1297).
 * - Modal de Checkout seguro com seleção fiscal (CPF/CNPJ) e emissão via Asaas.
 * - Ambiente seguro e ativação imediata via gateway Asaas.
 */

"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
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
import { BillingCheckoutDialog } from "@/components/billing/billing-checkout-dialog";
import { SubscriptionManagementCard } from "@/components/billing/subscription-management-card";
import { cn } from "@/lib/utils";
import { useDemoRole } from "@/context/demo-role-context";
import { normalizeRole, canManageIntegrationsAndBilling } from "@/lib/permissions";
import {
  getBillingInitialDataAction,
  getSubscriptionOverviewAction,
  type SubscriptionOverviewData,
} from "@/app/actions/billing-actions";

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
    description: "Para lojas e revendas de entrada",
    monthlyPrice: 297,
    annualPrice: 2970,
    sellersLimit: "Até 3 vendedores inclusos",
    features: [
      "Roleta Comercial com distribuição justa (Round-Robin)",
      "Controle de plantão dos vendedores (Ligar / Pausar)",
      "Funil Kanban de Vendas com cronômetro de SLA",
      "Contato com o lead via WhatsApp em 1 clique",
      "Chave de API para ingestão automática de leads externos",
      "Gestão da carteira de clientes e estoque da loja",
      "Suporte via WhatsApp",
    ],
  },
  {
    id: "pro",
    name: "Plano Pro",
    popular: true,
    badge: "Mais Popular",
    description: "Para concessionárias e lojas em expansão",
    monthlyPrice: 597,
    annualPrice: 5970,
    sellersLimit: "Até 8 vendedores inclusos",
    features: [
      "Todos os recursos do Plano Starter +",
      "Roleta com especialização por segmento (Novos e Seminovos)",
      "Cockpit do Gestor com auditoria de tempo de resposta da equipe",
      "Isolamento total de permissões (Visão Gestor vs. Vendedor)",
      "Múltiplas Chaves de API para diferentes canais de captação",
      "Suporte prioritário via WhatsApp",
    ],
  },
  {
    id: "enterprise",
    name: "Plano Enterprise",
    description: "Para grandes concessionárias e redes",
    monthlyPrice: 1297,
    annualPrice: 12970,
    sellersLimit: "Vendedores ilimitados",
    features: [
      "Todos os recursos do Plano Pro +",
      "Vendedores e usuários ilimitados na roleta",
      "Distribuição avançada por múltiplos pátios e filiais",
      "Gerente de conta dedicado e SLA garantido",
      "Integração customizada via Webhook & REST API",
      "Treinamento individual para toda a equipe comercial",
    ],
  },
];

function BillingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isExpired = searchParams.get("expired") === "true";
  const isBlocked = searchParams.get("status") === "blocked";
  const { role, isDemoMode } = useDemoRole();
  const effectiveRole = normalizeRole(role);
  const canManageBilling = canManageIntegrationsAndBilling(effectiveRole);

  const [billingCycle, setBillingCycle] = useState<"mensal" | "anual">("mensal");
  const [isCheckoutDialogOpen, setIsCheckoutDialogOpen] = useState(false);
  const [selectedPlanDetails, setSelectedPlanDetails] = useState<{
    id: string;
    name: string;
    price: number;
  } | null>(null);
  const [initialBillingData, setInitialBillingData] = useState<{
    name?: string;
    email?: string;
    phone?: string;
    document?: string;
    documentType?: "CPF" | "CNPJ";
  } | undefined>(undefined);
  const [subscriptionOverview, setSubscriptionOverview] = useState<SubscriptionOverviewData | null>(null);

  // Redirecionamento amigável de usuários não autorizados (ex: sellers, members) para o Cockpit
  useEffect(() => {
    if (!isDemoMode && !canManageBilling) {
      router.replace("/dashboard?error=unauthorized_billing");
    }
  }, [isDemoMode, canManageBilling, router]);

  useEffect(() => {
    let isMounted = true;
    getBillingInitialDataAction().then((res) => {
      if (isMounted && res.success && res.data) {
        setInitialBillingData(res.data);
      }
    });

    getSubscriptionOverviewAction().then((res) => {
      if (isMounted && res.success && res.data) {
        setSubscriptionOverview(res.data);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const isAnnual = billingCycle === "anual";

  if (!isDemoMode && !canManageBilling) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#09090b] p-6 text-center text-[#f4f4f5]">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 mb-4">
          <Lock className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-bold text-white">Acesso Restrito</h2>
        <p className="mt-2 max-w-md text-sm text-zinc-400">
          A gestão de planos, faturamento e assinaturas é exclusiva para Administradores e Proprietários da concessionária.
        </p>
        <div className="mt-6 flex gap-3">
          <Button asChild className="bg-orange-500 hover:bg-orange-600 text-white">
            <Link href="/dashboard">Voltar para o Cockpit</Link>
          </Button>
        </div>
      </div>
    );
  }

  const handleOpenCheckout = (planId: string) => {
    const plan = plans.find((p) => p.id === planId) || plans[1];
    setSelectedPlanDetails({
      id: plan.id,
      name: plan.name,
      price: isAnnual ? plan.annualPrice : plan.monthlyPrice,
    });
    setIsCheckoutDialogOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-[#f4f4f5] p-4 sm:p-8 lg:p-12">
      {selectedPlanDetails && (
        <BillingCheckoutDialog
          open={isCheckoutDialogOpen}
          onOpenChange={setIsCheckoutDialogOpen}
          planId={selectedPlanDetails.id}
          planName={selectedPlanDetails.name}
          planPrice={selectedPlanDetails.price}
          billingCycle={billingCycle}
          initialData={initialBillingData}
        />
      )}
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Alerta de Acesso Bloqueado / Suspenso */}
        {isBlocked && (
          <div
            data-testid="billing-blocked-alert"
            className="rounded-xl border border-red-500/40 bg-gradient-to-r from-red-950/80 via-red-900/40 to-red-950/70 p-4 text-center text-red-200 shadow-lg shadow-red-950/30 animate-in fade-in slide-in-from-top-3 max-w-3xl mx-auto"
          >
            <div className="flex items-center justify-center gap-2 font-bold text-red-400 mb-1">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <span>Acesso Suspenso</span>
            </div>
            <p className="text-xs sm:text-sm text-red-200/90 font-medium">
              Seu acesso aos recursos do CRM está suspenso temporariamente. Regularize sua fatura abaixo para liberar a operação imediatamente.
            </p>
          </div>
        )}

        {/* Cockpit de Gestão de Assinatura Ativa / Trial / Vencida */}
        {subscriptionOverview &&
          (subscriptionOverview.status === "active" ||
            subscriptionOverview.status === "trialing" ||
            subscriptionOverview.status === "overdue") && (
            <SubscriptionManagementCard
              subscription={subscriptionOverview}
              onChangePlan={() => {
                document.getElementById("plans-section")?.scrollIntoView({ behavior: "smooth" });
              }}
              onPayOverdue={() => handleOpenCheckout(subscriptionOverview.planId)}
            />
          )}

        {/* Cabeçalho Condicional: Paywall Expirado vs Gestão de Faturamento */}
        <div id="plans-section" className="text-center max-w-3xl mx-auto space-y-3">
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
                    onClick={() => handleOpenCheckout(plan.id)}
                    data-testid={plan.id === "pro" ? "subscribe-pro-btn" : `btn-subscribe-${plan.id}`}
                    className={cn(
                      "w-full h-11 text-xs sm:text-sm font-bold gap-2 shadow-lg transition-all",
                      plan.popular
                        ? "bg-gradient-to-r from-orange-500 via-orange-600 to-red-600 text-white hover:from-orange-600 hover:to-red-700 shadow-orange-500/25"
                        : "bg-white/10 hover:bg-white/15 text-white"
                    )}
                  >
                    <span>{`Assinar ${plan.name}`}</span>
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

        {/* Ambiente Seguro & Métodos de Pagamento */}
        <div className="rounded-2xl border border-white/10 bg-[#121218]/50 p-5 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-400 border border-orange-500/20">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">
                Ambiente Seguro • Ativação Imediata via Pix ou Cartão de Crédito
              </p>
              <p className="text-xs text-zinc-400">
                Faturamento transparente e liberação instantânea de todos os recursos processados via gateway Asaas.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 text-xs text-zinc-300 bg-white/5 border border-white/10 px-4 py-2 rounded-xl shrink-0">
            <div className="flex items-center gap-1.5">
              <CreditCard className="h-4 w-4 text-orange-400" />
              <span>Cartão de Crédito</span>
            </div>
            <span className="text-zinc-600">•</span>
            <div className="flex items-center gap-1.5 text-emerald-400">
              <QrCode className="h-4 w-4" />
              <span className="font-semibold">Pix Instantâneo</span>
            </div>
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
