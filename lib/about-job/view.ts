import { nocGroup, nocRequirements, NOC_ATTRIBUTION, NOC_URL } from "@/lib/engines/noc/v2021";
import { jobGroupOf, oasisJobByCode, oasisJobs } from "@/lib/engines/oasis/v2026";
import { regionNameOnScreen, type RegionPicked } from "@/lib/engines/research-kit/v2026/economic-regions";
import { SOURCES } from "@/lib/engines/research-kit/v2026/registry";
import { createWageLookup, wages as shippedWages, type WageLookup, type WageRow } from "@/lib/engines/wages/v2026";

import { aboutJobLinksFor } from "./links";
import type { AboutJobView, RuleEntry, WageContext, WageRowLevel, WageRowView, WageShown } from "./types";

/**
 * *About this job* for the person's picked job (docs/ui-spec/cockpit/about-this-job.md; task 25h), built on the
 * server: it reads Statistics Canada's NOC 2021 requirement lines and Job Bank's wage file, the two 2 MB modules
 * that must never reach the browser (nothing under "use client" imports this file; tests/about-job.spec.ts
 * walks the imports to hold that). What it hands back is the files' own words and rows, picked by the person's
 * own answers (their job, their idea's province, their region when they gave one), and nothing worked out
 * about them: no region from their area, no row from a neighbour, no wage turned into anything else.
 */

/**
 * The day the shipped copy of the elements file was fetched (data/noc-2021-v1.0/README.md: the copy of
 * 2026-10-15 research note 28f measured), which the requirements' source line names.
 */
export const NOC_ELEMENTS_READ_ON = "2026-10-15";

/** The app's province values that the wage file spells its own way ("YK", "NWT", "PEI"); the rest are the same. */
const WAGE_FILE_PROVINCE: Readonly<Record<string, string>> = { PE: "PEI", YT: "YK", NT: "NWT" };

/** The wage file's code for one of the app's province values ("AB" → "AB", "YT" → "YK"). */
export function wageFileProvince(province: string): string {
  return WAGE_FILE_PROVINCE[province] ?? province;
}

// A sub-heading within a group's lines (*Hairstylists*, *Barbers* in 63210): the file doesn't mark them, so a
// line is read as one only when it is short, ends with no sentence punctuation and says nothing (no "require",
// "must", "may", "is" …). Four lines of the file end with no full stop but are sentences ("Dental assistants
// require completion of…"); the verbs keep them lines. tests/about-job.spec.ts lists the result for every group.
const SENTENCE_END = /[.:;!?)"”]$/;
const SAYS_SOMETHING = /\b(?:require[sd]?|must|may|is|are|can|will|has|have)\b/i;

/** Whether a requirement line is a sub-heading within its group rather than a line of text. */
export function isRequirementSubheading(line: string): boolean {
  const text = line.trim();
  return text !== "" && !SENTENCE_END.test(text) && !SAYS_SOMETHING.test(text) && text.split(/\s+/).length <= 12;
}

/** The group's "Employment requirements" as the panel draws them, in the file's order, word for word (ends trimmed). */
export function requirementEntries(code: string): RuleEntry[] {
  return nocRequirements(code).map((line) =>
    isRequirementSubheading(line) ? { kind: "subheading", text: line.trim() } : { kind: "line", text: line.trim() },
  );
}

type WageLookups = ReturnType<typeof createWageLookup>;

/** The level a row's source code gives it: the engine's reading, with `SAE … ER` told apart as a small-area estimate. */
function levelOf(row: WageRow): WageRowLevel {
  const tokens = row.sourceCode.trim().split(/\s+/);
  switch (row.level) {
    case "economic-region":
      return tokens.includes("SAE") ? "small-area" : "economic-region";
    case "national":
      return "canada";
    default:
      return row.level;
  }
}

/** A row of the file as the panel shows it. */
function rowView(row: WageRow, lookups: WageLookups): WageRowView {
  const wholeCode = lookups.wholeProvinceCode(row.geography.province);
  const provinceName = (wholeCode ? lookups.geographyName(wholeCode) : undefined) ?? row.geography.name;
  return {
    noc: row.noc,
    geography: { code: row.geography.code, name: regionNameOnScreen(row.geography.name) },
    sourceCode: row.sourceCode,
    level: levelOf(row),
    provinceName: regionNameOnScreen(provinceName),
    basis: row.basis,
    low: row.low,
    median: row.median,
    high: row.high,
    period: row.referencePeriod,
    method: row.method,
    comment: row.comment,
  };
}

/** Which row a "not published" note points to, by its own words: the province's, Canada's, or none it names. */
function pointedRow(row: WageRow, lookups: WageLookups): WageLookup | null {
  if (/\bat the provincial level\b/i.test(row.comment)) return lookups.forProvince(row.noc, row.geography.province);
  if (/\bat the national level\b/i.test(row.comment)) return lookups.forCanada(row.noc);
  return null;
}

/**
 * What the wage row shows for a look-up: the row with its figures, or the "not published" row with its note and
 * the row the note points to (never a silent fallback), or that the file has no row. A province's figure shown
 * under a region says so.
 */
function wageShown(found: WageLookup, place: string, lookups: WageLookups, depth = 0): WageShown {
  if (!found.found) return { kind: "missing", noc: found.noc, place };
  const row = found.row;
  const view = rowView(row, lookups);
  if (row.level === "not-published") {
    const next = pointedRow(row, lookups);
    // A note that points back at the row itself (a province's own row "at the provincial level") points nowhere
    // new; nor does a row already reached through a note (one step only).
    const pointsTo =
      depth === 0 && next && !(next.found && next.row.geography.code === row.geography.code)
        ? wageShown(next, next.found ? regionNameOnScreen(next.row.geography.name) : place, lookups, depth + 1)
        : null;
    // The note shows only when it names the level to look at; one that names none shows nothing but the line.
    return { kind: "not-published", row: view, note: next ? row.comment.trim() : null, pointsTo };
  }
  const shownUnder = row.geography.kind === "economic-region" && view.level === "province" ? view.geography.name : null;
  return { kind: "row", row: view, shownUnder };
}

export interface AboutJobInput {
  /** The person's pick of job, as kept on the idea (`Venture.occupationCode`, "72311.00"). */
  jobCode: string;
  /** The idea's province or territory, as the app keeps it ("AB", "YT"). */
  province: string;
  /**
   * The person's own answer to "Which region are you in?" (`regionThePersonPicked`); "not-picked" while the idea
   * keeps none. Only ever their answer: never worked out from their area.
   */
  region: RegionPicked;
  /** The person's area as they picked it, for the business-counts row's "Your area" line; null when none is kept. */
  area: string | null;
}

/**
 * *About this job* for a saved future as GET /api/futures/<id> reads it: its picked job, its province, and the
 * region and area the person gave. Null while no job is picked (the panel isn't offered then), or when the
 * future's place isn't a province or territory DotAmi knows.
 *
 * The region and the area are not kept on the idea yet: their columns (`Venture.economicRegion`,
 * `Venture.landscapeArea`) come with Pick a future's step 2 (docs/ui-spec/futures/02-where-you-are.md, its own
 * pull request). Until then the route passes `kept` as null, which reads as "Your region isn't picked." and the
 * province's own row, as the spec says for no answer; wiring the column in is one line in the route.
 */
export function aboutJobForFuture(
  future: { job: { code: string } | null; place: string | null },
  kept: { region: RegionPicked; area: string | null } | null,
): AboutJobView | null {
  if (!future.job || !future.place?.startsWith("CA-")) return null;
  return aboutThisJob({
    jobCode: future.job.code,
    province: future.place.slice(3),
    region: kept?.region ?? { kind: "not-picked" },
    area: kept?.area ?? null,
  });
}

/**
 * *About this job* for one idea, or null when the job isn't on the government's list (a hand-edited data file).
 * `lookups` is the committed wage file's, or a planted file's in a test.
 */
export function aboutThisJob(input: AboutJobInput, lookups: WageLookups = shippedWages): AboutJobView | null {
  const job = oasisJobByCode(input.jobCode);
  if (!job) return null;
  const groupCode = jobGroupOf(job.code);
  const group = nocGroup(groupCode) ?? null;
  const fileProvince = wageFileProvince(input.province);
  const wholeCode = lookups.wholeProvinceCode(fileProvince);
  const placeName = regionNameOnScreen((wholeCode ? lookups.geographyName(wholeCode) : undefined) ?? input.province);

  // Which row: in Alberta, the person's region when they picked one, else the province's own row; elsewhere no
  // region is asked (the maintainer's call 2 of 2026-10-21), so it is always the province's or territory's row.
  let context: WageContext;
  let found: WageLookup;
  let shownPlace = placeName;
  if (input.province !== "AB") {
    context = { kind: "outside-alberta", place: placeName };
    found = lookups.forProvince(groupCode, fileProvince);
  } else if (input.region.kind === "region") {
    const region = regionNameOnScreen(input.region.region.name);
    context = { kind: "region", region };
    found = lookups.forRegion(groupCode, input.region.region.code);
    shownPlace = region;
  } else {
    // "I don't know", nothing kept, or something kept that isn't one of Alberta's regions: the province's own row.
    context = input.region.kind === "dont-know" ? { kind: "dont-know" } : { kind: "not-picked" };
    found = lookups.forProvince(groupCode, fileProvince);
  }

  const wageCard = SOURCES.find((card) => card.id === "job-bank-wages");
  return {
    job: { code: job.code, label: job.label },
    group,
    rules: {
      entries: group ? requirementEntries(group.code) : [],
      groupHoldsOthers: oasisJobs.filter((j) => jobGroupOf(j.code) === groupCode).length > 1,
      readOn: NOC_ELEMENTS_READ_ON,
      licence: NOC_ATTRIBUTION,
      sourceUrl: NOC_URL,
    },
    wages: { context, shown: wageShown(found, shownPlace, lookups), credit: wageCard?.creditLine ?? "" },
    area: input.area,
    links: { pages: aboutJobLinksFor(input.province), tradesecretsLeftOutFor: input.province === "AB" ? null : placeName },
  };
}
