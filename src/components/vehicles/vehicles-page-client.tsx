/**
 * @file vehicles-page-client.tsx
 * @description Componente Client da Gestão de Estoque de Veículos do Acelera Auto CRM.
 *
 * Recebe initialVehicles via props do servidor (0ms de atraso visual).
 */

"use client";

import React, { useState, useMemo, useCallback, useEffect } from "react";
import {
  Car,
  CircleDollarSign,
  Clock,
  TrendingUp,
  Search,
  SlidersHorizontal,
  FileSpreadsheet,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { VehicleCard } from "@/components/vehicles/vehicle-card";
import { NewVehicleModal } from "@/components/vehicles/new-vehicle-modal";
import { Skeleton } from "@/components/ui/skeleton";
import {
  mockVehicles,
  updateVehicleStatus,
  formatCurrency,
} from "@/lib/mock-data";
import {
  getVehicles,
  createVehicle as persistVehicle,
  updateVehicleStatus as persistVehicleStatus,
} from "@/app/actions/vehicles";
import type { Vehicle, VehicleStatus } from "@/types/crm";
import { cn } from "@/lib/utils";
import { useDemoRole } from "@/context/demo-role-context";
import { Button } from "@/components/ui/button";

type StatusFilter = VehicleStatus | "todos";

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
    <div className="relative overflow-hidden rounded-xl border bg-card p-4 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-bold tracking-tight text-foreground">
            {value}
          </p>
          {sub && (
            <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>
          )}
        </div>
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-sm",
            iconBg
          )}
        >
          <Icon className={cn("h-5 w-5", iconColor)} />
        </div>
      </div>
    </div>
  );
}

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

export interface VehiclesPageClientProps {
  initialVehicles?: Vehicle[];
}

export function VehiclesPageClient({
  initialVehicles,
}: VehiclesPageClientProps = {}) {
  const { isDemoMode } = useDemoRole();
  const [isLoading, setIsLoading] = useState<boolean>(
    initialVehicles === undefined && !isDemoMode
  );
  const [vehicles, setVehicles] = useState<Vehicle[]>(() => {
    if (initialVehicles !== undefined) return initialVehicles;
    if (isDemoMode) return mockVehicles;
    return [];
  });
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("todos");

  useEffect(() => {
    if (initialVehicles !== undefined || isDemoMode) return;

    let isMounted = true;
    getVehicles()
      .then((data) => {
        if (isMounted) setVehicles(data);
      })
      .catch(() => {
        if (isMounted) setVehicles([]);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, [isDemoMode, initialVehicles]);

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
    }).catch(() => {});
  }, []);

  const handleUpdate = useCallback((updatedVehicle: Vehicle) => {
    setVehicles((prev) =>
      prev.map((v) => (v.id === updatedVehicle.id ? { ...v, ...updatedVehicle } : v))
    );
  }, []);

  const handleDelete = useCallback((id: string) => {
    setVehicles((prev) => prev.filter((v) => v.id !== id));
  }, []);

  const handleStatusChange = useCallback(
    (id: string, status: VehicleStatus) => {
      setVehicles((prev) => updateVehicleStatus(prev, id, status));
      persistVehicleStatus(id, status).catch(() => {});
    },
    []
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const cleanQ = q.replace(/[^a-z0-9]/g, "");
    return vehicles.filter((v) => {
      const cleanPlate = v.plate.toLowerCase().replace(/[^a-z0-9]/g, "");
      const matchSearch =
        q === "" ||
        v.make.toLowerCase().includes(q) ||
        v.model.toLowerCase().includes(q) ||
        v.plate.toLowerCase().includes(q) ||
        (cleanQ.length > 0 && cleanPlate.includes(cleanQ)) ||
        v.version.toLowerCase().includes(q);
      const matchStatus =
        statusFilter === "todos" || v.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [vehicles, search, statusFilter]);

  const metrics = useMemo(() => computeMetrics(vehicles), [vehicles]);

  return (
    <div className="flex h-full flex-col">
      <div className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div>
            <h1 className="text-lg font-bold text-foreground sm:text-xl">
              Estoque de Veículos
            </h1>
            <p className="text-xs text-muted-foreground">
              {vehicles.length} veículo{vehicles.length !== 1 ? "s" : ""} cadastrado
              {vehicles.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <a
              id="btn-download-stock-template"
              href="/templates/modelo_estoque.csv"
              download="modelo_estoque_acelera.csv"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted hover:border-orange-500/40 transition-all shadow-sm"
              title="Preencha os dados dos veículos da sua loja seguindo as colunas do modelo antes de importar."
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
              <span>Baixar Planilha Modelo (CSV)</span>
            </a>
            <NewVehicleModal onAdd={handleAdd} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 px-4 pb-4 sm:grid-cols-4 sm:px-6">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-xl border bg-card p-3 shadow-sm"
              >
                <Skeleton className="h-10 w-10 rounded-lg" />
                <div className="space-y-1.5 flex-1">
                  <Skeleton className="h-3 w-16 rounded" />
                  <Skeleton className="h-5 w-24 rounded" />
                </div>
              </div>
            ))
          ) : (
            <>
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
            </>
          )}
        </div>

        <div className="flex flex-col gap-3 px-4 pb-4 sm:flex-row sm:items-center sm:px-6">
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

          <div
            className="flex items-center gap-1 rounded-lg border bg-muted/40 p-1 overflow-x-auto max-w-full"
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

      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        {isLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="rounded-2xl border border-border/40 bg-card/60 p-3 space-y-3 shadow-sm"
              >
                <Skeleton className="h-44 w-full rounded-xl" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-3/4 rounded" />
                  <Skeleton className="h-3 w-1/2 rounded" />
                  <div className="flex justify-between items-center pt-2">
                    <Skeleton className="h-5 w-24 rounded" />
                    <Skeleton className="h-6 w-20 rounded-full" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-700/60 bg-slate-900/30 p-12 text-center my-8">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-2xl">
              🚗
            </div>
            <h2 className="mt-4 text-base font-bold text-foreground">
              {search ? "Nenhum veículo encontrado" : "Nenhum veículo cadastrado no estoque ainda"}
            </h2>
            <p className="mt-1 max-w-sm text-xs text-muted-foreground">
              {search
                ? `Nenhum resultado para "${search}". Tente outra busca.`
                : "Cadastre os veículos do seu pátio para acompanhar status, preços e envio rápido para clientes no WhatsApp."}
            </p>
            {search ? (
              <Button
                variant="outline"
                size="sm"
                className="mt-4 text-xs"
                onClick={() => setSearch("")}
              >
                Limpar Busca
              </Button>
            ) : (
              <div className="mt-4">
                <NewVehicleModal
                  onAdd={handleAdd}
                  trigger={
                    <Button
                      size="sm"
                      className="text-xs font-semibold bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-md shadow-orange-500/20 gap-1.5"
                    >
                      <span>+ Adicionar Primeiro Veículo</span>
                    </Button>
                  }
                />
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((vehicle) => (
              <VehicleCard
                key={vehicle.id}
                vehicle={vehicle}
                onStatusChange={handleStatusChange}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default VehiclesPageClient;
