/**
 * The app's main paths, in a real browser against a real (throwaway) database.
 *
 * Each test is something a person does, checked the way they'd see it. When a new screen
 * lands, its main path gets a test here; edge cases come from
 * docs/architecture/settings-and-edge-cases.md.
 */
import { expect, test, type Page } from "@playwright/test";

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

test("the disclaimer footer is on the page and inside the window", async ({ page }) => {
  await page.goto("/");
  const footer = page.getByRole("contentinfo");
  await expect(footer).toContainText("Information, not legal or tax advice");
  const box = await footer.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.y + box!.height).toBeLessThanOrEqual(720 + 1);
});
