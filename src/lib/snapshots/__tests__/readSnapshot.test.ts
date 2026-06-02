import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockReadFile } = vi.hoisted(() => ({
  mockReadFile: vi.fn(),
}));

vi.mock("node:fs/promises", () => ({
  readFile: mockReadFile,
}));

import { readSnapshot, SNAPSHOT_DIR_PATH } from "@/lib/snapshots/readSnapshot";
import path from "node:path";

describe("readSnapshot", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns parsed object when snapshot file is present and valid", async () => {
    const payload = { drivers: [{ driverId: "hamilton" }], snapshotAt: "2026-06-01T05:00:00Z" };
    mockReadFile.mockResolvedValue(JSON.stringify(payload));

    const result = await readSnapshot<typeof payload>("standings-current");

    expect(result).toEqual(payload);
    expect(mockReadFile).toHaveBeenCalledWith(
      path.join(SNAPSHOT_DIR_PATH, "standings-current.json"),
      "utf8",
    );
  });

  it("returns null when file is missing (ENOENT)", async () => {
    mockReadFile.mockRejectedValue(Object.assign(new Error("ENOENT"), { code: "ENOENT" }));

    const result = await readSnapshot("standings-current");
    expect(result).toBeNull();
  });

  it("returns null when file contains malformed JSON", async () => {
    mockReadFile.mockResolvedValue("{ not valid json");

    const result = await readSnapshot("standings-current");
    expect(result).toBeNull();
  });

  it("returns null for a key with path-traversal characters (../)", async () => {
    const result = await readSnapshot("../secrets");
    expect(result).toBeNull();
    expect(mockReadFile).not.toHaveBeenCalled();
  });

  it("returns null for a key with forward slash", async () => {
    const result = await readSnapshot("foo/bar");
    expect(result).toBeNull();
    expect(mockReadFile).not.toHaveBeenCalled();
  });

  it("returns null for an empty string key", async () => {
    const result = await readSnapshot("");
    expect(result).toBeNull();
    expect(mockReadFile).not.toHaveBeenCalled();
  });

  it("returns null for a key with backslash", async () => {
    const result = await readSnapshot("foo\\bar");
    expect(result).toBeNull();
    expect(mockReadFile).not.toHaveBeenCalled();
  });

  it("accepts valid keys with hyphens and underscores", async () => {
    const payload = { races: [], snapshotAt: "2026-06-01T05:00:00Z" };
    mockReadFile.mockResolvedValue(JSON.stringify(payload));

    const result = await readSnapshot("schedule-current");
    expect(result).toEqual(payload);
  });

  it("accepts valid keys with digits", async () => {
    const payload = { wins: "7", snapshotAt: "2026-06-01T05:00:00Z" };
    mockReadFile.mockResolvedValue(JSON.stringify(payload));

    const result = await readSnapshot("driver-career-hamilton44");
    expect(result).toEqual(payload);
  });
});
