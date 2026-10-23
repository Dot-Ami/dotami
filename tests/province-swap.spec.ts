/**
 * Task 37a, the province swap: the same idea, the same job and the same answers, run through today's pipeline
 * (tests/helpers/idea-pipeline.ts) once in each of the 13 provinces and territories. Only facts tied to a place may
 * change from one run to the next:
 *
 * - every run shows only federal facts, its own province's, and facts that name no place: no other province's step,
 *   source, *done when* line, link, cost line, way to incorporate or wage row (tests/helpers/place-facts.ts);
 * - every run shows all its own province's sources, *done when* lines, fees and ways to incorporate the catalogs
 *   write for the steps on screen (`ownPlaceWritten`), so a filter that keeps too little fails too;
 * - the federal set (every federal fact and every fact that names no place) is the same in every run drawn on a road
 *   built from the map (road 0 in Alberta, the federal steps everywhere else);
 * - *About this job*'s wage rows are the run's own province's (or its region's, in Alberta), or Canada's where the
 *   government's note points there;
 * - the job is the person's pick, the same in every run.
 *
 * What fails today is listed in tests/fixtures/ideas/accuracy-gaps.ts (`PLACE_GAPS`), the same ratchet as the idea
 * harness's. The controls plant a filter that ignores the place in the app's own code (the ways to incorporate, a
 * step's sources, the wage file's look-up), one at a time, and each must fail naming what leaked and where; two more
 * plant a filter that leaves out the person's own province (a step's sources, the ways to incorporate), and each
 * must fail naming what is missing and where.
 */
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

const plants = vi.hoisted(() => ({
  /** The Incorporating stage lists every province's way to incorporate, and its fees, wherever the idea is. */
  feesIgnoreThePlace: false,
  /** A road written for all of Canada draws every source of a step, whatever the idea's province. */
  sourcesIgnoreThePlace: false,
  /** About this job reads Alberta's wage row, wherever the idea is. */
  wagesIgnoreThePlace: false,
  /** A road written for all of Canada draws a step's federal pages only, leaving out the person's own province's. */
  sourcesLeaveOutTheOwnPlace: false,
  /** The Incorporating stage lists the federal way only, leaving out the person's own province's. */
  feesLeaveOutTheOwnPlace: false,
}));

vi.mock("@/lib/engines/cfe/v2026/incorporation-routes", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/lib/engines/cfe/v2026/incorporation-routes")>();
  return {
    ...real,
    incorporationRoutesFor: (nodeId: string, province: string) => {
      if (plants.feesLeaveOutTheOwnPlace) {
        const { routes, provinceNotWritten } = real.incorporationRoutesFor(nodeId, province);
        return { routes: routes.filter((route) => route.jurisdiction === "CA"), provinceNotWritten };
      }
      if (!plants.feesIgnoreThePlace) return real.incorporationRoutesFor(nodeId, province);
      return { routes: real.incorporationRoutesV2026.filter((route) => route.nodeId === nodeId), provinceNotWritten: null };
    },
  };
});

vi.mock("@/lib/engines/roads/v2026", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/lib/engines/roads/v2026")>();
  return {
    ...real,
    citationsForPlace: (...args: Parameters<typeof real.citationsForPlace>) =>
      // As the real filter, on a road written for all of Canada only, but keeping the federal pages alone.
      plants.sourcesLeaveOutTheOwnPlace && (args[0].provinces as readonly string[]).includes("CA")
        ? { shown: args[1].filter((c) => c.jurisdiction === "CA"), leftOut: args[1].filter((c) => c.jurisdiction !== "CA").length }
        : plants.sourcesIgnoreThePlace
          ? { shown: [...args[1]], leftOut: 0 }
          : real.citationsForPlace(...args),
  };
});

vi.mock("@/lib/engines/wages/v2026", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/lib/engines/wages/v2026")>();
  return {
    ...real,
    wages: { ...real.wages, forProvince: (noc: string, province: string) => real.wages.forProvince(noc, plants.wagesIgnoreThePlace ? "AB" : province) },
  };
});

import { forksAreTheMapToggles } from "@/lib/engines/roads/v2026";
import { PROVINCE_LABELS, PROVINCES, type Province } from "@/lib/scenarios/types";

import { PLACE_GAPS } from "./fixtures/ideas/accuracy-gaps";
import { IDEAS_V1, type ExpectedRoad, type Idea } from "./fixtures/ideas/v1";
import { runIdea, type CockpitRun } from "./helpers/idea-pipeline";
import { factLine, ownPlaceWritten, placeFacts } from "./helpers/place-facts";

/**
 * The ideas swapped: corpus ideas with a job, their words written with the place left for the swap. A plumber
 * with sales numbers, a cabinetmaker apprentice (road 1, the apprentice road, is written for that job in Alberta), a
 * food truck bought for the business, and a home bakery. In Alberta each keeps the corpus's road (road 0, or road 1
 * for the cabinetmaker); everywhere else the road written for it is the federal steps, as in the corpus.
 */
const SWAPS: { n: number; words: (place: string) => string }[] = [
  { n: 51, words: (place) => `I'm a self-employed plumber in ${place}, been running for a year, revenue is getting close to the GST line` },
  { n: 46, words: (place) => `I'm doing my cabinetmaker apprenticeship in ${place} and build furniture on weekends, want my own shop one day` },
  { n: 2, words: (place) => `thinking about a taco food truck in ${place}, buying a used truck this spring` },
  { n: 4, words: (place) => `I want to sell sourdough from my kitchen in ${place}` },
];

const base = (n: number) => IDEAS_V1.find((idea) => idea.id === `idea-v1-${String(n).padStart(4, "0")}`)!;

/** The same idea in another place: only the place in its words, the place the person answers and its written road change. */
function inPlace(n: number, words: (place: string) => string, province: Province): Idea {
  const idea = base(n);
  const albertaRoad: ExpectedRoad = idea.place === "AB" ? idea.road : "road-0";
  return { ...idea, words: words(PROVINCE_LABELS[province]), place: province, named: [province], road: province === "AB" ? albertaRoad : "road-federal" };
}

interface SwapRun {
  n: number;
  province: Province;
  way: "typed" | "picked";
  c: CockpitRun;
}

function swapRuns(ns: readonly number[] = SWAPS.map((s) => s.n)): SwapRun[] {
  return SWAPS.filter((s) => ns.includes(s.n)).flatMap(({ n, words }) =>
    PROVINCES.flatMap((province) => {
      const run = runIdea(inPlace(n, words, province), { probeQuestions: false });
      return (["typed", "picked"] as const).flatMap((way) => {
        const c = run[way];
        return c ? [{ n, province, way, c }] : [];
      });
    }),
  );
}

/** A fact written for a place other than the run's own (and not federal): its key and where it was found. */
function otherPlaces(runs: readonly SwapRun[]): { key: string; detail: string }[] {
  return runs.flatMap(({ n, province, way, c }) =>
    placeFacts(c)
      .filter((f) => f.jurisdiction !== null && f.jurisdiction !== "CA" && f.jurisdiction !== province)
      .map((f) => ({
        key: `${province} · ${c.road.id} · ${f.kind} · ${f.what}`,
        detail: `idea ${n}, ${way}, in ${province}: ${f.kind} on ${f.where}, “${f.what}”, written for ${f.jurisdiction}`,
      })),
  );
}

const unique = (keys: string[]) => [...new Set(keys)].sort();

/**
 * What the catalogs write for a run's own province on the steps it shows, but the run doesn't show: a filter that
 * keeps too little (the person's own province's sources, *done when* lines, fees or ways to incorporate left out)
 * rather than too much. The leak check above can't see it, and the federal set doesn't hold a province's own facts.
 */
function ownPlaceMissing(runs: readonly SwapRun[]): string[] {
  return runs.flatMap(({ n, province, way, c }) => {
    const shown = placeFacts(c).filter((f) => f.jurisdiction === province).map(factLine);
    const written = ownPlaceWritten(c);
    return [
      ...written.lines.filter((line) => !shown.includes(line)),
      ...written.costLines.filter((line) => !shown.some((s) => s === line || s.startsWith(`${line} `))),
    ].map((line) => `idea ${n}, ${way}, in ${province} on ${c.road.id}: ${line}`);
  });
}

afterEach(() => {
  plants.feesIgnoreThePlace = false;
  plants.sourcesIgnoreThePlace = false;
  plants.wagesIgnoreThePlace = false;
  plants.sourcesLeaveOutTheOwnPlace = false;
  plants.feesLeaveOutTheOwnPlace = false;
});

describe("the same idea in every province and territory (task 37a)", () => {
  // One run of every swap (52 ideas, each way in), made once and read by each check below, without a plant.
  let runs: SwapRun[] = [];
  beforeAll(() => {
    runs = swapRuns();
  }, 60_000);

  it("runs each idea in all 13, each way in, on a road written for the place, with the same job", () => {
    expect(runs).toHaveLength(SWAPS.length * PROVINCES.length * 2);
    for (const { n, province, way, c } of runs) {
      const places: readonly string[] = c.road.provinces;
      expect(places.includes(province) || places.includes("CA"), `idea ${n}, ${way}, in ${province}: drawn on ${c.road.id}`).toBe(true);
      expect(c.job, `idea ${n}, ${way}, in ${province}`).toBe(base(n).jobs![0]);
      expect(c.final.input.scenario.profile.province).toBe(province);
      // The area and the region are asked in Alberta only, and only ever the person's own picks.
      expect(c.steps.area !== null, `idea ${n}, ${way}, in ${province}: an area`).toBe(province === "AB");
    }
  });

  it("shows no other province's step, source, done-when line, link, cost line, way to incorporate or wage row", () => {
    const found = otherPlaces(runs);
    const listed = new Set(PLACE_GAPS.map((gap) => gap.key));
    // A new one: fix it, or list it in accuracy-gaps.ts with its story (or, with none yet, who decides).
    expect(found.filter((f) => !listed.has(f.key)).map((f) => f.detail)).toEqual([]);
    // A listed one that no longer shows: take it off the list.
    const keys = new Set(found.map((f) => f.key));
    expect(PLACE_GAPS.filter((gap) => !keys.has(gap.key)).map((gap) => gap.key)).toEqual([]);
  });

  it("keeps the federal set the same in every run drawn on a road built from the map", () => {
    for (const { n } of SWAPS) {
      for (const way of ["typed", "picked"] as const) {
        const mapped = runs.filter((r) => r.n === n && r.way === way && forksAreTheMapToggles(r.c.road));
        // The cabinetmaker's Alberta run is on road 1, the apprentice road, which isn't built from the map.
        expect(mapped.length, `idea ${n}, ${way}`).toBeGreaterThanOrEqual(PROVINCES.length - 1);
        const federal = (r: SwapRun) => unique(placeFacts(r.c).filter((f) => f.kind !== "wage row" && (f.jurisdiction === "CA" || f.jurisdiction === null)).map(factLine));
        const first = federal(mapped[0]!);
        expect(first.length, `idea ${n}, ${way}: a federal set`).toBeGreaterThan(20);
        for (const r of mapped.slice(1)) {
          const these = federal(r);
          const missing = first.filter((line) => !these.includes(line));
          const added = these.filter((line) => !first.includes(line));
          expect({ missing, added }, `idea ${n}, ${way}, ${r.province} against ${mapped[0]!.province}`).toEqual({ missing: [], added: [] });
        }
      }
    }
  });

  it("shows every source, done-when line, fee and way to incorporate the catalogs write for the run's own province", () => {
    // Something to compare: Ontario's and British Columbia's employment-standards pages on the federal steps, and
    // Alberta's registry fees and ways to incorporate on road 0.
    for (const province of ["ON", "BC", "AB"] as const) {
      const written = runs.filter((r) => r.province === province).flatMap((r) => ownPlaceWritten(r.c).lines);
      expect(written.filter((line) => line.startsWith("source · ")).length, `${province}: its own sources`).toBeGreaterThan(0);
    }
    expect(runs.filter((r) => r.province === "AB").flatMap((r) => ownPlaceWritten(r.c).lines).some((line) => line.startsWith("way to incorporate · "))).toBe(true);
    expect(ownPlaceMissing(runs)).toEqual([]);
  });

  it("shows About this job's wage row for the run's own place, or Canada's where the government points there", () => {
    for (const { n, province, way, c } of runs) {
      const rows = placeFacts(c).filter((f) => f.kind === "wage row");
      expect(rows.length, `idea ${n}, ${way}, in ${province}: a wage row`).toBeGreaterThan(0);
      // The first row shown is the place's own (the region's in Alberta, when one is picked); a second, only
      // after a "not published" note, may be the province's or Canada's.
      expect(rows[0]!.jurisdiction, `idea ${n}, ${way}, in ${province}: ${rows[0]!.what}`).toBe(province);
      for (const row of rows) expect([province, "CA"], `idea ${n}, ${way}, in ${province}: ${row.what}`).toContain(row.jurisdiction);
    }
  });
});

describe("the province swap fails on a planted filter that ignores the place (controls)", () => {
  // The plumber, everywhere: one idea is enough to show each plant reaches the check.
  const leaks = () => otherPlaces(swapRuns([51]));

  it("passes on the same idea without a plant, apart from the listed gaps", () => {
    const listed = new Set(PLACE_GAPS.map((gap) => gap.key));
    expect(leaks().filter((f) => !listed.has(f.key))).toEqual([]);
  });

  it("a fee filter that ignores the place: Alberta's registry fees on the Incorporating stage, named with the province", () => {
    plants.feesIgnoreThePlace = true;
    const keys = unique(leaks().map((f) => f.key));
    for (const province of PROVINCES.filter((p) => p !== "AB")) {
      expect(keys).toContain(`${province} · road-federal-steps-ca · way to incorporate · Government fee to incorporate (alberta-incorporation-government-fee)`);
      expect(keys).toContain(`${province} · road-federal-steps-ca · way to incorporate · Registry agent's service fee (alberta-incorporation-service-fee)`);
    }
    expect(keys.filter((key) => key.startsWith("AB ·") && key.includes("way to incorporate"))).toEqual([]);
  });

  it("a source filter that ignores the place: another province's page on the federal steps", () => {
    plants.sourcesIgnoreThePlace = true;
    const keys = unique(leaks().map((f) => f.key));
    expect(keys).toContain("ON · road-federal-steps-ca · source · https://www2.gov.bc.ca/gov/content/employment-business/employment-standards-advice/employment-standards");
    expect(keys).toContain("BC · road-federal-steps-ca · source · https://www.ontario.ca/document/your-guide-employment-standards-act-0/small-business");
    expect(keys.some((key) => key.startsWith("NU · road-federal-steps-ca · source · ") && key.includes("alberta.ca"))).toBe(true);
  });

  it("a wage look-up that ignores the place: Alberta's row in About this job everywhere else", () => {
    plants.wagesIgnoreThePlace = true;
    const found = leaks().filter((f) => f.key.includes(" · wage row · "));
    expect(unique(found.map((f) => f.key.split(" · ")[0]!))).toEqual(PROVINCES.filter((p) => p !== "AB").sort());
    expect(found.every((f) => f.detail.endsWith("written for AB"))).toBe(true);
  });

  // Filters that keep too little: nothing leaks and the federal set stays the same, so only the own-province check
  // above can fail on them (review of PR #203: the earlier checks stayed green on the sources plant).
  const missing = () => ownPlaceMissing(swapRuns([51]));

  it("passes the own-province check on the same idea without a plant", () => {
    expect(missing()).toEqual([]);
  });

  it("a source filter that leaves out the person's own province: Ontario's and British Columbia's pages missing from their own runs", () => {
    plants.sourcesLeaveOutTheOwnPlace = true;
    const found = missing();
    expect(found).toContain(
      "idea 51, typed, in ON on road-federal-steps-ca: source · branch-hire-first-employee · https://www.ontario.ca/document/your-guide-employment-standards-act-0/small-business",
    );
    expect(found).toContain(
      "idea 51, picked, in BC on road-federal-steps-ca: source · branch-hire-first-employee · https://www2.gov.bc.ca/gov/content/employment-business/employment-standards-advice/employment-standards",
    );
    // The leak check and the federal set don't see it.
    const listed = new Set(PLACE_GAPS.map((gap) => gap.key));
    expect(leaks().filter((f) => !listed.has(f.key))).toEqual([]);
  });

  it("a way-to-incorporate filter that leaves out the person's own province: Alberta's ways missing in Alberta", () => {
    plants.feesLeaveOutTheOwnPlace = true;
    const found = missing();
    expect(found.length).toBeGreaterThan(0);
    expect(found.every((line) => line.includes(", in AB on ") && line.includes(": way to incorporate · "))).toBe(true);
  });
});
