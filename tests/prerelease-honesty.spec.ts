/**
 * The pre-release honesty and privacy fixes (2026-10-23; found by the screen review of 30f,
 * C:/dotami-wt/review-30f-gaps.txt): each check has a planted control, so it is shown to fail on what it
 * is there to catch.
 *
 * 1. Nothing about the person in window storage (2026-10-24, the maintainer's rule): no code reads or writes
 *    the journey there, a page removes what an older DotAmi left without reading it, and Delete reaches what
 *    the window holds in memory (lib/journey/held-journey.ts, lib/journey/window-storage.ts). Every line that
 *    says where an unsaved answer is names each way a page is loaded afresh, the desktop app's Go menu included.
 * 2. The map never shows a stage as done, or as where the person is, unless the person marked it, and the
 *    readout API gives agents the same (2026-10-24); the ideas card never shows a kind of venture nobody gave,
 *    and draws its own words in its place as written.
 * 3. Time words the no-times check missed ("first years", "time-boxed", the latter also in two item rows written
 *    in their components and in a catalog's citation note), every catalog's Lens lines, the text every component
 *    writes itself, and a tool check's quotes drawn only inside the official-quote component (2026-10-24: the
 *    review of #210).
 * 4. The front door's chips are in the words file, and none promises anything about the person's taxes.
 * 5. The front door offers Your futures and Open cockpit only once an idea is saved, and, with none saved,
 *    Your expenses while the Expenses page has a record to list (2026-10-24).
 * 6. The screen specs and the design docs that describe these screens say what they now draw and hold
 *    (CLAUDE.md: "Change the control, change the file, same commit"; 2026-10-24).
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";
import { afterEach, describe, expect, it } from "vitest";

import { StrategyMap } from "@/components/cockpit/strategy-map";
import { FrontDoorNav } from "@/components/discovery/landing-page";
import { PageQuotes } from "@/components/shared/page-quotes";
import { VentureFacts } from "@/components/ventures/ventures-page";
import { cockpitWords } from "@/lib/cockpit/words";
import { cfeCatalogV2026 } from "@/lib/engines/cfe/v2026";
import { complianceCatalogV2026 } from "@/lib/engines/compliance/v2026";
import { grantsCatalogV2026 } from "@/lib/engines/grants/v2026";
import { generalRoadV2026, roadsV2026, skillItemsV2026, type Road } from "@/lib/engines/roads/v2026";
import { PAGE_QUOTES_LEAD, toolCheckQuotes } from "@/lib/engines/shared/citation-check";
import { structureCatalogV2026 } from "@/lib/engines/structure/v2026";
import { writeOffsCatalogV2026 } from "@/lib/engines/writeoffs/v2026";
import type { DestinationDraft } from "@/lib/front-door/draft";
import { LISTED_EXPENSE, listExpenses } from "@/lib/expenses/store";
import { hasListedExpenses, hasSavedIdea } from "@/lib/front-door/saved-idea";
import { scenarioForPickedFuture } from "@/lib/front-door/start-future";
import { destinationWords, frontDoorWords } from "@/lib/front-door/words";
import { heldJourney, holdJourney } from "@/lib/journey/held-journey";
import { applyIntentToDraft } from "@/lib/journey/intent";
import { parseIntentFallback } from "@/lib/journey/intent-fallback";
import { defaultIntakeDraft, type IntakeDraft, type JourneyState } from "@/lib/journey/types";
import {
  destinationAfterDelete,
  intakeAfterDelete,
  removeRetiredWindowStorage,
  RETIRED_EMPLOYMENT_SUGGESTIONS_KEY,
  RETIRED_JOURNEY_KEY,
  RETIRED_UNSAVED_STATEMENTS_KEY,
} from "@/lib/journey/window-storage";
import { statementWords } from "@/lib/person/words";
import type { PlaceCode } from "@/lib/places/codes";
import type { StepStatus } from "@/lib/futures/types";
import { readoutNodes, readoutScenario, stepMarks } from "@/lib/readout/nodes";
import { evaluateRoad } from "@/lib/roads";
import { evaluateScenario } from "@/lib/scenarios/evaluate-scenario";
import { getScenarioNodeStatus } from "@/lib/scenarios/graph";
import { venturesWords } from "@/lib/ventures/words";

import { COMPONENT_TIME_WORDS } from "./fixtures/ideas/known-gaps";
import { ownWords } from "./helpers/own-words";
import { input } from "./helpers/road-to-evaluate";
import { simplify } from "./helpers/source-scan";
import { findTimeWords, TIME_PATTERNS } from "./helpers/time-words";

// ---------------------------------------------------------------------------------------------------------
// 1. Nothing about the person in window storage
// ---------------------------------------------------------------------------------------------------------

/** Every answer Your destination can hold, invented. */
const ANSWERS: DestinationDraft = {
  destination: { kept: "saved", text: "A small shop of my own (invented for this test)", saidAt: "2026-10-23" },
  lookingFor: "business",
  place: "CA-ON" as PlaceCode,
  incomeWanted: { kind: "agreed", amountCents: 6_543_200, agreedOn: "2026-10-23" },
};

/** The keys an older DotAmi wrote with the person's own words or answers in them, as it wrote them. */
const RETIRED_KEYS = ["dotami-journey-v3", "dotami-person-unsaved", "dotami-employment-suggestions"];

const journeyWith = (destination: DestinationDraft | undefined): JourneyState => ({
  intake: { ...defaultIntakeDraft(), name: "Invented idea", destination },
  scenario: null,
});

/** An intake the front door's sentence went into, with Your destination's answers: what Delete is checked on. */
const typedIntake = (): IntakeDraft => ({
  ...applyIntentToDraft(
    { ...defaultIntakeDraft(), name: "Invented idea", destination: ANSWERS },
    parseIntentFallback("A sign shop in Calgary (invented for this test)"),
    "A sign shop in Calgary (invented for this test)",
    "2026-10-23",
  ),
  goals: ["write-offs"],
});

/**
 * Which of Your destination's answers a window-storage text holds, by what each answer looks like when it is
 * written down: the words, the place code, the business-or-career pick under its own name, the income in
 * cents, or the draft's own key. Empty = none.
 */
function destinationAnswersIn(stored: string, answers: DestinationDraft = ANSWERS): string[] {
  const found: string[] = [];
  if (answers.destination && "text" in answers.destination && stored.includes(answers.destination.text)) found.push("your words");
  if (answers.place && stored.includes(`"${answers.place}"`)) found.push("your place");
  if (stored.includes('"lookingFor"')) found.push("business, career or both");
  if (answers.incomeWanted?.kind === "agreed" && stored.includes(String(answers.incomeWanted.amountCents))) found.push("your income");
  if (stored.includes('"destination"')) found.push("the destination draft");
  return found;
}

/**
 * A window with both stores, as a browser has them. Reading either throws: what an older DotAmi left is removed
 * without being read, so a read here is a failure of its own.
 */
function fakeWindow(refuse: { removeFromSession?: boolean } = {}) {
  const g = globalThis as unknown as Record<string, unknown>;
  g.window = globalThis;
  const store = (map: Map<string, string>, refuseRemove = false) => ({
    getItem: (key: string): string | null => {
      throw new Error(`read ${key}`);
    },
    setItem: (key: string, value: string) => void map.set(key, String(value)),
    removeItem: (key: string) => {
      // A browser can refuse its storage (blocked site data); the other store must still be cleared.
      if (refuseRemove) throw new Error("refused");
      map.delete(key);
    },
  });
  const session = new Map<string, string>();
  const local = new Map<string, string>();
  g.sessionStorage = store(session, refuse.removeFromSession);
  g.localStorage = store(local);
  return { session, local };
}

const storedText = (store: Map<string, string>) => [...store.values()].join("\n");

/** Every way a page is loaded afresh, which empties the window's memory (lib/journey/held-journey.ts). */
const FRESH_LOADS = ["a reload", "a new window", "Go menu"];

/** Which of these words a line doesn't say, a capital at the start of a sentence aside. Empty = it names them all. */
const waysMissing = (line: string, ways: readonly string[]) => ways.filter((way) => !line.toLowerCase().includes(way.toLowerCase()));

describe("1. Nothing about the person in window storage", () => {
  afterEach(() => {
    const g = globalThis as unknown as Record<string, unknown>;
    delete g.window;
    delete g.sessionStorage;
    delete g.localStorage;
  });

  it("no code reads or writes the journey, or any key an older DotAmi wrote about the person, in window storage", () => {
    expect(retiredKeyUsesIn(sourceFiles(["components", "lib", "app"]))).toEqual([]);
  });

  it("planted control: a read or a write of one, by its constant or written out, is caught by the same scan; a removal isn't one", () => {
    const planted = retiredKeyUsesIn([
      {
        file: "planted.tsx",
        text: 'export const RETIRED_JOURNEY_KEY = "dotami-journey-v3";\nsessionStorage.setItem(RETIRED_JOURNEY_KEY, JSON.stringify(state));',
      },
      { file: "planted-read.tsx", text: 'const raw = localStorage.getItem("dotami-employment-suggestions");' },
      { file: "planted-remove.tsx", text: 'sessionStorage.removeItem("dotami-person-unsaved"); // a page clearing it' },
    ]);
    expect(planted).toEqual([
      "planted-read.tsx: localStorage.getItem(dotami-employment-suggestions)",
      "planted.tsx: sessionStorage.setItem(dotami-journey-v3)",
    ]);
  });

  it("the code's names for the retired keys are the keys an older DotAmi wrote", () => {
    expect([RETIRED_JOURNEY_KEY, RETIRED_UNSAVED_STATEMENTS_KEY, RETIRED_EMPLOYMENT_SUGGESTIONS_KEY]).toEqual(RETIRED_KEYS);
  });

  it("the journey is held in the window's memory: held, it is given back; without a window (the server) nothing is held or given", () => {
    const first = journeyWith(ANSWERS);
    // On the server one module serves every request: nothing is held there.
    holdJourney(first);
    fakeWindow();
    expect(heldJourney()).toBeUndefined();
    const second = journeyWith(undefined);
    holdJourney(second);
    expect(heldJourney()).toBe(second);
    delete (globalThis as unknown as Record<string, unknown>).window;
    expect(heldJourney()).toBeUndefined();
  });

  it("a page removes what an older DotAmi left, without reading it, and leaves how the cockpit was left alone", () => {
    const { session, local } = fakeWindow();
    session.set("dotami-journey-v3", JSON.stringify(journeyWith(ANSWERS)));
    session.set("dotami-person-unsaved", JSON.stringify([{ text: "Invented statement" }]));
    local.set("dotami-employment-suggestions", JSON.stringify(["Invented trade"]));
    local.set("dotami-cockpit-folds", JSON.stringify({ rail: true }));
    // Planted control: what was left there held the person's answers.
    expect(destinationAnswersIn(storedText(session))).toEqual([
      "your words",
      "your place",
      "business, career or both",
      "your income",
      "the destination draft",
    ]);
    removeRetiredWindowStorage();
    expect([...session.keys()]).toEqual([]);
    expect([...local.keys()]).toEqual(["dotami-cockpit-folds"]);
  });

  it("a store the browser refuses doesn't stop the other from being cleared, and without a window nothing is touched", () => {
    const { session, local } = fakeWindow({ removeFromSession: true });
    session.set("dotami-journey-v3", "{}");
    local.set("dotami-employment-suggestions", "[]");
    expect(() => removeRetiredWindowStorage()).not.toThrow();
    expect([...local.keys()]).toEqual([]);
    delete (globalThis as unknown as Record<string, unknown>).window;
    expect(() => removeRetiredWindowStorage()).not.toThrow();
  });

  it("Delete takes from the window's memory what it takes from the data file: the sentence and the destination words with the statements", () => {
    const held = typedIntake();
    // What the sentence put there, so the check below is checking something.
    expect(held.manualEntry).toBeTruthy();
    expect(held.description).toBe(held.manualEntry);
    expect(held.intentParse?.rawLabel).toBeTruthy();
    const after = intakeAfterDelete(held, ["statements"]);
    expect(after.manualEntry).toBeUndefined();
    expect(after.manualEntrySaidAt).toBeUndefined();
    expect(after.description).toBe("");
    expect(after.intentParse).toBeNull();
    expect(after.destination).toEqual({ lookingFor: "business", place: "CA-ON", incomeWanted: ANSWERS.incomeWanted });
    // What was confirmed for the idea stays: those go with "Your ideas".
    expect(after.goals).toEqual(held.goals);
    expect(after.activityTags).toEqual(held.activityTags);
    expect(after.name).toBe("Invented idea");
    // None of the sentence's words is left anywhere in what the window holds.
    expect(JSON.stringify(after)).not.toMatch(/sign shop/i);
  });

  it("Delete: the income with the income, both with both, everything with the ideas; anything else leaves the memory as it was", () => {
    const held = typedIntake();
    const income = intakeAfterDelete(held, ["income-wanted"]);
    expect(income.manualEntry).toBe(held.manualEntry);
    expect(income.destination).toEqual({ destination: ANSWERS.destination, lookingFor: "business", place: "CA-ON" });
    const both = intakeAfterDelete(held, ["statements", "income-wanted"]);
    expect(both.manualEntry).toBeUndefined();
    expect(both.destination).toEqual({ lookingFor: "business", place: "CA-ON" });
    expect(intakeAfterDelete(held, ["ideas", "expenses"])).toEqual(defaultIntakeDraft());
    // Planted control: a Delete of something else leaves what the window holds as it was.
    expect(intakeAfterDelete(held, ["expenses", "skill-marks"])).toEqual(held);
  });

  it("every line that says where an unsaved answer is names each way a page is loaded afresh, the desktop Go menu tied to its loadURL", () => {
    // The desktop app's Go menu (Home, Your futures, Settings) opens its pages with loadURL: a fresh load, which
    // empties the window's memory as a reload does. A change to buildMenu's helper fails this on purpose.
    const main = readFileSync("desktop/main.mjs", "utf8");
    expect(main).toMatch(/const go = \(pathname\) => \(\) => win\?\.loadURL\(/);
    expect(main).toMatch(/label: "Go",\s*submenu: \[\s*\{ label: "Home", click: go\("\/"\) \}/);
    expect(waysMissing(destinationWords.keptWithEachFuture, FRESH_LOADS)).toEqual([]);
    expect(waysMissing(destinationWords.receipts.destinationTabOnly, FRESH_LOADS)).toEqual([]);
    // The cockpit's unsaved answer is in this window only; a new window opens the idea as the data file holds it.
    expect(waysMissing(cockpitWords.receipts.notSaved, ["only this window holds", "a reload", "Go menu"])).toEqual([]);
    expect(waysMissing(cockpitWords.rail.save.unavailable, ["only this window holds", "a reload", "Go menu"])).toEqual([]);
    // Planted control: the line as it stood on 2026-10-23 is caught: it left out the Go menu.
    expect(waysMissing("Kept with the future you pick. Until then only this page holds it: a reload or a new window asks it again.", FRESH_LOADS)).toEqual(["Go menu"]);
  });

  it("none of those lines says the tab keeps an answer, or holds a time; the income's says only the box holds it", () => {
    const lines = [
      destinationWords.keptWithEachFuture,
      destinationWords.receipts.destinationTabOnly,
      destinationWords.receipts.incomeNotKept,
      cockpitWords.receipts.notSaved,
      cockpitWords.rail.save.unavailable,
    ];
    // "the tab" kept them in its storage until 2026-10-24; nothing about the person is kept there now.
    const sayTheTabKeepsIt = (all: readonly string[]) => all.filter((line) => /\btab\b/i.test(line));
    expect(sayTheTabKeepsIt(lines)).toEqual([]);
    expect(lines.flatMap((line) => findTimeWords(line))).toEqual([]);
    // The line under 2 and 3 no longer says "Until then": /start reads neither answer back after a pick.
    expect(destinationWords.keptWithEachFuture).not.toMatch(/until then/i);
    // Nothing of the income is held anywhere when its proposal fails: its line names no way of losing it.
    expect(destinationWords.receipts.incomeNotKept).not.toMatch(/reload|window|Go menu/i);
    // Planted control: the cockpit's save line as it stood on 2026-10-23 is caught by the same check.
    const old = "Save unavailable — kept in this tab. Save now retries.";
    expect(sayTheTabKeepsIt([...lines, old])).toEqual([old]);
  });

  it("destinationAfterDelete: words with the statements, income with the income, all with the ideas", () => {
    expect(destinationAfterDelete(ANSWERS, ["statements"])).toEqual({
      lookingFor: "business",
      place: "CA-ON",
      incomeWanted: ANSWERS.incomeWanted,
    });
    expect(destinationAfterDelete(ANSWERS, ["income-wanted"])).toEqual({
      destination: ANSWERS.destination,
      lookingFor: "business",
      place: "CA-ON",
    });
    expect(destinationAfterDelete(ANSWERS, ["ideas"])).toBeUndefined();
    expect(destinationAfterDelete({ destination: ANSWERS.destination }, ["statements"])).toBeUndefined();
    // Planted control: a Delete of something else leaves them as they were.
    expect(destinationAfterDelete(ANSWERS, ["expenses"])).toEqual(ANSWERS);
  });
});

/** The repo's own source files under these folders, as text. */
function sourceFiles(dirs: readonly string[]): { file: string; text: string }[] {
  const out: { file: string; text: string }[] = [];
  const walk = (dir: string) => {
    // The directory listing's own entry types: no separate stat of a path before it is read.
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (entry.isFile() && /\.(ts|tsx)$/.test(entry.name)) out.push({ file: path.replace(/\\/g, "/"), text: readFileSync(path, "utf8") });
    }
  };
  for (const dir of dirs) walk(dir);
  return out;
}

/**
 * Every read or write (getItem, setItem) of a retired key, by the key written out or by a string constant the
 * files declare for it. Comments don't count (a sentence about the old key is not a use of it); a removal isn't
 * a read or a write.
 */
function retiredKeyUsesIn(files: readonly { file: string; text: string }[]): string[] {
  const code = files.map(({ file, text }) => ({ file, code: simplify(text, true) }));
  const constants = new Map<string, string>();
  for (const { code: c } of code) {
    for (const m of c.matchAll(/\bconst\s+([A-Za-z_$][\w$]*)\s*=\s*(["'])([^"'\n]*)\2/g)) constants.set(m[1]!, m[3]!);
  }
  const found: string[] = [];
  for (const { file, code: c } of code) {
    for (const m of c.matchAll(/\b(localStorage|sessionStorage)\s*\.\s*(getItem|setItem)\s*\(\s*([^,)]*)/g)) {
      const arg = m[3]!.trim();
      const key = arg.match(/^(["'`])([^"'`$]*)\1$/)?.[2] ?? constants.get(arg);
      if (key !== undefined && RETIRED_KEYS.includes(key)) found.push(`${file}: ${m[1]}.${m[2]}(${key})`);
    }
  }
  return found.sort();
}

// ---------------------------------------------------------------------------------------------------------
// 2. Nothing derived: no status the person didn't give
// ---------------------------------------------------------------------------------------------------------

/** The person's own status words, as the map draws them: only a mark of theirs may put one on a card. */
const STATUS_WORDS = [
  cockpitWords.road.statusChip.doing,
  cockpitWords.road.statusChip.done,
  cockpitWords.road.statusChip["not-for-me"],
  // The words the map's own chips used for the same two stages until 2026-10-23.
  "now",
];

/** Each card's name and chip, as drawn. */
function cardChips(html: string): { label: string; chip: string }[] {
  return [...html.matchAll(/<h4[^>]*>([^<]+)<\/h4><span class="shrink-0 rounded-sm[^"]*">([^<]+)<\/span>/g)].map((m) => ({
    label: m[1]!,
    chip: m[2]!,
  }));
}

/** The cards whose chip says a status of the person's though the person marked nothing there. */
function statusNotGiven(html: string, marked: ReadonlySet<string>): string[] {
  return cardChips(html)
    .filter((c) => STATUS_WORDS.includes(c.chip) && !marked.has(c.label))
    .map((c) => `${c.label}: ${c.chip}`);
}

function drawPickedFuture(road: Road, place: string, progress: { stepId: string; status: StepStatus }[] = []) {
  const scenario = scenarioForPickedFuture({ road, place: place as PlaceCode, name: "" }, "picked-future-test");
  const result = evaluateRoad(
    input({ road, skillItems: skillItemsV2026, scenario, progress: progress.map((p) => ({ ...p, doneWhenIds: [] })) }),
  );
  return renderToStaticMarkup(
    createElement(StrategyMap, {
      road,
      scenario,
      evaluation: result.rules,
      selectedStepId: null,
      onSelectStep: () => {},
      onBranchChange: () => {},
      overlays: { skills: true, money: true, rules: true },
      stepEvaluations: new Map(result.steps.map((s) => [s.stepId, s])),
      linkedSkillId: null,
    }),
  );
}

/**
 * What the readout API must never give (2026-10-24, the maintainer's decision 3 on PR #210): a node's
 * `status`, the map's list name, which said `complete` of the employee baseline and `active` of Sole Prop
 * activation on every idea, and the two lists in `scenario.state` that said the same. Any `status` key at all
 * is caught, not only those two values; the person's own mark is `yourStatus`, which this doesn't match.
 */
const READOUT_NOT_GIVEN = [/"status":"[^"]*"/g, /"completedNodeIds"/g, /"activeNodeIds"/g];
const notGivenIn = (json: string): string[] => READOUT_NOT_GIVEN.flatMap((re) => [...json.matchAll(re)].map((m) => m[0]));

const BASELINE = "stage-0-employee-apprentice-baseline";
const SOLE_PROP = "stage-1-sole-prop-activation";

describe("2. The map shows a status only where the person gave one", () => {
  const cases: [string, string][] = roadsV2026.map((road) => [road.id, road.provinces.includes("AB") ? "CA-AB" : "CA-ON"]);
  const roadOf = (id: string): Road => roadsV2026.find((r) => r.id === id)!;

  it.each(cases)("a future picked and never touched, on %s: no card says done or now", (roadId, place) => {
    const road = roadOf(roadId);
    const html = drawPickedFuture(road, place);
    expect(cardChips(html).length).toBeGreaterThan(0);
    expect(statusNotGiven(html, new Set())).toEqual([]);
  });

  it("the person's own Done is drawn, and only on the step they marked", () => {
    const step = generalRoadV2026.steps.find((s) => s.id === "stage-0-employee-apprentice-baseline")!;
    const html = drawPickedFuture(generalRoadV2026, "CA-AB", [{ stepId: step.id, status: "done" }]);
    expect(cardChips(html)).toContainEqual({ label: step.label, chip: cockpitWords.road.statusChip.done });
    expect(statusNotGiven(html, new Set([step.label]))).toEqual([]);
    // Planted control: the same drawing, read as if the person had marked nothing, is caught.
    expect(statusNotGiven(html, new Set())).toEqual([`${step.label}: ${cockpitWords.road.statusChip.done}`]);
  });

  it("planted control: the map as recorded before 2026-10-23 is caught (baseline done, Sole Prop activation now)", () => {
    const recorded = readFileSync(new URL("./fixtures/strategy-map/golden-ab-hire-first.html", import.meta.url), "utf8");
    expect(statusNotGiven(recorded, new Set())).toContain("Sole Prop activation: now");
  });

  it("the legend says the chip is where the stage sits on the map, and that the status words are the person's own", () => {
    expect(cockpitWords.map.legend.chip).toBe("Stage chip = where it sits on the map; doing, done or not for me only when you mark it");
    expect(cockpitWords.map.chips).not.toHaveProperty("now");
    expect(cockpitWords.map.chips).not.toHaveProperty("done");
  });

  it("the readout gives where a stage sits and the person's own mark, never a status they didn't give", () => {
    const scenario = scenarioForPickedFuture({ road: generalRoadV2026, place: "CA-AB", name: "" }, "readout-test");
    const evaluation = evaluateScenario(scenario, { today: "2026-10-24" });
    const nodes = readoutNodes(scenario, evaluation, new Map());
    const node = (list: typeof nodes, id: string) => list.find((n) => n.id === id);
    expect(nodes.map((n) => n.id)).toEqual(cfeCatalogV2026.nodes.map((n) => n.id));
    expect(node(nodes, BASELINE)).toMatchObject({ chip: "starting-point", yourStatus: null });
    expect(node(nodes, SOLE_PROP)).toMatchObject({ chip: "first-stage", yourStatus: null });
    const given = readoutScenario(scenario);
    expect(notGivenIn(JSON.stringify({ nodes, scenario: given }))).toEqual([]);
    // The picks stay, and the idea itself is left as it was (the map still reads its lists).
    expect(given.state.activeBranches).toEqual(scenario.state.activeBranches);
    expect(scenario.state.completedNodeIds).toContain(BASELINE);

    // The person's own Done is given on the step they marked; a status taken back is none.
    const marks = stepMarks([
      { roadId: generalRoadV2026.id, stepId: BASELINE, status: "done", doneWhenIds: [], changes: [], updatedAt: "" },
      { roadId: generalRoadV2026.id, stepId: SOLE_PROP, status: null, doneWhenIds: [], changes: [], updatedAt: "" },
    ]);
    const marked = readoutNodes(scenario, evaluation, marks);
    expect(node(marked, BASELINE)).toMatchObject({ chip: "starting-point", yourStatus: "done" });
    expect(marked.filter((n) => n.yourStatus !== null).map((n) => n.id)).toEqual([BASELINE]);

    // Planted control: the readout as it was until 2026-10-24 (each node's `status`, the idea with its lists).
    const before = { nodes: nodes.map(({ yourStatus: _mark, ...n }) => ({ ...n, status: getScenarioNodeStatus(n.id, scenario) })), scenario };
    expect(notGivenIn(JSON.stringify(before))).toEqual(
      expect.arrayContaining(['"status":"complete"', '"status":"active"', '"completedNodeIds"', '"activeNodeIds"']),
    );
  });

  it("the readout's own comment says truly whose marks reach it: every road that keeps road 0's stage ids", () => {
    // The readout draws today's map for every idea, and the marks it gives are those on the idea's own road
    // (lib/futures/step-progress.ts listStepProgress), matched by step id. So a road whose steps keep road 0's
    // stage ids has its marks given; any other road's idea reads null on every stage.
    const stageIds = new Set(cfeCatalogV2026.nodes.map((n) => n.id));
    const keeping = roadsV2026.filter((road) => road.steps.some((step) => stageIds.has(step.id))).map((road) => road.id);
    expect(keeping).toContain(generalRoadV2026.id);
    expect(keeping.length).toBeLessThan(roadsV2026.length);
    const source = readFileSync("lib/readout/nodes.ts", "utf8");
    for (const id of keeping.filter((id) => id !== generalRoadV2026.id)) expect(source, `name ${id} in lib/readout/nodes.ts`).toContain(id);
  });

  it("the readout route gives its stages and its idea through those two functions", () => {
    const route = readFileSync("app/api/readout/route.ts", "utf8");
    expect(route).toMatch(/\breadoutNodes\(/);
    expect(route).toContain("scenario: readoutScenario(scenario)");
    expect(route).not.toMatch(/\bgetScenarioNodeStatus\b/);
  });

  it("the ideas card says the type was not said when nobody gave one", async () => {
    const { listVentures } = await import("@/lib/db/ventures");
    const row = (type: string, notSaid: string[]) => ({
      id: `v-${type}`,
      scenarioSeedKey: null,
      name: "Invented",
      type,
      province: "CA-AB",
      stage: "IDEA",
      notes: "",
      activityTags: [],
      structure: "sole-prop",
      structureSource: "assumed",
      targetRevenueY1: 0,
      targetRevenueY3: 0,
      notSaid,
      goals: [],
      updatedAt: new Date("2026-10-23T00:00:00Z"),
      createdAt: new Date("2026-10-23T00:00:00Z"),
      statements: [],
      linksFrom: [],
      linksTo: [],
    });
    const prisma = {
      user: { findUnique: async () => ({ id: "u" }) },
      venture: { findMany: async () => [row("SERVICE", ["venture-type", "equipment"]), row("PRODUCT", [])] },
    } as unknown as Parameters<typeof listVentures>[0];
    const [picked, typed] = await listVentures(prisma);
    expect(picked!.typeSaid).toBe(false);
    // Planted control: an idea whose type the person gave keeps it.
    expect(typed!.typeSaid).toBe(true);
    expect(typed!.type).toBe("product");
    expect(venturesWords.card.typeNotSaid).toBe("type not said");
  });

  // Replaces a check on the component's source text, which passed whatever the card drew: the words were
  // there, but the line's `capitalize` drew them "Type Not Said" (2026-10-24). This draws the line itself.
  it("the ideas card draws the type only when it was said, and its own words as written, in lower case", () => {
    const facts = (typeSaid: boolean) =>
      renderToStaticMarkup(
        createElement(VentureFacts, {
          venture: { type: "service", typeSaid, province: "AB", structure: "sole-prop", structureSource: "assumed", targetRevenueY1: 0 },
        }),
      );
    const words = venturesWords.card.typeNotSaid;
    // Every place the words are drawn sits in a `normal-case` span, out of reach of the line's `capitalize`.
    const asWritten = (html: string) => {
      const drawn = html.split(words).length - 1;
      return drawn > 0 && drawn === html.split(`<span class="normal-case">${words}</span>`).length - 1;
    };

    expect(asWritten(facts(false))).toBe(true);
    expect(facts(false)).not.toContain("service");
    // The kind the person gave is drawn, capitalised with the rest of the line as before.
    expect(facts(true)).toMatch(/^<p class="[^"]*\bcapitalize\b[^"]*">service · AB · structure not set<\/p>$/);
    // Planted control: the line as first written, the words bare under `capitalize`, fails the same check.
    expect(asWritten(`<p class="mt-0.5 text-body capitalize text-stone">${words} · AB · structure not set</p>`)).toBe(false);
  });
});

// ---------------------------------------------------------------------------------------------------------
// 3. NO TIMES: the words the check missed, the Lens lines, and official pages' words only under their label
// ---------------------------------------------------------------------------------------------------------

describe("3. Time words in DotAmi's own words", () => {
  it("the no-times check now catches a span of time without a number, and time-boxed (planted controls)", () => {
    for (const text of [
      "First years on your own",
      "the early months",
      "your opening weeks",
      "the first few years",
      "check first — confirm, time-boxed, or one fork away",
      "a time-limited offer",
      // The two item rows' words until 2026-10-24 (node detail, the intake's preview).
      "Time-boxed · in use before 2027",
      "Time-boxed — in use before 2027",
      "the opening months",
    ]) {
      expect(findTimeWords(text), text).not.toEqual([]);
    }
    // A tax year or a what-if year is not a wait, and a shop's opening hours are not a span of time.
    for (const text of [
      "Your first-year sales estimate",
      "the first year",
      "Year 1 sales",
      "Running your own shop",
      "opening hours",
      "Your shop's opening hours",
      "OPENING HOURS",
    ]) {
      expect(findTimeWords(text), text).toEqual([]);
    }
  });

  it("no road's column name or summary holds a time", () => {
    const columns = roadsV2026.flatMap((road) => road.columns.flatMap((c) => [c.label, c.summary]));
    expect(columns.flatMap((text) => findTimeWords(text))).toEqual([]);
    // Planted control: the apprentice road's column name until 2026-10-23.
    expect(findTimeWords("First years on your own")).not.toEqual([]);
  });

  it("the map's legend holds no time", () => {
    expect(Object.values(cockpitWords.map.legend).flatMap((text) => findTimeWords(text))).toEqual([]);
  });

  it("an item's end date says the legend's words, from the words file, on node detail and the intake's preview", () => {
    const { endDate, inUseBefore } = cockpitWords.map.lever;
    expect(cockpitWords.map.legend.checkFirst).toContain(endDate);
    // CCA Class 50's first-year treatment carries expires 2027-01-01 today (tests/brain-evaluate.spec.ts).
    expect(findTimeWords(`${endDate} · ${inUseBefore("2027")}`)).toEqual([]);
    // Both rows draw the words file's words (comments left out); the scan below shows neither writes its own.
    for (const file of ["components/node-detail-panel.tsx", "components/discovery/intake-page.tsx"]) {
      const code = simplify(readFileSync(file, "utf8"), true);
      expect(code, file).toContain("{cockpitWords.map.lever.endDate} · {cockpitWords.map.lever.inUseBefore(item.expires.slice(0, 4))}");
    }
  });

  it("no catalog's Lens line holds a time, past the listed ones", () => {
    const lens = everyLensLine();
    // Every Lens object written in a catalog is read, two lines each (37 objects in five catalogs, 2026-10-24).
    const written = sourceFiles(["lib/engines"]).reduce((n, { text }) => n + (text.match(/lensAnnotations:\s*\{/g)?.length ?? 0), 0);
    expect(written).toBeGreaterThan(0);
    expect(lens.length).toBe(written * 2);
    // A listed line the scan no longer finds fails here too, so its entry comes out the day it is reworded.
    expect(lens.filter(({ text }) => findTimeWords(text).length > 0).map(({ where }) => where)).toEqual(LENS_TIME_GAPS.map((g) => g.where));
    // Planted control: the ride-share Lens line until 2026-10-23.
    expect(
      findTimeWords("the CRA says registration for those rides is needed whatever you earn, from the day of your first paid ride, with 30 days to apply (GI-196, for ride-sharing)."),
    ).not.toEqual([]);
  });

  it("the ride-share Lens line points to GI-196's own words, which the card shows, and asks nothing of the person", () => {
    const rule = complianceCatalogV2026.entries.find((r) => r.id === "compliance-gst-taxi-ride-sharing")!;
    expect(rule.lensAnnotations.tax).toBe(
      "If you drive passengers for fares arranged through an app, or run a taxi business, the CRA says registration for those rides is needed whatever you earn, from the day of your first paid ride. When to apply is in the CRA's own words under this card's sources (its info sheet GI-196, for ride-sharing).",
    );
    // The words it points to are drawn under the card's sources, after their label (a tool check, no person's read).
    const gi196 = rule.citations.find((c) => c.title.startsWith("GI-196"))!;
    expect(toolCheckQuotes(gi196).some((q) => q.includes("before the thirtieth day"))).toBe(true);
  });

  it("no string a catalog writes says time-boxed or the like; a comment may", () => {
    expect(timeBoxedStringsIn(sourceFiles(["lib/engines"]))).toEqual([]);
  });

  it("planted control: a catalog's string saying time-boxed is caught by the same scan, and a comment isn't", () => {
    const planted = [
      {
        file: "lib/engines/planted/v2026/entries.ts",
        text: '// A time-boxed treatment.\nexport const entry = { note: "The time-boxed first-year factor", title: `Time-limited ${1}` };\n',
      },
    ];
    expect(timeBoxedStringsIn(planted)).toEqual([
      "lib/engines/planted/v2026/entries.ts:2: The time-boxed first-year factor",
      "lib/engines/planted/v2026/entries.ts:2: Time-limited ${…}",
    ]);
  });

  // It parses every component, which takes seconds, so a slower machine is given more than vitest's default.
  it("no component writes a time word of its own, past the listed ones", () => {
    const files = sourceFiles(["components", "app"]);
    // The two that wrote "Time-boxed" until 2026-10-24 are read.
    expect(files.map((f) => f.file)).toEqual(expect.arrayContaining(["components/node-detail-panel.tsx", "components/discovery/intake-page.tsx"]));
    const found: string[] = [];
    const used = new Set<number>();
    for (const { file, text } of files) {
      for (const own of ownWords(text, file)) {
        if (findTimeWords(own.text).length === 0) continue;
        const listed = COMPONENT_TIME_WORDS.findIndex((a) => a.file === file && a.text === own.text);
        if (listed !== -1) used.add(listed);
        else found.push(`${file}:${own.line} (${own.where}): ${JSON.stringify(own.text)}`);
      }
    }
    expect(found).toEqual([]);
    // A listed piece the scan no longer finds is stale: take it out (tests/fixtures/ideas/known-gaps.ts).
    expect(COMPONENT_TIME_WORDS.filter((_, i) => !used.has(i)).map((a) => `${a.file}: ${a.text}`)).toEqual([]);
  }, 60_000);

  it("planted control: a time word written in a component is caught by the same scan", () => {
    const planted = `export function Row({ year }: { year: string }) { return (<><p>Time-boxed · in use before {year}</p><b title="Takes about 3 weeks" /></>); }`;
    expect(ownWords(planted, "components/planted.tsx").filter((w) => findTimeWords(w.text).length > 0).map((w) => w.text)).toEqual([
      "Time-boxed · in use before",
      "Takes about 3 weeks",
    ]);
  });

  it("the GnuCash book reader's own messages hold no time", () => {
    const file = "lib/figures/books/read-book.ts";
    const own = ownWords(readFileSync(file, "utf8"), file);
    expect(own.length).toBeGreaterThan(0);
    expect(own.filter((w) => findTimeWords(w.text).length > 0).map((w) => `${file}:${w.line}: ${w.text}`)).toEqual([]);
    // Planted control: its words for a read it stopped, until 2026-10-24.
    expect(findTimeWords("DotAmi stopped reading that book after a minute, so nothing was read. Nothing was kept.")).not.toEqual([]);
  });

  it("an official page's words are drawn after their label, inside the official-quote component", () => {
    const quotes = ["It will cost $200 and will take 1 day.", "Add $100 for express service in 4 hours."];
    for (const layout of ["inline", "lines"] as const) {
      const html = renderToStaticMarkup(createElement(PageQuotes, { quotes, layout }));
      const lead = html.indexOf(PAGE_QUOTES_LEAD);
      expect(lead).toBeGreaterThan(-1);
      for (const q of quotes) expect(html.indexOf(`“${q}”`), q).toBeGreaterThan(lead);
    }
    expect(renderToStaticMarkup(createElement(PageQuotes, { quotes: [] }))).toBe("");
  });

  it("no other component maps over a tool check's quotes itself", () => {
    expect(quotesDrawnOutsideTheComponent(sourceFiles(["components", "app"]))).toEqual([]);
  });

  it("planted control: a card drawing a fee page's quotes bare is caught by the same scan", () => {
    const planted = [{ file: "components/planted.tsx", text: "{line.quotes.map((quote, i) => (<q key={i}>{quote}</q>))}" }];
    expect(quotesDrawnOutsideTheComponent(planted)).toEqual(["components/planted.tsx: line.quotes.map("]);
    const alsoPlanted = [{ file: "components/planted.tsx", text: "{toolCheckQuotes(c).map((q) => q)}" }];
    expect(quotesDrawnOutsideTheComponent(alsoPlanted)).toEqual(["components/planted.tsx: toolCheckQuotes(c).map("]);
    // A list taken out of its line first, then mapped over under its own name.
    const destructured = [{ file: "components/planted.tsx", text: "const { quotes } = line; return quotes.map((q) => <q key={q}>{q}</q>);" }];
    expect(quotesDrawnOutsideTheComponent(destructured)).toEqual(["components/planted.tsx: quotes.map("]);
  });
});

/**
 * A tool check's quotes (a `quotes` list, or `toolCheckQuotes(…)`) mapped over anywhere but the official-quote
 * component. It reads source text, so a list under another name gets past it. The official words drawn by
 * OfficialWordsBlock, About this job and the example's sources each have a label of their own
 * (components/shared/page-quotes.tsx names them).
 */
function quotesDrawnOutsideTheComponent(files: readonly { file: string; text: string }[]): string[] {
  return files
    .filter(({ file }) => file !== "components/shared/page-quotes.tsx")
    .flatMap(({ file, text }) =>
      [...text.matchAll(/([\w.]+\.quotes|\bquotes|toolCheckQuotes\([^)]*\))\s*\.map\(/g)].map((m) => `${file}: ${m[1]}.map(`),
    );
}

/** Every Lens line in every catalog that has them, named "<catalog> <entry id> <tax|legal>". */
function everyLensLine(): { where: string; text: string }[] {
  const catalogs: [string, readonly { id: string; lensAnnotations: { tax: string; legal: string } }[]][] = [
    ["cfe", cfeCatalogV2026.nodes],
    ["structure", structureCatalogV2026.entries],
    ["grants", grantsCatalogV2026.entries],
    ["writeoffs", writeOffsCatalogV2026.entries],
    ["compliance", complianceCatalogV2026.entries],
  ];
  return catalogs.flatMap(([name, entries]) =>
    entries.flatMap((e) => (["tax", "legal"] as const).map((lens) => ({ where: `${name} ${e.id} ${lens}`, text: e.lensAnnotations[lens] }))),
  );
}

/**
 * Lens lines with a time in them today that another open pull request removes. Listed so the test reads every
 * catalog now; an entry the scan no longer finds fails the test, so it comes out the day that pull request lands.
 */
const LENS_TIME_GAPS: readonly { where: string; why: string }[] = [
  {
    where: "grants grant-csbfp tax",
    why: "\"the 365-day retroactive window\": no ISED page holds it. PR #208 (fix/prerelease-numbers) rewrites this line to ISED's words; whichever of #208 and #210 lands second deletes this entry.",
  },
];

/** Every string a file writes (quoted, a plain template, or a template's fixed parts with `${…}` for its holes), never a comment. */
function stringsWritten(source: string, file: string): { line: number; text: string }[] {
  const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const out: { line: number; text: string }[] = [];
  const add = (node: ts.Node, text: string) => out.push({ line: tree.getLineAndCharacterOfPosition(node.getStart(tree)).line + 1, text });
  const visit = (node: ts.Node) => {
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) add(node, node.text);
    else if (ts.isTemplateExpression(node)) add(node, [node.head.text, ...node.templateSpans.map((span) => span.literal.text)].join("${…}"));
    ts.forEachChild(node, visit);
  };
  visit(tree);
  return out;
}

/** The no-times check's "time-boxed" pattern ("time-boxed", "time-limited", "timebound"), over every string the files write. */
function timeBoxedStringsIn(files: readonly { file: string; text: string }[]): string[] {
  const timeBoxed = TIME_PATTERNS.find((p) => p.phrase === "time-boxed")!.pattern;
  // Only a file whose text has the words somewhere is parsed: a string written out can't hold them otherwise (a
  // character escape aside), and parsing every catalog file (the job lists among them) takes seconds.
  return files.flatMap(({ file, text }) =>
    (timeBoxed.test(text) ? stringsWritten(text, file) : [])
      .filter((s) => timeBoxed.test(s.text))
      .map((s) => `${file}:${s.line}: ${s.text}`),
  );
}

// ---------------------------------------------------------------------------------------------------------
// 4. The front door's chips
// ---------------------------------------------------------------------------------------------------------

/** Words that promise something about the person's taxes. */
const TAX_PROMISE = /\b(?:optimi[sz]e|maximi[sz]e|minimi[sz]e|save (?:on )?tax|lower (?:your|my) tax|cut (?:your|my) tax|pay less tax)/i;

describe("4. The front door's chips", () => {
  it("are in the words file, not written in the component", () => {
    const component = readFileSync("components/discovery/landing-page.tsx", "utf8");
    expect(component).not.toMatch(/EXAMPLE_PROMPTS\s*=/);
    expect(component).toContain("frontDoorWords.examplePrompts.map(");
    for (const chip of frontDoorWords.examplePrompts) expect(component, chip).not.toContain(chip);
  });

  it("promise nothing about the person's taxes", () => {
    expect(frontDoorWords.examplePrompts.filter((chip) => TAX_PROMISE.test(chip))).toEqual([]);
    // Planted control: the second chip until 2026-10-23.
    expect(TAX_PROMISE.test("I'm already running a business — optimize my write-offs")).toBe(true);
  });

  it("the reworded chip still reads as the write-offs goal, as the old one did", () => {
    const now = parseIntentFallback(frontDoorWords.examplePrompts[1]);
    const before = parseIntentFallback("I'm already running a business — optimize my write-offs");
    expect(now.goals).toEqual(before.goals);
    expect(now.goals).toContain("write-offs");
  });
});

// ---------------------------------------------------------------------------------------------------------
// 5. Your futures and Open cockpit only once an idea is saved; with none, Your expenses while it lists a record
// ---------------------------------------------------------------------------------------------------------

describe("5. The front door's links", () => {
  it("with nothing saved, only Settings; with an idea saved, Your futures and Open cockpit too", () => {
    const none = renderToStaticMarkup(createElement(FrontDoorNav, { hasSavedIdea: false, expensesListed: false }));
    expect(none).not.toContain(frontDoorWords.nav.futures);
    expect(none).not.toContain(frontDoorWords.nav.cockpit);
    expect(none).not.toContain(frontDoorWords.nav.expenses);
    expect(none).not.toContain('href="/expenses"');
    expect(none).toContain(frontDoorWords.nav.settings);
    // Planted control: a saved idea brings both back.
    const saved = renderToStaticMarkup(createElement(FrontDoorNav, { hasSavedIdea: true, expensesListed: false }));
    expect(saved).toContain(frontDoorWords.nav.futures);
    expect(saved).toContain(frontDoorWords.nav.cockpit);
  });

  it("with no idea saved but records the Expenses page lists, Your expenses leads to them; with an idea saved, Your futures does", () => {
    const records = renderToStaticMarkup(createElement(FrontDoorNav, { hasSavedIdea: false, expensesListed: true }));
    expect(records).toContain(`href="/expenses"`);
    expect(records).toContain(frontDoorWords.nav.expenses);
    expect(records).toContain(frontDoorWords.nav.settings);
    expect(records).not.toContain(frontDoorWords.nav.futures);
    expect(records).not.toContain(frontDoorWords.nav.cockpit);
    // Planted control: with an idea saved, Your futures is the way there (its nav links Your expenses), and
    // the front door draws no fourth link.
    const both = renderToStaticMarkup(createElement(FrontDoorNav, { hasSavedIdea: true, expensesListed: true }));
    expect(both).toContain(frontDoorWords.nav.futures);
    expect(both).toContain(frontDoorWords.nav.cockpit);
    expect(both).not.toContain(frontDoorWords.nav.expenses);
    expect(both).not.toContain(`href="/expenses"`);
  });

  it("asks the data file for the records the Expenses page lists, by the page's own rule: none, some, or no database at all", async () => {
    let seen: unknown;
    const count = (n: number) =>
      ({
        expense: {
          count: async (args: unknown) => {
            seen = args;
            return n;
          },
        },
      }) as unknown as Parameters<typeof hasListedExpenses>[0];
    expect(await hasListedExpenses(count(0))).toBe(false);
    expect(await hasListedExpenses(count(2))).toBe(true);
    // Every record but the ones turned down, the rule listExpenses applies (the same object, not a copy).
    expect(LISTED_EXPENSE).toEqual({ status: { not: "discarded" } });
    expect((seen as { where: unknown }).where).toBe(LISTED_EXPENSE);
    let listed: { where: { AND: unknown[] } } | undefined;
    const lists = {
      expense: {
        findMany: async (args: { where: { AND: unknown[] } }) => {
          listed = args;
          return [];
        },
      },
    } as unknown as Parameters<typeof listExpenses>[0];
    expect(await listExpenses(lists, null)).toEqual([]);
    expect(listed!.where.AND).toContain(LISTED_EXPENSE);
    const broken = {
      expense: {
        count: async () => {
          throw new Error("no database");
        },
      },
    } as unknown as Parameters<typeof hasListedExpenses>[0];
    expect(await hasListedExpenses(broken)).toBe(false);
  });

  it("reads the data file: none, some, or no database at all", async () => {
    const count = (n: number) => ({ venture: { count: async () => n } }) as unknown as Parameters<typeof hasSavedIdea>[0];
    expect(await hasSavedIdea(count(0))).toBe(false);
    expect(await hasSavedIdea(count(2))).toBe(true);
    const broken = {
      venture: {
        count: async () => {
          throw new Error("no database");
        },
      },
    } as unknown as Parameters<typeof hasSavedIdea>[0];
    expect(await hasSavedIdea(broken)).toBe(false);
  });
});

// ---------------------------------------------------------------------------------------------------------
// 6. The screen specs keep up (CLAUDE.md: "Change the control, change the file, same commit")
// ---------------------------------------------------------------------------------------------------------

/** Straight quotes, and every run of white space one space: the specs wrap their lines mid-sentence. */
const flat = (s: string) => s.replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/\s+/g, " ");
const doc = (file: string) => flat(readFileSync(`docs/${file}`, "utf8"));
const spec = (file: string) => doc(`ui-spec/${file}`);

/** Where questions 2 and 3, and the rest of the journey, are held: the phrase every spec of it uses. */
const HELD = "held in the window's memory";

describe("6. The screen specs and design docs say what the screens now draw and hold", () => {
  it("planted control: a spec wrapped mid-sentence with curly quotes still matches; the spec as it stood on 88d0a1f doesn't", () => {
    const wrapped = flat(`no database: *“Not kept: no database reachable. A reload, a new\n  window or the desktop app’s Go menu asks it again.”*`);
    expect(wrapped).toContain(flat(destinationWords.receipts.destinationTabOnly));
    // docs/ui-spec/start/01-questions.md lines 42-43 and 48 as they stood before the window's storage went.
    const before = flat(`own words and keeps the question open; no database: *"Not kept: no database reachable. It stays in
  this tab only."* Changing it later keeps a new statement; the old one stays.
- A choice on \`looking-for\`: kept in the tab.`);
    expect(before).not.toContain(flat(destinationWords.receipts.destinationTabOnly));
    expect(before).not.toContain(HELD);
  });

  it("Your destination: each receipt's words, the line under 2 and 3, and where the answers are held", () => {
    const questions = spec("start/01-questions.md");
    expect(questions).toContain(flat(destinationWords.receipts.destinationTabOnly));
    expect(questions).toContain(flat(destinationWords.receipts.incomeNotKept));
    expect(questions).toContain(flat(destinationWords.keptWithEachFuture));
    for (const file of ["start/_index.md", "start/01-questions.md", "futures/_index.md", "landing/04-three-doors.md"]) {
      expect(spec(file), file).toContain(HELD);
    }
    // Pick a future without a place: every way a page is loaded afresh, and not the example, which keeps it.
    const futures = spec("futures/_index.md");
    for (const way of ["a reload", "a new window", "Go menu"]) expect(futures).toContain(way);
    // A pick ends nothing: /start reads neither answer back from the idea, so a page of Pick a future loaded afresh
    // after a pick has no place either, as the line under 2 and 3 says ("a future picked or not").
    expect(futures).toContain("a future picked or not");
    expect(futures).not.toContain("before a pick");
    expect(futures).not.toContain("until a future is picked");
  });

  it("the unsaved answer's words: the cockpit's save line and receipt, and About you's statement box", () => {
    expect(spec("cockpit/13-receipts.md")).toContain(flat(cockpitWords.receipts.notSaved));
    expect(spec("cockpit/02-left-rail.md")).toContain(flat(cockpitWords.rail.save.unavailable));
    const aboutYou = spec("intake/screen-0-about-you.md");
    expect(aboutYou).toContain(flat(statementWords.notKept));
    expect(aboutYou).toContain(flat(statementWords.noAnswer));
    // An idea not saved yet, on the step panel and Your plan's link: held in memory, never "only in this tab".
    for (const file of ["cockpit/09-step-panel.md", "plan/_index.md"]) {
      expect(spec(file), file).toContain(HELD);
      expect(spec(file), file).not.toContain("only in this tab");
    }
  });

  it("Delete: the spec and the edge cases say it reaches what the window's memory holds", () => {
    expect(spec("your-data/delete-menu.md")).toContain("intakeAfterDelete");
    const edges = doc("architecture/settings-and-edge-cases.md");
    expect(edges).toContain("intakeAfterDelete");
    expect(edges).toContain(HELD);
  });

  it("the design docs name the one key the window's storage still holds, and the journey's memory", () => {
    const overview = doc("architecture/overview.md");
    expect(overview).toContain(HELD);
    expect(overview).not.toContain("sessionStorage");
    expect(doc("architecture/figures-privacy-review.md")).toContain("dotami-cockpit-folds");
  });

  it("every desktop menu item that opens a page afresh is the Go menu's or Help's Licences, and the docs name both", () => {
    // Each `go(…)` in desktop/main.mjs's menu is a loadURL: a fresh load, which empties the journey held in the
    // window's memory. The words on screen name the Go menu (the maintainer's decision 1 of 2026-10-24); Help's
    // Licences opens its page the same way, so the privacy log, the start spec and the task list name it too.
    const main = readFileSync("desktop/main.mjs", "utf8");
    const opened = (code: string) => [...code.matchAll(/click: go\("([^"]+)"\)/g)].map((m) => m[1]);
    const goMenu = opened(main.match(/label: "Go",\s*submenu: \[([\s\S]*?)\]/)![1]);
    expect(goMenu).toEqual(["/", "/ventures", "/settings"]);
    expect(opened(main).filter((page) => !goMenu.includes(page))).toEqual(["/licences"]);
    const unreleased = doc("privacy-log.md").split("## [0.4.1]")[0];
    for (const [file, text] of [
      ["docs/privacy-log.md [Unreleased]", unreleased],
      ["docs/ui-spec/start/_index.md", spec("start/_index.md")],
      ["docs/task-list.md", doc("task-list.md")],
    ] as const) {
      expect(text, file).toContain("Help → Licences");
    }
    // The privacy log says every way the memory is emptied: each time it names the Go menu, it names Licences too.
    expect(unreleased.split("Go menu").length).toBe(unreleased.split("Help → Licences").length);
  });

  it("the map's chips: every chip's words in the canvas and overlay specs, and every readout id", () => {
    const canvas = spec("cockpit/03-canvas.md");
    const overlays = spec("cockpit/08-overlays.md");
    for (const [id, label] of Object.entries(cockpitWords.map.chips)) {
      expect(canvas).toContain("`" + id + "`"); // the readout API's `chip`
      expect(canvas).toContain(label);
      expect(overlays).toContain(label);
    }
    expect(canvas).toContain("Sole Prop activation, first stage, applies as answered,");
    expect(canvas).toContain("`yourStatus`");
    expect(canvas).toContain(flat(cockpitWords.map.legend.chip));
    expect(canvas).toContain(flat(cockpitWords.map.legend.checkFirst));
  });

  it("Next on your road and the Steps gauge: the map's starting point is listed until the person marks it done", () => {
    for (const file of ["cockpit/11-next-on-your-road.md", "cockpit/07-goal-bar.md"]) {
      expect(spec(file), file).toContain("starting point");
      expect(spec(file), file).toContain("Employee/Apprentice baseline");
    }
  });

  it("an official page's words are after their label wherever a spec describes them", () => {
    for (const file of ["cockpit/07-node-detail.md", "plan/_index.md", "shared/citation-links.md"]) {
      expect(spec(file), file).toContain(PAGE_QUOTES_LEAD);
    }
    expect(spec("shared/citation-links.md")).toContain("PAGE_QUOTES_LEAD");
    expect(spec("shared/citation-links.md")).toContain("PageQuotes");
  });

  it("the front door: its chips, and its links by what the data file holds", () => {
    const chips = spec("landing/02-example-chips.md");
    for (const prompt of frontDoorWords.examplePrompts) expect(chips).toContain(flat(prompt));
    const landing = spec("landing/_index.md");
    expect(landing).toContain("hasSavedIdea");
    expect(landing).toContain("hasListedExpenses");
    expect(landing).toContain(frontDoorWords.nav.expenses);
  });

  it("Your futures: the card's line says type not said, in lower case", () => {
    const ventures = spec("ventures/_index.md");
    expect(ventures).toContain(venturesWords.card.typeNotSaid);
    expect(ventures).toContain("lower case");
    expect(ventures).not.toContain("given in this tab");
  });
});
