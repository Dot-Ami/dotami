import { describe, expect, it } from "vitest";

import { cfeNodesV2026 } from "@/lib/engines/cfe/v2026";
import { cfeTiersV2026 } from "@/lib/engines/cfe/v2026/tiers";
import {
  costLineAsShown,
  generalRoadV2026,
  roadById,
  roadProblems,
  roadsCatalogV2026,
  roadStartingAnyBusinessAB,
  skillItemProblems,
  skillItemsV2026,
  type Road,
} from "@/lib/engines/roads/v2026";
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
    ],
    // The keys today's saved branch picks are stored under (ScenarioState.activeBranches).
    forks: ["gstTiming", "incorporationTiming"],
    // Road 0's done-when and cost lines are written in a later pull request; none has shipped yet.
    doneWhen: [],
    costs: [],
  },
};

/** Every skill item id that has ever shipped. Shared across roads, and forever like the ids above. */
const SHIPPED_SKILL_ITEM_IDS: string[] = [];

const doneWhenIds = (road: Road) => road.steps.flatMap((s) => s.doneWhen.map((d) => d.id));
const costIds = (road: Road) => road.steps.flatMap((s) => s.costs.map((c) => c.id));

describe("the road catalog", () => {
  it("every road passes every check, and so does the shared list of skill items", () => {
    expect(roadsCatalogV2026.entries.length).toBeGreaterThan(0);
    for (const road of roadsCatalogV2026.entries) {
      expect(roadProblems(road, skillItemsV2026), road.id).toEqual([]);
    }
    expect(skillItemProblems(skillItemsV2026)).toEqual([]);
    // The invented road used below is valid too, so each broken copy fails for one reason only.
    expect(roadProblems(inventedRoad(), inventedSkillItems)).toEqual([]);
    expect(skillItemProblems(inventedSkillItems)).toEqual([]);
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

describe("road 0, Starting any business in Alberta, is today's ten-step map unchanged", () => {
  const road = roadStartingAnyBusinessAB;

  it("is the general road every map draws until a saved future names another", () => {
    expect(generalRoadV2026).toBe(road);
    expect(road.id).toBe("road-starting-any-business-ab");
    expect(road.label).toBe("Starting any business in Alberta (tax and structure)");
    expect(road.kind).toBe("business");
    // Today's place values, nothing new (how places are stored is still the maintainer's call).
    expect(road.provinces).toEqual(["AB"]);
  });

  it("its columns are today's four tiers, in order, with the same names, lines and toggles", () => {
    expect(road.columns.map((c) => c.id)).toEqual(cfeTiersV2026.map((t) => t.id));
    road.columns.forEach((column, i) => {
      const tier = cfeTiersV2026[i]!;
      expect(column.label).toBe(tier.label);
      expect(column.summary).toBe(tier.subtitle);
      expect(column.forkId).toBe(tier.branchDecisionId);
      // The same cards in the same order the old map drew: the catalog's nodes whose stage the tier lists.
      expect(column.steps).toEqual(cfeNodesV2026.filter((n) => tier.stages.includes(n.stage)).map((n) => n.id));
    });
  });

  it("its steps are today's ten nodes: same ids, names, card lines, sources and arrows", () => {
    expect(road.steps.map((s) => s.id)).toEqual(cfeNodesV2026.map((n) => n.id));
    road.steps.forEach((step, i) => {
      const node = cfeNodesV2026[i]!;
      expect(step.label).toBe(node.label);
      expect(step.summary).toBe(node.trigger);
      expect(step.next).toEqual(node.branches);
      expect(step.citations).toEqual(node.citations);
      // Content still to be written for road 0 (done-when lines, cost lines, skills, official links)
      // comes in its own pull request, read from the official pages; nothing is made up meanwhile.
      expect(step.doneWhen).toEqual([]);
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
    // A source checked only by a tool has no read date (the CRA's GST/HST page since 2026-10-12), and
    // a tool check is not a read, so only read dates count.
    const newest = cfeNodesV2026
      .flatMap((n) => n.citations.map((c) => c.lastVerified))
      .filter((d): d is string => d !== undefined)
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
