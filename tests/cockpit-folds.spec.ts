/**
 * Folding the cockpit's regions (docs/architecture/future-cockpit.md § 2, "Folding and phone width"): the
 * rail, the goal bar, the right-hand panel, the map's legend and (2026-10-13) the what-if bar each fold with
 * a button that says what it does, the answers are remembered in this browser's storage, and nothing a fold
 * hides is gone for good.
 *
 * The real browser checks (every card fits at 1280x720 with everything folded; phone width) are in
 * e2e/cockpit-fit.spec.ts. Here: the remembered answers, read and written safely, and what the folded goal
 * bar, legend and what-if bar draw.
 */
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { GoalBar } from "@/components/cockpit/goal-bar";
import { OverlaySwitches } from "@/components/cockpit/overlay-switches";
import { LEGEND_ID, roadAheadColumnIds, StrategyMap } from "@/components/cockpit/strategy-map";
import { LookCloserMenu, type LookCloserItem } from "@/components/cockpit/look-closer-menu";
import { THIS_VISIT_ID, WHAT_IF_BAR_ID, WhatIfBar, WhatIfOnNote } from "@/components/cockpit/what-if-bar";
import {
  ALL_FOLDED,
  ALL_OPEN,
  allFolded,
  COCKPIT_FOLDS_KEY,
  FIRST_VISIT,
  FIRST_VISIT_MEMORY,
  FOLD_REGIONS,
  OVERLAYS_BEFORE_CALM_VIEW,
  parseFolds,
  parseMemory,
  readMemory,
  writeMemory,
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
  it("are six folds: the rail, the goal bar, the panel, the legend, the what-if bar and the road ahead", () => {
    // The overlay switches don't fold (a review of the calm first view, 2026-10-17): every one is drawn.
    expect([...FOLD_REGIONS]).toEqual(["rail", "goal", "panel", "legend", "whatIf", "roadAhead"]);
    expect(ALL_OPEN).toEqual({ rail: false, goal: false, panel: false, legend: false, whatIf: false, roadAhead: false });
    expect(ALL_FOLDED).toEqual({ rail: true, goal: true, panel: true, legend: true, whatIf: true, roadAhead: true });
    expect(COCKPIT_FOLDS_KEY).toBe("dotami-cockpit-folds");
  });

  it("a first visit (nothing stored) opens calm: only the goal bar open, the panel open when it holds something", () => {
    // The layout rule's third line (docs/ui-spec/README.md): the road, the goal and the next steps.
    expect(FIRST_VISIT).toEqual({ rail: true, goal: false, panel: false, legend: true, whatIf: true, roadAhead: true });
    expect(FIRST_VISIT_MEMORY).toEqual({ folds: FIRST_VISIT, overlays: null, coachDismissed: false });
    expect(parseMemory(null)).toEqual(FIRST_VISIT_MEMORY);
    expect(parseMemory("")).toEqual(FIRST_VISIT_MEMORY);
    expect(parseFolds(undefined)).toEqual(FIRST_VISIT);
    // Only Road and Skills on (future-cockpit.md § 2, "First visit and return visits").
    expect(FIRST_OVERLAYS).toEqual({ skills: true, money: false, rules: false });
  });

  it("an answer stored before an answer existed reads that answer as open, so everything open stays open", () => {
    expect(parseFolds('{"rail":true,"goal":true,"panel":true,"legend":true}')).toEqual({
      ...ALL_FOLDED,
      whatIf: false,
      roadAhead: false,
    });
    // A "layers" answer stored while the overlay switches folded (a few hours of 2026-10-17) is read as
    // nothing: there is no such fold any more.
    expect(parseFolds('{"rail":true,"layers":true}')).toEqual({ ...ALL_OPEN, rail: true });
    // A person who had everything open before the calm first view (2026-10-17) still has it all open.
    const before = '{"rail":false,"goal":false,"panel":false,"legend":false,"whatIf":false}';
    expect(parseMemory(before).folds).toEqual(ALL_OPEN);
  });

  it("a value stored before the calm first view is a return visit: the overlays every visit had then, and no coach line", () => {
    // A review (2026-10-17) found this browser opening with Rules & tax switched off, on by default until
    // then, and the first visit's tip back. Every value written since the calm view has `roadAhead`.
    expect(OVERLAYS_BEFORE_CALM_VIEW).toEqual({ skills: false, money: false, rules: true });
    for (const before of [
      '{"rail":false,"goal":false,"panel":false,"legend":false,"whatIf":false}',
      '{"rail":true,"goal":true,"panel":true,"legend":true}',
      "{}",
    ]) {
      const memory = parseMemory(before);
      expect(memory.overlays, before).toEqual(OVERLAYS_BEFORE_CALM_VIEW);
      expect(memory.coachDismissed, before).toBe(true);
    }
    // Written since the calm view: the first visit's overlays until the person changes them, and the coach
    // line until Got it.
    const since = '{"rail":true,"goal":false,"panel":false,"legend":true,"whatIf":true,"roadAhead":true}';
    expect(parseMemory(since)).toEqual({ folds: FIRST_VISIT, overlays: null, coachDismissed: false });
  });

  it("read back only a real true as folded; anything else reads as open, and a damaged value opens everything", () => {
    expect(parseFolds("not json {")).toEqual(ALL_OPEN);
    expect(parseFolds("[true,true]")).toEqual(ALL_OPEN);
    expect(parseFolds("null")).toEqual(ALL_OPEN);
    expect(parseFolds('{"rail":true,"goal":"true","panel":1,"legend":true,"whatIf":"yes","roadAhead":true,"other":true}')).toEqual({
      rail: true,
      goal: false,
      panel: false,
      legend: true,
      whatIf: false,
      roadAhead: true,
    });
    // Each region on its own: a truthy value that isn't `true` never folds it.
    for (const region of FOLD_REGIONS) {
      for (const notTrue of ['"true"', "1", '"yes"', "{}", "[]"]) {
        expect(parseFolds(`{"${region}":${notTrue}}`), `${region}: ${notTrue}`).toEqual(ALL_OPEN);
      }
      expect(parseFolds(`{"${region}":true}`)).toEqual({ ...ALL_OPEN, [region]: true });
    }
  });

  it("the overlays last on and the coach line put away are read the same way: only a real true counts", () => {
    expect(parseMemory('{"roadAhead":false,"overlays":{"skills":false,"money":true,"rules":"yes"},"coachDismissed":true}')).toEqual({
      folds: ALL_OPEN,
      overlays: { skills: false, money: true, rules: false },
      coachDismissed: true,
    });
    // Anything but an object reads as never changed (the first visit's overlays are used).
    for (const notAnObject of ["true", "1", '"skills"', "[true]", "null"]) {
      expect(parseMemory(`{"roadAhead":false,"overlays":${notAnObject}}`).overlays, notAnObject).toBeNull();
    }
    expect(parseMemory('{"roadAhead":false,"coachDismissed":"true"}').coachDismissed).toBe(false);
  });

  it("are written as one small JSON object and read back the same", () => {
    const storage = fakeStorage();
    vi.stubGlobal("localStorage", storage);
    const folds = { rail: true, goal: false, panel: true, legend: false, whatIf: true, roadAhead: false };
    writeMemory({ folds, overlays: null, coachDismissed: false });
    expect(storage.items.get(COCKPIT_FOLDS_KEY)).toBe('{"rail":true,"goal":false,"panel":true,"legend":false,"whatIf":true,"roadAhead":false}');
    expect(readMemory()).toEqual({ folds, overlays: null, coachDismissed: false });
    // The overlays and the coach line only once the person changed them.
    writeMemory({ folds, overlays: { skills: true, money: true, rules: false }, coachDismissed: true });
    expect(storage.items.get(COCKPIT_FOLDS_KEY)).toBe(
      '{"rail":true,"goal":false,"panel":true,"legend":false,"whatIf":true,"roadAhead":false,"overlays":{"skills":true,"money":true,"rules":false},"coachDismissed":true}',
    );
    expect(readMemory()).toEqual({ folds, overlays: { skills: true, money: true, rules: false }, coachDismissed: true });
  });

  it("a browser that refuses storage gets the first visit, and a fold that still works without throwing", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw new Error("storage switched off");
      },
      setItem: () => {
        throw new Error("storage switched off");
      },
    });
    expect(readMemory()).toEqual(FIRST_VISIT_MEMORY);
    expect(() => writeMemory({ folds: ALL_FOLDED, overlays: null, coachDismissed: true })).not.toThrow();
  });

  it("with no browser at all (the server's first drawing), it is the first visit", () => {
    vi.stubGlobal("localStorage", undefined);
    expect(readMemory()).toEqual(FIRST_VISIT_MEMORY);
    expect(() => writeMemory(FIRST_VISIT_MEMORY)).not.toThrow();
  });

  it("says when all six are folded, for the header's button", () => {
    expect(allFolded(ALL_FOLDED)).toBe(true);
    expect(allFolded(ALL_OPEN)).toBe(false);
    expect(allFolded(FIRST_VISIT)).toBe(false);
    expect(allFolded({ ...ALL_FOLDED, legend: false })).toBe(false);
    expect(allFolded({ ...ALL_FOLDED, whatIf: false })).toBe(false);
    expect(allFolded({ ...ALL_FOLDED, roadAhead: false })).toBe(false);
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
    expect(words.whatIf).toEqual({ fold: "Fold the what-if bar", show: "Show the what-if bar" });
    expect(words.all).toEqual({ fold: "Fold all panels", show: "Show all panels" });
    expect(words.roadAhead.fold).toBe("Fold the road ahead");
    expect(words.roadAhead.show).toBe("Show the road ahead");
    expect(words.roadAhead.title(6)).toBe("The road ahead · 6 steps");
    expect(words.roadAhead.title(1)).toBe("The road ahead · 1 step");
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
  const draw = (cockpit?: {
    legendFolded: boolean;
    onToggleLegend: () => void;
    roadAhead?: { folded: boolean; onShow: () => void; openColumns: number };
  }) =>
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

  it("folded: the whole legend stays on the page, hidden, not removed; it is shown from the goal bar's Look closer menu", () => {
    const html = draw({ legendFolded: true, onToggleLegend: () => {} });
    // Its fold button is inside the hidden legend, not drawn.
    expect(html).not.toContain(`>${words.legend.show}<`);
    expect(html).toMatch(/<footer data-region="legend"[^>]*hidden=""[^>]*>.*applies as answered/);
  });

  it("the road ahead (2026-10-17): folded, the later columns stay on the page, hidden, behind one column that shows them", () => {
    const html = draw({ legendFolded: false, onToggleLegend: () => {}, roadAhead: { folded: true, onShow: () => {}, openColumns: 2 } });
    const ids = roadAheadColumnIds(generalRoadV2026, 2);
    expect(ids.length).toBe(generalRoadV2026.columns.length - 2);
    for (const id of ids) expect(html).toMatch(new RegExp(`<section id="${id}" hidden=""`));
    const later = generalRoadV2026.columns.slice(2);
    const steps = later.reduce((n, column) => n + column.steps.length, 0);
    expect(html).toContain(words.roadAhead.title(steps));
    expect(html).toContain(words.roadAhead.columns(later.map((column) => column.label)));
    expect(html).toContain(`aria-label="${escapeAttribute(words.roadAhead.showNamed(later.map((column) => column.label), steps))}"`);
    expect(html).toContain(`aria-controls="${ids.join(" ")}"`);
    expect(html).toContain('data-fold-control="roadAhead"');
    // Open, every column shows and the folded column is gone.
    const open = draw({ legendFolded: false, onToggleLegend: () => {}, roadAhead: { folded: false, onShow: () => {}, openColumns: 2 } });
    expect(open).not.toContain(words.roadAhead.title(steps));
    for (const id of ids) expect(open).toContain(`<section id="${id}" class=`);
  });

  it("drawn without the cockpit, the legend has no fold button and the road's area no region (the map's HTML is unchanged)", () => {
    const html = draw();
    expect(html).not.toContain(words.legend.fold);
    expect(html).not.toContain(`aria-label="${words.roadRegion}"`);
  });
});

describe("the what-if bar folds, with This visit, to one line (2026-10-13)", () => {
  const noop = () => undefined;
  const draw = (whatIf: number | null, fold?: { folded: boolean; onToggle: () => void }) =>
    renderToStaticMarkup(
      createElement(WhatIfBar, {
        whatIf,
        receipt: null,
        sinceLastTime: ["A receipt line (invented)."],
        onTry: noop,
        onKeep: noop,
        onClear: noop,
        ...(fold ? { fold } : {}),
      }),
    );

  it("open: a button to fold it, naming the bar and This visit, and nothing hidden", () => {
    const html = draw(null, { folded: false, onToggle: noop });
    expect(html).toContain(`>${words.whatIf.fold}<`);
    expect(html).toContain('aria-expanded="true"');
    expect(html).toContain(`aria-controls="${WHAT_IF_BAR_ID} ${THIS_VISIT_ID}"`);
    expect(html).toContain('data-fold-control="whatIf"');
    expect(html).not.toContain('hidden=""');
  });

  it("folded: the whole bar, the Try box and This visit stay on the page, hidden; it is shown from the goal bar's Look closer menu", () => {
    const html = draw(null, { folded: true, onToggle: noop });
    // Its fold button is inside the hidden bar, not drawn.
    expect(html).not.toContain(`>${words.whatIf.show}<`);
    expect(html).toMatch(new RegExp(`<section data-region="what-if"[^>]*hidden=""[^>]*>.*<div id="${WHAT_IF_BAR_ID}"[^>]*>.*Try first-year sales of \\$`));
    expect(html).toMatch(new RegExp(`<section id="${THIS_VISIT_ID}" hidden=""[^>]*>.*A receipt line \\(invented\\)\\.`));
  });

  it("folded while a what-if is on, the road's foot line still says it is a what-if, and its number, with nothing to press", () => {
    const note = renderToStaticMarkup(createElement(WhatIfOnNote, { whatIf: 45_000 }));
    expect(note).toContain(cockpitWords.whatIf.banner);
    expect(note).toContain(cockpitWords.whatIf.on(45_000));
    expect(note).not.toContain("<button");
    // Open, the banner is said once, in the bar itself.
    const open = draw(45_000, { folded: false, onToggle: noop });
    expect(open.split(cockpitWords.whatIf.banner).length - 1).toBe(1);
  });

  it("drawn without a fold (as other tests draw it), it has no fold button", () => {
    const html = draw(null);
    expect(html).not.toContain(words.whatIf.fold);
    expect(html).not.toContain(words.whatIf.show);
    expect(html).toContain("Try first-year sales of $");
  });
});

describe("every overlay switch is drawn, on or off (a review of the calm first view, 2026-10-17)", () => {
  const counts = { skillsListed: 3, costLines: 4, rulesCards: 2 };
  const draw = (overlays: { skills: boolean; money: boolean; rules: boolean }) =>
    renderToStaticMarkup(createElement(OverlaySwitches, { overlays, counts, onToggle: () => {} }));

  it("a first visit: Skills on, Money and Rules & tax off, all three switches drawn, so each layer is one click away", () => {
    const html = draw(FIRST_OVERLAYS);
    const pressed = (label: string) => new RegExp(`aria-pressed="(true|false)"[^>]*>${label}<`).exec(html)?.[1];
    expect(pressed(cockpitWords.road.skills)).toBe("true");
    expect(pressed(cockpitWords.road.money)).toBe("false");
    expect(pressed(escapeAttribute(cockpitWords.road.rules))).toBe("false");
    // No button folds or shows them.
    expect(html).not.toContain("Show more layers");
    expect(html).not.toContain("data-fold-control");
  });

  it("switching layers on or off never takes a switch off the page", () => {
    for (const overlays of [
      { skills: false, money: false, rules: false },
      { skills: true, money: true, rules: true },
      { skills: false, money: true, rules: false },
    ]) {
      const html = draw(overlays);
      expect(html.match(/aria-pressed=/g)?.length, JSON.stringify(overlays)).toBe(3);
    }
  });

  it("a layer with nothing on this road is drawn off, can't be pressed, and its count says why", () => {
    const html = renderToStaticMarkup(
      createElement(OverlaySwitches, {
        overlays: { skills: true, money: false, rules: true },
        counts: { skillsListed: 3, costLines: 4, rulesCards: 0 },
        onToggle: () => {},
      }),
    );
    const rules = new RegExp(`<button[^>]*>${escapeAttribute(cockpitWords.road.rules)}<`).exec(html)?.[0] ?? "";
    expect(rules).toContain('aria-pressed="false"');
    expect(rules).toContain('disabled=""');
    expect(html).toContain(cockpitWords.road.rulesCount(0));
    // The others still switch.
    expect(html.match(/disabled=""/g)?.length).toBe(1);
  });
});

describe("the goal bar's Look closer menu (the calm first view, 2026-10-17)", () => {
  const draw = (opts: {
    onCompare?: () => void;
    onLandscape?: () => void;
    toShow?: readonly LookCloserItem[];
    folded?: boolean;
    onToggleFold?: () => void;
  }) =>
    renderToStaticMarkup(
      createElement(GoalBar, {
        road: roadToEvaluate(),
        evaluation: evaluateRoad(input()),
        scenario: inventedIdea(),
        firstWords: null,
        target: null,
        active: null,
        onGauge: () => {},
        ...opts,
      }),
    );

  it("is one menu button, closed at first, in place of a button for each thing it opens", () => {
    const html = draw({ onCompare: () => {}, onLandscape: () => {} });
    expect(html).toContain('aria-haspopup="menu"');
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain(cockpitWords.goal.lookCloser);
    // Closed, the items aren't drawn: one control, not two.
    expect(html).not.toContain('role="menu"');
    expect(html).not.toContain(`>${cockpitWords.compare.region}<`);
    expect(html).not.toContain(`>${cockpitWords.compare.open}<`);
  });

  it("isn't drawn when there is nothing to look closer at", () => {
    expect(draw({})).not.toContain(cockpitWords.goal.lookCloser);
  });

  it("the bar is still a region of its own for the clutter limit, as the layout rule defines one (a review, 2026-10-17)", () => {
    const html = draw({ onLandscape: () => {} });
    expect(html.match(/data-region="/g)?.length).toBe(1);
    expect(html).toContain('data-region="goal-bar"');
  });

  // The maintainer's pick (2026-10-20): the folded legend's and what-if bar's buttons moved here from the end of
  // Next on your road, two controls fewer on the first view, so the screens stay within their clutter limits.
  const toShow: LookCloserItem[] = [
    { id: "legend", label: words.legend.show, controls: LEGEND_ID, shows: "legend", onSelect: () => {} },
    { id: "what-if", label: words.whatIf.show, controls: `${WHAT_IF_BAR_ID} ${THIS_VISIT_ID}`, shows: "whatIf", onSelect: () => {} },
  ];

  it("also shows the folded legend and what-if bar (2026-10-20), and its button marks both regions so focus can come back to it", () => {
    const html = draw({ onLandscape: () => {}, toShow });
    // Still one control while closed: the items aren't drawn.
    expect(html.match(/aria-haspopup="menu"/g)?.length).toBe(1);
    expect(html).not.toContain(`>${words.legend.show}<`);
    expect(html).not.toContain(`>${words.whatIf.show}<`);
    // Folding either again from its own button finds the menu (components/cockpit/folding.tsx, `~=`).
    expect(html).toContain('data-fold-control="legend whatIf"');
    // With nothing folded under the map, the menu marks no region.
    expect(draw({ onLandscape: () => {} })).not.toContain("data-fold-control");
  });

  it("is drawn for them even with no panel item to list", () => {
    expect(draw({ toShow })).toContain(cockpitWords.goal.lookCloser);
    expect(renderToStaticMarkup(createElement(LookCloserMenu, { items: toShow }))).toContain('aria-haspopup="menu"');
  });

  it("is in the folded goal bar's one line too, so the legend and the what-if bar are never more than the menu away", () => {
    const html = draw({ onLandscape: () => {}, toShow, folded: true, onToggleFold: () => {} });
    const line = html.split(/<div[^>]*hidden=""/)[0]!;
    expect(line).toContain(cockpitWords.goal.lookCloser);
    expect(line).toContain('data-fold-control="legend whatIf"');
    expect(line).toContain(`>${words.goal.show}<`);
  });
});
