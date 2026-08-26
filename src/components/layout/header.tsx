/**
 * @file header.tsx
 * @description Header mobile retrátil com drawer Sheet e informações do usuário autenticado.
 */

"use client";

import React from "react";
import { Menu, Phone } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Logo, NavLink, navItems } from "@/components/layout/sidebar";
import { UserNav } from "@/components/layout/user-nav";

export function MobileHeader() {
  return (
    <header className="flex h-14 items-center justify-between border-b bg-card/80 px-4 backdrop-blur-sm lg:hidden">
      {/* Menu sheet retrátil */}
      <Sheet>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Abrir menu"
            data-testid="mobile-menu-trigger"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 p-0 flex flex-col justify-between">
          <div>
            <SheetHeader className="border-b px-5 py-4">
              <SheetTitle className="sr-only">Menu de navegação</SheetTitle>
              <Logo />
            </SheetHeader>
            <nav className="flex flex-col gap-1 p-3">
              {navItems.map((item) => (
                <NavLink key={item.href} item={item} />
              ))}
            </nav>
          </div>
          <UserNav logoutButtonId="btn-logout-mobile" />
        </SheetContent>
      </Sheet>

      {/* Logo centralizado no mobile */}
      <Logo />

      {/* Ação rápida */}
      <Button variant="ghost" size="icon-sm" aria-label="Ligar para lead">
        <Phone className="h-4 w-4" />
      </Button>
    </header>
  );
}
