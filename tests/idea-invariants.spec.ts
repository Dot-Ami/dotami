/**
 * The idea harness's checks can fail (S2.5.29b's controls, kept as tests): each invariant is shown catching
 * one planted failure on a real run of a corpus idea, and each word the no-times check lets through is
 * shown still to be in use, so a stale allowance can't sit in tests/helpers/time-words.ts unnoticed.
 *
 * Every idea that reaches road 0 has a known gap today (the "I'd incorporate at" question, known-gaps.ts),
 * so each control counts the failures the plant adds to the run's own.
 */
import { describe, expect, it } from "vitest";

import type { NotToldRow } from "@/lib/cockpit/told";
import { cockpitWords } from "@/lib/cockpit/words";
import { roadsV2026 } from "@/lib/engines/roads/v2026";

import { fakeIdDigits, IDEAS_V1 } from "./fixtures/ideas/v1";
import { checkRun, reachesTheEnd, sameOutput, type InvariantId } from "./helpers/idea-invariants";
import { runDigest, runIdea, type IdeaRun } from "./helpers/idea-pipeline";
import { findTimeWords, OFFICIAL_TIME_ALLOWANCES, YOUR_DATE_ALLOWANCES } from "./helpers/time-words";

// An Alberta business the corpus expects on road 0, and a cabinetmaker it expects on road 1.
const road0Idea = IDEAS_V1.find((idea) => idea.id === "idea-v1-0001")!;
const road1Idea = IDEAS_V1.find((idea) => idea.road === "road-1")!;

const failures = (run: IdeaRun, invariant: InvariantId) => checkRun(run).filter((f) => f.invariant === invariant).length;
/** How many failures of one invariant a change to a fresh run of the idea adds. */
function added(idea: typeof road0Idea, invariant: InvariantId, change: (run: IdeaRun) => void): number {
  const before = failures(runIdea(idea), invariant);
  const run = runIdea(idea);
  change(run);
  return failures(run, invariant) - before;
}
const plant = (text: string) => (run: IdeaRun) => void run.pieces.push({ where: "typed › plan › planted", text, kind: "dotami" });

describe("the harness's checks catch what they guard", () => {
  it("1. a verdict word or phrase in DotAmi's words", () => {
    expect(added(road0Idea, "no-verdict", plant("This is the best option for you."))).toBe(1);
    // The strict one-word list, over DotAmi's own sentences: "ready" alone is enough there.
    expect(added(road0Idea, "no-verdict", plant("Your money is ready."))).toBe(1);
  });

  it("2. a $0 shown for a blank", () => {
    expect(added(road0Idea, "no-zero-for-a-blank", plant("$0 your numbers (11 lines)"))).toBe(1);
    expect(
      added(road0Idea, "no-zero-for-a-blank", (run) => {
        const blank = run.typed!.final.plan.money.byStep.flatMap((g) => g.lines).find((l) => l.amount === null)!;
        blank.amount = "$0";
      }),
    ).toBe(1);
  });

  it("3. an amount nobody cited", () => {
    expect(added(road0Idea, "amounts-cited", plant("A typical start-up costs $4,321."))).toBe(1);
  });

  it("4. a time in DotAmi's words", () => {
    expect(added(road0Idea, "no-time-words", plant("This step takes about 3 weeks."))).toBe(1);
    expect(added(road0Idea, "no-time-words", plant("The fastest way to open."))).toBe(1);
  });

  it("5. a fork side that never reaches the end of its road", () => {
    const road = structuredClone(roadsV2026.find((r) => r.id === "road-apprentice-to-own-shop-ab")!);
    const fork = road.forks[0];
    // The second side now only loops back to itself.
    road.steps.find((s) => s.id === fork.sides[1])!.next = [fork.sides[1]];
    expect(reachesTheEnd(road, fork.sides[0])).toBe(true);
    expect(reachesTheEnd(road, fork.sides[1])).toBe(false);
    expect(added(road1Idea, "ends:forks-reach-the-end", (run) => void (run.picked = { ...run.picked!, road }))).toBe(1);
  });

  it("5. a question no answer changes, and a road drawn with no line saying why", () => {
    expect(added(road0Idea, "ends:questions-change-something", (run) => void run.typed!.questions.push({ id: "planted", changes: 0 }))).toBe(1);
    expect(added(road0Idea, "ends:road-drawn", (run) => void (run.typed!.final.plan.road.picked = ""))).toBe(1);
  });

  it("5. a question still asked after every question was answered, and no next step then", () => {
    const left: NotToldRow = { id: "structure", question: "Planted?", unlocks: "", answer: "box" };
    expect(added(road0Idea, "ends:answered-question-goes", (run) => void run.typed!.answered!.notTold.push(left))).toBe(1);
    // With every question answered, a question still asked doesn't stand in for a next step.
    expect(
      added(road0Idea, "ends:next-question-or-done", (run) => {
        run.typed!.answered = { ...run.typed!.answered!, next: [], notTold: [left] };
      }),
    ).toBe(1);
  });

  it("5. a road drawn that isn't the one written for the idea, with nothing saying so", () => {
    // The Alberta business's picked way in, as if it had landed on the cabinetmaker's road.
    const road1 = roadsV2026.find((r) => r.id === "road-apprentice-to-own-shop-ab")!;
    expect(added(road0Idea, "ends:no-silent-fallback", (run) => void (run.picked = { ...run.picked!, road: road1 }))).toBe(1);
  });

  it("6. a province the words don't name", () => {
    expect(added(road0Idea, "nothing-derived:province", (run) => void (run.parse = { ...run.parse!, province: "BC" }))).toBe(1);
  });

  it("6. the person's ID-like digits copied into DotAmi's words, however they are spaced", () => {
    // Its words hold fakeIdDigits("0"): one digit repeated, made at run time, never typed.
    const withDigits = IDEAS_V1.find((idea) => idea.id === "idea-v1-0253")!;
    const digits = fakeIdDigits("0", [9]);
    for (const copy of [fakeIdDigits("0"), digits, fakeIdDigits("0").replaceAll(" ", "-"), fakeIdDigits("0").replaceAll(" ", ".")]) {
      expect(added(withDigits, "nothing-derived:id-digits", plant(`Plan for ${copy}`)), copy).toBe(1);
    }
    // An amount with the same digits, written with commas, is not a copy; nor is a longer number.
    expect(added(withDigits, "nothing-derived:id-digits", plant(`$1,000,000,000 and 1${digits}`))).toBe(0);
  });

  it("6. a job picked for the person", () => {
    expect(
      added(road0Idea, "nothing-derived:job", (run) => {
        run.typed!.final.input = { ...run.typed!.final.input, job: { code: "72311.00", label: "Cabinetmakers", items: [] } };
      }),
    ).toBe(1);
  });

  it("7. two runs that differ", () => {
    const first = runDigest(runIdea(road0Idea));
    expect(sameOutput(road0Idea.id, first, runDigest(runIdea(road0Idea, { probeQuestions: false })))).toEqual([]);
    expect(sameOutput(road0Idea.id, first, first.replace("Alberta", "Albert a"))).toHaveLength(1);
  });
});

describe("the harness builds the cockpit as the app does", () => {
  it("passes the agreed yearly income beside the plan, never to road evaluation", () => {
    // components/cockpit/cockpit-page.tsx and lib/futures/read-plan.ts pass `personFigures: []` to
    // cockpitInput: the income shows as Your plan's target line, and no list or rule reads it.
    const picked = runIdea(road0Idea).picked!;
    expect(picked.fresh.input.agreed.incomeWantedCents).toBeNull();
    expect(picked.final.input.agreed.incomeWantedCents).toBeNull();
    expect(picked.final.plan.target).not.toBeNull();
  });
});

describe("the words no-times lets through", () => {
  it("catches a time in a sentence, and lets the person's own date through only as their date", () => {
    expect(findTimeWords("Registration takes about 6 weeks.")).not.toEqual([]);
    expect(findTimeWords("19 months from today")).not.toEqual([]);
    expect(findTimeWords("19 months from today", ["19 months from today"])).toEqual([]);
    expect(findTimeWords("$70,000 a year, before tax")).toEqual([]);
  });

  it("catches a time however it is written", () => {
    const missed = [
      "Registering takes a 30-day window.",
      "A 6-month program, then the exam.",
      "Most people finish this step in a year.",
      "plan for a month",
      "Expect this within a week of applying.",
      "A one-year course at NAIT.",
      "Allow half a year for this.",
      "about a year",
      "This is the shortest path to opening.",
    ].filter((text) => findTimeWords(text).length === 0);
    expect(missed).toEqual([]);
    // A rate or a frequency is not a wait.
    expect(["$70,000 a year, before tax", "a domain name that renews every year", "once a year"].flatMap((t) => findTimeWords(t))).toEqual([]);
  });

  it("finds every time on the written roads either listed as official requirement text or a known gap", () => {
    // Every line a road writes, by where it is. A line with a time left over must be one known gap.
    const lines = roadsV2026.flatMap((road) =>
      road.steps.flatMap((step) => [
        { where: `${road.id} › ${step.id} › summary`, text: step.summary },
        ...step.doneWhen.map((line) => ({ where: `${road.id} › ${step.id} › ${line.id}`, text: line.text })),
        ...[...step.citations, ...step.doneWhen.map((line) => line.citation)].map((c) => ({ where: `${road.id} › ${step.id} › source`, text: c.title })),
      ]),
    );
    const withTimes = [...new Set(lines.filter((line) => findTimeWords(line.text).length > 0).map((line) => line.where))];
    // known-gaps.ts: road 1's first step, "each designed to take about a year".
    expect(withTimes).toEqual(["road-apprentice-to-own-shop-ab › step-shop-register-apprentice › summary"]);
  });

  it("lets through only official requirement text still on a road, word for word", () => {
    const roadTexts = new Set(
      roadsV2026.flatMap((road) =>
        road.steps.flatMap((step) => [
          step.summary,
          ...step.doneWhen.map((line) => line.text),
          ...step.citations.map((c) => c.title),
          ...step.doneWhen.map((line) => line.citation.title),
        ]),
      ),
    );
    expect(OFFICIAL_TIME_ALLOWANCES.filter((a) => !roadTexts.has(a.text)).map((a) => a.where)).toEqual([]);
  });

  it("lets through only Your date's own words, still in the cockpit's words", () => {
    const all = JSON.stringify(cockpitWords);
    expect(YOUR_DATE_ALLOWANCES.filter((a) => !all.includes(a.text)).map((a) => a.where)).toEqual([]);
  });
});
