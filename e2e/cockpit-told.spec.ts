/**
 * The cockpit screen, part 2 (docs/architecture/future-cockpit.md § 2, "Cockpit screen as built, part 2"),
 * in a real browser against the production build: answer a question from "Not told yet", see its
 * receipt, take it back, set a step's status, try a what-if, compare the two endings at a fork and pick
 * one, and see what was kept after a reload.
 */
import path from "node:path";

import type { PrismaClient } from "@prisma/client";
import { expect, test, type Page } from "@playwright/test";

import { createDatabaseClient } from "../lib/db/client";
import { generalRoadV2026, roadApprenticeToOwnShopAB } from "../lib/engines/roads/v2026";

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
const gauge = (page: Page, name: string) =>
  page.getByRole("region", { name: "Your goal and gauges" }).getByRole("button", { name: new RegExp(`^${name}`) });

test("told and not told: answer, see the receipt, take it back, a what-if, compare and pick an ending, kept after a reload", async ({ page }) => {
  const ventureId = await saveIdea(page, "Invented — told list test");
  await page.goto(`/cockpit?venture=${ventureId}`);

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
  await dateRow.getByLabel("Month and year").fill("2099-05");
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

  // Compare the two endings at the GST timing fork, and pick one.
  await page.getByRole("region", { name: "Your goal and gauges" }).getByRole("button", { name: "Compare", exact: true }).click();
  await compare(page).getByRole("button", { name: gstFork.label, exact: true }).click();
  await expect(compare(page).getByText("In the order the road shows them.")).toBeVisible();
  const [first, second] = gstFork.sides;
  await expect(compare(page).getByRole("columnheader")).toHaveText([label0(first), label0(second)]);
  await expect(compare(page).getByText(`The map's default pick: “${label0(second)}”, not yours yet`)).toBeVisible();
  const mine = compare(page).getByRole("button", { name: "This is mine" });
  await expect(mine).toHaveCount(2);
  await mine.first().click();
  await expect(mine.first()).toHaveAttribute("aria-pressed", "true");
  await expect(compare(page).getByRole("status")).toContainText(`Because you picked “${label0(first)}” at “${gstFork.label}” on the map`);
  await expect(compare(page).getByText(`Your pick: “${label0(first)}”`)).toBeVisible();
  // The map's pick is saved with the map, after its short pause.
  await expect(page.getByText(/^Saved · /)).toBeVisible();

  // A reload: the pick and the step's status are kept; the receipts of the last visit are not.
  await page.reload();
  await expect(told(page).getByText(`You picked “${label0(first)}” at “${gstFork.label}” on the map`, { exact: true })).toBeVisible();
  await expect(told(page).getByText("You told us “Sole Prop activation” is done", { exact: true })).toBeVisible();
  await expect(notTold(page).getByText("By when?", { exact: false })).toBeVisible();
  await expect(since(page)).toHaveCount(0);
});

test("the map's default side, picked in the box or with This is mine, is still the person's after a reload; a save that fails never says Saved", async ({ page }) => {
  const ventureId = await saveIdea(page, "Invented — default side test");
  await page.goto(`/cockpit?venture=${ventureId}`);
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

  // With This is mine in Compare, on the default side: still the person's pick after a reload.
  const openCompareAt = async () => {
    await page.getByRole("region", { name: "Your goal and gauges" }).getByRole("button", { name: "Compare", exact: true }).click();
    await compare(page).getByRole("button", { name: incFork.label, exact: true }).click();
  };
  await openCompareAt();
  await expect(compare(page).getByText(`The map's default pick: “${label0(incDefault)}”, not yours yet`)).toBeVisible();
  await compare(page).getByRole("button", { name: `This is mine: ${label0(incDefault)}` }).click();
  await expect(compare(page).getByText(`Your pick: “${label0(incDefault)}”`)).toBeVisible();
  await expect(page.getByText(/^Saved · /)).toBeVisible();
  await page.reload();
  await openCompareAt();
  await expect(compare(page).getByText(`Your pick: “${label0(incDefault)}”`)).toBeVisible();

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
  await expect(page.getByText("Save unavailable — kept in this tab. Save now retries.")).toBeVisible();
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
