#!/usr/bin/env node

const baseUrl = (process.env.SMOKE_BASE_URL ?? "http://127.0.0.1:3000").replace(/\/$/, "");
const maxAttempts = Number(process.env.SMOKE_RETRIES ?? 3);
const retryDelayMs = Number(process.env.SMOKE_RETRY_DELAY_MS ?? 1000);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function isNonNegativeNumberOrNull(value) {
  return value === null || (Number.isFinite(value) && value >= 0);
}

function isObject(value) {
  return value !== null && typeof value === "object";
}

function readSource(payload) {
  if (!isObject(payload) || !("source" in payload)) return null;
  return typeof payload.source === "string" ? payload.source : null;
}

// Snapshot freshness: when a payload claims source="jolpica" (i.e. it came from
// the committed data/snapshots/*.json files), the snapshotAt must be recent.
// A stuck snapshot-daily workflow would silently serve >48h-old data; this
// check turns the smoke red so GitHub notifies.
const SNAPSHOT_MAX_AGE_HOURS = Number(process.env.SMOKE_SNAPSHOT_MAX_AGE_HOURS ?? 48);

function readSnapshotAgeHours(payload) {
  if (!isObject(payload) || typeof payload.snapshotAt !== "string") return null;
  const ts = Date.parse(payload.snapshotAt);
  if (!Number.isFinite(ts)) return null;
  return (Date.now() - ts) / 3.6e6;
}

async function fetchJson(path) {
  const url = `${baseUrl}${path}`;
  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { "Accept": "application/json" },
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`HTTP ${res.status} for ${path}: ${text.slice(0, 300)}`);
      }

      return await res.json();
    } catch (err) {
      lastError = err;
      if (attempt < maxAttempts) await sleep(retryDelayMs);
    }
  }

  throw lastError ?? new Error(`Unknown request failure for ${path}`);
}

function validateCareerPayload(driverId, payload) {
  assert(payload && typeof payload === "object", `${driverId}: payload must be an object`);
  assert(payload.driverId === driverId, `${driverId}: driverId mismatch`);
  assert(payload.career && typeof payload.career === "object", `${driverId}: missing career object`);

  const { wins, podiums, starts, fastestLaps, championships } = payload.career;
  assert(isNonNegativeNumberOrNull(wins), `${driverId}: wins must be non-negative number or null`);
  assert(isNonNegativeNumberOrNull(podiums), `${driverId}: podiums must be non-negative number or null`);
  assert(isNonNegativeNumberOrNull(starts), `${driverId}: starts must be non-negative number or null`);
  assert(isNonNegativeNumberOrNull(fastestLaps), `${driverId}: fastestLaps must be non-negative number or null`);
  assert(
    isNonNegativeNumberOrNull(championships),
    `${driverId}: championships must be non-negative number or null`,
  );

  // Guard against regressions on known champions.
  if (driverId === "hamilton") {
    assert(championships !== null, "hamilton: championships unexpectedly null");
    assert(championships >= 5, `hamilton: championships suspiciously low (${championships})`);
  }
  if (driverId === "max_verstappen") {
    assert(championships !== null, "max_verstappen: championships unexpectedly null");
    assert(championships >= 4, `max_verstappen: championships suspiciously low (${championships})`);
  }
}

async function run() {
  const defaultSoftLatencyMs = Number(process.env.SMOKE_MAX_LATENCY_MS ?? 1500);
  const hardLatencyMs = Number(process.env.SMOKE_HARD_MAX_LATENCY_MS ?? 8000);

  const checks = [
    {
      name: "driver-career hamilton",
      maxLatencyMs: defaultSoftLatencyMs,
      expectSnapshot: true,
      run: async () => {
        const payload = await fetchJson("/api/driver-career?driverId=hamilton");
        validateCareerPayload("hamilton", payload);
        return payload;
      },
    },
    {
      name: "driver-career piastri",
      maxLatencyMs: defaultSoftLatencyMs,
      expectSnapshot: true,
      run: async () => {
        const payload = await fetchJson("/api/driver-career?driverId=piastri");
        validateCareerPayload("piastri", payload);
        return payload;
      },
    },
    {
      name: "driver-career max_verstappen",
      maxLatencyMs: defaultSoftLatencyMs,
      expectSnapshot: true,
      run: async () => {
        const payload = await fetchJson("/api/driver-career?driverId=max_verstappen");
        validateCareerPayload("max_verstappen", payload);
        return payload;
      },
    },
    {
      name: "standings current",
      maxLatencyMs: defaultSoftLatencyMs,
      expectSnapshot: true,
      run: async () => {
        const payload = await fetchJson("/api/standings?season=current");
        assert(Array.isArray(payload.drivers), "standings: drivers must be array");
        assert(Array.isArray(payload.constructors), "standings: constructors must be array");
        return payload;
      },
    },
  ];

  const failures = [];
  const warnings = [];

  for (const check of checks) {
    const start = Date.now();
    try {
      const payload = await check.run();
      const latencyMs = Date.now() - start;
      if (latencyMs > hardLatencyMs) {
        throw new Error(`latency ${latencyMs}ms exceeded hard limit of ${hardLatencyMs}ms`);
      }

      if (check.expectSnapshot) {
        const source = readSource(payload);
        if (source === null) {
          throw new Error("response missing required string source field");
        }

        const allowedSources = new Set(["live", "jolpica", "snapshot", "degraded-live"]);
        if (!allowedSources.has(source)) {
          throw new Error(`response source has unexpected value: ${source}`);
        }

        if (source === "live" || source === "degraded-live") {
          warnings.push(`${check.name}: response source=${source} (possible snapshot miss)`);
          console.warn(`WARN ${check.name}: response source=${source} (possible snapshot miss)`);
        }

        if (source === "jolpica") {
          const ageHours = readSnapshotAgeHours(payload);
          if (ageHours !== null && ageHours > SNAPSHOT_MAX_AGE_HOURS) {
            throw new Error(
              `snapshot is ${ageHours.toFixed(1)}h stale (max ${SNAPSHOT_MAX_AGE_HOURS}h) — snapshot-daily workflow may be stuck`,
            );
          }
        }
      }

      const softLimitMs = Number(check.maxLatencyMs ?? defaultSoftLatencyMs);
      if (latencyMs > softLimitMs) {
        warnings.push(`${check.name}: latency ${latencyMs}ms exceeded target ${softLimitMs}ms`);
        console.warn(`WARN ${check.name}: latency ${latencyMs}ms exceeded target ${softLimitMs}ms`);
      } else {
        console.log(`PASS ${check.name} (${latencyMs}ms)`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      failures.push(`${check.name}: ${message}`);
      console.error(`FAIL ${check.name}: ${message}`);
    }
  }

  if (failures.length > 0) {
    console.error(`\nSmoke checks failed (${failures.length}):`);
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
  }

  if (warnings.length > 0) {
    console.warn(`\nSmoke checks completed with latency warnings (${warnings.length}):`);
    for (const warning of warnings) console.warn(`- ${warning}`);
  }

  console.log("\nAll smoke checks passed.");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
