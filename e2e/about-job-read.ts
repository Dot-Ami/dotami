/**
 * *About this job* (task 25h; docs/ui-spec/cockpit/about-this-job.md) read in a real browser through the same
 * gate checks the idea harness holds every screen to, so the browser idea sweep (e2e/idea-sweep.spec.ts) and
 * e2e/about-this-job.spec.ts read the open panel the same way:
 *
 * - no verdict anywhere in it (tests/helpers/verdict-words.ts `findVerdicts`, with its labelled-quote allowance);
 * - no time words in DotAmi's words (tests/helpers/time-words.ts `findTimeWords`): the government's requirement
 *   lines are lifted only on the rules row, only in their labelled quote, and only lines the shipped file holds
 *   for the job group the run picked (tests/helpers/official-quotes.ts); a line in quote marks anywhere else, or
 *   one the file doesn't hold, is read as DotAmi's;
 * - every dollar figure a published job fact (tests/helpers/number-provenance.ts, the "published-job-fact" kind):
 *   each wage block the panel draws (`data-wage-row`, the row's geography code) is read back as a row (its label's
 *   level, its figures, its period) and must be the wage file's own row for that job group and code, with the
 *   level its source code gives; its figures count only there. A figure anywhere else in the panel, a sum of two
 *   figures, a figure that isn't the file's, or a row labelled with another level is named.
 *
 * Each finding is a line like "verdict: …", "time (rules): …", "amount: …" or "wage row ER48: …".
 */
import path from "node:path";

import type { PrismaClient } from "@prisma/client";
import { expect, type Locator, type Page } from "@playwright/test";

import { aboutJobWords } from "../lib/about-job/words";
import { createDatabaseClient } from "../lib/db/client";
import { nocRequirements } from "../lib/engines/noc/v2021";
import { wages } from "../lib/engines/wages/v2026";
import { wageData } from "../lib/engines/wages/v2026/data";
import {
  amountsIn,
  uncitedAmounts,
  wageLevelOf,
  wageRowProblems,
  type AmountPiece,
  type PublishedWageRow,
  type WageLevel,
} from "../tests/helpers/number-provenance";
import { REQUIREMENT_LINES_PLACE } from "../tests/helpers/official-quotes";
import { findTimeWords } from "../tests/helpers/time-words";
import { findVerdicts } from "../tests/helpers/verdict-words";

export const ABOUT_JOB = aboutJobWords.region;
export const aboutJobPanel = (page: Page) => page.getByRole("region", { name: ABOUT_JOB });

// --- Saving an invented idea on a written road (the about-this-job spec and the sweep's control).

/** The run's own data file, to put an idea on a written road the way Pick a future does. */
async function withE2eDb<T>(fn: (db: PrismaClient) => Promise<T>): Promise<T> {
  const file = path.join(process.cwd(), "prisma", "e2e", "dotami.db").split(path.sep).join("/");
  const db = createDatabaseClient({ url: `file:${file}` });
  try {
    return await fn(db);
  } finally {
    await db.$disconnect();
  }
}

/** An invented idea, saved the way the intake saves one, on a written future; returns the cockpit's address. */
export async function saveIdea(
  page: Page,
  name: string,
  province: "AB" | "ON",
  roadId: string,
): Promise<string> {
  const scenario = {
    id: `about-job-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    profile: {
      name,
      type: "service",
      province,
      targetRevenueY1: 20_000,
      targetRevenueY3: 0,
      structure: "sole-prop",
      structureSource: "assumed",
      employmentStatus: "employee",
      hireFirst: false,
      activityTags: ["Trades"],
      stage: "idea",
    },
    state: {
      activeBranches: {
        gstTiming: "stage-2a-voluntary-gst-registration",
        incorporationTiming: "stage-3a-incorporation-80k-net",
      },
    },
  };
  const saved = await page.request.post("/api/scenario/save", { data: { scenario } });
  expect(saved.ok()).toBe(true);
  const { ventureId } = (await saved.json()) as { ventureId: string };
  // The road, as Pick a future keeps it, so the cockpit opens on it (as e2e/landscape.spec.ts does).
  await withE2eDb((db) =>
    db.venture.update({ where: { id: ventureId }, data: { roadId, roadChosenAt: new Date() } }),
  );
  return `/cockpit?venture=${ventureId}`;
}

// --- The wage file's rows, as the gate's ledger holds them.

const centsOf = (text: string | null) => (text === null ? null : Math.round(Number(text) * 100));

/**
 * The wage file's own row for a job group at one geography code (the panel's `data-wage-row`: "ER4830" a region,
 * "ER48" a province as a whole, "ER00" Canada), as a published wage row: its source code, the level that code
 * gives, its period, its figures. Null when the file has no row there, or the row publishes no figures.
 */
export function fileWageRow(noc: string, code: string): PublishedWageRow | null {
  let found;
  if (code === "ER00") found = wages.forCanada(noc);
  else if (/^ER\d{4}$/.test(code)) found = wages.forRegion(noc, code);
  else {
    const province = wageData.wholeProvince.find(([, whole]) => whole === code)?.[0];
    if (!province) return null;
    found = wages.forProvince(noc, province);
  }
  if (!found.found || found.row.geography.code !== code) return null;
  const level = wageLevelOf(found.row.sourceCode);
  if (level === null) return null;
  return {
    noc,
    regionCode: code,
    sourceCode: found.row.sourceCode,
    level,
    period: found.row.referencePeriod,
    per: found.row.basis === "annual" ? "year" : "hour",
    lowCents: centsOf(found.row.low),
    medianCents: centsOf(found.row.median),
    highCents: centsOf(found.row.high),
  };
}

// --- Reading a drawn wage block back as a row, by the words' own shapes.

const SLOT = "\u0001";
const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
/** A words function's sentence as a pattern, each argument a capture. */
const shape = (sentence: string) => new RegExp(`^${escape(sentence).split(SLOT).join("(.+?)")}$`);
const w = aboutJobWords.wages;

/** The label's shape for each level, the fixed ones first ("Canada-wide figure" also fits the province's shape). */
const LEVEL_LABELS: readonly (readonly [WageLevel, RegExp])[] = [
  ["canada", shape(w.levelCanada)],
  ["not-stated", shape(w.levelNotStated)],
  ["economic-region", shape(w.levelRegion(SLOT))],
  ["small-area", shape(w.levelSmallArea(SLOT))],
  ["province", shape(w.levelProvince(SLOT))],
];
const FIGURES = [
  ["hour", shape(w.hourly(SLOT, SLOT, SLOT))],
  ["year", shape(w.yearly(SLOT, SLOT, SLOT))],
] as const;
const PERIODS = [shape(w.period(SLOT, SLOT)), shape(w.periodOnly(SLOT))];

/** A figure as drawn: null for "not published", its cents for one amount, NaN for anything else. */
function drawnFigure(text: string): number | null {
  if (text.trim() === w.figureNotPublished) return null;
  const amounts = amountsIn(text);
  return amounts.length === 1 && amounts[0].written === text.trim() ? amounts[0].cents : Number.NaN;
}

/**
 * A wage block as the screen draws it, read back into a row: the level its label says, the figures and the
 * period its lines say. The source code isn't drawn, so it is the file's row's at the same code: the level the
 * label says must be the one that code gives.
 */
function drawnWageRow(
  noc: string,
  code: string,
  lines: readonly string[],
  sourceCode: string,
): PublishedWageRow {
  const level = LEVEL_LABELS.find(([, re]) => re.test(lines[0] ?? ""))?.[0];
  let per: PublishedWageRow["per"] = "hour";
  let figures: (number | null)[] = [Number.NaN, Number.NaN, Number.NaN];
  for (const line of lines) {
    for (const [basis, re] of FIGURES) {
      const m = re.exec(line);
      if (m) {
        per = basis;
        figures = [drawnFigure(m[1]), drawnFigure(m[2]), drawnFigure(m[3])];
      }
    }
  }
  let period = "";
  for (const line of lines) {
    const m = PERIODS.map((re) => re.exec(line)).find((x) => x !== null);
    if (m && period === "") period = m[1];
  }
  return {
    noc,
    regionCode: code,
    sourceCode,
    // A label in no level's shape says no level the code could give.
    level: level ?? ("no level" as unknown as WageLevel),
    period,
    per,
    lowCents: figures[0],
    medianCents: figures[1],
    highCents: figures[2],
  };
}

const ROW_FIELDS = [
  "noc",
  "regionCode",
  "sourceCode",
  "level",
  "period",
  "per",
  "lowCents",
  "medianCents",
  "highCents",
] as const;

// --- Reading the open panel.

type RowId = "rules" | "wages" | "counts" | "links";
interface DrawnPanel {
  /** Each row's text as a person sees it. */
  rows: Record<RowId, string>;
  /** The kicker, the heading and the footer: every text in the panel outside its four rows. */
  around: string;
  /** Each wage block that shows a row's figures: its code, its own lines, and all its own text. */
  blocks: { code: string; lines: string[]; text: string }[];
  /** Every text in the panel outside those blocks. */
  rest: string;
}

/** Block ends as the sweep marks them, so two blocks never read as one phrase. */
const pieces = (text: string) => text.replace(/\r?\n+/g, " ¶ ");

/**
 * What the gate checks find in the open *About this job* panel. `at` names the screen for the findings' places
 * (the harness's `where`: the rules row is "<at> › about this job › rules"), `group` the five-digit job group
 * of the job the run picked: only that group's lines, as the shipped file holds them, are lifted. `root` is the
 * panel by default; on Pick a future's no-road block (task 28c) it is the slot the same rows are drawn in.
 */
export async function readAboutJob(page: Page, at: string, group: string, root: Locator = aboutJobPanel(page)): Promise<string[]> {
  const panel = root;
  await expect(panel).toBeVisible();
  const drawn: DrawnPanel = await panel.evaluate((el) => {
    const textNodes = (keep: (node: Text) => boolean) => {
      const out: string[] = [];
      const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      for (let node = walk.nextNode(); node; node = walk.nextNode()) {
        const text = node.textContent ?? "";
        if (text.trim() !== "" && keep(node as Text)) out.push(text);
      }
      return out.join(" ¶ ");
    };
    const rowOf = (id: string) => el.querySelector<HTMLElement>(`[data-about-row="${id}"]`);
    const rows = { rules: "", wages: "", counts: "", links: "" };
    for (const id of Object.keys(rows) as (keyof typeof rows)[])
      rows[id] = rowOf(id)?.innerText ?? "";
    const blocks = [...el.querySelectorAll<HTMLElement>("[data-wage-row]")].map((block) => ({
      code: block.getAttribute("data-wage-row") ?? "",
      lines: [...block.children].filter((c) => c.tagName === "P").map((p) => p.textContent ?? ""),
      text: textNodes((node) => node.parentElement?.closest("[data-wage-row]") === block),
    }));
    return {
      rows,
      around: textNodes((node) => !node.parentElement?.closest("[data-about-row]")),
      blocks,
      rest: textNodes((node) => !node.parentElement?.closest("[data-wage-row]")),
    };
  });

  const found: string[] = [];
  // 1. No verdict anywhere in it.
  for (const v of findVerdicts(pieces(await panel.innerText()))) found.push(`verdict: ${v}`);

  // 2. No time words in DotAmi's words: the rules row's labelled quote lifted only there, only the file's lines.
  const read = [
    { kind: "noc-employment-requirements" as const, group, lines: nocRequirements(group) },
  ];
  for (const t of findTimeWords(pieces(drawn.rows.rules), [], {
    where: `${at} › ${REQUIREMENT_LINES_PLACE}`,
    read,
  }))
    found.push(`time (rules): ${t}`);
  for (const part of ["wages", "counts", "links"] as const)
    for (const t of findTimeWords(pieces(drawn.rows[part]))) found.push(`time (${part}): ${t}`);
  for (const t of findTimeWords(drawn.around)) found.push(`time (around the rows): ${t}`);

  // 3. Every figure a published job fact: only on its own wage block, only the file's own row, rightly labelled.
  const fileRows: PublishedWageRow[] = [];
  const amountPieces: AmountPiece[] = [];
  for (const block of drawn.blocks) {
    const where = `${at} › about this job › wages › ${block.code}`;
    const file = fileWageRow(group, block.code);
    if (!file) {
      found.push(
        `wage row ${block.code}: the wage file has no published row for job group ${group} there`,
      );
      amountPieces.push({ where, text: block.text });
      continue;
    }
    fileRows.push(file);
    const shown = drawnWageRow(group, block.code, block.lines, file.sourceCode);
    for (const problem of wageRowProblems(shown)) found.push(`wage row ${block.code}: ${problem}`);
    for (const field of ROW_FIELDS) {
      if (!Object.is(shown[field], file[field]))
        found.push(
          `wage row ${block.code}: drawn ${field} ${String(shown[field])}, the file's ${String(file[field])}`,
        );
    }
    amountPieces.push({ where, text: block.text, wageRow: shown });
  }
  amountPieces.push({ where: `${at} › about this job › outside the wage rows`, text: drawn.rest });
  const ledger = {
    officialFees: [],
    yours: [],
    quotedThresholds: [],
    addable: [],
    publishedWageRows: fileRows,
  };
  for (const u of uncitedAmounts(amountPieces, ledger)) found.push(`amount: ${u}`);
  return found;
}
