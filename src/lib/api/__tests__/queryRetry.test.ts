import { describe, expect, it } from "vitest";
import { clientQueryRetry, isRetryableClientError } from "@/lib/api/queryRetry";

/** Error shape thrown by fetchJson: "Request failed: <status> <url>". */
const httpError = (status: number) => new Error(`Request failed: ${status} /api/x`);

describe("isRetryableClientError", () => {
  it("does NOT retry 429 — a rate-limited client must stop, not triple its traffic", () => {
    expect(isRetryableClientError(httpError(429))).toBe(false);
  });

  it("does NOT retry permanent 4xx (400, 401, 403, 404)", () => {
    for (const status of [400, 401, 403, 404]) {
      expect(isRetryableClientError(httpError(status))).toBe(false);
    }
  });

  it("retries 408 request-timeout", () => {
    expect(isRetryableClientError(httpError(408))).toBe(true);
  });

  it("retries 5xx server errors", () => {
    for (const status of [500, 502, 503, 504]) {
      expect(isRetryableClientError(httpError(status))).toBe(true);
    }
  });

  it("retries network-level failures (no status in message)", () => {
    expect(isRetryableClientError(new TypeError("Failed to fetch"))).toBe(true);
  });

  it("retries malformed-JSON SyntaxErrors (likely truncated response)", () => {
    expect(isRetryableClientError(new SyntaxError("Unexpected token < in JSON"))).toBe(true);
  });

  it("retries non-Error throwables", () => {
    expect(isRetryableClientError("boom")).toBe(true);
  });
});

describe("clientQueryRetry", () => {
  it("allows up to 2 retries for retryable errors", () => {
    expect(clientQueryRetry(0, httpError(500))).toBe(true);
    expect(clientQueryRetry(1, httpError(500))).toBe(true);
    expect(clientQueryRetry(2, httpError(500))).toBe(false);
  });

  it("never retries 429 regardless of failure count", () => {
    expect(clientQueryRetry(0, httpError(429))).toBe(false);
  });
});
