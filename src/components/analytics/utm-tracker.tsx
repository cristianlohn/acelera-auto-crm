/**
 * @file utm-tracker.tsx
 * @description Componente invisível do lado do cliente para rastrear parâmetros de aquisição UTM.
 * Salva cookie 'acelera_attribution' silenciosamente sem redirecionamentos ou impacto na UI.
 */

"use client";

import { useEffect } from "react";
import {
  extractUtmFromSearchParams,
  getStoredAttribution,
  saveAttributionCookie,
  resolveAttribution,
} from "@/lib/analytics/utm";

export function UtmTracker() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const searchParams = new URLSearchParams(window.location.search);
      const pathname = window.location.pathname || "/";

      // Só processa e grava se houver parâmetros UTM na URL
      const hasUtms = extractUtmFromSearchParams(searchParams, pathname);
      if (hasUtms) {
        const stored = getStoredAttribution();
        const resolved = resolveAttribution(searchParams, pathname, stored);
        saveAttributionCookie(resolved);
      }
    } catch {
      // Execução silenciosa defensiva
    }
  }, []);

  return null;
}
