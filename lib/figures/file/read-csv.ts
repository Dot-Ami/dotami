/**
 * [8c] Drop a file — CSV text → rows of cells.
 *
 * Every cell stays text exactly as written ("" when empty): reading a date or an amount is the job
 * of dates.ts / amounts.ts, which need to see the original characters ("03/01/2026", "1 234,56").
 * Runs in the browser; nothing is kept and nothing is logged.
 */

import Papa from "papaparse";
import { cellToCents } from "./amounts";
import type { ReadResult } from "./types";

// Commas, semicolons (French and most European Excel), tabs and pipes.
const DELIMITERS = [",", ";", "\t", "|"];

/**
 * Which of DELIMITERS the file uses. Papa can guess this itself, but its guess counts blank lines
 * (including the empty row a trailing newline makes) as one-field rows, which drags a small file's
 * average below the two columns it needs to be convinced — "date;amount" with two rows came back
 * as one column. So guess from the first lines that aren't blank. A file with one column has no
 * delimiter to find; Papa then falls back to a comma, which gives one column, as it should.
 */
function guessDelimiter(text: string): string {
  const sample = text
    .split(/\r\n|\r|\n/)
    .filter((line) => line.trim() !== "")
    .slice(0, 50)
    .join("\n");
  if (semicolonsAroundCommaAmounts(sample)) return ";";
  return Papa.parse(sample, { delimitersToGuess: DELIMITERS, preview: 50 }).meta.delimiter;
}

/**
 * A cell holding an amount written with a decimal comma: "1 000,00", "-12,50", "100,0",
 * "1 000,00 $", or a percentage like "12,5 %". A cell holding a tab is never one: cellToCents
 * trims the tab away, so a tab file's "Vu;\t1 000,00" would otherwise pass for a semicolon line.
 */
function isCommaAmount(cell: string): boolean {
  return (
    cell.includes(",") &&
    !cell.includes("\t") &&
    cellToCents(cell.replace(/\s*%$/, ""), "comma") !== null
  );
}

/**
 * True when the sample is a semicolon file whose commas all sit inside amounts. French and most
 * European Excel save a CSV with semicolons because the comma is their decimal mark, but Papa
 * counts every comma as a possible delimiter: with several amount columns on a line
 * ("14-07-2026;1001;Design;1;1 000,00;0,00;1 000,00;100,0") the commas can look like the more
 * regular split and win the guess, which cuts every line into pieces (Sage 50 Canadian in French;
 * docs/connectors/practice-files.md).
 *
 * So read the sample on its semicolons first. When at least two lines split into two or more cells,
 * and the cells holding a comma on those lines are mostly amounts, the commas are decimal marks and
 * the file is a semicolon file. A line that doesn't split (a title, a customer's name) has no say.
 *
 * "Mostly" means at least twice as many amount cells as cells with a comma in text. French item
 * descriptions often hold a comma ("Design, impressions"), and one of them used to hand the file
 * back to Papa, which split it on its commas again. A comma file with a stray semicolon doesn't get
 * there: the semicolon cuts a line like "2026-01-05,Hosting;2,30" into one amount-looking piece and
 * one piece of comma-separated text, which is one of each, not two to one.
 */
function semicolonsAroundCommaAmounts(sample: string): boolean {
  const lines = Papa.parse<string[]>(sample, { delimiter: ";", preview: 50 }).data;
  let splitLines = 0;
  let amounts = 0;
  let textCommas = 0;
  for (const cells of lines) {
    if (cells.length < 2) continue;
    splitLines += 1;
    for (const cell of cells) {
      if (!cell.includes(",")) continue;
      if (isCommaAmount(cell)) amounts += 1;
      else textCommas += 1;
    }
  }
  return splitLines >= 2 && amounts > 0 && amounts >= 2 * textCommas;
}

export function readCsv(text: string, name: string): ReadResult {
  const parsed = Papa.parse<string[]>(text, {
    delimiter: guessDelimiter(text),
    // Keep blank lines so that rows[i] stays line i + 1 and "row 14" points at the right place.
    skipEmptyLines: false,
    dynamicTyping: false,
    header: false,
  });

  // A quote that doesn't close swallows the rest of the file into one cell, so there is nothing
  // trustworthy to read. Say where it starts rather than hand back a mangled sheet.
  const quoteError = parsed.errors.find((e) => e.type === "Quotes");
  if (quoteError) {
    const row = (quoteError.row ?? 0) + 1;
    return {
      ok: false,
      error: `Row ${row} has a quote that isn't closed, so DotAmi can't tell where that cell ends. Fix it in the file and drop it again.`,
    };
  }

  const rows = parsed.data;

  // A trailing line break makes Papa add one empty row after the last line. Drop that one and only
  // that one: any other blank row is the person's own and keeps its place in the numbering.
  if (rows.length > 0 && /[\r\n]$/.test(text)) {
    const last = rows[rows.length - 1];
    if (last.length === 1 && last[0] === "") rows.pop();
  }

  // Nothing at all, or nothing but blank lines.
  if (rows.every((row) => row.every((cell) => cell === ""))) {
    return { ok: false, error: "That file has no rows." };
  }

  return { ok: true, format: "csv", sheets: [{ name, rows }] };
}
