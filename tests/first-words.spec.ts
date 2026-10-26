/**
 * The sentence typed on the front door is kept (docs/ui-spec/landing/01-free-text-entry.md § Persistence).
 *
 * Until 2026-10-11 it, and the intake's goal picks, lived only in the browser tab (sessionStorage)
 * and were gone when the tab closed. Now the save that first creates the idea carries them: the
 * sentence becomes one dated statement in the person's own words, linked to the idea; the goals go
 * on the idea. Written once per sentence typed: only by the save that creates an idea, and only until
 * a save has kept it or the person has deleted their statements, so nothing they deleted comes back.
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
import { afterFirstSave, afterStatementsDeleted, firstSaveFromIntake } from "@/lib/journey/first-save";
import { defaultIntakeDraft, type IntakeGoalId } from "@/lib/journey/types";
import { listTypedStatements } from "@/lib/person/statements";
import { STATEMENT_MAX_CHARS, statementSourceLabel, type PersonStatement } from "@/lib/person/types";
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

// Review of 2026-10-11: every "Open my map" makes a new idea (a new scenario id), so "written only when
// the save creates the idea" let one tab write the same sentence again on each re-open, and bring back
// a sentence the person had deleted. Now it goes once per sentence typed: after a save that kept it, or
// after the person deleted their statements, the tab's draft never carries it again.
describe("one tab, many ideas: the sentence goes once", () => {
  const typed = () => applyIntentToDraft(defaultIntakeDraft(), parseIntentFallback(SENTENCE), SENTENCE, "2026-10-09");

  it("is not carried again once a save kept it (the next “Open my map” makes a new idea)", () => {
    const draft = typed();
    const sent = firstSaveFromIntake(draft, "2026-10-11");
    expect(sent.firstWords?.text).toBe(SENTENCE);
    const next = afterFirstSave(draft, sent, { ok: true });
    expect(firstSaveFromIntake(next, "2026-10-11").firstWords).toBeUndefined();
    // The sentence itself stays on the page after a save: the intake still shows what was typed.
    expect(next.manualEntry).toBe(SENTENCE);
  });

  it("is carried again when the save failed, so a retry can still keep it", () => {
    const draft = typed();
    const sent = firstSaveFromIntake(draft, "2026-10-11");
    expect(firstSaveFromIntake(afterFirstSave(draft, sent, { ok: false }), "2026-10-11").firstWords?.text).toBe(SENTENCE);
  });

  it("is never carried after the person deleted their statements, even if no save had kept it yet", () => {
    expect(firstSaveFromIntake(afterStatementsDeleted(typed()), "2026-10-11").firstWords).toBeUndefined();
  });

  it("Delete → Your statements takes the sentence from the window's memory too, and keeps the picks made from it", () => {
    const draft = typed();
    // What the sentence put in the draft: the words, their copy, and the parse's reading of them.
    expect(draft.description).toBe(SENTENCE);
    expect(draft.intentParse?.rawLabel).toBeTruthy();
    const after = afterStatementsDeleted(draft);
    expect(after.manualEntry).toBeUndefined();
    expect(after.manualEntrySaidAt).toBeUndefined();
    expect(after.description).toBe("");
    expect(after.intentParse).toBeNull();
    expect(JSON.stringify(after)).not.toContain(SENTENCE);
    // What was confirmed from it is a pick for the idea, deleted with "Your ideas", not with the statements.
    expect(after.activityTags).toEqual(draft.activityTags);
    expect(after.goals).toEqual(draft.goals);
    expect(after.ventureType).toBe(draft.ventureType);
  });

  it("a new sentence typed afterwards is carried with the next idea", () => {
    const settled = afterStatementsDeleted(typed());
    const retyped = applyIntentToDraft(settled, parseIntentFallback("A mobile welding rig"), "A mobile welding rig", "2026-10-11");
    expect(firstSaveFromIntake(retyped, "2026-10-11").firstWords).toEqual({ text: "A mobile welding rig", saidAt: "2026-10-11" });
  });
});

describe("how a statement says where it was typed", () => {
  const base: PersonStatement = { id: "x", text: "t", saidAt: "2026-10-11", source: "typed", sourceRef: "app" };

  it("names the idea a front-door sentence was typed for, instead of “typed here”", () => {
    expect(statementSourceLabel({ ...base, idea: { id: "v1", name: "Sign shop" } })).toBe("typed for your idea “Sign shop”");
  });

  it("says only “typed in DotAmi” when no idea is linked (typed on About you, or its idea was deleted)", () => {
    expect(statementSourceLabel(base)).toBe("typed in DotAmi");
  });

  it("keeps the vault tag (a statement that couldn't be saved is never listed since 2026-10-24: it stays in its box)", () => {
    expect(statementSourceLabel({ ...base, source: "vault", sourceRef: "notes/a.md" })).toBe("vault · notes/a.md");
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

  const FIRST = { firstWords: { text: SENTENCE, saidAt: "2026-10-09" }, goals: ["write-offs", "replace-income"] as IntakeGoalId[] };

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

  // What the intake's "Open my map" does, from one tab's draft: a new idea each time (new scenario id),
  // the first-save extras read from the draft, and the draft updated from the save's answer.
  async function openMap(draft: ReturnType<typeof applyIntentToDraft>) {
    const sent = firstSaveFromIntake(draft, "2026-10-11");
    await ensureVentureFromScenario(prisma, idea(), sent);
    return afterFirstSave(draft, sent, { ok: true });
  }

  it("two “Open my map” from one tab keep the sentence once, not once per idea", async () => {
    let draft = applyIntentToDraft(defaultIntakeDraft(), parseIntentFallback(SENTENCE), SENTENCE, "2026-10-09");
    draft = await openMap(draft);
    draft = await openMap(draft); // "Edit venture profile" → the intake again → "Open my map"
    expect((await prisma.personStatement.findMany()).map((r) => r.text)).toEqual([SENTENCE]);
    expect(await prisma.venture.count()).toBe(2);
  });

  it("a sentence deleted with “Your statements” doesn't come back from the next “Open my map” in the same tab", async () => {
    let draft = applyIntentToDraft(defaultIntakeDraft(), parseIntentFallback(SENTENCE), SENTENCE, "2026-10-09");
    draft = await openMap(draft);
    // Delete → Your statements (lib/privacy/delete.ts removes every row); the Delete menu settles the tab too.
    await prisma.personStatement.deleteMany();
    draft = afterStatementsDeleted(draft);
    await openMap(draft);
    expect(await prisma.personStatement.count()).toBe(0);
  });

  it("lists a front-door sentence with the idea it was typed for, and with none once the idea is deleted", async () => {
    const scenario = idea();
    const { ventureId } = await ensureVentureFromScenario(prisma, scenario, FIRST);
    expect((await listTypedStatements(prisma)).map((s) => s.idea)).toEqual([{ id: ventureId, name: scenario.profile.name }]);
    await prisma.venture.delete({ where: { id: ventureId } });
    expect((await listTypedStatements(prisma)).map((s) => s.idea)).toEqual([undefined]);
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
