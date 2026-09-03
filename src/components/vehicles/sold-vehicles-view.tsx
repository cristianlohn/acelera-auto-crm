/**
 * @file sold-vehicles-view.tsx
 * @description Visão especializada do histórico de veículos vendidos com métricas de fechamento e ação de reativação para o pátio.
 */

"use client";

import React, { useState, useMemo } from "react";
import Image from "next/image";
import {
  Car,
  Search,
  RotateCcw,
  CheckCircle2,
  Calendar,
  Gauge,
  MoreVertical,
  Trash2,
  Clock,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { formatCurrency, formatKm } from "@/lib/mock-data";
import type { Vehicle, VehicleStatus } from "@/types/crm";

export interface SoldVehiclesViewProps {
  vehicles: Vehicle[];
  onStatusChange: (id: string, status: VehicleStatus) => void;
  onDelete?: (id: string) => void;
}

export function SoldVehiclesView({
  vehicles,
  onStatusChange,
  onDelete,
}: SoldVehiclesViewProps) {
  const [search, setSearch] = useState("");
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});
  const [vehicleToReactivate, setVehicleToReactivate] = useState<Vehicle | null>(null);
  const [vehicleToDelete, setVehicleToDelete] = useState<Vehicle | null>(null);

  const filteredVehicles = useMemo(() => {
    const q = search.trim().toLowerCase();
    const cleanQ = q.replace(/[^a-z0-9]/g, "");
    if (!q) return vehicles;

    return vehicles.filter((v) => {
      const cleanPlate = v.plate.toLowerCase().replace(/[^a-z0-9]/g, "");
      return (
        v.make.toLowerCase().includes(q) ||
        v.model.toLowerCase().includes(q) ||
        v.plate.toLowerCase().includes(q) ||
        (cleanQ.length > 0 && cleanPlate.includes(cleanQ)) ||
        v.version.toLowerCase().includes(q)
      );
    });
  }, [vehicles, search]);

  const handleImageError = (id: string) => {
    setImgErrors((prev) => ({ ...prev, [id]: true }));
  };

  const handleConfirmReactivate = () => {
    if (!vehicleToReactivate) return;
    onStatusChange(vehicleToReactivate.id, "disponivel");
    setVehicleToReactivate(null);
  };

  const handleConfirmDelete = () => {
    if (!vehicleToDelete) return;
    onDelete?.(vehicleToDelete.id);
    setVehicleToDelete(null);
  };

  if (vehicles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-700/60 bg-slate-900/30 p-12 text-center my-8">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-2xl">
          🏆
        </div>
        <h2 className="mt-4 text-base font-bold text-foreground">
          Nenhum veículo no histórico de vendas ainda
        </h2>
        <p className="mt-1 max-w-md text-xs text-muted-foreground">
          Assim que um carro for marcado como vendido no pátio, ele será arquivado aqui com as métricas de fechamento, margem realizada e tempo de giro.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Barra de Busca Especializada para Vendidos */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="sold-vehicle-search"
            type="search"
            placeholder="Buscar vendas por marca, modelo ou placa..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9 text-xs"
            aria-label="Buscar no histórico de vendas"
          />
        </div>

        <div className="text-xs text-muted-foreground">
          Exibindo <strong>{filteredVehicles.length}</strong> de{" "}
          <strong>{vehicles.length}</strong> venda(s) registrada(s)
        </div>
      </div>

      {filteredVehicles.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-white/5 bg-white/[0.02] p-10 text-center">
          <Search className="h-8 w-8 text-zinc-500 mb-2" />
          <p className="text-sm font-semibold text-zinc-300">
            Nenhum veículo vendido encontrado para &quot;{search}&quot;
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSearch("")}
            className="mt-2 text-xs text-orange-400 hover:text-orange-300"
          >
            Limpar Busca
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredVehicles.map((v) => {
            const hasError = imgErrors[v.id] || !v.imageUrl;
            const daysInStock = v.daysInStock ?? 18;

            return (
              <div
                key={v.id}
                className="group relative flex flex-col overflow-hidden rounded-xl border border-white/10 bg-[#121216] shadow-sm transition-all hover:border-emerald-500/30 hover:shadow-md"
              >
                {/* Imagem do Veículo Vendido */}
                <div className="relative aspect-video w-full overflow-hidden bg-slate-900">
                  {hasError ? (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 border-b border-slate-800 text-slate-600">
                      <Car className="w-10 h-10 stroke-[1.5] mb-1 text-slate-500" />
                      <span className="text-xs font-medium text-slate-400">Sem foto</span>
                    </div>
                  ) : (
                    <Image
                      src={v.imageUrl}
                      alt={`${v.make} ${v.model}`}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      className="object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                      onError={() => handleImageError(v.id)}
                    />
                  )}

                  {/* Badge Vendido */}
                  <span className="absolute top-2 left-2 flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold bg-emerald-600/90 text-white ring-1 ring-emerald-400/30 backdrop-blur-sm shadow">
                    <CheckCircle2 className="h-3 w-3" />
                    Vendido
                  </span>

                  {/* Indicador de Giro até a Venda */}
                  <span className="absolute top-2 right-2 flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold bg-black/70 text-zinc-300 ring-1 ring-white/10 backdrop-blur-sm">
                    <Clock className="h-3 w-3 text-emerald-400" />
                    Giro: {daysInStock}d
                  </span>
                </div>

                {/* Conteúdo do Card Vendido */}
                <div className="flex flex-1 flex-col gap-3 p-4">
                  <div>
                    <h3 className="truncate text-sm font-bold text-white">
                      {v.make} {v.model}
                    </h3>
                    <p className="truncate text-xs text-zinc-400">{v.version}</p>
                  </div>

                  {/* Preço de Fechamento */}
                  <div className="space-y-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <div>
                        <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">
                          Valor da Venda
                        </span>
                        <p className="text-lg font-extrabold tracking-tight text-emerald-400">
                          {formatCurrency(v.price)}
                        </p>
                      </div>
                      {v.fipePrice && (
                        <span className="text-[10px] text-zinc-500 text-right">
                          FIPE: {formatCurrency(v.fipePrice)}
                        </span>
                      )}
                    </div>

                    {v.estimatedMargin !== undefined && (
                      <p className="text-[11px] font-semibold text-emerald-500">
                        Margem: {formatCurrency(v.estimatedMargin)}
                      </p>
                    )}
                  </div>

                  {/* Detalhes Rápidos */}
                  <div className="grid grid-cols-2 gap-2 text-[11px] text-zinc-400 pt-1 border-t border-white/5">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-orange-400" />
                      <span>{v.yearFab}/{v.yearModel}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Gauge className="h-3.5 w-3.5 text-blue-400" />
                      <span>{formatKm(v.km)}</span>
                    </div>
                  </div>

                  {/* Ações de Gestão e Reativação */}
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/5">
                    <span className="font-mono text-[10px] text-zinc-500 uppercase">
                      Placa: {v.plate}
                    </span>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-zinc-400 hover:text-white"
                          aria-label="Opções do veículo vendido"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56 bg-zinc-950 border-white/10 text-white">
                        <DropdownMenuLabel className="text-xs text-zinc-400">
                          Gestão de Venda
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator className="bg-white/10" />
                        <DropdownMenuItem
                          onClick={() => setVehicleToReactivate(v)}
                          className="text-xs text-orange-400 hover:text-orange-300 cursor-pointer gap-2"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          <span>Reativar para Pátio (Desfazer Venda)</span>
                        </DropdownMenuItem>
                        {onDelete && (
                          <>
                            <DropdownMenuSeparator className="bg-white/10" />
                            <DropdownMenuItem
                              onClick={() => setVehicleToDelete(v)}
                              className="text-xs text-rose-400 hover:text-rose-300 cursor-pointer gap-2"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              <span>Excluir do Histórico</span>
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Diálogo de Confirmação para Reativação */}
      <Dialog
        open={Boolean(vehicleToReactivate)}
        onOpenChange={(open) => !open && setVehicleToReactivate(null)}
      >
        <DialogContent className="sm:max-w-md bg-zinc-950 border-white/10 text-white p-6 shadow-2xl">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/10 text-orange-400 border border-orange-500/20">
                <RotateCcw className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-white">
                  Reativar Veículo para o Pátio
                </DialogTitle>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Desfazer marcação de venda
                </p>
              </div>
            </div>
          </DialogHeader>

          <p className="text-sm text-zinc-300 py-3">
            Deseja retornar o{" "}
            <strong className="text-white font-semibold">
              {vehicleToReactivate?.make} {vehicleToReactivate?.model}
            </strong>{" "}
            para o status de <strong className="text-green-400">Disponível</strong> no pátio ativo?
          </p>

          <DialogFooter className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setVehicleToReactivate(null)}
              className="text-xs text-zinc-400 hover:text-white"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleConfirmReactivate}
              className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white text-xs font-semibold gap-1.5 shadow-md shadow-orange-500/20"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reativar Veículo</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo de Confirmação para Exclusão do Histórico */}
      <Dialog
        open={Boolean(vehicleToDelete)}
        onOpenChange={(open) => !open && setVehicleToDelete(null)}
      >
        <DialogContent className="sm:max-w-md bg-zinc-950 border-white/10 text-white p-6 shadow-2xl">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/10 text-rose-500 border border-rose-500/20">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-white">
                  Excluir do Histórico de Vendas
                </DialogTitle>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Esta ação removerá o registro permanentemente.
                </p>
              </div>
            </div>
          </DialogHeader>

          <p className="text-sm text-zinc-300 py-3">
            Tem certeza que deseja remover o registro de venda do{" "}
            <strong className="text-white font-semibold">
              {vehicleToDelete?.make} {vehicleToDelete?.model}
            </strong>?
          </p>

          <DialogFooter className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setVehicleToDelete(null)}
              className="text-xs text-zinc-400 hover:text-white"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleConfirmDelete}
              className="bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium gap-1.5 shadow-md shadow-rose-600/20"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Confirmar Exclusão</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
