/**
 * "Keep your records from day one" (2026-10-14, docs/engines/roads.md) in a real browser against the
 * production build: the cockpit draws the step on both business roads, its panel shows its cited lines
 * and says how they were checked, and its colour comes from the road: on your road for every idea on
 * today's Alberta road; on the apprentice road, waiting on the fork until the person picks their own shop.
 */
import path from "node:path";

import type { PrismaClient } from "@prisma/client";
import { expect, test, type Page } from "@playwright/test";

import { createDatabaseClient } from "../lib/db/client";
import { generalRoadV2026, roadApprenticeToOwnShopAB } from "../lib/engines/roads/v2026";

import { lookCloser, showRoadAhead } from "./cockpit-calm";

const LABEL = "Keep your records from day one";
const road0Step = generalRoadV2026.steps.find((s) => s.id === "step-start-keep-records")!;

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
    id: `records-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
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

const card = (page: Page) => page.getByRole("button", { name: new RegExp(`^${LABEL}, `) });
const stepPanel = (page: Page) => page.getByRole("region", { name: "Step" });
const compare = (page: Page) => page.getByRole("region", { name: "Compare the two endings" });

test("today's Alberta road: the records step is drawn in the first column, on your road, with its cited lines", async ({ page }) => {
  const ventureId = await saveIdea(page, "Invented — records on road 0");
  await page.goto(`/cockpit?venture=${ventureId}`);

  const tier1 = page.locator("section").filter({ has: page.getByText("Tier 1", { exact: true }) });
  await expect(tier1.getByRole("heading", { level: 4 }).last()).toHaveText(LABEL);
  // Road evaluation reads it as on the road (no rule colours it): "applies as answered", never "no rule yet".
  await expect(card(page)).toHaveAccessibleName(`${LABEL}, ahead, applies as answered, opens detail`);

  await card(page).click();
  const panel = stepPanel(page);
  await expect(panel.getByRole("heading", { name: LABEL })).toBeVisible();
  for (const line of road0Step.doneWhen) await expect(panel.getByText(line.text, { exact: true })).toBeVisible();
  // Its sources say how each was checked: the where-and-how-long page, which the maintainer read in full on
  // 2026-10-25, says so (since 2026-10-27; until then every source here was a tool's check only); the other page
  // still says a tool checked it on the day and that no person has read it.
  await expect(panel.getByText(/Checked by a tool on 2026-10-14/).first()).toBeVisible();
  await expect(panel.getByText(/Not read by a person yet\./).first()).toBeVisible();
  await expect(panel.getByText(/Read by a person on 2026-10-25/).first()).toBeVisible();
  await expect(panel.getByText(/Read by a person on (?!2026-10-25)/)).toHaveCount(0);
});

test("the apprentice road: the records step waits on the fork, then is on your road once you pick your own shop", async ({ page }) => {
  const road = roadApprenticeToOwnShopAB;
  const ventureId = await saveIdea(page, "Invented — records on the apprentice road");
  await withE2eDb((db) => db.venture.update({ where: { id: ventureId }, data: { roadId: road.id, roadChosenAt: new Date() } }));
  await page.goto(`/cockpit?venture=${ventureId}`);
  // Its column, Open the doors, is in the road ahead, folded on a first visit (2026-10-17).
  await showRoadAhead(page);

  await expect(card(page)).toHaveAccessibleName(/check first/);

  // Pick "Open your own shop" through Compare's "This is mine", as a person would.
  await lookCloser(page, "Compare the two endings");
  await compare(page).getByRole("button", { name: "This is mine" }).nth(1).click();
  await expect(compare(page).getByRole("button", { name: "This is mine" }).nth(1)).toHaveAttribute("aria-pressed", "true");
  await expect(card(page)).toHaveAccessibleName(/applies as answered/);
});
