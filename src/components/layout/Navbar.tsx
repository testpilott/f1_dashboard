"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-56 lg:fixed lg:inset-y-0 lg:z-50 bg-zinc-950 border-r border-zinc-800">
        <div className="flex h-16 items-center px-6 border-b border-zinc-800">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-red-500 font-black text-2xl tracking-tight">F1</span>
            <span className="text-white font-semibold text-lg tracking-tight">Dashboard</span>
          </Link>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                pathname === href
                  ? "bg-red-600 text-white"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-800"
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </Link>
          ))}
        </nav>
        <div className="px-4 py-3 border-t border-zinc-800 text-zinc-600 text-xs">
          Data: OpenF1 · Jolpica · Open-Meteo
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="lg:hidden fixed top-0 inset-x-0 z-50 h-14 bg-zinc-950 border-b border-zinc-800 flex items-center px-4 gap-3">
        <Link href="/" className="flex items-center gap-1.5">
          <span className="text-red-500 font-black text-xl tracking-tight">F1</span>
          <span className="text-white font-semibold tracking-tight">Dashboard</span>
        </Link>
      </header>

      {/* Mobile bottom nav */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-50 bg-zinc-950 border-t border-zinc-800 flex">
        {NAV_ITEMS.slice(0, 5).map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex flex-col items-center gap-1 flex-1 py-2 text-[10px] font-medium transition-colors",
              pathname === href ? "text-red-500" : "text-zinc-500 hover:text-zinc-300"
            )}
          >
            <Icon className="w-5 h-5" />
            {label}
          </Link>
        ))}
      </nav>
    </>
  );
}
