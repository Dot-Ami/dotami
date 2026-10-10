/**
 * [8i] DotAmi's one database client (lib/db/client.ts): Prisma through the better-sqlite3 adapter, with
 * the data file's key set before any query (docs/architecture/database-encryption.md § 3).
 *
 * - It is the only place a Prisma Client is made, so every test and the app open the file one way.
 * - With a key, what it writes is unreadable on the disk; the plain file is the control.
 * - Without the key, or with another key, it refuses with DotAmi's own sentence and changes nothing.
 * - A transaction that rolls back undoes only its own writes, as with Prisma's built-in engine; the
 *   adapter on its own (the control) loses another request's write made meanwhile.
 */
import { createHash } from "node:crypto";
import { mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { PrismaBetterSQLite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@prisma/client";
import { afterAll, describe, expect, it, vi } from "vitest";

import { createDatabaseClient, DataFileUnreadable } from "@/lib/db/client";
import { encryptInPlace, fileUrl, looksPlain, migratedFile } from "./helpers/migrated-db";

vi.setConfig({ testTimeout: 60_000, hookTimeout: 120_000 });

const root = mkdtempSync(path.join(tmpdir(), "dotami-db-client-"));
const KEY = Buffer.alloc(32, 0x5a);
const OTHER_KEY = Buffer.alloc(32, 0x33);
const MARKER = "zq-database-client-marker-4417";
const clients: PrismaClient[] = [];

afterAll(async () => {
  for (const c of clients) await c.$disconnect().catch(() => {});
  rmSync(root, { recursive: true, force: true });
});

function open(file: string, key: Buffer | null = null) {
  const client = createDatabaseClient({ url: fileUrl(file), key });
  clients.push(client);
  return client;
}

const sha256 = (file: string) => createHash("sha256").update(readFileSync(file)).digest("hex");

/** The files a test makes, by name, each migrated afresh. */
let n = 0;
function newFile(): string {
  n += 1;
  return migratedFile(path.join(root, `db-${n}.db`));
}

describe("every Prisma Client is made by lib/db/client.ts", () => {
  // The places that keep Prisma's own engine, or the adapter on its own, on purpose: each a referee or a control.
  const ALLOWED = new Map([
    ["lib/db/client.ts", "the factory itself"],
    ["tests/database-client.spec.ts", "this file's control: the adapter without the factory"],
    ["tests/db-dates.spec.ts", "the built-in engine as the referee for how dates are stored"],
    ["scripts/measure-database-adapter.ts", "the measurement compares the built-in engine with the adapter"],
    ["scripts/measure-database-startup.mjs", "the same measurement's start-up probe"],
  ]);
  const FOLDERS = ["app", "components", "lib", "desktop", "prisma", "tests", "e2e", "e2e-desktop", "scripts"];
  const CONSTRUCTION = /\bnew\s+PrismaClient\b/;

  function sourceFiles(dir: string): string[] {
    const out: string[] = [];
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== "node_modules" && !entry.name.startsWith(".")) out.push(...sourceFiles(full));
      } else if (/\.(c|m)?(t|j)sx?$/.test(entry.name)) out.push(full);
    }
    return out;
  }

  /** The files, relative to the top folder with forward slashes, whose text makes a Prisma Client itself. */
  function constructions(files: { rel: string; text: string }[]): string[] {
    return files.filter((f) => CONSTRUCTION.test(f.text) && !ALLOWED.has(f.rel)).map((f) => f.rel);
  }

  it("finds none anywhere else in the repository", () => {
    const files = FOLDERS.flatMap((folder) => sourceFiles(path.join(process.cwd(), folder))).map((file) => ({
      rel: path.relative(process.cwd(), file).split(path.sep).join("/"),
      text: readFileSync(file, "utf8"),
    }));
    expect(files.length).toBeGreaterThan(100);
    expect(constructions(files)).toEqual([]);
    // Every allowed file still needs its exception; a stale one goes.
    for (const rel of ALLOWED.keys()) expect(CONSTRUCTION.test(files.find((f) => f.rel === rel)?.text ?? ""), rel).toBe(true);
  });

  it("names a file that makes its own (the control)", () => {
    const made = ["const db = new ", "PrismaClient({ datasourceUrl: url });"].join("");
    expect(constructions([{ rel: "tests/some-new.spec.ts", text: made }])).toEqual(["tests/some-new.spec.ts"]);
  });
});

describe("a plain file and an encrypted one", () => {
  it("without a key the file stays plain; with a key what is written is unreadable on the disk", async () => {
    const plain = newFile();
    const locked = newFile();
    encryptInPlace(locked, KEY);
    expect(looksPlain(plain)).toBe(true);
    expect(looksPlain(locked)).toBe(false);

    for (const [file, key] of [[plain, null], [locked, KEY]] as const) {
      const db = open(file, key);
      await db.sourceAccount.create({ data: { name: `Chequing ${MARKER}`, allowance: "once", agreedAt: new Date("2026-10-01T00:00:00Z") } });
      expect((await db.sourceAccount.findFirstOrThrow()).name).toBe(`Chequing ${MARKER}`);
      await db.$disconnect();
    }
    // The control: the plain file holds the words as they were typed. The encrypted one doesn't, and
    // still doesn't start the way a plain SQLite file does.
    expect(readFileSync(plain).includes(Buffer.from(MARKER))).toBe(true);
    expect(readFileSync(locked).includes(Buffer.from(MARKER))).toBe(false);
    expect(looksPlain(locked)).toBe(false);
  });

  it("an encrypted file without the key, or with another key, is refused with DotAmi's sentence, and nothing on the disk changes", async () => {
    const locked = newFile();
    encryptInPlace(locked, KEY);
    const before = { sha: sha256(locked), size: statSync(locked).size, files: readdirSync(root).sort() };

    const noKey = open(locked, null);
    const refusedPlain = await noKey.sourceAccount.count().catch((error: unknown) => error);
    const wrongKey = open(locked, OTHER_KEY);
    const refusedKeyed = await wrongKey.sourceAccount.count().catch((error: unknown) => error);

    // Prisma passes the factory's error through as the reason the client couldn't start.
    expect(String(refusedPlain)).toContain(new DataFileUnreadable(false).message);
    expect(String(refusedKeyed)).toContain(new DataFileUnreadable(true).message);
    expect({ sha: sha256(locked), size: statSync(locked).size, files: readdirSync(root).sort() }).toEqual(before);

    // The right key opens it.
    expect(await open(locked, KEY).sourceAccount.count()).toBe(0);
  });

  it("a key that isn't 32 bytes is refused before anything is opened", () => {
    expect(() => createDatabaseClient({ url: fileUrl(path.join(root, "never.db")), key: Buffer.alloc(16) })).toThrow("a database key is 32 bytes");
  });
});

describe("a transaction that rolls back undoes only its own writes", () => {
  /**
   * Another request writes, and reads, while a transaction is open (after the transaction's own first
   * write); the transaction then fails. Returns the rows left, and what the other request's read saw.
   */
  async function writeDuringFailedTransaction(db: PrismaClient) {
    let wroteInside!: () => void;
    const insideWritten = new Promise<void>((resolve) => (wroteInside = resolve));
    let finish!: () => void;
    const mayFinish = new Promise<void>((resolve) => (finish = resolve));
    const failing = db
      .$transaction(
        async (tx) => {
          await tx.sourceAccount.create({ data: { name: "inside the transaction", allowance: "once", agreedAt: new Date() } });
          wroteInside();
          await mayFinish;
          throw new Error("rolled back on purpose");
        },
        { timeout: 20_000 },
      )
      .catch(() => "rolled back");
    await insideWritten;
    // Prisma runs a query only once something waits for it: `.then` sends each one now.
    const outside = db.sourceAccount.create({ data: { name: "another request", allowance: "once", agreedAt: new Date() } }).then((row) => row.name);
    const read = db.sourceAccount.findMany().then((rows) => rows.map((r) => r.name));
    // Long enough for both to reach the database if nothing holds them back.
    await new Promise((resolve) => setTimeout(resolve, 300));
    finish();
    expect(await failing).toBe("rolled back");
    await outside;
    const seenMeanwhile = await read;
    return { names: (await db.sourceAccount.findMany()).map((r) => r.name), seenMeanwhile };
  }

  it("through DotAmi's client, the other request's write is kept and its read never saw the transaction's row", async () => {
    const db = open(newFile());
    const { names, seenMeanwhile } = await writeDuringFailedTransaction(db);
    expect(names).toEqual(["another request"]);
    // Its read waited for the transaction, so it never saw the row that was then undone.
    expect(seenMeanwhile).not.toContain("inside the transaction");
  });

  it("through the adapter on its own (the control), the other request's write is lost with the transaction", async () => {
    const file = newFile();
    const bare = new PrismaClient({ adapter: new PrismaBetterSQLite3({ url: file }, { timestampFormat: "unixepoch-ms" }) });
    clients.push(bare);
    const { names } = await writeDuringFailedTransaction(bare);
    expect(names).toEqual([]);
  });
});
