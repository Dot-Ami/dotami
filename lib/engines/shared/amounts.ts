/**
 * How an official fee's amount must appear in the words a tool found on its page. Shared by the road
 * checks (lib/engines/roads/v2026/validate.ts) and the official fees catalog's checks
 * (lib/engines/fees/v2026/validate.ts), so both hold a fee to the same rule: a fee checked only by a tool
 * quotes its own amount, as one amount, never one end of a range.
 */

/**
 * The ways a page may write an amount in dollars, thousands comma first: 12_500 cents is "$125" or
 * "$125.00", 125_000 is "$1,250", "$1,250.00", "$1250" or "$1250.00", and 125_050 is "$1,250.50" or
 * "$1250.50".
 */
export function amountAsWritten(amountCents: number): string[] {
  const dollars = Math.floor(amountCents / 100);
  const cents = String(amountCents % 100).padStart(2, "0");
  const forms: string[] = [];
  for (const whole of new Set([dollars.toLocaleString("en-CA"), String(dollars)])) {
    if (cents === "00") forms.push(`$${whole}`);
    forms.push(`$${whole}.${cents}`);
  }
  return forms;
}

// An amount written as one end of a range: "$125-$200", "$125 – $200", "$125 to $200" (the low end),
// and "$100-$125", "$100 to $125", "between $100 and $125", "between $125", "from $125" (either end).
const RANGE_AFTER = /^\s*(?:[-–—]|to\b)\s*\$/i;
const RANGE_BEFORE = /(?:\$[\d,.]+\s*(?:[-–—]|to)\s*|\bbetween\s+(?:\$[\d,.]+\s+and\s+)?|\bfrom\s+)$/i;

/**
 * True when the quote holds the amount as one whole number: "$125" counts in "is $125 a year" but not
 * in "$1250", "$125.50" or "$12,500" (each a different number), nor as one end of a range ("$125-$200",
 * "between $100 and $125"), since an official fee is one amount, never a range.
 */
export function quotesAmount(quote: string, amountCents: number): boolean {
  return amountAsWritten(amountCents).some((form) => {
    for (let at = quote.indexOf(form); at !== -1; at = quote.indexOf(form, at + 1)) {
      const before = quote.slice(0, at);
      const after = quote.slice(at + form.length);
      // "$12,500" holds "$12" followed by ",500"; "$1250" holds "$125" followed by "0".
      if (/^[\d]/.test(after) || /^[.,]\d/.test(after)) continue;
      if (/\d$/.test(before)) continue;
      if (RANGE_AFTER.test(after) || RANGE_BEFORE.test(before)) continue;
      return true;
    }
    return false;
  });
}
