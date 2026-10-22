/**
 * Quality numbers you can see (the plan's S2.5.32, "best results without analytics", task 32a). Nothing here
 * comes from the people using DotAmi and nothing is sent anywhere: every number is counted from what the tests
 * already compute, on the machine running them, with no network (only `--live`, below, reads web pages).
 *
 * - The idea harness (tests/idea-harness.spec.ts): the same run, through tests/helpers/idea-harness-run.ts. Its
 *   pass rate (an idea passes when every failure it has is a known gap: the harness's own rule, so it stays at
 *   100% while the harness is green), how many ideas hold every rule with no known gap at all, where each idea
 *   ends, and the silent fallbacks.
 * - Corpus coverage of the job search ("What's closest to your work?", searchJobTitles): the expected job in
 *   the first group shown, in any group, or no job found at all.
 * - The clutter numbers per screen and width, read from the last browser run's files
 *   (e2e/clutter-budget.spec.ts writes one `<screen>.json` per screen into test-results/).
 * - Source health: each citation by who checked it (lib/engines/shared/citation-check.ts), the registry's cards
 *   by who read their terms and whether their stated next release has come, the dead addresses left for a person
 *   (tests/fixtures/still-dead-pages.ts), and, only when a builder asks for it with `--live`, a live run of the
 *   quote checker (scripts/check-quotes.mjs: it fetches the cited government pages, so CI never runs it).
 *
 * scripts/quality-report.mjs prints these and writes test-results/quality.md; `--line` prints the one Quality
 * line the release pull request puts in the CHANGELOG. Numbers never fail anything yet.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

import { allCatalogCitations } from "@/lib/engines/all-citations";
import { openGroupCodes, searchJobTitles } from "@/lib/engines/oasis/v2026/title-search";
import { catalogFreshness } from "@/lib/engines/research-kit/v2026/freshness";
import { SOURCES } from "@/lib/engines/research-kit/v2026/registry";
import type { CheckedBy, SourceCard } from "@/lib/engines/research-kit/v2026/types";
import { generalRoadV2026 } from "@/lib/engines/roads/v2026";
import { howChecked, type HowChecked } from "@/lib/engines/shared/citation-check";

import { SCREENS, WIDTHS, type Clutter, type ScreenId, type WidthId } from "../../e2e/budgets";
import { budgetFor, clutterBreaches } from "../../e2e/clutter-rule";
import { KNOWN_GAPS, type KnownGap } from "../../tests/fixtures/ideas/known-gaps";
import { IDEAS_V1, ROAD_IDS, type Idea } from "../../tests/fixtures/ideas/v1";
import { STILL_DEAD } from "../../tests/fixtures/still-dead-pages";
import { ideaId, runHarness, type HarnessResult } from "../../tests/helpers/idea-harness-run";
import type { CockpitRun } from "../../tests/helpers/idea-pipeline";

// ---- The idea harness ------------------------------------------------------------------------------------

/**
 * Where one way in ended, as the report counts it. Road 0 ("Starting any business in Alberta") IS the general
 * road, the one any idea lands on when no other road is drawn, so an idea written for road 0 that lands there
 * says nothing about whether ideas reach the road written for them: it gets its own row, and only a road other
 * than the general road counts as "a road of its own".
 */
export const ROAD_ENDS = [
  "own-road",
  "general-its-road",
  "general-own-written",
  "general-none-written",
  "other-road",
  "stops-before",
] as const;
export type RoadEnd = (typeof ROAD_ENDS)[number];

export const ROAD_END_WORDS: Record<RoadEnd, string> = {
  "own-road": "the road of its own written for it (not the general road)",
  "general-its-road": "the general road, which is the road written for it (road 0)",
  "general-own-written": "the general road, though a road of its own is written for it",
  "general-none-written": "the general road (no road written for it yet)",
  "other-road": "another road, not the general road",
  "stops-before": "stops before any road is shown",
};

const GENERAL_ENDS: readonly RoadEnd[] = ["general-its-road", "general-own-written", "general-none-written"];

/** Every idea that ended on the general road, whatever road is written for it. */
export const onGeneralRoad = (ends: Record<RoadEnd, number>) => GENERAL_ENDS.reduce((n, end) => n + ends[end], 0);

export interface HarnessNumbers {
  ideas: number;
  /** Ideas whose every failure is a known gap: the harness's own rule. */
  passing: number;
  /** Ideas with no failure at all, known gap or not. */
  clean: number;
  /** Failures the known-gaps list doesn't name, and listed gaps that pass now: either fails the harness. */
  unlisted: number;
  passingNow: number;
  /** Listed gaps (idea and invariant), by kind. */
  knownGaps: { planned: number; bug: number };
  /** Ideas drawn on a road that isn't theirs with nothing saying so, each way in; `ideas` counts each idea once. */
  silentFallbacks: { typed: number; picked: number; ideas: number; list: string[] };
  /** Ideas with a road of their own written for them: a road other than the general road (road 1 in the corpus). */
  ownRoad: number;
  /** Ideas whose written road is the general road itself (road 0 in the corpus). */
  generalWritten: number;
  typed: Record<RoadEnd, number>;
  picked: Record<RoadEnd, number>;
}

/** The road written for an idea, or null when none is written yet. */
const writtenFor = (idea: Idea) => (idea.road === "none-written-yet" ? null : ROAD_IDS[idea.road]);

function roadEnd(idea: Idea, run: CockpitRun | null): RoadEnd {
  if (!run) return "stops-before";
  const written = writtenFor(idea);
  if (run.road.id === generalRoadV2026.id) {
    if (!written) return "general-none-written";
    return written === generalRoadV2026.id ? "general-its-road" : "general-own-written";
  }
  return written && run.road.id === written ? "own-road" : "other-road";
}

const zeroEnds = () => Object.fromEntries(ROAD_ENDS.map((end) => [end, 0])) as Record<RoadEnd, number>;

/** Counts one run of the harness. */
export function harnessNumbers(result: HarnessResult, gaps: readonly KnownGap[] = KNOWN_GAPS): HarnessNumbers {
  const unlistedIdeas = new Set(result.unlisted.map((f) => f.ideaId));
  const failedIdeas = new Set(result.failures.map((f) => f.ideaId));
  const fallbacks = result.failures.filter((f) => f.invariant === "ends:no-silent-fallback");
  const typed = zeroEnds();
  const picked = zeroEnds();
  for (const run of result.runs) {
    typed[roadEnd(run.idea, run.typed)] += 1;
    // The picked way only exists once a province or territory is picked; an idea with none isn't counted.
    if (run.picked) picked[roadEnd(run.idea, run.picked)] += 1;
  }
  const ran = new Set(result.runs.map((run) => run.idea.id));
  const listed = (kind: KnownGap["kind"]) =>
    gaps.filter((g) => g.kind === kind).reduce((n, g) => n + g.ideas.filter((i) => ran.has(ideaId(i))).length, 0);
  return {
    ideas: result.runs.length,
    passing: result.runs.filter((run) => !unlistedIdeas.has(run.idea.id)).length,
    clean: result.runs.filter((run) => !failedIdeas.has(run.idea.id)).length,
    unlisted: result.unlisted.length,
    passingNow: result.passingNow.length,
    knownGaps: { planned: listed("planned"), bug: listed("bug") },
    silentFallbacks: {
      typed: fallbacks.filter((f) => f.subject === "typed").length,
      picked: fallbacks.filter((f) => f.subject === "picked").length,
      ideas: new Set(fallbacks.map((f) => f.ideaId)).size,
      list: fallbacks.map((f) => `${f.ideaId}: ${f.detail}`),
    },
    ownRoad: result.runs.filter((run) => {
      const written = writtenFor(run.idea);
      return written !== null && written !== generalRoadV2026.id;
    }).length,
    generalWritten: result.runs.filter((run) => writtenFor(run.idea) === generalRoadV2026.id).length,
    typed,
    picked,
  };
}

// ---- The job search, against the corpus ------------------------------------------------------------------

export interface SearchNumbers {
  /** Ideas in the corpus, and those with an expected job. */
  ideas: number;
  withJob: number;
  /** Of those with an expected job: in the first group shown (open), in any group, found nowhere though jobs were. */
  firstGroup: number;
  anyGroup: number;
  notListed: number;
  /** Of those with an expected job: the search found no job at all. */
  noResults: number;
  /** Of every idea: the search found no job at all for its kind of work. */
  noResultsAll: number;
}

/** The search the screen runs, on each idea's kind of work, each group as the screen lists it (the first 50). */
export function searchNumbers(ideas: readonly Idea[] = IDEAS_V1): SearchNumbers {
  let firstGroup = 0;
  let anyGroup = 0;
  let noResults = 0;
  let noResultsAll = 0;
  let withJob = 0;
  for (const idea of ideas) {
    const result = searchJobTitles(idea.work);
    const none = result.state !== "results";
    if (none) noResultsAll += 1;
    const expected = idea.jobs ?? [];
    if (expected.length === 0) continue;
    withJob += 1;
    if (none) {
      noResults += 1;
      continue;
    }
    const open = openGroupCodes(result);
    const all = result.groups.flatMap((g) => g.jobs.map((j) => j.code));
    if (expected.some((code) => open.includes(code))) firstGroup += 1;
    if (expected.some((code) => all.includes(code))) anyGroup += 1;
  }
  return { ideas: ideas.length, withJob, firstGroup, anyGroup, notListed: withJob - anyGroup - noResults, noResults, noResultsAll };
}

// ---- Clutter, from the last browser run ------------------------------------------------------------------

export interface ClutterRow {
  screen: ScreenId;
  width: WidthId;
  px: number;
  measured: Clutter;
  budget: Clutter | null;
  within: boolean;
  /** What breaks the rule, in words (e2e/clutter-rule.ts); none when within. */
  breaches: string[];
}

export interface ClutterNumbers {
  /** The folder read, and the screens it held no file for. */
  folder: string;
  rows: ClutterRow[];
  missing: ScreenId[];
}

const isClutter = (value: unknown): value is Clutter =>
  !!value &&
  typeof value === "object" &&
  ["regions", "controls", "textSizes", "smallestTextPx"].every((k) => typeof (value as Record<string, unknown>)[k] === "number");

/**
 * The clutter measured by the last browser run: each `<screen>.json` the clutter spec saved in its own result
 * folder under `folder` (Playwright names those folders after the test, `clutter-budget-…`; a retry's folder
 * ends `-retry1`, and the newest file wins). Null when the folder holds none: no browser run here, or one
 * cleared since.
 */
export function clutterNumbers(folder: string, platform: NodeJS.Platform = process.platform): ClutterNumbers | null {
  if (!existsSync(folder)) return null;
  const newest = new Map<ScreenId, { at: number; file: string }>();
  for (const dir of readdirSync(folder)) {
    if (!dir.startsWith("clutter-budget-")) continue;
    for (const screen of SCREENS) {
      const file = path.join(folder, dir, `${screen}.json`);
      if (!existsSync(file)) continue;
      const at = statSync(file).mtimeMs;
      if ((newest.get(screen)?.at ?? -1) < at) newest.set(screen, { at, file });
    }
  }
  if (newest.size === 0) return null;
  const rows: ClutterRow[] = [];
  for (const screen of SCREENS) {
    const found = newest.get(screen);
    if (!found) continue;
    const saved = JSON.parse(readFileSync(found.file, "utf8")) as Record<string, unknown>;
    for (const size of WIDTHS) {
      const measured = saved[size.id];
      if (!isClutter(measured)) continue;
      // The spec's own rule (e2e/clutter-rule.ts), not a copy: a screen size with no budget isn't within either,
      // as the spec fails it.
      const budget = budgetFor(screen, size.id, platform);
      const breaches = clutterBreaches(measured, budget);
      const within = !!budget && breaches.length === 0;
      const { regions, controls, textSizes, smallestTextPx } = measured;
      rows.push({ screen, width: size.id, px: size.width, measured: { regions, controls, textSizes, smallestTextPx }, budget, within, breaches });
    }
  }
  return { folder, rows, missing: SCREENS.filter((s) => !newest.has(s)) };
}

// ---- Source health ---------------------------------------------------------------------------------------

/** What a run of scripts/check-quotes.mjs over every tool check found (its `onResult`; `--live` only). */
export interface LiveCheck {
  checkedOn: string;
  pages: { where: string; url: string; outcome: "found" | "words-missing" | "answered" | "unreachable" | "pdf"; status: number }[];
}

export interface SourceNumbers {
  /** Each citation as listed (each place a source is shown), by who checked it. */
  citations: number;
  addresses: number;
  byCheck: Record<HowChecked["kind"], number>;
  /** The oldest read or tool check on record, YYYY-MM-DD. */
  oldestCheck: string;
  /** The registry's cards, by who read their terms; stale: a stated next release that has come by `today`. */
  cards: number;
  cardsByCheck: Record<CheckedBy, number>;
  stale: string[];
  /** Addresses left for a person since they answered page not found, and the citations still on them. */
  dead: { addresses: number; citations: number };
  /** The live quote check, when this run made one (`--live`). */
  live: null | {
    checkedOn: string;
    pages: number;
    found: number;
    wordsMissing: number;
    /** The server answered page not found or gone (404, 410). */
    notFound: number;
    otherAnswer: number;
    unreachable: number;
    pdf: number;
    /** Each citation whose page didn't show its words: where, the address, and what happened. */
    problems: string[];
  };
}

/**
 * Source health on `today` (YYYY-MM-DD), from the catalogs and the registry `cards`, plus `live` when this run
 * made a live check.
 */
export function sourceNumbers(today: string, live: LiveCheck | null, cards: readonly SourceCard[] = SOURCES): SourceNumbers {
  const listed = allCatalogCitations();
  const byCheck: Record<HowChecked["kind"], number> = { person: 0, model: 0, read: 0, tool: 0 };
  let oldestCheck = "";
  for (const { citation } of listed) {
    const how = howChecked(citation);
    byCheck[how.kind] += 1;
    if (!oldestCheck || how.on < oldestCheck) oldestCheck = how.on;
  }
  const cardsByCheck: Record<CheckedBy, number> = { person: 0, model: 0, tool: 0, "not-read": 0 };
  for (const card of cards) cardsByCheck[card.checkedBy] += 1;
  const deadUrls = new Set(STILL_DEAD.map((d) => d.url));
  const count = (outcome: LiveCheck["pages"][number]["outcome"]) => live?.pages.filter((p) => p.outcome === outcome).length ?? 0;
  const notFound = live?.pages.filter((p) => p.outcome === "answered" && (p.status === 404 || p.status === 410)).length ?? 0;
  return {
    citations: listed.length,
    addresses: new Set(listed.map(({ citation }) => citation.url)).size,
    byCheck,
    oldestCheck,
    cards: cards.length,
    cardsByCheck,
    stale: cards.filter((card) => catalogFreshness(card, today).stale).map((card) => card.name),
    dead: {
      addresses: [...deadUrls].filter((url) => listed.some(({ citation }) => citation.url === url)).length,
      citations: listed.filter(({ citation }) => deadUrls.has(citation.url)).length,
    },
    live: live && {
      checkedOn: live.checkedOn,
      pages: live.pages.length,
      found: count("found"),
      wordsMissing: count("words-missing"),
      notFound,
      otherAnswer: count("answered") - notFound,
      unreachable: count("unreachable"),
      pdf: count("pdf"),
      problems: live.pages
        .filter((p) => p.outcome !== "found")
        .map((p) => `${p.where}  ${p.url}: ${p.outcome === "answered" ? `answered ${p.status}` : p.outcome}`),
    },
  };
}

// ---- The report ------------------------------------------------------------------------------------------

export interface QualityNumbers {
  /** The day the numbers were counted, YYYY-MM-DD. */
  on: string;
  /** Null when this run left that part out (`--clutter-only`). */
  harness: HarnessNumbers | null;
  search: SearchNumbers | null;
  /** Null when no browser run's files were found. */
  clutter: ClutterNumbers | null;
  sources: SourceNumbers | null;
}

/** Everything but the clutter is counted here; the clutter is read from `folder`, the live check passed in. */
export function countQuality(args: { today: string; folder: string; clutterOnly?: boolean; live?: LiveCheck | null }): QualityNumbers {
  const clutter = clutterNumbers(args.folder);
  if (args.clutterOnly) return { on: args.today, harness: null, search: null, clutter, sources: null };
  return {
    on: args.today,
    harness: harnessNumbers(runHarness()),
    search: searchNumbers(),
    clutter,
    sources: sourceNumbers(args.today, args.live ?? null),
  };
}

const pct = (part: number, whole: number) => (whole === 0 ? "–" : `${((100 * part) / whole).toFixed(part === whole ? 0 : 1)}%`);
const of = (part: number, whole: number) => `${part} of ${whole} (${pct(part, whole)})`;
/** The verb that agrees with a count: "1 stops", "3 stop". */
const verb = (n: number, one: string, many: string) => (n === 1 ? one : many);

/** test-results/quality.md: every number, with what it counts. */
export function qualityMarkdown(q: QualityNumbers): string {
  const lines: string[] = [];
  const table = (head: string[], rows: (string | number)[][]) => {
    lines.push(`| ${head.join(" | ")} |`, `|${head.map(() => "---").join("|")}|`);
    for (const row of rows) lines.push(`| ${row.join(" | ")} |`);
    lines.push("");
  };
  lines.push(
    "# Quality numbers",
    "",
    `Counted on ${q.on} from what the tests compute on this computer (the plan's S2.5.32). Nothing comes from the people using DotAmi, and nothing here leaves the computer. No number fails anything yet.`,
    "",
  );

  lines.push("## The idea harness", "");
  const h = q.harness;
  if (!h) lines.push("Not counted in this run (`--clutter-only`).", "");
  else {
    lines.push(
      `- Pass rate: ${of(h.passing, h.ideas)} ideas pass the harness (every failure a known gap, tests/fixtures/ideas/known-gaps.ts). It stays at 100% while the harness is green.`,
      `- ${of(h.clean, h.ideas)} ideas hold every rule with no known gap at all. Known gaps listed: ${h.knownGaps.planned} planned (a story not built yet), ${h.knownGaps.bug} bugs.`,
      `- Failures no known gap names: ${h.unlisted}. Known gaps that pass now: ${h.passingNow}. Either one fails the harness.`,
      "",
      `### Silent fallbacks: ${h.silentFallbacks.ideas}`,
      "",
      `Ideas drawn on a road that isn't theirs with nothing saying so: ${h.silentFallbacks.typed} on the typed way in, ${h.silentFallbacks.picked} on the picked way in. The aim is 0 once phase 2 is done.`,
      "",
      ...h.silentFallbacks.list.map((line) => `- ${line}`),
      ...(h.silentFallbacks.list.length > 0 ? [""] : []),
      "### Where each idea ends",
      "",
      `The general road (“${generalRoadV2026.label}”, road 0) is the one any idea lands on when no other road is drawn, so landing there is never counted as reaching a road of its own. ${h.ownRoad} of ${h.ideas} ideas have a road of their own written for them (road 1); ${h.generalWritten} more have the general road itself written for them. The picked way counts only ideas that name a province or territory; on it the person clicks a card, so "another road" there is the road they picked.`,
      "",
    );
    const pickedTotal = ROAD_ENDS.reduce((n, end) => n + h.picked[end], 0);
    table(["Ends on", "Typed way in", "Picked way in"], [
      ...ROAD_ENDS.map((end) => [ROAD_END_WORDS[end], h.typed[end], h.picked[end]]),
      ["on the general road, all told", of(onGeneralRoad(h.typed), h.ideas), of(onGeneralRoad(h.picked), pickedTotal)],
    ]);
  }

  lines.push("## Corpus coverage of the job search", "");
  const s = q.search;
  if (!s) lines.push("Not counted in this run (`--clutter-only`).", "");
  else {
    lines.push(
      `"What's closest to your work?" (searchJobTitles) on each idea's kind of work, each group as the screen lists it. ${s.withJob} of ${s.ideas} ideas name an expected job.`,
      "",
    );
    table(
      ["The expected job", "Ideas"],
      [
        ["in the first group shown (the open one)", of(s.firstGroup, s.withJob)],
        ["in any group", of(s.anyGroup, s.withJob)],
        ["not listed, though other jobs were", of(s.notListed, s.withJob)],
        ["no job found at all", of(s.noResults, s.withJob)],
      ],
    );
    lines.push(`Across every idea, ${of(s.noResultsAll, s.ideas)} find no job at all.`, "");
  }

  lines.push("## Clutter, per screen and width", "");
  const c = q.clutter;
  if (!c) {
    lines.push(
      "No browser run's measurements in test-results/ here. They come from `npm run test:browser` (e2e/clutter-budget.spec.ts); in CI the Browser tests job prints this part in its own log.",
      "",
    );
  } else {
    const inside = c.rows.filter((r) => r.within).length;
    lines.push(`From the last browser run (${c.folder}): ${inside} of ${c.rows.length} screen sizes within their budget (e2e/budgets.ts).`, "");
    if (c.missing.length > 0) lines.push(`No file for: ${c.missing.join(", ")}.`, "");
    const cell = (n: number, b: number | undefined) => (b === undefined ? `${n}` : `${n} / ${b}`);
    table(
      ["Screen", "Width", "Regions", "Controls", "Text sizes", "Smallest text, px", "Within budget"],
      c.rows.map((r) => [
        r.screen,
        `${r.px} px`,
        cell(r.measured.regions, r.budget?.regions),
        cell(r.measured.controls, r.budget?.controls),
        cell(r.measured.textSizes, r.budget?.textSizes),
        cell(r.measured.smallestTextPx, r.budget?.smallestTextPx),
        r.budget ? (r.within ? "yes" : "**no**") : "no budget",
      ]),
    );
    lines.push(
      "Each cell is measured / budget; the smallest text's budget is a floor. A screen size is within only when the clutter spec's own rule finds nothing (e2e/clutter-rule.ts), which also counts a drawn block with no region mark.",
      "",
    );
    const broken = c.rows.filter((r) => r.breaches.length > 0);
    for (const r of broken) lines.push(`- ${r.screen} at ${r.px} px: ${r.breaches.join("; ")}`);
    if (broken.length > 0) lines.push("");
  }

  lines.push("## Source health", "");
  const src = q.sources;
  if (!src) lines.push("Not counted in this run (`--clutter-only`).", "");
  else {
    lines.push(`${src.citations} citations as shown (each place a source is shown), on ${src.addresses} addresses (lib/engines/all-citations.ts).`, "");
    table(
      ["How it was checked", "Citations"],
      [
        ["read by a person", src.byCheck.person],
        ["read by an AI model, not by a person yet", src.byCheck.model],
        ["read, who read it not recorded", src.byCheck.read],
        ["checked by a tool only (the quoted words found on the page)", src.byCheck.tool],
      ],
    );
    lines.push(
      `- Oldest read or tool check on record: ${src.oldestCheck || "–"}. No age limit is set for a citation, so none is counted stale by age.`,
      `- Stale: ${src.stale.length} of the registry's ${src.cards} sources have a stated next release that has come (the amber "A newer … may be out." line)${src.stale.length ? `: ${src.stale.join("; ")}` : ""}.`,
      `- The registry's terms, by who read them: ${src.cardsByCheck.person} by a person, ${src.cardsByCheck.model} by an AI model, ${src.cardsByCheck.tool} by a tool, ${src.cardsByCheck["not-read"]} not read.`,
      `- Dead: ${src.dead.citations} citations on ${src.dead.addresses} addresses that answered page not found, left for a person (tests/fixtures/still-dead-pages.ts).`,
    );
    if (src.live) {
      const l = src.live;
      lines.push(
        `- The live quote check in this run (scripts/check-quotes.mjs, ${l.checkedOn}): ${l.pages} tool-checked citations; words found ${l.found}, words not found ${l.wordsMissing}, page not found ${l.notFound}, another answer ${l.otherAnswer}, no answer ${l.unreachable}, a PDF ${l.pdf}.`,
        ...l.problems.map((p) => `  - ${p}`),
      );
    } else {
      lines.push(
        "- No live quote check in this run. It reaches the government's pages, so CI never runs it; a builder can: `npm run quality:report -- --live`.",
      );
    }
    lines.push("");
  }
  return lines.join("\n");
}

/**
 * The one Quality line the release pull request adds under the version's heading in the CHANGELOG. Every number
 * says what it counts; a part this run didn't count says so, never a guess.
 */
export function qualityLine(q: QualityNumbers): string {
  const parts: string[] = [];
  const h = q.harness;
  if (h) {
    parts.push(
      `the idea harness passes ${h.passing} of ${h.ideas} invented ideas (${pct(h.passing, h.ideas)}; ${h.clean} with no known gap)`,
      `typed in, ${onGeneralRoad(h.typed)} of ${h.ideas} ideas end on the general road (“${generalRoadV2026.label}”, which any idea can reach) and ${h.typed["stops-before"]} ${verb(h.typed["stops-before"], "stops", "stop")} before any road is shown; ${h.typed["own-road"]} of the ${h.ownRoad} ideas with a road of their own written for them ${verb(h.typed["own-road"], "reaches", "reach")} it`,
      `${h.silentFallbacks.ideas} silent fallback${h.silentFallbacks.ideas === 1 ? "" : "s"}`,
    );
  } else parts.push("the idea harness not counted");
  const s = q.search;
  if (s) {
    parts.push(
      `the expected job is in the job search's first group for ${s.firstGroup} of ${s.withJob} ideas (any group ${s.anyGroup}, no job found ${s.noResults})`,
    );
  }
  const c = q.clutter;
  if (c) {
    const inside = c.rows.filter((r) => r.within).length;
    parts.push(`${inside} of ${c.rows.length} screen sizes within their clutter budget (375, 768 and 1280 px)`);
  } else parts.push("clutter not measured in this run");
  const src = q.sources;
  if (src) {
    parts.push(
      `sources: ${src.byCheck.person} citations read by a person, ${src.byCheck.model} by an AI model, ${src.byCheck.read} read with no record of who read them, ${src.byCheck.tool} checked by a tool only, ${src.stale.length} stale, ${src.dead.citations} on dead addresses`,
    );
  }
  return `- **Quality** (from the tests, nothing from people using DotAmi; scripts/quality-report.mjs, ${q.on}): ${parts.join("; ")}.`;
}
