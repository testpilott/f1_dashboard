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
  const MAX_LATENCY_MS = Number(process.env.SMOKE_MAX_LATENCY_MS ?? 500);

  const checks = [
    {
      name: "driver-career hamilton",
      run: async () => {
        const payload = await fetchJson("/api/driver-career?driverId=hamilton");
        validateCareerPayload("hamilton", payload);
      },
    },
    {
      name: "driver-career piastri",
      run: async () => {
        const payload = await fetchJson("/api/driver-career?driverId=piastri");
        validateCareerPayload("piastri", payload);
      },
    },
    {
      name: "driver-career max_verstappen",
      run: async () => {
        const payload = await fetchJson("/api/driver-career?driverId=max_verstappen");
        validateCareerPayload("max_verstappen", payload);
      },
    },
    {
      name: "standings current",
      run: async () => {
        const payload = await fetchJson("/api/standings?season=current");
        assert(Array.isArray(payload.drivers), "standings: drivers must be array");
        assert(Array.isArray(payload.constructors), "standings: constructors must be array");
      },
    },
  ];

  const failures = [];

  for (const check of checks) {
    const start = Date.now();
    try {
      await check.run();
      const latencyMs = Date.now() - start;
      if (latencyMs > MAX_LATENCY_MS) {
        throw new Error(`latency ${latencyMs}ms exceeded limit of ${MAX_LATENCY_MS}ms`);
      }
      console.log(`PASS ${check.name} (${latencyMs}ms)`);
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

  console.log("\nAll smoke checks passed.");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
