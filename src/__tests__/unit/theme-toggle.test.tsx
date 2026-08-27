/**
 * @file theme-toggle.test.tsx
 * @description Suíte de Testes Unitários do Componente Alternador de Tema (ThemeToggle).
 *
 * Escopo de Testes:
 * - [UT-THEME.1]: Renderização segura e acessível do botão (aria-label, data-testid).
 * - [UT-THEME.2]: Alternância de tema ao clicar (disparo de setTheme dark -> light e light -> dark).
 * - [UT-THEME.3]: Renderização com rótulo descritivo (showLabel = true).
 */

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeToggle } from "@/components/theme-toggle";
import * as nextThemes from "next-themes";

vi.mock("next-themes", () => ({
  useTheme: vi.fn(),
  ThemeProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe("[UT-THEME] Componente Alternador de Tema (ThemeToggle)", () => {
  const mockSetTheme = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("[UT-THEME.1] Deve renderizar o botão com acessibilidade e testid corretos", () => {
    vi.mocked(nextThemes.useTheme).mockReturnValue({
      theme: "light",
      resolvedTheme: "light",
      setTheme: mockSetTheme,
      themes: ["light", "dark", "system"],
      systemTheme: "light",
      forcedTheme: undefined,
    });

    render(<ThemeToggle />);

    const button = screen.getByTestId("theme-toggle-btn");
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute("aria-label", "Alternar tema");
  });

  it("[UT-THEME.2] Deve alternar para dark quando o tema atual for light", async () => {
    const user = userEvent.setup();
    vi.mocked(nextThemes.useTheme).mockReturnValue({
      theme: "light",
      resolvedTheme: "light",
      setTheme: mockSetTheme,
      themes: ["light", "dark", "system"],
      systemTheme: "light",
      forcedTheme: undefined,
    });

    render(<ThemeToggle />);

    const button = screen.getByTestId("theme-toggle-btn");
    await act(async () => {
      await user.click(button);
    });

    expect(mockSetTheme).toHaveBeenCalledWith("dark");
  });

  it("[UT-THEME.3] Deve alternar para light quando o tema atual for dark", async () => {
    const user = userEvent.setup();
    vi.mocked(nextThemes.useTheme).mockReturnValue({
      theme: "dark",
      resolvedTheme: "dark",
      setTheme: mockSetTheme,
      themes: ["light", "dark", "system"],
      systemTheme: "dark",
      forcedTheme: undefined,
    });

    render(<ThemeToggle />);

    const button = screen.getByTestId("theme-toggle-btn");
    await act(async () => {
      await user.click(button);
    });

    expect(mockSetTheme).toHaveBeenCalledWith("light");
  });

  it("[UT-THEME.4] Deve exibir o texto descritivo quando showLabel for true", () => {
    vi.mocked(nextThemes.useTheme).mockReturnValue({
      theme: "dark",
      resolvedTheme: "dark",
      setTheme: mockSetTheme,
      themes: ["light", "dark", "system"],
      systemTheme: "dark",
      forcedTheme: undefined,
    });

    render(<ThemeToggle showLabel={true} />);

    expect(screen.getByText("Tema Claro")).toBeInTheDocument();
  });
});
