/**
 * Your plan (docs/ui-spec/plan/_index.md, issue #41), in a real browser against the production build:
 * open an idea's cockpit, tick a "done when" line, open the plan from Export, read its sections, press
 * Print, and lay it out for paper (print media): no bar, no footer, a new page per section, links as
 * their addresses, and no request to anywhere but DotAmi's own server.
 */
import path from "node:path";

import type { PrismaClient } from "@prisma/client";
import { expect, test, type Page } from "@playwright/test";

import { createDatabaseClient } from "../lib/db/client";
import { cockpitWords as words } from "../lib/cockpit/words";
import { generalRoadV2026, roadsV2026 } from "../lib/engines/roads/v2026";
import { formatMoney } from "../lib/format/money-and-months";
import { answer } from "../lib/roads/words";

/** The run's own data file, to draw the idea on the first written future (as e2e/cockpit.spec.ts does). */
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
    id: `plan-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
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
      activityTags: ["Trades"],
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

// The first written future: a road with "done when" lines, official fees and named cost lines.
const road = roadsV2026.find(
  (r) =>
    r.id !== generalRoadV2026.id &&
    r.steps.some((s) => s.doneWhen.length > 0) &&
    r.steps.some((s) => s.costs.some((c) => c.kind === "official-fee")) &&
    r.steps.some((s) => s.costs.some((c) => c.kind === "named")),
);

test("an idea's plan: opened from Export, every section there, Print, and laid out for paper", async ({ page, baseURL }) => {
  test.skip(!road, "No shipped road has done-when lines, an official fee and a named cost line yet.");
  const r = road!;
  const ventureId = await saveIdea(page, "Invented — plan test");
  await withE2eDb((db) => db.venture.update({ where: { id: ventureId }, data: { roadId: r.id, roadChosenAt: new Date() } }));
  const lineStep = r.steps.find((s) => s.doneWhen.length > 0)!;
  const line = lineStep.doneWhen[0]!;
  const fee = r.steps.flatMap((s) => s.costs).find((c) => c.kind === "official-fee")!;
  const named = r.steps.flatMap((s) => s.costs).find((c) => c.kind === "named")!;

  // In the cockpit: tick one "done when" line, then open the plan from Export.
  await page.goto(`/cockpit?venture=${ventureId}`);
  await page.getByRole("button", { name: new RegExp(`^${lineStep.label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}, `) }).click();
  const box = page.getByRole("region", { name: "Step" }).getByRole("checkbox", { name: line.text });
  await box.check();
  await expect(page.getByRole("region", { name: "Step" }).getByText(`1 of ${lineStep.doneWhen.length} ticked`)).toBeVisible();
  await page.getByRole("button", { name: "Export", exact: true }).click();

  // Every request the plan page makes, from here on: none may leave DotAmi's own server.
  const requests: string[] = [];
  page.on("request", (request) => requests.push(request.url()));
  await page.getByRole("link", { name: new RegExp(`^${words.plan.open}`) }).click();
  await expect(page).toHaveURL(new RegExp(`/plan\\?venture=${ventureId}$`));

  // The heading and the seven sections, in order.
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Invented — plan test");
  const s = words.plan.sections;
  await expect(page.getByRole("heading", { level: 2 })).toHaveText([s.words, s.road, s.steps, s.skills, s.money, s.told, s.notAdvice]);
  const section = (name: string) => page.getByRole("region", { name });

  // The road and who picked it; the ticked line, marked; the cost lines in their kinds; the told list; the standing line.
  await expect(section(s.road)).toContainText(words.goal.future(r.label));
  await expect(section(s.steps).getByText(`${line.text} (${words.plan.ticked})`)).toBeVisible();
  await expect(section(s.money)).toContainText(fee.label);
  await expect(section(s.money)).toContainText(formatMoney(fee.amountCents));
  const blank = section(s.money).getByRole("listitem").filter({ hasText: named.label }).first();
  await expect(blank).toContainText(words.plan.costKind["named-not-priced"]);
  await expect(blank).not.toContainText("$0");
  await expect(section(s.told)).not.toContainText(words.told.none);
  // The tick made in the cockpit is a row of the told list, in the list's own words.
  const ticks = answer.ticks(lineStep.label, 1, lineStep.doneWhen.length).said;
  await expect(section(s.told)).toContainText(`${ticks.charAt(0).toUpperCase()}${ticks.slice(1)}`);
  await expect(section(s.notAdvice)).toContainText(words.plan.notAdvice);
  // The standing line is in the heading too, so the first page carries it.
  await expect(page.locator("article header")).toContainText(words.plan.notAdvice);

  // Print calls the browser's own print window (stubbed here: a test can't press the system dialog's buttons).
  await page.evaluate(() => {
    (window as unknown as { printed: number }).printed = 0;
    window.print = () => {
      (window as unknown as { printed: number }).printed += 1;
    };
  });
  await page.getByRole("button", { name: words.plan.print, exact: true }).click();
  expect(await page.evaluate(() => (window as unknown as { printed: number }).printed)).toBe(1);

  // On paper: the bar and the app's footer are gone, the sheet is white, each section after the first
  // starts a new page, and each printed link's text is its address.
  await page.emulateMedia({ media: "print" });
  await expect(page.getByRole("link", { name: words.plan.back })).toBeHidden();
  await expect(page.getByRole("button", { name: words.plan.print, exact: true })).toBeHidden();
  await expect(page.getByRole("contentinfo")).toBeHidden();
  await expect(page.getByRole("heading", { level: 2 }).first()).toBeVisible();
  await expect(page.locator("article header").getByText(words.plan.notAdvice)).toBeVisible();
  const breaks = await page.locator("section").evaluateAll((sections) => sections.map((el) => getComputedStyle(el).breakBefore));
  expect(breaks).toEqual(["auto", "page", "page", "page", "page", "page", "page"]);
  expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe("rgb(255, 255, 255)");
  const links = await page.locator("article a[href^='http']").evaluateAll((as) => as.map((a) => [a.getAttribute("href"), a.textContent]));
  expect(links.length).toBeGreaterThan(0);
  for (const [href, text] of links) expect(text).toBe(href);

  // Nothing but DotAmi's own server was asked for anything.
  expect(requests.length).toBeGreaterThan(0);
  expect(requests.filter((url) => !url.startsWith(baseURL!))).toEqual([]);
});

test("every other page keeps the app's not-advice footer on paper: only the plan, which prints its own line, drops it", async ({ page }) => {
  const ventureId = await saveIdea(page, "Invented — footer test");
  for (const address of [`/cockpit?venture=${ventureId}`, "/ventures", "/your-data"]) {
    await page.emulateMedia({ media: "screen" });
    await page.goto(address);
    await page.emulateMedia({ media: "print" });
    const footer = page.getByRole("contentinfo");
    await expect(footer, address).toBeVisible();
    await expect(footer, address).toContainText("not legal or tax advice");
  }
  // The control: on the plan the footer is gone on paper and the plan's own line is there instead.
  await page.goto(`/plan?venture=${ventureId}`);
  await expect(page.getByRole("contentinfo")).toBeHidden();
  await expect(page.locator("article header").getByText(words.plan.notAdvice)).toBeVisible();
});

test("a plan for an idea DotAmi doesn't keep says so, and offers every saved idea", async ({ page }) => {
  await page.goto("/plan?venture=no-such-idea");
  await expect(page.getByText(words.plan.notFound)).toBeVisible();
  await expect(page.getByRole("link", { name: words.allFutures })).toHaveAttribute("href", "/ventures");
});
