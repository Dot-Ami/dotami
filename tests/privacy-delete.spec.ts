/**
 * [8d] The Delete menu on /your-data: what each tick-box takes, that the database really loses
 * it, and that the deleted words are gone from the file's bytes, not just hidden.
 *
 * Runs on throwaway migrated SQLite files (the same setup as tests/privacy-holdings.spec.ts) and
 * through Prisma, because the wipe has to be proven with the database library the app really uses.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { PrismaClient } from "@prisma/client";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { __resetRateLimitStateForTests } from "@/lib/api/rate-limit";
import { ensureVentureFromScenario } from "@/lib/db/ensure-venture-from-scenario";
import { recordRetentionV2026 } from "@/lib/engines/compliance/v2026";
import { addTypedStatement } from "@/lib/person/statements";
import { DeleteInputError, affectedTables, countKeptLinks, deleteData, keptLinks, pickKinds, wipeFreeSpace } from "@/lib/privacy/delete";
import { DELETE_MENU, KEPT_BY_DELETE, NOT_CLEARED_BY_DELETE, TABLES, keptLinkKey } from "@/lib/privacy/inventory";
import { writeSetting } from "@/lib/settings/store";
import { demoScenarios } from "../prisma/seed-data";

// Each database test migrates its own file (1.5-5 s on this machine, more on a busy runner), and
// the locked-wipe tests wait out SQLite's 5-second busy timeout on purpose; vitest's 5-second
// default made the suite fail at random.
vi.setConfig({ testTimeout: 60_000, hookTimeout: 120_000 });

const root = mkdtempSync(path.join(tmpdir(), "dotami-delete-"));
const prismaCli = path.join(process.cwd(), "node_modules", "prisma", "build", "index.js");
const clients: PrismaClient[] = [];

/** A migrated, empty database in its own folder. */
function makeDb(name: string) {
  const folder = path.join(root, name);
  mkdirSync(folder, { recursive: true });
  const file = path.join(folder, "dotami.db");
  const url = `file:${file.replace(/\\/g, "/")}`;
  execFileSync(process.execPath, [prismaCli, "migrate", "deploy"], {
    env: { ...process.env, DATABASE_URL: url, CHECKPOINT_DISABLE: "1" },
    stdio: "pipe",
  });
  const prisma = new PrismaClient({ datasourceUrl: url });
  clients.push(prisma);
  return { folder, file, url, prisma };
}

/** A marker no real data would contain, so finding it in the bytes can only mean the deleted row. */
const MARKER = "zq-delete-marker-7731";

/** Two ideas with something in every table, each holding the marker where the person's words go. */
async function seed(prisma: PrismaClient) {
  const a = (await ensureVentureFromScenario(prisma, demoScenarios[0])).ventureId;
  const b = (await ensureVentureFromScenario(prisma, demoScenarios[1])).ventureId;
  await prisma.venture.update({ where: { id: a }, data: { notes: `note ${MARKER}` } });
  await prisma.ventureLink.create({ data: { fromId: a, toId: b, kind: "RELATED", note: `link ${MARKER}` } });
  // ensureVentureFromScenario saves each idea's map progress too, so ScenarioState has a row per idea.
  await addTypedStatement(prisma, { text: `statement ${MARKER}`, saidAt: "2026-09-01" });
  await addTypedStatement(prisma, { text: "a second statement", saidAt: "2026-09-02" });
  await writeSetting(prisma, "figure-reminders", { cadences: ["yearly"], ideaIds: [a] });
  for (const ventureId of [a, b]) {
    await prisma.figure.create({
      data: {
        ventureId,
        kind: "gross-revenue",
        periodStart: new Date("2026-08-01T00:00:00Z"),
        periodEnd: new Date("2026-08-31T00:00:00Z"),
        amountCents: BigInt(123_456),
        sourceKind: "file",
        sourceLabel: `sales ${MARKER}.xlsx`,
      },
    });
    await prisma.expense.create({
      data: {
        ventureId,
        date: new Date("2026-08-15T00:00:00Z"),
        amountCents: BigInt(4_599),
        paidTo: `seller ${MARKER}`,
        whatFor: "printer paper",
        sourceKind: "typed",
        sourceLabel: "typed by you",
      },
    });
  }
  return { a, b };
}

const ALL_MODELS = TABLES.map((t) => t.model);

async function countAll(prisma: PrismaClient): Promise<Record<string, number>> {
  const out: Record<string, number> = {};
  for (const m of ALL_MODELS) {
    out[m] = await (prisma as unknown as Record<string, { count(): Promise<number> }>)[
      m.charAt(0).toLowerCase() + m.slice(1)
    ].count();
  }
  return out;
}

/**
 * What the page would send: the counts of every table the ticked kinds touch, as they stand, and
 * how many rows each kept link holds (an expense record's idea, when ideas are ticked).
 */
async function seenFor(prisma: PrismaClient, kinds: string[]): Promise<Record<string, number>> {
  const all = await countAll(prisma);
  const entries = pickKinds(kinds);
  return {
    ...Object.fromEntries(affectedTables(entries).map((m) => [m, all[m]])),
    ...(await countKeptLinks(prisma, keptLinks(entries))),
  };
}

/** One expense record attached to no idea, as the Expenses page keeps one ("not attached yet"). */
async function unattachedExpense(prisma: PrismaClient) {
  return prisma.expense.create({
    data: {
      ventureId: null,
      date: new Date("2026-08-20T00:00:00Z"),
      amountCents: BigInt(1_250),
      paidTo: "Example Cafe",
      whatFor: "client coffee",
      sourceKind: "typed",
      sourceLabel: "typed by you",
    },
  });
}

/** Does the marker appear anywhere in the data file's folder (the file, and any journal beside it)? */
function markerOnDisk(folder: string): string[] {
  const needle = Buffer.from(MARKER, "utf8");
  return readdirSync(folder).filter((name) => readFileSync(path.join(folder, name)).includes(needle));
}

afterAll(async () => {
  for (const c of clients) await c.$disconnect();
  rmSync(root, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------------------------

describe("the Delete menu covers every table, and says what goes with each", () => {
  const schema = readFileSync(path.join(process.cwd(), "prisma", "schema.prisma"), "utf8");

  /** One link in the schema: `child.field` points at `parent`, optional or not, and what deleting the parent does. */
  interface Relation {
    child: string;
    parent: string;
    field: string;
    optional: boolean;
    onDelete: string | null;
  }

  /** Every link that holds a key (the side with `fields: [...]`), read from the schema text. */
  function relations(): Relation[] {
    const out: Relation[] = [];
    for (const m of schema.matchAll(/^model\s+(\w+)\s*\{([\s\S]*?)^\}/gm)) {
      for (const line of m[2].split("\n")) {
        const rel = line.match(/^\s*\w+\s+(\w+)(\??)\s+@relation\(([^)]*)\)/);
        const field = rel?.[3].match(/fields:\s*\[(\w+)\]/);
        if (!rel || !field) continue;
        out.push({ child: m[1], parent: rel[1], field: field[1], optional: rel[2] === "?", onDelete: rel[3].match(/onDelete:\s*(\w+)/)?.[1] ?? null });
      }
    }
    return out;
  }

  /** model -> the models it points at with onDelete: Cascade. */
  function cascadeParents(): Map<string, string[]> {
    const out = new Map<string, string[]>();
    for (const m of schema.matchAll(/^model\s+(\w+)\s*\{/gm)) out.set(m[1], []);
    for (const r of relations()) if (r.onDelete === "Cascade") out.get(r.child)!.push(r.parent);
    return out;
  }

  it("reads the schema's links (a guard against the parse silently finding nothing)", () => {
    expect(cascadeParents().get("Figure")).toEqual(["Venture"]);
    expect(relations().find((r) => r.child === "Expense" && r.field === "ventureId")).toEqual({
      child: "Expense",
      parent: "Venture",
      field: "ventureId",
      optional: true,
      onDelete: "SetNull",
    });
  });

  it("names, for each box, the records it keeps with their link cleared (onDelete: SetNull)", () => {
    // The maintainer's decision (2026-10-08): deleting ideas keeps their expense records, "not
    // attached yet". The menu has to say so, with a count, so every such link must be listed.
    const all = relations();
    for (const entry of DELETE_MENU) {
      const gone = [...entry.tables, ...entry.alsoDeletes];
      const expected = all
        .filter((r) => r.onDelete === "SetNull" && gone.includes(r.parent) && !gone.includes(r.child))
        .map((r) => keptLinkKey({ model: r.child, field: r.field }))
        .sort();
      expect(entry.keeps.map(keptLinkKey).sort(), `${entry.id}: keeps`).toEqual(expected);
      for (const k of entry.keeps) expect(k.becomes.trim()).not.toBe("");
    }
    expect(DELETE_MENU.find((e) => e.id === "ideas")!.keeps.map(keptLinkKey)).toEqual(["Expense.ventureId"]);
  });

  it("the menu in the window works out the kept links with the server's own code, not a copy", () => {
    // The warning's number comes from the window and the server checks it; two copies of the rule
    // could drift and show one number while checking another. Both import lib/privacy/kept-links,
    // which loads nothing at run time, so the window doesn't bundle the inventory to get it.
    const read = (p: string) => readFileSync(path.join(process.cwd(), p), "utf8");
    const menu = read("components/your-data/delete-menu.tsx");
    expect(menu).toMatch(/import \{ keptLinkKey, keptLinks \} from "@\/lib\/privacy\/kept-links";/);
    // No loop of its own over a box's keeps (the copy this replaced did `for (const k of e.keeps)`).
    expect(menu).not.toMatch(/function keptLinksOf|of e\.keeps\)/);
    expect(read("lib/privacy/delete.ts")).toMatch(/from "\.\/kept-links";/);
    const shared = read("lib/privacy/kept-links.ts");
    const imports = shared.split("\n").filter((l) => /^import /.test(l));
    expect(imports.length).toBeGreaterThan(0);
    for (const l of imports) expect(l, "kept-links must load nothing at run time").toMatch(/^import type /);
  });

  it("empties every table a box goes with completely, so the whole-table counts it shows are true", () => {
    // A table goes completely with a box only when each of its rows MUST point (a required link,
    // onDelete: Cascade) at a table the box empties. An optional link would leave the rows that
    // point nowhere, and the menu would count them as deleted when they are not.
    const all = relations();
    for (const entry of DELETE_MENU) {
      const gone = [...entry.tables, ...entry.alsoDeletes];
      for (const model of entry.alsoDeletes) {
        const whole = all.some((r) => r.child === model && r.onDelete === "Cascade" && !r.optional && gone.includes(r.parent));
        expect(whole, `${entry.id}: ${model} isn't emptied completely; list it in keeps or give it a box of its own`).toBe(true);
      }
    }
  });

  it("reaches every table from a tick-box (its own, or one it goes with), or keeps it on purpose", () => {
    const own = DELETE_MENU.flatMap((e) => e.tables);
    const goesWith = DELETE_MENU.flatMap((e) => e.alsoDeletes);
    const kept = KEPT_BY_DELETE.map((k) => k.model);
    for (const model of ALL_MODELS) {
      const reached = own.includes(model) || goesWith.includes(model);
      expect(reached !== kept.includes(model), `${model}: add it to DELETE_MENU or KEPT_BY_DELETE in lib/privacy/inventory.ts`).toBe(true);
      // One box per table: two boxes emptying the same table would say two different things about it.
      expect(own.filter((m) => m === model).length, `${model} is on more than one box`).toBeLessThanOrEqual(1);
    }
    for (const model of [...own, ...goesWith, ...kept]) expect(ALL_MODELS).toContain(model);
  });

  it("names, for each box, exactly the tables the database empties along with it", () => {
    const parents = cascadeParents();
    for (const entry of DELETE_MENU) {
      // Everything that cascades from these tables, followed down (a child's child goes too).
      const expected = new Set<string>();
      let frontier = [...entry.tables];
      while (frontier.length > 0) {
        const next: string[] = [];
        for (const [child, ps] of parents) {
          if (ps.some((p) => frontier.includes(p)) && !expected.has(child) && !entry.tables.includes(child)) {
            expected.add(child);
            next.push(child);
          }
        }
        frontier = next;
      }
      expect([...entry.alsoDeletes].sort(), `${entry.id}: alsoDeletes`).toEqual([...expected].sort());
    }
  });

  it("says what goes with each box and has a Learn more for it; a box not built yet deletes nothing", () => {
    for (const e of DELETE_MENU) {
      expect(e.label.trim()).not.toBe("");
      expect(e.goesWithIt.trim()).not.toBe("");
      expect(e.learnMore.trim()).not.toBe("");
      if (!e.built) expect(e.tables).toEqual([]);
    }
    // The ideas box names what it takes with it, in words: the maintainer's example.
    const ideas = DELETE_MENU.find((e) => e.id === "ideas")!;
    expect(ideas.goesWithIt).toMatch(/figure/);
    expect(ideas.goesWithIt).toMatch(/map progress/);
    // Expense records are named too, as what STAYS (the maintainer's decision of 2026-10-08), and the
    // Learn more says where they are kept and how to delete them. It never says they belong to an idea.
    expect(ideas.goesWithIt).toMatch(/expense records stay/i);
    expect(ideas.goesWithIt).toMatch(/not attached yet/);
    expect(ideas.learnMore).toMatch(/not attached yet/);
    expect(ideas.learnMore).toMatch(/data file on this computer/);
    expect(ideas.learnMore).toMatch(/Your expense records/);
    // The kept count covers turned-down records too (the database clears every record's idea), but
    // the Expenses page lists none of them, so the warning and the Learn more both say so.
    for (const said of [ideas.keeps[0].whereAndHow, ideas.learnMore]) {
      expect(said).toMatch(/lists the ones you haven't turned down/);
      expect(said).toMatch(/Records you turned down are kept and counted too, but no list shows them/);
    }
    for (const e of DELETE_MENU) expect(`${e.goesWithIt} ${e.learnMore}`).not.toMatch(/expense records? (always )?belongs? to an idea/i);
    // The expense records box counts every record, attached or not, and says so.
    const expenses = DELETE_MENU.find((e) => e.id === "expenses")!;
    expect(expenses.learnMore).not.toMatch(/on every idea/);
    expect(expenses.goesWithIt).toMatch(/attached to an idea or not/);
    // Statements go all at once, never one by one, and the box says so.
    expect(DELETE_MENU.find((e) => e.id === "statements")!.goesWithIt).toMatch(/all of them go at once/i);
    // Remembered columns has a place on the menu but isn't built.
    expect(DELETE_MENU.find((e) => e.id === "remembered-columns")!.built).toBe(false);
  });

  it("says plainly what it can't reach: the safety copies and the window's earlier leftovers", () => {
    const names = NOT_CLEARED_BY_DELETE.map((n) => n.name);
    expect(names).toContain("Safety copies in the backups folder");
    expect(NOT_CLEARED_BY_DELETE.find((n) => n.name === "What the window stored in earlier launches")!.why).toMatch(/^Not cleared yet/);
  });

  it("cites the CRA's record-keeping page, dated, with the six years as a typed field", () => {
    expect(recordRetentionV2026.retentionYears).toBe(6);
    expect(recordRetentionV2026.citations).toHaveLength(1);
    const [c] = recordRetentionV2026.citations;
    expect(c.authority).toBe("CRA");
    expect(c.url).toMatch(/^https:\/\/www\.canada\.ca\/en\/revenue-agency\//);
    expect(c.lastVerified).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("pickKinds", () => {
  it("refuses nothing ticked, an unknown kind and one DotAmi doesn't keep yet", () => {
    expect(() => pickKinds([])).toThrow(DeleteInputError);
    expect(() => pickKinds(undefined)).toThrow(DeleteInputError);
    expect(() => pickKinds(["everything"])).toThrow(DeleteInputError);
    expect(() => pickKinds([42])).toThrow(DeleteInputError);
    expect(() => pickKinds(["remembered-columns"])).toThrow(/nothing to delete/);
  });

  it("returns the boxes in the menu's order, once each", () => {
    expect(pickKinds(["settings", "ideas", "settings"]).map((e) => e.id)).toEqual(["ideas", "settings"]);
  });
});

describe("deleteData", () => {
  it("deletes the statements, all of them, and nothing else", async () => {
    const { prisma } = makeDb("statements");
    await seed(prisma);
    const before = await countAll(prisma);
    expect(before.PersonStatement).toBe(2);

    const result = await deleteData(prisma, { kinds: ["statements"], seen: await seenFor(prisma, ["statements"]) });
    expect(result).toEqual({ status: "deleted", deleted: { PersonStatement: 2 }, left: { PersonStatement: 0 }, wiped: true });
    expect(await countAll(prisma)).toEqual({ ...before, PersonStatement: 0 });
  });

  it("deleting ideas takes their links, map progress and figures, keeps every expense record (not attached yet), and leaves statements and settings", async () => {
    // The case that made the counts wrong: 2 records attached to an idea and 1 not attached.
    const { prisma } = makeDb("ideas");
    await seed(prisma);
    const loose = await unattachedExpense(prisma);
    const before = await countAll(prisma);
    for (const m of ["Venture", "VentureLink", "ScenarioState", "Figure"]) expect(before[m]).toBeGreaterThan(0);
    expect(before.Expense).toBe(3);

    // What the page shows and sends: whole-table counts for what goes, and how many records are attached.
    const seen = { Venture: 2, VentureLink: 1, ScenarioState: 2, Figure: 2, "Expense.ventureId": 2 };
    expect(await seenFor(prisma, ["ideas"])).toEqual(seen);
    const result = await deleteData(prisma, { kinds: ["ideas"], seen });
    expect(result).toEqual({
      status: "deleted",
      deleted: { Venture: 2, VentureLink: 1, ScenarioState: 2, Figure: 2 },
      left: { Venture: 0, VentureLink: 0, ScenarioState: 0, Figure: 0 },
      kept: { Expense: { unlinked: 2, total: 3 } },
      wiped: true,
    });

    const after = await countAll(prisma);
    expect(after).toEqual({ ...before, Venture: 0, VentureLink: 0, ScenarioState: 0, Figure: 0 });
    expect(after.Expense).toBe(3);
    expect(await prisma.expense.count({ where: { ventureId: { not: null } } })).toBe(0);
    expect((await prisma.expense.findUniqueOrThrow({ where: { id: loose.id } })).paidTo).toBe("Example Cafe");
    expect(after.PersonStatement).toBe(2);
    expect(after.Setting).toBe(1);
  });

  it("counts a turned-down record on an idea among the ones kept, and it stays turned down", async () => {
    // The warning's "N stay" includes turned-down records; the Expenses page never lists them,
    // which is why the warning says so (lib/privacy/inventory.ts, the ideas entry's keeps).
    const { prisma } = makeDb("ideas-turned-down");
    await seed(prisma);
    const attached = await prisma.expense.findFirstOrThrow({ where: { ventureId: { not: null } } });
    await prisma.expense.update({ where: { id: attached.id }, data: { status: "discarded" } });

    const seen = await seenFor(prisma, ["ideas"]);
    expect(seen["Expense.ventureId"]).toBe(2);
    const result = await deleteData(prisma, { kinds: ["ideas"], seen });
    expect(result).toMatchObject({ status: "deleted", kept: { Expense: { unlinked: 2, total: 2 } } });
    const after = await prisma.expense.findUniqueOrThrow({ where: { id: attached.id } });
    expect(after.ventureId).toBeNull();
    expect(after.status).toBe("discarded");
  });

  it("ticking ideas and expense records together deletes every record, and keeps none", async () => {
    const { prisma } = makeDb("ideas-and-expenses");
    await seed(prisma);
    await unattachedExpense(prisma);
    const kinds = ["ideas", "expenses"];
    const seen = await seenFor(prisma, kinds);
    // The expense records are counted whole, once, and no "kept" count is asked for. Their receipts
    // (none here) go with them.
    expect(seen).toEqual({ Venture: 2, VentureLink: 1, ScenarioState: 2, Figure: 2, Expense: 3, Receipt: 0 });
    const result = await deleteData(prisma, { kinds, seen });
    expect(result).toEqual({
      status: "deleted",
      deleted: { Venture: 2, VentureLink: 1, ScenarioState: 2, Figure: 2, Expense: 3, Receipt: 0 },
      left: { Venture: 0, VentureLink: 0, ScenarioState: 0, Figure: 0, Expense: 0, Receipt: 0 },
      wiped: true,
    });
  });

  it("deletes nothing when a record was attached to an idea since the person looked, though the totals are the same", async () => {
    const { prisma } = makeDb("attached-since");
    const { a } = await seed(prisma);
    const loose = await unattachedExpense(prisma);
    const seen = await seenFor(prisma, ["ideas"]);
    expect(seen["Expense.ventureId"]).toBe(2);
    // The warning said 2 records stay; attaching a third between the look and the "yes" makes that untrue.
    await prisma.expense.update({ where: { id: loose.id }, data: { ventureId: a } });
    const before = await countAll(prisma);

    const result = await deleteData(prisma, { kinds: ["ideas"], seen });
    expect(result.status).toBe("changed");
    if (result.status === "changed") expect(result.counts["Expense.ventureId"]).toBe(3);
    expect(await countAll(prisma)).toEqual(before);
  });

  it("refuses an ideas delete that doesn't say how many expense records the person was told stay", async () => {
    const { prisma } = makeDb("kept-unseen");
    await seed(prisma);
    const { "Expense.ventureId": _told, ...withoutKept } = await seenFor(prisma, ["ideas"]);
    expect(_told).toBe(2);
    await expect(deleteData(prisma, { kinds: ["ideas"], seen: withoutKept })).rejects.toThrow(DeleteInputError);
    expect((await countAll(prisma)).Venture).toBe(2);
  });

  it("deletes figures and expense records on their own, and the ideas stay", async () => {
    const { prisma } = makeDb("figures");
    await seed(prisma);
    const before = await countAll(prisma);
    const result = await deleteData(prisma, { kinds: ["figures", "expenses"], seen: await seenFor(prisma, ["figures", "expenses"]) });
    expect(result.status).toBe("deleted");
    expect(await countAll(prisma)).toEqual({ ...before, Figure: 0, Expense: 0 });
  });

  it("deletes nothing when the counts changed since the person looked (an import or an agent added one)", async () => {
    const { prisma } = makeDb("changed");
    const { a } = await seed(prisma);
    const seen = await seenFor(prisma, ["ideas", "statements"]);
    // Something arrives between the page being read and the second "yes".
    await prisma.figure.create({
      data: {
        ventureId: a,
        kind: "gross-revenue",
        periodStart: new Date("2026-07-01T00:00:00Z"),
        periodEnd: new Date("2026-07-31T00:00:00Z"),
        amountCents: BigInt(1),
        sourceKind: "agent",
        sourceLabel: "an agent",
      },
    });
    const before = await countAll(prisma);

    const result = await deleteData(prisma, { kinds: ["ideas", "statements"], seen });
    expect(result.status).toBe("changed");
    if (result.status === "changed") expect(result.counts.Figure).toBe(seen.Figure + 1);
    expect(await countAll(prisma)).toEqual(before);
  });

  it("refuses a request that doesn't say what the person saw", async () => {
    const { prisma } = makeDb("unseen");
    await seed(prisma);
    await expect(deleteData(prisma, { kinds: ["statements"], seen: undefined })).rejects.toThrow(DeleteInputError);
    await expect(deleteData(prisma, { kinds: ["statements"], seen: { PersonStatement: "2" } })).rejects.toThrow(DeleteInputError);
    expect((await countAll(prisma)).PersonStatement).toBe(2);
  });

  it("deletes nothing at all when the database fails part-way (one transaction)", async () => {
    const { prisma } = makeDb("failure");
    await seed(prisma);
    // A real database failure on the second table: statements are emptied first, then settings refuses.
    await prisma.$executeRawUnsafe(`CREATE TRIGGER refuse_setting_delete BEFORE DELETE ON "Setting" BEGIN SELECT RAISE(ABORT, 'refused'); END;`);
    const before = await countAll(prisma);

    await expect(
      deleteData(prisma, { kinds: ["statements", "settings"], seen: await seenFor(prisma, ["statements", "settings"]) }),
    ).rejects.toThrow();
    expect(await countAll(prisma)).toEqual(before);
    expect(before.PersonStatement).toBe(2);
  });
});

describe("the deleted words are gone from the file, not just hidden", () => {
  it("shows the problem is real: a plain delete leaves the words in the file's bytes", async () => {
    const { prisma, folder } = makeDb("plain-delete");
    await seed(prisma);
    await prisma.personStatement.deleteMany();
    await prisma.figure.deleteMany();
    await prisma.expense.deleteMany();
    await prisma.ventureLink.deleteMany();
    await prisma.venture.updateMany({ data: { notes: "" } });
    await prisma.$disconnect();
    expect(markerOnDisk(folder)).toEqual(["dotami.db"]);
  });

  it("after Delete, the marker is nowhere in the data file or beside it, and the file has no free pages", async () => {
    const { prisma, folder } = makeDb("wiped");
    await seed(prisma);
    await prisma.$disconnect();
    expect(markerOnDisk(folder)).toEqual(["dotami.db"]);

    // Expense records stay when ideas are deleted, so their box is ticked too: every marker goes.
    const kinds = ["ideas", "statements", "expenses"];
    const result = await deleteData(prisma, { kinds, seen: await seenFor(prisma, kinds) });
    expect(result.status === "deleted" && result.wiped).toBe(true);
    const free = await prisma.$queryRawUnsafe<{ freelist_count: number | bigint }[]>("PRAGMA freelist_count");
    expect(Number(free[0].freelist_count)).toBe(0);
    await prisma.$disconnect();
    expect(markerOnDisk(folder)).toEqual([]);
    expect(existsSync(path.join(folder, "dotami.db-journal"))).toBe(false);
  });
});

/**
 * Makes the next VACUUM on `prisma` meet a real lock: just before it runs, a second connection
 * starts a write transaction on the same file (what another DotAmi process mid-change looks like).
 * The VACUUM itself is the real one and fails with SQLite's own "database is locked".
 */
function lockBeforeNextWipe(prisma: PrismaClient, url: string) {
  const other = new PrismaClient({ datasourceUrl: url });
  clients.push(other);
  const real = prisma.$executeRawUnsafe.bind(prisma);
  const spy = vi.spyOn(prisma, "$executeRawUnsafe").mockImplementationOnce((async (query: string, ...values: unknown[]) => {
    await other.$executeRawUnsafe("BEGIN IMMEDIATE");
    return real(query, ...values);
  }) as typeof prisma.$executeRawUnsafe);
  return {
    release: async () => {
      spy.mockRestore();
      await other.$executeRawUnsafe("COMMIT");
    },
  };
}

/** Is this statement's text anywhere in the data file's bytes? */
const statementInFile = (folder: string) => readFileSync(path.join(folder, "dotami.db")).includes(Buffer.from(`statement ${MARKER}`));

describe("when the wipe can't run, the rows are still gone and the person is told", () => {
  it("another connection mid-change: the wipe says false instead of throwing, and works once that finishes", async () => {
    const { prisma, url } = makeDb("wipe-locked");
    await seed(prisma);
    await prisma.personStatement.deleteMany();
    const lock = lockBeforeNextWipe(prisma, url);
    expect(await wipeFreeSpace(prisma)).toBe(false);
    await lock.release();
    expect(await wipeFreeSpace(prisma)).toBe(true);
  });

  it("deleteData still deletes, answers wiped: false, and a later wipe finishes the job", async () => {
    const { prisma, url, folder } = makeDb("wipe-owed");
    await seed(prisma);
    const lock = lockBeforeNextWipe(prisma, url);
    const result = await deleteData(prisma, { kinds: ["statements"], seen: await seenFor(prisma, ["statements"]) });
    expect(result).toEqual({ status: "deleted", deleted: { PersonStatement: 2 }, left: { PersonStatement: 0 }, wiped: false });
    await lock.release();
    expect(await prisma.personStatement.count()).toBe(0);
    // This is why the page says the space isn't wiped yet: the deleted words are still in the file.
    await prisma.$disconnect();
    expect(statementInFile(folder)).toBe(true);
    expect(await wipeFreeSpace(prisma)).toBe(true);
    await prisma.$disconnect();
    expect(statementInFile(folder)).toBe(false);
  });

  it("when the file can't be read back after the delete, it says deleted with no count, not 'nothing was deleted'", async () => {
    const { prisma } = makeDb("read-back");
    await seed(prisma);
    // Right after the wipe the table vanishes, so the read-back count fails for real.
    const real = prisma.$executeRawUnsafe.bind(prisma);
    const spy = vi.spyOn(prisma, "$executeRawUnsafe").mockImplementationOnce((async (query: string) => {
      const n = await real(query);
      await real(`ALTER TABLE "PersonStatement" RENAME TO "PersonStatementGone"`);
      return n;
    }) as typeof prisma.$executeRawUnsafe);
    const result = await deleteData(prisma, { kinds: ["statements"], seen: await seenFor(prisma, ["statements"]) });
    spy.mockRestore();
    expect(result).toEqual({ status: "deleted", deleted: { PersonStatement: 2 }, left: null, wiped: true });
  });
});

// ---------------------------------------------------------------------------------------------
// The route: page-only, body read through the shared guard, the right answer for each outcome.

describe("POST /api/your-data/delete", () => {
  type RouteModule = { POST: (request: Request) => Promise<Response> };
  let route: RouteModule;
  let db: ReturnType<typeof makeDb>;
  const previousUrl = process.env.DATABASE_URL;

  beforeAll(async () => {
    db = makeDb("route");
    // The route builds its own client from DATABASE_URL when first imported.
    process.env.DATABASE_URL = db.url;
    route = await import("@/app/api/your-data/delete/route");
    await seed(db.prisma);
  }, 120_000);

  afterAll(async () => {
    await (await import("@/lib/prisma")).prisma.$disconnect();
    if (previousUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = previousUrl;
  });

  afterEach(() => __resetRateLimitStateForTests());

  const post = (body: unknown, headers: Record<string, string> = { "sec-fetch-site": "same-origin" }) =>
    new Request("http://localhost/api/your-data/delete", {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: typeof body === "string" ? body : JSON.stringify(body),
    });

  it("refuses anything that isn't DotAmi's own page (an agent, a script, another site), and deletes nothing", async () => {
    const seen = await seenFor(db.prisma, ["statements"]);
    const callers: Record<string, string>[] = [{}, { "sec-fetch-site": "cross-site" }, { "sec-fetch-site": "none" }, { "sec-fetch-site": "same-site" }];
    for (const headers of callers) {
      const res = await route.POST(post({ kinds: ["statements"], seen }, headers));
      expect(res.status).toBe(403);
      expect(((await res.json()) as { error: string }).error).toMatch(/Only DotAmi's own window/);
    }
    expect(await db.prisma.personStatement.count()).toBe(2);
  });

  it("reads its body through the shared guard: not JSON, or too big, is refused", async () => {
    const notJson = new Request("http://localhost/api/your-data/delete", {
      method: "POST",
      headers: { "content-type": "text/plain", "sec-fetch-site": "same-origin" },
      body: "kinds=statements",
    });
    expect((await route.POST(notJson)).status).toBe(415);
    const big = await route.POST(post({ kinds: ["statements"], pad: "x".repeat(20_000) }));
    expect(big.status).toBe(413);
    expect(await db.prisma.personStatement.count()).toBe(2);
  });

  it("answers 400 for a kind it can't delete, and 409 with fresh counts when something changed", async () => {
    expect((await route.POST(post({ kinds: ["remembered-columns"], seen: {} }))).status).toBe(400);
    const stale = await route.POST(post({ kinds: ["statements"], seen: { PersonStatement: 5 } }));
    expect(stale.status).toBe(409);
    expect(((await stale.json()) as { counts: Record<string, number> }).counts).toEqual({ PersonStatement: 2 });
    expect(await db.prisma.personStatement.count()).toBe(2);
  });

  it("deletes what was ticked and says it is wiped", async () => {
    const res = await route.POST(post({ kinds: ["statements"], seen: await seenFor(db.prisma, ["statements"]) }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "deleted", deleted: { PersonStatement: 2 }, left: { PersonStatement: 0 }, wiped: true });
    expect(await db.prisma.personStatement.count()).toBe(0);
  });

  it("when the wipe meets a lock it still answers 200 'deleted' with wiped: false, and the retry finishes it", async () => {
    const appPrisma = (await import("@/lib/prisma")).prisma;
    const lock = lockBeforeNextWipe(appPrisma, db.url);
    const res = await route.POST(post({ kinds: ["figures"], seen: await seenFor(db.prisma, ["figures"]) }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "deleted", deleted: { Figure: 2 }, left: { Figure: 0 }, wiped: false });
    await lock.release();
    expect(await db.prisma.figure.count()).toBe(0);
    const retry = await route.POST(post({ retryWipe: true }));
    expect(retry.status).toBe(200);
    expect(await retry.json()).toEqual({ wiped: true });
  });

  it("runs the wipe again on its own when asked, from the page only", async () => {
    const res = await route.POST(post({ retryWipe: true }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ wiped: true });
    expect((await route.POST(post({ retryWipe: true }, {}))).status).toBe(403);
  });

  it("“Your receipts” removes every receipt and its file and keeps the records; “Your expense records” takes receipts with them", async () => {
    const { addReceipt } = await import("@/lib/expenses/receipts/store");
    const folder = path.join(db.folder, "receipts");
    const files = () => (existsSync(folder) ? readdirSync(folder).sort() : []);
    const agreed = async () => {
      const e = await unattachedExpense(db.prisma);
      return db.prisma.expense.update({ where: { id: e.id }, data: { status: "confirmed", agreedAt: new Date() } });
    };
    const first = await agreed();
    const second = await agreed();
    const pdfBytes = new Uint8Array(Buffer.from("%PDF-1.4\n% a receipt\n", "latin1"));
    await addReceipt(db.prisma, folder, first.id, pdfBytes);
    await addReceipt(db.prisma, folder, second.id, pdfBytes);
    // The person's own file in the folder is never DotAmi's to delete.
    writeFileSync(path.join(folder, "mine.txt"), "mine");
    expect(files()).toHaveLength(3);
    const expensesBefore = await db.prisma.expense.count();

    const res = await route.POST(post({ kinds: ["receipts"], seen: await seenFor(db.prisma, ["receipts"]) }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      status: "deleted",
      deleted: { Receipt: 2 },
      left: { Receipt: 0 },
      wiped: true,
      receiptFiles: { removed: 2, failed: 0, kept: 0 },
    });
    expect(files()).toEqual(["mine.txt"]);
    expect(await db.prisma.expense.count()).toBe(expensesBefore);

    // Deleting the expense records takes their receipts, rows and files, with them.
    await addReceipt(db.prisma, folder, first.id, pdfBytes);
    expect(files()).toHaveLength(2);
    const kinds = ["expenses"];
    const seen = await seenFor(db.prisma, kinds);
    expect(seen.Receipt).toBe(1);
    const gone = await route.POST(post({ kinds, seen }));
    expect(gone.status).toBe(200);
    expect(((await gone.json()) as { receiptFiles: unknown }).receiptFiles).toEqual({ removed: 1, failed: 0, kept: 0 });
    expect(files()).toEqual(["mine.txt"]);
    expect(await db.prisma.receipt.count()).toBe(0);
  });
});
