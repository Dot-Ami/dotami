/**
 * The app's main paths, in a real browser against a real (throwaway) database.
 *
 * Each test is something a person does, checked the way they'd see it. When a new screen
 * lands, its main path gets a test here; edge cases come from
 * docs/architecture/settings-and-edge-cases.md.
 */
import http from "node:http";

import { expect, test, type Page } from "@playwright/test";

import { SETTING_GROUPS, SETTINGS } from "../lib/settings/catalog";

/**
 * The dropdown under one of the intake's labelled groups ("Province / territory", …). The label
 * is a plain <p> that isn't tied to its <select>, so a screen reader can't name the dropdown
 * either — a finding for the screen-by-screen review; until then, take the select that follows it.
 */
function groupSelect(page: Page, label: string) {
  return page.getByText(label, { exact: true }).locator("xpath=following-sibling::select");
}

test("one sentence becomes a saved map", async ({ page }) => {
  // Let the page finish loading so the test types into the live page. (This test is what caught
  // the landing page being dead in production builds: its scripts were blocked by the CSP and
  // "Map it" never enabled — fixed in app/layout.tsx.)
  await page.goto("/", { waitUntil: "networkidle" });
  await page.getByPlaceholder(/What are you building/).fill("A mobile bike repair business with a van in Calgary");
  await page.getByRole("button", { name: "Map it →" }).click();

  // About you → continue.
  await expect(page).toHaveURL(/\/intake/);
  await page.getByRole("button", { name: "Continue →" }).click();

  // Confirm what was understood: "repair" is a trade, not AI (#2), and the chips say so to a
  // screen reader (#12).
  await expect(page.getByRole("button", { name: "Trades", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: "AI / ML / R&D", exact: true })).toHaveAttribute("aria-pressed", "false");
  await page.getByRole("button", { name: "Looks right →" }).click();

  // Ground it: Calgary was read as Alberta; the map won't open until employment is chosen (#7).
  await expect(groupSelect(page, "Province / territory")).toHaveValue("AB");
  const openMap = page.getByRole("button", { name: "Open my map →" });
  await expect(openMap).toBeDisabled();
  await groupSelect(page, "Current employment").selectOption("self-employed");
  await expect(openMap).toBeEnabled();
  await openMap.click();

  // The map, with named stage cards.
  await expect(page).toHaveURL(/\/cockpit/);
  await expect(page.getByRole("button", { name: /^Sole Prop activation, / })).toBeVisible();

  // Saved: the ideas page lists it after a fresh load, with its tag.
  await page.goto("/ventures");
  const card = page.getByRole("listitem").filter({ has: page.getByRole("heading", { name: "My venture", level: 2 }) });
  await expect(card).toBeVisible();
  await expect(card.getByText("Trades", { exact: true })).toBeVisible();
});

test("a stage change on the ideas page survives a reload", async ({ page }) => {
  await page.goto("/ventures");
  const card = page
    .getByRole("listitem")
    .filter({ has: page.getByRole("heading", { name: "Demo — Chinook Sign Painting", level: 2 }) });
  const stage = card.getByRole("combobox").first();
  await expect(stage).toHaveValue("prototype");

  // The save is a PATCH to the server; start listening before the change so a fast reply
  // can't slip past, and wait for it rather than for a timer.
  const saved = page.waitForResponse(
    (r) => r.url().includes("/api/ventures/") && r.request().method() === "PATCH" && r.ok(),
  );
  await stage.selectOption("established");
  await saved;

  await page.reload();
  await expect(
    page
      .getByRole("listitem")
      .filter({ has: page.getByRole("heading", { name: "Demo — Chinook Sign Painting", level: 2 }) })
      .getByRole("combobox")
      .first(),
  ).toHaveValue("established");
});

test("the settings page: every group, what's true today, every setting and its warning", async ({ page }) => {
  await page.goto("/", { waitUntil: "networkidle" });
  await page.getByRole("link", { name: "Settings", exact: true }).click();
  await expect(page).toHaveURL(/\/settings$/);

  for (const g of SETTING_GROUPS) {
    await expect(page.getByRole("heading", { name: g.title, level: 2 })).toBeVisible();
  }

  // "Today" is read from the running app: its data file is this run's throwaway database, and
  // with no model key (playwright.config.ts) the typed sentence never leaves the computer.
  const data = page.getByRole("region", { name: "Data and backups" });
  const filePath = data.locator("code").filter({ hasText: /e2e\.db$/ });
  await expect(filePath).toBeVisible();
  const privacy = page.getByRole("region", { name: "Privacy" });
  await expect(privacy).toContainText("DotAmi sends nothing off this computer.");
  await expect(privacy).not.toContainText("sent to Anthropic");

  // Every planned setting is listed with its default, its warning when it has one, and the story
  // that brings it — and nothing on the page pretends to be a switch that works.
  for (const s of SETTINGS) {
    const row = page
      .getByRole("listitem")
      .filter({ has: page.getByRole("heading", { name: s.label, level: 3, exact: true }) });
    await expect(row).toContainText(s.defaultValue);
    if (s.warning) await expect(row).toContainText(s.warning);
    if (s.status === "planned") await expect(row).toContainText(`Not built yet · [${s.story}]`);
    if (s.status === "asked") await expect(row).toContainText(`Asked each time · ${s.where}`);
  }
  await expect(page.locator("main").locator("input, select, textarea")).toHaveCount(0);

  // The one control: the data file's path lands on the clipboard exactly as shown.
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  await data.getByRole("button", { name: "Copy path" }).click();
  await expect(data.getByRole("button", { name: "Copied" })).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(await filePath.textContent());

  // A long path wraps on a phone-width window instead of pushing the page sideways.
  await page.setViewportSize({ width: 390, height: 800 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

  // Reachable from the ideas page too.
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("/ventures");
  await page.getByRole("link", { name: "Settings", exact: true }).click();
  await expect(page).toHaveURL(/\/settings$/);
});

/** A raw GET with headers a browser page could be tricked into sending; resolves with the status. */
function rawGet(baseURL: string, path: string, headers: Record<string, string>): Promise<number> {
  const { hostname, port } = new URL(baseURL);
  return new Promise((resolve, reject) => {
    const req = http.request({ host: hostname, port, path, method: "GET", headers }, (res) => {
      res.resume();
      resolve(res.statusCode ?? 0);
    });
    req.on("error", reject);
    req.end();
  });
}

test("answers only on this computer's own address (DNS rebinding guard)", async ({ baseURL }) => {
  const port = new URL(baseURL!).port;
  // A rebound page sends its own domain as the Host: data routes, pages and prefetches all refuse.
  expect(await rawGet(baseURL!, "/api/ventures", { Host: `evil.example:${port}` })).toBe(421);
  expect(await rawGet(baseURL!, "/", { Host: `evil.example:${port}` })).toBe(421);
  expect(await rawGet(baseURL!, "/ventures", { Host: `evil.example:${port}`, "next-router-prefetch": "1" })).toBe(421);
  expect(await rawGet(baseURL!, "/api/ventures", { Host: `evil.example:${port}`, purpose: "prefetch" })).toBe(421);
  // This computer's own names still work.
  expect(await rawGet(baseURL!, "/api/ventures", { Host: `127.0.0.1:${port}` })).toBe(200);
  expect(await rawGet(baseURL!, "/api/ventures", { Host: `localhost:${port}` })).toBe(200);
});

test("the disclaimer footer is on the page and inside the window", async ({ page }) => {
  await page.goto("/");
  const footer = page.getByRole("contentinfo");
  await expect(footer).toContainText("Information, not legal or tax advice");
  const box = await footer.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.y + box!.height).toBeLessThanOrEqual(720 + 1);
});
