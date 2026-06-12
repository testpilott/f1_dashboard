# Safe Additive Enhancements — Junior-Engineer Handoff (6 Phases)

> **Read this first, then work strictly top-to-bottom.** Every phase here is
> **additive** — new files or new export blocks. Nothing modifies existing
> render output or response shapes. Deleting any phase's changes is a clean
> revert. **Do not start a phase until the previous phase's DoD is green.**

---

## 0. Orientation

### 0.1 What you are doing, and why

Four prior refactors (PRs #7/#8/#9/#10) covered structural debt, data tier,
and client delivery. This guide covers the four dimensions nobody has looked
at yet: **SEO/discoverability, CI/observability, type-safety debt, and
accessibility**. Every finding here was verified in current `main` before
writing this doc.

| Verified gap (current `main`) | What this guide adds |
|---|---|
| Only 3 of 9 routes export `metadata`; race detail (`/race/[year]/[round]`) — the most shareable URL — has none | `metadata` exports on every page + `generateMetadata` on race detail |
| No `sitemap.ts`, `robots.ts`, `manifest.ts`, or OG image | All four, generated from the existing schedule data |
| No JSON-LD structured data | `SportsEvent` + `BreadcrumbList` + `Organization` on race detail (Google rich-result eligible) |
| `npm run type-check` exists as a script but isn't in CI; 60 pre-existing `tsc` errors silently drift | Fix the 60 (mechanical), add type-check to CI |
| No bundle-size budget; one bad `npm install` can ship +100kB | Tiny `bundle-budget.json` + check script |
| No Dependabot / Renovate config | `.github/dependabot.yml` (weekly, grouped) |
| No web-vitals reporting | `@vercel/speed-insights` (free tier, one-liner) |
| Snapshot staleness unmonitored — stuck cron silently serves >48h old data | Smoke check on `snapshotAt` age |
| `global-error.tsx` missing; `not-found.tsx` missing; no skip-to-content link; zero `aria-live` regions | All added |

### 0.2 The "safe additive" frame

- **Every phase is additive.** New files or new export blocks. Nothing rewrites existing render output, response shapes, or visible UI.
- **CI gates can only "break" bad PRs**, not production. A type-check gate catches new errors; a bundle-size budget fails a PR that ships +100kB. Neither affects the deployed app.
- **A11y additions are invisible to sighted users and only better for everyone else.**

### 0.3 Branch & setup

```bash
git fetch origin
git checkout -b enhancements/safe-additive origin/main
npm install
npm test          # green baseline before touching anything
npm run build     # success baseline; record sizes from output for Phase 5
```

Never push a red suite. The husky pre-commit hook runs the full suite — do not bypass it.

### 0.4 Phase order — DO NOT REORDER

```
P1 (metadata) ──▶ P3 (OG images need metadataBase)
   │
   └──▶ P2 (sitemap/robots/manifest) — independent of P3
P4 (JSON-LD) — depends on P1's metadata in race detail
P5 (CI hardening + observability) — independent
P6 (a11y polish) — independent
```

P5 and P6 can be done in parallel with P1–P4 if a second engineer is
available.

### 0.5 Non-negotiable conventions

1. **Behavior-preserving for users.** No visible UI change in P1–P4 except
   the browser tab title, the OG preview when shared, and the search-result
   snippet. P5/P6 add new error/loading states whose styling matches the
   existing `error.tsx`.
2. **TDD where applicable.** `npm test` is the gate for P1, P5, P6.
   P2/P3/P4 are mostly metadata — gate on `npm run build` succeeding and a
   one-line verification command per phase.
3. **AGENTS.md rules apply** — design tokens only in any new JSX, no raw
   hex; route guardrails (rate-limit + validators) on any new route.
4. **Docs-as-you-go.** Each phase's DoD includes updating the onboarding
   chapter that describes what you changed.

### 0.6 Reference patterns to copy

| Need | Copy from |
|---|---|
| Metadata export pattern | `src/app/standings/page.tsx:11-13` |
| Server page with snapshot-cached fetch (for `generateMetadata`) | `src/app/standings/page.tsx` |
| `error.tsx` token styling | `src/app/error.tsx` (mirror for `global-error.tsx`) |
| Validation test pattern | `src/app/api/__tests__/validation.test.ts` |
| House handoff format (this doc) | `docs/JOLPICA_RATELIMIT_HANDOFF.md`, `docs/REFACTOR_HANDOFF.md`, `docs/PERF_HANDOFF.md` |

---

## Phase 1 — Per-page metadata + `generateMetadata` for race detail (LOW)

**Goal:** every page surfaces a meaningful `<title>` and `<meta description>`.
The race detail page generates per-race metadata so a Slack/Twitter link to
`/race/2026/12` shows "2026 Monaco GP Results" instead of the generic OG.

### Modified files

- `src/app/layout.tsx` (add `metadataBase`)
- `src/app/compare/page.tsx`, `drivers/page.tsx`, `news/page.tsx`,
  `projections/page.tsx`, `schedule/page.tsx`, `weekend/page.tsx`
  (add `export const metadata`)
- `src/app/race/[year]/[round]/page.tsx` (add `generateMetadata`)
- `onboarding/02-project-structure.md` (docs-as-you-go: metadata convention)

### Step-by-step

1. **`metadataBase` in layout** — required so OG image URLs in P3 resolve
   absolutely. Add to the existing `export const metadata` in
   `src/app/layout.tsx`:
   ```ts
   import type { Metadata } from "next";

   export const metadata: Metadata = {
     metadataBase: new URL(
       process.env.NEXT_PUBLIC_SITE_URL ?? "https://f1-dashboard-lilac.vercel.app",
     ),
     // …existing fields stay…
   };
   ```
   Vercel preview deploys set `NEXT_PUBLIC_VERCEL_URL` — using a literal env
   var keeps the doc-style `https://…` default for prod and lets preview
   builds override via the Vercel dashboard if desired.

2. **Static metadata on the 6 client pages.** Use the same shape as
   `standings/page.tsx`. Example for `/drivers`:
   ```ts
   import type { Metadata } from "next";

   export const metadata: Metadata = {
     title: "F1 Dashboard · Drivers",
     description: "Current Formula 1 grid: profiles, season form, career stats and headshots.",
   };
   ```
   Per-page descriptions (one sentence each):
   - `/compare`: "Head-to-head driver and constructor comparisons across seasons and circuits."
   - `/drivers`: "Current Formula 1 grid: profiles, season form, career stats and headshots."
   - `/news`: "Latest Formula 1 news, race reports and team announcements."
   - `/projections`: "Monte Carlo championship projections based on the current season."
   - `/schedule`: "Full Formula 1 season schedule with race times and circuit details."
   - `/weekend`: "Live timing and session data for the current race weekend."

3. **`generateMetadata` on race detail.** This is the single biggest SEO
   win on the site. Add to `src/app/race/[year]/[round]/page.tsx`:
   ```tsx
   import type { Metadata } from "next";
   import { getSchedule } from "@/lib/api/jolpica";

   export async function generateMetadata(
     { params }: { params: Promise<{ year: string; round: string }> }
   ): Promise<Metadata> {
     const { year, round } = await params;
     try {
       const races = await getSchedule(year);
       const race = races.find((r) => r.round === round);
       if (!race) return { title: "Race not found · F1 Dashboard" };

       const title = `${year} ${race.raceName} · F1 Dashboard`;
       const description = `Full race results, qualifying, lap charts and telemetry for the ${year} ${race.raceName} at ${race.Circuit.circuitName}.`;

       return {
         title,
         description,
         openGraph: { title, description, type: "article" },
         twitter: { card: "summary_large_image", title, description },
       };
     } catch {
       return { title: `${year} Race · F1 Dashboard` };
     }
   }
   ```
   `getSchedule` is already cached via the snapshot tier, so this adds zero
   new network cost. The `try/catch` ensures a transient Jolpica blip
   degrades to a static title instead of a 500.

### Tests

- `npm test` — existing tests don't assert on `<head>` content; nothing
  should break.
- New jsdom test in `src/app/race/[year]/[round]/__tests__/metadata.test.ts`
  asserting `generateMetadata` returns the expected title for a happy-path
  fixture, mocks `getSchedule` via `@/test/mockJolpica`.

### Risks

- A typo'd `metadataBase` produces broken OG image URLs in P3 — verify by
  visiting `/opengraph-image` in a preview build and confirming a 200.
- `try/catch` in `generateMetadata` is intentional — never throw from there;
  Next will render a 500 page if you do.

### Definition of Done

- `npm test` green; `npm run build` succeeds.
- `grep -L "export const metadata\\|generateMetadata" src/app/*/page.tsx src/app/*/*/page.tsx src/app/*/*/*/page.tsx` returns empty (every page has metadata).
- `curl -s <preview>/race/2026/<any round> | grep "<title>"` shows the
  race-specific title.
- `onboarding/02-project-structure.md` documents the per-page-metadata
  convention.
- Commit: `feat(seo): per-page metadata + race-detail generateMetadata`.

---

## Phase 2 — Discoverability files: sitemap, robots, manifest (LOW)

**Goal:** search engines and browsers can find and install the app.

### New files

- `src/app/sitemap.ts`
- `src/app/robots.ts`
- `src/app/manifest.ts`
- `src/app/icon.tsx` or `src/app/icon.svg` (if no app icon exists today —
  check `public/` first; the existing logo can serve)
- `src/app/apple-icon.png` (180×180, can be a static export of the icon)

### Modified files

- `onboarding/12-deployment.md` (docs-as-you-go: discoverability)

### Step-by-step

1. **`sitemap.ts`** — generated from the current season's schedule plus
   the static routes:
   ```ts
   import type { MetadataRoute } from "next";
   import { getSchedule } from "@/lib/api/jolpica";

   const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://f1-dashboard-lilac.vercel.app";

   export const revalidate = 86400; // 24h

   export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
     const staticRoutes = ["", "/standings", "/schedule", "/drivers", "/compare", "/projections", "/news", "/weekend"];
     const staticEntries: MetadataRoute.Sitemap = staticRoutes.map((path) => ({
       url: `${BASE_URL}${path}`,
       lastModified: new Date(),
       changeFrequency: "daily" as const,
       priority: path === "" ? 1.0 : 0.8,
     }));

     try {
       const races = await getSchedule("current");
       const raceEntries: MetadataRoute.Sitemap = races.map((race) => ({
         url: `${BASE_URL}/race/${race.season}/${race.round}`,
         lastModified: new Date(race.date),
         changeFrequency: "weekly" as const,
         priority: 0.9,
       }));
       return [...staticEntries, ...raceEntries];
     } catch {
       return staticEntries;
     }
   }
   ```
   Snapshot-tier-backed, free.

2. **`robots.ts`**:
   ```ts
   import type { MetadataRoute } from "next";
   const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://f1-dashboard-lilac.vercel.app";

   export default function robots(): MetadataRoute.Robots {
     return {
       rules: [{ userAgent: "*", allow: "/", disallow: "/api/" }],
       sitemap: `${BASE_URL}/sitemap.xml`,
     };
   }
   ```
   Disallowing `/api/` is intentional — search engines crawling JSON
   endpoints is pure waste.

3. **`manifest.ts`**:
   ```ts
   import type { MetadataRoute } from "next";

   export default function manifest(): MetadataRoute.Manifest {
     return {
       name: "F1 Dashboard",
       short_name: "F1 Dash",
       description: "Live Formula 1 telemetry, standings, race results and analytics.",
       start_url: "/",
       display: "standalone",
       background_color: "#0a0a0a",
       theme_color: "#e10600",
       icons: [
         { src: "/icon.png", sizes: "192x192", type: "image/png" },
         { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
       ],
     };
   }
   ```
   If the listed icon sizes don't exist in `public/`, add them as a one-time
   asset export from the existing logo. Use the F1-red token (`#e10600`)
   from `globals.css` for `theme_color` for consistency.

4. **`icon.tsx`** (optional, only if `public/` has no app icon today):
   Next supports a TSX-generated icon — but if a static PNG/SVG works, use
   that for simplicity. Check `public/` for existing favicons before
   creating anything.

### Tests

- `npm test` — no test changes needed (these are Next file-convention exports).
- `npm run build` must succeed and the build output should list `/sitemap.xml`, `/robots.txt`, and `/manifest.webmanifest` as generated routes.

### Risks

- `getSchedule("current")` in `sitemap.ts` will hit the snapshot tier — if
  it's empty (fresh deploy before P7 snapshot lands), the catch falls back
  to static-only routes. That's fine.
- The icon sizes in `manifest.ts` must match files that actually exist in
  `public/` or browsers log a console warning on install. Double-check.

### Definition of Done

- `npm test` green; `npm run build` lists `/sitemap.xml`, `/robots.txt`, `/manifest.webmanifest` in routes.
- `curl -s <preview>/sitemap.xml | head -20` shows valid XML with race URLs.
- `curl -s <preview>/robots.txt` shows the sitemap pointer.
- `curl -s <preview>/manifest.webmanifest | jq .` parses to the manifest.
- `onboarding/12-deployment.md` documents the discoverability files.
- Commit: `feat(seo): sitemap, robots, manifest`.

---

## Phase 3 — Open Graph image (LOW)

**Goal:** social sharing previews render a branded card with the race name.
Depends on Phase 1's `metadataBase`.

### New files

- `src/app/opengraph-image.tsx` (root — 1200×630 branded card)
- `src/app/race/[year]/[round]/opengraph-image.tsx` (dynamic per-race card)
- `src/app/twitter-image.tsx` (Next auto-mirrors OG for Twitter; this file
  is optional — only add if Twitter-specific styling is desired. Skip in v1.)

### Modified files

- `onboarding/02-project-structure.md` (docs-as-you-go: OG-image convention)

### Step-by-step

1. **Root OG image.** Uses Next's `ImageResponse` (server-side, no extra
   deps). Tokens-only colors:
   ```tsx
   import { ImageResponse } from "next/og";

   export const runtime = "edge"; // ImageResponse is edge-only
   export const size = { width: 1200, height: 630 };
   export const contentType = "image/png";

   export default function OG() {
     return new ImageResponse(
       (
         <div style={{
           width: "100%", height: "100%",
           display: "flex", alignItems: "center", justifyContent: "center",
           background: "#0a0a0a",
           color: "#fafafa",
           fontSize: 96, fontWeight: 700, letterSpacing: -2,
         }}>
           <span style={{ color: "#e10600" }}>F1</span>&nbsp;Dashboard
         </div>
       ),
       size,
     );
   }
   ```
   Hex literals are permitted here — `ImageResponse` does not consume CSS
   variables; this is the documented exception per `AGENTS.md` (rendered to
   PNG at build time).

2. **Race-specific OG image.** Reuses the same getSchedule fetch as
   Phase 1:
   ```tsx
   import { ImageResponse } from "next/og";
   import { getSchedule } from "@/lib/api/jolpica";

   export const runtime = "edge";
   export const size = { width: 1200, height: 630 };
   export const contentType = "image/png";

   export default async function OG({
     params,
   }: { params: { year: string; round: string } }) {
     const races = await getSchedule(params.year).catch(() => []);
     const race = races.find((r) => r.round === params.round);
     const title = race ? `${params.year} ${race.raceName}` : "F1 Dashboard";
     const subtitle = race ? race.Circuit.circuitName : "Race not found";

     return new ImageResponse(
       (
         <div style={{
           width: "100%", height: "100%",
           display: "flex", flexDirection: "column",
           alignItems: "flex-start", justifyContent: "center",
           padding: "0 80px",
           background: "#0a0a0a", color: "#fafafa",
         }}>
           <div style={{ color: "#e10600", fontSize: 32, fontWeight: 700, marginBottom: 24 }}>
             F1 Dashboard
           </div>
           <div style={{ fontSize: 80, fontWeight: 700, letterSpacing: -2, lineHeight: 1.1 }}>
             {title}
           </div>
           <div style={{ fontSize: 36, color: "#9ca3af", marginTop: 16 }}>
             {subtitle}
           </div>
         </div>
       ),
       size,
     );
   }
   ```
   **Important:** `ImageResponse` requires `runtime = "edge"`. The fetch
   inside happens at edge, which means `getSchedule` runs through the live
   Jolpica path (no snapshot read), but only when a social bot crawls the
   URL — not a hot path. If that's still too much load, swap the body to a
   static "{year} F1 Race" fallback and call it a day.

### Tests

- `npm test` — `ImageResponse` isn't easily testable in jsdom; rely on the
  build step + manual verification.
- `npm run build` must succeed (Next will type-check the segment exports).

### Risks

- The `runtime = "edge"` requirement means this can't use `fs/promises`-based
  snapshot reads. The `try/catch` handles Jolpica failures.
- Without `metadataBase` set in Phase 1, the OG URL embedded by Next will be
  relative and many social validators reject it. Verify Phase 1 first.
- Font fallback: `ImageResponse` falls back to a default font if you don't
  embed one. The dashboard's Titillium Web isn't critical here — leaving
  the default is fine for an MVP.

### Definition of Done

- `npm run build` succeeds with both OG routes generated.
- Open `<preview>/opengraph-image` in a browser → a 1200×630 PNG.
- Open `<preview>/race/2026/<any round>/opengraph-image` → race-specific PNG.
- Run a URL through https://www.opengraph.xyz/ for a sanity check.
- `onboarding/02-project-structure.md` documents the OG convention.
- Commit: `feat(seo): branded Open Graph images (root + per-race)`.

---

## Phase 4 — Structured data (JSON-LD) (LOW)

**Goal:** race pages emit a `SportsEvent` payload so Google's rich results
can show the race in search with extra context. Free organic traffic.

### Modified files

- `src/app/race/[year]/[round]/page.tsx`
- `src/app/layout.tsx` (Organization JSON-LD)
- `onboarding/07-api-routes.md` (docs-as-you-go: JSON-LD convention)

### Step-by-step

1. **Organization JSON-LD in root layout.** One-time at the bottom of the
   `<body>`:
   ```tsx
   <script
     type="application/ld+json"
     // eslint-disable-next-line react/no-danger
     dangerouslySetInnerHTML={{
       __html: JSON.stringify({
         "@context": "https://schema.org",
         "@type": "Organization",
         name: "F1 Dashboard",
         url: "https://f1-dashboard-lilac.vercel.app",
       }),
     }}
   />
   ```

2. **SportsEvent + BreadcrumbList on race detail.** Inside the race detail
   page's server component, after fetching the race:
   ```tsx
   const ld = race && {
     "@context": "https://schema.org",
     "@graph": [
       {
         "@type": "SportsEvent",
         name: `${year} ${race.raceName}`,
         startDate: race.date,
         sport: "Formula 1",
         location: {
           "@type": "Place",
           name: race.Circuit.circuitName,
           address: {
             "@type": "PostalAddress",
             addressCountry: race.Circuit.Location.country,
             addressLocality: race.Circuit.Location.locality,
           },
         },
         organizer: { "@type": "Organization", name: "Formula 1" },
         eventStatus: "https://schema.org/EventScheduled",
       },
       {
         "@type": "BreadcrumbList",
         itemListElement: [
           { "@type": "ListItem", position: 1, name: "Home", item: BASE_URL },
           { "@type": "ListItem", position: 2, name: "Schedule", item: `${BASE_URL}/schedule` },
           { "@type": "ListItem", position: 3, name: `${year} ${race.raceName}` },
         ],
       },
     ],
   };

   return (
     <>
       {ld && (
         <script
           type="application/ld+json"
           // eslint-disable-next-line react/no-danger
           dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }}
         />
       )}
       {/* …existing page content… */}
     </>
   );
   ```
   `dangerouslySetInnerHTML` is the documented React idiom for this; the
   payload is hand-built so there's no actual injection risk. If results are
   available, optionally extend with `competitor` entries for the top 3.

### Tests

- `npm test` — add a test asserting the rendered HTML contains the expected
  `@type` strings. The existing race-detail page test setup is the easiest
  hook.
- Validate via Google's Rich Results Test (https://search.google.com/test/rich-results)
  against a preview URL once deployed — record the result in the PR.

### Risks

- Race fields come from Jolpica via the snapshot tier; no user input lands
  in the JSON-LD payload, so escaping is moot. But never lower this guard —
  if a future feature accepts user-supplied race names, sanitize them via
  the existing validators.
- ESLint may flag `dangerouslySetInnerHTML`; the disable comment above is
  the documented exception for JSON-LD.

### Definition of Done

- `npm test` green.
- View-source of a preview race page contains `application/ld+json` and the
  payload parses (`curl -s … | grep -A1 ld+json | tail -1 | jq .`).
- Google Rich Results Test reports "Eligible" (record screenshot in commit).
- `onboarding/07-api-routes.md` documents JSON-LD as a convention.
- Commit: `feat(seo): SportsEvent + BreadcrumbList + Organization JSON-LD`.

---

## Phase 5 — CI hardening + observability (LOW-MED)

**Goal:** prevent regressions automatically. Type errors, bundle bloat, and
stuck snapshots become PR failures or smoke alerts, not silent decay.

### New files

- `tools/bundle-budget.json`
- `tools/check-bundle-budget.mjs`
- `.github/dependabot.yml`

### Modified files

- `.github/workflows/test.yml` (add `type-check` and `check-bundle-budget` steps)
- `tools/smoke-api.mjs` (snapshot freshness assertion)
- `src/test/fixtures.ts` (add `makeRace`/`makeQualifyingResult` helpers as needed)
- The ~6 test files producing TS2740 errors (mostly `form.test.ts`, `headToHead.test.ts`)
- `src/app/layout.tsx` (one-line `<SpeedInsights />`)
- `package.json` (`@vercel/speed-insights` dep)
- `onboarding/11-testing.md`, `12-deployment.md` (docs-as-you-go)

### Step-by-step

1. **Fix the 60 `tsc` errors first.** They're all TS2740 ("type missing
   required properties") — test mocks cherry-picking fields off `Race` /
   `Driver` / `Constructor`. Two-step fix:
   - Extend `src/test/fixtures.ts` with the missing helpers:
     ```ts
     export function makeRace(overrides: Partial<Race> = {}): Race {
       return {
         season: "2026", round: "1",
         url: "", raceName: "Test GP",
         Circuit: {
           circuitId: "test", url: "", circuitName: "Test Circuit",
           Location: { lat: "0", long: "0", locality: "Test", country: "Test" },
         },
         date: "2026-01-01",
         ...overrides,
       };
     }
     ```
   - Sweep `form.test.ts`, `headToHead.test.ts`, etc. — replace inline
     `as Race` casts with `makeRace({ /* only the fields the test cares
     about */ })`. Use `npx tsc --noEmit` after each file to track progress
     down from 60 → 0. Each fix is a tiny isolated commit.

2. **Add `type-check` to CI.** In `.github/workflows/test.yml`, after the
   `Lint` step:
   ```yaml
   - name: Type-check
     run: npm run type-check
   ```

3. **Bundle-size budget.** New `tools/bundle-budget.json` (the values are
   placeholders — replace with the actual sizes from your baseline build):
   ```json
   {
     "_comment": "First-load JS size budget in bytes (gzip). Bump intentionally with a comment in the same PR.",
     "_baseline_recorded": "YYYY-MM-DD",
     "routes": {
       "/": 200000,
       "/standings": 220000,
       "/race/[year]/[round]": 300000
     },
     "tolerance_pct": 10
   }
   ```
   New `tools/check-bundle-budget.mjs`:
   ```js
   #!/usr/bin/env node
   import { readFile } from "node:fs/promises";

   const budget = JSON.parse(await readFile("tools/bundle-budget.json", "utf8"));
   // Parse .next/build-manifest.json or .next/app-build-manifest.json.
   // Compare per-route gzip size to budget. Fail if any exceeds budget * (1 + tolerance/100).
   // Implementation detail: Next 16 lists chunks under app/<route>/page.
   // See https://nextjs.org/docs (file structure may shift across versions).
   ```
   And a step in `test.yml`:
   ```yaml
   - name: Bundle size budget
     run: node tools/check-bundle-budget.mjs
   ```
   When a PR legitimately grows a route, the engineer bumps the JSON in the
   same PR — forces a conversation.

4. **Dependabot.** New `.github/dependabot.yml`:
   ```yaml
   version: 2
   updates:
     - package-ecosystem: "npm"
       directory: "/"
       schedule:
         interval: "weekly"
         day: "monday"
       groups:
         minor-and-patch:
           update-types: ["minor", "patch"]
       open-pull-requests-limit: 5
     - package-ecosystem: "github-actions"
       directory: "/"
       schedule:
         interval: "monthly"
   ```

5. **Snapshot freshness in smoke.** Append to `tools/smoke-api.mjs`'s
   checks array:
   ```js
   {
     name: "standings snapshot freshness",
     run: async () => {
       const payload = await fetchJson("/api/standings?season=current");
       if (!payload.snapshotAt) return; // live response, not from snapshot — skip
       const ageHours = (Date.now() - new Date(payload.snapshotAt).getTime()) / 3.6e6;
       assert(ageHours < 48, `snapshotAt is ${ageHours.toFixed(1)}h stale (max 48)`);
     },
   },
   ```
   Production-smoke runs every 30 min; a 48h+ stale snapshot turns the
   workflow red → GitHub email/notify.

6. **Web Vitals — `@vercel/speed-insights`.** Free tier, one line:
   ```bash
   npm install @vercel/speed-insights
   ```
   In `src/app/layout.tsx`:
   ```tsx
   import { SpeedInsights } from "@vercel/speed-insights/next";
   // …inside <body>…
   {children}
   <SpeedInsights />
   ```
   Zero config. Surfaces LCP/CLS/INP in Vercel dashboard.

### Tests

- `npm test` green (unaffected unless the fixture refactor changes a
  test's behavior — keep semantics identical).
- `npm run type-check` exits 0.
- `node tools/check-bundle-budget.mjs` (after a successful `npm run build`)
  exits 0.

### Risks

- Bumping the bundle budget is a habit easy to abuse — keep the
  `_comment` field firm: "Bump intentionally with a comment".
- `@vercel/speed-insights` only reports when deployed on Vercel; local dev
  is a no-op. Don't worry if you don't see numbers locally.

### Definition of Done

- `npm run type-check` exits 0; CI has the step.
- `tools/bundle-budget.json` and `check-bundle-budget.mjs` committed; CI
  has the step.
- `tools/smoke-api.mjs` includes the snapshot-freshness check.
- `.github/dependabot.yml` committed.
- `@vercel/speed-insights` installed and rendered in layout.
- `onboarding/11-testing.md` (type-check, budget) and `12-deployment.md`
  (Speed Insights) updated.
- Commit per logical unit: one for the type-fix sweep, one for CI hardening, one for observability.

---

## Phase 6 — A11y polish + UX edge cases (LOW)

**Goal:** invisible-but-real improvements to screen-reader UX and edge-case
error pages.

### New files

- `src/app/global-error.tsx`
- `src/app/not-found.tsx`

### Modified files

- `src/app/layout.tsx` (skip-to-content link)
- The ~6 loading/data-swap containers: `src/components/standings/StandingsTables.tsx`, `src/components/drivers/DriverDetailPanel.tsx`, `src/components/race/RaceDetailClient.tsx`, etc. (add `aria-live="polite"` + `aria-busy={isLoading}`)
- `onboarding/10-components-theming.md` (docs-as-you-go: a11y rules)

### Step-by-step

1. **`global-error.tsx`** — catches root-layout crashes:
   ```tsx
   "use client";
   export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
     return (
       <html lang="en">
         <body className="bg-background text-foreground">
           <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
             <h2 className="text-xl font-semibold">Something went wrong at the top level</h2>
             <p className="text-sm text-muted-foreground max-w-sm">{error.message ?? "Reload the page."}</p>
             <button
               onClick={reset}
               className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
             >
               Try again
             </button>
           </div>
         </body>
       </html>
     );
   }
   ```
   Must render its own `<html>`/`<body>` since the root layout is what
   crashed. Tokens only.

2. **`not-found.tsx`** — polished 404:
   ```tsx
   import Link from "next/link";

   export default function NotFound() {
     return (
       <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-4 text-center">
         <h1 className="text-2xl font-semibold">404 · Page not found</h1>
         <p className="text-sm text-muted-foreground">That page doesn't exist or has moved.</p>
         <Link href="/schedule" className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
           Back to the schedule
         </Link>
       </div>
     );
   }
   ```

3. **Skip-to-content link** in `layout.tsx`, as the first focusable element
   inside `<body>`:
   ```tsx
   <a
     href="#main-content"
     className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
   >
     Skip to main content
   </a>
   ```
   And add `id="main-content"` to the `<main>` element somewhere in the
   layout (or in the route group wrapper if `<main>` lives there).

4. **`aria-live` regions.** For each component that swaps between a
   Skeleton and real data, wrap the data container with:
   ```tsx
   <div aria-live="polite" aria-busy={isLoading}>
     {isLoading ? <Skeleton /> : <RealContent />}
   </div>
   ```
   Targets (verified count: ~6):
   - `StandingsTables.tsx`
   - `DriverDetailPanel.tsx`
   - `RaceDetailClient.tsx`'s tab panels
   - `DriversCompareTab.tsx`, `TeamsCompareTab.tsx`
   - `TelemetryPanel.tsx`
   Don't change loading logic — only wrap.

5. **`<h1>` audit.** `grep -rn "<h1" src/app src/components --include="*.tsx"`
   — 9 hits. Verify each page renders exactly one `<h1>` at the top of its
   visual hierarchy. Most likely already fine; document the rule in
   `onboarding/10`.

### Tests

- `npm test` — new jsdom tests assert that
  `<GlobalError>` and `<NotFound>` render their CTAs; existing component
  tests are unaffected.
- Manual: tab into the page from the address bar — the skip link should
  appear in the top-left corner on first focus.
- VoiceOver (macOS) or NVDA (Windows): navigate to `/standings` and
  confirm loading-state changes are announced ("loading", then the data).

### Risks

- `global-error.tsx` is a client component and renders its own `<html>` —
  don't import any provider from the root layout there (no QueryClient, no
  ThemeProvider). Keep it minimal.
- `aria-live="polite"` regions that update too frequently are noisy — only
  wrap stable loading-to-data transitions, not real-time tickers.

### Definition of Done

- `npm test` green.
- Manual: tab from URL bar shows the skip link.
- Manual: visit `/not-a-real-page` shows the polished 404 with the schedule CTA.
- Force a render crash in `error.tsx` (e.g. throw in `useEffect`) → `global-error.tsx` renders. Remove the test throw before committing.
- `grep -c "aria-live=\"polite\"" src/components/standings/StandingsTables.tsx src/components/drivers/DriverDetailPanel.tsx src/components/race/RaceDetailClient.tsx` returns nonzero on each.
- `onboarding/10-components-theming.md` documents the rule: one h1 per page; aria-live on loading containers; skip link in the root layout.
- Commit per file group (3–4 commits): error pages, skip link, aria-live sweep.

---

## Final verification (before opening a PR)

1. `npm run lint` — no new errors.
2. `npm test` — green; test count ≥ baseline plus the small additions.
3. `npm run type-check` — exits 0 (Phase 5 fixed the existing 60).
4. `npm run build` — succeeds; sitemap/robots/manifest in route list.
5. `node tools/check-bundle-budget.mjs` — exits 0.
6. **Manual** on a preview URL:
   - View-source of `/race/<year>/<round>`: title is race-specific; `application/ld+json` script present; OG meta points at the race-specific OG image.
   - `/sitemap.xml`, `/robots.txt`, `/manifest.webmanifest` all return 200 with valid content.
   - Tab from URL bar reveals the skip link.
   - `/not-a-real-page` shows the polished 404.
   - VoiceOver/NVDA: standings loading state announced.

## Risks & unknowns — verify during work, do not assume

| # | Risk | Mitigation |
|---|---|---|
| 1 | Missing `metadataBase` makes OG images break | Phase 1 step 1 — verify with the OG validator before P3 |
| 2 | Icon files referenced by `manifest.ts` don't exist | Phase 2 step 3 — `ls public/` first |
| 3 | `ImageResponse` requires edge runtime; can't use `fs` snapshot reads | Phase 3 — the live Jolpica fallback in `try/catch` handles it; volume is bot-crawl only |
| 4 | JSON-LD payload contains stray user input → injection | Currently no user input lands there; flag in code review of any future feature |
| 5 | Bundle budget too permissive or too tight | Set the baseline from a fresh `npm run build` you trust; bump deliberately |
| 6 | `global-error.tsx` accidentally pulling client providers | Keep it minimal; no `QueryClient`/`ThemeProvider` imports |

## Out of scope (do not do in this enhancement set)

- **Paid services** (Sentry, Datadog, third-party analytics). `@vercel/speed-insights` free tier is the only addition.
- **Auth** — still no users to authenticate.
- **A full PWA install flow** beyond the manifest (no service worker).
- **Image preloading for above-the-fold LCP** — PR #10's Phase 1 covers it.
- **Splitting `RaceDetailClient` further** — PR #9's Phase 5 targets it.
- **Removing or restoring the `weekend` route** — product decision.
