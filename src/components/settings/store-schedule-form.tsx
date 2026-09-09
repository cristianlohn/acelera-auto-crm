/**
 * @file store-schedule-form.tsx
 * @description Formulário interativo de configuração dos horários de atendimento da loja e regras de contagem de SLA.
 */

"use client";

import React, { useState, useTransition } from "react";
import {
  Clock,
  Save,
  CheckCircle2,
  Calendar,
  AlertTriangle,
  Flame,
  Moon,
  Zap,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  StoreBusinessHours,
  DEFAULT_AUTOMOTIVE_SCHEDULE,
  WeekdayKey,
  WEEKDAY_LABELS,
} from "@/types/business-hours";
import { saveBusinessHoursAction } from "@/app/actions/business-hours";

export interface StoreScheduleFormProps {
  initialBusinessHours?: StoreBusinessHours | null;
  organizationId?: string;
  isDemo?: boolean;
}

const ORDERED_DAYS: WeekdayKey[] = [1, 2, 3, 4, 5, 6, 0]; // Seg a Dom

export function StoreScheduleForm({
  initialBusinessHours,
  organizationId,
  isDemo = false,
}: StoreScheduleFormProps) {
  const [businessHours, setBusinessHours] = useState<StoreBusinessHours>(() => {
    if (initialBusinessHours?.schedule) {
      return initialBusinessHours;
    }
    return DEFAULT_AUTOMOTIVE_SCHEDULE;
  });

  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleToggleSlaMode = () => {
    setBusinessHours((prev) => ({
      ...prev,
      slaMode: prev.slaMode === "business_hours" ? "continuous" : "business_hours",
    }));
  };

  const handleToggleDay = (day: WeekdayKey) => {
    setBusinessHours((prev) => ({
      ...prev,
      schedule: {
        ...prev.schedule,
        [day]: {
          ...prev.schedule[day],
          isOpen: !prev.schedule[day].isOpen,
        },
      },
    }));
  };

  const handleTimeChange = (
    day: WeekdayKey,
    field: "openTime" | "closeTime",
    value: string
  ) => {
    setBusinessHours((prev) => ({
      ...prev,
      schedule: {
        ...prev.schedule,
        [day]: {
          ...prev.schedule[day],
          [field]: value,
        },
      },
    }));
  };

  const handleSave = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setValidationError(null);

    // Validações de horário para dias abertos
    for (const day of ORDERED_DAYS) {
      const config = businessHours.schedule[day];
      if (config.isOpen) {
        const [openH, openM] = config.openTime.split(":").map(Number);
        const [closeH, closeM] = config.closeTime.split(":").map(Number);
        const openTotal = openH * 60 + openM;
        const closeTotal = closeH * 60 + closeM;

        if (isNaN(openTotal) || isNaN(closeTotal)) {
          setValidationError(`Horário inválido para ${WEEKDAY_LABELS[day].name}.`);
          toast.error(`Horário inválido para ${WEEKDAY_LABELS[day].name}.`);
          return;
        }

        if (closeTotal <= openTotal) {
          const msg = `O horário de fechamento deve ser posterior ao de abertura em ${WEEKDAY_LABELS[day].name}.`;
          setValidationError(msg);
          toast.error(msg);
          return;
        }
      }
    }

    startTransition(async () => {
      if (isDemo) {
        setFeedback("Horários da loja atualizados com sucesso");
        toast.success("Horários da loja atualizados com sucesso");
        setTimeout(() => setFeedback(null), 3500);
        return;
      }

      const res = await saveBusinessHoursAction(organizationId, businessHours);
      if (res.success) {
        setFeedback("Horários da loja atualizados com sucesso");
        toast.success("Horários da loja atualizados com sucesso");
        setTimeout(() => setFeedback(null), 3500);
      } else {
        toast.error(res.error || "Erro ao salvar horários de atendimento.");
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-card p-4 sm:p-5 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/10 text-orange-500">
              <Clock className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">
                Horário de Atendimento & SLA
              </h3>
              <p className="text-xs text-muted-foreground">
                Configure os períodos em que sua concessionária atende e como o SLA deve ser computado.
              </p>
            </div>
          </div>

          {feedback && (
            <div
              role="status"
              className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-400 animate-in fade-in"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>{feedback}</span>
            </div>
          )}
        </div>

        {/* Master Switch: SLA Inteligente vs Contínuo */}
        <div className="rounded-xl border border-border/80 bg-muted/20 p-4 transition-all hover:border-orange-500/30">
          <div className="flex items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-foreground">
                  Pausar SLA fora do horário comercial
                </span>
                {businessHours.slaMode === "business_hours" ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                    <Moon className="h-3 w-3" />
                    Pausa Noturna & Domingo Ativa
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-400">
                    <Zap className="h-3 w-3" />
                    Modo 24/7 Contínuo
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed max-w-2xl">
                Quando ativado, os minutos de espera dos leads só contam durante o horário de expediente cadastrado. Leads recebidos à noite ou no domingo não estouram o SLA até a abertura da loja.
              </p>
            </div>

            <button
              id="switch-sla-mode"
              type="button"
              role="switch"
              aria-checked={businessHours.slaMode === "business_hours"}
              onClick={handleToggleSlaMode}
              className={cn(
                "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500",
                businessHours.slaMode === "business_hours" ? "bg-orange-500" : "bg-zinc-700"
              )}
              aria-label="Pausar SLA fora do horário comercial"
            >
              <span
                className={cn(
                  "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out",
                  businessHours.slaMode === "business_hours" ? "translate-x-5" : "translate-x-0"
                )}
              />
            </button>
          </div>
        </div>

        {/* Grade Semanal de Horários (Seg a Dom) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-orange-400" />
              Grade Semanal de Funcionamento
            </h4>
            <span className="text-[11px] text-muted-foreground">
              Formato de 24 horas (HH:mm)
            </span>
          </div>

          <div className="divide-y divide-border/60 rounded-xl border bg-background/50 overflow-hidden">
            {ORDERED_DAYS.map((day) => {
              const dayConfig = businessHours.schedule[day];
              const isWeekend = day === 6 || day === 0;
              const isFeirao = isWeekend && dayConfig.isOpen;

              return (
                <div
                  key={day}
                  id={`schedule-row-${day}`}
                  className={cn(
                    "flex flex-col sm:flex-row sm:items-center justify-between p-3 gap-3 transition-colors",
                    dayConfig.isOpen ? "hover:bg-muted/30" : "bg-muted/10 opacity-75"
                  )}
                >
                  <div className="flex items-center gap-3 min-w-[160px]">
                    <button
                      id={`toggle-day-${day}`}
                      type="button"
                      role="switch"
                      aria-checked={dayConfig.isOpen}
                      onClick={() => handleToggleDay(day)}
                      className={cn(
                        "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500",
                        dayConfig.isOpen ? "bg-orange-500" : "bg-zinc-700"
                      )}
                      aria-label={`Ativar funcionamento ${WEEKDAY_LABELS[day].name}`}
                    >
                      <span
                        className={cn(
                          "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out",
                          dayConfig.isOpen ? "translate-x-4" : "translate-x-0"
                        )}
                      />
                    </button>

                    <div>
                      <span className="text-xs font-semibold text-foreground block">
                        {WEEKDAY_LABELS[day].name}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {dayConfig.isOpen ? "Aberto" : "Fechado"}
                      </span>
                    </div>

                    {isFeirao && (
                      <span
                        data-testid={`badge-feirao-${day}`}
                        className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-orange-500/20 to-red-500/20 border border-orange-500/30 px-2 py-0.5 text-[10px] font-bold text-orange-400"
                      >
                        <Flame className="h-3 w-3 text-orange-500" />
                        Regime de Plantão / Feirão
                      </span>
                    )}
                  </div>

                  {dayConfig.isOpen ? (
                    <div className="flex items-center gap-2 sm:self-auto self-end">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-muted-foreground">Abertura:</span>
                        <Input
                          id={`open-time-${day}`}
                          type="time"
                          value={dayConfig.openTime}
                          onChange={(e) => handleTimeChange(day, "openTime", e.target.value)}
                          className="h-8 w-24 text-xs font-mono px-2 bg-background border-border/80"
                          aria-label={`Horário de abertura ${WEEKDAY_LABELS[day].name}`}
                        />
                      </div>

                      <span className="text-muted-foreground text-xs">até</span>

                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-muted-foreground">Fechamento:</span>
                        <Input
                          id={`close-time-${day}`}
                          type="time"
                          value={dayConfig.closeTime}
                          onChange={(e) => handleTimeChange(day, "closeTime", e.target.value)}
                          className="h-8 w-24 text-xs font-mono px-2 bg-background border-border/80"
                          aria-label={`Horário de fechamento ${WEEKDAY_LABELS[day].name}`}
                        />
                      </div>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground italic sm:self-auto self-end">
                      Sem expediente comercial
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {validationError && (
          <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{validationError}</span>
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t">
          <p className="text-[11px] text-muted-foreground flex items-center gap-1">
            <Info className="h-3.5 w-3.5 text-orange-400" />
            Alterações impactam imediatamente o cálculo de SLA no Kanban e no Cockpit do Gestor.
          </p>

          <Button
            id="btn-save-schedule"
            type="button"
            size="sm"
            disabled={isPending}
            onClick={handleSave}
            className="gap-1.5 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-semibold text-xs px-4 h-8 cursor-pointer"
          >
            <Save className="h-3.5 w-3.5" />
            <span>{isPending ? "Salvando Horários..." : "Salvar Horários de Atendimento"}</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
