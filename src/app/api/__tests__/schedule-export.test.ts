import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api/withRateLimit", () => ({
  rateLimited: vi.fn(() => null),
}));

vi.mock("@/lib/api/jolpica", () => ({
  getSchedule: vi.fn(),
}));

vi.mock("@/lib/ical", () => ({
  buildICS: vi.fn(() => "BEGIN:VCALENDAR\nEND:VCALENDAR\n"),
}));

import { GET } from "@/app/api/schedule/export/route";
import { getSchedule } from "@/lib/api/jolpica";
import { buildICS } from "@/lib/ical";
import { makeApiRequest } from "@/test/api";

describe("GET /api/schedule/export", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 for an invalid season", async () => {
    const res = await GET(makeApiRequest("/api/schedule/export", { season: "bad" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/invalid season/i);
  });

  it("returns an ICS payload with the correct headers", async () => {
    vi.mocked(getSchedule).mockResolvedValue([] as never);
    const res = await GET(makeApiRequest("/api/schedule/export", { season: "2026" }));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toMatch(/text\/calendar/);
    expect(res.headers.get("content-disposition")).toMatch(/filename="f1-2026\.ics"/);
    const text = await res.text();
    expect(text).toContain("BEGIN:VCALENDAR");
    expect(buildICS).toHaveBeenCalledWith([], { season: "2026" });
  });

  it("returns 500 when the schedule fetch fails", async () => {
    vi.mocked(getSchedule).mockRejectedValue(new Error("timeout"));
    const res = await GET(makeApiRequest("/api/schedule/export", { season: "2026" }));
    expect(res.status).toBe(500);
  });
});
