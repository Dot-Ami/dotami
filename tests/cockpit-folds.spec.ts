/**
 * Folding the cockpit's regions (docs/architecture/future-cockpit.md § 2, "Folding and phone width"): the
 * rail, the goal bar, the right-hand panel and the map's legend each fold with a button that says what it
 * does, the answers are remembered in this browser's storage, and nothing a fold hides is gone for good.
 *
 * The real browser checks (every card fits at 1280x720 with everything folded; phone width) are in
 * e2e/cockpit-fit.spec.ts. Here: the remembered answers, read and written safely, and what the folded goal
 * bar and legend draw.
 */
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { GoalBar } from "@/components/cockpit/goal-bar";
import { StrategyMap } from "@/components/cockpit/strategy-map";
import {
  ALL_FOLDED,
  ALL_OPEN,
  allFolded,
  COCKPIT_FOLDS_KEY,
  FOLD_REGIONS,
  parseFolds,
  readFolds,
  writeFolds,
} from "@/lib/cockpit/folds";
import { FIRST_OVERLAYS, gaugeView } from "@/lib/cockpit/view";
import { cockpitWords } from "@/lib/cockpit/words";
import { generalRoadV2026 } from "@/lib/engines/roads/v2026";
import { evaluateRoad } from "@/lib/roads";
import { evaluateScenario } from "@/lib/scenarios/evaluate-scenario";

import { input, inventedIdea, roadToEvaluate } from "./helpers/road-to-evaluate";
import { MAP_TODAY, mapCases } from "./helpers/strategy-map-cases";

const words = cockpitWords.folds;

/** Text as React writes it inside an attribute. */
const escapeAttribute = (text: string) =>
  text.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/'/g, "&#x27;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** A stand-in for the browser's localStorage, holding strings like the real one. */
function fakeStorage(initial: Record<string, string> = {}) {
  const items = new Map(Object.entries(initial));
  return {
    items,
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => void items.set(key, value),
    removeItem: (key: string) => void items.delete(key),
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("the remembered answers", () => {
  it("are four: the rail, the goal bar, the panel and the legend, and everything starts open", () => {
    expect([...FOLD_REGIONS]).toEqual(["rail", "goal", "panel", "legend"]);
    expect(ALL_OPEN).toEqual({ rail: false, goal: false, panel: false, legend: false });
    expect(ALL_FOLDED).toEqual({ rail: true, goal: true, panel: true, legend: true });
    expect(COCKPIT_FOLDS_KEY).toBe("dotami-cockpit-folds");
  });

  it("read back only a real true as folded; anything else, or nothing, reads as open", () => {
    expect(parseFolds(null)).toEqual(ALL_OPEN);
    expect(parseFolds("")).toEqual(ALL_OPEN);
    expect(parseFolds("not json {")).toEqual(ALL_OPEN);
    expect(parseFolds("[true,true]")).toEqual(ALL_OPEN);
    expect(parseFolds("null")).toEqual(ALL_OPEN);
    expect(parseFolds('{"rail":true,"goal":"true","panel":1,"legend":true,"other":true}')).toEqual({
      rail: true,
      goal: false,
      panel: false,
      legend: true,
    });
    // Each region on its own: a truthy value that isn't `true` never folds it.
    for (const region of FOLD_REGIONS) {
      for (const notTrue of ['"true"', "1", '"yes"', "{}", "[]"]) {
        expect(parseFolds(`{"${region}":${notTrue}}`), `${region}: ${notTrue}`).toEqual(ALL_OPEN);
      }
      expect(parseFolds(`{"${region}":true}`)).toEqual({ ...ALL_OPEN, [region]: true });
    }
  });

  it("are written as one small JSON object and read back the same", () => {
    const storage = fakeStorage();
    vi.stubGlobal("localStorage", storage);
    writeFolds({ rail: true, goal: false, panel: true, legend: false });
    expect(storage.items.get(COCKPIT_FOLDS_KEY)).toBe('{"rail":true,"goal":false,"panel":true,"legend":false}');
    expect(readFolds()).toEqual({ rail: true, goal: false, panel: true, legend: false });
  });

  it("a browser that refuses storage gets everything open, and a fold that still works without throwing", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw new Error("storage switched off");
      },
      setItem: () => {
        throw new Error("storage switched off");
      },
    });
    expect(readFolds()).toEqual(ALL_OPEN);
    expect(() => writeFolds(ALL_FOLDED)).not.toThrow();
  });

  it("with no browser at all (the server's first drawing), everything is open", () => {
    vi.stubGlobal("localStorage", undefined);
    expect(readFolds()).toEqual(ALL_OPEN);
    expect(() => writeFolds(ALL_FOLDED)).not.toThrow();
  });

  it("says when all four are folded, for the header's button", () => {
    expect(allFolded(ALL_FOLDED)).toBe(true);
    expect(allFolded(ALL_OPEN)).toBe(false);
    expect(allFolded({ ...ALL_FOLDED, legend: false })).toBe(false);
  });
});

describe("the fold buttons' words", () => {
  it("each region's button says what it does, both ways", () => {
    expect(words.rail).toEqual({ fold: "Fold venture details", show: "Show venture details" });
    expect(words.goal).toEqual({ fold: "Fold goal and gauges", show: "Show goal and gauges" });
    expect(words.panel.fold).toBe("Fold the panel");
    expect(words.panel.show("Sole Prop activation")).toBe("Show the panel: Sole Prop activation");
    expect(words.legend.fold).toBe("Fold the legend");
    expect(words.legend.show).toBe("Show the legend");
    expect(words.legend.title).toBe("Legend");
    expect(words.all).toEqual({ fold: "Fold all panels", show: "Show all panels" });
    expect(words.railSheet).toEqual({ open: "Venture details", close: "Close venture details" });
    expect(words.roadRegion).toBe("The road");
  });
});

describe("the goal bar folds to one line that keeps the four gauges", () => {
  const draw = (folded: boolean | undefined) =>
    renderToStaticMarkup(
      createElement(GoalBar, {
        road: roadToEvaluate(),
        evaluation: evaluateRoad(input()),
        scenario: inventedIdea(),
        firstWords: { text: "My own small shop (invented)", saidAt: "2026-10-10" },
        target: null,
        active: null,
        onGauge: () => {},
        ...(folded === undefined ? {} : { folded, onToggleFold: () => {} }),
      }),
    );

  it("open: the sentence, the lines, and a button to fold it", () => {
    const html = draw(false);
    expect(html).toContain("“My own small shop (invented)”");
    expect(html).toContain(`>${words.goal.fold}<`);
    expect(html).toContain('aria-expanded="true"');
  });

  it("folded: one line with the four gauges as buttons (name and value), and a button to show it again", () => {
    const html = draw(true);
    // The one line is everything before the open bar, which follows it hidden.
    const line = html.split(/<div[^>]*hidden=""/)[0]!;
    expect(line).toContain(`>${words.goal.show}<`);
    expect(line).toContain('aria-expanded="false"');
    expect(line).not.toContain(`>${words.goal.fold}<`);
    // The four gauges are still there and still pressable.
    expect(line.match(/aria-pressed="false"/g)?.length).toBe(4);
    for (const label of ["Steps", "Skills", "Start-up money", "Your date"]) expect(line).toContain(label);
    // The sentence and the lines under each gauge are not in the one line.
    expect(line).not.toContain("“My own small shop (invented)”");
    expect(line).not.toContain("your words · 2026-10-10");
  });

  it("folded: the open bar stays on the page, hidden, not removed (the same as the rail, the panel and the legend)", () => {
    const html = draw(true);
    expect(html).toMatch(/<div[^>]*hidden=""[^>]*>.*“My own small shop \(invented\)”/);
    expect(html).toMatch(/<div[^>]*hidden=""[^>]*>.*your words · 2026-10-10/);
    // Open, nothing in it is hidden.
    expect(draw(false)).not.toContain('hidden=""');
  });

  it("folded: each gauge's button carries the lines it leaves out, in its title", () => {
    const view = gaugeView(evaluateRoad(input()), roadToEvaluate(), inventedIdea());
    const html = draw(true);
    for (const id of ["steps", "skills", "money", "date"] as const) {
      const title = [view[id].value, ...view[id].lines].join(" · ");
      expect(html, id).toContain(`title="${escapeAttribute(title)}"`);
    }
    // The money gauge has lines that qualify its value, so the check above is not empty.
    expect(view.money.lines.length).toBeGreaterThan(0);
  });

  it("drawn without a fold (as other tests and screens draw it), it has no fold button", () => {
    const html = draw(undefined);
    expect(html).not.toContain(words.goal.fold);
    expect(html).not.toContain(words.goal.show);
  });
});

describe("the map's legend folds, in the cockpit only", () => {
  const c = mapCases[0]!;
  const draw = (cockpit?: { legendFolded: boolean; onToggleLegend: () => void }) =>
    renderToStaticMarkup(
      createElement(StrategyMap, {
        road: generalRoadV2026,
        scenario: c.scenario,
        evaluation: evaluateScenario(c.scenario, { today: MAP_TODAY }),
        selectedStepId: null,
        onSelectStep: () => {},
        onBranchChange: () => {},
        overlays: FIRST_OVERLAYS,
        ...(cockpit ? { cockpit } : {}),
      }),
    );

  it("open: the legend's lines and a button to fold it; the road's area is a region named for a screen reader", () => {
    const html = draw({ legendFolded: false, onToggleLegend: () => {} });
    expect(html).toContain(`>${words.legend.fold}<`);
    expect(html).toContain("applies as answered");
    expect(html).toContain(`aria-label="${words.roadRegion}"`);
    expect(html).toContain('role="region"');
    expect(html).toContain(`role="group" aria-label="${words.legend.title}"`);
  });

  it("folded: one line with a button to show it again; its lines stay on the page, hidden, not removed", () => {
    const html = draw({ legendFolded: true, onToggleLegend: () => {} });
    expect(html).toContain(`>${words.legend.show}<`);
    expect(html).not.toContain(`>${words.legend.fold}<`);
    expect(html).toMatch(/<div[^>]*hidden=""[^>]*>.*applies as answered/);
  });

  it("drawn without the cockpit, the legend has no fold button and the road's area no region (the map's HTML is unchanged)", () => {
    const html = draw();
    expect(html).not.toContain(words.legend.fold);
    expect(html).not.toContain(`aria-label="${words.roadRegion}"`);
  });
});
