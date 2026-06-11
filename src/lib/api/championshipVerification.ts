export async function verifyChampionships(
  driverId: string,
  floor: number,
  deps: {
    getSeasons: (id: string) => Promise<number[]>;
    countTitleInSeason: (id: string, season: number) => Promise<number>;
  },
): Promise<number> {
  if (floor === 0) return 0;

  try {
    const seasons = await deps.getSeasons(driverId);
    if (seasons.length === 0) return floor;

    const CONCURRENCY = 4;
    const seasonChecks: boolean[] = new Array(seasons.length).fill(false);
    let cursor = 0;

    async function worker(): Promise<void> {
      while (true) {
        const index = cursor++;
        if (index >= seasons.length) return;
        try {
          const titles = await deps.countTitleInSeason(driverId, seasons[index]);
          seasonChecks[index] = titles > 0;
        } catch {
          seasonChecks[index] = false;
        }
      }
    }

    await Promise.all(
      Array.from({ length: Math.min(CONCURRENCY, seasons.length) }, () => worker()),
    );

    const observed = seasonChecks.reduce(
      (count, hasTitle) => (hasTitle ? count + 1 : count),
      0,
    );

    return Math.max(observed, floor);
  } catch {
    return floor;
  }
}