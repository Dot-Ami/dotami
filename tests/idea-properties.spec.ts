/**
 * Property tests over the whole answer space (S2.5.29d): thousands of generated answer sets through road
 * evaluation, *Not told yet*, the receipts and *Your plan*, held to the corpus harness's invariants and to the
 * properties only a generated space can check (tests/helpers/idea-properties.ts says which).
 *
 * The seed: fixed by default, so CI and a fresh checkout run exactly the same cases and a failure can be
 * rerun by anyone. `IDEA_PROPERTIES_SEED=random npm test -- idea-properties` runs a new seed (printed at the
 * start, so a failure can be pinned), and `IDEA_PROPERTIES_SEED=<number>` reruns that one. A failure prints
 * the seed, the path and the smallest counterexample fast-check shrank it to (the generated answers, with the
 * road by its id), with the property's own list of what went wrong (CONTRIBUTING.md, "The property tests").
 * The run count per property is sized to keep the whole file under about 20 seconds on CI's machines.
 */
import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { generalRoadV2026 } from "@/lib/engines/roads/v2026";

import {
  assertFiguresPathReached,
  DEFAULT_SIDE,
  figuresPathCount,
  generatedArb,
  generatedWithAnswer,
  generatedWithQuote,
  giveAnswer,
  PROPERTIES,
  revenueDollars,
  toInput,
} from "./helpers/idea-properties";

/** The seed every run uses unless asked otherwise: the day the properties were written. */
const FIXED_SEED = 20261017;

function seedFromEnv(): { seed: number; how: string } {
  const asked = process.env.IDEA_PROPERTIES_SEED?.trim();
  if (!asked) return { seed: FIXED_SEED, how: "fixed; IDEA_PROPERTIES_SEED=random for a new one" };
  if (asked === "random") return { seed: Date.now() % 2 ** 31, how: "random, from the clock" };
  const n = Number(asked);
  if (!Number.isSafeInteger(n)) throw new Error(`IDEA_PROPERTIES_SEED must be "random" or a whole number, not “${asked}”`);
  return { seed: n, how: "IDEA_PROPERTIES_SEED" };
}

const { seed, how } = seedFromEnv();
// Straight to the terminal, not through console: vitest shows a passing file's console output nowhere, and a
// random seed that passed is worth knowing too (to pin it, or to say which cases ran).
process.stdout.write(`idea-properties: seed ${seed} (${how})\n`);

/** One property run: a generated value, the property's list of problems, which must be empty. */
function check<T>(name: keyof typeof PROPERTIES, arb: fc.Arbitrary<T>, run: (value: T) => string[], numRuns: number) {
  it(
    `${name} (${numRuns} runs)`,
    () => {
      fc.assert(
        fc.property(arb, (value) => {
          const problems = run(value);
          // The property's own words, thrown as the error, go into fast-check's report under the counterexample.
          if (problems.length > 0) throw new Error(`${name}:\n  ${problems.join("\n  ")}`);
        }),
        // The property's own words inline in the report (fast-check 4 puts them only in the error's cause otherwise).
        { seed, numRuns, includeErrorInReport: true },
      );
    },
    // Room for fast-check to shrink a failure to its smallest case: a shrink step costs about what a run does.
    300_000,
  );
}

describe("the generated answer space reaches what it must", () => {
  it("covers both sides of each map fork, every province, every structure, the GST line's three numbers, both roads, both ways in, and blank and $0 savings", () => {
    const inputs = fc.sample(generatedArb({ ownZero: true }), { seed, numRuns: 300 }).map(toInput);
    const picks = new Set(inputs.flatMap((i) => Object.entries(i.scenario.state.activeBranches).map(([fork, side]) => `${fork}:${side}`)));
    for (const [fork, side] of Object.entries(DEFAULT_SIDE)) {
      expect(picks.has(`${fork}:${side}`), `${fork} on its default`).toBe(true);
      const other = generalRoadV2026.forks.find((f) => f.id === fork)!.sides.find((s) => s !== side)!;
      expect(picks.has(`${fork}:${other}`), `${fork} on the other side`).toBe(true);
    }
    expect(new Set(inputs.map((i) => i.scenario.profile.province)).size).toBe(13);
    expect(new Set(inputs.map((i) => `${i.scenario.profile.structure}/${i.scenario.profile.structureSource}`)).size).toBe(3);
    const savings = inputs.map((i) => i.agreed.savingsCents);
    expect(savings).toContain(null);
    expect(savings).toContain(0);
    expect(savings.some((s) => s !== null && s > 0)).toBe(true);
    const revenues = new Set(fc.sample(revenueDollars, { seed, numRuns: 100 }));
    for (const edge of [0, 29_999, 30_000, 30_001]) expect(revenues.has(edge), `first-year sales of ${edge}`).toBe(true);
    expect(inputs.some((i) => i.road.id === generalRoadV2026.id) && inputs.some((i) => i.road.id !== generalRoadV2026.id)).toBe(true);
    expect(inputs.some((i) => (i.scenario.profile.notSaid ?? []).length > 0) && inputs.some((i) => !(i.scenario.profile.notSaid ?? []).length)).toBe(true);
    expect(inputs.some((i) => i.scenario.state.incorporateAt != null && i.scenario.profile.targetRevenueY3 > 0)).toBe(true);
    expect(inputs.some((i) => i.scenario.state.incorporateAt != null && i.scenario.profile.targetRevenueY3 === 0)).toBe(true);
  });
});

/**
 * The run counts, one place: the properties below and the figures coverage check read the same numbers. Lowered
 * by about two fifths when the generated figures began reaching the rules (each run then reads them, in every
 * counterfactual of the sweep too), to keep the file near ten seconds.
 */
const RUNS = {
  holdsTheInvariants: 60,
  takingAnAnswerBackRestores: 180,
  aQuoteNeverRaisesNotPriced: 60,
  aBlankIsNeverZero: 75,
  sameInputSameOutput: 50,
  theSweepIsConsistent: 50,
  theLineIsExceededNotReached: 300,
  theFiguresBeatTheEstimate: 200,
} as const satisfies Record<keyof typeof PROPERTIES, number>;

describe("every generated answer set", () => {
  check("holdsTheInvariants", generatedArb(), (g) => PROPERTIES.holdsTheInvariants(toInput(g)), RUNS.holdsTheInvariants);
  check("takingAnAnswerBackRestores", generatedWithAnswer, ({ generated, answer }) => PROPERTIES.takingAnAnswerBackRestores(giveAnswer(generated, answer)), RUNS.takingAnAnswerBackRestores);
  check("aQuoteNeverRaisesNotPriced", generatedWithQuote, ({ generated, quote }) => PROPERTIES.aQuoteNeverRaisesNotPriced(toInput(generated), quote), RUNS.aQuoteNeverRaisesNotPriced);
  check("aBlankIsNeverZero", generatedArb({ ownZero: true }), (g) => PROPERTIES.aBlankIsNeverZero(toInput(g)), RUNS.aBlankIsNeverZero);
  check("sameInputSameOutput", generatedArb({ ownZero: true }), (g) => PROPERTIES.sameInputSameOutput(toInput(g)), RUNS.sameInputSameOutput);
  check("theSweepIsConsistent", generatedArb({ ownZero: true }), (g) => PROPERTIES.theSweepIsConsistent(toInput(g)), RUNS.theSweepIsConsistent);
  check("theLineIsExceededNotReached", generatedArb({ ownZero: true }), (g) => PROPERTIES.theLineIsExceededNotReached(toInput(g)), RUNS.theLineIsExceededNotReached);
  check("theFiguresBeatTheEstimate", generatedArb({ ownZero: true }), (g) => PROPERTIES.theFiguresBeatTheEstimate(toInput(g)), RUNS.theFiguresBeatTheEstimate);
});

/**
 * The coverage check (the review of PR #187): a property that reads the figures passes trivially if no
 * generated figure ever reaches the rules, as none did before (0 of 780 runs). With the same seed and run
 * count fast-check gives the property, `fc.sample` gives the same sets, so each count below is the number of
 * that property's own runs in which the person's figures decided the GST/HST card; a count of 0 fails.
 */
describe("the person's own figures beat the estimate in a share of every property's runs", () => {
  type Way = [fc.Arbitrary<unknown>, (value: unknown) => ReturnType<typeof toInput>];
  const way = <T,>(arb: fc.Arbitrary<T>, inputOf: (value: T) => ReturnType<typeof toInput>): Way => [arb, inputOf as Way[1]];
  const ways: Partial<Record<keyof typeof PROPERTIES, Way>> = {
    holdsTheInvariants: way(generatedArb(), toInput),
    takingAnAnswerBackRestores: way(generatedWithAnswer, ({ generated, answer }) => giveAnswer(generated, answer).after),
    aQuoteNeverRaisesNotPriced: way(generatedWithQuote, ({ generated }) => toInput(generated)),
    aBlankIsNeverZero: way(generatedArb({ ownZero: true }), toInput),
    sameInputSameOutput: way(generatedArb({ ownZero: true }), toInput),
    theSweepIsConsistent: way(generatedArb({ ownZero: true }), toInput),
    theFiguresBeatTheEstimate: way(generatedArb({ ownZero: true }), toInput),
  };
  for (const [name, [arb, inputOf]] of Object.entries(ways) as [keyof typeof PROPERTIES, Way][]) {
    it(`${name}: some runs have the figures decide`, () => {
      const count = figuresPathCount(arb, inputOf, { seed, numRuns: RUNS[name] });
      process.stdout.write(`idea-properties: ${name}, the figures decide in ${count.reached} of ${count.runs} runs\n`);
      assertFiguresPathReached(name, count);
    });
  }

  it("the control: figures that start on the 2nd of a month never reach the rules, and the check fails", () => {
    const params = { seed, numRuns: RUNS.theFiguresBeatTheEstimate };
    const broken = figuresPathCount(generatedArb({ ownZero: true, figureShapeBroken: true }), toInput, params);
    expect(broken).toEqual({ reached: 0, runs: params.numRuns });
    expect(() => assertFiguresPathReached("the control", broken)).toThrow(`the control: 0 of ${params.numRuns} generated runs had the person's own figures decide the GST/HST card`);
    // The same seed with the shape the read counts does reach it: the drop to 0 is the broken shape's.
    expect(figuresPathCount(generatedArb({ ownZero: true }), toInput, params).reached).toBeGreaterThan(0);
  });
});
