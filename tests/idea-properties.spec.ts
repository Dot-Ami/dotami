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

import { DEFAULT_SIDE, generatedArb, generatedWithAnswer, generatedWithQuote, giveAnswer, PROPERTIES, revenueDollars, toInput } from "./helpers/idea-properties";

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

describe("every generated answer set", () => {
  check("holdsTheInvariants", generatedArb(), (g) => PROPERTIES.holdsTheInvariants(toInput(g)), 100);
  check("takingAnAnswerBackRestores", generatedWithAnswer, ({ generated, answer }) => PROPERTIES.takingAnAnswerBackRestores(giveAnswer(generated, answer)), 300);
  check("aQuoteNeverRaisesNotPriced", generatedWithQuote, ({ generated, quote }) => PROPERTIES.aQuoteNeverRaisesNotPriced(toInput(generated), quote), 100);
  check("aBlankIsNeverZero", generatedArb({ ownZero: true }), (g) => PROPERTIES.aBlankIsNeverZero(toInput(g)), 120);
  check("sameInputSameOutput", generatedArb({ ownZero: true }), (g) => PROPERTIES.sameInputSameOutput(toInput(g)), 80);
  check("theSweepIsConsistent", generatedArb({ ownZero: true }), (g) => PROPERTIES.theSweepIsConsistent(toInput(g)), 80);
  check("theLineIsExceededNotReached", generatedArb({ ownZero: true }), (g) => PROPERTIES.theLineIsExceededNotReached(toInput(g)), 300);
});
