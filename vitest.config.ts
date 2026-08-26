/**
 * @file vitest.config.ts
 * @description Configuração do Vitest para o Acelera Auto CRM.
 *
 * - Ambiente jsdom para simular o DOM do browser em testes de componentes React.
 * - Alias @/ mapeado para ./src/ (espelho do tsconfig.json).
 * - Setup global importa @testing-library/jest-dom matchers.
 */

import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],

  test: {
    /** Simula APIs de browser (document, window, etc.) */
    environment: "happy-dom",

    /** Arquivo executado antes de cada suíte de testes */
    setupFiles: ["./src/__tests__/setup.ts"],

    /** Inclui apenas arquivos dentro de src/__tests__ */
    include: ["src/__tests__/**/*.test.{ts,tsx}"],

    /** Configuração de cobertura de código */
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "json-summary"],
      include: ["src/lib/**", "src/components/**"],
      exclude: ["src/__tests__/**", "src/components/ui/**"],
    },

    /** Globals (describe, it, expect) sem necessidade de import */
    globals: true,
  },

  resolve: {
    alias: {
      /** Resolve @/ para src/ — espelho exato do tsconfig paths */
      "@": resolve(process.cwd(), "./src"),
    },
  },
});
