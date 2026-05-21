import { describe, expect, it, vi } from "vitest";

import { isRetryable, withRetry } from "@/lib/api/retry";

describe("isRetryable", () => {
  it("retries AbortError (DOMException)", () => {
    expect(isRetryable(new DOMException("aborted", "AbortError"))).toBe(true);
  });

  it("retries AbortError (plain Error with name)", () => {
    const err = new Error("aborted");
    err.name = "AbortError";
    expect(isRetryable(err)).toBe(true);
  });

  it.each([408, 425, 429, 500, 502, 503, 504, 599])(
    "retries transient HTTP %i",
    (status) => {
      expect(isRetryable(new Error(`Request failed: ${status}`))).toBe(true);
      expect(isRetryable(new Error(`Service fetch failed: ${status} /x`))).toBe(true);
    }
  );

  it.each([400, 401, 403, 404, 410, 422])(
    "does not retry permanent HTTP %i",
    (status) => {
      expect(isRetryable(new Error(`Request failed: ${status}`))).toBe(false);
    }
  );

  it("retries network-level failures", () => {
    expect(isRetryable(new Error("fetch failed"))).toBe(true);
    expect(isRetryable(new Error("ECONNRESET"))).toBe(true);
    expect(isRetryable(new Error("socket hang up"))).toBe(true);
  });

  it("does not retry arbitrary application errors", () => {
    expect(isRetryable(new Error("invalid response shape"))).toBe(false);
  });

  it("does not retry non-Error values", () => {
    expect(isRetryable("string error")).toBe(false);
    expect(isRetryable(null)).toBe(false);
    expect(isRetryable(undefined)).toBe(false);
  });
});

describe("withRetry", () => {
  it("returns the value on first success without retrying", async () => {
    const fn = vi.fn().mockResolvedValue("ok");
    await expect(withRetry(fn)).resolves.toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries transient failures and eventually succeeds", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error("Request failed: 429"))
      .mockRejectedValueOnce(new Error("Request failed: 503"))
      .mockResolvedValueOnce("ok");

    await expect(withRetry(fn)).resolves.toBe("ok");
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("stops after 3 attempts when failures persist", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("Request failed: 500"));
    await expect(withRetry(fn)).rejects.toThrow(/500/);
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("does not retry permanent failures", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("Request failed: 404"));
    await expect(withRetry(fn)).rejects.toThrow(/404/);
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
