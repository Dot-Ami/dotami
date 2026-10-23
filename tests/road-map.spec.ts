import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { columnNumbers, futureEdges } from "@/lib/roads/paths";
import { StrategyMap } from "@/components/cockpit/strategy-map";
import { generalRoadV2026, type Road } from "@/lib/engines/roads/v2026";
import { evaluateScenario } from "@/lib/scenarios/evaluate-scenario";

import { inventedRoad } from "./helpers/invented-road";
import { MAP_TODAY, mapCases, type MapCase } from "./helpers/strategy-map-cases";
import { withChipRenames } from "./helpers/chip-renames";
import { withTypeScaleNames } from "./helpers/type-scale-renames";

/**
 * The map draws any road, and today's map, drawn as road 0, is exactly what it was.
 *
 * tests/fixtures/strategy-map/ holds what the old map drew (from main at 7232937 on 2026-10-11; the
 * HTML re-recorded on 2026-10-12 from the honest-map branch at a7f5bcb, #145, whose chips and reason
 * lines changed the old map on purpose) for each
 * state in tests/helpers/strategy-map-cases.ts, plus where every card's arrows went and which column
 * each card sat in. Drawing the same states through the road must give the same HTML, byte for byte.
 * Since the type scale (2026-10-17, S2.5.30d) the recordings are read with the six named text sizes put
 * in for the pixel classes they replaced (tests/helpers/type-scale-renames.ts); the files themselves stay
 * as recorded, and every word and every other class is still compared exactly.
 */
const fixtures = new URL("./fixtures/strategy-map/", import.meta.url);

function draw(road: Road, c: MapCase): string {
  return renderToStaticMarkup(
    createElement(StrategyMap, {
      road,
      scenario: c.scenario,
      evaluation: evaluateScenario(c.scenario, { today: MAP_TODAY }),
      selectedStepId: c.selectedNodeId,
      onSelectStep: () => {},
      onBranchChange: () => {},
    }),
  );
}

/**
 * The before-you-open steps added to road 0 on 2026-10-12 (docs/architecture/future-cockpit.md § 6,
 * "Road 0's content as built"), and Keep your records from day one (2026-10-14): the only cards the map
 * gained. No rule colours them yet.
 */
const ADDED = [
  { id: "step-start-register-name", label: "Register your business name, if you use one" },
  { id: "step-start-permits-bizpal", label: "Look up your permits and licences (BizPaL)" },
  { id: "step-start-business-account", label: "A separate bank account for the business, if it has a name other than yours" },
  { id: "step-start-keep-records", label: "Keep your records from day one" },
];

/** The wrapper of one stage card, found by the card's name. */
function cardAt(html: string, label: string): { start: number; end: number } {
  const heading = html.indexOf(`>${label}</h4>`);
  if (heading === -1) throw new Error(`no card named ${label}`);
  const start = html.lastIndexOf('<div class="flex flex-col gap-1.5 transition-opacity', heading);
  // An added card has no lever cards, so its wrapper ends right after its button.
  const end = html.indexOf("</button></div>", heading) + "</button></div>".length;
  return { start, end };
}

/** The map's HTML with the added cards cut out, and the cut-out cards. */
function withoutAdded(html: string): { rest: string; cards: string[] } {
  const cards: string[] = [];
  let rest = html;
  for (const { label } of ADDED) {
    const { start, end } = cardAt(rest, label);
    cards.push(rest.slice(start, end));
    rest = rest.slice(0, start) + rest.slice(end);
  }
  return { rest, cards };
}

describe("today's map, drawn as the road Starting any business in Alberta", () => {
  it.each(mapCases)("draws $name exactly as the old map did, plus the four before-you-open cards", (c) => {
    // Each file is one line of HTML; only its line ending can differ by checkout (CRLF on Windows).
    // With the place chips renamed on 2026-10-23 (tests/helpers/chip-renames.ts), as the type scale's classes are.
    const before = withChipRenames(withTypeScaleNames(readFileSync(new URL(`${c.name}.html`, fixtures), "utf8").trimEnd()));
    const { rest, cards } = withoutAdded(draw(generalRoadV2026, c));
    // Everything that was there is there, byte for byte; the before pictures are not re-recorded.
    expect(rest).toBe(before);
    expect(cards).toHaveLength(4);
  });

  it("an added card makes no colour claim and no place claim: no rule reads it yet", () => {
    const { cards } = withoutAdded(draw(generalRoadV2026, mapCases[0]!));
    cards.forEach((card, i) => {
      const { label } = ADDED[i]!;
      expect(card).toContain(`aria-label="${label}, no rule reads this step yet, shows where it leads"`);
      expect(card).toContain(">no rule yet</span>");
      // None of the three colours' words, and none of the chips worked out from the branch picks.
      for (const words of ["applies as answered", "check first", "apply as answered", ">ahead<", ">now<", ">done<"]) {
        expect(card, words).not.toContain(words);
      }
      // A neutral left bar, not the grey that means "doesn't apply as answered".
      expect(card).toContain("border-l-rule-soft");
      expect(card).not.toMatch(/border-l-(sage|amber|rule)(?![-\w])/);
    });
  });

  it("every card's hover arrows go where they went, and every card sits in the same column", () => {
    const before = JSON.parse(readFileSync(new URL("arrows-and-columns.json", fixtures), "utf8")) as {
      arrows: Record<string, { from: string; to: string; depth: number }[]>;
      columns: Record<string, number>;
    };
    const stepsById = new Map(generalRoadV2026.steps.map((s) => [s.id, s]));
    const addedIds = new Set(ADDED.map((a) => a.id));
    const old = generalRoadV2026.steps.filter((s) => !addedIds.has(s.id));
    const arrows = Object.fromEntries(old.map((s) => [s.id, futureEdges(stepsById, s.id)]));
    expect(arrows).toEqual(before.arrows);
    const columns = Object.fromEntries(columnNumbers(generalRoadV2026));
    expect(Object.fromEntries(old.map((s) => [s.id, columns[s.id]]))).toEqual(before.columns);

    // Each added card sits in the first column and leads to Sole Prop activation, then along its arrows.
    const fromSoleProp = before.arrows["stage-1-sole-prop-activation"]!;
    for (const { id } of ADDED) {
      expect(columns[id], id).toBe(1);
      expect(futureEdges(stepsById, id)).toEqual([
        { from: id, to: "stage-1-sole-prop-activation", depth: 1 },
        ...fromSoleProp.map((e) => ({ ...e, depth: e.depth + 1 })),
      ]);
    }
  });
});

describe("the map draws any road it is given", () => {
  it("an invented road: its own columns, steps and arrows, and none of today's tax map", () => {
    const road = inventedRoad();
    const html = draw(road, { ...mapCases[0]!, selectedNodeId: null });
    expect(html).toContain("Tier 1");
    expect(html).toContain("Tier 2");
    expect(html).not.toContain("Tier 3");
    for (const label of ["Start", "Then", "Train (test only)", "Stay employed (test only)", "Own shop (test only)"]) {
      expect(html).toContain(label);
    }
    expect(html).not.toContain("Sole Prop activation");
    expect(html).not.toContain("GST timing");
    const stepsById = new Map(road.steps.map((s) => [s.id, s]));
    expect(futureEdges(stepsById, "step-invented-train")).toEqual([
      { from: "step-invented-train", to: "step-invented-employed", depth: 1 },
      { from: "step-invented-train", to: "step-invented-own", depth: 1 },
    ]);
    expect(Object.fromEntries(columnNumbers(road))).toEqual({
      "step-invented-train": 1,
      "step-invented-employed": 2,
      "step-invented-own": 2,
    });
  });

  it("the map's files hold no tax map of their own: they import nothing from today's CFE catalog", () => {
    for (const file of ["components/cockpit/strategy-map.tsx", "components/cockpit/map-arrows.tsx"]) {
      const source = readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
      expect(source, file).not.toMatch(/@\/lib\/engines\/cfe/);
    }
  });
});
