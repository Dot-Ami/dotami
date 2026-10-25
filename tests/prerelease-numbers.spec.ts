/**
 * The pre-release fixes of 2026-10-23 for numbers and amounts (C:/dotami-wt/review-30f-gaps.txt and the
 * maintainer's reading list): each check here fails on the code before the fix, and each new check has a
 * planted control that proves it can fail.
 *
 * 1. Export is the road on screen: every step the road draws is in it, with its done-when lines, cost lines and
 *    the sources for the idea's place (review 30f, gap 22: the cabinetmaker's export had 0 of its 17 steps).
 * 2. Compare's "Rules and tax cards" row counts the cards the way the Rules & tax switch does (gap 16).
 * 3. The money gauge names the official fees that wait on a fork, so its total plus them is Compare's (gap 17).
 * 4. The vehicle caps are the amounts Income Tax Regulations s.7307 prescribe, each in a held quote.
 * 5. The Small Business Financing Program says what ISED's loans page says, and no unsourced 365-day line.
 * 6. About this job says "as published" beside two published wage levels that are the same (gap 15).
 */
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { PlaybookExportPanel } from "@/components/playbook-export-panel";
import { wageFiguresLine } from "@/lib/about-job/text";
import type { WageRowView } from "@/lib/about-job/types";
import type { PlanArgs } from "@/lib/cockpit/plan";
import { compareEndings, type KeptAnswers } from "@/lib/cockpit/told";
import { cockpitInput, gaugeView, overlayCounts, rulesCardsOnMap } from "@/lib/cockpit/view";
import { cockpitWords } from "@/lib/cockpit/words";
import { cfeCatalogV2026, type CFENodeId } from "@/lib/engines/cfe/v2026";
import { grantProgramsV2026 } from "@/lib/engines/grants/v2026/programs";
import { citationsForPlace, forksAreTheMapToggles, roadApprenticeToOwnShopAB, roadForPlace, roadsV2026, skillItemsV2026, type Road } from "@/lib/engines/roads/v2026";
import type { EngineCitation } from "@/lib/engines/shared/types";
import { writeOffCategoriesV2026 } from "@/lib/engines/writeoffs/v2026/categories";
import { scenarioForPickedFuture } from "@/lib/front-door/start-future";
import type { PlaceCode } from "@/lib/places/codes";
import { buildPlaybookSkeleton } from "@/lib/playbook/build-skeleton";
import { renderPlaybookMarkdown } from "@/lib/playbook/render-markdown";
import { renderRoadExport } from "@/lib/playbook/road-export";
import { evaluateRoad } from "@/lib/roads";
import { updateScenarioBranch, type BranchDecisionId } from "@/lib/scenarios/branches";

const TODAY = "2026-10-23";
const NO_KEPT: KeptAnswers = { progress: [], skillMarks: [], forkPickedOn: {}, targetMonthSetOn: null, figures: [], incomeWantedOn: null };
const PLACES: PlaceCode[] = ["CA-AB", "CA-ON", "CA-BC"];

/** What the cockpit hands Export for an idea picked on Pick a future, on this road and place, with nothing else told. */
function exportArgs(road: Road, place: PlaceCode): PlanArgs {
  const scenario = scenarioForPickedFuture({ road, place, name: "" }, `export-${road.id}-${place}`);
  return {
    ideaName: scenario.profile.name,
    input: cockpitInput({
      road,
      roadChosen: true,
      skillItems: skillItemsV2026,
      scenario,
      figures: [],
      personFigures: [],
      future: { forkPicks: {}, targetMonth: null },
      progress: [],
      skillMarks: [],
      job: null,
      today: TODAY,
    }),
    kept: NO_KEPT,
    firstWords: null,
    destination: null,
    incomeWanted: null,
    roadChosenOn: TODAY,
    jobPickedOn: null,
    today: TODAY,
  };
}

/** The road's steps, in the order the map draws them, that an export has no `### <label>` heading for. */
function stepsMissingFromExport(road: Road, markdown: string): string[] {
  const headings = new Set(markdown.split("\n").filter((line) => line.startsWith("### ")).map((line) => line.slice(4).trim()));
  return road.columns
    .flatMap((column) => column.steps)
    .flatMap((id) => road.steps.find((step) => step.id === id) ?? [])
    .filter((step) => !headings.has(step.label))
    .map((step) => step.label);
}

/** What an export leaves out of the road on screen: steps, done-when lines, cost lines, and the place's step sources. */
function leftOutOfExport(road: Road, place: string, markdown: string): string[] {
  const missing = stepsMissingFromExport(road, markdown).map((label) => `step: ${label}`);
  for (const step of road.steps) {
    for (const line of step.doneWhen) if (!markdown.includes(line.text)) missing.push(`done when: ${line.text}`);
    for (const line of step.costs) if (!markdown.includes(line.label)) missing.push(`cost line: ${line.label}`);
    for (const c of citationsForPlace(road, step.citations, place).shown) if (!markdown.includes(`(${c.url})`)) missing.push(`source: ${c.url}`);
  }
  return missing;
}

/**
 * Pages the road cites that the road drawn for this place shows nowhere (another province's: its step sources,
 * done-when lines, cost lines and links, `roadForPlace` since #207) and that an export prints anyway.
 */
function otherProvincesPrinted(road: Road, place: string, markdown: string): string[] {
  const drawn = roadForPlace(road, place);
  const pages = (step: Road["steps"][number]) => [
    ...step.doneWhen.map((l) => l.citation.url),
    ...step.costs.flatMap((l) => (l.kind === "official-fee" ? [l.citation.url] : l.nameSource ? [l.nameSource.url] : [])),
    ...step.officialLinks.map((l) => l.url),
  ];
  const shown = new Set(drawn.steps.flatMap((step) => [...citationsForPlace(drawn, step.citations, place).shown.map((c) => c.url), ...pages(step)]));
  const cited = road.steps.flatMap((step) => [...step.citations.map((c) => c.url), ...pages(step)]);
  // As a link's address, so one page's address that starts another's (".../about-classroom-instruction/" and its
  // ".../pay-for-classes/") isn't taken for it.
  return [...new Set(cited)].filter((url) => !shown.has(url) && markdown.includes(`(${url})`));
}

describe("1. Export is the road on screen", () => {
  for (const road of roadsV2026) {
    for (const place of PLACES) {
      it(`${road.label}, ${place}: every step, done-when line, cost line and the place's sources are in it, and no other province's`, () => {
        const args = exportArgs(road, place);
        const md = renderRoadExport(args);
        const province = args.input.scenario.profile.province;
        // The road on screen is the one drawn for the idea's place (#207): a road written for another province
        // leaves that province's done-when lines, cost lines and links out, on screen and so in the export.
        expect(leftOutOfExport(roadForPlace(road, province), province, md)).toEqual([]);
        expect(otherProvincesPrinted(road, province, md)).toEqual([]);
        // How each source was checked, as every screen says it (docs/engines/citations.md).
        expect(md).toMatch(/sources_read_by_a_person: \d+ of \d+/);
        expect(md).not.toContain("· verified ");
      });
    }
  }

  it("the export before this fix (the tax map's catalog stages) left out every one of the apprentice road's steps", () => {
    const args = exportArgs(roadApprenticeToOwnShopAB, "CA-AB");
    const before = renderPlaybookMarkdown(buildPlaybookSkeleton([...cfeCatalogV2026.nodes], args.input.scenario, roadApprenticeToOwnShopAB));
    const shownSteps = roadApprenticeToOwnShopAB.columns.flatMap((c) => c.steps).length;
    expect(stepsMissingFromExport(roadApprenticeToOwnShopAB, before)).toHaveLength(shownSteps);
    expect(shownSteps).toBe(17);
  });

  it("planted controls: a step, a done-when line or a source taken out of the export is caught", () => {
    const road = roadApprenticeToOwnShopAB;
    const md = renderRoadExport(exportArgs(road, "CA-AB"));
    const step = road.steps.find((s) => s.doneWhen.length > 0 && s.citations.length > 0)!;
    expect(stepsMissingFromExport(road, md.replace(`### ${step.label}\n`, ""))).toEqual([step.label]);
    expect(leftOutOfExport(road, "AB", md.split(step.doneWhen[0]!.text).join(""))).toContain(`done when: ${step.doneWhen[0]!.text}`);
    const url = step.citations[0]!.url;
    expect(leftOutOfExport(road, "AB", md.split(url).join("")).some((line) => line === `source: ${url}`)).toBe(true);
    // And a planted other-province source is caught.
    const ontarioOnly: EngineCitation = { ...step.citations[0]!, jurisdiction: "ON", url: "https://example.invalid/ontario-only" };
    const planted: Road = { ...road, steps: road.steps.map((s) => (s.id === step.id ? { ...s, citations: [...s.citations, ontarioOnly] } : s)) };
    expect(otherProvincesPrinted(planted, "AB", `${md}\n[planted](${ontarioOnly.url})`)).toEqual([ontarioOnly.url]);
    // And road 0 opened in Ontario: an Alberta done-when line's page printed in its export is caught.
    const general = roadsV2026[0]!;
    const albertaLine = general.steps.flatMap((s) => s.doneWhen).find((l) => l.citation.jurisdiction === "AB")!;
    const inOntario = renderRoadExport(exportArgs(general, "CA-ON"));
    expect(otherProvincesPrinted(general, "ON", inOntario)).toEqual([]);
    expect(otherProvincesPrinted(general, "ON", `${inOntario}\n[planted](${albertaLine.citation.url})`)).toEqual([albertaLine.citation.url]);
  });

  it("on road 0 a stage of the tax map keeps the catalog's own fields under its step", () => {
    const road = roadsV2026[0]!;
    const md = renderRoadExport(exportArgs(road, "CA-AB"));
    const node = cfeCatalogV2026.nodes.find((n) => n.id === "stage-1-sole-prop-activation")!;
    expect(md).toContain(`### ${node.label}`);
    expect(md).toContain(node.taxImpact);
    expect(md).toContain(node.lensAnnotations.legal);
    expect(md).toContain(`#### ${cockpitWords.exportDoc.citations}`);
  });

  it("carries an Alberta idea's area as Your plan does, and the privacy inventory says so", async () => {
    // A blind review of this branch (2026-10-24): Export now holds the area and the economic region, while the
    // inventory's lines (drawn on What DotAmi knows about you) still named only Your plan and About this job.
    const { ALBERTA_AREAS } = await import("@/lib/places/alberta-areas");
    const { areaLabel } = await import("@/lib/front-door/where");
    const { TABLES } = await import("@/lib/privacy/inventory");
    const area = ALBERTA_AREAS[0]!;
    const md = renderRoadExport({ ...exportArgs(roadApprenticeToOwnShopAB, "CA-AB"), where: { area: { value: area.value, setOn: TODAY }, region: null } });
    expect(md).toContain(cockpitWords.plan.whereArea(areaLabel(area.value)!, TODAY));
    const lines = TABLES.find((t) => t.model === "Venture")!.lines!;
    for (const name of ["Your area", "Your economic region"]) expect(lines.find((l) => l.name === name)!.holds, name).toContain("Export");
  });

  it("on road 0 an untouched fork is the map's default pick, not the person's; a pick reads as theirs", () => {
    // The live path of issue #5's guarantee (tests/honest-map-words.spec.ts keeps the route's old renderer honest).
    const road = roadsV2026[0]!;
    const args = exportArgs(road, "CA-AB");
    const untouched = renderRoadExport(args);
    expect(untouched.match(/The map's default pick: “[^”]+”, not yours yet/g)?.length).toBe(road.forks.length);
    const fork = road.forks[0]!;
    const side = fork.sides[1] as CFENodeId;
    const scenario = updateScenarioBranch(args.input.scenario, fork.id as BranchDecisionId, side);
    const picked = renderRoadExport({ ...args, input: { ...args.input, scenario, forkPicks: { ...args.input.forkPicks, [fork.id]: { stepId: side, from: "map" } } } });
    expect(picked.match(/The map's default pick/g)?.length ?? 0).toBe(road.forks.length - 1);
    expect(picked).toContain(cockpitWords.compare.yourPick(road.steps.find((s) => s.id === side)!.label));
  });

  it("every tax-map stage on road 0 keeps all the fields the step panel shows, its financial impact and notes too", () => {
    // A blind review of this branch (2026-10-24): the export dropped "Financial impact (summary)" and the projection
    // notes the old Export printed, and the step panel's "More about this stage" still shows.
    const road = roadsV2026[0]!;
    const md = renderRoadExport(exportArgs(road, "CA-AB"));
    const stages = cfeCatalogV2026.nodes.filter((n) => road.steps.some((s) => s.id === n.id));
    expect(stages.length).toBeGreaterThan(5);
    for (const node of stages) {
      for (const field of [node.trigger, node.description, node.taxImpact, node.lensAnnotations.tax, node.lensAnnotations.legal, node.financialImpact.summary]) {
        expect(md, `${node.id}: ${field.slice(0, 40)}`).toContain(field);
      }
      for (const note of node.financialImpact.projectionNotes) expect(md, `${node.id}: ${note.slice(0, 40)}`).toContain(`- ${note}`);
    }
  });

  it("the Export panel draws that markdown, built in the browser from what the cockpit holds", () => {
    const args = exportArgs(roadApprenticeToOwnShopAB, "CA-AB");
    const html = renderToStaticMarkup(createElement(PlaybookExportPanel, { planArgs: args, ventureId: "v1", onClose: () => {} }));
    const first = roadApprenticeToOwnShopAB.steps.find((s) => s.id === roadApprenticeToOwnShopAB.columns[0]!.steps[0])!;
    expect(html).toContain(`### ${first.label.replace(/&/g, "&amp;")}`);
  });
});

describe("2. Compare and the Rules & tax switch count the cards one way", () => {
  for (const road of roadsV2026) {
    for (const fork of road.forks) {
      it(`${road.label}, ${fork.label}: each ending's cards in Compare are the switch's count with that ending picked`, () => {
        const args = exportArgs(road, "CA-AB");
        const view = compareEndings(args.input, fork.id)!;
        const row = view.rows.find((r) => r.id === "cards")!;
        fork.sides.forEach((side, i) => {
          // Road 0's forks are the map's own toggles, picked in the scenario; any other road's, in the fork picks.
          const toggle = forksAreTheMapToggles(road);
          const picked = {
            ...args.input,
            scenario: toggle ? updateScenarioBranch(args.input.scenario, fork.id as BranchDecisionId, side as CFENodeId) : args.input.scenario,
            forkPicks: { ...args.input.forkPicks, [fork.id]: { stepId: side, from: toggle ? ("map" as const) : ("you" as const) } },
          };
          const evaluation = evaluateRoad(picked);
          const total = overlayCounts(road, evaluation, picked.scenario).rulesCards;
          const [apply, checkFirst] = row.values[i]!.match(/\d+/g)!.map(Number);
          expect(apply! + checkFirst!, `${side}: ${row.values[i]}`).toBe(total);
        });
      });
    }
  }

  it("on the apprentice road, where no step names a card, both say none", () => {
    const args = exportArgs(roadApprenticeToOwnShopAB, "CA-AB");
    const fork = roadApprenticeToOwnShopAB.forks[0]!;
    const row = compareEndings(args.input, fork.id)!.rows.find((r) => r.id === "cards")!;
    expect(row.values).toEqual([cockpitWords.compare.cards(0, 0), cockpitWords.compare.cards(0, 0)]);
    expect(overlayCounts(roadApprenticeToOwnShopAB, evaluateRoad(args.input), args.input.scenario).rulesCards).toBe(0);
  });

  it("planted control: the rules lit on that road are not cards the map draws", () => {
    const args = exportArgs(roadApprenticeToOwnShopAB, "CA-AB");
    const evaluation = evaluateRoad(args.input);
    // Compare's count before the fix: every card the rules lit, green or yellow.
    const lit = evaluation.rules.unlocks.filter((u) => u.state === "green" || u.state === "yellow").length;
    expect(lit).toBeGreaterThan(0);
    expect(rulesCardsOnMap(roadApprenticeToOwnShopAB, evaluation, args.input.scenario)).toHaveLength(0);
  });
});

describe("3. The money gauge names the fees that wait on a fork, so it adds up to Compare", () => {
  const cents = (text: string) => Number(text.match(/\$([\d,]+(?:\.\d\d)?)/)![1]!.replace(/,/g, "")) * 100;
  const linesIn = (text: string) => Number(text.match(/\((\d+) lines?\)/)![1]);

  for (const road of roadsV2026) {
    for (const fork of road.forks) {
      it(`${road.label}, ${fork.label}: each ending's fees are the gauge's fees plus some of the waiting ones, never more`, () => {
        const args = exportArgs(road, "CA-AB");
        const evaluation = evaluateRoad(args.input);
        const m = evaluation.gauges.money;
        const waiting = m.waitingOnForks.find((w) => w.forkId === fork.id) ?? { officialFeesCents: 0, officialFeeLines: 0 };
        const fees = compareEndings(args.input, fork.id)!.rows.find((r) => r.id === "fees")!;
        for (const value of fees.values) {
          if (value === cockpitWords.compare.feesNone) continue;
          expect(cents(value) - m.officialFeesCents).toBeGreaterThanOrEqual(0);
          expect(cents(value) - m.officialFeesCents).toBeLessThanOrEqual(waiting.officialFeesCents);
          expect(linesIn(value) - m.officialFeeLines).toBeLessThanOrEqual(waiting.officialFeeLines);
        }
      });
    }
  }

  it("the apprentice road: $1,070 on the gauge, and the waiting line names the $150 that makes Compare's $1,220", () => {
    const args = exportArgs(roadApprenticeToOwnShopAB, "CA-AB");
    const evaluation = evaluateRoad(args.input);
    const money = gaugeView(evaluation, roadApprenticeToOwnShopAB, args.input.scenario).money;
    const fork = roadApprenticeToOwnShopAB.forks[0]!;
    expect(money.value).toContain("$1,070 official fees (5 lines)");
    const line = money.lines.find((l) => l.includes(fork.label))!;
    expect(line).toBe(cockpitWords.gauges.money.waiting(21, fork.label, 15_000, 2));
    expect(line).toContain("2 official fees among them ($150)");
    const fees = compareEndings(args.input, fork.id)!.rows.find((r) => r.id === "fees")!;
    expect(fees.values).toEqual(["$1,220 (6 lines)", "$1,220 (7 lines)"]);
    // 1,070 + 150 = 1,220, and 5 + 2 = 7 lines on the ending that reaches both waiting fees.
    expect(107_000 + 15_000).toBe(cents(fees.values[1]!));
  });

  it("planted control: the waiting line before this fix said no amount, so nothing added up", () => {
    const fork = roadApprenticeToOwnShopAB.forks[0]!;
    expect(cockpitWords.gauges.money.waiting(21, fork.label)).not.toMatch(/\$/);
  });
});

/** Every held quote on a list of sources, as one text. */
const quotesOf = (citations: readonly EngineCitation[]) => citations.flatMap((c) => c.toolCheck?.quotes ?? []).join("\n");
/** Dollar amounts as written, "$500K" whole. */
const amountsIn = (text: string) => text.match(/\$[\d,]+(?:\.\d+)?[KkMm]?/g) ?? [];
/** An amount found in the quotes as a whole amount: "$500" is not inside "$500,000". */
const inQuotes = (quotes: string, amount: string) => {
  // Found as whole text, then not followed by more of a number ("$500" in "$500,000") or a K/M.
  for (let at = quotes.indexOf(amount); at !== -1; at = quotes.indexOf(amount, at + 1)) {
    if (!/^(?:[\d,.]*\d|[KkMm])/.test(quotes.slice(at + amount.length))) return true;
  }
  return false;
};

describe("4. The vehicle caps are the amounts the Regulations prescribe", () => {
  const vehicle = writeOffCategoriesV2026.find((c) => c.id === "writeoff-vehicle")!;
  const entryText = [vehicle.description, vehicle.eligibility, vehicle.lensAnnotations.tax, vehicle.lensAnnotations.legal].join("\n");

  it("says $350 and $1,100 (and $300 for older cars), each found in a held quote of Income Tax Regulations s.7307", () => {
    expect(amountsIn(entryText).sort()).toEqual(["$1,100", "$300", "$350"]);
    const s7307 = vehicle.citations.filter((c) => c.url.endsWith("/regulations/C.R.C.,_c._945/section-7307.html"));
    expect(s7307).toHaveLength(1);
    for (const amount of amountsIn(entryText)) expect(inQuotes(quotesOf(s7307), amount), amount).toBe(true);
    expect(s7307[0]!.toolCheck?.checkedOn).toBe("2026-10-23");
    // Tool-checked, never marked as read by a person (d-call-5).
    expect(s7307[0]).not.toHaveProperty("readBy");
  });

  it("says each cap is an amount for each 30 days, as the Act's A × B / 30 makes it", () => {
    // A blind review of this branch (2026-10-24): "$350" with no period reads as the whole deductible interest.
    expect(vehicle.eligibility).toMatch(/\$350 for each 30 days of interest/);
    expect(vehicle.eligibility).toMatch(/\$1,100 plus sales tax for each 30 days of a lease/);
  });

  it("planted control: the text before this fix showed the Act's defaults, which no held quote carries", () => {
    const before =
      "loan interest is limited to a prescribed daily amount ($250 per 30 days in the Act), and lease costs to a prescribed monthly amount ($600 per 30 days in the Act)";
    const unquoted = amountsIn(before).filter((amount) => !inQuotes(quotesOf(vehicle.citations), amount));
    expect(unquoted).toEqual(["$250", "$600"]);
  });
});

describe("5. The Small Business Financing Program says what ISED's loans page says", () => {
  const csbfp = grantProgramsV2026.find((p) => p.id === "grant-csbfp")!;
  const entryText = [csbfp.description, csbfp.eligibility, csbfp.lensAnnotations.tax, csbfp.lensAnnotations.legal, csbfp.estimatedValue ?? ""].join("\n");

  it("every amount it states is in a held quote, and the 365-day line and 'specifically for equipment' are gone", () => {
    expect(amountsIn(entryText).length).toBeGreaterThan(0);
    for (const amount of amountsIn(entryText)) expect(inQuotes(quotesOf(csbfp.citations), amount), amount).toBe(true);
    expect(entryText).not.toMatch(/365|specifically for equipment|\$500K/);
  });

  it("the tax line the card shows as its payoff and the eligibility text state nothing but ISED's held words", () => {
    // A blind review of this branch (2026-10-24): the on-screen tax line still said, in DotAmi's own words, that the
    // program "may make financing available without revenue history" and "Loan interest and fees may be
    // deductible; the loan itself is not income" (tax information no ISED citation holds), and the eligibility
    // text "under the revenue ceiling ... no revenue history required".
    // A quote opens after a space or colon and closes before punctuation, so "venture's" isn't one.
    const quoted = /(?<=[\s:])'([^']+)'(?=[.,;]|$)/g;
    const own = (line: string) => line.replace(quoted, "");
    for (const line of [csbfp.lensAnnotations.tax, csbfp.eligibility]) {
      expect(line).not.toMatch(/deductible|not income|revenue history|revenue ceiling/);
      const quotes = [...line.matchAll(quoted)].map((m) => m[1]!);
      expect(quotes.length).toBeGreaterThan(0);
      for (const quote of quotes) expect(quotesOf(csbfp.citations)).toContain(quote);
      // Outside the quotes: the compass's "if" and the names of things, never a claim of what the program may do.
      expect(own(line)).not.toMatch(/\b(may|can|will|must|should)\b/);
    }
  });

  it("planted control: the text before this fix had an amount no quote holds and the unsourced day count", () => {
    const before = "Up to $500K specifically for equipment. Equipment purchased within the past 365 days may be rolled into a CSBFP loan retroactively.";
    expect(amountsIn(before).filter((amount) => !inQuotes(quotesOf(csbfp.citations), amount))).toEqual(["$500K"]);
    expect(before).toMatch(/365|specifically for equipment|\$500K/);
  });
});

describe("6. About this job: two published levels that are the same say so", () => {
  const row = (low: string | null, median: string | null, high: string | null): WageRowView =>
    ({
      noc: "63202",
      geography: { code: "ER35", name: "Ontario" },
      sourceCode: "",
      level: "province",
      provinceName: "Ontario",
      basis: "hourly",
      low,
      median,
      high,
      period: "2023-2024",
      method: "",
    }) as unknown as WageRowView;

  it("Ontario bakers' low and median of $17.60 say 'as published' beside them", () => {
    expect(wageFiguresLine(row("17.6", "17.60", "22"))).toBe(
      "Hourly · low $17.60 · median $17.60 · high $22.00 · low and median the same, as published",
    );
    expect(wageFiguresLine(row("17", "17", "17"))).toBe("Hourly · low $17.00 · median $17.00 · high $17.00 · low, median and high the same, as published");
  });

  it("planted control: levels that differ, or a figure not published, add nothing", () => {
    expect(wageFiguresLine(row("18", "23", "30"))).toBe("Hourly · low $18.00 · median $23.00 · high $30.00");
    expect(wageFiguresLine(row(null, "23", null))).toBe("Hourly · low not published · median $23.00 · high not published");
  });
});
