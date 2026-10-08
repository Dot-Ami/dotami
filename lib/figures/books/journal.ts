/**
 * [8h] Plain-text journals (hledger, and Ledger files that keep to the same syntax) → accounts and
 * posted lines, for the shared books totals (totals.ts).
 *
 * DotAmi's own reader, written from hledger's published manual — hledger.org/1.50/hledger.html
 * (manual for hledger 1.50.5), chapter "Journal": Comments, Transactions, Dates (Simple dates,
 * Posting dates), Status, Code, Description, Transaction comments, Postings, The two space
 * delimiter, Account names, Amounts, Decimal marks, Digit group marks, Commodity, Costs, Balance
 * assertions, Posting comments, Transaction balancing, Tags, and Directives (account, alias,
 * commodity, decimal-mark, D, include, P, payee, tag, Y, apply account, periodic transactions, auto
 * postings, balance assignments, and the Ledger directives hledger skips); and hledger.org/ledger.html
 * ("hledger and Ledger": value expressions, lot annotations, secondary dates). Both read
 * 2026-10-08. It was NOT written by reading or translating hledger's or Ledger's source code:
 * hledger is GPL-3.0 and DotAmi is Apache-2.0.
 *
 * Like the GnuCash reader it runs in memory, keeps nothing and logs nothing. The journal's
 * descriptions, payees, notes and comments are never kept; only account names, commodities, days
 * and amounts are. A refusal names what DotAmi didn't read and its line number, never the line's
 * text — a journal is the person's own words.
 *
 * What it reads: transactions (a dated first line, then indented postings and comments), postings
 * (status mark, account, amount, cost, balance assertion — the assertion is only checked by
 * hledger, so it is skipped here), one posting per transaction with its amount left out (worked out
 * exactly when the rest is in one commodity), posting dates (a date: tag on the posting), secondary
 * dates (skipped; the primary date is the transaction's date in both programs by default), comment
 * lines and blocks, and the account, commodity, decimal-mark, P, payee and tag directives.
 *
 * What it refuses, by name and line, instead of guessing — any of these would change which amount
 * lands in which account or month, and DotAmi would be making it up:
 * include files, periodic (~) and automated (=) transactions, balance assignments, value
 * expressions and lot annotations, virtual postings, account aliases and apply account, D and Y
 * defaults, the Ledger-only directives (which hledger skips but Ledger obeys), unknown directives,
 * dates without a year, an amount like "1,000" whose decimal mark the file doesn't settle, and a
 * transaction whose amounts don't add up to zero.
 *
 * A journal's account can hold several commodities, while a book account here has one currency. So
 * each account-and-commodity pair becomes its own book account: "income:consulting" in CAD and in
 * USD are ticked separately and never added together. Only a commodity written as an ISO 4217 code
 * ("CAD") is a currency on its own; a symbol such as "$" could be several, so it counts only when
 * the caller passes what the person said it is (`currencyOf`).
 */
import { MAX_FILE_BYTES } from "../file/types";
import { isRealCalendarDay } from "../validate";
import {
  addAmounts,
  type AmountRead,
  type DecimalMark,
  multiplyAmounts,
  readAmount,
  reduceAmount,
} from "./journal-amount";
import type { AccountSide, BookAccount, BookAmount, BookData, BookLine } from "./types";

/** Every way a journal can be turned away. Stable names: tests and a later screen key on them. */
export type JournalRefusal =
  // The file as a whole
  | "empty"
  | "too-big"
  | "not-text"
  | "not-utf8"
  | "bad-option"
  | "reader-fault"
  // Lines DotAmi doesn't read
  | "include"
  | "periodic-transaction"
  | "auto-posting"
  | "balance-assignment"
  | "value-expression"
  | "lot-annotation"
  | "virtual-posting"
  | "alias"
  | "apply-account"
  | "default-commodity"
  | "default-year"
  | "ledger-directive"
  | "unknown-directive"
  | "subdirective"
  | "unknown-line"
  | "stray-indent"
  | "control-character"
  // Dates
  | "date-without-year"
  | "bad-date"
  | "transaction-date-tag"
  | "bracketed-posting-date"
  | "posting-date-twice"
  | "unclear-tag"
  // Amounts and transactions
  | "ambiguous-amount"
  | "bad-amount"
  | "amount-too-long"
  | "negative-cost"
  | "blank-amounts"
  | "blank-amount-mixed"
  | "unbalanced"
  // Accounts and commodities
  | "account-name"
  | "account-too-deep"
  | "account-type"
  | "account-type-conflict"
  | "commodity-sample"
  | "commodity-conflict"
  | "decimal-mark";

/** One commodity the journal's postings use, and whether DotAmi takes it as a currency. */
export interface JournalCommodity {
  /** As the journal writes it, without quotes; "" for amounts written with no commodity. */
  symbol: string;
  /** ISO 4217 code, or null when it isn't one and the person hasn't said which it is. */
  currency: string | null;
  postings: number;
}

export type JournalReadResult =
  | { ok: true; book: BookData; commodities: JournalCommodity[] }
  | {
      ok: false;
      /** A sentence for the person. Names the line, never quotes it. */
      error: string;
      refusal: JournalRefusal;
      /** 1-based line of the journal, or null when the refusal is about the whole file. */
      line: number | null;
    };

export interface JournalReadOptions {
  /**
   * What the person said a commodity symbol stands for, e.g. { "$": "CAD" } ("" for amounts with
   * no symbol). Only used for symbols that aren't already ISO codes; each value must be one.
   */
  currencyOf?: Readonly<Record<string, string>>;
}

/** No real account tree is this deep; a name past it is refused rather than walked. */
export const MAX_ACCOUNT_DEPTH = 100;

/** The hledger account types (manual: "account directive" > account types), by letter and name. */
const ACCOUNT_TYPES = {
  A: "Asset",
  L: "Liability",
  E: "Equity",
  R: "Revenue",
  X: "Expense",
  C: "Cash",
  V: "Conversion",
} as const;
type AccountType = (typeof ACCOUNT_TYPES)[keyof typeof ACCOUNT_TYPES];

/** Which way each type runs. Conversion accounts have no natural side, so they can't be ticked. */
const SIDES: Record<AccountType, AccountSide | null> = {
  Asset: "debit",
  Cash: "debit",
  Expense: "debit",
  Liability: "credit",
  Equity: "credit",
  Revenue: "credit",
  Conversion: null,
};

/**
 * Ledger directives hledger reads past without obeying (manual: "Other Ledger directives"). In
 * Ledger they can change amounts or accounts (bucket picks a balancing account, capture renames,
 * define and eval feed value expressions), so a file using them is refused. The keyword is shown
 * in the refusal; it comes from this list, never from the file.
 */
const LEDGER_DIRECTIVES = new Set([
  "assert",
  "bucket",
  "A",
  "capture",
  "check",
  "define",
  "eval",
  "expr",
  "python",
  "value",
  "test",
]);

// The refusal sentences. Each says what was found and, where there is one, what to do; none quotes
// the journal.
const WONT_GUESS = "DotAmi won't guess, so it read nothing.";
const FILE_SENTENCES: Partial<Record<JournalRefusal, string>> = {
  empty: "That journal is empty.",
  "too-big": "That file is over 10 MB, more than DotAmi reads yet.",
  "not-text":
    "That doesn't look like a plain-text journal. DotAmi reads hledger and Ledger journals saved as text.",
  "not-utf8":
    "That journal isn't saved in the UTF-8 text encoding, so DotAmi can't read it safely. Saving it again as UTF-8 fixes this.",
  "bad-option": "DotAmi was given a currency for a commodity that isn't a currency code it knows.",
  "reader-fault": "DotAmi couldn't read that journal. Nothing was kept.",
};
const LINE_PHRASES: Record<JournalRefusal, string> = {
  empty: "",
  "too-big": "",
  "not-text": "",
  "not-utf8": "",
  "bad-option": "",
  "reader-fault": "",
  include:
    "is an include line, which pulls in another file. DotAmi reads one journal file on its own and doesn't follow includes",
  "periodic-transaction":
    "starts a periodic transaction (a line beginning with ~), which is a plan rather than something that happened. DotAmi doesn't read those yet",
  "auto-posting":
    "starts an automated posting rule (a line beginning with =), which adds amounts to other transactions. DotAmi doesn't read those",
  "balance-assignment":
    "has a balance assignment (a posting with = and no amount of its own), whose amount would have to be worked out from the account's balance. DotAmi doesn't work those out",
  "value-expression":
    "has an amount with a part in parentheses, such as a value expression or a lot note. DotAmi doesn't work those out",
  "lot-annotation":
    "has a lot price or lot date ({ } or [ ]) on an amount. DotAmi doesn't read those",
  "virtual-posting":
    "has a virtual posting (an account written inside ( ) or [ ]). DotAmi doesn't read those yet, because whether they count is a choice it won't make for you",
  alias: "renames accounts (an alias line). DotAmi doesn't follow account renaming",
  "apply-account":
    "puts the accounts that follow under another account (apply account). DotAmi doesn't read that",
  "default-commodity":
    "sets a default commodity for amounts written without one (a D line). DotAmi doesn't read that",
  "default-year":
    "sets a default year for dates written without one. DotAmi only reads dates that carry their year",
  "ledger-directive": "", // built with the directive's name, below
  "unknown-directive": "isn't a transaction, a comment or a directive DotAmi reads",
  subdirective:
    "is a line under an account or commodity directive that DotAmi doesn't read (such as an alias or a default)",
  "unknown-line": "is an indented line DotAmi can't read as a posting or a comment",
  "stray-indent":
    "is indented but isn't part of a transaction or a directive above it (a blank line ends one)",
  "control-character":
    "has an invisible control character in it (something other than a tab or a line break)",
  "date-without-year": "has a date without a year. DotAmi only reads dates that carry their year",
  "bad-date": "has a date DotAmi can't read as a real day (dates look like 2026-03-31)",
  "transaction-date-tag":
    "has a date: tag on a transaction or an account rather than on a posting. DotAmi only reads date: on a posting",
  "bracketed-posting-date":
    "has a posting date in square brackets in a comment (Ledger's way of writing one). DotAmi only reads posting dates written as date:",
  "posting-date-twice": "gives a posting a second date: tag",
  "unclear-tag":
    "has a date or type tag written with capitals (such as Date:). DotAmi only reads those tags in lower case",
  "ambiguous-amount":
    'has an amount like 1,000 or 1.000, which some programs read as a thousand and hledger reads as one. A line such as "decimal-mark ." near the top of the journal says which mark is the decimal point',
  "bad-amount": "has an amount DotAmi can't read with certainty",
  "amount-too-long": "has an amount with more digits than any real amount",
  "negative-cost": "has a negative cost (@ or @@); costs are written as positive amounts",
  "blank-amounts":
    "is a second posting without an amount in the same transaction; only one posting may leave its amount out",
  "blank-amount-mixed":
    "leaves a posting's amount out where the rest of the transaction is in more than one commodity, so it can't be worked out exactly",
  unbalanced: "starts a transaction whose amounts don't add up to zero",
  "account-name":
    "has an account name with a semicolon, an unusual space or a hidden character in it, so DotAmi can't be sure where the name ends",
  "account-too-deep": `has an account more than ${MAX_ACCOUNT_DEPTH} levels deep`,
  "account-type":
    "gives an account a type DotAmi doesn't know (the types are Asset, Liability, Equity, Revenue, Expense, Cash and Conversion, or their letters A, L, E, R, X, C and V)",
  "account-type-conflict": "declares an account again with a different type",
  "commodity-sample":
    "declares a commodity with a sample amount DotAmi can't read with certainty",
  "commodity-conflict":
    "declares a commodity's decimal mark differently from an earlier line",
  "decimal-mark": 'has a decimal-mark line that isn\'t "decimal-mark ." or "decimal-mark ,"',
};

/** Thrown inside this file only; readJournal turns it into a result. */
class Refusal extends Error {
  constructor(
    readonly kind: JournalRefusal,
    readonly line: number | null,
    readonly keyword?: string,
  ) {
    super("refused");
  }
}

function sentence(r: Refusal): string {
  if (r.line === null) return FILE_SENTENCES[r.kind] ?? WONT_GUESS;
  const phrase =
    r.kind === "ledger-directive"
      ? `is a Ledger directive ("${r.keyword}") that can change what amounts mean in Ledger. DotAmi doesn't read it`
      : LINE_PHRASES[r.kind];
  return `Line ${r.line} of the journal ${phrase}. ${WONT_GUESS}`;
}

/** The ISO 4217 codes this computer's JavaScript knows; empty (so nothing counts) if it can't say. */
let isoCodes: Set<string> | null = null;
function isIsoCurrency(code: string): boolean {
  if (isoCodes === null) {
    try {
      isoCodes = new Set(Intl.supportedValuesOf("currency"));
    } catch {
      isoCodes = new Set();
    }
  }
  return isoCodes.has(code);
}

// ---------------------------------------------------------------------------------------------
// Small text helpers

/** Index of the first `ch` outside "double quotes" (a quoted commodity may hold anything), or -1. */
function indexOutsideQuotes(text: string, ch: string): number {
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    if (text[i] === '"') quoted = !quoted;
    else if (!quoted && text.startsWith(ch, i)) return i;
  }
  return -1;
}

/** True when any of `chars` appears outside double quotes. */
function hasOutsideQuotes(text: string, chars: string): boolean {
  let quoted = false;
  for (const c of text) {
    if (c === '"') quoted = !quoted;
    else if (!quoted && chars.includes(c)) return true;
  }
  return false;
}

/** Where a name ends: at two spaces, a tab, or the end of the line (manual: "The two space delimiter"). */
function nameEnd(text: string): number {
  const twoSpaces = text.indexOf("  ");
  const tab = text.indexOf("\t");
  const ends = [twoSpaces, tab].filter((i) => i >= 0);
  return ends.length === 0 ? text.length : Math.min(...ends);
}

/**
 * Spaces and line separators other than a plain space, zero-width characters, text-direction controls and a stray
 * byte-order mark. In an account name they make two names that look the same different, or hide
 * where the name ends.
 */
const ODD_NAME_CHARS = /[\p{Z}\u200b-\u200f\u202a-\u202e\u2060-\u2069\ufeff]/u;
const CONTROL_CHARS = /[\u0000-\u0008\u000b-\u001f\u007f]/;

function checkAccountName(name: string, line: number): void {
  if (name === "" || name.includes(";") || ODD_NAME_CHARS.test(name.replace(/ /g, ""))) {
    throw new Refusal("account-name", line);
  }
  if (name.split(":").length > MAX_ACCOUNT_DEPTH) throw new Refusal("account-too-deep", line);
}

// ---------------------------------------------------------------------------------------------
// Dates and tags

const FULL_DATE = /^(\d{4})([-/.])(\d{1,2})\2(\d{1,2})$/;
const YEARLESS_DATE = /^(\d{1,2})([-/.])(\d{1,2})$/;

/** A simple date as YYYY-MM-DD; `year` fills in a yearless one, or null refuses it. Null when it isn't a real day. */
function simpleDate(text: string, year: string | null): string | "yearless" | null {
  const full = text.match(FULL_DATE);
  if (full) {
    const day = `${full[1]}-${full[3].padStart(2, "0")}-${full[4].padStart(2, "0")}`;
    return isRealCalendarDay(day) ? day : null;
  }
  const short = text.match(YEARLESS_DATE);
  if (short) {
    if (year === null) return "yearless";
    const day = `${year}-${short[1].padStart(2, "0")}-${short[3].padStart(2, "0")}`;
    return isRealCalendarDay(day) ? day : null;
  }
  return null;
}

interface CommentTags {
  /** The value of a date: tag, or null when there is none. */
  date: string | null;
  /** The value of a type: tag, or null when there is none. */
  type: string | null;
}

/**
 * The two tags DotAmi acts on, from a comment's text (manual: "Tags" — a name ending in a colon,
 * its value running to the next comma or the end of the line). date2: is a secondary date, which
 * is skipped like the transaction's own secondary date. A second date: on one comment, the same
 * tags in capitals, and a Ledger-style [date] are refused rather than read one way.
 */
function readTags(comment: string, line: number, readType = false): CommentTags {
  const tags: CommentTags = { date: null, type: null };
  for (const m of comment.matchAll(/(?:^|[\s,])(date2?|type):([^,]*)/gi)) {
    const name = m[1];
    const lower = name.toLowerCase();
    // type: only means something on an account directive; elsewhere it is the person's own tag.
    if (lower === "type" && !readType) continue;
    if (name !== lower) throw new Refusal("unclear-tag", line);
    if (name === "date2") continue;
    const key = name as "date" | "type";
    if (key === "date" && tags.date !== null) throw new Refusal("posting-date-twice", line);
    tags[key] = m[2].trim();
  }
  if (/\[=?\d{1,4}[-/.]\d{1,2}(?:[-/.]\d{1,2})?(?:=[\d/.-]+)?\]/.test(comment)) {
    throw new Refusal("bracketed-posting-date", line);
  }
  return tags;
}

// ---------------------------------------------------------------------------------------------
// The reader

interface PostingDraft {
  line: number;
  account: string;
  /** Null for the one posting that leaves its amount out. */
  commodity: string | null;
  amount: BookAmount | null;
  /** The posting's value in the cost's commodity, when it has a cost. */
  cost: { commodity: string; amount: BookAmount } | null;
  day: string | null;
}

interface TransactionDraft {
  line: number;
  day: string;
  year: string;
  postings: PostingDraft[];
}

type Context =
  | { kind: "none" }
  | { kind: "transaction"; tx: TransactionDraft }
  | { kind: "account"; name: string; line: number }
  | { kind: "commodity"; symbol: string }
  | { kind: "loose-directive" } // payee, tag: whatever is under them changes no amount
  | { kind: "comment-block" };

interface AccountDeclaration {
  type: AccountType | null;
}

class JournalParser {
  private context: Context = { kind: "none" };
  /** From a decimal-mark directive, for every commodity, until the end of the file. */
  private fileMark: DecimalMark | null = null;
  /** From commodity directives, per commodity, for the lines after them. */
  private readonly commodityMarks = new Map<string, DecimalMark>();
  readonly declarations = new Map<string, AccountDeclaration>();
  readonly postings: { account: string; commodity: string; amount: BookAmount; day: string }[] =
    [];

  private readonly markFor = (commodity: string): DecimalMark | null =>
    this.fileMark ?? this.commodityMarks.get(commodity) ?? null;

  line(raw: string, n: number): void {
    if (CONTROL_CHARS.test(raw)) throw new Refusal("control-character", n);

    if (this.context.kind === "comment-block") {
      if (raw.trimEnd() === "end comment") this.context = { kind: "none" };
      return;
    }

    if (raw.trim() === "") {
      this.endContext();
      return;
    }

    if (raw[0] === " " || raw[0] === "\t") {
      this.indented(raw.trim(), n);
      return;
    }

    // Anything at the start of a line ends what came before it.
    this.endContext();
    const first = raw[0];
    if (first === ";" || first === "#" || first === "*") return; // a comment line
    if (first === "~") throw new Refusal("periodic-transaction", n);
    if (first === "=") throw new Refusal("auto-posting", n);
    if (first >= "0" && first <= "9") {
      this.transactionHeader(raw, n);
      return;
    }
    this.directive(raw, n);
  }

  end(): void {
    this.endContext();
  }

  // -- Transactions

  private transactionHeader(raw: string, n: number): void {
    const dateText = raw.match(/^[^\s;]*/)![0];
    const [primary, secondary, ...more] = dateText.split("=");
    if (more.length > 0) throw new Refusal("bad-date", n);
    const day = simpleDate(primary, null);
    if (day === "yearless") throw new Refusal("date-without-year", n);
    if (day === null) throw new Refusal("bad-date", n);
    // A secondary date is skipped, but it still has to be a date (Ledger lets it leave out the year).
    if (secondary !== undefined) {
      const second = simpleDate(secondary, day.slice(0, 4));
      if (second === null || second === "yearless") throw new Refusal("bad-date", n);
    }
    const rest = raw.slice(dateText.length);
    if (rest !== "" && !/^\s/.test(rest)) throw new Refusal("bad-date", n);

    // Status, code and description are the person's words and are not kept. Only the comment's
    // tags matter: a date: there would move the whole transaction in a way the manual doesn't spell out.
    const semicolon = rest.indexOf(";");
    if (semicolon >= 0 && readTags(rest.slice(semicolon + 1), n).date !== null) {
      throw new Refusal("transaction-date-tag", n);
    }
    this.context = {
      kind: "transaction",
      tx: { line: n, day, year: day.slice(0, 4), postings: [] },
    };
  }

  private indented(text: string, n: number): void {
    const ctx = this.context;
    switch (ctx.kind) {
      case "transaction":
        this.postingOrComment(ctx.tx, text, n);
        return;
      case "account":
        if (text.startsWith(";")) {
          this.accountTags(ctx.name, text.slice(1), n);
          return;
        }
        // "note" only describes the account; anything else (alias, payee, default, …) could
        // change which postings land where.
        if (/^note(\s|$)/.test(text)) return;
        throw new Refusal("subdirective", n);
      case "commodity":
        if (text.startsWith(";")) return;
        if (/^format(\s|$)/.test(text)) {
          this.commoditySample(text.slice("format".length), n, ctx.symbol);
          return;
        }
        if (/^(note|nomarket)(\s|$)/.test(text)) return;
        throw new Refusal("subdirective", n);
      case "loose-directive":
        return;
      default:
        throw new Refusal("stray-indent", n);
    }
  }

  private postingOrComment(tx: TransactionDraft, text: string, n: number): void {
    if (text.startsWith(";")) {
      const tags = readTags(text.slice(1), n);
      const last = tx.postings[tx.postings.length - 1];
      if (tags.date !== null) {
        // Before any posting, the comment belongs to the transaction itself.
        if (!last) throw new Refusal("transaction-date-tag", n);
        this.setPostingDay(last, tags.date, tx, n);
      }
      return;
    }

    let body = text;
    // An optional status mark and a space (manual: "Postings").
    if ((body[0] === "*" || body[0] === "!") && /\s/.test(body[1] ?? "")) body = body.slice(1).trimStart();
    if (body[0] === "#" || body[0] === ";") throw new Refusal("unknown-line", n);

    const end = nameEnd(body);
    const account = body.slice(0, end).trimEnd();
    const rest = body.slice(end);
    if (account.startsWith("(") || account.startsWith("[")) throw new Refusal("virtual-posting", n);
    checkAccountName(account, n);

    const semicolon = indexOutsideQuotes(rest, ";");
    const amountPart = (semicolon >= 0 ? rest.slice(0, semicolon) : rest).trim();
    const posting: PostingDraft = {
      line: n,
      account,
      commodity: null,
      amount: null,
      cost: null,
      day: null,
    };
    if (amountPart !== "") this.postingAmount(posting, amountPart, n);
    tx.postings.push(posting);

    if (semicolon >= 0) {
      const tags = readTags(rest.slice(semicolon + 1), n);
      if (tags.date !== null) this.setPostingDay(posting, tags.date, tx, n);
    }
  }

  private setPostingDay(posting: PostingDraft, value: string, tx: TransactionDraft, n: number) {
    if (posting.day !== null) throw new Refusal("posting-date-twice", n);
    // The manual: a date: tag with no year takes the transaction's year.
    const day = simpleDate(value, tx.year);
    if (day === null || day === "yearless") throw new Refusal("bad-date", n);
    posting.day = day;
  }

  private postingAmount(posting: PostingDraft, text: string, n: number): void {
    if (hasOutsideQuotes(text, "(")) throw new Refusal("value-expression", n);
    if (hasOutsideQuotes(text, "{[")) throw new Refusal("lot-annotation", n);

    // "= AMOUNT" after the amount is a balance assertion, which only hledger checks; skipped here.
    // With nothing before the "=" it is a balance assignment instead.
    const equals = indexOutsideQuotes(text, "=");
    const main = (equals >= 0 ? text.slice(0, equals) : text).trim();
    if (main === "") throw new Refusal("balance-assignment", n);

    const at = indexOutsideQuotes(main, "@");
    const amountText = at >= 0 ? main.slice(0, at) : main;
    const amount = this.amount(amountText, n);
    posting.commodity = amount.commodity;
    posting.amount = amount.amount;

    if (at >= 0) {
      const total = main[at + 1] === "@";
      const cost = this.amount(main.slice(at + (total ? 2 : 1)), n);
      if (cost.amount.num < 0n) throw new Refusal("negative-cost", n);
      // What the posting is worth in the cost's commodity: a unit price times the quantity, or a
      // total price carrying the quantity's sign (manual: "Costs").
      const negative = amount.amount.num < 0n;
      const value = total
        ? { num: negative ? -cost.amount.num : cost.amount.num, den: cost.amount.den }
        : multiplyAmounts(amount.amount, cost.amount);
      posting.cost = { commodity: cost.commodity, amount: value };
    }
  }

  private amount(text: string, n: number): Extract<AmountRead, { ok: true }> {
    const read = readAmount(text, this.markFor);
    if (read.ok) return read;
    if (read.problem === "ambiguous") throw new Refusal("ambiguous-amount", n);
    if (read.problem === "too-long") throw new Refusal("amount-too-long", n);
    throw new Refusal("bad-amount", n);
  }

  /**
   * Checks a finished transaction and hands its postings on. One posting may leave its amount out;
   * it is then exactly what balances the rest, provided the rest is in one commodity (costs
   * converted). A transaction with no amount left out, no cost and one commodity must add up to
   * exactly zero, as hledger requires; with costs or several commodities hledger balances at a
   * display precision and may infer costs, which DotAmi doesn't redo, so those are not checked.
   */
  private finishTransaction(tx: TransactionDraft): void {
    const blanks = tx.postings.filter((p) => p.amount === null);
    if (blanks.length > 1) throw new Refusal("blank-amounts", blanks[1].line);

    const sums = new Map<string, BookAmount>();
    let hasCost = false;
    for (const p of tx.postings) {
      if (p.amount === null) continue;
      const [commodity, value] = p.cost
        ? [p.cost.commodity, p.cost.amount]
        : [p.commodity as string, p.amount];
      if (p.cost) hasCost = true;
      const before = sums.get(commodity);
      sums.set(commodity, reduceAmount(before ? addAmounts(before, value) : value));
    }

    if (blanks.length === 1) {
      const blank = blanks[0];
      if (sums.size > 1) throw new Refusal("blank-amount-mixed", blank.line);
      const [commodity, sum] = [...sums.entries()][0] ?? ["", { num: 0n, den: 1n }];
      blank.commodity = commodity;
      blank.amount = { num: -sum.num, den: sum.den };
    } else if (!hasCost && sums.size === 1) {
      const [sum] = [...sums.values()];
      if (sum.num !== 0n) throw new Refusal("unbalanced", tx.line);
    }

    for (const p of tx.postings) {
      this.postings.push({
        account: p.account,
        commodity: p.commodity as string,
        amount: p.amount as BookAmount,
        day: p.day ?? tx.day,
      });
    }
  }

  private endContext(): void {
    if (this.context.kind === "transaction") this.finishTransaction(this.context.tx);
    this.context = { kind: "none" };
  }

  // -- Directives

  private directive(raw: string, n: number): void {
    const words = raw.trim().split(/\s+/);
    const keyword = words[0];
    const after = raw.slice(keyword.length); // the line starts with the keyword

    switch (keyword) {
      case "account":
        this.accountDirective(after, n);
        return;
      case "commodity":
        this.commodityDirective(after, n);
        return;
      case "decimal-mark": {
        const value = after.replace(/;.*$/, "").trim();
        if (value !== "." && value !== ",") throw new Refusal("decimal-mark", n);
        this.fileMark = value;
        return;
      }
      case "comment":
        this.context = { kind: "comment-block" };
        return;
      case "P": // a market price; only used for valuation reports, never changes a posted amount
        return;
      case "payee":
      case "tag":
        this.context = { kind: "loose-directive" };
        return;
      case "include":
        throw new Refusal("include", n);
      case "alias":
        throw new Refusal("alias", n);
      case "D":
        throw new Refusal("default-commodity", n);
      case "Y":
      case "year":
        throw new Refusal("default-year", n);
      case "apply":
      case "end": {
        // "end apply account" closes what "apply account" opened; both are refused alike.
        const what = keyword === "end" && words[1] === "apply" ? words[2] : words[1];
        if (keyword === "end" && what === "aliases") throw new Refusal("alias", n);
        if (what === "account") throw new Refusal("apply-account", n);
        if (what === "year") throw new Refusal("default-year", n);
        if (what === "fixed" || what === "tag") {
          throw new Refusal("ledger-directive", n, `${keyword} ${what}`);
        }
        throw new Refusal("unknown-directive", n);
      }
    }
    if (LEDGER_DIRECTIVES.has(keyword)) throw new Refusal("ledger-directive", n, keyword);
    // Ledger lets a journal carry command-line options ("--input-date-format …").
    if (keyword.startsWith("--")) throw new Refusal("ledger-directive", n, "--option");
    throw new Refusal("unknown-directive", n);
  }

  private accountDirective(after: string, n: number): void {
    const text = after.trimStart();
    // The name ends at two spaces or a tab; a same-line comment needs them before its ";".
    const end = nameEnd(text);
    const name = text.slice(0, end).trimEnd();
    checkAccountName(name, n);
    if (!this.declarations.has(name)) this.declarations.set(name, { type: null });
    const rest = text.slice(end).trim();
    if (rest !== "") {
      if (!rest.startsWith(";")) throw new Refusal("unknown-directive", n);
      this.accountTags(name, rest.slice(1), n);
    }
    this.context = { kind: "account", name, line: n };
  }

  private accountTags(name: string, comment: string, n: number): void {
    const tags = readTags(comment, n, true);
    if (tags.date !== null) throw new Refusal("transaction-date-tag", n);
    if (tags.type === null) return;
    const type = accountType(tags.type);
    if (type === null) throw new Refusal("account-type", n);
    const declaration = this.declarations.get(name)!;
    if (declaration.type !== null && declaration.type !== type) {
      throw new Refusal("account-type-conflict", n);
    }
    declaration.type = type;
  }

  private commodityDirective(after: string, n: number): void {
    const semicolon = indexOutsideQuotes(after, ";");
    const text = (semicolon >= 0 ? after.slice(0, semicolon) : after).trim();
    let symbol: string;
    if (/\d/.test(text.replace(/"[^"]*"/g, ""))) {
      symbol = this.commoditySample(text, n, null);
    } else {
      // Only a symbol, no sample amount: declares the commodity, says nothing about its marks.
      const match = text.match(/^"([^"]+)"$|^([\p{L}\p{M}\p{Sc}]+)$/u);
      if (!match) throw new Refusal("commodity-sample", n);
      symbol = match[1] ?? match[2];
    }
    this.context = { kind: "commodity", symbol };
  }

  /**
   * A commodity's sample amount ("$1,000.00", "1.000,00 EUR", "1000. INR") tells which mark is
   * its decimal mark (manual: "commodity directive"). The sample itself must be unambiguous.
   * Returns the commodity's symbol.
   */
  private commoditySample(text: string, n: number, expected: string | null): string {
    const read = readAmount(text, () => null);
    if (!read.ok) throw new Refusal("commodity-sample", n);
    if (expected !== null && read.commodity !== expected) throw new Refusal("commodity-sample", n);
    if (read.decimal !== null) {
      const earlier = this.commodityMarks.get(read.commodity);
      if (earlier !== undefined && earlier !== read.decimal) {
        throw new Refusal("commodity-conflict", n);
      }
      this.commodityMarks.set(read.commodity, read.decimal);
    }
    return read.commodity;
  }
}

/** A type: tag's value as an account type: a letter (A, L, E, R, X, C, V) or a name in any case. */
function accountType(value: string): AccountType | null {
  if (Object.hasOwn(ACCOUNT_TYPES, value)) return ACCOUNT_TYPES[value as keyof typeof ACCOUNT_TYPES];
  const named = Object.values(ACCOUNT_TYPES).find((t) => t.toLowerCase() === value.toLowerCase());
  return named ?? null;
}

/**
 * The type hledger's manual says an account gets from its name when no account directive gives one
 * ("account types" — inferred from the top-level name, in any case). DotAmi's own wording of that
 * rule; an account matching none has no type, so it can't be ticked.
 */
function typeFromName(name: string): AccountType | null {
  const parts = name.toLowerCase().split(":");
  const top = parts[0];
  if (top === "asset" || top === "assets") return "Asset";
  if (top === "liability" || top === "liabilities" || top === "debt" || top === "debts") {
    return "Liability";
  }
  if (top === "equity") {
    return parts[1] === "trading" || parts[1] === "conversion" ? "Conversion" : "Equity";
  }
  if (top === "income" || top === "revenue" || top === "revenues") return "Revenue";
  if (top === "expense" || top === "expenses") return "Expense";
  return null;
}

/** An account's type: its own declaration, else the nearest declared parent's, else from its name. */
function typeOf(name: string, declarations: Map<string, AccountDeclaration>): AccountType | null {
  let current = name;
  for (;;) {
    const declared = declarations.get(current)?.type;
    if (declared) return declared;
    const colon = current.lastIndexOf(":");
    if (colon < 0) break;
    current = current.slice(0, colon);
  }
  return typeFromName(name);
}

/** Turns what the parser gathered into the shared book shapes. */
function assemble(
  parser: JournalParser,
  currencyOf: Readonly<Record<string, string>>,
): { book: BookData; commodities: JournalCommodity[] } {
  const currencyFor = (symbol: string): string | null =>
    isIsoCurrency(symbol) ? symbol : Object.hasOwn(currencyOf, symbol) ? currencyOf[symbol] : null;

  const accounts = new Map<string, BookAccount>();
  const commodityCounts = new Map<string, number>();
  const lines: BookLine[] = [];

  for (const p of parser.postings) {
    // One book account per journal account and commodity; the id is opaque and only compared.
    const id = JSON.stringify([p.account, p.commodity]);
    if (!accounts.has(id)) {
      const type = typeOf(p.account, parser.declarations);
      accounts.set(id, {
        id,
        fullName: p.account,
        bookType: type ?? "",
        side: type === null ? null : SIDES[type],
        currency: currencyFor(p.commodity),
        markedAsRevenue: type === "Revenue",
      });
    }
    commodityCounts.set(p.commodity, (commodityCounts.get(p.commodity) ?? 0) + 1);
    lines.push({ accountId: id, day: p.day, amount: p.amount, scheduled: false });
  }

  const byName = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
  const sorted = [...accounts.values()].sort(
    (a, b) => byName(a.fullName, b.fullName) || byName(a.id, b.id),
  );
  const commodities = [...commodityCounts.entries()]
    .sort(([a], [b]) => byName(a, b))
    .map(([symbol, postings]) => ({ symbol, currency: currencyFor(symbol), postings }));

  return { book: { format: "journal", accounts: sorted, lines }, commodities };
}

/**
 * Reads an hledger or Ledger journal from the dropped file's bytes. Never throws: a journal it
 * can't read with certainty comes back as { ok: false } with a sentence, the refusal's name and the
 * line it is on.
 */
export function readJournal(bytes: Uint8Array, options: JournalReadOptions = {}): JournalReadResult {
  try {
    if (bytes.length === 0) throw new Refusal("empty", null);
    if (bytes.length > MAX_FILE_BYTES) throw new Refusal("too-big", null);
    // A NUL byte never appears in a text journal; it is a database, a spreadsheet or a picture.
    if (bytes.includes(0)) throw new Refusal("not-text", null);

    const currencyOf = options.currencyOf ?? {};
    for (const [symbol, code] of Object.entries(currencyOf)) {
      // A symbol that is already a currency code can't be told it is another one.
      if (!isIsoCurrency(code) || (isIsoCurrency(symbol) && symbol !== code)) {
        throw new Refusal("bad-option", null);
      }
    }

    let text: string;
    try {
      // The decoder drops a leading byte-order mark by itself.
      text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    } catch {
      throw new Refusal("not-utf8", null);
    }

    const parser = new JournalParser();
    // Windows (CRLF) and Unix (LF) line ends. A lone carriage return is left in the line and
    // refused as a control character: some old programs used it as a line end, and DotAmi won't
    // guess that.
    const lines = text.split(/\r?\n/);
    for (let i = 0; i < lines.length; i += 1) parser.line(lines[i], i + 1);
    parser.end();

    const { book, commodities } = assemble(parser, currencyOf);
    return { ok: true, book, commodities };
  } catch (error) {
    if (error instanceof Refusal) {
      return { ok: false, error: sentence(error), refusal: error.kind, line: error.line };
    }
    // Anything else is a fault in this reader. Its message could quote the journal, so it is never
    // passed on.
    return { ok: false, error: FILE_SENTENCES["reader-fault"]!, refusal: "reader-fault", line: null };
  }
}
