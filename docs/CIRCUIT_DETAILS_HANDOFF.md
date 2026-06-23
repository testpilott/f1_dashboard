# Circuit Detail Enhancement — Junior-Engineer Handoff (6 Phases)

> **Read this first, then work strictly top-to-bottom.** Every phase has
> exact file paths, step-by-step instructions, tests to write, risks to
> watch, and a Definition of Done you can verify yourself. **Do not start
> a phase until the previous phase's DoD is green.**

---

## 0. Orientation

### 0.1 What you are building, and why

The Circuit tab on `/race/[year]/[round]` shows the track outline +
current-race incident markers + a corner selector. That's it. Users
wanting to know the circuit's **length, elevation gain, banking, history,
or famous corners** have to leave the dashboard. This work pulls that
context onto the page.

Four things land:

| Ask | Source (verified) |
|---|---|
| Common crash areas | Hand-curated static list (3–6 famous corners per circuit) |
| Elevation change | Hand-curated static (Wikipedia / FIA datasheets) |
| Banking degrees | Hand-curated static (Wikipedia / circuit-operator data) |
| Wikipedia link | Hand-curated slug → `https://en.wikipedia.org/wiki/{slug}` |

**Why static, not an API:** no free API gives lap-loop elevation profiles
or banking angles for F1 circuits, and the existing `/api/wikidata` route
is driver-only (extending it for circuit entities is more work than just
shipping a slug). Curated lists also catch the **iconic** crashes
(Senna at Tamburello, Hubert at Spa, Verstappen at Eau Rouge) that any
OpenF1-aggregation approach would miss — OpenF1 only covers 2023+.

The data model mirrors `src/lib/constants/knownChampionships.ts`: a closed,
append-only map keyed by `circuitId`, with a small lookup helper. ~25 active
circuits, one afternoon of Wikipedia research, lasts years.

### 0.2 Stack reminders

Next.js 16 App Router, TypeScript, React Query v5, Vitest 2.x. AGENTS.md
rules (free-tier only, design tokens only, route guardrails) apply
unchanged. Coverage gate (≥80% lines/fns/stmts, ≥75% branches on
`src/lib/**/*.ts`) applies to the new constants module.

### 0.3 Branch & setup

```bash
git fetch origin
git checkout -b feature/circuit-details origin/main
npm install
npm test          # green baseline before touching anything
```

Commit per phase (or per logical step). Never push a red suite.

### 0.4 Phase order — DO NOT REORDER

```
Phase 1 (static data) ──┬─▶ Phase 2 (route extension)
                        │
                        └─▶ Phase 3 (wiki URL helper)
                                    │
                                    └─▶ Phase 4 (panel UI) ──▶ Phase 5 (hotspot markers) ──▶ Phase 6 (docs)
```

Phase 2 and Phase 3 are independent of each other; both depend on Phase 1.

### 0.5 Non-negotiable conventions

1. **TDD.** Tests first or alongside.
2. **Strictly additive to `/api/circuit-info`.** Existing consumers must
   keep working unchanged. The new field is optional.
3. **Design tokens only.** No raw hex in JSX. New `--hotspot-marker` token
   is added to `src/app/globals.css` in both `:root` (dark) and `.light`
   blocks, matching the existing `--incident-*` pattern.
4. **Reuse, don't reinvent.** The card pattern, marker rendering, dialog
   wiring all exist — extend them, don't rebuild.
5. **Docs-as-you-go.** Each phase's DoD updates the relevant onboarding
   chapter.

### 0.6 Reference patterns to copy

| Need | Copy from |
|---|---|
| Closed-set static lookup | `src/lib/constants/knownChampionships.ts` |
| Card token + 3-stat grid | `src/components/race/CircuitRecords.tsx` |
| External-link icon styling | `src/components/race/RaceStartTimes.tsx` (if it has one — otherwise use `lucide-react`'s `ExternalLink` already in `package.json`) |
| `IncidentMeta` extension point | `src/components/race/TrackSVG.tsx` (lines 26–37) |
| `useCircuitData` (no change) | `src/hooks/useCircuitData.ts` |
| House handoff format (this doc) | `docs/PERF_HANDOFF.md`, `docs/REFACTOR_HANDOFF.md` |

### 0.7 One-off note on type ownership

`CircuitInfoPayload` is declared in `src/components/race/TrackSVG.tsx` and
re-imported by `useCircuitData.ts`. That's slightly odd (a component file
owning a cross-app type) but this work is **not** the place to move it —
that's a tidy-up for the DRY refactor's component-extraction phase
(`docs/REFACTOR_HANDOFF.md` Phase 5). For this work, extend the type
in-place where it lives today.

---

## Phase 1 — Static circuit details constants (LOW risk)

**Goal:** one map, keyed by `circuitId`, with verified per-circuit physical
+ historical detail.

### New files
- `src/lib/constants/circuitDetails.ts`
- `src/lib/constants/__tests__/circuitDetails.test.ts`

### Modified files
- `onboarding/02-project-structure.md` (docs-as-you-go: list the new file)

### Step-by-step

1. **Create `src/lib/constants/circuitDetails.ts`** with the exact contract:

   ```ts
   export interface CircuitHotspot {
     corner: number;        // Multiviewer corner number (1-based, matches /api/circuit-info's corners[].number)
     name: string;          // "Eau Rouge–Raidillon"
     description: string;   // ≤140 chars, 1–2 sentences on why it's notable
   }

   export interface CircuitDetails {
     lengthMeters: number;
     turnCount: number;
     elevationGainMeters: number;  // Peak-to-low, single positive number
     maxBankingDegrees: number;    // 0 for flat circuits
     direction: "clockwise" | "anticlockwise" | "mixed";
     wikipediaSlug: string;        // English Wikipedia article slug
     notableHotspots: CircuitHotspot[];  // 3–6 entries; empty array allowed
   }

   /**
    * Curated reference data per circuit. Keyed by the Jolpica/Ergast
    * circuitId (e.g. "spa", "monaco", "monza", "redbull_ring").
    * Closed set — add an entry when a new circuit joins the calendar.
    */
   export const CIRCUIT_DETAILS: Record<string, CircuitDetails> = {
     spa: {
       lengthMeters: 7004,
       turnCount: 19,
       elevationGainMeters: 102,
       maxBankingDegrees: 0,
       direction: "clockwise",
       wikipediaSlug: "Circuit_de_Spa-Francorchamps",
       notableHotspots: [
         {
           corner: 3,
           name: "Eau Rouge–Raidillon",
           description:
             "Steep uphill left-right combination taken near-flat; multiple high-impact crashes incl. Hubert (F2, 2019) and Verstappen testing (2018).",
         },
         {
           corner: 8,
           name: "Les Combes",
           description:
             "Heavy braking zone after Kemmel Straight; common first-lap pile-ups.",
         },
         // …add 1–4 more
       ],
     },
     // …entries for every circuit on the current calendar
   };

   /**
    * Lookup helper. Returns null when the circuitId isn't curated yet —
    * callers must handle null (the UI hides the panel in that case).
    */
   export function getCircuitDetails(id: string): CircuitDetails | null {
     return CIRCUIT_DETAILS[id] ?? null;
   }
   ```

2. **Seed all ~25 active circuits.** Get the current list from
   `data/snapshots/schedule-current.json` (e.g.
   `jq '.races[].Circuit.circuitId' data/snapshots/schedule-current.json | sort -u`).
   For each one:
   - Open its Wikipedia article (e.g. `https://en.wikipedia.org/wiki/Circuit_de_Spa-Francorchamps`)
   - From the infobox: length (m), turns, direction
   - From the article body / FIA homologation: elevation gain (m), max banking (°)
   - Pick 3–6 notable corners by name; write a ≤140-char description per
     hotspot
   - **Verify the `corner` number** against Multiviewer geometry: run
     `npm run dev`, open `/race/2026/<round>` for that circuit's race, click
     each corner button, and confirm the highlighted turn matches the name
     you've used. **This is the easiest place to introduce silent bugs** —
     a Multiviewer corner numbered "3" isn't always the corner fans call
     "Turn 3" (some circuits have shared chicanes counted as one or two).

3. **Skip circuits not on the calendar.** Older venues (Estoril, Hockenheim
   variants, etc.) can be left out — `getCircuitDetails` returns `null`
   and the UI gracefully hides the panel.

### Tests

`src/lib/constants/__tests__/circuitDetails.test.ts`:
- `getCircuitDetails("spa")` returns a fully-populated object
- `getCircuitDetails("estoril")` (a historical, unseeded circuit) returns
  `null`
- `getCircuitDetails("")` returns `null`
- For every entry in `CIRCUIT_DETAILS`: `lengthMeters > 0`, `turnCount > 0`,
  `elevationGainMeters >= 0`, `maxBankingDegrees >= 0`, `direction` is one
  of the three literal values, `wikipediaSlug` is non-empty, every
  `notableHotspots[].description.length <= 140`. Write this as a single
  data-driven test loop — catches typo'd entries cheaply.
- For every entry: `notableHotspots[].corner` is a positive integer ≤
  `turnCount` (catches the "corner 17 on a 12-turn track" typo).

### Risks
- **Corner-number drift.** The most likely silent bug (see Phase 1 step 2).
  The Phase 1 DoD includes per-circuit visual verification.
- **Wikipedia slug encoding.** Use the raw article slug with
  underscores (e.g. `Circuit_de_Spa-Francorchamps`), not a percent-encoded
  one. Phase 3's URL helper does the encoding.
- **Stale numbers.** Track lengths and turn counts can change with
  reprofiling (Zandvoort, Monza chicane changes). The list is a closed set
  — fine to update when a circuit is reprofiled.

### Definition of Done
- `npm test` green; new test file passes.
- `npx vitest run --coverage src/lib/constants/__tests__/circuitDetails.test.ts`
  reports ≥80% coverage for `circuitDetails.ts`.
- Every current-calendar circuit (the set in
  `data/snapshots/schedule-current.json`) has an entry.
- For each circuit, the visual verification (Phase 1 step 2 last bullet)
  has been completed.
- `onboarding/02-project-structure.md` lists `circuitDetails.ts`.
- Commit: `feat(constants): curated circuit details (length, banking, hotspots, wiki)`.

---

## Phase 2 — Extend `/api/circuit-info` response (LOW risk)

**Goal:** the existing route returns the new `details` field; type +
contract are additive (existing consumers unchanged).

### Modified files
- `src/app/api/circuit-info/route.ts`
- `src/components/race/TrackSVG.tsx` (the `CircuitInfoPayload` interface
  lives here — see §0.7)
- `src/app/api/__tests__/circuit-info.test.ts`
- `onboarding/07-api-routes.md` (docs-as-you-go: document the new field)

### Step-by-step

1. **Extend the interface** in `src/components/race/TrackSVG.tsx`:

   ```ts
   import type { CircuitDetails } from "@/lib/constants/circuitDetails";

   export interface CircuitInfoPayload {
     available: boolean;
     circuitName: string;
     country: string;
     locality: string;
     corners: { number: number; x: number; y: number; length: number }[];
     trackX: number[];
     trackY: number[];
     trackPositionTime: number[];
     rotation: number;
     details?: CircuitDetails;   // ← NEW; optional so older snapshots still type-check
   }
   ```

2. **Populate it in the route.** The route already has `race.Circuit.circuitId`
   in scope before the Multiviewer call — pass it through:

   ```ts
   import { getCircuitDetails } from "@/lib/constants/circuitDetails";

   // …existing schedule + Multiviewer resolution lives above this line
   const circuitId = race.Circuit.circuitId;          // already extracted
   const details = getCircuitDetails(circuitId) ?? undefined;

   return cachedJson({
     // …existing payload…
     details,
   }, "circuitMeta");
   ```

   Use `undefined` (not `null`) on miss — JSON serialises it by dropping
   the key, keeping payloads small and matching the optional-property
   contract.

3. **Don't change the route's TTL or `DataClass`.** Static details ride
   the same 24-hour Multiviewer cache; bumping the cache key is unnecessary.

### Tests

In `src/app/api/__tests__/circuit-info.test.ts`:
- Known circuit (e.g. Spa, round 13 on the schedule): assert `body.details`
  is defined and `body.details.notableHotspots.length > 0`.
- Unknown circuitId (mock the schedule to return a fake circuit not in
  `CIRCUIT_DETAILS`): assert `body.details === undefined`.
- Existing success/error tests must remain unchanged.

### Risks
- **Type re-export.** `CircuitInfoPayload` is imported by `useCircuitData`
  via `@/components/race/TrackSVG`. Adding the optional `details?` field
  doesn't break that import.
- **Snapshot consumers.** This route isn't snapshot-backed (it goes through
  Multiviewer live); no snapshot shape to update.

### Definition of Done
- `npm test` green; new + existing route tests pass.
- `curl 'http://localhost:3000/api/circuit-info?year=2026&round=<spa-round>' | jq .details`
  shows the populated object.
- `curl` for a round whose circuitId isn't in `CIRCUIT_DETAILS` shows no
  `details` key.
- `onboarding/07-api-routes.md` documents the new optional field.
- Commit: `feat(api/circuit-info): include curated circuit details`.

---

## Phase 3 — Wikipedia URL helper (LOW risk)

**Goal:** a single pure function that builds the external Wikipedia URL
from a circuitId.

### New files
- `src/lib/constants/__tests__/circuitDetails.test.ts` already covers
  `getCircuitDetails`; **extend it** for the new helper rather than
  creating a second file.

### Modified files
- `src/lib/constants/circuitDetails.ts`
- `onboarding/13-recipes.md` (docs-as-you-go: short recipe)

### Step-by-step

1. **Add the helper** at the bottom of `circuitDetails.ts`:

   ```ts
   /**
    * Build the English Wikipedia URL for a circuit's article.
    * Returns null when the circuitId isn't curated.
    *
    * The slug is stored already-underscored ("Circuit_de_Spa-Francorchamps");
    * we percent-encode the parts that may contain non-ASCII (diacritics,
    * é, ã, ñ) using encodeURI — NOT encodeURIComponent, which would
    * over-escape the underscores Wikipedia depends on.
    */
   export function getCircuitWikipediaUrl(id: string): string | null {
     const details = getCircuitDetails(id);
     if (!details) return null;
     return `https://en.wikipedia.org/wiki/${encodeURI(details.wikipediaSlug)}`;
   }
   ```

2. **No new API route.** This is a pure function; the Phase 4 panel calls
   it directly.

### Tests
- `getCircuitWikipediaUrl("spa")` returns
  `"https://en.wikipedia.org/wiki/Circuit_de_Spa-Francorchamps"`.
- A circuit with a diacritic in its slug (verify against your seed — e.g.
  `interlagos` if that resolves to `Autódromo_José_Carlos_Pace`) — assert
  the diacritics are percent-encoded but underscores are preserved.
- `getCircuitWikipediaUrl("not_a_real_circuit")` returns `null`.

### Risks
- **`encodeURIComponent` would be wrong.** It percent-encodes underscores,
  producing `/wiki/Circuit_de_Spa%5FFrancorchamps`, which Wikipedia
  redirects ungracefully. Use `encodeURI`.
- **Slug drift.** Wikipedia article titles occasionally change (rename,
  merge). The constant entry is the single source of truth — when it
  drifts, update the constant.

### Definition of Done
- `npm test` green.
- `onboarding/13-recipes.md` has a one-paragraph recipe for adding a new
  circuit's slug.
- Commit: `feat(constants): Wikipedia URL helper for circuits`.

---

## Phase 4 — `CircuitDetailsPanel` component (LOW-MED risk)

**Goal:** the new card renders under the SVG, showing the four stats + the
wiki link + the notable-corners list.

### New files
- `src/components/race/CircuitDetailsPanel.tsx`
- `src/components/race/__tests__/CircuitDetailsPanel.test.tsx`

### Modified files
- `src/components/race/CircuitMap.tsx` (insertion point only)
- `onboarding/10-components-theming.md` (docs-as-you-go: where new race
  panels live)

### Step-by-step

1. **Build the panel** as a presentational client component (props in,
   JSX out — no data fetching of its own).

   ```tsx
   "use client";

   import { ExternalLink } from "lucide-react";
   import type { CircuitDetails } from "@/lib/constants/circuitDetails";
   import { getCircuitWikipediaUrl } from "@/lib/constants/circuitDetails";

   interface Props {
     circuitId: string;
     details: CircuitDetails | undefined;
   }

   export function CircuitDetailsPanel({ circuitId, details }: Props) {
     if (!details) return null;     // Older / unseeded circuit — hide silently
     const wikiUrl = getCircuitWikipediaUrl(circuitId);
     return (
       <div className="rounded-lg border border-border bg-surface-2 p-3 sm:p-5">
         <div className="flex items-baseline justify-between gap-3 mb-3">
           <h3 className="text-sm font-semibold text-foreground">
             Circuit details
           </h3>
           {wikiUrl && (
             <a
               href={wikiUrl}
               target="_blank"
               rel="noopener noreferrer"
               className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
             >
               Wikipedia <ExternalLink className="h-3 w-3" />
             </a>
           )}
         </div>

         {/* Stat grid — copy the CircuitRecords pattern verbatim */}
         <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
           <StatCell label="Length"    value={`${details.lengthMeters.toLocaleString()} m`} />
           <StatCell label="Turns"     value={String(details.turnCount)} />
           <StatCell label="Elevation" value={`${details.elevationGainMeters} m`} />
           <StatCell label="Max bank"  value={`${details.maxBankingDegrees}°`} />
         </div>

         {details.notableHotspots.length > 0 && (
           <div className="mt-4">
             <h4 className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
               Notable corners
             </h4>
             <ul className="space-y-2">
               {details.notableHotspots.map((h) => (
                 <li key={h.corner} className="rounded-md bg-surface-3/60 px-3 py-2">
                   <div className="text-sm font-medium text-foreground">
                     T{h.corner} — {h.name}
                   </div>
                   <div className="text-xs text-muted-foreground mt-0.5">
                     {h.description}
                   </div>
                 </li>
               ))}
             </ul>
           </div>
         )}
       </div>
     );
   }

   function StatCell({ label, value }: { label: string; value: string }) {
     return (
       <div className="rounded-md bg-surface-3/60 px-3 py-2">
         <div className="text-xs text-muted-foreground">{label}</div>
         <div className="text-sm font-medium font-mono tabular-nums text-foreground">
           {value}
         </div>
       </div>
     );
   }
   ```

2. **Insert into `CircuitMap.tsx`.** It already returns
   `<div className="mt-4 space-y-4">` (line 150). Today's children are
   the SVG card, the IncidentDialog, and the corner selector. Add the
   panel as a sibling **between the IncidentDialog and the corner
   selector** so it sits visually under the map but above the technical
   corner picker:

   ```tsx
   <CircuitDetailsPanel
     circuitId={data?.circuitId ?? ""}  // see step 3
     details={data?.details}
   />
   ```

3. **The route response doesn't expose `circuitId` today.** Two options:

   - **(a) Add `circuitId: string` to `CircuitInfoPayload`** in Phase 2
     above (small additive change; pairs naturally with `details`). This
     is the cleaner path — do this and add a one-line assertion in the
     route test. Update Phase 2's "step 1" interface to include
     `circuitId: string;` and Phase 2's "step 2" to include
     `circuitId,` in the returned object.

   - **(b) Pass `circuitId` down separately** through `useCircuitData` →
     `CircuitMap` props. Requires a prop addition to `CircuitMap`. Avoid
     this unless you have a reason not to do (a).

   **Recommendation:** do (a) when you return to update Phase 2 after
   reading this. The doc was structured this way so the Phase 2 edit is
   trivial when you get here.

### Tests

`src/components/race/__tests__/CircuitDetailsPanel.test.tsx` (jsdom):
- Happy path: render with a full `CircuitDetails` object → assert length,
  turns, elevation, banking text present; assert the Wikipedia anchor has
  `target="_blank"` and `rel="noopener noreferrer"`; assert every
  hotspot's `name` is in the DOM.
- `details: undefined` → component returns `null` (`container.firstChild`
  is `null`).
- Empty `notableHotspots`: the stats render but the "Notable corners"
  section is absent.

### Risks
- **Empty-state hiding.** Returning `null` when `details` is `undefined`
  is intentional — a half-populated panel looks like a bug. The
  `circuitDetails` constant is the contract.
- **Layout shift on slow connections.** The panel only renders after
  `useCircuitData` resolves. That's identical to today's behaviour for
  `CircuitMap` itself — no regression.
- **External-link icon.** `lucide-react` is already in `package.json`; if
  it isn't, swap to an inline SVG (token-only `stroke="currentColor"`) —
  do not add a new dependency for one icon.

### Definition of Done
- `npm test` green; new component test passes.
- Open `/race/2026/<spa-round>` in the browser, click the Circuit tab —
  the panel renders under the SVG showing length/turns/elevation/banking,
  the Wikipedia link opens Spa's article in a new tab, the notable corners
  list is visible.
- Open the Circuit tab for a round whose circuit isn't in
  `CIRCUIT_DETAILS` — the panel is absent (no broken layout, no empty
  card).
- `onboarding/10-components-theming.md` documents where new race-tab
  panels live.
- Commit: `feat(race): CircuitDetailsPanel — stats + wiki link + notable corners`.

---

## Phase 5 — Hotspot markers on the track (MED risk)

**Goal:** each curated hotspot shows up as a clickable marker on the
existing SVG, distinct from current-race incident markers, opening the
same dialog.

### Modified files
- `src/components/race/TrackSVG.tsx` (`IncidentMeta` extension + marker
  branch)
- `src/components/race/CircuitMap.tsx` (build the hotspot markers from
  `details.notableHotspots` + the existing `corners[]` geometry)
- `src/app/globals.css` (new `--hotspot-marker` token in both `:root` and
  `.light` blocks)
- `onboarding/10-components-theming.md` (docs-as-you-go: new token)

### Step-by-step

1. **Add the discriminator** to `IncidentMeta` in `TrackSVG.tsx`:

   ```ts
   export interface IncidentMeta {
     // …existing fields…
     type?: "incident" | "hotspot";   // ← NEW; "incident" is default for backwards compat
     name?: string;                    // hotspot's display name
     description?: string;             // hotspot's description
   }
   ```

   Existing call sites pass no `type` → treated as `"incident"`.

2. **Branch the marker colour** in `TrackSVG.tsx` (lines ~190–205,
   where `incident-red`/`incident-yellow`/`incident-default` are
   selected). Add a hotspot branch above the incident branches:

   ```tsx
   const fill =
     marker.meta.type === "hotspot"
       ? "var(--hotspot-marker)"
       : marker.meta.flag === "RED"
         ? "var(--incident-red)"
         : (marker.meta.flag === "YELLOW" || marker.meta.flag === "DOUBLE YELLOW")
           ? "var(--incident-yellow)"
           : "var(--incident-default)";
   ```

   Keep the rest of the marker geometry (outer translucent circle, inner
   solid circle, "!" text) identical. Optional polish: for `"hotspot"`
   markers, render `"★"` instead of `"!"` so they're visually distinct
   beyond colour alone. Use the same token sizing.

3. **Add the token** in `src/app/globals.css`. The existing `--incident-*`
   tokens are defined in both `:root` (dark) and `.light` blocks at the
   lines verified during planning (around 129–131 and 215–217). Add a
   `--hotspot-marker` in each, picking a colour distinct from the three
   incident tokens — recommend a desaturated cyan/teal:

   ```css
   /* :root (dark) block, alongside --incident-* */
   --hotspot-marker: oklch(0.7 0.13 195);

   /* .light block, alongside --incident-* */
   --hotspot-marker: oklch(0.55 0.13 195);
   ```

4. **Build hotspot markers** in `CircuitMap.tsx`. The route returns
   `corners[]` (each with `{ number, x, y, length }`). Join the curated
   hotspots to corners by `number`:

   ```ts
   const hotspotMarkers = (data?.details?.notableHotspots ?? [])
     .map((h) => {
       const corner = data?.corners.find((c) => c.number === h.corner);
       if (!corner) return null;
       return {
         x: corner.x,
         y: corner.y,
         meta: {
           type: "hotspot" as const,
           name: h.name,
           description: h.description,
           lap_number: null,
           driver_number: null,
           flag: null,
           category: "Hotspot",
           message: h.description,
         } satisfies IncidentMeta,
       };
     })
     .filter((m): m is NonNullable<typeof m> => m !== null);

   const allMarkers = [...incidentMarkers, ...hotspotMarkers];
   ```

   Pass `allMarkers` to `TrackSVG` instead of the incident-only array.

5. **Extend the click-through dialog** in `CircuitMap.tsx` to render the
   hotspot's name + description when the clicked marker is a hotspot.
   The dialog already accepts `IncidentMeta` — branch the body on
   `selectedIncident.type`:

   ```tsx
   {selectedIncident?.type === "hotspot" ? (
     <>
       <DialogTitle>{selectedIncident.name}</DialogTitle>
       <DialogDescription>{selectedIncident.description}</DialogDescription>
     </>
   ) : (
     /* existing incident body — lap, driver, flag, message */
   )}
   ```

### Tests

In `src/components/race/__tests__/CircuitMap.test.tsx`:
- Mock `useCircuitData` to return a payload with `details.notableHotspots`
  matching `corners[].number` for two entries → assert two extra `<circle>`
  markers render with `fill="var(--hotspot-marker)"`.
- Hotspot with a `corner` that doesn't exist in `corners[]` → assert it's
  silently skipped (not rendered, no console error).
- Click on a hotspot marker → assert the dialog shows the hotspot's name,
  not the incident layout.

### Risks
- **Marker pile-up.** Some circuits (Spa) will have hotspots that overlap
  with current-race incidents. Visually distinct colour + `"★"` shape
  helps; click priority lands on whichever element is topmost in the
  SVG. Render hotspots first (under) so live-race incidents always sit on
  top — match how today's code orders.
- **Token colour contrast.** Verify the `--hotspot-marker` colour reads
  in both themes against the track outline. Use the Lighthouse contrast
  check or simply eyeball it on the dev server in both modes.
- **Test mocks.** `useCircuitData` is a custom hook — copy whatever mock
  pattern the existing `CircuitMap.test.tsx` uses; don't introduce a new
  mock style.

### Definition of Done
- `npm test` green; the existing `CircuitMap.test.tsx` tests still pass.
- Open `/race/2026/<spa-round>` Circuit tab: hotspot markers visible on
  the track, clicking one opens the dialog with the hotspot's name +
  description.
- Both themes (dark + light) show readable hotspot markers.
- `onboarding/10-components-theming.md` documents the `--hotspot-marker`
  token.
- Commit: `feat(race): hotspot markers on track + dialog body`.

---

## Phase 6 — Onboarding docs sweep (LOW risk)

**Goal:** the onboarding guide accurately reflects the new circuit data
path and component.

### Modified files
- `onboarding/02-project-structure.md` — adds `src/lib/constants/circuitDetails.ts`
  and `src/components/race/CircuitDetailsPanel.tsx` to the tree.
- `onboarding/08-pages.md` — the Circuit tab section describes the new
  details panel + hotspot markers.
- `onboarding/13-recipes.md` — a recipe titled "Add a new circuit to the
  curated details table" with this checklist:
  1. Get the `circuitId` from `data/snapshots/schedule-current.json` or
     the Jolpica `/circuits` endpoint.
  2. Open the circuit's Wikipedia article; capture length, turns,
     elevation gain, max banking, direction, slug.
  3. Pick 3–6 famous corners; write ≤140-char descriptions.
  4. **Verify each hotspot's `corner` number** against Multiviewer
     geometry by clicking the corresponding corner in the dev-server
     Circuit tab.
  5. Add the entry to `CIRCUIT_DETAILS` in
     `src/lib/constants/circuitDetails.ts`.
  6. Run `npm test` — the data-driven tests catch typos
     (corner > turnCount, description too long, missing slug).
  7. Commit: `feat(constants): seed circuit-details for <circuitId>`.

### Step-by-step
1. `grep -rn "src/components/race\|circuit-info" onboarding/` and update
   any section that mentions the Circuit tab to also reference the new
   panel.
2. Spot-check that `13-recipes.md`'s "add an API route" recipe still
   compiles against the current `cachedJson` signature (post-PR #11).

### Definition of Done
- All three docs name the new files / panel / recipe.
- `grep -rn "src/lib/constants/circuitDetails" onboarding/` returns at
  least 2 hits.
- Commit: `docs(onboarding): sync guide with circuit-details feature`.

---

## Final verification (before opening a PR)

1. `npm run lint` — no new errors.
2. `npm test` — green, test count ≥ baseline + the small additions from
   Phases 1, 2, 4, 5.
3. `npm run test:ci` — coverage gate passes
   (`src/lib/constants/circuitDetails.ts` ≥ 80%).
4. `npm run build` — succeeds.
5. **Manual browser pass** (dark + light, mobile + desktop) on at least
   three circuits with different profiles:
   - **Spa** — verify all four stats render, Wikipedia link opens
     correctly, multiple notable corners render in the list AND on the
     track.
   - **Monaco** — verify the panel adapts to a tight-cornered low-elevation
     circuit (0 m banking, ~42 m elevation gain).
   - **Bahrain** — sanity check for a relatively flat circuit (your
     "boring" baseline) with 0 banking.
6. **Manual** `curl` of `/api/circuit-info?year=2026&round=<round>` for a
   round whose circuit isn't yet in `CIRCUIT_DETAILS` — confirm
   `details` is absent (not `null`, not empty) and the panel is hidden in
   the browser.

## Risks & unknowns — verify during work, do not assume

| # | Risk | Mitigation |
|---|---|---|
| 1 | Curated `corner` numbers drift from Multiviewer numbering | Phase 1 DoD: per-circuit visual verification in dev server |
| 2 | Wikipedia slug encoding | Phase 3: `encodeURI`, not `encodeURIComponent` |
| 3 | Existing `CircuitInfoPayload` lives in a component file (`TrackSVG.tsx`) | §0.7: extend in place; do not move it in this work |
| 4 | Hotspot markers overlap live-race incidents | Phase 5: render hotspots first (under) + distinct colour + `★` shape |
| 5 | `lucide-react` not in deps | Phase 4 Risks: confirm `package.json`; fallback to inline SVG |
| 6 | Adding `circuitId` to the route payload after the fact | Phase 4 step 3: do it during Phase 2 — re-read Phase 2 before committing it |

## Out of scope (do not do in this work)

- Moving `CircuitInfoPayload` out of `TrackSVG.tsx` — that's the DRY
  refactor's component-extraction pass.
- Extending the Wikidata route to handle circuit entities — a hand-curated
  slug is cheaper and avoids parallel-pipeline complexity.
- Aggregating OpenF1 race-incidents across seasons for a dynamic "crash
  frequency" view — that's a separate feature (snapshot writer + heatmap)
  not requested here. The user explicitly picked the curated path.
- Adding new circuits to `CIRCUIT_COORDS` (already complete for the
  current calendar); only `CIRCUIT_DETAILS` is new.
- Elevation profile chart along the trackline — would require an
  elevation-per-point dataset that no free API provides for F1 circuits.
