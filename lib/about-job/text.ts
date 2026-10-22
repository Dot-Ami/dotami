import type { AboutJobView, WageContext, WageRowView, WageShown } from "./types";
import { aboutJobWords as words } from "./words";

/**
 * The text *About this job* draws, worked out from its data (./types.ts) and its words (./words.ts) in one
 * place, so the panel and the tests that read it say the same thing. Plain functions, no data module: the
 * browser can use them.
 */

/**
 * A figure as the file writes it, in dollars: "19.23" → "$19.23", "18" → "$18.00" an hour; "84000" → "$84,000" a
 * year. Only the file's own digits: thousands get a comma and an hourly figure its two places, nothing rounded.
 */
export function wageAmount(text: string, basis: WageRowView["basis"]): string {
  const [whole, cents = ""] = text.trim().split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const places = cents === "" ? (basis === "hourly" ? "00" : "") : cents.padEnd(2, "0");
  return `$${grouped}${places === "" ? "" : `.${places}`}`;
}

/** A row's label: the level its own source code gives (never its region's name), with the place it names. */
export function wageLevelLabel(row: WageRowView): string {
  switch (row.level) {
    case "economic-region":
      return words.wages.levelRegion(row.geography.name);
    case "small-area":
      return words.wages.levelSmallArea(row.geography.name);
    case "province":
      return words.wages.levelProvince(row.provinceName);
    case "canada":
      return words.wages.levelCanada;
    case "not-stated":
      return words.wages.levelNotStated;
    case "not-published":
      // A row with no figures is labelled by the "not published" line instead (wageShownLines).
      return words.wages.notPublished(row.geography.name);
  }
}

/** "Hourly · low $18.00 · median $23.00 · high $30.00" (or Yearly), a figure the file leaves empty said as such. */
export function wageFiguresLine(row: WageRowView): string {
  const shown = (figure: string | null) => (figure === null ? words.wages.figureNotPublished : wageAmount(figure, row.basis));
  const line = row.basis === "annual" ? words.wages.yearly : words.wages.hourly;
  return line(shown(row.low), shown(row.median), shown(row.high));
}

/** A method the file names; "NA" and "" are no method. */
const methodOf = (row: WageRowView) => (row.method.trim() === "" || row.method.trim() === "NA" ? null : row.method.trim());

/** "Reference period 2023-2024 · Employment Insurance Survey Data", as the row gives it. */
export function wagePeriodLine(row: WageRowView): string {
  const method = methodOf(row);
  return method ? words.wages.period(row.period, method) : words.wages.periodOnly(row.period);
}

/** The line that says why this row is the one shown. */
export function wageContextLine(context: WageContext): string {
  switch (context.kind) {
    case "region":
      return words.wages.yourRegion(context.region);
    case "dont-know":
      return words.wages.dontKnow;
    case "not-picked":
      return words.wages.notPicked;
    case "outside-alberta":
      return words.wages.outsideAlberta(context.place);
  }
}

/** One block of the wage row as drawn: the row's label, then its lines, and the row a note points to, if any. */
export interface WageBlock {
  /** The level label; null for a row with no figures (its "Not published" line says what it is). */
  label: string | null;
  lines: string[];
  /** The row whose figures the block shows (for the screen checks' amounts check); null when it shows none. */
  row: WageRowView | null;
  then: WageBlock | null;
}

/** The wage row's blocks, in the order drawn. */
export function wageBlock(shown: WageShown): WageBlock {
  if (shown.kind === "missing") return { label: null, lines: [words.wages.noRow(shown.noc, shown.place)], row: null, then: null };
  if (shown.kind === "not-published") {
    const lines = [words.wages.notPublished(shown.row.geography.name)];
    // The note only where it names the level to look at; the row it points to only where that is another row.
    if (shown.note) lines.push(words.wages.govNote(shown.note));
    if (shown.pointsTo) lines.push(words.wages.pointsTo);
    return { label: null, lines, row: null, then: shown.pointsTo ? wageBlock(shown.pointsTo) : null };
  }
  const lines = [
    ...(shown.shownUnder ? [words.wages.shownUnder(shown.shownUnder, shown.row.provinceName)] : []),
    wageFiguresLine(shown.row),
    wagePeriodLine(shown.row),
  ];
  return { label: wageLevelLabel(shown.row), lines, row: shown.row, then: null };
}

/** The kicker over the panel's rows: "Cabinetmakers · 72311.00 · your pick of job". */
export const aboutJobKicker = (view: AboutJobView) => words.kicker(view.job.label, view.job.code);

/** The lead line before the quote, in the shape the screen checks lift the quoted lines by. */
export const rulesLead = (view: AboutJobView) => (view.group ? words.rules.lead(view.group.code, view.group.title) : null);

/** The text to copy into a search: "Cabinetmakers · 72311.00 · NOC 72311". */
export const copyText = (view: AboutJobView) => words.links.copyText(view.job.label, view.job.code, view.group?.code ?? view.job.code.slice(0, 5));

/** A quoted line as drawn: inside quote marks, as text, so the screen checks read it as a quote. */
export const quoted = (line: string) => `“${line}”`;
