/**
 * Pick a future's three steps in a real browser (tasks 28b, 23g; docs/ui-spec/futures/_index.md, 01, 02, 03):
 * What's closest to your work?, Where you are, and Pick a future, on Pick a future and at the end of the intake
 * (the cockpit's Pick a job runs the same search: e2e/cockpit.spec.ts).
 *
 * Every person here is invented. The words typed are searched on DotAmi's own server (`POST /api/jobs/search`)
 * and never kept; the job, the area and the region are kept only once a future is opened.
 */
import { expect, test, type Page } from "@playwright/test";

import { aboutJobWords } from "../lib/about-job/words";
import { generalRoadV2026, roadApprenticeToOwnShopAB, roadFederalStepsCA } from "../lib/engines/roads/v2026";
import { partHeading } from "../lib/front-door/job-search-lines";
import { typedWayCount } from "../lib/front-door/typed-way";
import { intakeStepsWords, jobStepWords, pickWords, whereStepWords } from "../lib/front-door/words";
import { waitForReact } from "../tests/helpers/react-ready";

import { ABOUT_JOB, aboutJobPanel, readAboutJob } from "./about-job-read";
import { lookCloser } from "./cockpit-calm";
import { answerWhereInAlberta, pickTheJob, skipTheJob } from "./three-steps";

const Q1 = /what do you want your work and life to look like/i;
const Q2 = "Are you after a business of your own, a job or career, or both?";
const Q3 = "Which province or territory are you in?";
const CABINETMAKERS = { code: "72311.00", label: "Cabinetmakers" };
const BARBERS = { code: "63210.02", label: "Barbers" };

/** Your destination answered (words "I don't know yet", a business, the place), ending on Pick a future's step 1. */
async function toPickAFuture(page: Page, place = "CA-AB") {
  await page.goto("/start");
  const q1 = page.getByRole("textbox", { name: Q1 });
  await expect(q1.or(page.getByRole("heading", { name: Q2, level: 2 })).first()).toBeVisible();
  if (await q1.isVisible()) {
    const dontKnow = page.getByRole("button", { name: "I don't know yet" });
    await waitForReact(dontKnow);
    await dontKnow.click();
  }
  const business = page.getByRole("button", { name: "A business of my own" });
  await waitForReact(business);
  await business.click();
  await page.getByRole("combobox", { name: Q3 }).selectOption(place);
  await page.getByRole("button", { name: "Use this place" }).click();
  const skip = page.getByRole("button", { name: "Skip" });
  const next = page.getByRole("link", { name: "Pick a future →" });
  await expect(skip.or(next).first()).toBeVisible();
  if (await skip.isVisible()) await skip.click();
  await next.click();
  await expect(page).toHaveURL(/\/futures$/);
  await waitForReact(page.getByRole("searchbox", { name: jobStepWords.boxLabel }));
}

/** A whole-page picture at 375, 768 and 1280 px wide, saved with the test's results; the window goes back to 1280x720. */
async function shotsAtEveryWidth(page: Page, name: string) {
  for (const [width, height] of [
    [375, 812],
    [768, 1024],
    [1280, 720],
  ] as const) {
    await page.setViewportSize({ width, height });
    await page.screenshot({ path: test.info().outputPath(`${name}-${width}.png`), fullPage: true });
  }
}

async function ventureCount(page: Page): Promise<number> {
  const body = (await (await page.request.get("/api/ventures")).json()) as { ventures: unknown[] };
  return body.ventures.length;
}

test("step 1 searches the government's example titles, grouped and labelled, and picks nothing without a click", async ({ page }) => {
  await toPickAFuture(page);
  await expect(page.getByRole("heading", { name: jobStepWords.heading, level: 1 })).toBeVisible();
  await expect(page.getByText(jobStepWords.stepCount, { exact: true })).toBeVisible();
  // Nothing typed: no list; the empty state's line, and the words typed aren't kept.
  await expect(page.getByRole("status").filter({ hasText: jobStepWords.empty })).toBeVisible();
  await expect(page.getByText(jobStepWords.notKept, { exact: true })).toBeVisible();

  const box = page.getByRole("searchbox", { name: jobStepWords.boxLabel });
  await box.fill("ca");
  await expect(page.getByRole("status").filter({ hasText: jobStepWords.tooShort })).toBeVisible();

  // Words that are in no title: said so, in plain words, with the English-only line.
  await box.fill("infirmière");
  await expect(page.getByText(jobStepWords.englishOnly, { exact: true })).toBeVisible();
  await expect(page.getByRole("status")).toContainText("No government example title holds any of these words: “infirmiere”");

  // "my own shop": every word left out, so nothing was searched. The screen says so, with Not searched above it,
  // and never that no government title holds them ("barber shop manager" holds "shop").
  await box.fill("my own shop");
  const notSearched = page.getByText(/^Not searched: “my”, “own”, “shop”\./);
  const status = page.getByRole("status");
  await expect(status).toHaveText(jobStepWords.nothingSearched);
  await expect(status).not.toContainText("No government example title");
  await expect(notSearched).toBeVisible();
  await expect(page.getByText(jobStepWords.englishOnly, { exact: true })).toHaveCount(0);
  const above = await notSearched.evaluate((el, line) => !!(el.compareDocumentPosition(line!) & Node.DOCUMENT_POSITION_FOLLOWING), await status.elementHandle());
  expect(above, "Not searched is drawn above the status line").toBe(true);
  await shotsAtEveryWidth(page, "futures-left-out");

  // "my own barber shop": the filler and business words are left out and said; Barbers is listed, not picked.
  await box.fill("my own barber shop");
  await expect(page.getByText(/^Not searched: “my”, “own”, “shop”\./)).toBeVisible();
  const barbers = page.getByRole("button", { name: jobStepWords.pickName(BARBERS.label, BARBERS.code), exact: true });
  await expect(barbers).toBeVisible();
  await expect(page.getByRole("heading", { level: 3, name: new RegExp(`^${jobStepWords.groupOne}, \\d+$`) })).toBeVisible();
  // "barber" is held word for word (Barbers, the barber shop manager) and as a word start ("barbed wire"): two parts.
  await expect(page.getByText(jobStepWords.partsOrder, { exact: true })).toBeVisible();
  await expect(barbers).toHaveAccessibleDescription(/Matched the government's example title “barber/);
  // Still step 1: a single result is a button the person clicks, never picked for them.
  await expect(page.getByRole("heading", { name: jobStepWords.heading, level: 1 })).toBeVisible();

  // Two words: the first group open, a later one a button that opens it in place.
  await box.fill("cabinet maker");
  const later = page.getByRole("button", { name: /^Show the \d+ jobs whose example titles have at least one of your words$/ });
  await expect(later).toBeVisible();
  await later.click();
  await expect(page.getByRole("heading", { level: 3, name: new RegExp(`^${jobStepWords.groupSome}, \\d+$`) })).toBeFocused();

  // Whole words first (a-call-11), headed in the group's own count (the #206 review): inside the open group, the
  // jobs one of whose titles holds the group's count of words word for word, then the rest, both open.
  await box.fill("I build custom kitchen cabinets");
  await expect(page.getByRole("heading", { level: 4, name: `${partHeading("exact", "some", 4)}, 15` })).toBeVisible();
  await expect(page.getByRole("heading", { level: 4, name: `${partHeading("word-start", "some", 4)}, 70` })).toBeVisible();
  await expect(page.getByText(jobStepWords.partsOrder, { exact: true })).toBeVisible();
  // Before: 64th of 85 in one group, past the first 50, so not listed. Now in the exact part, without a click.
  await expect(page.getByRole("button", { name: "Pick Cabinetmakers, 72311.00", exact: true })).toBeVisible();
  await expect(page.getByText(jobStepWords.cappedPart(50, 70), { exact: true })).toBeVisible();
  await box.fill("wedding photography");
  const photographers = page.getByRole("button", { name: "Pick Photographers, 53110.00", exact: true });
  await expect(photographers).toBeVisible();
  await expect(page.getByRole("heading", { level: 4, name: `${partHeading("exact", "some", 2)}, 6` })).toBeVisible();
  await expect(page.getByRole("heading", { level: 4, name: `${partHeading("word-start", "some", 2)}, 18` })).toBeVisible();
  // "and n more" counts only the titles like the one named: of the rest, only one holds "photography" word for word.
  await expect(photographers).toHaveAccessibleDescription(`${jobStepWords.matched("photography supervisor")} ${jobStepWords.matchedMore(1)}`);
  await shotsAtEveryWidth(page, "futures-whole-words-first");
  // An "all your words" group: General duty registered nurses has each word in a different title, so it is second,
  // under the heading that says none of its titles has both.
  await box.fill("registered nurse");
  await expect(page.getByRole("heading", { level: 4, name: `${partHeading("exact", "all", 2)}, 5` })).toBeVisible();
  await expect(page.getByRole("heading", { level: 4, name: `${partHeading("word-start", "all", 2)}, 1` })).toBeVisible();

  // DotAmi's word list: "dayhome" finds a job only through it, in its own last group, headed as DotAmi's.
  await box.fill("dayhome");
  await expect(page.getByRole("heading", { level: 3, name: new RegExp(`^${jobStepWords.groupList}, \\d+$`) })).toBeVisible();
  await expect(page.getByText(jobStepWords.listChip, { exact: true }).first()).toBeVisible();
  // The word list's group has no parts: its order line is the code order's.
  await expect(page.getByText(jobStepWords.groupOrder, { exact: true })).toBeVisible();

  // The search ran on DotAmi's own server, as a POST: the words are in no web address.
  const searched: string[] = [];
  page.on("request", (r) => {
    if (r.url().includes("/api/jobs/search")) searched.push(`${r.method()} ${r.url()}`);
  });
  await box.fill("baker");
  await expect(page.getByRole("button", { name: /^Pick Bakers, 63202\.00$/ })).toBeVisible();
  expect(searched.length).toBeGreaterThan(0);
  for (const r of searched) expect(r).toMatch(/^POST [^?]*\/api\/jobs\/search$/);
});

test("while a search waits, the status line says DotAmi is looking; a search that can't run says so, and only for its own words", async ({ page }) => {
  // The PR #202 review: the searching line was in the words file and the docs, but the line drew "" while a
  // search waited. Each answer is held here until the test lets it go, so the waiting line can be read.
  await toPickAFuture(page);
  const held: (() => Promise<void>)[] = [];
  let failNext = false;
  await page.route("**/api/jobs/search", async (route) => {
    if (failNext) {
      failNext = false;
      await route.abort();
      return;
    }
    held.push(() => route.continue());
  });
  const box = page.getByRole("searchbox", { name: jobStepWords.boxLabel });
  const status = page.getByRole("status");

  await box.fill("baker");
  await expect(status).toHaveText(jobStepWords.searching);
  // The line has no time words (NO TIMES): it says what DotAmi is doing, never how long.
  expect(jobStepWords.searching).not.toMatch(/\b(second|minute|moment|soon|quick|wait|time)s?\b/i);
  await expect.poll(() => held.length).toBeGreaterThan(0);
  await held.shift()!();
  await expect(page.getByRole("button", { name: /^Pick Bakers, 63202\.00$/ })).toBeVisible();
  await expect(status).not.toHaveText(jobStepWords.searching);

  // A search that can't run: said so. New words then search again, and the line says it is looking, not that
  // the earlier search failed.
  failNext = true;
  await box.fill("cabinet");
  await expect(status).toHaveText(jobStepWords.searchFailed);
  await box.fill("barber");
  await expect(status).toHaveText(jobStepWords.searching);
  await expect.poll(() => held.length).toBeGreaterThan(0);
  while (held.length > 0) await held.shift()!();
  await expect(page.getByRole("button", { name: jobStepWords.pickName(BARBERS.label, BARBERS.code), exact: true })).toBeVisible();
  await page.unroute("**/api/jobs/search");
});

test("in Alberta: the job, then the area, then the region (never worked out from the area); the road written for the job first; all kept at Look inside", async ({ page }) => {
  await toPickAFuture(page);
  await pickTheJob(page, CABINETMAKERS);

  // 2a: the pick shown back, the nav's back link changes the pick, one question.
  await expect(page.getByText(whereStepWords.picked(CABINETMAKERS.label, CABINETMAKERS.code), { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: jobStepWords.changePick, exact: true })).toBeVisible();
  const area = page.getByRole("combobox", { name: whereStepWords.area.label });
  await expect(area).toHaveValue("");
  await expect(area.locator("option")).toHaveText(["Choose one", "Calgary", "Edmonton", "Lethbridge", "Red Deer", "Somewhere else in Alberta", "I don't know"]);
  await shotsAtEveryWidth(page, "futures-area");
  await area.selectOption("cma-825");
  await page.getByRole("button", { name: whereStepWords.area.next, exact: true }).click();

  // 2b: Calgary picked, and the region is still the person's to pick: nothing filled in from the area.
  await expect(page.getByText(whereStepWords.area.shownBack("Calgary"), { exact: true })).toBeVisible();
  const region = page.getByRole("combobox", { name: whereStepWords.region.label });
  await expect(region).toHaveValue("");
  await shotsAtEveryWidth(page, "futures-region");
  await expect(region.locator("option")).toHaveText([
    "Choose one",
    "Lethbridge–Medicine Hat",
    "Camrose–Drumheller",
    "Calgary",
    "Banff–Jasper–Rocky Mountain House",
    "Red Deer",
    "Edmonton",
    "Athabasca–Grande Prairie–Peace River",
    "Wood Buffalo–Cold Lake",
    "I don't know",
  ]);
  // Statistics Canada's list shows only once "I don't know" is picked, opening outside DotAmi.
  const lookup = page.getByRole("link", { name: whereStepWords.region.lookupName });
  await expect(lookup).toHaveCount(0);
  await region.selectOption("dont-know");
  await expect(lookup).toHaveAttribute("target", "_blank");
  // Step 2's two lines about About this job, back word for word since About this job reads the region and draws
  // its Change (task 28h).
  await expect(page.getByText(whereStepWords.region.dontKnowNote, { exact: true })).toBeVisible();
  await expect(page.getByText(whereStepWords.kept, { exact: true })).toBeVisible();
  await region.selectOption("4860");
  await expect(lookup).toHaveCount(0);
  // Back goes back one part and keeps the answer given; Next keeps the region given too.
  await page.getByRole("button", { name: whereStepWords.area.back, exact: true }).click();
  await expect(page.getByRole("combobox", { name: whereStepWords.area.label })).toHaveValue("cma-825");
  await page.getByRole("button", { name: whereStepWords.area.next, exact: true }).click();
  await expect(region).toHaveValue("4860");
  await page.getByRole("button", { name: whereStepWords.region.next, exact: true }).click();

  // 3: the road written for Cabinetmakers first, under its own heading; the other futures after.
  await expect(page.getByText(pickWords.stepCount, { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: pickWords.backToRegion, exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: pickWords.writtenForJobHeading })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: pickWords.othersHeading })).toBeVisible();
  const lists = page.getByRole("list", { name: pickWords.listLabel });
  await expect(lists.nth(0).getByRole("heading", { level: 2 })).toHaveText([roadApprenticeToOwnShopAB.label]);
  await expect(lists.nth(1).getByRole("heading", { level: 2 })).toHaveText([generalRoadV2026.label]);
  const lookInside = page.getByRole("button", { name: pickWords.lookInsideName(roadApprenticeToOwnShopAB.label), exact: true });
  await expect(lookInside).toHaveAccessibleDescription(/Written for Cabinetmakers \(72311\)\./);
  // Step 3, case A, at the three widths, kept with the results for the pull request (docs/media/phase-2/).
  await shotsAtEveryWidth(page, "futures-road-written");

  await page.getByRole("textbox", { name: "Name it (optional)" }).fill("Invented — three steps, a cabinetmaker in Edmonton");
  await lookInside.click();
  await expect(page).toHaveURL(/\/cockpit\?venture=/);
  const ventureId = new URL(page.url()).searchParams.get("venture")!;
  const today = await page.evaluate(() => new Date().toLocaleDateString("en-CA"));
  const kept = (await (await page.request.get(`/api/futures/${ventureId}`)).json()) as {
    future: { roadId: string; roadChosen: boolean; job: { code: string } | null; area: unknown; region: unknown };
  };
  expect(kept.future).toMatchObject({
    roadId: roadApprenticeToOwnShopAB.id,
    roadChosen: true,
    job: { code: CABINETMAKERS.code },
    area: { value: "cma-825" },
    region: { value: "4860" },
  });

  // Your plan shows the answers back, each with its day.
  await page.goto(`/plan?venture=${encodeURIComponent(ventureId)}`);
  await expect(page.getByText(`Your area: Calgary · picked ${today}`, { exact: true })).toBeVisible();
  await expect(page.getByText(`Your economic region: Edmonton · picked ${today}`, { exact: true })).toBeVisible();
});

test("About this job, opened from Look closer, reads the area and region given in the three steps: Calgary's own wage row, said to be their pick", async ({ page }) => {
  await toPickAFuture(page);
  await pickTheJob(page, CABINETMAKERS);
  await answerWhereInAlberta(page, "cma-825", "4830");
  await page.getByRole("button", { name: pickWords.lookInsideName(roadApprenticeToOwnShopAB.label), exact: true }).click();
  await expect(page).toHaveURL(/\/cockpit\?venture=/);

  // The job came from the steps, not the cockpit's own pick: Look closer offers About this job at once.
  const goalBar = page.getByRole("region", { name: "Your goal and gauges" });
  await lookCloser(page, ABOUT_JOB, goalBar);
  const panel = aboutJobPanel(page);
  await expect(panel).toBeVisible();

  // The wage row is Calgary's own (ER4830, 18 / 23 / 30 in the 2025 file), labelled by its code, and says the
  // region is the person's pick; not Alberta's row, and not "isn't picked".
  const wages = panel.locator('[data-about-row="wages"]');
  await expect(wages.locator("[data-wage-row]")).toHaveAttribute("data-wage-row", "ER4830");
  await expect(wages).toContainText(aboutJobWords.wages.levelRegion("Calgary"));
  await expect(wages).toContainText(aboutJobWords.wages.yourRegion("Calgary"));
  await expect(wages).toContainText(aboutJobWords.wages.hourly("$18.00", "$23.00", "$30.00"));
  await expect(wages).not.toContainText(aboutJobWords.wages.notPicked);
  await expect(wages).not.toContainText(aboutJobWords.wages.levelProvince("Alberta"));
  // The area by its drop-down's name, the person's pick.
  await expect(panel.locator('[data-about-row="counts"]')).toContainText(aboutJobWords.counts.yourArea("Calgary"));
  // Held to the same screen checks as every About this job: no verdict, no time words, every figure the file's own row.
  expect(await readAboutJob(page, "three steps, Calgary", "72311")).toEqual([]);
});

test("a job with no written road: the step says so, shows About this job in place, lists the general road, and saves nothing until a future is opened", async ({ page }) => {
  await toPickAFuture(page);
  const before = await ventureCount(page);
  await pickTheJob(page, BARBERS);
  // Choose one left on both: allowed, and nothing is kept for either.
  await answerWhereInAlberta(page, "", "");

  const noRoad = page.getByRole("region", { name: pickWords.noRoad.heading(BARBERS.label, BARBERS.code) });
  await expect(noRoad).toBeVisible();
  await expect(noRoad).toContainText(pickWords.noRoad.body(BARBERS.label, false));
  await expect(noRoad).toContainText(pickWords.noRoad.nothingSaved);
  // About this job's rows in place (task 28c), opened by the design's lead sentence: the panel's own rows, for the
  // answers on screen (no region picked: Alberta's own row, said so), with no Close.
  const slot = noRoad.locator(`[data-about-this-job-slot="${BARBERS.code}"]`);
  await expect(slot.getByText(pickWords.noRoad.governmentLead, { exact: true })).toBeVisible();
  await expect(slot.getByRole("heading", { level: 3, name: aboutJobWords.rules.heading })).toBeVisible();
  await expect(slot.locator('[data-about-row="wages"]')).toContainText(aboutJobWords.wages.notPicked);
  await expect(slot.locator('[data-about-row="counts"]')).toContainText(aboutJobWords.counts.areaNotPicked);
  await expect(slot.getByRole("button", { name: aboutJobWords.close })).toHaveCount(0);
  await expect(slot.getByText(/isn't built yet/)).toHaveCount(0);
  expect(await readAboutJob(page, "three steps, no road, Barbers", "63210", slot)).toEqual([]);
  await shotsAtEveryWidth(page, "futures-road-about-job");
  // No road listed as written for Barbers; the general road says it isn't.
  await expect(page.getByRole("heading", { level: 2, name: pickWords.writtenForJobHeading })).toHaveCount(0);
  await expect(page.getByRole("button", { name: pickWords.lookInsideName(generalRoadV2026.label), exact: true })).toHaveAccessibleDescription(
    pickWords.road0NotForJob(BARBERS.label),
  );
  // Leaving from here keeps nothing.
  expect(await ventureCount(page)).toBe(before);

  // Opening the general road keeps the job, and neither the area nor the region (left on Choose one).
  await page.getByRole("button", { name: pickWords.lookInsideName(generalRoadV2026.label), exact: true }).click();
  await expect(page).toHaveURL(/\/cockpit\?venture=/);
  const ventureId = new URL(page.url()).searchParams.get("venture")!;
  const kept = (await (await page.request.get(`/api/futures/${ventureId}`)).json()) as { future: Record<string, unknown> };
  expect(kept.future).toMatchObject({ roadId: generalRoadV2026.id, roadChosen: true, job: { code: BARBERS.code }, area: null, region: null });
});

test("in place for a job with no road: the region picked on step 2 chooses the wage row, and the goal bar says the road opened isn't written for the job", async ({ page }) => {
  await toPickAFuture(page);
  await pickTheJob(page, BARBERS);
  await answerWhereInAlberta(page, "cma-825", "4830");
  const slot = page.locator(`[data-about-this-job-slot="${BARBERS.code}"]`);
  const wages = slot.locator('[data-about-row="wages"]');
  await expect(wages).toContainText(aboutJobWords.wages.yourRegion("Calgary"));
  await expect(slot.locator('[data-about-row="counts"]')).toContainText(aboutJobWords.counts.yourArea("Calgary"));
  // Back to the region, "I don't know": the rows follow the answer on screen, Alberta's own row, said so.
  await page.getByRole("button", { name: pickWords.backToRegion, exact: true }).click();
  await page.getByRole("combobox", { name: whereStepWords.region.label }).selectOption("dont-know");
  // Step 2's line, back word for word now that it's true (task 28h).
  await expect(page.getByText(whereStepWords.region.dontKnowNote, { exact: true })).toBeVisible();
  await expect(page.getByText(whereStepWords.kept, { exact: true })).toBeVisible();
  await page.getByRole("button", { name: whereStepWords.region.next, exact: true }).click();
  await expect(wages).toContainText(aboutJobWords.wages.dontKnow);
  expect(await readAboutJob(page, "three steps, no road, Barbers, I don't know", "63210", slot)).toEqual([]);

  await page.getByRole("button", { name: pickWords.lookInsideName(generalRoadV2026.label), exact: true }).click();
  await expect(page).toHaveURL(/\/cockpit\?venture=/);
  const goal = page.getByRole("region", { name: "Your goal and gauges" });
  await expect(goal).toContainText(`Future: ${generalRoadV2026.label} · not written for your pick of job, ${BARBERS.label}`);
  await shotsAtEveryWidth(page, "cockpit-goal-not-for-job");
});

test("About this job's Change keeps a region for the idea, in Alberta: the row follows, and it stays after a reload", async ({ page }) => {
  await toPickAFuture(page);
  await pickTheJob(page, CABINETMAKERS);
  // An area, and the region left on Choose one: nothing is worked out from the area.
  await answerWhereInAlberta(page, "cma-835", "");
  await page.getByRole("button", { name: pickWords.lookInsideName(roadApprenticeToOwnShopAB.label), exact: true }).click();
  await expect(page).toHaveURL(/\/cockpit\?venture=/);
  const ventureId = new URL(page.url()).searchParams.get("venture")!;
  const goalBar = page.getByRole("region", { name: "Your goal and gauges" });
  // After Look inside, the road opened is the one written for the pick of job, and the goal bar says so.
  await expect(goalBar).toContainText(`Future: ${roadApprenticeToOwnShopAB.label} · written for your pick of job`);
  await lookCloser(page, ABOUT_JOB, goalBar);
  const panel = aboutJobPanel(page);
  const wages = panel.locator('[data-about-row="wages"]');
  await expect(wages).toContainText(aboutJobWords.wages.notPicked);
  await expect(wages.locator("[data-wage-row]")).toHaveAttribute("data-wage-row", "ER48");

  await panel.getByRole("button", { name: aboutJobWords.wages.changeName, exact: true }).click();
  const region = panel.getByRole("combobox", { name: whereStepWords.region.label });
  await expect(region).toBeFocused();
  // Opens on Choose one: nothing picked for the person, not even from their area (Edmonton).
  await expect(region).toHaveValue("");
  await expect(panel.getByRole("button", { name: aboutJobWords.wages.changeKeep, exact: true })).toBeDisabled();
  await shotsAtEveryWidth(page, "cockpit-about-job-change");
  await region.selectOption("4860");
  await panel.getByRole("button", { name: aboutJobWords.wages.changeKeep, exact: true }).click();
  // Edmonton's own row (ER4860, 18 / 23 / 29 in the 2025 file), said to be their pick.
  await expect(wages.locator("[data-wage-row]")).toHaveAttribute("data-wage-row", "ER4860");
  await expect(wages).toContainText(aboutJobWords.wages.yourRegion("Edmonton"));
  await expect(wages).toContainText(aboutJobWords.wages.hourly("$18.00", "$23.00", "$29.00"));
  expect(await readAboutJob(page, "cockpit, after Change, Edmonton", "72311")).toEqual([]);
  const kept = (await (await page.request.get(`/api/futures/${ventureId}`)).json()) as { future: { region: { value: string } | null; area: { value: string } | null } };
  expect(kept.future.region?.value).toBe("4860");
  expect(kept.future.area?.value).toBe("cma-835");

  // Cancel leaves it as it was.
  await panel.getByRole("button", { name: aboutJobWords.wages.changeName, exact: true }).click();
  await expect(panel.getByRole("combobox", { name: whereStepWords.region.label })).toHaveValue("4860");
  await panel.getByRole("button", { name: aboutJobWords.wages.changeCancel, exact: true }).click();
  await expect(wages.locator("[data-wage-row]")).toHaveAttribute("data-wage-row", "ER4860");

  await page.reload();
  await lookCloser(page, ABOUT_JOB, page.getByRole("region", { name: "Your goal and gauges" }));
  await expect(aboutJobPanel(page).locator('[data-about-row="wages"]')).toContainText(aboutJobWords.wages.yourRegion("Edmonton"));
});

test("outside Alberta: Not here yet? keeps the note and opens the federal steps (call 33)", async ({ page }) => {
  await toPickAFuture(page, "CA-ON");
  await skipTheJob(page);
  await expect(page.getByText(pickWords.notHere.federal.hint, { exact: true })).toBeVisible();
  await page.getByRole("textbox", { name: pickWords.notHere.label }).fill("Invented — a note kept from Ontario");
  await page.getByRole("button", { name: pickWords.notHere.federal.button, exact: true }).click();
  await expect(page).toHaveURL(/\/cockpit\?venture=/);
  const ventureId = new URL(page.url()).searchParams.get("venture")!;
  const kept = (await (await page.request.get(`/api/futures/${ventureId}`)).json()) as { future: { roadId: string; roadChosen: boolean } };
  expect(kept.future).toMatchObject({ roadId: roadFederalStepsCA.id, roadChosen: true });
  await expect(page.getByRole("region", { name: "Your goal and gauges" })).toContainText(
    `Future: ${roadFederalStepsCA.label} · Ontario's own steps aren't written yet`,
  );
});

test("outside Alberta: step 2 asks nothing and says why; Skip lists every future with no job matched", async ({ page }) => {
  await toPickAFuture(page, "CA-ON");
  await pickTheJob(page, CABINETMAKERS);
  await expect(page.getByRole("heading", { level: 1, name: whereStepWords.outside.heading("Ontario") })).toBeVisible();
  await expect(page.getByText(whereStepWords.outside.notAsked("Ontario"), { exact: true })).toBeVisible();
  // About this job's wage row outside Alberta, said word for word (held until task 28h made it true).
  await expect(page.getByText(whereStepWords.outside.wageRow("Ontario"), { exact: true })).toBeVisible();
  await shotsAtEveryWidth(page, "futures-outside");
  await expect(page.getByRole("combobox")).toHaveCount(0);
  await expect(page.getByText(whereStepWords.kept, { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: whereStepWords.outside.next, exact: true }).click();
  await expect(page.getByRole("button", { name: pickWords.backToWhere, exact: true })).toBeVisible();

  // Step 3 with no road written for the job in Ontario: the body names what is right below it, the federal steps
  // for all of Canada, and Alberta's futures folded under them (not "the general road below").
  const noRoad = page.getByRole("region", { name: pickWords.noRoad.heading(CABINETMAKERS.label, CABINETMAKERS.code, "Ontario") });
  await expect(noRoad).toContainText(pickWords.noRoad.body(CABINETMAKERS.label, true));
  await expect(noRoad).not.toContainText("the general road below covers");
  // The folded apprentice road is written for Cabinetmakers (in Alberta), so nothing above it may say no future is.
  await expect(noRoad).not.toContainText("None of them is written for");

  // Back to the start, and Skip: every future, with the skipped lines. Outside Alberta (task 28d) the federal steps
  // first, under "Written for all of Canada", and Alberta's two folded under "Written for Alberta", each group in
  // the order written, as the skipped line says.
  await page.getByRole("button", { name: pickWords.backToWhere, exact: true }).click();
  await page.getByRole("button", { name: jobStepWords.changePick, exact: true }).click();
  await skipTheJob(page);
  await expect(page.getByText(pickWords.skipped(true), { exact: true })).toBeVisible();
  await expect(page.getByText(pickWords.skipped(false), { exact: true })).toHaveCount(0);
  await expect(page.getByText(pickWords.skippedNoneFor, { exact: true })).toBeVisible();
  await expect(page.getByRole("list", { name: pickWords.canadaHeading }).getByRole("heading", { level: 3 })).toHaveText([roadFederalStepsCA.label]);
  const alberta = page.getByRole("list", { name: pickWords.albertaHeading });
  await expect(alberta).toBeHidden();
  await page.getByRole("button", { name: pickWords.showAlberta(2), exact: true }).click();
  await expect(alberta.getByRole("heading", { level: 3 })).toHaveText([generalRoadV2026.label, roadApprenticeToOwnShopAB.label]);
  await expect(page.getByRole("button", { name: pickWords.backToWork, exact: true })).toBeVisible();
});

test("the typed way ends on the same three steps, on the intake page, and keeps the job and the road opened", async ({ page }) => {
  await page.goto("/");
  const box = page.getByPlaceholder(/What are you building/);
  await waitForReact(box);
  const sentence = `Custom kitchen cabinets in Lethbridge (invented ${Date.now()})`;
  await box.fill(sentence);
  await page.getByRole("button", { name: "Map it →" }).click();
  const confirm = page.getByRole("heading", { name: /Did we get this/ });
  const aboutYou = page.getByRole("heading", { name: /about you/ });
  await expect(aboutYou.or(confirm).first()).toBeVisible();
  // About you opens the typed way only before the first saved idea (issue #38); the count starts where it opens.
  const startsAtAbout = await aboutYou.isVisible();
  if (startsAtAbout) await page.getByRole("button", { name: "Continue →" }).click();
  await page.getByRole("button", { name: "Looks right →" }).click();
  await page.getByRole("combobox", { name: "Province / territory", exact: true }).selectOption("AB");
  await page.getByRole("combobox", { name: "Current employment", exact: true }).selectOption("self-employed");
  await expect(page.getByText(typedWayCount("ground", startsAtAbout), { exact: true })).toBeVisible();
  await page.getByRole("button", { name: intakeStepsWords.next, exact: true }).click();

  // One numbering from the first screen to the last (2026-10-23): the step goes on from Ground it, never "1 of 3".
  await expect(page.getByText(typedWayCount("work", startsAtAbout), { exact: true })).toBeVisible();
  await expect(page.getByText(jobStepWords.stepCount, { exact: true })).toHaveCount(0);

  // The person's own words shown, not searched: the box starts empty.
  await expect(page.getByText(jobStepWords.yourIdea(sentence), { exact: true })).toBeVisible();
  await expect(page.getByRole("searchbox", { name: jobStepWords.boxLabel })).toHaveValue("");
  // The preview rail is put away for the steps.
  await expect(page.locator('[data-region="preview"]')).toHaveCount(0);
  await pickTheJob(page, CABINETMAKERS);
  await answerWhereInAlberta(page, "cma-810", "4810");
  // No Name it box on the intake page: Screen B asks it.
  await expect(page.getByRole("textbox", { name: "Name it (optional)" })).toHaveCount(0);
  await page.getByRole("button", { name: pickWords.lookInsideName(roadApprenticeToOwnShopAB.label), exact: true }).click();
  await expect(page).toHaveURL(/\/cockpit/);
  const goal = page.getByRole("region", { name: "Your goal and gauges" });
  await expect(goal).toContainText(`Future: ${roadApprenticeToOwnShopAB.label}`);
});
