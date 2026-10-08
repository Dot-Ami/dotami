/**
 * [8h] Exact amounts for books: a book's fraction in, whole cents out, or nothing.
 *
 * The rule is the same one lib/figures/money.ts keeps for typed amounts: only an amount that can be
 * read with certainty. A fraction that doesn't come to a whole number of cents (12.505, one third)
 * is refused, never rounded — rounding someone's income quietly is worse than asking again.
 */
import type { BookAmount } from "./types";

/** "num/denom" the way GnuCash writes a number; either side may carry a minus sign. */
const FRACTION = /^(-?\d+)\/(-?\d+)$/;

/** No real amount has this many digits. Stops BigInt() from chewing on a file full of absurd numbers. */
const MAX_DIGITS = 30;

/** A "num/denom" text as an exact fraction, or null if it isn't one (or has a zero denominator). */
export function parseFraction(text: string): BookAmount | null {
  const match = text.trim().match(FRACTION);
  if (!match) return null;
  if (match[1].replace("-", "").length > MAX_DIGITS) return null;
  if (match[2].replace("-", "").length > MAX_DIGITS) return null;

  let num = BigInt(match[1]);
  let den = BigInt(match[2]);
  if (den === 0n) return null;
  // The schema allows a minus on the denominator; keep the sign on the numerator only.
  if (den < 0n) {
    num = -num;
    den = -den;
  }
  return { num, den };
}

/**
 * The amount as whole cents (a BigInt, so a very long book can never lose a cent to floating
 * point), or null when it isn't exactly a whole number of cents. 12500/100 is 12500 cents;
 * 12500/1000 is 1250; 12505/1000 and 1/3 are null.
 */
export function amountToCents(amount: BookAmount): bigint | null {
  if (amount.den <= 0n) return null;
  const scaled = amount.num * 100n;
  if (scaled % amount.den !== 0n) return null;
  return scaled / amount.den;
}
