/**
 * The honest map, second pass: sentences that still said something nobody said (review of
 * 2026-10-11 on the honest-map change, docs/task-list.md [10f]).
 *
 * Before this pass:
 * - the GST/HST card told everyone under the line "you are a small supplier and need not register",
 *   though the CRA page it cites lists people who must register anyway;
 * - Incorporating said "your third-year revenue estimate ($0)" to a person who skipped that optional
 *   number, and turned green when their own number was $0 too;
 * - outside Alberta the routes heading read "1 way to do this, side by side";
 * - the playbook export listed an untouched default under "Active branch selections" with nothing to
 *   say it was a default;
 * - the "I'd incorporate at" box kept 10 digits that the save then dropped.
 */
import { describe, expect, it } from "vitest";

import { evaluateProfile, type EvaluationProfile } from "@/lib/brain";
import type { CFENodeId } from "@/lib/engines/cfe/v2026";
import { complianceCatalogV2026 } from "@/lib/engines/compliance/v2026";
import {
  incorporationRoutesV2026,
  provinceNotWrittenNote,
  routesHeading,
} from "@/lib/engines/cfe/v2026/incorporation-routes";
import { cfeCatalogV2026 } from "@/lib/engines/cfe/v2026";
import { readMapAnswers, writeMapAnswers } from "@/lib/db/scenario-state-json";
import { buildPlaybookSkeleton } from "@/lib/playbook/build-skeleton";
import { renderPlaybookMarkdown } from "@/lib/playbook/render-markdown";
import { buildScenarioFromIntake } from "@/lib/scenarios/build-scenario-from-intake";
import { defaultActiveBranches, ownNumberFromTyping, setIncorporateAt, updateScenarioBranch } from "@/lib/scenarios/branches";

const TODAY = "2026-10-11";
const INCORPORATING = "stage-3a-incorporation-80k-net" satisfies CFENodeId;

const base: EvaluationProfile = {
  goals: [],
  ventureType: "service",
  activityTags: [],
  province: "AB",
  employmentStatus: "employee",
  structure: "sole-prop",
  targetRevenueY1: 0,
  targetRevenueY3: 0,
  hireFirst: false,
  capitalPurchasePlanned: false,
};

describe("the GST/HST card under the line keeps the CRA page's hedge", () => {
  it("never tells a person flatly that they are a small supplier who need not register", () => {
    for (const y1 of [0, 25_000]) {
      const card = evaluateProfile({ ...base, targetRevenueY1: y1 }, { today: TODAY }).unlocks.find(
        (u) => u.id === "compliance-gst-small-supplier",
      )!;
      expect(card.payoff, `Y1 ${y1}`).not.toMatch(/you are a small supplier/i);
      // Most businesses, not everyone: the cited page lists people who must register anyway.
      expect(card.payoff).toMatch(/most businesses/i);
      expect(card.payoff).toMatch(/exceptions/i);
    }
  });

  it("the single-quarter test says what it means for the sale that crosses the line, in the CRA's words", () => {
    const rule = complianceCatalogV2026.entries.find((e) => e.id === "compliance-gst-small-supplier")!;
    const single = rule.officialWords!.passages.find((p) => p.id === "cra-gst-single-quarter")!;
    expect(single.sentences).toContain(
      "You are no longer a small supplier and have to charge GST/HST on the supply that made you exceed $30,000 within the calendar quarter.",
    );
  });
});

describe("Incorporating never states an estimate the person didn't give", () => {
  const picks = { ...defaultActiveBranches };
  const run = (y3: number, incorporateAt: number) =>
    evaluateProfile({ ...base, targetRevenueY3: y3 }, { today: TODAY, activeBranches: picks, incorporateAt });

  it("with no third-year estimate (a skipped field is 0) it says so, and shows no '$0' estimate", () => {
    const result = run(0, 100_000);
    expect(result.nodeStates[INCORPORATING]).toBe("yellow");
    const reason = result.nodeReasons[INCORPORATING]!;
    expect(reason).not.toContain("($0)");
    expect(reason).toMatch(/no third-year revenue estimate/i);
    expect(reason).toContain("$100,000");
  });

  // The second review of PR #182 (2026-10-17): a future picked on Pick a future keeps no third-year
  // estimate and nothing in the cockpit asks for one, yet the card and the step panel invited "set your own
  // number to see this light", which no number could do. They now say what the light needs and what's missing.
  it("with neither number, it never invites a number that can't light it", () => {
    const blank = evaluateProfile({ ...base, targetRevenueY3: 0 }, { today: TODAY, activeBranches: picks, incorporateAt: null });
    expect(blank.nodeStates[INCORPORATING]).toBe("yellow");
    const reason = blank.nodeReasons[INCORPORATING]!;
    expect(reason).not.toMatch(/set your own number to see this light/i);
    expect(reason).toMatch(/no third-year revenue estimate/i);
    expect(reason).toMatch(/DotAmi has no number of its own/);
    // The control: with an estimate, the number is all it waits for, and it says so.
    const withEstimate = evaluateProfile({ ...base, targetRevenueY3: 90_000 }, { today: TODAY, activeBranches: picks, incorporateAt: null });
    expect(withEstimate.nodeReasons[INCORPORATING]).toMatch(/^Check first: set your own number to see this light/);
  });

  it("with a number and no estimate, it names the idea, not an intake a picked future never had", () => {
    expect(run(0, 50_000).nodeReasons[INCORPORATING]).toBe(
      "Check first: there's no third-year revenue estimate on this idea to compare with your own number ($50,000).",
    );
  });

  it("a $0 number of the person's own doesn't light it from a missing estimate", () => {
    const result = run(0, 0);
    expect(result.nodeStates[INCORPORATING]).toBe("yellow");
    expect(result.nodeReasons[INCORPORATING]).not.toContain("($0) reaches");
  });
});

describe("the routes heading for a province with no route written", () => {
  it("two routes read side by side; one route never claims to be the only way", () => {
    expect(routesHeading(2, null)).toBe("2 ways to do this, side by side · DotAmi doesn't pick one");
    const bc = routesHeading(1, "British Columbia");
    expect(bc).not.toMatch(/1 way|side by side/);
    expect(bc).toContain("British Columbia");
    expect(provinceNotWrittenNote("British Columbia")).toBe(
      "Incorporating under British Columbia law isn't written yet, so only the federal way is shown.",
    );
  });

  it("Alberta's note doesn't send the NUANS report to the registry agent catalogue", () => {
    // The Alberta page sends the name report to a NUANS provider, not to the registry agents.
    const note = incorporationRoutesV2026.find((r) => r.id === "incorporation-route-alberta")!.blanksNote!;
    expect(note).not.toMatch(/^Alberta's amounts are/);
    expect(note).toMatch(/NUANS/);
  });
});

describe("the playbook export marks a default as a default", () => {
  const intake = {
    name: "Invented",
    type: "service" as const,
    targetRevenueY1: 0,
    targetRevenueY3: 0,
    province: "AB" as const,
    hireFirst: false,
    employmentStatus: "employee" as const,
    activityTags: [],
  };

  // renderPlaybookMarkdown is the route /api/playbook's renderer, which no page calls since 2026-10-23: the cockpit's
  // Export is lib/playbook/road-export.ts, built on buildPlan, whose "The map's default pick: …, not yours yet" is
  // tested with Your plan (tests/cockpit-plan.spec.ts) and in tests/prerelease-numbers.spec.ts below. This keeps the
  // route honest while it still answers.
  it("an untouched toggle is written as 'default, not picked yet'; a pick isn't (the route's renderer)", () => {
    const fresh = buildScenarioFromIntake(intake, "playbook-defaults");
    const md = renderPlaybookMarkdown(buildPlaybookSkeleton(cfeCatalogV2026.nodes, fresh));
    expect(md.match(/\(default, not picked yet\)/g)?.length).toBe(2);

    const picked = updateScenarioBranch(fresh, "gstTiming", "stage-2a-voluntary-gst-registration");
    const skeleton = buildPlaybookSkeleton(cfeCatalogV2026.nodes, picked);
    expect(skeleton.decisions.find((d) => d.decisionId === "gstTiming")!.decided).toBe(true);
    expect(skeleton.decisions.find((d) => d.decisionId === "incorporationTiming")!.decided).toBe(false);
    expect(renderPlaybookMarkdown(skeleton).match(/\(default, not picked yet\)/g)?.length).toBe(1);
  });
});

describe("the 'I'd incorporate at' box keeps only what the save keeps", () => {
  it("typing never holds more digits than a save can store", () => {
    expect(ownNumberFromTyping("")).toBeNull();
    expect(ownNumberFromTyping("$100,000")).toBe(100_000);
    const longest = ownNumberFromTyping("99999999999")!;
    expect(longest).toBe(999_999_999);
    expect(readMapAnswers(writeMapAnswers({ activeBranches: defaultActiveBranches, incorporateAt: longest })).incorporateAt).toBe(
      longest,
    );
  });

  it("a number the save would drop is never set on screen either", () => {
    const fresh = buildScenarioFromIntake(
      { name: "Invented", type: "service", targetRevenueY1: 0, targetRevenueY3: 0, province: "AB", hireFirst: false, employmentStatus: "employee", activityTags: [] },
      "own-cap",
    );
    expect(setIncorporateAt(fresh, 2e9).state.incorporateAt).toBeNull();
  });
});
