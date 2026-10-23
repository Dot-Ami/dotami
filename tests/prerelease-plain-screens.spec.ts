/**
 * The screen review of 2026-10-23 (pre-release fixes, "Phone and layout"): plainer screens.
 *
 * - The typed way numbers its screens once, from the first to the last: Screen B said "3 of 3 · Ground it" and the
 *   next screen "1 of 3 · Your work".
 * - The step panel shows a legal requirement (an ID number, an agreement) under "What it needs", not as a skill.
 * - The Structure ladder is drawn only on the tax and structure roads, in plain words.
 * - Your destination names the right cause when DotAmi's own server doesn't answer.
 * - A future's card says in one sentence what "checked by a tool only" means.
 */
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { StepPanel } from "@/components/cockpit/step-panel";
import { StructureLadderRail } from "@/components/cockpit/structure-ladder-rail";
import { FutureCardItem } from "@/components/front-door/future-card";
import { JobAndRoadSteps } from "@/components/front-door/job-and-road-steps";
import { cockpitWords } from "@/lib/cockpit/words";
import {
  drawsTheStructureLadder,
  roadApprenticeToOwnShopAB,
  roadFederalStepsCA,
  roadsV2026,
  roadStartingAnyBusinessAB,
  skillItemsV2026,
} from "@/lib/engines/roads/v2026";
import { futureCards, listedRoads } from "@/lib/front-door/futures";
import { destinationReceipt } from "@/lib/front-door/receipts";
import { roadJobNames } from "@/lib/front-door/road-jobs";
import { FIRST_STEP } from "@/lib/front-door/three-steps";
import { TYPED_WAY_SCREENS, typedWayCount } from "@/lib/front-door/typed-way";
import { destinationWords, pickWords, typedWayWords } from "@/lib/front-door/words";
import { evaluateRoad } from "@/lib/roads";

import { input, TODAY } from "./helpers/road-to-evaluate";
import { VERDICT_WORDS } from "./helpers/verdict-words";

/** The text a person reads in drawn markup. */
const shown = (html: string) =>
  html
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ");

describe("the typed way numbers its screens once, from the first to the last", () => {
  it("a first idea: About you is 1, Pick a future the last, and no number repeats", () => {
    const labels = TYPED_WAY_SCREENS.map((screen) => typedWayCount(screen, true));
    expect(labels).toEqual([
      "1 of 6 · About you",
      "2 of 6 · Confirm",
      "3 of 6 · Ground it",
      "4 of 6 · Your work",
      "5 of 6 · Where you are",
      "6 of 6 · Pick a future",
    ]);
  });

  it("a second idea, which opens on Confirm (issue #38): Confirm is 1 of 5", () => {
    expect(TYPED_WAY_SCREENS.filter((s) => s !== "about").map((screen) => typedWayCount(screen, false))).toEqual([
      "1 of 5 · Confirm",
      "2 of 5 · Ground it",
      "3 of 5 · Your work",
      "4 of 5 · Where you are",
      "5 of 5 · Pick a future",
    ]);
  });

  it("on the intake page the steps carry the typed way's number, not Pick a future's own 1 of 3", () => {
    const listed = listedRoads(roadsV2026, "AB");
    const html = renderToStaticMarkup(
      createElement(JobAndRoadSteps, {
        host: "intake",
        state: FIRST_STEP,
        setState: () => {},
        place: "CA-AB",
        listed,
        roadJobs: roadJobNames(listed),
        stepCount: (part: "work" | "where" | "pick") => typedWayCount(part, true),
        onLookInside: async () => false,
      }),
    );
    expect(shown(html)).toContain("4 of 6 · Your work");
    expect(shown(html)).not.toContain("1 of 3");
  });

  it("the words carry no verdict", () => {
    for (const line of Object.values(typedWayWords.names)) expect(line).not.toMatch(VERDICT_WORDS);
  });
});

describe("the step panel: a legal requirement is what a step needs, not a skill", () => {
  // Road 1's "Register as a Cabinetmaker apprentice" needs the Alberta Student Number, a legal requirement.
  const road = roadApprenticeToOwnShopAB;
  const step = road.steps.find((s) => s.needs.length > 0 && s.needs.every((id) => skillItemsV2026.find((i) => i.id === id)?.kind === "legal-requirement"))!;
  const result = evaluateRoad(input({ road, skillItems: [...skillItemsV2026] }));
  const html = renderToStaticMarkup(
    createElement(StepPanel, {
      road,
      step,
      evaluation: result.steps.find((s) => s.stepId === step.id)!,
      rules: result.rules,
      skillItems: [...skillItemsV2026],
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
      province: "AB",
      ownNumber: null,
      onOwnNumberChange: () => {},
      onClose: () => {},
    }),
  );
  const text = shown(html);
  const label = skillItemsV2026.find((i) => i.id === step.needs[0])!.label;

  it("lists the requirement under What it needs, before the step's skills", () => {
    expect(text).toContain(cockpitWords.panel.whatItNeeds);
    const needsAt = text.indexOf(cockpitWords.panel.whatItNeeds);
    const skillsAt = text.indexOf(cockpitWords.panel.skills);
    expect(needsAt).toBeGreaterThan(-1);
    expect(text.indexOf(label)).toBeGreaterThan(needsAt);
    // Not among the skills: the Skills heading comes after it, and says none are listed for this step.
    expect(skillsAt).toBeGreaterThan(text.indexOf(label));
    expect(text.slice(skillsAt)).toContain(cockpitWords.panel.skillsNone);
  });
});

describe("the Structure ladder: only on the tax and structure roads, in plain words", () => {
  it("is drawn on road 0 and the federal steps, and not on the apprentice road", () => {
    expect(drawsTheStructureLadder(roadStartingAnyBusinessAB)).toBe(true);
    expect(drawsTheStructureLadder(roadFederalStepsCA)).toBe(true);
    expect(drawsTheStructureLadder(roadApprenticeToOwnShopAB)).toBe(false);
  });

  it("says each rung in plain words, without the catalog's jargon", () => {
    const text = shown(renderToStaticMarkup(createElement(StructureLadderRail, { activeStepId: null })));
    for (const jargon of ["Entity progression", "IP portfolio", "operating entities", "Estate freeze", "CCPC status", "Holdco", "commercial activity"]) {
      expect(text).not.toContain(jargon);
    }
    expect(text).toContain(cockpitWords.rail.ladder.title);
    for (const plain of Object.values(cockpitWords.rail.ladder.rungs)) {
      expect(text).toContain(plain.name);
      expect(text).toContain(plain.line);
    }
  });

  it("the words carry no verdict and no time", () => {
    const all = JSON.stringify(cockpitWords.rail.ladder).toLowerCase();
    expect(all).not.toMatch(VERDICT_WORDS);
    expect(all).not.toMatch(/\b(day|days|week|weeks|month|months|year|years|soon|quick)\b/);
  });
});

describe("Your destination names the cause when DotAmi's own server doesn't answer", () => {
  it("no answer from the server: says so, not that no database was reachable", () => {
    const receipt = destinationReceipt({ kept: "tab-only", text: "Words", saidAt: TODAY, cause: "no-server" });
    expect(receipt).toBe(destinationWords.receipts.destinationNoServer);
    expect(receipt).toContain("DotAmi's own server didn't answer");
    expect(receipt).not.toContain("database");
  });

  it("the server answered that no database was reachable: that receipt stays", () => {
    expect(destinationReceipt({ kept: "tab-only", text: "Words", saidAt: TODAY })).toBe(destinationWords.receipts.destinationTabOnly);
  });

  it("the income's own failure says the server didn't answer, not that the words stay in this tab", () => {
    expect(destinationWords.receipts.incomeNoServer).toContain("DotAmi's own server didn't answer");
    expect(destinationWords.receipts.incomeNoServer).not.toContain("tab");
  });
});

describe("a future's card says what 'checked by a tool only' means", () => {
  const cards = futureCards(listedRoads(roadsV2026, "AB"), skillItemsV2026, "CA-AB");
  const withTool = cards.find((c) => c.sources.tool > 0)!;
  const withoutTool = cards.find((c) => c.sources.tool === 0);
  const draw = (card: (typeof cards)[number]) =>
    shown(renderToStaticMarkup(createElement(FutureCardItem, { card, personPlace: "AB", personPlaceLabel: "Alberta", opening: null, onLookInside: () => {} })));

  it("one plain sentence under the sources line, on a card with sources checked by a tool", () => {
    expect(withTool).toBeDefined();
    const text = draw(withTool);
    expect(text).toContain(pickWords.sources.tool(withTool.sources.tool));
    expect(text).toContain(pickWords.sources.toolMeans);
    expect(pickWords.sources.toolMeans.split(/[.!?](\s|$)/).filter((s) => s.trim().length > 1)).toHaveLength(1);
  });

  it("not on a card with none", () => {
    if (withoutTool) expect(draw(withoutTool)).not.toContain(pickWords.sources.toolMeans);
  });
});
