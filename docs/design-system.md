# Design System — "F1 Broadcast"

> **TL;DR** — Dark-first, like an F1 TV / FOM broadcast graphics package. F1 red
> (`#E10600`) is the single brand accent. Surfaces are layered carbon-blacks. Type is
> condensed and confident. Numbers are tabular and monospaced. **Never hardcode a color
> in a component** — always use a token (`bg-background`, `text-primary`, `var(--f1-red)`).

## Principles

1. **Broadcast, not dashboard.** High contrast, dark canvas, data foregrounded, red used
   sparingly for emphasis (live, active, podium, alerts).
2. **One source of truth.** All color/space/type/motion come from tokens in
   `src/app/globals.css`. Components reference semantic tokens, never raw `zinc-*`/hex.
3. **Telemetry feel.** Tabular numerals, monospace for timing/lap data, thin grid lines,
   speed-line accents on active states.
4. **Accessible.** Text ≥ 4.5:1 contrast on its surface; visible focus ring on every
   interactive element; respect `prefers-reduced-motion`.

## Color tokens

Defined as CSS custom properties in `src/app/globals.css` (OKLCH). Semantic names map to
shadcn slots so existing `ui/` primitives pick them up automatically.

| Token | Role |
|---|---|
| `--f1-red` | Brand accent (~`#E10600`). Live/active/podium/alert only. |
| `--background` | App canvas (near-black, slight cool undertone). |
| `--surface-1/2/3` | Elevation layers (cards, popovers, raised panels). |
| `--card` / `--popover` | Container surfaces (map to `--surface-*`). |
| `--foreground` | Primary text (high contrast on `--background`). |
| `--muted` / `--muted-foreground` | Secondary surfaces / de-emphasized text. |
| `--primary` | Primary action = `--f1-red`. |
| `--secondary` / `--accent` | Neutral interactive surfaces. |
| `--destructive` | Errors / DNF. |
| `--border` / `--input` / `--ring` | Hairlines, fields, focus ring. |
| `--grid-line` | Chart/table grid hairlines. |
| `--chart-1..5` | Telemetry data ramp: red, cyan, amber, violet, lime. |

**Light mode** ("paddock daylight") exists but is secondary — a warm off-white canvas,
not pure white. Dark is the default and the design target.

### Team livery

Constructor colors live in `TEAM_COLORS` (`src/lib/constants/teams.ts`). Use the existing
`getTeamColor(teamName)` helper (do **not** re-list hex values). Apply as an inline accent
(left border / dot / chart series), never as a large fill — keeps the broadcast neutrality.

## Typography

Fonts (free, already wired in `src/app/layout.tsx`): **Exo 2** (display/headings, the
condensed F1-Display feel), **Titillium Web** (body), **Geist Mono** (data/timing).

| Token / role | Usage |
|---|---|
| display | Page hero / big stat numbers |
| headline | Section titles |
| title | Card titles |
| body | Paragraph / labels |
| caption | Meta, timestamps |
| mono-data | Lap times, gaps, points — `font-mono`, `tabular-nums` |

All numeric/timing data uses `tabular-nums` so columns align like a timing screen.

## Spacing, radius, elevation, motion

- Spacing: Tailwind scale; favor a tight, dense broadcast rhythm.
- Radius: from `--radius` token scale already present in `globals.css`.
- Elevation: `--surface-1/2/3` (no heavy drop shadows; use surface lift + hairline).
- Motion: `--speed` duration scale; quick, mechanical easing; honor
  `prefers-reduced-motion`.

## Component usage rules

- **Card**: container = `bg-card`; raised panels use `--surface-2/3`; optional subtle grid
  texture for "telemetry panel" variant.
- **Table**: dense, hairline `--grid-line` rows, `tabular-nums`, team-color left accent.
- **Badge**: status (LIVE = `--f1-red`), or team-tinted via `getTeamColor`.
- **Charts**: must import the shared theme from `src/lib/charts/theme.ts` — never inline
  axis/grid/tooltip colors.

## Do / Don't

| Do | Don't |
|---|---|
| `className="bg-background text-foreground"` | `className="bg-zinc-950 text-white"` |
| `style={{ color: getTeamColor(team) }}` | `style={{ color: "#E8002D" }}` |
| `text-primary` for the red accent | `text-red-600` |
| Import chart theme | Inline chart colors per component |

## Definition of Done (any UI change)

- No raw color literals (`zinc-*`, `red-*`, `#hex`) in JSX/CSS — tokens only.
- Contrast ≥ 4.5:1; visible focus ring; works in dark **and** light.
- Verified in browser at mobile and desktop widths.
