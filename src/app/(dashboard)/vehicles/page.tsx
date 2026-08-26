/**
 * @file page.tsx  –  /vehicles (Estoque)
 * @description Página de Gestão de Estoque de Veículos do Acelera Auto CRM.
 *
 * Funcionalidades:
 * - Métricas no topo: Total, Valor do Pátio, Reservados, Ticket Médio.
 * - Barra de ferramentas: busca instantânea + filtro por status + botão Novo Veículo.
 * - Grid responsivo de cards de veículos (VehicleCard).
 * - Alteração de status diretamente no card (DropdownMenu).
 */

"use client";

import React, { useState, useMemo, useCallback } from "react";
import {
  Car,
  CircleDollarSign,
  Clock,
  TrendingUp,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { VehicleCard } from "@/components/vehicles/vehicle-card";
import { NewVehicleModal } from "@/components/vehicles/new-vehicle-modal";
import {
  mockVehicles,
  updateVehicleStatus,
  formatCurrency,
} from "@/lib/mock-data";
import {
  createVehicle as persistVehicle,
  updateVehicleStatus as persistVehicleStatus,
} from "@/app/actions/vehicles";
import type { Vehicle, VehicleStatus } from "@/types/crm";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Tipos locais
// ---------------------------------------------------------------------------

/** Filtro de status (inclui "todos"). */
type StatusFilter = VehicleStatus | "todos";

// ---------------------------------------------------------------------------
// Configuração dos filtros de status
// ---------------------------------------------------------------------------

interface FilterTab {
  value: StatusFilter;
  label: string;
  activeCn: string;
}

const FILTER_TABS: FilterTab[] = [
  {
    value: "todos",
    label: "Todos",
    activeCn: "border-orange-500 text-orange-600 dark:text-orange-400",
  },
  {
    value: "disponivel",
    label: "Disponíveis",
    activeCn: "border-green-500 text-green-600 dark:text-green-400",
  },
  {
    value: "reservado",
    label: "Reservados",
    activeCn: "border-amber-500 text-amber-600 dark:text-amber-400",
  },
  {
    value: "vendido",
    label: "Vendidos",
    activeCn: "border-slate-500 text-slate-600 dark:text-slate-400",
  },
];

// ---------------------------------------------------------------------------
// Componente: Cartão de Métrica
// ---------------------------------------------------------------------------

interface MetricCardProps {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  sub?: string;
  iconBg: string;
  iconColor: string;
}

function MetricCard({
  label,
  value,
  icon: Icon,
  sub,
  iconBg,
  iconColor,
}: MetricCardProps) {
  return (
    <div className="relative overflow-hidden rounded-xl border bg-card p-4 shadow-sm transition-all hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium text-muted-foreground">
            {label}
          </p>
          <p className="mt-1 truncate text-xl font-bold text-foreground">
            {value}
          </p>
          {sub && (
            <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
              {sub}
            </p>
          )}
        </div>
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
            iconBg
          )}
        >
          <Icon className={cn("h-5 w-5", iconColor)} />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers de métricas
// ---------------------------------------------------------------------------

/**
 * Calcula as métricas de topo a partir da lista de veículos.
 *
 * @param vehicles - Lista completa de veículos.
 * @returns Objeto com total, valor, reservados e ticket médio.
 */
function computeMetrics(vehicles: Vehicle[]) {
  const total = vehicles.length;
  const valorTotal = vehicles.reduce((acc, v) => acc + v.price, 0);
  const reservados = vehicles.filter((v) => v.status === "reservado").length;
  const disponiveis = vehicles.filter((v) => v.status === "disponivel");
  const ticketMedio =
    disponiveis.length > 0
      ? disponiveis.reduce((acc, v) => acc + v.price, 0) / disponiveis.length
      : 0;
  return { total, valorTotal, reservados, ticketMedio };
}

// ---------------------------------------------------------------------------
// Página principal
// ---------------------------------------------------------------------------

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>(mockVehicles);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("todos");

  // Adiciona novo veículo ao topo da lista
  const handleAdd = useCallback((vehicle: Vehicle) => {
    setVehicles((prev) => [vehicle, ...prev]);
    persistVehicle({
      make: vehicle.make,
      model: vehicle.model,
      version: vehicle.version,
      yearFab: vehicle.yearFab,
      yearModel: vehicle.yearModel,
      plate: vehicle.plate,
      km: vehicle.km,
      price: vehicle.price,
      status: vehicle.status,
      imageUrl: vehicle.imageUrl,
    }).catch(() => {
      // Fallback silencioso
    });
  }, []);

  // Altera status de um veículo
  const handleStatusChange = useCallback(
    (id: string, status: VehicleStatus) => {
      setVehicles((prev) => updateVehicleStatus(prev, id, status));
      persistVehicleStatus(id, status).catch(() => {
        // Fallback silencioso
      });
    },
    []
  );

  // Filtragem com busca e status
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return vehicles.filter((v) => {
      const matchSearch =
        q === "" ||
        v.make.toLowerCase().includes(q) ||
        v.model.toLowerCase().includes(q) ||
        v.plate.toLowerCase().includes(q) ||
        v.version.toLowerCase().includes(q);
      const matchStatus =
        statusFilter === "todos" || v.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [vehicles, search, statusFilter]);

  const metrics = useMemo(() => computeMetrics(vehicles), [vehicles]);

  return (
    <div className="flex h-full flex-col">
      {/* ------------------------------------------------------------------ */}
      {/* Header fixo com métricas                                             */}
      {/* ------------------------------------------------------------------ */}
      <div className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur-sm">
        {/* Título + ação */}
        <div className="flex items-center justify-between px-4 py-3 sm:px-6">
          <div>
            <h1 className="text-lg font-bold text-foreground sm:text-xl">
              Estoque de Veículos
            </h1>
            <p className="text-xs text-muted-foreground">
              {vehicles.length} veículo{vehicles.length !== 1 ? "s" : ""} cadastrado
              {vehicles.length !== 1 ? "s" : ""}
            </p>
          </div>
          <NewVehicleModal onAdd={handleAdd} />
        </div>

        {/* Métricas */}
        <div className="grid grid-cols-2 gap-3 px-4 pb-4 sm:grid-cols-4 sm:px-6">
          <MetricCard
            label="Total em Estoque"
            value={metrics.total}
            icon={Car}
            sub={`${vehicles.filter((v) => v.status === "disponivel").length} disponíveis`}
            iconBg="bg-blue-100 dark:bg-blue-900/40"
            iconColor="text-blue-600"
          />
          <MetricCard
            label="Valor Total do Pátio"
            value={formatCurrency(metrics.valorTotal)}
            icon={CircleDollarSign}
            iconBg="bg-green-100 dark:bg-green-900/40"
            iconColor="text-green-600"
          />
          <MetricCard
            label="Veículos Reservados"
            value={metrics.reservados}
            icon={Clock}
            iconBg="bg-amber-100 dark:bg-amber-900/40"
            iconColor="text-amber-600"
          />
          <MetricCard
            label="Ticket Médio"
            value={formatCurrency(metrics.ticketMedio)}
            icon={TrendingUp}
            sub="veículos disponíveis"
            iconBg="bg-violet-100 dark:bg-violet-900/40"
            iconColor="text-violet-600"
          />
        </div>

        {/* Barra de ferramentas: busca + filtros */}
        <div className="flex flex-col gap-3 px-4 pb-4 sm:flex-row sm:items-center sm:px-6">
          {/* Busca */}
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="vehicle-search"
              type="search"
              placeholder="Buscar por marca, modelo ou placa..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
              aria-label="Buscar veículos"
            />
          </div>

          {/* Filtro por status (tabs) */}
          <div
            className="flex items-center gap-1 rounded-lg border bg-muted/40 p-1"
            role="tablist"
            aria-label="Filtrar por status"
          >
            <SlidersHorizontal className="ml-1 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            {FILTER_TABS.map((tab) => (
              <button
                key={tab.value}
                id={`filter-${tab.value}`}
                role="tab"
                aria-selected={statusFilter === tab.value}
                onClick={() => setStatusFilter(tab.value)}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-medium transition-all",
                  statusFilter === tab.value
                    ? cn(
                        "border-b-2 bg-background shadow-sm",
                        tab.activeCn
                      )
                    : "text-muted-foreground hover:bg-background/60 hover:text-foreground"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Grid de cards                                                        */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        {filtered.length === 0 ? (
          /* Estado vazio */
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="mb-4 text-6xl opacity-20">🚗</div>
            <h2 className="text-lg font-semibold text-foreground">
              Nenhum veículo encontrado
            </h2>
            <p className="mt-1 max-w-xs text-sm text-muted-foreground">
              {search
                ? `Nenhum resultado para "${search}". Tente outra busca.`
                : 'Adicione o primeiro veículo ao estoque clicando em "+ Novo Veículo".'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((vehicle) => (
              <VehicleCard
                key={vehicle.id}
                vehicle={vehicle}
                onStatusChange={handleStatusChange}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
