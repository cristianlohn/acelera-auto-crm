/**
 * @file vehicles-page-client.tsx
 * @description Componente Client da Gestão de Estoque de Veículos com isolamento de contexto (Pátio Ativo vs Histórico de Vendas) e métricas dinâmicas.
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
  CheckCircle2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { VehicleCard } from "@/components/vehicles/vehicle-card";
import { NewVehicleModal } from "@/components/vehicles/new-vehicle-modal";
import { VehiclesHeaderTabs, type VehiclesViewTab } from "@/components/vehicles/vehicles-header-tabs";
import { SoldVehiclesView } from "@/components/vehicles/sold-vehicles-view";
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

type ActiveStatusFilter = "todos" | "disponivel" | "reservado";

interface FilterTab {
  value: ActiveStatusFilter;
  label: string;
  activeCn: string;
}

const ACTIVE_FILTER_TABS: FilterTab[] = [
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
    <div className="relative min-w-[190px] sm:min-w-[220px] shrink-0 snap-start overflow-hidden rounded-xl border bg-card p-3 sm:p-4 shadow-sm transition-all hover:shadow-md md:min-w-0 md:shrink">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] sm:text-xs font-medium text-muted-foreground truncate">{label}</p>
          <p className="mt-1 text-lg sm:text-2xl font-bold tracking-tight text-foreground truncate">
            {value}
          </p>
          {sub && (
            <p className="mt-0.5 text-[10px] sm:text-xs text-muted-foreground truncate">{sub}</p>
          )}
        </div>
        <div
          className={cn(
            "flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-lg sm:rounded-xl shadow-sm",
            iconBg
          )}
        >
          <Icon className={cn("h-4 w-4 sm:h-5 sm:w-5", iconColor)} />
        </div>
      </div>
    </div>
  );
}

export interface VehiclesPageClientProps {
  initialVehicles?: Vehicle[];
}

export function VehiclesPageClient({
  initialVehicles,
}: VehiclesPageClientProps = {}) {
  const { isDemoMode } = useDemoRole();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [vehicles, setVehicles] = useState<Vehicle[]>(() => {
    if (initialVehicles !== undefined) return initialVehicles;
    return mockVehicles;
  });
  const [activeTab, setActiveTab] = useState<VehiclesViewTab>("active");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ActiveStatusFilter>("todos");

  useEffect(() => {
    if (initialVehicles !== undefined || isDemoMode) return;

    let isMounted = true;
    getVehicles()
      .then((data) => {
        if (isMounted && data && data.length > 0) setVehicles(data);
      })
      .catch(() => {
        // Mantém fallback seguro
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

  // Separação estrita entre Pátio Ativo e Histórico de Vendas
  const activeVehicles = useMemo(() => {
    return vehicles.filter(
      (v) => v.status !== "vendido" && (v.status as string) !== "sold"
    );
  }, [vehicles]);

  const soldVehicles = useMemo(() => {
    return vehicles.filter(
      (v) => v.status === "vendido" || (v.status as string) === "sold"
    );
  }, [vehicles]);

  // Filtragem dos veículos do Pátio Ativo
  const filteredActiveVehicles = useMemo(() => {
    const q = search.trim().toLowerCase();
    const cleanQ = q.replace(/[^a-z0-9]/g, "");
    return activeVehicles.filter((v) => {
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
  }, [activeVehicles, search, statusFilter]);

  // Métricas do Pátio Ativo
  const activeMetrics = useMemo(() => {
    const total = activeVehicles.length;
    const valorTotal = activeVehicles.reduce((acc, v) => acc + (Number(v.price) || 0), 0);
    const reservados = activeVehicles.filter((v) => v.status === "reservado").length;
    const disponiveis = activeVehicles.filter((v) => v.status === "disponivel" || !v.status);
    const ticketMedio =
      disponiveis.length > 0
        ? disponiveis.reduce((acc, v) => acc + (Number(v.price) || 0), 0) / disponiveis.length
        : 0;
    return { total, valorTotal, reservados, ticketMedio, disponiveisCount: disponiveis.length };
  }, [activeVehicles]);

  // Métricas do Histórico de Vendas
  const soldMetrics = useMemo(() => {
    const total = soldVehicles.length;
    const faturamento = soldVehicles.reduce((acc, v) => acc + (Number(v.price) || 0), 0);
    const margens = soldVehicles
      .map((v) => v.estimatedMargin)
      .filter((m): m is number => m !== undefined && !isNaN(m));
    const margemMedia =
      margens.length > 0
        ? margens.reduce((a, b) => a + b, 0) / margens.length
        : (faturamento > 0 ? faturamento * 0.12 : 0);
    const giros = soldVehicles
      .map((v) => v.daysInStock)
      .filter((d): d is number => d !== undefined && !isNaN(d));
    const tempoMedioGiro =
      giros.length > 0
        ? Math.round(giros.reduce((a, b) => a + b, 0) / giros.length)
        : 18;
    return { total, faturamento, margemMedia, tempoMedioGiro };
  }, [soldVehicles]);

  return (
    <div className="flex min-h-full flex-col w-full">
      {/* Bloco Superior: Cabeçalho, Abas e KPIs (Sem sticky no mobile para não prender a tela) */}
      <div className="border-b bg-background">
        {/* Cabeçalho Principal */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div>
            <h1 className="text-lg font-bold text-foreground sm:text-xl">
              Estoque de Veículos
            </h1>
            <p className="text-xs text-muted-foreground">
              {activeVehicles.length} veículo{activeVehicles.length !== 1 ? "s" : ""} no pátio ativo • {soldVehicles.length} no histórico de vendas
            </p>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <a
              id="btn-download-stock-template"
              href="/templates/modelo_estoque.csv"
              download="modelo_estoque_acelera.csv"
              className="hidden md:inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted hover:border-orange-500/40 transition-all shadow-sm shrink-0"
              title="Preencha os dados dos veículos da sua loja seguindo as colunas do modelo antes de importar."
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
              <span>Baixar Planilha Modelo (CSV)</span>
            </a>
            <div className="w-full sm:w-auto">
              <NewVehicleModal onAdd={handleAdd} />
            </div>
          </div>
        </div>

        {/* Abas Superiores de Contexto (Pátio Ativo vs Histórico de Vendas) */}
        <div className="px-4 sm:px-6">
          <VehiclesHeaderTabs
            activeTab={activeTab}
            onTabChange={setActiveTab}
            activeCount={activeVehicles.length}
            soldCount={soldVehicles.length}
          />
        </div>

        {/* Cards de Métricas Dinâmicos (Carrossel Horizontal no Mobile, Grid no Desktop) */}
        <div className="flex overflow-x-auto gap-3 px-4 pt-3 pb-3 sm:pb-4 snap-x no-scrollbar md:grid md:grid-cols-4 sm:px-6">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="flex min-w-[190px] sm:min-w-[220px] shrink-0 snap-start md:min-w-0 md:shrink items-center gap-3 rounded-xl border bg-card p-3 sm:p-4 shadow-sm"
              >
                <Skeleton className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg" />
                <div className="space-y-1.5 flex-1">
                  <Skeleton className="h-3 w-16 rounded" />
                  <Skeleton className="h-5 w-24 rounded" />
                </div>
              </div>
            ))
          ) : activeTab === "active" ? (
            <>
              <MetricCard
                label="Total no Pátio"
                value={activeMetrics.total}
                icon={Car}
                sub={`${activeMetrics.disponiveisCount} disponíveis • ${activeMetrics.reservados} reservados`}
                iconBg="bg-blue-100 dark:bg-blue-900/40"
                iconColor="text-blue-600"
              />
              <MetricCard
                label="Valor Total do Pátio"
                value={formatCurrency(activeMetrics.valorTotal)}
                icon={CircleDollarSign}
                iconBg="bg-green-100 dark:bg-green-900/40"
                iconColor="text-green-600"
              />
              <MetricCard
                label="Veículos Reservados"
                value={activeMetrics.reservados}
                icon={Clock}
                iconBg="bg-amber-100 dark:bg-amber-900/40"
                iconColor="text-amber-600"
              />
              <MetricCard
                label="Ticket Médio"
                value={formatCurrency(activeMetrics.ticketMedio)}
                icon={TrendingUp}
                sub="veículos disponíveis"
                iconBg="bg-violet-100 dark:bg-violet-900/40"
                iconColor="text-violet-600"
              />
            </>
          ) : (
            <>
              <MetricCard
                label="Veículos Vendidos"
                value={soldMetrics.total}
                icon={CheckCircle2}
                sub="total histórico fechado"
                iconBg="bg-emerald-100 dark:bg-emerald-900/40"
                iconColor="text-emerald-600"
              />
              <MetricCard
                label="Faturamento Realizado"
                value={formatCurrency(soldMetrics.faturamento)}
                icon={CircleDollarSign}
                iconBg="bg-green-100 dark:bg-green-900/40"
                iconColor="text-green-600"
              />
              <MetricCard
                label="Margem Média Estimada"
                value={formatCurrency(soldMetrics.margemMedia)}
                icon={TrendingUp}
                iconBg="bg-violet-100 dark:bg-violet-900/40"
                iconColor="text-violet-600"
              />
              <MetricCard
                label="Tempo Médio de Giro"
                value={`${soldMetrics.tempoMedioGiro} dias`}
                icon={Clock}
                sub="até o fechamento da venda"
                iconBg="bg-amber-100 dark:bg-amber-900/40"
                iconColor="text-amber-600"
              />
            </>
          )}
        </div>
      </div>

      {/* Barra de Filtros e Busca (Sticky no topo apenas para a busca sem cobrir a tela) */}
      {activeTab === "active" && (
        <div className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur-sm px-4 py-2.5 sm:px-6">
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:gap-3">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="vehicle-search"
                type="search"
                placeholder="Buscar por marca, modelo ou placa no pátio..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 text-xs h-9"
                aria-label="Buscar veículos"
              />
            </div>

            <div
              className="flex items-center gap-1 rounded-lg border bg-muted/40 p-1 overflow-x-auto max-w-full shrink-0 no-scrollbar"
              role="tablist"
              aria-label="Filtrar por status do pátio"
            >
              <SlidersHorizontal className="ml-1 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              {ACTIVE_FILTER_TABS.map((tab) => (
                <button
                  key={tab.value}
                  id={`filter-${tab.value}`}
                  role="tab"
                  aria-selected={statusFilter === tab.value}
                  onClick={() => setStatusFilter(tab.value)}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-xs font-medium transition-all whitespace-nowrap shrink-0",
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
      )}

      {/* Conteúdo Principal de Acordo com a Aba Ativa (Rolagem Fluida) */}
      <div className="p-4 sm:p-6 flex-1">
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
        ) : activeTab === "sold" ? (
          <SoldVehiclesView
            vehicles={soldVehicles}
            onStatusChange={handleStatusChange}
            onDelete={handleDelete}
          />
        ) : filteredActiveVehicles.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-700/60 bg-slate-900/30 p-12 text-center my-8">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-2xl">
              🚗
            </div>
            <h2 className="mt-4 text-base font-bold text-foreground">
              {search ? "Nenhum veículo encontrado no pátio" : "Nenhum veículo disponível no pátio ativo"}
            </h2>
            <p className="mt-1 max-w-sm text-xs text-muted-foreground">
              {search
                ? `Nenhum resultado para "${search}". Tente outra busca.`
                : "Cadastre novos veículos no pátio ou consulte o Histórico de Vendas para ver carros já comercializados."}
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
            {filteredActiveVehicles.map((vehicle) => (
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
