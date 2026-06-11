import { badRequest, cachedJson } from "@/lib/api/routeHelpers";
import { extractFulfilled } from "@/lib/api/promiseHelpers";
import { rateLimited } from "@/lib/api/withRateLimit";
import { VALID_SEARCH_QUERY } from "@/lib/validators";
import { getDriverStandings, getConstructorStandings, getSchedule } from "@/lib/api/jolpica";
import { search } from "@/lib/search";
import type { SearchIndex, SearchResult } from "@/lib/search";

export const revalidate = 3600; // index changes at most each season

export async function GET(req: Request) {
  const blocked = rateLimited(req, "search");
  if (blocked) return blocked;

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? "";

  if (!VALID_SEARCH_QUERY.test(q)) {
    return badRequest("Invalid query");
  }

  const [driversRes, constructorsRes, scheduleRes] = await Promise.allSettled([
    getDriverStandings("current"),
    getConstructorStandings("current"),
    getSchedule("current"),
  ]);

  const drivers = extractFulfilled(driversRes, []);
  const constructors = extractFulfilled(constructorsRes, []);
  const races = extractFulfilled(scheduleRes, []);

  const index: SearchIndex = {
    drivers: drivers.map((d) => ({
      kind: "driver" as const,
      id: d.Driver.driverId,
      label: `${d.Driver.givenName} ${d.Driver.familyName}`,
      sublabel: d.Constructors[0]?.name,
      href: "/drivers",
    })),
    constructors: constructors.map((c) => ({
      kind: "constructor" as const,
      id: c.Constructor.constructorId,
      label: c.Constructor.name,
      href: `/compare`,
    })),
    circuits: races.map((r) => ({
      kind: "circuit" as const,
      id: r.Circuit.circuitId,
      label: r.Circuit.circuitName,
      sublabel: r.Circuit.Location.country,
      href: `/schedule`,
    })),
    races: races.map((r) => ({
      kind: "race" as const,
      id: `${r.season}-${r.round}`,
      label: r.raceName,
      sublabel: `Round ${r.round} · ${r.season}`,
      href: `/race/${r.season}/${r.round}`,
    })),
  };

  const results: SearchResult[] = search(index, q, 12);
  return cachedJson({ q, results }, "raceSchedule");
}
