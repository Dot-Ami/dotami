/**
 * The invented example future behind the front door's third door (docs/architecture/future-cockpit.md
 * § 1, "The example future as built"; docs/ui-spec/example/_index.md): Mara, on the first written road.
 *
 * Three things are held true here. Her answers are valid against the real catalogs (every id exists, every
 * skill she marked is listed on road 1, the step she marked done is on it). The cockpit, run on her answers
 * through the same road evaluation as any future, gives the receipts the ui-spec lists, which are the
 * catalog's counts, not the appendix's sketch. And her numbers live in her file only: no other file the app
 * is built from carries one. The screen itself (nothing saved, nothing stored) is e2e/example-future.spec.ts.
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

import { readSource, simplify, sourceFiles, TS_FILES } from "./helpers/source-scan";

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

  it("her own numbers: two quotes on named lines of Open your own shop, and her savings, all agreed and typed by her", () => {
    const shop = road.steps.find((s) => s.label === "Open your own shop")!;
    const quotes = ex.figures.filter((f) => f.kind === "start-up-cost-line");
    expect(quotes).toHaveLength(2);
    for (const q of quotes) {
      const line = shop.costs.find((c) => c.id === q.costLine!.lineId);
      // Never a quote on an official fee: those are the catalog's, with their sources.
      expect(line?.kind, q.id).toBe("named");
      expect(q.costLine).toMatchObject({ roadId: road.id, stepId: shop.id, amountFrom: "quote" });
    }
    const byLine = Object.fromEntries(quotes.map((q) => [shop.costs.find((c) => c.id === q.costLine!.lineId)!.label, q.amountCents]));
    expect(byLine).toEqual({ "Woodworking machines and tools": 340_000, "Shop space deposit": 200_000 });
    expect(ex.figures.filter((f) => f.kind === "savings-for-start").map((f) => f.amountCents)).toEqual([1_200_000]);
    expect(ex.kept.incomeWanted?.amountCents).toBe(7_000_000);
    expect(ex.whatIfFirstYearSalesDollars).toBe(45_000);
    for (const f of ex.figures) {
      expect(f.status, f.id).toBe("confirmed");
      expect(f.sourceKind, f.id).toBe("typed");
      expect(f.currency, f.id).toBe("CAD");
    }
  });
});

describe("the cockpit run on Mara's answers gives the ui-spec's receipts", () => {
  const evaluation = evaluateRoad(inputOf());
  const view = gaugeView(evaluation, road, ex.scenario);

  it("Steps: 1 of the road's 16 steps marked done (the appendix's sketch said 22 steps)", () => {
    expect(road.steps).toHaveLength(16);
    expect(view.steps.value).toBe("1 of 16 marked done");
    expect(evaluation.gauges.steps).toMatchObject({ done: 1, total: 16 });
  });

  it("the money gauge is plain arithmetic: savings minus official fees and her own numbers, and the lines not priced counted", () => {
    const m = evaluation.gauges.money;
    expect(m.yourNumbersCents).toBe(340_000 + 200_000);
    expect(m.yourNumberLines).toBe(2);
    expect(m.savingsCents).toBe(1_200_000);
    expect(m.differenceCents).toBe(m.savingsCents! - (m.officialFeesCents + m.yourNumbersCents));
    // The catalog's count of lines not priced yet: 29 once her two quotes are in (the appendix said 4).
    expect(m.notPricedLines).toBe(29);
    expect(view.money.value).toBe(`${formatMoney(m.officialFeesCents)} official fees (${m.officialFeeLines} lines) · $5,400 your numbers (2 lines)`);
    expect(view.money.lines).toEqual([
      "1 official fee applies only sometimes, not added up",
      "29 not priced yet",
      "savings $12,000",
      `savings minus both: ${formatMoney(m.differenceCents!)}`,
    ]);
    // Today's catalog: seven official fees on her path, $1,220; so the difference is $5,380.
    expect(view.money.value.startsWith("$1,220 official fees (7 lines)")).toBe(true);
    expect(formatMoney(m.differenceCents!)).toBe("$5,380");
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
    expect(story.quotes).toContain(
      "Because you told us your number for “Shop space deposit” on “Open your own shop” is $2,000 and you told us your number for “Woodworking machines and tools” on “Open your own shop” is $3,400, 29 cost lines are not priced yet.",
    );
    expect(story.savings).toContain(
      "Because you told us you'd put $12,000 of savings toward starting, your savings minus the official fees and your own numbers is now $5,380.",
    );
    expect(story["what-if"]).toEqual([
      "Because you tried first-year sales of $45,000 (your what-if, not a forecast), 1 rules and tax card now says check first.",
    ]);
    expect(story["step-done"].some((l) => l.includes("1 of 16"))).toBe(true);
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
    // 9 marks, 2 quotes, savings, the ending, the step done, the place and the job at least.
    expect(rows.length).toBeGreaterThanOrEqual(15);
    expect(rows.every((r) => r.day === null || r.day === "2026-10-13")).toBe(true);
  });

  it("Compare is offered at road 1's fork, where her pick is", () => {
    expect(forksToCompare(inputOf()).map((f) => f.id)).toEqual(["fork-shop-employed-or-own"]);
  });
});

describe("Mara's numbers are in her file only", () => {
  // Her five figures, in the forms code would write them: whole cents (as the file keeps them), the money
  // as a screen prints it, and the plain dollars. Four-digit dollar amounts (2000, 3400) are too common as
  // plain numbers (a year, a character limit) to look for as digits; their cents and money forms are.
  const cents = [ex.kept.incomeWanted!.amountCents, ...ex.figures.map((f) => f.amountCents), ex.whatIfFirstYearSalesDollars! * 100];
  const grouped = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, "_?");
  const patterns = cents.flatMap((c) => {
    const dollars = c / 100;
    return [
      new RegExp(`\\b${grouped(c)}\\b`),
      new RegExp(formatMoney(c).replace(/[$]/g, "\\$")),
      ...(dollars >= 10_000 ? [new RegExp(`\\b${grouped(dollars)}\\b`), new RegExp(`\\b${dollars.toLocaleString("en-CA")}\\b`)] : []),
    ];
  });
  const file = "lib/examples/mara.ts";
  // The cited catalogs are left out: a real official fee can be the same amount as one of her numbers (a
  // $2,000 fee, say), and the fix must never be to change a sourced figure or her invented one to suit.
  const catalogs = "lib/engines/";
  // One string is allowed by name: the what-if bar's own hint, which gave 45000 as its example before Mara
  // existed and is shown to every person on their own futures. Her what-if is the same amount by chance;
  // the hint stays as it was, and only this exact sentence is taken out of words.ts before the scan.
  const allowed = { file: "lib/cockpit/words.ts", text: cockpitWords.questions.box.wholeDollars };
  const scanned = (f: string) => {
    const code = simplify(readSource(f), true);
    return f === allowed.file ? code.split(allowed.text).join("") : code;
  };

  it("the one string allowed by name is still in its file, so the allowance can't hide a new one", () => {
    expect(allowed.text).toBe("Write a whole number of dollars, like 45000.");
    expect(simplify(readSource(allowed.file), true)).toContain(allowed.text);
  });

  it("the scan finds each of them in her file (so it can fail)", () => {
    const code = simplify(readSource(file), true);
    // The money and dollar forms are for other files; her file keeps whole cents, and the what-if in dollars.
    for (const c of cents) expect(new RegExp(`\\b${grouped(c)}\\b`).test(code) || new RegExp(`\\b${grouped(c / 100)}\\b`).test(code), String(c)).toBe(true);
  });

  it("no other file under app/, components/ or lib/ (the cited catalogs aside) writes one", () => {
    const found = sourceFiles(["app", "components", "lib"], TS_FILES)
      .map((f) => f.split("\\").join("/"))
      .filter((f) => f !== file && !f.startsWith(catalogs))
      .flatMap((f) => {
        const code = scanned(f);
        return patterns.filter((p) => p.test(code)).map((p) => `${f}: ${p}`);
      });
    expect(found).toEqual([]);
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

  it("the banner says, in these words, that it is invented and nothing is saved", () => {
    expect(cockpitWords.example.banner).toBe("Invented person, invented numbers, not real data. Nothing here is saved.");
    expect(cockpitWords.example.cantKeep).toBe("This is an example. Start your own to keep anything.");
    expect(cockpitWords.example.startOwn).toBe("Start my own future →");
  });
});
