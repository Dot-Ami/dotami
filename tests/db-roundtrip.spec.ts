/**
 * The database layer, end to end, on a real SQLite file.
 *
 * Until the SQLite switch (2026-09-28) nothing here could run in CI, because it needed a
 * PostgreSQL server. Now each run migrates a throwaway file in the OS temp folder, writes
 * through the same functions the app's routes and `npm run seed` use, reads it back, and
 * deletes the file. The main thing it guards: the four list fields, which SQLite stores as
 * JSON arrays, come back as the same lists that went in.
 */
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import type { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createDatabaseClient } from "@/lib/db/client";
import { ensureVentureFromScenario } from "@/lib/db/ensure-venture-from-scenario";
import { toStringList } from "@/lib/db/json-list";
import { linkVentures, listVentures, loadVentureScenarioById } from "@/lib/db/ventures";
import { addTypedStatement, listTypedStatements } from "@/lib/person/statements";
import { DEMO_LINK, demoScenarios } from "../prisma/seed-data";

const dbFile = path.join(tmpdir(), `dotami-test-${randomUUID()}.db`);
// Prisma wants forward slashes in a file: URL, Windows included.
const url = `file:${dbFile.replace(/\\/g, "/")}`;
let prisma: PrismaClient;

beforeAll(() => {
  // The Prisma CLI's own entry point, run with this Node — no shell, same on every OS.
  const prismaCli = path.join(process.cwd(), "node_modules", "prisma", "build", "index.js");
  execFileSync(process.execPath, [prismaCli, "migrate", "deploy"], {
    env: { ...process.env, DATABASE_URL: url },
    stdio: "pipe",
  });
  prisma = createDatabaseClient({ url });
}, 120_000);

afterAll(async () => {
  await prisma?.$disconnect();
  for (const f of [dbFile, `${dbFile}-journal`]) {
    if (existsSync(f)) rmSync(f);
  }
});

describe("database round trip (SQLite)", () => {
  it("a saved venture reads back with the same answers and branch picks", async () => {
    const scenario = demoScenarios[0];
    const { ventureId } = await ensureVentureFromScenario(prisma, scenario);

    const loaded = await loadVentureScenarioById(prisma, ventureId);
    expect(loaded).not.toBeNull();
    expect(loaded!.id).toBe(scenario.id);
    expect(loaded!.profile).toEqual(scenario.profile);
    expect(loaded!.state.activeBranches).toEqual(scenario.state.activeBranches);
  });

  it("stores the node-id lists as the same JSON arrays that went in", async () => {
    const scenario = demoScenarios[0];
    const { ventureId } = await ensureVentureFromScenario(prisma, scenario);
    const row = await prisma.scenarioState.findUniqueOrThrow({ where: { ventureId } });

    expect(toStringList(row.activeNodeIds)).toEqual(scenario.state.activeNodeIds);
    expect(toStringList(row.completedNodeIds)).toEqual(scenario.state.completedNodeIds);
    expect(toStringList(row.ghostedNodeIds)).toEqual(scenario.state.ghostedNodeIds);
    expect(scenario.state.activeNodeIds.length).toBeGreaterThan(0);
  });

  it("saving the same scenario twice updates it instead of adding a second row", async () => {
    await ensureVentureFromScenario(prisma, demoScenarios[0]);
    await ensureVentureFromScenario(prisma, demoScenarios[0]);
    const rows = await prisma.venture.findMany({ where: { scenarioSeedKey: demoScenarios[0].id } });
    expect(rows).toHaveLength(1);
  });

  it("the ideas list returns tags as a list and the cross-reference from both sides", async () => {
    const [a, b] = demoScenarios;
    const { ventureId: fromId } = await ensureVentureFromScenario(prisma, a);
    const { ventureId: toId } = await ensureVentureFromScenario(prisma, b);
    await linkVentures(prisma, fromId, toId, DEMO_LINK.kind, DEMO_LINK.note);

    const list = await listVentures(prisma);
    const fromRow = list.find((v) => v.id === fromId);
    const toRow = list.find((v) => v.id === toId);
    expect(fromRow?.activityTags).toEqual(a.profile.activityTags);
    expect(toRow?.activityTags).toEqual(b.profile.activityTags);
    expect(fromRow?.links).toEqual([expect.objectContaining({ otherId: toId, kind: "overlaps", outbound: true })]);
    expect(toRow?.links).toEqual([expect.objectContaining({ otherId: fromId, kind: "overlaps", outbound: false })]);
  });

  it("a dated statement keeps its calendar day, newest first", async () => {
    await addTypedStatement(prisma, { text: "older", saidAt: "2026-01-31" });
    await addTypedStatement(prisma, { text: "newer", saidAt: "2026-09-01" });
    const statements = await listTypedStatements(prisma);
    expect(statements.map((s) => [s.text, s.saidAt])).toEqual([
      ["newer", "2026-09-01"],
      ["older", "2026-01-31"],
    ]);
  });

  it("a row inserted without activityTags reads back as an empty list, not a parse error", async () => {
    // Guards the hand-fixed default in the init migration: Prisma generated `DEFAULT []`,
    // which SQLite stores as an empty string that Prisma can't read back as JSON.
    const user = await prisma.user.upsert({
      where: { email: "raw@test.local" },
      create: { email: "raw@test.local" },
      update: {},
    });
    await prisma.$executeRaw`INSERT INTO "Venture" (id, userId, name, type, province, targetRevenueY1, targetRevenueY3, employmentStatus, updatedAt) VALUES ('raw-default', ${user.id}, 'raw', 'SERVICE', 'AB', 0, 0, 'OTHER', CURRENT_TIMESTAMP)`;
    const row = await prisma.venture.findUniqueOrThrow({ where: { id: "raw-default" } });
    expect(row.activityTags).toEqual([]);
  });
});

describe("toStringList", () => {
  it("keeps strings, drops anything else, and treats a non-array as empty", () => {
    expect(toStringList(["Trades", "Consulting"])).toEqual(["Trades", "Consulting"]);
    expect(toStringList(["Trades", 3, null, { a: 1 }])).toEqual(["Trades"]);
    expect(toStringList(null)).toEqual([]);
    expect(toStringList("Trades")).toEqual([]);
    expect(toStringList({ 0: "Trades" })).toEqual([]);
  });
});
