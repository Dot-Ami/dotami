/**
 * The cockpit screen, part 2, after review (2026-10-12): what "What you've told DotAmi" says must be what
 * the person said and what the save kept, read back from a real data file, not what the screen hoped.
 *
 * - The intake's equipment chip is off by default, so an idea made there holds no answer about buying
 *   equipment; only the person's own Yes or No in the one-question box is one, and Take back removes it.
 * - A pick of the map's default side (in the box, or with This is mine) is the person's pick and is kept
 *   with the map, so a reload still lists it.
 * - The save answers with the idea as it kept it, which the page builds a receipt's "after" from.
 * - Compare is worked out without the what-if; ticks keep no day; "This visit" is named for what it holds.
 *
 * The database cases run the save route's own handler on a throwaway migrated file and read the idea back
 * the way the cockpit's loader does, as tests/cockpit-routes.spec.ts runs the cockpit's routes.
 */
import { randomUUID } from "node:crypto";
import { existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import type { PrismaClient } from "@prisma/client";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { CompareEndings } from "@/components/cockpit/compare-endings";
import { ReceiptLines } from "@/components/cockpit/receipt-lines";
import { ToldList } from "@/components/cockpit/told-list";
import { WhatIfBar } from "@/components/cockpit/what-if-bar";
import { __resetRateLimitStateForTests } from "@/lib/api/rate-limit";
import { compareEndings, notToldYet, toldRows, type KeptAnswers } from "@/lib/cockpit/told";
import { cockpitWords } from "@/lib/cockpit/words";
import { createDatabaseClient } from "@/lib/db/client";
import { loadVentureScenarioById } from "@/lib/db/ventures";
import { generalRoadV2026 } from "@/lib/engines/roads/v2026";
import { defaultIntakeDraft } from "@/lib/journey/types";
import { evaluateRoad, withoutIdeaAnswer, type RoadEvaluationInput } from "@/lib/roads";
import { branchDecisions, defaultActiveBranches, updateScenarioBranch } from "@/lib/scenarios/branches";
import { buildScenarioFromIntake } from "@/lib/scenarios/build-scenario-from-intake";
import { isBranchDecided } from "@/lib/scenarios/graph";
import type { Scenario } from "@/lib/scenarios/types";

import { fileUrl, migratedFile } from "./helpers/migrated-db";
import { input } from "./helpers/road-to-evaluate";

const dbFile = path.join(tmpdir(), `dotami-cockpit-told-kept-${randomUUID()}.db`);
const previousUrl = process.env.DATABASE_URL;
let prisma: PrismaClient;
let saveRoute: (request: Request) => Promise<Response>;

beforeAll(async () => {
  migratedFile(dbFile);
  // The route builds its own client from DATABASE_URL when first imported.
  process.env.DATABASE_URL = fileUrl(dbFile);
  prisma = createDatabaseClient({ url: fileUrl(dbFile) });
  saveRoute = (await import("@/app/api/scenario/save/route")).POST;
}, 120_000);

afterAll(async () => {
  await prisma?.$disconnect();
  // The route's own client also holds the file open; Windows won't delete it until it lets go.
  await (await import("@/lib/prisma")).prisma.$disconnect();
  if (previousUrl === undefined) delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL = previousUrl;
  for (const f of [dbFile, `${dbFile}-journal`]) if (existsSync(f)) rmSync(f);
});

afterEach(() => __resetRateLimitStateForTests());

/** The cockpit's save: the scenario as JSON, through the route, the way `saveScenario` sends it. */
async function save(scenario: Scenario): Promise<{ ventureId: string; body: Record<string, unknown> }> {
  const res = await saveRoute(
    new Request("http://localhost/api/scenario/save", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ scenario }),
    }),
  );
  expect(res.status).toBe(200);
  const body = (await res.json()) as Record<string, unknown>;
  return { ventureId: body.ventureId as string, body };
}

/** Saved, then read back the way the cockpit loads an idea after a reload. */
async function saveAndReload(scenario: Scenario): Promise<Scenario> {
  const { ventureId } = await save(scenario);
  const back = await loadVentureScenarioById(prisma, ventureId);
  expect(back).not.toBeNull();
  return back!;
}

const keptNone: KeptAnswers = { progress: [], skillMarks: [], forkPickedOn: {}, targetMonthSetOn: null, figures: [], incomeWantedOn: null };

/** Road 0 as the cockpit draws an idea on it: its map picks are the future's fork picks. */
function road0(scenario: Scenario): RoadEvaluationInput {
  return {
    ...input({ road: generalRoadV2026, roadChosen: false, skillItems: [], scenario }),
    forkPicks: Object.fromEntries(
      generalRoadV2026.forks.flatMap((f) =>
        f.sides.includes(scenario.state.activeBranches[f.id]) ? [[f.id, { stepId: scenario.state.activeBranches[f.id], from: "map" as const }]] : [],
      ),
    ),
  };
}

const told = (scenario: Scenario) => {
  const i = road0(scenario);
  const e = evaluateRoad(i);
  return { rows: toldRows(i, e, keptNone), notTold: notToldYet(i, e) };
};

/** An idea as the intake builds it, every chip as the intake starts it. */
function fromIntake(id: string, change: { capitalPurchasePlanned?: boolean } = {}): Scenario {
  const draft = defaultIntakeDraft();
  return buildScenarioFromIntake(
    {
      name: "Invented (test only)",
      type: draft.ventureType,
      targetRevenueY1: 0,
      targetRevenueY3: 0,
      province: "AB",
      hireFirst: false,
      employmentStatus: "employee",
      activityTags: [],
      capitalPurchasePlanned: draft.capitalPurchasePlanned,
      ...change,
    },
    `${id}-${randomUUID()}`,
  );
}

describe("buying equipment: only the person's own answer is one", () => {
  it("an idea made on the intake with the chip never touched holds no answer, before and after the save", async () => {
    const fresh = fromIntake("equipment-untouched");
    for (const idea of [fresh, await saveAndReload(fresh)]) {
      const { rows, notTold } = told(idea);
      expect(rows.map((r) => r.id)).not.toContain("idea:equipment");
      expect(rows.map((r) => r.said).join(" ")).not.toMatch(/not buying equipment/);
      expect(notTold.map((q) => q.id)).toContain("equipment");
    }
  });

  it("the chip switched on is a yes, kept", async () => {
    const back = await saveAndReload(fromIntake("equipment-chip-on", { capitalPurchasePlanned: true }));
    expect(back.profile.capitalPurchasePlanned).toBe(true);
    expect(told(back).rows.find((r) => r.id === "idea:equipment")?.said).toBe("You told us you're buying equipment, a vehicle or tools");
  });

  it("No in the box is kept as the person's no, and Take back really removes it", async () => {
    const fresh = fromIntake("equipment-box-no");
    const no = await saveAndReload({ ...fresh, profile: { ...fresh.profile, capitalPurchasePlanned: false } });
    expect(no.profile.capitalPurchasePlanned).toBe(false);
    expect(told(no).rows.find((r) => r.id === "idea:equipment")?.said).toBe("You told us you're not buying equipment, a vehicle or tools");
    expect(told(no).notTold.map((q) => q.id)).not.toContain("equipment");

    const back = await saveAndReload(withoutIdeaAnswer(no, "idea:equipment")!);
    expect(back.profile.capitalPurchasePlanned).toBeUndefined();
    expect(told(back).rows.map((r) => r.id)).not.toContain("idea:equipment");
    expect(told(back).notTold.map((q) => q.id)).toContain("equipment");
  });
});

describe("a pick of the map's default side is the person's, and is kept", () => {
  for (const decision of branchDecisions) {
    it(`${decision.label}: picked on the default side, it is still the person's pick after a reload, and Take back clears it`, async () => {
      const fresh = fromIntake(`default-side-${decision.id}`);
      const picked = updateScenarioBranch(fresh, decision.id, defaultActiveBranches[decision.id]);
      const back = await saveAndReload(picked);
      expect(isBranchDecided(decision.id, back.state)).toBe(true);
      const { rows, notTold } = told(back);
      expect(rows.map((r) => r.id)).toContain(`map-pick:${decision.id}`);
      expect(notTold.map((q) => q.id)).not.toContain(`map-pick:${decision.id}`);
      expect(compareEndings(road0(back), decision.id)!.picked).toEqual({ stepId: defaultActiveBranches[decision.id], byPerson: true });

      const taken = await saveAndReload(withoutIdeaAnswer(back, `map-pick:${decision.id}`)!);
      expect(isBranchDecided(decision.id, taken.state)).toBe(false);
      expect(told(taken).notTold.map((q) => q.id)).toContain(`map-pick:${decision.id}`);
    });
  }

  it("the other fork's state and the person's own number are untouched by keeping a pick", async () => {
    const fresh = fromIntake("default-side-both");
    const picked = { ...updateScenarioBranch(fresh, "gstTiming", defaultActiveBranches.gstTiming) };
    picked.state = { ...picked.state, incorporateAt: 90_000 };
    const back = await saveAndReload(picked);
    expect(isBranchDecided("incorporationTiming", back.state)).toBe(false);
    expect(back.state.incorporateAt).toBe(90_000);
    expect(back.state.activeBranches).toEqual(defaultActiveBranches);
  });
});

describe("the save answers with the idea as it kept it", () => {
  it("the scenario in the answer is the one a reload reads back", async () => {
    const fresh = fromIntake("save-answers");
    const sent = updateScenarioBranch({ ...fresh, profile: { ...fresh.profile, capitalPurchasePlanned: false } }, "gstTiming", defaultActiveBranches.gstTiming);
    const { ventureId, body } = await save(sent);
    expect(body.scenario).toEqual(JSON.parse(JSON.stringify(await loadVentureScenarioById(prisma, ventureId))));
  });
});

describe("Compare, ticks, This visit and the rail", () => {
  const idea = fromIntake("compare");

  it("Compare is worked out without the what-if, which never changes with the ending", () => {
    for (const fork of generalRoadV2026.forks) {
      const plain = compareEndings(road0(idea), fork.id)!;
      const tried = compareEndings({ ...road0(idea), whatIf: { firstYearSalesDollars: 60_000 } }, fork.id)!;
      expect(tried.rows).toEqual(plain.rows);
    }
  });

  it("on today's road each side also carries the map toggle's own short name", () => {
    const view = compareEndings(road0(idea), "gstTiming")!;
    const decision = branchDecisions.find((d) => d.id === "gstTiming")!;
    expect(view.sides.map((s) => s.toggleLabel)).toEqual(decision.options.map((o) => o.label));
    const html = renderToStaticMarkup(
      createElement(CompareEndings, { view, forks: [], canSave: true, error: null, receipt: null, onPickFork: () => undefined, onThisIsMine: () => undefined, onClose: () => undefined }),
    );
    for (const option of decision.options) expect(html).toContain(cockpitWords.compare.onTheMap(option.label).replace(/'/g, "&#x27;"));
  });

  it("when no row differs between the two endings, Compare says so", () => {
    const view = compareEndings(road0(idea), "gstTiming")!;
    expect(view.rows.every((r) => r.values[0] === r.values[1])).toBe(true);
    expect(view.sameOnEveryRow).toBe(true);
    const html = renderToStaticMarkup(
      createElement(CompareEndings, { view, forks: [], canSave: true, error: null, receipt: null, onPickFork: () => undefined, onThisIsMine: () => undefined, onClose: () => undefined }),
    );
    expect(html).toContain(cockpitWords.compare.noRowDiffers);
  });

  it("each This is mine names its side, so a screen reader can tell the two apart", () => {
    const view = compareEndings(road0(idea), "gstTiming")!;
    const html = renderToStaticMarkup(
      createElement(CompareEndings, { view, forks: [], canSave: true, error: null, receipt: null, onPickFork: () => undefined, onThisIsMine: () => undefined, onClose: () => undefined }),
    );
    const names = [...html.matchAll(/aria-label="(This is mine[^"]*)"/g)].map((m) => m[1]);
    expect(names).toEqual(view.sides.map((s) => cockpitWords.compare.thisIsMineFor(s.label)));
  });

  it("ticks keep no day of their own, so their row says the day isn't kept rather than borrow one", () => {
    const i = input({ progress: [{ stepId: "step-eval-train", status: "done", doneWhenIds: ["dw-eval-train-1"] }] });
    const kept: KeptAnswers = {
      ...keptNone,
      progress: [{ stepId: "step-eval-train", changes: [{ at: "2026-10-05T15:00:00.000Z", status: "done" }], updatedAt: "2026-10-05T15:00:00.000Z" }],
    };
    const rows = toldRows(i, evaluateRoad(i), kept);
    expect(rows.find((r) => r.id === "ticks:step-eval-train")?.day).toBeNull();
    // The status keeps its own day.
    expect(rows.find((r) => r.id === "step:step-eval-train")?.day).not.toBeNull();
  });

  it("this visit's receipt lines are named This visit, show the newest one, and fold the rest", () => {
    const html = renderToStaticMarkup(
      createElement(WhatIfBar, { whatIf: null, receipt: null, sinceLastTime: ["Newest line.", "Older line.", "Oldest line."], onTry: () => undefined, onKeep: () => undefined, onClear: () => undefined }),
    );
    expect(html).toContain(cockpitWords.receipts.thisVisit);
    expect(html).not.toContain("Since last time");
    expect(html).toContain("Newest line.");
    expect(html).not.toContain("Older line.");
    expect(html).toContain(cockpitWords.receipts.moreThisVisit(2));
  });

  it("a sales target of nothing reads not given in the rail, never $0", () => {
    expect(cockpitWords.rail.salesTarget(0)).toBe("not given");
    expect(cockpitWords.rail.salesTarget(120_000)).toBe("$120,000");
  });
});

describe("receipts while the save is on its way, and after it", () => {
  const idea = fromIntake("receipts");

  it("a receipt waiting on the save says so, and one whose save failed says it wasn't kept", () => {
    const saving = renderToStaticMarkup(createElement(ReceiptLines, { lines: [], status: "saving" }));
    expect(saving).toContain(cockpitWords.receipts.saving);
    expect(saving).not.toContain("Saved.");
    const failed = renderToStaticMarkup(createElement(ReceiptLines, { lines: [], status: "failed" }));
    // The markup escapes the apostrophe in "didn't".
    expect(failed).toContain(cockpitWords.receipts.notSaved.replace(/'/g, "&#x27;"));
    expect(failed).not.toContain("Saved.");
  });

  it("a receipt can take focus, so the page can move a keyboard user to it", () => {
    expect(renderToStaticMarkup(createElement(ReceiptLines, { lines: ["A line."] }))).toContain('tabindex="-1"');
  });

  it("a take back that changes nothing on the road says what was taken back", () => {
    const html = renderToStaticMarkup(createElement(ReceiptLines, { lines: [], empty: cockpitWords.receipts.nothingAfter("you took back your date") }));
    expect(html).toContain("Saved: you took back your date. Nothing on the road changed.");
  });

  it("each row's buttons in the told list name their row", () => {
    const withAnswers = updateScenarioBranch({ ...idea, profile: { ...idea.profile, targetRevenueY3: 120_000, capitalPurchasePlanned: false } }, "gstTiming", defaultActiveBranches.gstTiming);
    const { rows, notTold } = told(withAnswers);
    const html = renderToStaticMarkup(
      createElement(ToldList, {
        rows,
        notTold,
        receipt: null,
        canSave: true,
        error: null,
        onChange: () => undefined,
        onTakeBack: () => undefined,
        onAnswer: () => undefined,
        boxFor: () => null,
      }),
    );
    const names = [...html.matchAll(/<button[^>]*aria-label="([^"]*)"/g)].map((m) => m[1]);
    // Every Change, Take back, Answer and I don't know names its row; no two buttons share a name.
    expect(names.length).toBeGreaterThan(8);
    expect(new Set(names).size).toBe(names.length);
    const sales = rows.find((r) => r.id === "idea:sales-year-3")!;
    expect(names).toContain(cockpitWords.told.takeBackFor(sales.said));
  });

  it("each told row carries the words of its own take back", () => {
    const withSales = { ...idea, profile: { ...idea.profile, targetRevenueY3: 120_000 } };
    const sales = told(withSales).rows.find((r) => r.id === "idea:sales-year-3")!;
    expect(sales.takenBack).toMatch(/^you took back/);
  });
});
