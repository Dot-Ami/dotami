/**
 * [8h] A GnuCash book on the "Add from a file" screen: what starts ticked, what can't be ticked,
 * the left-out words, the body proposed under the "books" source kind, and the background reader
 * (its worker's answer, its time limit, and stopping it). The books are invented
 * (tests/helpers/make-gnucash.ts); the worker is a stand-in, since these tests run in Node.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { SOURCE_KIND_WORDS } from "@/components/your-data/format";
import { MAX_BOOK_BYTES } from "@/lib/figures/books/detect";
import { readGnuCashBook } from "@/lib/figures/books/gnucash-xml";
import {
  BOOK_READ_FAILED,
  BOOK_READ_TOO_SLOW,
  BookReader,
  type BookWorkerLike,
} from "@/lib/figures/books/read-book";
import {
  accountTypeWords,
  bookProposal,
  initialTicks,
  skipSummary,
  skipWords,
  tickable,
} from "@/lib/figures/books/review";
import { booksMonthlyTotals, splitKnownByCurrency } from "@/lib/figures/books/totals";
import type { BookAccount, BookData } from "@/lib/figures/books/types";
import { answerBookMessage } from "@/lib/figures/books/worker-answer";
import {
  BOOK_READ_TIMEOUT_MS,
  BOOK_REPLY_LABEL,
  type BookWorkerRequest,
} from "@/lib/figures/books/worker-protocol";
import { FIGURE_SOURCE_KINDS } from "@/lib/figures/types";
import { validateFigureInput, validateFigureSource } from "@/lib/figures/validate";
import { GOLDEN_BOOK_XML, gnucashGz, gnucashXml, smallBook } from "./helpers/make-gnucash";

const text = (s: string) => new TextEncoder().encode(s);

function bookOf(bytes: Uint8Array): BookData {
  const result = readGnuCashBook(bytes);
  if (!result.ok) throw new Error(`expected a book, got: ${result.error}`);
  return result.book;
}

const account = (over: Partial<BookAccount>): BookAccount => ({
  id: "a",
  fullName: "Income:Sales",
  bookType: "INCOME",
  side: "credit",
  currency: "CAD",
  markedAsRevenue: true,
  ...over,
});

describe("the source kind", () => {
  it("is 'books', appended to the list (ids are forever), and reads 'Books / file' to people", () => {
    expect(FIGURE_SOURCE_KINDS).toEqual(["typed", "file", "agent", "tax-return", "books"]);
    expect(SOURCE_KIND_WORDS.books).toBe("Books / file");
    expect(validateFigureSource({ kind: "books", label: "maple-studio.gnucash", rows: 4 })).toEqual({
      ok: true,
      value: { kind: "books", label: "maple-studio.gnucash", rows: 4 },
    });
  });
});

describe("which accounts start ticked", () => {
  it("every account GnuCash marks as income, interest included: it is shown and ticked, never hidden", () => {
    const book = bookOf(text(GOLDEN_BOOK_XML));
    const names = book.accounts.map((a) => a.fullName);
    // Every account of the book is on the list, the bank, the expenses and the parent accounts too.
    expect(names).toEqual([
      "Assets",
      "Assets:Chequing",
      "Expenses",
      "Income",
      "Income:Consulting & Design",
      "Income:Interest",
    ]);
    // Ticked to start: exactly the ones GnuCash marks as income, interest included.
    const ticked = initialTicks(book.accounts).map((id) => book.accounts.find((a) => a.id === id)!.fullName);
    expect(ticked).toEqual(["Income", "Income:Consulting & Design", "Income:Interest"]);
  });

  it("an income account that holds shares, or has no direction, is not ticked and says why", () => {
    const shares = account({ id: "s", currency: null });
    const odd = account({ id: "n", side: null, bookType: "NONE", markedAsRevenue: false });
    const sales = account({ id: "ok" });
    expect(initialTicks([shares, odd, sales])).toEqual(["ok"]);
    expect(tickable(shares)).toBe("holds shares or something else that isn't money");
    expect(tickable(odd)).toBe("GnuCash doesn't say which way this account counts");
    expect(tickable(sales)).toBeNull();
  });

  it("names GnuCash's account types in plain words", () => {
    expect(accountTypeWords("INCOME")).toBe("Income");
    expect(accountTypeWords("CHECKING")).toBe("Chequing");
    expect(accountTypeWords("RECEIVABLE")).toBe("Accounts receivable");
  });
});

describe("from ticks to the proposal", () => {
  it("unticking interest takes it out of the totals; the proposal is 'books' with one figure per month and currency", () => {
    const book = bookOf(gnucashGz(GOLDEN_BOOK_XML));
    const id = (name: string) => book.accounts.find((a) => a.fullName === name)!.id;
    const ticks = initialTicks(book.accounts);

    const withInterest = booksMonthlyTotals(book, ticks, "2026-10-06");
    const withoutInterest = booksMonthlyTotals(
      book,
      ticks.filter((t) => t !== id("Income:Interest")),
      "2026-10-06",
    );
    if (!withInterest.ok || !withoutInterest.ok) throw new Error("expected totals");
    const feb = (r: typeof withInterest) =>
      r.ok ? r.currencies[0].months.find((m) => m.periodStart === "2026-02-01")!.amountCents : NaN;
    // February: 2,500.00 of sales less a 300.00 refund, plus 12.34 of interest while it is ticked.
    expect(feb(withInterest)).toBe(221234);
    expect(feb(withoutInterest)).toBe(220000);

    const splits = splitKnownByCurrency(withoutInterest.currencies, []);
    const body = bookProposal("idea-1", "maple-test-studio.gnucash", splits);
    expect(body.source).toEqual({ kind: "books", label: "maple-test-studio.gnucash", rows: 3 });
    expect(body.figures).toEqual([
      { kind: "gross-revenue", periodStart: "2026-01-01", periodEnd: "2026-01-31", amountCents: 120000, currency: "CAD", rows: 1 },
      { kind: "gross-revenue", periodStart: "2026-02-01", periodEnd: "2026-02-28", amountCents: 220000, currency: "CAD", rows: 2 },
    ]);
    // The figures store would take every one of them as it stands.
    expect(validateFigureSource(body.source).ok).toBe(true);
    for (const f of body.figures) expect(validateFigureInput(f, "2026-10-06").ok).toBe(true);
  });

  it("each currency keeps its own months; nothing is converted or added across currencies", () => {
    const book = bookOf(
      text(
        gnucashXml(
          smallBook({
            transactions: [
              { date: "2026-03-10", splits: [{ account: "bank", quantity: "10000/100" }, { account: "sales", quantity: "-10000/100" }] },
              { date: "2026-03-11", splits: [{ account: "bank", quantity: "5000/100", value: "6800/100" }, { account: "usd", quantity: "-5000/100", value: "-6800/100" }] },
            ],
          }),
        ),
      ),
    );
    const totals = booksMonthlyTotals(book, initialTicks(book.accounts), "2026-10-08");
    if (!totals.ok) throw new Error(totals.error);
    const body = bookProposal("idea-1", "two-currencies.gnucash", splitKnownByCurrency(totals.currencies, []));
    expect(body.figures.map((f) => [f.currency, f.amountCents])).toEqual([
      ["CAD", 10000],
      ["USD", 5000],
    ]);
  });

  it("a month already in DotAmi with the same total isn't proposed again", () => {
    const book = bookOf(text(GOLDEN_BOOK_XML));
    const totals = booksMonthlyTotals(book, initialTicks(book.accounts), "2026-10-06");
    if (!totals.ok) throw new Error(totals.error);
    const january = totals.currencies[0].months[0];
    const existing = [
      { kind: "gross-revenue" as const, periodStart: january.periodStart, periodEnd: january.periodEnd, amountCents: january.amountCents, currency: "CAD", status: "confirmed" as const },
    ];
    const [cad] = splitKnownByCurrency(totals.currencies, existing);
    expect(cad.known.map((m) => m.periodStart)).toEqual(["2026-01-01"]);
    expect(bookProposal("i", "b.gnucash", [cad]).figures.map((f) => f.periodStart)).not.toContain("2026-01-01");
  });

  it("left-out lines are added up by reason, the most important first, in plain words", () => {
    const summary = skipSummary([
      { reason: "not-over", accountId: "a", month: "2026-10", lines: 2 },
      { reason: "not-cents", accountId: "a", month: "2026-01", lines: 1 },
      { reason: "not-over", accountId: "b", month: "2026-10", lines: 3 },
      // Told once, book-wide, by the screen's own scheduled-transactions line instead.
      { reason: "scheduled", accountId: "a", month: "2026-11", lines: 1 },
    ]);
    expect(summary).toEqual([
      { reason: "not-cents", lines: 1 },
      { reason: "not-over", lines: 5 },
    ]);
    expect(skipWords("not-over", 5)).toBe("5 lines in a month that isn't over yet");
    expect(skipWords("not-cents", 1)).toBe("1 line with an amount that isn't whole cents (DotAmi never rounds)");
  });
});

describe("the books worker's answer", () => {
  it("answers a book's bytes with the reader's own result, labelled", () => {
    const bytes = gnucashGz(GOLDEN_BOOK_XML);
    expect(answerBookMessage({ bytes })).toEqual({ label: BOOK_REPLY_LABEL, result: readGnuCashBook(bytes) });
  });

  it("answers a refusal as a sentence, and ignores anything that isn't a book to read", () => {
    const reply = answerBookMessage({ bytes: text("date,amount\n") });
    expect(reply?.result.ok).toBe(false);
    for (const junk of [null, undefined, "x", {}, { bytes: "not bytes" }, { bytes: [1, 2] }]) {
      expect(answerBookMessage(junk)).toBeNull();
    }
  });
});

/** A stand-in for the browser's Worker: records what it was sent, and replies only when told to. */
class FakeWorker implements BookWorkerLike {
  sent: { message: BookWorkerRequest; transfer: Transferable[] }[] = [];
  terminated = false;
  private listeners = new Map<string, Set<(event: MessageEvent<unknown>) => void>>();

  postMessage(message: BookWorkerRequest, transfer: Transferable[]) {
    this.sent.push({ message, transfer });
  }
  addEventListener(type: string, listener: (event: MessageEvent<unknown>) => void) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type)!.add(listener);
  }
  removeEventListener(type: string, listener: (event: MessageEvent<unknown>) => void) {
    this.listeners.get(type)?.delete(listener);
  }
  terminate() {
    this.terminated = true;
  }
  emit(type: "message" | "error", data?: unknown) {
    for (const l of [...(this.listeners.get(type) ?? [])]) l({ data } as MessageEvent<unknown>);
  }
}

/** Lets the reader's `await file.arrayBuffer()` finish, so the message has been posted. */
const settle = () => new Promise((resolve) => setImmediate(resolve));

describe("BookReader: the book is read in a background worker, with a time limit", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("moves the book's bytes into the worker and hands back its labelled answer, ignoring other messages", async () => {
    const workers: FakeWorker[] = [];
    const reader = new BookReader(() => {
      const w = new FakeWorker();
      workers.push(w);
      return w;
    });
    const bytes = gnucashGz(GOLDEN_BOOK_XML);
    const reading = reader.read(new Blob([bytes as Uint8Array<ArrayBuffer>]));
    await settle();
    expect(workers).toHaveLength(1);
    const [{ message, transfer }] = workers[0].sent;
    expect(message.bytes).toEqual(bytes);
    // Transferred, not copied: the buffer is in the transfer list.
    expect(transfer).toEqual([message.bytes.buffer]);

    workers[0].emit("message", { label: "something else", result: { ok: true } });
    const answer = answerBookMessage(message)!;
    workers[0].emit("message", answer);
    expect(await reading).toEqual(answer.result);
  });

  it("stops the worker once a read passes the time limit, and says so", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const worker = new FakeWorker();
    const reader = new BookReader(() => worker);
    const reading = reader.read(new Blob([text("<gnc-v2/>")]));
    await settle();
    expect(worker.sent).toHaveLength(1);
    // Never answers: a book that would keep the thread busy for good.
    vi.advanceTimersByTime(BOOK_READ_TIMEOUT_MS - 1);
    expect(worker.terminated).toBe(false);
    vi.advanceTimersByTime(1);
    expect(await reading).toEqual({ ok: false, error: BOOK_READ_TOO_SLOW });
    expect(worker.terminated).toBe(true);
    expect(BOOK_READ_TIMEOUT_MS).toBe(60_000);
  });

  it("a worker that fails (out of memory, say) is stopped, and the person gets a plain sentence", async () => {
    const worker = new FakeWorker();
    const reader = new BookReader(() => worker);
    const reading = reader.read(new Blob([text("<gnc-v2/>")]));
    await settle();
    worker.emit("error");
    expect(await reading).toEqual({ ok: false, error: BOOK_READ_FAILED });
    expect(worker.terminated).toBe(true);
  });

  it("a book over 50 MB is refused without a byte read and without starting a worker", async () => {
    let started = 0;
    const reader = new BookReader(() => {
      started += 1;
      return new FakeWorker();
    });
    const huge = { size: MAX_BOOK_BYTES + 1, arrayBuffer: () => Promise.reject(new Error("read")) } as unknown as Blob;
    expect(await reader.read(huge)).toEqual({
      ok: false,
      error: "That GnuCash book is over 50 MB, more than DotAmi reads.",
    });
    expect(started).toBe(0);
  });

  it("closing the panel, or a new file, stops the read in flight and its worker", async () => {
    const workers: FakeWorker[] = [];
    const reader = new BookReader(() => {
      const w = new FakeWorker();
      workers.push(w);
      return w;
    });
    const first = reader.read(new Blob([text("<gnc-v2/>")]));
    await settle();
    const second = reader.read(new Blob([text("<gnc-v2/>")]));
    await settle();
    expect(workers).toHaveLength(2);
    expect(workers[0].terminated).toBe(true);
    expect((await first).ok).toBe(false);

    reader.close();
    expect(workers[1].terminated).toBe(true);
    const stopped = await second;
    expect(stopped.ok).toBe(false);
    if (!stopped.ok) expect(stopped.error).toContain("Nothing was kept");
  });
});
