/**
 * @file useLeadsRealtime.ts
 * @description Hook do Supabase Realtime para sincronização reativa e isolamento estrito de leads por organização.
 */

import { useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";
import type { Lead, LeadOrigin, LeadStatus } from "@/types/crm";
import { toast } from "sonner";

export interface UseLeadsRealtimeProps {
  organizationId: string | null;
  isDemo: boolean;
  onLeadInserted?: (newLead: Lead) => void;
  onLeadUpdated?: (updatedLead: Lead) => void;
  onLeadDeleted?: (deletedLeadId: string) => void;
  onPollSync?: () => Promise<void> | void;
  pollIntervalMs?: number;
}

/**
 * Converte o payload cru retornado pelo Postgres/Supabase Realtime para a entidade Lead do domínio.
 */
export function mapRealtimePayloadToLead(raw: Record<string, unknown>): Lead {
  return {
    id: String(raw.id || ""),
    name: String(raw.name || "Cliente"),
    phone: String(raw.phone || ""),
    email: raw.email ? String(raw.email) : undefined,
    vehicleInterest: String(raw.vehicle_interest || raw.vehicleInterest || "Veículo de Interesse"),
    status: (raw.status || "novo") as LeadStatus,
    sellerName: String(raw.seller_name || raw.sellerName || "Roleta Automática"),
    lastContactAt: raw.last_contact_at ? String(raw.last_contact_at) : (raw.lastContactAt ? String(raw.lastContactAt) : null),
    origin: (raw.origin || "site") as LeadOrigin,
    organizationId: raw.organization_id ? String(raw.organization_id) : (raw.organizationId ? String(raw.organizationId) : undefined),
  };
}

export function useLeadsRealtime({
  organizationId,
  isDemo,
  onLeadInserted,
  onLeadUpdated,
  onLeadDeleted,
  onPollSync,
  pollIntervalMs = 5000,
}: UseLeadsRealtimeProps) {
  // 1. Sincronização em segundo plano via Heartbeat Polling & Foco da Janela
  useEffect(() => {
    if (isDemo || !organizationId || !onPollSync) return;

    let isMounted = true;

    const executeSync = async () => {
      if (isMounted && typeof document !== "undefined" && document.visibilityState === "visible") {
        try {
          await onPollSync();
        } catch {
          // Silencioso
        }
      }
    };

    const interval = setInterval(executeSync, pollIntervalMs);

    const handleFocus = () => {
      executeSync();
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleFocus);

    return () => {
      isMounted = false;
      clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleFocus);
    };
  }, [organizationId, isDemo, onPollSync, pollIntervalMs]);

  // 2. Sincronização Instantânea via Supabase Realtime WebSocket
  useEffect(() => {
    // No modo demo ou sem organização ativa, não conecta ao WebSocket
    if (isDemo || !organizationId) return;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes("placeholder")) {
      return;
    }

    const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);
    const channelName = `realtime-leads-org-${organizationId}`;

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
          const newLead = mapRealtimePayloadToLead(payload.new as Record<string, unknown>);
          onLeadInserted?.(newLead);
          toast.success(`🎯 Novo Lead Recebido: ${newLead.name || "Cliente"}`, {
            description: `Interesse: ${newLead.vehicleInterest || "Veículo"} • Origem: ${newLead.origin || "Web"}`,
            duration: 5000,
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "leads",
          filter: `organization_id=eq.${organizationId}`,
        },
        (payload) => {
          const updatedLead = mapRealtimePayloadToLead(payload.new as Record<string, unknown>);
          onLeadUpdated?.(updatedLead);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "leads",
          filter: `organization_id=eq.${organizationId}`,
        },
        (payload) => {
          const deletedId = (payload.old as { id?: string })?.id;
          if (deletedId) {
            onLeadDeleted?.(deletedId);
          }
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.log(`[Realtime] Conectado ao canal de leads da organização: ${organizationId}`);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [organizationId, isDemo, onLeadInserted, onLeadUpdated, onLeadDeleted]);
}
