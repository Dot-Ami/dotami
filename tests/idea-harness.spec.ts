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

import { JOB_SEARCH_GROUP_CAP } from "@/lib/engines/oasis/v2026/title-search";

import { KNOWN_GAPS, NEVER_A_KNOWN_GAP, type KnownGap } from "./fixtures/ideas/known-gaps";
import { IDEAS_V1 } from "./fixtures/ideas/v1";
import { coverageReport } from "./helpers/idea-coverage-report";
import { ideaId, listableGaps, runHarness, silentFallbackProblems, threadCpuMs } from "./helpers/idea-harness-run";
import { gapKey, INVARIANTS, type Failure } from "./helpers/idea-invariants";

/**
 * The harness's own time budget (the plan of 2026-10-17: under 60 seconds in vitest), held on the CPU time the run
 * itself takes (`threadCpuMs`), not the wall clock: the same run under the full parallel unit run took 60.5 s and
 * 65.7 s of wall clock on the joined batch-4 tree while it takes about 30 s alone, so the wall clock measured the
 * machine's other work, and the budget failed on runs that did no more. The work the budget is about is still
 * held to it, and every idea still runs twice.
 */
const BUDGET_MS = 60_000;

describe("the harness's time budget counts the run's own work, not the time it waits", () => {
  it("counts a busy loop and not a wait", () => {
    // The control: a clock that counts nothing would pass any run, and the wall clock counts the wait too.
    // Busy until the clock has counted 200 ms of work, given up to 10 s of wall clock: under a loaded machine the
    // thread gets less than all of each second, so a busy second can count less than a second, but it counts.
    const busyFrom = threadCpuMs();
    const giveUpAt = performance.now() + 10_000;
    while (threadCpuMs() - busyFrom < 200 && performance.now() < giveUpAt) Math.sqrt(Math.random());
    const busy = threadCpuMs() - busyFrom;
    const waitFrom = threadCpuMs();
    const wallFrom = performance.now();
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 300);
    const waited = threadCpuMs() - waitFrom;
    expect(busy).toBeGreaterThanOrEqual(200);
    // The wall clock counted the wait; the CPU clock didn't.
    expect(performance.now() - wallFrom).toBeGreaterThanOrEqual(290);
    expect(waited).toBeLessThan(100);
  });
});

describe("call 32: no idea lands on a future not written for it with nothing on screen saying so", () => {
  it("the known gaps never list a silent fallback, so the ratchet can't let one through", () => {
    expect(silentFallbackProblems([], KNOWN_GAPS)).toEqual([]);
  });

  it("fails on a planted known gap and on a planted silent fallback (controls)", () => {
    const planted: Failure = {
      ideaId: ideaId(1),
      invariant: "ends:no-silent-fallback",
      subject: "picked",
      detail: "picked: drawn on road-starting-any-business-ab as no future picked, but the road the person picked is road-apprentice-to-own-shop-ab, and nothing says so",
    };
    const plantedGap = { invariant: planted.invariant, subject: planted.subject, kind: "bug" as const, story: "a plant", why: "a plant", ideas: [1] };
    expect(silentFallbackProblems([planted], [])).toEqual([`${gapKey(planted)}: ${planted.detail}`]);
    // Listed as a known gap, the ratchet would let it through (it isn't "unlisted"); the gate still fails, twice.
    expect(silentFallbackProblems([planted], [plantedGap])).toHaveLength(2);
    // Any other invariant is the ratchet's business, not this gate's.
    expect(silentFallbackProblems([{ ...planted, invariant: "no-verdict" }], [])).toEqual([]);
  });
});

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

  it("never lists a silent fallback as a known gap, so the harness fails on any one (the maintainer's call 32)", () => {
    expect(NEVER_A_KNOWN_GAP).toEqual(["ends:no-silent-fallback"]);
    expect(KNOWN_GAPS.filter((gap) => NEVER_A_KNOWN_GAP.includes(gap.invariant)).map((gap) => gap.invariant)).toEqual([]);
    // Planted: a list naming a silent fallback has it taken out, so the run counts the failure as unlisted.
    const planted: KnownGap = { invariant: "ends:no-silent-fallback", subject: "typed", kind: "bug", story: "planted", why: "planted", ideas: [1] };
    expect(listableGaps([...KNOWN_GAPS, planted])).toEqual([...KNOWN_GAPS]);
    // The run itself: tests/idea-harness-plants.spec.ts plants a silent fallback and lists it, and the run still fails.
  });

  it(
    "runs every idea through today's pipeline: every failure is a known gap, and every known gap still fails",
    () => {
      // Each idea runs twice: invariant 7, a second run of the same idea gives the same output, word for word
      // (tests/helpers/idea-harness-run.ts, the one run the quality report counts from too).
      const cpuFrom = threadCpuMs();
      const { runs, failures, elapsedMs, unlisted, passingNow } = runHarness(IDEAS_V1, KNOWN_GAPS);
      const cpuMs = threadCpuMs() - cpuFrom;
      const report = coverageReport({ runs, failures, gaps: KNOWN_GAPS, elapsedMs });
      const out = path.join(process.cwd(), "test-results");
      mkdirSync(out, { recursive: true });
      writeFileSync(path.join(out, "idea-coverage.md"), report);

      // A new failure: one the known gaps don't name. Fix it, or (a planned story, or a bug the maintainer
      // is told about) list it in known-gaps.ts with its story.
      expect(unlisted.map((f) => `${gapKey(f)}: ${f.detail}`)).toEqual([]);
      // Call 32: no idea is drawn on a road not written for it, or not the one the person picked, with nothing saying so.
      expect(failures.filter((f) => f.invariant === "ends:no-silent-fallback").map((f) => `${gapKey(f)}: ${f.detail}`)).toEqual([]);
      // A gap that passes now: take it off the list, so it can never come back unseen.
      expect(passingNow).toEqual([]);
      // Call 32: a silent fallback fails here even when a known gap lists it (the count must stay 0).
      expect(silentFallbackProblems(failures, KNOWN_GAPS)).toEqual([]);
      expect(Math.round(cpuMs), `the run's own work, in ms (wall clock ${Math.round(elapsedMs)} ms)`).toBeLessThan(BUDGET_MS);
      // The report is for a person to read beside the screen, so it says the job search's cap as the screen has
      // it: since whole words first (a-call-11) each part of a group lists its first 50, so a group can list 100.
      expect(report).toContain(`as listed: each part's first ${JOB_SEARCH_GROUP_CAP}, and a group without parts its first ${JOB_SEARCH_GROUP_CAP})`);
      expect(report).not.toContain("of each group");
    },
    // vitest's own limit is wider than the budget, so a slow run fails on the budget's line, with its time.
    BUDGET_MS * 3,
  );
});
