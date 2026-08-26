/**
 * @file brand-logo.tsx
 * @description Componente visual oficial da marca Acelera Auto CRM com alto contraste para Dark Mode.
 */

import { Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface BrandLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function BrandLogo({ className, size = "md" }: BrandLogoProps) {
  const iconSizes = {
    sm: "h-7 w-7",
    md: "h-8 w-8 sm:h-9 sm:w-9",
    lg: "h-10 w-10",
  };

  const zapSizes = {
    sm: "h-3.5 w-3.5",
    md: "h-4 w-4 sm:h-5 sm:w-5",
    lg: "h-5 w-5",
  };

  const textSizes = {
    sm: "text-sm",
    md: "text-base sm:text-lg",
    lg: "text-lg sm:text-xl",
  };

  return (
    <div className={cn("flex items-center gap-2.5 shrink-0", className)}>
      {/* Símbolo da marca com gradiente e glow em laranja */}
      <div
        className={cn(
          "flex items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 via-orange-600 to-red-600 shadow-lg shadow-orange-500/30 ring-1 ring-orange-400/30 shrink-0",
          iconSizes[size]
        )}
      >
        <Zap className={cn("fill-white text-white", zapSizes[size])} />
      </div>

      {/* Tipografia de alto contraste para Dark Mode */}
      <div className="flex flex-col">
        <span
          className={cn(
            "font-extrabold text-white tracking-wider leading-none",
            textSizes[size]
          )}
        >
          ACELERA <span className="text-orange-500">AUTO</span>
        </span>
        <span className="text-[10px] font-bold text-emerald-400 tracking-[0.25em] uppercase leading-tight mt-0.5">
          CRM
        </span>
      </div>
    </div>
  );
}
