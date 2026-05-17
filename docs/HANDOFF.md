# F1 Dashboard — Engineering Handoff (Self-Contained)

> **Read this first.** This is the single document you need to deliver the entire
> overhaul. Every phase has exact file paths, copy-pasteable code, commands, and a
> "Definition of Done" you can verify yourself. You should not need to ask anyone a
> question to complete this. Work strictly top-to-bottom. Do not start a phase until the
> previous phase's DoD is fully green.

---

## 0. Orientation

### 0.1 What the product is

A Formula 1 stats dashboard (Next.js 16 App Router, React 19, TypeScript, Tailwind v4,
React Query v5, Vitest). It shows championship standings, schedule, race weekends, driver
pages, race details, Monte-Carlo projections, news, and a compare page. All data comes
from **free, keyless** sources: Jolpica/Ergast, OpenF1, OpenMeteo, RSS feeds.

### 0.2 Why this work exists (the problems you are fixing)

1. **No design system.** `src/app/globals.css` theme tokens are 100% grayscale
   (`oklch(... 0 0)` = zero chroma). Components hardcode `bg-red-600`, `bg-zinc-950`,
   `bg-white`, `text-red-500` directly (see `src/app/layout.tsx` lines 44–49,
   `src/components/layout/Navbar.tsx` lines 46–126, `src/app/page.tsx` lines 40–58),
   bypassing the token layer. There is no F1 identity.
2. **Triple charting stack.** `@nivo/*`, `recharts`, and `d3` are all installed and used
   (`package.json` lines 16–31). Bloat + inconsistent visuals.
3. **No fetch timeouts.** `src/lib/api/jolpica.ts` (`jolpicaFetch`, lines 12–19),
   `openf1.ts`, `openmeteo.ts` have no abort/timeout; a hung upstream stalls SSR. Only
   `src/lib/api/rss.ts` has a timeout (5000ms, line 6).
4. **No runtime validation** of external JSON shape — only downstream `Array.isArray`
   guards (see `src/app/api/__tests__/fetcher-guards.test.ts`).
5. **Zero component tests.** `vitest.config.ts` is node-only; coverage scoped to
   `src/lib`. No UI test exists, despite the TDD mandate in `AGENTS.md`.
6. **Docs absent.** `README.md` is untouched `create-next-app` boilerplate.

### 0.3 Target outcome

A professional **"F1 broadcast" (F1 TV / FOM-style)** UI: dark-first, F1 red
(`#E10600`) accent, condensed confident type, telemetry-style charts — backed by a real
token system, a hardened/streamlined data layer, real test coverage behind a CI gate,
and complete docs. All 9 routes kept and elevated.

### 0.4 Hard constraints (do not violate)

- **Free-tier only**: no paid APIs/services/fonts/assets.
- Keep data sources: Jolpica/Ergast, OpenF1, OpenMeteo, RSS. No DB. No auth.
- Prefer existing dependencies; only the test libraries below are added.
- Keep all 9 routes. Do not change API response contracts.
- **TDD is mandatory.** Write/extend the test first or alongside. `npm test` must exit 0
  before every commit. Never `--no-verify`, never lower the coverage gate.
- This is a **modified Next.js 16**. Before using any framework API that differs from
  memory, read the matching guide under `node_modules/next/dist/docs/`.

### 0.5 Setup & everyday commands

```bash
npm install            # Node 20+. No env vars / API keys needed.
npm run dev            # http://localhost:3000
npm run lint           # must be clean before commit
npm test               # full suite, must exit 0 before commit
npm run test:ci        # tests + coverage gate (Phase 0 adds this)
npm run build          # must succeed before finishing a phase
```

Branch: develop on the existing feature branch. Small commits, one concern each (in
Phase 3, one route per commit). Commit message explains the *why*.

### 0.6 Repo map

| Area | Path |
|---|---|
| Pages (App Router) | `src/app/**/page.tsx` |
| Client components | `src/components/**` |
| Shared UI primitives | `src/components/ui/**` |
| Data fetchers | `src/lib/api/**` |
| Constants (teams/circuits) | `src/lib/constants/**` |
| Types | `src/lib/types/**` |
| Design tokens | `src/app/globals.css` |
| Test config | `vitest.config.ts`, `vitest.setup.ts` |
| Docs | `docs/**` |

---

## Phase 0 — Safety net & tooling

**Goal:** make large refactors safe and CI-enforced *before* touching visuals.

### 0.A Add test dependencies

```bash
npm install -D @testing-library/react @testing-library/jest-dom \
  @testing-library/user-event jsdom
```

These are free, standard, and React 19 compatible. If the registry is unreachable,
retry; do not substitute other libraries.

### 0.B Replace `vitest.config.ts`

Use a single config with `environmentMatchGlobs` (supported in the installed Vitest
2.x). `.test.ts` → node (logic/API). `.test.tsx` → jsdom (components). **Replace the
entire file** `vitest.config.ts` with:

```ts
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  test: {
    globals: true,
    environment: "node",
    environmentMatchGlobs: [
      ["src/**/*.test.tsx", "jsdom"],
    ],
    setupFiles: ["./vitest.setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: ["src/lib/**/*.ts", "src/components/**/*.tsx"],
      exclude: ["src/**/__tests__/**", "**/*.d.ts"],
      thresholds: {
        // Phase 0 starting gate. Ratcheted up in Phase 5.
        lines: 70,
        branches: 70,
        functions: 70,
        statements: 70,
      },
    },
  },
});
```

> Why one config + `environmentMatchGlobs` instead of a workspace: fewer moving parts,
> one coverage gate, zero ambiguity for the next engineer. Do not introduce
> `vitest.workspace.ts`.

### 0.C Create `vitest.setup.ts` (repo root)

```ts
import "@testing-library/jest-dom/vitest";
```

This makes matchers like `toBeInTheDocument()` available in `.test.tsx` files. It is a
no-op for node `.test.ts` files, which is fine.

### 0.D Update `package.json` scripts

Add one script (keep the existing ones):

```jsonc
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "eslint",
  "test": "vitest run",
  "test:watch": "vitest",
  "test:coverage": "vitest run --coverage",
  "test:ci": "vitest run --coverage"
}
```

### 0.E SessionStart hook (Claude Code on the web parity)

Create `.claude/settings.json` (merge if it exists) so web sessions auto-install deps:

```json
{
  "hooks": {
    "SessionStart": [
      { "hooks": [ { "type": "command", "command": "npm install --no-audit --no-fund" } ] }
    ]
  }
}
```

### 0.F Prove the safety net works

Add a throwaway sanity component test to confirm the jsdom project runs, then delete it:

```bash
mkdir -p src/components/__tests__
cat > src/components/__tests__/_sanity.test.tsx <<'EOF'
import { render, screen } from "@testing-library/react";
it("jsdom project renders", () => {
  render(<button>Go</button>);
  expect(screen.getByRole("button", { name: "Go" })).toBeInTheDocument();
});
EOF
npm test          # both node + jsdom must pass
rm src/components/__tests__/_sanity.test.tsx
```

### Phase 0 — Definition of Done

- [ ] `npm test` runs and passes node tests **and** a `.test.tsx` jsdom test.
- [ ] `npm run test:ci` runs and enforces the coverage threshold.
- [ ] `npm run lint` clean; `npm run build` succeeds.
- [ ] Commit: `chore(test): add jsdom project, coverage gate, session hook`.

---

## Phase 1 — Design token system

**Goal:** one central, semantic, F1-broadcast token layer. No component visuals change
yet (risk isolation).

### 1.A Replace the palette in `src/app/globals.css`

Keep the existing `@import`, `@custom-variant`, `@theme inline`, and `@layer base/
utilities` blocks **as they are**. Replace **only** the `:root { ... }` and
`.dark { ... }` blocks (currently lines ~51–126, all `oklch(... 0 0)` grayscale) with
the values below. These are the exact production values — do not invent others.

```css
:root {
  /* Light = "paddock daylight" (secondary theme; dark is the target) */
  --logo-badge-bg: #ffffff;
  --f1-logo-filter: brightness(0);

  --f1-red: oklch(0.556 0.236 27.4);          /* ≈ #E10600 brand accent */

  --background: oklch(0.97 0.004 250);         /* warm off-white, not pure white */
  --foreground: oklch(0.18 0.012 250);
  --surface-1: oklch(0.99 0.003 250);
  --surface-2: oklch(0.96 0.005 250);
  --surface-3: oklch(0.93 0.006 250);
  --card: var(--surface-1);
  --card-foreground: var(--foreground);
  --popover: var(--surface-1);
  --popover-foreground: var(--foreground);

  --primary: var(--f1-red);
  --primary-foreground: oklch(0.99 0 0);
  --secondary: oklch(0.93 0.006 250);
  --secondary-foreground: oklch(0.22 0.012 250);
  --muted: oklch(0.93 0.006 250);
  --muted-foreground: oklch(0.50 0.012 250);
  --accent: oklch(0.93 0.006 250);
  --accent-foreground: oklch(0.22 0.012 250);
  --destructive: oklch(0.577 0.245 27.325);

  --border: oklch(0.18 0.01 250 / 14%);
  --input: oklch(0.18 0.01 250 / 18%);
  --ring: var(--f1-red);
  --grid-line: oklch(0.18 0.01 250 / 10%);

  /* Telemetry data ramp: red, cyan, amber, violet, lime */
  --chart-1: oklch(0.58 0.23 27);
  --chart-2: oklch(0.70 0.13 210);
  --chart-3: oklch(0.75 0.16 75);
  --chart-4: oklch(0.60 0.20 300);
  --chart-5: oklch(0.72 0.19 135);

  --radius: 0.5rem;
  --speed-fast: 120ms;
  --speed: 200ms;
  --speed-slow: 320ms;

  --sidebar: var(--surface-1);
  --sidebar-foreground: var(--foreground);
  --sidebar-primary: var(--f1-red);
  --sidebar-primary-foreground: oklch(0.99 0 0);
  --sidebar-accent: oklch(0.93 0.006 250);
  --sidebar-accent-foreground: oklch(0.22 0.012 250);
  --sidebar-border: oklch(0.18 0.01 250 / 14%);
  --sidebar-ring: var(--f1-red);
}

.dark {
  /* Dark = "broadcast" — the design target */
  --logo-badge-bg: #ffffff;
  --f1-logo-filter: brightness(0) invert(1);

  --f1-red: oklch(0.62 0.236 27.4);            /* slightly lifted for dark contrast */

  --background: oklch(0.165 0.008 255);        /* near-black, cool carbon */
  --foreground: oklch(0.97 0.004 250);
  --surface-1: oklch(0.205 0.009 255);
  --surface-2: oklch(0.245 0.010 255);
  --surface-3: oklch(0.290 0.011 255);
  --card: var(--surface-1);
  --card-foreground: var(--foreground);
  --popover: var(--surface-2);
  --popover-foreground: var(--foreground);

  --primary: var(--f1-red);
  --primary-foreground: oklch(0.99 0 0);
  --secondary: var(--surface-2);
  --secondary-foreground: var(--foreground);
  --muted: var(--surface-2);
  --muted-foreground: oklch(0.70 0.012 250);
  --accent: var(--surface-3);
  --accent-foreground: var(--foreground);
  --destructive: oklch(0.704 0.191 22.216);

  --border: oklch(1 0 0 / 10%);
  --input: oklch(1 0 0 / 14%);
  --ring: var(--f1-red);
  --grid-line: oklch(1 0 0 / 8%);

  --chart-1: oklch(0.66 0.24 27);
  --chart-2: oklch(0.78 0.14 205);
  --chart-3: oklch(0.82 0.16 78);
  --chart-4: oklch(0.68 0.20 300);
  --chart-5: oklch(0.80 0.20 135);

  --sidebar: var(--surface-1);
  --sidebar-foreground: var(--foreground);
  --sidebar-primary: var(--f1-red);
  --sidebar-primary-foreground: oklch(0.99 0 0);
  --sidebar-accent: var(--surface-3);
  --sidebar-accent-foreground: var(--foreground);
  --sidebar-border: oklch(1 0 0 / 10%);
  --sidebar-ring: var(--f1-red);
}
```

Then, in the **existing** `@theme inline` block, add three lines (so Tailwind exposes
the new tokens as utilities — place them next to the similar `--color-*` lines):

```css
  --color-f1-red: var(--f1-red);
  --color-surface-1: var(--surface-1);
  --color-surface-2: var(--surface-2);
  --color-surface-3: var(--surface-3);
  --color-grid-line: var(--grid-line);
```

> Verify after editing: `npm run build` must still compile the CSS. If Tailwind v4
> rejects a `--color-*` mapping, check the syntax of the surrounding lines in the same
> block and match it exactly — do not guess.

### 1.B Force dark-first

In `src/app/layout.tsx`, on the `<html>` element (line ~39), add `className="dark ..."`
(keep existing font variable classes; keep `suppressHydrationWarning`). The theme
toggle still works; dark is just the default. Do **not** restyle components yet.

### 1.C Team livery — reuse, do not duplicate

`getTeamColor(teamName)` **already exists** at `src/lib/constants/teams.ts` lines 27–29
and returns a safe `default`. **Do not create a new color map.** It currently has no
test. Create `src/lib/constants/__tests__/teams.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { getTeamColor, getTeamLogo, TEAM_COLORS } from "@/lib/constants/teams";

describe("getTeamColor", () => {
  it("returns the exact brand color for a known team", () => {
    expect(getTeamColor("Ferrari")).toBe(TEAM_COLORS.Ferrari);
  });
  it("resolves long constructor aliases", () => {
    expect(getTeamColor("Red Bull Racing")).toBe(getTeamColor("Red Bull"));
  });
  it("falls back to default for an unknown team", () => {
    expect(getTeamColor("Not A Team")).toBe(TEAM_COLORS.default);
  });
  it("falls back to default for empty string", () => {
    expect(getTeamColor("")).toBe(TEAM_COLORS.default);
  });
});

describe("getTeamLogo", () => {
  it("returns a local /logos path for a known team", () => {
    expect(getTeamLogo("McLaren")).toMatch(/^\/logos\/.+\.webp$/);
  });
  it("returns undefined for an unknown team", () => {
    expect(getTeamLogo("Not A Team")).toBeUndefined();
  });
});
```

### 1.D Shared chart theme

Create `src/lib/charts/theme.ts`. This is the **only** place chart colors/axes/tooltips
are defined. It reads CSS variables at runtime so it auto-tracks light/dark.

```ts
/**
 * Single source of truth for all chart styling (Nivo).
 * Reads design tokens from CSS so charts follow the active theme.
 */
function cssVar(name: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

export function chartColors(): string[] {
  return [
    cssVar("--chart-1", "#e10600"),
    cssVar("--chart-2", "#36c5d6"),
    cssVar("--chart-3", "#f0b429"),
    cssVar("--chart-4", "#8b5cf6"),
    cssVar("--chart-5", "#84cc16"),
  ];
}

export function nivoTheme() {
  const text = cssVar("--foreground", "#fafafa");
  const grid = cssVar("--grid-line", "rgba(255,255,255,0.08)");
  const surface = cssVar("--surface-2", "#1f1f23");
  const border = cssVar("--border", "rgba(255,255,255,0.1)");
  return {
    background: "transparent",
    text: { fill: text, fontFamily: "var(--font-mono)" },
    axis: {
      ticks: { text: { fill: text, fontSize: 11 }, line: { stroke: grid } },
      legend: { text: { fill: text } },
    },
    grid: { line: { stroke: grid, strokeWidth: 1 } },
    tooltip: {
      container: {
        background: surface,
        color: text,
        border: `1px solid ${border}`,
        fontFamily: "var(--font-mono)",
        fontSize: 12,
      },
    },
  };
}
```

Add `src/lib/charts/__tests__/theme.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { chartColors, nivoTheme } from "@/lib/charts/theme";

describe("chart theme (SSR fallback path)", () => {
  it("returns 5 colors", () => {
    expect(chartColors()).toHaveLength(5);
  });
  it("first color falls back to F1 red when no DOM", () => {
    expect(chartColors()[0]).toBe("#e10600");
  });
  it("nivoTheme has axis, grid, and tooltip sections", () => {
    const t = nivoTheme();
    expect(t.axis).toBeDefined();
    expect(t.grid.line.stroke).toBeTruthy();
    expect(t.tooltip.container.background).toBeTruthy();
  });
});
```

### Phase 1 — Definition of Done

- [ ] `src/app/globals.css` has the F1 token palette above (chroma > 0).
- [ ] `src/app/layout.tsx` `<html>` is dark-first.
- [ ] `src/lib/charts/theme.ts` exists; charts not yet migrated (Phase 4).
- [ ] New tests green: `teams.test.ts`, `theme.test.ts`. `npm test` exits 0.
- [ ] `docs/design-system.md` reflects the final token names/values.
- [ ] `npm run build` succeeds. Commit:
      `feat(design): F1 broadcast design tokens + shared chart theme`.

---

## Phase 2 — Shell & primitives restyle

**Goal:** apply tokens to the app frame and shared UI. Remove every hardcoded color
there. Pages come in Phase 3.

### 2.A `src/app/layout.tsx`

- Replace `<body className="... bg-white text-zinc-900 dark:bg-zinc-950
  dark:text-zinc-100">` with `<body className="min-h-full flex flex-col bg-background
  text-foreground">`.
- Keep `Providers`, `Navbar`, `<main>` structure.

### 2.B `src/components/layout/Navbar.tsx`

- Replace every `zinc-*`, `white`, `red-*` literal with tokens:
  - container: `bg-sidebar border-sidebar-border`
  - inactive link: `text-muted-foreground hover:text-foreground hover:bg-accent`
  - active link: `bg-primary text-primary-foreground` (desktop),
    `text-primary` (mobile)
- **Local logo**: download the official F1 wordmark is *not* free-licensed; instead ship
  a simple in-repo SVG wordmark. Create `public/logo-f1dash.svg` (a text-based SVG is
  fine — `<svg><text>F1 DASH</text></svg>` styled with `currentColor`). Replace the
  `<Image src="https://upload.wikimedia.org/...">` (lines ~49 and ~87) with
  `<Image src="/logo-f1dash.svg" .../>` and drop `unoptimized`. This removes the only
  external image dependency (security + perf win; enables Phase 5 CSP tightening).
- A11y: add `aria-current={active ? "page" : undefined}` to nav links; ensure
  `:focus-visible` ring (already globally defined in `globals.css` `@layer utilities`).

### 2.C `src/components/ui/*`

Audit each primitive (`badge.tsx`, `button.tsx`, `card.tsx`, `table.tsx`, `tabs.tsx`,
`select.tsx`, `skeleton.tsx`, `separator.tsx`, `progress.tsx`, `tooltip.tsx`). They are
shadcn components and already reference semantic classes (`bg-card`, `text-foreground`,
etc.) — confirm none hardcode `zinc-*`/hex; fix any that do. Add a token-based
"telemetry panel" variant to `card.tsx` (a `variant="panel"` using `bg-surface-2
border-grid-line`).

### 2.D Per-route `loading.tsx`

For every route folder under `src/app/` that fetches data, add a `loading.tsx` that
renders the existing `Skeleton` primitive (`src/components/ui/skeleton.tsx`) in the
page's rough layout. Routes: `/`, `schedule`, `weekend`, `drivers`, `compare`,
`projections`, `news`, `standings`, `race/[year]/[round]`.

### 2.E Tests (jsdom, write first)

Create `src/components/layout/__tests__/Navbar.test.tsx`. `Navbar` uses
`usePathname()` from `next/navigation` — mock it:

```tsx
import { render, screen } from "@testing-library/react";
import { vi, describe, it, expect } from "vitest";

vi.mock("next/navigation", () => ({ usePathname: () => "/schedule" }));
import Navbar from "@/components/layout/Navbar";

describe("Navbar", () => {
  it("renders all 7 destinations", () => {
    render(<Navbar />);
    for (const label of ["Standings","Schedule","Weekend","Drivers","Compare","Projections","News"]) {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    }
  });
  it("marks the active route with aria-current", () => {
    render(<Navbar />);
    const active = screen.getAllByRole("link").find(a => a.getAttribute("aria-current") === "page");
    expect(active).toBeTruthy();
  });
});
```

Add at least one `ui/` primitive test (e.g. `Card` renders `variant="panel"` classes;
`Button` applies `disabled` state).

### Phase 2 — Definition of Done

- [ ] `grep -rnE "zinc-[0-9]|red-[0-9]|bg-white|text-white" src/app/layout.tsx
      src/components/layout src/components/ui` returns **nothing**.
- [ ] No external image hosts referenced by the shell; logo is local.
- [ ] Navbar + ≥1 `ui/` test green; `npm test` exits 0.
- [ ] Browser-verified at mobile + desktop, dark + light (run `npm run dev`): F1-red
      active state, focus rings visible, no console errors. If you cannot run a browser,
      say so explicitly in the commit body.
- [ ] `npm run build` succeeds. Commit: `feat(ui): tokenized shell, navbar, primitives`.

---

## Phase 3 — Page-by-page elevation (all 9 routes)

**Goal:** every route looks like a broadcast product. **One commit per route.** Do them
in this order (low → high risk):

`standings` → `/` (home) → `schedule` → `news` → `drivers` → `weekend` →
`race/[year]/[round]` → `projections` → `compare`.

`compare` is currently thin — build it into a real driver/constructor head-to-head using
the **existing** `/api/compare` route and the `Array.isArray` guard pattern already
tested in `src/app/api/__tests__/fetcher-guards.test.ts`. Do not change the API
response shape.

### 3.A Per-route checklist (repeat for each route)

1. [ ] Replace all hardcoded colors with tokens (`docs/design-system.md` Do/Don't table).
2. [ ] Numeric/timing data uses `font-mono` + `tabular-nums`.
3. [ ] Team accents via `getTeamColor()` (inline accent only — left border/dot/series,
       never a large fill).
4. [ ] Charts import `nivoTheme()`/`chartColors()` from `src/lib/charts/theme.ts`.
5. [ ] Empty, error, and loading states present (loading via the Phase 2 `loading.tsx`).
6. [ ] Responsive at mobile + desktop; a11y (roles, labels, focus, `aria-current`).
7. [ ] jsdom test for the route's **client** component: happy path + one empty/error
       path, mocking at the fetch / React Query boundary (see template below). Do **not**
       test the server `page.tsx` routing.
8. [ ] Browser-verify the golden path and one edge case.
9. [ ] `npm test` exits 0; commit `feat(<route>): broadcast redesign`.

### 3.B Client-component test template (React Query boundary mock)

```tsx
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { vi, describe, it, expect } from "vitest";

function withQuery(ui: React.ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{ui}</QueryClientProvider>;
}

beforeEach(() => {
  global.fetch = vi.fn(async () =>
    new Response(JSON.stringify({ /* shape this route expects */ }), { status: 200 })
  ) as unknown as typeof fetch;
});

describe("<RouteClient/>", () => {
  it("renders data on the happy path", async () => {
    render(withQuery(/* <RouteClient initialData={...}/> */ <div/>));
    expect(await screen.findByText(/expected text/i)).toBeInTheDocument();
  });
  it("shows an empty/error state when the API returns nothing", async () => {
    (global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      new Response(JSON.stringify({}), { status: 200 })
    );
    render(withQuery(/* <RouteClient/> */ <div/>));
    expect(await screen.findByText(/no .* available|something went wrong/i)).toBeInTheDocument();
  });
});
```

### Phase 3 — Definition of Done

- [ ] All 9 routes done, one commit each, each with a passing jsdom test.
- [ ] `grep -rnE "zinc-[0-9]|#[0-9a-fA-F]{6}" src/app src/components` shows no color
      literals in JSX (hex only allowed inside `globals.css` and `charts/theme.ts`
      fallbacks).
- [ ] `npm test` exits 0; `npm run build` succeeds; browser-verified.

---

## Phase 4 — Architecture & performance hardening

### 4.A Consolidate charts to Nivo only

1. List usages: `grep -rn "recharts\|from \"d3\"\|@nivo" src`.
2. Rewrite `src/components/race/LapChart.tsx` and
   `src/components/race/TireStrategy.tsx` (and any recharts usage) on **Nivo**
   (`@nivo/line`, `@nivo/bar`) using `nivoTheme()`/`chartColors()`.
3. Remove `recharts` and `d3` (and `@types/d3`) from `package.json`; run `npm install`.
   Keep `d3` **only** if a specific Nivo gap forces it — if so, document the exact gap
   and bundle tradeoff in `docs/architecture.md` (Charting section).
4. Record `next build` route sizes before and after in `docs/architecture.md`.

### 4.B `fetchWithTimeout`

Create `src/lib/api/fetchWithTimeout.ts`:

```ts
/** fetch() with an AbortController timeout. Throws on timeout or non-OK. */
export async function fetchWithTimeout(
  url: string,
  init: RequestInit & { next?: { revalidate?: number } } = {},
  timeoutMs = 8000,
): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: ctrl.signal });
    if (!res.ok) throw new Error(`Upstream ${res.status} for ${url}`);
    return res;
  } finally {
    clearTimeout(timer);
  }
}
```

Use it in `src/lib/api/jolpica.ts` (`jolpicaFetch`), `openf1.ts`, `openmeteo.ts`
(replace the bare `fetch(...)` calls, keep the `next: { revalidate }` options).

Add `src/lib/api/__tests__/fetchWithTimeout.test.ts`:

```ts
import { describe, it, expect, vi } from "vitest";
import { fetchWithTimeout } from "@/lib/api/fetchWithTimeout";

describe("fetchWithTimeout", () => {
  it("resolves when fetch is fast and OK", async () => {
    global.fetch = vi.fn(async () => new Response("{}", { status: 200 })) as never;
    await expect(fetchWithTimeout("https://x.test", {}, 50)).resolves.toBeInstanceOf(Response);
  });
  it("throws on a non-OK status", async () => {
    global.fetch = vi.fn(async () => new Response("", { status: 503 })) as never;
    await expect(fetchWithTimeout("https://x.test", {}, 50)).rejects.toThrow(/503/);
  });
  it("aborts when the upstream is slower than the timeout", async () => {
    global.fetch = vi.fn((_, init?: RequestInit) => new Promise((_, rej) => {
      (init?.signal as AbortSignal)?.addEventListener("abort", () => rej(new Error("aborted")));
    })) as never;
    await expect(fetchWithTimeout("https://x.test", {}, 10)).rejects.toThrow();
  });
});
```

### 4.C Boundary validation (no new dependency)

In each `src/lib/api/*` fetcher, after parsing JSON, normalize with hand-written guards
in the **existing style** (`Array.isArray(x) ? x : []`, nullish coalescing). Do **not**
add zod or any schema library. Add tests per the `AGENTS.md` fetcher table: valid
response, null/undefined field, wrong type (object/string) → safe empty result, no
throw to the page.

### 4.D Perf pass

- Confirm every `next/image` has explicit `width`/`height` or `sizes`.
- Align `revalidate` (server) with React Query `staleTime` (client) per route; note
  intentional differences in `docs/architecture.md`.
- Confirm Phase 2 `loading.tsx` files stream (visible skeleton before data).

### Phase 4 — Definition of Done

- [ ] `package.json` has exactly one chart lib (Nivo); `recharts`/`d3` gone (or gap
      documented).
- [ ] `fetchWithTimeout` used by jolpica/openf1/openmeteo; its tests green.
- [ ] Boundary-validation tests green for each fetcher.
- [ ] `docs/architecture.md` updated with bundle-size before/after.
- [ ] `npm test` exits 0; `npm run build` succeeds.

---

## Phase 5 — Security hardening & docs finalization

### 5.A Route audit

For **every** file matching `src/app/api/*/route.ts`:

- [ ] First lines call `rateLimited(req, "<routeKey>")` and early-return if blocked
      (pattern already in `src/app/api/results/route.ts` lines 9–10).
- [ ] Every query param is validated against `src/lib/validators.ts` regex/sets before
      use (pattern in `results/route.ts` lines 20–28). Add validation where missing.
- [ ] Extend `src/app/api/__tests__/validation.test.ts`: for each param, one accepted
      valid value and one rejected invalid/injection value (e.g. `../`, `';drop`, very
      long strings, regex metacharacters).

### 5.B CSP tightening

Since Phase 2 made the logo local, in `next.config.ts`:

- Remove `https://upload.wikimedia.org` from `img-src` (line ~43) **and** from
  `images.remotePatterns` (lines ~5–14) — unless any *page* still legitimately needs
  Wikimedia/F1 CDN images (grep `upload.wikimedia.org` and `media.formula1.com` across
  `src`). Keep only hosts actually used. Smaller attack surface.
- Re-run `npm run build` and load every route in the browser to confirm no CSP
  violations in the console.

### 5.C Finalize docs & ratchet the gate

- [ ] Rewrite `README.md`: product summary, feature list, screenshot placeholders,
      quickstart, links into `docs/`. (It is currently `create-next-app` boilerplate.)
- [ ] Ensure `docs/security.md`, `docs/architecture.md`, `docs/design-system.md`,
      `docs/testing.md`, `docs/contributing.md`, `docs/ROADMAP.md` are accurate to the
      final code.
- [ ] Append a dated entry per phase to `CHANGELOG.md`.
- [ ] Raise coverage thresholds in `vitest.config.ts` to the final gate: `lines`/
      `statements`/`functions` 80, `branches` 75. Run `npm run test:ci`; if it fails,
      **add tests** until it passes — never lower the numbers.

### Phase 5 — Definition of Done

- [ ] Every API route is rate-limited + input-validated, with tests.
- [ ] CSP/`remotePatterns` contain only hosts actually used.
- [ ] All docs accurate; `README.md` rewritten; `CHANGELOG.md` updated.
- [ ] `npm run lint` clean, `npm test` exits 0, `npm run test:ci` passes the final
      gate, `npm run build` succeeds.
- [ ] Final commit: `chore: security audit, CSP tighten, docs + coverage gate`.

---

## Appendix A — Global Definition of Done (every commit)

1. Test(s) written first; ≥1 positive + ≥1 edge/failure for new code.
2. `npm run lint` clean.
3. `npm test` exits 0.
4. No hardcoded colors in JSX (tokens only; hex allowed only in `globals.css` and the
   `charts/theme.ts` SSR fallbacks).
5. `npm run build` succeeds before a phase is marked done.
6. Commit message explains the *why*. Never `--no-verify`. Never lower the coverage gate.

## Appendix B — Troubleshooting

| Symptom | Cause / Fix |
|---|---|
| `toBeInTheDocument is not a function` | `vitest.setup.ts` missing/not in `setupFiles`, or test file is `.test.ts` not `.test.tsx` (jsdom only matches `.test.tsx`). |
| Component test runs in node, `document` undefined | File must be `*.test.tsx` so `environmentMatchGlobs` selects jsdom. |
| `usePathname` / router errors in a test | `vi.mock("next/navigation", () => ({ usePathname: () => "/..." }))`. |
| React Query test hangs / retries | Create the `QueryClient` with `defaultOptions.queries.retry = false`. |
| Tailwind v4 build error after token edit | A `--color-*` mapping in `@theme inline` has wrong syntax — match the adjacent existing lines exactly; read `node_modules/next/dist/docs/` if Next-specific. |
| CSP console error after Phase 5 | A page still loads a now-blocked external host; either re-allow that exact host or make the asset local. |
| Coverage gate fails | Add tests. Do not edit the thresholds down. |

## Appendix C — Reuse, do not rebuild

| Need | Use this (already exists) |
|---|---|
| Team brand color | `getTeamColor()` — `src/lib/constants/teams.ts:27` |
| Team logo path | `getTeamLogo()` — `src/lib/constants/teams.ts:72` |
| className merge | `cn()` — `src/lib/utils.ts` |
| Rate limiting | `rateLimited()` — `src/lib/api/withRateLimit.ts` |
| Input validation regex/sets | `src/lib/validators.ts` |
| Loading skeletons | `Skeleton` — `src/components/ui/skeleton.tsx` |
| Defensive shape guards | `Array.isArray`/nullish pattern — `src/app/api/__tests__/fetcher-guards.test.ts` |
| Error boundary | `src/app/error.tsx`, `src/components/ErrorBoundary.tsx` |
