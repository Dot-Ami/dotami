/**
 * Nothing about the person in the window's storage (the maintainer's rule; 2026-10-24), read from the browser's
 * real stores, not from a scan of the code (tests/privacy-inventory.spec.ts is the scan).
 *
 * Until 2026-10-24 three keys held the person's own words and answers, and Delete reached none of them: the
 * intake in progress and the idea open on the map (`dotami-journey-v3`, sessionStorage), a statement that
 * couldn't be saved (`dotami-person-unsaved`) and the job descriptions typed under *Other…*
 * (`dotami-employment-suggestions`, localStorage, no end date). Now the journey is held in the window's memory
 * only (lib/journey/held-journey.ts), and a journey page removes the three keys an older DotAmi left, without
 * reading them (lib/journey/window-storage.ts). The window's storage may hold how the cockpit was left
 * (`dotami-cockpit-folds`), nothing else.
 *
 * The browser tests' database holds the two demo ideas from the start, so the intake opens on Screen A (issue
 * #38); About you is one ← Back away. Each test handles either first screen, so it also runs on its own.
 */
import { expect, test, type Page } from "@playwright/test";

import { roadFederalStepsCA } from "../lib/engines/roads/v2026";
import { statementWords } from "../lib/person/words";
import { waitForReact } from "../tests/helpers/react-ready";

import { openTheMapFromTheIntake } from "./three-steps";

/** How the cockpit was left: the one key the window's storage may hold (lib/privacy/inventory.ts WINDOW_STORAGE). */
const FOLDS = "dotami-cockpit-folds";

/** Both of the page's stores, key by key, each value as the browser holds it. */
const stores = (page: Page) =>
  page.evaluate(() => {
    const dump = (s: Storage) => Object.fromEntries(Array.from({ length: s.length }, (_, i) => s.key(i)!).map((k) => [k, s.getItem(k) ?? ""]));
    return { local: dump(localStorage), session: dump(sessionStorage) };
  });

/**
 * The session store is empty, the local one holds at most how the cockpit was left, and none of the person's
 * words or answers is in either (each needle looked for in every value as stored).
 */
async function expectNothingAboutThePerson(page: Page, needles: readonly string[], where: string) {
  const { local, session } = await stores(page);
  expect(session, `${where}: the session store`).toEqual({});
  expect(Object.keys(local).filter((k) => k !== FOLDS), `${where}: the local store`).toEqual([]);
  const values = [...Object.values(local), ...Object.values(session)];
  expect(needles.filter((n) => values.some((v) => v.includes(n))), `${where}: found in storage`).toEqual([]);
}

const heading = (page: Page, name: RegExp) => page.getByRole("heading", { name, level: 1 });
const button = (page: Page, name: string) => page.getByRole("button", { name, exact: true });
const ABOUT_YOU = /Before the venture/;
const SCREEN_A = /Did we get this/;
const EMPTY_INTAKE = /What are you building/;

/** The front door's box, Map it, and the intake: Screen A, or About you for a person with no saved idea. */
async function mapIt(page: Page, sentence: string) {
  await page.goto("/");
  const box = page.getByPlaceholder(/What are you building/);
  await waitForReact(box);
  await box.fill(sentence);
  await button(page, "Map it →").click();
  await expect(page).toHaveURL(/\/intake/);
  await expect(heading(page, SCREEN_A).or(heading(page, ABOUT_YOU)).first()).toBeVisible();
}

test("the typed way, end to end: nothing typed or answered sits in window storage", async ({ page }) => {
  const stamp = Date.now();
  const sentence = `A storage-test sign shop in Halifax (invented ${stamp})`;
  const statement = `Invented storage-test statement ${stamp}`;
  const trade = `Invented storage-test trade ${stamp}`;
  const needles = [sentence, statement, trade, "12345", '"NS"', "Nova Scotia", "storage-test"];

  await mapIt(page, sentence);
  await expectNothingAboutThePerson(page, needles, "the intake, after Map it");

  // About you, with a statement the server can't keep: it stays in its box, and nowhere else.
  if (await heading(page, SCREEN_A).isVisible()) await button(page, "← Back").click();
  await expect(heading(page, ABOUT_YOU)).toBeVisible();
  await page.route("**/api/person/statements", (route) =>
    route.request().method() === "POST"
      ? route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: "No database reachable — not saved." }) })
      : route.continue(),
  );
  const box = page.getByPlaceholder(/Anything you want DotAmi to know about you/);
  await box.fill(statement);
  await button(page, "Keep this").click();
  await expect(page.getByText(statementWords.notKept, { exact: true })).toBeVisible();
  await expect(box).toHaveValue(statement);
  await expectNothingAboutThePerson(page, needles, "About you, a statement the server didn't keep");
  await page.unroute("**/api/person/statements");

  // Screen A and Screen B: the place, the work in the person's own words, a revenue estimate.
  await button(page, "Continue →").click();
  await expect(heading(page, SCREEN_A)).toBeVisible();
  await button(page, "Looks right →").click();
  await page.getByRole("combobox", { name: "Province / territory", exact: true }).selectOption("NS");
  await page.getByRole("combobox", { name: "Current employment", exact: true }).selectOption("other");
  await page.getByRole("textbox", { name: "Your employment, in your words", exact: true }).fill(trade);
  await page.getByLabel("Year 1 revenue").fill("12345");
  await expectNothingAboutThePerson(page, needles, "Screen B, answered");

  // The map, opened from the intake: the idea is in the window's memory and the data file, not its storage.
  await openTheMapFromTheIntake(page, roadFederalStepsCA.label);
  await expect(page).toHaveURL(/\/cockpit/);
  await expect(page.getByRole("region", { name: "Your goal and gauges" })).toContainText("Nova Scotia");
  await expectNothingAboutThePerson(page, needles, "the cockpit, from the intake");
});

test("what an older DotAmi left in the window's storage is removed when a page opens, and never read", async ({ page }) => {
  // Mara's example touches no browser storage at all (e2e/example-future.spec.ts), so it is where the old keys
  // are planted, as an older copy would have left them.
  await page.goto("/example/mara");
  const planted = "Planted by an older copy";
  await page.evaluate(
    ({ planted, folds }) => {
      const intentParse = { ventureType: "service", activityTags: [], rawLabel: planted, goals: [], province: "NS", capitalPurchasePlanned: false, unmapped: [], source: "fallback" };
      const intake = {
        goals: ["write-offs"],
        ventureType: "service",
        activityTags: [],
        customTags: [],
        description: planted,
        ventureStage: "idea",
        name: "Planted idea",
        province: "NS",
        employmentStatus: "other",
        employmentOther: "Planted trade",
        customerGeography: [],
        targetRevenueY1: 12345,
        targetRevenueY3: 0,
        hireFirst: false,
        capitalPurchasePlanned: false,
        manualEntry: planted,
        manualEntrySaidAt: "2026-10-01",
        intentParse,
      };
      sessionStorage.setItem("dotami-journey-v3", JSON.stringify({ intake, scenario: null }));
      sessionStorage.setItem(
        "dotami-person-unsaved",
        JSON.stringify([{ id: "local:1", text: "Planted statement", saidAt: "2026-10-01", source: "typed", sourceRef: "this tab", recordedAt: "2026-10-01T00:00:00.000Z", persisted: false }]),
      );
      localStorage.setItem("dotami-employment-suggestions", JSON.stringify(["Planted trade"]));
      localStorage.setItem(folds, JSON.stringify({ rail: false }));
    },
    { planted, folds: FOLDS },
  );

  await page.goto("/intake");
  // Nothing planted is drawn: the intake starts empty (Screen A's empty state, or About you first).
  await expect(heading(page, EMPTY_INTAKE).or(heading(page, ABOUT_YOU)).first()).toBeVisible();
  await expect.poll(async () => Object.keys((await stores(page)).session)).toEqual([]);
  await expect(page.getByText(/Planted/)).toHaveCount(0);
  // About you's list neither (it read the unsaved statements once), and Screen A is empty.
  if (await heading(page, EMPTY_INTAKE).isVisible()) await button(page, "← Back").click();
  await expect(heading(page, ABOUT_YOU)).toBeVisible();
  await expect(page.getByText("Nothing on record yet.").or(page.getByRole("listitem").first()).first()).toBeVisible();
  await expect(page.getByText(/Planted/)).toHaveCount(0);
  await button(page, "Continue →").click();
  await expect(heading(page, EMPTY_INTAKE)).toBeVisible();
  await expect(page.getByText(/Planted/)).toHaveCount(0);

  // The three keys are gone; how the cockpit was left is as it was.
  const { local, session } = await stores(page);
  expect(session).toEqual({});
  expect(local).toEqual({ [FOLDS]: JSON.stringify({ rail: false }) });
});

test("a reload mid-intake starts afresh: nothing was kept in the window", async ({ page }) => {
  const sentence = `A reload-test pottery studio in Red Deer (invented ${Date.now()})`;
  await mapIt(page, sentence);
  if (await heading(page, ABOUT_YOU).isVisible()) await button(page, "Continue →").click();
  await expect(heading(page, SCREEN_A)).toBeVisible();

  await page.reload();
  await expect(heading(page, EMPTY_INTAKE).or(heading(page, ABOUT_YOU)).first()).toBeVisible();
  if (await heading(page, ABOUT_YOU).isVisible()) await button(page, "Continue →").click();
  await expect(heading(page, EMPTY_INTAKE)).toBeVisible();
  await expect(page.getByText(/reload-test pottery/)).toHaveCount(0);
  await expectNothingAboutThePerson(page, [sentence, "reload-test"], "the intake, after a reload");
});
