"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import {
  BarChart2,
  Calendar,
  Flag,
  Newspaper,
  TrendingUp,
  Users,
  GitCompare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import ThemeToggle from "@/components/ui/ThemeToggle";

const NAV_ITEMS = [
  { href: "/", label: "Standings", icon: BarChart2 },
  { href: "/schedule", label: "Schedule", icon: Calendar },
  { href: "/weekend", label: "Weekend", icon: Flag },
  { href: "/drivers", label: "Drivers", icon: Users },
  { href: "/compare", label: "Compare", icon: GitCompare },
  { href: "/projections", label: "Projections", icon: TrendingUp },
  { href: "/news", label: "News", icon: Newspaper },
];

export default function Navbar() {
  const pathname = usePathname();
  const navRef = useRef<HTMLElement>(null);

  // Keep active item scrolled into view on route changes
  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const active = nav.querySelector("[data-active='true']") as HTMLElement | null;
    if (active) {
      active.scrollIntoView({ inline: "nearest", behavior: "smooth", block: "nearest" });
    }
  }, [pathname]);

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-56 lg:fixed lg:inset-y-0 lg:z-50 bg-sidebar border-r border-sidebar-border">
        <div className="flex h-16 items-center px-4 border-b border-sidebar-border">
          <Link href="/" className="flex flex-col gap-0.5">
            <Image
              src="/logo-f1dash.svg"
              alt="Formula 1"
              width={80}
              height={20}
              className="h-5 w-auto"
              style={{ filter: "var(--f1-logo-filter)" }}
            />
            <span className="text-muted-foreground text-[9px] tracking-[0.25em] uppercase">Dashboard</span>
          </Link>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              aria-current={pathname === href ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                pathname === href
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </Link>
          ))}
        </nav>
        <div className="px-4 py-3 border-t border-sidebar-border flex items-center justify-between">
          <span className="text-muted-foreground text-xs">OpenF1 · Jolpica · Open-Meteo</span>
          <ThemeToggle />
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="lg:hidden fixed top-0 inset-x-0 z-50 h-14 bg-sidebar border-b border-sidebar-border flex items-center px-4 gap-3">
        <Link href="/" className="flex items-center gap-2 flex-1">
          <Image
            src="/logo-f1dash.svg"
            alt="Formula 1"
            width={64}
            height={16}
            className="h-4 w-auto"
            style={{ filter: "var(--f1-logo-filter)" }}
          />
          <span className="text-muted-foreground text-xs tracking-widest uppercase">Dashboard</span>
        </Link>
        <ThemeToggle />
      </header>

      {/* Mobile bottom nav — horizontally scrollable so all items are reachable */}
      <nav
        ref={navRef}
        aria-label="Main navigation"
        className="lg:hidden fixed bottom-0 inset-x-0 z-50 bg-sidebar border-t border-sidebar-border flex overflow-x-auto scrollbar-none snap-x snap-mandatory"
      >
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              data-active={active}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex flex-col items-center gap-1 shrink-0 min-w-[4.5rem] py-2 px-1 text-[10px] font-medium transition-colors snap-start",
                active
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="w-5 h-5" aria-hidden="true" />
              {label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
