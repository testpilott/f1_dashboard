import { readFile } from "node:fs/promises";
import path from "node:path";

const SNAPSHOT_DIR = path.join(process.cwd(), "data", "snapshots");

/**
 * Read a snapshot file. Returns null if the file is absent or the JSON is
 * malformed. Never throws — callers fall through to the live fetcher.
 */
export async function readSnapshot<T>(key: string): Promise<T | null> {
  const safeKey = key.replace(/[^a-z0-9_-]/gi, "");
  if (safeKey !== key || key.length === 0) return null;
  const file = path.join(SNAPSHOT_DIR, `${safeKey}.json`);
  try {
    const raw = await readFile(file, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export const SNAPSHOT_DIR_PATH = SNAPSHOT_DIR; // exported for tests + writers
