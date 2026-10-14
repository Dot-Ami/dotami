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

import { createDatabaseClient } from "../lib/db/client";
import { roadApprenticeToOwnShopAB } from "../lib/engines/roads/v2026";
import { waitForReact } from "../tests/helpers/react-ready";

const BANNER = "Invented person, invented numbers, not real data. Nothing here is saved.";
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
  await expect(goalBar(page)).toContainText("Mara's target: $70,000 a year, before tax (Mara's, agreed");
  await expect(goalBar(page)).not.toContainText(/\byours\b|your words|your marks|Your date/);
  await expect(goalBar(page).getByRole("button", { name: /^Steps/ })).toContainText("1 of 16 marked done");
  await expect(goalBar(page).getByRole("button", { name: /^Start-up money/ })).toContainText("$5,400 Mara's numbers (2 lines)");
  await expect(goalBar(page).getByRole("button", { name: /^Mara's date/ })).toContainText("Mara's");
  await expect(told(page)).toContainText("things Mara told DotAmi");
  await expect(page.getByRole("region", { name: "What Mara did" })).toContainText("Mara's skill marks");
  await expect(goalBar(page).getByRole("button", { name: /^Start-up money/ })).toContainText("29 not priced yet");
  await expect(goalBar(page).getByRole("button", { name: /^Skills/ })).toContainText("Mara's pick of job: 4 have · 2 learning · 1 not yet");
  await expect(stage(page, "Open your own shop")).toBeVisible();
  // Her what-if is on: it relit the rules, and is kept nowhere.
  await expect(whatIf(page).getByText("Your what-if, not a forecast", { exact: true })).toBeVisible();
  await expect(whatIf(page)).toContainText("First-year sales of $45,000");
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

test("any other example address is not found", async ({ page }) => {
  const response = await page.goto("/example/nobody");
  expect(response?.status()).toBe(404);
});
