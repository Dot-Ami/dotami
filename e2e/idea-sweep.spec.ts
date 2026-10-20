/**
 * The idea sweep (S2.5.29e): twelve ideas from the corpus (tests/fixtures/ideas/v1.ts), each taken from the
 * front door to *Your plan* in a real browser on the production build, every screen read as it opens.
 *
 * Eight ideas are fixed (`FIXED_IDEAS`: across the kinds of person, places outside Alberta and outside Canada,
 * business and career, and the odd cases: French, two provinces, nothing typed) and four rotate by ISO week,
 * drawn from the rest of the corpus by a shuffle seeded with the week's number, so a given week's four are the
 * same on every machine and can be rerun with `IDEA_SWEEP_WEEK=2026-W42`. The twelve are printed when the file
 * loads and listed by the last test.
 *
 * Each idea goes in both ways the app has: typed into "I already have an idea" (the intake's screens, the
 * cockpit on road 0, the plan), and, for an idea with a province or territory, picked on *Pick a future* after
 * *Your destination* (the card the corpus harness's `pickedChoice` clicks for it, or the "Not here yet?" note,
 * then the cockpit and the plan). An idea with nothing typed stops at the box, and one outside Canada at the
 * intake's place question; the sweep checks those honest ends too.
 *
 * On every screen as it opens (and the cockpit with its rail shown, where the person's answers are listed),
 * three checks, over the page's text read the way the harness reads the app's words: line by line (a block's
 * end is a piece's end, so "$60,000" above "day not kept" is no duration), with the person's own words taken
 * out (every idea's in this run, and every statement the data file holds, read before each screen: the rail
 * lists every sentence typed so far, by this sweep or the suite's earlier tests, and the corpus has ideas that
 * say "you should" and "one day" on purpose):
 *
 * - no verdict phrase (tests/helpers/verdict-words.ts `findVerdicts`, as e2e/no-verdict.spec.ts reads);
 * - no time words (tests/helpers/time-words.ts `findTimeWords`, with its allowances) in what DotAmi writes:
 *   a source's own words, drawn in quote marks (the plan's citation quotes, which the harness tags
 *   `official-quote` and never reads as DotAmi's), are taken out first; one known gap on the front door is let
 *   through here while it is listed in tests/fixtures/ideas/known-gaps.ts, and no longer once it isn't;
 * - the clutter measurer (e2e/clutter-measure.ts, the same code as e2e/clutter-budget.spec.ts): no drawn block
 *   without a region mark on any screen; and where the screen's state is the one e2e/budgets.ts measures (the
 *   front door, Pick a future after Your destination, the cockpit's first visit on a picked future, the plan),
 *   its budget at laptop size. The intake's screens and a typed idea's cockpit carry the idea's own words and
 *   chips, which the budgets don't, so those are measured and printed, not held.
 *
 * What it finds is a finding for the maintainer, listed in `SCREEN_GAPS` with its story, never fixed quietly:
 * the list is a ratchet, like the harness's known gaps (an idea's test fails on a listed gap it was expected
 * to show and didn't).
 */
import { expect, test, type Page } from "@playwright/test";

import { COCKPIT_FOLDS_KEY } from "../lib/cockpit/folds";
import { generalRoadV2026, roadApprenticeToOwnShopAB } from "../lib/engines/roads/v2026";
import { frontDoorWords } from "../lib/front-door/words";
import { parseIntentFallback } from "../lib/journey/intent-fallback";
import { PROVINCES, type Province } from "../lib/scenarios/types";
import { SHOWN_WORDS_GAPS } from "../tests/fixtures/ideas/known-gaps";
import { IDEAS_V1, ROAD_IDS, type Idea } from "../tests/fixtures/ideas/v1";
import { pickedChoice, SCREEN_WORK_SITUATION } from "../tests/helpers/idea-pipeline";
import { waitForReact } from "../tests/helpers/react-ready";
import { normaliseSpaces } from "../tests/helpers/text-pieces";
import { findTimeWords } from "../tests/helpers/time-words";
import { findVerdicts } from "../tests/helpers/verdict-words";

import { BUDGETS, WINDOWS_EXTRA, type Clutter, type ScreenId } from "./budgets";
import { measurePage, type Measured } from "./clutter-measure";
import { cockpitSettled, showRail } from "./cockpit-calm";

// --- Which ideas.

/**
 * The eight fixed ideas: a Calgary business on road 0 (1); a cabinetmaker apprentice on road 1 (46); an app in
 * British Columbia, a city named with no province (3); a French idea in Quebec (10); a career in Alberta, a
 * regulated profession, which "Not here yet?" takes to the general road (8); a journeyman moving from one
 * province to another (193); nothing typed (130); and a bakery in England, outside Canada (216).
 */
export const FIXED_IDEAS = ["idea-v1-0001", "idea-v1-0046", "idea-v1-0003", "idea-v1-0010", "idea-v1-0008", "idea-v1-0193", "idea-v1-0130", "idea-v1-0216"] as const;
const ROTATING = 4;

/** The ISO week of a day, as "YYYY-Www" (the week with the year's first Thursday is week 1). */
export function isoWeekOf(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = Date.UTC(d.getUTCFullYear(), 0, 1);
  const week = Math.ceil(((d.getTime() - yearStart) / 86_400_000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

/** A small deterministic random source (mulberry32), so the same week always gives the same shuffle. */
function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The four ideas that rotate: a seeded shuffle of the corpus minus the fixed eight, the first four. */
export function rotatingIdeas(week: string, count = ROTATING): string[] {
  const [year, w] = week.split("-W").map(Number);
  const random = seededRandom(year * 100 + w);
  const pool = IDEAS_V1.map((i) => i.id).filter((id) => !(FIXED_IDEAS as readonly string[]).includes(id));
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count);
}

const WEEK = process.env.IDEA_SWEEP_WEEK?.trim() || isoWeekOf(new Date());
if (!/^\d{4}-W\d{2}$/.test(WEEK)) throw new Error(`IDEA_SWEEP_WEEK must look like 2026-W42, not “${WEEK}”`);
const ideaById = (id: string) => IDEAS_V1.find((i) => i.id === id)!;
const SWEEP: { idea: Idea; why: string }[] = [
  ...FIXED_IDEAS.map((id) => ({ idea: ideaById(id), why: "fixed" })),
  ...rotatingIdeas(WEEK).map((id) => ({ idea: ideaById(id), why: `week ${WEEK}` })),
];
console.log(`idea sweep, ${WEEK}: ${SWEEP.map(({ idea, why }) => `${idea.id} (${why})`).join(", ")}`);

// --- What is let through, and why.

/**
 * A time on a screen the maintainer has been told about and hasn't ruled on yet: let through only while the
 * harness lists it as a known gap, so it can't outlive that ruling here.
 */
const SCREEN_TIME_ALLOWANCES: readonly { text: string; gap: string }[] = [
  { text: frontDoorWords.doors.dream.body, gap: "lib/front-door/words.ts frontDoorWords.doors.dream.body" },
];

interface ScreenGap {
  /** The screen's place in the record (`<idea id> › <screen>`) and the finding's words. */
  screen: RegExp;
  found: RegExp;
  /** Which ideas' runs must show it: an idea's test fails when one of these doesn't, so a fixed gap comes off the list. */
  expectedFor: (idea: Idea) => boolean;
  story: string;
  why: string;
}

const isProvince = (place: string): place is Province => (PROVINCES as readonly string[]).includes(place);

/**
 * A finding of the sweep the maintainer has been told about: a screen's words or a measure, with its story.
 * Each is a ratchet: it must still show for every idea it is expected for, so a gap can't outlive its fix here.
 */
export const SCREEN_GAPS: readonly ScreenGap[] = [
  {
    screen: /› your destination, (?:as opened|answered)$/,
    found: /^time: a duration in words: .*In a few years, what do you want your work and life to look like/,
    expectedFor: (idea) => isProvince(idea.place),
    story: "none yet: found by S2.5.29e on 2026-10-19, the maintainer's call",
    why: "Your destination's first question (lib/front-door/questions.ts, `ask`) says “In a few years, what do you want your work and life to look like?”: the same span of time as the front door's first door, which tests/fixtures/ideas/known-gaps.ts lists. The words-file scan (tests/idea-invariants.spec.ts) doesn't read the questions file, so only the sweep sees this one. Whether it breaks “no times at all” (2026-10-17) is the maintainer's call, the same call as the front door's.",
  },
  // Taken out on 2026-10-20 with the type scale (S2.5.30d): a first visit with the person's words kept drew
  // them in a 13th text size (17 px serif italic) against the cockpit's budget of 12, measured on a visit with no
  // words. The words are now the title size (19 px), one of the six, and the cockpit counts 5 sizes with or
  // without them (budget 5), so the sweep no longer finds it.
];

// --- Reading a screen.

interface Finding {
  where: string;
  what: string;
}

interface Sweep {
  page: Page;
  idea: Idea;
  findings: Finding[];
  /** Each screen measured, for the record printed at the end of the idea's test. */
  measured: string[];
  /** The person's own words on these screens, taken out of the text before it is read. */
  theirs: string[];
}

/**
 * The page's text as the screen's pieces: `innerText` breaks a line at every block's end, and a mark keeps
 * those apart, so two blocks never read as one phrase (the harness checks each piece of the app's words on
 * its own; here a block is a piece).
 */
const PIECE = " ¶ ";
const asPieces = (text: string) => normaliseSpaces(text.replace(/\r?\n+/g, PIECE));

/**
 * Every statement the data file holds, word for word: the person's own words, which the rail and the plan show
 * back. Read before every screen, since the suite's earlier tests typed some too (a four-day week among them)
 * and the intake adds this idea's sentence as it goes.
 */
async function theirStatements(page: Page): Promise<string[]> {
  const response = await page.request.get("/api/person/statements");
  const body = (await response.json()) as { statements: { text: string }[] };
  return body.statements.map((statement) => statement.text);
}

/** The page's text without the person's own words, and without the allowances still listed as gaps. */
function dotamiOnly(text: string, s: Sweep, statements: readonly string[]): string {
  let rest = asPieces(text);
  for (const words of [...s.theirs, ...statements]) {
    const theirs = asPieces(words).trim();
    if (theirs.length > 0) rest = rest.split(theirs).join(PIECE);
  }
  for (const allowance of SCREEN_TIME_ALLOWANCES) {
    if (SHOWN_WORDS_GAPS.some((g) => g.where === allowance.gap)) rest = rest.split(normaliseSpaces(allowance.text)).join(PIECE);
  }
  return rest;
}

/**
 * Without the words a screen draws in quote marks: a source's own words beside a step or a cost line (the
 * plan's citation quotes, with the CRA's "within 29 days" and the trade's "1360 hours"), which the harness
 * collects as `official-quote` (tests/helpers/idea-pipeline.ts `addSource`) and never holds to the no-times
 * check. For the time check only: the verdict check keeps its own short list of quotes allowed to carry one.
 * A sentence of DotAmi's own written inside quote marks is skipped here too; the words files' scan reads it.
 */
const withoutQuotedWords = (text: string) => text.replace(/“[^”]*”/g, PIECE);

/** The budget for this screen and the one it is held to, with Windows' extra where Chromium there counts more. */
function budgetFor(screen: ScreenId): Clutter | null {
  const gate = BUDGETS[screen]?.laptop;
  if (!gate) return null;
  const extra = process.platform === "win32" ? (WINDOWS_EXTRA[screen]?.laptop ?? {}) : {};
  return { ...gate, regions: gate.regions + (extra.regions ?? 0), controls: gate.controls + (extra.controls ?? 0), textSizes: gate.textSizes + (extra.textSizes ?? 0) };
}

/**
 * Reads the screen as it is now: its words for verdicts and times, and its layout with the clutter measurer.
 * `held` names the budget the screen is held to, when its state is the one the budget was measured on.
 */
async function read(s: Sweep, where: string, held: ScreenId | null = null) {
  const text = await s.page.locator("body").innerText();
  const ours = dotamiOnly(text, s, await theirStatements(s.page));
  const at = `${s.idea.id} › ${where}`;
  for (const found of findVerdicts(ours)) s.findings.push({ where: at, what: `verdict: ${found}` });
  for (const found of findTimeWords(withoutQuotedWords(ours))) s.findings.push({ where: at, what: `time: ${found}` });

  await s.page.evaluate(async () => {
    await document.fonts.ready;
  });
  const m: Measured = await s.page.evaluate(measurePage);
  s.measured.push(`${where}: ${m.regions} regions, ${m.controls} controls, ${m.textSizes} text sizes, smallest ${m.smallestTextPx}px${held ? ` (held to ${held})` : ""}`);
  for (const block of m.unmarkedBlocks) s.findings.push({ where: at, what: `clutter: a drawn block with no region mark, inside none: ${block}` });
  const budget = held ? budgetFor(held) : null;
  if (budget) {
    if (m.regions > budget.regions) s.findings.push({ where: at, what: `clutter: ${m.regions} regions, budget ${budget.regions} (${m.regionNames.join(", ")})` });
    if (m.controls > budget.controls) s.findings.push({ where: at, what: `clutter: ${m.controls} controls in the first window, budget ${budget.controls} (${m.controlNames.join(" | ")})` });
    if (m.textSizes > budget.textSizes) s.findings.push({ where: at, what: `clutter: ${m.textSizes} text sizes, budget ${budget.textSizes} (${m.sizesPx.join(", ")} px)` });
    if (m.smallestTextPx < budget.smallestTextPx) s.findings.push({ where: at, what: `clutter: the smallest text is ${m.smallestTextPx}px, budget ${budget.smallestTextPx}px` });
  }
}

// --- The two ways in.

const Q1 = /what do you want your work and life to look like/;
const Q2 = "Are you after a business of your own, a job or career, or both?";
const Q3 = "Which province or territory are you in?";
const button = (page: Page, name: string) => page.getByRole("button", { name, exact: true });
const goalBar = (page: Page) => page.getByRole("region", { name: "Your goal and gauges" });

/**
 * Forgets what this browser remembers of the cockpit (which regions are folded; lib/cockpit/folds.ts), so the
 * next cockpit opens as a first visit, the state its budget was measured on: the rail shown on the typed way
 * in would otherwise stay shown on the picked way's first visit.
 */
const forgetTheCockpit = (page: Page) => page.evaluate((key) => window.localStorage.removeItem(key), COCKPIT_FOLDS_KEY);

const LOOKING_FOR_BUTTON: Record<Idea["lookingFor"], string> = {
  business: "A business of my own",
  career: "A job or career",
  both: "Both, or not sure",
  // The question's own "I don't know": the person has to pick one to go on.
  "not-said": "Both, or not sure",
};

/** The cockpit as it opens (the first visit) and with its rail shown, then the plan from Export. */
async function cockpitAndPlan(s: Sweep, way: string, held: ScreenId | null) {
  const { page } = s;
  await expect(page).toHaveURL(/\/cockpit/);
  await cockpitSettled(page);
  await expect(goalBar(page)).toBeVisible();
  // "Future: <road>" on a road written for the idea's place, "Map drawn: <road> · written for …" elsewhere.
  const future = (await goalBar(page).innerText()).match(/(?:Future|Map drawn): ([^\n·]+)/)?.[1]?.trim() ?? "?";
  await read(s, `cockpit (${way}, ${future}), the first visit as it opens`, held);
  await showRail(page);
  await expect(page.getByRole("region", { name: "Not told yet" })).toBeVisible();
  await read(s, `cockpit (${way}), with the rail shown`);

  await button(page, "Export").click();
  await page.getByRole("link", { name: /^Open your plan to read or print/ }).click();
  await expect(page).toHaveURL(/\/plan\?venture=/);
  await expect(page.getByRole("region", { name: "What this plan is" })).toBeVisible();
  await read(s, `plan (${way})`, "plan");
}

/** "I already have an idea": the box, the intake's screens, the cockpit on road 0, the plan. */
async function typedWay(s: Sweep) {
  const { page, idea } = s;
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await forgetTheCockpit(page);
  await read(s, "front door", "front-door");
  const box = page.getByPlaceholder(/What are you building/);
  await waitForReact(box);
  const mapIt = button(page, "Map it →");
  if (idea.words.trim().length === 0) {
    // Nothing typed: the honest end is the box asking for the idea, and Map it going nowhere.
    await expect(mapIt).toBeDisabled();
    s.measured.push("typed: stopped at the front door's box (nothing typed)");
    return;
  }
  await box.fill(idea.words);
  await mapIt.click();
  await expect(page).toHaveURL(/\/intake/);

  // About you, only before the person's first saved idea (the suite's data file has ideas already).
  const aboutYou = page.getByRole("heading", { name: /about you/ });
  const confirm = page.getByRole("heading", { name: /Did we get this/ });
  await expect(aboutYou.or(confirm).first()).toBeVisible();
  if (await aboutYou.isVisible()) {
    await read(s, "intake: about you");
    await button(page, "Continue →").click();
  }
  await expect(confirm).toBeVisible();
  await read(s, "intake: did we get this right");
  await button(page, "Looks right →").click();

  // Ground it: the person's own place and work situation; the idea's own numbers in the optional boxes.
  const place = page.getByRole("combobox", { name: "Province / territory", exact: true });
  await expect(place).toBeVisible();
  await read(s, "intake: where does this operate");
  if (!isProvince(idea.place)) {
    // Outside Canada or not said: the place question has no answer, the screen says why, and the map can't open.
    await expect(page.getByText("Canada is the first jurisdiction mapped; other countries are not on the map yet.")).toBeVisible();
    await expect(button(page, "Open my map →")).toBeDisabled();
    s.measured.push(`typed: stopped at the intake's place question (${idea.place})`);
    return;
  }
  await place.selectOption(idea.place);
  await page.getByRole("combobox", { name: "Current employment", exact: true }).selectOption(idea.ws ?? SCREEN_WORK_SITUATION[idea.people]);
  await page.getByRole("textbox", { name: "Name it — optional", exact: true }).fill(`Invented — idea sweep ${idea.id} (typed)`);
  if (idea.y1) await page.getByLabel("Year 1 revenue").fill(String(idea.y1));
  if (idea.y3) await page.getByLabel("Year 3 revenue").fill(String(idea.y3));
  await button(page, "Open my map →").click();
  // A typed idea's cockpit carries its words in the goal bar: measured, not held (see the file's comment).
  await cockpitAndPlan(s, "typed", null);
}

/** Your destination, Pick a future, the person's click, the cockpit on the road picked, the plan. */
async function pickedWay(s: Sweep) {
  const { page, idea } = s;
  if (!isProvince(idea.place)) {
    s.measured.push(`picked: not taken (${idea.place}: Pick a future needs a province or territory)`);
    return;
  }
  const choice = pickedChoice(idea);
  await page.goto("/start");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Your destination");
  await forgetTheCockpit(page);
  await read(s, "your destination, as opened");
  // 1. The words. An earlier idea's answer is kept in the data file: Change asks it again.
  const q1 = page.getByRole("textbox", { name: Q1 });
  await expect(q1.or(page.getByRole("heading", { name: Q2, level: 2 })).first()).toBeVisible();
  if (!(await q1.isVisible())) {
    const change = button(page, "Change").first();
    await waitForReact(change);
    await change.click();
  }
  await waitForReact(q1);
  if (idea.words.trim().length > 0) {
    await q1.fill(idea.words);
    await button(page, "Keep my words").click();
  } else {
    await button(page, "I don't know yet").click();
  }
  // 2. Business, career or both. 3. The place. 4. The income, skipped (or left as agreed earlier).
  await expect(page.getByRole("heading", { name: Q2, level: 2 })).toBeVisible();
  await button(page, LOOKING_FOR_BUTTON[idea.lookingFor]).click();
  await page.getByRole("combobox", { name: Q3 }).selectOption(`CA-${idea.place}`);
  await button(page, "Use this place").click();
  const next = page.getByRole("link", { name: "Pick a future →" });
  const skip = button(page, "Skip");
  await expect(next.or(skip).first()).toBeVisible();
  if (await skip.isVisible()) await skip.click();
  await expect(next).toBeVisible();
  await read(s, "your destination, answered");

  await next.click();
  await expect(page).toHaveURL(/\/futures$/);
  const lookInside = page.getByRole("button", { name: `Look inside ${generalRoadV2026.label}` });
  await waitForReact(lookInside);
  await read(s, "pick a future", "futures");
  const road = choice.roadId === ROAD_IDS["road-1"] ? roadApprenticeToOwnShopAB : generalRoadV2026;
  const held: ScreenId = road.id === generalRoadV2026.id ? "cockpit-road-0" : "cockpit-road-1";
  if (choice.by === "card") {
    await page.getByRole("textbox", { name: "Name it (optional)" }).fill(`Invented — idea sweep ${idea.id} (picked)`);
    await page.getByRole("button", { name: `Look inside ${road.label}` }).click();
  } else {
    // "Not here yet?": the note is kept as one of the person's statements, and the general road opens.
    await page.getByRole("textbox", { name: "Not here yet?" }).fill(idea.words);
    await button(page, "Keep my note and look inside the general road").click();
  }
  await cockpitAndPlan(s, `picked by ${choice.by}`, held);
}

// --- The tests.

for (const { idea, why } of SWEEP) {
  const short = idea.words.trim().length > 0 ? idea.words.replace(/\s+/g, " ").slice(0, 60) : "(nothing typed)";
  test(`${idea.id} (${why}, ${idea.place}, ${idea.lookingFor}): ${short}`, async ({ page }) => {
    test.setTimeout(180_000);
    const s: Sweep = {
      page,
      idea,
      findings: [],
      measured: [],
      // Every idea's words as typed (the rail's list of what the person said holds every sentence typed so far
      // in this run, not only this idea's), and as the keyword parser labels them on the confirm screen.
      theirs: SWEEP.flatMap((w) => [w.idea.words, parseIntentFallback(w.idea.words).rawLabel]),
    };
    await typedWay(s);
    await pickedWay(s);
    console.log(`idea sweep ${idea.id}:\n  ${s.measured.join("\n  ")}`);

    // What was found that isn't a listed gap, and every listed gap this idea's run was expected to show.
    const matches = (g: ScreenGap, f: Finding) => g.screen.test(f.where) && g.found.test(f.what);
    const unlisted = s.findings.filter((f) => !SCREEN_GAPS.some((g) => matches(g, f)));
    expect(unlisted.map((f) => `${f.where} → ${f.what}`)).toEqual([]);
    for (const gap of SCREEN_GAPS) {
      if (!gap.expectedFor(idea)) continue;
      expect(s.findings.some((f) => matches(gap, f)), `${idea.id} no longer shows the listed gap ${gap.found} on ${gap.screen}: take it out of SCREEN_GAPS`).toBe(true);
    }
  });
}

test("the sweep ran twelve ideas, eight fixed and four for the week, and every allowance is still a listed gap", () => {
  const ids = SWEEP.map(({ idea }) => idea.id);
  expect(new Set(ids).size).toBe(12);
  expect(ids.slice(0, 8)).toEqual([...FIXED_IDEAS]);
  console.log(`idea sweep, ${WEEK}, ran: ${ids.join(", ")}`);
  // The rotation is deterministic for a week, and changes between weeks.
  expect(rotatingIdeas(WEEK)).toEqual(rotatingIdeas(WEEK));
  expect(rotatingIdeas("2026-W42")).not.toEqual(rotatingIdeas("2026-W43"));
  for (const allowance of SCREEN_TIME_ALLOWANCES) {
    expect(SHOWN_WORDS_GAPS.map((g) => g.where), `${allowance.gap} is no longer a known gap: take its allowance out of the sweep`).toContain(allowance.gap);
  }
  // Every listed gap is expected of some idea this week, so its ratchet (in the ideas' tests) is live.
  for (const gap of SCREEN_GAPS) {
    expect(SWEEP.some(({ idea }) => gap.expectedFor(idea)), `no idea this week is expected to show ${gap.found}: its ratchet checks nothing`).toBe(true);
  }
});

test("the control: the same reading catches a verdict and a time put on a real screen", async ({ page }) => {
  await page.goto("/futures");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  const s: Sweep = { page, idea: ideaById("idea-v1-0001"), findings: [], measured: [], theirs: [] };
  await read(s, "pick a future, untouched");
  expect(s.findings).toEqual([]);
  await page.evaluate(() => {
    const main = document.querySelector("main") ?? document.body;
    for (const words of ["Top pick", "Most people are up and running in 6 weeks."]) {
      const line = document.createElement("p");
      line.textContent = words;
      main.append(line);
    }
  });
  await read(s, "pick a future, with a verdict and a time added");
  const what = s.findings.map((f) => f.what);
  expect(what.some((w) => w.startsWith("verdict: top pick:"))).toBe(true);
  expect(what.some((w) => w.startsWith("time: a duration:"))).toBe(true);
});
