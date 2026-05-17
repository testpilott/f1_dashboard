# Security

> **TL;DR** — All external API calls are server-side only. The browser never contacts
> a third-party host directly. Same-origin `/api/*` routes are rate-limited and
> input-validated before any data is fetched or returned.

## Threat model

| Threat | Mitigation |
|---|---|
| Prompt/path injection via query params | `src/lib/validators.ts` regex/set guards on every routed param before use |
| Uncontrolled resource consumption (downstream API abuse) | `rateLimited()` in-process token-bucket on every `/api/*` route |
| Hung upstream stalling SSR | `fetchWithTimeout` (AbortController, 8 s) wraps jolpica/openf1/openmeteo |
| Browser XSS via external resources | Content-Security-Policy `connect-src 'self'` — only our own `/api/*` routes callable from the client |
| Open redirect / SSRF | No user-controlled URLs; all API endpoints are hard-coded in `src/lib/api/*` |
| Supply-chain | Free/keyless data sources only; no secrets in the repo |

## Rate limiting

`rateLimited(req, routeKey)` — `src/lib/api/withRateLimit.ts` — is the **first** call
in every `src/app/api/*/route.ts`. It uses an in-process token-bucket (sliding window)
keyed on the caller's IP.

**Single-process limitation:** in-process state is reset on each serverless function cold
start and is not shared between replicas. If the app is deployed to a multi-replica
environment, replace the in-process store with a shared backend (Redis, Upstash, etc.)
before going to production. For the current single-process / single-instance deployment
(local dev, Vercel hobby), this provides adequate protection against casual abuse.

## Input validation

Every query parameter accepted by an API route is validated against an explicit allowlist
or regex in `src/lib/validators.ts` before use:

| Validator | Type | Used by |
|---|---|---|
| `VALID_SEASON` | `RegExp` — `/^\d{4}$/` | `/api/results`, `/api/schedule`, `/api/standings` |
| `VALID_ROUND` | `RegExp` — `/^\d{1,2}$/` | `/api/results`, `/api/sessions` |
| `VALID_SESSION` | `Set<string>` | `/api/sessions`, `/api/weather` |
| `VALID_VIEW` | `Set<string>` — `{ "next", "last" }` | `/api/schedule` |

Any param that fails validation returns HTTP 400 immediately. No downstream fetch is
made. Tests for valid/invalid/injection cases live in
`src/app/api/__tests__/validation.test.ts`.

## Content-Security-Policy

`next.config.ts` sets a `Content-Security-Policy` response header via
`headers()`. Key directives:

- `default-src 'self'` — baseline allowlist
- `connect-src 'self'` — client JS may only call same-origin routes
- `img-src 'self' data:` — only local images (the Wikimedia logo CDN was removed in
  Phase 2 when the logo was made local)
- `script-src 'self' 'unsafe-inline' 'unsafe-eval'` — required for Next.js HMR in dev;
  tighten with a nonce-based policy for a production hardening pass
- `style-src 'self' 'unsafe-inline'` — required for Tailwind's runtime style injection

`images.remotePatterns` in `next.config.ts` mirrors `img-src` — only hosts listed there
are processed by `next/image`. Currently empty (all images are local).

## Dependency hygiene

- No paid APIs or API keys; no secrets stored in the repo or environment.
- `d3` and `recharts` removed (Phase 4); only `@nivo/*` remains for charting.
- `npm install --no-audit` is used in the SessionStart hook only for speed; run
  `npm audit` periodically and address `high`/`critical` findings.

## Known gaps / future hardening

- **Rate-limit persistence:** move to a shared store (Redis/Upstash) before multi-replica
  deployment.
- **CSP nonce:** replace `unsafe-inline`/`unsafe-eval` in script-src with a per-request
  nonce for stricter XSS protection.
- **Subresource integrity:** if any external CDN scripts are added in the future, pin
  their SRI hash.
- **Schema validation:** current boundary guards are hand-written `Array.isArray` /
  nullish patterns. A lightweight schema library (e.g. valibot) could strengthen the
  external-API response contract without significant bundle cost.
