import { describe, expect, it } from "vitest";
import type { JolpicaLap, JolpicaPitstop } from "@/lib/types";
import { buildLapSeries, mapPitstops, summarisePace } from "@/lib/stats/lapAnalysis";

describe("buildLapSeries", () => {
  it("builds ms points for selected drivers", () => {
    const laps: JolpicaLap[] = [
      { number: "1", Timings: [{ driverId: "hamilton", position: "1", time: "1:22.000" }] },
      { number: "2", Timings: [{ driverId: "hamilton", position: "1", time: "1:21.500" }] },
    ];

    const out = buildLapSeries(laps, ["hamilton"]);
    expect(out).toEqual([
      { lap: 1, ms: 82000, driverId: "hamilton" },
      { lap: 2, ms: 81500, driverId: "hamilton" },
    ]);
  });

  it("omits malformed times", () => {
    const laps: JolpicaLap[] = [{ number: "1", Timings: [{ driverId: "hamilton", position: "1", time: "bad" }] }];
    expect(buildLapSeries(laps, ["hamilton"])).toEqual([]);
  });
});

describe("summarisePace", () => {
  it("computes median pace per driver and sorts ascending", () => {
    const summary = summarisePace([
      { driverId: "hamilton", lap: 1, ms: 82000 },
      { driverId: "hamilton", lap: 2, ms: 81000 },
      { driverId: "hamilton", lap: 3, ms: 81200 },
      { driverId: "verstappen", lap: 1, ms: 80500 },
      { driverId: "verstappen", lap: 2, ms: 80400 },
      { driverId: "verstappen", lap: 3, ms: 80600 },
    ]);

    expect(summary[0].driverId).toBe("verstappen");
    expect(summary[1].driverId).toBe("hamilton");
  });

  it("returns empty for empty input", () => {
    expect(summarisePace([])).toEqual([]);
  });
});

describe("mapPitstops", () => {
  it("maps only requested drivers", () => {
    const pits: JolpicaPitstop[] = [
      { driverId: "hamilton", lap: "20", stop: "1", duration: "2.450" },
      { driverId: "verstappen", lap: "22", stop: "1", duration: "2.120" },
    ];

    expect(mapPitstops(pits, ["hamilton"])).toEqual([
      { lap: 20, driverId: "hamilton", durationMs: 2450 },
    ]);
  });

  it("returns empty for empty input", () => {
    expect(mapPitstops([], ["hamilton"]).length).toBe(0);
  });
});
