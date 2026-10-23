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
  /**
   * The first save drops the road the person opened on step 3 (the save carries no road id). Since 2026-10-22 both
   * ways in add the road through the three steps' save (`withTheSteps`), so the plant sits there.
   */
  dropPickedRoad: false,
  /** Step 3 lists the roads written for the person's pick of job last, after the others. */
  writtenLast: false,
  /** Road evaluation's input picks a job for the person (the cabinetmakers' list) though they picked none. */
  deriveJob: false,
  /** The intake's scenario builder puts every idea in Alberta, whatever place the person answered. */
  moveToAlberta: false,
  /** *Next on your road* shows nothing, whatever is left on the road. */
  emptyNext: false,
  /** "I'd incorporate at" keeps nothing: the cockpit's save of it leaves the idea as it was. */
  dropIncorporateAt: false,
  /**
   * Step 1's search finds nothing for any words (the PR #202 review's plant): only a typed code still finds its
   * job. The person types words, never a code, so they can't find their job.
   */
  wordsFindNothing: false,
  /** The card of a road written for another place no longer says "You said <province>." (call 35's first label). */
  dropYouSaid: false,
  /** The cockpit's line calls an Alberta road the person's future outside Alberta (call 35's second label gone). */
  futureForAnyPlace: false,
}));

vi.mock("@/lib/front-door/words", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/lib/front-door/words")>();
  return {
    ...real,
    pickWords: { ...real.pickWords, youSaid: (name: string) => (plants.dropYouSaid ? "" : real.pickWords.youSaid(name)) },
  };
});

vi.mock("@/lib/cockpit/road-line", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/lib/cockpit/road-line")>();
  const { cockpitWords } = await import("@/lib/cockpit/words");
  return {
    ...real,
    goalRoadLine: (...args: Parameters<typeof real.goalRoadLine>) =>
      plants.futureForAnyPlace ? cockpitWords.goal.future(args[0].label) : real.goalRoadLine(...args),
  };
});

vi.mock("@/lib/engines/oasis/v2026/title-search", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/lib/engines/oasis/v2026/title-search")>();
  return {
    ...real,
    searchJobTitles: (...args: Parameters<typeof real.searchJobTitles>) => {
      const search = real.searchJobTitles(...args);
      const aCode = /^\d/.test(args[0].trim());
      return plants.wordsFindNothing && !aCode ? { ...search, state: "no-match" as const, groups: [], total: 0 } : search;
    },
  };
});

vi.mock("@/lib/scenarios/branches", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/lib/scenarios/branches")>();
  return {
    ...real,
    setIncorporateAt: (...args: Parameters<typeof real.setIncorporateAt>) => (plants.dropIncorporateAt ? args[0] : real.setIncorporateAt(...args)),
  };
});

vi.mock("@/lib/journey/first-save", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/lib/journey/first-save")>();
  return {
    ...real,
    withTheSteps: (...args: Parameters<typeof real.withTheSteps>) => {
      const save = real.withTheSteps(...args);
      if (!plants.dropPickedRoad) return save;
      const { roadId: _dropped, ...rest } = save;
      return rest;
    },
  };
});

vi.mock("@/lib/front-door/road-match", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/lib/front-door/road-match")>();
  return {
    ...real,
    roadMatch: (...args: Parameters<typeof real.roadMatch>) => {
      const match = real.roadMatch(...args);
      // The two lists swapped: the other roads listed under "Written for your pick of job", the written one after.
      return plants.writtenLast && match.case === "written" ? { ...match, forJob: match.others, others: match.forJob } : match;
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

import { KNOWN_GAPS, type KnownGap } from "./fixtures/ideas/known-gaps";
import { IDEAS_V1 } from "./fixtures/ideas/v1";
import { runHarness } from "./helpers/idea-harness-run";
import { checkRun, gapKey, type InvariantId } from "./helpers/idea-invariants";
import { pickedChoice, runIdea, stepsChoice } from "./helpers/idea-pipeline";

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
  plants.writtenLast = false;
  plants.deriveJob = false;
  plants.moveToAlberta = false;
  plants.emptyNext = false;
  plants.dropIncorporateAt = false;
  plants.wordsFindNothing = false;
  plants.dropYouSaid = false;
  plants.futureForAnyPlace = false;
});

describe("the harness fails on a planted product regression", () => {
  it("a silent fallback on Pick a future: the road the person opened on step 3 is dropped", () => {
    // Since 2026-10-22 both ways in end on the three steps, so dropping the road is a fallback on both: road 0
    // still drawn, but as "No future picked", and road 1 not drawn at all.
    for (const target of [ROAD_0_IDEA, ROAD_1_IDEA]) {
      expect(addedKeys(target, "dropPickedRoad", "ends:no-silent-fallback")).toEqual([
        `${target.id} · ends:no-silent-fallback · typed`,
        `${target.id} · ends:no-silent-fallback · picked`,
      ]);
    }
  });

  it("a silent fallback on every click Pick a future offers, written for the idea or not", () => {
    // Step 3 lists Alberta's two roads in Alberta; outside Alberta the federal steps first and Alberta's two folded
    // (task 28d); and "Not here yet?" opens road 0 in Alberta and the federal steps elsewhere (call 33 of
    // 2026-10-22): a card after Skip, a card and the note for a job with no written road. The typed way opens the
    // card the page shows first for the place for each.
    const clicks = [
      [idea("idea-v1-0006"), { by: "card", roadId: "road-starting-any-business-ab" }], // Alberta, skipped
      [idea("idea-v1-0003"), { by: "card", roadId: "road-federal-steps-ca" }], // British Columbia, an app
      [idea("idea-v1-0361"), { by: "card", roadId: "road-apprentice-to-own-shop-ab" }], // Ontario, folded, skipped
      [idea("idea-v1-0022"), { by: "card", roadId: "road-starting-any-business-ab" }], // Ontario, folded, no road for the job
      [idea("idea-v1-0178"), { by: "card", roadId: "road-apprentice-to-own-shop-ab" }], // Alberta, closing a store
      [idea("idea-v1-0008"), { by: "not-here", roadId: "road-starting-any-business-ab" }], // Alberta, a career
      [idea("idea-v1-0188"), { by: "not-here", roadId: "road-federal-steps-ca" }], // Newfoundland, closing a shop
    ] as const;
    for (const [target, click] of clicks) {
      expect(pickedChoice(target)).toEqual(click);
      expect(addedKeys(target, "dropPickedRoad", "ends:no-silent-fallback")).toEqual([
        `${target.id} · ends:no-silent-fallback · typed`,
        `${target.id} · ends:no-silent-fallback · picked`,
      ]);
    }
  });

  it("an Alberta future picked from outside Alberta is honest only while both labels say so (call 35)", () => {
    // Ontario: a job with no road of its own, the fold opened, road 0's card clicked; and a skipped job, road 1's.
    for (const target of [idea("idea-v1-0022"), idea("idea-v1-0361")]) {
      const key = `${target.id} · ends:road-written-for-place · picked`;
      expect(checkRun(runIdea(target, { probeQuestions: false })).map(gapKey)).not.toContain(key);
      expect(addedKeys(target, "dropYouSaid", "ends:road-written-for-place")).toEqual([key]);
      expect(addedKeys(target, "futureForAnyPlace", "ends:road-written-for-place")).toEqual([key]);
    }
  });

  it("a silent fallback listed as a known gap still fails the harness (call 32)", () => {
    plants.dropPickedRoad = true;
    const listed: KnownGap = { invariant: "ends:no-silent-fallback", subject: "picked", kind: "bug", story: "planted", why: "planted", ideas: [1] };
    const { unlisted } = runHarness([ROAD_0_IDEA], [...KNOWN_GAPS, listed]);
    expect(unlisted.map(gapKey)).toContain(`${ROAD_0_IDEA.id} · ends:no-silent-fallback · picked`);
  });

  it("the road written for the person's pick of job listed after the others on step 3 (task 29h)", () => {
    // The cabinetmaker picked Cabinetmakers, 72311.00: road 1 is written for it and must come first, both ways in.
    expect(stepsChoice(ROAD_1_IDEA, "picked")).toMatchObject({ job: { code: "72311.00" }, match: "written" });
    expect(addedKeys(ROAD_1_IDEA, "writtenLast", "ends:no-silent-fallback")).toEqual([
      `${ROAD_1_IDEA.id} · ends:no-silent-fallback · typed › step 3`,
      `${ROAD_1_IDEA.id} · ends:no-silent-fallback · picked › step 3`,
    ]);
  });

  it("a job search that can't find the person's job from their words (step 1 is played through the search)", () => {
    // Unplanted, the cabinetmaker types the kind of work and finds Cabinetmakers in the group shown open.
    expect(stepsChoice(ROAD_1_IDEA, "picked").search).toEqual({
      typed: ROAD_1_IDEA.work,
      by: "work",
      group: "all",
      groupOpen: true,
      groupTotal: expect.any(Number),
    });
    plants.wordsFindNothing = true;
    // Planted, neither the work's words nor the job's own name lists it: the run stops, naming the job, on both
    // ways in, as a person who can't find their job can't pick it.
    expect(() => stepsChoice(ROAD_1_IDEA, "picked")).toThrow(/72311\.00/);
    expect(() => stepsChoice(ROAD_1_IDEA, "typed")).toThrow(/72311\.00/);
    expect(() => runIdea(ROAD_1_IDEA)).toThrow(/72311\.00/);
    // An idea that names no job skips step 1, so the plant changes nothing for it.
    expect(() => runIdea(ROAD_0_IDEA)).not.toThrow();
  });

  it("a job picked for the person by road evaluation's input", () => {
    // A person who skipped the job question, and a plumber who picked another job (72300.00): the cabinetmakers'
    // list in either cockpit is a job the person didn't pick (task 29h: "a job the person didn't pick still fails").
    for (const target of [ROAD_0_IDEA, Y3_IDEA]) {
      expect(addedKeys(target, "deriveJob", "nothing-derived:job")).toEqual([
        `${target.id} · nothing-derived:job · typed`,
        `${target.id} · nothing-derived:job · picked`,
      ]);
    }
    // The cabinetmaker picked that very job, so the same list is theirs: nothing is added.
    expect(addedKeys(ROAD_1_IDEA, "deriveJob", "nothing-derived:job")).toEqual([]);
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
