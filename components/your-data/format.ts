import { formatCents } from "@/lib/figures/money";
import { FIGURE_KIND_LABELS, type FigureKind, type FigureSourceKind, type FigureStatus } from "@/lib/figures/types";
import { yourDataWords } from "@/lib/person/words";

/**
 * Plain readings for the /your-data page. Pure, so a test can check them without rendering anything. The words
 * themselves are in lib/person/words.ts (`yourDataWords`).
 */

const words = yourDataWords.figures;
const formatWords = yourDataWords.format;

/** The four states in the words the person already sees on the idea's card and in the agree prompt. */
export const STATUS_WORDS: Record<FigureStatus, string> = words.status;

/** Short versions for a count line: "3 agreed · 1 waiting". */
export const STATUS_COUNT_WORDS: Record<FigureStatus, string> = words.statusCount;

/** The order a count line lists them in: what is counting first, what is only history last. */
export const STATUS_ORDER: readonly FigureStatus[] = ["confirmed", "proposed", "retracted", "discarded"];

export const SOURCE_KIND_WORDS: Record<FigureSourceKind, string> = words.sourceKind;

export function kindWords(kind: string): string {
  return FIGURE_KIND_LABELS[kind as FigureKind] ?? kind;
}

/**
 * "3 agreed · 1 waiting · 2 taken back" — only the states that have any, in STATUS_ORDER.
 * Empty string when there are none at all.
 */
export function countLine(counts: Record<FigureStatus, number>): string {
  return STATUS_ORDER.filter((s) => counts[s] > 0)
    .map((s) => `${counts[s]} ${STATUS_COUNT_WORDS[s]}`)
    .join(" · ");
}

/**
 * The amount as the card shows it ("$12,500.00"). `cents` is the exact digits as stored; an amount
 * too big for a JavaScript number to hold exactly is shown as cents rather than rounded.
 */
export function amountWords(cents: string, currency: string): string {
  const n = Number(cents);
  if (!Number.isSafeInteger(n)) return formatWords.inCents(cents, currency);
  try {
    return formatCents(n, currency);
  } catch {
    // The runtime doesn't know that currency code: a plain reading beats a crashed page.
    return `${(n / 100).toFixed(2)} ${currency}`;
  }
}

/** "2026-01-01 to 2026-01-31" — exact days, because this page is about what is stored. */
export function periodWords(periodStart: string, periodEnd: string): string {
  return periodStart === periodEnd ? periodStart : formatWords.period(periodStart, periodEnd);
}

/** "1.2 MB" — enough to tell a few kilobytes from a few hundred megabytes. */
export function sizeWords(bytes: number): string {
  if (bytes < 1024) return formatWords.bytes(bytes);
  const units = formatWords.sizeUnits;
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value < 10 ? value.toFixed(1) : Math.round(value)} ${units[unit]}`;
}

/** "1 figure" / "2 figures". */
export function plural(count: number, one: string, many: string = `${one}s`): string {
  return `${count} ${count === 1 ? one : many}`;
}

const NUMBER_WORDS: readonly string[] = formatWords.numbers;

/** "six" for 6, as a sentence writes a small number; digits from 11 up. */
export function numberWords(n: number): string {
  return Number.isInteger(n) && n >= 0 && n < NUMBER_WORDS.length ? NUMBER_WORDS[n] : String(n);
}
