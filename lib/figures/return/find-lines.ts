/**
 * [8f] Read last year's return — page text → each T2125 copy and its four lines.
 *
 * Pure: it gets the text runs pdf.js found on each page (with their positions) and returns what a
 * person would find by eye on a printed CRA form. The layout rules come from the CRA's own form,
 * described in lines.ts. Tax software that prints its own layout (Wealthsimple Tax, TurboTax) is
 * not documented anywhere; until a person describes theirs, this is tested on invented PDFs laid out
 * like the CRA form only, and a layout it doesn't recognise shows a line as "not found" rather
 * than a guess.
 *
 * What counts as a T2125 page: a page with the form's code as a run of its own (the CRA prints
 * "T2125 E (25)" at the foot of every page). A sentence that only names the form ("attach Form
 * T2125", on the T1 and Schedule 8) doesn't count. A new copy starts on a page that carries the
 * form's title once the copy before it is complete (see findT2125Copies); a page without the code
 * ends a copy.
 *
 * This runs in the window after the worker replies, so it is kept close to linear in the number of
 * text runs: only the runs that are one of the four line numbers get their row looked up.
 *
 * What counts as the line: a text run that is exactly the line number, alone (a sentence such as
 * "line 8299 of Part 3C" is one run and doesn't match). What counts as its amount: the first
 * readable amount to its right on the same row, before anything that is itself a line number or
 * one of the CRA's amount letters ("4V"). Nothing is ever guessed: no amount found means none shown.
 */

import { parseMoneyToCents } from "../money";
import { T2125_CODE, T2125_LINES, T2125_TITLE } from "./lines";
import type { LineFound, LineOccurrence, PageText, T2125Copy, TextItem } from "./types";

/**
 * How far apart (in points) a run can sit vertically and still be on the same row. The CRA form's
 * rows are 12 to 15 points apart; a line number and its label differ by about 4 points.
 */
const ROW_TOLERANCE = 5;
/** How far right of the line number an amount may be: the CRA's amount boxes are about 80 points wide. */
const MAX_REACH = 200;
/** A cents box this close after a whole-dollar amount is read as its cents (forms split them). */
const CENTS_GAP = 30;

const LINE_NUMBERS = new Set(T2125_LINES.map((l) => l.line));

/** Any CRA line number (four or five digits), alone. Used to stop looking right at the next line's number. */
const ANY_LINE = /^\d{4,5}$/;
/** The CRA's amount letters printed beside some boxes: "3G", "4V", "5A". */
const AMOUNT_LETTER = /^\d[A-Z]$/;
/** A run that is a line number with the amount printed straight after it: "8299 48,250.00". */
const LINE_WITH_AMOUNT = /^(\d{4})\s+(\S.*)$/;

const normalise = (s: string) => s.replace(/\s+/g, " ").trim();

function sameRow(a: TextItem, b: TextItem): boolean {
  return Math.abs(a.y - b.y) <= ROW_TOLERANCE;
}

/** The amount as printed, if `text` is one: "48,250.00", "$48,250.00", "(1,200.00)", "-1,200.00". */
function readAmount(text: string): { printed: string; cents: number } | null {
  const printed = normalise(text);
  const cents = parseMoneyToCents(printed);
  return cents === null ? null : { printed, cents };
}

/**
 * True when `tag` sits right after the word "line" on its row ("see line" + "8299" printed as two
 * runs): that is a mention in a sentence, not the line itself.
 */
function isMention(tag: TextItem, row: TextItem[]): boolean {
  const before = row
    .filter((i) => i !== tag && i.x + i.width <= tag.x + 1 && tag.x - (i.x + i.width) < 4)
    .sort((a, b) => b.x - a.x)[0];
  return before !== undefined && /\bline$/i.test(before.text.trim());
}

/**
 * A page's runs sorted by height once, so finding a run's row is a binary search, not a pass over
 * the whole page. (The first version compared every run with every other run; a page of 40,000
 * runs then held the window for about 20 seconds after pdf.js had already finished.)
 */
function rowFinder(items: TextItem[]): (item: TextItem) => TextItem[] {
  const byY = [...items].sort((a, b) => a.y - b.y);
  return (item) => {
    const from = item.y - ROW_TOLERANCE;
    let lo = 0;
    let hi = byY.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (byY[mid].y < from) lo = mid + 1;
      else hi = mid;
    }
    const row: TextItem[] = [];
    for (let k = lo; k < byY.length && byY[k].y <= item.y + ROW_TOLERANCE; k += 1) row.push(byY[k]);
    return row;
  };
}

/** True when `next` is a two-digit cents box printed just after `run`. */
function centsAfter(run: TextItem, next: TextItem | undefined): next is TextItem {
  return next !== undefined && /^\d{2}$/.test(next.text.trim()) && next.x - (run.x + run.width) <= CENTS_GAP;
}

/** What is printed to the right of a line number on its row, read as an amount (or null). */
function amountBeside(tag: TextItem, row: TextItem[]): Pick<LineOccurrence, "printed" | "cents"> {
  const tagEnd = tag.x + tag.width;
  const right = row
    .filter((i) => i !== tag && i.x >= tagEnd - 1 && i.x - tagEnd <= MAX_REACH)
    .sort((a, b) => a.x - b.x);

  for (let k = 0; k < right.length; k += 1) {
    const text = right[k].text.trim();
    const next = right[k + 1];
    const cents = centsAfter(right[k], next);
    // The next line's number, or an amount letter, means this line's box was empty. A four- or
    // five-digit run with a cents box right after it is whole dollars printed without a comma
    // ("4500" then "00"), not a line number. Without the cents box it stays ambiguous and is
    // treated as the next line's number: nothing shown rather than a guess.
    if (AMOUNT_LETTER.test(text) || (ANY_LINE.test(text) && !cents)) break;
    const amount = readAmount(text);
    if (!amount) {
      // A one-character run is a form mark (an arrow, a box edge), not something printed in the box.
      if (text.length <= 1) continue;
      break;
    }
    // Dollars and cents printed in two boxes: "48,250" then "00".
    if (!amount.printed.includes(".") && cents) {
      const joined = readAmount(`${amount.printed}.${next.text.trim()}`);
      if (joined) return joined;
    }
    return amount;
  }
  return { printed: null, cents: null };
}

/**
 * How many times one line number is looked at on one page. A CRA page prints each of the four
 * once, plus a mention or two; past this it isn't a form, and each look costs a pass over its row.
 */
const MAX_LOOKS_PER_LINE = 10;

/** Every place on one page where one of the four lines is printed as a line. */
function linesOnPage(page: PageText): { line: string; occurrence: LineOccurrence }[] {
  const rowOf = rowFinder(page.items);
  const looks = new Map<string, number>();
  const found: { line: string; at: TextItem; occurrence: LineOccurrence }[] = [];

  for (const item of page.items) {
    const text = normalise(item.text);
    // Only a run that is one of the four line numbers (alone, or with its amount) needs its row:
    // everything else on the page is skipped here, which keeps a big page quick.
    const inline = LINE_NUMBERS.has(text) ? null : text.match(LINE_WITH_AMOUNT);
    const line = LINE_NUMBERS.has(text) ? text : inline && LINE_NUMBERS.has(inline[1]) ? inline[1] : null;
    if (!line) continue;
    const seen = (looks.get(line) ?? 0) + 1;
    looks.set(line, seen);
    if (seen > MAX_LOOKS_PER_LINE) continue;

    const row = rowOf(item);
    if (isMention(item, row)) continue;
    if (!inline) {
      found.push({ line, at: item, occurrence: { page: page.page, ...amountBeside(item, row) } });
      continue;
    }
    const amount = readAmount(inline[2]);
    if (amount) found.push({ line, at: item, occurrence: { page: page.page, ...amount } });
  }
  // Top of the page first (PDF's y grows upwards), then left to right: the order a person reads it.
  return found
    .sort((a, b) => b.at.y - a.at.y || a.at.x - b.at.x)
    .map(({ line, occurrence }) => ({ line, occurrence }));
}

/** The form's code as its own run (the footer), not a sentence that names the form. */
function pageHasCode(page: PageText): boolean {
  return page.items.some((i) => T2125_CODE.test(normalise(i.text)));
}

function pageHasTitle(page: PageText): boolean {
  const all = normalise(page.items.map((i) => i.text).join(" ")).toLowerCase();
  return all.includes(T2125_TITLE.toLowerCase());
}

function emptyLines(): LineFound[] {
  return T2125_LINES.map((l) => ({ line: l.line, occurrences: [] }));
}

/** The last of the four lines on the form (9946, on its third page). */
const LAST_LINE = T2125_LINES[T2125_LINES.length - 1].line;

function holds(copy: T2125Copy, line: string): boolean {
  return copy.lines.some((l) => l.line === line && l.occurrences.length > 0);
}

/** Every T2125 copy in the PDF, in page order, with the four lines as found on each. */
export function findT2125Copies(pages: PageText[]): T2125Copy[] {
  const copies: T2125Copy[] = [];
  let current: T2125Copy | null = null;

  for (const page of pages) {
    if (!pageHasCode(page)) {
      current = null; // another form, or a picture page: this copy has ended
      continue;
    }
    const onPage = linesOnPage(page);
    // A page with the form's title starts the next copy once this one is complete (it has the last
    // line), or when the page prints a line this copy already holds. The title alone isn't enough:
    // software may print it at the top of every page of one copy.
    const before = current;
    const startsNext =
      before !== null &&
      pageHasTitle(page) &&
      (holds(before, LAST_LINE) || onPage.some(({ line }) => holds(before, line)));
    if (!current || startsNext) {
      current = { firstPage: page.page, lastPage: page.page, lines: emptyLines() };
      copies.push(current);
    }
    current.lastPage = page.page;
    for (const { line, occurrence } of onPage) {
      current.lines.find((l) => l.line === line)?.occurrences.push(occurrence);
    }
  }
  return copies;
}

/** True when not one page has any text: a scanned or photographed PDF. */
export function isPicturesOnly(pages: PageText[]): boolean {
  return pages.length > 0 && pages.every((p) => p.items.length === 0);
}
