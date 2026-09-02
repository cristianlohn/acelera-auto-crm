/**
 * @file vehicle-card.tsx
 * @description Card de veículo para o módulo de Gestão de Estoque.
 *
 * Responsabilidades:
 * - Exibir foto, badge de status, preço em BRL e detalhes técnicos.
 * - Botão "Copiar Ficha Técnica" — copia texto formatado para WhatsApp.
 * - Dropdown para alterar o status do veículo.
 */

"use client";

import React, { useState, useCallback } from "react";
import Image from "next/image";
import {
  CheckCircle2,
  Clock,
  XCircle,
  Gauge,
  Calendar,
  CreditCard,
  Copy,
  Check,
  ChevronDown,
  CircleDot,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { formatCurrency, formatKm } from "@/lib/mock-data";
import type { Vehicle, VehicleStatus } from "@/types/crm";

// ---------------------------------------------------------------------------
// Configuração de status
// ---------------------------------------------------------------------------

interface StatusConfig {
  label: string;
  badgeCn: string;
  dotCn: string;
  icon: React.ComponentType<{ className?: string }>;
}

const STATUS_CONFIG: Record<VehicleStatus, StatusConfig> = {
  disponivel: {
    label: "Disponível",
    badgeCn:
      "bg-green-500/90 text-white ring-green-600/30",
    dotCn: "bg-green-400",
    icon: CheckCircle2,
  },
  reservado: {
    label: "Reservado",
    badgeCn:
      "bg-amber-500/90 text-white ring-amber-600/30",
    dotCn: "bg-amber-400",
    icon: Clock,
  },
  vendido: {
    label: "Vendido",
    badgeCn:
      "bg-slate-500/90 text-white ring-slate-600/30",
    dotCn: "bg-slate-400",
    icon: XCircle,
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Gera o texto da ficha técnica formatado para WhatsApp.
 *
 * @param v - Veículo.
 * @returns Texto multilinha pronto para colar no WhatsApp.
 */
function buildTechSheet(v: Vehicle): string {
  return [
    `🚗 *${v.make} ${v.model} — ${v.version}*`,
    `📅 Ano: ${v.yearFab}/${v.yearModel}`,
    `🔢 Placa: *${v.plate}*`,
    `📏 KM: ${formatKm(v.km)}`,
    `💰 Preço: *${formatCurrency(v.price)}*`,
    `📌 Status: ${STATUS_CONFIG[v.status].label}`,
    "",
    "_Aceito troca e financiamento. Entre em contato para mais detalhes!_ 😊",
  ].join("\n");
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface VehicleCardProps {
  /** Veículo a exibir. */
  vehicle: Vehicle;
  /** Callback chamado quando o status for alterado pelo dropdown. */
  onStatusChange: (id: string, status: VehicleStatus) => void;
}

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------

export function VehicleCard({ vehicle: v, onStatusChange }: VehicleCardProps) {
  const [copied, setCopied] = useState(false);
  const [imgError, setImgError] = useState(false);

  const cfg = STATUS_CONFIG[v.status];

  /** Copia a ficha técnica para a área de transferência. */
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(buildTechSheet(v));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback silencioso — sem toast por ora
    }
  }, [v]);

  return (
    <article
      className="group relative flex flex-col overflow-hidden rounded-xl border bg-card shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
      aria-label={`${v.make} ${v.model} ${v.yearFab}`}
    >
      {/* ----------------------------------------------------------------- */}
      {/* Imagem                                                              */}
      {/* ----------------------------------------------------------------- */}
      <div className="relative aspect-video w-full overflow-hidden bg-muted">
        {!imgError && v.imageUrl ? (
          <Image
            src={v.imageUrl}
            alt={`${v.make} ${v.model}`}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            onError={() => setImgError(true)}
          />
        ) : (
          /* Fallback quando a imagem falha ou não foi informada */
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-muted to-muted/50">
            <span className="text-4xl opacity-30">🚗</span>
          </div>
        )}

        {/* Badge de status flutuante */}
        <span
          className={cn(
            "absolute top-2 left-2 flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 backdrop-blur-sm",
            cfg.badgeCn
          )}
        >
          <span className={cn("h-1.5 w-1.5 animate-pulse rounded-full", cfg.dotCn)} />
          {cfg.label}
        </span>

        {/* Badge de Giro de Estoque */}
        {v.daysInStock !== undefined && (
          <span
            className={cn(
              "absolute top-2 right-2 flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ring-1 backdrop-blur-md",
              v.daysInStock > 45
                ? "bg-red-500/90 text-white ring-red-400/50 shadow-sm animate-pulse"
                : v.daysInStock > 15
                ? "bg-amber-500/80 text-white ring-amber-400/50 shadow-sm"
                : "bg-emerald-600/80 text-white ring-emerald-400/50 shadow-sm"
            )}
            title={v.daysInStock > 45 ? "Alerta de Giro de Estoque: veículo parado há mais de 45 dias" : "Dias em pátio"}
          >
            {v.daysInStock > 45 ? `⚠️ ${v.daysInStock}d (Giro)` : `${v.daysInStock}d pátio`}
          </span>
        )}

        {/* Gradiente inferior para legibilidade */}
        <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/40 to-transparent" />
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Corpo do card                                                       */}
      {/* ----------------------------------------------------------------- */}
      <div className="flex flex-1 flex-col gap-3 p-4">
        {/* Nome + Versão */}
        <div>
          <h3 className="truncate text-sm font-bold text-foreground">
            {v.make} {v.model}
          </h3>
          <p className="truncate text-xs text-muted-foreground">{v.version}</p>
        </div>

        {/* Preço em destaque + FIPE & Margem */}
        <div className="space-y-1">
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-xl font-extrabold tracking-tight text-foreground">
              {formatCurrency(v.price)}
            </p>
            {v.fipePrice && (
              <span className="text-[11px] font-medium text-muted-foreground" title={`FIPE: ${formatCurrency(v.fipePrice)}`}>
                FIPE: {formatCurrency(v.fipePrice)}
              </span>
            )}
          </div>
          {v.estimatedMargin !== undefined && (
            <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
              Margem Est.: {formatCurrency(v.estimatedMargin)}
            </p>
          )}
        </div>

        {/* Detalhes rápidos */}
        <div className="grid grid-cols-3 gap-2">
          <div className="flex flex-col items-center gap-0.5 rounded-lg bg-muted/60 px-2 py-1.5">
            <Calendar className="h-3.5 w-3.5 text-orange-500" />
            <span className="text-[10px] font-semibold text-foreground">
              {v.yearFab}/{v.yearModel}
            </span>
            <span className="text-[9px] text-muted-foreground">Ano Fab/Mod</span>
          </div>
          <div className="flex flex-col items-center gap-0.5 rounded-lg bg-muted/60 px-2 py-1.5">
            <Gauge className="h-3.5 w-3.5 text-blue-500" />
            <span className="text-[10px] font-semibold text-foreground">
              {formatKm(v.km)}
            </span>
            <span className="text-[9px] text-muted-foreground">Quilômetros</span>
          </div>
          <div className="flex flex-col items-center gap-0.5 rounded-lg bg-muted/60 px-2 py-1.5">
            <CreditCard className="h-3.5 w-3.5 text-violet-500" />
            <span className="text-[10px] font-semibold text-foreground">
              ...{v.plate.slice(-3)}
            </span>
            <span className="text-[9px] text-muted-foreground">Final placa</span>
          </div>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Ações                                                              */}
        {/* ---------------------------------------------------------------- */}
        <div className="flex gap-2 pt-1">
          {/* Copiar ficha técnica */}
          <Button
            id={`copy-${v.id}`}
            variant="outline"
            size="sm"
            className="flex-1 gap-1.5 text-xs"
            onClick={handleCopy}
            aria-label="Copiar ficha técnica para WhatsApp"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-green-500" />
                Copiado!
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                Copiar Ficha
              </>
            )}
          </Button>

          {/* Dropdown de status */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                id={`status-${v.id}`}
                variant="outline"
                size="sm"
                className="gap-1 px-2.5 text-xs"
                aria-label="Alterar status do veículo"
              >
                <CircleDot className="h-3.5 w-3.5" />
                Status
                <ChevronDown className="h-3 w-3 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[160px]">
              <DropdownMenuLabel className="text-xs">
                Alterar status
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {(
                [
                  "disponivel",
                  "reservado",
                  "vendido",
                ] as VehicleStatus[]
              ).map((s) => {
                const sCfg = STATUS_CONFIG[s];
                const Icon = sCfg.icon;
                return (
                  <DropdownMenuItem
                    key={s}
                    id={`status-${v.id}-${s}`}
                    className={cn(
                      "gap-2 text-xs",
                      v.status === s && "font-semibold"
                    )}
                    onSelect={() => onStatusChange(v.id, s)}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {sCfg.label}
                    {v.status === s && (
                      <Check className="ml-auto h-3 w-3 text-orange-500" />
                    )}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </article>
  );
}
