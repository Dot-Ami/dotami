/**
 * The invented example future, in a real browser on the production build (docs/ui-spec/example/_index.md;
 * docs/architecture/future-cockpit.md § 1, "The example future as built"): the front door's third door
 * opens Mara's cockpit, read-only, under a banner that never folds.
 *
 * The proof that nothing is saved is taken three ways, before and after clicking Keep and Export (the two
 * save controls that answer in the banner instead of being disabled): the data file's row counts in every
 * table, both kinds of browser storage, and the requests the page sent (none may write, and none may go to
 * DotAmi's API but the law-text route). Every other control in the ui-spec's table is checked to be
 * disabled, and the requests and storage are checked again after reaching each of them.
 */
import path from "node:path";

import type { PrismaClient } from "@prisma/client";
import { expect, test, type Page, type Request } from "@playwright/test";

import { cockpitWords } from "../lib/cockpit/words";
import { createDatabaseClient } from "../lib/db/client";
import { roadApprenticeToOwnShopAB } from "../lib/engines/roads/v2026";
import { MARA_SOURCES } from "../lib/examples/mara-sources";
import { priceSummary } from "../lib/examples/stats";
import { waitForReact } from "../tests/helpers/react-ready";
import { FRAMING, VERDICT } from "../tests/helpers/verdict-words";

const BANNER = "Mara is invented; the prices and statistics are real, from the sources listed, seen on 2026-10-14. Nothing here is saved.";
const CANT_KEEP = "This is an example. Start your own to keep anything.";
const road = roadApprenticeToOwnShopAB;

async function withE2eDb<T>(fn: (db: PrismaClient) => Promise<T>): Promise<T> {
  const file = path.join(process.cwd(), "prisma", "e2e", "dotami.db").split(path.sep).join("/");
  const db = createDatabaseClient({ url: `file:${file}` });
  try {
    return await fn(db);
  } finally {
    await db.$disconnect();
  }
}

/** Rows in every table of the data file (Prisma's own migrations table aside), by table. */
function rowCounts(): Promise<Record<string, number>> {
  return withE2eDb(async (db) => {
    const tables = await db.$queryRawUnsafe<{ name: string }[]>(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name <> '_prisma_migrations' ORDER BY name",
    );
    const counts: Record<string, number> = {};
    for (const { name } of tables) {
      const [row] = await db.$queryRawUnsafe<{ n: bigint | number }[]>(`SELECT COUNT(*) AS n FROM "${name}"`);
      counts[name] = Number(row.n);
    }
    return counts;
  });
}

/** Everything in this page's localStorage and sessionStorage, as text. */
const storage = (page: Page) =>
  page.evaluate(() => {
    const dump = (s: Storage) => Object.fromEntries(Array.from({ length: s.length }, (_, i) => s.key(i)!).map((k) => [k, s.getItem(k)]));
    return JSON.stringify({ local: dump(localStorage), session: dump(sessionStorage) });
  });

/**
 * Every request the page sends that writes (anything but GET and HEAD), and every request to DotAmi's own
 * API but the one that reads a law's words (`/api/law/provision`, catalog text, nothing of the person's).
 * Listing the routes that read the person's data would miss one added later (`/api/your-data`,
 * `/api/readout`…), so it is the other way round: any other `/api/` request counts.
 */
function watchRequests(page: Page): string[] {
  const seen: string[] = [];
  const allowedApi = /^\/api\/law\/provision(\/|$|\?)/;
  page.on("request", (r: Request) => {
    const url = new URL(r.url());
    const writes = r.method() !== "GET" && r.method() !== "HEAD";
    const api = url.pathname.startsWith("/api/") && !allowedApi.test(url.pathname);
    if (writes || api) seen.push(`${r.method()} ${url.pathname}`);
  });
  return seen;
}

const banner = (page: Page) => page.getByRole("region", { name: "Invented example" });
const goalBar = (page: Page) => page.getByRole("region", { name: "Your goal and gauges" });
const stepPanel = (page: Page) => page.getByRole("region", { name: "Step" });
const compare = (page: Page) => page.getByRole("region", { name: "Compare the two endings" });
const whatIf = (page: Page) => page.getByRole("region", { name: "What-if" });
const whatIfBox = (page: Page) => whatIf(page).getByRole("textbox", { name: "Try first-year sales of $" });
const told = (page: Page) => page.getByRole("region", { name: "What Mara told DotAmi" });
const stage = (page: Page, name: string) => page.getByRole("button", { name: new RegExp(`^${name}, `) });

test("door 3 opens Mara's example: the banner, her words, the road, the gauges; no save control writes anything, and Start my own future opens the first door", async ({ page }) => {
  const rowsBefore = await rowCounts();
  await page.goto("/", { waitUntil: "networkidle" });
  const storedBefore = await storage(page);
  const requests = watchRequests(page);

  const door = page.getByRole("list", { name: "Three ways in" }).getByRole("listitem").nth(2);
  await expect(door).toContainText("Mara, an invented apprentice cabinetmaker");
  await door.getByRole("link", { name: "Show me Mara's example →" }).click();
  await expect(page).toHaveURL(/\/example\/mara$/);

  // The banner, and everything drawn from her file through road evaluation.
  await expect(banner(page)).toContainText(BANNER);
  await expect(goalBar(page)).toContainText("“My own small furniture shop, four-day weeks, home for supper.”");
  await expect(goalBar(page)).toContainText(`Future: ${road.label}`);
  // Her numbers and answers are labelled hers, never the viewer's; the banner says once who "you" is.
  await expect(banner(page)).toContainText("Here, “you” and “your” mean Mara, the invented person.");
  await expect(goalBar(page)).toContainText("where Mara wants to be · Mara's words");
  // Her target is a published statistic, said as that (not as an amount she agreed to).
  await expect(goalBar(page)).toContainText("Mara's target: $52,255 a year, before tax: the average yearly salary of employed cabinetmakers in Alberta");
  await expect(goalBar(page)).not.toContainText(/\byours\b|your words|your marks|Your date/);
  await expect(goalBar(page).getByRole("button", { name: /^Steps/ })).toContainText("1 of 17 marked done");
  await expect(goalBar(page).getByRole("button", { name: /^Start-up money/ })).toContainText("$14,993.62 Mara's numbers (1 line)");
  await expect(goalBar(page).getByRole("button", { name: /^Mara's date/ })).toContainText("Mara's");
  await expect(told(page)).toContainText("things Mara told DotAmi");
  await expect(page.getByRole("region", { name: "What Mara did" })).toContainText("Mara's skill marks");
  await expect(goalBar(page).getByRole("button", { name: /^Start-up money/ })).toContainText("30 not priced yet");
  await expect(goalBar(page).getByRole("button", { name: /^Skills/ })).toContainText("Mara's pick of job: 4 have · 2 learning · 1 not yet");
  await expect(stage(page, "Open your own shop")).toBeVisible();
  // No what-if on open (the maintainer's pick A, 2026-10-15): the box is empty and the "not a forecast"
  // banner isn't drawn until the visitor tries a number of their own.
  await expect(whatIfBox(page)).toHaveValue("");
  await expect(whatIf(page).getByText("Your what-if, not a forecast", { exact: true })).toHaveCount(0);
  await expect(whatIf(page)).not.toContainText("$610,300");
  await expect(page.getByRole("region", { name: "What Mara did" })).not.toContainText("what-if");
  // Her story: each answer and what it changed, worked out by road evaluation.
  await expect(page.getByRole("region", { name: "What Mara did" })).toContainText("Because you marked 9 skills, 4 steps now have every skill they list marked have.");

  // A step: its status buttons are disabled, and say why.
  await stage(page, "Open your own shop").click();
  await expect(stepPanel(page)).toContainText(CANT_KEEP);
  await expect(stepPanel(page).getByRole("button", { name: "Done", exact: true })).toBeDisabled();
  await expect(stepPanel(page).getByRole("button", { name: /^Change your number|^Add your quote/ }).first()).toBeDisabled();

  // Compare: her pick is pressed, and This is mine can't be pressed again.
  await goalBar(page).getByRole("button", { name: "Compare", exact: true }).click();
  await expect(compare(page)).toContainText(CANT_KEEP);
  await expect(compare(page).getByRole("button", { name: "This is mine" }).nth(1)).toHaveAttribute("aria-pressed", "true");
  await expect(compare(page).getByRole("button", { name: "This is mine" }).nth(0)).toBeDisabled();

  // The told list: Take back is disabled, with the reason under its heading.
  await expect(told(page)).toContainText(CANT_KEEP);
  await expect(told(page).getByRole("button", { name: /^Take back/ }).first()).toBeDisabled();

  // A what-if the visitor tries is theirs: the bar's own words, with no note about ISED or Mara.
  await whatIfBox(page).fill("80000");
  await whatIf(page).getByRole("button", { name: "Try", exact: true }).click();
  await expect(whatIf(page).getByText("Your what-if, not a forecast", { exact: true })).toBeVisible();
  await expect(whatIf(page)).toContainText("First-year sales of $80,000, for this look only");
  await expect(whatIf(page)).not.toContainText(/industry average|not a first-year figure|Mara/);

  // Keep and Export are not disabled: they answer in the banner, and nothing else happens.
  await whatIf(page).getByRole("button", { name: "Keep", exact: true }).click();
  await expect(banner(page).getByRole("status")).toHaveText(CANT_KEEP);
  await expect(whatIf(page).getByText("Your what-if, not a forecast", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Export", exact: true }).click();
  await expect(banner(page).getByRole("status")).toHaveText(CANT_KEEP);

  // Folding works for this page and is remembered nowhere; the banner never folds.
  await page.getByRole("button", { name: "Fold all panels" }).click();
  await expect(page.getByRole("button", { name: "Show all panels" })).toBeVisible();
  await expect(banner(page)).toContainText(BANNER);
  await page.getByRole("button", { name: "Show all panels" }).click();

  // Nothing was written: not to the data file, not to the browser, and no request that writes was sent.
  expect(await storage(page)).toBe(storedBefore);
  expect(await rowCounts()).toEqual(rowsBefore);
  expect(requests).toEqual([]);

  // Start my own future leads to the front door's first door.
  await banner(page).getByRole("link", { name: "Start my own future →" }).click();
  await expect(page).toHaveURL(/\/start$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Your destination");
});

test("opened directly in a fresh tab: no browser storage is written and none of the person's data is read", async ({ page }) => {
  const requests = watchRequests(page);
  await page.goto("/example/mara", { waitUntil: "networkidle" });
  await waitForReact(goalBar(page).getByRole("button", { name: /^Steps/ }));
  await expect(banner(page)).toContainText(BANNER);
  // The legend folds for this look only.
  await page.getByRole("button", { name: "Fold the legend" }).click();
  await expect(page.getByRole("button", { name: "Show the legend" })).toBeVisible();
  await page.getByRole("button", { name: /^Skills/ }).first().click();
  expect(await storage(page)).toBe(JSON.stringify({ local: {}, session: {} }));
  expect(requests).toEqual([]);
  // Mara's words in the rail, never the person's own statements.
  await expect(page.getByRole("complementary")).toContainText("My own small furniture shop, four-day weeks, home for supper.");
});

/** Every button the locator finds is disabled, and it finds at least one (so the check can fail). */
async function allDisabled(buttons: ReturnType<Page["getByRole"]>, what: string) {
  expect(await buttons.count(), what).toBeGreaterThan(0);
  for (const b of await buttons.all()) await expect(b, what).toBeDisabled();
}

test("every other control in the ui-spec's table is drawn disabled, and none of them sends anything", async ({ page }) => {
  const requests = watchRequests(page);
  await page.goto("/example/mara", { waitUntil: "networkidle" });
  await waitForReact(goalBar(page).getByRole("button", { name: /^Steps/ }));

  // The rail: the Structure select, the told list's Change and Take back, the not-told rows' Answer.
  await expect(page.getByRole("combobox", { name: "Structure" })).toBeDisabled();
  await allDisabled(told(page).getByRole("button", { name: /^Change/ }), "told: Change");
  await allDisabled(told(page).getByRole("button", { name: /^Take back/ }), "told: Take back");
  await allDisabled(page.getByRole("region", { name: "Not told yet" }).getByRole("button", { name: /^Answer/ }), "not told: Answer");

  // The Skills list: every skill mark, Add a skill (even with a skill typed), and the pick of job.
  await goalBar(page).getByRole("button", { name: /^Skills/ }).click();
  const skills = page.getByRole("region", { name: "Skills on this road" });
  await allDisabled(skills.getByRole("button", { name: /^(Have|Learning|Not yet)$/ }), "skills: marks");
  await skills.getByRole("textbox", { name: "A skill in your own words" }).fill("Finishing");
  await allDisabled(skills.getByRole("button", { name: /^Add as / }), "skills: Add a skill");
  await allDisabled(skills.getByRole("button", { name: /^(Change|Take back)$/ }), "skills: the pick of job");

  // The Money list: her savings and her numbers.
  await goalBar(page).getByRole("button", { name: /^Start-up money/ }).click();
  const money = page.getByRole("region", { name: "Start-up money", exact: true });
  await allDisabled(money.getByRole("button", { name: /^(Add|Change) your (savings|number|quote)/ }), "money: savings and quotes");

  // The date list: Save (even with a month typed) and Clear.
  await goalBar(page).getByRole("button", { name: /^Mara's date/ }).click();
  const date = page.getByRole("region", { name: "Your date" });
  await date.locator("input[type=month]").fill("2027-06");
  await allDisabled(date.getByRole("button", { name: /^(Save|Clear)$/ }), "date: Save and Clear");

  // A step with skills listed: its marks and its status buttons.
  await stage(page, "Get a sponsor and earn your on-the-job hours").click();
  await allDisabled(stepPanel(page).getByRole("button", { name: /^(Doing|Done|Not for me)$/ }), "step: status");
  await allDisabled(stepPanel(page).getByRole("button", { name: /^(Have|Learning|Not yet)$/ }), "step: skill marks");

  expect(await storage(page)).toBe(JSON.stringify({ local: {}, session: {} }));
  expect(requests).toEqual([]);
});

/** The banner's box in the window, and whether its middle is on screen with nothing drawn over it. */
function bannerOnScreen(page: Page) {
  return banner(page).evaluate((el) => {
    const r = el.getBoundingClientRect();
    const x = r.left + r.width / 2;
    const y = r.top + r.height / 2;
    const onScreen = r.top >= -0.5 && r.bottom <= window.innerHeight + 0.5 && r.height > 0;
    // A banner made inert behind a sheet is skipped by hit-testing, so look for the first element at that
    // point that is either the banner or one of the cockpit's sheets and drawers.
    const hit = document.elementsFromPoint(x, y).find((e) => el.contains(e) || e.closest("#cockpit-panel, #cockpit-rail"));
    return { top: r.top, bottom: r.bottom, onScreen, covered: hit !== undefined && !el.contains(hit) };
  });
}

test.describe("the banner stays on screen", () => {
  test("at 375x812: scrolled to the bottom, and with a step or the venture details open as a sheet", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/example/mara", { waitUntil: "networkidle" });
    await waitForReact(goalBar(page).getByRole("button", { name: /^Steps/ }));
    expect(await bannerOnScreen(page)).toMatchObject({ onScreen: true, covered: false });

    // The page scrolls on a phone; the banner stays at the top of the window.
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(200);
    expect(await bannerOnScreen(page)).toMatchObject({ top: 0, onScreen: true, covered: false });

    // A step's sheet starts under the banner, never over it.
    await stage(page, "Open your own shop").scrollIntoViewIfNeeded();
    await stage(page, "Open your own shop").click();
    await expect(stepPanel(page)).toBeVisible();
    const withStep = await bannerOnScreen(page);
    expect(withStep).toMatchObject({ onScreen: true, covered: false });
    expect((await page.locator("#cockpit-panel").boundingBox())!.y).toBeGreaterThanOrEqual(withStep.bottom - 0.5);
    await stepPanel(page).getByRole("button", { name: "Close", exact: true }).click();
    await expect(stepPanel(page)).toHaveCount(0);

    // So does the venture details sheet.
    await page.getByRole("button", { name: "Venture details", exact: true }).click();
    const rail = page.getByRole("complementary", { name: "Venture details" });
    await expect(rail.getByText("In Mara's words", { exact: true })).toBeVisible();
    const withRail = await bannerOnScreen(page);
    expect(withRail).toMatchObject({ onScreen: true, covered: false });
    expect((await rail.boundingBox())!.y).toBeGreaterThanOrEqual(withRail.bottom - 0.5);
  });

  test("at 900x800 a step's drawer opens under the banner and the header, leaving their buttons free", async ({ page }) => {
    await page.setViewportSize({ width: 900, height: 800 });
    await page.goto("/example/mara", { waitUntil: "networkidle" });
    await waitForReact(goalBar(page).getByRole("button", { name: /^Steps/ }));
    await stage(page, "Open your own shop").click();
    await expect(stepPanel(page)).toBeVisible();

    const header = (await page.locator("header").first().boundingBox())!;
    const drawer = (await page.locator("#cockpit-panel").boundingBox())!;
    expect(drawer.y).toBeGreaterThanOrEqual(header.y + header.height - 0.5);
    expect(await bannerOnScreen(page)).toMatchObject({ onScreen: true, covered: false });
    // Real clicks, which Playwright refuses while something else would receive them.
    await page.getByRole("button", { name: "Fold all panels" }).click({ timeout: 2_000 });
    await expect(page.getByRole("button", { name: "Show all panels" })).toBeVisible();
    await page.getByRole("button", { name: "Show all panels" }).click({ timeout: 2_000 });
    await page.getByRole("button", { name: "Export", exact: true }).click({ timeout: 2_000 });
    await expect(banner(page).getByRole("status")).toHaveText(CANT_KEEP);
    await expect(banner(page).getByRole("link", { name: "Start my own future →" })).toBeVisible();
    await banner(page).getByRole("link", { name: "Start my own future →" }).click({ trial: true, timeout: 2_000 });
  });
});

test("Where these numbers come from: opened from the banner, it lists every tool's average, every source with its link, and what stayed blank; it sends and keeps nothing", async ({ page }) => {
  const requests = watchRequests(page);
  await page.goto("/example/mara", { waitUntil: "networkidle" });
  await waitForReact(goalBar(page).getByRole("button", { name: /^Steps/ }));

  const open = banner(page).getByRole("button", { name: "Where these numbers come from" });
  await expect(open).toHaveAttribute("aria-expanded", "false");
  await open.click();
  const panel = page.getByRole("region", { name: "Where these numbers come from" });
  await expect(panel).toBeVisible();
  await expect(banner(page).getByRole("button", { name: "Hide where these numbers come from" })).toHaveAttribute("aria-expanded", "true");

  // How each of her numbers is worked out.
  await expect(panel).toContainText("Mara's number for “Woodworking machines and tools”: $14,993.62, the 12 tools below added up");
  await expect(panel).toContainText("Mara's yearly income goal: $52,255");
  await expect(panel).not.toContainText("Mara's what-if, tried as first-year sales");
  await expect(panel).toContainText("Every price and statistic on this page is real");
  // ISED's average, only as context (the maintainer's pick A, 2026-10-15), visible as the panel opens and
  // drawn once, labelled as an industry average and not one of hers.
  await expect(panel.getByText("For context, not one of Mara's numbers", { exact: true })).toBeVisible();
  const contextLine = panel.getByText(/^\$610,300 a year: /);
  await expect(contextLine).toBeVisible();
  await expect(contextLine).toContainText("An industry average over existing businesses of every age, not a first-year figure and not one of Mara's numbers.");
  await expect(contextLine).toContainText("NAICS 33712");
  await expect(contextLine).toContainText("Data year 2024");
  await expect(panel.getByText("$610,300", { exact: false })).toHaveCount(1);
  await expect(panel).toContainText("Mara's example has no what-if: the what-if bar under the map starts empty");
  await expect(panel).toContainText("Mara's savings and shop space deposit: not priced yet.");

  // Every tool, with the average the function gives over its own listed prices, and every price's link.
  for (const tool of MARA_SOURCES.tools) {
    const sum = priceSummary(tool.prices.map((p) => p.priceCents));
    await expect(panel).toContainText(tool.item);
    await expect(panel).toContainText(cockpitWords.example.sources.average(sum.count, sum.meanCents, sum.medianCents, sum.lowCents, sum.highCents));
  }
  // Every source is a link in the panel: each seller's page, each plan's page, each statistic's page.
  const urls = new Set([
    ...MARA_SOURCES.tools.flatMap((t) => [t.official.url, ...t.prices.map((p) => p.url)]),
    ...MARA_SOURCES.software.map((s) => s.url),
    ...MARA_SOURCES.statistics.map((s) => s.url),
  ]);
  const hrefs = new Set(await panel.locator("a[href]").evaluateAll((as) => as.map((a) => a.getAttribute("href"))));
  for (const url of urls) expect(hrefs.has(url), url).toBe(true);
  // A tool's prices fold under its average: open one and read a seller, a price and the words seen.
  await panel.getByText("Table saw (10-inch cabinet saw, 3 HP, single-phase)").click();
  await expect(panel.getByText("Model Number: 51-260 $2,699.95 $3,499.99 You save $800.04")).toBeVisible();

  // The software, the statistics and what stayed blank.
  await expect(panel).toContainText("Average of 10 plans billed month to month: $49 a month");
  await expect(panel).toContainText("Average of 3 plans billed month to month: $96.33 a month");
  await expect(panel).toContainText("$15.08 a month, billed yearly");
  await expect(panel).toContainText("No paid plan here is listed in Canadian dollars");
  await expect(panel).toContainText("Average yearly salary of employed cabinetmakers (NOC 72311) in Alberta");
  await expect(panel).toContainText("Not priced yet, and why");
  await expect(panel).toContainText("Seen but not used, and why");
  // Information, never a verdict: nothing in the panel, the banner, the goal bar (its target line) or the
  // what-if bar (its note) ranks, recommends or frames a pick as the trade's (tests/helpers/verdict-words.ts).
  for (const [name, region] of [
    ["panel", panel],
    ["banner", banner(page)],
    ["goal bar", goalBar(page)],
    ["what-if bar", whatIf(page)],
  ] as const) {
    const text = await region.innerText();
    expect(text.length, name).toBeGreaterThan(20);
    expect(text.match(new RegExp(VERDICT.source, "gi")), name).toBeNull();
    expect(text.match(new RegExp(FRAMING.source, "gi")), name).toBeNull();
  }

  // It closes from the same button, and nothing was sent or kept.
  await banner(page).getByRole("button", { name: "Hide where these numbers come from" }).click();
  await expect(panel).toHaveCount(0);
  expect(await storage(page)).toBe(JSON.stringify({ local: {}, session: {} }));
  expect(requests).toEqual([]);
});

test("any other example address is not found", async ({ page }) => {
  const response = await page.goto("/example/nobody");
  expect(response?.status()).toBe(404);
});
