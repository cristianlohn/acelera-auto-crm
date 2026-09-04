/**
 * @file realtime-notification-provider.tsx
 * @description Provedor global de notificações sonoras e eventos em tempo real via Supabase Realtime.
 */

"use client";

import React, { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { soundManager } from "@/lib/utils/audio-alerts";
import { useDemoRole } from "@/context/demo-role-context";
import { normalizeRole } from "@/lib/permissions";

export interface RealtimeNotificationProviderProps {
  children: React.ReactNode;
  organizationId?: string | null;
  userRole?: string | null;
}

function useSafeRouter() {
  try {
    return useRouter();
  } catch {
    return null;
  }
}

function useSafeQueryClient() {
  try {
    return useQueryClient();
  } catch {
    return null;
  }
}

export function RealtimeNotificationProvider({
  children,
  organizationId,
  userRole,
}: RealtimeNotificationProviderProps) {
  const router = useSafeRouter();
  const queryClient = useSafeQueryClient();
  const { isDemoMode, role: demoRole } = useDemoRole();
  const effectiveRole = normalizeRole(isDemoMode ? demoRole : userRole);
  const isManagerOrAdmin = effectiveRole === "admin" || effectiveRole === "manager" || effectiveRole === "superadmin";

  const alertedSlaLeadsRef = useRef<Set<string>>(new Set());

  // 1. Desbloqueia o Web Audio API no primeiro clique do usuário
  useEffect(() => {
    const handleFirstInteraction = () => {
      soundManager.unlockAudio();
    };

    window.addEventListener("click", handleFirstInteraction, { once: true, passive: true });
    window.addEventListener("keydown", handleFirstInteraction, { once: true, passive: true });
    window.addEventListener("touchstart", handleFirstInteraction, { once: true, passive: true });

    return () => {
      window.removeEventListener("click", handleFirstInteraction);
      window.removeEventListener("keydown", handleFirstInteraction);
      window.removeEventListener("touchstart", handleFirstInteraction);
    };
  }, []);

  // 2. Supabase Realtime WebSocket para Novos Leads
  useEffect(() => {
    if (isDemoMode || !organizationId) return;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes("placeholder")) {
      return;
    }

    const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);
    const channelName = `org-leads-${organizationId}`;

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "leads",
          filter: `organization_id=eq.${organizationId}`,
        },
        (payload) => {
          const raw = (payload.new || {}) as Record<string, unknown>;
          const leadName = String(raw.name || "Novo Cliente");
          const vehicleInterest = String(raw.vehicle_interest || raw.vehicle_name || raw.notes || "Geral");

          // Toca som sintetizado de novo lead
          soundManager.playNewLeadSound();

          // Notificação Toast
          toast.success(`🎯 Novo Lead Recebido: ${leadName}`, {
            description: `Interesse: ${vehicleInterest} • Origem: ${String(raw.origin || "Webhook")}`,
            duration: 5000,
          });

          // Atualiza caches do TanStack Query
          queryClient?.invalidateQueries({ queryKey: ["leads"] });
          queryClient?.invalidateQueries({ queryKey: ["cockpit-metrics"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [organizationId, isDemoMode, queryClient]);

  // 3. Monitoramento Suave de SLA Estourado (Apenas para Gestor / Admin)
  useEffect(() => {
    if (!isManagerOrAdmin) return;

    const checkSlaBreaches = async () => {
      if (isDemoMode) return;

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (!supabaseUrl || !supabaseAnonKey || !organizationId || supabaseUrl.includes("placeholder")) {
        return;
      }

      try {
        const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);
        const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();

        const { data, error } = await supabase
          .from("leads")
          .select("id, name, seller_name, created_at, first_contact_at, status")
          .eq("organization_id", organizationId)
          .is("first_contact_at", null)
          .lt("created_at", fifteenMinutesAgo)
          .in("status", ["novo", "new", "primeiro_contato", "atendimento"]);

        if (!error && data && data.length > 0) {
          let hasNewBreach = false;

          for (const lead of data) {
            if (!alertedSlaLeadsRef.current.has(lead.id)) {
              alertedSlaLeadsRef.current.add(lead.id);
              hasNewBreach = true;

              toast.error(`⚠️ SLA Estourado (> 15 min): ${lead.name || "Lead"}`, {
                description: `Aguardando primeiro contato com ${lead.seller_name || "Vendedor"}.`,
                action: {
                  label: "Ver no Kanban",
                  onClick: () => {
                    if (router) {
                      router.push("/dashboard/leads?filter=sla_breached");
                    }
                  },
                },
                duration: 8000,
              });
            }
          }

          if (hasNewBreach) {
            soundManager.playSlaBreachSound();
          }
        }
      } catch {
        // Silencioso em caso de falha de conexão periódica
      }
    };

    // Executa a cada 60 segundos
    const interval = setInterval(checkSlaBreaches, 60000);
    return () => clearInterval(interval);
  }, [organizationId, isManagerOrAdmin, isDemoMode]);

  return <>{children}</>;
}
