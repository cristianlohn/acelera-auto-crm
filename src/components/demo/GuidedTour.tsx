/**
 * @file GuidedTour.tsx
 * @description Tour Guiado Interativo da Demonstração do Acelera Auto CRM.
 *
 * Transforma a demo em um "vendedor automático" com 6 passos práticos:
 * 1. Dashboard & Cockpit do Gestor
 * 2. Funil Kanban & Semáforo de SLA
 * 3. Detalhes do Lead & WhatsApp 1-Clique
 * 4. Pátio & Giro de Estoque
 * 5. Relatórios & ROI por Canal
 * 6. CTA Final de Conversão ("Quero colocar minha revenda no Acelera")
 */

"use client";

import React, { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  Sparkles,
  ChevronRight,
  ChevronLeft,
  X,
  LayoutDashboard,
  Clock,
  MessageCircle,
  Car,
  BarChart3,
  Rocket,
  CheckCircle2,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDemoRole } from "@/context/demo-role-context";
import { cn } from "@/lib/utils";

export interface TourStep {
  id: number;
  title: string;
  badge: string;
  description: string;
  targetPath: string;
  icon: React.ComponentType<{ className?: string }>;
  highlightText: string;
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: 1,
    title: "Cockpit do Gestor: Quem está deixando dinheiro na mesa?",
    badge: "Passo 1 de 6 • Gestão Ativa",
    description:
      "Aqui o gestor identifica imediatamente se a equipe está deixando leads sem atendimento, propostas sem follow-up e oportunidades esfriando.",
    targetPath: "/leads",
    icon: LayoutDashboard,
    highlightText: "Identifique gargalos antes que o cliente vá para o concorrente.",
  },
  {
    id: 2,
    title: "Funil Kanban & Semáforos de SLA",
    badge: "Passo 2 de 6 • Tempo de Resposta",
    description:
      "Observe o semáforo de SLA em tempo real: 🟢 Verde (<15m), 🟠 Laranja (15-60m) e 🔴 Vermelho (>60m). Alertas visuais garantem agilidade máxima.",
    targetPath: "/leads",
    icon: Clock,
    highlightText: "Lead entrou → vendedor precisa agir → oportunidade não é esquecida.",
  },
  {
    id: 3,
    title: "Atendimento WhatsApp em 1 Clique",
    badge: "Passo 3 de 6 • Conversão Rápida",
    description:
      "Abra o lead, veja o histórico do cliente e o carro de interesse, e inicie o atendimento no WhatsApp sem precisar salvar o número na agenda.",
    targetPath: "/leads",
    icon: MessageCircle,
    highlightText: "Mensagens pré-formatadas com o nome do cliente e modelo.",
  },
  {
    id: 4,
    title: "Gestão de Pátio & Giro de Estoque",
    badge: "Passo 4 de 6 • Pátio Inteligente",
    description:
      "Monitore quais carros estão com maior tempo de pátio e copie a ficha técnica completa formatada com emojis para redes sociais e WhatsApp.",
    targetPath: "/vehicles",
    icon: Car,
    highlightText: "Cópia ágil de ficha técnica e controle de estoque em tempo real.",
  },
  {
    id: 5,
    title: "Relatórios de ROI por Canal",
    badge: "Passo 5 de 6 • Decisão Matemática",
    description:
      "Descubra quais canais (Instagram, Webmotors, WhatsApp, Site) trazem o melhor retorno e quais vendedores possuem as maiores taxas de conversão.",
    targetPath: "/reports",
    icon: BarChart3,
    highlightText: "Elimine investimentos em portais que não trazem fechamentos.",
  },
  {
    id: 6,
    title: "Pronto para acelerar sua revenda?",
    badge: "Passo 6 de 6 • Ativação Imediata",
    description:
      "Não acredite apenas em palavras. Coloque o Acelera Auto CRM para rodar na sua loja em menos de 2 minutos com teste grátis de 14 dias.",
    targetPath: "/cadastro",
    icon: Rocket,
    highlightText: "Setup instantâneo • Sem cartão de crédito • Suporte dedicado",
  },
];

const emptySubscribe = () => () => {};

export function GuidedTour() {
  const { isDemoMode } = useDemoRole();
  const router = useRouter();
  const pathname = usePathname();

  const mounted = React.useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [isOpen, setIsOpen] = useState<boolean>(true);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);

  const step = TOUR_STEPS[currentStepIndex];
  const isLastStep = currentStepIndex === TOUR_STEPS.length - 1;

  const goToStep = (index: number) => {
    if (index >= 0 && index < TOUR_STEPS.length) {
      setCurrentStepIndex(index);
      const nextStep = TOUR_STEPS[index];
      if (nextStep.targetPath && pathname !== nextStep.targetPath) {
        router.push(nextStep.targetPath);
      }
    }
  };

  const handleNext = () => {
    if (isLastStep) {
      router.push("/cadastro");
    } else {
      goToStep(currentStepIndex + 1);
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      goToStep(currentStepIndex - 1);
    }
  };

  const handleRestart = () => {
    goToStep(0);
    setIsMinimized(false);
    setIsOpen(true);
  };

  // Se não estiver montado, não estiver em modo demo ou foi fechado permanentemente
  if (!mounted || !isDemoMode || !isOpen) {
    return null;
  }

  // Visual Minimizado (Pílula discreta no canto inferior)
  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
        <button
          id="btn-reopen-tour"
          onClick={() => setIsMinimized(false)}
          className="flex items-center gap-2 rounded-full border border-orange-500/40 bg-zinc-900/90 px-3.5 py-2 text-xs font-semibold text-white shadow-2xl backdrop-blur-md hover:bg-orange-600/20 hover:border-orange-500 transition-all hover:scale-105"
          aria-label="Reabrir Tour Guiado da Demonstração"
        >
          <span className="flex h-2 w-2 rounded-full bg-orange-500 animate-ping" />
          <Sparkles className="h-3.5 w-3.5 text-orange-400" />
          <span>Tour Guiado ({currentStepIndex + 1}/6)</span>
        </button>
      </div>
    );
  }

  const IconComponent = step.icon;

  return (
    <div
      id="guided-demo-tour"
      role="dialog"
      aria-label="Tour Guiado da Demonstração"
      className="fixed bottom-4 right-4 z-50 w-full max-w-[360px] sm:max-w-md animate-in fade-in slide-in-from-bottom-4 duration-300"
    >
      <div className="overflow-hidden rounded-2xl border border-orange-500/30 bg-[#121216]/95 p-5 shadow-2xl shadow-black/80 backdrop-blur-xl ring-1 ring-white/10">
        {/* Header do Card */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-red-600 text-white shadow-lg shadow-orange-500/30">
              <IconComponent className="h-4 w-4" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-orange-400">
                {step.badge}
              </span>
              <h3 className="text-sm font-bold text-white leading-snug">
                {step.title}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {currentStepIndex > 0 && (
              <button
                id="btn-restart-tour"
                onClick={handleRestart}
                className="rounded-lg p-1 text-zinc-400 hover:bg-white/10 hover:text-white transition"
                title="Reiniciar tour"
                aria-label="Reiniciar tour"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            )}
            <button
              id="btn-minimize-tour"
              onClick={() => setIsMinimized(true)}
              className="rounded-lg p-1 text-zinc-400 hover:bg-white/10 hover:text-white transition"
              title="Minimizar tour"
              aria-label="Minimizar tour"
            >
              <span className="text-xs">─</span>
            </button>
            <button
              id="btn-close-tour"
              onClick={() => setIsOpen(false)}
              className="rounded-lg p-1 text-zinc-400 hover:bg-white/10 hover:text-white transition"
              title="Fechar tour"
              aria-label="Fechar tour"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Descrição e Ponto de Destaque */}
        <div className="mt-3 space-y-2">
          <p className="text-xs text-zinc-300 leading-relaxed">
            {step.description}
          </p>

          <div className="flex items-center gap-1.5 rounded-lg border border-orange-500/20 bg-orange-500/10 px-2.5 py-1.5 text-[11px] font-medium text-orange-300">
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-orange-400" />
            <span className="truncate">{step.highlightText}</span>
          </div>
        </div>

        {/* Progresso com bolinhas interativas */}
        <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3">
          <div className="flex items-center gap-1.5">
            {TOUR_STEPS.map((s, idx) => (
              <button
                key={s.id}
                onClick={() => goToStep(idx)}
                className={cn(
                  "h-2 rounded-full transition-all",
                  idx === currentStepIndex
                    ? "w-6 bg-orange-500"
                    : idx < currentStepIndex
                    ? "w-2 bg-emerald-500"
                    : "w-2 bg-zinc-700 hover:bg-zinc-500"
                )}
                aria-label={`Ir para passo ${idx + 1}`}
              />
            ))}
          </div>

          {/* Botões de Ação */}
          <div className="flex items-center gap-2">
            {currentStepIndex > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handlePrev}
                className="h-8 px-2 text-xs text-zinc-400 hover:text-white"
                aria-label="Passo anterior"
              >
                <ChevronLeft className="h-3.5 w-3.5 mr-0.5" />
                <span>Voltar</span>
              </Button>
            )}

            {isLastStep ? (
              <Link href="/cadastro">
                <Button
                  size="sm"
                  id="btn-tour-finish-cta"
                  className="h-8 gap-1.5 bg-gradient-to-r from-orange-500 via-orange-600 to-red-600 px-3 text-xs font-bold text-white shadow-lg shadow-orange-500/30 hover:scale-105 transition-all"
                >
                  <span>Quero colocar minha revenda</span>
                  <Rocket className="h-3.5 w-3.5" />
                </Button>
              </Link>
            ) : (
              <Button
                size="sm"
                id="btn-tour-next"
                onClick={handleNext}
                className="h-8 gap-1 bg-orange-500 hover:bg-orange-600 px-3 text-xs font-bold text-white shadow-md shadow-orange-500/20"
                aria-label="Próximo passo"
              >
                <span>Próximo</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
