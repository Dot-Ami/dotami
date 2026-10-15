/**
 * Research tax credit steps for research ideas only (issue #40, 2026-10-13; docs/architecture/
 * future-cockpit.md § 6, "Steps for some kinds of work only, as built").
 *
 * A sign painter's map drew "SR&ED deepening" with the chip "ahead", as if that idea were headed for a
 * research tax credit. The road now says, in its catalog, that the step is for some kinds of work only
 * (`onlyForKindsOfWork`), and road evaluation puts it off the path with that reason for an idea without
 * one of them. It is never removed from the map: it stays drawn, dashed, and still opens.
 *
 * The reason says only what DotAmi can check, which kinds of work are on the idea, never what the person
 * did or didn't tell it: a person can type their own kind of work on the intake ("Research and
 * development"), which the rules don't read, and that person did tell DotAmi about the research.
 */
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { StrategyMap } from "@/components/cockpit/strategy-map";
import { itemsForStep } from "@/lib/brain/node-items";
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
/** The reason on an idea with kinds of work, none of them one of the three. */
const NONE_OF_THEM =
  "None of the kinds of work on this idea is Software / SaaS, Manufacturing or AI / ML / R&D, and this step is on your path only with one of them.";
/** The reason on an idea with no kinds of work at all (one saved from Pick a future). */
const NO_KINDS =
  "This idea has no kinds of work on it, and this step is on your path only with one of Software / SaaS, Manufacturing or AI / ML / R&D.";
/** The rules' own reason for a sole proprietorship with a research kind of work. */
const SOLE_PROP_REASON = "Today's rules leave it off your path, from your structure (Sole prop).";

/** A sign painter: a trade, nothing about research. */
const signPainter = (change: Partial<Scenario["profile"]> = {}) =>
  inventedIdea({ name: "Sign painting (test only)", activityTags: ["Trades"], ...change });
/** An AI/ML/R&D idea the person said is a corporation. */
const researchCorporation = (change: Partial<Scenario["profile"]> = {}) =>
  inventedIdea({ name: "Applied AI (test only)", activityTags: ["AI / ML / R&D"], structure: "corporation", structureSource: "user", ...change });
/** An AI/ML/R&D idea the person said is a sole proprietorship. */
const researchSoleProp = () => researchCorporation({ structure: "sole-prop", structureSource: "user" });

/** Road 0 with no step marked for some kinds of work only: road evaluation as it was before issue #40. */
const roadWithoutTheRule = (): Road => ({
  ...generalRoadV2026,
  steps: generalRoadV2026.steps.map(({ onlyForKindsOfWork: _unused, ...step }) => step),
});

const onRoad0 = (scenario: Scenario, change: Partial<RoadEvaluationInput> = {}) =>
  evaluateRoad(input({ road: generalRoadV2026, roadChosen: false, skillItems: [], scenario, ...change }));
const sredOf = (result: RoadEvaluation) => result.steps.find((s) => s.stepId === SRED)!;

describe("road 0 says, in its catalog, which step is for research kinds of work only", () => {
  it("SR&ED deepening, and no other step, with the three kinds of work today's rules read for it", () => {
    const marked = generalRoadV2026.steps.filter((s) => s.onlyForKindsOfWork !== undefined);
    expect(marked.map((s) => s.id)).toEqual([SRED]);
    // Only the kinds of work: the reason is built from what DotAmi can check, so the catalog carries no
    // sentence about what the person told it.
    expect(marked[0]!.onlyForKindsOfWork).toEqual({ tags: RESEARCH_TAGS });
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

  it("the checks refuse an empty list of kinds of work", () => {
    const withTags = (tags: string[]) => {
      const road = inventedRoad();
      road.steps[1]!.onlyForKindsOfWork = { tags };
      return roadProblems(road, inventedSkillItems);
    };
    expect(withTags(["Trades"])).toEqual([]);
    expect(withTags([])).toEqual(['Step "step-invented-employed" is for some kinds of work only but names none.']);
  });

  it("every rules card on such a step is grey without one of its kinds of work, so hiding them hides nothing that applies", () => {
    // The map hides a dashed card's lever cards, and the Rules & tax count leaves them out. That is only
    // harmless while none of them would light without one of the step's kinds of work.
    for (const road of roadsV2026) {
      for (const step of road.steps.filter((s) => s.onlyForKindsOfWork !== undefined)) {
        const others = ACTIVITY_TAXONOMY.filter((tag) => !step.onlyForKindsOfWork!.tags.includes(tag));
        for (const structure of ["sole-prop", "corporation"] as const) {
          for (const tags of [[], others]) {
            const rules = evaluateScenario(signPainter({ activityTags: tags, structure, structureSource: "user" }), { today: TODAY });
            const lit = itemsForStep(rules.unlocks, step).forThisStage.map((u) => u.id);
            expect(lit, `${road.id}/${step.id}, ${structure}, ${tags.length} kinds of work`).toEqual([]);
          }
        }
      }
    }
  });
});

describe("road evaluation: a sign painter's research steps are off the path, with the reason", () => {
  it("a sign painter (a trade, sole proprietor): not on your path, naming the kinds of work the step needs", () => {
    expect(sredOf(onRoad0(signPainter()))).toMatchObject({
      state: "not-on-your-path",
      reason: { kind: "kinds-of-work", tags: RESEARCH_TAGS },
      because: NONE_OF_THEM,
      money: "left-out",
    });
  });

  it("a sign painter who incorporated: the same reason, not the structure", () => {
    expect(sredOf(onRoad0(signPainter({ structure: "corporation", structureSource: "user" })))).toMatchObject({
      state: "not-on-your-path",
      reason: { kind: "kinds-of-work" },
      because: NONE_OF_THEM,
    });
  });

  it("an idea with no kinds of work at all (saved from Pick a future) says it has none", () => {
    expect(sredOf(onRoad0(signPainter({ activityTags: [] })))).toMatchObject({ reason: { kind: "kinds-of-work" }, because: NO_KINDS });
  });

  it("a person who typed their own kind of work about research: the reason never says they didn't tell DotAmi", () => {
    // The intake's "Add your own kind of work" box saves the person's words beside the listed kinds of
    // work. The rules match only the listed ones, so the step is off the path; but this person did tell
    // DotAmi the idea involves research, in their own words, so the reason must not say otherwise.
    for (const own of ["Research and development", "Scientific research", "Biotech R&D lab"]) {
      const step = sredOf(onRoad0(signPainter({ activityTags: [own], structure: "corporation", structureSource: "user" })));
      expect(step.state, own).toBe("not-on-your-path");
      expect(step.because, own).toBe(NONE_OF_THEM);
      expect(step.because, own).not.toMatch(/told/i);
    }
  });

  it("the person's own not for me still comes first", () => {
    const result = onRoad0(signPainter(), { progress: [{ stepId: SRED, status: "not-for-me", doneWhenIds: [] }] });
    expect(sredOf(result)).toMatchObject({ reason: { kind: "not-for-me" }, because: "You marked this step not for me." });
  });

  it("every other step of road 0 has the same state, reason and sentence as on road 0 with the rule taken out", () => {
    // Compared with road 0 with no step marked, so a change to any other step, from this rule or from
    // anything it touches, fails here.
    const ideas = [
      signPainter(),
      signPainter({ structure: "corporation", structureSource: "user" }),
      signPainter({ activityTags: [] }),
      researchSoleProp(),
      researchCorporation(),
    ];
    const others = (r: RoadEvaluation) =>
      r.steps.filter((s) => s.stepId !== SRED).map(({ stepId, state, reason, because }) => ({ stepId, state, reason, because }));
    for (const idea of ideas) {
      const label = `${idea.profile.structure} ${idea.profile.activityTags?.join(",")}`;
      expect(others(onRoad0(idea)), label).toEqual(others(onRoad0(idea, { road: roadWithoutTheRule() })));
    }
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
    const step = sredOf(onRoad0(researchSoleProp()));
    expect(step).toMatchObject({ state: "not-on-your-path", reason: { kind: "rules" } });
    expect(step.because).toBe(SOLE_PROP_REASON);
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
  /** The lever cards drawn under the SR&ED deepening card: the list after its button, before the next step. */
  const sredLevers = (html: string) => {
    const start = html.indexOf(sredCard(html)) + sredCard(html).length;
    const rest = html.slice(start);
    const next = rest.search(/<div class="flex flex-col gap-1\.5 transition-opacity/);
    return (next === -1 ? rest : rest.slice(0, next)).match(/<li/g)?.length ?? 0;
  };
  const asHtml = (text: string) => text.replaceAll("&", "&amp;").replaceAll("'", "&#x27;");
  const OFF_PATH_NAME = 'aria-label="SR&amp;ED deepening, not on your path, doesn&#x27;t apply as answered, opens detail"';

  it("a sign painter's card: not on your path, dashed, the reason under the trigger, and it still opens", () => {
    const { html, result } = draw(signPainter());
    const card = sredCard(html);
    expect(card).toContain(OFF_PATH_NAME);
    expect(card).toContain("border-dashed");
    expect(card).toContain(asHtml(NONE_OF_THEM));
    expect(card).toMatch(/aria-describedby="[^"]+"/);
    // Off the path by the road's rule, so the map's place is "not on your path" and Next on your road skips it.
    const sred = sredOf(result);
    expect(setAsideOnMap(mapPlace(SRED, signPainter(), sred))).toBe(true);
    expect(nextOnYourRoad(result, signPainter(), 99).map((s) => s.stepId)).not.toContain(SRED);
  });

  it("an idea with no kinds of work: the card says the idea has none", () => {
    const card = sredCard(draw(signPainter({ activityTags: [] })).html);
    expect(card).toContain(OFF_PATH_NAME);
    expect(card).toContain(asHtml(NO_KINDS));
  });

  it("an AI / ML / R&D corporation's card: as before, the map's own chip, not dashed", () => {
    const card = sredCard(draw(researchCorporation()).html);
    expect(card).toContain('aria-label="SR&amp;ED deepening, ahead, check first');
    expect(card).not.toContain("border-dashed");
    expect(card).not.toContain("None of the kinds of work");
  });

  it("an AI / ML / R&D sole proprietor's card: drawn as before, solid with its lever cards, because they apply", () => {
    // Built this way on purpose (review of 2026-10-13, a question for the maintainer in
    // docs/ui-spec/cockpit/03-canvas.md): the rules leave the step off the path for a sole proprietorship,
    // but its two lever cards, the SR&ED tax credit and IRAP, are amber (check first) for this idea, and a
    // dashed card hides its lever cards. Drawing it dashed would take two cards that apply out of sight.
    const { html } = draw(researchSoleProp());
    const card = sredCard(html);
    expect(card).toContain('aria-label="SR&amp;ED deepening, ahead, doesn&#x27;t apply as answered');
    expect(card).not.toContain("border-dashed");
    expect(card).not.toContain("None of the kinds of work");
    expect(sredLevers(html)).toBe(2);
    // The sign painter's dashed card draws none.
    expect(sredLevers(draw(signPainter()).html)).toBe(0);
  });
});
