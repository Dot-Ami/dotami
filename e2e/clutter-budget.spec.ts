/**
 * The clutter limit (docs/ui-spec/README.md, "The layout rule"; the maintainer's pick of 2026-10-17: a calm
 * first view, enforced by a limit on how busy a screen can get), in a real browser on the production build.
 *
 * Each main screen is opened at 375x812, 768x1024 and 1280x720, as a person arriving on it sees it (nothing
 * clicked, nothing scrolled), and four things are measured:
 *
 * - regions: drawn blocks marked `data-region="<name>"`, anywhere on the page;
 * - controls: usable links, buttons, boxes, menus and switches at least partly inside the first window;
 * - text sizes: the distinct computed font sizes of the text drawn on the page;
 * - the smallest text size.
 *
 * Each is held to its budget in `e2e/budgets.ts`, which can only go down. A screenshot of each screen at each
 * size, and what was counted (the regions' names, each control's name, the sizes), are saved with the
 * results (test-results/; CI keeps only the log lines, one per screen and size). The budgets are what CI
 * measures on Ubuntu; a run on Windows adds the few extras recorded in `WINDOWS_EXTRA`.
 *
 * The cockpit is measured on a fresh idea straight after *Pick a future*, the designed first visit
 * (docs/architecture/future-cockpit.md § 2, "First visit and return visits"), on road 0 and on road 1.
 * *Your futures* is measured with a fresh idea at the top of its list, so its first window is the same
 * whatever ran before. *What DotAmi knows about you* counts everything in the data file, which the suite's
 * earlier tests (e2e/app.spec.ts, which runs first) fill with figures: its budget is the larger of a run of
 * this file on its own and a full run, and a new earlier test that keeps figures from a new source can push
 * it over (each source is one more row in its first window).
 */
import { writeFileSync } from "node:fs";

import { expect, test, type Locator, type Page, type TestInfo } from "@playwright/test";

import { generalRoadV2026, roadApprenticeToOwnShopAB } from "../lib/engines/roads/v2026";
import { waitForReact } from "../tests/helpers/react-ready";
import { BUDGETS, WIDTHS, WINDOWS_EXTRA, type Clutter, type ScreenId } from "./budgets";

const Q1 = /what do you want your work and life to look like/;
const Q2 = "Are you after a business of your own, a job or career, or both?";
const Q3 = "Which province or territory are you in?";

/** What one measurement found: the four numbers, and what was counted, for the report. */
interface Measured extends Clutter {
  regionNames: string[];
  controlNames: string[];
  sizesPx: number[];
}

/**
 * Measures the page as it is drawn now. Runs in the page, so it must stand alone.
 *
 * Controls are counted only where a person can see them in the first window: a control is clipped by every
 * box around it that hides or scrolls its overflow (the road's own area, the rail), then by the window.
 * Text is counted anywhere on the page, scrolled to or not, except text drawn only for a screen reader (a
 * box of 1 px or less that hides its overflow, Tailwind's `sr-only`).
 */
function measurePage(): Measured {
  const CONTROL =
    'a[href], button, input:not([type="hidden"]), select, textarea, summary, [role="button"], [role="link"], [role="checkbox"], [role="radio"], [role="switch"], [role="tab"], [role="menuitem"], [role="combobox"], [contenteditable="true"]';

  const drawn = (el: Element) => {
    if (!el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };

  /** The part of the element inside the first window, after every box around it that clips it. */
  const inFirstWindow = (el: Element) => {
    const r = el.getBoundingClientRect();
    let left = r.left;
    let top = r.top;
    let right = r.right;
    let bottom = r.bottom;
    for (let node: Element | null = el; node && node !== document.documentElement; node = node.parentElement) {
      const style = getComputedStyle(node);
      if (node !== el && (style.overflowX !== "visible" || style.overflowY !== "visible")) {
        const box = node.getBoundingClientRect();
        left = Math.max(left, box.left);
        top = Math.max(top, box.top);
        right = Math.min(right, box.right);
        bottom = Math.min(bottom, box.bottom);
      }
      // Boxes around a fixed element don't clip it (a sheet, the panel's bar on a phone).
      if (style.position === "fixed") break;
    }
    left = Math.max(left, 0);
    top = Math.max(top, 0);
    right = Math.min(right, window.innerWidth);
    bottom = Math.min(bottom, window.innerHeight);
    return right - left > 0 && bottom - top > 0;
  };

  const regionNames = [...document.querySelectorAll<HTMLElement>("[data-region]")]
    .filter(drawn)
    .map((el) => el.dataset.region ?? "");

  const controlNames = [...document.querySelectorAll(CONTROL)]
    .filter((el) => {
      // A control inside another (a button inside a link) is one thing to press.
      if (el.parentElement?.closest(CONTROL)) return false;
      if (el.matches(":disabled") || el.getAttribute("aria-disabled") === "true") return false;
      // Behind a sheet: the page under it can't be used.
      if (el.closest("[inert]")) return false;
      return drawn(el) && inFirstWindow(el);
    })
    .map((el) => {
      const name = (el.getAttribute("aria-label") ?? (el as HTMLElement).innerText ?? "").replace(/\s+/g, " ").trim();
      return `${el.tagName.toLowerCase()}: ${name.slice(0, 60)}`;
    });

  /** Text only a screen reader hears: inside a box of 1 px or less that hides its overflow. */
  const screenReaderOnly = (el: Element) => {
    for (let node: Element | null = el; node; node = node.parentElement) {
      const style = getComputedStyle(node);
      if (style.overflowX !== "visible" || style.overflowY !== "visible") {
        const box = node.getBoundingClientRect();
        if (box.width <= 1 || box.height <= 1) return true;
      }
    }
    return false;
  };

  const sizes = new Set<number>();
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (!node.textContent?.trim()) continue;
    const parent = node.parentElement;
    if (!parent || parent.closest("script, style, noscript, template")) continue;
    if (!parent.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) continue;
    range.selectNodeContents(node);
    const box = range.getBoundingClientRect();
    if (box.width === 0 || box.height === 0) continue;
    if (screenReaderOnly(parent)) continue;
    sizes.add(Math.round(parseFloat(getComputedStyle(parent).fontSize) * 100) / 100);
  }
  const sizesPx = [...sizes].sort((a, b) => a - b);

  return {
    regions: regionNames.length,
    controls: controlNames.length,
    textSizes: sizesPx.length,
    smallestTextPx: sizesPx[0] ?? 0,
    regionNames,
    controlNames,
    sizesPx,
  };
}

/**
 * Opens the screen at each of the three sizes with `open` (which loads it and waits until it is ready),
 * measures it, saves a screenshot and what was counted, and holds it to its budget. Every size is measured
 * and saved before the test fails, so one failing size doesn't hide another.
 */
async function measureAtEverySize(page: Page, testInfo: TestInfo, screen: ScreenId, open: () => Promise<void>) {
  const found: Record<string, Measured> = {};
  for (const size of WIDTHS) {
    const label = `${screen} at ${size.width}x${size.height}`;
    await page.setViewportSize({ width: size.width, height: size.height });
    await open();
    // Text sizes and line breaks are final only once the self-hosted fonts are in.
    await page.evaluate(async () => {
      await document.fonts.ready;
      window.scrollTo(0, 0);
    });
    const measured = await page.evaluate(measurePage);
    found[size.id] = measured;

    const shot = testInfo.outputPath(`${screen}-${size.width}x${size.height}.png`);
    await page.screenshot({ path: shot });
    await testInfo.attach(`${label}.png`, { path: shot, contentType: "image/png" });
    console.log(
      `clutter ${label}: ${measured.regions} regions, ${measured.controls} controls, ${measured.textSizes} text sizes, smallest ${measured.smallestTextPx}px`,
    );

    const gate = BUDGETS[screen]?.[size.id];
    expect.soft(gate, `${label}: no budget in e2e/budgets.ts (measured ${JSON.stringify({ ...measured, controlNames: undefined })})`).toBeDefined();
    if (!gate) continue;
    // The budgets are what CI (Ubuntu) measures; on Windows, where Chromium draws a few screens a little
    // differently, the extra recorded for that screen is added (e2e/budgets.ts, WINDOWS_EXTRA).
    const extra = process.platform === "win32" ? (WINDOWS_EXTRA[screen]?.[size.id] ?? {}) : {};
    const budget: Clutter = {
      ...gate,
      regions: gate.regions + (extra.regions ?? 0),
      controls: gate.controls + (extra.controls ?? 0),
      textSizes: gate.textSizes + (extra.textSizes ?? 0),
    };
    expect.soft(measured.regions, `${label}: regions (${measured.regionNames.join(", ")})`).toBeLessThanOrEqual(budget.regions);
    expect.soft(measured.controls, `${label}: controls in the first window (${measured.controlNames.join(" | ")})`).toBeLessThanOrEqual(
      budget.controls,
    );
    expect.soft(measured.textSizes, `${label}: text sizes (${measured.sizesPx.join(", ")} px)`).toBeLessThanOrEqual(budget.textSizes);
    expect.soft(measured.smallestTextPx, `${label}: the smallest text, px`).toBeGreaterThanOrEqual(budget.smallestTextPx);
  }
  // What was counted, beside the screenshots: the regions' names, every control's name and the sizes.
  const counted = testInfo.outputPath(`${screen}.json`);
  writeFileSync(counted, JSON.stringify(found, null, 2));
  await testInfo.attach(`${screen}.json`, { path: counted, contentType: "application/json" });
}

/** Loads a page and waits until it is drawn, taken over by React and done fetching. */
async function load(page: Page, url: string, ready: (page: Page) => Locator) {
  await page.goto(url);
  const marker = ready(page);
  await expect(marker).toBeVisible();
  await waitForReact(marker);
  await page.waitForLoadState("networkidle");
}

/**
 * *Your destination* answered in this tab the way a person who doesn't know yet answers it: question 1 "I
 * don't know yet" (keeps nothing) unless the data file already holds a destination, a business of their own,
 * Alberta, and question 4 skipped (keeps nothing) unless an income is already agreed. Ends on its way on.
 */
async function answerDestination(page: Page) {
  await page.goto("/start");
  const q1 = page.getByRole("textbox", { name: Q1 });
  await expect(q1.or(page.getByRole("heading", { name: Q2, level: 2 })).first()).toBeVisible();
  if (await q1.isVisible()) {
    const dontKnow = page.getByRole("button", { name: "I don't know yet" });
    await waitForReact(dontKnow);
    await dontKnow.click();
  }
  const business = page.getByRole("button", { name: "A business of my own" });
  await waitForReact(business);
  await business.click();
  await page.getByRole("combobox", { name: Q3 }).selectOption("CA-AB");
  await page.getByRole("button", { name: "Use this place" }).click();
  const next = page.getByRole("link", { name: "Pick a future →" });
  const skip = page.getByRole("button", { name: "Skip" });
  await expect(next.or(skip).first()).toBeVisible();
  if (await skip.isVisible()) await skip.click();
  await expect(next).toBeVisible();
}

/** A fresh idea picked on *Pick a future*, as a person picks one; returns the cockpit's address for it. */
async function pickFuture(page: Page, roadLabel: string): Promise<string> {
  await answerDestination(page);
  await page.getByRole("link", { name: "Pick a future →" }).click();
  await expect(page).toHaveURL(/\/futures$/);
  const lookInside = page.getByRole("button", { name: `Look inside ${roadLabel}` });
  await waitForReact(lookInside);
  await lookInside.click();
  await expect(page).toHaveURL(/\/cockpit\?venture=/);
  return new URL(page.url()).pathname + new URL(page.url()).search;
}

const road = (page: Page) => page.getByRole("region", { name: "The road" });

test("the front door stays within its clutter budget", async ({ page }, testInfo) => {
  await measureAtEverySize(page, testInfo, "front-door", () => load(page, "/", (p) => p.getByRole("heading", { level: 1 })));
});

test("Your destination stays within its clutter budget", async ({ page }, testInfo) => {
  await measureAtEverySize(page, testInfo, "start", () => load(page, "/start", (p) => p.getByRole("heading", { level: 2 }).first()));
});

test("Pick a future stays within its clutter budget", async ({ page }, testInfo) => {
  await answerDestination(page);
  await measureAtEverySize(page, testInfo, "futures", () =>
    load(page, "/futures", (p) => p.getByRole("button", { name: `Look inside ${generalRoadV2026.label}` })),
  );
});

test("the intake stays within its clutter budget", async ({ page }, testInfo) => {
  await measureAtEverySize(page, testInfo, "intake", () => load(page, "/intake", (p) => p.getByRole("heading", { level: 1 })));
});

test("Your futures stays within its clutter budget", async ({ page }, testInfo) => {
  // A future just picked is listed first (the list is by last touched), so the first window shows the same
  // card whatever the suite's earlier tests saved.
  await pickFuture(page, generalRoadV2026.label);
  await measureAtEverySize(page, testInfo, "ventures", async () => {
    await load(page, "/ventures", (p) => p.getByRole("heading", { level: 1 }));
    await expect(page.getByText("Loading…", { exact: true })).toHaveCount(0);
  });
});

test("What DotAmi knows about you stays within its clutter budget", async ({ page }, testInfo) => {
  await measureAtEverySize(page, testInfo, "your-data", () => load(page, "/your-data", (p) => p.getByRole("heading", { level: 1 })));
});

test("the example, Mara, stays within its clutter budget", async ({ page }, testInfo) => {
  await measureAtEverySize(page, testInfo, "example-mara", () => load(page, "/example/mara", road));
});

test("the cockpit on road 0, a first visit, stays within its clutter budget", async ({ page }, testInfo) => {
  const cockpit = await pickFuture(page, generalRoadV2026.label);
  await measureAtEverySize(page, testInfo, "cockpit-road-0", () => load(page, cockpit, road));
});

test("the cockpit on road 1, a first visit, stays within its clutter budget", async ({ page }, testInfo) => {
  const cockpit = await pickFuture(page, roadApprenticeToOwnShopAB.label);
  await measureAtEverySize(page, testInfo, "cockpit-road-1", () => load(page, cockpit, road));
});

test("Your plan stays within its clutter budget", async ({ page }, testInfo) => {
  const cockpit = await pickFuture(page, generalRoadV2026.label);
  const plan = cockpit.replace("/cockpit", "/plan");
  await measureAtEverySize(page, testInfo, "plan", () => load(page, plan, (p) => p.getByRole("heading", { level: 1 })));
});
