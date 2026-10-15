import { oasisJobByCode } from "@/lib/engines/oasis/v2026";
import { roadApprenticeToOwnShopAB } from "@/lib/engines/roads/v2026";
import { scenarioForPickedFuture } from "@/lib/front-door/start-future";
import type { FigureView } from "@/lib/figures/types";

import { MARA_SOURCES } from "./mara-sources";
import { toolsTotalCents } from "./stats";
import type { ExampleFuture } from "./types";

/**
 * Mara: the invented example future behind the front door's third door, "Show me an example first"
 * (the maintainer's pick of 2026-10-13; docs/architecture/future-cockpit.md § 13 and its appendix, "an
 * invented example", which tells her whole story).
 *
 * AN INVENTED PERSON. Nothing here is about anyone, nothing is read from or written to the data file, and
 * every screen that shows it says so in a banner that never folds.
 *
 * Her numbers are real ones since 2026-10-14 (the maintainer's option A: "ground Mara's example in real,
 * cited numbers where they exist; numbers nothing real can supply stay blank"). None is typed here: each is
 * taken from lib/examples/mara-sources.ts, the prices and statistics as seen on 2026-10-14 with their links,
 * and the averages are worked out by lib/examples/stats.ts (tests/example-sources.spec.ts traces each one).
 *  - Her one start-up cost line, "Woodworking machines and tools": the twelve tools the trade's official
 *    descriptions name, one of each at its average listed price, added up.
 *  - Her yearly income goal: what employed cabinetmakers in Alberta average a year (alis, 2023), the
 *    figure as the source prints it; not what a shop owner earns, and the goal bar says which it is.
 *  - Her what-if: the average yearly revenue of small and medium furniture makers in Canada (ISED, 2024);
 *    not a first-year figure, and the what-if bar says so.
 *  - Her savings and her shop space deposit stay blank: nothing real can supply them.
 * The official fees, the skills lists and their sources are the real catalogs' (road 1, the official fees
 * catalog, OaSIS): this file only names their ids, and a test checks that every id exists.
 *
 * Where the appendix names something the catalog calls differently, the catalog's real item is used:
 *  - "Set up your shop" is the step "Open your own shop" (`step-shop-open-own-shop`): its named line
 *    "Woodworking machines and tools" is the one she prices (until 2026-10-14 she also priced "Shop space
 *    deposit", with an invented number; no source gives one, so it is blank).
 *  - "9 skills marked" (6 have, 2 learning, 1 not yet): road 1 lists only three skills of its own, all
 *    legal requirements, and one of them (a trade certificate from outside Alberta) doesn't fit a person
 *    apprenticing in Alberta. So she marks the two that fit, both have, and picks Cabinetmakers as the
 *    job closest to her work, the government's list her other seven marks are on (the Skills overlay
 *    shows that list on road 1, tagged "your pick of job").
 *  - "1 step marked done": "Register as a Cabinetmaker apprentice", the first step on the road, which a
 *    second-year apprentice has done.
 */

/** Every answer is dated this one invented day. */
const DAY = "2026-10-13";
/** The moment of each answer that keeps a moment, on that day. */
const AT = `${DAY}T18:00:00.000Z`;

/** Ids are written only on this example's own rows, never read from the data file. */
const ID = "example-mara";

const road = roadApprenticeToOwnShopAB;

// ---- Her numbers, each taken from a source entry (none typed here) --------------------------------

/** A statistic by id; a missing one is a bug in this file, never a blank to fill with a guess. */
function statistic(id: string) {
  const found = MARA_SOURCES.statistics.find((s) => s.id === id);
  if (!found || found.amountCents === undefined) throw new Error(`Mara's sources have no amount for ${id}`);
  return found;
}

/** Her yearly income goal: the average yearly salary of employed cabinetmakers in Alberta, as alis prints it. */
const INCOME_FROM = "alis-yearly-average";
/** Her what-if: the average yearly revenue of small and medium furniture makers in Canada, as ISED prints it. */
const WHAT_IF_FROM = "ised-33712-revenue";
/** "Woodworking machines and tools": one of each listed tool at its average listed price. */
const TOOLS_CENTS = toolsTotalCents(MARA_SOURCES.tools);

// ---- The catalog items she answered about (real ids) ---------------------------------------------

/** The job she picked as closest to her own work: Cabinetmakers, on the government's list. */
const JOB_CODE = "72311.00";

/** The step she marked done. */
const DONE_STEP_ID = "step-shop-register-apprentice";

/** The step and the named line she priced. */
const SHOP_STEP_ID = "step-shop-open-own-shop";
const MACHINES_LINE_ID = "cost-shop-machines-tools";

/** The fork she picked a side of in Compare, and the side: This is mine on "Open your own shop". */
const FORK_ID = "fork-shop-employed-or-own";

/**
 * Her nine marks, in the order she set them: two of road 1's own legal requirements, then seven items
 * of the Cabinetmakers list. 6 have, 2 learning, 1 not yet.
 */
const MARKS = [
  { skillItemId: "skill-ab-alberta-student-number", mark: "have" },
  { skillItemId: "skill-ab-apprenticeship-education-agreement", mark: "have" },
  { skillItemId: "skill-ca-oasis-f.01.c.01", mark: "have" }, // Numeracy
  { skillItemId: "skill-ca-oasis-f.03.a.01", mark: "have" }, // Equipment and Tool Selection
  { skillItemId: "skill-ca-oasis-f.03.a.03", mark: "have" }, // Setting Up
  { skillItemId: "skill-ca-oasis-f.03.a.04", mark: "have" }, // Operation and Control
  { skillItemId: "skill-ca-oasis-f.03.a.09", mark: "learning" }, // Product Design
  { skillItemId: "skill-ca-oasis-g.06.a.04", mark: "learning" }, // Technical Design
  { skillItemId: "skill-ca-oasis-f.04.a.01", mark: "not-yet" }, // Management of Financial Resources
] as const;

/** One of her agreed numbers, shaped as the figures list gives it. */
function agreed(id: string, kind: FigureView["kind"], amountCents: number, costLine: FigureView["costLine"], sourceLabel: string): FigureView {
  return {
    id: `${ID}-${id}`,
    ventureId: ID,
    kind,
    periodStart: DAY,
    periodEnd: DAY,
    amountCents,
    currency: "CAD",
    sourceKind: "typed",
    sourceLabel,
    sourceRows: null,
    taxYear: null,
    formLine: null,
    costLine,
    status: "confirmed",
    editedByPerson: false,
    proposedAt: AT,
    confirmedAt: AT,
    retractedAt: null,
  };
}

const job = oasisJobByCode(JOB_CODE);

export const exampleMara: ExampleFuture = {
  id: "mara",
  person: "Mara",
  // Picked on Pick a future: only what she answered goes in (her place; the road's own name), and her work
  // situation, the kind of venture, equipment and the sales targets stay "not said", as for anyone.
  scenario: scenarioForPickedFuture({ road, place: "CA-AB", name: "" }, ID),
  kept: {
    future: {
      ventureId: ID,
      roadId: road.id,
      roadChosen: true,
      roadChosenOn: DAY,
      place: "CA-AB",
      forkPicks: { [FORK_ID]: { stepId: SHOP_STEP_ID, pickedOn: DAY, from: "you" } },
      // She hasn't set a date, so Your date shows its question.
      targetMonth: null,
      targetMonthSetOn: null,
      lookingFor: "both-or-not-sure",
      lookingForOn: DAY,
      job: job ? { code: job.code, label: job.label, pickedOn: DAY } : null,
    },
    progress: [
      {
        roadId: road.id,
        stepId: DONE_STEP_ID,
        status: "done",
        doneWhenIds: [],
        changes: [{ at: AT, status: "done" }],
        updatedAt: AT,
      },
    ],
    skillMarks: MARKS.map((m, i) => ({ id: `${ID}-mark-${i + 1}`, skillItemId: m.skillItemId, ownLabel: null, mark: m.mark, markedOn: DAY })),
    incomeWanted: { amountCents: statistic(INCOME_FROM).amountCents!, agreedOn: DAY },
    // Picked through Your destination, so the idea has no first sentence of its own; the goal bar shows her
    // destination, word for word.
    firstWords: null,
    destination: { text: "My own small furniture shop, four-day weeks, home for supper.", saidAt: DAY },
  },
  figures: [
    // From links: every price behind it is a seller's page (amountFrom "link", the same id a person's own
    // number from a link would carry).
    agreed(
      "machines-tools",
      "start-up-cost-line",
      TOOLS_CENTS,
      { roadId: road.id, stepId: SHOP_STEP_ID, lineId: MACHINES_LINE_ID, amountFrom: "link" },
      "sellers' listed prices, averaged",
    ),
  ],
  // No incorporation number of her own (road 1 draws no Incorporating step of its own; it joins road 0's
  // there, so the step panel's "I'd incorporate at" box is never drawn for her).
  // The source prints thousands of dollars; the what-if bar takes whole dollars.
  whatIfFirstYearSalesDollars: statistic(WHAT_IF_FROM).amountCents! / 100,
  sources: { data: MARA_SOURCES, toolsLineId: MACHINES_LINE_ID, incomeWantedFrom: INCOME_FROM, whatIfFrom: WHAT_IF_FROM },
};
