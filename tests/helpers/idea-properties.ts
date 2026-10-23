import fc from "fast-check";

import type { ConfirmedFigure } from "@/lib/brain/types";
import { buildPlan, type PlanView } from "@/lib/cockpit/plan";
import { notToldYet, type KeptAnswers, type NotToldRow } from "@/lib/cockpit/told";
import { nextOnYourRoad } from "@/lib/cockpit/view";
import type { CFENodeId } from "@/lib/engines/cfe/v2026";
import { forksAreTheMapToggles, generalRoadV2026, roadApprenticeToOwnShopAB, roadById, roadFederalStepsCA, skillItemsV2026, type Road } from "@/lib/engines/roads/v2026";
import { BUSINESS_TOTAL_KINDS, type FigureView } from "@/lib/figures/types";
import type { SkillMarkValue, StepStatus } from "@/lib/futures/types";
import { ACTIVITY_TAXONOMY } from "@/lib/journey/intent";
import { evaluateRoad, roadReceipt, withoutAnswer, type RoadEvaluation, type RoadEvaluationInput } from "@/lib/roads";
import { EMPLOYMENT_WORDS, monthsFromToday, STRUCTURE_WORDS, VENTURE_TYPE_WORDS } from "@/lib/roads/words";
import {
  branchDecisions,
  clearScenarioBranch,
  defaultActiveBranches,
  recomputeScenarioState,
  setIncorporateAt,
  updateScenarioBranch,
  type BranchDecisionId,
} from "@/lib/scenarios/branches";
import { NOT_SAID_FIELDS, PROVINCES, type EmploymentStatus, type Scenario, type VentureStructure, type VentureType } from "@/lib/scenarios/types";

import { ROAD_IDS, type Idea } from "../fixtures/ideas/v1";
import { cockpitFailures, type Failure, type InvariantId } from "./idea-invariants";
import { figure, piecesOfEvaluation, piecesOfNotTold, piecesOfPlan, type AddPiece, type CockpitRun, type IdeaRun } from "./idea-pipeline";
import { officialFeeAmounts, quotedOfficialAmounts, type AmountLedger } from "./number-provenance";
import type { TextPiece } from "./text-pieces";

/**
 * Property tests over the whole answer space road evaluation reads (S2.5.29d). The corpus harness
 * (tests/idea-harness.spec.ts) runs 367 ideas each through one fixed list of answers; here fast-check
 * generates the answers themselves, thousands of sets of them, on the two written roads: the place, the kind
 * of venture, the work situation, the structure, the kinds of work, hire-first, equipment, first- and
 * third-year sales (the CRA's $30,000 line and its two neighbours among them), business figures (most in the
 * shape the GST read counts, so in a share of runs the person's own figures beat the estimate), the what-if,
 * the person's own "I'd incorporate at", road 0's two map picks, road 1's fork, skill marks on the road's items
 * and in the person's own words, step statuses and ticks, the savings (blank, $0 or a number), a quote on any
 * named line, the yearly income wanted and Your date.
 *
 * Every generated set is run through `evaluateRoad` (which runs today's rules, `evaluateScenario`), *Not told
 * yet*, the receipts and *Your plan* (which runs *What you've told DotAmi*), and held to the same invariants as
 * the corpus, through the same code (`cockpitFailures` in ./idea-invariants.ts), plus the properties only a
 * generated space can check: taking an answer back restores the run before it; a quote never raises the count
 * of lines not priced; a blank is never $0, and a $0 of the person's own is never a blank; the same input gives
 * the same output; road evaluation's own sweep of counterfactuals (`rulesAnswers`) names exactly the answers a
 * step's colour depends on; the CRA's line is exceeded, never reached; and the person's own figures, when they
 * settle the CRA's test, decide it whatever the estimate says. The spec (tests/idea-properties.spec.ts) runs each
 * with a fixed seed in CI and a random one on request, and counts the runs in which the figures decided (a count
 * of 0 fails); tests/idea-properties-plants.spec.ts breaks the
 * product on purpose and sees a property fail with its counterexample.
 *
 * What fast-check generates is a `Generated` record (the road by id, the answers as data), turned into road
 * evaluation's input by `toInput` inside each property: a failing case then prints as the answers that failed,
 * not as the road's whole catalog entry.
 */

/** The fixed day every generated person answers on. */
export const PROPERTIES_TODAY = "2026-10-17";
const AT_NOON = `${PROPERTIES_TODAY}T12:00:00.000Z`;

/** The written roads, by permanent id: the federal steps too since 2026-10-21 (task 29j, any road). */
const ROAD_IDS_WRITTEN = [generalRoadV2026.id, roadApprenticeToOwnShopAB.id, roadFederalStepsCA.id] as const;
const road = (id: string): Road => roadById(id)!;

// --- The answer space, one arbitrary per answer.

/** The CRA's small-supplier line, and either side of it: the three numbers the boundary tests pin, plus any other. */
const REVENUE_EDGES = [0, 29_999, 30_000, 30_001] as const;
/** First-year sales in whole dollars: one of the edges half the time, otherwise any number a person might type. */
export const revenueDollars: fc.Arbitrary<number> = fc.oneof(fc.constantFrom(...REVENUE_EDGES), fc.integer({ min: 0, max: 2_000_000 }));
/** The same, never 0: an answer that is given. */
const givenRevenueDollars: fc.Arbitrary<number> = fc.oneof(fc.constantFrom(29_999, 30_000, 30_001), fc.integer({ min: 1, max: 2_000_000 }));
/** A third-year estimate in whole dollars: blank (0) or any number. */
const thirdYearDollars: fc.Arbitrary<number> = fc.oneof(fc.constant(0), fc.integer({ min: 1, max: 3_000_000 }));

/**
 * The person's own numbers for the money gauge, in cents. Whole dollars from $1 for a quote and the income
 * wanted; savings carry fifty cents so that savings minus any sum of whole-dollar fees and quotes is never $0
 * (a difference of $0 would be a legitimate "$0" that the gate's text check can't tell from a blank's; a
 * person's own $0 is checked on the structure instead, by `aBlankIsNeverZero`, and the what-if of $0 too).
 */
const wholeDollarsCents: fc.Arbitrary<number> = fc.integer({ min: 1, max: 5_000_000 }).map((dollars) => dollars * 100);
const savingsCentsGiven: fc.Arbitrary<number> = fc.integer({ min: 1, max: 5_000_000 }).map((dollars) => dollars * 100 + 50);

const ventureType: fc.Arbitrary<VentureType> = fc.constantFrom(...(Object.keys(VENTURE_TYPE_WORDS) as VentureType[]));
/** Every work situation the intake offers; "not said" is a picked future's and is set with that form below. */
const employment: fc.Arbitrary<EmploymentStatus> = fc.constantFrom(
  ...(Object.keys(EMPLOYMENT_WORDS) as EmploymentStatus[]).filter((status) => status !== "not-said"),
);
const structure: fc.Arbitrary<readonly [VentureStructure, "assumed" | "user"]> = fc.constantFrom(
  ["sole-prop", "assumed"] as const,
  ["sole-prop", "user"] as const,
  ["corporation", "user"] as const,
);
const kindsOfWork: fc.Arbitrary<string[]> = fc.uniqueArray(fc.constantFrom(...ACTIVITY_TAXONOMY), { maxLength: 4 });
const kindsOfWorkGiven: fc.Arbitrary<string[]> = fc.uniqueArray(fc.constantFrom(...ACTIVITY_TAXONOMY), { minLength: 1, maxLength: 4 });
const equipment: fc.Arbitrary<boolean | undefined> = fc.constantFrom(undefined, true, false);
const mapPicks: fc.Arbitrary<Record<BranchDecisionId, CFENodeId>> = fc.record({
  gstTiming: fc.constantFrom(...branchDecisions[0].options.map((o) => o.id)),
  incorporationTiming: fc.constantFrom(...branchDecisions[1].options.map((o) => o.id)),
});
const decided: fc.Arbitrary<BranchDecisionId[]> = fc.uniqueArray(fc.constantFrom<BranchDecisionId>("gstTiming", "incorporationTiming"), { maxLength: 2 });
const incorporateAtDollars: fc.Arbitrary<number> = fc.oneof(fc.integer({ min: 1, max: 999_999_999 }), fc.integer({ min: 1, max: 200_000 }));
const mark: fc.Arbitrary<SkillMarkValue> = fc.constantFrom("have", "learning", "not-yet");
const status: fc.Arbitrary<StepStatus> = fc.constantFrom("doing", "done", "not-for-me");
/** A person's own skills, in their own words. One per label whatever its capitals, as the storage keeps them. */
const OWN_SKILL_LABELS = ["Welding", "Quoting jobs", "Bookkeeping", "Talking to customers"] as const;
const ownSkillLabel: fc.Arbitrary<string> = fc.constantFrom(...OWN_SKILL_LABELS);
/** Your date: a month up to a year back or six years on, as "YYYY-MM". */
export const targetMonth: fc.Arbitrary<string> = fc.integer({ min: -12, max: 72 }).map((n) => {
  const total = 2026 * 12 + (10 - 1) + n;
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, "0")}`;
});

// --- The person's agreed business figures.
//
// The GST/HST card and the map's two GST stages read these (lib/brain/evaluate.ts `recordsVerdict`, through
// lib/brain/records.ts `readRevenue`), and the figures beat the estimate when they settle the CRA's test. The
// read counts a figure only when it is "gross-revenue", in CAD, ends by today, and covers exactly one calendar
// month or one calendar quarter of the four complete quarters before today's. Until the review of PR #187 every
// generated figure was a twelve-month period ending on the 28th, which the read never counts, so no generated
// run ever had its figures decide (0 of 780 runs at the fixed seed). Most figures are now generated in the
// shape the read counts, quarter by quarter; the rest in each shape it keeps but doesn't count.

/** A day's month as "YYYY-MM", from a month index counted from year 0 (January 2026 is 2026 * 12). */
const ym = (index: number) => `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, "0")}`;
/** The last day of a month, from its index: the 0th day of the month after, read in UTC. */
const lastDayOf = (index: number) => new Date(Date.UTC(Math.floor(index / 12), (index % 12) + 1, 0)).getUTCDate();
/** A period of whole calendar months, first month to last, as the store keeps it. */
const monthsPeriod = (first: number, last: number) => ({ periodStart: `${ym(first)}-01`, periodEnd: `${ym(last)}-${String(lastDayOf(last)).padStart(2, "0")}` });

/** Today's month, as an index. */
const TODAY_MONTH = 2026 * 12 + (Number(PROPERTIES_TODAY.slice(5, 7)) - 1);
/** The first month of today's calendar quarter. */
const CURRENT_QUARTER = TODAY_MONTH - (TODAY_MONTH % 3);
/** The four complete calendar quarters before today's, oldest first, by first month: the GST test's window. */
export const GST_WINDOW_QUARTERS = [12, 9, 6, 3].map((back) => CURRENT_QUARTER - back);

/** A figure's amount, in whole dollars as cents: the edges of the $30,000 line and its quarter, or any number. */
const figureCents: fc.Arbitrary<number> = fc
  .oneof(fc.constantFrom(0, 7_500, 29_999, 30_000, 30_001), fc.integer({ min: 0, max: 45_000 }))
  .map((dollars) => dollars * 100);
/** Where the person's figure came from: typed, or a file with its rows counted. */
const figureSource: fc.Arbitrary<{ sourceLabel: string; sourceRows: number | null }> = fc.constantFrom(
  { sourceLabel: "typed by you", sourceRows: null },
  { sourceLabel: "sales-2026.xlsx", sourceRows: 12 },
);

type FigureShape = Omit<ConfirmedFigure, "id">;
const revenue = (period: { periodStart: string; periodEnd: string }, amountCents: number, source: { sourceLabel: string; sourceRows: number | null }): FigureShape => ({
  kind: "gross-revenue",
  ...period,
  amountCents,
  currency: "CAD",
  ...source,
});

/**
 * One window quarter's figures, in a shape the read counts: none, the quarter in one figure, one of its months,
 * all three months one by one, or the quarter and one of its months both (two figures covering one month: the
 * read leaves that quarter out until the person chooses).
 */
function quarterFigures(first: number): fc.Arbitrary<FigureShape[]> {
  return fc.oneof(
    { weight: 3, arbitrary: fc.constant<FigureShape[]>([]) },
    { weight: 3, arbitrary: fc.tuple(figureCents, figureSource).map(([cents, src]) => [revenue(monthsPeriod(first, first + 2), cents, src)]) },
    { weight: 2, arbitrary: fc.tuple(fc.integer({ min: 0, max: 2 }), figureCents, figureSource).map(([i, cents, src]) => [revenue(monthsPeriod(first + i, first + i), cents, src)]) },
    { weight: 1, arbitrary: fc.tuple(figureCents, figureCents, figureCents, figureSource).map(([a, b, c, src]) => [a, b, c].map((cents, i) => revenue(monthsPeriod(first + i, first + i), cents, src))) },
    {
      weight: 1,
      arbitrary: fc
        .tuple(figureCents, fc.integer({ min: 0, max: 2 }), figureCents, figureSource)
        .map(([q, i, m, src]) => [revenue(monthsPeriod(first, first + 2), q, src), revenue(monthsPeriod(first + i, first + i), m, src)]),
    },
  );
}

/**
 * A figure in each shape the read keeps but doesn't count: another of the T2125 totals (never read for GST),
 * a year to the 28th (not a calendar month or quarter; the shape every generated figure had before), a month
 * that ends after today, a month in another currency, and a quarter from before the window.
 */
const uncountedFigure: fc.Arbitrary<FigureShape> = fc.tuple(figureCents, figureSource).chain(([cents, src]) =>
  fc.constantFrom<FigureShape>(
    ...BUSINESS_TOTAL_KINDS.filter((kind) => kind !== "gross-revenue").map((kind) => ({ ...revenue(monthsPeriod(GST_WINDOW_QUARTERS[3], GST_WINDOW_QUARTERS[3] + 2), cents, src), kind })),
    { ...revenue(monthsPeriod(TODAY_MONTH - 12, TODAY_MONTH - 1), cents, src), periodEnd: `${ym(TODAY_MONTH - 1)}-28` },
    revenue(monthsPeriod(TODAY_MONTH, TODAY_MONTH), cents, src),
    { ...revenue(monthsPeriod(GST_WINDOW_QUARTERS[2], GST_WINDOW_QUARTERS[2]), cents, src), currency: "USD" },
    revenue(monthsPeriod(GST_WINDOW_QUARTERS[0] - 3, GST_WINDOW_QUARTERS[0] - 1), cents, src),
  ),
);

const withIds = (shapes: FigureShape[]): ConfirmedFigure[] => shapes.map((shape, i) => ({ id: `figure-generated-${i + 1}`, ...shape }));

/** The four window quarters, each with its figures, and at most one figure the read doesn't count. */
const windowFigures: fc.Arbitrary<ConfirmedFigure[]> = fc
  .tuple(fc.tuple(...GST_WINDOW_QUARTERS.map(quarterFigures)), fc.option(uncountedFigure, { nil: null }))
  .map(([quarters, extra]) => withIds([...quarters.flat(), ...(extra ? [extra] : [])]));
/** Every window quarter covered, adding up to exactly the line: $30,000 is not over it. */
const exactlyOnTheLine: fc.Arbitrary<ConfirmedFigure[]> = figureSource.map((src) => withIds(GST_WINDOW_QUARTERS.map((first) => revenue(monthsPeriod(first, first + 2), 750_000, src))));
/** Only figures the read doesn't count: kept, listed on the card, and the estimate still decides. */
const uncountedFigures: fc.Arbitrary<ConfirmedFigure[]> = fc.array(uncountedFigure, { minLength: 1, maxLength: 2 }).map(withIds);

/** A set of the person's agreed business figures, never empty: what giving the figures answer gives. */
export const businessFiguresGiven: fc.Arbitrary<ConfirmedFigure[]> = fc
  .oneof({ weight: 5, arbitrary: windowFigures }, { weight: 1, arbitrary: exactlyOnTheLine }, { weight: 2, arbitrary: uncountedFigures })
  .filter((figures) => figures.length > 0);
/** The person's agreed business figures on a generated idea: none about a third of the time. */
const businessFigures: fc.Arbitrary<ConfirmedFigure[]> = fc.oneof({ weight: 1, arbitrary: fc.constant<ConfirmedFigure[]>([]) }, { weight: 2, arbitrary: businessFiguresGiven });

/**
 * The idea's answers as the map keeps them. Two forms, as the app has two ways in: typed on the intake (every
 * answer the person's), or picked on Pick a future (the kind of venture, equipment and the sales targets
 * never asked and listed as not said, the work situation "not said", no kinds of work; lib/front-door/
 * start-future.ts). The state is rebuilt from the picks the way every save rebuilds it.
 */
export const scenarioArb: fc.Arbitrary<Scenario> = fc
  .record({
    way: fc.constantFrom<"typed" | "picked">("typed", "picked"),
    province: fc.constantFrom(...PROVINCES),
    type: ventureType,
    employment,
    structure,
    tags: kindsOfWork,
    hireFirst: fc.boolean(),
    equipment,
    y1: revenueDollars,
    y3: thirdYearDollars,
    picks: mapPicks,
    decided,
    incorporateAt: fc.option(incorporateAtDollars, { nil: null }),
  })
  .map((a) => {
    const picked = a.way === "picked";
    return {
      id: "generated",
      profile: {
        name: "Generated (test only)",
        type: picked ? "service" : a.type,
        province: a.province,
        targetRevenueY1: picked ? 0 : a.y1,
        targetRevenueY3: picked ? 0 : a.y3,
        structure: a.structure[0],
        structureSource: a.structure[1],
        employmentStatus: picked ? "not-said" : a.employment,
        hireFirst: a.hireFirst,
        activityTags: picked ? [] : a.tags,
        ...(picked || a.equipment === undefined ? {} : { capitalPurchasePlanned: a.equipment }),
        stage: "idea",
        ...(picked ? { notSaid: [...NOT_SAID_FIELDS] } : {}),
      },
      state: { ...recomputeScenarioState(a.picks, a.hireFirst), decidedBranchIds: a.decided, incorporateAt: a.incorporateAt },
    };
  });

/** Every named cost line on a road, by step. */
const namedLines = (r: Road) => r.steps.flatMap((s) => s.costs.filter((c) => c.kind === "named").map((c) => ({ stepId: s.id, lineId: c.id })));
/** Every skill item a road's steps list, once. */
const roadItems = (r: Road) => [...new Set(r.steps.flatMap((s) => s.needs))];
/** Every skill item of every written road: a mark on another road's item is kept but changes nothing here. */
const ALL_ITEMS = [...new Set(ROAD_IDS_WRITTEN.flatMap((id) => roadItems(road(id))))];

type SkillMark = { skillItemId: string | null; ownLabel: string | null; mark: SkillMarkValue };
type Progress = { stepId: string; status: StepStatus | null; doneWhenIds: string[] };
type Quote = { stepId: string; lineId: string; amountCents: number };

/**
 * One generated set of answers: everything road evaluation reads, as data (the road by its id). `toInput`
 * turns it into the engine's input; a failing case prints as this record.
 */
export interface Generated {
  roadId: string;
  roadChosen: boolean;
  scenario: Scenario;
  figures: ConfirmedFigure[];
  /** The endings picked on a road other than road 0 (road 0's picks are the map's, in the scenario). */
  forkPicks: Record<string, { stepId: string; from: "you" | "map" }>;
  skillMarks: SkillMark[];
  progress: Progress[];
  quotes: Quote[];
  savingsCents: number | null;
  incomeWantedCents: number | null;
  targetMonth: string | null;
  whatIf: { firstYearSalesDollars: number } | null;
}

/**
 * Road 0's forks are the map's own picks, read from the idea as the cockpit reads them (lib/cockpit/view.ts
 * `cockpitInput`); any other road's picks are kept on the future. Worked out here on every build, so the two
 * never drift apart when the scenario changes.
 */
export function toInput(g: Generated): RoadEvaluationInput {
  const r = road(g.roadId);
  let forkPicks: RoadEvaluationInput["forkPicks"] = g.forkPicks;
  if (forksAreTheMapToggles(r)) {
    const branches: Record<string, string> = g.scenario.state.activeBranches;
    forkPicks = Object.fromEntries(
      r.forks.flatMap((fork) => (fork.sides.includes(branches[fork.id]) ? [[fork.id, { stepId: branches[fork.id], from: "map" as const }]] : [])),
    );
  }
  return {
    road: r,
    roadChosen: g.roadChosen,
    skillItems: skillItemsV2026,
    scenario: g.scenario,
    confirmedFigures: g.figures,
    forkPicks,
    skillMarks: g.skillMarks,
    job: null,
    progress: g.progress,
    agreed: { incomeWantedCents: g.incomeWantedCents, savingsCents: g.savingsCents, costLines: g.quotes },
    targetMonth: g.targetMonth,
    whatIf: g.whatIf,
    today: PROPERTIES_TODAY,
  };
}

export interface GenerateOptions {
  /** Let the person's own savings, quotes, income and what-if be $0 too (off for the text invariants: see `savingsCentsGiven`). */
  ownZero?: boolean;
  /**
   * The control for the figures coverage check only: every business figure starts on the 2nd of its month, so
   * none is a calendar month or quarter and none can reach the rules (the spec shows the count drop to 0).
   */
  figureShapeBroken?: boolean;
}

/** Every figure moved to start on the 2nd of its month: kept by the read, never counted. The coverage control. */
export const breakFigureShape = (figures: ConfirmedFigure[]): ConfirmedFigure[] => figures.map((f) => ({ ...f, periodStart: `${f.periodStart.slice(0, 7)}-02` }));

/** A whole set of answers: a road, the idea's answers, and everything the person told the cockpit. */
export function generatedArb(options: GenerateOptions = {}): fc.Arbitrary<Generated> {
  const quoteCents = options.ownZero ? fc.oneof(fc.constant(0), wholeDollarsCents) : wholeDollarsCents;
  const savings = options.ownZero ? fc.oneof(fc.constant(0), savingsCentsGiven) : savingsCentsGiven;
  const income = options.ownZero ? fc.oneof(fc.constant(0), wholeDollarsCents) : wholeDollarsCents;
  const whatIfDollars = options.ownZero ? revenueDollars : givenRevenueDollars;
  return fc.constantFrom(...ROAD_IDS_WRITTEN).chain((roadId) => {
    const r = road(roadId);
    const progressRow: fc.Arbitrary<Progress> = fc.constantFrom(...r.steps.map((s) => s.id)).chain((stepId) => {
      const step = r.steps.find((s) => s.id === stepId)!;
      return fc.record({ stepId: fc.constant(stepId), status: fc.option(status, { nil: null }), doneWhenIds: fc.subarray(step.doneWhen.map((d) => d.id)) });
    });
    const forkPicks: fc.Arbitrary<Generated["forkPicks"]> =
      forksAreTheMapToggles(r)
        ? fc.constant({})
        : fc
            .record(
              Object.fromEntries(
                r.forks.map((fork) => [
                  fork.id,
                  fc.option(fc.record({ stepId: fc.constantFrom(...fork.sides), from: fc.constantFrom<"you" | "map">("you", "map") }), { nil: undefined }),
                ]),
              ),
            )
            .map((picks) => Object.fromEntries(Object.entries(picks).filter(([, pick]) => pick !== undefined)) as Generated["forkPicks"]);
    return fc.record<Generated>({
      roadId: fc.constant(roadId),
      roadChosen: fc.boolean(),
      scenario: scenarioArb,
      figures: options.figureShapeBroken ? businessFigures.map(breakFigureShape) : businessFigures,
      forkPicks,
      skillMarks: fc
        .tuple(
          fc.uniqueArray(fc.record({ skillItemId: fc.constantFrom(...ALL_ITEMS), ownLabel: fc.constant(null), mark }), { selector: (m) => m.skillItemId, maxLength: 6 }),
          fc.uniqueArray(fc.record({ skillItemId: fc.constant(null), ownLabel: ownSkillLabel, mark }), { selector: (m) => m.ownLabel.toLocaleLowerCase(), maxLength: 2 }),
        )
        .map(([items, own]) => [...items, ...own]),
      progress: fc.uniqueArray(progressRow, { selector: (p) => p.stepId, maxLength: 5 }),
      // Any named line can be quoted, at most four at once: the amounts check (./number-provenance.ts) works
      // out every sum of the fees and quotes, which road 1's nine fees and thirty named lines would make
      // 2^39 sums (the corpus quotes one line per idea, so it never saw this).
      quotes: fc
        .subarray(namedLines(r), { maxLength: 4 })
        .chain((lines) => fc.array(quoteCents, { minLength: lines.length, maxLength: lines.length }).map((amounts) => lines.map((line, i) => ({ ...line, amountCents: amounts[i] })))),
      savingsCents: fc.option(savings, { nil: null }),
      incomeWantedCents: fc.option(income, { nil: null }),
      targetMonth: fc.option(targetMonth, { nil: null }),
      whatIf: fc.option(fc.record({ firstYearSalesDollars: whatIfDollars }), { nil: null }),
    });
  });
}

// --- One generated run, held to the corpus's invariants.

/** The figures the plan reads, built from the agreed numbers the way the storage would give them back. */
function figuresOf(input: RoadEvaluationInput): FigureView[] {
  const idea = { id: "generated" };
  const { agreed } = input;
  return [
    ...(agreed.savingsCents === null ? [] : [figure(idea, { kind: "savings-for-start", amountCents: agreed.savingsCents })]),
    ...agreed.costLines.map((q) =>
      figure(idea, { kind: "start-up-cost-line", amountCents: q.amountCents, costLine: { roadId: input.road.id, stepId: q.stepId, lineId: q.lineId, amountFrom: "quote" } }),
    ),
    ...(input.confirmedFigures ?? []).map((f) =>
      figure(idea, { id: f.id, kind: f.kind as FigureView["kind"], amountCents: f.amountCents, periodStart: f.periodStart, periodEnd: f.periodEnd }),
    ),
  ];
}

function keptAnswersOf(input: RoadEvaluationInput): KeptAnswers {
  return {
    progress: input.progress.map((p) => ({ stepId: p.stepId, changes: p.status ? [{ at: AT_NOON, status: p.status }] : [], updatedAt: AT_NOON })),
    skillMarks: input.skillMarks.map((m) => ({ ...m, markedOn: PROPERTIES_TODAY })),
    forkPickedOn: Object.fromEntries(Object.keys(input.forkPicks).map((forkId) => [forkId, PROPERTIES_TODAY])),
    targetMonthSetOn: input.targetMonth === null ? null : PROPERTIES_TODAY,
    figures: figuresOf(input),
    incomeWantedOn: input.agreed.incomeWantedCents === null ? null : PROPERTIES_TODAY,
  };
}

/** The plan for a generated run, as the plan page builds it from what is kept. */
export function planOf(input: RoadEvaluationInput): PlanView {
  return buildPlan({
    ideaName: input.scenario.profile.name,
    input,
    kept: keptAnswersOf(input),
    firstWords: null,
    destination: null,
    incomeWanted: input.agreed.incomeWantedCents === null ? null : { amountCents: input.agreed.incomeWantedCents, agreedOn: PROPERTIES_TODAY },
    roadChosenOn: input.roadChosen ? PROPERTIES_TODAY : null,
    jobPickedOn: null,
    today: PROPERTIES_TODAY,
  });
}

/** Everything the person's numbers could be, in cents, for the amounts check: nothing else may show as an amount. */
function ledgerOf(input: RoadEvaluationInput): AmountLedger {
  const p = input.scenario.profile;
  const quotes = input.agreed.costLines.map((q) => q.amountCents);
  const roadFees = input.road.steps.flatMap((s) => s.costs.flatMap((c) => (c.kind === "official-fee" ? [c.amountCents] : [])));
  return {
    officialFees: officialFeeAmounts(),
    yours: [
      ...(input.agreed.savingsCents === null ? [] : [input.agreed.savingsCents]),
      ...(input.agreed.incomeWantedCents === null ? [] : [input.agreed.incomeWantedCents]),
      ...quotes,
      p.targetRevenueY1 * 100,
      p.targetRevenueY3 * 100,
      ...(input.whatIf ? [input.whatIf.firstYearSalesDollars * 100] : []),
      ...(input.scenario.state.incorporateAt == null ? [] : [input.scenario.state.incorporateAt * 100]),
      ...(input.confirmedFigures ?? []).map((f) => f.amountCents),
    ],
    quotedThresholds: quotedOfficialAmounts(),
    addable: [...roadFees, ...quotes],
    // No generated screen shows a published wage (About this job isn't part of road evaluation or the plan).
    publishedWageRows: [],
  };
}

export interface GeneratedRun {
  input: RoadEvaluationInput;
  evaluation: RoadEvaluation;
  notTold: NotToldRow[];
  plan: PlanView;
  pieces: TextPiece[];
}

/** One generated input through road evaluation, *Not told yet* and the plan, with every line those write. */
export function generatedRun(input: RoadEvaluationInput): GeneratedRun {
  const pieces: TextPiece[] = [];
  const add: AddPiece = (where, text, kind = "dotami") => {
    if (text) pieces.push({ where: `typed › ${where}`, text, kind });
  };
  const evaluation = evaluateRoad(input);
  const notTold = notToldYet(input, evaluation);
  piecesOfEvaluation(add, "fresh", evaluation, input);
  piecesOfNotTold(add, "fresh", notTold);
  for (const a of evaluation.answers.filter((a) => a.given)) add(`told › ${a.id} › taken back`, a.takenBack);
  // The plan runs *What you've told DotAmi* (each answer's receipt, through the receipt code) and lists it.
  const plan = planOf(input);
  piecesOfPlan(add, plan);
  return { input, evaluation, notTold, plan, pieces };
}

/**
 * The one invariant the corpus holds per idea that a generated input can't be held to: the road written for
 * the place is the 28d gap (every written road is Alberta's, and the place is generated here), which the
 * harness ratchets idea by idea.
 */
const LEFT_TO_THE_HARNESS: readonly InvariantId[] = ["ends:road-written-for-place"];

/**
 * The corpus's invariants over one generated run, through the harness's own checks: no verdict, no $0 for a
 * blank, every amount cited or the person's own, no time words, the road drawn with a reason, a next step or a
 * question or the road done, every fork side reaching the end, no silent fallback, no job set for the person.
 */
export function invariantFailures(run: GeneratedRun): Failure[] {
  const { input } = run;
  const next = nextOnYourRoad(run.evaluation, input.scenario).map((s) => s.stepId);
  const months = run.evaluation.gauges.date?.monthsFromToday;
  const state = { input, evaluation: run.evaluation, notTold: run.notTold, next };
  const c: CockpitRun = {
    way: "typed",
    // A generated run starts in the cockpit: the job is the generated person's own pick (or none), and no step of
    // Pick a future is played, so step 3's checks have nothing to read.
    steps: {
      job: input.job ? { code: input.job.code, label: input.job.label } : null,
      search: null,
      area: null,
      region: null,
      match: "skipped",
      offered: [],
      click: { by: "card", roadId: input.road.id },
    },
    job: input.job?.code ?? null,
    pick: null,
    road: input.road,
    roadChosen: input.roadChosen,
    fresh: state,
    final: { ...state, plan: run.plan },
    // The question probes and the rounds of answers are the harness's (they need its fixed answers); here
    // every answer is generated at once, so those two checks are left out of the run.
    answered: null,
    receipts: [],
    questions: [],
    ledger: ledgerOf(input),
    dateWords: months === undefined ? [] : [monthsFromToday(months)],
    // No generated screen quotes the government's requirement lines (About this job isn't part of the plan).
    quotedLines: [],
  };
  const idea: Idea = {
    id: "generated",
    words: "",
    people: "only-an-idea",
    place: input.scenario.profile.province,
    named: [],
    lookingFor: "not-said",
    work: "generated",
    noc: null,
    tags: [],
    road: input.road.id === ROAD_IDS["road-1"] ? "road-1" : input.road.id === ROAD_IDS["road-federal"] ? "road-federal" : "road-0",
  };
  const ideaRun: IdeaRun = {
    idea,
    parse: null,
    draft: null,
    province: input.scenario.profile.province,
    intakeEnd: null,
    typedSteps: null,
    pickedSteps: null,
    typed: c,
    picked: null,
    pieces: run.pieces,
  };
  const failures: Failure[] = [];
  cockpitFailures(ideaRun, c, (invariant, subject, detail) => {
    if (!LEFT_TO_THE_HARNESS.includes(invariant)) failures.push({ ideaId: idea.id, invariant, subject, detail });
  });
  return failures;
}

/** Property: every generated run holds the corpus's invariants. Returns the failures, so the spec can print them. */
export function holdsTheInvariants(input: RoadEvaluationInput): string[] {
  return invariantFailures(generatedRun(input)).map((f) => `${f.invariant} · ${f.subject}: ${f.detail}`);
}

// --- Taking an answer back restores the run before it.

/**
 * One answer the person can give, as data: which answer (road evaluation's own ids, lib/roads/evaluate-road.ts
 * `ToldAnswer.id`, or the kind the id is built from) and the value given.
 */
export type AnswerChoice =
  | { kind: "idea:structure"; structure: VentureStructure }
  | { kind: "idea:hire-first" }
  | { kind: "idea:incorporate-at"; dollars: number }
  | { kind: "idea:figures"; figures: ConfirmedFigure[] }
  | { kind: "what-if"; dollars: number }
  | { kind: "idea:kinds-of-work"; tags: string[] }
  | { kind: "idea:equipment"; yes: boolean }
  | { kind: "idea:sales-year-1"; dollars: number }
  | { kind: "idea:sales-year-3"; dollars: number }
  | { kind: "map-pick"; forkId: string; side: string }
  | { kind: "fork"; forkId: string; side: string }
  | { kind: "skill"; skillItemId: string; mark: SkillMarkValue }
  | { kind: "own-skill"; ownLabel: string; mark: SkillMarkValue }
  | { kind: "step"; stepId: string; status: StepStatus }
  | { kind: "ticks"; stepId: string; doneWhenIds: string[] }
  | { kind: "cost-line"; stepId: string; lineId: string; amountCents: number }
  | { kind: "savings"; cents: number }
  | { kind: "income-wanted"; cents: number }
  | { kind: "date"; month: string };

/** One answer the person gave, with the input before it (the answer not given) and after it. */
export interface GivenAnswer {
  answerId: string;
  before: RoadEvaluationInput;
  after: RoadEvaluationInput;
}

/**
 * Every answer a generated set can be given, one arbitrary per kind. The idea's answers the picked way in
 * never asks (kinds of work, equipment, the sales targets) are given only on a typed idea, where road
 * evaluation lists them as the person's.
 */
export function answerChoiceArb(g: Generated): fc.Arbitrary<AnswerChoice> {
  const r = road(g.roadId);
  const typed = !(g.scenario.profile.notSaid ?? []).length;
  const stepIds = r.steps.map((s) => s.id);
  const kinds: fc.Arbitrary<AnswerChoice>[] = [
    fc.constantFrom<VentureStructure>("sole-prop", "corporation").map((structure) => ({ kind: "idea:structure", structure })),
    fc.constant<AnswerChoice>({ kind: "idea:hire-first" }),
    incorporateAtDollars.map((dollars) => ({ kind: "idea:incorporate-at", dollars })),
    businessFiguresGiven.map((figures) => ({ kind: "idea:figures", figures })),
    revenueDollars.map((dollars) => ({ kind: "what-if", dollars })),
    fc.tuple(fc.constantFrom(...roadItems(r)), mark).map(([skillItemId, m]) => ({ kind: "skill", skillItemId, mark: m })),
    fc.tuple(ownSkillLabel, mark).map(([ownLabel, m]) => ({ kind: "own-skill", ownLabel, mark: m })),
    fc.tuple(fc.constantFrom(...stepIds), status).map(([stepId, s]) => ({ kind: "step", stepId, status: s })),
    fc
      .constantFrom(...r.steps.filter((s) => s.doneWhen.length > 0).map((s) => s.id))
      .chain((stepId) => fc.subarray(r.steps.find((s) => s.id === stepId)!.doneWhen.map((d) => d.id), { minLength: 1 }).map((doneWhenIds) => ({ kind: "ticks" as const, stepId, doneWhenIds }))),
    fc.tuple(fc.constantFrom(...namedLines(r)), wholeDollarsCents).map(([line, amountCents]) => ({ kind: "cost-line", ...line, amountCents })),
    fc.oneof(fc.constant(0), savingsCentsGiven).map((cents) => ({ kind: "savings", cents })),
    fc.oneof(fc.constant(0), wholeDollarsCents).map((cents) => ({ kind: "income-wanted", cents })),
    targetMonth.map((month) => ({ kind: "date", month })),
  ];
  if (typed) {
    kinds.push(
      kindsOfWorkGiven.map((tags) => ({ kind: "idea:kinds-of-work", tags })),
      fc.boolean().map((yes) => ({ kind: "idea:equipment", yes })),
      givenRevenueDollars.map((dollars) => ({ kind: "idea:sales-year-1", dollars })),
      givenRevenueDollars.map((dollars) => ({ kind: "idea:sales-year-3", dollars })),
    );
  }
  for (const fork of r.forks) {
    const kind = forksAreTheMapToggles(r) ? "map-pick" : "fork";
    kinds.push(fc.constantFrom(...fork.sides).map((side) => ({ kind, forkId: fork.id, side })));
  }
  return fc.oneof(...kinds);
}

const profileWith = (input: RoadEvaluationInput, change: Partial<Scenario["profile"]>): RoadEvaluationInput => ({
  ...input,
  scenario: { ...input.scenario, profile: { ...input.scenario.profile, ...change } },
});

const stateWith = (input: RoadEvaluationInput, change: Partial<Scenario["state"]>): RoadEvaluationInput => ({
  ...input,
  scenario: { ...input.scenario, state: { ...input.scenario.state, ...change } },
});

/** Hire-first off or on, with the map's own lists rebuilt as the intake's save rebuilds them (lib/roads/without-answer.ts). */
function hireFirstSet(input: RoadEvaluationInput, on: boolean): RoadEvaluationInput {
  const { scenario } = input;
  const state = recomputeScenarioState(scenario.state.activeBranches, on);
  return {
    ...input,
    scenario: {
      ...scenario,
      profile: { ...scenario.profile, hireFirst: on },
      state: { ...state, decidedBranchIds: scenario.state.decidedBranchIds, incorporateAt: scenario.state.incorporateAt },
    },
  };
}

/** The answer given to the generated set: the input with it not given (its canonical "not told" state) and with it given. */
export function giveAnswer(g: Generated, choice: AnswerChoice): GivenAnswer {
  const input = toInput(g);
  const { scenario } = input;
  const p = scenario.profile;
  // On road 0 the map's picks are read from the scenario, so an input built from a changed scenario rebuilds them.
  const withScenario = (s: Scenario) => toInput({ ...g, scenario: s });
  const given = (answerId: string, before: RoadEvaluationInput, after: RoadEvaluationInput): GivenAnswer => ({ answerId, before, after });
  switch (choice.kind) {
    case "idea:structure":
      return given(choice.kind, profileWith(input, { structure: "sole-prop", structureSource: "assumed" }), profileWith(input, { structure: choice.structure, structureSource: "user" }));
    case "idea:hire-first":
      return given(choice.kind, hireFirstSet(input, false), hireFirstSet(input, true));
    case "idea:incorporate-at":
      return given(choice.kind, withScenario(setIncorporateAt(scenario, null)), withScenario(setIncorporateAt(scenario, choice.dollars)));
    case "idea:figures":
      return given(choice.kind, { ...input, confirmedFigures: [] }, { ...input, confirmedFigures: choice.figures });
    case "what-if":
      return given(choice.kind, { ...input, whatIf: null }, { ...input, whatIf: { firstYearSalesDollars: choice.dollars } });
    case "idea:kinds-of-work":
      return given(choice.kind, profileWith(input, { activityTags: [] }), profileWith(input, { activityTags: choice.tags }));
    case "idea:equipment": {
      const { capitalPurchasePlanned: _answered, ...rest } = p;
      void _answered;
      return given(choice.kind, { ...input, scenario: { ...scenario, profile: rest as Scenario["profile"] } }, profileWith(input, { capitalPurchasePlanned: choice.yes }));
    }
    case "idea:sales-year-1":
      return given(choice.kind, profileWith(input, { targetRevenueY1: 0 }), profileWith(input, { targetRevenueY1: choice.dollars }));
    case "idea:sales-year-3":
      return given(choice.kind, profileWith(input, { targetRevenueY3: 0 }), profileWith(input, { targetRevenueY3: choice.dollars }));
    case "map-pick": {
      // Not given: the map's default side, not marked as the person's. Given: the person's click on a side (the
      // default side too: a click is theirs).
      const decision = choice.forkId as BranchDecisionId;
      const before = clearScenarioBranch(scenario, decision);
      return given(`map-pick:${choice.forkId}`, withScenario(before), withScenario(updateScenarioBranch(before, decision, choice.side as CFENodeId)));
    }
    case "fork": {
      const { [choice.forkId]: _pick, ...rest } = input.forkPicks;
      void _pick;
      return given(`fork:${choice.forkId}`, { ...input, forkPicks: rest }, { ...input, forkPicks: { ...rest, [choice.forkId]: { stepId: choice.side, from: "you" } } });
    }
    case "skill": {
      const without = { ...input, skillMarks: input.skillMarks.filter((x) => x.skillItemId !== choice.skillItemId) };
      return given(`skill:${choice.skillItemId}`, without, { ...without, skillMarks: [...without.skillMarks, { skillItemId: choice.skillItemId, ownLabel: null, mark: choice.mark }] });
    }
    case "own-skill": {
      const key = choice.ownLabel.toLocaleLowerCase();
      const without = { ...input, skillMarks: input.skillMarks.filter((x) => !(x.skillItemId === null && x.ownLabel?.toLocaleLowerCase() === key)) };
      return given(`own-skill:${key}`, without, { ...without, skillMarks: [...without.skillMarks, { skillItemId: null, ownLabel: choice.ownLabel, mark: choice.mark }] });
    }
    case "step": {
      const rest = input.progress.filter((x) => x.stepId !== choice.stepId);
      const row = input.progress.find((x) => x.stepId === choice.stepId) ?? { stepId: choice.stepId, status: null, doneWhenIds: [] };
      return given(`step:${choice.stepId}`, { ...input, progress: [...rest, { ...row, status: null }] }, { ...input, progress: [...rest, { ...row, status: choice.status }] });
    }
    case "ticks": {
      const rest = input.progress.filter((x) => x.stepId !== choice.stepId);
      const row = input.progress.find((x) => x.stepId === choice.stepId) ?? { stepId: choice.stepId, status: null, doneWhenIds: [] };
      return given(`ticks:${choice.stepId}`, { ...input, progress: [...rest, { ...row, doneWhenIds: [] }] }, { ...input, progress: [...rest, { ...row, doneWhenIds: choice.doneWhenIds }] });
    }
    case "cost-line": {
      const rest = input.agreed.costLines.filter((q) => !(q.stepId === choice.stepId && q.lineId === choice.lineId));
      return given(
        `cost-line:${choice.stepId}/${choice.lineId}`,
        { ...input, agreed: { ...input.agreed, costLines: rest } },
        { ...input, agreed: { ...input.agreed, costLines: [...rest, { stepId: choice.stepId, lineId: choice.lineId, amountCents: choice.amountCents }] } },
      );
    }
    case "savings":
      return given(choice.kind, { ...input, agreed: { ...input.agreed, savingsCents: null } }, { ...input, agreed: { ...input.agreed, savingsCents: choice.cents } });
    case "income-wanted":
      return given(choice.kind, { ...input, agreed: { ...input.agreed, incomeWantedCents: null } }, { ...input, agreed: { ...input.agreed, incomeWantedCents: choice.cents } });
    case "date":
      return given(choice.kind, { ...input, targetMonth: null }, { ...input, targetMonth: choice.month });
  }
}

/** The road-evaluation output as one string: what "the same run" means. */
export const digest = (input: RoadEvaluationInput) => JSON.stringify({ evaluation: evaluateRoad(input), notTold: notToldYet(input, evaluateRoad(input)) });

/**
 * Property: the answer is listed as given once given; taking it back (`withoutAnswer`) is possible and gives
 * the run before it, word for word.
 */
export function takingAnAnswerBackRestores({ answerId, before, after }: GivenAnswer): string[] {
  const problems: string[] = [];
  const listed = evaluateRoad(after).answers.find((a) => a.id === answerId);
  if (!listed?.given) problems.push(`${answerId}: not listed as given after the person gave it`);
  const restored = withoutAnswer(after, answerId);
  if (restored === null) {
    problems.push(`${answerId}: withoutAnswer gives null, so it can't be taken back`);
    return problems;
  }
  const expected = digest(before);
  const got = digest(restored);
  if (expected !== got) {
    let at = 0;
    while (at < expected.length && expected[at] === got[at]) at += 1;
    problems.push(`${answerId}: the run after taking it back differs at character ${at}: “${expected.slice(Math.max(0, at - 60), at + 60)}” vs “${got.slice(Math.max(0, at - 60), at + 60)}”`);
  }
  return problems;
}

// --- A quote never raises the count of lines not priced.

/** A quote for one named line on the generated set's road, priced or not before. */
export function quoteArb(g: Generated): fc.Arbitrary<Quote> {
  return fc.tuple(fc.constantFrom(...namedLines(road(g.roadId))), fc.oneof(fc.constant(0), wholeDollarsCents)).map(([line, amountCents]) => ({ ...line, amountCents }));
}

/** The plan's count of lines with no amount: the printed "not priced" lines. */
const blankPlanLines = (plan: PlanView) => plan.money.byStep.flatMap((grp) => grp.lines).filter((l) => l.amount === null).length;

export function aQuoteNeverRaisesNotPriced(input: RoadEvaluationInput, quote: Quote): string[] {
  const rest = input.agreed.costLines.filter((q) => !(q.stepId === quote.stepId && q.lineId === quote.lineId));
  const after: RoadEvaluationInput = { ...input, agreed: { ...input.agreed, costLines: [...rest, quote] } };
  const m0 = evaluateRoad(input).gauges.money;
  const m1 = evaluateRoad(after).gauges.money;
  const problems: string[] = [];
  if (m1.notPricedLines > m0.notPricedLines) problems.push(`not priced went ${m0.notPricedLines} → ${m1.notPricedLines} after a quote on ${quote.stepId}/${quote.lineId}`);
  if (m1.yourNumberLines < m0.yourNumberLines) problems.push(`your number lines went ${m0.yourNumberLines} → ${m1.yourNumberLines} after a quote`);
  const b0 = blankPlanLines(planOf(input));
  const b1 = blankPlanLines(planOf(after));
  if (b1 > b0) problems.push(`the plan's blank lines went ${b0} → ${b1} after a quote`);
  return problems;
}

// --- A blank is never $0, and a $0 of the person's own is never a blank.

/**
 * Property, on the structure (the words are held by `holdsTheInvariants`): savings left blank give no savings
 * and no difference, and no "savings" answer; savings of $0 are an answer, $0, with the difference worked out;
 * the money gauge counts exactly the named lines with no quote on the steps it counts as not priced, and
 * every quoted line (a $0 quote too) as the person's number, read from the road and the quotes independently
 * of the gauge; and the plan prints no amount for a line not priced.
 */
export function aBlankIsNeverZero(input: RoadEvaluationInput): string[] {
  const problems: string[] = [];
  const blank = evaluateRoad({ ...input, agreed: { ...input.agreed, savingsCents: null } });
  const zero = evaluateRoad({ ...input, agreed: { ...input.agreed, savingsCents: 0 } });
  if (blank.gauges.money.savingsCents !== null) problems.push(`blank savings read ${blank.gauges.money.savingsCents}`);
  if (blank.gauges.money.differenceCents !== null) problems.push(`blank savings give a difference of ${blank.gauges.money.differenceCents}`);
  if (blank.answers.some((a) => a.id === "savings")) problems.push("blank savings are listed as an answer");
  if (zero.gauges.money.savingsCents !== 0) problems.push(`$0 savings read ${zero.gauges.money.savingsCents}`);
  if (!zero.answers.some((a) => a.id === "savings" && a.given)) problems.push("$0 savings are not listed as the person's answer");
  const priced = zero.gauges.money.officialFeeLines + zero.gauges.money.yourNumberLines;
  const expectedDifference = priced > 0 ? 0 - (zero.gauges.money.officialFeesCents + zero.gauges.money.yourNumbersCents) : null;
  if (zero.gauges.money.differenceCents !== expectedDifference) problems.push(`$0 savings give a difference of ${zero.gauges.money.differenceCents}, not ${expectedDifference}`);

  const quoted = new Map(input.agreed.costLines.filter((q) => Number.isSafeInteger(q.amountCents) && q.amountCents >= 0).map((q) => [`${q.stepId}/${q.lineId}`, q.amountCents]));
  let notPriced = 0;
  let yourLines = 0;
  let yourCents = 0;
  for (const step of blank.steps) {
    if (step.money !== "counted") continue;
    const onRoad = input.road.steps.find((s) => s.id === step.stepId)!;
    for (const line of onRoad.costs) {
      if (line.kind !== "named") continue;
      const cents = quoted.get(`${step.stepId}/${line.id}`);
      if (cents === undefined) notPriced += 1;
      else {
        yourLines += 1;
        yourCents += cents;
      }
    }
  }
  const m = blank.gauges.money;
  if (m.notPricedLines !== notPriced) problems.push(`not priced: the gauge counts ${m.notPricedLines}, the road and the quotes give ${notPriced}`);
  if (m.yourNumberLines !== yourLines || m.yourNumbersCents !== yourCents) {
    problems.push(`your numbers: the gauge says ${m.yourNumbersCents} over ${m.yourNumberLines} lines, the quotes give ${yourCents} over ${yourLines}`);
  }
  for (const group of planOf(input).money.byStep) {
    for (const line of group.lines) {
      if (line.amount === null && line.note?.includes("$0")) problems.push(`the plan's blank line ${line.lineId} says “${line.note}”`);
    }
  }
  return problems;
}

// --- The same input gives the same output.

export function sameInputSameOutput(input: RoadEvaluationInput): string[] {
  const problems: string[] = [];
  const first = evaluateRoad(input);
  const again = evaluateRoad(structuredClone(input));
  if (JSON.stringify(first) !== JSON.stringify(again)) problems.push("two runs of road evaluation differ");
  if (roadReceipt(first, again).length > 0) problems.push(`a receipt between two runs of the same input: ${roadReceipt(first, again).join(" | ")}`);
  if (JSON.stringify(planOf(input)) !== JSON.stringify(planOf(structuredClone(input)))) problems.push("two plans of the same input differ");
  if (JSON.stringify(notToldYet(input, first)) !== JSON.stringify(notToldYet(structuredClone(input), again))) problems.push("two Not told yet lists differ");
  return problems;
}

// --- Road evaluation's sweep of counterfactuals names exactly the answers a step's colour depends on.

/**
 * The alternatives road evaluation tries for one of the idea's answers (`rulesAnswers` in
 * lib/roads/evaluate-road.ts: another place, kind of venture, work situation or structure; a toggle flipped;
 * the other side of a map fork; the kinds of work, a number, the figures or the what-if taken away), built
 * here from the input so the sweep is checked against an independent list.
 */
export function alternativesOf(input: RoadEvaluationInput, answerId: string): RoadEvaluationInput[] {
  const s = input.scenario;
  const p = s.profile;
  switch (answerId) {
    case "idea:place":
      return PROVINCES.filter((x) => x !== p.province).map((province) => profileWith(input, { province }));
    case "idea:venture-type":
      return (Object.keys(VENTURE_TYPE_WORDS) as VentureType[]).filter((t) => t !== p.type).map((type) => profileWith(input, { type }));
    case "idea:work-situation":
      return (Object.keys(EMPLOYMENT_WORDS) as EmploymentStatus[]).filter((e) => e !== p.employmentStatus).map((employmentStatus) => profileWith(input, { employmentStatus }));
    case "idea:structure":
      return (Object.keys(STRUCTURE_WORDS) as VentureStructure[]).filter((x) => x !== p.structure).map((st) => profileWith(input, { structure: st, structureSource: "user" }));
    case "idea:kinds-of-work":
      return [profileWith(input, { activityTags: [] })];
    case "idea:hire-first":
      return [profileWith(input, { hireFirst: !p.hireFirst })];
    case "idea:equipment":
      return [profileWith(input, { capitalPurchasePlanned: !(p.capitalPurchasePlanned ?? false) })];
    case "idea:sales-year-1":
      return [profileWith(input, { targetRevenueY1: 0 })];
    case "idea:sales-year-3":
      return [profileWith(input, { targetRevenueY3: 0 })];
    case "idea:figures":
      return [{ ...input, confirmedFigures: [] }];
    case "what-if":
      return [{ ...input, whatIf: null }];
    case "idea:incorporate-at":
      return [stateWith(input, { incorporateAt: null })];
  }
  if (answerId.startsWith("map-pick:")) {
    const forkId = answerId.slice("map-pick:".length);
    const fork = generalRoadV2026.forks.find((f) => f.id === forkId);
    const held = s.state.activeBranches[forkId];
    const other = fork?.sides.find((side) => side !== held);
    return other ? [stateWith(input, { activeBranches: { ...s.state.activeBranches, [forkId]: other as CFENodeId } })] : [];
  }
  return [];
}

/** The ids `rulesAnswers` produces: the idea's answers, the what-if and the map's picks (not the person's marks, statuses or numbers). */
const isIdeaAnswer = (id: string) => id.startsWith("idea:") || id === "what-if" || id.startsWith("map-pick:");

export function theSweepIsConsistent(input: RoadEvaluationInput): string[] {
  const problems: string[] = [];
  const base = evaluateRoad(input);
  const colours = base.rules.nodeStates as Record<string, string>;
  const ideaAnswers = base.answers.filter((a) => isIdeaAnswer(a.id)).map((a) => a.id);
  // Each answer's alternatives, run once, and the steps whose colour each changes.
  const changesBy = new Map<string, Set<string>>();
  for (const id of ideaAnswers) {
    const changed = new Set<string>();
    for (const alternative of alternativesOf(input, id)) {
      const other = evaluateRoad(alternative).rules.nodeStates as Record<string, string>;
      for (const step of input.road.steps) if (step.id in colours && other[step.id] !== colours[step.id]) changed.add(step.id);
    }
    changesBy.set(id, changed);
  }
  for (const step of base.steps) {
    if (step.reason.kind !== "rules") continue;
    const named = new Set(step.reason.answerIds);
    for (const id of named) {
      if (!ideaAnswers.includes(id)) problems.push(`${step.stepId} names “${id}”, which isn't one of the idea's answers`);
      else if (!changesBy.get(id)!.has(step.stepId)) problems.push(`${step.stepId} names “${id}”, and no alternative to it changes the step's colour`);
    }
    for (const id of ideaAnswers) {
      if (!named.has(id) && changesBy.get(id)!.has(step.stepId)) problems.push(`${step.stepId} doesn't name “${id}”, though an alternative to it changes the step's colour`);
    }
  }
  return problems;
}

// --- The CRA's line is exceeded, never reached.

/** The GST/HST small-supplier rule's card, by its permanent id. */
const GST_CARD = "compliance-gst-small-supplier";
const MANDATORY_GST = "stage-2b-mandatory-gst-registration";
const RIDE_SHARE = "Ride-share or taxi driving";

/**
 * Property: with no agreed business figures (which beat the estimate), the GST/HST card says the first-year
 * number is over $30,000 exactly when it is over, never at $30,000 itself; the what-if stands in for the
 * estimate; and with the mandatory stage picked at GST timing, that stage lights only then (for work the
 * line doesn't cover, drivers, it lights from the first paid ride whatever the number).
 */
export function theLineIsExceededNotReached(input: RoadEvaluationInput): string[] {
  const problems: string[] = [];
  const run: RoadEvaluationInput = { ...input, confirmedFigures: [] };
  const evaluation = evaluateRoad(run);
  const p = run.scenario.profile;
  const effective = run.whatIf ? run.whatIf.firstYearSalesDollars : p.targetRevenueY1;
  const over = effective > 30_000;
  const card = evaluation.rules.unlocks.find((u) => u.id === GST_CARD);
  if (!card) return [`no ${GST_CARD} card for ${p.province}`];
  if (card.why.includes("is over $30,000") !== over) problems.push(`at ${effective} the card says “${card.why}”`);
  const driver = (p.activityTags ?? []).includes(RIDE_SHARE);
  const colour = (evaluation.rules.nodeStates as Record<string, string>)[MANDATORY_GST];
  if (run.scenario.state.activeBranches.gstTiming === MANDATORY_GST) {
    const expected = driver || over ? "green" : "yellow";
    if (colour !== expected) problems.push(`at ${effective}${driver ? " (a driver)" : ""} the mandatory stage is ${colour}, not ${expected}`);
  }
  return problems;
}

// --- The person's own figures beat the estimate.

/**
 * What the CRA's test says of the person's figures, worked out here from the figures alone (not through
 * lib/brain/records.ts): a figure counts when it is gross revenue in CAD, ends by today, and is exactly one
 * calendar month or quarter starting in the window; a quarter with two figures on one month is left out; the
 * test is crossed when a quarter alone, or the window's total, is over $30,000; and the figures settle it when
 * crossed or when every month of the window is covered by exactly one figure.
 */
export function figuresVerdict(figures: readonly ConfirmedFigure[]): { decides: boolean; crossed: boolean } {
  const index = (day: string) => Number(day.slice(0, 4)) * 12 + Number(day.slice(5, 7)) - 1;
  const byMonth = new Map<number, ConfirmedFigure[]>();
  for (const f of figures) {
    if (f.kind !== "gross-revenue" || f.currency !== "CAD" || f.periodEnd > PROPERTIES_TODAY) continue;
    const first = index(f.periodStart);
    const last = index(f.periodEnd);
    const wholeMonths = f.periodStart.endsWith("-01") && Number(f.periodEnd.slice(8)) === lastDayOf(last);
    const monthOrQuarter = first === last || (first % 3 === 0 && last === first + 2);
    if (!wholeMonths || !monthOrQuarter || first < GST_WINDOW_QUARTERS[0]) continue;
    for (let m = first; m <= last; m += 1) byMonth.set(m, [...(byMonth.get(m) ?? []), f]);
  }
  const LINE = 3_000_000;
  let total = 0;
  let complete = true;
  let overInAQuarter = false;
  for (const first of [...GST_WINDOW_QUARTERS, CURRENT_QUARTER]) {
    const months = [first, first + 1, first + 2].map((m) => byMonth.get(m) ?? []);
    const conflict = months.some((fs) => fs.length > 1);
    const cents = conflict ? 0 : [...new Set(months.flat())].reduce((sum, f) => sum + f.amountCents, 0);
    if (cents > LINE) overInAQuarter = true;
    if (first === CURRENT_QUARTER) continue;
    total += cents;
    if (conflict || months.some((fs) => fs.length !== 1)) complete = false;
  }
  const crossed = overInAQuarter || total > LINE;
  return { decides: crossed || complete, crossed };
}

/**
 * Whether the person's figures decided the GST/HST card in this run, read from what road evaluation wrote: the
 * card's reason is the figures' own ("your confirmed revenue for …"), with the records it leaned on. This is
 * what the coverage check counts: runs that reached "the person's own figures beat the estimate".
 */
export function figuresDecideTheCard(input: RoadEvaluationInput): boolean {
  const card = evaluateRoad(input).rules.unlocks.find((u) => u.id === GST_CARD);
  return card !== undefined && card.fromRecords !== undefined && card.why.startsWith("Shown because your confirmed revenue");
}

/**
 * Property: when the person's figures settle the CRA's test, they decide, whatever the first-year estimate or
 * the what-if says: the card's reason is the figures', over $30,000 exactly when the figures are, and the
 * mandatory stage picked at GST timing lights by the figures (or from the first paid ride, for a driver). When
 * they don't settle it, the estimate decides, as `theLineIsExceededNotReached` checks.
 */
export function theFiguresBeatTheEstimate(input: RoadEvaluationInput): string[] {
  const problems: string[] = [];
  const figures = input.confirmedFigures ?? [];
  const expected = figuresVerdict(figures);
  const decided = figuresDecideTheCard(input);
  if (decided !== expected.decides) {
    problems.push(`the figures ${expected.decides ? "settle" : "don't settle"} the test, but the card ${decided ? "reads them as deciding" : "keeps the estimate"}`);
    return problems;
  }
  if (!expected.decides) return problems;
  const evaluation = evaluateRoad(input);
  const card = evaluation.rules.unlocks.find((u) => u.id === GST_CARD)!;
  const cardOver = /— over \$30,000/.test(card.why);
  if (cardOver !== expected.crossed) problems.push(`the figures are ${expected.crossed ? "" : "not "}over the line, and the card says “${card.why}”`);
  if (card.fromRecords!.figureIds.length === 0) problems.push("the card leans on the person's records but names no figure");
  const driver = (input.scenario.profile.activityTags ?? []).includes(RIDE_SHARE);
  if (input.scenario.state.activeBranches.gstTiming === MANDATORY_GST) {
    const colour = (evaluation.rules.nodeStates as Record<string, string>)[MANDATORY_GST];
    const want = driver || expected.crossed ? "green" : "yellow";
    if (colour !== want) problems.push(`with the figures ${expected.crossed ? "over" : "not over"} the line${driver ? " (a driver)" : ""} the mandatory stage is ${colour}, not ${want}`);
  }
  return problems;
}

/** How many of the generated sets reach "the person's own figures beat the estimate", out of how many. */
export function figuresPathCount<T>(arb: fc.Arbitrary<T>, inputOf: (value: T) => RoadEvaluationInput, params: { seed: number; numRuns: number }): { reached: number; runs: number } {
  const values = fc.sample(arb, params);
  return { reached: values.filter((value) => figuresDecideTheCard(inputOf(value))).length, runs: values.length };
}

/** The coverage check: throws when no generated set reached the figures path, so a property can't pass by never going there. */
export function assertFiguresPathReached(name: string, count: { reached: number; runs: number }): void {
  if (count.reached === 0) throw new Error(`${name}: 0 of ${count.runs} generated runs had the person's own figures decide the GST/HST card`);
}

/** Every property, by the name the spec runs it under. */
export const PROPERTIES = {
  holdsTheInvariants,
  takingAnAnswerBackRestores,
  aQuoteNeverRaisesNotPriced,
  aBlankIsNeverZero,
  sameInputSameOutput,
  theSweepIsConsistent,
  theLineIsExceededNotReached,
  theFiguresBeatTheEstimate,
} as const;

/** A generated set plus one answer given to it, for `takingAnAnswerBackRestores` (built by `giveAnswer`). */
export const generatedWithAnswer: fc.Arbitrary<{ generated: Generated; answer: AnswerChoice }> = generatedArb().chain((generated) =>
  answerChoiceArb(generated).map((answer) => ({ generated, answer })),
);
/** A generated set plus a quote for one of its road's named lines. */
export const generatedWithQuote: fc.Arbitrary<{ generated: Generated; quote: Quote }> = generatedArb({ ownZero: true }).chain((generated) =>
  quoteArb(generated).map((quote) => ({ generated, quote })),
);

/** The default side the map holds at a fork, for the spec's own guard that the generated space reaches both sides. */
export const DEFAULT_SIDE = defaultActiveBranches;
