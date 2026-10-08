/**
 * [8h] Amounts in a plain-text journal (hledger / Ledger): "$-1,234.56", "1.234,56 EUR",
 * "-12 CAD", "\"green apples\" 3" → a commodity and an exact fraction, or a named refusal.
 *
 * Written from hledger's published manual (hledger.org/1.50/hledger.html, sections "Amounts",
 * "Decimal marks", "Digit group marks", "Commodity" and "Costs", read 2026-10-08), never from
 * hledger's or Ledger's source code: hledger is GPL-3.0 and DotAmi is Apache-2.0.
 *
 * Where the manual leaves a reading open, DotAmi refuses instead of picking one:
 *  - "1,000" or "1.000" (one mark, three digits after it, nothing else to go on) is one in hledger
 *    and a thousand in other programs, so unless a `decimal-mark` or `commodity` line in the file
 *    settles it, it is refused as ambiguous;
 *  - digit groups other than threes after the first ("1,00,000") and two kinds of group mark in
 *    one number are refused rather than read one way or the other;
 *  - a number that starts with its decimal mark (".50") isn't in the manual, so it is refused.
 * Nothing here rounds: an amount stays an exact fraction, and whether it is whole cents is decided
 * later (amount.ts / totals.ts).
 */
import type { BookAmount } from "./types";

/** What went wrong with an amount, for the journal reader to turn into a sentence. */
export type AmountProblem = "ambiguous" | "unreadable" | "too-long";

export type AmountRead =
  | {
      ok: true;
      commodity: string;
      amount: BookAmount;
      /** The mark read as the decimal mark, or null when the number has none ("1,000,000", "12"). */
      decimal: DecimalMark | null;
    }
  | { ok: false; problem: AmountProblem };

/** Which mark separates whole units from the fraction. */
export type DecimalMark = "." | ",";

/** Same bound as amount.ts: no real amount has this many digits, and BigInt shouldn't chew on one that does. */
const MAX_DIGITS = 30;
/** "1E-6" and "EUR 1E3" are in the manual; an exponent past this is no real amount. */
const MAX_EXPONENT = 18;

/** The space-like characters the manual allows between digit groups, all read as one plain space. */
const GROUP_SPACES = /[\u00a0\u2009\u202f]/g;

/**
 * A commodity written without quotes: letters (with their accents) and currency signs, such as
 * "$", "CAD", "US$", "zł", "€". Anything else (spaces, digits, emoji, punctuation) must be quoted,
 * as the manual says.
 */
const BARE_SYMBOL = /^[\p{L}\p{M}\p{Sc}]+/u;

const fail = (problem: AmountProblem): AmountRead => ({ ok: false, problem });

/**
 * Reads the digits-and-marks part of a number (no sign, no commodity, no exponent) as an exact
 * fraction. `mark` is the decimal mark the file declared for this commodity, or null when it
 * declared none.
 */
export function readNumber(
  text: string,
  mark: DecimalMark | null,
):
  | { ok: true; amount: BookAmount; decimal: DecimalMark | null }
  | { ok: false; problem: AmountProblem } {
  const plain = text.replace(GROUP_SPACES, " ");
  if (!/^\d[\d., ]*$/.test(plain)) return { ok: false, problem: "unreadable" };

  // Split into runs of digits and the single marks between them: "1,234.5" → 1 , 234 . 5
  const groups: string[] = [];
  const marks: string[] = [];
  let run = "";
  for (const ch of plain) {
    if (ch >= "0" && ch <= "9") {
      run += ch;
      continue;
    }
    // Two marks in a row ("1,,000", "1 ,5") never make a number.
    if (run === "") return { ok: false, problem: "unreadable" };
    groups.push(run);
    marks.push(ch);
    run = "";
  }
  groups.push(run); // empty when the number ends with a mark ("10.")

  const decimalAt = findDecimalMark(groups, marks, mark);
  if (decimalAt === "ambiguous") return { ok: false, problem: "ambiguous" };
  if (decimalAt === "unreadable") return { ok: false, problem: "unreadable" };

  // Every mark before the decimal one is a group mark: one kind only, groups of three after the first.
  const groupMarks = decimalAt === null ? marks : marks.slice(0, decimalAt);
  const wholeGroups = decimalAt === null ? groups : groups.slice(0, decimalAt + 1);
  if (groupMarks.length > 0) {
    if (new Set(groupMarks).size > 1) return { ok: false, problem: "unreadable" };
    if (wholeGroups[0].length > 3) return { ok: false, problem: "unreadable" };
    if (wholeGroups.slice(1).some((g) => g.length !== 3)) return { ok: false, problem: "unreadable" };
  }
  // A number can't end on a group mark ("1,000," with "." as the decimal mark).
  if (decimalAt === null && groups[groups.length - 1] === "") {
    return { ok: false, problem: "unreadable" };
  }

  const whole = wholeGroups.join("");
  const fraction = decimalAt === null ? "" : groups[decimalAt + 1];
  if (whole.length + fraction.length > MAX_DIGITS) return { ok: false, problem: "too-long" };
  return {
    ok: true,
    amount: { num: BigInt(whole + fraction), den: 10n ** BigInt(fraction.length) },
    decimal: decimalAt === null ? null : (marks[decimalAt] as DecimalMark),
  };
}

/**
 * Which mark (by index into `marks`) is the decimal mark: a number, null for "none", or why it
 * can't be told.
 */
function findDecimalMark(
  groups: string[],
  marks: string[],
  declared: DecimalMark | null,
): number | null | "ambiguous" | "unreadable" {
  if (marks.length === 0) return null;
  const last = marks.length - 1;

  if (declared !== null) {
    const uses = marks.filter((m) => m === declared).length;
    if (uses === 0) return null;
    // The declared mark may appear once, and only as the last mark.
    return uses === 1 && marks[last] === declared ? last : "unreadable";
  }

  const points = marks.filter((m) => m === ".").length;
  const commas = marks.filter((m) => m === ",").length;
  const spaces = marks.length - points - commas;

  // Only spaces: they are group marks.
  if (points === 0 && commas === 0) return null;

  // Both a point and a comma: the last one is the decimal mark, and it may appear only once.
  if (points > 0 && commas > 0) {
    const decimal = marks[last];
    if (decimal === " ") return "unreadable";
    return marks.filter((m) => m === decimal).length === 1 ? last : "unreadable";
  }

  const punct = points > 0 ? "." : ",";
  const count = points + commas;
  // The same mark more than once can only be a group mark ("1,000,000").
  if (count > 1) return spaces > 0 ? "unreadable" : null;
  // One mark, and it has to be the last one to be a decimal mark.
  if (marks[last] !== punct) return "unreadable";
  // "1 000,50": spaces already group the digits, so the comma is the decimal mark.
  if (spaces > 0) return last;
  // "10." — a trailing mark is a decimal mark with no decimals (the manual's own example).
  const after = groups[last + 1];
  if (after === "") return last;
  // "1,000" / "1.000": a thousand in some programs, one in hledger. Not ours to pick, unless the
  // digits before it can't be a first group of thousands ("0.125", "1234.567").
  const before = groups[last];
  if (after.length === 3 && before !== "0" && before.length <= 3) return "ambiguous";
  return last;
}

/**
 * Zero-width characters, text-direction controls and line separators: inside a quoted commodity
 * they would let a symbol show on screen as something it isn't, so such a symbol isn't read.
 */
const HIDDEN_CHARS = /[\u200b-\u200f\u202a-\u202e\u2060-\u2069\ufeff\p{Zl}\p{Zp}]/u;

/** Where a quoted or bare commodity symbol ends, starting at `at`; null when there is none there. */
function readSymbol(text: string, at: number): { symbol: string; end: number } | null {
  if (text[at] === '"') {
    const close = text.indexOf('"', at + 1);
    if (close <= at + 1) return null; // unclosed, or "" with nothing in it
    const symbol = text.slice(at + 1, close);
    return HIDDEN_CHARS.test(symbol) ? null : { symbol, end: close + 1 };
  }
  const match = text.slice(at).match(BARE_SYMBOL);
  if (!match) return null;
  return { symbol: match[0], end: at + match[0].length };
}

const skipSpaces = (text: string, at: number) => {
  while (at < text.length && (text[at] === " " || text[at] === "\t")) at += 1;
  return at;
};

/**
 * Reads one amount: an optional sign, an optional commodity on the left or the right, a number,
 * an optional exponent. The sign may come before or after a left-hand commodity ("-$1", "$-1"),
 * and spaces between the parts are allowed, as the manual's examples show.
 *
 * `markFor` gives the decimal mark the file has declared for a commodity (or for every commodity),
 * or null.
 */
export function readAmount(
  text: string,
  markFor: (commodity: string) => DecimalMark | null,
): AmountRead {
  const t = text.trim();
  let at = 0;
  let sign = 1n;
  let signs = 0;
  let commodity: string | null = null;

  const takeSign = () => {
    if (t[at] === "-" || t[at] === "+") {
      if (t[at] === "-") sign = -1n;
      signs += 1;
      at = skipSpaces(t, at + 1);
    }
  };

  takeSign();
  if (at < t.length && !/\d/.test(t[at])) {
    const left = readSymbol(t, at);
    if (!left) return fail("unreadable");
    commodity = left.symbol;
    at = skipSpaces(t, left.end);
    takeSign();
  }
  if (signs > 1) return fail("unreadable");

  // The number: digits and marks (a space counts only when a digit follows it, so "100 EUR" stops
  // before the space). An exponent needs a digit after the E, so "1EUR" is a number and a symbol.
  const numberMatch = t
    .slice(at)
    .match(/^\d(?:[\d.,]|[ \u00a0\u2009\u202f](?=\d))*/u);
  if (!numberMatch) return fail("unreadable");
  const numberText = numberMatch[0];
  at += numberText.length;

  let exponent = 0;
  const exponentMatch = t.slice(at).match(/^[eE]([+-]?\d+)/);
  if (exponentMatch) {
    exponent = Number(exponentMatch[1]);
    if (!Number.isSafeInteger(exponent) || Math.abs(exponent) > MAX_EXPONENT) {
      return fail("too-long");
    }
    at += exponentMatch[0].length;
  }

  at = skipSpaces(t, at);
  if (at < t.length) {
    // A commodity on the right, and only if there wasn't one on the left.
    if (commodity !== null) return fail("unreadable");
    const right = readSymbol(t, at);
    if (!right) return fail("unreadable");
    commodity = right.symbol;
    at = skipSpaces(t, right.end);
    if (at < t.length) return fail("unreadable");
  }

  const symbol = commodity ?? ""; // a bare number has the commodity with no name
  const number = readNumber(numberText, markFor(symbol));
  if (!number.ok) return number;

  let { num, den } = number.amount;
  if (exponent > 0) num *= 10n ** BigInt(exponent);
  if (exponent < 0) den *= 10n ** BigInt(-exponent);
  return { ok: true, commodity: symbol, amount: { num: sign * num, den }, decimal: number.decimal };
}

/** a + b, exactly. */
export function addAmounts(a: BookAmount, b: BookAmount): BookAmount {
  return { num: a.num * b.den + b.num * a.den, den: a.den * b.den };
}

/** a × b, exactly. */
export function multiplyAmounts(a: BookAmount, b: BookAmount): BookAmount {
  return { num: a.num * b.num, den: a.den * b.den };
}

/** The same amount with the smallest denominator, so sums of many lines don't grow without end. */
export function reduceAmount(a: BookAmount): BookAmount {
  const gcd = (x: bigint, y: bigint): bigint => {
    x = x < 0n ? -x : x;
    while (y !== 0n) [x, y] = [y, x % y];
    return x;
  };
  const g = gcd(a.num, a.den);
  return g === 0n || g === 1n ? a : { num: a.num / g, den: a.den / g };
}
