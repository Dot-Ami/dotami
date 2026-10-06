/**
 * Money helpers for the figures store. Amounts are whole cents everywhere — never floating
 * point — so "1234.56" is parsed digit by digit instead of going through parseFloat.
 */

/** Digits with optional thousands separators (comma or space) and at most two decimals. */
const AMOUNT_SHAPE = /^(\d{1,3}(?:[, ]\d{3})+|\d+)(?:\.(\d{1,2}))?$/;

/**
 * Reads what a person types or a spreadsheet cell holds ("$1,234.56", "(1 234.50)", "1234.56-")
 * into whole cents, or null when it isn't an amount we can read with certainty.
 *
 * English-style numbers only (comma thousands, dot decimal). A comma decimal such as "1234,56"
 * is refused rather than guessed at: it could be 1,234.56 or 123,456 and a wrong guess about
 * someone's income is worse than asking again. French formats are not part of this story.
 */
export function parseMoneyToCents(text: string): number | null {
  if (typeof text !== "string") return null;
  let s = text.trim();
  if (s.length === 0) return null;

  // Sign: accountants' parentheses, a leading minus, or a trailing minus — at most one of them.
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

  // One optional currency symbol in front. "$-5.00" counts as the (single) sign too.
  if (s.startsWith("$")) {
    s = s.slice(1).trim();
    if (s.startsWith("-")) {
      negative = true;
      signs += 1;
      s = s.slice(1).trim();
    }
  }
  if (signs > 1) return null;

  const match = s.match(AMOUNT_SHAPE);
  if (!match) return null;

  const whole = match[1].replace(/[, ]/g, "");
  const fraction = (match[2] ?? "").padEnd(2, "0");
  // BigInt keeps the exact decimal; the result must still be a safe integer for a JS number.
  const cents = BigInt(whole) * 100n + BigInt(fraction);
  if (cents > BigInt(Number.MAX_SAFE_INTEGER)) return null;
  const value = Number(cents);
  // Never return -0: "-0" and "(0.00)" are just zero.
  return negative && value !== 0 ? -value : value;
}

/** "$1,234.56" for CAD (and the matching symbol for other currencies); a loss shows as "-$1,234.56". */
export function formatCents(cents: number, currency: string): string {
  return new Intl.NumberFormat("en-CA", { style: "currency", currency }).format(cents / 100);
}
