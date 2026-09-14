/**
 * @file acquisition-metrics-card.tsx
 * @description Card executivo do Super Admin para exibição de métricas de aquisição de revendas (Instagram, UTMs e Direto).
 */

"use client";

import React from "react";
import {
  Compass,
  Globe,
  Share2,
  Sparkles,
  Search,
} from "lucide-react";
import { type AcquisitionSummaryMetrics } from "@/lib/superadmin-data";
import { cn } from "@/lib/utils";

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg className={cn("fill-current", className)} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
    </svg>
  );
}

interface AcquisitionMetricsCardProps {
  metrics?: AcquisitionSummaryMetrics;
  className?: string;
}

export function AcquisitionMetricsCard({
  metrics,
  className,
}: AcquisitionMetricsCardProps) {
  if (!metrics || metrics.total === 0) {
    return null;
  }

  const instagramPercent =
    metrics.total > 0
      ? Math.round((metrics.instagramTotal / metrics.total) * 100)
      : 0;

  const getChannelIcon = (channel: string) => {
    switch (channel.toLowerCase()) {
      case "instagram":
        return <InstagramIcon className="h-4 w-4 text-pink-500" />;
      case "direct":
        return <Globe className="h-4 w-4 text-slate-400" />;
      case "google":
        return <Search className="h-4 w-4 text-blue-500" />;
      default:
        return <Share2 className="h-4 w-4 text-amber-500" />;
    }
  };

  const getChannelBarColor = (channel: string) => {
    switch (channel.toLowerCase()) {
      case "instagram":
        return "bg-gradient-to-r from-pink-500 to-purple-600";
      case "direct":
        return "bg-slate-400 dark:bg-slate-500";
      case "google":
        return "bg-blue-500";
      default:
        return "bg-amber-500";
    }
  };

  return (
    <div
      data-testid="acquisition-metrics-card"
      className={cn(
        "rounded-xl border bg-card p-4 shadow-sm transition-all duration-200 sm:p-5",
        className
      )}
    >
      {/* Cabeçalho */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between border-b pb-3.5">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-pink-500/10 border border-pink-500/20 text-pink-500">
            <Compass className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-foreground sm:text-base">
              Origem das Revendas (Canais de Aquisição)
            </h2>
            <p className="text-xs text-muted-foreground">
              Rastreamento de campanhas, bio do Instagram e conversão de novos lojistas
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 self-start sm:self-auto">
          <span className="inline-flex items-center gap-1 rounded-full bg-pink-500/15 border border-pink-500/30 px-2 py-0.5 text-[10px] font-bold text-pink-400">
            <Sparkles className="h-3 w-3" />
            Campanhas & UTMs
          </span>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* Destaque Principal: Instagram */}
        <div className="lg:col-span-5 flex flex-col justify-between rounded-xl border border-pink-500/20 bg-gradient-to-br from-pink-500/10 via-purple-500/5 to-transparent p-4">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-pink-500/20 text-pink-400">
                  <InstagramIcon className="h-4 w-4" />
                </div>
                <span className="text-xs font-semibold text-foreground">
                  Canal Instagram
                </span>
              </div>
              <span className="text-xs font-bold text-pink-400">
                {instagramPercent}% das revendas
              </span>
            </div>

            <div className="mt-3">
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-foreground sm:text-3xl">
                  {metrics.instagramTotal}
                </span>
                <span className="text-xs text-muted-foreground">
                  loja(s) cadastrada(s)
                </span>
              </div>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-pink-500/15 pt-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1 rounded-md bg-background/80 px-2 py-0.5 text-[11px] font-medium border border-border/60">
              <strong className="text-foreground">{metrics.instagramBioCount}</strong> via Bio
            </span>
            <span className="inline-flex items-center gap-1 rounded-md bg-background/80 px-2 py-0.5 text-[11px] font-medium border border-border/60">
              <strong className="text-foreground">{metrics.instagramStoriesCount}</strong> via Stories
            </span>
          </div>
        </div>

        {/* Lista e Barras de Proporção dos Canais */}
        <div className="lg:col-span-7 flex flex-col justify-center gap-3">
          <div className="space-y-2.5">
            {metrics.channels.map((channel) => (
              <div key={channel.channel} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    {getChannelIcon(channel.channel)}
                    <span className="font-semibold text-foreground">
                      {channel.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">
                      <strong>{channel.count}</strong> {channel.count === 1 ? "loja" : "lojas"}
                    </span>
                    <span className="font-bold text-foreground">
                      ({channel.percentage}%)
                    </span>
                  </div>
                </div>

                {/* Barra visual de progresso */}
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted/60">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      getChannelBarColor(channel.channel)
                    )}
                    style={{ width: `${channel.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between border-t pt-2 text-[11px] text-muted-foreground">
            <span>Total auditado: <strong>{metrics.total} concessionárias</strong></span>
            <span>Acessos Diretos: <strong>{metrics.directTotal}</strong></span>
          </div>
        </div>
      </div>
    </div>
  );
}
