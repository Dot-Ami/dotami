/**
 * "Others in this line of work" in a real browser on the production build (docs/ui-spec/cockpit/landscape.md;
 * docs/architecture/competitive-landscape.md § 6.2): the panel opens in the cockpit's right-hand panel from the
 * goal bar on every road, and from the step a road marks as opening a business (road 1's Open your own shop).
 * It holds what their ads cost (the fixed "not published" line and plain links to the two ad libraries), the
 * person's own list of businesses they're watching, and the footer.
 *
 * The main path: add a business with a link, a note and an ad link with the day seen; add another; edit one;
 * remove one; a javascript: link refused on screen; the list in the order added, kept after a reload. Every
 * request the page makes goes to DotAmi's own server, and the panel is read with the verdict check. And in an
 * edit, removing the middle one of three ad links keeps the other two, each with its own day.
 */
import path from "node:path";

import type { PrismaClient } from "@prisma/client";
import { expect, test, type Page, type Request } from "@playwright/test";

import { createDatabaseClient } from "../lib/db/client";
import { generalRoadV2026, roadApprenticeToOwnShopAB } from "../lib/engines/roads/v2026";
import { findVerdicts } from "../tests/helpers/verdict-words";

import { lookCloser } from "./cockpit-calm";

const REGION = "Others in this line of work";
const ownShop = roadApprenticeToOwnShopAB.steps.find((s) => s.id === "step-shop-open-own-shop")!;

/** The run's own data file, to put an idea on the apprentice road the way Pick a future does. */
async function withE2eDb<T>(fn: (db: PrismaClient) => Promise<T>): Promise<T> {
  const file = path.join(process.cwd(), "prisma", "e2e", "dotami.db").split(path.sep).join("/");
  const db = createDatabaseClient({ url: `file:${file}` });
  try {
    return await fn(db);
  } finally {
    await db.$disconnect();
  }
}

/** An invented Alberta idea, saved the way the intake saves one; returns its id. */
async function saveIdea(page: Page, name: string): Promise<string> {
  const scenario = {
    id: `landscape-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    profile: {
      name,
      type: "service",
      province: "AB",
      targetRevenueY1: 20_000,
      targetRevenueY3: 0,
      structure: "sole-prop",
      structureSource: "assumed",
      employmentStatus: "employee",
      hireFirst: false,
      activityTags: ["Trades"],
      stage: "idea",
    },
    state: {
      activeBranches: { gstTiming: "stage-2a-voluntary-gst-registration", incorporationTiming: "stage-3a-incorporation-80k-net" },
    },
  };
  const saved = await page.request.post("/api/scenario/save", { data: { scenario } });
  expect(saved.ok()).toBe(true);
  return ((await saved.json()) as { ventureId: string }).ventureId;
}

const goalBar = (page: Page) => page.getByRole("region", { name: "Your goal and gauges" });
const panel = (page: Page) => page.getByRole("region", { name: REGION });
const watchedList = (page: Page) => panel(page).getByRole("list", { name: "Businesses you're watching" });
const business = (page: Page, name: string) => watchedList(page).getByRole("listitem").filter({ has: page.getByRole("heading", { name, exact: true }) });
const addForm = (page: Page) => panel(page).getByRole("form", { name: "Add a business" });
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** The person's own calendar day, as the page sees it. */
const todayIn = (page: Page) => page.evaluate(() => new Date().toLocaleDateString("en-CA"));

test("the apprentice road: open the panel, add, edit and remove businesses you're watching, with their ads' links; nothing leaves the computer", async ({ page }) => {
  const stamp = Date.now();
  const ventureId = await saveIdea(page, `Invented — landscape ${stamp}`);
  await withE2eDb((db) => db.venture.update({ where: { id: ventureId }, data: { roadId: roadApprenticeToOwnShopAB.id, roadChosenAt: new Date() } }));

  // Every request the page makes from here on, to check none goes anywhere but DotAmi's own server.
  const requests: Request[] = [];
  page.on("request", (request) => requests.push(request));

  await page.goto(`/cockpit?venture=${ventureId}`);
  const today = await todayIn(page);
  await expect(goalBar(page)).toContainText(`Future: ${roadApprenticeToOwnShopAB.label}`);

  // From the goal bar.
  // From the goal bar's Look closer menu (since 2026-10-17).
  await lookCloser(page, REGION, goalBar(page));
  await expect(panel(page)).toBeVisible();
  await expect(panel(page).getByRole("heading", { level: 2 })).toHaveText(REGION);

  // What their ads cost: the fixed line, and plain links to the two libraries that open in the browser.
  await expect(panel(page).getByRole("heading", { name: "What their ads cost" })).toBeVisible();
  await expect(panel(page)).toContainText(
    "Meta and Google don't publish this for ordinary ads in Canada, as their pages read on 15 October 2026. DotAmi has no number for it.",
  );
  for (const [name, href] of [
    ["Meta's Ad Library", "https://www.facebook.com/ads/library/"],
    ["Google's Ads Transparency Center", "https://adstransparency.google.com/"],
  ] as const) {
    const link = panel(page).getByRole("link", { name: new RegExp(`^${escape(name)}`) });
    await expect(link).toHaveAttribute("href", href);
    await expect(link).toHaveAttribute("target", "_blank");
    await expect(link).toHaveAttribute("rel", "noopener noreferrer");
  }

  // The list, empty, with its line; the footer.
  await expect(panel(page).getByRole("heading", { name: "Businesses you're watching · in the order you added them" })).toBeVisible();
  await expect(panel(page)).toContainText("DotAmi doesn't check these. They stay on this computer and no rule reads them.");
  await expect(panel(page)).toContainText("Facts from public sources, side by side. Nothing here says whether this line of work fits you. Not legal advice.");
  await expect(watchedList(page).getByRole("listitem")).toHaveCount(0);

  // Add a business: its name as typed, a link, a note and an ad link with the day seen (starts on today).
  const first = `Invented Shop A ${stamp}`;
  await panel(page).getByRole("button", { name: "+ Add a business" }).click();
  await addForm(page).getByLabel("Name").fill(first);
  await addForm(page).getByLabel("Link (optional)").fill("https://example.com/shop-a");
  await addForm(page).getByLabel("Your note (optional)").fill("Saw their van downtown.");
  await addForm(page).getByRole("button", { name: "+ Add an ad link" }).click();
  await addForm(page).getByLabel("Ad link 1", { exact: true }).fill("https://example.com/ads/a-1");
  await expect(addForm(page).getByLabel("Day you saw ad link 1")).toHaveValue(today);
  await addForm(page).getByLabel("Day you saw ad link 1").fill("2026-10-01");
  await addForm(page).getByRole("button", { name: "Save", exact: true }).click();
  await expect(panel(page).getByRole("status")).toContainText("Added to your list.");
  await expect(business(page, first)).toBeVisible();
  // The link's text is the address itself; matched exactly (an open-ended pattern trips CodeQL's anchor check).
  const shopLink = business(page, first).getByRole("link", { name: "https://example.com/shop-a", exact: true });
  await expect(shopLink).toHaveAttribute("href", "https://example.com/shop-a");
  await expect(shopLink).toHaveAttribute("rel", "noopener noreferrer");
  await expect(shopLink).toHaveAttribute("target", "_blank");
  await expect(business(page, first)).toContainText("Saw their van downtown.");
  await expect(business(page, first)).toContainText("seen 2026-10-01");
  await expect(business(page, first).getByRole("link", { name: "https://example.com/ads/a-1", exact: true })).toHaveAttribute("href", "https://example.com/ads/a-1");

  // A javascript: link is refused on screen, and nothing is added.
  await panel(page).getByRole("button", { name: "+ Add a business" }).click();
  await addForm(page).getByLabel("Name").fill(`Invented, bad link ${stamp}`);
  await addForm(page).getByLabel("Link (optional)").fill("javascript:alert(1)");
  await addForm(page).getByRole("button", { name: "Save", exact: true }).click();
  await expect(addForm(page).getByRole("alert")).toContainText("A link has to start with http:// or https://.");
  await addForm(page).getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(watchedList(page).getByRole("listitem")).toHaveCount(1);

  // A second business, with only a name; the list keeps the order added.
  const second = `AAA Invented Shop B ${stamp}`;
  await panel(page).getByRole("button", { name: "+ Add a business" }).click();
  await addForm(page).getByLabel("Name").fill(second);
  await addForm(page).getByRole("button", { name: "Save", exact: true }).click();
  await expect(business(page, second)).toBeVisible();
  await expect(watchedList(page).getByRole("listitem").getByRole("heading")).toHaveText([first, second]);

  // Edit the first: a new note and a second ad link. It keeps its place.
  await business(page, first).getByRole("button", { name: `Edit ${first}` }).click();
  const editForm = panel(page).getByRole("form", { name: `Edit ${first}` });
  await editForm.getByLabel("Your note (optional)").fill("Their van, and a stall at the market.");
  await editForm.getByRole("button", { name: "+ Add an ad link" }).click();
  await editForm.getByLabel("Ad link 2", { exact: true }).fill("https://example.com/ads/a-2");
  await editForm.getByRole("button", { name: "Save", exact: true }).click();
  await expect(panel(page).getByRole("status")).toContainText("Saved.");
  await expect(business(page, first)).toContainText("Their van, and a stall at the market.");
  await expect(business(page, first)).toContainText(`seen ${today}`);
  await expect(watchedList(page).getByRole("listitem").getByRole("heading")).toHaveText([first, second]);

  // Read the panel with everything in it: no verdict, no count against anything.
  const text = await panel(page).innerText();
  expect(findVerdicts(text)).toEqual([]);
  expect(text).not.toMatch(/\b\d+ of \d+\b/);

  // Kept after a reload, in the order added.
  await page.reload();
  await lookCloser(page, REGION, goalBar(page));
  await expect(watchedList(page).getByRole("listitem").getByRole("heading")).toHaveText([first, second]);

  // Remove the second: asked once more, then gone.
  await business(page, second).getByRole("button", { name: `Remove ${second}` }).click();
  await business(page, second).getByRole("button", { name: "Yes, remove", exact: true }).click();
  await expect(panel(page).getByRole("status")).toContainText("Removed from your list.");
  await expect(watchedList(page).getByRole("listitem").getByRole("heading")).toHaveText([first]);

  // From the step a road marks as opening a business: the same panel, the same list.
  await panel(page).getByRole("button", { name: "Close", exact: true }).click();
  await expect(panel(page)).toHaveCount(0);
  await page.getByRole("button", { name: new RegExp(`^${escape(ownShop.label)}, `) }).click();
  const stepPanel = page.getByRole("region", { name: "Step" });
  await stepPanel.getByRole("button", { name: REGION, exact: true }).click();
  await expect(panel(page)).toBeVisible();
  await expect(watchedList(page).getByRole("listitem").getByRole("heading")).toHaveText([first]);

  // Nothing went anywhere but DotAmi's own server; no link was opened.
  const origin = new URL(page.url()).origin;
  const elsewhere = requests.map((r) => r.url()).filter((url) => !url.startsWith(origin) && !url.startsWith("data:") && !url.startsWith("blob:"));
  expect(elsewhere).toEqual([]);
});

test("today's Alberta road: the panel opens from the goal bar too", async ({ page }) => {
  const ventureId = await saveIdea(page, `Invented — landscape road 0 ${Date.now()}`);
  await page.goto(`/cockpit?venture=${ventureId}`);
  // Saved with no road picked: drawn on the general road, said why (task 28c).
  await expect(goalBar(page)).toContainText(`Map drawn: ${generalRoadV2026.label} · the general road`);
  // From the goal bar's Look closer menu (since 2026-10-17).
  await lookCloser(page, REGION, goalBar(page));
  await expect(panel(page)).toBeVisible();
  await expect(watchedList(page).getByRole("listitem")).toHaveCount(0);
  expect(findVerdicts(await panel(page).innerText())).toEqual([]);
});

test("removing one ad link in the middle keeps the others, each with its own day, on screen and in the file", async ({ page }) => {
  const stamp = Date.now();
  const ventureId = await saveIdea(page, `Invented — landscape ad links ${stamp}`);
  await page.goto(`/cockpit?venture=${ventureId}`);
  // From the goal bar's Look closer menu (since 2026-10-17).
  await lookCloser(page, REGION, goalBar(page));

  // A business with three ad links, each seen on its own day.
  const name = `Invented Shop C ${stamp}`;
  await panel(page).getByRole("button", { name: "+ Add a business" }).click();
  await addForm(page).getByLabel("Name").fill(name);
  for (const n of [1, 2, 3]) {
    await addForm(page).getByRole("button", { name: "+ Add an ad link" }).click();
    await addForm(page).getByLabel(`Ad link ${n}`, { exact: true }).fill(`https://example.com/ads/c-${n}`);
    await addForm(page).getByLabel(`Day you saw ad link ${n}`).fill(`2026-10-0${n}`);
  }
  await addForm(page).getByRole("button", { name: "Save", exact: true }).click();
  await expect(panel(page).getByRole("status")).toContainText("Added to your list.");

  // What the file holds for this idea's list, read straight from the data file. Polled: the status line can
  // already say "Saved." from the edit before, so it doesn't by itself mean this save has landed.
  const kept = () =>
    withE2eDb(async (db) => {
      const rows = await db.watchedBusiness.findMany({ where: { ventureId } });
      return rows.map((r) => (typeof r.adLinks === "string" ? JSON.parse(r.adLinks) : r.adLinks));
    });
  await expect.poll(kept).toEqual([
    [
      { url: "https://example.com/ads/c-1", seenOn: "2026-10-01" },
      { url: "https://example.com/ads/c-2", seenOn: "2026-10-02" },
      { url: "https://example.com/ads/c-3", seenOn: "2026-10-03" },
    ],
  ]);

  // Edit, and remove the second: the third moves up to "Ad link 2" and brings its own link and day with it.
  await business(page, name).getByRole("button", { name: `Edit ${name}` }).click();
  let editForm = panel(page).getByRole("form", { name: `Edit ${name}` });
  await editForm.getByRole("button", { name: "Remove ad link 2", exact: true }).click();
  await expect(editForm.getByLabel("Ad link 3", { exact: true })).toHaveCount(0);
  await expect(editForm.getByLabel("Ad link 1", { exact: true })).toHaveValue("https://example.com/ads/c-1");
  await expect(editForm.getByLabel("Day you saw ad link 1")).toHaveValue("2026-10-01");
  await expect(editForm.getByLabel("Ad link 2", { exact: true })).toHaveValue("https://example.com/ads/c-3");
  await expect(editForm.getByLabel("Day you saw ad link 2")).toHaveValue("2026-10-03");
  await editForm.getByRole("button", { name: "Save", exact: true }).click();
  await expect(panel(page).getByRole("status")).toContainText("Saved.");
  await expect(business(page, name)).not.toContainText("ads/c-2");
  await expect(business(page, name)).toContainText("seen 2026-10-01");
  await expect(business(page, name)).toContainText("seen 2026-10-03");
  await expect.poll(kept).toEqual([
    [
      { url: "https://example.com/ads/c-1", seenOn: "2026-10-01" },
      { url: "https://example.com/ads/c-3", seenOn: "2026-10-03" },
    ],
  ]);

  // A later edit that changes only the first link keeps the other one and its day as they were.
  await business(page, name).getByRole("button", { name: `Edit ${name}` }).click();
  editForm = panel(page).getByRole("form", { name: `Edit ${name}` });
  await editForm.getByLabel("Ad link 1", { exact: true }).fill("https://example.com/ads/c-1b");
  await editForm.getByRole("button", { name: "Save", exact: true }).click();
  await expect(panel(page).getByRole("status")).toContainText("Saved.");
  await expect.poll(kept).toEqual([
    [
      { url: "https://example.com/ads/c-1b", seenOn: "2026-10-01" },
      { url: "https://example.com/ads/c-3", seenOn: "2026-10-03" },
    ],
  ]);
});
