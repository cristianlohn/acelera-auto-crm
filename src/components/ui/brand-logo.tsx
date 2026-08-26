/**
 * @file brand-logo.tsx
 * @description Componente visual oficial da marca Acelera Auto CRM utilizando a logo oficial (public/logo.png).
 */

import Image from "next/image";
import { cn } from "@/lib/utils";

interface BrandLogoProps {
  className?: string;
  priority?: boolean;
}

export function BrandLogo({ className, priority = true }: BrandLogoProps) {
  return (
    <div className={cn("flex items-center shrink-0", className)}>
      <Image
        src="/logo.png"
        alt="Acelera Auto CRM"
        width={180}
        height={48}
        className="h-10 md:h-12 w-auto object-contain"
        priority={priority}
      />
    </div>
  );
}
