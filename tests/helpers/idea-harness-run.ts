import { KNOWN_GAPS, NEVER_A_KNOWN_GAP, type KnownGap } from "../fixtures/ideas/known-gaps";
import { IDEAS_V1, type Idea } from "../fixtures/ideas/v1";
import { checkRun, gapKey, sameOutput, type Failure } from "./idea-invariants";
import { runDigest, runIdea, type IdeaRun } from "./idea-pipeline";

/** An idea's permanent id from its number in the known-gaps list (idea-v1-0001 is 1). */
export const ideaId = (n: number) => `idea-v1-${String(n).padStart(4, "0")}`;

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
/** The gaps the ratchet may hold: every listed gap but those of an invariant that may never be one (`NEVER_A_KNOWN_GAP`). */
export function listableGaps(gaps: readonly KnownGap[]): KnownGap[] {
  return gaps.filter((gap) => !NEVER_A_KNOWN_GAP.includes(gap.invariant));
}

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
  // A silent fallback is never a known gap (the maintainer's call 32 of 2026-10-22): one listed anyway still counts
  // as unlisted, so the harness fails on it whatever the list says.
  const known = knownGapKeys(listableGaps(gaps));
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
