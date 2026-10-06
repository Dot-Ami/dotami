/**
 * [8c] Drop a file — CSV text → rows of cells.
 *
 * Every cell stays text exactly as written ("" when empty): reading a date or an amount is the job
 * of dates.ts / amounts.ts, which need to see the original characters ("03/01/2026", "1 234,56").
 * Runs in the browser; nothing is kept and nothing is logged.
 */

import Papa from "papaparse";
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
  return Papa.parse(sample, { delimitersToGuess: DELIMITERS, preview: 50 }).meta.delimiter;
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
