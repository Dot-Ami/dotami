/**
 * [8c] Reading an amount out of one spreadsheet cell, into whole cents.
 *
 * Same rule as lib/figures/money.ts: only an amount we can read with certainty. More than two
 * decimals is refused rather than rounded, and any currency other than a "$" sign makes the cell
 * unreadable — DotAmi never converts or assumes a currency.
 */
import { parseMoneyToCents } from "../money";
import type { Cell, DecimalStyle } from "./types";

/**
 * Comma-decimal amounts: "1234,56", "1 234,56", "1.234,56". The thousands separator is a space or
 * a dot, the same one each time; the decimal comma has one or two digits.
 */
const COMMA_SHAPE = /^(\d{1,3}(?:([ .])\d{3})(?:\2\d{3})*|\d+)(?:,(\d{1,2}))?$/;

/** A number cell as cents, or null if it isn't a finite number with at most two decimals. */
function numberToCents(n: number): number | null {
  if (!Number.isFinite(n)) return null;
  const scaled = n * 100;
  const cents = Math.round(scaled);
  // Floating point turns 0.1 + 0.2 into 0.30000000000000004; a hair of slack is fine, a real third decimal is not.
  if (Math.abs(scaled - cents) > 1e-6) return null;
  if (!Number.isSafeInteger(cents)) return null;
  return cents === 0 ? 0 : cents; // never -0
}

/**
 * Removes the one "$" a cell may carry, in front of the number or after it, keeping any sign or
 * brackets around it: "$5", "-$5", "($5)", "5 $", "(5 $)". Returns null for two dollar signs or
 * one sitting in the middle of the text.
 */
function stripDollar(text: string): string | null {
  const count = text.split("$").length - 1;
  if (count === 0) return text;
  if (count > 1) return null;
  const leading = text.match(/^([(-]*)\s*\$\s*(.*)$/);
  if (leading) return leading[1] + leading[2];
  const trailing = text.match(/^(.*?)\s*\$\s*([)-]*)$/);
  if (trailing) return trailing[1] + trailing[2];
  return null;
}

/** Comma-style text to cents, with the same sign rules as parseMoneyToCents. */
function commaTextToCents(text: string): number | null {
  let s = text.trim();
  if (s.length === 0) return null;

  // Sign: parentheses, a leading minus or a trailing minus — at most one.
  let negative = false;
  let signs = 0;
  if (s.startsWith("(") && s.endsWith(")")) {
    negative = true;
    signs += 1;
    s = s.slice(1, -1).trim();
  }
  if (s.startsWith("-")) {
    negative = true;
    signs += 1;
    s = s.slice(1).trim();
  }
  if (s.endsWith("-")) {
    negative = true;
    signs += 1;
    s = s.slice(0, -1).trim();
  }
  if (signs > 1) return null;

  const match = s.match(COMMA_SHAPE);
  if (!match) return null;

  const whole = match[1].replace(/[ .]/g, "");
  const fraction = (match[3] ?? "").padEnd(2, "0");
  const cents = BigInt(whole) * 100n + BigInt(fraction);
  if (cents > BigInt(Number.MAX_SAFE_INTEGER)) return null;
  const value = Number(cents);
  return negative && value !== 0 ? -value : value;
}

/**
 * One cell as whole cents, or null if it isn't an amount we can read with certainty. `style` says
 * how text amounts are written: "1,234.56" (point) or "1 234,56" (comma). Number cells (Excel)
 * carry no style of their own.
 */
export function cellToCents(cell: Cell, style: DecimalStyle): number | null {
  if (typeof cell === "number") return numberToCents(cell);
  if (typeof cell !== "string") return null; // boolean, Date, null

  // Non-breaking, narrow and thin spaces are how spreadsheets and exports write "1 234,56".
  const text = cell.replace(/[\u00a0\u202f\u2009]/g, " ").trim();
  if (text.length === 0) return null;

  const withoutDollar = stripDollar(text);
  if (withoutDollar === null) return null;

  return style === "comma" ? commaTextToCents(withoutDollar) : parseMoneyToCents(withoutDollar);
}

/**
 * Which way a column's text amounts are written, by how many cells each style can read. A tie
 * (a column of whole numbers reads the same both ways) is "point". Number cells don't vote.
 */
export function detectDecimalStyle(cells: Cell[]): DecimalStyle {
  let point = 0;
  let comma = 0;
  for (const cell of cells) {
    if (typeof cell !== "string") continue;
    if (cellToCents(cell, "point") !== null) point += 1;
    if (cellToCents(cell, "comma") !== null) comma += 1;
  }
  return comma > point ? "comma" : "point";
}
