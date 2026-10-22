/**
 * The quality numbers (the plan's S2.5.32, task 32a; scripts/quality-report.mjs and scripts/lib/quality.ts):
 * each count is held here against planted inputs, so a number the report prints can't quietly count the wrong
 * thing. The real counts are printed by the script on every CI run and fail nothing yet; these tests fail when
 * the counting itself breaks.
 */
import { mkdirSync, mkdtempSync, readFileSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { allCatalogCitations } from "@/lib/engines/all-citations";
import { SOURCES } from "@/lib/engines/research-kit/v2026/registry";
import type { SourceCard } from "@/lib/engines/research-kit/v2026/types";
import { generalRoadV2026, roadApprenticeToOwnShopAB } from "@/lib/engines/roads/v2026";

import { main as checkQuotes } from "../scripts/check-quotes.mjs";
import type { CheckQuotesRun, FetchedPage } from "../scripts/check-quotes.mjs";
import {
  clutterNumbers,
  harnessNumbers,
  onGeneralRoad,
  qualityLine,
  qualityMarkdown,
  searchNumbers,
  sourceNumbers,
  type QualityNumbers,
} from "../scripts/lib/quality";
import { parseArgs } from "../scripts/quality-report.mjs";
import { BUDGETS } from "../e2e/budgets";
import { KNOWN_GAPS } from "./fixtures/ideas/known-gaps";
import { IDEAS_V1, ROAD_IDS, type Idea } from "./fixtures/ideas/v1";
import { STILL_DEAD } from "./fixtures/still-dead-pages";
import { runHarness, type HarnessResult } from "./helpers/idea-harness-run";
import { measureJobSearch } from "./helpers/job-search-corpus";
import type { Failure } from "./helpers/idea-invariants";
import type { CockpitRun, IdeaRun } from "./helpers/idea-pipeline";

const folders: string[] = [];
afterEach(() => {
  for (const folder of folders.splice(0)) rmSync(folder, { recursive: true, force: true });
});
const tempFolder = () => {
  const folder = mkdtempSync(path.join(tmpdir(), "dotami-quality-"));
  folders.push(folder);
  return folder;
};

// ---- The idea harness ------------------------------------------------------------------------------------

const ideaFor = (road: Idea["road"]) => IDEAS_V1.find((idea) => idea.road === road)!;
const drawnOn = (roadId: string) => ({ road: { id: roadId } }) as unknown as CockpitRun;
const runOf = (idea: Idea, typed: CockpitRun | null, picked: CockpitRun | null) => ({ idea, typed, picked }) as unknown as IdeaRun;
const failure = (idea: Idea, invariant: Failure["invariant"], subject = ""): Failure => ({ ideaId: idea.id, invariant, subject, detail: "planted" });

describe("the harness numbers", () => {
  const road1Idea = ideaFor("road-1");
  const noneIdea = ideaFor("none-written-yet");
  const road0Idea = ideaFor("road-0");

  it("count where each idea ends, each way in", () => {
    const result: HarnessResult = {
      runs: [
        runOf(road1Idea, drawnOn(roadApprenticeToOwnShopAB.id), drawnOn(roadApprenticeToOwnShopAB.id)),
        runOf(noneIdea, drawnOn(generalRoadV2026.id), drawnOn(roadApprenticeToOwnShopAB.id)),
        runOf(road0Idea, null, null),
      ],
      failures: [],
      elapsedMs: 0,
      unlisted: [],
      passingNow: [],
    };
    const h = harnessNumbers(result, []);
    expect(h.ideas).toBe(3);
    expect(h.ownRoad).toBe(1);
    expect(h.generalWritten).toBe(1);
    expect(h.typed).toEqual({
      "own-road": 1,
      "general-its-road": 0,
      "general-own-written": 0,
      "general-none-written": 1,
      "other-road": 0,
      "stops-before": 1,
    });
    // The picked way only exists with a province picked: the third idea isn't counted there.
    expect(h.picked).toEqual({
      "own-road": 1,
      "general-its-road": 0,
      "general-own-written": 0,
      "general-none-written": 0,
      "other-road": 1,
      "stops-before": 0,
    });
    expect(h.passing).toBe(3);
    expect(h.clean).toBe(3);
  });

  it("an idea drawn on the general road though a road of its own is written for it is counted as that", () => {
    const h = harnessNumbers({ runs: [runOf(road1Idea, drawnOn(generalRoadV2026.id), null)], failures: [], elapsedMs: 0, unlisted: [], passingNow: [] }, []);
    expect(h.typed["general-own-written"]).toBe(1);
    expect(h.typed["own-road"]).toBe(0);
  });

  it("never counts the general road as reaching a road of its own, though road 0 is written for that idea", () => {
    // Road 0 IS the general road: every idea can land there, so an idea written for road 0 that lands there
    // says nothing about routing. It is counted on the general road, not as reaching a road of its own.
    const h = harnessNumbers({ runs: [runOf(road0Idea, drawnOn(generalRoadV2026.id), null)], failures: [], elapsedMs: 0, unlisted: [], passingNow: [] }, []);
    expect(h.typed["own-road"]).toBe(0);
    expect(h.typed["general-its-road"]).toBe(1);
    expect(h.ownRoad).toBe(0);
    expect(onGeneralRoad(h.typed)).toBe(1);
  });

  it("on the real harness, only an idea drawn on a road other than the general road reaches a road of its own", () => {
    // Every road-1 idea, plus a few road-0 and none-written ones, through the real pipeline.
    const ideas = [
      ...IDEAS_V1.filter((idea) => idea.road === "road-1"),
      ...IDEAS_V1.filter((idea) => idea.road === "road-0").slice(0, 5),
      ...IDEAS_V1.filter((idea) => idea.road === "none-written-yet").slice(0, 5),
    ];
    const result = runHarness(ideas, KNOWN_GAPS);
    const h = harnessNumbers(result, KNOWN_GAPS);
    const ownDrawn = result.runs.filter((run) => run.typed && run.typed.road.id !== generalRoadV2026.id && run.idea.road !== "none-written-yet");
    expect(h.typed["own-road"]).toBe(ownDrawn.filter((run) => run.typed!.road.id === ROAD_IDS[run.idea.road as "road-1"]).length);
    expect(onGeneralRoad(h.typed)).toBe(result.runs.filter((run) => run.typed?.road.id === generalRoadV2026.id).length);
    expect(h.typed["stops-before"]).toBe(result.runs.filter((run) => !run.typed).length);
    expect(h.ownRoad).toBe(IDEAS_V1.filter((idea) => idea.road === "road-1").length);
  }, 60_000);

  it("a failure no known gap names takes its idea off the pass rate; a known gap only off the clean count", () => {
    const known = failure(noneIdea, "no-verdict");
    const unknown = failure(road1Idea, "amounts-cited");
    const result: HarnessResult = {
      runs: [runOf(road1Idea, null, null), runOf(noneIdea, null, null), runOf(road0Idea, null, null)],
      failures: [known, unknown],
      elapsedMs: 0,
      unlisted: [unknown],
      passingNow: [],
    };
    const h = harnessNumbers(result, []);
    expect(h.passing).toBe(2);
    expect(h.clean).toBe(1);
    expect(h.unlisted).toBe(1);
  });

  it("counts silent fallbacks by idea and by way in", () => {
    const result: HarnessResult = {
      runs: [runOf(road1Idea, null, null), runOf(noneIdea, null, null)],
      failures: [
        failure(road1Idea, "ends:no-silent-fallback", "typed"),
        failure(road1Idea, "ends:no-silent-fallback", "picked"),
        failure(noneIdea, "ends:no-silent-fallback", "typed"),
        failure(noneIdea, "no-verdict"),
      ],
      elapsedMs: 0,
      unlisted: [],
      passingNow: [],
    };
    const h = harnessNumbers(result, []);
    expect(h.silentFallbacks).toMatchObject({ typed: 2, picked: 1, ideas: 2 });
    expect(h.silentFallbacks.list).toHaveLength(3);
  });

  it("counts the known gaps of the ideas run, by kind", () => {
    const ideas = IDEAS_V1.slice(0, 10);
    const h = harnessNumbers(runHarness(ideas, KNOWN_GAPS), KNOWN_GAPS);
    const ids = new Set(ideas.map((idea) => Number(idea.id.slice(-4))));
    const listed = (kind: "planned" | "bug") => KNOWN_GAPS.filter((g) => g.kind === kind).reduce((n, g) => n + g.ideas.filter((i) => ids.has(i)).length, 0);
    expect(h.knownGaps).toEqual({ planned: listed("planned"), bug: listed("bug") });
    // The real harness on these ten: green, so every one passes.
    expect(h.passing).toBe(10);
    expect(h.unlisted).toBe(0);
    expect(Object.values(h.typed).reduce((a, b) => a + b, 0)).toBe(10);
  });
});

// ---- The job search --------------------------------------------------------------------------------------

describe("the job search numbers", () => {
  const base = IDEAS_V1[0];
  const planted = (work: string, jobs?: string[]): Idea => ({ ...base, work, jobs });

  it("count the expected job in the first group, in any group, not listed, or no job found", () => {
    const s = searchNumbers([
      planted("carpenter", ["72310.00"]), // Carpenters, in the group of titles holding every word (the open one)
      planted("carpenter helper", ["72310.00"]), // a title holds both words (labourers); Carpenters only in a later group
      planted("carpenter", ["00000.00"]), // jobs found, not this one
      planted("zzzz qqqq", ["72310.00"]), // no job at all
      planted("zzzz qqqq"), // no expected job: counted only across every idea
    ]);
    expect(s).toMatchObject({ ideas: 5, withJob: 4, firstGroup: 1, anyGroup: 2, notListed: 1, noResults: 1, noResultsAll: 2 });
  });

  it("are the count the job search's floors hold, not one of their own", () => {
    // tests/job-title-search.spec.ts holds its floors on measureJobSearch; the report must print that count.
    expect(searchNumbers()).toEqual(measureJobSearch());
    const text = readFileSync(path.join(process.cwd(), "scripts", "lib", "quality.ts"), "utf8");
    expect(text).not.toContain("searchJobTitles(");
  }, 60_000);
});

// ---- Clutter ---------------------------------------------------------------------------------------------

describe("the clutter numbers", () => {
  const within = BUDGETS["front-door"]!.phone!;
  const saved = (over: Partial<typeof within> = {}) =>
    JSON.stringify({
      phone: { ...within, ...over, regionNames: [], controlNames: [], sizesPx: [], unmarkedBlocks: [] },
      tablet: { ...BUDGETS["front-door"]!.tablet!, unmarkedBlocks: [] },
      laptop: { ...BUDGETS["front-door"]!.laptop!, unmarkedBlocks: [] },
    });
  const write = (folder: string, dir: string, screen: string, body: string, at?: number) => {
    mkdirSync(path.join(folder, dir), { recursive: true });
    const file = path.join(folder, dir, `${screen}.json`);
    writeFileSync(file, body);
    if (at) utimesSync(file, at, at);
  };

  it("are none when no browser run left its files", () => {
    expect(clutterNumbers(path.join(tempFolder(), "not-there"))).toBeNull();
    const folder = tempFolder();
    write(folder, "idea-sweep-something-chromium", "front-door", saved());
    expect(clutterNumbers(folder)).toBeNull();
  });

  it("read each screen's measures at each width and hold them to the budget", () => {
    const folder = tempFolder();
    write(folder, "clutter-budget-the-front-door-chromium", "front-door", saved());
    const c = clutterNumbers(folder, "linux")!;
    expect(c.rows.map((r) => [r.screen, r.px, r.within])).toEqual([
      ["front-door", 375, true],
      ["front-door", 768, true],
      ["front-door", 1280, true],
    ]);
    expect(c.missing).not.toContain("front-door");
    expect(c.missing).toContain("plan");
  });

  it("count a screen over its budget, or with its smallest text under the floor, as not within", () => {
    const folder = tempFolder();
    write(folder, "clutter-budget-a-chromium", "front-door", saved({ controls: within.controls + 1 }));
    expect(clutterNumbers(folder, "linux")!.rows.find((r) => r.px === 375)!.within).toBe(false);
    const smaller = tempFolder();
    write(smaller, "clutter-budget-a-chromium", "front-door", saved({ smallestTextPx: within.smallestTextPx - 0.5 }));
    expect(clutterNumbers(smaller, "linux")!.rows.find((r) => r.px === 375)!.within).toBe(false);
  });

  it("count a screen with a drawn block no region mark covers as not within, at the budget or not, as the clutter spec fails it", () => {
    const folder = tempFolder();
    const blocked = { ...within, regionNames: [], controlNames: [], sizesPx: [], unmarkedBlocks: ["div.planted-unmarked-block"] };
    write(folder, "clutter-budget-a-chromium", "front-door", JSON.stringify({ phone: blocked, tablet: { ...blocked, ...BUDGETS["front-door"]!.tablet! }, laptop: { ...blocked, ...BUDGETS["front-door"]!.laptop! } }));
    const c = clutterNumbers(folder, "linux")!;
    expect(c.rows.map((r) => [r.screen, r.px, r.within])).toEqual([
      ["front-door", 375, false],
      ["front-door", 768, false],
      ["front-door", 1280, false],
    ]);
    expect(c.rows[0].breaches).toEqual(["a drawn block with no region mark, inside none: div.planted-unmarked-block"]);
  });

  it("count a saved file that doesn't say which blocks were unmarked as not within", () => {
    const folder = tempFolder();
    write(folder, "clutter-budget-a-chromium", "front-door", JSON.stringify({ phone: { ...within } }));
    expect(clutterNumbers(folder, "linux")!.rows[0].within).toBe(false);
  });

  it("is the one rule: the clutter spec, the idea sweep and the report all hold screens through e2e/clutter-rule.ts", () => {
    for (const file of ["e2e/clutter-budget.spec.ts", "e2e/idea-sweep.spec.ts", "scripts/lib/quality.ts"]) {
      const text = readFileSync(path.join(process.cwd(), file), "utf8");
      expect(text, file).toMatch(/from "(\.\/|\.\.\/\.\.\/e2e\/)clutter-rule"/);
      // No second copy of the budget arithmetic: the Windows extra is read only by the rule.
      expect(text, file).not.toContain("WINDOWS_EXTRA[");
    }
  });

  it("take a retry's newer file over the first try's", () => {
    const folder = tempFolder();
    write(folder, "clutter-budget-a-chromium", "front-door", saved({ controls: within.controls + 1 }), 1_000_000);
    write(folder, "clutter-budget-a-chromium-retry1", "front-door", saved(), 2_000_000);
    expect(clutterNumbers(folder, "linux")!.rows.find((r) => r.px === 375)!.within).toBe(true);
  });
});

// ---- Source health ---------------------------------------------------------------------------------------

describe("the source numbers", () => {
  it("count every citation once by who checked it, and the dead addresses the moved-pages test holds", () => {
    const src = sourceNumbers("2026-10-21", null);
    const listed = allCatalogCitations();
    expect(src.citations).toBe(listed.length);
    expect(Object.values(src.byCheck).reduce((a, b) => a + b, 0)).toBe(listed.length);
    expect(src.dead.citations).toBe(STILL_DEAD.reduce((n, d) => n + d.where.length, 0));
    expect(src.dead.addresses).toBe(STILL_DEAD.length);
    expect(src.live).toBeNull();
  });

  it("count a registry source stale once its stated next release has come, and not before", () => {
    // No card states a next release today (the registry gives none it wasn't told), so one is planted.
    const dated: SourceCard = { ...SOURCES[0], name: "A planted source", nextRelease: { date: "2026-11-01", what: "count" } };
    const cards = [SOURCES[0], dated];
    expect(sourceNumbers("2026-10-31", null, cards).stale).toEqual([]);
    expect(sourceNumbers("2026-11-01", null, cards).stale).toEqual(["A planted source"]);
    expect(sourceNumbers("2026-11-01", null, cards).cards).toBe(2);
  });

  it("read a live check: page not found apart from words not found, each problem listed", () => {
    const live: CheckQuotesRun = {
      checkedOn: "2026-10-21",
      pages: [
        { where: "a", url: "https://a", outcome: "found", status: 200 },
        { where: "b", url: "https://b", outcome: "words-missing", status: 200 },
        { where: "c", url: "https://c", outcome: "answered", status: 404 },
        { where: "d", url: "https://d", outcome: "answered", status: 503 },
        { where: "e", url: "https://e", outcome: "unreachable", status: 0 },
        { where: "f", url: "https://f", outcome: "pdf", status: 200 },
      ],
    };
    expect(sourceNumbers("2026-10-21", live).live).toEqual({
      checkedOn: "2026-10-21",
      pages: 6,
      found: 1,
      wordsMissing: 1,
      notFound: 1,
      otherAnswer: 1,
      unreachable: 1,
      pdf: 1,
      problems: ["b  https://b: words-missing", "c  https://c: answered 404", "d  https://d: answered 503", "e  https://e: unreachable", "f  https://f: pdf"],
    });
  });
});

describe("the quote checker's record of a run, for the report", () => {
  const html = (body: string): FetchedPage => ({ ok: true, status: 200, contentType: "text/html", body });
  const targets = [
    { where: "found", url: "https://www.canada.ca/a.html", quotes: ["the exact words here"] },
    { where: "missing", url: "https://www.canada.ca/b.html", quotes: ["the exact words here"] },
    { where: "gone", url: "https://www.canada.ca/c.html", quotes: ["the exact words here"] },
  ];
  const pages: Record<string, FetchedPage> = {
    "https://www.canada.ca/a.html": html("<p>Here are the exact words here, on the page.</p>"),
    "https://www.canada.ca/b.html": html("<p>Other words.</p>"),
  };
  const fetchPage = async (url: string) => pages[url] ?? { ok: false, status: 404, contentType: "text/html", body: "" };

  it("hands over each page's outcome on a run over every tool check", async () => {
    let saved: CheckQuotesRun | null = null;
    const code = await checkQuotes([], { fetchPage, collect: async () => targets, log: () => {}, today: "2026-10-21", onResult: (run) => (saved = run) });
    expect(code).toBe(1);
    expect(saved).toEqual({
      checkedOn: "2026-10-21",
      pages: [
        { where: "found", url: "https://www.canada.ca/a.html", outcome: "found", status: 200 },
        { where: "missing", url: "https://www.canada.ca/b.html", outcome: "words-missing", status: 200 },
        { where: "gone", url: "https://www.canada.ca/c.html", outcome: "answered", status: 404 },
      ],
    });
  });

  it("hands over nothing on a one-page --url run", async () => {
    let saved = false;
    await checkQuotes(["--url", "https://www.canada.ca/a.html", "--quote", "the exact words here"], {
      fetchPage,
      log: () => {},
      onResult: () => (saved = true),
    });
    expect(saved).toBe(false);
  });
});

// ---- The report and the Quality line ---------------------------------------------------------------------

describe("the report and the Quality line", () => {
  const numbers = (): QualityNumbers => ({
    on: "2026-10-21",
    harness: {
      ideas: 10,
      passing: 10,
      clean: 7,
      unlisted: 0,
      passingNow: 0,
      knownGaps: { planned: 2, bug: 1 },
      silentFallbacks: { typed: 3, picked: 0, ideas: 3, list: ["idea-v1-0001: typed: planted"] },
      ownRoad: 2,
      generalWritten: 3,
      typed: { "own-road": 1, "general-its-road": 2, "general-own-written": 1, "general-none-written": 5, "other-road": 0, "stops-before": 1 },
      picked: { "own-road": 2, "general-its-road": 3, "general-own-written": 0, "general-none-written": 3, "other-road": 2, "stops-before": 0 },
    },
    search: {
      ideas: 10,
      withJob: 8,
      firstGroup: 5,
      anyGroup: 6,
      notListed: 1,
      noResults: 1,
      noResultsAll: 2,
      firstGroupUncapped: 6,
      anyGroupUncapped: 7,
      cockpitList: 2,
      cockpitListNone: 5,
    },
    clutter: {
      folder: "test-results",
      rows: [
        { screen: "front-door", width: "phone", px: 375, measured: { regions: 4, controls: 9, textSizes: 8, smallestTextPx: 9.5 }, budget: { regions: 4, controls: 7, textSizes: 8, smallestTextPx: 9.5 }, within: false, breaches: ["9 controls in the first window, budget 7"] },
        { screen: "front-door", width: "tablet", px: 768, measured: { regions: 4, controls: 7, textSizes: 8, smallestTextPx: 9.5 }, budget: { regions: 4, controls: 11, textSizes: 8, smallestTextPx: 9.5 }, within: true, breaches: [] },
      ],
      missing: [],
    },
    sources: {
      citations: 20,
      addresses: 9,
      byCheck: { person: 2, model: 1, read: 5, tool: 12 },
      oldestCheck: "2026-05-01",
      cards: 3,
      cardsByCheck: { person: 0, model: 1, tool: 1, "not-read": 1 },
      stale: ["A planted source"],
      dead: { addresses: 2, citations: 5 },
      live: null,
    },
  });

  it("puts every part in the report, with each count", () => {
    const md = qualityMarkdown(numbers());
    expect(md).toContain("10 of 10 (100%) ideas pass the harness");
    expect(md).toContain("7 of 10 (70.0%) ideas hold every rule with no known gap");
    expect(md).toContain("### Silent fallbacks: 3");
    expect(md).toContain("| the general road, which is the road written for it (road 0) | 2 | 3 |");
    expect(md).toContain("| on the general road, all told | 8 of 10 (80.0%) | 6 of 10 (60.0%) |");
    expect(md).toContain("- idea-v1-0001: typed: planted");
    expect(md).toContain("| in the first group shown (the open one) | 5 of 8 (62.5%) |");
    expect(md).toContain("| in any group, counting past each group's first 50 | 7 of 8 (87.5%) |");
    expect(md).toContain("results of the cockpit's older job list (searchOasisJobs, by job name or code), the before | 2 of 8 (25.0%) |");
    expect(md).toContain("1 of 2 screen sizes within their budget");
    expect(md).toContain("| front-door | 375 px | 4 / 4 | 9 / 7 | 8 / 8 | 9.5 / 9.5 | **no** |");
    expect(md).toContain("- front-door at 375 px: 9 controls in the first window, budget 7");
    expect(md).toContain("| read by a person | 2 |");
    expect(md).toContain("Stale: 1 of the registry's 3 sources");
    expect(md).toContain("Dead: 5 citations on 2 addresses");
    expect(md).toContain("No live quote check in this run.");
    const live = { checkedOn: "2026-10-21", pages: 3, found: 1, wordsMissing: 0, notFound: 2, otherAnswer: 0, unreachable: 0, pdf: 0, problems: ["grants x  https://x: answered 404"] };
    const withLive = qualityMarkdown({ ...numbers(), sources: { ...numbers().sources!, live } });
    expect(withLive).toContain("page not found 2");
    expect(withLive).toContain("  - grants x  https://x: answered 404");
  });

  it("says a part wasn't counted rather than leave it out", () => {
    const md = qualityMarkdown({ ...numbers(), harness: null, search: null, clutter: null, sources: null });
    expect(md.match(/Not counted in this run/g)).toHaveLength(3);
    expect(md).toContain("No browser run's measurements in test-results/ here.");
    expect(qualityLine({ ...numbers(), harness: null, clutter: null })).toContain("the idea test wasn't counted in this run");
    expect(qualityLine({ ...numbers(), clutter: null })).toContain(
      "how busy each screen looks wasn't measured in this run (only the browser tests measure it)",
    );
  });

  it("gives one Quality line for the CHANGELOG with every headline number, in plain words", () => {
    const line = qualityLine(numbers());
    expect(line.startsWith("- **Quality** (counted by DotAmi's own tests, nothing from people using DotAmi; ")).toBe(true);
    expect(line).not.toContain("\n");
    for (const part of [
      `typed in, 8 of 10 invented test ideas end on the general road (“${generalRoadV2026.label}”, which any idea can reach) and 1 stops before any road is shown; 1 of the 2 ideas with a road of their own written for them reaches it`,
      "3 ideas are shown a road that isn't theirs with nothing on screen saying so",
      "of the 8 ideas that name the job they expect, “What's closest to your work?” lists it in the group it opens for 5, somewhere in the jobs it lists for 6, and finds no job at all for 1 (the cockpit's older job list finds it for 2)",
      "1 of 2 screen sizes (each main screen at 375, 768 and 1280 px wide) stay within their limits on how busy a screen looks",
      "of 20 source citations, 2 were read by a person, 1 by an AI model, 5 were read with no record of who read them, and 12 were checked only by a tool that found the quoted words on the page",
      "1 of the 3 sources DotAmi lists has a stated next release date that has passed",
      "5 citations point to government pages that answered “page not found”",
      "7 of 10 ideas break none of the idea test's rules, and the other 3 break only rules the tests list as known and not yet fixed (the tests fail otherwise)",
    ]) {
      expect(line).toContain(part);
    }
  });

  it("leads with what the numbers show, not with a pass rate that is 100% whenever the tests pass", () => {
    const line = qualityLine(numbers());
    const body = line.slice(line.indexOf("): ") + 3);
    expect(body.startsWith("typed in, ")).toBe(true);
    expect(line).not.toMatch(/100%/);
  });

  it("uses none of the report's shorthand without saying what it means", () => {
    const line = qualityLine(numbers());
    for (const shorthand of ["known gap", "silent fallback", "first group", "stale", "clutter budget", "dead address", "harness"]) {
      expect(line, shorthand).not.toContain(shorthand);
    }
  });

  it("says when an idea breaks a rule the tests don't list, rather than only how many pass", () => {
    const n = numbers();
    const line = qualityLine({ ...n, harness: { ...n.harness!, passing: 9, unlisted: 1 } });
    expect(line).toContain("7 of 10 ideas break none of the idea test's rules, 2 break only rules the tests list as known and not yet fixed, and 1 breaks a rule not listed (the tests fail on it)");
  });
});

describe("CI", () => {
  const ci = readFileSync(path.join(process.cwd(), ".github", "workflows", "ci.yml"), "utf8").replace(/\r\n/g, "\n");
  /** A step's block, from its "- name:" line to the next step's. */
  const step = (name: string) => {
    const at = ci.indexOf(`      - name: ${name}\n`);
    expect(at, name).toBeGreaterThan(0);
    const next = ci.indexOf("      - ", at + 1);
    return { at, block: ci.slice(at, next < 0 ? undefined : next) };
  };

  it("prints the numbers after the tests in the quality job, and the clutter after the browser run, never failing the job", () => {
    const quality = step("Quality numbers");
    expect(quality.at).toBeGreaterThan(step("Test").at);
    expect(quality.block).toMatch(/npm run quality:report\s*\n/);
    const clutter = step("Quality numbers (clutter)");
    expect(clutter.at).toBeGreaterThan(step("Browser tests").at);
    expect(clutter.block).toContain("npm run quality:report -- --clutter-only");
    for (const { block } of [quality, clutter]) {
      expect(block).toContain("continue-on-error: true");
      expect(block).toContain("if: ${{ !cancelled() }}");
      // Nothing fetched in CI.
      expect(block).not.toContain("--live");
    }
  });

  it("keeps the numbers out of npm run ci:quality, the gate's own chain", () => {
    const pkg = JSON.parse(readFileSync(path.join(process.cwd(), "package.json"), "utf8")) as { scripts: Record<string, string> };
    expect(pkg.scripts["quality:report"]).toBe("node scripts/quality-report.mjs");
    expect(pkg.scripts["quality:line"]).toBe("node scripts/quality-report.mjs --line");
    expect(pkg.scripts["ci:quality"]).not.toContain("quality:report");
  });
});

describe("the script's flags", () => {
  it("takes --clutter-only, --live and --line, --clutter-only with neither other, and nothing else", () => {
    expect(parseArgs([])).toEqual({ clutterOnly: false, line: false, live: false });
    expect(parseArgs(["--clutter-only"])).toEqual({ clutterOnly: true, line: false, live: false });
    expect(parseArgs(["--line"])).toEqual({ clutterOnly: false, line: true, live: false });
    expect(parseArgs(["--line", "--live"])).toEqual({ clutterOnly: false, line: true, live: true });
    expect(typeof parseArgs(["--clutter-only", "--line"])).toBe("string");
    expect(typeof parseArgs(["--clutter-only", "--live"])).toBe("string");
    expect(typeof parseArgs(["--send"])).toBe("string");
  });
});
