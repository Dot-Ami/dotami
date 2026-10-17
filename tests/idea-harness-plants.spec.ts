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
}));

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
import { runIdea } from "./helpers/idea-pipeline";

const idea = (id: string) => IDEAS_V1.find((i) => i.id === id)!;
// An Alberta business written for road 0, a cabinetmaker written for road 1 (which also has known gaps on
// its typed way in, among them a silent fallback), and a British Columbia app.
const ROAD_0_IDEA = idea("idea-v1-0001");
const ROAD_1_IDEA = idea("idea-v1-0046");
const BC_IDEA = idea("idea-v1-0003");

/** The failure keys of one invariant that the plant adds to the idea's own run. */
function addedKeys(target: typeof ROAD_0_IDEA, plant: keyof typeof plants, invariant: InvariantId): string[] {
  const keys = () => new Set(checkRun(runIdea(target, { probeQuestions: false })).filter((f) => f.invariant === invariant).map(gapKey));
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
});

describe("the harness fails on a planted product regression", () => {
  it("a silent fallback on Pick a future: the road the person picked is dropped", () => {
    // Road 0 picked: the cockpit still draws road 0, but as "No future picked", so only the picked way says so.
    expect(addedKeys(ROAD_0_IDEA, "dropPickedRoad", "ends:no-silent-fallback")).toEqual([`${ROAD_0_IDEA.id} · ends:no-silent-fallback · picked`]);
    // Road 1 picked: the typed way's own fallback (a known gap) must not hide the picked way's new one.
    expect(addedKeys(ROAD_1_IDEA, "dropPickedRoad", "ends:no-silent-fallback")).toEqual([`${ROAD_1_IDEA.id} · ends:no-silent-fallback · picked`]);
  });

  it("a job picked for the person by road evaluation's input", () => {
    expect(addedKeys(ROAD_0_IDEA, "deriveJob", "nothing-derived:job")).toEqual([
      `${ROAD_0_IDEA.id} · nothing-derived:job · typed`,
      `${ROAD_0_IDEA.id} · nothing-derived:job · picked`,
    ]);
  });

  it("a place the person didn't pick, set by the intake's scenario builder", () => {
    expect(addedKeys(BC_IDEA, "moveToAlberta", "nothing-derived:place-kept")).toEqual([`${BC_IDEA.id} · nothing-derived:place-kept · `]);
  });
});
