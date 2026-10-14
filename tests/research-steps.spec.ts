/**
 * Research tax credit steps for research ideas only (issue #40, 2026-10-13; docs/architecture/
 * future-cockpit.md § 6, "Steps for some kinds of work only, as built").
 *
 * A sign painter's map drew "SR&ED deepening" with the chip "ahead", as if that idea were headed for a
 * research tax credit. The road now says, in its catalog, that the step is for some kinds of work only
 * (`onlyForKindsOfWork`), and road evaluation puts it off the path with that reason for an idea without
 * one of them. It is never removed from the map: it stays drawn, dashed, and still opens.
 */
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { StrategyMap } from "@/components/cockpit/strategy-map";
import { mapPlace, nextOnYourRoad, setAsideOnMap } from "@/lib/cockpit/view";
import { generalRoadV2026, roadProblems, roadsV2026, type Road } from "@/lib/engines/roads/v2026";
import { ACTIVITY_TAXONOMY } from "@/lib/journey/intent";
import { evaluateRoad, roadReceipt, type RoadEvaluation, type RoadEvaluationInput } from "@/lib/roads";
import { evaluateScenario } from "@/lib/scenarios/evaluate-scenario";
import type { Scenario } from "@/lib/scenarios/types";

import { inventedRoad, inventedSkillItems } from "./helpers/invented-road";
import { input, inventedIdea, TODAY } from "./helpers/road-to-evaluate";

const SRED = "stage-4-sred-deepening";
const RESEARCH_TAGS = ["Software / SaaS", "Manufacturing", "AI / ML / R&D"];
const NOT_TOLD =
  "You haven't told DotAmi this idea involves research and development: none of its kinds of work is Software / SaaS, Manufacturing or AI / ML / R&D.";

/** A sign painter: a trade, nothing about research. */
const signPainter = (change: Partial<Scenario["profile"]> = {}) =>
  inventedIdea({ name: "Sign painting (test only)", activityTags: ["Trades"], ...change });
/** An AI/ML/R&D idea the person said is a corporation. */
const researchCorporation = (change: Partial<Scenario["profile"]> = {}) =>
  inventedIdea({ name: "Applied AI (test only)", activityTags: ["AI / ML / R&D"], structure: "corporation", structureSource: "user", ...change });

const onRoad0 = (scenario: Scenario, change: Partial<RoadEvaluationInput> = {}) =>
  evaluateRoad(input({ road: generalRoadV2026, roadChosen: false, skillItems: [], scenario, ...change }));
const sredOf = (result: RoadEvaluation) => result.steps.find((s) => s.stepId === SRED)!;

describe("road 0 says, in its catalog, which step is for research kinds of work only", () => {
  it("SR&ED deepening, and no other step, with the three kinds of work today's rules read for it", () => {
    const marked = generalRoadV2026.steps.filter((s) => s.onlyForKindsOfWork !== undefined);
    expect(marked.map((s) => s.id)).toEqual([SRED]);
    expect(marked[0]!.onlyForKindsOfWork).toEqual({
      tags: RESEARCH_TAGS,
      notTold: "this idea involves research and development",
    });
  });

  it("the list is exactly the kinds of work that light the rules' SR&ED deepening for a corporation", () => {
    // Held equal to the rules, so the road can never put the step off the path for a kind of work the
    // rules would light it for, or leave it to the rules for one they never would.
    const step = generalRoadV2026.steps.find((s) => s.id === SRED)!;
    for (const tag of ACTIVITY_TAXONOMY) {
      const lit = evaluateScenario(researchCorporation({ activityTags: [tag] }), { today: TODAY }).nodeStates[SRED] !== "gray";
      expect(step.onlyForKindsOfWork!.tags.includes(tag), tag).toBe(lit);
    }
  });

  it("every kind of work a road names is one the intake asks", () => {
    for (const road of roadsV2026) {
      for (const step of road.steps) {
        for (const tag of step.onlyForKindsOfWork?.tags ?? []) {
          expect(ACTIVITY_TAXONOMY as readonly string[], `${road.id}/${step.id}`).toContain(tag);
        }
      }
    }
  });

  it("the checks refuse an empty list of kinds of work and an empty reason", () => {
    const withField = (field: NonNullable<Road["steps"][number]["onlyForKindsOfWork"]>) => {
      const road = inventedRoad();
      road.steps[1]!.onlyForKindsOfWork = field;
      return roadProblems(road, inventedSkillItems);
    };
    expect(withField({ tags: ["Trades"], notTold: "this idea is a trade" })).toEqual([]);
    expect(withField({ tags: [], notTold: "this idea is a trade" })).toEqual([
      'Step "step-invented-employed" is for some kinds of work only but names none.',
    ]);
    expect(withField({ tags: ["Trades"], notTold: "  " })).toEqual([
      'Step "step-invented-employed" is for some kinds of work only but doesn\'t say what the idea hasn\'t told DotAmi.',
    ]);
  });
});

describe("road evaluation: a sign painter's research steps are off the path, with the reason", () => {
  it("a sign painter (a trade, sole proprietor): not on your path, because no research kind of work was told", () => {
    expect(sredOf(onRoad0(signPainter()))).toMatchObject({
      state: "not-on-your-path",
      reason: { kind: "kinds-of-work", tags: RESEARCH_TAGS },
      because: NOT_TOLD,
      money: "left-out",
    });
  });

  it("a sign painter who incorporated: the same reason, not the structure", () => {
    expect(sredOf(onRoad0(signPainter({ structure: "corporation", structureSource: "user" })))).toMatchObject({
      state: "not-on-your-path",
      reason: { kind: "kinds-of-work" },
      because: NOT_TOLD,
    });
  });

  it("an idea with no kinds of work at all (saved from Pick a future) reads the same", () => {
    expect(sredOf(onRoad0(signPainter({ activityTags: [] })))).toMatchObject({ reason: { kind: "kinds-of-work" }, because: NOT_TOLD });
  });

  it("the person's own not for me still comes first", () => {
    const result = onRoad0(signPainter(), { progress: [{ stepId: SRED, status: "not-for-me", doneWhenIds: [] }] });
    expect(sredOf(result)).toMatchObject({ reason: { kind: "not-for-me" }, because: "You marked this step not for me." });
  });

  it("every other step of road 0 keeps its state and reason: only SR&ED deepening changes", () => {
    const result = onRoad0(signPainter());
    for (const step of result.steps.filter((s) => s.stepId !== SRED)) expect(step.reason.kind, step.stepId).not.toBe("kinds-of-work");
  });
});

describe("road evaluation: an AI / ML / R&D idea's research steps go back to the rules", () => {
  it("an AI / ML / R&D corporation: on the path (check first), coloured by the rules as before", () => {
    expect(sredOf(onRoad0(researchCorporation()))).toMatchObject({ state: "check-first", reason: { kind: "rules" }, money: "counted" });
  });

  it("each of the three kinds of work brings it back, for a corporation", () => {
    for (const tag of RESEARCH_TAGS) {
      expect(sredOf(onRoad0(researchCorporation({ activityTags: [tag] }))).state, tag).toBe("check-first");
    }
  });

  it("an AI / ML / R&D sole proprietor: the rules still leave it off, naming the structure, not research", () => {
    const step = sredOf(onRoad0(researchCorporation({ structure: "sole-prop", structureSource: "user" })));
    expect(step).toMatchObject({ state: "not-on-your-path", reason: { kind: "rules" } });
    expect(step.because).toBe("Today's rules leave it off your path, from your structure (Sole prop).");
  });

  it("telling DotAmi the kind of work changes the step, and the receipt names the answer", () => {
    const before = onRoad0(signPainter({ structure: "corporation", structureSource: "user" }));
    const after = onRoad0(signPainter({ structure: "corporation", structureSource: "user", activityTags: ["AI / ML / R&D"] }));
    expect(sredOf(after).state).toBe("check-first");
    expect(roadReceipt(before, after).join("\n")).toContain("the kinds of work are AI / ML / R&D");
  });
});

describe("on the map in the cockpit: still drawn, dashed, chip and reason in words", () => {
  const draw = (scenario: Scenario) => {
    const result = onRoad0(scenario);
    return {
      result,
      html: renderToStaticMarkup(
        createElement(StrategyMap, {
          road: generalRoadV2026,
          scenario,
          evaluation: result.rules,
          selectedStepId: null,
          onSelectStep: () => {},
          onBranchChange: () => {},
          overlays: { skills: true, money: true, rules: true },
          stepEvaluations: new Map(result.steps.map((s) => [s.stepId, s])),
          linkedSkillId: null,
        }),
      ),
    };
  };
  /** The SR&ED deepening card's own button, from its opening tag to its close. */
  const sredCard = (html: string) => /<button[^>]*aria-label="SR&amp;ED deepening,[^"]*"[^>]*>.*?<\/button>/s.exec(html)?.[0] ?? "";

  it("a sign painter's card: not on your path, dashed, the reason under the trigger, and it still opens", () => {
    const { html, result } = draw(signPainter());
    const card = sredCard(html);
    expect(card).toContain('aria-label="SR&amp;ED deepening, not on your path, doesn&#x27;t apply as answered, opens detail"');
    expect(card).toContain("border-dashed");
    expect(card).toContain("You haven&#x27;t told DotAmi this idea involves research and development");
    expect(card).toMatch(/aria-describedby="[^"]+"/);
    // Off the path by the road's rule, so the map's place is "not on your path" and Next on your road skips it.
    const sred = sredOf(result);
    expect(setAsideOnMap(mapPlace(SRED, signPainter(), sred))).toBe(true);
    expect(nextOnYourRoad(result, signPainter(), 99).map((s) => s.stepId)).not.toContain(SRED);
  });

  it("an AI / ML / R&D corporation's card: as before, the map's own chip, not dashed", () => {
    const card = sredCard(draw(researchCorporation()).html);
    expect(card).toContain('aria-label="SR&amp;ED deepening, ahead, check first');
    expect(card).not.toContain("border-dashed");
    expect(card).not.toContain("You haven&#x27;t told DotAmi");
  });
});
