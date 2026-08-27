/**
 * @file kanban-board.tsx
 * @description Container executivo do Funil Kanban de Leads com drag-and-drop otimista,
 * filtros dinâmicos, métricas de avanço e modal obrigatório de motivo de descarte.
 */

"use client";

import React, { useState, useTransition, useMemo } from "react";
import { toast } from "sonner";
import type {
  KanbanLead,
  LeadStage,
  KanbanColumnConfig,
  KanbanFilterState,
} from "@/types/kanban";
import { KANBAN_STAGES_CONFIG } from "@/types/kanban";
import { KanbanColumn } from "./kanban-column";
import { KanbanFilters } from "./kanban-filters";
import { LeadLostModal } from "./lead-lost-modal";
import { updateLeadStageAction } from "@/app/actions/kanban-actions";

interface KanbanBoardProps {
  initialLeads: KanbanLead[];
}

export function KanbanBoard({ initialLeads }: KanbanBoardProps) {
  const [leads, setLeads] = useState<KanbanLead[]>(initialLeads);
  const [, startTransition] = useTransition();

  // Lead aguardando preenchimento do modal de perda
  const [pendingLostLead, setPendingLostLead] = useState<KanbanLead | null>(null);

  const [filters, setFilters] = useState<KanbanFilterState>({
    search: "",
    sellerId: "all",
    segment: "all",
  });

  const handleFilterChange = (newFilters: Partial<KanbanFilterState>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  };

  const handleResetFilters = () => {
    setFilters({
      search: "",
      sellerId: "all",
      segment: "all",
    });
  };

  // Lista única de vendedores para o dropdown de filtro
  const sellersList = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();
    leads.forEach((l) => {
      if (l.assigned_to_name && l.assigned_to_name !== "Fila Geral") {
        map.set(l.assigned_to_name, {
          id: l.assigned_to?.id || l.assigned_to_name,
          name: l.assigned_to_name,
        });
      }
    });
    return Array.from(map.values());
  }, [leads]);

  // Filtra os leads com base no estado atual dos filtros
  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      // 1. Filtro por Busca Textual (Nome, Telefone ou Veículo)
      if (filters.search.trim()) {
        const query = filters.search.toLowerCase().trim();
        const cleanQueryDigits = query.replace(/\D/g, "");
        const matchesName = lead.name.toLowerCase().includes(query);
        const matchesPhone =
          cleanQueryDigits.length >= 3
            ? lead.phone.replace(/\D/g, "").includes(cleanQueryDigits)
            : false;
        const matchesVehicle = lead.vehicle_of_interest.toLowerCase().includes(query);
        if (!matchesName && !matchesPhone && !matchesVehicle) {
          return false;
        }
      }

      // 2. Filtro por Vendedor
      if (filters.sellerId !== "all") {
        if (lead.assigned_to_name !== filters.sellerId) {
          return false;
        }
      }

      // 3. Filtro por Segmento
      if (filters.segment !== "all") {
        if (lead.segment && lead.segment !== filters.segment && lead.segment !== "all") {
          return false;
        }
      }

      return true;
    });
  }, [leads, filters]);

  // Agrupa os leads filtrados em colunas
  const columns: KanbanColumnConfig[] = useMemo(() => {
    return KANBAN_STAGES_CONFIG.map((stageConfig) => {
      const stageLeads = filteredLeads.filter((lead) => {
        if (stageConfig.id === "test_drive") {
          return lead.stage === "test_drive" || lead.stage === "visit_scheduled";
        }
        if (stageConfig.id === "proposal") {
          return lead.stage === "proposal" || lead.stage === "proposal_fi";
        }
        return lead.stage === stageConfig.id;
      });

      const totalValue = stageLeads.reduce((acc, curr) => acc + (curr.value || 0), 0);

      return {
        ...stageConfig,
        leads: stageLeads,
        totalValue,
      };
    });
  }, [filteredLeads]);

  // Estatísticas de topo
  const totalLeadsCount = filteredLeads.length;
  const totalPipelineValue = useMemo(() => {
    return filteredLeads
      .filter((l) => l.stage !== "lost")
      .reduce((acc, curr) => acc + (curr.value || 0), 0);
  }, [filteredLeads]);

  // Handler de Movimentação Otimista de Estágio (Drag & Drop ou Botão de Avanço)
  const handleDropLead = (leadId: string, targetStage: LeadStage) => {
    const targetLead = leads.find((l) => l.id === leadId);
    if (!targetLead || targetLead.stage === targetStage) return;

    // Se o destino for "lost", abre o modal para preenchimento do motivo
    if (targetStage === "lost") {
      setPendingLostLead(targetLead);
      return;
    }

    const previousStage = targetLead.stage;
    const stageConfig = KANBAN_STAGES_CONFIG.find((c) => c.id === targetStage);
    const targetStageTitle = stageConfig?.title || targetStage;

    // 1. Atualização Otimista Imediata na Interface (<50ms)
    setLeads((prev) =>
      prev.map((l) => (l.id === leadId ? { ...l, stage: targetStage } : l))
    );

    toast.success(`${targetLead.name} movido para "${targetStageTitle}"`, {
      description: `Veículo: ${targetLead.vehicle_of_interest}`,
      duration: 3000,
    });

    // 2. Disparo Assíncrono da Server Action
    startTransition(async () => {
      const res = await updateLeadStageAction(leadId, targetStage);
      if (!res.success) {
        // Rollback defensivo em caso de erro no servidor
        setLeads((prev) =>
          prev.map((l) => (l.id === leadId ? { ...l, stage: previousStage } : l))
        );
        toast.error("Falha ao atualizar o estágio no servidor", {
          description: res.error || "Ação revertida automaticamente.",
        });
      }
    });
  };

  // Confirmação do motivo de perda no modal
  const handleConfirmLost = async (leadId: string, reason: string): Promise<boolean> => {
    const targetLead = leads.find((l) => l.id === leadId);
    if (!targetLead) return false;

    const previousStage = targetLead.stage;

    // Atualização otimista
    setLeads((prev) =>
      prev.map((l) =>
        l.id === leadId ? { ...l, stage: "lost", lost_reason: reason } : l
      )
    );

    toast.error(`${targetLead.name} marcado como Perdido`, {
      description: `Motivo: ${reason}`,
      duration: 3500,
    });

    startTransition(async () => {
      const res = await updateLeadStageAction(leadId, "lost", reason);
      if (!res.success) {
        // Rollback defensivo
        setLeads((prev) =>
          prev.map((l) => (l.id === leadId ? { ...l, stage: previousStage } : l))
        );
        toast.error("Falha ao registrar motivo de perda no servidor", {
          description: res.error,
        });
      }
    });

    return true;
  };

  return (
    <div className="space-y-4" data-testid="kanban-board-container">
      {/* Barra de Filtros Executiva */}
      <KanbanFilters
        filters={filters}
        onFilterChange={handleFilterChange}
        onResetFilters={handleResetFilters}
        sellers={sellersList}
        totalLeadsCount={totalLeadsCount}
        totalPipelineValue={totalPipelineValue}
      />

      {/* Quadro Kanban com Rolagem Horizontal Suave */}
      <div className="flex gap-4 overflow-x-auto pb-4 pt-1 px-0.5 custom-scrollbar min-h-[580px]">
        {columns.map((col) => (
          <KanbanColumn
            key={col.id}
            column={col}
            onDropLead={handleDropLead}
            onMoveStage={handleDropLead}
          />
        ))}
      </div>

      {/* Modal Obrigatório de Motivo de Descarte */}
      {pendingLostLead && (
        <LeadLostModal
          isOpen={!!pendingLostLead}
          lead={pendingLostLead}
          onClose={() => setPendingLostLead(null)}
          onConfirmLost={handleConfirmLost}
        />
      )}
    </div>
  );
}
