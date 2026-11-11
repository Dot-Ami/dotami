/**
 * The browser tests' reader for a wage row's figures line (e2e/wage-line.ts), held here without a browser.
 *
 * *About this job* draws "Hourly · low $18.00 · median $23.00 · high $30.00" for a wage row, and since the
 * pre-release fix of 2026-10-23 ends the line " · low and median the same, as published" where two published
 * levels are the same amount. The reader was written before that ending existed and took everything after "high"
 * as the high figure, so on 2026-11-10 the browser idea sweep failed on the first idea it drew whose job has two
 * equal levels (a musician in Ontario, idea 156) with a screen that was right. These tests hold the mend:
 *
 * - a plain line, hourly or yearly, and a figure the file leaves empty, read as before;
 * - the note read as a note, and the old reading shown failing on the same line (the control);
 * - every figures line the screen draws from the shipped wage file, in every province and territory and in each of
 *   Alberta's regions, read back as the file's own figures with nothing wrong in its ending;
 * - a note the figures don't bear out, a note on figures that differ, and equal figures with no note, each caught.
 */
import { describe, expect, it } from "vitest";

import { wageBlock, wageFiguresLine, type WageBlock } from "@/lib/about-job/text";
import type { WageRowView } from "@/lib/about-job/types";
import { aboutJobForAnswers } from "@/lib/about-job/view";
import { aboutJobWords } from "@/lib/about-job/words";
import { jobGroupOf, oasisJobs } from "@/lib/engines/oasis/v2026";
import { ALBERTA_ECONOMIC_REGIONS } from "@/lib/engines/research-kit/v2026/economic-regions";
import { PROVINCES } from "@/lib/scenarios/types";

import {
  drawnFigure,
  readFiguresLine,
  sameLevelsNote,
  sameNoteProblems,
  shape,
  SLOT,
} from "../e2e/wage-line";

const w = aboutJobWords.wages;
const names = w.levelNames;
const lowAndMedian = w.sameAsPublished(`${names.low} ${w.and} ${names.median}`);
const medianAndHigh = w.sameAsPublished(`${names.median} ${w.and} ${names.high}`);
const allThree = w.sameAsPublished(`${names.low}, ${names.median} ${w.and} ${names.high}`);

/** A wage row as the panel holds one, with only the fields the figures line reads set to anything telling. */
const row = (
  basis: WageRowView["basis"],
  low: string | null,
  median: string | null,
  high: string | null,
): WageRowView => ({
  noc: "51122",
  geography: { code: "ER35", name: "Ontario" },
  sourceCode: "LFS 2023-24 PR NOC5",
  level: "province",
  provinceName: "Ontario",
  basis,
  low,
  median,
  high,
  period: "2023-2024",
  method: "Labour Force Survey",
  comment: "",
});

/** The file's text for a figure, in cents, as the browser reader's ledger holds it (e2e/about-job-read.ts). */
const centsOf = (text: string | null) => (text === null ? null : Math.round(Number(text) * 100));

// The musician's row in Ontario, as the wage file gave it on 2026-11-10: the line the sweep couldn't read.
const MUSICIAN = wageFiguresLine(row("annual", "37561", "37561", "63200"));

describe("a wage row's figures line, read back", () => {
  it("reads a plain line, hourly or yearly, and a figure the file leaves empty", () => {
    expect(readFiguresLine(w.hourly("$18.00", "$23.00", "$30.00"))).toEqual({
      per: "hour",
      figures: [1800, 2300, 3000],
      note: null,
    });
    expect(readFiguresLine(w.yearly("$41,000", "$58,500", "$84,000"))).toEqual({
      per: "year",
      figures: [4_100_000, 5_850_000, 8_400_000],
      note: null,
    });
    expect(readFiguresLine(w.hourly(w.figureNotPublished, "$23.00", w.figureNotPublished))).toEqual(
      { per: "hour", figures: [null, 2300, null], note: null },
    );
  });

  it("is no figures line for a label or a period line", () => {
    expect(readFiguresLine(w.levelProvince("Ontario"))).toBeNull();
    expect(readFiguresLine(w.period("2023-2024", "Labour Force Survey"))).toBeNull();
    expect(sameNoteProblems(w.period("2023-2024", "Labour Force Survey"))).toEqual([]);
  });

  it("reads a figure that isn't one amount as no number, so it can never pass for the file's", () => {
    expect(drawnFigure("$17.60")).toBe(1760);
    expect(drawnFigure(w.figureNotPublished)).toBeNull();
    expect(drawnFigure("$17.60 or so")).toBeNaN();
    expect(drawnFigure("$17.60 + $4.40")).toBeNaN();
  });

  it("reads the note as a note: the musician's line the browser sweep failed on", () => {
    expect(MUSICIAN.endsWith(` · ${lowAndMedian}`), MUSICIAN).toBe(true);
    expect(readFiguresLine(MUSICIAN)).toEqual({
      per: "year",
      figures: [3_756_100, 3_756_100, 6_320_000],
      note: lowAndMedian,
    });
    expect(sameNoteProblems(MUSICIAN)).toEqual([]);
  });

  it("the control: the reading before 2026-11-11 took the note for the high figure", () => {
    // The old pattern, as e2e/about-job-read.ts built it: the whole line against the words' shape, no note known.
    const old = shape(w.yearly(SLOT, SLOT, SLOT)).exec(MUSICIAN);
    expect(old?.[3]).toBe(`$63,200 · ${lowAndMedian}`);
    expect(drawnFigure(old![3])).toBeNaN();
    // The same capture on a line with no note is the figure itself, which is why the gap sat unseen.
    expect(
      drawnFigure(
        shape(w.yearly(SLOT, SLOT, SLOT)).exec(w.yearly("$41,000", "$58,500", "$84,000"))![3],
      ),
    ).toBe(8_400_000);
  });

  it("says which levels are the same, in the line's order, and nothing when none are", () => {
    expect(sameLevelsNote([1760, 1760, 2200])).toBe(lowAndMedian);
    expect(sameLevelsNote([1700, 2300, 2300])).toBe(medianAndHigh);
    expect(sameLevelsNote([1700, 1700, 1700])).toBe(allThree);
    expect(sameLevelsNote([1800, 2300, 3000])).toBeNull();
    // A figure the file leaves empty is the same as nothing, and neither is a figure that couldn't be read.
    expect(sameLevelsNote([null, 2300, null])).toBeNull();
    expect(sameLevelsNote([null, 2300, 2300])).toBe(medianAndHigh);
    expect(sameLevelsNote([Number.NaN, Number.NaN, 2300])).toBeNull();
  });

  it("agrees with the screen's own line on every mix of same and different levels", () => {
    const amounts = ["17", "17.6", "22", null] as const;
    let noted = 0;
    for (const low of amounts)
      for (const median of amounts)
        for (const high of amounts) {
          for (const basis of ["hourly", "annual"] as const) {
            const line = wageFiguresLine(row(basis, low, median, high));
            const read = readFiguresLine(line);
            expect(read, line).not.toBeNull();
            expect(read!.figures, line).toEqual([centsOf(low), centsOf(median), centsOf(high)]);
            expect(read!.per, line).toBe(basis === "annual" ? "year" : "hour");
            expect(sameNoteProblems(line), line).toEqual([]);
            if (read!.note !== null) noted += 1;
          }
        }
    // Two or three of the three published levels the same: the mixes that carry a note were met.
    expect(noted).toBeGreaterThan(0);
  });

  it("catches a note the figures don't bear out, a note on figures that differ, and equal figures with no note (controls)", () => {
    const equal = w.hourly("$17.60", "$17.60", "$22.00");
    const different = w.hourly("$18.00", "$23.00", "$30.00");
    expect(sameNoteProblems(`${equal} · ${lowAndMedian}`)).toEqual([]);
    expect(sameNoteProblems(`${equal} · ${medianAndHigh}`)).toEqual([
      `the line says “${medianAndHigh}”, where the figures drawn make it “${lowAndMedian}”`,
    ]);
    expect(sameNoteProblems(`${different} · ${lowAndMedian}`)).toEqual([
      `the line says “${lowAndMedian}”, but no two of the figures drawn are the same`,
    ]);
    expect(sameNoteProblems(equal)).toEqual([
      `two of the figures drawn are the same, and the line doesn't say “${lowAndMedian}”`,
    ]);
    // A note doesn't hide a figure that isn't one amount: the high still reads as no number.
    expect(
      readFiguresLine(`${w.hourly("$17.60", "$17.60", "$22.00 or so")} · ${lowAndMedian}`)
        ?.figures[2],
    ).toBeNaN();
  });
});

describe("every figures line the screen draws from the shipped wage file", () => {
  const blocksOf = (block: WageBlock | null): WageBlock[] =>
    block ? [block, ...blocksOf(block.then)] : [];

  it("is read back as the file's own figures, with nothing wrong in its ending", () => {
    // One job of each job group (the wage file is by group), in every province and territory with no region kept,
    // and in Alberta with each economic region as the person's own answer.
    const groups = new Map<string, string>();
    for (const job of oasisJobs)
      if (!groups.has(jobGroupOf(job.code))) groups.set(jobGroupOf(job.code), job.code);
    const places: { province: string; region: string | null }[] = [
      ...PROVINCES.map((province) => ({ province, region: null })),
      ...ALBERTA_ECONOMIC_REGIONS.map((region) => ({ province: "AB", region: region.code })),
    ];
    const wrong: string[] = [];
    let lines = 0;
    let noted = 0;
    for (const job of groups.values()) {
      for (const { province, region } of places) {
        const view = aboutJobForAnswers({ job, province, area: null, region });
        if (!view) continue;
        for (const block of blocksOf(wageBlock(view.wages.shown))) {
          if (!block.row) continue;
          const at = `${job} in ${province}${region ? ` (${region})` : ""}, row ${block.row.geography.code}`;
          const line = block.lines.find((l) => readFiguresLine(l) !== null);
          if (!line) {
            wrong.push(`${at}: no figures line among “${block.lines.join("” / “")}”`);
            continue;
          }
          const read = readFiguresLine(line)!;
          lines += 1;
          if (read.note !== null) noted += 1;
          const file = [centsOf(block.row.low), centsOf(block.row.median), centsOf(block.row.high)];
          if (!read.figures.every((figure, i) => Object.is(figure, file[i])))
            wrong.push(
              `${at}: read ${read.figures.join(", ")} from “${line}”, the file's ${file.join(", ")}`,
            );
          if (read.per !== (block.row.basis === "annual" ? "year" : "hour"))
            wrong.push(`${at}: read per ${read.per} from “${line}”, the file's ${block.row.basis}`);
          for (const problem of sameNoteProblems(line)) wrong.push(`${at}: ${problem}`);
        }
      }
    }
    // The receipt, printed so a pull request can quote it.
    console.log(
      `wage-line-read: ${lines} figures lines read back over ${groups.size} job groups, ${noted} of them ending with the note`,
    );
    expect(wrong.slice(0, 20)).toEqual([]);
    // A run that met no line, or no line with the note, would pass by reading nothing.
    expect(lines).toBeGreaterThan(1000);
    expect(noted).toBeGreaterThan(0);
  }, 120_000);
});
