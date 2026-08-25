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

// Mock global do Clipboard API para jsdom
if (!navigator.clipboard) {
  Object.defineProperty(navigator, "clipboard", {
    value: {
      writeText: vi.fn().mockResolvedValue(undefined),
      readText: vi.fn().mockResolvedValue(""),
    },
    configurable: true,
    writable: true,
  });
}
