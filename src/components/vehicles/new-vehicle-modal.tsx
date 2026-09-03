/**
 * @file new-vehicle-modal.tsx
 * @description Modal unificado de cadastro de novo veículo no estoque, delegando para VehicleFormModal.
 */

"use client";

import React from "react";
import { VehicleFormModal } from "@/components/vehicles/vehicle-form-modal";
import type { Vehicle } from "@/types/crm";

export interface NewVehicleModalProps {
  onAdd: (vehicle: Vehicle) => void;
  trigger?: React.ReactNode;
}

export function NewVehicleModal({ onAdd, trigger }: NewVehicleModalProps) {
  return (
    <VehicleFormModal
      mode="create"
      onAdd={onAdd}
      trigger={trigger}
    />
  );
}
