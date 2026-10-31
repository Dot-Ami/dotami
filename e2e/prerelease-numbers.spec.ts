/**
 * The pre-release fixes of 2026-10-23 for numbers and amounts, in the browser (tests/prerelease-numbers.spec.ts
 * has the unit checks and their planted controls):
 *
 * - Export is the road on screen: on the apprentice road the panel holds every one of its 17 steps.
 * - Compare's "Rules and tax cards" row and the Rules & tax switch say the same count.
 * - The money gauge names the fees that wait on the fork, which make Compare's total.
 * - About this job says "as published" beside Ontario bakers' equal low and median.
 *
 * NUMBERS_SHOTS=<folder> also saves the changed screens at 375, 768 and 1280 wide.
 */
import { mkdirSync } from "node:fs";
import path from "node:path";

import { expect, test, type Page } from "@playwright/test";

import { cockpitWords } from "../lib/cockpit/words";
import { generalRoadV2026, roadApprenticeToOwnShopAB, roadFederalStepsCA } from "../lib/engines/roads/v2026";

import { saveIdea } from "./about-job-read";
import { cockpitSettled, lookCloser, overlayOn, pickJob, showRoadAhead } from "./cockpit-calm";

const SHOTS = process.env.NUMBERS_SHOTS ?? null;
const WIDTHS = [375, 768, 1280] as const;
const FORK = roadApprenticeToOwnShopAB.forks[0]!;

const goalBar = (page: Page) => page.getByRole("region", { name: "Your goal and gauges" });
const gauge = (page: Page, name: string) => goalBar(page).getByRole("button", { name: new RegExp(`^${name}`) });
const compare = (page: Page) => page.getByRole("region", { name: cockpitWords.compare.region });
const rulesSwitch = (page: Page) => page.getByRole("group", { name: "Overlays" }).getByRole("button", { name: /^Rules & tax/ });

async function apprenticeIdea(page: Page): Promise<string> {
  return saveIdea(page, `Invented — numbers test ${Date.now()}`, "AB", roadApprenticeToOwnShopAB.id);
}

test("Export on the apprentice road holds every step on screen", async ({ page }) => {
  await page.goto(await apprenticeIdea(page));
  await cockpitSettled(page);
  await page.getByRole("button", { name: "Export", exact: true }).click();
  const markdown = page.locator("pre");
  await expect(markdown).toContainText(`road: ${roadApprenticeToOwnShopAB.id}`);
  const text = await markdown.innerText();
  const labels = roadApprenticeToOwnShopAB.columns.flatMap((c) => c.steps).map((id) => roadApprenticeToOwnShopAB.steps.find((s) => s.id === id)!.label);
  expect(labels).toHaveLength(17);
  expect(labels.filter((label) => !text.includes(`### ${label}\n`))).toEqual([]);
  // Not the tax map's stages, which this road doesn't draw.
  expect(text).not.toContain("Stage 0 — Baseline");
});

test("Compare and the Rules & tax switch agree, and the money gauge names the fees waiting on the fork", async ({ page }) => {
  await page.goto(await apprenticeIdea(page));
  await cockpitSettled(page);
  await expect(rulesSwitch(page)).toContainText("0 cards");
  await expect(gauge(page, "Start-up money")).toContainText("$1,070 official fees (5 lines)");
  await expect(gauge(page, "Start-up money")).toContainText(`wait on a pick at “${FORK.label}”, 2 official fees among them ($150)`);
  await lookCloser(page, "Compare the two endings", goalBar(page));
  await expect(compare(page)).toBeVisible();
  const cards = compare(page).getByRole("row", { name: /^Rules and tax cards/ });
  await expect(cards).toContainText("0 apply · 0 check first");
  await expect(cards).not.toContainText("2 apply");
  await expect(compare(page).getByRole("row", { name: /^Official fees/ }).first()).toContainText("$1,220");
});

test("About this job: Ontario bakers' equal low and median say 'as published'", async ({ page }) => {
  await page.goto(await saveIdea(page, `Invented — baker test ${Date.now()}`, "ON", roadFederalStepsCA.id));
  await pickJob(page, "Bakers", "63202.00");
  await lookCloser(page, "About this job", goalBar(page));
  const panel = page.getByRole("region", { name: "About this job" });
  await expect(panel).toContainText("low and median the same, as published");
});

// The changed screens for the pull request (only with NUMBERS_SHOTS), one test per screen and width.
async function sized(page: Page, width: number) {
  test.skip(!SHOTS, "NUMBERS_SHOTS not set");
  test.setTimeout(120_000);
  mkdirSync(SHOTS!, { recursive: true });
  await page.setViewportSize({ width, height: 900 });
}
const shot = (page: Page, name: string, width: number) => page.screenshot({ path: path.join(SHOTS!, `numbers-${name}-${width}.png`) });

/** An invented Alberta idea on road 0 that hires first and buys equipment, so the vehicle and loan cards light. */
async function roadZeroIdea(page: Page): Promise<string> {
  const scenario = {
    id: `numbers-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    profile: {
      name: "Invented — vehicle and loan cards",
      type: "service",
      province: "AB",
      targetRevenueY1: 40_000,
      targetRevenueY3: 120_000,
      structure: "sole-prop",
      structureSource: "assumed",
      employmentStatus: "self-employed",
      hireFirst: true,
      capitalPurchasePlanned: true,
      activityTags: ["Trades"],
      stage: "idea",
    },
    state: { activeBranches: { gstTiming: "stage-2b-mandatory-gst-registration", incorporationTiming: "stage-3a-incorporation-80k-net" } },
  };
  const saved = await page.request.post("/api/scenario/save", { data: { scenario, roadId: generalRoadV2026.id } });
  expect(saved.ok()).toBe(true);
  return `/cockpit?venture=${((await saved.json()) as { ventureId: string }).ventureId}`;
}

for (const width of WIDTHS) {
  test(`screenshots at ${width} wide: Export, the money gauge and Compare on the apprentice road`, async ({ page }) => {
    await sized(page, width);
    await page.goto(await apprenticeIdea(page));
    await cockpitSettled(page);
    await page.getByRole("button", { name: "Export", exact: true }).click();
    await expect(page.locator("pre")).toContainText(`road: ${roadApprenticeToOwnShopAB.id}`);
    await shot(page, "export", width);
    await page.getByRole("button", { name: "Close playbook panel" }).click();
    await gauge(page, "Start-up money").scrollIntoViewIfNeeded();
    await shot(page, "money-gauge", width);
    await lookCloser(page, "Compare the two endings", goalBar(page));
    await compare(page).getByRole("row", { name: /^Rules and tax cards/ }).scrollIntoViewIfNeeded();
    await shot(page, "compare", width);
  });

  test(`screenshots at ${width} wide: About this job for Ontario bakers`, async ({ page }) => {
    await sized(page, width);
    const cockpit = await saveIdea(page, `Invented — baker shots ${Date.now()}`, "ON", roadFederalStepsCA.id);
    await page.goto(cockpit);
    await pickJob(page, "Bakers", "63202.00");
    // Opened fresh, so the skills list's sheet isn't over the goal bar on a phone.
    await page.goto(cockpit);
    await cockpitSettled(page);
    await lookCloser(page, "About this job", goalBar(page));
    const same = page.getByRole("region", { name: "About this job" }).getByText(/the same, as published/);
    await same.scrollIntoViewIfNeeded();
    await shot(page, "about-this-job", width);
  });

  test(`screenshots at ${width} wide: the vehicle write-off's panel on road 0`, async ({ page }) => {
    await sized(page, width);
    await page.goto(await roadZeroIdea(page));
    await cockpitSettled(page);
    await showRoadAhead(page);
    await overlayOn(page, "Rules & tax");
    await page.getByRole("button", { name: /^Write-off: Motor vehicle expenses, / }).first().click();
    await page.locator("#cockpit-panel").getByRole("button", { name: "Show details for Motor vehicle expenses" }).click();
    // The card's panel draws its sources, the new s.7307 one among them: with the words a tool found until the
    // maintainer's read of the page (2026-10-25) was recorded, and "Read by a person on 2026-10-25" since 2026-10-27.
    const text = page.locator("#cockpit-panel").locator('a[href$="/section-7307.html"]').first();
    await text.scrollIntoViewIfNeeded();
    await shot(page, "vehicle", width);
  });
}
