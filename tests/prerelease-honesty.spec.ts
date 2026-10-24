/**
 * The pre-release honesty and privacy fixes (2026-10-23; found by the screen review of 30f,
 * C:/dotami-wt/review-30f-gaps.txt): each check has a planted control, so it is shown to fail on what it
 * is there to catch.
 *
 * 1. Nothing about the person in window storage (2026-10-24, the maintainer's rule): no code reads or writes
 *    the journey there, a page removes what an older DotAmi left without reading it, and Delete reaches what
 *    the window holds in memory (lib/journey/held-journey.ts, lib/journey/window-storage.ts).
 * 2. The map never shows a stage as done, or as where the person is, unless the person marked it; the ideas
 *    card never shows a kind of venture nobody gave.
 * 3. Time words the no-times check missed ("first years", "time-boxed"), the Lens lines, and official pages'
 *    words drawn only inside the official-quote component.
 * 4. The front door's chips are in the words file, and none promises anything about the person's taxes.
 * 5. The front door offers Your futures and Open cockpit only once an idea is saved.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it } from "vitest";

import { StrategyMap } from "@/components/cockpit/strategy-map";
import { FrontDoorNav } from "@/components/discovery/landing-page";
import { PageQuotes } from "@/components/shared/page-quotes";
import { cockpitWords } from "@/lib/cockpit/words";
import { complianceCatalogV2026 } from "@/lib/engines/compliance/v2026";
import { generalRoadV2026, roadsV2026, skillItemsV2026, type Road } from "@/lib/engines/roads/v2026";
import { PAGE_QUOTES_LEAD } from "@/lib/engines/shared/citation-check";
import type { DestinationDraft } from "@/lib/front-door/draft";
import { hasSavedIdea } from "@/lib/front-door/saved-idea";
import { scenarioForPickedFuture } from "@/lib/front-door/start-future";
import { frontDoorWords } from "@/lib/front-door/words";
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
import type { PlaceCode } from "@/lib/places/codes";
import type { StepStatus } from "@/lib/futures/types";
import { evaluateRoad } from "@/lib/roads";
import { venturesWords } from "@/lib/ventures/words";

import { input } from "./helpers/road-to-evaluate";
import { simplify } from "./helpers/source-scan";
import { findTimeWords } from "./helpers/time-words";

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

  it("the ideas card draws the type only when it was said (source check on the card's line)", () => {
    const card = readFileSync("components/ventures/ventures-page.tsx", "utf8");
    expect(card).toContain("{venture.typeSaid ? venture.type : venturesWords.card.typeNotSaid}");
    // Planted control: the old line, which showed the type always, would not pass this check.
    expect("{venture.type} · {venture.province}").not.toContain("venture.typeSaid");
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
    ]) {
      expect(findTimeWords(text), text).not.toEqual([]);
    }
    // A tax year or a what-if year is not a wait.
    for (const text of ["Your first-year sales estimate", "the first year", "Year 1 sales", "Running your own shop"]) {
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

  it("no rule's Lens line paraphrases an official period", () => {
    const lens = complianceCatalogV2026.entries.flatMap((rule) =>
      rule.lensAnnotations ? [rule.lensAnnotations.tax, rule.lensAnnotations.legal].map((text) => ({ id: rule.id, text })) : [],
    );
    expect(lens.length).toBeGreaterThan(0);
    expect(lens.filter(({ text }) => findTimeWords(text).length > 0).map(({ id }) => id)).toEqual([]);
    // Planted control: the ride-share Lens line until 2026-10-23.
    expect(
      findTimeWords("the CRA says registration for those rides is needed whatever you earn, from the day of your first paid ride, with 30 days to apply (GI-196, for ride-sharing)."),
    ).not.toEqual([]);
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

  it("no other component draws a citation's quotes itself", () => {
    expect(quotesDrawnOutsideTheComponent(sourceFiles(["components", "app"]))).toEqual([]);
  });

  it("planted control: a card drawing a fee page's quotes bare is caught by the same scan", () => {
    const planted = [{ file: "components/planted.tsx", text: "{line.quotes.map((quote, i) => (<q key={i}>{quote}</q>))}" }];
    expect(quotesDrawnOutsideTheComponent(planted)).toEqual(["components/planted.tsx: line.quotes.map("]);
    const alsoPlanted = [{ file: "components/planted.tsx", text: "{toolCheckQuotes(c).map((q) => q)}" }];
    expect(quotesDrawnOutsideTheComponent(alsoPlanted)).toEqual(["components/planted.tsx: toolCheckQuotes(c).map("]);
  });
});

/** A citation's quotes mapped over anywhere but the official-quote component. */
function quotesDrawnOutsideTheComponent(files: readonly { file: string; text: string }[]): string[] {
  return files
    .filter(({ file }) => file !== "components/shared/page-quotes.tsx")
    .flatMap(({ file, text }) =>
      [...text.matchAll(/([\w.]+\.quotes|toolCheckQuotes\([^)]*\))\s*\.map\(/g)].map((m) => `${file}: ${m[1]}.map(`),
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
// 5. Your futures and Open cockpit only once an idea is saved
// ---------------------------------------------------------------------------------------------------------

describe("5. The front door's links", () => {
  it("with nothing saved, only Settings; with an idea saved, Your futures and Open cockpit too", () => {
    const none = renderToStaticMarkup(createElement(FrontDoorNav, { hasSavedIdea: false }));
    expect(none).not.toContain(frontDoorWords.nav.futures);
    expect(none).not.toContain(frontDoorWords.nav.cockpit);
    expect(none).toContain(frontDoorWords.nav.settings);
    // Planted control: a saved idea brings both back.
    const saved = renderToStaticMarkup(createElement(FrontDoorNav, { hasSavedIdea: true }));
    expect(saved).toContain(frontDoorWords.nav.futures);
    expect(saved).toContain(frontDoorWords.nav.cockpit);
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
