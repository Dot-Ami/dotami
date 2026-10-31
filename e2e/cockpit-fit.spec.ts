/**
 * Folding the cockpit, and phone width (docs/architecture/future-cockpit.md § 2, "Folding and phone
 * width"; issue #4), in a real browser against the production build:
 *
 * - every region folds and opens again with a button that says what it does, and the answers are
 *   remembered after a reload;
 * - at 1280x720 with every panel folded, each stage card and each rules and tax card on the road is fully
 *   inside the window once the road's own area is scrolled to it;
 * - at 375x812 the page never scrolls sideways, the road scrolls inside its own area, and a step opens as
 *   a full-width sheet and closes;
 * - the keyboard: folding a region leaves focus on the button that now stands for it, and on a phone a
 *   sheet takes focus, keeps Tab inside it, closes on Escape and gives focus back;
 * - nothing the cockpit draws over the page covers a button or the page's last line;
 * - with a what-if on, the legend is never drawn under the what-if bar, and every control under the road
 *   can be reached and clicked (2026-10-14: the road's area used to shrink to 20 px and the legend slid
 *   under the bar, covering its fold button).
 */
import path from "node:path";

import type { PrismaClient } from "@prisma/client";
import { expect, test, type Locator, type Page } from "@playwright/test";

import { createDatabaseClient } from "../lib/db/client";
import { generalRoadV2026, roadApprenticeToOwnShopAB } from "../lib/engines/roads/v2026";

import { cockpitSettled, lookCloser, lookCloserItems, overlayOn, showLegend, showRail, showRoadAhead, showWhatIfBar } from "./cockpit-calm";

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

/** An invented Alberta idea, saved the way the intake saves one; returns its id. */
async function saveIdea(page: Page, name: string): Promise<string> {
  const scenario = {
    id: `cockpit-fit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
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

const goalBar = (page: Page) => page.getByRole("region", { name: "Your goal and gauges" });
const gauge = (page: Page, name: string) => goalBar(page).getByRole("button", { name: new RegExp(`^${name}`) });
const stage = (page: Page, name: string) => page.getByRole("button", { name: new RegExp(`^${name}, `) });
const stepPanel = (page: Page) => page.getByRole("region", { name: "Step" });
const road = (page: Page) => page.getByRole("region", { name: "The road" });
const button = (page: Page, name: string) => page.getByRole("button", { name, exact: true });

/** True when a click at the element's centre would land on it: nothing is drawn over it there. */
const onTop = (target: Locator) =>
  target.evaluate((el) => {
    const r = el.getBoundingClientRect();
    const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return hit !== null && el.contains(hit);
  });

/** True when the focused element is inside the element. */
const holdsFocus = (target: Locator) => target.evaluate((el) => el.contains(document.activeElement));

/** The page itself never scrolls sideways (the road's own area may). */
const noSidewaysScroll = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);

/** Folds a region with its button and checks the button now offers to show it again. */
async function fold(page: Page, foldName: string, showName: string) {
  await expect(button(page, foldName)).toHaveAttribute("aria-expanded", "true");
  await button(page, foldName).click();
  await expect(button(page, foldName)).toHaveCount(0);
  await expect(button(page, showName)).toHaveAttribute("aria-expanded", "false");
}

/** The same for the legend and the what-if bar, shown from the goal bar's Look closer menu since 2026-10-20. */
async function foldUnderTheMap(page: Page, foldName: string, item: string) {
  await expect(button(page, foldName)).toHaveAttribute("aria-expanded", "true");
  await button(page, foldName).click();
  await expect(button(page, foldName)).toHaveCount(0);
  expect(await lookCloserItems(page)).toContain(item);
}

test("every region folds and opens with its own named button, and the cockpit remembers it after a reload", async ({ page }) => {
  const ventureId = await saveIdea(page, "Invented — folding test");
  await page.goto(`/cockpit?venture=${ventureId}`);

  // A first visit opens calm (2026-10-17): open everything first, each with its one button.
  await showRail(page);
  await showLegend(page);
  await showWhatIfBar(page);
  await showRoadAhead(page);
  const inYourWords = page.getByRole("complementary", { name: "Venture details" }).getByText("In your words", { exact: true });
  const legendLine = page.getByRole("group", { name: "Legend" }).getByText("applies as answered", { exact: true });
  const stepsLine = gauge(page, "Steps").getByText(/^next on your road:/);
  const tryBox = page.getByRole("region", { name: "What-if" }).getByLabel("Try first-year sales of $");
  await expect(inYourWords).toBeVisible();
  await expect(stepsLine).toBeVisible();
  await expect(legendLine).toBeVisible();
  await expect(tryBox).toBeVisible();

  // The left rail.
  await fold(page, "Fold venture details", "Show venture details");
  await expect(inYourWords).toBeHidden();

  // The goal bar: one line, and the four gauges still there, with their values, still pressable.
  await fold(page, "Fold goal and gauges", "Show goal and gauges");
  await expect(stepsLine).toBeHidden();
  await expect(gauge(page, "Steps")).toContainText(`0 of ${generalRoadV2026.steps.length} marked done`);
  await expect(gauge(page, "Your date")).toContainText("not set");

  // The legend (shown again from Look closer, which the folded goal bar's one line carries too).
  await foldUnderTheMap(page, "Fold the legend", "Show the legend");
  await expect(legendLine).toBeHidden();

  // The what-if bar under the map, with This visit (2026-10-13).
  await foldUnderTheMap(page, "Fold the what-if bar", "Show the what-if bar");
  await expect(tryBox).toBeHidden();

  // The road ahead (2026-10-17).
  const incorporating = stage(page, "Incorporating");
  await expect(incorporating).toBeVisible();
  await button(page, "Fold the road ahead").click();
  await expect(incorporating).toBeHidden();
  await expect(page.getByRole("button", { name: /^Show the road ahead: / })).toHaveAttribute("aria-expanded", "false");

  // The panel: a step opened, then folded; its strip names it, and it stays folded when another step is picked.
  await stage(page, "Sole Prop activation").click();
  await expect(stepPanel(page)).toBeVisible();
  await fold(page, "Fold the panel", "Show the panel: Sole Prop activation");
  await expect(stepPanel(page)).toBeHidden();
  await stage(page, "Register your business name, if you use one").click();
  await expect(button(page, "Show the panel: Register your business name, if you use one")).toBeVisible();
  await expect(stepPanel(page)).toBeHidden();

  // A reload remembers them all.
  await page.reload();
  for (const name of ["Show venture details", "Show goal and gauges"]) {
    await expect(button(page, name)).toHaveAttribute("aria-expanded", "false");
  }
  expect(await lookCloserItems(page)).toEqual(expect.arrayContaining(["Show the legend", "Show the what-if bar"]));
  await expect(incorporating).toBeHidden();
  await expect(inYourWords).toBeHidden();
  await expect(legendLine).toBeHidden();
  await stage(page, "Sole Prop activation").click();
  await expect(button(page, "Show the panel: Sole Prop activation")).toBeVisible();

  // Nothing was hidden for good: each opens again, and what it held is back.
  await button(page, "Show the panel: Sole Prop activation").click();
  await expect(stepPanel(page)).toBeVisible();
  await button(page, "Show venture details").click();
  await expect(inYourWords).toBeVisible();
  await button(page, "Show goal and gauges").click();
  await expect(stepsLine).toBeVisible();
  await lookCloser(page, "Show the legend");
  await expect(legendLine).toBeVisible();
  await lookCloser(page, "Show the what-if bar");
  await expect(tryBox).toBeVisible();
  await page.getByRole("button", { name: /^Show the road ahead: / }).click();
  await expect(incorporating).toBeVisible();

  // The header folds them all at once, and opens them all again.
  await button(page, "Fold all panels").click();
  for (const name of ["Show venture details", "Show goal and gauges", "Show the panel: Sole Prop activation"]) {
    await expect(button(page, name)).toBeVisible();
  }
  expect(await lookCloserItems(page)).toEqual(expect.arrayContaining(["Show the legend", "Show the what-if bar"]));
  await expect(incorporating).toBeHidden();
  await button(page, "Show all panels").click();
  await expect(inYourWords).toBeVisible();
  await expect(incorporating).toBeVisible();
  await expect(stepPanel(page)).toBeVisible();
  await expect(button(page, "Fold all panels")).toBeVisible();
});

/**
 * Scrolls the road's own area to each card, the way a person would, and measures it: is the whole card
 * inside the window and inside the area? Only the road's area is scrolled; anything else that moved would
 * be a cheat, so the page and every box around the area must be unscrolled.
 */
async function measureCards(area: Locator) {
  return area.evaluate((el) => {
    const visible = () => {
      const a = el.getBoundingClientRect();
      return {
        top: Math.max(a.top + el.clientTop, 0),
        left: Math.max(a.left + el.clientLeft, 0),
        bottom: Math.min(a.top + el.clientTop + el.clientHeight, window.innerHeight),
        right: Math.min(a.left + el.clientLeft + el.clientWidth, window.innerWidth),
      };
    };
    const cards = [...el.querySelectorAll<HTMLButtonElement>('button[aria-label$=", opens detail"]')];
    const measured = cards.map((card) => {
      const box = visible();
      const before = card.getBoundingClientRect();
      el.scrollTop += before.top - box.top - 4;
      el.scrollLeft += before.left - box.left - 4;
      const v = visible();
      const c = card.getBoundingClientRect();
      const fits = c.top >= v.top - 0.5 && c.bottom <= v.bottom + 0.5 && c.left >= v.left - 0.5 && c.right <= v.right + 0.5;
      return { name: card.getAttribute("aria-label") ?? "", fits, height: Math.round(c.height) };
    });
    const scrolledAround: string[] = [];
    for (let p = el.parentElement; p; p = p.parentElement) {
      if (p.scrollTop !== 0 || p.scrollLeft !== 0) scrolledAround.push(p.tagName);
    }
    const v = visible();
    return { measured, scrolledAround, areaHeight: Math.round(v.bottom - v.top), areaWidth: Math.round(v.right - v.left) };
  });
}

test("at 1280x720 with every panel folded, every card on the road fits in the window once the road is scrolled to it", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  const ventureId = await saveIdea(page, "Invented — fit test");
  await page.goto(`/cockpit?venture=${ventureId}`);
  await expect(road(page)).toBeVisible();

  await button(page, "Fold all panels").click();
  await expect(button(page, "Show all panels")).toBeVisible();
  // Every card on the road: the road ahead shown, and the rules and tax cards switched on (both folded or off
  // on a first visit since 2026-10-17); the panels stay folded.
  await showRoadAhead(page);
  await overlayOn(page, "Rules & tax");

  const { measured, scrolledAround, areaHeight } = await measureCards(road(page));
  // Every stage card of road 0 was measured, and the rules and tax cards with them.
  for (const step of generalRoadV2026.steps) {
    expect(measured.some((m) => m.name.startsWith(`${step.label}, `)), step.label).toBe(true);
  }
  expect(measured.filter((m) => /^Write-off: /.test(m.name)).length).toBeGreaterThan(0);
  expect(measured.filter((m) => !m.fits).map((m) => `${m.name} (${m.height} px)`)).toEqual([]);
  expect(scrolledAround).toEqual([]);
  // Folding gives the road its room: 296 px tall with everything open on part 1 (2026-10-12).
  expect(areaHeight).toBeGreaterThanOrEqual(400);
  expect(await noSidewaysScroll(page)).toBe(true);
});

test("folding or showing a region from the keyboard leaves focus on the button that now stands for it, and the rail keeps its place", async ({ page }) => {
  const ventureId = await saveIdea(page, "Invented — focus test");
  await page.goto(`/cockpit?venture=${ventureId}`);
  await expect(road(page)).toBeVisible();
  // A first visit opens calm (2026-10-17): open everything first.
  await showRail(page);
  await showLegend(page);
  await showWhatIfBar(page);
  await showRoadAhead(page);

  // With no panel open, "Fold all panels" names only regions that are on the page.
  const named = async () => (await button(page, "Fold all panels").getAttribute("aria-controls"))!.split(" ");
  expect(await named()).not.toContain("cockpit-panel");
  for (const id of await named()) await expect(page.locator(`#${id}`), id).toHaveCount(1);

  await stage(page, "Sole Prop activation").click();
  await expect(stepPanel(page)).toBeVisible();
  expect(await named()).toContain("cockpit-panel");

  const pairs: [string, string][] = [
    ["Fold venture details", "Show venture details"],
    ["Fold goal and gauges", "Show goal and gauges"],
    ["Fold the panel", "Show the panel: Sole Prop activation"],
    ["Fold the road ahead", "Show the road ahead"],
  ];
  // The folded road ahead's name goes on to say what it holds.
  const shown = (name: string) =>
    name === "Show the road ahead" ? page.getByRole("button", { name: /^Show the road ahead: / }) : button(page, name);
  for (const [foldName, showName] of pairs) {
    await button(page, foldName).focus();
    await page.keyboard.press("Enter");
    await expect(shown(showName), `after ${foldName}`).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(button(page, foldName), `after ${showName}`).toBeFocused();
  }
  // The legend and the what-if bar (2026-10-20): folded with their own button, focus goes to Look closer, whose
  // last item then shows the region again (the up arrow opens the menu on it), and focus is on its fold button.
  for (const [foldName, item] of [
    ["Fold the legend", "Show the legend"],
    ["Fold the what-if bar", "Show the what-if bar"],
  ] as const) {
    await button(page, foldName).focus();
    await page.keyboard.press("Enter");
    await expect(goalBar(page).getByRole("button", { name: "Look closer" }), `after ${foldName}`).toBeFocused();
    await page.keyboard.press("ArrowUp");
    await expect(page.getByRole("menuitem", { name: item, exact: true })).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(button(page, foldName), `after ${item}`).toBeFocused();
  }

  // The rail comes back scrolled where it was.
  const rail = page.getByRole("complementary", { name: "Venture details" });
  const scrolled = await rail.evaluate((el) => {
    el.scrollTop = 200;
    return el.scrollTop;
  });
  expect(scrolled).toBeGreaterThan(0);
  await button(page, "Fold all panels").click();
  await button(page, "Show all panels").click();
  await expect(button(page, "Fold venture details")).toBeVisible();
  expect(await rail.evaluate((el) => el.scrollTop)).toBe(scrolled);
});

test("a layer switch keeps keyboard focus when it switches its layer off, on a return visit that had the extra layers folded", async ({ page }) => {
  // A review of the calm first view (2026-10-17) found focus dropped to the page's body here: the Rules & tax
  // switch, on and so still drawn while the extra layers were folded, removed itself when switched off. The
  // switches no longer fold (every one is drawn), so a stored "layers" answer is read as nothing.
  await page.addInitScript(() => {
    try {
      if (window.localStorage.getItem("dotami-cockpit-folds") === null) {
        window.localStorage.setItem(
          "dotami-cockpit-folds",
          JSON.stringify({ rail: true, legend: true, whatIf: true, roadAhead: true, layers: true, overlays: { skills: true, money: true, rules: true } }),
        );
      }
    } catch {
      // A page with no storage of its own: nothing to do.
    }
  });
  const ventureId = await saveIdea(page, "Invented — layer focus test");
  await page.goto(`/cockpit?venture=${ventureId}`);
  const overlays = page.getByRole("group", { name: "Overlays" });
  for (const label of ["Money", "Rules & tax"]) {
    const toggle = overlays.getByRole("button", { name: new RegExp(`^${label}`) });
    await expect(toggle, label).toHaveAttribute("aria-pressed", "true");
    await toggle.focus();
    await page.keyboard.press("Enter");
    await expect(toggle, `${label} switched off`).toHaveAttribute("aria-pressed", "false");
    await expect(toggle, `${label} keeps focus`).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(toggle, `${label} switched on again`).toHaveAttribute("aria-pressed", "true");
    await expect(toggle, `${label} still has focus`).toBeFocused();
  }
});

test("Got it from the keyboard puts the coach line away and leaves focus on the road, not the page", async ({ page }) => {
  // A review (2026-10-17) found focus dropped to the page's body: the button removes itself with its line.
  const ventureId = await saveIdea(page, "Invented — coach focus test");
  await page.goto(`/cockpit?venture=${ventureId}`);
  const coach = page.getByRole("note", { name: "A first look" });
  const gotIt = coach.getByRole("button", { name: "Got it" });
  await cockpitSettled(page);
  await gotIt.focus();
  await page.keyboard.press("Enter");
  await expect(coach).toHaveCount(0);
  await expect(road(page)).toBeFocused();
  // The next Tab goes on into the road's own cards.
  await page.keyboard.press("Tab");
  expect(await holdsFocus(road(page))).toBe(true);
});

test("between 768 and 1023 px, a step's drawer leaves the header's buttons free to click", async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 1024 });
  const ventureId = await saveIdea(page, "Invented — tablet test");
  await page.goto(`/cockpit?venture=${ventureId}`);
  await stage(page, "Sole Prop activation").click();
  await expect(stepPanel(page)).toBeVisible();

  for (const name of ["Export", "Fold all panels"]) expect(await onTop(button(page, name)), name).toBe(true);
  // A real click, which Playwright refuses while something else would receive it.
  await button(page, "Fold all panels").click({ timeout: 2_000 });
  await expect(button(page, "Show all panels")).toBeVisible();
});

/** Turns a what-if on with the bar's own box and Try, and waits for its banner. */
async function tryWhatIf(page: Page, dollars: string) {
  const bar = page.getByRole("region", { name: "What-if" });
  await bar.getByLabel("Try first-year sales of $").fill(dollars);
  await bar.getByRole("button", { name: "Try", exact: true }).click();
  await expect(bar.getByText("Your what-if, not a forecast", { exact: true })).toBeVisible();
}

/**
 * With a what-if on: the legend ends where the what-if bar starts (never under it), the road keeps an area
 * to read, and every control in the legend, the what-if bar and Next on your road is the thing a click at
 * its centre lands on once scrolled to, as a person would scroll to it. Then a real click on the legend's
 * fold button, which Playwright refuses while something else would receive it.
 */
async function controlsUnderTheRoadReachable(page: Page, size: string, minRoadHeight: number) {
  const legend = page.getByRole("group", { name: "Legend" });
  const bar = page.getByRole("region", { name: "What-if" });
  const legendBox = (await legend.boundingBox())!;
  const barBox = (await bar.boundingBox())!;
  expect(legendBox.y + legendBox.height, `${size}: the legend's bottom is not under the what-if bar`).toBeLessThanOrEqual(barBox.y + 0.5);
  expect(await road(page).evaluate((el) => el.clientHeight), `${size}: the road's area`).toBeGreaterThanOrEqual(minRoadHeight);

  const controls = [
    ...(await legend.getByRole("button").all()),
    ...(await bar.getByRole("button").all()),
    ...(await bar.getByRole("textbox").all()),
    ...(await page.getByRole("region", { name: "Next on your road" }).getByRole("button").all()),
  ];
  expect(controls.length).toBeGreaterThanOrEqual(5);
  for (const control of controls) {
    await control.scrollIntoViewIfNeeded();
    const name = (await control.getAttribute("aria-label")) ?? (await control.innerText());
    expect(await onTop(control), `${size}: ${name}`).toBe(true);
  }
  await button(page, "Fold the legend").click({ timeout: 2_000 });
  await expect(legend.getByText("applies as answered", { exact: true })).toBeHidden();
  await lookCloser(page, "Show the legend");
  await expect(legend.getByText("applies as answered", { exact: true })).toBeVisible();
}

test("with a what-if on and Compare open, the legend is never under the what-if bar and every control under the road can be clicked (1280x720, 1366x768, 1024x768)", async ({
  page,
}) => {
  const ventureId = await saveIdea(page, "Invented — what-if fit test");
  await withE2eDb((db) => db.venture.update({ where: { id: ventureId }, data: { roadId: roadApprenticeToOwnShopAB.id, roadChosenAt: new Date() } }));
  await page.goto(`/cockpit?venture=${ventureId}`);
  // Folded on a first visit (2026-10-17): the what-if bar and the legend, each shown from Look closer (2026-10-20).
  await showWhatIfBar(page);
  await showLegend(page);
  await tryWhatIf(page, "45000");
  // Compare in the right-hand panel, as a person who has just compared the two endings has it: from 1024 px
  // a column beside the road, which narrows the road and makes the legend wrap onto more lines.
  await lookCloser(page, "Compare the two endings", goalBar(page));
  await expect(page.getByRole("region", { name: "Compare the two endings" })).toBeVisible();

  for (const size of [
    { width: 1280, height: 720 },
    { width: 1366, height: 768 },
    { width: 1024, height: 768 },
  ]) {
    await page.setViewportSize(size);
    await controlsUnderTheRoadReachable(page, `${size.width}x${size.height}`, 160);
  }
});

test("with a what-if on, at tablet and phone widths every control under the road can be clicked (768x1024, 375x812)", async ({ page }) => {
  const ventureId = await saveIdea(page, "Invented — what-if narrow fit test");
  await page.goto(`/cockpit?venture=${ventureId}`);
  await showWhatIfBar(page);
  await showLegend(page);
  await tryWhatIf(page, "45000");
  // No panel open: below 1024 px the panel is a drawer or a sheet over the road by design (12-folding-and-phone.md).
  await page.setViewportSize({ width: 768, height: 1024 });
  await controlsUnderTheRoadReachable(page, "768x1024", 160);
  await page.setViewportSize({ width: 375, height: 812 });
  await controlsUnderTheRoadReachable(page, "375x812", 400);
  expect(await noSidewaysScroll(page)).toBe(true);

  // Folded on a phone (2026-10-20): focus goes up to Look closer, which shows the bar again, without scrolling
  // the page away from where the person was (a review found it jumped back to the goal bar), and Next on your
  // road still says the map is relit by a what-if, and its number.
  const foldWhatIf = button(page, "Fold the what-if bar");
  await foldWhatIf.scrollIntoViewIfNeeded();
  const before = await page.evaluate(() => window.scrollY);
  expect(before, "scrolled down to the what-if bar").toBeGreaterThan(300);
  await foldWhatIf.click();
  await expect(goalBar(page).getByRole("button", { name: "Look closer" })).toBeFocused();
  // Only what the folded bar took off the page's end may come off the scroll position, never the way up.
  expect(await page.evaluate(() => window.scrollY), "the page stays where the person was").toBeGreaterThan(before - 250);
  const next = page.getByRole("region", { name: "Next on your road" });
  await expect(next).toContainText("Your what-if, not a forecast");
  await expect(next).toContainText("First-year sales of $45,000, for this look only");
  expect(await lookCloserItems(page)).toContain("Show the what-if bar");
});

test.describe("phone width (issue #4)", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("at 375x812 a first visit's coach line sits under the road, so the road starts where it does without it", async ({ page }) => {
    // A review (2026-10-17) measured the coach line 82 px tall above the road on a phone, where nothing above
    // the road folds: the calm view put the road lower than before it. Under the road it costs the road nothing;
    // since 2026-10-23 it sits after Next on your road (e2e/phone-width.spec.ts holds that).
    const ventureId = await saveIdea(page, "Invented — phone coach test");
    await page.goto(`/cockpit?venture=${ventureId}`);
    await cockpitSettled(page);
    const coach = page.getByRole("note", { name: "A first look" });
    await expect(coach).toBeVisible();
    // Where the road starts on the page, not in the window: clicking Got it scrolls the page down to it.
    const roadTop = () => road(page).evaluate((el) => el.getBoundingClientRect().top + window.scrollY);
    const first = (await road(page).boundingBox())!;
    const firstTop = await roadTop();
    const line = (await coach.boundingBox())!;
    expect(line.y).toBeGreaterThanOrEqual(first.y + first.height - 1);
    // The overlay switches wrap to two lines of 24 px switches, not 32 px ones (the row measured 87 px).
    const switches = (await page.getByRole("group", { name: "Overlays" }).boundingBox())!;
    expect(switches.height).toBeLessThanOrEqual(64);

    await coach.getByRole("button", { name: "Got it" }).click();
    await expect(coach).toHaveCount(0);
    expect(Math.abs((await roadTop()) - firstTop)).toBeLessThanOrEqual(1);
    expect(await noSidewaysScroll(page)).toBe(true);
  });

  test("at 375x812 the page never scrolls sideways, the road scrolls in its own area, and a step opens as a full-width sheet and closes", async ({ page }) => {
    const ventureId = await saveIdea(page, "Invented — phone test");
    await page.goto(`/cockpit?venture=${ventureId}`);
    await expect(road(page)).toBeVisible();
    expect(await noSidewaysScroll(page)).toBe(true);

    // The road keeps its columns and scrolls sideways inside its own area, which has room to read.
    const area = await road(page).evaluate((el) => ({ scrolls: el.scrollWidth > el.clientWidth, height: el.clientHeight }));
    expect(area.scrolls).toBe(true);
    expect(area.height).toBeGreaterThanOrEqual(400);

    // A card is whole once scrolled to: its title isn't cut by the window's edge.
    const card = stage(page, "Sole Prop activation");
    await card.scrollIntoViewIfNeeded();
    const box = (await card.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(375);
    expect(box.width).toBeGreaterThanOrEqual(250);
    expect(await noSidewaysScroll(page)).toBe(true);

    // A step opens as a full-width sheet, and its Close closes it.
    await card.click();
    await expect(stepPanel(page)).toBeVisible();
    const sheet = (await stepPanel(page).boundingBox())!;
    expect(Math.round(sheet.x)).toBe(0);
    expect(Math.round(sheet.width)).toBe(375);
    expect(await noSidewaysScroll(page)).toBe(true);
    await stepPanel(page).getByRole("button", { name: "Close node detail panel" }).click();
    await expect(stepPanel(page)).toHaveCount(0);

    // The venture details open as a full-width sheet from the header, and close.
    const rail = page.getByRole("complementary", { name: "Venture details" });
    await expect(rail.getByText("In your words", { exact: true })).toBeHidden();
    await button(page, "Venture details").click();
    await expect(rail.getByText("In your words", { exact: true })).toBeVisible();
    const railBox = (await rail.boundingBox())!;
    expect(Math.round(railBox.x)).toBe(0);
    expect(Math.round(railBox.width)).toBe(375);
    expect(await noSidewaysScroll(page)).toBe(true);
    await button(page, "Close venture details").click();
    await expect(rail.getByText("In your words", { exact: true })).toBeHidden();
    expect(await noSidewaysScroll(page)).toBe(true);
  });

  test("at 375x812 a sheet takes the keyboard: focus goes into it, Tab stays in it, Escape closes it and focus goes back", async ({ page }) => {
    const ventureId = await saveIdea(page, "Invented — phone keyboard test");
    await page.goto(`/cockpit?venture=${ventureId}`);
    await expect(road(page)).toBeVisible();

    // The venture details sheet.
    const rail = page.getByRole("complementary", { name: "Venture details" });
    await button(page, "Venture details").focus();
    await page.keyboard.press("Enter");
    await expect(button(page, "Close venture details")).toBeFocused();
    for (let i = 1; i <= 30; i++) {
      await page.keyboard.press(i % 3 === 0 ? "Shift+Tab" : "Tab");
      expect(await holdsFocus(rail), `rail, key ${i}`).toBe(true);
    }
    await page.keyboard.press("Escape");
    await expect(rail.getByText("In your words", { exact: true })).toBeHidden();
    await expect(button(page, "Venture details")).toBeFocused();

    // Its Close gives focus back too.
    await page.keyboard.press("Enter");
    await expect(button(page, "Close venture details")).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(button(page, "Venture details")).toBeFocused();

    // A step's sheet.
    const card = stage(page, "Sole Prop activation");
    const panel = page.locator("#cockpit-panel");
    await card.focus();
    await page.keyboard.press("Enter");
    await expect(stepPanel(page)).toBeVisible();
    expect(await holdsFocus(panel)).toBe(true);
    for (let i = 1; i <= 30; i++) {
      await page.keyboard.press(i % 3 === 0 ? "Shift+Tab" : "Tab");
      expect(await holdsFocus(panel), `step sheet, key ${i}`).toBe(true);
    }
    await page.keyboard.press("Escape");
    await expect(stepPanel(page)).toHaveCount(0);
    await expect(card).toBeFocused();
  });

  test("at 375x812 the folded panel's bar is a full-width button and never covers the page's last line", async ({ page }) => {
    const ventureId = await saveIdea(page, "Invented — phone bar test");
    await page.goto(`/cockpit?venture=${ventureId}`);
    await stage(page, "Sole Prop activation").click();
    await button(page, "Fold the panel").click();
    const bar = button(page, "Show the panel: Sole Prop activation");
    const box = (await bar.boundingBox())!;
    expect(Math.round(box.width)).toBe(375);
    expect(box.height).toBeGreaterThanOrEqual(44);

    // Scrolled to the very bottom, the disclaimer line is not under the bar.
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    const footerLink = page.getByRole("link", { name: "open source on GitHub" });
    expect(await onTop(footerLink)).toBe(true);
    expect(await onTop(page.getByText(/^Information, not legal or tax advice/))).toBe(true);

    // The fold buttons are at least 32 px tall on a phone, and so are Look closer, its items (the first visit's
    // Show the legend and Show the what-if bar since 2026-10-20) and the coach line's Got it.
    for (const name of ["Fold goal and gauges", "Got it"]) {
      const b = (await button(page, name).boundingBox())!;
      expect(b.height, name).toBeGreaterThanOrEqual(32);
    }
    await goalBar(page).getByRole("button", { name: "Look closer" }).click();
    for (const name of ["Show the legend", "Show the what-if bar"]) {
      const b = (await page.getByRole("menuitem", { name, exact: true }).boundingBox())!;
      expect(b.height, name).toBeGreaterThanOrEqual(32);
    }
    await page.keyboard.press("Escape");
    // The overlay switches at least 24 px, the smallest target WCAG 2.5.8 asks for (about 20 px before the
    // calm view): they wrap to two lines above the road, and at 32 px that row pushed the road down (a review,
    // 2026-10-17).
    for (const label of ["Skills", "Money", "Rules & tax"]) {
      const b = (await page.getByRole("group", { name: "Overlays" }).getByRole("button", { name: new RegExp(`^${label}`) }).boundingBox())!;
      expect(b.height, label).toBeGreaterThanOrEqual(24);
    }
    const look = (await goalBar(page).getByRole("button", { name: "Look closer" }).boundingBox())!;
    expect(look.height, "Look closer").toBeGreaterThanOrEqual(32);
  });
});
