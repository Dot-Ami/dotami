/**
 * [8i] Measures what moving DotAmi's database to Prisma's better-sqlite3 adapter, and encrypting the
 * file, costs a person in time (docs/architecture/database-encryption.md, the maintainer's decision 1:
 * measure first, and stop if a person would notice). Not part of the app or the tests: run it by hand,
 *
 *   npx tsx scripts/measure-database-adapter.ts [typical|large]
 *
 * and it prints a table. Three ways of opening the same seeded data are compared:
 *   engine     today: Prisma 6.19's built-in engine on a plain file (node:sqlite for the desktop steps)
 *   adapter    Prisma through @prisma/adapter-better-sqlite3 on the same plain file
 *   encrypted  the adapter on a copy of the file encrypted with a raw 256-bit key (ChaCha20-Poly1305)
 *
 * What is timed, each the median of several runs on this computer:
 *   start      a fresh Node process: load Prisma (and the adapter), open the file, first query
 *              (scripts/measure-database-startup.mjs), plus the desktop migrator's open-and-read
 *   pages      the queries behind the ideas page, an idea's map, the Expenses page and
 *              "What DotAmi knows about you", run through the app's own functions
 *   wipe       Delete's wipe (VACUUM through Prisma, lib/privacy/delete.ts wipeFreeSpace)
 *   backup     today's File -> Back up... with a passphrase (desktop/backup.mjs writeBackup), and the
 *              step that changes: VACUUM INTO a temporary file today, versus reading the encrypted
 *              file's decrypted image into memory and rebuilding it there (design § 8)
 *
 * Everything happens in a temporary folder that is removed at the end. Nothing is sent anywhere.
 * The two programs it starts are this repository's own (Prisma's CLI to migrate a new file, and the
 * start-up probe), each with a fixed argument list and no shell.
 */
import { execFileSync } from "node:child_process";
import { closeSync, copyFileSync, mkdtempSync, openSync, readSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

import { PrismaBetterSQLite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@prisma/client";
import Database from "better-sqlite3";

import { ensureVentureFromScenario } from "@/lib/db/ensure-venture-from-scenario";
import { listVentures, loadVentureScenarioById } from "@/lib/db/ventures";
import { listExpenses } from "@/lib/expenses/store";
import { addTypedStatement } from "@/lib/person/statements";
import { wipeFreeSpace } from "@/lib/privacy/delete";
import { readHoldings } from "@/lib/privacy/holdings";
import { readSettingsToday } from "@/lib/settings/today";
import { writeBackup } from "../desktop/backup.mjs";
import { demoScenarios } from "../prisma/seed-data";

const SIZES = {
  // A person a few months in: a handful of ideas, a few hundred records.
  typical: { ideas: 5, expensesPerIdea: 80, figuresPerIdea: 24, statements: 30 },
  // Far more than one person types in years, to see how the costs grow.
  large: { ideas: 25, expensesPerIdea: 200, figuresPerIdea: 80, statements: 300 },
} as const;

const sizeName = (process.argv[2] ?? "typical") as keyof typeof SIZES;
const size = SIZES[sizeName];
if (!size) throw new Error(`size must be one of ${Object.keys(SIZES).join(", ")}`);

const KEY = Buffer.alloc(32, 7); // a fixed test key: these files are thrown away
const KEY_PRAGMA = `key = "x'${KEY.toString("hex")}'"`;

const root = mkdtempSync(path.join(tmpdir(), "dotami-measure-"));
const urlOf = (file: string) => `file:${file.replace(/\\/g, "/")}`;

function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

async function timeIt(runs: number, fn: () => unknown | Promise<unknown>): Promise<number> {
  await fn(); // one warm-up run, not counted
  const times: number[] = [];
  for (let i = 0; i < runs; i++) {
    const t = performance.now();
    await fn();
    times.push(performance.now() - t);
  }
  return median(times);
}

function migrated(file: string) {
  execFileSync(process.execPath, [path.join("node_modules", "prisma", "build", "index.js"), "migrate", "deploy"], {
    env: { ...process.env, DATABASE_URL: urlOf(file), CHECKPOINT_DISABLE: "1" },
    stdio: "pipe",
  });
}

async function seed(prisma: PrismaClient) {
  const ideas: string[] = [];
  for (let i = 0; i < size.ideas; i++) {
    const base = demoScenarios[i % demoScenarios.length];
    const scenario = { ...base, id: `measure-${i}`, profile: { ...base.profile, name: `Idea ${i}` } };
    ideas.push((await ensureVentureFromScenario(prisma, scenario)).ventureId);
  }
  for (let i = 0; i < size.statements; i++) {
    await addTypedStatement(prisma, { text: `A statement the person typed, number ${i}, with a few more words.`, saidAt: "2026-09-01" });
  }
  for (const [n, ventureId] of ideas.entries()) {
    await prisma.figure.createMany({
      data: Array.from({ length: size.figuresPerIdea }, (_, i) => ({
        ventureId,
        kind: "gross-revenue",
        periodStart: new Date(Date.UTC(2020 + Math.floor(i / 12), i % 12, 1)),
        periodEnd: new Date(Date.UTC(2020 + Math.floor(i / 12), i % 12, 28)),
        amountCents: BigInt(100_000 + i * 37 + n),
        sourceKind: "file",
        sourceLabel: `sales-${n}-${i}.xlsx`,
      })),
    });
    await prisma.expense.createMany({
      data: Array.from({ length: size.expensesPerIdea }, (_, i) => ({
        ventureId,
        date: new Date(Date.UTC(2026, i % 12, 1 + (i % 27))),
        amountCents: BigInt(1_000 + i * 13),
        paidTo: `Seller number ${i} of idea ${n}`,
        whatFor: "Office supplies, printer paper and a box of pens for the workshop",
        sourceKind: "typed",
        sourceLabel: "typed by you",
        status: "agreed",
        agreedAt: new Date(Date.UTC(2026, 8, 1)),
      })),
    });
  }
  return ideas;
}

/** The adapter's connection with the key set before any query, as DotAmi's factory will do (design § 3). */
function keyedFactory(file: string, key: string | null) {
  const inner = new PrismaBetterSQLite3({ url: urlOf(file) }, { timestampFormat: "unixepoch-ms" });
  return {
    provider: "sqlite" as const,
    adapterName: inner.adapterName,
    async connect() {
      const adapter = await inner.connect();
      if (key) (adapter as unknown as { client: Database.Database }).client.pragma(key);
      return adapter;
    },
    connectToShadowDb: () => inner.connectToShadowDb(),
  };
}

type Mode = "engine" | "adapter" | "encrypted";
const MODES: Mode[] = ["engine", "adapter", "encrypted"];

function clientFor(mode: Mode, file: string): PrismaClient {
  if (mode === "engine") return new PrismaClient({ datasourceUrl: urlOf(file) });
  return new PrismaClient({ adapter: keyedFactory(file, mode === "encrypted" ? KEY_PRAGMA : null) });
}

/** The desktop migrator's first steps at every start: open the file, read Prisma's bookkeeping table. */
function migratorOpen(mode: Mode, file: string) {
  if (mode === "engine") {
    const db = new DatabaseSync(file);
    db.prepare(`SELECT migration_name, checksum, finished_at, rolled_back_at FROM "_prisma_migrations"`).all();
    db.close();
    return;
  }
  const db = new Database(file);
  if (mode === "encrypted") db.pragma(KEY_PRAGMA);
  db.prepare(`SELECT migration_name, checksum, finished_at, rolled_back_at FROM "_prisma_migrations"`).all();
  db.close();
}

/** The new backup copy (design § 8): the decrypted image into memory, rebuilt there, serialized again. */
function imageCopy(file: string): Buffer {
  const db = new Database(file, { readonly: true });
  db.pragma(KEY_PRAGMA);
  const image = db.serialize();
  db.close();
  const mem = new Database(image);
  mem.exec("VACUUM");
  const rebuilt = mem.serialize();
  mem.close();
  return rebuilt;
}

function startupProbe(mode: Mode, file: string): number[] {
  const out = execFileSync(process.execPath, [path.join("scripts", "measure-database-startup.mjs"), mode, file, KEY.toString("hex")], {
    encoding: "utf8",
  });
  return out.trim().split(/\s+/).map(Number);
}

function head16(file: string): string {
  const head = Buffer.alloc(16);
  const fd = openSync(file, "r");
  try {
    readSync(fd, head, 0, 16, 0);
  } finally {
    closeSync(fd);
  }
  return head.toString("latin1");
}

async function main() {
  console.log(`Seeding the "${sizeName}" size: ${JSON.stringify(size)}`);
  const plain = path.join(root, "plain.db");
  migrated(plain);
  const seeder = new PrismaClient({ datasourceUrl: urlOf(plain) });
  const ideas = await seed(seeder);
  await seeder.$disconnect();

  // The encrypted copy: the plain file copied, then encrypted in place with the library's rekey.
  const encrypted = path.join(root, "encrypted.db");
  copyFileSync(plain, encrypted);
  {
    const db = new Database(encrypted);
    db.pragma(`rekey = "x'${KEY.toString("hex")}'"`);
    db.close();
    if (head16(encrypted).startsWith("SQLite format 3")) throw new Error("the copy was not encrypted");
  }
  console.log(`File sizes: plain ${statSync(plain).size} bytes, encrypted ${statSync(encrypted).size} bytes`);

  const fileFor = (mode: Mode) => (mode === "encrypted" ? encrypted : plain);
  const results: Record<string, Partial<Record<Mode, number>>> = {};
  const put = (row: string, mode: Mode, ms: number) => ((results[row] ??= {})[mode] = ms);

  // Start-up, each in a fresh process (loading the libraries is part of what a person waits for).
  for (const mode of MODES) {
    const runs = Array.from({ length: 9 }, () => startupProbe(mode, fileFor(mode)));
    put("start: load Prisma (+ adapter)", mode, median(runs.map((r) => r[0])));
    put("start: open + first query", mode, median(runs.map((r) => r[1])));
    put("start: migrator open + read", mode, await timeIt(15, () => migratorOpen(mode, fileFor(mode))));
  }

  const today = readSettingsToday({ ...process.env, DATABASE_URL: urlOf(plain) });
  for (const mode of MODES) {
    const prisma = clientFor(mode, fileFor(mode));
    await prisma.$connect();
    put("page: ideas (listVentures)", mode, await timeIt(30, () => listVentures(prisma)));
    put("page: an idea's map", mode, await timeIt(30, () => loadVentureScenarioById(prisma, ideas[0])));
    // undefined: every record of the person's, attached to an idea or not (the Expenses page's "All").
    const shown = (await listExpenses(prisma, undefined)).length;
    if (shown !== size.ideas * size.expensesPerIdea) throw new Error(`the Expenses page read ${shown} records (${mode})`);
    put("page: Expenses (listExpenses)", mode, await timeIt(30, () => listExpenses(prisma, undefined)));
    put("page: What DotAmi knows (readHoldings)", mode, await timeIt(15, () => readHoldings(prisma, today)));
    await prisma.$disconnect();
  }

  // The wipe: on a fresh copy each run, after deleting every expense of the first idea.
  for (const mode of MODES) {
    const times: number[] = [];
    for (let i = 0; i < 6; i++) {
      const copy = path.join(root, `wipe-${mode}-${i}.db`);
      copyFileSync(fileFor(mode), copy);
      const prisma = clientFor(mode, copy);
      await prisma.expense.deleteMany({ where: { ventureId: ideas[0] } });
      const t = performance.now();
      const ok = await wipeFreeSpace(prisma);
      const ms = performance.now() - t;
      await prisma.$disconnect();
      if (!ok) throw new Error(`the wipe did not finish (${mode})`);
      if (i > 0) times.push(ms);
    }
    put("wipe: VACUUM through Prisma", mode, median(times));
  }

  // The backup. Today's whole File -> Back up..., with a passphrase, on the plain file (the scrypt step
  // that turns a passphrase into a key is most of it, and doesn't change). Then the one step that does.
  const out = path.join(root, "measure.dotami-backup");
  put(
    "backup: today's whole backup, with a passphrase",
    "engine",
    await timeIt(5, () => {
      rmSync(out, { force: true });
      writeBackup(plain, out, { passphrase: "a passphrase for measuring", appVersion: "0.0.0" });
    }),
  );
  put(
    "backup: the data-file copy step",
    "engine",
    await timeIt(15, () => {
      const copy = path.join(root, "vacuum-into.db");
      rmSync(copy, { force: true });
      const db = new DatabaseSync(plain, { readOnly: true });
      db.prepare("VACUUM INTO ?").run(copy);
      db.close();
    }),
  );
  // The rebuilt image must be the plain database (it goes inside the passphrase's encryption).
  if (!imageCopy(encrypted).subarray(0, 15).toString("latin1").startsWith("SQLite format 3")) throw new Error("the image is not plain");
  put("backup: the data-file copy step", "encrypted", await timeIt(15, () => imageCopy(encrypted)));

  console.log("");
  console.log(`| What (median, milliseconds, "${sizeName}" size) | Today: built-in engine | Adapter, plain file | Adapter, encrypted file |`);
  console.log("|---|---:|---:|---:|");
  for (const [row, byMode] of Object.entries(results)) {
    const cell = (m: Mode) => (byMode[m] === undefined ? "" : byMode[m]!.toFixed(1));
    console.log(`| ${row} | ${cell("engine")} | ${cell("adapter")} | ${cell("encrypted")} |`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => rmSync(root, { recursive: true, force: true }));
