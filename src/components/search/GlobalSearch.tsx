"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, X, Users, GitCompare, Calendar, Flag } from "lucide-react";
import { fetchJson } from "@/lib/api/clientFetch";
import type { SearchResult, SearchResultKind } from "@/lib/search";
import { cn } from "@/lib/utils";

const KIND_ICON: Record<SearchResultKind, React.ElementType> = {
  driver: Users,
  constructor: GitCompare,
  circuit: Flag,
  race: Calendar,
};

const KIND_LABEL: Record<SearchResultKind, string> = {
  driver: "Driver",
  constructor: "Constructor",
  circuit: "Circuit",
  race: "Race",
};

async function fetchResults(q: string): Promise<SearchResult[]> {
  if (q.trim().length < 2) return [];
  const d = await fetchJson<{ results?: SearchResult[] }>(`/api/search?q=${encodeURIComponent(q)}`);
  return Array.isArray(d.results) ? d.results : [];
}

export default function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const handleClose = useCallback(() => {
    setOpen(false);
    setQuery("");
    setResults([]);
    setActiveIdx(0);
  }, []);

  // Keyboard shortcut: Cmd/Ctrl+K
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") handleClose();
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleClose]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  // Debounced fetch
  useEffect(() => {
    const id = setTimeout(async () => {
      const r = await fetchResults(query);
      setResults(r);
      setActiveIdx(0);
    }, 200);
    return () => clearTimeout(id);
  }, [query]);

  const navigate = useCallback((result: SearchResult) => {
    router.push(result.href);
    handleClose();
  }, [router, handleClose]);

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") { e.preventDefault(); setActiveIdx((i) => Math.min(i + 1, results.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActiveIdx((i) => Math.max(i - 1, 0)); }
    else if (e.key === "Enter" && results[activeIdx]) navigate(results[activeIdx]);
  }

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Search (Ctrl+K)"
        className="flex items-center gap-2 h-8 px-3 rounded-lg text-muted-foreground text-sm bg-surface-2 border border-border hover:text-foreground hover:border-border/80 transition-colors"
      >
        <Search className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <span className="hidden sm:inline text-xs">Search…</span>
        <kbd className="hidden sm:inline text-[10px] bg-surface-3 border border-border px-1 rounded font-mono">⌘K</kbd>
      </button>

      {/* Backdrop + palette */}
      {open && (
        <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[10vh] px-4" role="dialog" aria-modal="true" aria-label="Search">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />
          <div className="relative w-full max-w-lg bg-surface-2 border border-border rounded-xl shadow-2xl overflow-hidden">
            {/* Input */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
              <Search className="w-4 h-4 text-muted-foreground shrink-0" aria-hidden="true" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Search drivers, teams, circuits, races…"
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
                autoComplete="off"
                spellCheck={false}
              />
              {query && (
                <button onClick={() => setQuery("")} className="text-muted-foreground hover:text-foreground">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Results */}
            {results.length > 0 && (
              <ul className="py-1 max-h-80 overflow-y-auto" role="listbox">
                {results.map((r, i) => {
                  const Icon = KIND_ICON[r.kind];
                  return (
                    <li key={r.id + r.kind} role="option" aria-selected={i === activeIdx}>
                      <button
                        onClick={() => navigate(r)}
                        onMouseEnter={() => setActiveIdx(i)}
                        className={cn(
                          "w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors",
                          i === activeIdx ? "bg-accent" : "hover:bg-accent/50"
                        )}
                      >
                        <Icon className="w-4 h-4 text-muted-foreground shrink-0" aria-hidden="true" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{r.label}</p>
                          {r.sublabel && <p className="text-xs text-muted-foreground truncate">{r.sublabel}</p>}
                        </div>
                        <span className="text-[10px] text-muted-foreground/60 uppercase tracking-wider shrink-0">
                          {KIND_LABEL[r.kind]}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}

            {query.length >= 2 && results.length === 0 && (
              <p className="px-4 py-6 text-center text-sm text-muted-foreground">No results for &ldquo;{query}&rdquo;</p>
            )}

            {query.length < 2 && (
              <p className="px-4 py-6 text-center text-sm text-muted-foreground/60">Type to search drivers, teams, circuits &amp; races</p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
