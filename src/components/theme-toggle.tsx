"use client";

import React, { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";

export interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
}

const emptySubscribe = () => () => {};

export function ThemeToggle({ className = "", showLabel = false }: ThemeToggleProps) {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  if (!mounted) {
    return (
      <button
        type="button"
        disabled
        aria-label="Alternar tema"
        data-testid="theme-toggle-btn"
        className={`relative inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white p-2 text-slate-400 opacity-70 shadow-sm dark:border-slate-800 dark:bg-slate-900 ${className}`}
      >
        <Sun className="h-4 w-4" />
      </button>
    );
  }

  const isDark = resolvedTheme === "dark" || theme === "dark";

  const handleToggle = () => {
    setTheme(isDark ? "light" : "dark");
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-label="Alternar tema"
      data-testid="theme-toggle-btn"
      title={isDark ? "Mudar para Tema Claro" : "Mudar para Tema Escuro"}
      className={`group relative inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white p-2 text-slate-700 shadow-sm transition-all hover:bg-slate-100 hover:text-slate-900 active:scale-95 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100 ${
        showLabel ? "h-9 px-3 w-full" : "h-9 w-9"
      } ${className}`}
    >
      <div className="relative flex items-center justify-center">
        {isDark ? (
          <Sun className="h-4 w-4 text-amber-400 transition-transform duration-200 group-hover:rotate-45" />
        ) : (
          <Moon className="h-4 w-4 text-slate-700 transition-transform duration-200 group-hover:-rotate-12 dark:text-slate-300" />
        )}
      </div>

      {showLabel && (
        <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
          {isDark ? "Tema Claro" : "Tema Escuro"}
        </span>
      )}
    </button>
  );
}
