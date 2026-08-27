/**
 * @file new-vehicle-modal.tsx
 * @description Modal de cadastro de novo veículo no estoque.
 *
 * Responsabilidades:
 * - Formulário com validação nativa + feedback visual por campo.
 * - Preview automático da foto ao digitar a URL.
 * - Lista de fotos mock rápidas para demonstração.
 * - Emite `onAdd` com o `Vehicle` criado ao submeter.
 */

"use client";

import React, { useState, useCallback, useTransition } from "react";
import {
  Plus,
  Car,
  Calendar,
  Gauge,
  CreditCard,
  Image as ImageIcon,
  Loader2,
  StickyNote,
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
import { createVehicle } from "@/lib/mock-data";
import type { Vehicle, VehicleFormData } from "@/types/crm";

// ---------------------------------------------------------------------------
// Fotos mock para seleção rápida
// ---------------------------------------------------------------------------

const QUICK_PHOTOS: { label: string; url: string }[] = [
  {
    label: "Sedã",
    url: "https://images.unsplash.com/photo-1588258952541-23bcfc53ce82?w=800&q=80",
  },
  {
    label: "SUV",
    url: "https://images.unsplash.com/photo-1536700503405-7ba39f5b6b4c?w=800&q=80",
  },
  {
    label: "Hatch",
    url: "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=800&q=80",
  },
  {
    label: "Pickup",
    url: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80",
  },
];

// ---------------------------------------------------------------------------
// Estado inicial do formulário
// ---------------------------------------------------------------------------

const INITIAL_FORM: VehicleFormData = {
  make: "",
  model: "",
  version: "",
  yearFab: new Date().getFullYear(),
  yearModel: new Date().getFullYear() + 1,
  plate: "",
  km: 0,
  price: 0,
  status: "disponivel",
  imageUrl: "",
};

// ---------------------------------------------------------------------------
// Componente auxiliar: campo de formulário com label e ícone
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
// Props do modal
// ---------------------------------------------------------------------------

export interface NewVehicleModalProps {
  /** Chamado quando o formulário é submetido com sucesso. */
  onAdd: (vehicle: Vehicle) => void;
  /** Disparador customizado do botão de abertura. */
  trigger?: React.ReactNode;
}

// ---------------------------------------------------------------------------
// Modal principal
// ---------------------------------------------------------------------------

/**
 * Dialog de cadastro de novo veículo com preview de foto e validação de campos.
 */
export function NewVehicleModal({ onAdd, trigger }: NewVehicleModalProps) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<VehicleFormData>(INITIAL_FORM);
  const [imgPreviewError, setImgPreviewError] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Atualiza campo genérico do formulário
  const setField = useCallback(
    <K extends keyof VehicleFormData>(key: K, value: VehicleFormData[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
      if (key === "imageUrl") setImgPreviewError(false);
    },
    []
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      const { name, value, type } = e.target as HTMLInputElement;
      const parsedValue =
        type === "number" ? (value === "" ? 0 : Number(value)) : value;
      setField(name as keyof VehicleFormData, parsedValue as never);
    },
    [setField]
  );

  const isFormValid =
    form.make.trim().length > 0 &&
    form.model.trim().length > 0 &&
    form.plate.trim().length > 0 &&
    form.price > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    startTransition(() => {
      const newVehicle = createVehicle(form);
      onAdd(newVehicle);
      setForm(INITIAL_FORM);
      setOpen(false);
    });
  };

  const handleQuickPhoto = useCallback(
    (url: string) => setField("imageUrl", url),
    [setField]
  );

  /**
   * Verifica se a URL é sintaticamente válida antes de renderizar o preview.
   * Evita crash com `new URL()` em URLs parciais.
   */
  const isValidUrl = (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const hasValidImage =
    form.imageUrl.trim() !== "" &&
    isValidUrl(form.imageUrl) &&
    !imgPreviewError;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ? (
          trigger
        ) : (
          <Button
            id="btn-new-vehicle"
            className="gap-2 bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg shadow-orange-500/25 hover:from-orange-600 hover:to-red-600 hover:shadow-orange-500/35"
            aria-label="Adicionar novo veículo ao estoque"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Novo Veículo</span>
          </Button>
        )}
      </DialogTrigger>

      <DialogContent
        id="modal-new-vehicle"
        className="max-h-[90dvh] w-full max-w-lg overflow-y-auto"
        aria-describedby="modal-new-vehicle-desc"
      >
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-red-600 shadow-lg shadow-orange-500/30">
              <Car className="h-4 w-4 text-white" />
            </div>
            <div>
              <DialogTitle>Cadastrar Veículo</DialogTitle>
              <p
                id="modal-new-vehicle-desc"
                className="text-xs text-muted-foreground"
              >
                Preencha os dados do veículo para o estoque
              </p>
            </div>
          </div>
        </DialogHeader>

        <form
          id="form-new-vehicle"
          onSubmit={handleSubmit}
          className="mt-1 grid gap-4"
          noValidate
        >
          {/* ---------------------------------------------------------------- */}
          {/* Identificação                                                      */}
          {/* ---------------------------------------------------------------- */}
          <div className="grid grid-cols-2 gap-3">
            <Field id="vehicle-make" label="Marca" icon={Car} required>
              <Input
                id="vehicle-make"
                name="make"
                value={form.make}
                onChange={handleChange}
                placeholder="Ex: Honda"
                required
              />
            </Field>
            <Field id="vehicle-model" label="Modelo" icon={Car} required>
              <Input
                id="vehicle-model"
                name="model"
                value={form.model}
                onChange={handleChange}
                placeholder="Ex: Civic"
                required
              />
            </Field>
          </div>

          <Field id="vehicle-version" label="Versão / Motorização" icon={Car}>
            <Input
              id="vehicle-version"
              name="version"
              value={form.version}
              onChange={handleChange}
              placeholder="Ex: EXL 2.0 Flex Aut."
            />
          </Field>

          {/* ---------------------------------------------------------------- */}
          {/* Anos                                                               */}
          {/* ---------------------------------------------------------------- */}
          <div className="grid grid-cols-2 gap-3">
            <Field id="vehicle-yearFab" label="Ano Fabricação" icon={Calendar} required>
              <Input
                id="vehicle-yearFab"
                name="yearFab"
                type="number"
                min={1990}
                max={new Date().getFullYear() + 1}
                value={form.yearFab}
                onChange={handleChange}
                required
              />
            </Field>
            <Field id="vehicle-yearModel" label="Ano Modelo" icon={Calendar}>
              <Input
                id="vehicle-yearModel"
                name="yearModel"
                type="number"
                min={1990}
                max={new Date().getFullYear() + 2}
                value={form.yearModel}
                onChange={handleChange}
              />
            </Field>
          </div>

          {/* ---------------------------------------------------------------- */}
          {/* Dados técnicos                                                     */}
          {/* ---------------------------------------------------------------- */}
          <div className="grid grid-cols-2 gap-3">
            <Field id="vehicle-plate" label="Placa" icon={CreditCard} required>
              <Input
                id="vehicle-plate"
                name="plate"
                value={form.plate}
                onChange={handleChange}
                placeholder="Ex: BRA2E22"
                maxLength={7}
                className="uppercase"
                required
              />
            </Field>
            <Field id="vehicle-km" label="Quilometragem" icon={Gauge}>
              <Input
                id="vehicle-km"
                name="km"
                type="number"
                min={0}
                value={form.km || ""}
                onChange={handleChange}
                placeholder="Ex: 18500"
              />
            </Field>
          </div>

          {/* ---------------------------------------------------------------- */}
          {/* Preço e Status                                                     */}
          {/* ---------------------------------------------------------------- */}
          <div className="grid grid-cols-2 gap-3">
            <Field id="vehicle-price" label="Preço de Venda (R$)" icon={CreditCard} required>
              <Input
                id="vehicle-price"
                name="price"
                type="number"
                min={0}
                value={form.price || ""}
                onChange={handleChange}
                placeholder="Ex: 149900"
                required
              />
            </Field>
            <Field id="vehicle-status" label="Status inicial" icon={Car}>
              <select
                id="vehicle-status"
                name="status"
                value={form.status}
                onChange={handleChange}
                className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm shadow-sm transition-colors focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="disponivel">Disponível</option>
                <option value="reservado">Reservado</option>
                <option value="vendido">Vendido</option>
              </select>
            </Field>
          </div>

          {/* ---------------------------------------------------------------- */}
          {/* Foto                                                               */}
          {/* ---------------------------------------------------------------- */}
          <div className="grid gap-2">
            <Field id="vehicle-imageUrl" label="URL da Foto de Capa" icon={ImageIcon}>
              <Input
                id="vehicle-imageUrl"
                name="imageUrl"
                type="url"
                value={form.imageUrl}
                onChange={handleChange}
                placeholder="https://images.unsplash.com/..."
              />
            </Field>

            {/* Seleção rápida de fotos mock */}
            <div className="flex flex-wrap gap-2">
              {QUICK_PHOTOS.map((photo) => (
                <button
                  key={photo.url}
                  type="button"
                  id={`quick-photo-${photo.label.toLowerCase()}`}
                  onClick={() => handleQuickPhoto(photo.url)}
                  className={cn(
                    "rounded-md border px-2.5 py-1 text-xs font-medium transition-colors hover:bg-accent hover:text-foreground",
                    form.imageUrl === photo.url
                      ? "border-orange-500 bg-orange-500/10 text-orange-600"
                      : "border-border text-muted-foreground"
                  )}
                >
                  {photo.label}
                </button>
              ))}
            </div>

            {/* Preview – usa <img> nativa para aceitar qualquer URL sem restrição do next/image */}
            {form.imageUrl.trim() !== "" && (
              <div className="relative aspect-video w-full overflow-hidden rounded-lg border bg-muted">
                {hasValidImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={form.imageUrl}
                    alt="Preview da foto do veículo"
                    className="h-full w-full object-cover"
                    onError={() => setImgPreviewError(true)}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center gap-2 text-xs text-muted-foreground">
                    <ImageIcon className="h-4 w-4" />
                    {isValidUrl(form.imageUrl)
                      ? "Imagem não carregou. Verifique a URL."
                      : "Digite uma URL válida para o preview."}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ---------------------------------------------------------------- */}
          {/* Observações                                                        */}
          {/* ---------------------------------------------------------------- */}
          <Field id="vehicle-notes" label="Observações / Opcionais" icon={StickyNote}>
            <textarea
              id="vehicle-notes"
              name="notes"
              rows={2}
              placeholder="Ex: Revisado, único dono, IPVA pago..."
              className="w-full rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
            />
          </Field>

          {/* ---------------------------------------------------------------- */}
          {/* Footer                                                             */}
          {/* ---------------------------------------------------------------- */}
          <DialogFooter className="-mx-4 -mb-4 mt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button
              id="btn-submit-vehicle"
              type="submit"
              disabled={isPending || !form.make || !form.model || !form.plate || !form.price}
              className="gap-2 bg-gradient-to-r from-orange-500 to-red-500 text-white hover:from-orange-600 hover:to-red-600"
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Cadastrar Veículo
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
