/**
 * [8h] What a GnuCash transaction is allowed to hold, so the reader never reads around a part of
 * the book it doesn't understand.
 *
 * Why it exists: gnucash-xml.ts picks the few parts it needs (a split's account and quantity, the
 * posted day) out of a transaction. Without a check on everything else, a split wrapped in an
 * element the reader doesn't know simply isn't picked up, and the book adds up short with nothing
 * said. This walks the same elements and says "unknown" or "twice" the moment one doesn't fit.
 *
 * The parts are those GnuCash's schema lists for a transaction, a split and a timestamp
 * (libgnucash/backend/xml/DTD/gnucash-v2.rnc on GnuCash's stable branch, read 2026-10-06; the same
 * file puts transactions only in gnc:book and gnc:template-transactions). Its own loader
 * (libgnucash/backend/xml/sixtp-dom-parsers.cpp, gnc_xml_set_data, same date) fails a transaction
 * or split holding a tag it has no handler for, so refusing is what GnuCash does too. The schema
 * allows each part once. The loader runs a part's handler for every copy in turn, so with two
 * quantities the last would win — the thing DotAmi must not do silently. The order of the parts
 * isn't checked: the loader reads a transaction's children in whatever order they come.
 *
 * Runs inside the one reader; nothing here keeps or logs the book's text, only element names.
 */

/** Marks an element holding GnuCash's free-form key/value data (slots): any nesting inside, never read. */
const FREE = "free" as const;
type Parts = readonly string[] | typeof FREE;

/** A timestamp holds a date and, in some books, a nanosecond count. */
const TIMESTAMP: readonly string[] = ["ts:date", "ts:ns"];

/** An element that holds only text. */
const TEXT: readonly string[] = [];

/**
 * Every element that may appear inside a transaction, and the elements it may itself hold. An
 * element not listed as a key is never allowed, so it is not possible to go below it.
 */
const SHAPE: ReadonlyMap<string, Parts> = new Map<string, Parts>([
  [
    "gnc:transaction",
    [
      "trn:id",
      "trn:currency",
      "trn:num",
      "trn:date-posted",
      "trn:date-entered",
      "trn:description",
      "trn:slots",
      "trn:splits",
    ],
  ],
  ["trn:id", TEXT],
  ["trn:num", TEXT],
  ["trn:description", TEXT],
  ["trn:currency", ["cmdty:space", "cmdty:id"]],
  ["cmdty:space", TEXT],
  ["cmdty:id", TEXT],
  ["trn:date-posted", TIMESTAMP],
  ["trn:date-entered", TIMESTAMP],
  ["ts:date", TEXT],
  ["ts:ns", TEXT],
  ["trn:slots", FREE],
  ["trn:splits", ["trn:split"]],
  [
    "trn:split",
    [
      "split:id",
      "split:memo",
      "split:action",
      "split:reconciled-state",
      "split:reconcile-date",
      "split:value",
      "split:quantity",
      "split:account",
      "split:lot",
      "split:slots",
    ],
  ],
  ["split:id", TEXT],
  ["split:memo", TEXT],
  ["split:action", TEXT],
  ["split:reconciled-state", TEXT],
  ["split:reconcile-date", TIMESTAMP],
  ["split:value", TEXT],
  ["split:quantity", TEXT],
  ["split:account", TEXT],
  ["split:lot", TEXT],
  ["split:slots", FREE],
]);

/** The only element that may be repeated inside its parent: a transaction has many splits. */
const REPEATABLE = "trn:split";

/** What is wrong with the element that just opened. */
export type ShapeProblem =
  /** An element the schema doesn't list at this place. `name` is as written in the file. */
  | { kind: "unknown"; name: string }
  /** A part that may appear once, appearing again. */
  | { kind: "twice" };

/**
 * Follows one transaction element by element. Make one when a gnc:transaction opens, call `open`
 * for every element that opens inside it and `close` for every one that closes inside it (not for
 * the transaction's own closing tag), and drop it when the transaction ends.
 */
export class TransactionShape {
  /** The open elements, outermost first; the transaction itself to begin with. */
  private readonly names: string[] = ["gnc:transaction"];
  /** For each open element, which of its parts have been seen so far. */
  private readonly seen: Set<string>[] = [new Set()];
  /** How many elements are open inside a free-form (slots) element at the moment. */
  private insideFree = 0;

  /** Checks an element that just opened inside the transaction; null when it fits. */
  open(name: string): ShapeProblem | null {
    const parent = this.names[this.names.length - 1];
    const allowed = SHAPE.get(parent);

    // Inside a slots element anything goes: it is the person's notes and GnuCash's own settings.
    if (allowed === FREE) {
      this.insideFree += 1;
      return null;
    }
    if (allowed === undefined || !allowed.includes(name)) return { kind: "unknown", name };

    const siblings = this.seen[this.seen.length - 1];
    if (name !== REPEATABLE && siblings.has(name)) return { kind: "twice" };
    siblings.add(name);

    this.names.push(name);
    this.seen.push(new Set());
    return null;
  }

  /** An element inside the transaction closed. */
  close(): void {
    if (this.insideFree > 0) {
      this.insideFree -= 1;
      return;
    }
    this.names.pop();
    this.seen.pop();
  }
}
