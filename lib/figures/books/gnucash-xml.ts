/**
 * [8h] GnuCash books saved as XML (the default; compressed or not) → accounts and posted lines.
 *
 * Runs inside the app's window, in memory. The book's bytes are never sent anywhere or stored, and
 * nothing here logs an account, a line or an amount; only the monthly totals the person later
 * agrees to leave the page, through /api/figures/propose. No library error text is ever shown (it
 * could quote the book), and no message carries an account's name or an amount.
 *
 * It refuses what it doesn't fully understand, with a plain sentence, instead of guessing:
 *  - a "feature" the book lists that GnuCash 5.x doesn't know — GnuCash itself refuses such a book
 *    and asks for a newer GnuCash, so DotAmi names the feature and does the same;
 *  - a file or element version other than the 2.0.0 every GnuCash 2–5 writes;
 *  - an account type it doesn't know;
 *  - a part inside a transaction or a split that GnuCash's schema doesn't list there (see
 *    gnucash-shape.ts), or a transaction in a place the schema doesn't put one — either would
 *    leave lines out of the totals without a word;
 *  - a part that may appear once appearing twice (two quantities, two accounts, two posted dates):
 *    taking the last would quietly pick one of them, so the book is refused as damaged;
 *  - XML outside the subset lib/figures/books/xml.ts reads (document types, custom entities);
 *  - a book cut short, damaged, or unpacking to more than MAX_UNPACKED_BYTES.
 *
 * What it reads (gnc-v2 > gnc:book, per GnuCash's own schema, gnucash-v2.rnc — which GnuCash marks
 * non-normative, so the tests also read a book written by hand: tests/helpers/make-gnucash.ts): every
 * account (name, id, type, parent, own currency), and every split of every transaction (account,
 * posted day, amount in the account's own currency). Scheduled transactions live in
 * gnc:template-transactions; their lines are marked `scheduled` so totals.ts never counts them.
 */
import { Gunzip } from "fflate";
import { MAX_FILE_BYTES } from "../file/types";
import { isRealCalendarDay } from "../validate";
import { parseFraction } from "./amount";
import { TransactionShape } from "./gnucash-shape";
import type { AccountSide, BookAccount, BookLine, BookReadResult } from "./types";
import { walkXml, XmlRefusal, type XmlAttributes, type XmlHandlers } from "./xml";

/**
 * The most a compressed book may unpack to. Checked while unpacking, so a zip bomb is stopped on
 * the way out rather than after it has filled the window's memory. Matches the spreadsheet reader's
 * limit on unpacked XML; a real 10 MB compressed book unpacks to far less.
 */
export const MAX_UNPACKED_BYTES = 200 * 1024 * 1024;

/** How much compressed input is fed to the unpacker at a time; bounds how far one step can overshoot the limit. */
const GZIP_SLICE_BYTES = 16 * 1024;

/**
 * The "features" GnuCash 5.x knows, as the book writes them (libgnucash/engine/gnc-features.h,
 * read 2026-10-06). A book lists the features it uses; one not on this list was written by a newer
 * GnuCash. The last one is obsolete: GnuCash drops it and opens the book, so DotAmi does too.
 * Every feature here is about things DotAmi doesn't read (credit notes, budgets, register
 * settings, Bayesian import data), none changes what an amount or a date means.
 */
export const KNOWN_GNUCASH_FEATURES: readonly string[] = [
  "Credit Notes",
  "Number Field Source",
  "Extra data in addresses, jobs or invoice entries",
  "Account GUID based Bayesian data",
  "Account GUID based bayesian with flat KVP",
  "ISO-8601 formatted date strings in SQLite3 databases.",
  "Register sort and filter settings stored in .gcm file",
  "Use natural signs in budget amounts",
  "Show extra account columns in the Budget View",
  "Use a dedicated opening balance account identified by an 'equity-type' slot",
  // Obsolete (never implemented); GnuCash removes it and carries on.
  "Use a Book-Currency",
];

/** The one version every GnuCash 2–5 file writes on a book, account, transaction and commodity. */
const FILE_VERSION = "2.0.0";

/** The prefixes this reader depends on, and what each must stand for on the file's first tag. */
const REQUIRED_NAMESPACES = ["gnc", "act", "book", "cmdty", "slot", "split", "trn", "ts"];

/**
 * Account types (xaccAccountTypeEnumAsString in GnuCash) and which way each runs. Debit accounts
 * hold assets and expenses; credit accounts hold income, liabilities and equity. NONE and TRADING
 * have no fixed direction, so an account of those types can be listed but not ticked as revenue.
 */
const ACCOUNT_SIDES: Readonly<Record<string, AccountSide | null>> = {
  INCOME: "credit",
  LIABILITY: "credit",
  CREDIT: "credit",
  CREDITLINE: "credit",
  PAYABLE: "credit",
  EQUITY: "credit",
  ASSET: "debit",
  BANK: "debit",
  CASH: "debit",
  STOCK: "debit",
  MUTUAL: "debit",
  CURRENCY: "debit",
  EXPENSE: "debit",
  RECEIVABLE: "debit",
  CHECKING: "debit",
  SAVINGS: "debit",
  MONEYMRKT: "debit",
  NONE: null,
  TRADING: null,
};

// Every message below is a fixed sentence, written for the person.
const EMPTY = "That file is empty.";
const TOO_BIG = "That file is over 10 MB, more than DotAmi reads yet.";
const TOO_BIG_INSIDE = "Opened up, that book is too large for DotAmi to read safely.";
const NOT_GNUCASH =
  "That doesn't look like a GnuCash book. DotAmi reads books saved in GnuCash's XML format (the default), compressed or not.";
const SQLITE =
  "That's a GnuCash book saved as a database (SQLite), which DotAmi can't read yet. If you have GnuCash, File > Save As lets you save a copy in the XML format, and DotAmi reads that.";
const DAMAGED =
  "DotAmi couldn't read that GnuCash file. It may be damaged or cut short. Nothing was kept.";
const NOT_UTF8 =
  "That GnuCash file isn't in the UTF-8 text encoding GnuCash writes, so DotAmi can't read it safely.";
const ODD_XML =
  "That file uses XML features a GnuCash book never has (a document type or custom entities), so DotAmi won't read it.";
const NEWER_VERSION =
  "That GnuCash file is a newer file version than DotAmi knows how to read, so DotAmi read nothing.";
const NO_BOOK =
  "That GnuCash file holds an account list but no book of transactions, so there is nothing to add up.";
const MISPLACED_TRANSACTION =
  "That GnuCash book has a transaction in a place DotAmi doesn't expect one, so it can't be sure it found every transaction. DotAmi won't guess, so it read nothing.";

/** A part inside a transaction that DotAmi has no place for; the name is the file's own, cleaned. */
const unknownPart = (name: string) =>
  `That book has a transaction with a part DotAmi doesn't know ("${tidyName(name)}"). It may have been saved by a newer GnuCash, or changed by another program. DotAmi won't guess, so it read nothing.`;

/** A refusal with its sentence ready. Thrown inside this file only; the entry point turns it into a result. */
class Refusal extends Error {
  constructor(readonly sentence: string) {
    super("refused");
  }
}

/**
 * A name from the file made safe to show in a sentence: control characters gone, whitespace
 * squeezed, cut at 60 characters. These names (a feature, an account type) are the one thing a
 * refusal quotes, because the person needs to see what DotAmi didn't understand.
 */
function tidyName(name: string): string {
  const clean = name
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return clean.length > 60 ? `${clean.slice(0, 59)}…` : clean;
}

/** "A", "A and B", "A, B and C", "A, B, C and 2 more" — each quoted. */
function listNames(names: string[]): string {
  const shown = names.slice(0, 3).map((n) => `"${tidyName(n)}"`);
  const more = names.length - shown.length;
  if (more > 0) return `${shown.join(", ")} and ${more} more`;
  if (shown.length === 1) return shown[0];
  return `${shown.slice(0, -1).join(", ")} and ${shown[shown.length - 1]}`;
}

/**
 * A GnuCash timestamp ("2026-03-05 10:59:00 +0000") as the calendar day it stands for, or null
 * when it isn't exactly that shape or isn't a real day.
 *
 * GnuCash stores a day-only date at 10:59 UTC — "neutral time" — so the date part is the same day
 * in every time zone from UTC-12 to UTC+13 (libgnucash/engine/gnc-date.h). Older books wrote local
 * midnight with the local offset. In both, the date part AS WRITTEN is the day the person saw, so
 * that is what is read: nothing is converted to another time zone.
 */
export function gnuCashDay(timestamp: string): string | null {
  const match = timestamp.match(/^(\d{4}-\d{2}-\d{2}) \d{2}:\d{2}:\d{2} [+-]\d{4}$/);
  return match && isRealCalendarDay(match[1]) ? match[1] : null;
}

/** Which text-only element the collector is gathering the text of. */
type Leaf =
  | "account-name"
  | "account-id"
  | "account-type"
  | "account-parent"
  | "commodity-space"
  | "commodity-id"
  | "posted-date"
  | "split-account"
  | "split-quantity"
  | "slot-key"
  | "feature-name";

interface AccountDraft {
  name: string | null;
  id: string | null;
  type: string | null;
  parent: string | null;
  commoditySpace: string | null;
  commodityId: string | null;
}

/** An account whose id is known to be there. */
interface FinishedAccount extends AccountDraft {
  id: string;
}

interface SplitDraft {
  account: string | null;
  quantity: string | null;
}

interface TransactionDraft {
  scheduled: boolean;
  day: string | null;
  splits: SplitDraft[];
}

const newAccount = (): AccountDraft => ({
  name: null,
  id: null,
  type: null,
  parent: null,
  commoditySpace: null,
  commodityId: null,
});

/**
 * Receives the XML as it is walked and gathers the accounts, the lines and the book's features.
 * Depths below count the element itself, so gnc-v2 is 1, gnc:book 2 and a book's children 3.
 */
class Collector implements XmlHandlers {
  readonly accounts: FinishedAccount[] = [];
  readonly lines: BookLine[] = [];
  readonly features: string[] = [];
  books = 0;

  private readonly path: string[] = [];

  private leaf: Leaf | null = null;
  private leafDepth = 0;
  private leafText = "";

  private account: AccountDraft | null = null;
  private accountIsTemplate = false;
  private accountDepth = 0;

  private transaction: TransactionDraft | null = null;
  private transactionDepth = 0;
  /** Checks every element inside the open transaction against what the schema allows there. */
  private shape: TransactionShape | null = null;
  private split: SplitDraft | null = null;
  private splitDepth = 0;

  private bookSlotsDepth = 0; // inside the book's own slots when above zero
  private topSlotKey: string | null = null;

  open(name: string, attributes: XmlAttributes): void {
    // The text-only elements GnuCash writes never hold another element; if one does, this isn't GnuCash's file.
    if (this.leaf !== null) throw new Refusal(DAMAGED);

    const depth = this.path.length + 1;
    const parent = this.path[this.path.length - 1];

    if (depth === 1) this.checkRoot(name, attributes);
    else if (
      (name === "gnc:book" ||
        name === "gnc:account" ||
        name === "gnc:transaction" ||
        name === "gnc:commodity") &&
      attributes.version !== FILE_VERSION
    ) {
      throw new Refusal(NEWER_VERSION);
    }

    this.path.push(name);

    // Inside a transaction, every element must be one the schema lists at that place, once. The
    // picking-out below only looks for the few parts it needs, so without this a part it doesn't
    // know (a split wrapped in a new element, a second quantity) would be skipped or overwritten.
    if (this.shape !== null) {
      const problem = this.shape.open(name);
      if (problem?.kind === "unknown") throw new Refusal(unknownPart(problem.name));
      if (problem?.kind === "twice") throw new Refusal(DAMAGED);
    }

    if (this.split !== null) {
      if (depth === this.splitDepth + 1) {
        if (name === "split:account") this.startLeaf("split-account", depth);
        else if (name === "split:quantity") this.startLeaf("split-quantity", depth);
      }
    } else if (this.transaction !== null) {
      if (depth === this.transactionDepth + 2 && name === "trn:split" && parent === "trn:splits") {
        this.split = { account: null, quantity: null };
        this.splitDepth = depth;
        this.transaction.splits.push(this.split);
      } else if (
        depth === this.transactionDepth + 2 &&
        name === "ts:date" &&
        parent === "trn:date-posted"
      ) {
        // Exactly the transaction's own posted date, not one that sits further down inside its slots.
        this.startLeaf("posted-date", depth);
      }
    } else if (this.account !== null) {
      if (depth === this.accountDepth + 1) {
        if (name === "act:name") this.startLeaf("account-name", depth);
        else if (name === "act:id") this.startLeaf("account-id", depth);
        else if (name === "act:type") this.startLeaf("account-type", depth);
        else if (name === "act:parent") this.startLeaf("account-parent", depth);
      } else if (depth === this.accountDepth + 2 && parent === "act:commodity") {
        if (name === "cmdty:space") this.startLeaf("commodity-space", depth);
        else if (name === "cmdty:id") this.startLeaf("commodity-id", depth);
      }
    } else if (this.bookSlotsDepth > 0) {
      this.openInBookSlots(name);
    } else if (depth === 3 && parent === "gnc:book") {
      if (name === "gnc:account") this.startAccount(depth, false);
      else if (name === "gnc:transaction") this.startTransaction(depth, false);
      else if (name === "book:slots") this.bookSlotsDepth = depth;
    } else if (depth === 4 && parent === "gnc:template-transactions") {
      if (name === "gnc:account") this.startAccount(depth, true);
      else if (name === "gnc:transaction") this.startTransaction(depth, true);
    }

    if (depth === 2 && name === "gnc:book") this.books += 1;

    // GnuCash's schema has transactions only in the book and in its template-transactions
    // (gnucash-v2.rnc, read 2026-10-06; source in gnucash-shape.ts). One that the walk above didn't
    // take up is somewhere else, and its lines would be left out unseen.
    if (name === "gnc:transaction" && this.transaction === null) {
      throw new Refusal(MISPLACED_TRANSACTION);
    }
  }

  text(text: string): void {
    if (this.leaf !== null) this.leafText += text;
  }

  close(): void {
    const depth = this.path.length;

    if (this.leaf !== null && depth === this.leafDepth) this.finishLeaf();

    // The transaction's own closing tag ends its shape check (in finishTransaction); anything
    // inside it just steps back out.
    if (this.shape !== null && depth > this.transactionDepth) this.shape.close();

    if (this.split !== null && depth === this.splitDepth) this.split = null;
    if (this.transaction !== null && depth === this.transactionDepth) this.finishTransaction();
    if (this.account !== null && depth === this.accountDepth) this.finishAccount();
    if (depth === this.bookSlotsDepth) this.bookSlotsDepth = 0;

    this.path.pop();
  }

  /** The first tag must be gnc-v2 and must bind the prefixes this reader relies on to GnuCash's own addresses. */
  private checkRoot(name: string, attributes: XmlAttributes): void {
    if (name !== "gnc-v2") throw new Refusal(NOT_GNUCASH);
    for (const prefix of REQUIRED_NAMESPACES) {
      if (attributes[`xmlns:${prefix}`] !== `http://www.gnucash.org/XML/${prefix}`) {
        throw new Refusal(NOT_GNUCASH);
      }
    }
  }

  private startLeaf(kind: Leaf, depth: number): void {
    this.leaf = kind;
    this.leafDepth = depth;
    this.leafText = "";
  }

  private startAccount(depth: number, template: boolean): void {
    this.account = newAccount();
    this.accountIsTemplate = template;
    this.accountDepth = depth;
  }

  private startTransaction(depth: number, scheduled: boolean): void {
    this.transaction = { scheduled, day: null, splits: [] };
    this.transactionDepth = depth;
    this.shape = new TransactionShape();
  }

  /**
   * The book's own slots hold its features. The shape, from GnuCash's source:
   *   book:slots > slot > slot:key "features", slot:value (a frame) > slot > slot:key <feature name>
   * Everything else in the slots (counters, options, colours) is of no interest.
   */
  private openInBookSlots(name: string): void {
    const p = this.path; // the new element is already on it
    const n = p.length;
    if (name === "slot:key" && p[n - 2] === "slot" && p[n - 3] === "book:slots") {
      this.startLeaf("slot-key", n);
    } else if (
      name === "slot:key" &&
      this.topSlotKey === "features" &&
      p[n - 2] === "slot" &&
      p[n - 3] === "slot:value" &&
      p[n - 4] === "slot" &&
      p[n - 5] === "book:slots"
    ) {
      this.startLeaf("feature-name", n);
    }
  }

  private finishLeaf(): void {
    const kind = this.leaf!;
    const raw = this.leafText;
    this.leaf = null;

    switch (kind) {
      case "account-name":
        this.account!.name = raw;
        break;
      case "account-id":
        this.account!.id = raw.trim();
        break;
      case "account-type":
        this.account!.type = raw.trim();
        break;
      case "account-parent":
        this.account!.parent = raw.trim();
        break;
      case "commodity-space":
        this.account!.commoditySpace = raw.trim();
        break;
      case "commodity-id":
        this.account!.commodityId = raw.trim();
        break;
      case "posted-date":
        this.transaction!.day = gnuCashDay(raw.trim());
        break;
      case "split-account":
        this.split!.account = raw.trim();
        break;
      case "split-quantity":
        this.split!.quantity = raw.trim();
        break;
      case "slot-key":
        this.topSlotKey = raw;
        break;
      case "feature-name":
        this.features.push(raw);
        break;
    }
  }

  private finishAccount(): void {
    const draft = this.account!;
    this.account = null;
    // Template accounts only hold the scheduled transactions' lines. They are never offered to
    // tick, and since scheduled lines are never counted nothing needs to find them again.
    if (this.accountIsTemplate) return;

    if (draft.id === null || draft.id === "") throw new Refusal(DAMAGED);
    this.accounts.push({ ...draft, id: draft.id });
  }

  private finishTransaction(): void {
    const draft = this.transaction!;
    this.transaction = null;
    this.shape = null;
    for (const split of draft.splits) {
      // A split with no account can't be placed anywhere; the file is damaged.
      if (split.account === null || split.account === "") throw new Refusal(DAMAGED);
      this.lines.push({
        accountId: split.account,
        day: draft.day,
        // The quantity is in the account's OWN commodity (the value is in the transaction's currency).
        amount: split.quantity === null ? null : parseFraction(split.quantity),
        scheduled: draft.scheduled,
      });
    }
  }
}

/** True for a text file whose first real character is "<". */
function startsLikeXml(bytes: Uint8Array): boolean {
  let i = 0;
  // Skip a UTF-8 byte-order mark and any leading whitespace.
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) i = 3;
  while (
    i < bytes.length &&
    (bytes[i] === 0x20 || bytes[i] === 0x09 || bytes[i] === 0x0a || bytes[i] === 0x0d)
  ) {
    i += 1;
  }
  return bytes[i] === 0x3c;
}

const isGzip = (bytes: Uint8Array) => bytes.length >= 3 && bytes[0] === 0x1f && bytes[1] === 0x8b;

/** "SQLite format 3" and a NUL: how every SQLite database file begins. */
function isSqlite(bytes: Uint8Array): boolean {
  const magic = "SQLite format 3\u0000";
  return (
    bytes.length >= magic.length && Array.from(magic).every((c, i) => bytes[i] === c.charCodeAt(0))
  );
}

/**
 * Could these first bytes be a GnuCash XML book? True for a gzip file (it can only be told for sure
 * once opened, and readGnuCashBook then says plainly if it isn't a book) and for XML that opens a
 * gnc-v2 element early on. The window uses it to send a dropped file here rather than to the
 * spreadsheet reader.
 */
export function looksLikeGnuCash(head: Uint8Array): boolean {
  if (isGzip(head)) return true;
  if (!startsLikeXml(head)) return false;
  return new TextDecoder("utf-8").decode(head.subarray(0, 2048)).includes("<gnc-v2");
}

/** Unpacks a gzip file to text in slices, stopping the moment it would pass `maxBytes`. */
function gunzipToText(bytes: Uint8Array, maxBytes: number): string {
  const decoder = new TextDecoder("utf-8", { fatal: true });
  const pieces: string[] = [];
  let total = 0;

  const gunzip = new Gunzip((chunk) => {
    total += chunk.length;
    if (total > maxBytes) throw new Refusal(TOO_BIG_INSIDE);
    pieces.push(decoder.decode(chunk, { stream: true }));
  });
  // Pushing a slice at a time (instead of the whole file) is what lets the limit bite early: a
  // compressed bomb of a few MB would otherwise be inflated in one go before anything could object.
  for (let at = 0; at < bytes.length; at += GZIP_SLICE_BYTES) {
    gunzip.push(bytes.subarray(at, at + GZIP_SLICE_BYTES), at + GZIP_SLICE_BYTES >= bytes.length);
  }
  pieces.push(decoder.decode());
  return pieces.join("");
}

/** An account's path from the top, e.g. "Income:Consulting"; the book's invisible root adds nothing. */
function fullNameOf(id: string, byId: Map<string, FinishedAccount>, rootIds: Set<string>): string {
  const parts: string[] = [];
  let current = id;
  // The hop limit stops a damaged book whose parents loop back on themselves.
  for (let hops = 0; hops <= 100; hops += 1) {
    const account = byId.get(current);
    if (!account) throw new Refusal(DAMAGED);
    if (!rootIds.has(current)) parts.unshift(account.name ?? "");
    if (!account.parent) return parts.join(":");
    current = account.parent;
  }
  throw new Refusal(DAMAGED);
}

/** Turns what the walk gathered into the shared shapes, checking the book hangs together. */
function assemble(collector: Collector): BookReadResult {
  if (collector.books === 0) throw new Refusal(NO_BOOK);
  if (collector.books > 1) throw new Refusal(DAMAGED);

  // 1. Features: refuse any GnuCash 5 doesn't know, by name, the way GnuCash itself does.
  const unknown = [...new Set(collector.features)].filter(
    (f) => !KNOWN_GNUCASH_FEATURES.includes(f),
  );
  if (unknown.length > 0) {
    throw new Refusal(
      `That book uses ${unknown.length === 1 ? "a GnuCash feature" : "GnuCash features"} DotAmi doesn't know (${listNames(unknown)}). It was probably saved by a newer GnuCash. DotAmi won't guess, so it read nothing.`,
    );
  }

  // 2. Accounts.
  const byId = new Map<string, FinishedAccount>();
  const roots = new Set<string>();
  for (const draft of collector.accounts) {
    if (draft.name === null || draft.type === null || draft.type === "") throw new Refusal(DAMAGED);
    if (byId.has(draft.id)) throw new Refusal(DAMAGED);
    byId.set(draft.id, draft);
    if (draft.type === "ROOT") roots.add(draft.id);
    else if (!Object.hasOwn(ACCOUNT_SIDES, draft.type)) {
      throw new Refusal(
        `That book has an account type DotAmi doesn't know ("${tidyName(draft.type)}"). It was probably saved by a newer GnuCash. DotAmi won't guess, so it read nothing.`,
      );
    }
  }

  const accounts: BookAccount[] = [];
  for (const draft of collector.accounts) {
    if (roots.has(draft.id)) continue; // the book's invisible top; nothing to tick
    const type = draft.type as string;
    // Only a real currency counts as one: GnuCash's own "CURRENCY" namespace (older books say
    // "ISO4217") with a three-letter code. Shares and other commodities live in other namespaces.
    const isCurrency =
      (draft.commoditySpace === "CURRENCY" || draft.commoditySpace === "ISO4217") &&
      /^[A-Z]{3}$/.test(draft.commodityId ?? "");
    accounts.push({
      id: draft.id,
      fullName: fullNameOf(draft.id, byId, roots),
      bookType: type,
      side: ACCOUNT_SIDES[type],
      currency: isCurrency ? (draft.commodityId as string) : null,
      markedAsRevenue: type === "INCOME",
    });
  }
  accounts.sort((a, b) => (a.fullName < b.fullName ? -1 : a.fullName > b.fullName ? 1 : 0));

  // 3. Every posted line must land on an account the book has (scheduled lines are never counted,
  //    so their template accounts are not checked).
  for (const line of collector.lines) {
    if (line.scheduled) continue;
    if (!byId.has(line.accountId)) throw new Refusal(DAMAGED);
  }

  return { ok: true, book: { format: "gnucash-xml", accounts, lines: collector.lines } };
}

/**
 * Reads a GnuCash XML book from the dropped file's bytes. Never throws: a book it can't read with
 * certainty comes back as { ok: false, error } with a sentence for the person.
 *
 * @param maxUnpackedBytes only for tests: a smaller limit than MAX_UNPACKED_BYTES, so a zip bomb
 *   can be proved stopped without building a 200 MB one.
 */
export function readGnuCashBook(
  bytes: Uint8Array,
  maxUnpackedBytes: number = MAX_UNPACKED_BYTES,
): BookReadResult {
  try {
    if (bytes.length === 0) return { ok: false, error: EMPTY };
    if (bytes.length > MAX_FILE_BYTES) return { ok: false, error: TOO_BIG };
    if (isSqlite(bytes)) return { ok: false, error: SQLITE };

    let text: string;
    if (isGzip(bytes)) {
      text = gunzipToText(bytes, maxUnpackedBytes);
    } else if (startsLikeXml(bytes)) {
      text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    } else {
      return { ok: false, error: NOT_GNUCASH };
    }

    const collector = new Collector();
    walkXml(text, collector);
    return assemble(collector);
  } catch (error) {
    // Only this file's own fixed sentences are passed on; a library's message could quote the book.
    if (error instanceof Refusal) return { ok: false, error: error.sentence };
    if (error instanceof XmlRefusal) {
      if (
        error.reason === "doctype" ||
        error.reason === "entity" ||
        error.reason === "unsupported"
      ) {
        return { ok: false, error: ODD_XML };
      }
      return { ok: false, error: error.reason === "encoding" ? NOT_UTF8 : DAMAGED };
    }
    // The text decoder (fatal: true) throws a TypeError for bytes that aren't valid UTF-8.
    if (error instanceof TypeError) return { ok: false, error: NOT_UTF8 };
    return { ok: false, error: DAMAGED };
  }
}
