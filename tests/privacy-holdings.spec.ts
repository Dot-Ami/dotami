/**
 * [8d] The reader behind /your-data: counts and lists what the data file holds, on a throwaway
 * migrated SQLite file (same setup as tests/figures.spec.ts), plus the plain-words helpers the
 * page uses. The page is only as true as these numbers, so the cases that matter are the ones a
 * wrong answer would hide something: a source merged with another, a hidden status left out, a
 * date shifted a day, a folder opened that should only have been counted.
 */
import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import type { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  STATUS_WORDS,
  amountWords,
  countLine,
  kindWords,
  periodWords,
  plural,
  sizeWords,
} from "@/components/your-data/format";
import { encryptReceipt, keyIdOf } from "@/desktop/receipt-crypto.mjs";
import { createDatabaseClient } from "@/lib/db/client";
import { ensureVentureFromScenario } from "@/lib/db/ensure-venture-from-scenario";
import type { ReceiptLock } from "@/lib/expenses/receipts/lock";
import { TABLES } from "@/lib/privacy/inventory";
import { localCalendarDay, readHoldings } from "@/lib/privacy/holdings";
import { addTypedStatement } from "@/lib/person/statements";
import { writeSetting } from "@/lib/settings/store";
import { readSettingsToday, type SettingsToday } from "@/lib/settings/today";
import { demoScenarios } from "../prisma/seed-data";

// mkdtempSync makes the folder itself, with a name no other program can guess or claim first.
const root = mkdtempSync(path.join(tmpdir(), "dotami-holdings-"));
const prismaCli = path.join(process.cwd(), "node_modules", "prisma", "build", "index.js");

/** A migrated, empty database in its own folder, like the desktop app's data folder. */
function makeDb(name: string) {
  const folder = path.join(root, name);
  mkdirSync(folder, { recursive: true });
  const file = path.join(folder, "dotami.db");
  const url = `file:${file.replace(/\\/g, "/")}`;
  execFileSync(process.execPath, [prismaCli, "migrate", "deploy"], {
    env: { ...process.env, DATABASE_URL: url, CHECKPOINT_DISABLE: "1" },
    stdio: "pipe",
  });
  return { folder, file, url, prisma: createDatabaseClient({ url }) };
}

const empty = { prisma: undefined as unknown as PrismaClient, today: undefined as unknown as SettingsToday };
let seeded: ReturnType<typeof makeDb>;
let seededToday: SettingsToday;
let chinookId: string;
let salishId: string;

// Moments built from LOCAL parts, so the expected calendar day is the same in every time zone —
// 11:30 p.m. on the 2nd is still the 2nd here, even where the UTC clock already says the 3rd.
const proposed = new Date(2026, 9, 1, 9, 0);
const agreed = new Date(2026, 9, 2, 23, 30);
const takenBack = new Date(2026, 9, 5, 23, 0);

beforeAll(async () => {
  const emptyDb = makeDb("empty");
  empty.prisma = emptyDb.prisma;
  empty.today = readSettingsToday({ DATABASE_URL: emptyDb.url });

  seeded = makeDb("seeded");
  seededToday = readSettingsToday({ DATABASE_URL: seeded.url });
  const db = seeded.prisma;

  chinookId = (await ensureVentureFromScenario(db, demoScenarios[0])).ventureId;
  salishId = (await ensureVentureFromScenario(db, demoScenarios[1])).ventureId;
  await db.venture.update({ where: { id: chinookId }, data: { notes: "my own note, in my words" } });
  await db.ventureLink.create({ data: { fromId: chinookId, toId: salishId, kind: "RELATED", note: "same customers" } });
  await addTypedStatement(db, { text: "I prefer to keep it small.", saidAt: "2026-09-01" });
  await addTypedStatement(db, { text: "No employees for now.", saidAt: "2026-09-15" });
  // One saved setting, so the page's count of "Your settings" is proved to read the new table.
  await writeSetting(db, "figure-reminders", { cadences: ["yearly"], ideaIds: [chinookId] });

  // One row per case the page has to get right. Dates are explicit so the expectations are exact.
  const base = { kind: "gross-revenue", currency: "CAD", periodStart: new Date("2026-01-01T00:00:00Z"), periodEnd: new Date("2026-01-31T00:00:00Z") };
  const figures = [
    // typed by the person, agreed to late in the evening
    { ...base, ventureId: chinookId, amountCents: 3120000n, sourceKind: "typed", sourceLabel: "typed by you", status: "confirmed", proposedAt: proposed, confirmedAt: agreed, editedByPerson: true },
    // one file, used on two ideas: a waiting month, an agreed month, a taken-back month (a loss, to prove the sign)
    { ...base, ventureId: chinookId, amountCents: 100000n, sourceKind: "file", sourceLabel: "sales-2025.xlsx", sourceRows: 12, status: "proposed", proposedAt: proposed },
    { ...base, ventureId: chinookId, amountCents: 200000n, sourceKind: "file", sourceLabel: "sales-2025.xlsx", sourceRows: 9, status: "confirmed", proposedAt: proposed, confirmedAt: agreed },
    { ...base, ventureId: chinookId, amountCents: -120050n, sourceKind: "file", sourceLabel: "sales-2025.xlsx", status: "retracted", proposedAt: proposed, confirmedAt: agreed, retractedAt: takenBack },
    { ...base, ventureId: salishId, amountCents: 9007199254740993n, sourceKind: "file", sourceLabel: "sales-2025.xlsx", status: "confirmed", proposedAt: proposed, confirmedAt: agreed },
    // a FILE that someone named "typed by you": must not merge with the typed figures
    { ...base, ventureId: chinookId, amountCents: 555500n, sourceKind: "file", sourceLabel: "typed by you", status: "confirmed", proposedAt: proposed, confirmedAt: agreed },
    // turned down: hidden everywhere else, still in the file
    { ...base, ventureId: salishId, amountCents: 777700n, sourceKind: "agent", sourceLabel: "the Lens", status: "discarded", proposedAt: proposed },
  ];
  for (const data of figures) await db.figure.create({ data });

  // One expense record (every name and number invented), so the page's count of "Your expense records"
  // is proved to read the new table. Its amount and words are the person's and are only counted here.
  await db.expense.create({
    data: {
      ventureId: chinookId,
      date: new Date("2026-09-30T00:00:00Z"),
      amountCents: 4599n,
      paidTo: "Example Stationery Ltd",
      whatFor: "printer paper",
      sourceKind: "typed",
      sourceLabel: "typed by you",
      status: "confirmed",
      proposedAt: proposed,
      agreedAt: agreed,
    },
  });
  // And one not attached to any idea yet, so the count of records attached to an idea (what the
  // Delete menu says stays when ideas are deleted) is shown to differ from the whole table.
  await db.expense.create({
    data: {
      ventureId: null,
      date: new Date("2026-09-29T00:00:00Z"),
      amountCents: 1250n,
      paidTo: "Example Cafe",
      whatFor: "client coffee",
      sourceKind: "typed",
      sourceLabel: "typed by you",
    },
  });

  // [8g] Two bank and card accounts, one taken back. The page counts them (both rows are in the
  // file) and shows no name: the names are the person's words, and Settings is where they're listed.
  await db.sourceAccount.create({ data: { name: "Example business chequing", allowance: "always", agreedAt: agreed } });
  await db.sourceAccount.create({ data: { name: "Example Visa ending 4321", allowance: "once", agreedAt: agreed, retiredAt: agreed } });
}, 180_000);

afterAll(async () => {
  await empty.prisma?.$disconnect();
  await seeded?.prisma.$disconnect();
  if (existsSync(root)) rmSync(root, { recursive: true, force: true });
});

describe("readHoldings on a database with nothing in it", () => {
  it("gives zeros everywhere and no error", async () => {
    const h = await readHoldings(empty.prisma, empty.today);
    expect(h.tables.map((t) => t.count)).toEqual(TABLES.map(() => 0));
    expect(h.ideasWithNotes).toBe(0);
    expect(h.figures.total).toBe(0);
    expect(h.figures.sources).toEqual([]);
    expect(h.figures.byStatus).toEqual({ proposed: 0, confirmed: 0, retracted: 0, discarded: 0 });
    expect(h.keptLinks).toEqual({ "Expense.ventureId": 0 });
  });

  it("says there is no safety-copy folder and no log, rather than a count of zero files", async () => {
    const h = await readHoldings(empty.prisma, empty.today);
    for (const f of h.folders) {
      expect(f.exists).toBe(false);
      expect(f.files).toBeNull();
    }
  });
});

describe("readHoldings on a seeded database", () => {
  it("counts every table the inventory lists, in the inventory's order", async () => {
    const h = await readHoldings(seeded.prisma, seededToday);
    expect(h.tables.map((t) => t.entry.model)).toEqual(TABLES.map((t) => t.model));
    const counts = Object.fromEntries(h.tables.map((t) => [t.entry.model, t.count]));
    expect(counts).toEqual({
      User: 1,
      PersonStatement: 2,
      Venture: 2,
      VentureLink: 1,
      ScenarioState: 2,
      Setting: 1,
      Figure: 7,
      Expense: 2,
      SourceAccount: 2,
      Receipt: 0,
    });
    expect(h.ideasWithNotes).toBe(1);
  });

  it("counts the records the Delete menu would keep with their link cleared: only those attached to an idea", async () => {
    const h = await readHoldings(seeded.prisma, seededToday);
    expect(h.keptLinks).toEqual({ "Expense.ventureId": 1 });
  });

  it("counts bank and card accounts, the taken-back ones too, but carries none of their names", async () => {
    const h = await readHoldings(seeded.prisma, seededToday);
    const card = h.tables.find((t) => t.entry.model === "SourceAccount")!;
    expect(card.count).toBe(2);
    expect(card.entry.name).toBe("Your bank and card accounts");
    const everything = JSON.stringify(h);
    expect(everything).not.toContain("Example business chequing");
    expect(everything).not.toContain("4321");
  });

  it("counts expense records but carries none of their words or amounts (this page only counts them)", async () => {
    const h = await readHoldings(seeded.prisma, seededToday);
    const card = h.tables.find((t) => t.entry.model === "Expense")!;
    expect(card.count).toBe(2);
    expect(card.entry.name).toBe("Your expense records");
    const everything = JSON.stringify(h);
    expect(everything).not.toContain("Example Stationery");
    expect(everything).not.toContain("printer paper");
    expect(everything).not.toContain("4599");
  });

  it("counts every figure by status — turned-down ones included, which no other screen shows", async () => {
    const h = await readHoldings(seeded.prisma, seededToday);
    expect(h.figures.total).toBe(7);
    expect(h.figures.byStatus).toEqual({ confirmed: 4, proposed: 1, retracted: 1, discarded: 1 });
  });

  it("groups by kind AND name: a file called 'typed by you' stays apart from the typed figures", async () => {
    const h = await readHoldings(seeded.prisma, seededToday);
    // typed, then file (A to Z), then agent
    expect(h.figures.sources.map((s) => [s.sourceKind, s.sourceLabel])).toEqual([
      ["typed", "typed by you"],
      ["file", "sales-2025.xlsx"],
      ["file", "typed by you"],
      ["agent", "the Lens"],
    ]);
    const typed = h.figures.sources[0];
    const fileCalledTyped = h.figures.sources[2];
    expect(typed.figures).toHaveLength(1);
    expect(fileCalledTyped.figures).toHaveLength(1);
    expect(typed.figures[0].amountCents).toBe("3120000");
    expect(fileCalledTyped.figures[0].amountCents).toBe("555500");
  });

  it("lists a source used on two ideas once, naming both, with its own counts", async () => {
    const h = await readHoldings(seeded.prisma, seededToday);
    const sales = h.figures.sources.find((s) => s.sourceLabel === "sales-2025.xlsx")!;
    expect(sales.ideaNames).toEqual(["Demo — Chinook Sign Painting", "Demo — Salish Trail Maps"]);
    expect(sales.counts).toEqual({ confirmed: 2, proposed: 1, retracted: 1, discarded: 0 });
    expect(sales.figures).toHaveLength(4);
    expect(sales.firstProposedOn).toBe("2026-10-01");
    expect(sales.lastProposedOn).toBe("2026-10-01");
  });

  it("gives each figure its proposed, agreed and taken-back days, as the day on this computer", async () => {
    const h = await readHoldings(seeded.prisma, seededToday);
    const typed = h.figures.sources[0].figures[0];
    expect(typed.proposedOn).toBe("2026-10-01");
    // 11:30 p.m. on the 2nd: the 2nd, not the UTC date (which is the 3rd in the Americas).
    expect(typed.agreedOn).toBe("2026-10-02");
    expect(typed.takenBackOn).toBeNull();
    expect(typed.editedByPerson).toBe(true);

    const sales = h.figures.sources.find((s) => s.sourceLabel === "sales-2025.xlsx")!;
    const back = sales.figures.find((f) => f.status === "retracted")!;
    expect(back.agreedOn).toBe("2026-10-02");
    expect(back.takenBackOn).toBe("2026-10-05");
  });

  it("carries the agreed day from the file — a reader that dropped it would be caught here", async () => {
    const h = await readHoldings(seeded.prisma, seededToday);
    const agreedDays = h.figures.sources.flatMap((s) => s.figures).filter((f) => f.status === "confirmed").map((f) => f.agreedOn);
    expect(agreedDays).toHaveLength(4);
    expect(agreedDays.every((d) => d === "2026-10-02")).toBe(true);
  });

  it("lists a turned-down figure with no agreed or taken-back day (none is stored for turning one down)", async () => {
    const h = await readHoldings(seeded.prisma, seededToday);
    const lens = h.figures.sources.find((s) => s.sourceLabel === "the Lens")!;
    expect(lens.figures).toHaveLength(1);
    expect(lens.figures[0]).toMatchObject({ status: "discarded", agreedOn: null, takenBackOn: null });
  });

  it("keeps amounts exact: a loss keeps its sign, and a number too big for a float keeps every digit", async () => {
    const h = await readHoldings(seeded.prisma, seededToday);
    const amounts = h.figures.sources.flatMap((s) => s.figures).map((f) => f.amountCents);
    expect(amounts).toContain("-120050");
    expect(amounts).toContain("9007199254740993");
  });

  it("carries the intake facts and nothing secret", async () => {
    const today = readSettingsToday({
      DATABASE_URL: seeded.url,
      ANTHROPIC_API_KEY: "sk-placeholder-key",
      DOTAMI_UPDATES: "github",
    });
    const h = await readHoldings(seeded.prisma, today);
    const byId = Object.fromEntries(h.sentElsewhere.map((s) => [s.entry.id, s.state]));
    expect(byId).toEqual({ "intake-sentence": "active", "update-check": "active", "files-you-save": "on-your-action" });
    expect(JSON.stringify(h)).not.toContain("sk-placeholder-key");

    const quiet = await readHoldings(seeded.prisma, seededToday);
    const quietById = Object.fromEntries(quiet.sentElsewhere.map((s) => [s.entry.id, s.state]));
    expect(quietById["intake-sentence"]).toBe("inactive");
    expect(quietById["update-check"]).toBe("inactive");
  });
});

describe("the folders beside the data file", () => {
  it("counts safety copies and reads their dates and sizes — it never opens them", async () => {
    const folder = path.join(root, "with-backups");
    const backups = path.join(folder, "backups");
    mkdirSync(path.join(folder, "logs"), { recursive: true });
    mkdirSync(backups, { recursive: true });
    const secret = "marker-inside-a-safety-copy";
    writeFileSync(path.join(backups, "dotami-before-a.db"), `${secret} one`);
    writeFileSync(path.join(backups, "dotami-before-b.db"), `${secret} two`);
    writeFileSync(path.join(folder, "logs", "server.log"), `${secret} in the log`);
    utimesSync(path.join(backups, "dotami-before-a.db"), new Date(2026, 8, 1, 10, 0), new Date(2026, 8, 1, 10, 0));
    // The newest copy, written at 10:00 p.m. local time on the 30th.
    utimesSync(path.join(backups, "dotami-before-b.db"), new Date(2026, 8, 30, 22, 0), new Date(2026, 8, 30, 22, 0));

    const today: SettingsToday = {
      ...seededToday,
      dataFile: { path: path.join(folder, "dotami.db"), exists: true },
      desktop: true,
    };
    const h = await readHoldings(seeded.prisma, today);

    const copies = h.folders.find((f) => f.entry.id === "backups")!;
    expect(copies).toMatchObject({ exists: true, files: 2, readable: true, newestOn: "2026-09-30" });
    expect(copies.bytes).toBe(`${secret} one`.length + `${secret} two`.length);
    expect(copies.path).toBe(backups);

    const log = h.folders.find((f) => f.entry.id === "log")!;
    expect(log).toMatchObject({ exists: true, files: null });

    // Both are DotAmi's own safety copies, so the Delete menu's box would delete both.
    expect(h.safetyCopies).toBe(2);
    expect(h.wipePending).toBe(false);

    // What came back is names, counts, sizes and dates: none of what was inside.
    expect(JSON.stringify(h)).not.toContain(secret);
  });

  it("counts only DotAmi's own safety copies for Delete, and sees the note an unfinished wipe leaves", async () => {
    const folder = path.join(root, "with-a-note");
    mkdirSync(path.join(folder, "backups"), { recursive: true });
    writeFileSync(path.join(folder, "backups", "dotami-before-restore-1760000000000.db"), "a copy");
    writeFileSync(path.join(folder, "backups", "my own notes.txt"), "the person's own file");
    // Named after whatever the data file is called, beside it.
    writeFileSync(path.join(folder, "mine.db.wipe-pending"), JSON.stringify({ format: 1, backups: [] }));
    const today: SettingsToday = { ...seededToday, dataFile: { path: path.join(folder, "mine.db"), exists: true }, desktop: true };
    const h = await readHoldings(seeded.prisma, today);

    expect(h.safetyCopies).toBe(1);
    expect(h.folders.find((f) => f.entry.id === "backups")).toMatchObject({ files: 2 });
    expect(h.wipePending).toBe(true);
    expect(h.folders.find((f) => f.entry.id === "wipe-pending")).toMatchObject({
      exists: true,
      path: path.join(folder, "mine.db.wipe-pending"),
    });
    // No receipt folders set aside here, so the same box has none of those to clear.
    expect(h.setAsideReceiptFolders).toBe(0);
  });

  it("counts the receipt folders DotAmi set aside in the backups folder, which the same box clears ([8i])", async () => {
    const folder = path.join(root, "with-set-aside");
    const backups = path.join(folder, "backups");
    const secret = "marker-inside-a-set-aside-receipt";
    mkdirSync(path.join(backups, "receipts-locked-1760000000000"), { recursive: true });
    writeFileSync(path.join(backups, "receipts-locked-1760000000000", `${"c".repeat(32)}.png`), secret);
    writeFileSync(path.join(backups, "receipts-locked-1760000000000", "receipts.key"), "{}");
    mkdirSync(path.join(backups, "receipts-before-restore-1760000000001"));
    writeFileSync(path.join(backups, "receipts-before-restore-1760000000001", `${"d".repeat(32)}.pdf`), secret);
    // Not one of DotAmi's: a folder of the person's, and a set-aside name holding only the person's file.
    mkdirSync(path.join(backups, "my receipts"));
    writeFileSync(path.join(backups, "my receipts", `${"e".repeat(32)}.png`), secret);
    mkdirSync(path.join(backups, "receipts-locked-1760000000002"));
    writeFileSync(path.join(backups, "receipts-locked-1760000000002", "my scan.png"), secret);
    const today: SettingsToday = { ...seededToday, dataFile: { path: path.join(folder, "dotami.db"), exists: true }, desktop: true };
    const h = await readHoldings(seeded.prisma, today);

    expect(h.setAsideReceiptFolders).toBe(2);
    expect(h.safetyCopies).toBe(0);
    // A count only: nothing from inside a receipt.
    expect(JSON.stringify(h)).not.toContain(secret);
  });

  it("counts what a lost key leaves in the backups folder, which the same box clears: key files, locked files, the start-fresh receipts ([8i])", async () => {
    const folder = path.join(root, "with-lost-key-leftovers");
    const backups = path.join(folder, "backups");
    const secret = "marker-inside-a-lost-key-leftover";
    mkdirSync(path.join(backups, "receipts-before-start-fresh-1760000000002"), { recursive: true });
    writeFileSync(path.join(backups, "receipts-before-start-fresh-1760000000002", `${"f".repeat(32)}.png`), secret);
    writeFileSync(path.join(backups, "receipts-key-unreadable-1760000000000.key"), secret);
    writeFileSync(path.join(backups, "database-key-unreadable-1760000000001.key"), secret);
    // A locked file and its journal are one; a lone journal counts under its file's name.
    writeFileSync(path.join(backups, "dotami-locked-1760000000000.db"), secret);
    writeFileSync(path.join(backups, "dotami-locked-1760000000000.db-journal"), secret);
    writeFileSync(path.join(backups, "dotami-locked-1760000000005.db-journal"), secret);
    // Not DotAmi's set-aside names.
    writeFileSync(path.join(backups, "database.key"), secret);
    writeFileSync(path.join(backups, "dotami-locked-1.db.bak"), secret);
    const today: SettingsToday = { ...seededToday, dataFile: { path: path.join(folder, "dotami.db"), exists: true }, desktop: true };
    const h = await readHoldings(seeded.prisma, today);

    expect(h.setAsideReceiptFolders).toBe(1);
    expect(h.setAsideKeyFiles).toBe(2);
    expect(h.lockedDataFiles).toBe(2);
    expect(h.safetyCopies).toBe(0);
    // Counts only: nothing from inside a file.
    expect(JSON.stringify(h)).not.toContain(secret);
  });

  it("says how the receipt files are kept, from their first bytes only, and lists the key file without its key ([8i])", async () => {
    const folder = path.join(root, "with-receipts");
    const receipts = path.join(folder, "receipts");
    mkdirSync(receipts, { recursive: true });
    const key = randomBytes(32);
    const lock: ReceiptLock = { state: "on", key, keyId: keyIdOf(key) };
    const secret = "marker-inside-a-receipt";
    writeFileSync(path.join(receipts, `${"a".repeat(32)}.pdf`), encryptReceipt(Buffer.from(`%PDF-1.4 ${secret}`), { key, id: "a".repeat(32) }));
    writeFileSync(path.join(receipts, `${"b".repeat(32)}.pdf`), `%PDF-1.4 ${secret} kept plain`);
    writeFileSync(path.join(folder, "receipts.key"), JSON.stringify({ format: 1, keyId: keyIdOf(key), wrapped: "d3JhcHBlZA==" }));
    const today: SettingsToday = { ...seededToday, dataFile: { path: path.join(folder, "dotami.db"), exists: true }, desktop: true };

    const h = await readHoldings(seeded.prisma, today, lock);
    expect(h.receiptFiles).toEqual({ state: "on", setAsideTo: null, encrypted: 1, plain: 1, locked: 0 });
    expect(h.folders.find((f) => f.entry.id === "receipts-key")).toMatchObject({ exists: true, files: null });
    // From source, the same encrypted file is one this copy can't open.
    expect((await readHoldings(seeded.prisma, today, { state: "source" })).receiptFiles).toEqual({
      state: "source",
      setAsideTo: null,
      encrypted: 0,
      plain: 1,
      locked: 1,
    });
    // After Start a new key (expense-records.md § 10), the page is told where the locked receipts went.
    const aside = path.join(folder, "backups", "receipts-locked-5");
    expect((await readHoldings(seeded.prisma, today, { state: "new-key-at-restart", setAsideTo: aside })).receiptFiles).toMatchObject({
      state: "new-key-at-restart",
      setAsideTo: aside,
    });
    // Counts and states only: nothing from inside a receipt, and never the key.
    expect(JSON.stringify(h)).not.toContain(secret);
    expect(JSON.stringify(h)).not.toContain(key.toString("base64"));
    expect(JSON.stringify(h)).not.toContain(key.toString("hex"));
  });

  it("has no folders to describe when the database setting isn't a file", async () => {
    const today: SettingsToday = { ...seededToday, dataFile: { path: null, exists: false } };
    const h = await readHoldings(seeded.prisma, today);
    expect(h.folders.every((f) => f.path === null && !f.exists)).toBe(true);
    expect(h.safetyCopies).toBe(0);
    expect(h.setAsideReceiptFolders).toBe(0);
    expect(h.setAsideKeyFiles).toBe(0);
    expect(h.lockedDataFiles).toBe(0);
    expect(h.wipePending).toBe(false);
    expect(h.dataFile.path).toBeNull();
  });
});

describe("localCalendarDay", () => {
  it("is the day on this computer, not the UTC day", () => {
    expect(localCalendarDay(new Date(2026, 9, 6, 23, 0))).toBe("2026-10-06");
    expect(localCalendarDay(new Date(2026, 0, 1, 0, 0))).toBe("2026-01-01");
    expect(localCalendarDay(new Date(2026, 11, 31, 23, 59))).toBe("2026-12-31");
  });
});

describe("the words the page uses", () => {
  it("names the four states the way the idea's card does", () => {
    expect(STATUS_WORDS).toEqual({
      proposed: "Waiting for you to agree",
      confirmed: "Agreed",
      retracted: "Taken back",
      discarded: "Turned down",
    });
  });

  it("writes a count line from the states that have any", () => {
    expect(countLine({ confirmed: 3, proposed: 1, retracted: 2, discarded: 4 })).toBe("3 agreed · 1 waiting · 2 taken back · 4 turned down");
    expect(countLine({ confirmed: 2, proposed: 0, retracted: 0, discarded: 0 })).toBe("2 agreed");
    expect(countLine({ confirmed: 0, proposed: 0, retracted: 0, discarded: 0 })).toBe("");
  });

  it("shows an amount as the card does, and never rounds one it can't hold exactly", () => {
    expect(amountWords("3120000", "CAD")).toBe("$31,200.00");
    expect(amountWords("-120050", "CAD")).toBe("-$1,200.50");
    expect(amountWords("9007199254740993", "CAD")).toBe("9007199254740993 cents CAD");
    // A currency code this runtime has never heard of still shows something readable.
    expect(amountWords("12345", "ZZ")).toMatch(/123\.45/);
  });

  it("writes periods as exact days", () => {
    expect(periodWords("2026-01-01", "2026-01-31")).toBe("2026-01-01 to 2026-01-31");
    expect(periodWords("2026-01-15", "2026-01-15")).toBe("2026-01-15");
  });

  it("says sizes plainly and counts in the singular when it is one", () => {
    expect(sizeWords(512)).toBe("512 bytes");
    expect(sizeWords(2048)).toBe("2.0 KB");
    expect(sizeWords(5 * 1024 * 1024)).toBe("5.0 MB");
    expect(plural(1, "figure")).toBe("1 figure");
    expect(plural(2, "figure")).toBe("2 figures");
    expect(plural(0, "record")).toBe("0 records");
  });

  it("falls back to the stored word for a figure kind this build doesn't know", () => {
    expect(kindWords("gross-revenue")).toBe("Revenue (gross, before expenses)");
    expect(kindWords("some-future-kind")).toBe("some-future-kind");
  });
});
