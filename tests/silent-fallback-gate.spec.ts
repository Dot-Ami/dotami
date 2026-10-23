/**
 * Call 32's planted control in the app's own code (the maintainer's call of 2026-10-22: the tests fail if any idea
 * lands on a future not written for it with nothing on screen saying so). The plant is the one the idea harness's
 * own controls use for a silent fallback (tests/idea-harness-plants.spec.ts): the first save drops the road the
 * person opened on step 3, so the cockpit draws the general road as "No future picked". Here the failure it makes is
 * also written into a known-gaps list, the way a ratchet entry would try to hide it: the ratchet still counts it as
 * unlisted (#204's NEVER_A_KNOWN_GAP), and the gate (`silentFallbackProblems`, held in tests/idea-harness.spec.ts)
 * still fails too.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

const plants = vi.hoisted(() => ({ dropPickedRoad: false }));

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

import type { KnownGap } from "./fixtures/ideas/known-gaps";
import { IDEAS_V1 } from "./fixtures/ideas/v1";
import { runHarness, silentFallbackProblems } from "./helpers/idea-harness-run";

// A cabinetmaker in Alberta, written for road 1 (the apprentice road), and a home bakery in Ontario, written for the
// federal steps: one road written for one province, one written for all of Canada.
const IDEAS = IDEAS_V1.filter((idea) => idea.id === "idea-v1-0046" || idea.id === "idea-v1-0004");

afterEach(() => {
  plants.dropPickedRoad = false;
});

describe("call 32: a silent fallback fails the tests even when a known gap lists it", () => {
  it("passes today on the same ideas: no silent fallback, none listed", () => {
    const { failures } = runHarness(IDEAS, []);
    expect(silentFallbackProblems(failures, [])).toEqual([]);
  });

  it("fails on a planted fallback (the save drops the road the person opened), listed or not", () => {
    plants.dropPickedRoad = true;
    const { failures } = runHarness(IDEAS, []);
    const fallbacks = failures.filter((f) => f.invariant === "ends:no-silent-fallback");
    // Both ideas, both ways in.
    expect(fallbacks.map((f) => `${f.ideaId} · ${f.subject}`).sort()).toEqual([
      "idea-v1-0004 · picked",
      "idea-v1-0004 · typed",
      "idea-v1-0046 · picked",
      "idea-v1-0046 · typed",
    ]);
    // Written into the known gaps, as a ratchet entry would try to hide them.
    const hiding: KnownGap[] = fallbacks.map((f) => ({
      invariant: f.invariant,
      subject: f.subject,
      kind: "bug",
      story: "a planted entry",
      why: "a planted entry",
      ideas: [Number(f.ideaId.slice(-4))],
    }));
    const listed = runHarness(IDEAS, hiding);
    // The ratchet refuses them too: since #204 a silent fallback can never be a known gap (NEVER_A_KNOWN_GAP), so
    // the listed entries are dropped and every fallback still counts as unlisted.
    expect(listed.unlisted.filter((f) => f.invariant === "ends:no-silent-fallback").map((f) => `${f.ideaId} · ${f.subject}`).sort()).toEqual([
      "idea-v1-0004 · picked",
      "idea-v1-0004 · typed",
      "idea-v1-0046 · picked",
      "idea-v1-0046 · typed",
    ]);
    // And the gate: each fallback, and each entry that lists one, is named.
    const problems = silentFallbackProblems(listed.failures, hiding);
    expect(problems).toHaveLength(8);
    expect(problems.filter((line) => line.startsWith("idea-v1-0046 · ends:no-silent-fallback · picked: picked: drawn on road-starting-any-business-ab as no future picked"))).toHaveLength(1);
  });
});
