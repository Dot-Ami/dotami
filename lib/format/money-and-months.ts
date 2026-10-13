/**
 * The one way the future cockpit writes an amount or a month (the maintainer's decision of 2026-10-11:
 * new screens keep their words in one file and use one money and date formatter). Road evaluation and
 * its receipts write through these, and the cockpit's screens will too, so "$6,400" and "May 2029" read
 * the same everywhere. Pure: no clock, no locale of the computer's own (always English, Canada).
 */

const WHOLE_DOLLARS = new Intl.NumberFormat("en-CA", {
  style: "currency",
  currency: "CAD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});
const WITH_CENTS = new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" });

/**
 * Whole cents as dollars: "$6,400" when there are no cents, "$6,400.50" when there are, "-$1,200" below
 * zero. Amounts are whole cents everywhere in DotAmi, so this never rounds anything a person gave.
 */
export function formatMoney(cents: number): string {
  return cents % 100 === 0 ? WHOLE_DOLLARS.format(cents / 100) : WITH_CENTS.format(cents / 100);
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

/** "2029-05" as "May 2029". Anything that isn't a month written that way is given back as it came. */
export function formatMonth(month: string): string {
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(month);
  return match ? `${MONTH_NAMES[Number(match[2]) - 1]} ${match[1]}` : month;
}

/**
 * Whole cents as the number alone, for an amount box a person edits: "70,000.00", "-1,200.50". No
 * currency symbol, so it reads back through lib/figures/money.ts parseMoneyToCents exactly; the currency
 * sits beside the box. The figures' agree prompt writes its boxes the same way.
 */
export function formatAmountForBox(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  const whole = Math.floor(abs / 100)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${sign}${whole}.${String(abs % 100).padStart(2, "0")}`;
}
