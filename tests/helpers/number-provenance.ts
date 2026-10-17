import { allCatalogCitations } from "@/lib/engines/all-citations";
import { officialFeesV2026 } from "@/lib/engines/fees/v2026";

/**
 * Where every amount on a screen comes from (S2.5.29c; CLAUDE.md: "Never invent a number"). An amount
 * DotAmi writes on a plan, a receipt or a list must be one of:
 *
 * - an official fee from the fees catalog (lib/engines/fees/v2026);
 * - the person's own number: one they typed or agreed to (first-year sales, savings, a quote, the yearly
 *   income they want);
 * - an official threshold a citation carries in the words it quotes from its page (the CRA's "$30,000");
 * - a sum of official fees and the person's numbers, or the person's savings minus such a sum (the money
 *   gauge's "savings minus both").
 *
 * Anything else is a number DotAmi made up, and `uncitedAmounts` names it. The idea harness
 * (tests/idea-harness.spec.ts) runs every plan and receipt past it; the Lens's reply guard (S2.5.24k) is
 * meant to reuse it.
 */

export interface FoundAmount {
  cents: number;
  /** As the text writes it: "$1,250", "-$1,200", "$150.00". */
  written: string;
}

// A dollar sign, an optional minus before it, whole dollars (with or without thousands commas) and cents
// when there are two digits of them. "$30,000." ends at the full stop; "$1,250.50" keeps its cents.
const AMOUNT = /(-)?\$(\d{1,3}(?:,\d{3})+|\d+)(?:\.(\d{2}))?/g;

/** Every dollar amount written in a text, in order. */
export function amountsIn(text: string): FoundAmount[] {
  const out: FoundAmount[] = [];
  for (const match of text.matchAll(AMOUNT)) {
    const dollars = Number(match[2].replace(/,/g, ""));
    const cents = dollars * 100 + (match[3] ? Number(match[3]) : 0);
    out.push({ cents: match[1] ? -cents : cents, written: match[0] });
  }
  return out;
}

export interface AmountLedger {
  /** Every amount in the official fees catalog, in cents. */
  officialFees: readonly number[];
  /** The person's own numbers, in cents: typed on the intake, agreed in the cockpit, agreed on Your destination. */
  yours: readonly number[];
  /** Amounts inside the words citations quote from their official pages, in cents. */
  quotedThresholds: readonly number[];
  /** The lines a sum may add up: the official fees on the road drawn and the person's own numbers. */
  addable: readonly number[];
}

export type AmountSource = "official-fee" | "yours" | "quoted-threshold" | "sum" | "difference";

/** Every sum of two or more of the addable lines, and every difference, worked out once per ledger. */
const sumsCache = new WeakMap<AmountLedger, { sums: Set<number>; differences: Set<number> }>();

function sumsOf(ledger: AmountLedger): { sums: Set<number>; differences: Set<number> } {
  const cached = sumsCache.get(ledger);
  if (cached) return cached;
  // Subset sums, built one line at a time. Each sum keeps the most lines any subset reaching it used, so
  // a single line (already a source of its own kind) isn't counted as a sum.
  let reached = new Map<number, number>([[0, 0]]);
  for (const line of ledger.addable) {
    const next = new Map(reached);
    for (const [sum, used] of reached) next.set(sum + line, Math.max(next.get(sum + line) ?? 0, used + 1));
    reached = next;
  }
  const sums = new Set([...reached].filter(([, used]) => used >= 2).map(([sum]) => sum));
  // The money gauge's difference: one of the person's numbers (their savings) minus official fees and
  // their own numbers, one line or a sum.
  const differences = new Set<number>();
  for (const own of ledger.yours) for (const sum of [...sums, ...ledger.addable]) differences.add(own - sum);
  const out = { sums, differences };
  sumsCache.set(ledger, out);
  return out;
}

/** Where one amount comes from, or null when it comes from nowhere DotAmi may take a number from. */
export function provenanceOf(cents: number, ledger: AmountLedger): AmountSource | null {
  if (ledger.officialFees.includes(cents)) return "official-fee";
  if (ledger.yours.includes(cents)) return "yours";
  if (ledger.quotedThresholds.includes(cents)) return "quoted-threshold";
  const { sums, differences } = sumsOf(ledger);
  if (sums.has(cents)) return "sum";
  if (differences.has(cents)) return "difference";
  return null;
}

/** Each amount in the texts that has no source, as "where: $amount in “…text…”". Empty when every one has one. */
export function uncitedAmounts(pieces: readonly { where: string; text: string }[], ledger: AmountLedger): string[] {
  const out: string[] = [];
  for (const piece of pieces) {
    if (!piece.text.includes("$")) continue;
    for (const amount of amountsIn(piece.text)) {
      if (provenanceOf(amount.cents, ledger) === null) {
        out.push(`${piece.where}: ${amount.written} in “${piece.text.length > 160 ? `${piece.text.slice(0, 157)}…` : piece.text}”`);
      }
    }
  }
  return out;
}

let quotedCache: readonly number[] | null = null;

/**
 * Every amount the catalogs' citations quote from their official pages (a tool check's quotes): the
 * thresholds DotAmi may show because a source's own words carry them.
 */
export function quotedOfficialAmounts(): readonly number[] {
  if (quotedCache) return quotedCache;
  const amounts = new Set<number>();
  for (const { citation } of allCatalogCitations()) {
    for (const quote of citation.toolCheck?.quotes ?? []) for (const a of amountsIn(quote)) amounts.add(a.cents);
  }
  quotedCache = [...amounts].sort((a, b) => a - b);
  return quotedCache;
}

/** Every amount in the official fees catalog. */
export function officialFeeAmounts(): readonly number[] {
  return [...new Set(officialFeesV2026.map((fee) => fee.amountCents))];
}
