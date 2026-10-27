/**
 * The screen review of 2026-10-23 (pre-release fixes, "Phone and layout"): plainer screens.
 *
 * - The typed way numbers its screens once, from the first to the last: Screen B said "3 of 3 · Ground it" and the
 *   next screen "1 of 3 · Your work".
 * - The step panel shows a legal requirement (an ID number, an agreement) under "What it needs", not as a skill;
 *   the Skills gauge, its list and its switch over the map count legal requirements apart from skills too.
 * - The Structure ladder is drawn only on the tax and structure roads, in plain words.
 * - Your destination names the right cause when DotAmi's own server doesn't answer.
 * - A future's card says in one sentence what "checked by a tool only" means.
 */
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { SkillsListPanel } from "@/components/cockpit/gauge-panels";
import { OverlaySwitches } from "@/components/cockpit/overlay-switches";
import { StepPanel } from "@/components/cockpit/step-panel";
import { StructureLadderRail } from "@/components/cockpit/structure-ladder-rail";
import { FutureCardItem } from "@/components/front-door/future-card";
import { JobAndRoadSteps } from "@/components/front-door/job-and-road-steps";
import { notToldYet } from "@/lib/cockpit/told";
import { gaugeView, overlayCounts } from "@/lib/cockpit/view";
import { cockpitWords } from "@/lib/cockpit/words";
import {
  drawsTheStructureLadder,
  roadApprenticeToOwnShopAB,
  roadFederalStepsCA,
  roadForPlace,
  roadsV2026,
  roadStartingAnyBusinessAB,
  skillItemsForPlace,
  skillItemsV2026,
} from "@/lib/engines/roads/v2026";
import { futureCards, listedRoads } from "@/lib/front-door/futures";
import { destinationReceipt, incomeNotKeptLine, wordsNotKept } from "@/lib/front-door/receipts";
import { roadJobNames } from "@/lib/front-door/road-jobs";
import { FIRST_STEP } from "@/lib/front-door/three-steps";
import { TYPED_WAY_SCREENS, typedWayCount } from "@/lib/front-door/typed-way";
import { destinationWords, pickWords, typedWayWords } from "@/lib/front-door/words";
import { structureLadderV2026 } from "@/lib/engines/structure/v2026";
import { evaluateRoad, roadReceipt } from "@/lib/roads";
import { changed, manyAnswers, manyTakenBack } from "@/lib/roads/words";

import { input, inventedIdea, roadToEvaluate, TODAY } from "./helpers/road-to-evaluate";
import { findTimeWords } from "./helpers/time-words";
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

describe("the Skills gauge, its list and its switch: a legal requirement is not counted as a skill", () => {
  // A review of this branch (2026-10-23): with the step panel fixed, the Skills gauge on road 1 still read
  // "0 have · 0 learning · 0 not yet / 3 not marked, out of 3 listed", its switch "Skills · 3 listed", and its
  // list put the Alberta Student Number, the apprenticeship agreement and the certificate under the road's
  // skills. Every item road 1's steps list is a legal requirement.
  const road = roadApprenticeToOwnShopAB;
  const kindOf = new Map(skillItemsV2026.map((i) => [i.id, i.kind]));
  const items = [...new Set(road.steps.flatMap((s) => s.needs))];
  const requirements = items.filter((id) => kindOf.get(id) === "legal-requirement");
  const roadInput = input({ road, skillItems: [...skillItemsV2026] });
  const result = evaluateRoad(roadInput);
  const gauge = gaugeView(result, road, inventedIdea()).skills;
  const label = skillItemsV2026.find((i) => i.id === requirements[0])!.label;

  it("road 1 lists legal requirements only (what the checks below rest on)", () => {
    expect(requirements.length).toBeGreaterThan(1);
    expect(requirements).toHaveLength(items.length);
  });

  it("the gauge says no skills are listed, and counts the legal requirements apart from skills", () => {
    expect(gauge.value).toBe("No skills are listed on this road yet");
    const lines = gauge.lines.join(" | ");
    expect(lines).not.toContain(`out of ${items.length} listed`);
    expect(lines).toContain(`${requirements.length} legal requirements, apart from skills: ${requirements.length} not marked`);
  });

  it("the Skills switch over the map counts no skill and names the legal requirements; it still lights each step's needs", () => {
    const counts = overlayCounts(road, result, inventedIdea());
    const html = renderToStaticMarkup(createElement(OverlaySwitches, { overlays: { skills: true, money: false, rules: false }, counts, onToggle: () => {} }));
    expect(shown(html)).toContain(`Skills · 0 listed · ${requirements.length} legal requirements`);
    expect(html).toMatch(/aria-pressed="true"[^>]*>Skills/);
  });

  it("the list draws them under Legal requirements, apart from the road's skills, which says none are listed", () => {
    const text = shown(
      renderToStaticMarkup(
        createElement(SkillsListPanel, {
          road,
          skillItems: [...skillItemsV2026],
          marks: [],
          selectedSkillId: null,
          canSave: true,
          error: null,
          job: null,
          jobPickedOn: null,
          onMark: () => {},
          onSelectSkill: () => {},
          onPickJob: () => {},
          onClose: () => {},
        }),
      ),
    );
    expect(text).not.toContain("Skills on this road ");
    const requirementsAt = text.indexOf("Legal requirements on this road's steps");
    const skillsAt = text.indexOf("Skills on this road's steps");
    expect(requirementsAt).toBeGreaterThan(-1);
    expect(text.indexOf(label)).toBeGreaterThan(requirementsAt);
    expect(skillsAt).toBeGreaterThan(text.indexOf(label));
    expect(text.slice(skillsAt)).toContain(cockpitWords.lists.skillsNone);
  });

  it("What you haven't told yet asks for marks on the legal requirements, not on skills", () => {
    const row = notToldYet(roadInput, result).find((r) => r.id === "skills");
    expect(row?.question).toBe(`Your marks on ${requirements.length} legal requirements not marked`);
  });

  it("planted control: a road with both counts each apart (the invented road: 4 listed skills, 1 legal requirement)", () => {
    const mixed = evaluateRoad(input());
    const view = gaugeView(mixed, roadToEvaluate(), inventedIdea()).skills;
    expect(view.value).toBe("0 have · 0 learning · 0 not yet");
    expect(view.lines).toContain("4 not marked, out of 4 listed");
    expect(view.lines).toContain("1 legal requirement, apart from skills: 1 not marked");
    expect(overlayCounts(roadToEvaluate(), mixed, inventedIdea())).toMatchObject({ skillsListed: 4, requirementsListed: 1 });
    expect(notToldYet(input(), mixed).find((r) => r.id === "skills")?.question).toBe("Your marks on 4 skills and 1 legal requirement not marked");
  });

  it("the new words carry no verdict and no time", () => {
    const all = [
      cockpitWords.gauges.skills.requirements(3, 1, 0, 1, 1),
      cockpitWords.road.skillsCount(0, 3),
      cockpitWords.lists.skillsTitle,
      cockpitWords.lists.requirementsTitle,
      cockpitWords.lists.roadTitle,
      cockpitWords.questions.skills.question(2, 3),
    ]
      .join(" ")
      .toLowerCase();
    expect(all).not.toMatch(VERDICT_WORDS);
    expect(all).not.toMatch(/\b(day|days|week|weeks|month|months|year|years|soon|quick)\b/);
  });
});

describe("seen from another province, legal requirements left out are said as legal requirements, not as skills", () => {
  // The merge with main (2026-10-25): #207's lines for a section the idea's place left empty said "The skills this
  // step lists rest on other provinces' pages" for road 1's Alberta Student Number seen from Ontario, a legal
  // requirement. Now What it needs says it, and Skills it needs says none is written.
  const road = roadForPlace(roadApprenticeToOwnShopAB, "ON");
  const items = skillItemsForPlace(skillItemsV2026, "ON");
  const step = road.steps.find((s) => s.id === "step-shop-register-apprentice")!;
  const result = evaluateRoad(input({ road, roadChosen: true, skillItems: [...skillItemsV2026] }));

  it("the step panel: What it needs says the legal requirements rest on other provinces' pages", () => {
    const text = shown(
      renderToStaticMarkup(
        createElement(StepPanel, {
          road,
          step,
          evaluation: result.steps.find((s) => s.stepId === step.id)!,
          rules: result.rules,
          skillItems: items,
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
          province: "ON",
          ownNumber: null,
          onOwnNumberChange: () => {},
          onClose: () => {},
        }),
      ),
    );
    const needsAt = text.indexOf(cockpitWords.panel.whatItNeeds);
    const skillsAt = text.indexOf(cockpitWords.panel.skills);
    expect(needsAt).toBeGreaterThan(-1);
    expect(text.slice(needsAt, skillsAt)).toContain(cockpitWords.panel.requirementsNoneForPlace);
    expect(text.slice(skillsAt)).toContain(cockpitWords.panel.skillsNone);
    expect(text).not.toContain(cockpitWords.panel.skillsNoneForPlace);
  });

  it("the Skills list: its legal requirements' heading says so, its skills' heading says none is listed", () => {
    const text = shown(
      renderToStaticMarkup(
        createElement(SkillsListPanel, {
          road,
          skillItems: items,
          marks: [],
          selectedSkillId: null,
          canSave: true,
          error: null,
          job: null,
          jobPickedOn: null,
          onMark: () => {},
          onSelectSkill: () => {},
          onPickJob: () => {},
          onClose: () => {},
        }),
      ),
    );
    const requirementsAt = text.indexOf(cockpitWords.lists.requirementsTitle);
    const skillsAt = text.indexOf(cockpitWords.lists.roadTitle);
    expect(requirementsAt).toBeGreaterThan(-1);
    expect(text.slice(requirementsAt, skillsAt)).toContain(cockpitWords.lists.requirementsNoneForPlace);
    expect(text.slice(skillsAt)).toContain(cockpitWords.lists.skillsNone);
    expect(text).not.toContain(cockpitWords.lists.skillsNoneForPlace);
  });

  it("the Skills gauge: no skills listed, and a line for the legal requirements left out", () => {
    const gauge = gaugeView(result, road, inventedIdea({ province: "ON" })).skills;
    expect(gauge.value).toBe(cockpitWords.gauges.skills.noneListed);
    expect(gauge.lines).toContain(cockpitWords.gauges.skills.requirementsNoneForPlace);
  });

  it("the new words carry no verdict", () => {
    for (const line of [cockpitWords.panel.requirementsNoneForPlace, cockpitWords.lists.requirementsNoneForPlace, cockpitWords.gauges.skills.requirementsNoneForPlace]) {
      expect(line).not.toMatch(VERDICT_WORDS);
    }
  });
});

describe("a future's card on Pick a future: a legal requirement is not counted as a skill", () => {
  // The same review fix, on the card that opens the road: the apprentice road's card read "3 skills listed" for its
  // Alberta Student Number, apprenticeship agreement and certificate (2026-10-24).
  const kindOf = new Map(skillItemsV2026.map((i) => [i.id, i.kind]));
  // In Alberta, as Pick a future draws them for a person there: the place is a province code, "AB", as the catalogs'
  // citations name it (until the review of #209's merge this passed none, so the road as written was counted).
  const cards = futureCards(listedRoads(roadsV2026, "AB"), skillItemsV2026, "AB");
  const cardText = (roadId: string) =>
    shown(
      renderToStaticMarkup(
        createElement(FutureCardItem, { card: cards.find((c) => c.roadId === roadId)!, personPlace: "AB", personPlaceLabel: "Alberta", opening: null, onLookInside: () => {} }),
      ),
    );

  it("the apprentice road's card says no skills are listed, and names its legal requirements apart", () => {
    const items = [...new Set(roadApprenticeToOwnShopAB.steps.flatMap((s) => s.needs))];
    expect(items.every((id) => kindOf.get(id) === "legal-requirement")).toBe(true);
    const text = cardText(roadApprenticeToOwnShopAB.id);
    expect(text).not.toContain(`${items.length} skills listed`);
    expect(text).toContain(`0 skills listed · ${items.length} legal requirements ·`);
  });

  it("every card's two counts add up to the items its road lists, each counted by its kind", () => {
    for (const card of cards) {
      const road = roadsV2026.find((r) => r.id === card.roadId)!;
      const items = [...new Set(road.steps.flatMap((s) => s.needs))];
      const legal = items.filter((id) => kindOf.get(id) === "legal-requirement").length;
      expect([card.skillsListed, card.requirementsListed], card.roadId).toEqual([items.length - legal, legal]);
    }
  });

  it("from Ontario: road 1 lists no skill and no legal requirement; road 0 only its legal requirements with a federal source", () => {
    const fromOntario = futureCards(listedRoads(roadsV2026, "ON"), skillItemsV2026, "ON");
    const road1 = fromOntario.find((c) => c.roadId === roadApprenticeToOwnShopAB.id)!;
    expect([road1.skillsListed, road1.requirementsListed]).toEqual([0, 0]);
    // Road 0's legal requirements resting on a federal page (or Ontario's): the ones its card counts from Ontario.
    const road0 = fromOntario.find((c) => c.roadId === roadStartingAnyBusinessAB.id)!;
    const road0Items = [...new Set(roadStartingAnyBusinessAB.steps.flatMap((s) => s.needs))].flatMap((id) => skillItemsV2026.filter((i) => i.id === id));
    const federal = road0Items.filter((i) => i.kind === "legal-requirement" && i.citations.some((c) => c.jurisdiction === "CA" || c.jurisdiction === "ON"));
    expect(federal.length).toBeGreaterThan(0);
    expect(road0.requirementsListed).toBe(federal.length);
    // Control: in Alberta the same cards count road 1's three legal requirements, so the check above can see them.
    expect(cards.find((c) => c.roadId === roadApprenticeToOwnShopAB.id)!.requirementsListed).toBe(3);
  });

  it("planted control: a road with no legal requirement keeps the line as it was", () => {
    expect(pickWords.counts(4, 2, 0, 1, 3)).toBe("4 steps · 2 skills listed · 1 official fee found · 3 cost lines you'd price");
    expect(pickWords.counts(4, 2, 1, 1, 3)).toBe("4 steps · 2 skills listed · 1 legal requirement · 1 official fee found · 3 cost lines you'd price");
  });
});

describe("a receipt never calls a legal requirement a skill", () => {
  // The review of #209's merge (2026-10-26): the receipts said "you marked 3 skills" and "3 steps now have every skill
  // they list marked have" for road 1's Alberta Student Number, apprenticeship agreement and certificate, all legal
  // requirements, while the Skills gauge counts them apart from skills.
  const ROAD_1_ITEMS = ["skill-ab-alberta-student-number", "skill-ab-apprenticeship-education-agreement", "skill-ab-recognized-outside-trade-certificate"];
  const on1 = (marked: readonly string[]) =>
    evaluateRoad(
      input({
        road: roadApprenticeToOwnShopAB,
        skillItems: skillItemsV2026,
        skillMarks: marked.map((skillItemId) => ({ skillItemId, ownLabel: null, mark: "have" as const })),
      }),
    );

  it("three marked on road 1: counted as legal requirements, and every line names them so", () => {
    expect(ROAD_1_ITEMS.every((id) => skillItemsV2026.find((i) => i.id === id)?.kind === "legal-requirement")).toBe(true);
    const lines = roadReceipt(on1([]), on1(ROAD_1_ITEMS));
    expect(lines.length).toBeGreaterThan(0);
    for (const line of lines) {
      expect(line).toMatch(/^Because you marked 3 legal requirements, /);
      expect(line).not.toMatch(/\bskills?\b/);
    }
    expect(lines).toContain("Because you marked 3 legal requirements, 5 steps now have every legal requirement they list marked have.");
    expect(lines).toContain("Because you marked 3 legal requirements, the legal requirements now read 3 have, 0 learning, 0 not yet, 0 not marked.");
  });

  it("three taken back on road 1: counted as legal requirements taken back", () => {
    const lines = roadReceipt(on1(ROAD_1_ITEMS), on1([]));
    expect(lines.length).toBeGreaterThan(0);
    for (const line of lines) {
      expect(line).toMatch(/^Because you took back your marks on 3 legal requirements, /);
      expect(line).not.toMatch(/\bskills?\b/);
    }
  });

  it("control: three skills marked on a road that lists skills are still counted as skills", () => {
    const marks = ["skill-eval-math", "skill-eval-drawings", "skill-eval-quoting"].map((skillItemId) => ({ skillItemId, ownLabel: null, mark: "have" as const }));
    const lines = roadReceipt(evaluateRoad(input()), evaluateRoad(input({ skillMarks: marks })));
    expect(lines[0]).toBe("Because you marked 3 skills, 2 steps now have every skill they list marked have.");
  });

  it("the new words carry no verdict and no time", () => {
    const all = [
      changed.requirementsNoneForPlace,
      changed.requirements(1, 0, 0, 2),
      changed.allRequirementsHave(1),
      changed.allRequirementsHave(2),
      changed.notAllRequirementsHave(1),
      changed.notAllRequirementsHave(2),
      manyAnswers("requirement", 3),
      manyTakenBack("requirement", 3),
    ];
    for (const line of all) {
      expect(line).not.toMatch(VERDICT_WORDS);
      expect(findTimeWords(line)).toEqual([]);
      expect(line).not.toMatch(/\bskills?\b/);
    }
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
    for (const name of Object.values(cockpitWords.rail.ladder.rungs)) expect(text).toContain(name);
  });

  // The review of #209's merge (2026-10-26): each rung had a line defining the set-up in DotAmi's own words, with no
  // citation behind it ("A corporation, owned and controlled in Canada." for a CCPC, which is not what makes one).
  // DotAmi makes no tax or legal claim in its own voice: a rung is its plain name and nothing more.
  it("draws each rung as its plain name only, with no definition in DotAmi's own words", () => {
    for (const active of [null, "structure-ccpc"] as const) {
      const html = renderToStaticMarkup(createElement(StructureLadderRail, { activeStepId: active }));
      const rungs = [...html.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/g)].map((m) => shown(m[1]!).trim());
      const status = (i: number) => {
        const at = structureLadderV2026.findIndex((step) => step.id === active);
        const ladder = cockpitWords.rail.ladder;
        return active === null ? "" : i === at ? `${ladder.current} ` : i < at ? `${ladder.passed} ` : `${ladder.ahead} `;
      };
      expect(rungs).toEqual(structureLadderV2026.map((step, i) => `${status(i)}${cockpitWords.rail.ladder.rungs[step.id]}`));
    }
    for (const definition of ["owned and controlled", "sole proprietorship", "holds shares", "holds property", "account for the sales tax"]) {
      expect(JSON.stringify(cockpitWords.rail.ladder)).not.toContain(definition);
    }
  });

  it("the words carry no verdict and no time", () => {
    const all = JSON.stringify(cockpitWords.rail.ladder).toLowerCase();
    expect(all).not.toMatch(VERDICT_WORDS);
    expect(all).not.toMatch(/\b(day|days|week|weeks|month|months|year|years|soon|quick)\b/);
  });
});

// Since the merge with main (2026-10-25) the cause is worked out by #210's `wordsNotKept` and `incomeNotKeptLine`
// (lib/front-door/receipts.ts; tests/front-door.spec.ts), which landed first and say the same: these keep
// this pull request's checks, on those functions.
describe("Your destination names the cause when DotAmi's own server doesn't answer", () => {
  it("no answer from the server: says so, not that no database was reachable", () => {
    const outcome = wordsNotKept(null, "Words", TODAY);
    if (!("held" in outcome)) throw new Error("no answer at all should hold the words");
    const receipt = destinationReceipt(outcome.held);
    expect(receipt).toBe(destinationWords.receipts.destinationNoAnswer);
    expect(receipt).toContain("the server didn't answer");
    expect(receipt).not.toContain("database");
  });

  it("the server answered that no database was reachable: that receipt stays", () => {
    const outcome = wordsNotKept({ status: 503, body: null }, "Words", TODAY);
    if (!("held" in outcome)) throw new Error("a 503 should hold the words");
    expect(destinationReceipt(outcome.held)).toBe(destinationWords.receipts.destinationTabOnly);
  });

  it("the income's own failure says the server didn't answer, not that the words stay in this tab", () => {
    expect(incomeNotKeptLine(null)).toBe(destinationWords.receipts.incomeNoAnswer);
    expect(incomeNotKeptLine(null)).toContain("the server didn't answer");
    expect(incomeNotKeptLine(null)).not.toContain("tab");
  });
});

describe("a future's card says what 'checked by a tool only' means", () => {
  // "AB", a province code, as the catalogs' citations name it: "CA-AB" (the data file's code) matched no citation,
  // so the cards were counted as if every Alberta page were another province's (the review of #209's merge).
  const cards = futureCards(listedRoads(roadsV2026, "AB"), skillItemsV2026, "AB");
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
