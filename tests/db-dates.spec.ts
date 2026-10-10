/**
 * [8i] Dates keep the shape Prisma's built-in engine gave them (docs/architecture/database-encryption.md
 * § 3). The engine stores a DateTime as a whole number of milliseconds; the better-sqlite3 adapter, left
 * to its default, would store ISO-8601 text. Every data file written before the move holds the engine's
 * integers, so DotAmi's client (lib/db/client.ts) asks the adapter for milliseconds too.
 *
 * The built-in engine stays here as the referee, with Prisma's own adapter at its default as the control:
 * tests/database-client.spec.ts allows this file to make those two clients itself.
 */
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { PrismaBetterSQLite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@prisma/client";
import Database from "better-sqlite3";
import { afterAll, describe, expect, it, vi } from "vitest";

import { createDatabaseClient } from "@/lib/db/client";
import { fileUrl, migratedFile } from "./helpers/migrated-db";

vi.setConfig({ testTimeout: 60_000, hookTimeout: 120_000 });

const root = mkdtempSync(path.join(tmpdir(), "dotami-db-dates-"));
afterAll(() => rmSync(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 }));

const SAID = new Date("2026-09-01T00:00:00.000Z");
const AGREED = new Date("2026-10-09T13:45:12.345Z");

/** How the file stores each statement's day and each account's agreed time: SQLite's type and the value. */
function stored(file: string) {
  const db = new Database(file, { readonly: true });
  try {
    return {
      statements: db.prepare(`SELECT text, typeof(saidAt) AS type, saidAt AS value FROM "PersonStatement" ORDER BY text`).all(),
      accounts: db.prepare(`SELECT name, typeof(agreedAt) AS type, agreedAt AS value FROM "SourceAccount" ORDER BY name`).all(),
    };
  } finally {
    db.close();
  }
}

/** One statement and one bank account, written through `db`, labelled `who`. */
async function write(db: PrismaClient, who: string) {
  const user = await db.user.upsert({ where: { email: "stub@dotami.local" }, update: {}, create: { email: "stub@dotami.local" } });
  await db.personStatement.create({ data: { userId: user.id, text: who, saidAt: SAID } });
  await db.sourceAccount.create({ data: { name: who, allowance: "once", agreedAt: AGREED } });
}

describe("dates written before and after the move to the adapter", () => {
  it("are stored the same way, as whole milliseconds, and read back equal through either", async () => {
    const file = migratedFile(path.join(root, "dates.db"));
    const engine = new PrismaClient({ datasourceUrl: fileUrl(file) });
    await write(engine, "a written by the built-in engine");
    await engine.$disconnect();
    const ours = createDatabaseClient({ url: fileUrl(file) });
    await write(ours, "b written by DotAmi's client");

    expect(stored(file)).toEqual({
      statements: [
        { text: "a written by the built-in engine", type: "integer", value: SAID.getTime() },
        { text: "b written by DotAmi's client", type: "integer", value: SAID.getTime() },
      ],
      accounts: [
        { name: "a written by the built-in engine", type: "integer", value: AGREED.getTime() },
        { name: "b written by DotAmi's client", type: "integer", value: AGREED.getTime() },
      ],
    });
    // Each client reads both rows' dates back as the same moment.
    const readBy = async (db: PrismaClient) => (await db.sourceAccount.findMany({ orderBy: { name: "asc" } })).map((r) => r.agreedAt.toISOString());
    expect(await readBy(ours)).toEqual([AGREED.toISOString(), AGREED.toISOString()]);
    await ours.$disconnect();
    const engineAgain = new PrismaClient({ datasourceUrl: fileUrl(file) });
    expect(await readBy(engineAgain)).toEqual([AGREED.toISOString(), AGREED.toISOString()]);
    await engineAgain.$disconnect();
  });

  it("the adapter at its default would store text instead (the control)", async () => {
    const file = migratedFile(path.join(root, "default.db"));
    const adapterDefault = new PrismaClient({ adapter: new PrismaBetterSQLite3({ url: file }) });
    await write(adapterDefault, "c written by the adapter at its default");
    await adapterDefault.$disconnect();
    const { accounts } = stored(file);
    expect(accounts).toEqual([{ name: "c written by the adapter at its default", type: "text", value: "2026-10-09T13:45:12.345+00:00" }]);
  });
});
