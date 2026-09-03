/**
 * @file vehicle-form-modal.tsx
 * @description Formulário compartilhado de criação e edição de veículos com upload WebP, galeria de fotos, seleção interativa de Capa e exclusão com confirmação.
 */

"use client";

import React, { useState, useCallback, useTransition, useRef } from "react";
import Image from "next/image";
import {
  Car,
  Calendar,
  Gauge,
  CreditCard,
  Image as ImageIcon,
  Loader2,
  Upload,
  X,
  Check,
  Fuel,
  Settings2,
  StickyNote,
  Plus,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { convertImageToWebP } from "@/lib/utils/image-processing";
import {
  createVehicleAction,
  updateVehicleAction,
  uploadVehicleImageAction,
  deleteVehicleAction,
} from "@/app/actions/vehicle-actions";
import type { Vehicle, VehicleFormData, VehicleStatus } from "@/types/crm";

// ---------------------------------------------------------------------------
// Fotos mock rápidas para seleção instantânea
// ---------------------------------------------------------------------------
const QUICK_PHOTOS: { label: string; url: string }[] = [
  {
    label: "Sedã",
    url: "/vehicles/civic.jpg",
  },
  {
    label: "SUV",
    url: "/vehicles/compass.jpg",
  },
  {
    label: "Hatch",
    url: "/vehicles/onix.jpg",
  },
  {
    label: "Pickup",
    url: "/vehicles/strada.jpg",
  },
];

// ---------------------------------------------------------------------------
// Interface de Props do Modal
// ---------------------------------------------------------------------------
export interface VehicleFormModalProps {
  mode?: "create" | "edit";
  initialVehicle?: Vehicle | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSuccess?: (vehicle: Vehicle) => void;
  onAdd?: (vehicle: Vehicle) => void;
  onDelete?: (id: string) => void;
  trigger?: React.ReactNode;
}

// ---------------------------------------------------------------------------
// Componente Auxiliar de Campo
// ---------------------------------------------------------------------------
interface FieldProps {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  required?: boolean;
  children: React.ReactNode;
}

function Field({ id, label, icon: Icon, required, children }: FieldProps) {
  return (
    <div className="grid gap-1.5">
      <label
        htmlFor={id}
        className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"
      >
        <Icon className="h-3.5 w-3.5" />
        {label}
        {required && <span className="text-destructive">*</span>}
      </label>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Formulário Interno (Estado Autônomo)
// ---------------------------------------------------------------------------
interface VehicleFormContentProps {
  mode: "create" | "edit";
  initialVehicle?: Vehicle | null;
  onClose: () => void;
  onSuccess?: (vehicle: Vehicle) => void;
  onAdd?: (vehicle: Vehicle) => void;
  onDelete?: (id: string) => void;
}

function VehicleFormContent({
  mode,
  initialVehicle,
  onClose,
  onSuccess,
  onAdd,
  onDelete,
}: VehicleFormContentProps) {
  const currentYear = new Date().getFullYear();

  // Inicialização de estado limpa sem necessidade de useEffect
  const [make, setMake] = useState(
    mode === "edit" && initialVehicle ? (initialVehicle.make || initialVehicle.brand || "") : ""
  );
  const [model, setModel] = useState(
    mode === "edit" && initialVehicle ? (initialVehicle.model || "") : ""
  );
  const [version, setVersion] = useState(
    mode === "edit" && initialVehicle ? (initialVehicle.version || "") : ""
  );
  const [yearFab, setYearFab] = useState<number>(
    mode === "edit" && initialVehicle ? (initialVehicle.yearFab || currentYear) : currentYear
  );
  const [yearModel, setYearModel] = useState<number>(
    mode === "edit" && initialVehicle ? (initialVehicle.yearModel || currentYear + 1) : currentYear + 1
  );
  const [plate, setPlate] = useState(
    mode === "edit" && initialVehicle ? (initialVehicle.plate || initialVehicle.plateEnd || "") : ""
  );
  const [km, setKm] = useState<number>(
    mode === "edit" && initialVehicle
      ? (initialVehicle.km !== undefined ? initialVehicle.km : (initialVehicle.mileage || 0))
      : 0
  );
  const [price, setPrice] = useState<number>(
    mode === "edit" && initialVehicle ? (initialVehicle.price || 0) : 0
  );
  const [fipePrice, setFipePrice] = useState<number>(
    mode === "edit" && initialVehicle ? (initialVehicle.fipePrice || 0) : 0
  );
  const [status, setStatus] = useState<VehicleStatus>(
    mode === "edit" && initialVehicle ? (initialVehicle.status || "disponivel") : "disponivel"
  );
  const [fuel, setFuel] = useState(
    mode === "edit" && initialVehicle ? (initialVehicle.fuel || "Flex") : "Flex"
  );
  const [transmission, setTransmission] = useState(
    mode === "edit" && initialVehicle ? (initialVehicle.transmission || "Automático") : "Automático"
  );
  const [color, setColor] = useState(
    mode === "edit" && initialVehicle ? (initialVehicle.color || "Prata") : "Prata"
  );
  const [notes, setNotes] = useState(
    mode === "edit" && initialVehicle ? (initialVehicle.notes || "") : ""
  );

  // Galeria de imagens e Seleção de Capa
  const initialImages =
    mode === "edit" && initialVehicle
      ? initialVehicle.images && initialVehicle.images.length > 0
        ? initialVehicle.images
        : initialVehicle.imageUrl
        ? [initialVehicle.imageUrl]
        : []
      : [];

  const [images, setImages] = useState<string[]>(initialImages);
  const [coverImageUrl, setCoverImageUrl] = useState<string>(
    (mode === "edit" && initialVehicle ? (initialVehicle.imageUrl || "") : "") || initialImages[0] || ""
  );
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);

  // Estados de Exclusão
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Define uma URL como foto de capa e reorganiza o array colocando-a em primeiro lugar
  const handleSetCover = useCallback((url: string) => {
    setCoverImageUrl(url);
    setImages((prev) => [url, ...prev.filter((item) => item !== url)]);
  }, []);

  // Remove imagem da galeria e atualiza a capa de forma sincronizada
  const handleRemoveImage = useCallback((indexToRemove: number) => {
    const removedUrl = images[indexToRemove];
    const updatedImages = images.filter((_, idx) => idx !== indexToRemove);

    setImages(updatedImages);

    // Se a foto removida era a capa, elege a primeira foto restante como nova capa
    if (coverImageUrl === removedUrl) {
      setCoverImageUrl(updatedImages[0] || "");
    }
  }, [images, coverImageUrl]);

  // Processamento de Upload e Conversão WebP
  const handleFilesSelected = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setUploadProgress(`Otimizando ${files.length} imagem(ns) em WebP...`);

    try {
      const uploadedUrls: string[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setUploadProgress(`Convertendo ${i + 1}/${files.length}: ${file.name}...`);

        // 1. Otimização Client-Side WebP
        const { blob, fileName } = await convertImageToWebP(file, 1600, 0.85);

        // 2. Disparo para Server Action
        const formData = new FormData();
        formData.append("file", blob, fileName);
        formData.append("fileName", fileName);

        const result = await uploadVehicleImageAction(formData);
        if (result.success && result.url) {
          uploadedUrls.push(result.url);
        } else {
          const localUrl = URL.createObjectURL(blob);
          uploadedUrls.push(localUrl);
        }
      }

      setImages((prev) => {
        const updated = [...prev, ...uploadedUrls];
        if (!coverImageUrl && updated.length > 0) {
          setCoverImageUrl(updated[0]);
        }
        return updated;
      });
      setUploadProgress(null);
    } catch (err) {
      console.error("[Upload WebP Error]", err);
      setUploadProgress("Erro ao processar imagem.");
    } finally {
      setIsUploading(false);
    }
  };

  // Drag & Drop Handlers
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFilesSelected(e.dataTransfer.files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  // Confirmação de exclusão do veículo
  const handleConfirmDelete = async () => {
    if (!initialVehicle) return;
    setIsDeleting(true);
    try {
      const res = await deleteVehicleAction(initialVehicle.id);
      if (res.success) {
        onDelete?.(initialVehicle.id);
        setIsDeleteConfirmOpen(false);
        onClose();
      }
    } finally {
      setIsDeleting(false);
    }
  };

  // Validação dos campos mandatórios
  const isFormValid =
    make.trim().length > 0 &&
    model.trim().length > 0 &&
    plate.trim().length > 0 &&
    price > 0;

  // Submissão do formulário
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid || isPending) return;

    startTransition(async () => {
      const primaryPhoto = coverImageUrl || images[0] || "";
      const vehiclePayload: VehicleFormData & { images?: string[]; fipePrice?: number; color?: string; notes?: string } = {
        make: make.trim(),
        model: model.trim(),
        version: version.trim(),
        yearFab,
        yearModel,
        plate: plate.trim().toUpperCase(),
        km,
        price,
        status,
        imageUrl: primaryPhoto,
        images: images, // Array atualizado pós-exclusão
        fipePrice: fipePrice > 0 ? fipePrice : undefined,
        fuel,
        transmission,
        color,
        notes: notes.trim() || undefined,
      };

      if (mode === "edit" && initialVehicle) {
        const res = await updateVehicleAction(initialVehicle.id, vehiclePayload);
        const resolvedVehicle = res.vehicle || {
          ...initialVehicle,
          ...vehiclePayload,
        };
        if (onSuccess) {
          onSuccess(resolvedVehicle);
        } else if (onAdd) {
          onAdd(resolvedVehicle);
        }
      } else {
        const res = await createVehicleAction(vehiclePayload);
        const resolvedVehicle = res.vehicle || {
          id: `v-${Date.now()}`,
          ...vehiclePayload,
        };
        if (onSuccess) {
          onSuccess(resolvedVehicle);
        } else if (onAdd) {
          onAdd(resolvedVehicle);
        }
      }

      onClose();
    });
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="mt-4 space-y-5">
        {/* ============================================================= */}
        {/* SEÇÃO 1: FOTOS & UPLOAD WEBP                                 */}
        {/* ============================================================= */}
        <div className="space-y-3 rounded-xl border border-white/5 bg-black/40 p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
            <div>
              <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-orange-400">
                <ImageIcon className="h-4 w-4" />
                <span>Fotos do Veículo</span>
              </label>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                Adicione fotos do exterior e interior do veículo. Clique em uma foto para defini-la como Capa.
              </p>
            </div>
            {images.length > 0 && (
              <span className="text-[11px] font-medium text-zinc-400 shrink-0">
                {images.length} foto(s) cadastradas
              </span>
            )}
          </div>

          {/* Dropzone de Upload */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-5 text-center cursor-pointer transition-all",
              isUploading
                ? "border-orange-500/50 bg-orange-500/5"
                : "border-white/10 bg-white/[0.02] hover:border-orange-500/40 hover:bg-orange-500/[0.02]"
            )}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png, image/jpeg, image/webp"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files) handleFilesSelected(e.target.files);
              }}
            />

            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-500/10 text-orange-400 mb-2">
              {isUploading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Upload className="h-5 w-5" />
              )}
            </div>

            <p className="text-xs font-semibold text-zinc-200">
              {isUploading
                ? (uploadProgress || "Enviando e otimizando fotos...")
                : "Arraste fotos aqui ou clique para selecionar do computador"}
            </p>
            <p className="text-[10px] text-zinc-500 mt-1">
              Suporta múltiplos arquivos PNG, JPG e WebP (conversão e compressão automática).
            </p>
          </div>

          {/* Grid de Miniaturas da Galeria com seleção interativa de Capa */}
          {images.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5 pt-2">
              {images.map((imgSrc, idx) => {
                const isCover = imgSrc === coverImageUrl || (idx === 0 && !coverImageUrl);
                return (
                  <div
                    key={`${imgSrc}-${idx}`}
                    onClick={() => handleSetCover(imgSrc)}
                    className={cn(
                      "group relative aspect-video rounded-lg overflow-hidden border bg-zinc-900 cursor-pointer transition-all",
                      isCover
                        ? "border-orange-500 ring-2 ring-orange-500/40 shadow-md shadow-orange-500/20"
                        : "border-white/10 hover:border-white/30"
                    )}
                  >
                    <Image
                      src={imgSrc}
                      alt={`Foto ${idx + 1}`}
                      fill
                      unoptimized
                      className="object-cover"
                    />

                    {/* Badge Capa */}
                    {isCover && (
                      <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-orange-600 text-white shadow z-10">
                        Capa
                      </span>
                    )}

                    {/* Overlay no hover para fotos que não são capa */}
                    {!isCover && (
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-1">
                        <span className="text-[10px] font-bold text-white bg-orange-600/90 hover:bg-orange-600 px-2 py-1 rounded shadow">
                          Definir como Capa
                        </span>
                      </div>
                    )}

                    {/* Botão Remover Foto */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveImage(idx);
                      }}
                      className="absolute top-1.5 right-1.5 p-1 rounded bg-black/60 hover:bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-all z-20"
                      title="Remover foto"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Atalhos Rápidos de Fotos Mock & Input de URL para compatibilidade */}
          <div className="pt-2 border-t border-white/5 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11px] text-zinc-400">Seleção Rápida de Fotos:</span>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_PHOTOS.map((p) => (
                  <Button
                    key={p.label}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-6 px-2 text-[10px] border-white/10 bg-white/5 hover:bg-white/10 text-zinc-300"
                    onClick={() => {
                      handleSetCover(p.url);
                    }}
                  >
                    {p.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Input direto de URL */}
            <div className="flex items-center gap-2">
              <Input
                id="vehicle-image-url"
                placeholder="Ou cole a URL da foto: https://..."
                value={coverImageUrl}
                onChange={(e) => {
                  const val = e.target.value;
                  setCoverImageUrl(val);
                  if (val.trim() && !images.includes(val)) {
                    setImages((prev) => [val, ...prev]);
                  }
                }}
                className="h-8 text-xs border-white/10 bg-white/5 text-white"
              />
            </div>
          </div>
        </div>

        {/* ============================================================= */}
        {/* SEÇÃO 2: DADOS TÉCNICOS & CADASTRAIS                          */}
        {/* ============================================================= */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Marca */}
          <Field id="make" label="Marca" icon={Car} required>
            <Input
              id="make"
              placeholder="Ex: Honda, Toyota, Volkswagen"
              value={make}
              onChange={(e) => setMake(e.target.value)}
              required
              className="h-9 border-white/10 bg-white/5 text-xs text-white"
            />
          </Field>

          {/* Modelo */}
          <Field id="model" label="Modelo" icon={Car} required>
            <Input
              id="model"
              placeholder="Ex: Civic, Corolla, T-Cross"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              required
              className="h-9 border-white/10 bg-white/5 text-xs text-white"
            />
          </Field>

          {/* Versão */}
          <Field id="version" label="Versão / Trim" icon={Settings2}>
            <Input
              id="version"
              placeholder="Ex: EXL 2.0 Flex Aut., Premier"
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              className="h-9 border-white/10 bg-white/5 text-xs text-white"
            />
          </Field>

          {/* Placa */}
          <Field id="plate" label="Placa / Final da Placa" icon={CreditCard} required>
            <Input
              id="plate"
              placeholder="Ex: BRA2E22 ou 2E22"
              value={plate}
              onChange={(e) => setPlate(e.target.value.toUpperCase())}
              required
              className="h-9 border-white/10 bg-white/5 text-xs text-white uppercase font-mono"
            />
          </Field>

          {/* Ano Fab / Ano Mod */}
          <div className="grid grid-cols-2 gap-2">
            <Field id="yearFab" label="Ano Fab." icon={Calendar}>
              <Input
                id="yearFab"
                type="number"
                min="1980"
                max={currentYear + 2}
                value={yearFab || ""}
                onChange={(e) => setYearFab(Number(e.target.value))}
                className="h-9 border-white/10 bg-white/5 text-xs text-white"
              />
            </Field>
            <Field id="yearModel" label="Ano Mod." icon={Calendar}>
              <Input
                id="yearModel"
                type="number"
                min="1980"
                max={currentYear + 2}
                value={yearModel || ""}
                onChange={(e) => setYearModel(Number(e.target.value))}
                className="h-9 border-white/10 bg-white/5 text-xs text-white"
              />
            </Field>
          </div>

          {/* Quilometragem */}
          <Field id="km" label="Quilometragem (KM)" icon={Gauge}>
            <Input
              id="km"
              type="number"
              min="0"
              placeholder="Ex: 45000"
              value={km || ""}
              onChange={(e) => setKm(Number(e.target.value))}
              className="h-9 border-white/10 bg-white/5 text-xs text-white"
            />
          </Field>

          {/* Preço de Venda */}
          <Field id="price" label="Preço de Venda (R$)" icon={CreditCard} required>
            <Input
              id="price"
              type="number"
              min="1"
              placeholder="Ex: 149900"
              value={price || ""}
              onChange={(e) => setPrice(Number(e.target.value))}
              required
              className="h-9 border-white/10 bg-white/5 text-xs font-bold text-emerald-400"
            />
          </Field>

          {/* Preço Tabela FIPE */}
          <Field id="fipePrice" label="Tabela FIPE (R$)" icon={CreditCard}>
            <Input
              id="fipePrice"
              type="number"
              min="0"
              placeholder="Ex: 155000"
              value={fipePrice || ""}
              onChange={(e) => setFipePrice(Number(e.target.value))}
              className="h-9 border-white/10 bg-white/5 text-xs text-zinc-300"
            />
          </Field>

          {/* Status */}
          <Field id="status" label="Status Comercial" icon={Check}>
            <select
              id="status"
              value={status}
              onChange={(e) => setStatus(e.target.value as VehicleStatus)}
              className="flex h-9 w-full rounded-md border border-white/10 bg-zinc-900 px-3 py-1 text-xs text-white shadow-sm focus:outline-none focus:ring-1 focus:ring-orange-500"
            >
              <option value="disponivel">Disponível</option>
              <option value="reservado">Reservado</option>
              <option value="vendido">Vendido</option>
            </select>
          </Field>

          {/* Combustível */}
          <Field id="fuel" label="Combustível" icon={Fuel}>
            <select
              id="fuel"
              value={fuel}
              onChange={(e) => setFuel(e.target.value)}
              className="flex h-9 w-full rounded-md border border-white/10 bg-zinc-900 px-3 py-1 text-xs text-white shadow-sm focus:outline-none focus:ring-1 focus:ring-orange-500"
            >
              <option value="Flex">Flex (Álcool/Gasolina)</option>
              <option value="Gasolina">Gasolina</option>
              <option value="Híbrido">Híbrido (HEV/PHEV)</option>
              <option value="Elétrico">Elétrico (BEV)</option>
              <option value="Diesel">Diesel</option>
            </select>
          </Field>

          {/* Câmbio */}
          <Field id="transmission" label="Câmbio / Transmissão" icon={Settings2}>
            <select
              id="transmission"
              value={transmission}
              onChange={(e) => setTransmission(e.target.value)}
              className="flex h-9 w-full rounded-md border border-white/10 bg-zinc-900 px-3 py-1 text-xs text-white shadow-sm focus:outline-none focus:ring-1 focus:ring-orange-500"
            >
              <option value="Automático">Automático</option>
              <option value="Manual">Manual</option>
              <option value="CVT">CVT</option>
              <option value="Automatizado / Dupla Embreagem">Automatizado (DCT)</option>
            </select>
          </Field>

          {/* Cor */}
          <Field id="color" label="Cor Externa" icon={Car}>
            <Input
              id="color"
              placeholder="Ex: Branco Pérola, Preto, Prata"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="h-9 border-white/10 bg-white/5 text-xs text-white"
            />
          </Field>
        </div>

        {/* Observações / Notas */}
        <Field id="notes" label="Observações & Opcionais do Veículo" icon={StickyNote}>
          <textarea
            id="notes"
            rows={2}
            placeholder="Ex: Único dono, todas revisões na concessionária, teto solar, bancos em couro."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="flex w-full rounded-md border border-white/10 bg-white/5 p-2 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
          />
        </Field>

        {/* Rodapé com Botões de Ação */}
        <DialogFooter className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 pt-4 border-t border-white/10">
          {mode === "edit" && initialVehicle ? (
            <div className="flex items-center justify-start w-full sm:w-auto">
              <button
                type="button"
                id="btn-delete-vehicle-modal"
                onClick={() => setIsDeleteConfirmOpen(true)}
                disabled={isPending || isDeleting}
                className="text-xs font-medium text-rose-400 hover:text-rose-300 hover:underline flex items-center gap-1.5 transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Excluir este veículo</span>
              </button>
            </div>
          ) : (
            <div />
          )}

          <div className="flex items-center justify-end gap-2 w-full sm:w-auto">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={isPending || isDeleting}
              className="text-xs text-zinc-400 hover:text-white"
            >
              Cancelar
            </Button>

            <Button
              type="submit"
              disabled={!isFormValid || isPending || isUploading || isDeleting}
              className={cn(
                "text-xs font-bold text-white shadow-md gap-1.5 transition-all",
                isFormValid && !isPending && !isDeleting
                  ? "bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 shadow-orange-500/20"
                  : "opacity-50 cursor-not-allowed bg-zinc-800"
              )}
            >
              {isPending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Salvando...</span>
                </>
              ) : (
                <span>{mode === "edit" ? "Salvar Alterações" : "Cadastrar Veículo"}</span>
              )}
            </Button>
          </div>
        </DialogFooter>
      </form>

      {/* Modal de Confirmação de Exclusão */}
      <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-md bg-zinc-950 border-white/10 text-white p-6 shadow-2xl">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/10 text-rose-500 border border-rose-500/20">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-white">
                  Excluir Veículo do Estoque
                </DialogTitle>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Esta ação removerá o veículo do catálogo permanentemente.
                </p>
              </div>
            </div>
          </DialogHeader>

          <p className="text-sm text-zinc-300 py-3">
            Tem certeza que deseja remover o{" "}
            <strong className="text-white font-semibold">
              {make || initialVehicle?.make} {model || initialVehicle?.model}
            </strong>? Esta ação removerá o veículo do catálogo permanentemente.
          </p>

          <DialogFooter className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsDeleteConfirmOpen(false)}
              disabled={isDeleting}
              className="text-xs text-zinc-400 hover:text-white"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="bg-rose-600 hover:bg-rose-500 text-white font-medium text-xs gap-1.5 shadow-md shadow-rose-600/20"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Excluindo...</span>
                </>
              ) : (
                <>
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Confirmar Exclusão</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ---------------------------------------------------------------------------
// Componente Principal
// ---------------------------------------------------------------------------
export function VehicleFormModal({
  mode = "create",
  initialVehicle,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  onSuccess,
  onAdd,
  onDelete,
  trigger,
}: VehicleFormModalProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? (controlledOnOpenChange || (() => {})) : setInternalOpen;

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      {trigger ? (
        <DialogTrigger asChild>{trigger}</DialogTrigger>
      ) : mode === "create" ? (
        <DialogTrigger asChild>
          <Button
            id="btn-new-vehicle"
            data-testid="btn-new-vehicle"
            size="sm"
            className="text-xs font-semibold bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white shadow-md shadow-orange-500/20 gap-1.5"
            aria-label="Adicionar novo veículo ao estoque"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>+ Novo Veículo</span>
          </Button>
        </DialogTrigger>
      ) : null}

      <DialogContent
        id="modal-new-vehicle"
        data-testid="modal-new-vehicle"
        className="max-h-[92vh] max-w-[calc(100vw-2rem)] sm:max-w-2xl overflow-y-auto border border-white/10 bg-[#121216] text-white p-4 sm:p-6 shadow-2xl"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold text-white">
            <Car className="h-5 w-5 text-orange-500" />
            <span>{mode === "edit" ? "Editar Veículo" : "Cadastrar Veículo"}</span>
          </DialogTitle>
          <p className="text-xs text-zinc-400">
            {mode === "edit"
              ? "Atualize os dados técnicos, comerciais e gerencie a galeria de fotos do veículo."
              : "Preencha as informações do veículo e adicione fotos para inclusão no estoque."}
          </p>
        </DialogHeader>

        {isOpen && (
          <VehicleFormContent
            key={`${mode}-${initialVehicle?.id || "new"}`}
            mode={mode}
            initialVehicle={initialVehicle}
            onClose={() => setOpen(false)}
            onSuccess={onSuccess}
            onAdd={onAdd}
            onDelete={onDelete}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
