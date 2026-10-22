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
 *   gauge's "savings minus both");
 * - a **published job fact** (task 29i): a wage figure the government publishes for a job group (Job Bank's
 *   wage file, *About this job*'s wage row), only on a piece that shows that row and only when the row
 *   carries its source code, the geography level that code gives, and its reference period. A wage is
 *   never one of the lines a sum adds up, so a wage put into a cost, a total or a gauge has no source.
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

/**
 * The geography level a wage row's source code gives (Job Bank's `Source2025_NHQ` column, research 25s § 2;
 * docs/ui-spec/cockpit/about-this-job.md row 2), read from the code's own tokens, never from the region's
 * name: `SAE 2024 ER NOC5` is a small-area estimate for a region, `EI 2023-24 ER NOC5` an economic region,
 * `LFS 2023-24 PR NOC5` the province as a whole, `LFS 2023-24 CAN NOC5` Canada; `CIHI 2023-24`, `JUDGE 2024`,
 * `Yukon 2023-24` and `LFS 2023-24 ATL NOC5` name no level. `N/A` (a row with no figures) has none at all.
 */
export type WageLevel = "economic-region" | "small-area" | "province" | "canada" | "not-stated";

export function wageLevelOf(sourceCode: string): WageLevel | null {
  const code = sourceCode.trim();
  if (code === "" || code === "N/A") return null;
  const tokens = code.split(/\s+/);
  if (tokens.includes("SAE") && tokens.includes("ER")) return "small-area";
  if (tokens.includes("ER")) return "economic-region";
  if (tokens.includes("PR")) return "province";
  if (tokens.includes("CAN")) return "canada";
  return "not-stated";
}

/**
 * One row of the government's published wages for a job group, as *About this job* shows it: the figures,
 * and what makes them a cited fact (where they come from, what area they are for, what period they cover).
 */
export interface PublishedWageRow {
  /** The 5-digit job group, "72311". */
  noc: string;
  /** The wage file's region code: "ER4830" (Calgary), "ER48" (Alberta). */
  regionCode: string;
  /** The row's source code as the file gives it: "EI 2023-24 ER NOC5". */
  sourceCode: string;
  /** The level the screen labels the row with. It must be the one the source code gives. */
  level: WageLevel;
  /** The row's reference period: "2023-2024", "2024". */
  period: string;
  /** Hourly, or yearly where the file's annual flag is 1. */
  per: "hour" | "year";
  lowCents: number | null;
  medianCents: number | null;
  highCents: number | null;
}

/**
 * What a wage row is missing for its figures to count as a published fact: its source code, the level that
 * code gives (which the row must say), and its reference period. Empty when the row carries all three.
 */
export function wageRowProblems(row: PublishedWageRow): string[] {
  const problems: string[] = [];
  const level = wageLevelOf(row.sourceCode);
  if (level === null) problems.push(`no source code (“${row.sourceCode}”)`);
  else if (level !== row.level) problems.push(`the row says ${row.level}, but its source code “${row.sourceCode}” gives ${level}`);
  if (!/^\d{4}(?:-\d{4})?$/.test(row.period.trim())) problems.push(`no reference period (“${row.period}”)`);
  return problems;
}

/**
 * The words a piece's place holds when it is *About this job*'s wage row (its `where`, as the harness names
 * places: "… › about this job › wages › …"). A row's figures count as published facts only on a piece there:
 * a cost line, a total or a gauge that somehow carries a row is still no place for a wage.
 */
export const WAGE_ROW_PLACE = "about this job › wages";

/** A piece of a screen's text, for the amounts check: where it is, its words, and the wage row it shows, if any. */
export interface AmountPiece {
  where: string;
  text: string;
  /** The published wage row the piece shows (only *About this job*'s wage row has one). */
  wageRow?: PublishedWageRow;
}

export interface AmountLedger {
  /** Every amount in the official fees catalog, in cents. */
  officialFees: readonly number[];
  /** The person's own numbers, in cents: typed on the intake, agreed in the cockpit, agreed on Your destination. */
  yours: readonly number[];
  /** Amounts inside the words citations quote from their official pages, in cents. */
  quotedThresholds: readonly number[];
  /** The lines a sum may add up: the official fees on the road drawn and the person's own numbers. Never a wage. */
  addable: readonly number[];
  /**
   * The published wage rows the run's screens read from the government's wage file (*About this job*). A
   * piece may cite a row's figures only when it shows that row and the row is one of these, so a row made
   * up in the screen's code has no source either. Empty until the wage file and the panel ship (25i, 25h).
   */
  publishedWageRows: readonly PublishedWageRow[];
}

export type AmountSource = "official-fee" | "yours" | "quoted-threshold" | "sum" | "difference" | "published-job-fact";

/** The figures of a wage row, in cents. */
const figuresOf = (row: PublishedWageRow) => [row.lowCents, row.medianCents, row.highCents].filter((c): c is number => c !== null);

const ROW_FIELDS = ["noc", "regionCode", "sourceCode", "level", "period", "per", "lowCents", "medianCents", "highCents"] as const;
const sameRow = (a: PublishedWageRow, b: PublishedWageRow) => ROW_FIELDS.every((field) => a[field] === b[field]);

/** True when the piece is at the wage row's place, shows a row the run read, and that row carries its source code, level and period. */
function citesItsRow(piece: AmountPiece | undefined, ledger: AmountLedger): piece is AmountPiece & { wageRow: PublishedWageRow } {
  if (!piece?.wageRow || !piece.where.includes(WAGE_ROW_PLACE)) return false;
  const shown = piece.wageRow;
  return ledger.publishedWageRows.some((row) => sameRow(row, shown)) && wageRowProblems(shown).length === 0;
}

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

/**
 * Where one amount comes from, or null when it comes from nowhere DotAmi may take a number from. `piece`
 * is the piece the amount is written in: a published wage counts only on a piece that shows its row.
 */
export function provenanceOf(cents: number, ledger: AmountLedger, piece?: AmountPiece): AmountSource | null {
  if (citesItsRow(piece, ledger) && figuresOf(piece.wageRow).includes(cents)) return "published-job-fact";
  if (ledger.officialFees.includes(cents)) return "official-fee";
  if (ledger.yours.includes(cents)) return "yours";
  if (ledger.quotedThresholds.includes(cents)) return "quoted-threshold";
  const { sums, differences } = sumsOf(ledger);
  if (sums.has(cents)) return "sum";
  if (differences.has(cents)) return "difference";
  return null;
}

/** Each amount in the texts that has no source, as "where: $amount in “…text…”". Empty when every one has one. */
export function uncitedAmounts(pieces: readonly AmountPiece[], ledger: AmountLedger): string[] {
  const out: string[] = [];
  for (const piece of pieces) {
    if (!piece.text.includes("$")) continue;
    for (const amount of amountsIn(piece.text)) {
      if (provenanceOf(amount.cents, ledger, piece) === null) {
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
