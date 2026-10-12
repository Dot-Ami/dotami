import { describe, expect, it } from "vitest";

import { cfeNodesV2026 } from "@/lib/engines/cfe/v2026";
import { cfeTiersV2026 } from "@/lib/engines/cfe/v2026/tiers";
import {
  costLineAsShown,
  generalRoadV2026,
  roadById,
  roadJoinProblems,
  roadProblems,
  roadsCatalogV2026,
  roadStartingAnyBusinessAB,
  skillItemProblems,
  skillItemsV2026,
  type Road,
} from "@/lib/engines/roads/v2026";
import type { EngineCitation } from "@/lib/engines/shared/types";
import { branchDecisions } from "@/lib/scenarios/branches";

import { inventedCitation, inventedRoad, inventedSkillItems } from "./helpers/invented-road";

/**
 * Every road, column, step, fork, done-when line and cost line id that has ever shipped. Ids are
 * forever: a person's step progress, ticks, quotes and fork picks are kept against them, so removing
 * or renaming one would orphan what the person told DotAmi. Add new ids here; never take one out.
 */
const SHIPPED_IDS: Record<
  string,
  { columns: string[]; steps: string[]; forks: string[]; doneWhen: string[]; costs: string[] }
> = {
  "road-starting-any-business-ab": {
    columns: ["tier-1-before", "tier-2-sole-prop", "tier-3-incorporating", "tier-4-corporation"],
    steps: [
      "stage-0-employee-apprentice-baseline",
      "stage-1-sole-prop-activation",
      "stage-2a-voluntary-gst-registration",
      "stage-2b-mandatory-gst-registration",
      "stage-3a-incorporation-80k-net",
      "stage-3b-incorporation-liability-sred",
      "branch-hire-first-employee",
      "branch-service-vs-productize",
      "stage-4-retained-earnings-planning",
      "stage-4-sred-deepening",
      // The before-you-open steps (2026-10-12).
      "step-start-register-name",
      "step-start-permits-bizpal",
      "step-start-business-account",
    ],
    // The keys today's saved branch picks are stored under (ScenarioState.activeBranches).
    forks: ["gstTiming", "incorporationTiming"],
    // Road 0's done-when lines (2026-10-12): about three per step, each cited to an official page.
    doneWhen: [
      "dw-start-baseline-employment",
      "dw-start-baseline-business-lines",
      "dw-start-baseline-sole-prop",
      "dw-start-soleprop-records",
      "dw-start-soleprop-return",
      "dw-start-soleprop-instalments",
      "dw-start-gstvol-registered",
      "dw-start-gstvol-charge-file",
      "dw-start-gstvol-one-year",
      "dw-start-gstvol-itc-evidence",
      "dw-start-gstman-tests",
      "dw-start-gstman-one-quarter",
      "dw-start-gstman-four-quarters",
      "dw-start-gstman-charging",
      "dw-start-inc-articles",
      "dw-start-inc-t2",
      "dw-start-inc-guarantee",
      "dw-start-incsred-incorporated",
      "dw-start-incsred-ccpc",
      "dw-start-incsred-associated",
      "dw-start-hire-status",
      "dw-start-hire-before-pay",
      "dw-start-hire-payroll-account",
      "dw-start-hire-wcb",
      "dw-start-service-income-records",
      "dw-start-service-separate-records",
      "dw-start-service-name",
      "dw-start-retained-t5",
      "dw-start-retained-eligible",
      "dw-start-retained-no-switch",
      "dw-start-sred-t661",
      "dw-start-sred-spent",
      "dw-start-sred-deadline",
      "dw-start-name-when",
      "dw-start-name-ending",
      "dw-start-name-form",
      "dw-start-name-proof",
      "dw-start-name-email",
      "dw-start-bizpal-searched",
      "dw-start-bizpal-more",
      "dw-start-bizpal-city-hall",
      "dw-start-bizpal-applied",
      "dw-start-account-named",
      "dw-start-account-billing",
      "dw-start-account-statements",
    ],
    costs: [
      "cost-start-name-government-fee",
      "cost-start-name-service-fee",
      "cost-start-name-report",
      "cost-start-permit-licence-fees",
      "cost-start-bank-fees",
    ],
  },
  "road-apprentice-to-own-shop-ab": {
    columns: ["col-shop-training", "col-shop-certified", "col-shop-open", "col-shop-first-years"],
    steps: [
      "step-shop-register-apprentice",
      "step-shop-sponsor-hours",
      "step-shop-classroom-exams",
      "step-shop-tq-work-experience",
      "step-shop-tq-recognized-credential",
      "step-shop-journeyperson-certificate",
      "step-shop-red-seal",
      "step-shop-stay-employed",
      "step-shop-open-own-shop",
      "step-shop-blue-seal",
      "step-shop-register-name",
      "step-shop-business-number",
      "step-shop-permits-licence",
      "step-shop-gst-small-supplier",
      "step-shop-first-hire",
      "step-shop-sponsor-apprentice",
    ],
    forks: ["fork-shop-employed-or-own"],
    doneWhen: [
      "dw-shop-apply-online",
      "dw-shop-apply-fee-paid",
      "dw-shop-apply-sponsor-approves",
      "dw-shop-start-rap",
      "dw-shop-start-cts",
      "dw-shop-sponsor-agreement",
      "dw-shop-period-hours",
      "dw-shop-record-book-upload",
      "dw-shop-entrance",
      "dw-shop-classroom-weeks",
      "dw-shop-period-theory-exam",
      "dw-shop-tqwe-experience",
      "dw-shop-tqwe-full-time",
      "dw-shop-tqwe-employer",
      "dw-shop-tqwe-applied",
      "dw-shop-tqwe-theory",
      "dw-shop-tqwe-practical",
      "dw-shop-tqwe-18-months",
      "dw-shop-tqrc-submitted",
      "dw-shop-tqrc-not-expiring",
      "dw-shop-tqrc-applied",
      "dw-shop-tqrc-theory",
      "dw-shop-tqrc-practical",
      "dw-shop-tqrc-18-months",
      "dw-shop-jp-apprenticeship",
      "dw-shop-jp-tqwe",
      "dw-shop-jp-tqrc",
      "dw-shop-red-seal-apprentice",
      "dw-shop-red-seal-later",
      "dw-shop-red-seal-third-try",
      "dw-shop-red-seal-passed",
      "dw-shop-employed-certificate",
      "dw-shop-employed-mentor",
      "dw-shop-own-certificate",
      "dw-shop-own-business-form",
      "dw-shop-own-no-shield",
      "dw-shop-blue-seal-study",
      "dw-shop-blue-seal-credential",
      "dw-shop-blue-seal-asn",
      "dw-shop-blue-seal-applied",
      "dw-shop-blue-seal-transcripts",
      "dw-shop-blue-seal-fee",
      "dw-shop-name-ending",
      "dw-shop-name-report",
      "dw-shop-name-form",
      "dw-shop-name-proof",
      "dw-shop-name-email",
      "dw-shop-bn-email",
      "dw-shop-permits-bizpal",
      "dw-shop-permits-city-hall",
      "dw-shop-gst-checked",
      "dw-shop-gst-registered",
      "dw-shop-gst-voluntary",
      "dw-shop-hire-wcb",
      "dw-shop-hire-wcb-unsure",
      "dw-shop-hire-payroll",
      "dw-shop-hire-personal-coverage",
      "dw-shop-sponsor-own-eligible",
      "dw-shop-sponsor-own-confirmed",
      "dw-shop-sponsor-own-ratio",
      "dw-shop-sponsor-own-wages",
    ],
    costs: [
      "cost-shop-apprentice-application",
      "cost-shop-living-while-training",
      "cost-shop-hand-tools",
      "cost-shop-tuition",
      "cost-shop-books",
      "cost-shop-parking",
      "cost-shop-student-association-fees",
      "cost-shop-facility-fees",
      "cost-shop-materials-consumables",
      "cost-shop-living-in-class",
      "cost-shop-tqwe-application",
      "cost-shop-tqwe-practical",
      "cost-shop-tqwe-rewrite",
      "cost-shop-tqwe-panel-interview",
      "cost-shop-tqrc-application",
      "cost-shop-tqrc-practical",
      "cost-shop-tqrc-rewrite",
      "cost-shop-red-seal-application",
      "cost-shop-space-deposit",
      "cost-shop-machines-tools",
      "cost-shop-insurance",
      "cost-shop-vehicle",
      "cost-shop-first-materials",
      "cost-shop-design-software",
      "cost-shop-lawyer-business-form",
      "cost-shop-living-while-starting",
      "cost-shop-blue-seal-application",
      "cost-shop-blue-seal-study",
      "cost-shop-name-government-fee",
      "cost-shop-name-service-fee",
      "cost-shop-name-report",
      "cost-shop-business-number",
      "cost-shop-municipal-licence",
      "cost-shop-other-permits",
      "cost-shop-wages",
      "cost-shop-wcb-premium",
      "cost-shop-wcb-personal-coverage",
      "cost-shop-payroll-bookkeeping",
      "cost-shop-apprentice-wages",
    ],
  },
};

/** Every skill item id that has ever shipped. Shared across roads, and forever like the ids above. */
const SHIPPED_SKILL_ITEM_IDS: string[] = [
  "skill-ab-alberta-student-number",
  "skill-ab-apprenticeship-education-agreement",
  "skill-ab-recognized-outside-trade-certificate",
];

const doneWhenIds = (road: Road) => road.steps.flatMap((s) => s.doneWhen.map((d) => d.id));
const costIds = (road: Road) => road.steps.flatMap((s) => s.costs.map((c) => c.id));

describe("the road catalog", () => {
  it("every road passes every check, and so does the shared list of skill items", () => {
    expect(roadsCatalogV2026.entries.length).toBeGreaterThan(0);
    for (const road of roadsCatalogV2026.entries) {
      expect(roadProblems(road, skillItemsV2026), road.id).toEqual([]);
    }
    expect(skillItemProblems(skillItemsV2026)).toEqual([]);
    // Where a road carries on after its last column, the road and column it names are real.
    expect(roadJoinProblems(roadsCatalogV2026.entries)).toEqual([]);
    // The invented road used below is valid too, so each broken copy fails for one reason only.
    expect(roadProblems(inventedRoad(), inventedSkillItems)).toEqual([]);
    expect(skillItemProblems(inventedSkillItems)).toEqual([]);
  });

  it("every skill item is needed by some step, so none sits on the list unused", () => {
    const needed = new Set(roadsCatalogV2026.entries.flatMap((r) => r.steps.flatMap((s) => s.needs)));
    for (const item of skillItemsV2026) expect(needed.has(item.id), item.id).toBe(true);
  });

  it("road ids are unique across the catalog, and roadById finds each one", () => {
    const ids = roadsCatalogV2026.entries.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const road of roadsCatalogV2026.entries) expect(roadById(road.id)).toBe(road);
    expect(roadById("road-nobody-wrote")).toBeUndefined();
  });

  it("no id that ever shipped is removed or renamed, and every id in the catalog is on the shipped list", () => {
    for (const [roadId, shipped] of Object.entries(SHIPPED_IDS)) {
      const road = roadById(roadId);
      expect(road, `road ${roadId} is gone`).toBeDefined();
      expect(road!.columns.map((c) => c.id)).toEqual(expect.arrayContaining(shipped.columns));
      expect(road!.steps.map((s) => s.id)).toEqual(expect.arrayContaining(shipped.steps));
      expect(road!.forks.map((f) => f.id)).toEqual(expect.arrayContaining(shipped.forks));
      expect(doneWhenIds(road!)).toEqual(expect.arrayContaining(shipped.doneWhen));
      expect(costIds(road!)).toEqual(expect.arrayContaining(shipped.costs));
    }
    for (const road of roadsCatalogV2026.entries) {
      const shipped = SHIPPED_IDS[road.id];
      expect(shipped, `add ${road.id} and its ids to SHIPPED_IDS`).toBeDefined();
      for (const c of road.columns) expect(shipped!.columns).toContain(c.id);
      for (const s of road.steps) expect(shipped!.steps).toContain(s.id);
      for (const f of road.forks) expect(shipped!.forks).toContain(f.id);
      for (const id of doneWhenIds(road)) expect(shipped!.doneWhen).toContain(id);
      for (const id of costIds(road)) expect(shipped!.costs).toContain(id);
    }
    const skillIds = skillItemsV2026.map((s) => s.id);
    expect(skillIds).toEqual(expect.arrayContaining(SHIPPED_SKILL_ITEM_IDS));
    for (const id of skillIds) expect(SHIPPED_SKILL_ITEM_IDS).toContain(id);
  });
});

describe("road 0, Starting any business in Alberta, is today's ten-step map, plus its before-you-open steps", () => {
  const road = roadStartingAnyBusinessAB;

  it("is the general road every map draws until a saved future names another", () => {
    expect(generalRoadV2026).toBe(road);
    expect(road.id).toBe("road-starting-any-business-ab");
    expect(road.label).toBe("Starting any business in Alberta (tax and structure)");
    expect(road.kind).toBe("business");
    // Today's place values, nothing new (how places are stored is still the maintainer's call).
    expect(road.provinces).toEqual(["AB"]);
  });

  // The three steps written for it on 2026-10-12, in the first column after the map's own stages.
  const BEFORE_YOU_OPEN = ["step-start-register-name", "step-start-permits-bizpal", "step-start-business-account"];

  it("its columns are today's four tiers, in order, with the same names, lines and toggles", () => {
    expect(road.columns.map((c) => c.id)).toEqual(cfeTiersV2026.map((t) => t.id));
    road.columns.forEach((column, i) => {
      const tier = cfeTiersV2026[i]!;
      expect(column.label).toBe(tier.label);
      expect(column.summary).toBe(tier.subtitle);
      expect(column.forkId).toBe(tier.branchDecisionId);
      // The same cards in the same order the old map drew (the catalog's nodes whose stage the tier
      // lists), and only the first column has steps after them: the before-you-open steps.
      const stages = cfeNodesV2026.filter((n) => tier.stages.includes(n.stage)).map((n) => n.id);
      expect(column.steps).toEqual(i === 0 ? [...stages, ...BEFORE_YOU_OPEN] : stages);
    });
  });

  it("its first ten steps are today's ten nodes: same ids, names, card lines, sources and arrows", () => {
    expect(road.steps.map((s) => s.id)).toEqual([...cfeNodesV2026.map((n) => n.id), ...BEFORE_YOU_OPEN]);
    cfeNodesV2026.forEach((node, i) => {
      const step = road.steps[i]!;
      expect(step.label).toBe(node.label);
      expect(step.summary).toBe(node.trigger);
      expect(step.next).toEqual(node.branches);
      expect(step.citations).toEqual(node.citations);
      // Their done-when lines are written (tests/road-starting-any-business.spec.ts); cost lines, skill
      // items and official links on them come later, read from the official pages, never made up.
      expect(step.doneWhen.length).toBeGreaterThanOrEqual(3);
      expect(step.needs).toEqual([]);
      expect(step.costs).toEqual([]);
      expect(step.officialLinks).toEqual([]);
    });
  });

  it("its forks are today's two toggles: same ids (the keys saved picks use), names and options", () => {
    expect(road.forks).toEqual(
      branchDecisions.map((d) => ({ id: d.id, label: d.label, sides: d.options.map((o) => o.id) })),
    );
  });

  it("its read date is the newest read date of any source in it", () => {
    const newest = cfeNodesV2026
      .flatMap((n) => n.citations.map((c) => c.lastVerified))
      .sort()
      .at(-1);
    expect(road.lastVerified).toBe(newest);
  });
});

/** A copy of the invented road with one thing changed, for the checks below. */
function broken(change: (road: Road) => void): string[] {
  const road = inventedRoad();
  change(road);
  return roadProblems(road, inventedSkillItems);
}

describe("the checks refuse a road that breaks a rule, one rule at a time", () => {
  it("a step with no citation", () => {
    expect(broken((r) => (r.steps[1]!.citations = []))).toEqual([
      'Step "step-invented-employed" has no citation.',
    ]);
  });

  it("a citation that isn't an https page", () => {
    expect(broken((r) => (r.steps[1]!.citations[0]!.url = "http://example.org/invented"))).toEqual([
      'A citation on step "step-invented-employed" is not an https page: http://example.org/invented',
    ]);
  });

  it("a citation with no real read date", () => {
    expect(broken((r) => (r.steps[1]!.citations[0]!.lastVerified = "2026-02-30"))).toEqual([
      'A citation on step "step-invented-employed": read date "2026-02-30" is not a real day written YYYY-MM-DD.',
    ]);
  });

  it("a citation read on a day that hasn't come yet", () => {
    // The road's own date moves with it, so the only problem left is the read date itself.
    expect(
      broken((r) => {
        r.steps[1]!.citations[0]!.lastVerified = "2099-01-01";
        r.lastVerified = "2099-01-01";
      }),
    ).toEqual([
      // The same words as every catalog's check (lib/engines/shared/citation-check.ts); today is the clock's.
      expect.stringMatching(/^A citation on step "step-invented-employed": read date 2099-01-01 is after today \(\d{4}-\d{2}-\d{2}\)\.$/),
    ]);
    expect(
      skillItemProblems([{ ...inventedSkillItems[0]!, citations: [inventedCitation("2099-01-01")] }]),
    ).toEqual([
      expect.stringMatching(/^A citation on skill item "skill-invented-ticket": read date 2099-01-01 is after today \(\d{4}-\d{2}-\d{2}\)\.$/),
    ]);
  });

  it("'today' is the newest date anywhere on Earth, so a reader east of UTC isn't refused their own today", () => {
    // 10:00 UTC on 1 October is already 2 October at UTC+14, the earliest time zone.
    const road = inventedRoad(); // its newest read date is 2026-10-02
    expect(roadProblems(road, inventedSkillItems, new Date("2026-10-01T10:00:00Z"))).toEqual([]);
    expect(roadProblems(road, inventedSkillItems, new Date("2026-10-01T09:59:00Z"))).toEqual([
      'A citation on done-when line "dw-invented-1": read date 2026-10-02 is after today (2026-10-01).',
      'A citation on step "step-invented-own": read date 2026-10-02 is after today (2026-10-01).',
    ]);
  });

  it("an official link that isn't an https page", () => {
    for (const url of ["javascript:alert(1)", "http://example.org/invented"]) {
      expect(broken((r) => (r.steps[0]!.officialLinks[0]!.url = url))).toEqual([
        `An official link on step "step-invented-train" is not an https page: ${url}`,
      ]);
    }
  });

  it("a done-when line with no citation, or with a broken one", () => {
    expect(
      broken((r) => {
        (r.steps[0]!.doneWhen[0] as { citation?: unknown }).citation = undefined;
      }),
    ).toEqual(['Done-when line "dw-invented-1" has no citation.']);
    expect(broken((r) => (r.steps[0]!.doneWhen[0]!.citation.url = "ftp://x"))).toEqual([
      'A citation on done-when line "dw-invented-1" is not an https page: ftp://x',
    ]);
  });

  it("an id used twice", () => {
    expect(broken((r) => (r.steps[2]!.id = "step-invented-employed"))).toEqual(
      expect.arrayContaining(['The id "step-invented-employed" is used twice in road "road-invented-test-only".']),
    );
    expect(
      broken((r) => {
        const fee = r.steps[0]!.costs[0]!;
        r.steps[0]!.costs[1]!.id = fee.id;
      }),
    ).toEqual(['The id "cost-invented-fee" is used twice in road "road-invented-test-only".']);
  });

  it("a step in no column, a step in two columns, a column naming a step that isn't there", () => {
    expect(broken((r) => (r.columns[1]!.steps = ["step-invented-employed"]))).toEqual([
      'Step "step-invented-own" sits in no column.',
    ]);
    expect(broken((r) => r.columns[0]!.steps.push("step-invented-own"))).toEqual([
      'Step "step-invented-own" sits in 2 columns.',
    ]);
    expect(broken((r) => r.columns[0]!.steps.push("step-nobody-wrote"))).toEqual([
      'Column "col-invented-start" names a step the road doesn\'t have: "step-nobody-wrote".',
    ]);
  });

  it("a step leading to a step that isn't there", () => {
    expect(broken((r) => r.steps[1]!.next.push("step-nobody-wrote"))).toEqual([
      'Step "step-invented-employed" leads to a step the road doesn\'t have: "step-nobody-wrote".',
    ]);
  });

  it("a fork whose side isn't there, a fork with the same side twice, a column naming a fork that isn't there", () => {
    expect(broken((r) => (r.forks[0]!.sides = ["step-invented-employed", "step-nobody-wrote"]))).toEqual([
      'Fork "fork-invented-ending" has a side the road doesn\'t have: "step-nobody-wrote".',
    ]);
    expect(broken((r) => (r.forks[0]!.sides = ["step-invented-own", "step-invented-own"]))).toEqual([
      'Fork "fork-invented-ending" names the same step on both sides.',
    ]);
    expect(broken((r) => (r.columns[1]!.forkId = "fork-nobody-wrote"))).toEqual([
      'Column "col-invented-fork" names a fork the road doesn\'t have: "fork-nobody-wrote".',
    ]);
  });

  it("an official fee that isn't a whole, non-negative number of cents, or has no citation", () => {
    for (const amountCents of [-1, 12.5, Number.NaN]) {
      expect(
        broken((r) => {
          const fee = r.steps[0]!.costs[0]!;
          if (fee.kind === "official-fee") fee.amountCents = amountCents;
        }),
      ).toEqual([`Official fee "cost-invented-fee" is not a whole, non-negative number of cents: ${amountCents}.`]);
    }
    expect(
      broken((r) => {
        (r.steps[0]!.costs[0] as { citation?: unknown }).citation = undefined;
      }),
    ).toEqual(['Official fee "cost-invented-fee" has no citation.']);
  });

  it("a step needing a skill item that isn't on the shared list", () => {
    expect(broken((r) => r.steps[0]!.needs.push("skill-nobody-wrote"))).toEqual([
      'Step "step-invented-train" needs a skill item that isn\'t listed: "skill-nobody-wrote".',
    ]);
  });

  it("a road whose read date isn't the newest read date in it", () => {
    expect(broken((r) => (r.lastVerified = "2026-10-01"))).toEqual([
      'Road "road-invented-test-only" says it was last read 2026-10-01, but its newest source was read 2026-10-02.',
    ]);
  });

  it("a skill item with no citation, or the same skill item id twice", () => {
    const [item] = inventedSkillItems;
    expect(skillItemProblems([{ ...item!, citations: [] }])).toEqual([
      'Skill item "skill-invented-ticket" has no citation.',
    ]);
    expect(skillItemProblems([item!, item!])).toEqual(['The skill item id "skill-invented-ticket" is used twice.']);
    expect(
      skillItemProblems([{ ...item!, howToGetIt: { text: "x", citation: inventedCitation("someday") } }]),
    ).toEqual(['A citation on skill item "skill-invented-ticket": read date "someday" is not a real day written YYYY-MM-DD.']);
  });

  it("a source checked by a tool instead of read passes when its check is whole, and a broken one is refused", () => {
    // docs/engines/citations.md: a read, a tool check, or both. A tool check is not a read, so it
    // doesn't date the road (its newest read stays 2026-10-02).
    const toolChecked = (quotes: string[]) => (r: Road) => {
      const { title, authority, jurisdiction, url, note } = r.steps[1]!.citations[0]!;
      r.steps[1]!.citations[0] = { title, authority, jurisdiction, url, note, toolCheck: { checkedOn: "2026-10-01", quotes } };
    };
    expect(broken(toolChecked(["words found on the invented page"]))).toEqual([]);
    expect(broken(toolChecked([]))).toEqual(['A citation on step "step-invented-employed": tool check has no quote.']);
  });

  it("an official fee checked only by a tool must quote its own amount, as the page writes it", () => {
    // The fee is $125 (12_500 cents). A tool check proves only that its quotes are on the page, so the
    // amount must be in one of them, or the typed number is one nobody found there.
    const feeQuotes = (quotes: string[], amountCents = 12_500) => (r: Road) => {
      const fee = r.steps[0]!.costs[0]!;
      if (fee.kind !== "official-fee") throw new Error("the invented road's first cost is its fee");
      const { title, authority, jurisdiction, url, note } = fee.citation;
      fee.amountCents = amountCents;
      fee.citation = { title, authority, jurisdiction, url, note, toolCheck: { checkedOn: "2026-10-01", quotes } };
    };
    expect(broken(feeQuotes(["The invented fee is $125 a year."]))).toEqual([]);
    expect(broken(feeQuotes(["The invented fee is $125.00 a year."]))).toEqual([]);
    expect(broken(feeQuotes(["The invented fee is $1,250 a year."], 125_000))).toEqual([]);
    expect(broken(feeQuotes(["The invented fee is $1,250.50 a year."], 125_050))).toEqual([]);
    const missing =
      'Official fee "cost-invented-fee" is checked only by a tool, and none of its quotes has its amount ($125 or $125.00).';
    expect(broken(feeQuotes(["The invented fee is due each year."]))).toEqual([missing]);
    // Whole amounts only: $125 inside $1250, $125.50 or $12,500 is a different number.
    expect(broken(feeQuotes(["The invented fee is $1250 a year."]))).toEqual([missing]);
    expect(broken(feeQuotes(["The invented fee is $125.50 a year."]))).toEqual([missing]);
    expect(broken(feeQuotes(["The invented fee is $12,500 a year."]))).toEqual([missing]);
    // A $0 fee is exempt: pages say "no cost", not "$0".
    expect(broken(feeQuotes(["There is no cost to obtain one."], 0))).toEqual([]);
    // A fee a person read keeps today's rule: the read date is enough.
    expect(broken(() => {})).toEqual([]);
  });

  it("a tool-checked fee's amount can't be one end of a range: an official fee is one amount", () => {
    const feeQuote = (quote: string) => (r: Road) => {
      const fee = r.steps[0]!.costs[0]!;
      if (fee.kind !== "official-fee") throw new Error("the invented road's first cost is its fee");
      const { title, authority, jurisdiction, url, note } = fee.citation;
      fee.citation = { title, authority, jurisdiction, url, note, toolCheck: { checkedOn: "2026-10-01", quotes: [quote] } };
    };
    const missing =
      'Official fee "cost-invented-fee" is checked only by a tool, and none of its quotes has its amount ($125 or $125.00).';
    for (const range of [
      "The invented fee is $125-$200 per exam.",
      "The invented fee is $100-$125 per exam.",
      "The invented fee is $125 – $200 per exam.",
      "The invented fee is $125 to $200 per exam.",
      "The invented fee is $100 to $125 per exam.",
      "Invented fees range between $100 and $125 a year.",
      "Invented fees range between $125 and $200 a year.",
      "Invented fees start from $125 a year.",
    ]) {
      expect(broken(feeQuote(range)), range).toEqual([missing]);
    }
    // One amount next to a different one is still one amount.
    expect(broken(feeQuote("The invented fee is $125, and the rewrite is $50."))).toEqual([]);
    expect(broken(feeQuote("A $125 invented fee and a $50 rewrite fee."))).toEqual([]);
  });

  it("a fee that applies only sometimes carries its condition as a typed field, never in the label alone", () => {
    const fee = (change: (f: Extract<Road["steps"][number]["costs"][number], { kind: "official-fee" }>) => void) => (r: Road) => {
      const line = r.steps[0]!.costs[0]!;
      if (line.kind !== "official-fee") throw new Error("the invented road's first cost is its fee");
      change(line);
    };
    // The label says "only if", and the type says so too: fine.
    expect(
      broken(fee((f) => {
        f.label = "Invented rewrite fee (only if you fail)";
        f.onlyIf = "You failed the invented exam and choose to rewrite it.";
      })),
    ).toEqual([]);
    // The label says "only if" and nothing typed does: a total would count it.
    expect(broken(fee((f) => (f.label = "Invented rewrite fee (only if you fail)")))).toEqual([
      'Official fee "cost-invented-fee" says "only if" in its label but has no onlyIf condition.',
    ]);
    // A blank condition says nothing.
    expect(broken(fee((f) => (f.onlyIf = "  ")))).toEqual(['Official fee "cost-invented-fee" has a blank onlyIf condition.']);
  });

  it("a road none of whose sources has been read carries no read date", () => {
    // Every citation becomes a tool check; the road then has nothing read, so any date it gives is a claim.
    const onlyToolChecked = (r: Road) => {
      const tool = (c: EngineCitation): EngineCitation => {
        const { title, authority, jurisdiction, url, note } = c;
        return { title, authority, jurisdiction, url, note, toolCheck: { checkedOn: "2026-10-01", quotes: ["The invented fee is $125 a year."] } };
      };
      for (const step of r.steps) {
        step.citations = step.citations.map(tool);
        for (const line of step.doneWhen) line.citation = tool(line.citation);
        for (const cost of step.costs) if (cost.kind === "official-fee") cost.citation = tool(cost.citation);
      }
    };
    expect(broken((r) => {
      onlyToolChecked(r);
      r.lastVerified = "";
    })).toEqual([]);
    expect(broken(onlyToolChecked)).toEqual([
      'Road "road-invented-test-only" says it was last read 2026-10-02, but none of its sources has been read.',
    ]);
  });
});

describe("where a road carries on after its last column", () => {
  const road0 = roadStartingAnyBusinessAB;
  const joining = (joins: Road["joins"]): Road => ({ ...inventedRoad(), joins });

  it("a join naming a real road and one of its columns passes", () => {
    expect(roadJoinProblems([road0, joining({ roadId: road0.id, columnId: "tier-3-incorporating" })])).toEqual([]);
    // A road with no join has nothing to check.
    expect(roadJoinProblems([road0, inventedRoad()])).toEqual([]);
  });

  it("a join naming a road that isn't in the catalog, a column that road doesn't have, or itself is refused", () => {
    expect(roadJoinProblems([road0, joining({ roadId: "road-nobody-wrote", columnId: "tier-3-incorporating" })])).toEqual([
      'Road "road-invented-test-only" joins a road the catalog doesn\'t have: "road-nobody-wrote".',
    ]);
    expect(roadJoinProblems([road0, joining({ roadId: road0.id, columnId: "col-nobody-wrote" })])).toEqual([
      'Road "road-invented-test-only" joins road "road-starting-any-business-ab" at a column it doesn\'t have: "col-nobody-wrote".',
    ]);
    expect(roadJoinProblems([joining({ roadId: "road-invented-test-only", columnId: "col-invented-start" })])).toEqual([
      'Road "road-invented-test-only" joins itself.',
    ]);
  });
});

describe("cost lines come in three kinds, and a blank never reads as $0", () => {
  const [fee, named] = inventedRoad().steps[0]!.costs;

  it("an official fee shows its amount, its source and the day it was read", () => {
    expect(costLineAsShown(fee!)).toEqual({
      kind: "official-fee",
      lineId: "cost-invented-fee",
      label: "Invented fee (test only)",
      amountCents: 12_500,
      citation: inventedCitation(),
    });
  });

  it("an official fee stays the official fee even if a quote is passed for it", () => {
    expect(costLineAsShown(fee!, 99_00)).toMatchObject({ kind: "official-fee", amountCents: 12_500 });
  });

  it("an official fee that applies only sometimes carries its condition to the screen", () => {
    if (fee!.kind !== "official-fee") throw new Error("the invented road's first cost is its fee");
    const onlyIf = "You failed the invented exam and choose to rewrite it.";
    expect(costLineAsShown({ ...fee!, onlyIf })).toMatchObject({ kind: "official-fee", onlyIf });
    // A fee that always applies has no condition at all, not an empty one.
    expect(costLineAsShown(fee!)).not.toHaveProperty("onlyIf");
  });

  it("a named line with the person's agreed quote is their quote", () => {
    expect(costLineAsShown(named!, 3_400_00)).toEqual({
      kind: "your-quote",
      lineId: "cost-invented-tools",
      label: "Tools (test only)",
      amountCents: 3_400_00,
    });
  });

  it("a named line with no agreed quote is named, not priced: no amount at all", () => {
    for (const quote of [undefined, null]) {
      const shown = costLineAsShown(named!, quote);
      expect(shown).toEqual({ kind: "named-not-priced", lineId: "cost-invented-tools", label: "Tools (test only)" });
      expect(shown).not.toHaveProperty("amountCents");
    }
  });

  it("a quote that isn't a whole, non-negative number of cents counts as not priced, never as a number", () => {
    for (const quote of [Number.NaN, -500, 12.5, Number.POSITIVE_INFINITY]) {
      expect(costLineAsShown(named!, quote), String(quote)).toEqual({
        kind: "named-not-priced",
        lineId: "cost-invented-tools",
        label: "Tools (test only)",
      });
    }
    // Zero is a real quote (a tool the person already owns), not a blank.
    expect(costLineAsShown(named!, 0)).toMatchObject({ kind: "your-quote", amountCents: 0 });
  });
});
