/**
 * The clutter limit (docs/ui-spec/README.md, "The layout rule"; the maintainer's pick of 2026-10-17: a calm
 * first view, enforced by a limit on how busy a screen can get), in a real browser on the production build.
 *
 * Each main screen is opened at 375x812, 768x1024 and 1280x720, as a person arriving on it sees it (nothing
 * clicked, nothing scrolled), and four things are measured:
 *
 * - regions: drawn blocks marked `data-region="<name>"`, anywhere on the page;
 * - controls: usable links, buttons, boxes, menus and switches inside the first window, at least 24 px of
 *   each showing (or all of it, if smaller);
 * - text sizes: the distinct computed font sizes of the text drawn on the page;
 * - the smallest text size.
 *
 * Each is held to its budget in `e2e/budgets.ts`, which can only go down. The measurer is `e2e/clutter-measure.ts`,
 * shared with the idea sweep (e2e/idea-sweep.spec.ts). Regions are counted by their marks,
 * so the test also fails on any drawn landmark or section (header, nav, aside, footer, section, main, and
 * their roles, a group) that is no region, sits inside none and holds none. A screenshot of each screen at
 * each size, and what was counted (the regions' names, each control's name, the sizes), are saved with the
 * results (test-results/; CI keeps only the log lines, one per screen and size). The budgets are what CI
 * measures on Ubuntu; a run on Windows adds the few extras recorded in `WINDOWS_EXTRA`.
 *
 * This file starts a server of its own, from the suite's build, over a data folder of its own
 * (prisma/e2e-clutter/) holding only the two demo ventures, so what it measures doesn't depend on what the
 * suite's other files saved. *What DotAmi knows about you* is measured first, on that seed alone: it counts
 * everything in the data file. The cockpit is then measured on a fresh idea straight after *Pick a future*,
 * the designed first visit (docs/architecture/future-cockpit.md § 2, "First visit and return visits"), on
 * road 0 and on road 1, and *Your futures* with a fresh idea at the top of its list.
 */
import { execFileSync, spawn, type ChildProcess } from "node:child_process";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import net from "node:net";
import path from "node:path";

import { expect, test, type Locator, type Page, type TestInfo } from "@playwright/test";

import { generalRoadV2026, roadApprenticeToOwnShopAB } from "../lib/engines/roads/v2026";
import { waitForReact } from "../tests/helpers/react-ready";
import { BUDGETS, WIDTHS, WINDOWS_EXTRA, type Clutter, type ScreenId } from "./budgets";
import { intakeStepsWords, jobStepWords, pickWords, whereStepWords } from "../lib/front-door/words";

import { measurePage, type Measured } from "./clutter-measure";
import { answerWhereInAlberta, pickTheJob, skipTheJob } from "./three-steps";

// Case-blind: the question starts with "What" since 2026-10-20 (it began "In a few years, what …").
const Q1 = /what do you want your work and life to look like/i;
const Q2 = "Are you after a business of your own, a job or career, or both?";
const Q3 = "Which province or territory are you in?";

// This file's own server (e2e/receipt-new-key.spec.ts starts one the same way, on 3124).
const PORT = 3125;
const DATABASE_URL = "file:./e2e-clutter/dotami.db";
const root = process.cwd();
const folder = path.join(root, "prisma", "e2e-clutter");
let server: ChildProcess | null = null;

/** True when something already answers on the port (another run's server). */
const portTaken = () =>
  new Promise<boolean>((resolve) => {
    const socket = net.connect({ host: "127.0.0.1", port: PORT });
    socket.setTimeout(2000);
    socket.on("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.on("error", () => resolve(false));
    socket.on("timeout", () => {
      socket.destroy();
      resolve(false);
    });
  });

/** A fresh data folder holding what the suite's own starts with: the tables and the two demo ventures. */
function prepareFolder() {
  if (existsSync(folder)) rmSync(folder, { recursive: true, force: true });
  mkdirSync(folder, { recursive: true });
  const env = { ...process.env, DATABASE_URL, CHECKPOINT_DISABLE: "1" };
  const run = (script: string[], args: string[]) =>
    execFileSync(process.execPath, [path.join(root, "node_modules", ...script), ...args], { env, stdio: "pipe" });
  run(["prisma", "build", "index.js"], ["migrate", "deploy"]);
  run(["tsx", "dist", "cli.mjs"], ["prisma/seed.ts"]);
}

test.beforeAll(async () => {
  test.setTimeout(180_000);
  if (await portTaken()) throw new Error(`Port ${PORT} is already in use: another run's server is answering there. Stop it, then start again.`);
  prepareFolder();
  // The environment the suite's own server gets (playwright.config.ts), over this file's data folder.
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    DATABASE_URL,
    ANTHROPIC_API_KEY: "",
    NEXT_TELEMETRY_DISABLED: "1",
    DOTAMI_E2E_RATE_LIMITS: "opt-in",
  };
  delete env.DOTAMI_DESKTOP;
  delete env.DOTAMI_RECEIPT_LOCK;
  delete env.DOTAMI_RECEIPT_KEY;
  // The build the suite's own server is running (playwright.config.ts built it before starting).
  server = spawn(process.execPath, [path.join(root, "scripts", "next.mjs"), "start", "-H", "127.0.0.1", "-p", String(PORT)], {
    cwd: root,
    env,
    stdio: ["ignore", "pipe", "pipe"],
  });
  // Ready when THIS server says so (the same rule as the suite's own server).
  await new Promise<void>((resolve, reject) => {
    let said = "";
    const timer = setTimeout(() => reject(new Error(`this file's server didn't start:\n${said}`)), 90_000);
    const listen = (chunk: Buffer) => {
      said += chunk.toString();
      if (/Ready in \d/.test(said)) {
        clearTimeout(timer);
        resolve();
      }
    };
    server!.stdout!.on("data", listen);
    server!.stderr!.on("data", listen);
    server!.on("exit", (code) => {
      clearTimeout(timer);
      reject(new Error(`this file's server stopped (code ${code}):\n${said}`));
    });
  });
});

test.afterAll(async () => {
  if (server && server.exitCode === null) {
    const stopped = new Promise((resolve) => server!.once("exit", resolve));
    server.kill();
    await stopped;
  }
  server = null;
  rmSync(folder, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
});

test.use({ baseURL: `http://127.0.0.1:${PORT}` });

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

    // Checked whatever the budgets say: a block without a mark isn't counted, so it must not be there.
    expect
      .soft(measured.unmarkedBlocks, `${label}: blocks with no data-region mark, inside no region (the region count can't see them)`)
      .toEqual([]);

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
async function answerDestination(page: Page, place: string = "CA-AB") {
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
  await page.getByRole("combobox", { name: Q3 }).selectOption(place);
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
  // Pick a future opens on its first step (2026-10-22): skipped, every future is listed.
  await skipTheJob(page);
  const lookInside = page.getByRole("button", { name: `Look inside ${roadLabel}` });
  await waitForReact(lookInside);
  await lookInside.click();
  await expect(page).toHaveURL(/\/cockpit\?venture=/);
  return new URL(page.url()).pathname + new URL(page.url()).search;
}

const road = (page: Page) => page.getByRole("region", { name: "The road" });

// First, before any test here saves anything: the page counts everything in the data file, so it is
// measured on the seed alone (a test retried after a failure gets a fresh server and folder too).
test("What DotAmi knows about you stays within its clutter budget", async ({ page }, testInfo) => {
  await measureAtEverySize(page, testInfo, "your-data", () => load(page, "/your-data", (p) => p.getByRole("heading", { level: 1 })));
});

test("the front door stays within its clutter budget", async ({ page }, testInfo) => {
  await measureAtEverySize(page, testInfo, "front-door", () => load(page, "/", (p) => p.getByRole("heading", { level: 1 })));
});

test("Your destination stays within its clutter budget", async ({ page }, testInfo) => {
  await measureAtEverySize(page, testInfo, "start", () => load(page, "/start", (p) => p.getByRole("heading", { level: 2 }).first()));
});

test("Pick a future stays within its clutter budget", async ({ page }, testInfo) => {
  await answerDestination(page);
  // It opens on step 1 of its three steps, What's closest to your work? (2026-10-22), with nothing typed.
  await measureAtEverySize(page, testInfo, "futures", () => load(page, "/futures", (p) => p.getByRole("searchbox", { name: jobStepWords.boxLabel })));
});

// Pick a future's later steps (docs/ui-spec/futures/02-where-you-are.md, 03-road-match.md), each as it opens.
const CABINETMAKERS = { code: "72311.00", label: "Cabinetmakers" };
/** A job no road is written for: step 3's case B, the longest. */
const BARBERS = { code: "63210.02", label: "Barbers" };

/** Pick a future, freshly loaded, then step 1 answered with `job`. */
async function stepOneAnswered(page: Page, job: { code: string; label: string }) {
  await load(page, "/futures", (p) => p.getByRole("searchbox", { name: jobStepWords.boxLabel }));
  await pickTheJob(page, job);
}

test("Pick a future's area question stays within its clutter budget", async ({ page }, testInfo) => {
  await answerDestination(page);
  await measureAtEverySize(page, testInfo, "futures-area", async () => {
    await stepOneAnswered(page, CABINETMAKERS);
    await expect(page.getByRole("combobox", { name: whereStepWords.area.label })).toBeVisible();
  });
});

test("Pick a future's region question stays within its clutter budget", async ({ page }, testInfo) => {
  await answerDestination(page);
  await measureAtEverySize(page, testInfo, "futures-region", async () => {
    await stepOneAnswered(page, CABINETMAKERS);
    await page.getByRole("combobox", { name: whereStepWords.area.label }).selectOption("cma-825");
    await page.getByRole("button", { name: whereStepWords.area.next, exact: true }).click();
    await expect(page.getByRole("combobox", { name: whereStepWords.region.label })).toBeVisible();
  });
});

test("Pick a future's step 2 outside Alberta stays within its clutter budget", async ({ page }, testInfo) => {
  await answerDestination(page, "CA-ON");
  await measureAtEverySize(page, testInfo, "futures-outside", async () => {
    await stepOneAnswered(page, CABINETMAKERS);
    await expect(page.getByRole("button", { name: whereStepWords.outside.next, exact: true })).toBeVisible();
  });
});

test("Pick a future's step 3 for a job with no written road stays within its clutter budget", async ({ page }, testInfo) => {
  await answerDestination(page);
  await measureAtEverySize(page, testInfo, "futures-road", async () => {
    await stepOneAnswered(page, BARBERS);
    await answerWhereInAlberta(page, "cma-825", "4830");
    await expect(page.getByRole("heading", { name: pickWords.noRoad.heading(BARBERS.label, BARBERS.code) })).toBeVisible();
  });
});

/** The intake to Screen B, answered, then its button into the three steps (the typed way's end, 2026-10-22). */
async function intakeSteps(page: Page) {
  await page.goto("/");
  const box = page.getByPlaceholder(/What are you building/);
  await waitForReact(box);
  await box.fill("Custom kitchen cabinets in Calgary");
  await page.getByRole("button", { name: "Map it →" }).click();
  const confirm = page.getByRole("heading", { name: /Did we get this/ });
  const aboutYou = page.getByRole("heading", { name: /about you/ });
  await expect(aboutYou.or(confirm).first()).toBeVisible();
  if (await aboutYou.isVisible()) await page.getByRole("button", { name: "Continue →" }).click();
  await page.getByRole("button", { name: "Looks right →" }).click();
  await page.getByRole("combobox", { name: "Province / territory", exact: true }).selectOption("AB");
  await page.getByRole("combobox", { name: "Current employment", exact: true }).selectOption("self-employed");
  await page.getByRole("button", { name: intakeStepsWords.next, exact: true }).click();
  const search = page.getByRole("searchbox", { name: jobStepWords.boxLabel });
  await expect(search).toBeVisible();
  await waitForReact(search);
}

test("the intake's step 1 stays within its clutter budget", async ({ page }, testInfo) => {
  await measureAtEverySize(page, testInfo, "intake-steps", () => intakeSteps(page));
});

test("the intake's step 3 for a job with no written road stays within its clutter budget", async ({ page }, testInfo) => {
  await measureAtEverySize(page, testInfo, "intake-road", async () => {
    await intakeSteps(page);
    await pickTheJob(page, BARBERS);
    await answerWhereInAlberta(page, "cma-825", "4830");
    await expect(page.getByRole("heading", { name: pickWords.noRoad.heading(BARBERS.label, BARBERS.code) })).toBeVisible();
  });
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
