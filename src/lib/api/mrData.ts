export type RaceFieldEnvelope<K extends string, V> = {
  MRData: { RaceTable: { Races: Array<Partial<Record<K, V[]>>> } };
};

/** First race's field, or [] when the race or field is absent. */
export function firstRaceField<K extends string, V>(
  data: RaceFieldEnvelope<K, V>,
  field: K,
): V[] {
  return data.MRData.RaceTable.Races[0]?.[field] ?? [];
}

export type RacesEnvelope<R> = { MRData: { RaceTable: { Races: R[] } } };

/** First race object, or null. */
export function firstRace<R>(data: RacesEnvelope<R>): R | null {
  return data.MRData.RaceTable.Races[0] ?? null;
}

export interface MRPage {
  total: string;
  offset: string;
  limit: string;
}

/**
 * Walk a paginated MRData endpoint. Stops when a page is empty or offset
 * passes total.
 */
export async function paginateMRData<TEnvelope extends { MRData: MRPage }, TRow>(
  fetchPage: (offset: number) => Promise<TEnvelope>,
  extractRows: (page: TEnvelope) => TRow[],
  pageSize: number,
): Promise<TRow[]> {
  let offset = 0;
  let total = Number.POSITIVE_INFINITY;
  const rows: TRow[] = [];

  while (offset < total) {
    const page = await fetchPage(offset);
    const pageRows = extractRows(page);
    rows.push(...pageRows);

    const parsedTotal = parseInt(page.MRData.total ?? "0", 10);
    const parsedOffset = parseInt(page.MRData.offset ?? String(offset), 10);
    const parsedLimit = parseInt(page.MRData.limit ?? String(pageSize), 10);
    total = isNaN(parsedTotal) ? 0 : parsedTotal;
    offset = parsedOffset + (isNaN(parsedLimit) ? pageSize : parsedLimit);

    if (pageRows.length === 0) break;
  }

  return rows;
}