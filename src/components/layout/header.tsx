/**
 * @file header.tsx
 * @description Header mobile retrátil com drawer Sheet e informações do usuário autenticado.
 */

"use client";

import React, { useState, useEffect } from "react";
import { Menu, Phone } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Logo, NavLink, getNavItemsForRole } from "@/components/layout/sidebar";
import { UserNav } from "@/components/layout/user-nav";
import { useDemoRole } from "@/context/demo-role-context";
import { getCurrentUserProfileAction } from "@/app/actions/auth";

import { ThemeToggle } from "@/components/theme-toggle";

export function MobileHeader() {
  const [open, setOpen] = useState(false);
  const { role: demoRole, isDemoMode } = useDemoRole();
  const [realRole, setRealRole] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    if (!isDemoMode) {
      getCurrentUserProfileAction()
        .then((profile) => {
          if (isMounted && profile?.role) {
            setRealRole(profile.role);
          }
        })
        .catch(() => {});
    }
    return () => {
      isMounted = false;
    };
  }, [isDemoMode]);

  const activeRole = demoRole || realRole || "admin";
  const visibleNavItems = getNavItemsForRole(activeRole);

  return (
    <header className="flex h-14 items-center justify-between border-b bg-card/80 px-4 backdrop-blur-sm lg:hidden">
      {/* Menu sheet retrátil */}
      <Sheet open={open} onOpenChange={setOpen}>
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
            <nav className="flex flex-col gap-1 p-3" data-testid="mobile-nav">
              {visibleNavItems.map((item) => (
                <NavLink key={item.href} item={item} onClick={() => setOpen(false)} />
              ))}
            </nav>
          </div>
          <UserNav logoutButtonId="btn-logout-mobile" />
        </SheetContent>
      </Sheet>

      {/* Logo centralizado no mobile */}
      <Logo />

      {/* Ações rápidas */}
      <div className="flex items-center gap-1.5">
        <ThemeToggle />
        <Button variant="ghost" size="icon-sm" aria-label="Ligar para lead">
          <Phone className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
