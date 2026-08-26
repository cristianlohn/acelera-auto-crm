/**
 * @file stock-template.test.tsx
 * @description Suíte de Testes de Integração para o Modelo de Planilha de Estoque (CSV) e Ações de Download.
 *
 * ============================================================================
 * ESCOPO DE TESTE & RASTREABILIDADE
 * ============================================================================
 * Cenários Testados:
 *   - [IT-18.1]: Existência física e integridade do arquivo CSV modelo (public/templates/modelo_estoque.csv).
 *   - [IT-18.2]: Validação de todos os cabeçalhos obrigatórios e linhas de exemplo automotivas no CSV.
 *   - [IT-18.3]: Renderização do botão de download da planilha modelo na tela de Estoque (/vehicles e /estoque).
 *   - [IT-18.4]: Verificação dos atributos href, download e tooltip orientativo de importação.
 *
 * Padrão Estrutural: AAA (Arrange, Act, Assert)
 * Ambiente de Execução: Vitest / Testing Library / Node fs
 * ============================================================================
 */

import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { render, screen } from "@testing-library/react";
import VehiclesPage from "@/app/(dashboard)/vehicles/page";

describe("[IT-18] Modelo de Planilha Padrão para Importação de Estoque (CSV)", () => {
  const templatePath = path.join(
    process.cwd(),
    "public",
    "templates",
    "modelo_estoque.csv"
  );

  it("[IT-18.1] Deve existir fisicamente o arquivo modelo_estoque.csv no diretório public/templates", () => {
    // Assert
    expect(fs.existsSync(templatePath)).toBe(true);
  });

  it("[IT-18.2] Deve conter o cabeçalho padrão estrito e linhas de veículos de exemplo em UTF-8", () => {
    // Act
    const content = fs.readFileSync(templatePath, "utf-8").trim();
    const lines = content.split(/\r?\n/);

    // Assert: Cabeçalho
    const expectedHeaders = [
      "marca",
      "modelo",
      "versao",
      "ano_fabricacao",
      "ano_modelo",
      "quilometragem",
      "preco_venda",
      "preco_custo",
      "cor",
      "combustivel",
      "cambio",
      "placa",
      "status",
    ];

    const actualHeaders = lines[0].split(",");
    expect(actualHeaders).toEqual(expectedHeaders);

    // Assert: Linhas de exemplo
    expect(lines.length).toBeGreaterThanOrEqual(5); // Header + 4 linhas
    expect(content).toContain("Corolla Cross");
    expect(content).toContain("Civic");
    expect(content).toContain("Compass");
    expect(content).toContain("Polo");
  });

  it("[IT-18.3] Deve renderizar o botão de download 'Baixar Planilha Modelo (CSV)' na tela de Estoque", () => {
    // Arrange & Act
    render(<VehiclesPage />);

    // Assert
    const downloadBtn = screen.getByRole("link", {
      name: /baixar planilha modelo \(csv\)/i,
    });
    expect(downloadBtn).toBeInTheDocument();
  });

  it("[IT-18.4] Deve conter os atributos href, download e tooltip orientativo corretos", () => {
    // Arrange & Act
    render(<VehiclesPage />);

    const downloadBtn = screen.getByRole("link", {
      name: /baixar planilha modelo \(csv\)/i,
    });

    // Assert
    expect(downloadBtn).toHaveAttribute("href", "/templates/modelo_estoque.csv");
    expect(downloadBtn).toHaveAttribute(
      "download",
      "modelo_estoque_acelera.csv"
    );
    expect(downloadBtn).toHaveAttribute(
      "title",
      "Preencha os dados dos veículos da sua loja seguindo as colunas do modelo antes de importar."
    );
  });
});
