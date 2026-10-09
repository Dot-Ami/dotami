/**
 * [8i] Receipts: the files DotAmi keeps a copy of, and the rows that describe them.
 *
 *   - What a file is, decided from its bytes (lib/expenses/receipts/sniff.ts): the four kinds kept,
 *     and hostile or unsupported files refused, a picture that claims a huge size included.
 *   - The store (lib/expenses/receipts/store.ts): random names, the hash, only agreed records, one
 *     receipt per record, removing one, and the sweep that removes files no row describes.
 *   - The routes: only DotAmi's own page may add or remove one.
 *
 * Each database test runs on a throwaway migrated file in a folder of its own, so its receipts folder
 * is its own too. Every name and number is invented.
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { PrismaClient } from "@prisma/client";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { __resetRateLimitStateForTests } from "@/lib/api/rate-limit";
import { ensureVentureFromScenario } from "@/lib/db/ensure-venture-from-scenario";
import { RECEIPT_REFUSALS } from "@/lib/expenses/receipts/refusals";
import { sniffReceipt } from "@/lib/expenses/receipts/sniff";
import { addReceipt, ReceiptError, receiptFileName, receiptsFolder, removeReceipt, sweepOrphanReceipts } from "@/lib/expenses/receipts/store";
import { MAX_IMAGE_PIXELS, MAX_IMAGE_SIDE, MAX_RECEIPT_BYTES, RECEIPT_TYPES } from "@/lib/expenses/receipts/types";
import { listExpenses } from "@/lib/expenses/store";
import { demoScenarios } from "../prisma/seed-data";
import { heic } from "./helpers/heic-files";
import { jpegHeader, pdf, png, webpHeader } from "./helpers/receipt-files";

vi.setConfig({ testTimeout: 60_000, hookTimeout: 120_000 });

const bytes = (b: Buffer | string) => new Uint8Array(typeof b === "string" ? Buffer.from(b, "latin1") : b);

describe("what a receipt file is, read from its bytes", () => {
  it("keeps the five kinds, each with its size read from the header", () => {
    expect(sniffReceipt(bytes(jpegHeader(800, 600)))).toEqual({ ok: true, type: "image/jpeg", width: 800, height: 600 });
    expect(sniffReceipt(bytes(png(3, 2)))).toEqual({ ok: true, type: "image/png", width: 3, height: 2 });
    expect(sniffReceipt(bytes(webpHeader(1024, 768)))).toEqual({ ok: true, type: "image/webp", width: 1024, height: 768 });
    expect(sniffReceipt(bytes(pdf()))).toEqual({ ok: true, type: "application/pdf", width: null, height: null });
    // A HEIC photo ([8i], option D): its size is the primary picture's, read by DotAmi's own container reader.
    expect(sniffReceipt(bytes(heic()))).toEqual({ ok: true, type: "image/heic", width: 256, height: 256 });
    expect(RECEIPT_TYPES.map((t) => t.type)).toEqual(["image/jpeg", "image/png", "image/webp", "application/pdf", "image/heic"]);
  });

  it("reads a JPEG's size past its other segments and padding, and a lossy and a lossless WebP's", () => {
    const exif = Buffer.concat([Buffer.from([0xff, 0xe1, 0x00, 0x08]), Buffer.from("Exif\0\0", "latin1")]);
    const padded = Buffer.concat([Buffer.from([0xff, 0xd8]), exif, Buffer.from([0xff, 0xff]), jpegHeader(640, 480).subarray(2)]);
    expect(sniffReceipt(bytes(padded))).toMatchObject({ ok: true, width: 640, height: 480 });

    const lossy = Buffer.alloc(30);
    lossy.write("RIFF", 0, "latin1");
    lossy.write("WEBPVP8 ", 8, "latin1");
    Buffer.from([0x9d, 0x01, 0x2a]).copy(lossy, 23);
    lossy.writeUInt16LE(321, 26);
    lossy.writeUInt16LE(123, 28);
    expect(sniffReceipt(bytes(lossy))).toEqual({ ok: true, type: "image/webp", width: 321, height: 123 });

    const lossless = Buffer.alloc(30);
    lossless.write("RIFF", 0, "latin1");
    lossless.write("WEBPVP8L", 8, "latin1");
    lossless[20] = 0x2f;
    lossless.writeUInt32LE((99 & 0x3fff) | ((49 & 0x3fff) << 14), 21);
    expect(sniffReceipt(bytes(lossless))).toEqual({ ok: true, type: "image/webp", width: 100, height: 50 });
  });

  it("refuses what can run a script, or that DotAmi has no safe way to show, whatever its name", () => {
    const cases: [string, Buffer | string, string][] = [
      ["an SVG", '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>', "svg"],
      ["an SVG behind a byte-order mark and blank lines", "\ufeff\n\n  <svg onload=alert(1)/>", "svg"],
      ["an SVG with an XML declaration", '<?xml version="1.0"?>\n<!DOCTYPE svg>\n<svg/>', "svg"],
      ["a web page", "<!doctype html><html><script>alert(1)</script></html>", "html"],
      ["a web page that mentions %PDF- inside", "<html><body>%PDF-1.4</body></html>", "html"],
      ["a GIF", "GIF89a\x01\x00\x01\x00", "gif"],
      // The HEIC brand with nothing behind it: a HEIC that isn't one (tests/heic-container.spec.ts has the rest).
      ["a HEIC brand box and nothing else", Buffer.concat([Buffer.from([0, 0, 0, 0x18]), Buffer.from("ftypheic\0\0\0\0mif1heic", "latin1")]), "damaged"],
      ["a HEIF burst (an image sequence)", Buffer.concat([Buffer.from([0, 0, 0, 0x18]), Buffer.from("ftypmsf1\0\0\0\0mif1heic", "latin1")]), "heif-sequence"],
      ["an AVIF picture", Buffer.concat([Buffer.from([0, 0, 0, 0x18]), Buffer.from("ftypavif\0\0\0\0", "latin1")]), "other-picture"],
      ["a BMP", "BM\x00\x00\x00\x00", "other-picture"],
      ["a TIFF", "II*\x00\x08\x00\x00\x00", "other-picture"],
      ["a text file", "Staples, $45.99", "not-a-receipt-type"],
      ["a zip (a spreadsheet)", "PK\x03\x04", "not-a-receipt-type"],
      ["a Windows program", "MZ\x90\x00", "not-a-receipt-type"],
    ];
    for (const [what, content, code] of cases) {
      const answer = sniffReceipt(bytes(typeof content === "string" ? Buffer.from(content, content.startsWith("\ufeff") ? "utf8" : "latin1") : content));
      expect(answer, what).toEqual({ ok: false, code });
      expect(RECEIPT_REFUSALS[code as keyof typeof RECEIPT_REFUSALS], what).toBeTruthy();
    }
  });

  it("takes a polyglot as what its first bytes say, never as the web page tucked inside it", () => {
    // A JPEG whose later bytes are a web page: kept as a JPEG, and only ever shown as a picture.
    const jpegAndPage = jpegHeader(10, 10, Buffer.from("<html><script>alert(1)</script></html>", "latin1"));
    expect(sniffReceipt(bytes(jpegAndPage))).toMatchObject({ ok: true, type: "image/jpeg" });
    // A PDF that is also a web page: kept as a PDF (only ever drawn by pdf.js onto a canvas).
    const pdfAndPage = Buffer.concat([pdf(), Buffer.from("<html><script>alert(1)</script></html>", "latin1")]);
    expect(sniffReceipt(bytes(pdfAndPage))).toMatchObject({ ok: true, type: "application/pdf" });
    // But "%PDF-" anywhere but the first byte is not a PDF here (readers allow junk in front; DotAmi doesn't).
    expect(sniffReceipt(bytes(Buffer.concat([Buffer.from("junk", "latin1"), pdf()])))).toEqual({ ok: false, code: "not-a-receipt-type" });
  });

  it("refuses a picture that claims more pixels than DotAmi will decode, before anything decodes it", () => {
    // A few hundred bytes that claim 30,000 x 30,000 (900 megapixels, about 3.6 GB once decoded).
    const bomb = png(1, 1, { claim: { width: 30_000, height: 30_000 } });
    expect(bomb.length).toBeLessThan(1_000);
    expect(sniffReceipt(bytes(bomb))).toEqual({ ok: false, code: "too-many-pixels" });
    expect(sniffReceipt(bytes(jpegHeader(10_000, 10_000)))).toEqual({ ok: false, code: "too-many-pixels" });
    expect(sniffReceipt(bytes(webpHeader(9000, 9000)))).toEqual({ ok: false, code: "too-many-pixels" });
    // A long thin strip under the pixel cap is still refused by the side limit.
    expect(sniffReceipt(bytes(png(1, 1, { claim: { width: MAX_IMAGE_SIDE + 1, height: 1 } })))).toEqual({ ok: false, code: "too-many-pixels" });
    // Right at the limits is fine.
    const side = Math.floor(Math.sqrt(MAX_IMAGE_PIXELS));
    expect(sniffReceipt(bytes(jpegHeader(side, side)))).toMatchObject({ ok: true });
    expect(sniffReceipt(bytes(png(1, 1, { claim: { width: MAX_IMAGE_SIDE, height: 1 } })))).toMatchObject({ ok: true });
  });

  it("calls a picture with no readable size damaged, and refuses an empty file and one over 10 MB", () => {
    expect(sniffReceipt(bytes(Buffer.from([0xff, 0xd8, 0xff, 0xd9])))).toEqual({ ok: false, code: "damaged" });
    expect(sniffReceipt(bytes(Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xda]), Buffer.alloc(10)])))).toEqual({ ok: false, code: "damaged" });
    expect(sniffReceipt(bytes(png(2, 2).subarray(0, 20)))).toEqual({ ok: false, code: "damaged" });
    expect(sniffReceipt(bytes(png(1, 1, { claim: { width: 0, height: 5 } })))).toEqual({ ok: false, code: "damaged" });
    expect(sniffReceipt(new Uint8Array(0))).toEqual({ ok: false, code: "empty" });
    const big = new Uint8Array(MAX_RECEIPT_BYTES + 1);
    big.set(pdf());
    expect(sniffReceipt(big)).toEqual({ ok: false, code: "too-big" });
    const exactly = new Uint8Array(MAX_RECEIPT_BYTES);
    exactly.set(pdf());
    expect(sniffReceipt(exactly)).toMatchObject({ ok: true, type: "application/pdf" });
  });
});

// ---------------------------------------------------------------------------------------------
// The store and the routes, on a throwaway database.

const root = mkdtempSync(path.join(tmpdir(), "dotami-receipts-"));
const dbFile = path.join(root, "dotami.db");
const url = `file:${dbFile.replace(/\\/g, "/")}`;
const folder = path.join(root, "receipts");
const previousUrl = process.env.DATABASE_URL;
let prisma: PrismaClient;
let ventureId: string;

type RouteModule = { POST: (request: Request) => Promise<Response> };
let addRoute: RouteModule;
let removeRoute: RouteModule;

beforeAll(async () => {
  const prismaCli = path.join(process.cwd(), "node_modules", "prisma", "build", "index.js");
  execFileSync(process.execPath, [prismaCli, "migrate", "deploy"], {
    env: { ...process.env, DATABASE_URL: url, CHECKPOINT_DISABLE: "1" },
    stdio: "pipe",
  });
  process.env.DATABASE_URL = url;
  prisma = new PrismaClient({ datasourceUrl: url });
  addRoute = await import("@/app/api/expenses/receipt/route");
  removeRoute = await import("@/app/api/expenses/receipt/remove/route");
  ventureId = (await ensureVentureFromScenario(prisma, demoScenarios[0])).ventureId;
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
/** One expense record in the given state, attached to the demo idea unless `ventureId` is null. */
async function record(status: "confirmed" | "proposed" | "retracted" | "discarded" = "confirmed", attached: string | null = ventureId) {
  counter += 1;
  return prisma.expense.create({
    data: {
      ventureId: attached,
      date: new Date("2026-09-30T00:00:00Z"),
      amountCents: BigInt(4_599 + counter),
      paidTo: `Example Stationery ${counter}`,
      whatFor: "printer paper",
      sourceKind: "typed",
      sourceLabel: "typed by you",
      status,
    },
  });
}

const files = () => (existsSync(folder) ? readdirSync(folder).sort() : []);

/** The status a receipt call refused with, or "no error". */
async function refusal(run: () => Promise<unknown>): Promise<number | string> {
  try {
    await run();
  } catch (error) {
    return error instanceof ReceiptError ? error.status : `other error: ${(error as Error).message}`;
  }
  return "no error";
}

describe("keeping a receipt", () => {
  it("lives beside the data file, in a folder named receipts", () => {
    expect(receiptsFolder(url)).toBe(folder);
    expect(receiptsFolder("file:./dotami.db", "/somewhere")).toBe(path.resolve("/somewhere", "prisma", "receipts"));
    expect(receiptsFolder("postgresql://example")).toBeNull();
    expect(receiptsFolder("")).toBeNull();
  });

  it("copies the file under a random name DotAmi makes up, and describes it: type, size, SHA-256", async () => {
    const e = await record();
    const file = png(4, 3);
    const view = await addReceipt(prisma, folder, e.id, bytes(file));
    expect(view.receipt).toMatchObject({ type: "image/png", bytes: file.length });

    const row = await prisma.receipt.findUniqueOrThrow({ where: { expenseId: e.id } });
    expect(row.id).toMatch(/^[0-9a-f]{32}$/);
    expect(row.sha256).toBe(createHash("sha256").update(file).digest("hex"));
    expect(files()).toContain(`${row.id}.png`);
    expect(readFileSync(path.join(folder, `${row.id}.png`)).equals(file)).toBe(true);
    // No unfinished write is left behind.
    expect(files().filter((n) => n.endsWith(".partial"))).toEqual([]);

    // The list says it has one; the id and hash stay on the server.
    const listed = (await listExpenses(prisma, undefined)).find((x) => x.id === e.id)!;
    expect(listed.receipt).toEqual({ type: "image/png", bytes: file.length, addedAt: row.addedAt.toISOString() });
    expect(JSON.stringify(listed)).not.toContain(row.id);
    expect(JSON.stringify(listed)).not.toContain(row.sha256);
  });

  it("names the file by the type read from the bytes, never by what the caller says", async () => {
    // A PDF the person's computer calls "photo.jpg": DotAmi never sees that name, and names it .pdf.
    const e = await record();
    await addReceipt(prisma, folder, e.id, bytes(pdf()));
    const row = await prisma.receipt.findUniqueOrThrow({ where: { expenseId: e.id } });
    expect(row.type).toBe("application/pdf");
    expect(files()).toContain(`${row.id}.pdf`);
    // Only DotAmi's own id and a known type make a name; anything else is refused before it's a path.
    expect(() => receiptFileName("../../etc/passwd", "image/png")).toThrow();
    expect(() => receiptFileName("C:\\Windows\\x", "image/png")).toThrow();
    expect(() => receiptFileName("a".repeat(32), "text/html")).toThrow();
    expect(receiptFileName("a".repeat(32), "image/webp")).toBe(`${"a".repeat(32)}.webp`);
  });

  it("keeps a HEIC photo exactly as given, named .heic, and never a converted copy ([8i], option D)", async () => {
    const e = await record();
    const file = heic({ extras: true });
    const view = await addReceipt(prisma, folder, e.id, bytes(file));
    expect(view.receipt).toMatchObject({ type: "image/heic", bytes: file.length });
    const row = await prisma.receipt.findUniqueOrThrow({ where: { expenseId: e.id } });
    expect(row.sha256).toBe(createHash("sha256").update(file).digest("hex"));
    expect(readFileSync(path.join(folder, `${row.id}.heic`)).equals(file)).toBe(true);
    // One file for the receipt, the person's own bytes: nothing decoded or converted beside it.
    expect(files().filter((n) => n.startsWith(row.id))).toEqual([`${row.id}.heic`]);
    expect(receiptFileName(row.id, "image/heic")).toBe(`${row.id}.heic`);
  });

  it("refuses a file DotAmi doesn't keep, and writes nothing", async () => {
    const e = await record();
    const before = files();
    for (const hostile of ['<svg onload="alert(1)"/>', "<html><script>alert(1)</script></html>", "GIF89a"]) {
      expect(await refusal(() => addReceipt(prisma, folder, e.id, bytes(hostile)))).toBe(400);
    }
    // HEICs that aren't one still photo inside the caps: a burst, one cut short, one claiming 900 megapixels.
    for (const hostile of [heic({ major: "msf1" }), heic().subarray(0, 500), heic({ primarySize: { width: 30_000, height: 30_000 } })]) {
      expect(await refusal(() => addReceipt(prisma, folder, e.id, bytes(hostile)))).toBe(400);
    }
    expect(await refusal(() => addReceipt(prisma, folder, e.id, bytes(png(1, 1, { claim: { width: 30_000, height: 30_000 } }))))).toBe(400);
    expect(await refusal(() => addReceipt(prisma, folder, e.id, new Uint8Array(MAX_RECEIPT_BYTES + 1)))).toBe(413);
    expect(files()).toEqual(before);
    expect(await prisma.receipt.count({ where: { expenseId: e.id } })).toBe(0);
  });

  it("adds one only to a record the person agreed to, one per record, and only to theirs", async () => {
    for (const status of ["proposed", "retracted"] as const) {
      const e = await record(status);
      expect(await refusal(() => addReceipt(prisma, folder, e.id, bytes(pdf()))), status).toBe(409);
    }
    const discarded = await record("discarded");
    expect(await refusal(() => addReceipt(prisma, folder, discarded.id, bytes(pdf())))).toBe(404);
    expect(await refusal(() => addReceipt(prisma, folder, "no-such-record", bytes(pdf())))).toBe(404);
    expect(await refusal(() => addReceipt(prisma, folder, 42, bytes(pdf())))).toBe(400);

    // A record not attached to an idea is still the person's.
    const unattached = await record("confirmed", null);
    await addReceipt(prisma, folder, unattached.id, bytes(pdf()));
    // A second receipt for the same record: refused until the first is removed.
    expect(await refusal(() => addReceipt(prisma, folder, unattached.id, bytes(png(1, 1))))).toBe(409);
    expect(await prisma.receipt.count({ where: { expenseId: unattached.id } })).toBe(1);
    // A copy of DotAmi with no data file keeps no receipts.
    const elsewhere = await record();
    expect(await refusal(() => addReceipt(prisma, null, elsewhere.id, bytes(pdf())))).toBe(409);
  });

  it("removes one: the row, then the file; the record stays, with no receipt", async () => {
    const e = await record();
    await addReceipt(prisma, folder, e.id, bytes(pdf()));
    const row = await prisma.receipt.findUniqueOrThrow({ where: { expenseId: e.id } });
    expect(files()).toContain(`${row.id}.pdf`);

    const view = await removeReceipt(prisma, folder, e.id);
    expect(view.receipt).toBeNull();
    expect(view.id).toBe(e.id);
    expect(files()).not.toContain(`${row.id}.pdf`);
    expect(await prisma.receipt.count({ where: { expenseId: e.id } })).toBe(0);
    expect(await prisma.expense.count({ where: { id: e.id } })).toBe(1);
    expect(await refusal(() => removeReceipt(prisma, folder, e.id))).toBe(409);
  });
});

describe("the sweep: DotAmi's own files that no record describes", () => {
  it("removes a deleted record's file, keeps the described ones and never touches a file it didn't name", async () => {
    const kept = await record();
    await addReceipt(prisma, folder, kept.id, bytes(png(2, 2)));
    const gone = await record();
    await addReceipt(prisma, folder, gone.id, bytes(pdf()));
    const keptRow = await prisma.receipt.findUniqueOrThrow({ where: { expenseId: kept.id } });
    const goneRow = await prisma.receipt.findUniqueOrThrow({ where: { expenseId: gone.id } });

    // The person's own file in the folder, and a file shaped like DotAmi's but with another extension.
    writeFileSync(path.join(folder, "my notes.txt"), "mine");
    writeFileSync(path.join(folder, `${"b".repeat(32)}.exe`), "not ours");

    // Deleting the record deletes its row (onDelete: Cascade); its file is now an orphan.
    await prisma.expense.delete({ where: { id: gone.id } });
    expect(await prisma.receipt.count({ where: { id: goneRow.id } })).toBe(0);
    expect(files()).toContain(`${goneRow.id}.pdf`);

    const result = await sweepOrphanReceipts(prisma, folder);
    expect(result.removed).toBeGreaterThanOrEqual(1);
    expect(result.failed).toBe(0);
    expect(files()).not.toContain(`${goneRow.id}.pdf`);
    expect(files()).toContain(`${keptRow.id}.png`);
    expect(files()).toContain("my notes.txt");
    expect(files()).toContain(`${"b".repeat(32)}.exe`);
    // A file whose extension doesn't match its row's type isn't the file the row describes.
    writeFileSync(path.join(folder, `${keptRow.id}.pdf`), "a different file with the same id");
    await sweepOrphanReceipts(prisma, folder);
    expect(files()).not.toContain(`${keptRow.id}.pdf`);
    expect(files()).toContain(`${keptRow.id}.png`);
  });

  it("leaves a write that may still be going on, and removes one abandoned for more than ten minutes", async () => {
    const young = `${"c".repeat(32)}.jpg.partial`;
    const old = `${"d".repeat(32)}.jpg.partial`;
    mkdirSync(folder, { recursive: true });
    writeFileSync(path.join(folder, young), "x");
    writeFileSync(path.join(folder, old), "x");
    const elevenMinutesAgo = new Date(Date.now() - 11 * 60_000);
    utimesSync(path.join(folder, old), elevenMinutesAgo, elevenMinutesAgo);
    await sweepOrphanReceipts(prisma, folder);
    expect(files()).toContain(young);
    expect(files()).not.toContain(old);
  });

  // The app stopped after the row was written but before the file got its final name. The .partial
  // file is then the only copy of a receipt the record says it has: the sweep must finish the
  // rename, not delete it.
  it("finishes an add the app stopped half-way: a row describes the abandoned file, so it gets its final name", async () => {
    const e = await record();
    const file = pdf();
    const id = "e".repeat(32);
    await prisma.receipt.create({
      data: { id, expenseId: e.id, type: "application/pdf", bytes: file.length, sha256: createHash("sha256").update(file).digest("hex") },
    });
    mkdirSync(folder, { recursive: true });
    const partial = path.join(folder, `${id}.pdf.partial`);
    writeFileSync(partial, file);
    const elevenMinutesAgo = new Date(Date.now() - 11 * 60_000);
    utimesSync(partial, elevenMinutesAgo, elevenMinutesAgo);

    const result = await sweepOrphanReceipts(prisma, folder);
    expect(files()).toContain(`${id}.pdf`);
    expect(files()).not.toContain(`${id}.pdf.partial`);
    expect(readFileSync(path.join(folder, `${id}.pdf`)).equals(file)).toBe(true);
    expect(result).toMatchObject({ removed: 0, failed: 0 });
    // The record still has its receipt, and the file is the one it describes.
    expect(await prisma.receipt.count({ where: { id } })).toBe(1);
    // A later sweep keeps it like any other described file.
    expect((await sweepOrphanReceipts(prisma, folder)).kept).toBeGreaterThanOrEqual(1);
    expect(files()).toContain(`${id}.pdf`);
  });

  it("drops a half-finished add whose bytes don't match its row: the file and the row both go", async () => {
    const e = await record();
    const file = pdf();
    const id = "f".repeat(32);
    await prisma.receipt.create({
      data: { id, expenseId: e.id, type: "application/pdf", bytes: file.length, sha256: createHash("sha256").update(file).digest("hex") },
    });
    mkdirSync(folder, { recursive: true });
    const partial = path.join(folder, `${id}.pdf.partial`);
    // Cut short: the write itself never finished.
    writeFileSync(partial, file.subarray(0, file.length - 3));
    const elevenMinutesAgo = new Date(Date.now() - 11 * 60_000);
    utimesSync(partial, elevenMinutesAgo, elevenMinutesAgo);

    await sweepOrphanReceipts(prisma, folder);
    expect(files().filter((n) => n.startsWith(id))).toEqual([]);
    expect(await prisma.receipt.count({ where: { id } })).toBe(0);
    // The record is kept and can take a receipt again.
    await addReceipt(prisma, folder, e.id, bytes(png(2, 2)));
    expect(await prisma.receipt.count({ where: { expenseId: e.id } })).toBe(1);
  });

  it("leaves a young unfinished write alone even when its row is already there", async () => {
    const e = await record();
    const file = pdf();
    const id = "9".repeat(32);
    await prisma.receipt.create({
      data: { id, expenseId: e.id, type: "application/pdf", bytes: file.length, sha256: createHash("sha256").update(file).digest("hex") },
    });
    mkdirSync(folder, { recursive: true });
    writeFileSync(path.join(folder, `${id}.pdf.partial`), file);
    await sweepOrphanReceipts(prisma, folder);
    expect(files()).toContain(`${id}.pdf.partial`);
    expect(files()).not.toContain(`${id}.pdf`);
    expect(await prisma.receipt.count({ where: { id } })).toBe(1);
  });

  it("has nothing to do without a folder", async () => {
    expect(await sweepOrphanReceipts(prisma, path.join(root, "no-such-folder"))).toEqual({ removed: 0, failed: 0, kept: 0 });
    expect(await sweepOrphanReceipts(prisma, null)).toEqual({ removed: 0, failed: 0, kept: 0 });
  });

  it("an idea deleted keeps its records, and so their receipts and files", async () => {
    const idea = (await ensureVentureFromScenario(prisma, demoScenarios[1])).ventureId;
    const e = await record("confirmed", idea);
    await addReceipt(prisma, folder, e.id, bytes(pdf()));
    const row = await prisma.receipt.findUniqueOrThrow({ where: { expenseId: e.id } });
    await prisma.venture.delete({ where: { id: idea } });
    await sweepOrphanReceipts(prisma, folder);
    expect((await prisma.expense.findUniqueOrThrow({ where: { id: e.id } })).ventureId).toBeNull();
    expect(await prisma.receipt.count({ where: { id: row.id } })).toBe(1);
    expect(files()).toContain(`${row.id}.pdf`);
  });
});

describe("the receipt routes answer only DotAmi's own page", () => {
  const FROM_APP = { "sec-fetch-site": "same-origin" };
  const post = (route: string, body: unknown, headers: Record<string, string> = {}, raw?: string) =>
    new Request(`http://localhost/api/expenses/${route}`, {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: raw ?? JSON.stringify(body),
    });
  const b64 = (b: Buffer) => b.toString("base64");

  it("adds and removes from the page; an agent, a script or another site gets 403 and nothing is kept", async () => {
    const e = await record();
    const body = { expenseId: e.id, file: b64(png(2, 2)) };
    const notTheApp: Record<string, string>[] = [{}, { "sec-fetch-site": "cross-site" }, { "sec-fetch-site": "same-site" }, { "sec-fetch-site": "none" }];
    for (const headers of notTheApp) {
      expect((await addRoute.POST(post("receipt", body, headers))).status).toBe(403);
    }
    expect(await prisma.receipt.count({ where: { expenseId: e.id } })).toBe(0);

    const added = await addRoute.POST(post("receipt", body, FROM_APP));
    expect(added.status).toBe(200);
    const { expense } = (await added.json()) as { expense: { receipt: { type: string } } };
    expect(expense.receipt.type).toBe("image/png");

    expect((await removeRoute.POST(post("receipt/remove", { expenseId: e.id }))).status).toBe(403);
    expect(await prisma.receipt.count({ where: { expenseId: e.id } })).toBe(1);
    expect((await removeRoute.POST(post("receipt/remove", { expenseId: e.id }, FROM_APP))).status).toBe(200);
    expect(await prisma.receipt.count({ where: { expenseId: e.id } })).toBe(0);
  });

  it("refuses a body that isn't JSON, bytes that aren't base64, and a file over 10 MB, with the cap in words", async () => {
    const e = await record();
    const text = new Request("http://localhost/api/expenses/receipt", {
      method: "POST",
      headers: { "content-type": "text/plain", ...FROM_APP },
      body: JSON.stringify({ expenseId: e.id, file: b64(pdf()) }),
    });
    expect((await addRoute.POST(text)).status).toBe(415);
    // A body cut short on the way (JSON that doesn't parse): a plain sentence, not "Invalid JSON".
    const cut = await addRoute.POST(post("receipt", null, FROM_APP, `{"expenseId":"${e.id}","file":"iVBORw0K`));
    expect(cut.status).toBe(400);
    expect(((await cut.json()) as { error: string }).error).toBe("The receipt didn't arrive whole, so nothing was kept. Try adding it again.");
    for (const file of ["not base64!", "abc", 42, null]) {
      expect((await addRoute.POST(post("receipt", { expenseId: e.id, file }, FROM_APP))).status, String(file)).toBe(400);
    }
    const huge = Buffer.alloc(MAX_RECEIPT_BYTES + 3 * 1024);
    pdf().copy(huge);
    const tooBig = await addRoute.POST(post("receipt", { expenseId: e.id, file: b64(huge) }, FROM_APP));
    expect(tooBig.status).toBe(413);
    expect(((await tooBig.json()) as { error: string }).error).toMatch(/over 10 MB/);
    // Just over the cap but under the body limit: the store's own check answers.
    const justOver = Buffer.alloc(MAX_RECEIPT_BYTES + 1);
    pdf().copy(justOver);
    expect((await addRoute.POST(post("receipt", { expenseId: e.id, file: b64(justOver) }, FROM_APP))).status).toBe(413);
    // A hostile file through the route: the sentence, nothing kept.
    const svg = await addRoute.POST(post("receipt", { expenseId: e.id, file: b64(Buffer.from("<svg onload=alert(1)>")) }, FROM_APP));
    expect(svg.status).toBe(400);
    expect(((await svg.json()) as { error: string }).error).toBe(RECEIPT_REFUSALS.svg);
    expect(await prisma.receipt.count({ where: { expenseId: e.id } })).toBe(0);
  });

  it("never writes the file's bytes, the record or a path to the log when something fails", async () => {
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    const e = await record();
    // A receipts "folder" that is really a file: the write fails inside the store.
    const blocked = path.join(root, "blocked");
    writeFileSync(blocked, "not a folder");
    const previous = process.env.DATABASE_URL;
    process.env.DATABASE_URL = `file:${path.join(blocked, "dotami.db").replace(/\\/g, "/")}`;
    try {
      const res = await addRoute.POST(post("receipt", { expenseId: e.id, file: b64(pdf({ text: "zq-receipt-marker" })) }, FROM_APP));
      expect(res.status).toBe(503);
    } finally {
      process.env.DATABASE_URL = previous;
    }
    const logged = errors.mock.calls.flat().map(String).join("\n");
    errors.mockRestore();
    expect(logged).toMatch(/\[expenses\/receipt\] failed \(/);
    expect(logged).not.toMatch(/zq-receipt-marker|blocked|Example Stationery/);
  });
});
