/**
 * [8i] Showing a receipt inside DotAmi, the parts that run outside a browser (the security design is
 * § 8 of docs/architecture/expense-records.md; e2e/expenses.spec.ts drives the viewer itself with
 * hostile files):
 *
 *   - the server reads a receipt only by its row, refuses a file that changed, grew or went missing,
 *     and answers only DotAmi's own page, with headers that keep the bytes from ever being a page;
 *   - the window reads the bytes again and refuses any that aren't the type the row stored, or a
 *     picture over the pixel limits, before anything decodes them;
 *   - a PDF page's drawing size stays within the limits;
 *   - the HEIC worker is ended after 20 seconds, when it fails or when the viewer closes, and only a
 *     real failure stops HEIC photos for the session (closing, or a computer that can't decode, doesn't);
 *   - nothing in the app puts a receipt in a frame, an <embed> or an <object>, and the desktop app
 *     leaves Electron's plugins (its PDF viewer) off.
 *
 * Every name and number is invented.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import type { PrismaClient } from "@prisma/client";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { __resetRateLimitStateForTests } from "@/lib/api/rate-limit";
import { createDatabaseClient } from "@/lib/db/client";
import { RECEIPT_FILE_HEADERS } from "@/lib/expenses/receipts/file-headers";
import { RECEIPT_REFUSALS } from "@/lib/expenses/receipts/refusals";
import { addReceipt, readReceiptFile, ReceiptError } from "@/lib/expenses/receipts/store";
import { MAX_IMAGE_PIXELS } from "@/lib/expenses/receipts/types";
import { pageScale } from "@/lib/expenses/receipts/viewer/draw-pdf";
import { VIEW_MESSAGES } from "@/lib/expenses/receipts/viewer/messages";
import { __resetHeicSessionForTests, heicStopped } from "@/lib/expenses/receipts/viewer/heic-session";
import { checkShownBytes, ReceiptOpener } from "@/lib/expenses/receipts/viewer/open";
import { HEIC_REPLY_LABEL, MAX_PAGE_PIXELS, PAGE_TARGET_WIDTH, VIEW_TIMEOUT_MS } from "@/lib/expenses/receipts/viewer/types";
import { heic } from "./helpers/heic-files";
import { jpegHeader, pdf, png } from "./helpers/receipt-files";

vi.setConfig({ testTimeout: 60_000, hookTimeout: 120_000 });

const bytes = (b: Buffer | string) => new Uint8Array(typeof b === "string" ? Buffer.from(b, "latin1") : b);

describe("the window checks the bytes again before anything is drawn (rule 1)", () => {
  it("shows each of the four kinds only as the type the row stored", () => {
    expect(checkShownBytes(bytes(png(4, 3)), "image/png")).toEqual({ ok: true, type: "image/png", width: 4, height: 3 });
    expect(checkShownBytes(bytes(jpegHeader(800, 600)), "image/jpeg")).toMatchObject({ ok: true, type: "image/jpeg" });
    expect(checkShownBytes(bytes(pdf()), "application/pdf")).toMatchObject({ ok: true, type: "application/pdf" });
  });

  it("refuses a file that isn't what the row says: a PDF under a picture's row, a picture under a PDF's", () => {
    expect(checkShownBytes(bytes(pdf()), "image/png")).toEqual({ ok: false, message: VIEW_MESSAGES.replaced });
    expect(checkShownBytes(bytes(png(2, 2)), "application/pdf")).toEqual({ ok: false, message: VIEW_MESSAGES.replaced });
    expect(checkShownBytes(bytes(png(2, 2)), "image/jpeg")).toEqual({ ok: false, message: VIEW_MESSAGES.replaced });
  });

  it("refuses an SVG or a web page put where a picture was, and a picture over the limits, before decoding", () => {
    expect(checkShownBytes(bytes('<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"/>'), "image/png")).toEqual({
      ok: false,
      message: VIEW_MESSAGES.unreadable,
    });
    expect(checkShownBytes(bytes("<html><script>alert(1)</script></html>"), "application/pdf")).toEqual({
      ok: false,
      message: VIEW_MESSAGES.unreadable,
    });
    const bomb = png(1, 1, { claim: { width: 30_000, height: 30_000 } });
    expect(checkShownBytes(bytes(bomb), "image/png")).toEqual({ ok: false, message: RECEIPT_REFUSALS["too-many-pixels"] });
  });

  it("takes a polyglot as its first bytes say: a PNG with a web page after its end is a PNG", () => {
    const polyglot = Buffer.concat([png(3, 3), Buffer.from("<html><script>alert(1)</script></html>", "latin1")]);
    expect(checkShownBytes(bytes(polyglot), "image/png")).toMatchObject({ ok: true, type: "image/png" });
  });
});

describe("a PDF page is drawn within the limits (rule 4)", () => {
  it("draws a letter page at the target width, and lowers the scale for a huge or very long page", () => {
    // US letter, 612 × 792 points.
    expect(Math.round(612 * pageScale(612, 792))).toBe(PAGE_TARGET_WIDTH);
    // A long page (8.5 × 69 inches): at the target width it would be 1,600 × 13,072, about 21
    // megapixels, so the scale is lowered to 16 megapixels.
    const long = pageScale(612, 5_000);
    expect(612 * long * 5_000 * long).toBeLessThanOrEqual(MAX_PAGE_PIXELS * 1.0001);
    expect(612 * long * 5_000 * long).toBeGreaterThan(MAX_PAGE_PIXELS * 0.999);
    expect(612 * long).toBeLessThan(PAGE_TARGET_WIDTH);
    // A till roll 3 inches wide and 30 feet long: no side over 16,384 pixels.
    const roll = pageScale(216, 25_920);
    expect(25_920 * roll).toBeLessThanOrEqual(16_384.0001);
    expect(216 * roll * 25_920 * roll).toBeLessThanOrEqual(MAX_PAGE_PIXELS * 1.0001);
    // A page with no size isn't drawn.
    for (const [w, h] of [[0, 792], [612, 0], [-1, 5], [Number.NaN, 5], [Number.POSITIVE_INFINITY, 5]]) expect(pageScale(w, h)).toBe(0);
    // Pictures inside a PDF are capped at the same pixel limit as a receipt picture.
    expect(readFileSync(path.join(process.cwd(), "lib", "expenses", "receipts", "viewer", "draw-pdf.ts"), "utf8")).toContain(
      "maxImageSize: MAX_IMAGE_PIXELS",
    );
    expect(MAX_IMAGE_PIXELS).toBe(50_000_000);
  });
});

describe("closing the viewer ends its work", () => {
  // The viewer closes the opener when it goes away. If that happens while the bytes are still on
  // their way, the PDF must not be handed to a new worker that nothing will ever end.
  it("starts no PDF worker once closed, even when the bytes arrive afterwards", async () => {
    let started = 0;
    class CountingWorker {
      constructor() {
        started += 1;
      }
      addEventListener() {}
      removeEventListener() {}
      postMessage() {}
      terminate() {}
    }
    let arrive!: (r: Response) => void;
    vi.stubGlobal("Worker", CountingWorker);
    vi.stubGlobal("fetch", () => new Promise<Response>((resolve) => (arrive = resolve)));
    try {
      const opener = new ReceiptOpener();
      const opening = opener.open("any-record", "application/pdf");
      opener.close();
      arrive(new Response(new Uint8Array(pdf()), { status: 200 }));
      const result = await opening;
      expect(result.ok).toBe(false);
      expect(started).toBe(0);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

describe("the HEIC worker is ended, and a failure remembered, whatever happens (option D)", () => {
  /** A stand-in for the HEIC worker: it never answers unless a test makes it. */
  class FakeWorker {
    static all: FakeWorker[] = [];
    listeners = new Map<string, ((event: unknown) => void)[]>();
    posted = 0;
    terminated = false;
    constructor() {
      FakeWorker.all.push(this);
    }
    addEventListener(type: string, listener: (event: unknown) => void) {
      this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener]);
    }
    removeEventListener() {}
    postMessage() {
      this.posted += 1;
    }
    terminate() {
      this.terminated = true;
    }
    fire(type: string, event: unknown) {
      for (const listener of this.listeners.get(type) ?? []) listener(event);
    }
  }

  /** Opens an invented HEIC receipt and waits until its bytes have been handed to a worker. */
  async function openHeic(opener: ReceiptOpener): Promise<{ opening: Promise<Awaited<ReturnType<ReceiptOpener["open"]>>>; worker: FakeWorker }> {
    const opening = opener.open("any-record", "image/heic");
    // setImmediate isn't faked, so the fetch and the checks run while the 20-second timer stands still.
    for (let i = 0; i < 200 && !FakeWorker.all.some((w) => w.posted > 0); i += 1) await new Promise((r) => setImmediate(r));
    const worker = FakeWorker.all.find((w) => w.posted > 0);
    if (!worker) throw new Error("the HEIC never reached a worker");
    return { opening, worker };
  }

  beforeEach(() => {
    FakeWorker.all = [];
    __resetHeicSessionForTests();
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    vi.stubGlobal("Worker", FakeWorker);
    vi.stubGlobal("fetch", async () => new Response(new Uint8Array(heic()), { status: 200 }));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    __resetHeicSessionForTests();
  });

  it("ends a worker that never answers after 20 seconds, says so, and asks the graphics chip nothing more this session", async () => {
    const opener = new ReceiptOpener();
    const { opening, worker } = await openHeic(opener);
    // Just before the limit: still waiting.
    vi.advanceTimersByTime(VIEW_TIMEOUT_MS - 1);
    expect(worker.terminated).toBe(false);
    vi.advanceTimersByTime(1);
    expect(await opening).toEqual({ ok: false, message: VIEW_MESSAGES.heicFailed });
    expect(worker.terminated).toBe(true);
    expect(await heicStopped()).toBe(true);
    // The next HEIC is not even fetched: no worker, the plain sentence.
    expect(await new ReceiptOpener().open("another-record", "image/heic")).toEqual({ ok: false, message: VIEW_MESSAGES.heicStopped });
    expect(FakeWorker.all).toHaveLength(1);
  });

  it("treats the worker itself failing (a crash, a script that didn't load) as a failure", async () => {
    const { opening, worker } = await openHeic(new ReceiptOpener());
    worker.fire("error", new Event("error"));
    expect(await opening).toEqual({ ok: false, message: VIEW_MESSAGES.heicFailed });
    expect(worker.terminated).toBe(true);
    expect(await heicStopped()).toBe(true);
  });

  it("ends the worker when the viewer closes mid-drawing, without counting that as a failure", async () => {
    const opener = new ReceiptOpener();
    const { opening, worker } = await openHeic(opener);
    opener.close();
    expect(worker.terminated).toBe(true);
    expect((await opening).ok).toBe(false);
    expect(await heicStopped()).toBe(false);
    // And the timer it left behind does nothing later.
    vi.advanceTimersByTime(VIEW_TIMEOUT_MS);
    expect(await heicStopped()).toBe(false);
  });

  it("does not count a computer that can't decode HEVC as a failure: the next HEIC is still tried", async () => {
    const { opening, worker } = await openHeic(new ReceiptOpener());
    worker.fire("message", { data: { label: HEIC_REPLY_LABEL, result: { ok: false, code: "unsupported" } } });
    expect(await opening).toEqual({ ok: false, message: VIEW_MESSAGES.heicUnsupported });
    expect(worker.terminated).toBe(true);
    expect(await heicStopped()).toBe(false);
  });
});

describe("no frame, no embedded viewer, no plugins (rule 5)", () => {
  it("nothing in the app's pages puts anything in an <iframe>, <embed> or <object>, and the page policy refuses frames", () => {
    const files = (dir: string): string[] =>
      readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
        e.isDirectory() ? files(path.join(dir, e.name)) : /\.(tsx?|mjs)$/.test(e.name) ? [path.join(dir, e.name)] : [],
      );
    const sources = ["app", "components", "lib"].flatMap((d) => files(path.join(process.cwd(), d)));
    expect(sources.length).toBeGreaterThan(50);
    for (const file of sources) {
      expect(readFileSync(file, "utf8"), file).not.toMatch(/<(iframe|embed|object)\b/i);
    }
    expect(readFileSync(path.join(process.cwd(), "middleware.ts"), "utf8")).toContain(`"frame-src 'none'"`);
  });

  it("the desktop app never turns Electron's plugins (its PDF viewer) on, and never opens a receipt with the computer's own viewer", () => {
    const main = readFileSync(path.join(process.cwd(), "desktop", "main.mjs"), "utf8");
    expect(main).toMatch(/webPreferences/);
    expect(main).not.toMatch(/plugins\s*:\s*true/);
    expect(main).not.toMatch(/openPath\([^)]*receipt/i);
  });
});

// ---------------------------------------------------------------------------------------------
// The server: readReceiptFile and POST /api/expenses/receipt/file, on a throwaway database.

const root = mkdtempSync(path.join(tmpdir(), "dotami-receipt-viewer-"));
const dbFile = path.join(root, "dotami.db");
const url = `file:${dbFile.replace(/\\/g, "/")}`;
const folder = path.join(root, "receipts");
const previousUrl = process.env.DATABASE_URL;
let prisma: PrismaClient;
let fileRoute: { POST: (request: Request) => Promise<Response> };

beforeAll(async () => {
  const prismaCli = path.join(process.cwd(), "node_modules", "prisma", "build", "index.js");
  execFileSync(process.execPath, [prismaCli, "migrate", "deploy"], { env: { ...process.env, DATABASE_URL: url, CHECKPOINT_DISABLE: "1" }, stdio: "pipe" });
  process.env.DATABASE_URL = url;
  prisma = createDatabaseClient({ url });
  fileRoute = await import("@/app/api/expenses/receipt/file/route");
}, 120_000);

afterAll(async () => {
  await prisma?.$disconnect();
  await (await import("@/lib/prisma")).prisma.$disconnect();
  if (previousUrl === undefined) delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL = previousUrl;
  rmSync(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
});

afterEach(() => __resetRateLimitStateForTests());

let counter = 0;
/** An agreed record with a receipt; returns the record's id and the stored file's path. */
async function withReceipt(file: Buffer): Promise<{ id: string; stored: string }> {
  counter += 1;
  const e = await prisma.expense.create({
    data: {
      date: new Date("2026-09-30T00:00:00Z"),
      amountCents: BigInt(1_000 + counter),
      paidTo: `Example Print Shop ${counter}`,
      whatFor: "toner",
      sourceKind: "typed",
      sourceLabel: "typed by you",
      status: "confirmed",
    },
  });
  await addReceipt(prisma, folder, e.id, bytes(file));
  const row = await prisma.receipt.findUniqueOrThrow({ where: { expenseId: e.id } });
  const ext = { "image/png": "png", "application/pdf": "pdf", "image/jpeg": "jpg", "image/webp": "webp" }[row.type]!;
  return { id: e.id, stored: path.join(folder, `${row.id}.${ext}`) };
}

async function refusal(run: () => Promise<unknown>): Promise<number | string> {
  try {
    await run();
  } catch (error) {
    return error instanceof ReceiptError ? error.status : `other error: ${(error as Error).message}`;
  }
  return "no error";
}

describe("the server hands over a receipt only as it was kept (rule 2)", () => {
  it("reads the file the row names and checks it is the same file", async () => {
    const file = png(6, 4);
    const { id } = await withReceipt(file);
    const read = await readReceiptFile(prisma, folder, id);
    expect(read.type).toBe("image/png");
    expect(Buffer.compare(read.bytes, file)).toBe(0);
  });

  it("refuses a file changed, grown or replaced on the disk, and names a missing one", async () => {
    const changed = await withReceipt(pdf({ text: "first" }));
    const original = readFileSync(changed.stored);
    // Same size, one byte different: only the fingerprint can tell.
    const flipped = Buffer.from(original);
    flipped[flipped.length - 3] ^= 0x01;
    writeFileSync(changed.stored, flipped);
    expect(await refusal(() => readReceiptFile(prisma, folder, changed.id))).toBe(409);
    // Grown.
    writeFileSync(changed.stored, Buffer.concat([original, Buffer.from("more")]));
    expect(await refusal(() => readReceiptFile(prisma, folder, changed.id))).toBe(409);

    const gone = await withReceipt(png(2, 2));
    rmSync(gone.stored);
    expect(await refusal(() => readReceiptFile(prisma, folder, gone.id))).toBe(404);
  });

  it("refuses a record that isn't the person's, has no receipt, or was turned down, and a copy with no data folder", async () => {
    expect(await refusal(() => readReceiptFile(prisma, folder, "no-such-record"))).toBe(404);
    expect(await refusal(() => readReceiptFile(prisma, folder, 42))).toBe(400);
    const plain = await prisma.expense.create({
      data: { date: new Date("2026-09-30T00:00:00Z"), amountCents: 1n, paidTo: "Example", whatFor: "x", sourceKind: "typed", sourceLabel: "typed by you", status: "confirmed" },
    });
    expect(await refusal(() => readReceiptFile(prisma, folder, plain.id))).toBe(404);
    const { id } = await withReceipt(png(2, 2));
    expect(await refusal(() => readReceiptFile(prisma, null, id))).toBe(409);
    await prisma.expense.update({ where: { id }, data: { status: "discarded" } });
    expect(await refusal(() => readReceiptFile(prisma, folder, id))).toBe(404);
  });

  it("still shows the receipt of a record taken back (it keeps its receipt)", async () => {
    const { id } = await withReceipt(png(3, 3));
    await prisma.expense.update({ where: { id }, data: { status: "retracted", retractedAt: new Date() } });
    expect((await readReceiptFile(prisma, folder, id)).type).toBe("image/png");
  });
});

describe("POST /api/expenses/receipt/file", () => {
  const post = (body: unknown, headers: Record<string, string> = { "sec-fetch-site": "same-origin" }) =>
    new Request("http://localhost/api/expenses/receipt/file", {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: JSON.stringify(body),
    });

  it("answers DotAmi's page with the bytes as plain data that can never be a page; anyone else gets 403", async () => {
    const file = pdf({ text: "zq-viewer-marker" });
    const { id } = await withReceipt(file);
    for (const headers of [{}, { "sec-fetch-site": "cross-site" }, { "sec-fetch-site": "same-site" }, { "sec-fetch-site": "none" }] as Record<string, string>[]) {
      const refused = await fileRoute.POST(post({ expenseId: id }, headers));
      expect(refused.status).toBe(403);
      expect(await refused.text()).not.toContain("zq-viewer-marker");
    }
    const res = await fileRoute.POST(post({ expenseId: id }));
    expect(res.status).toBe(200);
    for (const [name, value] of Object.entries(RECEIPT_FILE_HEADERS)) expect(res.headers.get(name), name).toBe(value);
    // Named one by one too, so the list above can't quietly lose one.
    expect(res.headers.get("content-type")).toBe("application/octet-stream");
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    expect(res.headers.get("content-disposition")).toBe("attachment");
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(res.headers.get("content-security-policy")).toContain("sandbox");
    expect(Buffer.compare(Buffer.from(await res.arrayBuffer()), file)).toBe(0);
  });

  it("says why it refuses, in words, and writes nothing to the log", async () => {
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    const { id, stored } = await withReceipt(png(2, 2));
    writeFileSync(stored, Buffer.concat([readFileSync(stored), Buffer.from("x")]));
    const changed = await fileRoute.POST(post({ expenseId: id }));
    expect(changed.status).toBe(409);
    expect(((await changed.json()) as { error: string }).error).toMatch(/changed on this computer since you added it/);

    // The receipt's file replaced by a folder of the same name: not the file that was kept.
    const { id: other, stored: replaced } = await withReceipt(pdf({ text: "zq-log-marker" }));
    rmSync(replaced);
    mkdirSync(replaced);
    expect((await fileRoute.POST(post({ expenseId: other }))).status).toBe(409);

    const { id: missing, stored: gone } = await withReceipt(png(3, 2));
    rmSync(gone);
    const res = await fileRoute.POST(post({ expenseId: missing }));
    expect(res.status).toBe(404);
    expect(((await res.json()) as { error: string }).error).toMatch(/isn't in the receipts folder any more/);
    expect(errors).not.toHaveBeenCalled();
    errors.mockRestore();
  });

  it("a receipt set aside when a new key was started says so, in which folder, and how it can come back (expense-records.md § 10, § 12)", async () => {
    const { id, stored } = await withReceipt(png(4, 2));
    const aside = path.join(path.dirname(folder), "backups", "receipts-locked-77");
    mkdirSync(aside, { recursive: true });
    renameSync(stored, path.join(aside, path.basename(stored)));
    const res = await fileRoute.POST(post({ expenseId: id }));
    expect(res.status).toBe(404);
    const { error } = (await res.json()) as { error: string };
    expect(error).toBe(
      `This receipt was set aside when DotAmi started a new key, because the old key couldn't be opened. It is in ${aside}, and opens again only with the old key: if Windows can open that key on this account again, Settings → Data and backups in the desktop app can bring it back. Removing this receipt from its record gives that up: once it is removed, it can't be brought back. To keep a receipt on this record now, remove this one and add the file again.`,
    );
  });
});
