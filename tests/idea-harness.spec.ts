/**
 * The idea harness (S2.5.29b): every idea in the corpus (tests/fixtures/ideas/v1.ts) through the pipeline a
 * person's words take today (tests/helpers/idea-pipeline.ts), checked against the invariants
 * (tests/helpers/idea-invariants.ts): no verdict, no $0 for a blank, every amount cited or the person's own,
 * no times, every path ends somewhere honest, nothing derived, the same input giving the same output.
 *
 * It is the gate every new road and screen passes (docs/engines/roads.md, CONTRIBUTING.md). It fails on any
 * failure the known-gaps list (tests/fixtures/ideas/known-gaps.ts) doesn't name, and on any gap it names
 * that now passes, so the list only shrinks. Each run writes test-results/idea-coverage.md.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { KNOWN_GAPS } from "./fixtures/ideas/known-gaps";
import { IDEAS_V1 } from "./fixtures/ideas/v1";
import { coverageReport } from "./helpers/idea-coverage-report";
import { ideaId, runHarness } from "./helpers/idea-harness-run";
import { gapKey, INVARIANTS } from "./helpers/idea-invariants";

/** The harness's own time budget (the plan of 2026-10-17: under 60 seconds in vitest). */
const BUDGET_MS = 60_000;

describe("the idea harness", () => {
  it("keeps every known gap to an idea, an invariant and a story, once each", () => {
    const ids = new Set(IDEAS_V1.map((idea) => idea.id));
    const problems = KNOWN_GAPS.flatMap((gap) => [
      ...(INVARIANTS.includes(gap.invariant) ? [] : [`no invariant “${gap.invariant}”`]),
      ...(gap.story.trim() && gap.why.trim() ? [] : [`${gap.invariant} ${gap.subject}: no story or why`]),
      ...gap.ideas.filter((n) => !ids.has(ideaId(n))).map((n) => `${gap.invariant} ${gap.subject}: no idea ${ideaId(n)}`),
    ]);
    const keys = KNOWN_GAPS.flatMap((gap) => gap.ideas.map((n) => gapKey({ ideaId: ideaId(n), invariant: gap.invariant, subject: gap.subject })));
    expect(problems).toEqual([]);
    expect(keys.filter((key, i) => keys.indexOf(key) !== i)).toEqual([]);
  });

  it(
    "runs every idea through today's pipeline: every failure is a known gap, and every known gap still fails",
    () => {
      // Each idea runs twice: invariant 7, a second run of the same idea gives the same output, word for word
      // (tests/helpers/idea-harness-run.ts, the one run the quality report counts from too).
      const { runs, failures, elapsedMs, unlisted, passingNow } = runHarness(IDEAS_V1, KNOWN_GAPS);
      const report = coverageReport({ runs, failures, gaps: KNOWN_GAPS, elapsedMs });
      const out = path.join(process.cwd(), "test-results");
      mkdirSync(out, { recursive: true });
      writeFileSync(path.join(out, "idea-coverage.md"), report);

      // A new failure: one the known gaps don't name. Fix it, or (a planned story, or a bug the maintainer
      // is told about) list it in known-gaps.ts with its story.
      expect(unlisted.map((f) => `${gapKey(f)}: ${f.detail}`)).toEqual([]);
      // A gap that passes now: take it off the list, so it can never come back unseen.
      expect(passingNow).toEqual([]);
      expect(Math.round(elapsedMs)).toBeLessThan(BUDGET_MS);
    },
    // vitest's own limit is wider than the budget, so a slow run fails on the budget's line, with its time.
    BUDGET_MS * 3,
  );
});
