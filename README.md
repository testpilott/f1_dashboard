# F1 Dashboard

A real-time Formula 1 dashboard built with Next.js 16, React 19, and TypeScript. Displays live standings, race schedule, driver comparisons, championship projections, and race telemetry.

## Features

- **Live standings** — Driver and constructor championship tables
- **Race schedule** — Full season calendar with upcoming and past races
- **Race detail** — Qualifying, race, and sprint results with lap-time charts and tyre strategy
- **Driver comparison** — Head-to-head season stats and per-circuit history
- **Championship projections** — Monte Carlo simulation (10 000 runs) with P10/P50/P90 point bands
- **News feed** — Aggregated F1 news from multiple RSS sources
- **Race weekend** — Live session results for any meeting

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, React 19) |
| Language | TypeScript |
| Styling | Tailwind v4 + shadcn/ui, OKLCH design tokens |
| Charts | Nivo (`@nivo/line`, `@nivo/bar`) |
| Server state | React Query v5 |
| Data | Jolpica/Ergast, OpenF1, Open-Meteo |
| Testing | Vitest 2.x (172 tests) |

## Getting Started

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # run test suite
npm run build      # production build
```

## Architecture

All external API calls are server-side and proxied through `/api/*` routes. Client components use `@tanstack/react-query` with server-provided `initialData` to avoid loading spinners on first paint.

Design tokens are defined once in `src/app/globals.css` using OKLCH and consumed via Tailwind utility classes. Charts read CSS variables at runtime via `nivoTheme()` / `chartColors()` in `src/lib/charts/theme.ts`.

Rate limiting is applied to every `/api/*` route via `rateLimited()` from `src/lib/api/withRateLimit.ts`. All user-supplied query parameters are validated against allowlists in `src/lib/validators.ts`.

## Security

- All `/api/*` routes are rate-limited (in-memory sliding window)
- Query parameters validated against strict regex/Set allowlists
- CSP headers: `default-src 'self'`, `connect-src 'self'`, `img-src 'self' data: blob: https://media.formula1.com`
- `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, HSTS enabled
- No external image sources beyond official F1 CDN


This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
