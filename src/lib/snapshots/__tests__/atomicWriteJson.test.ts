import { beforeEach, describe, expect, it, vi } from "vitest";
import path from "node:path";

const { mockWriteFile, mockMkdir, mockRename } = vi.hoisted(() => ({
  mockWriteFile: vi.fn(),
  mockMkdir: vi.fn(),
  mockRename: vi.fn(),
}));

vi.mock("node:fs/promises", () => ({
  __esModule: true,
  writeFile: mockWriteFile,
  mkdir: mockMkdir,
  rename: mockRename,
  default: {
    writeFile: mockWriteFile,
    mkdir: mockMkdir,
    rename: mockRename,
  },
}));

import { atomicWriteJson } from "@/lib/snapshots/atomicWriteJson";

describe("atomicWriteJson", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWriteFile.mockResolvedValue(undefined);
    mockMkdir.mockResolvedValue(undefined);
    mockRename.mockResolvedValue(undefined);
  });

  it("writes the final file with pretty-printed JSON", async () => {
    const data = { drivers: [{ driverId: "hamilton" }], snapshotAt: "2026-06-01T05:00:00Z" };
    const file = "/data/snapshots/standings-current.json";

    await atomicWriteJson(file, data);

    expect(mockWriteFile).toHaveBeenCalledWith(
      `${file}.tmp`,
      JSON.stringify(data, null, 2) + "\n",
      "utf8",
    );
    expect(mockRename).toHaveBeenCalledWith(`${file}.tmp`, file);
  });

  it("writes to .tmp first, then renames (correct order)", async () => {
    const calls: string[] = [];
    mockWriteFile.mockImplementation(() => { calls.push("writeFile"); return Promise.resolve(); });
    mockRename.mockImplementation(() => { calls.push("rename"); return Promise.resolve(); });

    await atomicWriteJson("/some/file.json", { x: 1 });

    expect(calls).toEqual(["writeFile", "rename"]);
  });

  it("creates parent directory before writing", async () => {
    const calls: string[] = [];
    mockMkdir.mockImplementation(() => { calls.push("mkdir"); return Promise.resolve(); });
    mockWriteFile.mockImplementation(() => { calls.push("writeFile"); return Promise.resolve(); });

    await atomicWriteJson("/data/snapshots/standings-current.json", {});

    expect(calls[0]).toBe("mkdir");
    expect(mockMkdir).toHaveBeenCalledWith(
      path.dirname("/data/snapshots/standings-current.json"),
      { recursive: true },
    );
  });

  it("propagates errors from writeFile", async () => {
    mockWriteFile.mockRejectedValue(new Error("disk full"));
    await expect(atomicWriteJson("/data/file.json", {})).rejects.toThrow("disk full");
  });

  it("propagates errors from rename", async () => {
    mockRename.mockRejectedValue(new Error("EXDEV"));
    await expect(atomicWriteJson("/data/file.json", {})).rejects.toThrow("EXDEV");
  });
});
