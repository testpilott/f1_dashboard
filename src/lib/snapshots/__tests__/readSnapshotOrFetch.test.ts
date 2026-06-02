import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({
  unstable_cache: (fn: (...args: unknown[]) => unknown) => fn,
}));

const { mockReadSnapshot } = vi.hoisted(() => ({
  mockReadSnapshot: vi.fn(),
}));

vi.mock("@/lib/snapshots/readSnapshot", () => ({
  readSnapshot: mockReadSnapshot,
}));

import { readSnapshotOrFetch } from "@/lib/snapshots/readSnapshotOrFetch";

describe("readSnapshotOrFetch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns snapshot when present without calling live fn", async () => {
    const snapshot = { drivers: [], constructors: [], snapshotAt: "2026-06-01T05:00:00Z", source: "jolpica" };
    mockReadSnapshot.mockResolvedValue(snapshot);
    const liveFn = vi.fn();

    const result = await readSnapshotOrFetch({
      key: "standings-current",
      liveFn,
      dataClass: "standings",
    });

    expect(result).toEqual(snapshot);
    expect(liveFn).not.toHaveBeenCalled();
  });

  it("calls live fn and returns live result when snapshot is absent", async () => {
    mockReadSnapshot.mockResolvedValue(null);
    const liveData = { drivers: [{ position: "1" }], constructors: [], source: "live" };
    const liveFn = vi.fn().mockResolvedValue(liveData);

    const result = await readSnapshotOrFetch({
      key: "standings-current",
      liveFn,
      dataClass: "standings",
    });

    expect(liveFn).toHaveBeenCalledOnce();
    expect(result).toEqual(liveData);
  });

  it("logs [snapshot-miss] when cold tier is empty and live fn is used", async () => {
    mockReadSnapshot.mockResolvedValue(null);
    const liveFn = vi.fn().mockResolvedValue({ source: "live" });
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await readSnapshotOrFetch({ key: "standings-current", liveFn, dataClass: "standings" });

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("[snapshot-miss] standings-current"),
    );
    consoleSpy.mockRestore();
  });

  it("returns stale snapshot when snapshot absent and live fn throws", async () => {
    // First read: null (miss). Second read after live failure: stale snapshot.
    const staleSnapshot = { drivers: [], constructors: [], snapshotAt: "stale", source: "jolpica" };
    mockReadSnapshot
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(staleSnapshot);

    const liveFn = vi.fn().mockRejectedValue(new Error("Jolpica 429"));
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "log").mockImplementation(() => {});

    const result = await readSnapshotOrFetch({
      key: "standings-current",
      liveFn,
      dataClass: "standings",
    });

    expect(result).toEqual(staleSnapshot);
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("[snapshot-fallback]"));
    warnSpy.mockRestore();
  });

  it("rethrows when both cold tier and live fn fail", async () => {
    mockReadSnapshot.mockResolvedValue(null); // both reads return null
    const liveFn = vi.fn().mockRejectedValue(new Error("upstream down"));
    vi.spyOn(console, "log").mockImplementation(() => {});

    await expect(
      readSnapshotOrFetch({ key: "standings-current", liveFn, dataClass: "standings" }),
    ).rejects.toThrow("upstream down");
  });

  it("does not call live fn when snapshot present even if live would throw", async () => {
    const snapshot = { races: [], snapshotAt: "2026-06-01T05:00:00Z", source: "jolpica" };
    mockReadSnapshot.mockResolvedValue(snapshot);
    const liveFn = vi.fn().mockRejectedValue(new Error("should not be called"));

    const result = await readSnapshotOrFetch({
      key: "schedule-current",
      liveFn,
      dataClass: "schedule",
    });

    expect(result).toEqual(snapshot);
    expect(liveFn).not.toHaveBeenCalled();
  });
});
