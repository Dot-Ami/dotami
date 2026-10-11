/**
 * The sentence typed on the front door is kept (docs/ui-spec/landing/01-free-text-entry.md § Persistence).
 *
 * Until 2026-10-11 it, and the intake's goal picks, lived only in the browser tab (sessionStorage)
 * and were gone when the tab closed. Now the save that first creates the idea carries them: the
 * sentence becomes one dated statement in the person's own words, linked to the idea; the goals go
 * on the idea. Written once, on that save only, so nothing the person deleted comes back.
 */
import { randomUUID } from "node:crypto";
import { existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import type { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createDatabaseClient } from "@/lib/db/client";
import { ensureVentureFromScenario } from "@/lib/db/ensure-venture-from-scenario";
import { parseFirstSave } from "@/lib/db/parse-scenario-input";
import { listVentures } from "@/lib/db/ventures";
import { applyIntentToDraft } from "@/lib/journey/intent";
import { parseIntentFallback } from "@/lib/journey/intent-fallback";
import { firstSaveFromIntake } from "@/lib/journey/first-save";
import { defaultIntakeDraft } from "@/lib/journey/types";
import { listTypedStatements } from "@/lib/person/statements";
import { STATEMENT_MAX_CHARS } from "@/lib/person/types";
import { recomputeScenarioState, defaultActiveBranches } from "@/lib/scenarios/branches";
import type { Scenario } from "@/lib/scenarios/types";
import { fileUrl, migratedFile } from "./helpers/migrated-db";

// Odd spacing, quotes, an accent and an emoji: "word for word" means all of it comes back.
const SENTENCE = "Sign painting  in Calgary — “hand-lettered” trucks, maybe a café sign or two 🎨";

describe("the intake's first save: what it carries", () => {
  it("keeps the sentence with the day it was typed, from the front door's parse", () => {
    const draft = applyIntentToDraft(defaultIntakeDraft(), parseIntentFallback(SENTENCE), SENTENCE, "2026-10-09");
    expect(draft.manualEntry).toBe(SENTENCE);
    expect(draft.manualEntrySaidAt).toBe("2026-10-09");
  });

  it("carries the sentence word for word and the goal picks, dated the day it was typed", () => {
    const draft = {
      ...applyIntentToDraft(defaultIntakeDraft(), parseIntentFallback(SENTENCE), SENTENCE, "2026-10-09"),
      goals: ["write-offs", "replace-income"] as const,
    };
    expect(firstSaveFromIntake({ ...draft, goals: [...draft.goals] }, "2026-10-11")).toEqual({
      firstWords: { text: SENTENCE, saidAt: "2026-10-09" },
      goals: ["write-offs", "replace-income"],
    });
  });

  it("carries no sentence when none was typed (the intake reached directly), but still the goals", () => {
    expect(firstSaveFromIntake({ ...defaultIntakeDraft(), goals: ["discover-now"] }, "2026-10-11")).toEqual({
      goals: ["discover-now"],
    });
    expect(firstSaveFromIntake({ ...defaultIntakeDraft(), manualEntry: "   " }, "2026-10-11")).toEqual({ goals: [] });
  });
});

describe("the save route's reading of it", () => {
  const NOW = new Date("2026-10-11T18:00:00Z");

  it("reads a sentence and goals, keeping the words exactly", () => {
    expect(parseFirstSave({ scenario: {}, firstWords: { text: SENTENCE, saidAt: "2026-10-11" }, goals: ["write-offs"] }, NOW)).toEqual({
      firstWords: { text: SENTENCE, saidAt: "2026-10-11" },
      goals: ["write-offs"],
    });
  });

  it("is empty for the cockpit's own saves, which send neither", () => {
    expect(parseFirstSave({ scenario: {} }, NOW)).toEqual({});
  });

  it("drops a sentence it can't keep whole or honestly dated, and goals it doesn't know", () => {
    const tooLong = "a".repeat(STATEMENT_MAX_CHARS + 1);
    expect(parseFirstSave({ firstWords: { text: tooLong, saidAt: "2026-10-11" } }, NOW)).toEqual({});
    expect(parseFirstSave({ firstWords: { text: "   ", saidAt: "2026-10-11" } }, NOW)).toEqual({});
    expect(parseFirstSave({ firstWords: { text: SENTENCE, saidAt: "2026-10-20" } }, NOW)).toEqual({});
    expect(parseFirstSave({ firstWords: { text: SENTENCE, saidAt: "yesterday" } }, NOW)).toEqual({});
    expect(parseFirstSave({ goals: ["write-offs", "be-rich", 7, "write-offs"] }, NOW)).toEqual({ goals: ["write-offs"] });
  });
});

describe("saved with the idea (SQLite)", () => {
  const dbFile = path.join(tmpdir(), `dotami-first-words-${randomUUID()}.db`);
  let prisma: PrismaClient;

  beforeAll(() => {
    migratedFile(dbFile);
    prisma = createDatabaseClient({ url: fileUrl(dbFile) });
  }, 120_000);

  afterAll(async () => {
    await prisma?.$disconnect();
    for (const f of [dbFile, `${dbFile}-journal`]) if (existsSync(f)) rmSync(f);
  });

  beforeEach(async () => {
    await prisma.personStatement.deleteMany();
    await prisma.venture.deleteMany();
  });

  function idea(id = randomUUID()): Scenario {
    return {
      id,
      profile: {
        name: "Invented — first words",
        type: "service",
        province: "AB",
        targetRevenueY1: 0,
        targetRevenueY3: 0,
        structure: "sole-prop",
        structureSource: "assumed",
        employmentStatus: "self-employed",
        hireFirst: false,
        activityTags: ["Trades"],
        stage: "idea",
      },
      state: recomputeScenarioState(defaultActiveBranches),
    };
  }

  const FIRST = { firstWords: { text: SENTENCE, saidAt: "2026-10-09" }, goals: ["write-offs", "replace-income"] as string[] };

  it("keeps the sentence as one dated statement linked to the idea, and the goals on the idea", async () => {
    const { ventureId } = await ensureVentureFromScenario(prisma, idea(), FIRST);

    const rows = await prisma.personStatement.findMany();
    expect(rows).toHaveLength(1);
    expect(rows[0].text).toBe(SENTENCE);
    expect(rows[0].saidAt.toISOString()).toBe("2026-10-09T00:00:00.000Z");
    expect(rows[0].ventureId).toBe(ventureId);

    const [listed] = await listVentures(prisma);
    expect(listed.firstWords).toEqual({ text: SENTENCE, saidAt: "2026-10-09" });
    expect(listed.goals).toEqual(["write-offs", "replace-income"]);
    // ...and it is one of the person's statements, like every other.
    expect((await listTypedStatements(prisma)).map((s) => s.text)).toEqual([SENTENCE]);
  });

  it("writes it once: later saves of the same idea, with or without it, add nothing and change no goal", async () => {
    const scenario = idea();
    await ensureVentureFromScenario(prisma, scenario, FIRST);
    await ensureVentureFromScenario(prisma, scenario); // the cockpit's autosave
    await ensureVentureFromScenario(prisma, scenario, { firstWords: { text: "something else", saidAt: "2026-10-10" }, goals: ["discover-now"] });

    expect((await prisma.personStatement.findMany()).map((r) => r.text)).toEqual([SENTENCE]);
    expect((await listVentures(prisma))[0].goals).toEqual(["write-offs", "replace-income"]);
  });

  it("never brings back a sentence the person deleted with “Your statements”", async () => {
    const scenario = idea();
    await ensureVentureFromScenario(prisma, scenario, FIRST);
    await prisma.personStatement.deleteMany();
    await ensureVentureFromScenario(prisma, scenario, FIRST);
    expect(await prisma.personStatement.count()).toBe(0);
    expect((await listVentures(prisma))[0].firstWords).toBeNull();
  });

  it("an idea saved without a sentence has none, and an empty goal list", async () => {
    await ensureVentureFromScenario(prisma, idea());
    const [listed] = await listVentures(prisma);
    expect(listed.firstWords).toBeNull();
    expect(listed.goals).toEqual([]);
  });

  it("deleting the idea keeps the sentence among the person's statements, tied to no idea", async () => {
    const { ventureId } = await ensureVentureFromScenario(prisma, idea(), FIRST);
    await prisma.venture.delete({ where: { id: ventureId } });
    const rows = await prisma.personStatement.findMany();
    expect(rows.map((r) => [r.text, r.ventureId])).toEqual([[SENTENCE, null]]);
  });
});
