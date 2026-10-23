import { KNOWN_GAPS, type KnownGap } from "../fixtures/ideas/known-gaps";
import { IDEAS_V1, type Idea } from "../fixtures/ideas/v1";
import { checkRun, gapKey, sameOutput, type Failure } from "./idea-invariants";
import { runDigest, runIdea, type IdeaRun } from "./idea-pipeline";

/** An idea's permanent id from its number in the known-gaps list (idea-v1-0001 is 1). */
export const ideaId = (n: number) => `idea-v1-${String(n).padStart(4, "0")}`;

/**
 * The CPU time this thread has spent so far, in milliseconds: the work it did, not the time it waited. The idea
 * harness's time budget is held on this (tests/idea-harness.spec.ts): under the full parallel unit run every test
 * file shares the machine's cores, so the wall clock of the same run grows with whatever else runs beside it (on
 * the joined batch-4 tree, 29.5 s alone and 60.5 s, then 65.7 s, under the full run), while the work stays the
 * same. `process.threadCpuUsage` (Node 23.9 and later; CI runs Node 24) counts this thread only; on an older Node
 * the process's own count stands in, which a test file run in its own process (vitest's default) keeps to itself.
 */
export function threadCpuMs(): number {
  const usage = typeof process.threadCpuUsage === "function" ? process.threadCpuUsage() : process.cpuUsage();
  return (usage.user + usage.system) / 1000;
}

/**
 * Call 32 (the maintainer's, 2026-10-22): an idea that lands on a future not written for it, with nothing on screen
 * saying so, fails the tests, whatever the known-gaps list says. The ratchet (`unlisted`, `passingNow`) lets a
 * listed failure through; a silent fallback is never one that may be listed. One line per problem: each silent
 * fallback a run found, and each known gap that would let one through. Empty means the count is 0.
 */
export function silentFallbackProblems(failures: readonly Failure[], gaps: readonly KnownGap[] = KNOWN_GAPS): string[] {
  return [
    ...gaps
      .filter((gap) => gap.invariant === "ends:no-silent-fallback")
      .map((gap) => `the known gaps list ${gap.ideas.length} silent fallback${gap.ideas.length === 1 ? "" : "s"} (“${gap.subject}”): a silent fallback can't be a known gap`),
    ...failures.filter((f) => f.invariant === "ends:no-silent-fallback").map((f) => `${gapKey(f)}: ${f.detail}`),
  ];
}

/** The gap keys a known-gaps list names. */
export const knownGapKeys = (gaps: readonly KnownGap[]) =>
  new Set(gaps.flatMap((gap) => gap.ideas.map((n) => gapKey({ ideaId: ideaId(n), invariant: gap.invariant, subject: gap.subject }))));

export interface HarnessResult {
  runs: IdeaRun[];
  failures: Failure[];
  elapsedMs: number;
  /** Failures the known-gaps list doesn't name: the harness fails on each. */
  unlisted: Failure[];
  /** Gap keys the list names that no longer fail: the harness fails on each too, so the list only shrinks. */
  passingNow: string[];
}

/**
 * One whole run of the idea harness: every idea through today's pipeline twice (the second run checks the same
 * idea gives the same output, invariant 7), checked against the invariants, and held against the known gaps.
 * The harness spec (tests/idea-harness.spec.ts) asserts on it; the quality report (scripts/quality-report.mjs)
 * counts from it, so both read one computation.
 */
export function runHarness(ideas: readonly Idea[] = IDEAS_V1, gaps: readonly KnownGap[] = KNOWN_GAPS): HarnessResult {
  const started = performance.now();
  const runs: IdeaRun[] = [];
  const failures: Failure[] = [];
  for (const idea of ideas) {
    const run = runIdea(idea);
    const again = runIdea(idea, { probeQuestions: false });
    runs.push(run);
    failures.push(...checkRun(run), ...sameOutput(idea.id, runDigest(run), runDigest(again)));
  }
  const elapsedMs = performance.now() - started;
  const known = knownGapKeys(gaps);
  const found = new Set(failures.map(gapKey));
  // Only the ideas run: a gap of an idea left out of this run can't be said to pass.
  const ran = new Set(ideas.map((idea) => idea.id));
  return {
    runs,
    failures,
    elapsedMs,
    unlisted: failures.filter((f) => !known.has(gapKey(f))),
    passingNow: [...known].filter((key) => ran.has(key.split(" · ")[0]) && !found.has(key)),
  };
}
