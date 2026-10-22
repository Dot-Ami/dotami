/**
 * The idea harness fails when the product goes wrong, not only when a run is edited after the fact
 * (S2.5.29b's controls, the plan's Verification: "a planted control must make the harness fail").
 * tests/idea-invariants.spec.ts plants failures into a finished run; here the plant is in the app's own
 * code, swapped in through vi.mock for one test at a time, and the harness runs the idea for real.
 *
 * Each control counts the failure keys (idea · invariant · subject) the plant adds to the same idea's run
 * without it. A key, not a count: a new failure that shares its key with a known gap would pass the gate,
 * so it must not share one.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

const plants = vi.hoisted(() => ({
  /** Pick a future's first save drops the road the person picked (the save carries no road id). */
  dropPickedRoad: false,
  /** Road evaluation's input picks a job for the person (the cabinetmakers' list) though they picked none. */
  deriveJob: false,
  /** The intake's scenario builder puts every idea in Alberta, whatever place the person answered. */
  moveToAlberta: false,
  /** *Next on your road* shows nothing, whatever is left on the road. */
  emptyNext: false,
  /** "I'd incorporate at" keeps nothing: the cockpit's save of it leaves the idea as it was. */
  dropIncorporateAt: false,
}));

vi.mock("@/lib/scenarios/branches", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/lib/scenarios/branches")>();
  return {
    ...real,
    setIncorporateAt: (...args: Parameters<typeof real.setIncorporateAt>) => (plants.dropIncorporateAt ? args[0] : real.setIncorporateAt(...args)),
  };
});

vi.mock("@/lib/front-door/start-future", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/lib/front-door/start-future")>();
  return {
    ...real,
    firstSaveForPickedFuture: (...args: Parameters<typeof real.firstSaveForPickedFuture>) => {
      const save = real.firstSaveForPickedFuture(...args);
      if (!plants.dropPickedRoad) return save;
      const { roadId: _dropped, ...rest } = save;
      return rest;
    },
  };
});

vi.mock("@/lib/cockpit/view", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/lib/cockpit/view")>();
  const { oasisListForJob } = await import("@/lib/engines/oasis/v2026");
  return {
    ...real,
    cockpitInput: (args: Parameters<typeof real.cockpitInput>[0]) =>
      real.cockpitInput(plants.deriveJob ? { ...args, job: oasisListForJob("72311.00") } : args),
    nextOnYourRoad: (...args: Parameters<typeof real.nextOnYourRoad>) => (plants.emptyNext ? [] : real.nextOnYourRoad(...args)),
  };
});

vi.mock("@/lib/scenarios/build-scenario-from-intake", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/lib/scenarios/build-scenario-from-intake")>();
  return {
    ...real,
    buildScenarioFromIntake: (...args: Parameters<typeof real.buildScenarioFromIntake>) => {
      const [intake, ...rest] = args;
      return real.buildScenarioFromIntake(plants.moveToAlberta ? { ...intake, province: "AB" } : intake, ...rest);
    },
  };
});

import { IDEAS_V1 } from "./fixtures/ideas/v1";
import { checkRun, gapKey, type InvariantId } from "./helpers/idea-invariants";
import { pickedChoice, runIdea } from "./helpers/idea-pipeline";

const idea = (id: string) => IDEAS_V1.find((i) => i.id === id)!;
// An Alberta business written for road 0, a cabinetmaker written for road 1 (which also has known gaps on
// its typed way in, among them a silent fallback), and a British Columbia app.
const ROAD_0_IDEA = idea("idea-v1-0001");
const ROAD_1_IDEA = idea("idea-v1-0046");
const BC_IDEA = idea("idea-v1-0003");
// An Alberta plumber on road 0 who typed a Year 3 number into the intake.
const Y3_IDEA = idea("idea-v1-0051");

/** The failure keys of one invariant that the plant adds to the idea's own run. */
function addedKeys(target: typeof ROAD_0_IDEA, plant: keyof typeof plants, invariant: InvariantId, probeQuestions = false): string[] {
  const keys = () => new Set(checkRun(runIdea(target, { probeQuestions })).filter((f) => f.invariant === invariant).map(gapKey));
  const before = keys();
  plants[plant] = true;
  const after = keys();
  plants[plant] = false;
  return [...after].filter((key) => !before.has(key));
}

afterEach(() => {
  plants.dropPickedRoad = false;
  plants.deriveJob = false;
  plants.moveToAlberta = false;
  plants.emptyNext = false;
  plants.dropIncorporateAt = false;
});

describe("the harness fails on a planted product regression", () => {
  it("a silent fallback on Pick a future: the road the person picked is dropped", () => {
    // Road 0 picked: the cockpit still draws road 0, but as "No future picked", so only the picked way says so.
    expect(addedKeys(ROAD_0_IDEA, "dropPickedRoad", "ends:no-silent-fallback")).toEqual([`${ROAD_0_IDEA.id} · ends:no-silent-fallback · picked`]);
    // Road 1 picked: the typed way's own fallback (a known gap) must not hide the picked way's new one.
    expect(addedKeys(ROAD_1_IDEA, "dropPickedRoad", "ends:no-silent-fallback")).toEqual([`${ROAD_1_IDEA.id} · ends:no-silent-fallback · picked`]);
  });

  it("a silent fallback on every click Pick a future offers, written for the idea or not", () => {
    // Pick a future lists both roads for any place in Canada, and "Not here yet?" opens road 0 anywhere.
    const clicks = [
      [idea("idea-v1-0003"), { by: "card", roadId: "road-starting-any-business-ab" }], // British Columbia
      [idea("idea-v1-0004"), { by: "card", roadId: "road-apprentice-to-own-shop-ab" }], // Ontario, a bakery
      [idea("idea-v1-0008"), { by: "not-here", roadId: "road-starting-any-business-ab" }], // Alberta, a career
    ] as const;
    for (const [target, click] of clicks) {
      expect(pickedChoice(target)).toEqual(click);
      expect(addedKeys(target, "dropPickedRoad", "ends:no-silent-fallback")).toEqual([`${target.id} · ends:no-silent-fallback · picked`]);
    }
  });

  it("a job picked for the person by road evaluation's input", () => {
    expect(addedKeys(ROAD_0_IDEA, "deriveJob", "nothing-derived:job")).toEqual([
      `${ROAD_0_IDEA.id} · nothing-derived:job · typed`,
      `${ROAD_0_IDEA.id} · nothing-derived:job · picked`,
    ]);
  });

  it("Next on your road left empty while the road isn't done", () => {
    // *Not told yet* always asks something after the fixed answers, so the check answers every question
    // it asks first: with nothing left to ask, the road must show a next step or be done.
    expect(addedKeys(ROAD_0_IDEA, "emptyNext", "ends:next-question-or-done", true)).toEqual([
      `${ROAD_0_IDEA.id} · ends:next-question-or-done · typed › after every question`,
      `${ROAD_0_IDEA.id} · ends:next-question-or-done · picked › after every question`,
    ]);
    expect(addedKeys(ROAD_1_IDEA, "emptyNext", "ends:next-question-or-done", true)).toEqual([
      `${ROAD_1_IDEA.id} · ends:next-question-or-done · typed › after every question`,
      `${ROAD_1_IDEA.id} · ends:next-question-or-done · picked › after every question`,
    ]);
  });

  it("“I'd incorporate at” broken for a person who gave a Year 3 number", () => {
    // The plumber gave the intake's Year 3 box a number, so on the typed way the answer lights the step. On
    // the picked way, since the Incorporating fix (2026-10-21), the cockpit asks for the third-year estimate
    // first and "I'd incorporate at" after it; with that answer broken, the estimate opens a question no answer
    // of which changes anything, so the picked way fails too, on the question it asks.
    expect(addedKeys(Y3_IDEA, "dropIncorporateAt", "ends:questions-change-something", true)).toEqual([
      `${Y3_IDEA.id} · ends:questions-change-something · typed › incorporate-at`,
      `${Y3_IDEA.id} · ends:questions-change-something · picked › sales-year-3`,
    ]);
  });

  it("a place the person didn't pick, set by the intake's scenario builder", () => {
    expect(addedKeys(BC_IDEA, "moveToAlberta", "nothing-derived:place-kept")).toEqual([`${BC_IDEA.id} · nothing-derived:place-kept · `]);
  });
});
