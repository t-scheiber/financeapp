"use client";

import { clsx } from "clsx";
import { Menu, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { useState } from "react";
import { DesignControlsTrigger } from "@/components/design-controls";
import { Button } from "@/components/ui/button";

const NAVIGATION = [
  { href: "/settings", label: "Settings" },
  { href: "/privacy-policy", label: "Privacy" },
  { href: "/terms-of-service", label: "Terms" },
];

export function Header() {
  const { data: session, status } = useSession();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="relative z-20 border-b border-border/60 bg-white/70 shadow-sm shadow-black/5 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="group inline-flex items-center gap-2 rounded-full border border-transparent bg-white/70 px-3 py-1 text-sm font-semibold text-foreground shadow-sm transition hover:border-accent/40 hover:bg-white"
          >
            <span className="relative inline-flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-accent/15 text-accent">
              <span className="absolute inset-0 animate-float-soft bg-[radial-gradient(circle_at_center,theme(colors.accent.DEFAULT)_0%,transparent_70%)] opacity-50" />
              <Image
                src="/icon.svg"
                alt="FinanceApp"
                width={24}
                height={24}
                className="relative h-5 w-5"
                priority
              />
            </span>
            FinanceApp
          </Link>
          <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
            {NAVIGATION.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="group relative transition-colors hover:text-foreground"
              >
                {item.label}
                <span className="absolute inset-x-0 bottom-[-6px] h-px origin-left scale-x-0 bg-accent transition-transform duration-200 ease-out group-hover:scale-x-100" />
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <DesignControlsTrigger className="hidden sm:block" />
          {status === "loading" ? (
            <div className="h-9 w-9 rounded-full bg-muted animate-pulse" />
          ) : session ? (
            <div className="hidden items-center gap-3 sm:flex">
              <span className="text-sm text-muted-foreground">
                {session.user?.name || session.user?.email}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => signOut()}
                className="border-border/60"
              >
                Sign out
              </Button>
            </div>
          ) : (
            <Link href="/auth/signin" className="hidden sm:inline-flex">
              <Button size="sm" className="shadow-sm">
                Sign in
              </Button>
            </Link>
          )}

          <button
            type="button"
            onClick={() => setIsMenuOpen((prev) => !prev)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border/60 bg-white/80 text-foreground shadow-sm transition hover:border-accent/40 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 md:hidden"
            aria-expanded={isMenuOpen}
            aria-label="Toggle navigation menu"
          >
            {isMenuOpen ? (
              <X className="h-5 w-5" aria-hidden="true" />
            ) : (
              <Menu className="h-5 w-5" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      <div
        className={clsx(
          "md:hidden absolute inset-x-0 top-full z-10 px-4 transition-all duration-200 ease-out",
          isMenuOpen
            ? "pointer-events-auto translate-y-2 opacity-100"
            : "pointer-events-none -translate-y-1 opacity-0",
        )}
        aria-hidden={!isMenuOpen}
      >
        <nav className="glass-panel space-y-4 rounded-2xl p-4 text-sm text-muted-foreground shadow-lg">
          <div className="flex flex-col gap-2">
            {NAVIGATION.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-xl px-3 py-2 font-medium text-foreground transition hover:bg-accent/10"
                onClick={() => setIsMenuOpen(false)}
              >
                {item.label}
              </Link>
            ))}
          </div>

          <div className="flex flex-col gap-3 rounded-2xl border border-border/40 bg-white/70 p-4 shadow-inner">
            <p className="text-xs uppercase tracking-wide text-muted-foreground/70">
              Personalisation
            </p>
            <DesignControlsTrigger />
          </div>

          {status === "loading" ? null : session ? (
            <Button
              variant="outline"
              className="w-full border-border/60"
              onClick={() => {
                setIsMenuOpen(false);
                signOut();
              }}
            >
              Sign out
            </Button>
          ) : (
            <Link href="/auth/signin" onClick={() => setIsMenuOpen(false)}>
              <Button className="w-full shadow-sm">Sign in</Button>
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
