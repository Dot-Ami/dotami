/**
 * S2.5.33's bug 33a in a real browser on the production build: Change on the place row of "What you've told
 * DotAmi" changes this idea's place (the idea count stays 1), and after a move out of Alberta the road written
 * for Alberta stays drawn with its honest line, and no Alberta area or region is shown: not in About this job,
 * not on Your plan. Until 2026-10-23 the Change opened the intake, whose save is always a new idea, so the
 * person ended with two ideas and the first one still in Alberta. The unit side is tests/places-and-programs.spec.ts.
 *
 * PLACE_SHOTS=<folder> saves the cockpit with the box open, and its receipt after Save, at 375, 768 and 1280 wide.
 */
import { mkdirSync } from "node:fs";
import path from "node:path";

import { expect, test, type Page } from "@playwright/test";

import { generalRoadV2026 } from "../lib/engines/roads/v2026";

import { lookCloser, showRail, showRoadAhead } from "./cockpit-calm";

const BARBERS = "63210.02";
const SHOTS = process.env.PLACE_SHOTS ?? null;
const WIDTHS = [375, 768, 1280] as const;

const told = (page: Page) => page.getByRole("region", { name: "What you've told DotAmi" });
const goalBar = (page: Page) => page.getByRole("region", { name: "Your goal and gauges" });
const aboutJob = (page: Page) => page.getByRole("region", { name: "About this job" });
/** A link to one of Alberta's own pages (alberta.ca, the WCB's wcb.ab.ca). */
const ALBERTA_LINKS = 'a[href*="alberta.ca"], a[href*=".ab.ca"]';

/** How many ideas DotAmi keeps, as Your futures lists them. */
async function ideaCount(page: Page): Promise<number> {
  const res = await page.request.get("/api/ventures");
  expect(res.ok()).toBe(true);
  return ((await res.json()) as { ventures: unknown[] }).ventures.length;
}

/** An invented Alberta idea on road 0, kept with a job, Calgary as its area and the Calgary region, as Pick a future keeps one. */
async function albertaIdea(page: Page): Promise<string> {
  const scenario = {
    id: `place-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    profile: {
      name: "Invented — place change test",
      type: "service",
      province: "AB",
      targetRevenueY1: 20_000,
      targetRevenueY3: 60_000,
      structure: "sole-prop",
      structureSource: "assumed",
      employmentStatus: "employee",
      hireFirst: false,
      activityTags: ["Trades"],
      stage: "idea",
    },
    state: { activeBranches: { gstTiming: "stage-2b-mandatory-gst-registration", incorporationTiming: "stage-3a-incorporation-80k-net" } },
  };
  const saved = await page.request.post("/api/scenario/save", {
    data: { scenario, roadId: generalRoadV2026.id, job: BARBERS, area: "cma-825", region: "4830" },
  });
  expect(saved.ok()).toBe(true);
  return ((await saved.json()) as { ventureId: string }).ventureId;
}

test("Change on the place row edits this idea: one idea, Ontario, the Alberta road drawn honestly, no Calgary anywhere", async ({ page }) => {
  const ventureId = await albertaIdea(page);
  const before = await ideaCount(page);
  await page.goto(`/cockpit?venture=${ventureId}`);
  await showRail(page);

  // Before the move: About this job reads the Calgary area the person picked (so the check below can see it).
  await lookCloser(page, "About this job", goalBar(page));
  await expect(aboutJob(page)).toContainText("Your area: Calgary");
  await aboutJob(page).getByRole("button", { name: "Close", exact: true }).click();

  // The place row's Change opens the one-question box in the cockpit, not the intake.
  await told(page).getByRole("button", { name: "Change: you told us your place is Alberta" }).click();
  await expect(page).toHaveURL(/\/cockpit/);
  const box = told(page).getByRole("combobox", { name: "Which province or territory are you in?" });
  await expect(box).toHaveValue("AB");
  await box.selectOption("ON");
  await told(page).getByRole("button", { name: "Save", exact: true }).click();

  // The receipt waits on the save, then says what changed; the row now says Ontario.
  await expect(told(page).getByRole("status")).toContainText("Because you told us your place is Ontario");
  await expect(page.getByText(/^Saved · /)).toBeVisible();
  await expect(told(page).getByText(/^you told us your place is Ontario$/i)).toBeVisible();
  console.log(`RECEIPT: ${(await told(page).getByRole("status").innerText()).replace(/\s+/g, " ")}`);
  expect(await ideaCount(page)).toBe(before);

  // The same idea, its new place, kept; its Alberta area and region kept for a later history, never shown.
  const kept = (await (await page.request.get(`/api/futures/${encodeURIComponent(ventureId)}`)).json()) as {
    future: { place: string; area: unknown; region: unknown };
    aboutJob: { area: string | null; wages: { context: { kind: string } } } | null;
  };
  expect(kept.future.place).toBe("CA-ON");
  expect(kept.future.area).toBeNull();
  expect(kept.future.region).toBeNull();
  expect(kept.aboutJob?.area).toBeNull();
  expect(kept.aboutJob?.wages.context.kind).toBe("outside-alberta");

  // The road written for Alberta stays drawn, and says so (call 35).
  await expect(goalBar(page)).toContainText("written for AB; this idea is in ON");
  // Hire first employee lists no Alberta page now (its WCB-Alberta line rested on one), and counts what it left out:
  // Alberta's and British Columbia's employment-standards pages, and the WCB's (review of #207).
  await showRoadAhead(page);
  await page.getByRole("button", { name: /^Hire first employee, / }).first().click();
  const panel = page.getByRole("region", { name: "Step" });
  // Under the folded sources, so attached rather than visible.
  await expect(panel.getByText("3 sources for other provinces aren't shown.")).toBeAttached();
  await expect(panel).not.toContainText("WCB-Alberta");
  expect(await panel.locator(ALBERTA_LINKS).count()).toBe(0);
  await panel.getByRole("button", { name: "Close node detail panel" }).click();
  // About this job, read again after the save, shows no Alberta area.
  await lookCloser(page, "About this job", goalBar(page));
  await expect(aboutJob(page)).toBeVisible();
  await expect(aboutJob(page)).not.toContainText("Calgary");
  await expect(aboutJob(page)).toContainText("Your area isn't picked.");
  await aboutJob(page).getByRole("button", { name: "Close", exact: true }).click();

  // Your plan: no area or region line, no Calgary.
  await page.goto(`/plan?venture=${encodeURIComponent(ventureId)}`);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  const plan = await page.locator("body").innerText();
  expect(plan).not.toContain("Calgary");
  expect(plan).not.toContain("Your area");
  expect(plan).not.toContain("Your economic region");
  expect(plan).toContain("Ontario");
  // And no Alberta page: not a done-when source, an official link, a source or the Alberta name fee (review of #207).
  expect(await page.locator(ALBERTA_LINKS).count()).toBe(0);
  expect(plan).not.toContain("WCB-Alberta");
  expect(plan).not.toContain("Registry Agent Product Catalogue");
});

/** Changes the idea's place through the told list's place row, and waits for the receipt. */
async function changePlace(page: Page, from: string, to: { code: string; name: string }) {
  await told(page).getByRole("button", { name: `Change: you told us your place is ${from}` }).click();
  await told(page).getByRole("combobox", { name: "Which province or territory are you in?" }).selectOption(to.code);
  await told(page).getByRole("button", { name: "Save", exact: true }).click();
  await expect(told(page).getByRole("status")).toContainText(`Because you told us your place is ${to.name}`);
}

/** Opens Hire first employee (in the road ahead) and returns its panel. */
async function openHire(page: Page) {
  await showRoadAhead(page);
  await page.getByRole("button", { name: /^Hire first employee, / }).first().click();
  return page.getByRole("region", { name: "Step" });
}

test("second review of #207: a tick on a line left out in Ontario survives a tick there, and shows again back in Alberta", async ({ page }) => {
  const ventureId = await albertaIdea(page);
  await page.goto(`/cockpit?venture=${ventureId}`);
  await showRail(page);

  // In Alberta: tick the WCB-Alberta line, and wait for the save to be read back (its receipt, the box free again).
  let panel = await openHire(page);
  const wcb = panel.getByRole("checkbox", { name: /WCB-Alberta/ });
  await wcb.check();
  await expect(panel.getByRole("status")).toBeVisible();
  await expect(wcb).toBeEnabled();
  await panel.getByRole("button", { name: "Close node detail panel" }).click();

  // In Ontario the line isn't drawn; ticking another line there sends only the lines drawn there.
  await changePlace(page, "Alberta", { code: "ON", name: "Ontario" });
  panel = await openHire(page);
  await expect(panel).not.toContainText("WCB-Alberta");
  const beforePay = panel.getByRole("checkbox", { name: /^Before the first pay/ });
  await beforePay.check();
  await expect(panel.getByRole("status")).toBeVisible();
  await expect(beforePay).toBeEnabled();
  await panel.getByRole("button", { name: "Close node detail panel" }).click();

  // Back in Alberta: the WCB-Alberta tick is still there, with the one made in Ontario.
  await changePlace(page, "Ontario", { code: "AB", name: "Alberta" });
  panel = await openHire(page);
  await expect(panel.getByRole("checkbox", { name: /WCB-Alberta/ })).toBeChecked();
  await expect(panel.getByRole("checkbox", { name: /^Before the first pay/ })).toBeChecked();
});

test("control: in Alberta, Your plan links Alberta's own pages, so the check above can see them", async ({ page }) => {
  const ventureId = await albertaIdea(page);
  await page.goto(`/plan?venture=${encodeURIComponent(ventureId)}`);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  expect(await page.locator(ALBERTA_LINKS).count()).toBeGreaterThan(5);
  expect(await page.locator("body").innerText()).toContain("WCB-Alberta");
});

// The step panel the review fix changed: Hire first employee on road 0 after a move to Ontario, its sources opened.
for (const width of WIDTHS) {
  test(`screenshots at ${width} wide: Hire first employee after a move to Ontario`, async ({ page }) => {
    test.skip(!SHOTS, "PLACE_SHOTS not set");
    mkdirSync(SHOTS!, { recursive: true });
    await page.setViewportSize({ width, height: 900 });
    const ventureId = await albertaIdea(page);
    await page.goto(`/cockpit?venture=${ventureId}`);
    if (width < 768) await page.getByRole("button", { name: "Venture details", exact: true }).click();
    else await showRail(page);
    await told(page).getByRole("button", { name: "Change: you told us your place is Alberta" }).click();
    await told(page).getByRole("combobox", { name: "Which province or territory are you in?" }).selectOption("ON");
    await told(page).getByRole("button", { name: "Save", exact: true }).click();
    await expect(told(page).getByRole("status")).toContainText("Because you told us your place is Ontario");
    if (width < 768) await page.keyboard.press("Escape");
    await showRoadAhead(page);
    await page.getByRole("button", { name: /^Hire first employee, / }).first().click();
    const panel = page.getByRole("region", { name: "Step" });
    await panel.locator("summary", { hasText: /Sources for this stage · \d/ }).click();
    const leftOut = panel.getByText("3 sources for other provinces aren't shown.");
    await expect(leftOut).toBeVisible();
    await leftOut.scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(SHOTS!, `hire-first-after-move-ontario-${width}.png`) });
  });
}

// The changed screen for the pull request: the box open, then its receipt, at each width (only with PLACE_SHOTS).
for (const width of WIDTHS) {
  test(`screenshots at ${width} wide: the place box, then its receipt`, async ({ page }) => {
    test.skip(!SHOTS, "PLACE_SHOTS not set");
    mkdirSync(SHOTS!, { recursive: true });
    await page.setViewportSize({ width, height: 900 });
    const ventureId = await albertaIdea(page);
    await page.goto(`/cockpit?venture=${ventureId}`);
    // On a phone the venture details open as a sheet from the header's button; wider, the rail is shown.
    if (width < 768) await page.getByRole("button", { name: "Venture details", exact: true }).click();
    else await showRail(page);
    await told(page).getByRole("button", { name: "Change: you told us your place is Alberta" }).click();
    const box = told(page).getByRole("combobox", { name: "Which province or territory are you in?" });
    await box.scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(SHOTS!, `place-change-box-${width}.png`) });
    await box.selectOption("ON");
    await told(page).getByRole("button", { name: "Save", exact: true }).click();
    const receipt = told(page).getByRole("status");
    await expect(receipt).toContainText("Because you told us your place is Ontario");
    await receipt.scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(SHOTS!, `place-change-receipt-${width}.png`) });
  });
}

// The step panel whose sources changed (a-call-12): Hire first employee on road 0 in Alberta, its sources opened.
for (const width of WIDTHS) {
  test(`screenshots at ${width} wide: Hire first employee's sources in Alberta`, async ({ page }) => {
    test.skip(!SHOTS, "PLACE_SHOTS not set");
    mkdirSync(SHOTS!, { recursive: true });
    await page.setViewportSize({ width, height: 900 });
    const ventureId = await albertaIdea(page);
    await page.goto(`/cockpit?venture=${ventureId}`);
    // Hire first employee is in Tier 3, in the road ahead, folded on a first visit.
    await showRoadAhead(page);
    await page.getByRole("button", { name: /^Hire first employee, / }).first().click();
    const panel = page.getByRole("region", { name: "Step" });
    await panel.locator("summary", { hasText: /Sources for this stage · \d/ }).click();
    const leftOut = panel.getByText("2 sources for other provinces aren't shown.");
    await expect(leftOut).toBeVisible();
    await expect(panel.locator('a[href="https://www.alberta.ca/employment-standards"]')).toBeVisible();
    await leftOut.scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(SHOTS!, `hire-first-sources-alberta-${width}.png`) });
  });
}
