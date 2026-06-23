/**
 * Curated reference data per circuit.
 *
 * Keyed by the Jolpica/Ergast `circuitId` (e.g. "spa", "monaco", "zandvoort").
 * Closed, append-only set — when a new circuit joins the calendar, add an
 * entry here; circuits not present return `null` and the UI hides the panel
 * gracefully.
 *
 * Sources (per circuit):
 *  - Wikipedia infobox: length, turns, direction
 *  - Wikipedia body / FIA homologation: elevation gain, max banking
 *  - Notable corners: well-known fan references; description ≤140 chars.
 *
 * Maintenance note: corner numbers MUST match Multiviewer's geometry
 * (the same numbers exposed by `/api/circuit-info` as `corners[].number`).
 * F1's standard 1-based turn numbering is what Multiviewer uses, but on
 * a small number of circuits Multiviewer counts shared chicanes
 * differently than fan convention — verify by clicking the corresponding
 * corner in the dev-server Circuit tab before merging a new entry.
 */
export interface CircuitHotspot {
  /** Multiviewer corner number (matches /api/circuit-info's corners[].number). */
  corner: number;
  /** Display name, e.g. "Eau Rouge–Raidillon". */
  name: string;
  /** ≤140-char reason why the corner is notable. */
  description: string;
}

export interface CircuitDetails {
  lengthMeters: number;
  turnCount: number;
  /** Peak-to-low elevation difference around the lap (positive metres). */
  elevationGainMeters: number;
  /** Max banking on any corner (degrees). 0 for flat circuits. */
  maxBankingDegrees: number;
  direction: "clockwise" | "anticlockwise" | "mixed";
  /** English Wikipedia article slug, e.g. "Circuit_de_Spa-Francorchamps". */
  wikipediaSlug: string;
  /** 3–6 notable corners; empty array allowed when none stand out. */
  notableHotspots: CircuitHotspot[];
}

export const CIRCUIT_DETAILS: Record<string, CircuitDetails> = {
  spa: {
    lengthMeters: 7004,
    turnCount: 19,
    elevationGainMeters: 102,
    maxBankingDegrees: 0,
    direction: "clockwise",
    wikipediaSlug: "Circuit_de_Spa-Francorchamps",
    notableHotspots: [
      {
        corner: 3,
        name: "Eau Rouge–Raidillon",
        description:
          "Steep uphill left-right combo taken near-flat in modern cars — multiple high-impact crashes incl. Hubert (F2, 2019).",
      },
      {
        corner: 8,
        name: "Les Combes",
        description:
          "Heavy braking at the end of the Kemmel Straight — frequent first-lap pile-ups and overtakes that go wrong.",
      },
      {
        corner: 12,
        name: "Pouhon",
        description:
          "Fast double-left taken near-flat — hits suspension hard; off-throttle moments often end in the gravel.",
      },
      {
        corner: 15,
        name: "Stavelot",
        description:
          "High-speed right onto the Blanchimont straight — small mistakes scrub a lot of pace into the next sector.",
      },
    ],
  },

  monaco: {
    lengthMeters: 3337,
    turnCount: 19,
    elevationGainMeters: 42,
    maxBankingDegrees: 0,
    direction: "clockwise",
    wikipediaSlug: "Circuit_de_Monaco",
    notableHotspots: [
      {
        corner: 1,
        name: "Sainte Devote",
        description:
          "Tight right after the start-finish — first-lap chaos zone with no run-off; many races end here on lap 1.",
      },
      {
        corner: 6,
        name: "Mirabeau / Loews Hairpin",
        description:
          "Slowest corner in F1 — minor contact knocks suspension out of alignment and ends races.",
      },
      {
        corner: 10,
        name: "Tabac",
        description:
          "Fast left-hander hugged by Armco — a famous backdrop and a place where small errors cost a wheel.",
      },
      {
        corner: 18,
        name: "Rascasse",
        description:
          "Tight right onto the pit straight — Schumacher's 2006 'park' here is etched in Monaco folklore.",
      },
    ],
  },

  monza: {
    lengthMeters: 5793,
    turnCount: 11,
    elevationGainMeters: 8,
    maxBankingDegrees: 0,
    direction: "clockwise",
    wikipediaSlug: "Monza_Circuit",
    notableHotspots: [
      {
        corner: 1,
        name: "Variante del Rettifilo",
        description:
          "First-chicane braking zone at ~340 km/h — classic Monza opening-lap carnage from the long DRS-aided run.",
      },
      {
        corner: 4,
        name: "Variante della Roggia",
        description:
          "Tight left-right after the Curva Grande — common spot for overtakes that go too deep.",
      },
      {
        corner: 6,
        name: "Lesmo 1",
        description:
          "Fast right entered blind from a brow — minor understeer ends in the gravel on the exit.",
      },
      {
        corner: 8,
        name: "Variante Ascari",
        description:
          "Fast left-right-left chicane — a setup balance check; off here usually means a heavy hit.",
      },
    ],
  },

  silverstone: {
    lengthMeters: 5891,
    turnCount: 18,
    elevationGainMeters: 12,
    maxBankingDegrees: 0,
    direction: "clockwise",
    wikipediaSlug: "Silverstone_Circuit",
    notableHotspots: [
      {
        corner: 1,
        name: "Abbey",
        description:
          "Fast opening right — Grosjean–Hamilton 2020 incident a recent flashpoint; first-lap pinch with wide entry.",
      },
      {
        corner: 9,
        name: "Copse",
        description:
          "Flat-out 290 km/h right — Verstappen–Hamilton 2021 collision happened on entry; small lift, huge consequence.",
      },
      {
        corner: 11,
        name: "Maggotts–Becketts",
        description:
          "Six-direction-change sequence taken in 4th–6th gear — any imbalance ends in the gravel at Chapel.",
      },
      {
        corner: 15,
        name: "Stowe",
        description:
          "Long fast right after Hangar Straight — late-braking lunges are common and often end in tears.",
      },
    ],
  },

  zandvoort: {
    lengthMeters: 4259,
    turnCount: 14,
    elevationGainMeters: 40,
    /** Hugenholtzbocht (T3) ~19°; Arie Luyendyk-bocht (T14) ~18°. */
    maxBankingDegrees: 19,
    direction: "clockwise",
    wikipediaSlug: "Circuit_Zandvoort",
    notableHotspots: [
      {
        corner: 3,
        name: "Hugenholtzbocht",
        description:
          "18° banked left after Tarzanbocht — taken blind; suspension load is brutal and gives no second chances.",
      },
      {
        corner: 8,
        name: "Scheivlak",
        description:
          "Fast downhill right out of the dunes — taken near-flat; small mistakes end in the gravel barrier.",
      },
      {
        corner: 14,
        name: "Arie Luyendyk-bocht",
        description:
          "19° banked final corner — committee-set throttle on exit fires cars onto the long start/finish straight.",
      },
    ],
  },

  suzuka: {
    lengthMeters: 5807,
    turnCount: 18,
    elevationGainMeters: 40,
    maxBankingDegrees: 0,
    direction: "clockwise",
    wikipediaSlug: "Suzuka_International_Racing_Course",
    notableHotspots: [
      {
        corner: 1,
        name: "First Corner / Turn 1",
        description:
          "Fast downhill right at race start — Bianchi's 2014 crane impact happened in heavy rain on the exit at T7.",
      },
      {
        corner: 4,
        name: "Esses",
        description:
          "S-curves climbing rhythm — any tank-slapper ricochets through Dunlop; sets the whole lap up.",
      },
      {
        corner: 8,
        name: "Degner 2",
        description:
          "Second part of Degner — apex is camber-off; many drivers brush the wall on exit at low loads.",
      },
      {
        corner: 14,
        name: "130R",
        description:
          "Famous flat-out left around 290 km/h — Alonso's 2005 pass on Schumacher made the corner iconic.",
      },
    ],
  },

  interlagos: {
    lengthMeters: 4309,
    turnCount: 15,
    elevationGainMeters: 43,
    maxBankingDegrees: 0,
    direction: "anticlockwise",
    wikipediaSlug: "Autódromo_José_Carlos_Pace",
    notableHotspots: [
      {
        corner: 1,
        name: "Senna S",
        description:
          "Heavy downhill braking into a left-right — wet conditions amplify the 11% gradient; classic Brazilian GP drama.",
      },
      {
        corner: 4,
        name: "Descida do Lago",
        description:
          "Downhill left onto the back straight — late braking common; exit speed defines a quick S2.",
      },
      {
        corner: 12,
        name: "Juncao",
        description:
          "Slow left at the lowest point — full throttle on exit for the long uphill drag to T1.",
      },
    ],
  },

  red_bull_ring: {
    lengthMeters: 4318,
    turnCount: 10,
    elevationGainMeters: 65,
    maxBankingDegrees: 0,
    direction: "clockwise",
    wikipediaSlug: "Red_Bull_Ring",
    notableHotspots: [
      {
        corner: 1,
        name: "Turn 1 (Niki Lauda)",
        description:
          "Slow uphill right after a long DRS straight — heavy late-braking lunges; track limits crime scene.",
      },
      {
        corner: 3,
        name: "Remus",
        description:
          "Long downhill braking into a tight right — frequent overtake attempt and corresponding wheel-banging.",
      },
      {
        corner: 9,
        name: "Rindt",
        description:
          "Fast downhill right onto the pit straight — track limits abuse here is consistent and policed.",
      },
    ],
  },

  americas: {
    lengthMeters: 5513,
    turnCount: 20,
    elevationGainMeters: 41,
    maxBankingDegrees: 0,
    direction: "anticlockwise",
    wikipediaSlug: "Circuit_of_the_Americas",
    notableHotspots: [
      {
        corner: 1,
        name: "Turn 1",
        description:
          "Steep blind uphill braking into a sharp left — the iconic COTA opener; first-lap pile-ups are routine.",
      },
      {
        corner: 11,
        name: "Turn 11",
        description:
          "Slowest corner — tight hairpin at the end of the back straight; the prime overtake spot of the lap.",
      },
      {
        corner: 18,
        name: "Stadium Esses",
        description:
          "Fast left-right-left chicane in front of the grandstand — small imbalance scrubs huge pace.",
      },
    ],
  },

  hungaroring: {
    lengthMeters: 4381,
    turnCount: 14,
    elevationGainMeters: 36,
    maxBankingDegrees: 0,
    direction: "clockwise",
    wikipediaSlug: "Hungaroring",
    notableHotspots: [
      {
        corner: 1,
        name: "Turn 1",
        description:
          "Downhill braking into a tight right — pole sitter usually wins from here; T2-T3 chain ends overtakes.",
      },
      {
        corner: 4,
        name: "Turn 4",
        description:
          "Fast downhill right — a common late-lift sector; rear instability ends laps in the gravel.",
      },
      {
        corner: 11,
        name: "Turn 11",
        description:
          "Slow uphill left — secondary overtake spot off T10, but committed entry is required and easy to miss.",
      },
    ],
  },

  catalunya: {
    lengthMeters: 4657,
    turnCount: 14,
    elevationGainMeters: 25,
    maxBankingDegrees: 0,
    direction: "clockwise",
    wikipediaSlug: "Circuit_de_Barcelona-Catalunya",
    notableHotspots: [
      {
        corner: 1,
        name: "Elf",
        description:
          "Downhill right at end of the long start straight — first-lap divebombs end in the gravel routinely.",
      },
      {
        corner: 3,
        name: "Renault / Turn 3",
        description:
          "Long fast right loading the front tyres — the corner that defines aero balance for testing in February.",
      },
      {
        corner: 10,
        name: "La Caixa",
        description:
          "Slow left after a long downhill braking zone — the secondary overtake of the lap.",
      },
    ],
  },

  baku: {
    lengthMeters: 6003,
    turnCount: 20,
    elevationGainMeters: 16,
    maxBankingDegrees: 0,
    direction: "anticlockwise",
    wikipediaSlug: "Baku_City_Circuit",
    notableHotspots: [
      {
        corner: 1,
        name: "Turn 1",
        description:
          "Slow right at end of the 2.2 km flat-out blast — heaviest braking event of the F1 calendar.",
      },
      {
        corner: 8,
        name: "Castle Section (T8)",
        description:
          "7-metre-wide gap between Old City walls — an instant DNF if you so much as glance the right-hand wall.",
      },
      {
        corner: 15,
        name: "Turn 15",
        description:
          "Tight street-section right after the seafront — wall-tap city; commonly destroys a race.",
      },
    ],
  },

  marina_bay: {
    lengthMeters: 4940,
    turnCount: 19,
    elevationGainMeters: 5,
    maxBankingDegrees: 0,
    direction: "anticlockwise",
    wikipediaSlug: "Marina_Bay_Street_Circuit",
    notableHotspots: [
      {
        corner: 1,
        name: "Sheares",
        description:
          "Hard braking into a tight right — opening-lap pile-ups in the heat are part of the Singapore script.",
      },
      {
        corner: 7,
        name: "Memorial",
        description:
          "Tight left after the pit-out section — wall-lined; corrections cost the front wing.",
      },
      {
        corner: 14,
        name: "Singapore Sling (removed) / T14 Esplanade",
        description:
          "Final-sector slow chicane — committed kerb-riding required; a wheel over the kerb often gets a damper.",
      },
    ],
  },

  miami: {
    lengthMeters: 5412,
    turnCount: 19,
    elevationGainMeters: 4,
    maxBankingDegrees: 0,
    direction: "clockwise",
    wikipediaSlug: "Miami_International_Autodrome",
    notableHotspots: [
      {
        corner: 1,
        name: "Turn 1",
        description:
          "Tight left at the end of the DRS straight — heavy late braking; first-lap incidents are routine here.",
      },
      {
        corner: 11,
        name: "Turn 11 (under the bridge)",
        description:
          "Slow chicane sequence under the I-95 overpass — committed kerb usage; easy to bottom-out.",
      },
      {
        corner: 17,
        name: "Turn 17",
        description:
          "Long medium-speed right onto the back straight — exit traction defines a quick S3.",
      },
    ],
  },

  vegas: {
    lengthMeters: 6201,
    turnCount: 17,
    elevationGainMeters: 2,
    maxBankingDegrees: 0,
    direction: "anticlockwise",
    wikipediaSlug: "Las_Vegas_Strip_Circuit",
    notableHotspots: [
      {
        corner: 1,
        name: "Turn 1",
        description:
          "Tight left after the Las Vegas Boulevard straight — long-braking into bumps; cold-tyre crashes routine.",
      },
      {
        corner: 5,
        name: "Sphere Turn (T5)",
        description:
          "Slow chicane in front of the Sphere — wall-lined; surface bumps amplify any mid-corner correction.",
      },
      {
        corner: 14,
        name: "Turn 14",
        description:
          "Slow left ending the Las Vegas Boulevard run — primary overtake of the lap.",
      },
    ],
  },

  villeneuve: {
    lengthMeters: 4361,
    turnCount: 14,
    elevationGainMeters: 5,
    maxBankingDegrees: 0,
    direction: "clockwise",
    wikipediaSlug: "Circuit_Gilles_Villeneuve",
    notableHotspots: [
      {
        corner: 8,
        name: "Casino Hairpin",
        description:
          "Slowest corner on the lap — late-braking lunges into the inside; small contact ends the race.",
      },
      {
        corner: 13,
        name: "Wall of Champions",
        description:
          "Exit kerb of the final chicane — clipping the wall here has eliminated Schumacher, Hill, Villeneuve in one year.",
      },
    ],
  },

  shanghai: {
    lengthMeters: 5451,
    turnCount: 16,
    elevationGainMeters: 5,
    maxBankingDegrees: 0,
    direction: "clockwise",
    wikipediaSlug: "Shanghai_International_Circuit",
    notableHotspots: [
      {
        corner: 1,
        name: "Turn 1–3 Spiral",
        description:
          "Tightening 270° spiral at race start — patience-vs-aggression contradiction; first-lap chaos guaranteed.",
      },
      {
        corner: 6,
        name: "Turn 6",
        description:
          "Fast left at the end of the back run — exit traction defines a clean run to the long T13.",
      },
      {
        corner: 13,
        name: "Turn 13",
        description:
          "Decreasing-radius right opening the longest straight in F1 (1.17 km) — exit determines the next overtake.",
      },
    ],
  },

  losail: {
    lengthMeters: 5419,
    turnCount: 16,
    elevationGainMeters: 5,
    maxBankingDegrees: 0,
    direction: "clockwise",
    wikipediaSlug: "Lusail_International_Circuit",
    notableHotspots: [
      {
        corner: 1,
        name: "Turn 1",
        description:
          "Slow right at end of the start straight — visibility and dust affect the first lap heavily.",
      },
      {
        corner: 6,
        name: "Turn 6",
        description:
          "Fast left taken near-flat — tyre loads are extreme; 2023 race saw enforced max-stint lengths for safety.",
      },
    ],
  },

  rodriguez: {
    lengthMeters: 4304,
    turnCount: 17,
    elevationGainMeters: 4,
    maxBankingDegrees: 0,
    direction: "clockwise",
    wikipediaSlug: "Autódromo_Hermanos_Rodríguez",
    notableHotspots: [
      {
        corner: 1,
        name: "Turn 1",
        description:
          "Very long DRS run into a slow right — heaviest late-braking lunges of the season into a tight pinch.",
      },
      {
        corner: 12,
        name: "Stadium Section / Peraltada",
        description:
          "Slow ess through the baseball stadium — atmospheric pressure (2,260 m altitude) hurts braking and grip.",
      },
    ],
  },

  albert_park: {
    lengthMeters: 5278,
    turnCount: 14,
    elevationGainMeters: 10,
    maxBankingDegrees: 0,
    direction: "clockwise",
    wikipediaSlug: "Albert_Park_Circuit",
    notableHotspots: [
      {
        corner: 3,
        name: "Turn 3",
        description:
          "Heavy braking right after a fast left — common late-braking overtake that goes wrong on cold tyres.",
      },
      {
        corner: 6,
        name: "Turn 6",
        description:
          "Fast left taken near-flat after the 2022 reprofile — small lift required; off here ends the race.",
      },
      {
        corner: 11,
        name: "Turn 11",
        description:
          "Slowest corner on the lap after the long DRS straight — a prime overtake spot post-2022.",
      },
    ],
  },

  yas_marina: {
    lengthMeters: 5281,
    turnCount: 16,
    elevationGainMeters: 5,
    maxBankingDegrees: 0,
    direction: "anticlockwise",
    wikipediaSlug: "Yas_Marina_Circuit",
    notableHotspots: [
      {
        corner: 6,
        name: "Turn 6",
        description:
          "Heavy braking at end of the long back straight — primary overtake of the lap under the lights.",
      },
      {
        corner: 9,
        name: "Turn 9",
        description:
          "Fast left into the hotel section — exit traction defines a clean run through the under-hotel kink.",
      },
    ],
  },

  madring: {
    // Madrid street/permanent hybrid — premiering 2026. Some specs are
    // public from the FIA homologation; others (banking, elevation) will
    // need verifying against Multiviewer's geometry once the data is live.
    lengthMeters: 5474,
    turnCount: 22,
    elevationGainMeters: 30,
    maxBankingDegrees: 0,
    direction: "clockwise",
    wikipediaSlug: "Madring",
    notableHotspots: [],
  },
};

/**
 * Lookup helper. Returns null when the circuitId isn't curated yet —
 * callers must handle null (the UI hides the panel in that case).
 */
export function getCircuitDetails(id: string): CircuitDetails | null {
  return CIRCUIT_DETAILS[id] ?? null;
}

/**
 * Build the English Wikipedia URL for a circuit's article.
 * Returns null when the circuitId isn't curated.
 *
 * The slug is stored already-underscored (e.g. "Circuit_de_Spa-Francorchamps").
 * We use `encodeURI` (not `encodeURIComponent`) so underscores Wikipedia depends
 * on are preserved while any non-ASCII characters (already percent-encoded in
 * the slug — see `interlagos`) survive a round trip.
 */
export function getCircuitWikipediaUrl(id: string): string | null {
  const details = getCircuitDetails(id);
  if (!details) return null;
  return `https://en.wikipedia.org/wiki/${encodeURI(details.wikipediaSlug)}`;
}
