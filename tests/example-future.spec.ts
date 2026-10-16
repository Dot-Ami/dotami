/**
 * The invented example future behind the front door's third door (docs/architecture/future-cockpit.md
 * § 1, "The example future as built"; docs/ui-spec/example/_index.md): Mara, on the first written road.
 *
 * Three things are held true here. Her answers are valid against the real catalogs (every id exists, every
 * skill she marked is listed on road 1, the step she marked done is on it). The cockpit, run on her answers
 * through the same road evaluation as any future, gives the receipts the ui-spec lists, which are the
 * catalog's counts, not the appendix's sketch. And her numbers sit where the cockpit reads them; since
 * 2026-10-14 they are real prices and statistics, each traced to its source in tests/example-sources.spec.ts.
 * The screen itself (nothing saved, nothing stored) is e2e/example-future.spec.ts.
 */
import { describe, expect, it } from "vitest";

import { cockpitWords } from "@/lib/cockpit/words";
import { cockpitInput, gaugeView } from "@/lib/cockpit/view";
import { forksToCompare, toldRows, type KeptAnswers } from "@/lib/cockpit/told";
import { oasisJobByCode, oasisListForJob } from "@/lib/engines/oasis/v2026";
import { roadApprenticeToOwnShopAB, roadsV2026, skillItemsV2026 } from "@/lib/engines/roads/v2026";
import { EXAMPLES, exampleById, FRONT_DOOR_EXAMPLE_ID } from "@/lib/examples";
import { exampleMara } from "@/lib/examples/mara";
import { exampleStory } from "@/lib/examples/story";
import { formatMoney } from "@/lib/format/money-and-months";
import { LISTED_ROAD_IDS } from "@/lib/front-door/futures";
import { frontDoorWords } from "@/lib/front-door/words";
import { roadForFuture, SHIPPED_ROADS_CATALOG } from "@/lib/futures/types";
import { evaluateRoad, type RoadEvaluationInput } from "@/lib/roads";
import { NOT_SAID_FIELDS } from "@/lib/scenarios/types";

const ex = exampleMara;
const road = roadApprenticeToOwnShopAB;
const today = "2026-10-14";

/** Road evaluation's input from the example, built the way the cockpit page builds it for a saved idea. */
function inputOf(whatIf: number | null = null): RoadEvaluationInput {
  const job = ex.kept.future.job ? oasisListForJob(ex.kept.future.job.code) : null;
  return {
    ...cockpitInput({
      road: roadForFuture(SHIPPED_ROADS_CATALOG, ex.kept.future.roadId),
      roadChosen: ex.kept.future.roadChosen,
      skillItems: skillItemsV2026,
      scenario: ex.scenario,
      figures: ex.figures,
      personFigures: [],
      future: ex.kept.future,
      progress: ex.kept.progress,
      skillMarks: ex.kept.skillMarks,
      job,
      today,
    }),
    whatIf: whatIf === null ? null : { firstYearSalesDollars: whatIf },
  };
}

describe("Mara's answers are valid against the catalogs", () => {
  it("is listed by id, the front door's third door opens it, and no other address finds one", () => {
    expect(Object.keys(EXAMPLES)).toEqual(["mara"]);
    expect(FRONT_DOOR_EXAMPLE_ID).toBe("mara");
    expect(exampleById("mara")).toBe(ex);
    for (const other of ["", "maya", "__proto__", "constructor", "toString", "MARA"]) expect(exampleById(other), other).toBeUndefined();
  });

  it("is on the first written road, a road Pick a future lists, in Alberta, with what she answered and nothing more", () => {
    expect(ex.kept.future.roadId).toBe(road.id);
    expect(roadsV2026.map((r) => r.id)).toContain(road.id);
    expect(LISTED_ROAD_IDS).toContain(road.id);
    expect(ex.kept.future.roadChosen).toBe(true);
    expect(ex.kept.future.place).toBe("CA-AB");
    expect(ex.scenario.profile.province).toBe("AB");
    expect(ex.kept.future.lookingFor).toBe("both-or-not-sure");
    // Never asked on this way in, so never made up: her work situation and the rest are "not said".
    expect(ex.scenario.profile.employmentStatus).toBe("not-said");
    expect(ex.scenario.profile.notSaid).toEqual([...NOT_SAID_FIELDS]);
    expect(ex.scenario.profile.capitalPurchasePlanned).toBeUndefined();
    // No incorporation number of her own, and no date.
    expect(ex.scenario.state.incorporateAt).toBeUndefined();
    expect(ex.kept.future.targetMonth).toBeNull();
    // Her words, word for word, as her destination; the idea has no first sentence of its own.
    expect(ex.kept.destination?.text).toBe("My own small furniture shop, four-day weeks, home for supper.");
    expect(ex.kept.firstWords).toBeNull();
  });

  it("her job is a real job on the government's list, named as the list names it", () => {
    const job = ex.kept.future.job!;
    expect(oasisJobByCode(job.code)).toEqual({ code: job.code, label: job.label });
    expect(job.label).toBe("Cabinetmakers");
  });

  it("9 skills marked, 6 have, 2 learning, 1 not yet; each one listed on road 1, by the road or by her pick of job", () => {
    const marks = ex.kept.skillMarks;
    expect(marks).toHaveLength(9);
    expect(marks.filter((m) => m.mark === "have")).toHaveLength(6);
    expect(marks.filter((m) => m.mark === "learning")).toHaveLength(2);
    expect(marks.filter((m) => m.mark === "not-yet")).toHaveLength(1);
    const onRoad = new Set(road.steps.flatMap((s) => s.needs));
    const jobList = new Set(oasisListForJob(ex.kept.future.job!.code)!.items.map((i) => i.id));
    const skillIds = new Set(skillItemsV2026.map((s) => s.id));
    for (const m of marks) {
      expect(m.ownLabel, m.id).toBeNull();
      const id = m.skillItemId!;
      // A road skill is one of road 1's own and on the shared list; anything else is on her job's list.
      expect(onRoad.has(id) ? skillIds.has(id) : jobList.has(id), id).toBe(true);
    }
    // No mark twice.
    expect(new Set(marks.map((m) => m.skillItemId)).size).toBe(9);
  });

  it("1 step marked done, the road's first, and This is mine on Open your own shop at the road's fork", () => {
    const done = ex.kept.progress.filter((p) => p.status === "done");
    expect(done).toHaveLength(1);
    expect(ex.kept.progress).toHaveLength(1);
    expect(done[0].roadId).toBe(road.id);
    expect(road.steps.map((s) => s.id)).toContain(done[0].stepId);
    expect(road.columns[0].steps[0]).toBe(done[0].stepId);
    const picks = Object.entries(ex.kept.future.forkPicks);
    expect(picks).toHaveLength(1);
    const [forkId, pick] = picks[0];
    const fork = road.forks.find((f) => f.id === forkId)!;
    expect(fork.sides).toContain(pick.stepId);
    expect(road.steps.find((s) => s.id === pick.stepId)?.label).toBe("Open your own shop");
    expect(pick.from).toBe("you");
  });

  // Since 2026-10-14 (the maintainer's option A) her numbers are real ones, each traced to its source in
  // tests/example-sources.spec.ts; here, only that they sit where the cockpit reads them.
  it("her numbers: one start-up cost line on a named line of Open your own shop and her income goal; no savings, and no what-if", () => {
    const shop = road.steps.find((s) => s.label === "Open your own shop")!;
    const lines = ex.figures.filter((f) => f.kind === "start-up-cost-line");
    expect(lines).toHaveLength(1);
    const line = shop.costs.find((c) => c.id === lines[0].costLine!.lineId);
    // Never a number on an official fee: those are the catalog's, with their sources.
    expect(line?.kind).toBe("named");
    expect(line?.label).toBe("Woodworking machines and tools");
    expect(lines[0].costLine).toMatchObject({ roadId: road.id, stepId: shop.id, amountFrom: "link" });
    expect(lines[0].amountCents).toBe(1_499_362);
    expect(ex.figures.filter((f) => f.kind === "savings-for-start")).toEqual([]);
    expect(ex.kept.incomeWanted?.amountCents).toBe(5_225_500);
    // The maintainer's pick A (2026-10-15): the example opens with no what-if, so the what-if bar starts
    // empty; a visitor tries their own if they want one, kept nowhere as on every cockpit. ISED's average is
    // shown only as context in "Where these numbers come from" (tests/example-sources.spec.ts).
    expect(ex.whatIfFirstYearSalesDollars).toBeNull();
    for (const f of ex.figures) {
      expect(f.status, f.id).toBe("confirmed");
      expect(f.currency, f.id).toBe("CAD");
    }
  });
});

describe("the cockpit run on Mara's answers gives the ui-spec's receipts", () => {
  const evaluation = evaluateRoad(inputOf());
  const view = gaugeView(evaluation, road, ex.scenario);

  it("Steps: 1 of the road's 17 steps marked done (the appendix's sketch said 22 steps)", () => {
    expect(road.steps).toHaveLength(17);
    expect(view.steps.value).toBe("1 of 17 marked done");
    expect(evaluation.gauges.steps).toMatchObject({ done: 1, total: 17 });
  });

  it("the money gauge is plain arithmetic: official fees and her one priced line, the lines not priced counted, no savings", () => {
    const m = evaluation.gauges.money;
    expect(m.yourNumbersCents).toBe(1_499_362);
    expect(m.yourNumberLines).toBe(1);
    // Nothing real can supply one person's savings, so there are none, and no difference is worked out.
    expect(m.savingsCents).toBeNull();
    expect(m.differenceCents).toBeNull();
    // The catalog's count of lines not priced yet: 30 with only the machines line priced (the appendix said 4).
    expect(m.notPricedLines).toBe(30);
    expect(view.money.value).toBe(`${formatMoney(m.officialFeesCents)} official fees (${m.officialFeeLines} lines) · $14,993.62 your numbers (1 line)`);
    expect(view.money.lines).toEqual(["1 official fee applies only sometimes, not added up", "30 not priced yet", "savings: not given yet"]);
    // Today's catalog: seven official fees on her path, $1,220.
    expect(view.money.value.startsWith("$1,220 official fees (7 lines)")).toBe(true);
  });

  it("her story's receipts, each worked out by comparing road evaluation without and with her answer", () => {
    const story = Object.fromEntries(exampleStory(inputOf(), ex.whatIfFirstYearSalesDollars).map((p) => [p.id, p.lines]));
    // The appendix's "3 steps now say needs 0 more" is 4 on today's road: her two "have" marks cover every
    // skill on four steps.
    expect(story.marks).toEqual([
      "Because you marked 9 skills, 4 steps now have every skill they list marked have.",
      "Because you marked 9 skills, the skills now read 2 have, 0 learning, 0 not yet, 1 not marked.",
      "Because you marked 9 skills, the government's list for “Cabinetmakers” now reads 4 have, 2 learning, 1 not yet, 37 not marked.",
    ]);
    expect(story.costs).toContain(
      "Because you told us your number for “Woodworking machines and tools” on “Open your own shop” is $14,993.62, 30 cost lines are not priced yet.",
    );
    // No savings, so no savings part: a part is shown only when its answer changed something.
    expect(story.savings).toBeUndefined();
    // No what-if part since the maintainer's pick A (2026-10-15): she has no what-if, so "What Mara did"
    // tells only what she answered. The control below shows the part does come back for a what-if given.
    expect(story["what-if"]).toBeUndefined();
    expect(exampleStory(inputOf(), 80_000).some((p) => p.id === "what-if")).toBe(true);
    expect(story["step-done"].some((l) => l.includes("1 of 17"))).toBe(true);
    expect(story["this-is-mine"].length).toBeGreaterThan(0);
    // Every part changes something: an answer that changed nothing would be a story told wrong.
    for (const [id, lines] of Object.entries(story)) expect(lines.length, id).toBeGreaterThan(0);
  });

  it("the told list lists each of her answers with what it unlocked, as for any future", () => {
    const kept: KeptAnswers = {
      progress: ex.kept.progress,
      skillMarks: ex.kept.skillMarks,
      forkPickedOn: { "fork-shop-employed-or-own": "2026-10-13" },
      targetMonthSetOn: null,
      figures: ex.figures,
      incomeWantedOn: ex.kept.incomeWanted!.agreedOn,
    };
    const rows = toldRows(inputOf(), evaluation, kept);
    // 9 marks, the priced line, the ending, the step done, the place and the job at least.
    expect(rows.length).toBeGreaterThanOrEqual(14);
    expect(rows.every((r) => r.day === null || r.day === "2026-10-13")).toBe(true);
  });

  it("Compare is offered at road 1's fork, where her pick is", () => {
    expect(forksToCompare(inputOf()).map((f) => f.id)).toEqual(["fork-shop-employed-or-own"]);
  });
});

describe("the words", () => {
  it("door 3 links to the example and no longer says it isn't written", () => {
    const door = frontDoorWords.doors.example;
    expect(door.title).toBe("Show me an example first");
    expect(door.body).toMatch(/invented/);
    expect(door.go).toBe("Show me Mara's example →");
    expect(JSON.stringify(door)).not.toMatch(/not written|isn't written/i);
  });

  it("nothing is saved, in these words (the banner's own words are tests/example-sources.spec.ts)", () => {
    expect(cockpitWords.example.banner(ex.person, "2026-10-14")).toMatch(/Nothing here is saved\.$/);
    expect(cockpitWords.example.cantKeep).toBe("This is an example. Start your own to keep anything.");
    expect(cockpitWords.example.startOwn).toBe("Start my own future →");
  });

  // Her numbers and answers are hers, never labelled as the viewer's: the goal bar, the gauges' tags, the
  // money gauge and the told list say her name, and the banner and her story say once that the "you" in the
  // receipts (the same words every person's own receipts use) means her.
  it("her target, words, gauges and told list are labelled with her name, not as the viewer's", () => {
    const w = cockpitWords.example.theirs;
    expect(w.target(ex.person, 5_225_500, "2026-10-13")).toBe("Mara's target: $52,255 a year, before tax (Mara's, agreed 2026-10-13)");
    // Her target is a statistic, so the goal bar says which one and when, in place of "agreed".
    expect(w.targetFrom(ex.person, 5_225_500, "the average yearly salary", "2023")).toBe("Mara's target: $52,255 a year, before tax: the average yearly salary (2023)");
    expect(w.destination(ex.person, "2026-10-13")).toBe("where Mara wants to be · Mara's words · 2026-10-13");
    expect(w.tags(ex.person)).toEqual({ steps: "count", skills: "Mara's marks", money: "Mara's + cited", date: "Mara's" });
    expect(w.dateLabel(ex.person)).toBe("Mara's date");
    expect(w.toldRegion(ex.person)).toBe("What Mara told DotAmi");
    expect(w.toldCount(ex.person, 16)).toBe("16 things Mara told DotAmi");
    expect(cockpitWords.example.youMeans(ex.person)).toBe("Here, “you” and “your” mean Mara, the invented person.");
    for (const s of [w.target(ex.person, 1, "d"), w.targetFrom(ex.person, 1, "x", "y"), w.destination(ex.person, "d"), ...Object.values(w.tags(ex.person)), w.toldRegion(ex.person)]) {
      expect(s, s).not.toMatch(/\byou(rs?)?\b|you've/i);
    }
  });

  it("the money gauge says her numbers with her name when given the person; a person's own future still says 'your numbers'", () => {
    const evaluation = evaluateRoad(inputOf());
    expect(gaugeView(evaluation, road, ex.scenario, ex.person).money.value).toBe("$1,220 official fees (7 lines) · $14,993.62 Mara's numbers (1 line)");
    expect(gaugeView(evaluation, road, ex.scenario).money.value).toBe("$1,220 official fees (7 lines) · $14,993.62 your numbers (1 line)");
    expect(gaugeView(evaluation, road, ex.scenario, ex.person).skills.lines).toContain("Mara's pick of job: 4 have · 2 learning · 1 not yet, of 44 listed");
    expect(gaugeView(evaluation, road, ex.scenario).skills.lines).toContain("your pick of job: 4 have · 2 learning · 1 not yet, of 44 listed");
  });

  it("her story's headings use her name, so a second example person never inherits Mara's pronoun", () => {
    const parts = cockpitWords.example.story.parts;
    for (const id of Object.keys(parts) as (keyof typeof parts)[]) {
      expect(parts[id]("Sam"), id).toContain("Sam");
      expect(parts[id]("Sam"), id).not.toMatch(/\b(her|she|hers)\b/i);
    }
    expect(parts.marks(ex.person)).toBe("Mara's skill marks");
    // Her start-up cost is from sellers' listed prices, not a quote she got.
    expect(parts.costs(ex.person)).toBe("Mara's start-up cost, from listed prices");
  });
});
