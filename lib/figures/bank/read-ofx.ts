/**
 * [8g] Bank and card statements — reading an OFX/QFX download.
 *
 * OFX is the file most banks offer as "download for Quicken / QuickBooks / Money" (QFX is OFX plus a
 * few Intuit tags). It is the one bank format that carries the ACCOUNT NUMBER, the bank and branch
 * numbers and the bank's own transaction ids, so this reader is a filter as much as a parser:
 *
 *   - The text is parsed by the ofx-js package (pinned exactly; read in full, see
 *     docs/connectors/ofx-reader-review.md for what it does and where this file steps in).
 *   - Every number that names an account anywhere in the file (all of its accounts, not just the
 *     one a row belongs to, since a transfer's memo names the other) is read only to be blanked out
 *     of the text that stays (descriptions, transaction ids) and is then thrown away. Every value
 *     of an identifying tag counts, however many times the file writes it. The result has no field
 *     to hold one, the same rule as the rest of this folder (types.ts), and
 *     tests/figures-bank-ofx.spec.ts searches the whole result for the invented account digits.
 *   - Text is first made plain by `normalise` (Unicode compatibility folding, which turns every
 *     kind of space and the full-width forms into plain ones; Unicode format characters dropped;
 *     controls and spaces into one space; every dash into "-"), and a number is found with up to
 *     three spaces, dashes, dots, slashes, underscores or middle dots between its digits, with its
 *     leading zeros dropped (five digits or more must remain), and, when the file's number is a
 *     transit and an account together, each part of five digits or more on its own.
 *     KNOWN LIMITS, not chased because no bank prints them: digits of another script (Arabic-Indic,
 *     Devanagari...), a combining mark or variation selector inside a number, invisible characters
 *     that are not format characters (Hangul fillers, the braille blank, private-use characters),
 *     and any other separator (comma, colon, backslash, bullets, a gap wider than three). The
 *     review lists them in full.
 *   - Money is whole cents, money in is positive (OFX already signs it that way), and a day is the
 *     day as the file wrote it, never moved by a time zone.
 *   - No row is dropped. A transaction whose date or amount can't be read with certainty comes out
 *     as a row that says so (an empty day, a NaN amount) and the totals list it as "unreadable".
 *     So does one that writes a tag it depends on (its type, id, amount, day, correction action)
 *     twice or with more tags inside: reading that as "missing" would count a HOLD, miss a
 *     duplicate or forget a correction. A correction that names its target twice cannot be
 *     contained in one row (the rows it should change would stay counted), so the file is refused.
 *   - Pending rows are marked pending, corrections are passed on as corrections, and a repeated
 *     FITID is passed on as it is: lib/figures/bank/totals.ts decides what counts, once. Two
 *     different bank ids always stay two different ids in the result, even when both had an account
 *     number in them (see `makeIdMapper`), so that decision is the one the bank's own ids make.
 *
 * What it refuses, with a fixed sentence that carries nothing from the file: a file over the size
 * limit, a document-type or entity declaration or a tag with attributes (a bank download never has
 * either), several downloads joined into one file, a correction that names its target twice, a
 * file with an unreasonable number of entries or of distinct account numbers, one that takes too long.
 *
 * About the time limit: ofx-js is synchronous, so once it starts nothing can interrupt it. What
 * bounds the wait is the cap on size and on entries, checked BEFORE parsing, and a cap on how much
 * text is scrubbed per row. Measured on the review machine, three runs each (figures and method in
 * the review; measured, not proved): a real-looking statement of 62,000 transactions reads in about
 * 1.3 s; the slowest crafted file built, 10 MB of rows whose 590-character memo nearly spells 28
 * transit-and-account numbers (about 100 patterns to hunt for), in about 1.9 s (30 numbers of dashed
 * zeros nearly spelled, 1.3 s; that file took over 10 s, and was refused as too slow, while a pattern
 * retried from every character); 10,000 ids that blank to the same text in 0.2 s; a ten-megabyte
 * attribute flood is refused in about 10 ms. A third check built a slower one: 30 account ids made of
 * letters only ('aaaa' to 33 a's) against 15,000 memos of 595 a's, 10 MB, which scrubs for about 24 s
 * and is refused as too slow at the clock — so the clock, not the caps, is what bounds a crafted file.
 * The clock is checked after each step and each row, and a result that arrives past the limit is
 * thrown away. The screen that uses this should
 * run it in a Web Worker so the window never waits.
 *
 * Nothing here logs, stores or sends anything, and an exception's own text is never passed on.
 */
import { parseSync } from "ofx-js";
import { decodeText } from "../file/decode";
import { MAX_FILE_BYTES } from "../file/types";
import { isRealCalendarDay } from "../validate";
import { shiftDay } from "./coverage";
import type { BankCorrection, BankRow, CoverageRange } from "./types";

/** The most bytes read; the same limit as every other file DotAmi reads. */
export const OFX_MAX_BYTES = MAX_FILE_BYTES;
/**
 * The most "<" characters (tags, closing tags, comments) in a file. A real statement has about ten
 * per transaction, so this is about 40,000 transactions. A file past it is refused before parsing:
 * the parser's time and memory grow with the tag count (measured in the review).
 */
export const OFX_MAX_TAGS = 500_000;
/** The most transactions read from one file. */
export const OFX_MAX_ROWS = 100_000;
/** How long the reader may take, in milliseconds. See "About the time limit" above. */
export const OFX_MAX_MILLIS = 10_000;

/** Why a file was turned away. The screen shows `error`; the reason is for tests and decisions. */
export type OfxRefusalReason =
  | "empty"
  | "too-big"
  | "not-ofx"
  | "several-downloads"
  | "declares-types"
  | "too-many-entries"
  | "too-slow"
  | "unreadable"
  | "no-currency"
  | "no-statement";

export const OFX_REFUSAL_TEXT: Record<OfxRefusalReason, string> = {
  empty: "That file is empty.",
  "too-big":
    "That file is over 10 MB, more than DotAmi reads. Download a shorter period from your bank and drop that.",
  "not-ofx": "That doesn't look like an OFX or QFX bank file.",
  "several-downloads":
    "That file has more than one bank download joined together. Download each one on its own and drop them one at a time.",
  "declares-types":
    "That file declares its own document type or entities, which a bank download never needs. DotAmi won't read it. Download it again from your bank.",
  "too-many-entries":
    "That file has far more entries than a bank download normally does, so DotAmi didn't read it. Download a shorter period.",
  "too-slow": "That file took too long to read, so DotAmi stopped. Download a shorter period.",
  unreadable:
    "DotAmi couldn't read that file as a bank download. It may be damaged or cut short; download it again.",
  "no-currency":
    "That file doesn't say what currency it is in, and DotAmi never guesses one. Download it again from your bank.",
  "no-statement":
    "That file has no bank or credit card transactions in it. DotAmi doesn't read investment accounts.",
};

/** One account's transactions from the file, in the shapes the rest of lib/figures/bank/ takes. */
export interface OfxStatement {
  /** "bank" for a chequing, savings or similar account, "card" for a credit card. */
  kind: "bank" | "card";
  /** ISO 4217, the currency every row of this statement is in (OFX gives one per statement). */
  currency: string;
  /** Every transaction, pending ones marked, none dropped. Ids are unique across the whole file. */
  rows: BankRow[];
  /** The days the file says it covers; empty when it gives no usable start and end. */
  coverage: CoverageRange[];
}

export type OfxReadResult =
  | {
      ok: true;
      /**
       * One entry per account in the file, in file order, with nothing to tell them apart but their
       * position: a screen says "Account 1 of 2" and the totals are worked out per statement,
       * because a transaction id is only unique within one account.
       */
      statements: OfxStatement[];
      /** True when the file also held an investment account, which is not read. */
      ignoredInvestment: boolean;
    }
  | { ok: false; reason: OfxRefusalReason; error: string };

export interface OfxReadOptions {
  /** Prefix of every row id, so ids from several files never meet. Default "o". */
  idPrefix?: string;
  /** Only for tests: smaller limits than the exported ones, and a clock a test can move. */
  maxBytes?: number;
  maxTags?: number;
  maxRows?: number;
  maxMillis?: number;
  now?: () => number;
}

/** Thrown inside the reader to stop with a reason; always caught before it leaves readOfx. */
class Refusal extends Error {
  constructor(readonly reason: OfxRefusalReason) {
    super(reason);
  }
}

// ---- small helpers over what ofx-js returns -------------------------------------------------

type Node = Record<string, unknown>;

function isNode(value: unknown): value is Node {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * A child by name, only if the node itself has it. ofx-js builds its objects with plain `{}`, and a
 * tag called __proto__ changes such an object's prototype (see the review). Every name this file
 * reads is upper-case and none of those lookups can be made to land on an inherited value, so this
 * is belt and braces: it makes "the file can't supply a field it didn't write" true by construction.
 */
function own(node: unknown, key: string): unknown {
  return isNode(node) && Object.hasOwn(node, key) ? node[key] : undefined;
}

/** ofx-js gives one child as a value and several as an array; this makes both a list. */
function list(value: unknown): unknown[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

/** A tag's text, trimmed; "" when it is missing, repeated (so ambiguous) or holds more tags. */
function leaf(node: unknown, key: string): string {
  const value = own(node, key);
  return typeof value === "string" ? value.trim() : "";
}

/** The one child with this name. Several of them is a file we can't read with certainty. */
function single(node: unknown, key: string): Node | undefined {
  const found = list(own(node, key));
  if (found.length > 1) throw new Refusal("unreadable");
  return isNode(found[0]) ? found[0] : undefined;
}

// ---- reading values -------------------------------------------------------------------------

// YYYYMMDD, optionally followed by hours, minutes, seconds, a fraction and "[offset:ZONE]".
const STAMP = /^(\d{4})(\d{2})(\d{2})((?:\d{2}){0,3})(?:\.\d{1,3})?(?:\[[^\]]{0,40}\])?$/;

interface Stamp {
  /** YYYY-MM-DD, exactly the digits the file wrote. */
  day: string;
  /** HHMMSS when the file gave a time of day, null for a bare date. */
  time: string | null;
}

/** An OFX date-time as its day and time of day. The offset is ignored on purpose: the day is as written. */
function readStamp(text: string): Stamp | null {
  const m = text.trim().match(STAMP);
  if (!m) return null;
  const day = `${m[1]}-${m[2]}-${m[3]}`;
  if (!isRealCalendarDay(day)) return null;
  if (m[4] === "") return { day, time: null };
  const time = m[4].padEnd(6, "0");
  if (Number(time.slice(0, 2)) > 23 || Number(time.slice(2, 4)) > 59 || Number(time.slice(4)) > 59)
    return null;
  return { day, time };
}

// Optional sign, whole part, and a "." or "," decimal (OFX allows either) with any number of digits.
// The whole part may be left out when there is a fraction ("-.50" is fifty cents out).
const AMOUNT = /^([+-]?)(\d{0,15})(?:([.,])(\d{1,10}))?$/;

/** An OFX amount as whole cents, or NaN when it isn't one we can read with certainty. */
function readCents(text: string): number {
  const m = text.trim().match(AMOUNT);
  if (!m || (m[2] === "" && m[4] === undefined)) return Number.NaN;
  const fraction = m[4] ?? "";
  // "1,000" could be one thousand written with a thousands separator or one dollar to three
  // decimals, and a bank that writes it is not following the format: don't pick one. (A "." with
  // three digits is the format's own decimal point, so "12.500" is read as 12.50.)
  if (m[3] === "," && fraction.length === 3) return Number.NaN;
  // A third decimal that isn't zero would be a fraction of a cent: refuse it rather than round.
  if (/[1-9]/.test(fraction.slice(2))) return Number.NaN;
  const cents = BigInt(m[2] || "0") * 100n + BigInt(fraction.slice(0, 2).padEnd(2, "0"));
  if (cents > BigInt(Number.MAX_SAFE_INTEGER)) return Number.NaN;
  const value = Number(cents);
  return m[1] === "-" && value !== 0 ? -value : value;
}

/**
 * The days a statement covers in full. OFX says the end date is exclusive (the first moment NOT in
 * the file), but a bare end date is easy to misread, so:
 *
 *   start with no time, or at midnight → that day is in;  start later in the day → it starts the next day
 *   end with no time                   → that day is the end, and the file alone can't say if it is in
 *   end at midnight (exclusive)        → the day before is the last day
 *   end at the very end of a day       → that day is the last day
 *   end at any other time              → the day before is the last day (that day is only part covered)
 *
 * The later-start and mid-day-end choices can only mean fewer months proposed, never a wrong total.
 * No usable start and end means no coverage at all.
 */
function readCoverage(start: string, end: string): CoverageRange[] {
  const from = readStamp(start);
  const to = readStamp(end);
  if (!from || !to) return [];
  const first = from.time === null || from.time === "000000" ? from.day : shiftDay(from.day, 1);
  let last: string;
  let unsure = false;
  if (to.time === null) {
    last = to.day;
    unsure = true;
  } else if (to.time >= "235959") {
    last = to.day;
  } else {
    last = shiftDay(to.day, -1);
  }
  if (first > last) return [];
  return unsure ? [{ from: first, to: last, toIsUnsure: true }] : [{ from: first, to: last }];
}

// ---- keeping the account's own numbers out of the text that stays ---------------------------

/** What replaces an account number found in a description or a transaction id. */
const HIDDEN = "[hidden]";

/**
 * The text as the scrubber should see it. A bank prints an account number with whatever spacing its
 * software likes, and a no-break space (U+00A0), a figure space (U+2007), a narrow no-break space
 * (U+202F) or an en dash looks like the plain one to a person but not to a pattern. So, before any
 * hunting, and in this order:
 *
 *   1. NFKC: compatibility forms become plain ones (the Unicode spaces become " ", full-width,
 *      superscript, circled and mathematical digits become ASCII digits, the full-width dot, slash
 *      and underscore and the one-dot leader become plain);
 *   2. every character of the Unicode category Cf (format characters: zero-width spaces, joiners and
 *      non-joiners, the word joiner, soft hyphens, direction marks, the byte-order mark, tag
 *      characters, U+180E) is dropped;
 *   3. every control character and every other space, separator or line break becomes one " ";
 *   4. every dash (category Pd) and every minus sign becomes "-";
 *   5. a run of spaces becomes one.
 *
 * That is all it does. It does NOT fold digits of another script (Arabic-Indic, Devanagari...), drop
 * combining marks, variation selectors (including the Mongolian ones, U+180B to U+180D) or the
 * invisible characters outside category Cf (Hangul fillers, the braille blank, private-use
 * characters), or turn a bullet, a comma or a colon into a gap: a number written with any of those
 * inside it is not found. They are the known limits (docs/connectors/ofx-reader-review.md). Used for
 * the text being searched and for the numbers searched for, so both sides are written the same way.
 */
function normalise(text: string): string {
  return text
    .normalize("NFKC")
    .replace(/\p{Cf}/gu, "")
    .replace(/[\u0000-\u001f\u007f-\u009f\p{Z}\s]/gu, " ")
    .replace(/[\p{Pd}\u2043\u2212\u207B\u208B]/gu, "-")
    .replace(/ {2,}/g, " ");
}

function escapeForRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * The most distinct account numbers one file may ask the scrubber to hunt for. A real download
 * names a handful (each account's number, branch and bank, and the accounts a transfer went to);
 * the scrubber's cost grows with this count times the text it reads, so a crafted file can't make
 * it large.
 */
const MAX_SCRUBBED_NUMBERS = 30;
/**
 * The most patterns (the numbers above plus their other forms, see `makeScrubber`) one file may ask
 * for. A real file needs three or four per account.
 */
const MAX_SCRUBBED_PATTERNS = 120;
/** A number longer than this is not an account number in any bank's format: no other forms are made of it. */
const MAX_SPLIT_CHARS = 40;

/**
 * What a bank puts between the groups of an account number: a space, a dash (every kind is already
 * "-" after `normalise`), a dot, a slash, an underscore or a middle dot (full-width forms are plain
 * after `normalise`). Other marks are not looked through, see the review's list of known limits.
 */
const GAP_CHARS = " .\\-/_\u00B7";
/** The most gap characters that may sit between two digits of one number. */
const MAX_GAP = 3;
const GAP_RUN = new RegExp(`[${GAP_CHARS}]+`);
const GAP_EVERY = new RegExp(`[${GAP_CHARS}]+`, "g");
const DIGITS_AND_GAPS = new RegExp(`^[\\d${GAP_CHARS}]+$`);

/**
 * The forms of one account number to hunt for, the number itself first. An all-digit number (with
 * any gaps the bank wrote in it) is looked for as its bare digits; if it is a transit and an account
 * together, each digit group of five or more on its own; and each of those with its leading zeros
 * dropped when five or more digits are left. A number with letters in it (a credit union's share
 * suffix, "123456789S01"; an IBAN) is matched as written, and each run of five or more digits in it is
 * hunted on its own too, since a memo or an id often prints just the digits.
 */
function formsOf(raw: string): string[] {
  const id = normalise(raw).trim();
  if (!DIGITS_AND_GAPS.test(id)) {
    if (id.length > MAX_SPLIT_CHARS) return [id];
    const runs = (id.match(/\d{5,}/g) ?? []).flatMap((run) => {
      const dropped = run.replace(/^0+/, "");
      return dropped !== run && dropped.length >= 5 ? [run, dropped] : [run];
    });
    return [id, ...runs];
  }
  const groups = id.split(GAP_RUN).filter((group) => group !== "");
  const whole = groups.join("");
  if (whole.length < 4) return [id];
  const forms = [whole];
  if (id.length <= MAX_SPLIT_CHARS) {
    if (groups.length > 1) for (const group of groups) if (group.length >= 5) forms.push(group);
    for (const digits of [...forms]) {
      const dropped = digits.replace(/^0+/, "");
      if (dropped !== digits && dropped.length >= 5) forms.push(dropped);
    }
  }
  return forms;
}

/**
 * A function that blanks out the account, bank and branch numbers of EVERY account the file names
 * wherever they appear in a piece of text. Banks print the account number in a memo ("TRANSFER FROM
 * 000123456789") or build the transaction id from it, and a transfer between two of the person's
 * own accounts puts the OTHER account's number in this one's memo, so one list serves the whole
 * file. Numbers shorter than four characters are left alone (they would match everywhere); digits
 * written with up to three spaces, dashes, dots, slashes, underscores or middle dots between them
 * ("0001 2345 6789", "0001 - 2345 - 6789", "0001.2345.6789") are matched too, so the text should have
 * its tabs and line breaks turned into spaces first (see `describe`); the longest is blanked first so
 * a short number inside a long one can't split it.
 *
 * Besides the number as the file wrote it, two more forms of an all-digit number are hunted, each
 * only where five or more digits are left (four digits are as often an amount or a year):
 *   - with its leading zeros dropped ("000123456789" becomes "123456789"), as a memo or an id often
 *     prints it;
 *   - when the file's number is a transit and an account together ("04567-0001234567"), each digit
 *     group on its own ("04567" and "0001234567", and that group's own zero-less form).
 */
function makeScrubber(ids: readonly string[]): (text: string) => string {
  const primaries = new Set<string>();
  const hunted = new Set<string>();
  // A file that writes one number a hundred thousand times costs one pass here, not a hundred thousand.
  for (const raw of new Set(ids)) {
    const [primary, ...more] = formsOf(raw);
    if (primary.length < 4) continue;
    primaries.add(primary);
    hunted.add(primary);
    for (const form of more) hunted.add(form);
  }
  if (primaries.size > MAX_SCRUBBED_NUMBERS || hunted.size > MAX_SCRUBBED_PATTERNS) {
    throw new Refusal("too-many-entries");
  }
  // Longest first, so a short number inside a long one can't split it.
  const patterns = [...hunted]
    .sort((a, b) => b.length - a.length)
    .map((id) => {
      // Up to 40 characters, a number of digits is looked for with gaps allowed between its digits
      // (see `GapView`). Past that it is not an account number in any bank's format, and anything
      // with a letter in it was never one of digits: those are matched exactly, as plain text.
      const digits = /^\d+$/.test(id) && id.length <= MAX_SPLIT_CHARS;
      return { id, exact: digits ? null : new RegExp(escapeForRegExp(id), "gi") };
    });
  return (raw) => {
    const t = normalise(raw);
    // Every number is looked for in the text as it stands, the places found are kept (not written
    // in yet), and a later, shorter number never takes a place an earlier, longer one has. Writing
    // each blank in as it is found, and starting the digit hunt again after it, is the same answer
    // and cost most of the time.
    const view = makeGapView(t);
    const found: Span[] = [];
    for (const { id, exact } of patterns) {
      if (exact === null) findNumber(view, id, found);
      else findExact(view, id, exact, found);
    }
    return blankSpans(t, found);
  };
}

/** A stretch of the text, from its first character to one past its last. */
type Span = [start: number, end: number];

/**
 * The text as the digit hunt sees it: every character that is not a gap, in order (`bare`), where
 * each sits in the real text (`at`), and where a gap is too wide for one number to run through it
 * (`nextBreak`). A number of digits is then an ordinary substring of `bare` that runs through no
 * wide gap, which a native search finds in one pass, however nearly the text matches. (A pattern
 * with up to three gap characters between its digits did the same by retrying from every position,
 * and a long text of almost-matches cost seconds per ten megabytes: see the review.)
 */
interface GapView {
  text: string;
  bare: string;
  /** `at[k]`: where the k-th character of `bare` sits in `text`. */
  at: Int32Array;
  /** How many characters `bare` has (`at` is as long as `text`, and only this many are used). */
  count: number;
  /** `nextBreak[k]`: the first index at or after k whose gap before it is wider than allowed (or the count). */
  nextBreak: Int32Array;
  /** The length of the longest stretch of `bare` with no wide gap in it: no longer number fits. */
  longest: number;
  /** Which characters of `bare` a number already found has taken. */
  taken: Uint8Array;
  /** The same in `text`: which characters a number already found has taken. */
  claimed: Uint8Array;
}

const isGap = (code: number): boolean =>
  code === 0x20 ||
  code === 0x2e ||
  code === 0x2d ||
  code === 0x2f ||
  code === 0x5f ||
  code === 0xb7;

function makeGapView(text: string): GapView {
  const at = new Int32Array(text.length);
  let count = 0;
  for (let i = 0; i < text.length; i += 1) {
    if (!isGap(text.charCodeAt(i))) at[count++] = i;
  }
  const nextBreak = new Int32Array(count + 1);
  nextBreak[count] = count;
  for (let k = count - 1; k >= 0; k -= 1) {
    nextBreak[k] = k > 0 && at[k] - at[k - 1] - 1 > MAX_GAP ? k : nextBreak[k + 1];
  }
  let longest = 0;
  for (let start = 0; start < count;) {
    const end = nextBreak[start + 1];
    longest = Math.max(longest, end - start);
    start = end;
  }
  return {
    text,
    bare: text.replace(GAP_EVERY, ""),
    at,
    count,
    nextBreak,
    longest,
    taken: new Uint8Array(count),
    claimed: new Uint8Array(text.length),
  };
}

/** The index of the first character of `bare` at or after this place in the text. */
function bareIndexAt(view: GapView, place: number): number {
  let low = 0;
  let high = view.count;
  while (low < high) {
    const middle = (low + high) >> 1;
    if (view.at[middle] < place) low = middle + 1;
    else high = middle;
  }
  return low;
}

/**
 * Adds to `found` every place in the view where this number of digits is written, with up to three
 * gap characters between its digits, from left to right and never over a place already taken. The
 * same places a pattern `d[gap]{0,3}d[gap]{0,3}...` finds by retrying everywhere.
 */
function findNumber(view: GapView, id: string, found: Span[]): void {
  const { bare, at, nextBreak, taken } = view;
  // No longer a stretch of the text than this has the number, or it is not there at all.
  if (id.length > view.longest || !bare.includes(id)) return;
  let from = 0;
  for (let i = bare.indexOf(id, from); i !== -1; i = bare.indexOf(id, from)) {
    const last = i + id.length - 1;
    const wide = nextBreak[i + 1];
    if (wide <= last) {
      // A wide gap inside: no number starting before it fits either, so go straight to it.
      from = wide;
      continue;
    }
    let clash = -1;
    for (let k = last; k >= i; k -= 1) {
      if (taken[k] === 1) {
        clash = k;
        break;
      }
    }
    if (clash !== -1) {
      from = clash + 1; // the same: nothing that starts before the taken place reaches clear of it
      continue;
    }
    taken.fill(1, i, last + 1);
    view.claimed.fill(1, at[i], at[last] + 1);
    found.push([at[i], at[last] + 1]);
    from = last + 1;
  }
}

/**
 * Adds to `found` every place where this text (a number with a letter in it, or one far too long to
 * be an account number) is written, ignoring case, from left to right and never over a place
 * already taken. `pattern` matches `id` one character for one, so a match is as long as `id`.
 */
function findExact(view: GapView, id: string, pattern: RegExp, found: Span[]): void {
  pattern.lastIndex = 0;
  while (pattern.test(view.text)) {
    const end = pattern.lastIndex;
    const start = end - id.length;
    if (view.claimed.subarray(start, end).includes(1)) {
      pattern.lastIndex = start + 1; // a part of it is taken: look again from the next character
      continue;
    }
    view.claimed.fill(1, start, end);
    view.taken.fill(1, bareIndexAt(view, start), bareIndexAt(view, end));
    found.push([start, end]);
  }
}

/** The text with these places (apart from each other) replaced by the blank. */
function blankSpans(text: string, spans: readonly Span[]): string {
  if (spans.length === 0) return text;
  const ordered = [...spans].sort((a, b) => a[0] - b[0]);
  let out = "";
  let cursor = 0;
  for (const [start, end] of ordered) {
    out += text.slice(cursor, start) + HIDDEN;
    cursor = end;
  }
  return out + text.slice(cursor);
}

/**
 * A description on one line: control characters, line breaks and odd spaces and dashes are made
 * plain (see `normalise`; a line break inside a description would also break a table cell).
 */
function plain(text: string): string {
  return normalise(text).trim();
}

const MAX_DESCRIPTION = 200;
/**
 * The most characters of name and memo (together, before cutting) that are read for a description.
 * The OFX format gives a name 32 characters and a memo 255. A row with more than this gets an empty
 * description: reading it would cost time for nothing, and cutting it mid-way could leave the first
 * half of an account number at the cut. Amounts and days are not affected.
 */
const MAX_DESCRIPTION_SOURCE = 600;
/** The longest transaction id the format allows. A longer one makes its row unreadable. */
const MAX_FITID = 255;

/** The text shown for a row: payee name and memo, flattened, with every account number blanked, cut short. */
function describe(name: string, memo: string, scrub: (text: string) => string): string {
  const joined = [name, memo].filter(Boolean).join(" - ");
  if (joined.length > MAX_DESCRIPTION_SOURCE) return "";
  // Flatten first: a tab or line break between the groups of an account number must not stop the
  // scrubber from seeing it, and plain() leaves at most single spaces for it to match.
  const flat = plain(joined);
  // Folding compatibility forms can make text longer; the cap is on what the scrubber reads.
  if (flat.length > MAX_DESCRIPTION_SOURCE) return "";
  return scrub(flat).slice(0, MAX_DESCRIPTION);
}

// ---- one statement --------------------------------------------------------------------------

/** The two kinds of statement DotAmi reads, and where each sits in the file. */
const SECTIONS = [
  {
    kind: "bank" as const,
    messages: "BANKMSGSRSV1",
    response: "STMTTRNRS",
    statement: "STMTRS",
    fromTag: "BANKACCTFROM",
  },
  {
    kind: "card" as const,
    messages: "CREDITCARDMSGSRSV1",
    response: "CCSTMTTRNRS",
    statement: "CCSTMTRS",
    fromTag: "CCACCTFROM",
  },
];

/** The tags inside the account block that identify it. Read, then only ever blanked out. */
const IDENTIFYING_TAGS = ["BANKID", "BRANCHID", "ACCTID", "ACCTKEY"];

interface Context {
  prefix: string;
  tick: () => void;
  /** Blanks every account number the file names (all accounts, not just this statement's). */
  scrub: (text: string) => string;
  /** A fresh transaction-id mapper for one statement; see `makeIdMapper`. */
  newIdMapper: () => (original: string) => string;
}

/**
 * What a bank's transaction id (FITID, or the CORRECTFITID that points at one) becomes in the
 * result, within one statement (an id is only unique within one account). Whether two rows are the same transaction, and which row a correction means, is decided
 * by the bank's ORIGINAL id, so this must give two different originals two different outputs and
 * the same original the same output, however much of them is blanked:
 *
 *   - an id with no account number in it comes out exactly as the file wrote it (so two downloads
 *     of one account still agree on it);
 *   - an id with one comes out with the number blanked ("T[hidden]-1");
 *   - if that text is already taken by a different original (two ids that differ only inside the
 *     numbers, such as the account's own number and the other account's, both blank to the same
 *     text), "#2", "#3"... is added, counting in the order the file lists them.
 *
 * The original is never kept anywhere that leaves this function. An id that had a number in it
 * therefore agrees with another download of the same account only when both files list their ids
 * in the same order; the review says so.
 */
function makeIdMapper(scrub: (text: string) => string): (original: string) => string {
  const outputOf = new Map<string, string>();
  const taken = new Set<string>();
  // The next suffix to try for each text that has been taken. Every smaller one is taken already
  // (nothing is ever freed), so searching from 2 each time would cost N steps for the Nth id that
  // blanks to the same text: 10,000 of them took longer than the whole time limit.
  const nextSuffix = new Map<string, number>();
  return (original) => {
    const known = outputOf.get(original);
    if (known !== undefined) return known;
    const scrubbed = scrub(original);
    const base = scrubbed.includes(HIDDEN) ? scrubbed : original;
    let out = base;
    if (taken.has(out)) {
      // An id the file wrote itself ("[hidden]#2") can occupy a suffix too, so each is still checked.
      let n = nextSuffix.get(base) ?? 2;
      while (taken.has(`${base}#${n}`)) n += 1;
      out = `${base}#${n}`;
      nextSuffix.set(base, n + 1);
    }
    outputOf.set(original, out);
    taken.add(out);
    return out;
  };
}

/**
 * Every piece of text under a value: the text itself, every item of a list (a tag written twice
 * comes back from ofx-js as a list), and the text of any tags inside it. A number that the file
 * writes oddly must still be found so that it can be blanked, so nothing is skipped here.
 */
function allText(value: unknown): string[] {
  const found: string[] = [];
  const pending: unknown[] = [value];
  while (pending.length > 0) {
    const next = pending.pop();
    if (typeof next === "string") {
      found.push(next.trim());
    } else if (Array.isArray(next)) {
      for (const item of next) pending.push(item); // not a spread: a list may be far too long for one
    } else if (isNode(next)) {
      for (const item of Object.values(next)) pending.push(item);
    }
  }
  return found;
}

/**
 * The identifying numbers inside one account block: every value of every tag in `tags`, however
 * many times it is written (nothing for a missing block). Only ever blanked out, never kept.
 */
function numbersIn(block: unknown, tags: readonly string[]): string[] {
  return tags.flatMap((tag) => allText(own(block, tag)));
}

/**
 * Every number in the file that names an account: each statement's own account block, the
 * "transfer to" account a transaction may carry, and any investment account. A transfer between
 * the person's own accounts is the usual reason an account number shows up in a memo, and it is
 * the OTHER account's number that does, so the scrubber has to know them all before any row is read.
 */
function collectAccountNumbers(
  root: Node,
  found: readonly { section: (typeof SECTIONS)[number]; statement: Node }[],
  tick: () => void,
): string[] {
  const numbers: string[] = [];
  for (const { section, statement } of found) {
    numbers.push(...numbersIn(single(statement, section.fromTag), IDENTIFYING_TAGS));
    const lists = [
      [own(statement, "BANKTRANLIST"), "STMTTRN"],
      [own(statement, "BANKTRANLISTP"), "STMTTRNP"],
    ] as const;
    for (const [holder, tag] of lists) {
      let seen = 0;
      for (const transaction of list(own(holder, tag))) {
        if (++seen % 256 === 0) tick();
        for (const to of ["BANKACCTTO", "CCACCTTO"]) {
          for (const block of list(own(transaction, to))) {
            numbers.push(...numbersIn(block, IDENTIFYING_TAGS));
          }
        }
      }
    }
  }
  // An investment account is not read, but a memo may still name it.
  for (const messages of list(own(root, "INVSTMTMSGSRSV1"))) {
    for (const response of list(own(messages, "INVSTMTTRNRS"))) {
      for (const statement of list(own(response, "INVSTMTRS"))) {
        for (const block of list(own(statement, "INVACCTFROM"))) {
          numbers.push(...numbersIn(block, ["BROKERID", "ACCTID"]));
        }
      }
    }
  }
  return numbers;
}

function readRow(
  node: unknown,
  id: string,
  currency: string,
  dayTag: string,
  pendingList: boolean,
  scrub: (text: string) => string,
  outId: (original: string) => string,
): BankRow {
  // The fields this row's meaning depends on. A tag written twice (ofx-js hands back a list) or one
  // that holds more tags has no one answer, and reading it as "missing" would fail OPEN: a HOLD
  // counted as money, a duplicate missed, a correction forgotten. So the row is kept but can't be
  // counted (`ambiguous`), except CORRECTFITID, see below.
  let ambiguous = false;
  const read = (key: string): string => {
    const value = own(node, key);
    if (typeof value === "string") return value.trim();
    if (value !== undefined) ambiguous = true;
    return "";
  };

  // A transaction that is only an empty tag still takes its place, as a row that can't be read.
  const stamp = readStamp(read(dayTag));
  const row: BankRow = {
    id,
    day: stamp ? stamp.day : "",
    cents: readCents(read("TRNAMT")),
    currency,
    description: "",
  };

  const name = leaf(node, "NAME") || leaf(own(node, "PAYEE"), "NAME");
  row.description = describe(name, leaf(node, "MEMO"), scrub);

  // HOLD is OFX's type for an amount that is only pending, wherever the bank listed it.
  if (pendingList || read("TRNTYPE").toUpperCase() === "HOLD") row.pending = true;

  // An id longer than the format allows can't be trusted to mean one transaction (and would cost
  // time to scrub): the row is kept but can't be counted.
  const rawFitid = read("FITID");
  // A correction that names two ids can't say which rows it changes, and the rows it should have
  // changed would still be counted at their old amounts. No row-level answer is safe: the file is refused.
  const named = own(node, "CORRECTFITID");
  if (named !== undefined && typeof named !== "string") throw new Refusal("unreadable");
  const rawTarget = read("CORRECTFITID");
  const rawAction = read("CORRECTACTION");
  if (rawFitid.length > MAX_FITID || rawTarget.length > MAX_FITID) ambiguous = true;
  // A correction notice that doesn't name the row it corrects can't be applied, and counting it as an
  // ordinary transaction would add a deletion notice as money, or count an original and its replacement.
  if (rawAction !== "" && rawTarget === "") ambiguous = true;

  // <CURRENCY> inside a transaction means its amounts are in CURSYM, not the statement's CURDEF, so the
  // row carries that currency and is never added to the statement's own (<ORIGCURRENCY> means the amounts
  // were already converted to CURDEF: nothing changes). A CURRENCY block we can't read leaves the row unread.
  const rowCurrency = own(node, "CURRENCY");
  if (rowCurrency !== undefined) {
    const symbol = leaf(rowCurrency, "CURSYM").toUpperCase();
    if (isNode(rowCurrency) && /^[A-Z]{3}$/.test(symbol)) row.currency = symbol;
    else ambiguous = true;
  }
  if (ambiguous) row.cents = Number.NaN;

  const fitid = rawFitid.length > MAX_FITID ? "" : outId(rawFitid);
  if (fitid !== "") row.fitid = fitid;

  const target = rawTarget.length > MAX_FITID ? "" : outId(rawTarget);
  if (target !== "") {
    // Only REPLACE keeps this row as a transaction. A missing or unknown action (a doubled one
    // included) is treated as a cancellation: the earlier row is out either way, and nothing is
    // counted on a guess.
    const action: BankCorrection["action"] =
      rawAction.toUpperCase() === "REPLACE" ? "replace" : "delete";
    row.corrects = { fitid: target, action };
  }
  return row;
}

function readStatement(
  kind: "bank" | "card",
  statement: Node,
  index: number,
  context: Context,
): OfxStatement {
  const currency = leaf(statement, "CURDEF").toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency)) throw new Refusal("no-currency");
  const { scrub } = context;
  // A bank id is only unique within one account, so each statement keeps its own.
  const outId = context.newIdMapper();

  const transactions = single(statement, "BANKTRANLIST");
  const pendingList = single(statement, "BANKTRANLISTP");

  const rows: BankRow[] = [];
  const add = (nodes: unknown[], dayTag: string, pending: boolean) => {
    for (const node of nodes) {
      context.tick(); // one clock read per row is nothing next to reading the row
      const id = `${context.prefix}${index + 1}.${rows.length + 1}`;
      rows.push(readRow(node, id, currency, dayTag, pending, scrub, outId));
    }
  };
  add(list(own(transactions, "STMTTRN")), "DTPOSTED", false);
  // OFX 2.x lists transactions that haven't posted yet apart, under their own tag and date.
  add(list(own(pendingList, "STMTTRNP")), "DTTRAN", true);

  return {
    kind,
    currency,
    rows,
    coverage: readCoverage(leaf(transactions, "DTSTART"), leaf(transactions, "DTEND")),
  };
}

// ---- the file -------------------------------------------------------------------------------

/** A byte-order mark: UTF-8, or UTF-16 either way round. */
function hasByteOrderMark(bytes: Uint8Array): boolean {
  return (
    (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) ||
    (bytes[0] === 0xff && bytes[1] === 0xfe) ||
    (bytes[0] === 0xfe && bytes[1] === 0xff)
  );
}

/**
 * The file's bytes as text. An OFX 1.x header names its character set in plain ASCII ("CHARSET:1252"
 * is what Canadian banks write for accented names); otherwise the same guess as a CSV: UTF-8 if it
 * is valid UTF-8, else Windows-1252.
 */
function decodeOfx(bytes: Uint8Array): string {
  if (!hasByteOrderMark(bytes)) {
    const head = new TextDecoder("windows-1252").decode(bytes.subarray(0, 1024));
    if (/^\s*CHARSET\s*:\s*1252\b/m.test(head)) {
      return new TextDecoder("windows-1252").decode(bytes);
    }
  }
  return decodeText(bytes);
}

/** Counts `needle` in `text`, giving up past `limit` (so a file of nothing but "<" is not counted in full). */
function countUpTo(text: string, needle: string, limit: number): number {
  let count = 0;
  for (let at = text.indexOf(needle); at !== -1; at = text.indexOf(needle, at + needle.length)) {
    count += 1;
    if (count > limit) break;
  }
  return count;
}

// A document-type or entity declaration, however it is spaced or capitalised.
const DECLARATION = /<!\s*(?:DOCTYPE|ENTITY|ELEMENT|ATTLIST|NOTATION)\b/i;

// An attribute on a tag (`<NAME key=value>`), or anything else with an "=" between a "<" and the next
// "<" or ">". An OFX body never has one: the only "=" of a file belongs to the header or the
// `<?OFX ...?>` line, and both sit BEFORE `<OFX>`, so only the text from `<OFX>` on is checked. ofx-js
// reads any number of attributes inside one tag, and that is cheap for a file to abuse: the tag
// count below counts only "<". The test is on the "=" and not on a tag name, because the parser
// accepts a name that starts with "_", "-", ".", ":" or a digit as well as a letter, and any
// narrower pattern leaves a way round it (a first version of this one did). One scan, each
// character read at most once.
const ATTRIBUTE = /<[^<>]*=/;

/** True when these first bytes look like an OFX or QFX file (for the screen that decides where a dropped file goes). */
export function looksLikeOfx(head: Uint8Array): boolean {
  const text = new TextDecoder("windows-1252").decode(head.subarray(0, 4096));
  return /OFXHEADER\s*:|<OFX>|<\?OFX\b/.test(text);
}

/**
 * Reads an OFX or QFX download into rows. `input` is the file's bytes (preferred: the character
 * set is worked out here) or its text.
 */
export function readOfx(input: Uint8Array | string, options: OfxReadOptions = {}): OfxReadResult {
  const now = options.now ?? (() => performance.now());
  const maxMillis = options.maxMillis ?? OFX_MAX_MILLIS;
  const maxBytes = options.maxBytes ?? OFX_MAX_BYTES;
  const maxTags = options.maxTags ?? OFX_MAX_TAGS;
  const maxRows = options.maxRows ?? OFX_MAX_ROWS;
  const started = now();
  const tick = () => {
    if (now() - started > maxMillis) throw new Refusal("too-slow");
  };

  try {
    if (input.length === 0) throw new Refusal("empty");
    if (input.length > maxBytes) throw new Refusal("too-big");

    const text = typeof input === "string" ? input : decodeOfx(input);
    if (text.trim() === "") throw new Refusal("empty");
    tick();

    // The cheap checks come before the parser sees a single character.
    if (DECLARATION.test(text)) throw new Refusal("declares-types");
    // "<OFX" and not "<OFX>" so that an `<OFX a=1>` is looked at, and refused, too.
    const bodyAt = text.indexOf("<OFX");
    if (bodyAt === -1) throw new Refusal("not-ofx");
    if (ATTRIBUTE.test(text.slice(bodyAt))) throw new Refusal("unreadable");
    const starts = countUpTo(text, "<OFX>", 1);
    // ofx-js reads only up to a second "<OFX>" and drops the rest without a word (see the review),
    // so two downloads pasted together would silently lose the second. Refuse instead.
    if (starts > 1) throw new Refusal("several-downloads");
    if (countUpTo(text, "<", maxTags) > maxTags) throw new Refusal("too-many-entries");

    let root: unknown;
    try {
      root = parseSync(text).OFX;
    } catch {
      // A cut-off file, a mismatched tag, text where a tag should be, or a tree nested so deeply
      // that the parser ran out of stack: all the same to the person.
      throw new Refusal("unreadable");
    }
    tick();
    if (!isNode(root)) throw new Refusal("unreadable");

    // Find every statement and count its transactions before building any row.
    let transactions = 0;
    const found: { section: (typeof SECTIONS)[number]; statement: Node }[] = [];
    for (const section of SECTIONS) {
      for (const messages of list(own(root, section.messages))) {
        for (const response of list(own(messages, section.response))) {
          for (const statement of list(own(response, section.statement))) {
            if (!isNode(statement)) continue;
            found.push({ section, statement });
            transactions +=
              list(own(own(statement, "BANKTRANLIST"), "STMTTRN")).length +
              list(own(own(statement, "BANKTRANLISTP"), "STMTTRNP")).length;
          }
        }
      }
    }
    if (found.length === 0) throw new Refusal("no-statement");
    if (transactions > maxRows) throw new Refusal("too-many-entries");

    const scrub = makeScrubber(collectAccountNumbers(root, found, tick));
    const context: Context = {
      prefix: options.idPrefix ?? "o",
      tick,
      scrub,
      newIdMapper: () => makeIdMapper(scrub),
    };
    const statements = found.map(({ section, statement }, index) =>
      readStatement(section.kind, statement, index, context),
    );
    tick();

    return {
      ok: true,
      statements,
      ignoredInvestment: own(root, "INVSTMTMSGSRSV1") !== undefined,
    };
  } catch (error) {
    // Only our own refusals carry a reason; anything else gets the general sentence. Neither the
    // exception nor the file's text goes any further.
    const reason = error instanceof Refusal ? error.reason : "unreadable";
    return { ok: false, reason, error: OFX_REFUSAL_TEXT[reason] };
  }
}
