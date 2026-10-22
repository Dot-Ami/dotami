/**
 * Official text quoted by source kind (task 29k, tests/helpers/official-quotes.ts): the government's
 * "Employment requirements" lines pass the no-times check, and the one line the spec allows passes the
 * verdict check, only when they stand in quote marks under the kind's label, as *About this job* draws them
 * (docs/ui-spec/cockpit/about-this-job.md, row 1). Each control is the same words written any other way:
 * without the label, without quote marks, or as a line of DotAmi's own. All of them are still caught.
 */
import { describe, expect, it } from "vitest";

import { labelledQuotes, QUOTED_SOURCE_KINDS, quotedRun, withoutLabelledQuotes } from "./helpers/official-quotes";
import { normaliseSpaces } from "./helpers/text-pieces";
import { findTimeWords } from "./helpers/time-words";
import { findVerdicts, OFFICIAL_QUOTE_ALLOWANCES } from "./helpers/verdict-words";

// The label the screen writes before the quote (about-this-job.md's words block, `rules.lead`).
const LABEL_63210 = "The government's words, quoted in full for job group 63210 Hairstylists and barbers:";
const LABEL_53200 = "The government's words, quoted in full for job group 53200 Athletes:";

// Lines of group 63210 as the NOC 2021 Version 1.0 elements file holds them (the copy of 2026-10-15, SHA-256
// 50c3e31a…bf32f, research 28f), with the file's sub-headings. Four of them hold a time.
const APPRENTICESHIP =
  "Completion of a one- or two-year hairstyling apprenticeship program or completion of a college or other program in hairstyling combined with on-the-job training is usually required.";
const SEVERAL_YEARS = "Several years of experience may replace formal education and training.";
const BARBER = "Completion of a seven-month to one-year apprenticeship or other barber program is usually required.";
const LINES_63210 = [
  { subheading: "Hairstylists" },
  "Completion of secondary school education is required.",
  APPRENTICESHIP,
  SEVERAL_YEARS,
  { subheading: "Barbers" },
  "Completion of secondary school education is required.",
  BARBER,
] as const;
const ATHLETES = "A background combining athletic training and college or university studies is strongly recommended.";

describe("the government's requirement lines, quoted under their label", () => {
  it("each line with a time is caught on its own: the allowance is what lets it through", () => {
    for (const line of [APPRENTICESHIP, SEVERAL_YEARS, BARBER]) expect(findTimeWords(line), line).not.toEqual([]);
  });

  it("pass the no-times check as the screen draws them: the label, then each line inside quote marks", () => {
    expect(findTimeWords(quotedRun(LABEL_63210, LINES_63210))).toEqual([]);
    // As the browser sweep reads a screen: each block on its own line, joined with its block mark.
    const asTheSweepReads = [LABEL_63210, ...LINES_63210.map((l) => (typeof l === "string" ? `“${l}”` : l.subheading))].join(" ¶ ");
    expect(findTimeWords(asTheSweepReads)).toEqual([]);
    // And as a panel's innerText gives it, a line break between blocks.
    expect(findTimeWords([LABEL_63210, `“${APPRENTICESHIP}”`, `“${SEVERAL_YEARS}”`].join("\n"))).toEqual([]);
  });

  it("lifts only the quoted lines: the label and the sub-headings are still read as DotAmi's words", () => {
    const rest = withoutLabelledQuotes(quotedRun(LABEL_63210, LINES_63210));
    expect(rest).toContain(normaliseSpaces(LABEL_63210));
    expect(rest).toContain("Hairstylists");
    expect(rest).toContain("Barbers");
    expect(rest).not.toContain("apprenticeship");
    expect(labelledQuotes(normaliseSpaces(quotedRun(LABEL_63210, LINES_63210)))).toHaveLength(5);
  });

  it("control: the same line as DotAmi's own words, with no quote marks, is caught", () => {
    expect(findTimeWords(`${LABEL_63210} ${APPRENTICESHIP}`)).not.toEqual([]);
    expect(findTimeWords(`To work as a hairstylist: ${APPRENTICESHIP}`)).not.toEqual([]);
  });

  it("control: the same line in quote marks with no label, or under a label that isn't the kind's, is caught", () => {
    expect(findTimeWords(`“${APPRENTICESHIP}”`)).not.toEqual([]);
    expect(findTimeWords(`What it takes: “${APPRENTICESHIP}”`)).not.toEqual([]);
    // A label that names no job group isn't the kind's label.
    expect(findTimeWords(`The government's words: “${APPRENTICESHIP}”`)).not.toEqual([]);
    expect(findTimeWords(`DotAmi's words, quoted in full for job group 63210 Hairstylists and barbers: “${APPRENTICESHIP}”`)).not.toEqual([]);
  });

  it("control: DotAmi's own sentence after the quote, or between two quoted lines, is caught and ends the run", () => {
    const after = `${quotedRun(LABEL_63210, [APPRENTICESHIP])} Most people finish in two years.`;
    expect(findTimeWords(after)).toHaveLength(1);
    // A sentence of DotAmi's own breaks the run: the quoted line after it no longer stands under the label.
    const between = `${quotedRun(LABEL_63210, [APPRENTICESHIP])} It is the quickest way in. “${SEVERAL_YEARS}”`;
    const found = findTimeWords(between);
    expect(found.some((f) => f.startsWith("fastest"))).toBe(true);
    expect(found.some((f) => f.includes("Several years"))).toBe(true);
  });
});

describe("the verdict check over quoted requirement lines", () => {
  const allowance = OFFICIAL_QUOTE_ALLOWANCES.find((a) => a.text === ATHLETES)!;

  it("holds the one line the spec allows (group 53200), bound to the requirement lines' kind", () => {
    expect(allowance.sourceKind).toBe("noc-employment-requirements");
    expect(QUOTED_SOURCE_KINDS.map((k) => k.id)).toContain(allowance.sourceKind);
    expect(findVerdicts(ATHLETES)).not.toEqual([]);
  });

  it("passes it in quote marks under its label, as About this job draws it", () => {
    expect(findVerdicts(quotedRun(LABEL_53200, ["Extensive training under the supervision of a coach is required.", ATHLETES]))).toEqual([]);
  });

  it("control: the same line in quote marks without the label is caught (a source-kind allowance is narrower than a citation's)", () => {
    expect(findVerdicts(`“${ATHLETES}”`)).toHaveLength(1);
    expect(findVerdicts(`Sources: “${ATHLETES}”`)).toHaveLength(1);
  });

  it("control: the same line unquoted, as DotAmi's own words, is caught", () => {
    expect(findVerdicts(`${LABEL_53200} ${ATHLETES}`)).toHaveLength(1);
  });

  it("control: the label lets no other verdict through, quoted or not", () => {
    // A quoted line the allowance doesn't name, inside the run.
    expect(findVerdicts(quotedRun(LABEL_53200, ["This job is highly recommended for you."]))).not.toEqual([]);
    // DotAmi's own advice after the run.
    expect(findVerdicts(`${quotedRun(LABEL_53200, [ATHLETES])} We recommend this road.`)).toHaveLength(1);
  });
});
