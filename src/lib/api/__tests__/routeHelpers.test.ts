import { afterEach, describe, expect, it, vi } from "vitest";
import { badRequest, serverError } from "@/lib/api/routeHelpers";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("routeHelpers", () => {
  it("badRequest returns status 400 with the provided error message", async () => {
    const res = badRequest("Invalid season parameter");
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ error: "Invalid season parameter" });
  });

  it("serverError logs route label and returns status 500 payload", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const err = new Error("boom");

    const res = serverError("standings", err);
    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toEqual({ error: "Internal server error" });
    expect(spy).toHaveBeenCalledWith("[/api/standings] Error:", err);
  });
});