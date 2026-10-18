/**
 * Your plan (docs/ui-spec/plan/_index.md; docs/architecture/future-cockpit.md § 2, "Your plan as built";
 * issue #41): one idea's plan, laid out to read and print, made only from what DotAmi keeps and the
 * catalogs. `buildPlan` is pure and gives every sentence the page shows; the page draws them.
 *
 * Drawn on the invented trade road of tests/helpers/road-to-evaluate.ts (two official fees, five named
 * cost lines, five skill items, a fork), so every line can be checked by hand.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { PlanPage } from "@/components/cockpit/plan-page";
import { buildPlan, type PlanArgs, type PlanView } from "@/lib/cockpit/plan";
import { toldRows, type KeptAnswers } from "@/lib/cockpit/told";
import { cockpitInput, gaugeView } from "@/lib/cockpit/view";
import { cockpitWords } from "@/lib/cockpit/words";
import { OASIS_ATTRIBUTION } from "@/lib/engines/oasis/v2026/licence";
import { oasisJobs, oasisListForJob } from "@/lib/engines/oasis/v2026";
import type { Road } from "@/lib/engines/roads/v2026";
import type { FigureView } from "@/lib/figures/types";
import { evaluateRoad } from "@/lib/roads";

import { inventedIdea, ROAD_ID, roadToEvaluate, roadWithRuledFork, RULED_FORK, skillItems, TODAY } from "./helpers/road-to-evaluate";
import { VERDICT_WORDS as VERDICT } from "./helpers/verdict-words";

const NO_KEPT: KeptAnswers = { progress: [], skillMarks: [], forkPickedOn: {}, targetMonthSetOn: null, figures: [], incomeWantedOn: null };

/** A figure as the figures list returns it, agreed at noon on the test's day unless changed. */
function figure(change: Partial<FigureView>): FigureView {
  return {
    id: `f-${Math.random().toString(36).slice(2)}`,
    ventureId: "v",
    kind: "start-up-cost-line",
    periodStart: TODAY,
    periodEnd: TODAY,
    amountCents: 0,
    currency: "CAD",
    sourceKind: "typed",
    sourceLabel: "typed by you",
    sourceRows: null,
    status: "confirmed",
    editedByPerson: false,
    proposedAt: `${TODAY}T12:00:00.000Z`,
    confirmedAt: `${TODAY}T12:00:00.000Z`,
    retractedAt: null,
    taxYear: null,
    formLine: null,
    costLine: null,
    ...change,
  } as FigureView;
}

/** What the plan page passes: the cockpit's own input from what is kept, plus the days kept with it. */
function args(over: {
  road?: Road;
  figures?: FigureView[];
  progress?: { stepId: string; status: "doing" | "done" | "not-for-me" | null; doneWhenIds: string[] }[];
  skillMarks?: { skillItemId: string | null; ownLabel: string | null; mark: "have" | "learning" | "not-yet"; markedOn: string }[];
  forkPicks?: Record<string, { stepId: string; pickedOn: string | null; from: "you" | "map" }>;
  jobCode?: string | null;
  change?: Partial<PlanArgs>;
} = {}): PlanArgs {
  const road = over.road ?? roadToEvaluate();
  const figures = over.figures ?? [];
  const progress = (over.progress ?? []).map((p) => ({
    roadId: road.id,
    ...p,
    changes: p.status ? [{ at: `${TODAY}T12:00:00.000Z`, status: p.status }] : [],
    updatedAt: `${TODAY}T12:00:00.000Z`,
  }));
  const skillMarks = (over.skillMarks ?? []).map((m, i) => ({ id: `m${i}`, ...m }));
  const job = over.jobCode ? oasisListForJob(over.jobCode) : null;
  const input = cockpitInput({
    road,
    roadChosen: true,
    skillItems,
    scenario: inventedIdea(),
    figures,
    personFigures: [],
    future: { forkPicks: over.forkPicks ?? {}, targetMonth: null },
    progress,
    skillMarks,
    job,
    today: TODAY,
  });
  return {
    ideaName: "Invented (test only)",
    input,
    kept: { ...NO_KEPT, progress, skillMarks, figures, forkPickedOn: Object.fromEntries(Object.entries(over.forkPicks ?? {}).map(([k, v]) => [k, v.pickedOn])) },
    firstWords: null,
    destination: null,
    incomeWanted: null,
    roadChosenOn: "2026-10-03",
    jobPickedOn: over.jobCode ? "2026-10-04" : null,
    today: TODAY,
    ...over.change,
  };
}

/** Every string anywhere in a value, for the checks that read the whole plan. */
function strings(value: unknown, out: string[] = []): string[] {
  if (typeof value === "string") out.push(value);
  else if (Array.isArray(value)) for (const v of value) strings(v, out);
  else if (value && typeof value === "object") for (const v of Object.values(value)) strings(v, out);
  return out;
}

const stepOf = (plan: PlanView, id: string) => plan.steps.columns.flatMap((c) => c.steps).find((s) => s.id === id)!;
const linesOf = (plan: PlanView) => plan.money.byStep.flatMap((s) => s.lines);
const lineOf = (plan: PlanView, id: string) => linesOf(plan).find((l) => l.lineId === id)!;

describe("the heading", () => {
  it("names the plan, the idea and the day it was made, from what DotAmi keeps", () => {
    const plan = buildPlan(args());
    expect(plan.title).toBe(cockpitWords.plan.title);
    expect(plan.ideaName).toBe("Invented (test only)");
    expect(plan.made).toBe(cockpitWords.plan.made(TODAY));
    expect(plan.made).toContain(TODAY);
  });
});

describe("in your words", () => {
  it("shows the sentence typed for the idea word for word, with its day", () => {
    // Odd spacing, quotes and punctuation stay exactly as typed: nothing is tidied or summarised.
    const text = "Run my own  cabinet shop by 2029 — “small”, two people, no debt!";
    const plan = buildPlan(args({ change: { firstWords: { text, saidAt: "2026-09-30" } } }));
    expect(plan.words).toEqual([{ text, line: cockpitWords.plan.typedFor("2026-09-30") }]);
    expect(plan.wordsNone).toBeNull();
  });

  it("adds the newest destination when it is a different sentence, and only once when it is the same", () => {
    const first = { text: "A shop of my own.", saidAt: "2026-09-30" };
    const other = { text: "Work for myself, four days a week.", saidAt: "2026-10-02" };
    const both = buildPlan(args({ change: { firstWords: first, destination: other } }));
    expect(both.words.map((w) => w.text)).toEqual([first.text, other.text]);
    expect(both.words[1]!.line).toBe(cockpitWords.plan.destination("2026-10-02"));
    const same = buildPlan(args({ change: { firstWords: first, destination: { ...first, saidAt: "2026-10-02" } } }));
    expect(same.words).toHaveLength(1);
  });

  it("says so when no words are kept, and shows the agreed income only", () => {
    const none = buildPlan(args());
    expect(none.words).toEqual([]);
    expect(none.wordsNone).toBe(cockpitWords.plan.wordsNone);
    expect(none.target).toBeNull();
    const target = buildPlan(args({ change: { incomeWanted: { amountCents: 7_000_000, agreedOn: "2026-10-01" } } }));
    expect(target.target).toBe(cockpitWords.goal.target(7_000_000, "2026-10-01"));
    expect(target.target).toContain("$70,000");
  });
});

describe("the future and its ending", () => {
  it("names the road, who picked it and the ending at each fork", () => {
    const picked = buildPlan(args({ forkPicks: { "fork-eval-ending": { stepId: "step-eval-own", pickedOn: "2026-10-05", from: "you" } } }));
    expect(picked.road.future).toBe(cockpitWords.goal.future("Invented trade road (test only)"));
    expect(picked.road.picked).toBe(cockpitWords.plan.roadChosen("2026-10-03"));
    expect(picked.road.endings).toEqual([cockpitWords.plan.ending("Ending (test only)", cockpitWords.compare.yourPick("Own shop (test only)"))]);

    const open = buildPlan(args());
    expect(open.road.endings).toEqual([cockpitWords.plan.ending("Ending (test only)", cockpitWords.compare.nonePicked)]);
  });

  it("says when the idea is on the general road by default, and when a road has no fork", () => {
    const road = roadToEvaluate();
    const noFork: Road = { ...road, forks: [], columns: road.columns.map(({ forkId: _drop, ...c }) => c) };
    const base = args({ road: noFork });
    const plan = buildPlan({ ...base, input: { ...base.input, roadChosen: false }, roadChosenOn: null });
    expect(plan.road.picked).toBe(cockpitWords.plan.roadDefault);
    expect(plan.road.endings).toEqual([cockpitWords.plan.noForks]);
  });

  it("shows the four gauges as the goal bar does, counts and sums only, without the invitations", () => {
    const plan = buildPlan(args());
    expect(plan.road.gauges.map((g) => g.label)).toEqual(["Steps", "Skills", "Start-up money", "Your date"]);
    expect(plan.road.gauges[0]!.value).toBe(cockpitWords.gauges.steps.value(0, 7));
    for (const g of plan.road.gauges) {
      for (const line of g.lines) expect(Object.values(cockpitWords.gauges).map((x) => ("invite" in x ? x.invite : ""))).not.toContain(line);
    }
  });
});

describe("each step", () => {
  it("lists every step of the road, column by column in road order, whatever its state", () => {
    const plan = buildPlan(args({ forkPicks: { "fork-eval-ending": { stepId: "step-eval-own", pickedOn: "2026-10-05", from: "you" } } }));
    const road = roadToEvaluate();
    expect(plan.steps.order).toBe(cockpitWords.plan.order);
    expect(plan.steps.columns.map((c) => c.label)).toEqual(road.columns.map((c) => c.label));
    expect(plan.steps.columns.flatMap((c) => c.steps.map((s) => s.id))).toEqual(road.columns.flatMap((c) => c.steps));
    // The side not picked is still in the plan, said to be off the path: nothing is filtered out.
    const employed = stepOf(plan, "step-eval-employed");
    expect(employed.state).toBe(cockpitWords.plan.state["not-on-your-path"]);
    expect(employed.because).toBe(evaluateRoad(args({ forkPicks: { "fork-eval-ending": { stepId: "step-eval-own", pickedOn: "2026-10-05", from: "you" } } }).input).steps.find((s) => s.stepId === "step-eval-employed")!.because);
  });

  it("gives the person's status, or says none is set", () => {
    const plan = buildPlan(args({ progress: [{ stepId: "step-eval-train", status: "doing", doneWhenIds: [] }] }));
    expect(stepOf(plan, "step-eval-train").status).toBe(cockpitWords.plan.status(cockpitWords.road.statusChip.doing));
    expect(stepOf(plan, "step-eval-ticket").status).toBe(cockpitWords.plan.noStatus);
  });

  it("marks each done-when line ticked or not, with its source and how it was checked", () => {
    const plan = buildPlan(args({ progress: [{ stepId: "step-eval-train", status: null, doneWhenIds: ["dw-eval-train-2"] }] }));
    const train = stepOf(plan, "step-eval-train");
    expect(train.doneWhenTitle).toBe(cockpitWords.plan.doneWhen(1, 2));
    expect(train.doneWhen.map((d) => [d.text, d.ticked, d.mark])).toEqual([
      ["Invented line one.", false, cockpitWords.plan.notTicked],
      ["Invented line two.", true, cockpitWords.plan.ticked],
    ]);
    expect(train.doneWhen[0]!.source).toMatchObject({
      title: "Invented page (test only)",
      url: "https://example.org/invented",
      checked: "Read on 2026-10-01. Who read it wasn't recorded.",
    });
    // A step with none says so, in the step panel's own words.
    expect(stepOf(plan, "step-eval-ticket").doneWhenTitle).toBe(cockpitWords.panel.doneWhenNone);
  });

  it("lists the skills a step needs with the person's mark, and counts its cost lines", () => {
    const plan = buildPlan(args({ skillMarks: [{ skillItemId: "skill-eval-math", ownLabel: null, mark: "have", markedOn: "2026-10-06" }] }));
    const train = stepOf(plan, "step-eval-train");
    expect(train.skills).toEqual([
      { label: "Trade math (test only)", mark: cockpitWords.plan.mark.have },
      { label: "Read drawings (test only)", mark: cockpitWords.plan.mark.none },
    ]);
    expect(train.costCount).toBe(cockpitWords.plan.costCount(2));
    expect(stepOf(plan, "step-eval-employed").costCount).toBeNull();
  });
});

describe("skills and requirements, with the marks: names only", () => {
  it("lists each skill item the road lists once, with its kind and the person's mark", () => {
    const plan = buildPlan(args({ skillMarks: [{ skillItemId: "skill-eval-drawings", ownLabel: null, mark: "learning", markedOn: "2026-10-06" }] }));
    // "Read drawings" is needed by two steps but listed once.
    expect(plan.skills.road.map((s) => s.label)).toEqual([
      "Trade math (test only)",
      "Read drawings (test only)",
      "Trade ticket (test only)",
      "Quote a job (test only)",
      "Keep books (test only)",
    ]);
    expect(plan.skills.road[1]).toEqual({ label: "Read drawings (test only)", kind: cockpitWords.panel.skillKind["listed-skill"], mark: cockpitWords.plan.mark.learning });
    expect(plan.skills.road[2]!.kind).toBe(cockpitWords.panel.skillKind["legal-requirement"]);
  });

  it("shows the person's own skills with their mark and day, and says when there are none", () => {
    const plan = buildPlan(args({ skillMarks: [{ skillItemId: null, ownLabel: "French polishing", mark: "not-yet", markedOn: "2026-10-07" }] }));
    expect(plan.skills.own).toEqual([{ label: "French polishing", mark: cockpitWords.plan.mark["not-yet"], day: "2026-10-07" }]);
    expect(plan.skills.ownNone).toBeNull();
    expect(buildPlan(args()).skills.ownNone).toBe(cockpitWords.plan.ownNone);
  });

  it("for the job picked: its name, the items marked by name, a count of the rest and the licence's line", () => {
    const code = oasisJobs[0]!.code;
    const list = oasisListForJob(code)!;
    const item = list.items[0]!;
    const plan = buildPlan(args({ jobCode: code, skillMarks: [{ skillItemId: item.id, ownLabel: null, mark: "have", markedOn: "2026-10-06" }] }));
    expect(plan.skills.job).toEqual({
      title: cockpitWords.plan.job(list.label, code, "2026-10-04"),
      items: [{ label: item.label, mark: cockpitWords.plan.mark.have }],
      notMarked: cockpitWords.plan.jobNotMarked(list.items.length - 1, list.items.length),
      attribution: OASIS_ATTRIBUTION,
    });
    expect(plan.skills.noJob).toBeNull();
    expect(buildPlan(args()).skills.noJob).toBe(cockpitWords.plan.noJob);
  });
});

describe("start-up money: three kinds of line, and a blank stays blank", () => {
  it("a named line not priced yet has no amount at all, and the plan never says $0 for it", () => {
    const plan = buildPlan(args());
    const blank = lineOf(plan, "cost-eval-books");
    expect(blank).toMatchObject({ label: "Textbooks (test only)", amount: null, kind: cockpitWords.plan.costKind["named-not-priced"], note: null, source: null });
    expect(strings(plan).filter((s) => /\$0\b/.test(s))).toEqual([]);
  });

  it("an official fee shows its amount, its source and the day it was read", () => {
    const plan = buildPlan(args());
    const tuition = lineOf(plan, "cost-eval-tuition");
    expect(tuition.amount).toBe("$1,500");
    expect(tuition.kind).toBe(cockpitWords.plan.costKind["official-fee"]);
    expect(tuition.source).toEqual({
      title: "Invented page (test only)",
      url: "https://example.org/invented",
      checked: "Read on 2026-10-01. Who read it wasn't recorded.",
      quotes: [],
    });
  });

  it("an official fee checked by a tool says so, with the day and the words the tool found", () => {
    const road = roadToEvaluate();
    const toolChecked = {
      title: "Invented fee page (test only)",
      authority: "provincial" as const,
      jurisdiction: "AB" as const,
      url: "https://example.org/fee",
      note: "Invented for a test; not a source.",
      toolCheck: { checkedOn: "2026-10-09", quotes: ["the exam fee is $300.00"] },
    };
    const ticket = road.steps.find((s) => s.id === "step-eval-ticket")!;
    ticket.costs = [{ ...(ticket.costs[0] as Extract<Road["steps"][number]["costs"][number], { kind: "official-fee" }>), citation: toolChecked }];
    const exam = lineOf(buildPlan(args({ road })), "cost-eval-exam");
    expect(exam.amount).toBe("$300");
    expect(exam.source).toEqual({
      title: "Invented fee page (test only)",
      url: "https://example.org/fee",
      checked:"Checked by a tool on 2026-10-09: it found on the page the exact words this entry relies on. Not read by a person yet.",
      quotes: ["the exam fee is $300.00"],
    });
  });

  it("a fee that applies only sometimes shows its condition and that no total adds it", () => {
    const road = roadToEvaluate();
    const ticket = road.steps.find((s) => s.id === "step-eval-ticket")!;
    ticket.costs = [{ ...(ticket.costs[0] as Extract<Road["steps"][number]["costs"][number], { kind: "official-fee" }>), onlyIf: "You failed the exam and rewrite it" }];
    expect(lineOf(buildPlan(args({ road })), "cost-eval-exam").note).toBe(cockpitWords.panel.onlyIf("You failed the exam and rewrite it"));
  });

  it("the person's agreed quote shows as theirs, with the day agreed and where it came from", () => {
    const quote = figure({ amountCents: 340_000, costLine: { roadId: ROAD_ID, stepId: "step-eval-own", lineId: "cost-eval-saw", amountFrom: "quote" } });
    // A proposed number is never shown as theirs: it counts for nothing until agreed.
    const proposed = figure({ status: "proposed", confirmedAt: null, amountCents: 99_900, costLine: { roadId: ROAD_ID, stepId: "step-eval-own", lineId: "cost-eval-deposit", amountFrom: "link" } });
    const plan = buildPlan(args({ figures: [quote, proposed] }));
    expect(lineOf(plan, "cost-eval-saw")).toMatchObject({
      amount: "$3,400",
      kind: cockpitWords.plan.costKind["your-quote"],
      note: cockpitWords.plan.quoteNote(TODAY, "a quote"),
      source: null,
    });
    expect(lineOf(plan, "cost-eval-deposit")).toMatchObject({ amount: null, kind: cockpitWords.plan.costKind["named-not-priced"] });
  });

  it("groups the lines by step in road order, with the step panel's note when they aren't counted", () => {
    const plan = buildPlan(args());
    expect(plan.money.byStep.map((s) => s.step)).toEqual([
      "Train (test only)",
      "Get your ticket (test only)",
      "Own shop (test only)",
      "Open the doors (test only)",
      "Keep the books (test only)",
    ]);
    // With no ending picked, the own-shop lines wait on the fork.
    expect(plan.money.byStep[2]!.note).toBe(cockpitWords.panel.costsWaiting("Ending (test only)"));
    expect(plan.money.byStep[0]!.note).toBeNull();
    // The sums are the Start-up money gauge's, never a new reading: the two fees on the path, not the one waiting.
    const a = args();
    const gauge = gaugeView(evaluateRoad(a.input), a.input.road, a.input.scenario).money;
    expect(plan.money.sums).toEqual([gauge.value, ...gauge.lines]);
    expect(plan.money.sums[0]).toContain(cockpitWords.gauges.money.fees(180_000, 2));
  });

  it("a road with no cost lines says so", () => {
    const road = roadToEvaluate();
    for (const s of road.steps) s.costs = [];
    const plan = buildPlan(args({ road }));
    expect(plan.money.byStep).toEqual([]);
    expect(plan.money.none).toBe(cockpitWords.lists.moneyNone);
  });
});

describe("what you've told DotAmi", () => {
  it("is the cockpit's left list, row for row, with each row's day and what it unlocked", () => {
    const a = args({
      skillMarks: [{ skillItemId: "skill-eval-math", ownLabel: null, mark: "have", markedOn: "2026-10-06" }],
      progress: [{ stepId: "step-eval-train", status: "done", doneWhenIds: [] }],
    });
    const plan = buildPlan(a);
    const rows = toldRows(a.input, evaluateRoad(a.input), a.kept);
    expect(plan.told.rows.map((r) => r.said)).toEqual(rows.map((r) => r.said));
    expect(plan.told.rows.find((r) => r.said === rows.find((x) => x.id === "skill:skill-eval-math")!.said)!.day).toBe("2026-10-06");
    // An answer whose day isn't kept says so, never a borrowed day; what it unlocked is the left list's,
    // with its line for "nothing changes", and nothing for an answer the map needs (the list shows none).
    rows.forEach((row, i) => {
      const shown = plan.told.rows[i]!;
      expect(shown.day).toBe(row.day ?? cockpitWords.told.dayNotKept);
      expect(shown.unlocked).toEqual(row.unlocked === null ? [] : row.unlocked.length === 0 ? [cockpitWords.told.nothingChanged] : row.unlocked);
    });
    expect(plan.told.rows.some((r) => r.unlocked.length > 0)).toBe(true);
    expect(plan.told.none).toBeNull();
  });

  it("never holds a what-if, which is never kept: the whole plan is the plan without it", () => {
    // On the ruled-fork road a first-year-sales what-if of $45,000 moves voluntary GST to "check first",
    // so a plan that let it through would differ in a step's state and reason, not only in the told list.
    const a = args({
      road: roadWithRuledFork(),
      forkPicks: { [RULED_FORK]: { stepId: "stage-2a-voluntary-gst-registration", pickedOn: "2026-10-05", from: "you" } },
    });
    const tried = { ...a, input: { ...a.input, whatIf: { firstYearSalesDollars: 45_000 } } };
    const steps = (input: PlanArgs["input"]) => evaluateRoad(input).steps.map((s) => `${s.stepId} ${s.state} ${s.because}`);
    // The what-if really changes the steps here, so the check below can fail.
    expect(steps(tried.input)).not.toEqual(steps(a.input));
    expect(strings(buildPlan(tried))).toEqual(strings(buildPlan(a)));
  });
});

describe("each heading and label says only what is under it", () => {
  it("the words heading doesn't call the idea's own sentence where the person wants to be", () => {
    // The sentence typed for the idea describes the idea; only the destination answer is "where you want
    // to be", and its own line says so.
    const plan = buildPlan(args({ change: { firstWords: { text: "A shop of my own.", saidAt: "2026-09-30" } } }));
    expect(plan.words).toHaveLength(1);
    expect(cockpitWords.plan.sections.words).not.toMatch(/where you want to be/i);
    expect(cockpitWords.plan.destination("2026-10-02")).toMatch(/where you want to be/);
  });

  it("the destination's line says it belongs to the person, not to this one idea", () => {
    expect(cockpitWords.plan.destination("2026-10-02")).toContain("not tied to one idea");
    expect(cockpitWords.plan.destination("2026-10-02")).toContain("2026-10-02");
  });

  it("the skills heading doesn't say 'you marked' over a list that holds items not marked and legal requirements", () => {
    const plan = buildPlan(args());
    expect(plan.skills.road.some((s) => s.mark === cockpitWords.plan.mark.none)).toBe(true);
    expect(plan.skills.road.some((s) => s.kind === cockpitWords.panel.skillKind["legal-requirement"])).toBe(true);
    expect(cockpitWords.plan.sections.skills).not.toMatch(/you marked/i);
    expect(cockpitWords.plan.sections.skills).toMatch(/requirements/i);
  });

  it("a fee's condition that ends in a full stop gets no second one on the plan", () => {
    const road = roadToEvaluate();
    const ticket = road.steps.find((s) => s.id === "step-eval-ticket")!;
    ticket.costs = [{ ...(ticket.costs[0] as Extract<Road["steps"][number]["costs"][number], { kind: "official-fee" }>), onlyIf: "You failed an exam and choose to rewrite it." }];
    const note = lineOf(buildPlan(args({ road })), "cost-eval-exam").note;
    expect(note).toBe("Only if: You failed an exam and choose to rewrite it. Not added to any total.");
    expect(strings(buildPlan(args({ road }))).filter((s) => s.includes(".."))).toEqual([]);
  });

  it("the told list names the figures' screen by its name since 2026-10-12, Your futures", () => {
    const told = Object.values(cockpitWords.told).filter((v): v is string => typeof v === "string");
    expect(told.filter((s) => /Your ideas/.test(s))).toEqual([]);
    expect(cockpitWords.told.dayOnYourIdeas).toContain("Your futures");
  });
});

describe("the standing line, and no verdict anywhere", () => {
  it("says DotAmi is not legal or tax advice but a preparation tool for an accountant and a lawyer", () => {
    const plan = buildPlan(args());
    expect(plan.notAdvice).toBe(cockpitWords.plan.notAdvice);
    expect(plan.notAdvice).toMatch(/not legal or tax advice/);
    expect(plan.notAdvice).toMatch(/accountant and lawyer/);
  });

  it("no sentence of the plan's words, nor any line of a full plan, carries a verdict word", () => {
    const sentences: string[] = [];
    const walk = (value: unknown) => {
      if (typeof value === "string") sentences.push(value);
      else if (typeof value === "function") {
        const fn = value as (...args: unknown[]) => unknown;
        for (const a of [[0, 0], [1, 2], ["“Label”", "2026-10-01"], ["Label", "Side"], [null]]) {
          let out: unknown;
          try {
            out = fn(...a);
          } catch {
            // Filled by the next set of values.
          }
          if (typeof out === "string") sentences.push(out);
        }
      } else if (value && typeof value === "object") for (const v of Object.values(value)) walk(v);
    };
    walk(cockpitWords.plan);
    expect(sentences.length).toBeGreaterThan(20);
    expect(sentences.filter((s) => VERDICT.test(s))).toEqual([]);

    const full = buildPlan(
      args({
        figures: [figure({ amountCents: 340_000, costLine: { roadId: ROAD_ID, stepId: "step-eval-own", lineId: "cost-eval-saw", amountFrom: "quote" } })],
        progress: [{ stepId: "step-eval-train", status: "done", doneWhenIds: ["dw-eval-train-1"] }],
        skillMarks: [{ skillItemId: "skill-eval-math", ownLabel: null, mark: "have", markedOn: "2026-10-06" }],
        forkPicks: { "fork-eval-ending": { stepId: "step-eval-own", pickedOn: "2026-10-05", from: "you" } },
        change: { firstWords: { text: "A shop of my own.", saidAt: "2026-09-30" }, incomeWanted: { amountCents: 7_000_000, agreedOn: "2026-10-01" } },
      }),
    );
    expect(strings(full).filter((s) => VERDICT.test(s))).toEqual([]);
  });
});

describe("the page", () => {
  // A plan with something in every list: told rows, a fork's ending, road skills, own skills, the job's
  // list, a quote, a fee, a blank, both quotes of the person's words and the agreed income.
  const jobCode = oasisJobs[0]!.code;
  const jobItem = oasisListForJob(jobCode)!.items[0]!;
  const view = buildPlan(
    args({
      progress: [{ stepId: "step-eval-train", status: "doing", doneWhenIds: ["dw-eval-train-1"] }],
      skillMarks: [
        { skillItemId: "skill-eval-math", ownLabel: null, mark: "have", markedOn: "2026-10-06" },
        { skillItemId: null, ownLabel: "French polishing", mark: "learning", markedOn: "2026-10-07" },
        { skillItemId: jobItem.id, ownLabel: null, mark: "have", markedOn: "2026-10-06" },
      ],
      forkPicks: { "fork-eval-ending": { stepId: "step-eval-own", pickedOn: "2026-10-05", from: "you" } },
      figures: [figure({ amountCents: 340_000, costLine: { roadId: ROAD_ID, stepId: "step-eval-own", lineId: "cost-eval-saw", amountFrom: "quote" } })],
      jobCode,
      change: {
        firstWords: { text: "A shop of my own.", saidAt: "2026-09-30" },
        destination: { text: "Work for myself, four days a week.", saidAt: "2026-10-02" },
        incomeWanted: { amountCents: 7_000_000, agreedOn: "2026-10-01" },
      },
    }),
  );
  const html = renderToStaticMarkup(createElement(PlanPage, { view, backHref: "/cockpit?venture=v1" }));
  // React's escaping of text and attributes.
  const esc = (text: string) => text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#x27;");

  it("draws every line the plan holds: nothing built is left off the page", () => {
    // Every list has something in it, so a list the page stops drawing is missed here.
    expect(view.told.rows.length).toBeGreaterThan(0);
    expect(view.road.endings).toHaveLength(1);
    expect(view.skills.road.length).toBeGreaterThan(0);
    expect(view.skills.own).toHaveLength(1);
    expect(view.skills.job?.items).toHaveLength(1);
    expect(view.target).not.toBeNull();
    expect(view.words).toHaveLength(2);
    // Ids are keys, never shown; every other string is on the page.
    const shown: string[] = [];
    const walk = (value: unknown, key = "") => {
      if (typeof value === "string") {
        if (key !== "id" && key !== "lineId") shown.push(value);
      } else if (Array.isArray(value)) for (const v of value) walk(v);
      else if (value && typeof value === "object") for (const [k, v] of Object.entries(value)) walk(v, k);
    };
    walk(view);
    expect(shown.length).toBeGreaterThan(50);
    expect(shown.filter((s) => !html.includes(esc(s)))).toEqual([]);
  });

  it("carries the standing not-advice line on the first page too, in the heading above the first section", () => {
    const line = html.indexOf(esc(cockpitWords.plan.notAdvice));
    expect(line).toBeGreaterThan(0);
    expect(line).toBeLessThan(html.indexOf("<section"));
    // And still as the last section, as before.
    expect(html.lastIndexOf(esc(cockpitWords.plan.notAdvice))).toBeGreaterThan(html.indexOf(`>${esc(cockpitWords.plan.sections.notAdvice)}</h2>`));
  });

  it("draws the sections in order, each a region named by its heading", () => {
    const s = cockpitWords.plan.sections;
    // React writes an apostrophe as &#x27; in HTML.
    const asHtml = (text: string) => text.replaceAll("&", "&amp;").replaceAll("'", "&#x27;");
    const order = [s.words, s.road, s.steps, s.skills, s.money, s.told, s.notAdvice].map((h) => html.indexOf(`>${asHtml(h)}</h2>`));
    expect(order.every((i) => i > 0)).toBe(true);
    expect([...order].sort((x, y) => x - y)).toEqual(order);
    expect(html).toContain("“A shop of my own.”");
  });

  it("has Back and Print in a bar that print hides, and the sheet breaks pages between sections", () => {
    expect(html).toContain(`href="/cockpit?venture=v1"`);
    expect(html).toContain(`>${cockpitWords.plan.back}</a>`);
    expect(html).toContain(`>${cockpitWords.plan.print}</button>`);
    expect(html).toMatch(/<div[^>]*data-plan-bar[^>]*class="[^"]*print:hidden/);
    expect(html).toMatch(/<section[^>]*class="[^"]*print:break-before-page/);
  });

  it("prints every link as its address: a link's text is the page it opens", () => {
    const links = [...html.matchAll(/<a [^>]*href="(https?:[^"]+)"[^>]*>([^<]*)<\/a>/g)];
    expect(links.length).toBeGreaterThan(0);
    for (const [, href, text] of links) expect(text).toBe(href);
  });

  // That the plan's components write no sentence or label of their own is tests/cockpit-own-words.spec.ts
  // (2026-10-17), which reads every file in components/cockpit/.

  it("the plan's content builder reads no file, database, network or clock", () => {
    const source = readFileSync(path.join(process.cwd(), "lib", "cockpit", "plan.ts"), "utf8");
    expect(source).not.toMatch(/\bfetch\s*\(|Date\.now|new Date\s*\(|Math\.random|process\.|require\s*\(|\bimport\s*\(|@\/lib\/prisma/);
  });
});
