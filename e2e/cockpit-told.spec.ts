/**
 * The cockpit screen, part 2 (docs/architecture/future-cockpit.md § 2, "Cockpit screen as built, part 2"),
 * in a real browser against the production build: answer a question from "Not told yet", see its
 * receipt, take it back, set a step's status, try a what-if, compare the two endings at a fork and pick
 * one, and see what was kept after a reload. Compare is offered only where a fork's own pick, not the
 * rules, puts steps on or off the path (the maintainer's answer of 2026-10-13): on the apprentice road,
 * not on today's Alberta road.
 */
import path from "node:path";

import type { PrismaClient } from "@prisma/client";
import { expect, test, type Page } from "@playwright/test";

import { cockpitWords } from "../lib/cockpit/words";
import { createDatabaseClient } from "../lib/db/client";
import { generalRoadV2026, roadApprenticeToOwnShopAB } from "../lib/engines/roads/v2026";
import { firstSaveForPickedFuture, scenarioForPickedFuture } from "../lib/front-door/start-future";
import { frontDoorWords } from "../lib/front-door/words";
import { branchDecisions } from "../lib/scenarios/branches";

import { lookCloserItems, showRail, showRoadAhead, showWhatIfBar } from "./cockpit-calm";

const road0Steps = generalRoadV2026.steps.length;
const label0 = (id: string) => generalRoadV2026.steps.find((s) => s.id === id)!.label;
const gstFork = generalRoadV2026.forks.find((f) => f.id === "gstTiming")!;

/** The run's own data file, for the test that draws an idea on another road. */
async function withE2eDb<T>(fn: (db: PrismaClient) => Promise<T>): Promise<T> {
  const file = path.join(process.cwd(), "prisma", "e2e", "dotami.db").split(path.sep).join("/");
  const db = createDatabaseClient({ url: `file:${file}` });
  try {
    return await fn(db);
  } finally {
    await db.$disconnect();
  }
}

/** An invented Alberta idea, saved the way the intake saves one, on the map's default picks; returns its id. */
async function saveIdea(page: Page, name: string): Promise<string> {
  const scenario = {
    id: `told-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    profile: {
      name,
      type: "service",
      province: "AB",
      targetRevenueY1: 20_000,
      targetRevenueY3: 60_000,
      structure: "sole-prop",
      structureSource: "assumed",
      employmentStatus: "employee",
      hireFirst: false,
      activityTags: ["Software / SaaS"],
      stage: "idea",
    },
    state: {
      activeBranches: { gstTiming: "stage-2b-mandatory-gst-registration", incorporationTiming: "stage-3a-incorporation-80k-net" },
    },
  };
  const saved = await page.request.post("/api/scenario/save", { data: { scenario } });
  expect(saved.ok()).toBe(true);
  return ((await saved.json()) as { ventureId: string }).ventureId;
}

const told = (page: Page) => page.getByRole("region", { name: "What you've told DotAmi" });
const notTold = (page: Page) => page.getByRole("region", { name: "Not told yet" });
const compare = (page: Page) => page.getByRole("region", { name: "Compare the two endings" });
const whatIf = (page: Page) => page.getByRole("region", { name: "What-if" });
// This visit's receipt lines, named for what they hold (until 2026-10-12 "Since last time", which a
// person returning would read as "since my last visit").
const since = (page: Page) => page.getByRole("region", { name: "This visit" });
const stepPanel = (page: Page) => page.getByRole("region", { name: "Step" });
const stage = (page: Page, name: string) => page.getByRole("button", { name: new RegExp(`^${name}, `) });
const goalBar = (page: Page) => page.getByRole("region", { name: "Your goal and gauges" });
const gauge = (page: Page, name: string) => goalBar(page).getByRole("button", { name: new RegExp(`^${name}`) });

test("told and not told: answer, see the receipt, take it back, a what-if, no Compare on today's road, a pick at a fork, kept after a reload", async ({ page }) => {
  const ventureId = await saveIdea(page, "Invented — told list test");
  await page.goto(`/cockpit?venture=${ventureId}`);
  // Folded on a first visit (2026-10-17): the rail, where the told list is, and the what-if bar. Opened once,
  // they stay open after the reloads below.
  await showRail(page);
  await showWhatIfBar(page);

  // What the person told the intake, in their own words; the intake keeps no day for each answer.
  await expect(told(page).getByText("You told us your place is Alberta", { exact: true })).toBeVisible();
  await expect(told(page).getByText("day not kept").first()).toBeVisible();
  // A default is never listed as said: the structure the map assumes is a question instead.
  await expect(told(page).getByText(/the map assumes/i)).toHaveCount(0);
  await expect(notTold(page).getByText("In the order DotAmi asks them, not importance.")).toBeVisible();
  // At most five questions show; the rest wait behind "n more".
  await expect(notTold(page).getByText(/^Your structure →/)).toHaveCount(0);
  await notTold(page).getByRole("button", { name: /^\d+ more$/ }).click();
  await expect(notTold(page).getByText(/^Your structure →/)).toBeVisible();

  // Answer one question in its box: the receipt says exactly what changed, and the row moves.
  const dateRow = notTold(page).getByRole("listitem").filter({ hasText: "By when?" });
  await dateRow.getByRole("button", { name: "Answer" }).click();
  // Exact: the row's buttons name the question, "By when? Your month and year", for a screen reader.
  await dateRow.getByLabel("Month and year", { exact: true }).fill("2099-05");
  await dateRow.getByRole("button", { name: "Save", exact: true }).click();
  const dateReceipt = /Because you told us your date is May 2099, your date now reads May 2099, \d+ months from today\./;
  await expect(told(page).getByRole("status")).toContainText(dateReceipt);
  await expect(gauge(page, "Your date")).toContainText("May 2099");
  const dateTold = told(page).getByRole("listitem").filter({ hasText: "You told us your date is May 2099" });
  await expect(dateTold).toBeVisible();
  await expect(dateTold).toContainText(dateReceipt);
  await expect(notTold(page).getByText("By when?", { exact: false })).toHaveCount(0);
  await expect(since(page)).toContainText(dateReceipt);

  // Take it back: gone, the receipt says so, and the question is back.
  await dateTold.getByRole("button", { name: "Take back" }).click();
  await expect(told(page).getByRole("status")).toContainText("Because you took back your date, no date of yours is set now.");
  // The row clicked is gone, so the receipt takes the focus and is scrolled to where the person looks.
  await expect(told(page).getByRole("status")).toBeFocused();
  await expect(told(page).getByRole("status")).toBeInViewport();
  await expect(gauge(page, "Your date")).toContainText("not set");
  await expect(notTold(page).getByText("By when?", { exact: false })).toBeVisible();

  // A step's status: the receipt shows in the step panel.
  await stage(page, "Sole Prop activation").click();
  await stepPanel(page).getByRole("button", { name: "Done", exact: true }).click();
  await expect(stepPanel(page).getByRole("status")).toContainText(`Because you told us “Sole Prop activation” is done, 1 of ${road0Steps} steps are now done.`);
  await expect(told(page).getByText("You told us “Sole Prop activation” is done", { exact: true })).toBeVisible();

  // A what-if: it relights the rules under its banner, and Clear takes it off with nothing kept.
  await whatIf(page).getByLabel("Try first-year sales of $").fill("45000");
  await whatIf(page).getByRole("button", { name: "Try", exact: true }).click();
  await expect(whatIf(page).getByText("Your what-if, not a forecast", { exact: true })).toBeVisible();
  await expect(whatIf(page).getByRole("status")).toContainText("Because you tried first-year sales of $45,000 (your what-if, not a forecast)");
  await expect(told(page).getByText(/what-if/)).toHaveCount(0);
  await whatIf(page).getByRole("button", { name: "Clear", exact: true }).click();
  await expect(whatIf(page).getByText("Your what-if, not a forecast", { exact: true })).toHaveCount(0);

  // No Compare on today's Alberta road (the maintainer's answer of 2026-10-13): flipping a toggle there
  // moves steps, but the tax rules do that, not the fork's own pick, and both columns would hold the same
  // numbers. Not in the goal bar, and not in the step panel of a fork's side.
  const [first, second] = gstFork.sides;
  expect(await lookCloserItems(page, goalBar(page))).not.toContain("Compare the two endings");
  await stage(page, label0(second)).click();
  await expect(stepPanel(page).getByText("The road splits here: you choose", { exact: true })).toBeVisible();
  await expect(stepPanel(page).getByRole("button", { name: "Compare the endings" })).toHaveCount(0);
  await expect(compare(page)).toHaveCount(0);

  // The GST timing pick is made in the one-question box (or on the map's own toggle) instead.
  const more = notTold(page).getByRole("button", { name: /^\d+ more$/ });
  if ((await more.count()) > 0) await more.click();
  const gstRow = notTold(page).getByRole("listitem").filter({ hasText: `Your pick at “${gstFork.label}”` });
  await gstRow.getByRole("button", { name: /^Answer/ }).click();
  await gstRow.getByLabel(label0(first)).check();
  await gstRow.getByRole("button", { name: "Save", exact: true }).click();
  await expect(told(page).getByRole("status")).toContainText(`Because you picked “${label0(first)}” at “${gstFork.label}” on the map`);
  // The map's pick is saved with the map, after its short pause.
  await expect(page.getByText(/^Saved · /)).toBeVisible();

  // A reload: the pick and the step's status are kept; the receipts of the last visit are not.
  await page.reload();
  await expect(told(page).getByText(`You picked “${label0(first)}” at “${gstFork.label}” on the map`, { exact: true })).toBeVisible();
  await expect(told(page).getByText("You told us “Sole Prop activation” is done", { exact: true })).toBeVisible();
  await expect(notTold(page).getByText("By when?", { exact: false })).toBeVisible();
  await expect(since(page)).toHaveCount(0);
});

test("the map's default side, picked in the box or on the map's toggle, is still the person's after a reload; a save that fails never says Saved", async ({ page }) => {
  const ventureId = await saveIdea(page, "Invented — default side test");
  await page.goto(`/cockpit?venture=${ventureId}`);
  await showRail(page);
  // Incorporating is in the road ahead, folded on a first visit (2026-10-17).
  await showRoadAhead(page);
  const incFork = generalRoadV2026.forks.find((f) => f.id === "incorporationTiming")!;
  // The map's default side at each fork: the second at GST timing, the first at incorporation timing.
  const gstDefault = gstFork.sides[1]!;
  const incDefault = incFork.sides[0]!;
  const showAll = async () => {
    const more = notTold(page).getByRole("button", { name: /^\d+ more$/ });
    if ((await more.count()) > 0) await more.click();
  };

  // In the one-question box: the default side is a pick of the person's like the other side.
  await showAll();
  const pickRow = notTold(page).getByRole("listitem").filter({ hasText: `Your pick at “${gstFork.label}”` });
  await pickRow.getByRole("button", { name: /^Answer/ }).click();
  await pickRow.getByLabel(label0(gstDefault)).check();
  await pickRow.getByRole("button", { name: "Save", exact: true }).click();
  // The receipt waits on the save, then says it was saved; it takes the focus from the box that closed.
  await expect(told(page).getByRole("status")).toContainText("Saved. Nothing on the road changed.");
  await expect(told(page).getByRole("status")).toBeFocused();
  const gstTold = `You picked “${label0(gstDefault)}” at “${gstFork.label}” on the map`;
  await expect(told(page).getByText(gstTold, { exact: true })).toBeVisible();
  await expect(page.getByText(/^Saved · /)).toBeVisible();
  await page.reload();
  await expect(told(page).getByText(gstTold, { exact: true })).toBeVisible();
  await showAll();
  await expect(notTold(page).getByText(`Your pick at “${gstFork.label}”`)).toHaveCount(0);

  // With the map's own toggle in the step panel, on the default side: still the person's pick after a
  // reload. (Until 2026-10-13 this was "This is mine" in Compare, which today's road no longer offers;
  // both go through the same change to the map's picks.)
  const incToggle = () => stepPanel(page).getByRole("group", { name: incFork.label });
  const incOption = branchDecisions.find((d) => d.id === incFork.id)!.options.find((o) => o.id === incDefault)!.label;
  await stage(page, label0(incDefault)).click();
  await expect(incToggle()).toContainText("default, not your pick yet");
  await incToggle().getByRole("button", { name: incOption, exact: true }).click();
  await expect(incToggle()).not.toContainText("default, not your pick yet");
  const incTold = `You picked “${label0(incDefault)}” at “${incFork.label}” on the map`;
  await expect(told(page).getByText(incTold, { exact: true })).toBeVisible();
  await expect(page.getByText(/^Saved · /)).toBeVisible();
  await page.reload();
  await expect(told(page).getByText(incTold, { exact: true })).toBeVisible();
  await stage(page, label0(incDefault)).click();
  await expect(incToggle()).not.toContainText("default, not your pick yet");

  // A sales number taken back is not given, in the told list and in the rail: never a $0 target.
  const y3 = told(page).getByRole("listitem").filter({ hasText: "You told us third-year sales of $60,000" });
  await y3.getByRole("button", { name: /^Take back/ }).click();
  await expect(told(page).getByRole("status")).toContainText(/Saved|Because you took back your third-year sales number/);
  await expect(page.getByText("Target Y3", { exact: true }).locator("xpath=..")).toContainText("not given");

  // A save that fails: the receipt says the answer wasn't kept, never "Saved", and This visit gets nothing.
  const thisVisit = async () => ((await since(page).count()) > 0 ? await since(page).innerText() : "");
  const linesBefore = await thisVisit();
  await page.route("**/api/scenario/save", (route) =>
    route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: "Database unavailable" }) }),
  );
  await showAll();
  const structureRow = notTold(page).getByRole("listitem").filter({ hasText: /^Your structure/ });
  await structureRow.getByRole("button", { name: /^Answer/ }).click();
  await structureRow.getByLabel("Corporation").check();
  await structureRow.getByRole("button", { name: "Save", exact: true }).click();
  await expect(told(page).getByRole("status")).toContainText("Not saved yet");
  await expect(told(page).getByRole("status")).not.toContainText("Saved.");
  await expect(page.getByText(cockpitWords.rail.save.unavailable, { exact: true })).toBeVisible();
  expect(await thisVisit()).toBe(linesBefore);
  await page.unroute("**/api/scenario/save");
});

test("on the first written future: compare its two endings, This is mine, kept after a reload, then taken back", async ({ page }) => {
  const road = roadApprenticeToOwnShopAB;
  const fork = road.forks[0]!;
  const label = (id: string) => road.steps.find((s) => s.id === id)!.label;
  const [, ownShop] = fork.sides;
  const ventureId = await saveIdea(page, "Invented — ending test");
  await withE2eDb((db) => db.venture.update({ where: { id: ventureId }, data: { roadId: road.id, roadChosenAt: new Date() } }));
  await page.goto(`/cockpit?venture=${ventureId}`);
  await showRail(page);

  // Here the fork's own pick puts one ending's steps on the path and the other's off it, so Compare is
  // offered: in the goal bar (its Look closer menu, since 2026-10-17), and from the question.
  expect(await lookCloserItems(page, goalBar(page))).toContain("Compare the two endings");
  const endingRow = notTold(page).getByRole("listitem").filter({ hasText: `Which ending at “${fork.label}”?` });
  await endingRow.getByRole("button", { name: "Compare the endings" }).click();
  await expect(compare(page).getByText("No side picked yet.")).toBeVisible();
  await compare(page).getByRole("button", { name: "This is mine" }).nth(1).click();
  await expect(compare(page).getByRole("button", { name: "This is mine" }).nth(1)).toHaveAttribute("aria-pressed", "true");
  await expect(compare(page).getByRole("status")).toContainText(`Because you picked “${label(ownShop)}” at “${fork.label}”`);

  await page.reload();
  const pick = told(page).getByRole("listitem").filter({ hasText: `You picked “${label(ownShop)}” at “${fork.label}”` });
  await expect(pick).toBeVisible();
  // Dated the day it was picked, on this computer.
  await expect(pick).toContainText(/\d{4}-\d{2}-\d{2}/);
  await expect(notTold(page).getByText(`Which ending at “${fork.label}”?`)).toHaveCount(0);

  await pick.getByRole("button", { name: "Take back" }).click();
  await expect(told(page).getByRole("status")).toContainText(`Because you took back your pick at “${fork.label}”`);
  await expect(notTold(page).getByText(`Which ending at “${fork.label}”?`)).toBeVisible();
});

// The idea harness's bug of 2026-10-17 (fixed 2026-10-20): on a future picked on Pick a future the answer
// showed for a moment, "Not told yet" kept asking, and the save dropped it.
test("on a future picked on Pick a future, the equipment answer is kept after a reload, and taken back it is asked again", async ({ page }) => {
  // Saved the way Pick a future saves a future ("Not here yet?" opens the general road): nothing but the
  // place and the road, with the kind of venture, equipment and the sales targets not said.
  const scenario = scenarioForPickedFuture(
    { road: generalRoadV2026, place: "CA-AB", name: "Invented — picked equipment test" },
    `picked-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  );
  const saved = await page.request.post("/api/scenario/save", { data: { scenario, ...firstSaveForPickedFuture(generalRoadV2026, null) } });
  expect(saved.ok()).toBe(true);
  const ventureId = ((await saved.json()) as { ventureId: string }).ventureId;
  const keptRow = () =>
    withE2eDb((db) => db.venture.findUniqueOrThrow({ where: { id: ventureId }, select: { capitalPurchasePlanned: true, notSaid: true } }));
  expect(await keptRow()).toEqual({ capitalPurchasePlanned: false, notSaid: ["venture-type", "equipment", "sales-target-year-1", "sales-target-year-3"] });

  await page.goto(`/cockpit?venture=${ventureId}`);
  await showRail(page);
  const question = "Are you buying equipment, a vehicle or tools?";
  const said = "You told us you're buying equipment, a vehicle or tools";
  const showAll = async () => {
    const more = notTold(page).getByRole("button", { name: /^\d+ more$/ });
    if ((await more.count()) > 0) await more.click();
  };

  // Answered Yes in its box: the receipt names the answer, the told list has it, and the question goes.
  await showAll();
  const row = notTold(page).getByRole("listitem").filter({ hasText: question });
  await row.getByRole("button", { name: /^Answer/ }).click();
  await row.getByLabel("Yes", { exact: true }).check();
  await row.getByRole("button", { name: "Save", exact: true }).click();
  await expect(told(page).getByRole("status")).toContainText(`Because ${said.charAt(0).toLowerCase()}${said.slice(1)}`);
  await expect(told(page).getByText(said, { exact: true })).toBeVisible();
  await showAll();
  await expect(notTold(page).getByText(question)).toHaveCount(0);
  await expect(page.getByText(/^Saved · /)).toBeVisible();

  // The data file holds it, and only equipment came off the not-said list.
  await expect.poll(keptRow).toEqual({ capitalPurchasePlanned: true, notSaid: ["venture-type", "sales-target-year-1", "sales-target-year-3"] });
  await page.reload();
  await expect(told(page).getByText(said, { exact: true })).toBeVisible();
  await showAll();
  await expect(notTold(page).getByText(question)).toHaveCount(0);

  // Taken back: not said again, as the future was picked, and the question is back after a reload.
  await told(page).getByRole("listitem").filter({ hasText: said }).getByRole("button", { name: /^Take back/ }).click();
  // Equipment always has a line in road evaluation (answered or not), so the receipt names the line it is back to.
  await expect(told(page).getByRole("status")).toContainText("Because buying equipment, a vehicle or tools is not answered yet, so the rules read it as no");
  await expect(page.getByText(/^Saved · /)).toBeVisible();
  await expect.poll(keptRow).toEqual({ capitalPurchasePlanned: false, notSaid: ["venture-type", "equipment", "sales-target-year-1", "sales-target-year-3"] });
  await page.reload();
  await expect(told(page).getByText(said, { exact: true })).toHaveCount(0);
  await showAll();
  await expect(notTold(page).getByText(question)).toBeVisible();
});

/** A future saved the way Pick a future saves one on the general road ("Not here yet?"); returns its id. */
async function savePickedFuture(page: Page, name: string): Promise<string> {
  const scenario = scenarioForPickedFuture({ road: generalRoadV2026, place: "CA-AB", name }, `picked-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  const saved = await page.request.post("/api/scenario/save", { data: { scenario, ...firstSaveForPickedFuture(generalRoadV2026, null) } });
  expect(saved.ok()).toBe(true);
  return ((await saved.json()) as { ventureId: string }).ventureId;
}

/** The rail's value for one of the idea's lines ("Target Y1", "Target Y3"). */
const railValue = (page: Page, label: string) => page.getByText(label, { exact: true }).locator("xpath=..");

// The Incorporating fix (docs/ui-spec/cockpit/incorporating-estimate.md; the maintainer's "fix both",
// 2026-10-20): a future picked on Pick a future kept no third-year estimate and nothing asked for one, so
// Incorporating could never light there.
test("on a future picked on Pick a future, the third-year estimate and “I'd incorporate at” light Incorporating; taken back, the future is as picked", async ({ page }) => {
  const ventureId = await savePickedFuture(page, "Invented — picked estimate test");
  const keptRow = () =>
    withE2eDb((db) => db.venture.findUniqueOrThrow({ where: { id: ventureId }, select: { targetRevenueY3: true, notSaid: true } }));
  // As Pick a future saved it: no estimate, and both sales targets not said.
  const asPicked = { targetRevenueY3: 0, notSaid: ["venture-type", "equipment", "sales-target-year-1", "sales-target-year-3"] };

  await page.goto(`/cockpit?venture=${ventureId}`);
  await showRail(page);
  await showRoadAhead(page);
  const estimate = "Your third-year sales estimate";
  // A row's line starts with its question; the estimate's own line names this one too, in lower case.
  const incorporateAt = /^The yearly sales at which you'd incorporate/;
  const showAll = async () => {
    const more = notTold(page).getByRole("button", { name: /^\d+ more$/ });
    if ((await more.count()) > 0) await more.click();
  };
  await expect(stage(page, "Incorporating")).toHaveAccessibleName(/check first/);

  // Asked first, before "I'd incorporate at", which changes nothing without it.
  await showAll();
  await expect(notTold(page).getByText(incorporateAt)).toHaveCount(0);
  const estimateRow = notTold(page).getByRole("listitem").filter({ hasText: estimate });
  await estimateRow.getByRole("button", { name: /^Answer/ }).click();
  await estimateRow.getByLabel("Dollars of sales in your third year").fill("120000");
  await estimateRow.getByRole("button", { name: "Save", exact: true }).click();
  // On its own it changes nothing on the road, and the box says so; the next question is the one it opens.
  await expect(told(page).getByRole("status")).toContainText("Saved. Nothing on the road changed.");
  await expect(told(page).getByText("You told us third-year sales of $120,000", { exact: true })).toBeVisible();
  await expect(railValue(page, "Target Y3")).toContainText("$120,000");
  await expect(railValue(page, "Target Y1")).toContainText("Not said");
  await expect.poll(keptRow).toEqual({ targetRevenueY3: 120_000, notSaid: ["venture-type", "equipment", "sales-target-year-1"] });

  await showAll();
  const ownRow = notTold(page).getByRole("listitem").filter({ hasText: incorporateAt });
  await ownRow.getByRole("button", { name: /^Answer/ }).click();
  await ownRow.getByLabel("Dollars of yearly sales").fill("100000");
  await ownRow.getByRole("button", { name: "Save", exact: true }).click();
  await expect(told(page).getByRole("status")).toContainText("Because you told us you'd incorporate at $100,000 of yearly sales");
  await expect(stage(page, "Incorporating")).toHaveAccessibleName(/applies as answered/);

  // The step's own panel holds both boxes: the estimate shown with Change your number, above "I'd incorporate at".
  await page.reload();
  await expect(stage(page, "Incorporating")).toHaveAccessibleName(/applies as answered/);
  await stage(page, "Incorporating").click();
  const panelEstimate = stepPanel(page).getByRole("group", { name: estimate });
  await expect(panelEstimate).toContainText("This step lights when your third-year sales estimate reaches your own “I'd incorporate at” number. Both are yours.");
  await expect(panelEstimate).toContainText("$120,000");
  await panelEstimate.getByRole("button", { name: "Change your number" }).click();
  await panelEstimate.getByLabel("Dollars of sales in your third year").fill("90000");
  await panelEstimate.getByRole("button", { name: "Save", exact: true }).click();
  // Under the person's own number now: the step goes back to check first, and the receipt says so.
  await expect(stepPanel(page).getByRole("status")).toContainText("Because you told us third-year sales of $90,000");
  await expect(stage(page, "Incorporating")).toHaveAccessibleName(/check first/);
  await expect.poll(keptRow).toEqual({ targetRevenueY3: 90_000, notSaid: ["venture-type", "equipment", "sales-target-year-1"] });

  // Taken back: as when picked. Not said on the rail, asked again, and "I'd incorporate at" no longer asked.
  await page.reload();
  await told(page).getByRole("listitem").filter({ hasText: "You told us third-year sales of $90,000" }).getByRole("button", { name: /^Take back/ }).click();
  await expect(told(page).getByRole("status")).toContainText(/took back your third-year sales number|Nothing on the road changed/);
  await expect.poll(keptRow).toEqual(asPicked);
  await page.reload();
  await expect(railValue(page, "Target Y3")).toContainText("Not said");
  await showAll();
  await expect(notTold(page).getByText(estimate)).toBeVisible();
  await expect(notTold(page).getByText(incorporateAt)).toHaveCount(0);
});

// The review of PR #198: the save refuses a sales number above $1,000,000,000, but the estimate's box and the
// what-if took any digits, so a bigger number stayed on screen and every later save of the idea failed.
test("on a future picked on Pick a future, a sales number larger than the save keeps is refused where it is typed, and nothing is kept", async ({ page }) => {
  const ventureId = await savePickedFuture(page, "Invented — picked too-large test");
  const keptRow = () =>
    withE2eDb((db) => db.venture.findUniqueOrThrow({ where: { id: ventureId }, select: { targetRevenueY1: true, targetRevenueY3: true, notSaid: true } }));
  const asPicked = await keptRow();
  const tooLarge = "DotAmi keeps numbers up to $1,000,000,000. Write a smaller one.";

  await page.goto(`/cockpit?venture=${ventureId}`);
  await showRail(page);
  await showRoadAhead(page);
  await stage(page, "Incorporating").click();
  const panelEstimate = stepPanel(page).getByRole("group", { name: "Your third-year sales estimate" });
  await panelEstimate.getByLabel("Dollars of sales in your third year").fill("2000000000");
  await panelEstimate.getByRole("button", { name: "Save", exact: true }).click();
  // The box stays open and says why; nothing is sent, so no save can fail.
  await expect(panelEstimate.getByText(tooLarge)).toBeVisible();
  await expect(panelEstimate.getByLabel("Dollars of sales in your third year")).toHaveValue("2000000000");
  await expect(railValue(page, "Target Y3")).toContainText("Not said");

  // The what-if: Keep would save it as the first-year sales, so it isn't tried.
  await showWhatIfBar(page);
  await whatIf(page).getByLabel("Try first-year sales of $").fill("2000000000");
  await whatIf(page).getByRole("button", { name: "Try", exact: true }).click();
  await expect(whatIf(page).getByText(tooLarge)).toBeVisible();
  await expect(whatIf(page).getByRole("button", { name: "Keep", exact: true })).toHaveCount(0);

  expect(await keptRow()).toEqual(asPicked);
  await expect(page.getByText(/Save unavailable|not saved/i)).toHaveCount(0);
});

// The what-if Keep bug (the maintainer's call 6, 2026-10-21): on a picked future, Keep set the first-year
// sales the road reads, but the rail and the plan still said "Not said" for them.
test("on a future picked on Pick a future, Keep on the what-if shows the kept first-year sales on the rail and the plan; the third year stays not said", async ({ page }) => {
  const ventureId = await savePickedFuture(page, "Invented — picked keep test");
  const keptRow = () =>
    withE2eDb((db) => db.venture.findUniqueOrThrow({ where: { id: ventureId }, select: { targetRevenueY1: true, notSaid: true } }));

  await page.goto(`/cockpit?venture=${ventureId}`);
  await showRail(page);
  await showWhatIfBar(page);
  await expect(railValue(page, "Target Y1")).toContainText("Not said");
  await whatIf(page).getByLabel("Try first-year sales of $").fill("45000");
  await whatIf(page).getByRole("button", { name: "Try", exact: true }).click();
  await whatIf(page).getByRole("button", { name: "Keep", exact: true }).click();
  await expect(page.getByText(/^Saved · /)).toBeVisible();
  await page.reload();
  await expect(railValue(page, "Target Y1")).toContainText("$45,000");
  await expect(railValue(page, "Target Y3")).toContainText("Not said");
  // The data file: the first-year target came off the not-said list, the third-year one didn't.
  await expect.poll(keptRow).toEqual({ targetRevenueY1: 45_000, notSaid: ["venture-type", "equipment", "sales-target-year-3"] });
  await expect(told(page).getByText("You told us first-year sales of $45,000", { exact: true })).toBeVisible();
  // Your plan reads the same number (its told row ends with where the day is kept).
  await page.goto(`/plan?venture=${ventureId}`);
  await expect(page.getByText(/^You told us first-year sales of \$45,000 · /)).toBeVisible();
});

/**
 * An edit on the map that no save has kept yet (a review of PR #210, 2026-10-24). Since that day nothing about
 * the person sits in the window's storage, so an edit the data file doesn't hold is only in the window's memory,
 * which a reload or the desktop app's Go menu empties. Until the same review, leaving the page within the
 * autosave's pause cancelled the save, and coming back by the app's own links drew the window's copy under
 * "Edits save automatically." with no save on its way, even after a save had failed.
 */
const keptStructure = (ventureId: string) => () =>
  withE2eDb((db) => db.venture.findUniqueOrThrow({ where: { id: ventureId }, select: { structure: true, structureSource: true } }));
const structureBox = (page: Page) => page.getByRole("combobox", { name: cockpitWords.rail.structure, exact: true });

test("leaving the cockpit within the autosave's pause still saves the edit", async ({ page }) => {
  const ventureId = await saveIdea(page, "Invented — leave within the pause");
  await page.goto(`/cockpit?venture=${ventureId}`);
  await showRail(page);
  await structureBox(page).selectOption("corporation");
  // At once, by the rail's own link: well inside the pause, so only leaving the page can send the save.
  await page.getByRole("link", { name: cockpitWords.allFutures, exact: true }).click();
  await page.waitForURL("**/ventures");
  await expect.poll(keptStructure(ventureId)).toEqual({ structure: "corporation", structureSource: "user" });
});

test("a save that failed is tried again when the idea is opened again in the same window, and says so while it fails", async ({ page }) => {
  // Its own name, so Your futures shows one card for it however often the test runs on the same data file.
  const name = `Invented — save failed, then back (${Date.now()})`;
  const ventureId = await saveIdea(page, name);
  await page.goto(`/cockpit?venture=${ventureId}`);
  await showRail(page);
  await page.route("**/api/scenario/save", (route) =>
    route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: "Database unavailable" }) }),
  );
  await structureBox(page).selectOption("corporation");
  const unavailable = page.getByText(cockpitWords.rail.save.unavailable, { exact: true });
  await expect(unavailable).toBeVisible();

  // Away by the rail's link and back by the front door's Open cockpit: the same window, so its memory came through.
  await page.getByRole("link", { name: cockpitWords.allFutures, exact: true }).click();
  await page.waitForURL("**/ventures");
  await page.getByRole("link", { name: "← Back" }).click();
  await page.getByRole("link", { name: frontDoorWords.nav.cockpit }).click();
  await page.waitForURL(/\/cockpit$/);
  await showRail(page);
  // The window's copy is drawn, with the save tried again and said to have failed, never "Edits save automatically.".
  await expect(structureBox(page)).toHaveValue("corporation");
  await expect(unavailable).toBeVisible();
  await expect(page.getByText(cockpitWords.rail.save.automatic, { exact: true })).toHaveCount(0);

  // By Your futures' Open in cockpit (the idea named in the address): the window's copy still wins over the data file's.
  await page.getByRole("link", { name: cockpitWords.allFutures, exact: true }).click();
  const card = page.getByRole("listitem").filter({ has: page.getByRole("heading", { name, exact: true, level: 2 }) });
  await card.getByRole("link", { name: /Open in cockpit/ }).click();
  await page.waitForURL(`**/cockpit?venture=${ventureId}`);
  await showRail(page);
  await expect(structureBox(page)).toHaveValue("corporation");
  await expect(unavailable).toBeVisible();
  expect(await keptStructure(ventureId)()).toEqual({ structure: "sole-prop", structureSource: "assumed" });

  // The database back: Save now keeps it, and the data file has it.
  await page.unroute("**/api/scenario/save");
  await page.getByRole("button", { name: cockpitWords.rail.save.now, exact: true }).click();
  await expect(page.getByText(/^Saved · /)).toBeVisible();
  await expect.poll(keptStructure(ventureId)).toEqual({ structure: "corporation", structureSource: "user" });
});
