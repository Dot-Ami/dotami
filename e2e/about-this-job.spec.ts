/**
 * *About this job* (task 25h; docs/ui-spec/cockpit/about-this-job.md), in a real browser on the production build:
 * the panel the goal bar's *Look closer* menu opens in the right-hand slot once the person has picked a job,
 * read the way the screen checks read every screen.
 *
 * - Cabinetmakers on the apprentice road in Alberta: the item is the menu's last panel item (the job has a
 *   written road), the four rows stand in their fixed order, the government's four lines are quoted under their
 *   lead line, the wage row is Alberta's own (no region is kept yet) with its level, period and the fixed line,
 *   the three links are the sites' own general pages, focus moves to the heading and back to *Look closer*.
 * - Athletes (53200) on road 0: the item comes first (no written road for the job), and the one requirement line
 *   `findVerdicts` catches shows in quote marks under its lead line, where its allowance lifts it; the same line
 *   out of the quote is caught (the control).
 * - In Ontario: the row for Ontario as a whole, said why, and no Tradesecrets.
 * - On every screen of it: no verdict, and no time in DotAmi's words (the quoted lines lifted only on the rules
 *   row and only as the lines the shipped file holds for the group); nothing leaves the computer.
 *
 * Screenshots at 375, 768 and 1280 px are attached to the run, and saved to `ABOUT_JOB_SHOTS` when it names a
 * folder (how the pull request's pictures in docs/media/phase-2/ were made).
 */
import { copyFileSync, mkdirSync } from "node:fs";
import path from "node:path";

import type { PrismaClient } from "@prisma/client";
import { expect, test, type Locator, type Page, type Request, type TestInfo } from "@playwright/test";

import { createDatabaseClient } from "../lib/db/client";
import { nocRequirements } from "../lib/engines/noc/v2021";
import { generalRoadV2026, roadApprenticeToOwnShopAB } from "../lib/engines/roads/v2026";
import { REQUIREMENT_LINES_PLACE } from "../tests/helpers/official-quotes";
import { findTimeWords } from "../tests/helpers/time-words";
import { OFFICIAL_QUOTE_ALLOWANCES, findVerdicts } from "../tests/helpers/verdict-words";

import { lookCloser, lookCloserItems, pickJob } from "./cockpit-calm";

const REGION = "About this job";
const goalBar = (page: Page) => page.getByRole("region", { name: "Your goal and gauges" });
const panel = (page: Page) => page.getByRole("region", { name: REGION });
const row = (page: Page, id: "rules" | "wages" | "counts" | "links") => panel(page).locator(`[data-about-row="${id}"]`);

/** The run's own data file, to put an idea on a written road the way Pick a future does. */
async function withE2eDb<T>(fn: (db: PrismaClient) => Promise<T>): Promise<T> {
  const file = path.join(process.cwd(), "prisma", "e2e", "dotami.db").split(path.sep).join("/");
  const db = createDatabaseClient({ url: `file:${file}` });
  try {
    return await fn(db);
  } finally {
    await db.$disconnect();
  }
}

/** An invented idea, saved the way the intake saves one, on a written future; returns the cockpit's address. */
async function saveIdea(page: Page, name: string, province: "AB" | "ON", roadId: string): Promise<string> {
  const scenario = {
    id: `about-job-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    profile: {
      name,
      type: "service",
      province,
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
  const { ventureId } = (await saved.json()) as { ventureId: string };
  // The road, as Pick a future keeps it, so the cockpit opens on it (as e2e/landscape.spec.ts does).
  await withE2eDb((db) => db.venture.update({ where: { id: ventureId }, data: { roadId, roadChosenAt: new Date() } }));
  return `/cockpit?venture=${ventureId}`;
}

/** The text of a part of the panel as drawn (what a person sees), spaces made one. */
const textOf = async (part: Locator) => (await part.innerText()).replace(/\s+/g, " ").trim();

/** What the screen checks find in the open panel: verdicts anywhere, time words outside the rules row's quote. */
async function findingsIn(page: Page, group: string): Promise<string[]> {
  const found: string[] = [];
  for (const v of findVerdicts(await panel(page).innerText())) found.push(`verdict: ${v}`);
  const read = [{ kind: "noc-employment-requirements" as const, group, lines: nocRequirements(group) }];
  for (const t of findTimeWords(await row(page, "rules").innerText(), [], { where: `cockpit › ${REQUIREMENT_LINES_PLACE}`, read })) {
    found.push(`time (rules): ${t}`);
  }
  for (const part of ["wages", "counts", "links"] as const) for (const t of findTimeWords(await row(page, part).innerText())) found.push(`time (${part}): ${t}`);
  // The kicker, the heading and the footer: everything in the panel outside its four rows.
  const outside = await panel(page).evaluate((el) => {
    const copy = el.cloneNode(true) as HTMLElement;
    copy.querySelectorAll("[data-about-row]").forEach((r) => r.remove());
    return copy.innerText ?? copy.textContent ?? "";
  });
  for (const t of findTimeWords(outside)) found.push(`time (around the rows): ${t}`);
  return found;
}

/** Screenshots of the open panel at the three widths, attached, and copied to ABOUT_JOB_SHOTS when set. */
async function shots(page: Page, testInfo: TestInfo, name: string, open: () => Promise<void>) {
  for (const width of [375, 768, 1280]) {
    await page.setViewportSize({ width, height: width === 375 ? 812 : width === 768 ? 1024 : 720 });
    await open();
    await page.evaluate(() => document.fonts.ready);
    const file = testInfo.outputPath(`${name}-${width}.png`);
    await page.screenshot({ path: file });
    await testInfo.attach(`${name}-${width}.png`, { path: file, contentType: "image/png" });
    const into = process.env.ABOUT_JOB_SHOTS;
    if (into) {
      mkdirSync(into, { recursive: true });
      copyFileSync(file, path.join(into, `${name}-${width}.png`));
    }
  }
  await page.setViewportSize({ width: 1280, height: 720 });
}

/** Every request the page makes from here on that goes anywhere but DotAmi's own server. */
function watchRequests(page: Page): () => string[] {
  const requests: Request[] = [];
  page.on("request", (r) => requests.push(r));
  return () => requests.map((r) => r.url()).filter((url) => !/^(http:\/\/127\.0\.0\.1:\d+\/|data:|blob:)/.test(url));
}

test("Cabinetmakers on the apprentice road: the four rows in order, the government's words quoted, Alberta's wage row, three general pages", async ({ page }, testInfo) => {
  const cockpit = await saveIdea(page, `Invented — about this job ${Date.now()}`, "AB", roadApprenticeToOwnShopAB.id);
  const outside = watchRequests(page);
  await page.goto(cockpit);

  // No job picked: the menu has no About this job.
  expect(await lookCloserItems(page, goalBar(page))).not.toContain(REGION);
  await pickJob(page, "Cabinetmakers", "72311.00");

  // A job with a written road: the menu's last panel item, after Others in this line of work.
  const items = await lookCloserItems(page, goalBar(page));
  expect(items.indexOf(REGION)).toBe(items.indexOf("Others in this line of work") + 1);
  await lookCloser(page, REGION, goalBar(page));
  await expect(panel(page)).toBeVisible();
  // Focus moves to the panel's heading.
  await expect(panel(page).getByRole("heading", { level: 2, name: REGION })).toBeFocused();

  await expect(panel(page)).toContainText("Cabinetmakers · 72311.00 · your pick of job");
  // The rows, in their fixed order, each a level 3 heading.
  await expect(panel(page).getByRole("heading", { level: 3 })).toHaveText([
    "Employment requirements",
    "Wages published for this job group",
    "Business counts",
    "Where to look yourself",
  ]);

  // 1. The government's four lines, word for word, each in its own quote marks inside one block quote, after
  // the lead line that says whose words they are.
  const rules = row(page, "rules");
  await expect(rules).toContainText("The government's words, quoted in full for job group 72311 Cabinetmakers:");
  const quote = rules.locator("blockquote[data-official-quote]");
  await expect(quote.locator("p")).toHaveText(nocRequirements("72311").map((line) => `“${line.trim()}”`));
  // The file's double space before "or" is kept as written.
  expect(await quote.locator("p").nth(1).textContent()).toContain("program  or A combination");
  await expect(rules).toContainText("Statistics Canada, National Occupational Classification 2021 Version 1.0, Employment requirements, read 2026-10-15.");

  // 2. Alberta's own row (no region is kept yet), labelled by its source code, with the fixed lines.
  const wages = row(page, "wages");
  expect(await textOf(wages)).toBe(
    [
      "Wages published for this job group",
      "Your region isn't picked.",
      "Alberta-wide figure",
      "Hourly · low $18.00 · median $23.00 · high $30.00",
      "Reference period 2023-2024 · Employment Insurance Survey Data",
      "Low is in most cases the 10th percentile and high the 90th, as Job Bank's method page says.",
      "What workers in this job group were paid. Not what a shop earns, and not what you would earn.",
      "Job Bank wage file 2025, revised 2025-11-19. Contains information licensed under the Open Government Licence – Canada.",
    ].join(" "),
  );

  // 3. No business counts in this version, said so.
  await expect(row(page, "counts")).toContainText("Not in this version.");
  await expect(row(page, "counts")).toContainText("Your area isn't picked.");

  // 4. The job's name and code as text to copy; three general pages, none carrying the job or the person.
  const links = row(page, "links");
  await expect(links).toContainText("Cabinetmakers · 72311.00 · NOC 72311");
  const anchors = links.getByRole("link");
  await expect(anchors).toHaveCount(3);
  const hrefs = await anchors.evaluateAll((as) => as.map((a) => [a.getAttribute("href"), a.getAttribute("target"), a.getAttribute("rel")]));
  expect(hrefs).toEqual([
    ["https://www.jobbank.gc.ca/trend-analysis/search-wages", "_blank", "noopener noreferrer"],
    ["https://bizpal.ca/", "_blank", "noopener noreferrer"],
    ["https://tradesecrets.alberta.ca/trades-in-alberta/profiles/", "_blank", "noopener noreferrer"],
  ]);
  await expect(anchors.first()).toHaveAccessibleName("Job Bank: Search wages, opens in your browser");
  await expect(panel(page)).toContainText("What the government publishes about this job, side by side. Nothing here says whether it fits you.");

  expect(await findingsIn(page, "72311")).toEqual([]);

  // Close puts focus back on Look closer, and the panel is gone.
  await panel(page).getByRole("button", { name: "Close" }).click();
  await expect(panel(page)).toHaveCount(0);
  await expect(goalBar(page).getByRole("button", { name: "Look closer" })).toBeFocused();
  expect(outside()).toEqual([]);

  await shots(page, testInfo, "about-this-job-cabinetmakers", async () => {
    await page.goto(cockpit);
    await lookCloser(page, REGION);
    await expect(panel(page)).toBeVisible();
  });
});

test("Athletes (53200) on road 0: the item comes first, and the allowed requirement line shows only inside its labelled quote", async ({ page }) => {
  const cockpit = await saveIdea(page, `Invented — about this job, athletes ${Date.now()}`, "AB", generalRoadV2026.id);
  await page.goto(cockpit);
  await pickJob(page, "Athletes", "53200.00");

  // No road is written for the job: About this job is the menu's first item.
  expect((await lookCloserItems(page, goalBar(page)))[0]).toBe(REGION);
  await lookCloser(page, REGION, goalBar(page));
  await expect(panel(page)).toBeVisible();

  const athletes = OFFICIAL_QUOTE_ALLOWANCES.find((a) => a.sourceKind === "noc-employment-requirements")!;
  await expect(row(page, "rules")).toContainText("The government's words, quoted in full for job group 53200 Athletes:");
  await expect(row(page, "rules").locator("blockquote p", { hasText: athletes.text })).toHaveText(`“${athletes.text}”`);
  expect(await findingsIn(page, "53200")).toEqual([]);

  // The control: the same sentence on the same screen, out of the quote, is caught.
  await row(page, "counts").evaluate((el, text) => {
    const line = document.createElement("p");
    line.textContent = text;
    el.append(line);
  }, athletes.text);
  expect((await findingsIn(page, "53200")).some((f) => f.startsWith("verdict: "))).toBe(true);
});

test("in Ontario: the row for Ontario as a whole, why it is that row, and no Tradesecrets", async ({ page }, testInfo) => {
  const cockpit = await saveIdea(page, `Invented — about this job, Ontario ${Date.now()}`, "ON", generalRoadV2026.id);
  await page.goto(cockpit);
  await pickJob(page, "Cabinetmakers", "72311.00");
  await lookCloser(page, REGION, goalBar(page));
  await expect(panel(page)).toBeVisible();

  const wages = row(page, "wages");
  await expect(wages).toContainText(
    "DotAmi asks your region only in Alberta for now, so this is the row the wage file gives for Ontario as a whole, with the level its own code gives it.",
  );
  await expect(wages.locator("[data-wage-row]")).toHaveAttribute("data-wage-row", "ER35");
  await expect(wages).not.toContainText(/province-wide/i);
  await expect(row(page, "links").getByRole("link")).toHaveCount(2);
  await expect(row(page, "links")).toContainText("Tradesecrets is Alberta's trade list, so it isn't listed for Ontario.");
  expect(await findingsIn(page, "72311")).toEqual([]);

  await shots(page, testInfo, "about-this-job-ontario", async () => {
    await page.goto(cockpit);
    await lookCloser(page, REGION);
    await expect(panel(page)).toBeVisible();
  });
});
