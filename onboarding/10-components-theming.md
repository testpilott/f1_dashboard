# 10 — Components & Theming

## Server vs client components

Next.js App Router defaults to **server components**. Anything that needs the
browser must opt in with `"use client"` at the top of the file.

| Rule | Why |
|---|---|
| Default to server | Smaller bundle, faster TTFB |
| Add `"use client"` only when you need state, effects, browser APIs, or event handlers | Don't ship JS for nothing |
| Server components can render client components, not vice versa (props only) | Boundary direction |
| Client components must not import server-only modules | Bundler would error |

Typical pattern for a page with interactivity:

```
src/app/schedule/
  page.tsx              // server: fetch initial data
src/components/schedule/
  ScheduleClient.tsx    // client orchestrator
  ScheduleRow.tsx       // extracted row shell + expand/collapse
  SessionRow.tsx        // extracted session/time row
  Countdown.tsx         // extracted ticking countdown
```

Driver detail panel content sections now live in dedicated files:

```
src/components/drivers/sections/
  DriverBioSection.tsx
  DriverQuotesSection.tsx
  DriverSeasonSection.tsx
  DriverCareerSection.tsx
  DriverNewsSection.tsx
```

Standings uses `MedalPositionBadge` and compare uses `PositionBadge`; these are
not interchangeable because they intentionally render different UI.

Fetch-owning composition hooks live in `src/hooks/` when a page/component needs
to orchestrate multiple related queries. Example:
`src/hooks/useDriverDetails.ts` is consumed by `src/app/drivers/page.tsx`.
`src/hooks/useDriverComparison.ts` and `src/hooks/useCircuitData.ts` follow the
same pattern.

## The design system

All colors, typography, spacing, and radii come from CSS variables in
[src/app/globals.css](../src/app/globals.css). Tailwind 4 is configured to
expose those tokens through utility classes.

A typical token:

```css
:root {
  --color-bg: #0b0d10;
  --color-fg: #e8e8e8;
  --color-accent: #ff1801;
  --color-team-redbull: #1e41ff;
  --color-team-mercedes: #00d2be;
  /* ...20+ team colors, sector colors, tyre colors */
}
```

Usage in components:

```tsx
<div className="bg-[color:var(--color-bg)] text-[color:var(--color-fg)]">
```

or via shadcn's pre-themed primitives in
[src/components/ui/](../src/components/ui/).

## The colour invariant

> **No hardcoded colors in components.**

- ❌ `text-blue-400`, `bg-red-500`, `#1e41ff`, `rgb(0,0,0)` in JSX/SVG/chart props
- ✅ `text-[color:var(--color-accent)]`, theme constants, `var(--color-team-redbull)`

This rule applies to:

- Component JSX
- Inline SVGs (use `stroke="var(--color-...)"`)
- Nivo chart props (read from `src/lib/charts/theme.ts`)
- Tailwind utility classes

Why: theme changes (dark/light, team paint schemes) must work by changing CSS
variables alone, with zero JSX edits.

## Chart loading

Race charts that pull Nivo (`LapChart`, `LapTimeFallbackChart`) should be
imported in their parent via `next/dynamic` with an explicit skeleton fallback.
Keep `ssr: false` and match skeleton height to the loaded chart container to
avoid CLS on mobile.

## Chart theming

[src/lib/charts/theme.ts](../src/lib/charts/theme.ts) exports a Nivo theme bound
to CSS variables:

```ts
export const chartTheme = {
  background: "transparent",
  textColor: "var(--color-fg)",
  axis: { ticks: { line: { stroke: "var(--color-grid)" } } },
  // ...
};
```

Series colours come from `teamColors` (in `src/lib/constants/teams.ts`) — also
CSS variables, indexed by team key.

## Images

[next.config.ts](../next.config.ts) configures `next/image` with allowed
remote hosts.

Rules:

1. **Use `next/image`** by default. It optimises, sizes responsively, and
   lazy-loads.
2. **Never use raw `<img>`** in product code.
3. **Avoid `unoptimized`** unless there's a documented constraint (one SVG that
   breaks the optimiser is a fair reason — note it in a comment).
4. **Place placeholders** under [public/](../public/) (e.g.
   `public/logos/...`).

The [DriverHeadshot](../src/components/drivers/) component shows the full
pattern: try OpenF1, fall back to a static placeholder.

## Forms and inputs

The home of inputs is [src/components/ui/](../src/components/ui/) — shadcn
primitives. Use `<Button>`, `<Card>`, `<Skeleton>`, `<Tooltip>`,
`<SeasonPicker>` rather than rolling your own.

## Reduced motion

Global reduced-motion support is implemented in
[src/app/globals.css](../src/app/globals.css) via
`@media (prefers-reduced-motion: reduce)`. Keep this as a system-level override
for animation and transition timing so OS accessibility settings are respected
consistently.

## Accessibility checklist

When adding a component:

- [ ] All interactive elements are keyboard-reachable (`tabIndex`, `<button>`
      not `<div onClick>`)
- [ ] Color contrast meets AA — verify with browser devtools
- [ ] Loading and empty states are not silent
- [ ] Skeletons match the eventual layout to avoid CLS

## Suspense and skeletons

Each page that fetches has a `loading.tsx` sibling. Use a Skeleton from
`src/components/ui/skeleton.tsx`. Match the rendered layout, including height —
avoid layout shift when real data lands.

## When you need state

Reach for these in order:

1. **URL** (search params, route params) — the most boring + sharable
2. **React Query cache** — for server data
3. **`useSyncExternalStore`** + a small helper — for SSR-safe browser-only
  state like `isClient`, `now`. See [src/hooks/](../src/hooks/).
4. **`useState`** in a leaf client component — for purely UI-local state
5. Avoid global stores (Redux, Zustand) — the data model fits without them

## Layouts and nesting

```
src/app/
  layout.tsx               // root: fonts, providers, navbar
  drivers/
    layout.tsx?            // optional drivers-specific wrapper
    page.tsx               // /drivers
    [id]/page.tsx          // /drivers/:id
```

Each `layout.tsx` wraps its segment + descendants. Avoid duplicating UI between
levels — pull shared chrome to the highest layout that needs it.

Next: [11 — Testing](11-testing.md).
