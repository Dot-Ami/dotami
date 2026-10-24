/**
 * Places and programs (the maintainer's calls of 2026-10-23 on https://claude.ai/artifact/BVdUwZuHGHTgD12H9dHaey):
 *
 * - S2.5.33's bug 33a: Change on the place row of "What you've told DotAmi" edits this idea (a one-question box
 *   saved with the idea, the way the structure's is), where until now it opened the intake, which saves a second
 *   idea and leaves the first one in the wrong province; and once the place isn't Alberta, no Alberta area or
 *   region is shown (Your plan, About this job), though the columns stay kept for a later history (a-call-9).
 * - a-call-12: every road draws a step's sources for the person's own place (federal pages and their own
 *   province's), with the line counting the rest; Hire first employee cites Alberta's own employment-standards
 *   page, checked by a tool and waiting for a person's read.
 * - a-call-1: the Alberta Investor Tax Credit and the Canada-Alberta Job Grant are off the programs catalog and
 *   every road, each kept in the retired list with the official reason and the day it was read.
 * - The pull request's second review (2026-10-24): a tick on a line the new place leaves out is never lost; skill
 *   items, empty sections, the receipt, a quote kept on a hidden line, Pick a future's card counts and the rail's
 *   prep tools, each drawn for the idea's place.
 *
 * The end-to-end side (the idea count stays 1 in a real browser) is e2e/place-change.spec.ts.
 */
import { randomUUID } from "node:crypto";
import { existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import type { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { aboutJobForFuture } from "@/lib/about-job/view";
import { buildPlan } from "@/lib/cockpit/plan";
import { answerReceipt, compareEndings, toldRows } from "@/lib/cockpit/told";
import { cockpitInput, emptySectionLine, gaugeView, linkedSkill, roadSkillsNone } from "@/lib/cockpit/view";
import { cockpitWords } from "@/lib/cockpit/words";
import { createDatabaseClient } from "@/lib/db/client";
import { ensureVentureFromScenario } from "@/lib/db/ensure-venture-from-scenario";
import { parseFirstSave } from "@/lib/db/parse-scenario-input";
import { cfeCatalogV2026 } from "@/lib/engines/cfe/v2026";
import { grantsCatalogV2026 } from "@/lib/engines/grants/v2026";
import { RETIRED_GRANT_PROGRAMS } from "@/lib/engines/grants/v2026/programs";
import { templateIdsForPlace, templateReferencesV2026 } from "@/lib/engines/templates/v2026";
import {
  citationsForPlace,
  generalRoadV2026,
  roadApprenticeToOwnShopAB,
  roadForPlace,
  roadsV2026,
  skillItemsForPlace,
  skillItemsV2026,
  stepSourcesForPlace,
  type RoadStep,
  type SkillItem,
} from "@/lib/engines/roads/v2026";
import { readFuture } from "@/lib/futures/future";
import { readPlan } from "@/lib/futures/read-plan";
import { listStepProgress, setStepProgress } from "@/lib/futures/step-progress";
import { SHIPPED_ROADS_CATALOG, ticksToSave, type SkillMarkValue } from "@/lib/futures/types";
import type { FigureView } from "@/lib/figures/types";
import type { EngineCitation } from "@/lib/engines/shared/types";
import { evaluateRoad } from "@/lib/roads";
import { answer, changed } from "@/lib/roads/words";
import { PROVINCES } from "@/lib/scenarios/types";
import { demoScenarios } from "../prisma/seed-data";
import { fileUrl, migratedFile } from "./helpers/migrated-db";
import { findTimeWords } from "./helpers/time-words";
import { findVerdicts } from "./helpers/verdict-words";
import { inventedIdea, TODAY } from "./helpers/road-to-evaluate";

const BARBERS = "63210.02";
const NOW = new Date("2026-10-23T12:00:00Z");
// Hire first employee's "done when" lines on road 0: two on the CRA's pages, and one on the WCB-Alberta's,
// which the road drawn for any other province leaves out.
const STATUS = "dw-start-hire-status";
const BEFORE_PAY = "dw-start-hire-before-pay";
const WCB = "dw-start-hire-wcb";

describe("33a: the place row's Change edits this idea", () => {
  it("opens the one-question box on the cockpit, never the intake (which saves a second idea)", () => {
    const scenario = inventedIdea({ province: "AB" });
    const input = cockpitInput({
      road: generalRoadV2026,
      roadChosen: true,
      skillItems: [],
      scenario,
      figures: [],
      personFigures: [],
      future: null,
      progress: [],
      skillMarks: [],
      today: TODAY,
    });
    const evaluation = evaluateRoad(input);
    const kept = { progress: [], skillMarks: [], forkPickedOn: {}, targetMonthSetOn: null, figures: [], incomeWantedOn: null };
    const place = toldRows(input, evaluation, kept).find((row) => row.id === "idea:place");
    expect(place, "the told list has a place row").toBeDefined();
    expect(place!.change).toEqual({ kind: "box", question: "place" });
  });
});

describe("33a: no Alberta area or region shown once the idea's place isn't Alberta", () => {
  const dbFile = path.join(tmpdir(), `dotami-place-change-${randomUUID()}.db`);
  let prisma: PrismaClient;
  beforeAll(() => {
    migratedFile(dbFile);
    prisma = createDatabaseClient({ url: fileUrl(dbFile) });
  }, 120_000);
  afterAll(async () => {
    await prisma?.$disconnect();
    for (const f of [dbFile, `${dbFile}-journal`]) if (existsSync(f)) rmSync(f);
  });

  /** An Alberta idea picked with Calgary and region 4830, then saved again (the cockpit's save) in `province`. */
  async function movedIdea(province: "AB" | "ON" | "SK") {
    const scenario = { ...demoScenarios[0], id: `scenario-${randomUUID()}`, profile: { ...demoScenarios[0].profile, province: "AB" as const } };
    const firstSave = parseFirstSave({ job: BARBERS, area: "cma-825", region: "4830", roadId: generalRoadV2026.id }, NOW, "AB");
    const { ventureId } = await ensureVentureFromScenario(prisma, scenario, { ...firstSave, roadId: generalRoadV2026.id });
    // The cockpit's save of the same idea with its new place: the update branch, same scenario id.
    await ensureVentureFromScenario(prisma, { ...scenario, profile: { ...scenario.profile, province } });
    return ventureId;
  }

  /** Every line of the plan that names the area or the region the person picked in Alberta. */
  const albertaLines = (lines: readonly string[]) => lines.filter((line) => /Calgary|Your area|economic region/i.test(line));

  it("in Alberta, the area and region are shown (the check below can see them)", async () => {
    const id = await movedIdea("AB");
    const future = await readFuture(prisma, id, SHIPPED_ROADS_CATALOG);
    expect(future.area?.value).toBe("cma-825");
    expect(future.region?.value).toBe("4830");
    const plan = buildPlan((await readPlan(prisma, id, "2026-10-23"))!);
    expect(albertaLines(plan.road.where)).toHaveLength(2);
  });

  it("after a move out of Alberta: one idea, its new place, and no Alberta area or region in the plan or About this job", async () => {
    const before = await prisma.venture.count();
    const id = await movedIdea("ON");
    expect(await prisma.venture.count()).toBe(before + 1);
    const future = await readFuture(prisma, id, SHIPPED_ROADS_CATALOG);
    expect(future.place).toBe("CA-ON");
    expect(future.area).toBeNull();
    expect(future.region).toBeNull();
    const plan = buildPlan((await readPlan(prisma, id, "2026-10-23"))!);
    expect(albertaLines(plan.road.where)).toEqual([]);
    const about = aboutJobForFuture(future)!;
    expect(about.area).toBeNull();
    expect(about.wages.context.kind).toBe("outside-alberta");
    // Kept, not deleted: a later history of places (a-call-9) reads them.
    const row = await prisma.venture.findUniqueOrThrow({ where: { id }, select: { landscapeArea: true, economicRegion: true, province: true } });
    expect(row).toEqual({ landscapeArea: "cma-825", economicRegion: "4830", province: "ON" });
  });

  it("control: the plan's lines name the Alberta area when handed it, so the check above can fail", async () => {
    const id = await movedIdea("SK");
    const args = (await readPlan(prisma, id, "2026-10-23"))!;
    const planted = buildPlan({ ...args, where: { area: { value: "cma-825", setOn: "2026-10-23" }, region: null } });
    expect(albertaLines(planted.road.where)).toEqual(["Your area: Calgary · picked 2026-10-23"]);
  });

  /**
   * Every Alberta page, and every line resting on one, in the plan's steps and money: done-when lines and their
   * sources, official links, sources and cost lines. The road's own words (its name, its "written for AB" line,
   * each step's name and one-line summary: call 35) are the road part, not looked at here.
   */
  const albertaPagesIn = (plan: ReturnType<typeof buildPlan>) => {
    const pages = plan.steps.columns.flatMap((c) => c.steps).map((s) => ({ doneWhen: s.doneWhen, links: s.officialLinks, sources: s.sources }));
    return [...JSON.stringify({ pages, money: plan.money }).matchAll(/[^"]*(?:alberta\.ca|\.ab\.ca|Alberta)[^"]*/g)].map((m) => m[0]);
  };

  it("review of #207: after a move to Ontario on road 0, no Alberta page or Alberta-only line in the plan's steps or money", async () => {
    const id = await movedIdea("ON");
    const plan = buildPlan((await readPlan(prisma, id, "2026-10-23"))!);
    expect(albertaPagesIn(plan)).toEqual([]);
    // What was left out is counted on the step, never dropped without a word: Register your business name rests
    // on Alberta's pages only, so it says how many it left out.
    const name = plan.steps.columns.flatMap((c) => c.steps).find((s) => s.id === "step-start-register-name")!;
    expect(name.sourcesLeftOut).toMatch(/^\d+ sources? for other provinces/);
    // Second review of #207: and its done-when part says why it lists none, never that none is written yet.
    expect(name.doneWhenTitle).toBe(cockpitWords.panel.doneWhenNoneForPlace);
  });

  it("control: in Alberta the same check finds road 0's Alberta pages (alberta.ca, the WCB, the name fee)", async () => {
    const id = await movedIdea("AB");
    const found = albertaPagesIn(buildPlan((await readPlan(prisma, id, "2026-10-23"))!)).join("\n");
    expect(found).toMatch(/alberta\.ca\/register-business-name/);
    expect(found).toMatch(/wcb\.ab\.ca/);
    expect(found).toMatch(/Registry Agent Product Catalogue/);
  });

  /** An Alberta idea on road 0, and its save again in another place (the cockpit's save: the update branch). */
  async function ideaThatMoves() {
    const scenario = { ...demoScenarios[0], id: `scenario-${randomUUID()}`, profile: { ...demoScenarios[0].profile, province: "AB" as const } };
    const { ventureId } = await ensureVentureFromScenario(prisma, scenario, { ...parseFirstSave({}, NOW, "AB"), roadId: generalRoadV2026.id });
    const moveTo = (province: "AB" | "ON") => ensureVentureFromScenario(prisma, { ...scenario, profile: { ...scenario.profile, province } });
    return { ventureId, moveTo };
  }

  it("second review of #207: a tick on a line left out for the idea's new place is never lost, by another tick or by Take back", async () => {
    const { ventureId, moveTo } = await ideaThatMoves();
    const hire = { roadId: generalRoadV2026.id, stepId: "branch-hire-first-employee" };
    const keptTicks = async () => (await listStepProgress(prisma, ventureId)).find((p) => p.stepId === hire.stepId)!.doneWhenIds.sort();
    await setStepProgress(prisma, ventureId, { ...hire, doneWhenIds: [STATUS, WCB] });
    await moveTo("ON");
    // What the step panel sends from Ontario: the lines it draws there, the WCB-Alberta line not among them.
    await setStepProgress(prisma, ventureId, { ...hire, doneWhenIds: [STATUS, BEFORE_PAY] });
    expect(await keptTicks()).toEqual([BEFORE_PAY, STATUS, WCB]);
    // The told list's Take back of the step's ticks, from Ontario.
    await setStepProgress(prisma, ventureId, { ...hire, doneWhenIds: [] });
    expect(await keptTicks()).toEqual([WCB]);
    // Back in Alberta the line is drawn again, ticked.
    await moveTo("AB");
    const plan = buildPlan((await readPlan(prisma, ventureId, "2026-10-24"))!);
    const step = plan.steps.columns.flatMap((c) => c.steps).find((s) => s.id === hire.stepId)!;
    const ticked = step.doneWhen.filter((line) => line.ticked);
    expect(ticked).toHaveLength(1);
    expect(ticked[0].text).toContain("WCB-Alberta");
    // Control: where the line is drawn, a list without it unticks it.
    await setStepProgress(prisma, ventureId, { ...hire, doneWhenIds: [] });
    expect(await keptTicks()).toEqual([]);
    // From Ontario a save may still name the line left out there (any of the step's own lines), and it is kept.
    await moveTo("ON");
    await setStepProgress(prisma, ventureId, { ...hire, doneWhenIds: [WCB] });
    expect(await keptTicks()).toEqual([WCB]);
  });
});

describe("second review of #207: ticks kept across a change of place (ticksToSave, the storage's and the cockpit's)", () => {
  const written = generalRoadV2026.steps.find((s) => s.id === "branch-hire-first-employee")!;
  const drawnIn = (place: string) => roadForPlace(generalRoadV2026, place).steps.find((s) => s.id === written.id)!;

  it("a tick kept on a line the place leaves out stays, whatever list is sent from there", () => {
    expect(ticksToSave([STATUS, BEFORE_PAY], [STATUS, WCB], written, drawnIn("ON")).sort()).toEqual([BEFORE_PAY, STATUS, WCB]);
    // Take back from Ontario: the ticks on the lines drawn there go; the WCB-Alberta one stays.
    expect(ticksToSave([], [STATUS, WCB], written, drawnIn("ON"))).toEqual([WCB]);
  });

  it("control: where every line is drawn, the list sent is the list kept", () => {
    expect(ticksToSave([], [STATUS, WCB], written, drawnIn("AB"))).toEqual([]);
    expect(ticksToSave([STATUS], [STATUS, WCB], written, drawnIn("AB"))).toEqual([STATUS]);
  });

  it("a kept id that is no line of the step is dropped, as before", () => {
    expect(ticksToSave([STATUS], [STATUS, "dw-gone"], written, drawnIn("ON"))).toEqual([STATUS]);
  });
});

describe("a-call-12: every road draws a step's sources for the person's own place", () => {
  const hire = generalRoadV2026.steps.find((s) => s.id === "branch-hire-first-employee")!;
  const places = (cs: readonly { jurisdiction: string }[]) => cs.map((c) => c.jurisdiction);

  it("Hire first employee on road 0 in Alberta: the CRA's pages and Alberta's, the other provinces' counted", () => {
    const ab = citationsForPlace(generalRoadV2026, hire.citations, "AB");
    expect(places(ab.shown)).toEqual(["CA", "CA", "AB"]);
    expect(ab.leftOut).toBe(2);
  });

  it("no road shows a page written for another province, in any province or territory", () => {
    for (const road of roadsV2026) {
      for (const step of road.steps) {
        for (const province of PROVINCES) {
          const { shown, leftOut } = citationsForPlace(road, step.citations, province);
          const other = shown.filter((c) => c.jurisdiction !== "CA" && c.jurisdiction !== province);
          expect(other.map((c) => `${road.id} · ${step.id} · ${province} · ${c.url}`)).toEqual([]);
          expect(shown.length + leftOut).toBe(step.citations.length);
        }
      }
    }
  });

  /** A step's done-when lines, cost lines and links that rest on a page for neither Canada nor `province`. */
  const otherProvincePages = (road: ReturnType<typeof roadForPlace>, province: string) => {
    // Every page the road cites anywhere (the written road, so a link can't escape by its lines being gone).
    const cited = generalRoadV2026.steps
      .concat(roadsV2026.flatMap((r) => r.steps))
      .flatMap((s) => [...s.citations, ...s.doneWhen.map((l) => l.citation), ...s.costs.flatMap((c) => (c.kind === "official-fee" ? [c.citation] : c.nameSource ? [c.nameSource] : []))]);
    const pagesFor = new Set(cited.filter((c) => c.jurisdiction !== "CA" && c.jurisdiction !== province).map((c) => c.url));
    return road.steps.flatMap((step) => [
      ...step.doneWhen.filter((l) => l.citation.jurisdiction !== "CA" && l.citation.jurisdiction !== province).map((l) => `${step.id} · done when · ${l.citation.url}`),
      ...step.costs.flatMap((c) => {
        const src = c.kind === "official-fee" ? c.citation : c.nameSource;
        return src && src.jurisdiction !== "CA" && src.jurisdiction !== province ? [`${step.id} · cost · ${src.url}`] : [];
      }),
      ...step.officialLinks.filter((l) => pagesFor.has(l.url)).map((l) => `${step.id} · link · ${l.url}`),
    ]);
  };

  it("review of #207: no road, drawn for any province or territory, keeps a done-when line, cost line or link on another province's page", () => {
    for (const road of roadsV2026) {
      for (const province of PROVINCES) expect(otherProvincePages(roadForPlace(road, province), province), `${road.id} in ${province}`).toEqual([]);
    }
  });

  it("control: road 0 as written, drawn for Ontario, holds Alberta's name registry, WCB line and name fee", () => {
    const found = otherProvincePages(generalRoadV2026, "ON").join("\n");
    expect(found).toMatch(/step-start-register-name · done when · https:\/\/www\.alberta\.ca\/register-business-name/);
    expect(found).toMatch(/branch-hire-first-employee · done when · https:\/\/www\.wcb\.ab\.ca\//);
    expect(found).toMatch(/· cost · /);
    expect(found).toMatch(/· link · https:\/\/www\.alberta\.ca\/find-business-registry/);
  });

  it("in a road's own province nothing changes, and what is left out elsewhere is counted on its step", () => {
    for (const road of roadsV2026) {
      for (const province of road.provinces.filter((p) => p !== "CA")) {
        const drawn = roadForPlace(road, province);
        for (const step of road.steps) {
          const same = drawn.steps.find((s) => s.id === step.id)!;
          expect(
            [same.doneWhen, same.costs, same.officialLinks, same.needs, same.pagesLeftOutForPlace, same.leftOutForPlace],
            `${road.id} · ${step.id}`,
          ).toEqual([step.doneWhen, step.costs, step.officialLinks, step.needs, undefined, undefined]);
        }
      }
    }
    const inOntario = roadForPlace(generalRoadV2026, "ON");
    expect(inOntario.steps.map((s) => s.id)).toEqual(generalRoadV2026.steps.map((s) => s.id));
    const name = inOntario.steps.find((s) => s.id === "step-start-register-name")!;
    expect(name.doneWhen).toEqual([]);
    // Its own sources (all Alberta's) are counted by citationsForPlace; the pages only its lines and links rested on, here.
    expect(stepSourcesForPlace(inOntario, name, "ON").leftOut).toBe(citationsForPlace(inOntario, name.citations, "ON").leftOut + (name.pagesLeftOutForPlace ?? 0));
    expect(name.pagesLeftOutForPlace).toBeGreaterThan(0);
    const hire = inOntario.steps.find((s) => s.id === "branch-hire-first-employee")!;
    expect(hire.pagesLeftOutForPlace).toBe(1);
  });

  // Road 1's first step, and the one skill item it lists: Alberta Student Number, all of whose pages are Alberta's.
  const ASN = "skill-ab-alberta-student-number";
  const registerApprentice = (place: string) => roadForPlace(roadApprenticeToOwnShopAB, place).steps.find((s) => s.id === "step-shop-register-apprentice")!;

  it("second review of #207: no road drawn for any province or territory lists a skill item resting only on another province's pages", () => {
    const itemById = new Map(skillItemsV2026.map((item) => [item.id, item]));
    for (const road of roadsV2026) {
      for (const province of PROVINCES) {
        const listed = [...new Set(roadForPlace(road, province).steps.flatMap((s) => s.needs))];
        const elsewhere = listed.filter((id) => !itemById.get(id)!.citations.some((c) => c.jurisdiction === "CA" || c.jurisdiction === province));
        expect(elsewhere, `${road.id} in ${province}`).toEqual([]);
      }
    }
    // Road 1 from Ontario: the item leaves the step, kept on it as left out, and its pages are counted in the step's
    // one line (4 until now: the step's own two pages and its two high-school links; 7 with the item's three others).
    const step = registerApprentice("ON");
    expect(step.needs).toEqual([]);
    expect(step.leftOutForPlace?.needs).toEqual([ASN]);
    expect(stepSourcesForPlace(roadApprenticeToOwnShopAB, step, "ON").leftOut).toBe(7);
    // Control: in Alberta the step lists it.
    expect(registerApprentice("AB").needs).toEqual([ASN]);
  });

  it("second review of #207: skillItemsForPlace draws an item's sources and its way to get it for the place, and counts the rest", () => {
    const asn = skillItemsV2026.find((item) => item.id === ASN)!;
    const gst = skillItemsV2026.find((item) => item.id === "skill-ca-gst-hst-registration")!;
    // Planted: one federal page and one Alberta page, and its way to get it on a second Alberta page.
    const planted: SkillItem = {
      id: "skill-planted",
      label: "Planted",
      kind: "legal-requirement",
      citations: [gst.citations[0], asn.citations[1]],
      howToGetIt: { text: "Planted.", citation: asn.citations[2] },
    };
    const [inOntario] = skillItemsForPlace([planted], "ON");
    expect(inOntario.citations).toEqual([gst.citations[0]]);
    expect(inOntario.howToGetIt).toBeUndefined();
    expect(inOntario.sourcesLeftOutForPlace).toBe(2);
    // In Alberta nothing changes (the item is rebuilt, so equal, not the same object).
    expect(skillItemsForPlace([planted], "AB")).toEqual([planted]);
    expect(skillItemsForPlace(skillItemsV2026, "AB")).toEqual(skillItemsV2026);
    for (const province of PROVINCES) {
      for (const item of skillItemsForPlace(skillItemsV2026, province)) {
        const pages = [...item.citations, ...(item.howToGetIt ? [item.howToGetIt.citation] : [])];
        expect(pages.filter((c) => c.jurisdiction !== "CA" && c.jurisdiction !== province).map((c) => `${item.id} · ${province} · ${c.url}`)).toEqual([]);
      }
    }
  });

  it("second review of #207: a skill selected on the map stops dimming it while the idea's place leaves it out, and dims it again where it is listed", () => {
    expect(linkedSkill(roadForPlace(roadApprenticeToOwnShopAB, "ON"), ASN)).toBeNull();
    expect(linkedSkill(roadForPlace(roadApprenticeToOwnShopAB, "AB"), ASN)).toBe(ASN);
    expect(linkedSkill(roadForPlace(roadApprenticeToOwnShopAB, "AB"), null)).toBeNull();
  });

  it("Alberta's employment-standards page: checked by a tool, its words recorded, no read date (waiting for a person)", () => {
    const node = cfeCatalogV2026.nodes.find((n) => n.id === "branch-hire-first-employee")!;
    const alberta = (node.citations as readonly EngineCitation[]).filter((c) => c.jurisdiction === "AB");
    expect(alberta).toHaveLength(1);
    expect(alberta[0].url).toBe("https://www.alberta.ca/employment-standards");
    expect(alberta[0].lastVerified).toBeUndefined();
    expect(alberta[0].toolCheck?.checkedOn).toBe("2026-10-23");
    expect(alberta[0].toolCheck?.quotes).toContain("Employment standards set out the rights and obligations of employers and employees in Alberta.");
  });
});

describe("second review of #207: a section the place left empty says why, never that none is written yet", () => {
  const p = cockpitWords.panel;
  const registerName = (place: string) => roadForPlace(generalRoadV2026, place).steps.find((s) => s.id === "step-start-register-name")!;
  const road1 = (place: string) => roadForPlace(roadApprenticeToOwnShopAB, place);

  it("a step whose lines all rest on other provinces' pages says so, in each section", () => {
    // Road 0's Register your business name from Ontario: six done-when lines and two cost lines, all Alberta's.
    expect(emptySectionLine(registerName("ON"), "doneWhen")).toBe(p.doneWhenNoneForPlace);
    expect(emptySectionLine(registerName("ON"), "costs")).toBe(p.costsNoneForPlace);
    // Road 1's Register as a Cabinetmaker apprentice from Ontario: its one item, Alberta Student Number.
    const apprentice = road1("ON").steps.find((s) => s.id === "step-shop-register-apprentice")!;
    expect(emptySectionLine(apprentice, "skills")).toBe(p.skillsNoneForPlace);
  });

  it("control: a step with nothing written, or nothing left out, keeps the line saying none is written yet", () => {
    expect(emptySectionLine({}, "doneWhen")).toBe(p.doneWhenNone);
    expect(emptySectionLine({}, "skills")).toBe(p.skillsNone);
    expect(emptySectionLine({}, "costs")).toBe(p.costsNone);
    // Planted: road 0's step in Alberta with its lines taken away (no shipped step is written without any).
    const planted: RoadStep = { ...registerName("AB"), doneWhen: [] };
    expect(emptySectionLine(planted, "doneWhen")).toBe(p.doneWhenNone);
  });

  it("the Skills list and the Skills gauge say a road's skills rest on other provinces' pages when the place left them all out", () => {
    const forPlace = { list: cockpitWords.lists.skillsNoneForPlace, gauge: cockpitWords.gauges.skills.noneListedForPlace };
    expect(roadSkillsNone(road1("ON"))).toEqual(forPlace);
    // Control: a road listing nothing at all says none is listed yet.
    expect(roadSkillsNone({ steps: [] })).toEqual({ list: cockpitWords.lists.skillsNone, gauge: cockpitWords.gauges.skills.noneListed });
  });

  it("the new lines name no time and no verdict", () => {
    const lines = [p.doneWhenNoneForPlace, p.skillsNoneForPlace, p.costsNoneForPlace, cockpitWords.lists.skillsNoneForPlace, cockpitWords.gauges.skills.noneListedForPlace];
    for (const line of lines) {
      expect(line).toEqual(expect.any(String));
      expect([...findTimeWords(line), ...findVerdicts(line)], line).toEqual([]);
    }
  });
});

/** An agreed quote of $50 on road 0's registry agent's service fee, a named line resting on Alberta's page. */
const SERVICE_FEE: FigureView = {
  id: "f1",
  ventureId: "v",
  kind: "start-up-cost-line",
  periodStart: TODAY,
  periodEnd: TODAY,
  amountCents: 5000,
  currency: "CAD",
  sourceKind: "typed",
  sourceLabel: "typed by you",
  sourceRows: null,
  status: "confirmed",
  editedByPerson: false,
  proposedAt: "2026-10-20T12:00:00.000Z",
  confirmedAt: "2026-10-20T12:00:00.000Z",
  retractedAt: null,
  taxYear: null,
  formLine: null,
  costLine: { roadId: generalRoadV2026.id, stepId: "step-start-register-name", lineId: "cost-start-name-service-fee", amountFrom: "your-guess" },
};

/** The cockpit's input for one invented idea in `province`, with what the person told DotAmi about its road. */
function ideaIn(
  province: "AB" | "ON",
  told: {
    road?: typeof generalRoadV2026;
    figures?: FigureView[];
    progress?: { stepId: string; status: null; doneWhenIds: string[] }[];
    skillMarks?: { skillItemId: string; ownLabel: null; mark: SkillMarkValue }[];
  } = {},
) {
  return cockpitInput({
    road: told.road ?? generalRoadV2026,
    roadChosen: true,
    skillItems: skillItemsV2026,
    scenario: inventedIdea({ province }),
    figures: told.figures ?? [],
    personFigures: [],
    future: null,
    progress: told.progress ?? [],
    skillMarks: told.skillMarks ?? [],
    today: TODAY,
  });
}

describe("second review of #207: the receipt for a change of place names only the place", () => {
  const road0 = {
    figures: [SERVICE_FEE],
    progress: [
      { stepId: "branch-hire-first-employee", status: null, doneWhenIds: [STATUS, WCB] },
      { stepId: "step-start-register-name", status: null, doneWhenIds: ["dw-start-name-email"] },
    ],
  };

  it("on road 0, with ticks and a quote on lines the move leaves out: no tick or take back the person never made", () => {
    for (const [from, to, name] of [["AB", "ON", "Ontario"], ["ON", "AB", "Alberta"]] as const) {
      const lines = answerReceipt(ideaIn(from, road0), ideaIn(to, road0));
      expect(lines.length, `${from} to ${to}`).toBeGreaterThan(0);
      for (const line of lines) {
        expect(line).toMatch(new RegExp(`^Because you told us your place is ${name}, `));
        expect(line).not.toMatch(/you ticked|took back/);
      }
    }
  });

  it("on road 1, with marks on items the move leaves out: no mark taken back, and no step said to lose a mark", () => {
    const marks = {
      road: roadApprenticeToOwnShopAB,
      skillMarks: ["skill-ab-alberta-student-number", "skill-ab-apprenticeship-education-agreement"].map((skillItemId) => ({ skillItemId, ownLabel: null, mark: "have" as const })),
    };
    for (const [from, to] of [["AB", "ON"], ["ON", "AB"]] as const) {
      const lines = answerReceipt(ideaIn(from, marks), ideaIn(to, marks));
      expect(lines.length, `${from} to ${to}`).toBeGreaterThan(0);
      for (const line of lines) expect(line).not.toMatch(/no longer ha(s|ve) every skill|took back your mark|you told us you have/);
    }
  });

  // The third review of #207: away from Alberta the receipt said "the skills now read 0 have, 0 learning, 0 not yet, 0
  // not marked", as if the marks were gone, while the Skills gauge says the skills rest on other provinces' pages; back
  // in Alberta it said "4 steps now have every skill they list marked have", though the person marked nothing.
  const road1Marks = (marked: string[]) => ({
    road: roadApprenticeToOwnShopAB,
    skillMarks: marked.map((skillItemId) => ({ skillItemId, ownLabel: null, mark: "have" as const })),
  });
  const bothMarked = road1Marks(["skill-ab-alberta-student-number", "skill-ab-apprenticeship-education-agreement"]);

  it("on road 1, the skills' line says what the Skills gauge says, and no step is said to have every skill marked", () => {
    const away = answerReceipt(ideaIn("AB", bothMarked), ideaIn("ON", bothMarked));
    expect(away).toContain(`Because you told us your place is Ontario, ${changed.skillsNoneForPlace}.`);
    expect(away.join("\n")).not.toMatch(/the skills now read/);
    const back = answerReceipt(ideaIn("ON", bothMarked), ideaIn("AB", bothMarked));
    expect(back.join("\n")).not.toMatch(/every skill (it|they) lists? marked have/);
    // Moving back lists the items again with the person's marks on them: the counts, as the gauge shows them.
    expect(back).toContain("Because you told us your place is Alberta, the skills now read 2 have, 0 learning, 0 not yet, 1 not marked.");
  });

  it("control: in Alberta, marking a skill still says which steps now have every skill they list marked have", () => {
    const lines = answerReceipt(ideaIn("AB", road1Marks([])), ideaIn("AB", road1Marks(["skill-ab-alberta-student-number"])));
    expect(lines.join("\n")).toMatch(/now have every skill they list marked have/);
    expect(lines.join("\n")).toMatch(/the skills now read 1 have/);
    expect([...findTimeWords(changed.skillsNoneForPlace), ...findVerdicts(changed.skillsNoneForPlace)]).toEqual([]);
  });

  it("control: in one place, taking back only the quote still says so", () => {
    const lines = answerReceipt(ideaIn("AB", road0), ideaIn("AB", { ...road0, figures: [] }));
    expect(lines.join("\n")).toContain("you took back your number for");
  });
});

describe("second review of #207: a quote agreed on a cost line the new place leaves out is kept, named, and not counted", () => {
  const LINE = "Registry agent's service fee (set by your agent)";
  const STEP = "Register your business name, if you use one";
  const ROW = "cost-line:step-start-register-name/cost-start-name-service-fee";
  const kept = { progress: [], skillMarks: [], forkPickedOn: {}, targetMonthSetOn: null, figures: [SERVICE_FEE], incomeWantedOn: null };
  const rowIn = (province: "AB" | "ON") => {
    const input = ideaIn(province, { figures: [SERVICE_FEE] });
    const evaluation = evaluateRoad(input);
    return { evaluation, row: toldRows(input, evaluation, kept).find((r) => r.id === ROW) };
  };
  const capital = (text: string) => `${text.charAt(0).toUpperCase()}${text.slice(1)}`;

  it("from Ontario: in no sum, and still a row in What you've told DotAmi, with Take back and no Change", () => {
    const { evaluation, row } = rowIn("ON");
    expect(evaluation.gauges.money.yourNumbersCents).toBe(0);
    expect(evaluation.gauges.money.yourNumberLines).toBe(0);
    expect(row, "the quote's row").toBeDefined();
    expect(row!.said).toBe(capital(answer.costLineForAnotherPlace(LINE, STEP, 5000).said));
    expect(row!.change).toEqual({ kind: "none" });
    expect(row!.takeBack).toEqual({ kind: "figures", figureIds: ["f1"] });
  });

  it("control: in Alberta the same quote is counted, and its row is the usual one with Change", () => {
    const { evaluation, row } = rowIn("AB");
    expect(evaluation.gauges.money.yourNumbersCents).toBe(5000);
    expect(row!.said).toBe(capital(answer.costLine(LINE, STEP, 5000).said));
    expect(row!.change).toEqual({ kind: "step", stepId: "step-start-register-name" });
  });

  it("its words name no time and no verdict", () => {
    const words = answer.costLineForAnotherPlace(LINE, STEP, 5000);
    for (const line of [words.said, words.takenBack, words.fact]) expect([...findTimeWords(line), ...findVerdicts(line)], line).toEqual([]);
  });

  // The third review of #207: the told row said the number is kept while the Start-up money gauge (and Your plan's
  // money sums, which print it) said "your numbers: not given yet", on the same screen.
  const m = cockpitWords.gauges.money;
  const moneyIn = (province: "AB" | "ON", figures: FigureView[]) => {
    const input = ideaIn(province, { figures });
    const evaluation = evaluateRoad(input);
    return { evaluation, money: gaugeView(evaluation, input.road, input.scenario).money };
  };

  it("from Ontario the Start-up money gauge says the number is kept and not counted, never that none was given", () => {
    const { evaluation, money } = moneyIn("ON", [SERVICE_FEE]);
    expect(evaluation.gauges.money.notCountedForPlaceLines).toBe(1);
    expect(money.value).not.toContain(m.yoursNone);
    expect(money.value).toContain(m.yoursNoneForPlace);
    expect(money.lines).toContain(m.notCountedForPlace(1));
  });

  it("control: in Alberta the number is counted, and with no number in Ontario the gauge still says none was given", () => {
    const counted = moneyIn("AB", [SERVICE_FEE]);
    expect(counted.evaluation.gauges.money.notCountedForPlaceLines).toBe(0);
    expect(counted.money.value).toContain(m.yours(5000, 1));
    expect(counted.money.lines.join("\n")).not.toContain("not counted for your place");
    const none = moneyIn("ON", []);
    expect(none.money.value).toContain(m.yoursNone);
    expect(none.money.lines.join("\n")).not.toContain("not counted for your place");
  });

  it("Compare the two endings says none is counted for the place, not that none was given (road 1's lawyer line, Alberta's page)", () => {
    const lawyer: FigureView = {
      ...SERVICE_FEE,
      costLine: { roadId: roadApprenticeToOwnShopAB.id, stepId: "step-shop-open-own-shop", lineId: "cost-shop-lawyer-business-form", amountFrom: "your-guess" },
    };
    const yours = (province: "AB" | "ON") =>
      compareEndings(ideaIn(province, { road: roadApprenticeToOwnShopAB, figures: [lawyer] }), "fork-shop-employed-or-own")!.rows.find((r) => r.id === "yours")!.values;
    expect(yours("ON")).toEqual([cockpitWords.compare.yoursNoneForPlace, cockpitWords.compare.yoursNoneForPlace]);
    // Control: in Alberta the side whose step holds the line counts it.
    expect(yours("AB")).toContain(cockpitWords.compare.money(5000, 1));
  });

  it("the gauge's and Compare's new words name no time and no verdict", () => {
    const t = cockpitWords.example.theirs;
    const lines = [m.yoursNoneForPlace, m.notCountedForPlace(1), m.notCountedForPlace(2), cockpitWords.compare.yoursNoneForPlace, t.numbersNoneForPlace("Mara"), t.notCountedForPlace("Mara", 2)];
    for (const line of lines) expect([...findTimeWords(line), ...findVerdicts(line)], line).toEqual([]);
  });
});

describe("second review of #207: the cockpit rail's prep tools, drawn for the idea's place", () => {
  it("Alberta's business-name page is a prep tool in Alberta only", () => {
    expect(templateIdsForPlace("AB")).toContain("template-business-name-registration");
    expect(templateIdsForPlace("ON")).not.toContain("template-business-name-registration");
    // The federal ones are drawn everywhere.
    expect(templateIdsForPlace("ON")).toEqual(["template-t2125", "template-shareholder-agreement", "template-contractor-nda"]);
  });

  it("no prep tool drawn for any province or territory links or cites another province's page", () => {
    for (const province of PROVINCES) {
      const otherPages = new Set(
        templateReferencesV2026
          .flatMap((t): readonly EngineCitation[] => t.citations)
          .filter((c) => c.jurisdiction !== "CA" && c.jurisdiction !== province)
          .map((c) => c.url),
      );
      for (const t of templateReferencesV2026.filter((ref) => templateIdsForPlace(province).includes(ref.id))) {
        expect(otherPages.has(t.externalUrl), `${t.id} in ${province}`).toBe(false);
        expect((t.citations as readonly EngineCitation[]).some((c) => c.jurisdiction === "CA" || c.jurisdiction === province), `${t.id} in ${province}`).toBe(true);
      }
    }
  });
});

describe("a-call-1: two ended programs are off", () => {
  const RETIRED = ["grant-abti", "grant-cajg"];

  it("neither is in the programs catalog", () => {
    const ids = grantsCatalogV2026.entries.map((p) => p.id as string);
    for (const id of RETIRED) expect(ids).not.toContain(id);
  });

  it("no road's step points at either", () => {
    for (const road of roadsV2026) {
      const hinted = road.steps.flatMap((step) => step.engineHints ?? []);
      // The check can see a hint: road 0's GST stage names the small-supplier rule.
      if (road.id === generalRoadV2026.id) expect(hinted).toContain("compliance-gst-small-supplier");
      for (const id of RETIRED) expect(hinted, road.id).not.toContain(id);
    }
  });

  it("each is in the retired list with the official reason and the day it was read", () => {
    expect(RETIRED_GRANT_PROGRAMS.map((p) => p.id).sort()).toEqual(RETIRED);
    for (const p of RETIRED_GRANT_PROGRAMS) {
      expect(p.readOn).toBe("2026-10-23");
      expect(p.why.length).toBeGreaterThan(20);
      expect(p.url).toMatch(/^https:\/\/www\.alberta\.ca\//);
    }
  });
});
