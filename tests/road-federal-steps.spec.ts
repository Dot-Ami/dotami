/**
 * Outside Alberta, honestly (task 28d, 2026-10-21; docs/ui-spec/futures/04-outside-alberta.md): the federal
 * steps for any business in Canada, built from road 0 without its Alberta-only steps and pages; each step's
 * sources drawn for the idea's own place with a count of what was left out; and the cockpit's and the plan's
 * line saying the province's own steps aren't written yet. Pick a future's listing is in tests/front-door.spec.ts,
 * the screens in e2e/front-door.spec.ts.
 */
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { GoalBar } from "@/components/cockpit/goal-bar";
import { StepPanel } from "@/components/cockpit/step-panel";
import { buildPlan } from "@/lib/cockpit/plan";
import { goalRoadLine } from "@/lib/cockpit/road-line";
import { cockpitInput } from "@/lib/cockpit/view";
import { cockpitWords } from "@/lib/cockpit/words";
import { pickWords } from "@/lib/front-door/words";
import {
  citationsForPlace,
  FEDERAL_ROAD_ID,
  forksAreTheMapToggles,
  roadApprenticeToOwnShopAB,
  roadFederalStepsCA,
  roadStartingAnyBusinessAB,
  roadsV2026,
  skillItemsV2026,
  type Road,
  type RoadStep,
} from "@/lib/engines/roads/v2026";
import { POST as postPlaybook } from "@/app/api/playbook/route";
import { cfeCatalogV2026 } from "@/lib/engines/cfe/v2026";
import { buildPlaybookSkeleton } from "@/lib/playbook/build-skeleton";
import { renderPlaybookMarkdown } from "@/lib/playbook/render-markdown";
import type { PlaybookSkeleton } from "@/lib/playbook/types";
import { evaluateRoad } from "@/lib/roads";
import { FULL_COVERAGE_PROVINCES, type Scenario } from "@/lib/scenarios/types";

import { inventedIdea, TODAY } from "./helpers/road-to-evaluate";
import { findTimeWords } from "./helpers/time-words";
import { findVerdicts } from "./helpers/verdict-words";

const road = roadFederalStepsCA;
const road0 = roadStartingAnyBusinessAB;
const stepOf = (r: Road, id: string) => r.steps.find((s) => s.id === id)!;
const allCitations = (step: RoadStep) => [...step.citations, ...step.doneWhen.map((line) => line.citation)];

describe("the federal steps for any business in Canada: road 0 without Alberta", () => {
  it("is one catalog road, written for all of Canada, for any business, for no particular job", () => {
    expect(road.id).toBe(FEDERAL_ROAD_ID);
    expect(road.id).toBe("road-federal-steps-ca");
    expect(road.label).toBe("The federal steps for any business in Canada");
    expect(road.provinces).toEqual(["CA"]);
    expect(road.kind).toBe("business");
    expect(road.codes.occupations).toBe("no-particular-job");
    expect(roadsV2026.map((r) => r.id)).toEqual([road0.id, roadApprenticeToOwnShopAB.id, road.id]);
  });

  it("keeps road 0's columns and its two forks, which are the map's own toggles on both roads", () => {
    expect(road.columns.map((c) => [c.id, c.label, c.forkId])).toEqual(road0.columns.map((c) => [c.id, c.label, c.forkId]));
    expect(road.forks).toEqual(road0.forks);
    expect(forksAreTheMapToggles(road)).toBe(true);
    expect(forksAreTheMapToggles(road0)).toBe(true);
    expect(forksAreTheMapToggles(roadApprenticeToOwnShopAB)).toBe(false);
  });

  it("the step list the build ends with: road 0's, less the one step that rests only on Alberta's pages", () => {
    expect(road.steps.map((s) => s.label)).toEqual([
      "Employee/Apprentice baseline",
      "Sole Prop activation",
      "Voluntary GST registration",
      "Mandatory GST registration",
      "Incorporating",
      "Incorporation for liability/SR&ED",
      "Hire first employee",
      "Service vs. productize",
      "Retained earnings planning",
      "SR&ED deepening",
      "Look up your permits and licences (BizPaL)",
      "A separate bank account for the business, if it has a name other than yours",
      "Keep your records from day one",
    ]);
    const left = road0.steps.filter((s) => !road.steps.some((t) => t.id === s.id));
    expect(left.map((s) => s.id)).toEqual(["step-start-register-name"]);
    // The rule, not a list typed by hand: what the step asks rests on no federal page.
    for (const step of left) expect(allCitations(step).some((c) => c.jurisdiction === "CA"), step.id).toBe(false);
    for (const step of road.steps) expect(allCitations(step).some((c) => c.jurisdiction === "CA"), step.id).toBe(true);
    // Nothing leads to a step that isn't on the road.
    const ids = new Set(road.steps.map((s) => s.id));
    for (const step of road.steps) for (const next of step.next) expect(ids.has(next), `${step.id} → ${next}`).toBe(true);
  });

  it("carries no Alberta-only page in what a step asks: no done-when line, cost line or official link rests on one", () => {
    for (const step of road.steps) {
      for (const line of step.doneWhen) expect(line.citation.jurisdiction, line.id).not.toBe("AB");
      for (const cost of step.costs) {
        const source = cost.kind === "official-fee" ? cost.citation : cost.nameSource;
        if (source) expect(source.jurisdiction, cost.id).not.toBe("AB");
      }
      for (const link of step.officialLinks) expect(link.url, step.id).not.toMatch(/alberta\.ca/);
    }
    // The two lines left out with Alberta's pages: WCB-Alberta on hiring, registering a name on Service vs. productize.
    const lines = (r: Road, id: string) => stepOf(r, id).doneWhen.map((l) => l.id);
    expect(lines(road0, "branch-hire-first-employee").filter((id) => !lines(road, "branch-hire-first-employee").includes(id))).toEqual(["dw-start-hire-wcb"]);
    expect(lines(road0, "branch-service-vs-productize").filter((id) => !lines(road, "branch-service-vs-productize").includes(id))).toEqual([
      "dw-start-service-name",
    ]);
  });

  it("keeps every other step as road 0 has it: name, line, arrows, skills, cards, costs and sources", () => {
    for (const step of road.steps) {
      const same = stepOf(road0, step.id);
      expect(step.label).toBe(same.label);
      expect(step.summary).toBe(same.summary);
      expect(step.next).toEqual(same.next);
      expect(step.needs).toEqual(same.needs);
      expect(step.engineHints).toEqual(same.engineHints);
      expect(step.onlyForKindsOfWork).toEqual(same.onlyForKindsOfWork);
      expect(step.costs).toEqual(same.costs);
      expect(step.citations).toEqual(same.citations);
      expect(step.doneWhen).toEqual(same.doneWhen.filter((line) => line.citation.jurisdiction !== "AB"));
    }
  });

  it("leaves FULL_COVERAGE_PROVINCES as it is (the maintainer's call of 2026-10-21)", () => {
    expect(FULL_COVERAGE_PROVINCES).toEqual(["AB", "BC", "ON"]);
  });
});

describe("a step's sources, drawn for the idea's own place", () => {
  const hire = stepOf(road, "branch-hire-first-employee");
  const service = stepOf(road, "branch-service-vs-productize");
  const places = (cs: readonly { jurisdiction: string }[]) => cs.map((c) => c.jurisdiction);

  it("an Ontario idea's Hire first employee shows the CRA's pages and Ontario's guide, not British Columbia's, and counts it", () => {
    expect(places(hire.citations)).toEqual(["CA", "CA", "ON", "BC"]);
    const on = citationsForPlace(road, hire.citations, "ON");
    expect(places(on.shown)).toEqual(["CA", "CA", "ON"]);
    expect(on.leftOut).toBe(1);
    const bc = citationsForPlace(road, hire.citations, "BC");
    expect(places(bc.shown)).toEqual(["CA", "CA", "BC"]);
    expect(bc.leftOut).toBe(1);
    // A place with no page of its own here: the federal ones only, and both others counted.
    const yt = citationsForPlace(road, hire.citations, "YT");
    expect(places(yt.shown)).toEqual(["CA", "CA"]);
    expect(yt.leftOut).toBe(2);
  });

  it("Service vs. productize shows the CRA's pages, not Alberta's register-a-name page, and counts it", () => {
    const on = citationsForPlace(road, service.citations, "ON");
    expect(places(on.shown)).toEqual(["CA", "CA"]);
    expect(on.leftOut).toBe(1);
  });

  it("on a road written for particular provinces, every source is shown, whoever opens it", () => {
    const step = stepOf(road0, "branch-hire-first-employee");
    expect(citationsForPlace(road0, step.citations, "ON")).toEqual({ shown: step.citations, leftOut: 0 });
  });

  it("the step panel draws only the place's sources and says how many it left out", () => {
    const draw = (r: Road, stepId: string, province: string) => {
      const scenario = inventedIdea({ province: province as "ON" });
      const result = evaluateRoad({
        ...cockpitInput({
          road: r,
          roadChosen: true,
          skillItems: skillItemsV2026,
          scenario,
          figures: [],
          personFigures: [],
          future: { forkPicks: {}, targetMonth: null },
          progress: [],
          skillMarks: [],
          job: null,
          today: TODAY,
        }),
      });
      return renderToStaticMarkup(
        createElement(StepPanel, {
          road: r,
          step: stepOf(r, stepId),
          evaluation: result.steps.find((s) => s.stepId === stepId)!,
          rules: result.rules,
          skillItems: skillItemsV2026,
          marks: new Map(),
          selectedSkillId: null,
          branch: null,
          canSave: true,
          error: null,
          job: null,
          onStatus: () => {},
          onTicks: () => {},
          onMark: () => {},
          onSelectSkill: () => {},
          onOpenJobList: () => {},
          onProposeQuote: async () => null,
          province,
          ownNumber: null,
          onOwnNumberChange: () => {},
          onClose: () => {},
        }),
      );
    };
    const bcPage = hire.citations.find((c) => c.jurisdiction === "BC")!.url;
    const onPage = hire.citations.find((c) => c.jurisdiction === "ON")!.url;
    const ontario = draw(road, "branch-hire-first-employee", "ON");
    expect(ontario).toContain(onPage);
    expect(ontario).not.toContain(bcPage);
    expect(ontario).toContain("Sources for this stage · 3");
    expect(ontario).toContain("1 source for other provinces isn&#x27;t shown.");
    // Yukon: both provinces' pages left out, said in the plural.
    expect(draw(road, "branch-hire-first-employee", "YT")).toContain("2 sources for other provinces aren&#x27;t shown.");
    // A step that cites no other province's page says nothing about it.
    expect(draw(road, "step-start-keep-records", "ON")).not.toContain("other provinces");
    // Road 0, opened from Ontario: every source, as before.
    const onRoad0 = draw(road0, "branch-hire-first-employee", "ON");
    expect(onRoad0).toContain(bcPage);
    expect(onRoad0).not.toContain("other provinces");
  });
});

describe("Export draws a step's sources the way the step panel and the plan do", () => {
  // Every map stage lit, so every stage's sources are in the export; hiring first, as the reviewer's run had it.
  const everyStage = (province: string): Scenario => {
    const idea = inventedIdea({ province: province as "ON", hireFirst: true });
    return { ...idea, state: { ...idea.state, activeNodeIds: cfeCatalogV2026.nodes.map((n) => n.id), ghostedNodeIds: [] } };
  };
  const hire = stepOf(road, "branch-hire-first-employee");
  const bcPage = hire.citations.find((c) => c.jurisdiction === "BC")!.url;
  const onPage = hire.citations.find((c) => c.jurisdiction === "ON")!.url;
  const nameOnlyInAlberta = stepOf(road0, "branch-service-vs-productize").citations.find((c) => c.jurisdiction === "AB")!.url;
  const exportOf = (scenario: Scenario, r?: Road) => buildPlaybookSkeleton(cfeCatalogV2026.nodes, scenario, r);

  it("on the federal road, an Ontario idea's export has the federal pages and Ontario's, not British Columbia's or Alberta's, and counts them", () => {
    const skeleton = exportOf(everyStage("ON"), road);
    const md = renderPlaybookMarkdown(skeleton);
    expect(md).toContain(onPage);
    expect(md).not.toContain(bcPage);
    expect(md).not.toContain(nameOnlyInAlberta);
    expect(new Set(skeleton.sections.flatMap((s) => s.citations.map((c) => c.jurisdiction)))).toEqual(new Set(["CA", "ON"]));
    // Each section says how many it left out, in the step panel's words; the Branch points section left out both.
    const branch = skeleton.sections.find((s) => s.stageKey === "branch")!;
    expect(branch.sourcesLeftOut).toBe(2);
    expect(md).toContain(cockpitWords.panel.sourcesOtherProvinces(2));
    // Yukon: no page of its own here, so the federal pages only.
    const yukon = exportOf(everyStage("YT"), road);
    expect(new Set(yukon.sections.flatMap((s) => s.citations.map((c) => c.jurisdiction)))).toEqual(new Set(["CA"]));
  });

  it("on road 0 every source is in the export, whoever opens it, as before", () => {
    const md = renderPlaybookMarkdown(exportOf(everyStage("ON"), road0));
    expect(md).toContain(bcPage);
    expect(md).toContain(nameOnlyInAlberta);
    expect(md).not.toContain("other provinces");
    // No road named is the export as it was: every source.
    expect(exportOf(everyStage("ON"), road0)).toEqual(exportOf(everyStage("ON")));
  });

  it("the export route builds for the road the cockpit draws, and refuses a road it doesn't know", async () => {
    const ask = (body: unknown) =>
      postPlaybook(new Request("http://localhost/api/playbook", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }));
    const scenario = everyStage("ON");
    const federal = await ask({ scenario, roadId: FEDERAL_ROAD_ID });
    expect(federal.status).toBe(200);
    const md = renderPlaybookMarkdown(((await federal.json()) as { skeleton: PlaybookSkeleton }).skeleton);
    expect(md).toContain(onPage);
    expect(md).not.toContain(bcPage);
    const general = await ask({ scenario, roadId: road0.id });
    expect(renderPlaybookMarkdown(((await general.json()) as { skeleton: PlaybookSkeleton }).skeleton)).toContain(bcPage);
    expect((await ask({ scenario, roadId: "road-nobody-wrote" })).status).toBe(400);
  });
});

describe("the cockpit's goal bar and the plan name the province whose own steps aren't written yet", () => {
  it("the line, by road and place", () => {
    expect(goalRoadLine(road, "ON")).toBe("Future: The federal steps for any business in Canada · Ontario's own steps aren't written yet");
    expect(goalRoadLine(road, "NU")).toBe("Future: The federal steps for any business in Canada · Nunavut's own steps aren't written yet");
    // An Alberta road opened from outside Alberta still says which map is drawn (unchanged).
    expect(goalRoadLine(road0, "ON")).toBe("Map drawn: Starting any business in Alberta (tax and structure) · written for AB; this idea is in ON");
    expect(goalRoadLine(road0, "AB")).toBe("Future: Starting any business in Alberta (tax and structure)");
    // Alberta has a road of its own, so the federal road there is only named.
    expect(goalRoadLine(road, "AB")).toBe("Future: The federal steps for any business in Canada");
  });

  it("the goal bar draws it", () => {
    const scenario = inventedIdea({ province: "ON" });
    const input = cockpitInput({
      road,
      roadChosen: true,
      skillItems: skillItemsV2026,
      scenario,
      figures: [],
      personFigures: [],
      future: { forkPicks: {}, targetMonth: null },
      progress: [],
      skillMarks: [],
      job: null,
      today: TODAY,
    });
    const html = renderToStaticMarkup(
      createElement(GoalBar, {
        road,
        scenario,
        evaluation: evaluateRoad(input),
        firstWords: null,
        destination: null,
        target: null,
        active: null,
        onGauge: () => {},
      }),
    );
    expect(html).toContain("Future: The federal steps for any business in Canada · Ontario&#x27;s own steps aren&#x27;t written yet");
  });

  it("the plan says the same, and lists each step's sources for the place with the same line", () => {
    const scenario = inventedIdea({ province: "ON" });
    const input = cockpitInput({
      road,
      roadChosen: true,
      skillItems: skillItemsV2026,
      scenario,
      figures: [],
      personFigures: [],
      future: { forkPicks: {}, targetMonth: null },
      progress: [],
      skillMarks: [],
      job: null,
      today: TODAY,
    });
    const plan = buildPlan({
      ideaName: "Invented (test only)",
      input,
      kept: { progress: [], skillMarks: [], forkPickedOn: {}, targetMonthSetOn: null, figures: [], incomeWantedOn: null },
      firstWords: null,
      destination: null,
      incomeWanted: null,
      roadChosenOn: TODAY,
      jobPickedOn: null,
      today: TODAY,
    });
    expect(plan.road.future).toBe("Future: The federal steps for any business in Canada · Ontario's own steps aren't written yet");
    const hire = plan.steps.columns.flatMap((c) => c.steps).find((s) => s.id === "branch-hire-first-employee")!;
    expect(hire.sources).toHaveLength(3);
    expect(hire.sourcesLeftOut).toBe("1 source for other provinces isn't shown.");
    const records = plan.steps.columns.flatMap((c) => c.steps).find((s) => s.id === "step-start-keep-records")!;
    expect(records.sourcesLeftOut).toBeNull();
  });

  it("the new sentences carry no verdict and no time", () => {
    const sentences = [
      cockpitWords.goal.federal(road.label, "Ontario"),
      cockpitWords.panel.sourcesOtherProvinces(1),
      cockpitWords.panel.sourcesOtherProvinces(2),
      // Pick a future's (lib/front-door/words.ts), the spec's words block.
      road.label,
      pickWords.canadaHeading,
      pickWords.albertaHeading,
      pickWords.federalOnly("Ontario"),
      pickWords.showAlberta(1),
      pickWords.showAlberta(2),
      pickWords.hideAlberta,
    ];
    for (const s of sentences) {
      expect(findVerdicts(s), s).toEqual([]);
      expect(findTimeWords(s), s).toEqual([]);
    }
  });
});
