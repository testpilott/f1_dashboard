/**
 * Shape returned by GET /api/wikidata and the wikidata fetcher layer.
 */
export interface WikidataDriverProfile {
  qid: string;
  birthplaceCity: string | null;
  birthplaceWikipediaUrl: string | null;
  photoUrl: string | null;
}
