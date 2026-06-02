import { writeFile, mkdir, rename } from "node:fs/promises";
import path from "node:path";

/**
 * Write JSON to `file` atomically: writes to a `.tmp` sibling first, then
 * renames into place. Guarantees readers never see a partially-written file.
 * Creates parent directories as needed.
 */
export async function atomicWriteJson(file: string, data: unknown): Promise<void> {
  await mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.tmp`;
  await writeFile(tmp, JSON.stringify(data, null, 2) + "\n", "utf8");
  await rename(tmp, file);
}
