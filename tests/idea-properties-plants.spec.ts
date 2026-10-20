/**
 * The property tests fail when the product goes wrong (S2.5.29d's control, the plan's Verification: "a planted
 * control must make the harness fail"). The plant is in the app's own code, swapped in through vi.mock for one
 * test: taking an answer back (`withoutAnswer`) that gives the input back unchanged, so nothing is restored.
 * The property must then fail, and its report must carry the seed and the counterexample a developer needs.
 */
import fc from "fast-check";
import { afterEach, describe, expect, it, vi } from "vitest";

const plants = vi.hoisted(() => ({
  /** `withoutAnswer` keeps the answer: the run "without" it is the run with it. */
  keepTheAnswer: false,
}));

vi.mock("@/lib/roads/without-answer", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/lib/roads/without-answer")>();
  return {
    ...real,
    withoutAnswer: (...args: Parameters<typeof real.withoutAnswer>) => (plants.keepTheAnswer ? args[0] : real.withoutAnswer(...args)),
  };
});

import { generatedWithAnswer, giveAnswer, PROPERTIES } from "./helpers/idea-properties";

const SEED = 20261017;

afterEach(() => {
  plants.keepTheAnswer = false;
});

describe("the property tests fail on a planted product regression", () => {
  it("taking an answer back that restores nothing: the property fails, naming the seed and a counterexample", () => {
    const property = fc.property(generatedWithAnswer, ({ generated, answer }) => {
      const problems = PROPERTIES.takingAnAnswerBackRestores(giveAnswer(generated, answer));
      if (problems.length > 0) throw new Error(problems.join("\n"));
    });
    // Without the plant the same cases pass (so the failure below is the plant's).
    const params = { seed: SEED, numRuns: 20, includeErrorInReport: true };
    expect(() => fc.assert(property, params)).not.toThrow();

    plants.keepTheAnswer = true;
    let report = "";
    try {
      fc.assert(property, params);
    } catch (error) {
      report = error instanceof Error ? error.message : String(error);
    }
    expect(report, "the plant was not caught").not.toBe("");
    // fast-check's report: the seed and path to rerun it, the shrunk counterexample, then the property's words.
    expect(report).toContain(`seed: ${SEED}`);
    expect(report).toMatch(/path: "[\d:]+"/);
    expect(report).toContain("Counterexample:");
    expect(report).toMatch(/the run after taking it back differs at character \d+/);
    // The counterexample is the generated answers, with the road by its id, not the road's catalog entry.
    expect(report).toMatch(/"roadId":"road-/);
    expect(report).not.toContain('"columns":[');
  });
});
