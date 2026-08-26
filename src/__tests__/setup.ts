/**
 * @file setup.ts
 * @description Arquivo de configuração global do ambiente de testes Vitest.
 *
 * Importa os matchers customizados do @testing-library/jest-dom para que
 * asserções como `toBeInTheDocument()`, `toHaveTextContent()`, etc.
 * estejam disponíveis globalmente em todos os testes.
 */

import "@testing-library/jest-dom";
import { vi } from "vitest";

// Mock global de fontes do Next.js
vi.mock("next/font/google", () => ({
  Geist: () => ({ variable: "--font-sans" }),
  Geist_Mono: () => ({ variable: "--font-geist-mono" }),
}));

// Mock global do Clipboard API para jsdom
if (typeof navigator !== "undefined" && !navigator.clipboard) {
  Object.defineProperty(navigator, "clipboard", {
    value: {
      writeText: vi.fn().mockResolvedValue(undefined),
      readText: vi.fn().mockResolvedValue(""),
    },
    configurable: true,
    writable: true,
  });
}
