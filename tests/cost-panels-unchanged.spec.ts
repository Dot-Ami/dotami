/**
 * Moving the official fees into one catalog (lib/engines/fees/v2026/, 2026-10-12) changes no card.
 *
 * tests/fixtures/official-fees/panels-before.json is every step panel of both roads, and each road's
 * money list, drawn before the move by tests/helpers/cost-panels.ts: from main at f24d22c (2026-10-12),
 * redrawn on 2026-10-13 from PR #162's own head (6428ae3, that main plus #162) when #162 joined. #162
 * changed only two "Shown because" lines, on 11 panels: a federal program's and a federal rule's.
 * Redrawn again on 2026-10-13 when the skills pull request (#158) joined: drawn from its own head
 * (4e643d7, that main plus #158) and compared with that main's drawing, it changes one panel only,
 * Mandatory GST registration, whose "No skills are listed for this step yet." becomes its legal
 * requirement, A GST/HST registration with the Canada Revenue Agency; that change is applied to the
 * fixture as #162 left it. Redrawn on 2026-10-13 for two panels when the map stages' dead government
 * pages moved (tests/moved-government-pages.spec.ts): Employee/Apprentice baseline and SR&ED deepening,
 * whose sources now link the new pages and say "Checked by a tool"; no other panel changed. Redrawn
 * again on 2026-10-14 when issue #40 (research tax credit steps off the path without a research kind of
 * work) joined that main (6d13ccd): drawn from that main plus only #40's change and compared with that
 * main's fixture, it changes one panel of 32 only, SR&ED deepening, whose "Why this colour" sentence
 * "Today's rules give it this colour; no single answer of yours changes that." becomes "None of the kinds
 * of work on this idea is Software / SaaS, Manufacturing or AI / ML / R&D, and this step is on your path
 * only with one of them." (the invented idea is a trade; the sentence says what is on the idea, not what
 * the person told DotAmi); its moved sources stay as they were. Redrawn on 2026-10-14 from that main
 * (e7969ca) plus only the doubled full stop fix (tests/step-panel-double-full-stop.spec.ts): two entries
 * change, the apprentice road's TQ recognized-credential panel and its money list, each by one removed
 * "." in "rewrite it.. Not added to any total.". Redrawn on 2026-10-14 from that main (5d8da50) plus only
 * the records step (tests/keep-records-step.spec.ts): two entries are added, the new Keep your records from
 * day one panel on each road, and none of the 32 already there changes. Those two entries were redrawn the
 * same day, and only they, when the step's summary and its where-and-how-long line gained the CRA's other
 * retention periods and its note on records kept abroad. Drawn again now, each is the same HTML, byte for byte.
 * Redrawn on 2026-10-15 from main (1e96a04) plus only build list item 19 (the first written future's fee
 * blanks looked up again, tests/road-apprentice-to-own-shop.spec.ts): three entries of 34 change, the
 * apprentice road's Red Seal panel (its application fee now $150, from Tradesecrets' Apply Online page,
 * applying only sometimes), its Register your business name panel (the blanks' reasons and sources) and its
 * money list (both of those); no other panel changes. Edited on 2026-10-17 for one sentence only, under "no
 * times": the apprentice road's Register as a Cabinetmaker apprentice panel, whose summary ends at "4 periods
 * (levels)." instead of going on ", each designed to take about a year." (the source's quote stays). Edited
 * again on 2026-10-17 for one sentence only (the second review of PR #182): road 0's two Incorporating panels
 * (Alberta and British Columbia), whose "Your answers" line for an idea with no third-year estimate no longer
 * says "set your own number to see this light", a light no number could give, but that it needs that
 * estimate too (lib/brain/evaluate.ts computeNodeStates). Redrawn on 2026-10-23 for road 0's 11 panels only
 * (tests/places-and-programs.spec.ts), drawn with today's named text sizes: the Canada-Alberta Job Grant card
 * is gone from each (taken off the catalog, the maintainer's call a-call-1), so each "Elsewhere on your map" or
 * "For you on this stage" count is one lower; and Hire first employee's sources are the CRA's two pages and
 * Alberta's own employment-standards page (checked by a tool), with "2 sources for other provinces aren't
 * shown." for Ontario's and British Columbia's (a-call-12). No other word changes. Redrawn on 2026-10-23 for two
 * panels only (tests/prerelease-honesty.spec.ts), road 0's two Incorporating panels (Alberta and British
 * Columbia): every quote on a way to incorporate's fee lines was drawn in bare quotation marks, 19 quotes on 14
 * lines (12 on the Alberta panel, from Corporations Canada and Alberta's Corporate Registry; 7 on the British
 * Columbia panel, the federal way's), Corporations Canada's "It will cost $200 and will take 1 day." among them.
 * Each line's quotes are now inside the official-quote component, after "Words found on the page:", in “ ” marks
 * and joined by " · " (components/shared/page-quotes.tsx), so a page's processing time is never a line of
 * DotAmi's own. No other word changes. Redrawn on 2026-10-23 for six panels whose step needs a legal requirement
 * (road 0's Mandatory GST registration and five of the apprentice road's), when legal requirements moved from
 * "Skills it needs" to a "What it needs" heading of their own (the screen review's pre-release fixes): each was
 * checked to differ from the recording only between its first of those two headings and its Costs heading, then
 * redrawn; no other panel changed. At the merge of that pull request with main (2026-10-25) every panel was drawn
 * again from the merged code: 33 of 34 are main's or the pull request's recording byte for byte, and the one both
 * had redrawn, road 0's Mandatory GST registration, differs from main's only in its What it needs and Skills it
 * needs headings and from the pull request's only in the Canada-Alberta Job Grant card's absence. Redrawn on
 * 2026-10-24 for road 0's 11 panels only, drawn from a main without the Job Grant's removal (the maintainer's reading
 * list of 2026-10-23: tests/reading-list-corrections.spec.ts and tests/productivity-grant.spec.ts), with today's
 * named text sizes. The keys, each under road-starting-any-business-ab/: stage-0-employee-apprentice-baseline,
 * stage-1-sole-prop-activation, stage-2a-voluntary-gst-registration, stage-2b-mandatory-gst-registration,
 * stage-3a-incorporation-80k-net and stage-3a-incorporation-80k-net/BC, stage-3b-incorporation-liability-sred,
 * branch-hire-first-employee, branch-service-vs-productize, stage-4-retained-earnings-planning and
 * stage-4-sred-deepening. Each gains the Canada-Alberta Productivity Grant's card (`grant-capg`, the maintainer's
 * call a-call-1): under "For you on this stage" on Hire first employee (one higher), under "Elsewhere on your map"
 * on the other ten (one higher each). Five also change their words: Sole Prop activation's note quotes what the CRA
 * says a sole proprietor counts toward the $30,000 tests, and its sources gain the CRA's When to register for and
 * start charging the GST/HST (2 → 3, checked by a tool); both Incorporating panels say "Up to $500,000" on the T2
 * guide's two quotes; Incorporation for liability/SR&ED's and SR&ED deepening's 35% bases quote the CRA's
 * relationships page, which SR&ED deepening gains as a third source (checked by a tool), and its tax impact names
 * the expenditure limit, not taxable income limits; Hire first employee's payroll account timing is "before the
 * first remittance due date", on the CRA's two sentences. No other entry changes; the apprentice road's panels and
 * both money lists are unchanged. At the merge of main into that pull request (2026-10-27, after the Job Grant's
 * removal above) the same 11 were drawn again from the merged code by this test's own path, and only they: the
 * other 23 are main's recording byte for byte. Each of the 11 differs from main's recording only by the
 * Productivity Grant's card, its count one higher, and the five word changes just listed; and from the pull
 * request's only by main's changes above (no Job Grant card, its count one lower; Mandatory GST registration's What
 * it needs heading; the Incorporating panels' quotes after "Words found on the page:"; Hire first employee's
 * Alberta source and its "2 sources for other provinces aren't shown."). The only cards allowed to change are the
 * ones that gained road 0's named start-up cost lines (docs/architecture/future-cockpit.md § 6, "The official
 * fees catalog and start-up cost lines as built"); with those seven lines taken out, they match too.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { FEDERAL_ROAD_ID, generalRoadV2026, roadsV2026, type Road } from "@/lib/engines/roads/v2026";

import { drawCostPanels } from "./helpers/cost-panels";
import { withTypeScaleNames } from "./helpers/type-scale-renames";

// Read with the six named text sizes put in for the pixel classes they replaced on 2026-10-17 (S2.5.30d;
// tests/helpers/type-scale-renames.ts): the recording stays as drawn, and every word and every other class
// is still compared exactly.
const before = Object.fromEntries(
  Object.entries(
    JSON.parse(readFileSync(new URL("./fixtures/official-fees/panels-before.json", import.meta.url), "utf8")) as Record<string, string>,
  ).map(([key, html]) => [key, withTypeScaleNames(html)]),
);

/** Road 0's named start-up cost lines, the only lines added to a road since the fixture was drawn. */
const START_UP_STEP = "stage-1-sole-prop-activation";
const START_UP_LINES = [
  "cost-start-tools-equipment",
  "cost-start-space-deposit",
  "cost-start-insurance",
  "cost-start-vehicle",
  "cost-start-first-materials",
  "cost-start-software",
  "cost-start-living-while-starting",
];

/** A road with the start-up lines taken out: what the road was before they were written. */
function withoutStartUpLines(road: Road): Road {
  return {
    ...road,
    steps: road.steps.map((step) =>
      step.id === START_UP_STEP ? { ...step, costs: step.costs.filter((c) => !START_UP_LINES.includes(c.id)) } : step,
    ),
  };
}

/**
 * The roads the fixture was drawn from: every road but the federal steps (2026-10-21, task 28d), which came after
 * the move and has no "before" (its own panels are road 0's, less Alberta, checked in tests/road-federal-steps.spec.ts).
 */
const ROADS_DRAWN_BEFORE = roadsV2026.filter((road) => road.id !== FEDERAL_ROAD_ID);

describe("every card that shows a cost line, before and after the official fees catalog", () => {
  it("draws the same panels as main did, byte for byte, with road 0's start-up lines taken out", () => {
    const now = drawCostPanels(ROADS_DRAWN_BEFORE.map(withoutStartUpLines));
    expect(Object.keys(now).sort()).toEqual(Object.keys(before).sort());
    for (const [key, html] of Object.entries(before)) expect(now[key], key).toBe(html);
  });

  it("with the start-up lines in, only Sole Prop activation's panel and road 0's money list change", () => {
    const now = drawCostPanels(ROADS_DRAWN_BEFORE);
    const changed = Object.keys(before).filter((key) => now[key] !== before[key]);
    const allowed = [`${generalRoadV2026.id}/${START_UP_STEP}`, `${generalRoadV2026.id}/money`];
    for (const key of changed) expect(allowed, key).toContain(key);
  });
});
