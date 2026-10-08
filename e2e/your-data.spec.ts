/**
 * [8d] "What DotAmi knows about you" (/your-data), in a real browser on the production build.
 *
 * Runs after e2e/app.spec.ts in the same throwaway database, so it makes its own figure and
 * statement rather than relying on what the earlier tests left, and asserts only on those.
 */
import { expect, test, type Page } from "@playwright/test";

import { SENT_ELSEWHERE, TABLES, WINDOW_STORAGE } from "../lib/privacy/inventory";

/** The amount typed in the test. It must never appear in a URL, and the statement's words only as a count. */
const AMOUNT_TYPED = "12,345.67";
const AMOUNT_SHOWN = "$12,345.67";
const STATEMENT_WORDS = "my invented statement for the your-data page test";

const pad = (n: number) => String(n).padStart(2, "0");

/** The first and last day of last calendar month, so the figure has ended whatever day the test runs. */
function lastMonth(): { from: string; to: string } {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const last = new Date(now.getFullYear(), now.getMonth(), 0);
  const day = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  return { from: day(first), to: day(last) };
}

/** Types a figure on the Chinook idea and agrees to it in the agree prompt — the only way one becomes "agreed". */
async function typeAndAgree(page: Page) {
  const { from, to } = lastMonth();
  await page.goto("/ventures");
  const card = page
    .getByRole("listitem")
    .filter({ has: page.getByRole("heading", { name: "Demo — Chinook Sign Painting", level: 2 }) })
    .first();
  await card.getByRole("button", { name: "Add a figure" }).click();
  await card.getByLabel("From", { exact: true }).fill(from);
  await card.getByLabel("To", { exact: true }).fill(to);
  await card.getByLabel("Amount", { exact: true }).fill(AMOUNT_TYPED);
  await card.getByRole("button", { name: "Review this figure" }).click();
  const prompt = page.getByRole("dialog", { name: "Agree to these figures?" });
  await expect(prompt).toBeVisible();
  await prompt.getByRole("button", { name: "Agree", exact: true }).click();
  await expect(prompt).toBeHidden();
}

test("what DotAmi knows lists an agreed figure under its source, with the day it was agreed", async ({ page }) => {
  await typeAndAgree(page);
  const { from, to } = lastMonth();
  // The server and this test run on the same computer, so "today" is the same local day for both.
  const today = new Date().toLocaleDateString("en-CA");
  expect((await page.request.post("/api/person/statements", { data: { text: STATEMENT_WORDS } })).status()).toBe(200);

  // Watch every request the page makes from here on.
  const seen: string[] = [];
  page.on("request", (r) => seen.push(r.url()));

  const response = await page.goto("/your-data");
  // Read from the file on every visit, so it must never be served from a cache. Measured, not assumed.
  expect(response!.headers()["cache-control"] ?? "").toContain("no-store");
  await expect(page.getByRole("heading", { name: "What DotAmi knows about you", level: 1 })).toBeVisible();

  const figures = page.getByRole("region", { name: "Your figures, by source" });
  const source = figures
    .getByRole("listitem")
    .filter({ has: page.getByRole("heading", { name: "typed by you", level: 3, exact: true }) })
    .first();
  await expect(source).toContainText("Typed by you");
  await expect(source).toContainText("Demo — Chinook Sign Painting");

  // Collapsed until asked for; opening it shows the figure, its state and its dates.
  await source.locator("summary").click();
  const figure = source.getByRole("listitem").filter({ hasText: AMOUNT_SHOWN });
  await expect(figure).toBeVisible();
  await expect(figure).toContainText(`${from} to ${to}`);
  await expect(figure).toContainText("Agreed");
  // Each day sits beside its name: proposed and agreed today, nothing taken back.
  const dayOf = (name: string) => figure.locator("dt", { hasText: name }).locator("xpath=following-sibling::dd");
  await expect(dayOf("Proposed")).toHaveText(today);
  await expect(dayOf("Agreed")).toHaveText(today);
  await expect(figure.locator("dt", { hasText: "Taken back" })).toHaveCount(0);

  // Counts of everything else: the statement is counted, never shown, and no amount is in a URL.
  const file = page.getByRole("region", { name: "Everything else in the data file" });
  await expect(file.getByRole("listitem").filter({ has: page.getByRole("heading", { name: "Your statements", level: 3 }) })).toContainText(/\d+ records?/);
  await expect(page.locator("main")).not.toContainText(STATEMENT_WORDS);
  for (const url of seen) {
    for (const form of ["1234567", "12345.67", AMOUNT_TYPED, encodeURIComponent(AMOUNT_TYPED)]) {
      expect(url, "an amount in a URL").not.toContain(form);
    }
  }
  // The page itself is asked for with no query string (link prefetches may add their own).
  for (const url of seen.filter((u) => new URL(u).pathname === "/your-data")) {
    expect(new URL(url).search, "this page takes no query string").toBe("");
  }
});

test("what DotAmi knows lists every table and window key the inventory names, and what is true here", async ({ page }) => {
  await page.goto("/your-data");

  for (const title of [
    "Your figures, by source",
    "Everything else in the data file",
    "On this computer, outside the data file",
    "What leaves this computer",
    "Taking things out",
  ]) {
    await expect(page.getByRole("heading", { name: title, level: 2 })).toBeVisible();
  }

  const file = page.getByRole("region", { name: "Everything else in the data file" });
  for (const t of TABLES) {
    await expect(file.getByRole("heading", { name: t.name, level: 3, exact: true })).toBeVisible();
  }

  const computer = page.getByRole("region", { name: "On this computer, outside the data file" });
  // This run's data file is the throwaway e2e.db, the same one Settings shows.
  await expect(computer.locator("code").filter({ hasText: /e2e\.db$/ })).toBeVisible();
  for (const w of WINDOW_STORAGE) {
    await expect(computer.getByText(w.key, { exact: true })).toBeVisible();
  }

  // No model key in the test run (playwright.config.ts), and the browser tests run from source.
  const leaves = page.getByRole("region", { name: "What leaves this computer" });
  for (const s of SENT_ELSEWHERE) {
    await expect(leaves.getByRole("heading", { name: s.name, level: 3, exact: true })).toBeVisible();
  }
  await expect(leaves).toContainText("No model key is set");
  await expect(leaves).toContainText("Not happening in this copy");
});

test("what DotAmi knows only shows: no form control, no delete or forget button", async ({ page }) => {
  await page.goto("/your-data");
  await expect(page.locator("main").locator("input, select, textarea")).toHaveCount(0);
  await expect(page.getByRole("button", { name: /delete|forget|erase|remove/i })).toHaveCount(0);
  // The one kind of button is Copy path, and the page says plainly that it can't remove anything.
  await expect(page.getByRole("region", { name: "Taking things out" })).toContainText("This page can't remove anything");
});

test("what DotAmi knows is reachable from the Privacy group on Settings", async ({ page }) => {
  await page.goto("/settings");
  await page.getByRole("region", { name: "Privacy" }).getByRole("link", { name: "What DotAmi knows about you" }).click();
  await expect(page).toHaveURL(/\/your-data$/);
  await expect(page.getByRole("heading", { name: "What DotAmi knows about you", level: 1 })).toBeVisible();
  // And back.
  await page.getByRole("link", { name: "← Settings" }).click();
  await expect(page).toHaveURL(/\/settings$/);
});

test("what DotAmi knows doesn't scroll sideways on a phone-width window", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto("/your-data");
  // Open every source so the longest rows are on screen.
  for (const summary of await page.locator("summary").all()) await summary.click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

// [8i] The expense records store has no screen yet, so this drives its routes the way an outside
// agent or script would, on the production build, and reads the result on /your-data.
test("expense records: an agent can propose but not agree, and what DotAmi knows counts them without showing their words", async ({ page }) => {
  const PAYEE = "Example Stationery Ltd for the your-data page test";
  const today = new Date().toLocaleDateString("en-CA");

  await page.goto("/ventures");
  const card = page
    .getByRole("listitem")
    .filter({ has: page.getByRole("heading", { name: "Demo — Chinook Sign Painting", level: 2 }) })
    .first();
  const href = await card.getByRole("link", { name: /Open in cockpit/ }).getAttribute("href");
  const ventureId = new URL(href!, "http://x").searchParams.get("venture")!;

  const cardOnPage = async () => {
    await page.goto("/your-data");
    const file = page.getByRole("region", { name: "Everything else in the data file" });
    return file.getByRole("listitem").filter({ has: page.getByRole("heading", { name: "Your expense records", level: 3, exact: true }) });
  };

  // The card says what a record holds and that nothing takes one back yet. (The count is read, not
  // assumed to be zero, so a retried run, which finds the first run's record, still passes.)
  const before = await cardOnPage();
  await expect(before).toContainText("Never a bank or card number");
  await expect(before).toContainText("Nothing in the app takes one back yet");

  // A script proposes a record: it waits. It cannot name a status, and it cannot agree.
  const body = { ventureId, source: { kind: "agent", label: "an agent" }, expenses: [{ date: today, amountCents: 4599, paidTo: PAYEE, whatFor: "printer paper" }] };
  const countOf = async (c: Awaited<ReturnType<typeof cardOnPage>>) => {
    const found = ((await c.textContent()) ?? "").match(/(\d+) records?/);
    return found ? Number(found[1]) : 0;
  };
  const countBefore = await countOf(before);
  expect((await page.request.post("/api/expenses/propose", { data: { ...body, expenses: [{ ...body.expenses[0], status: "confirmed" }] } })).status()).toBe(400);
  const proposed = await page.request.post("/api/expenses/propose", { data: body });
  expect(proposed.status()).toBe(201);
  const [waiting] = ((await proposed.json()) as { expenses: { id: string; status: string }[] }).expenses;
  expect(waiting.status).toBe("proposed");
  expect((await page.request.post("/api/expenses/agree", { data: { ventureId, expenseIds: [waiting.id] } })).status()).toBe(403);

  // A purchase dated after the computer's own day is refused.
  const tomorrow = new Date(Date.now() + 36 * 60 * 60 * 1000).toLocaleDateString("en-CA");
  const future = await page.request.post("/api/expenses/propose", { data: { ...body, expenses: [{ ...body.expenses[0], date: tomorrow }] } });
  expect(future.status()).toBe(400);

  // The page counts the waiting record and shows none of its words or its amount; the idea's id is the only thing in any URL.
  const seen: string[] = [];
  page.on("request", (r) => seen.push(r.url()));
  const after = await cardOnPage();
  expect(await countOf(after)).toBe(countBefore + 1);
  await expect(page.locator("main")).not.toContainText(PAYEE);
  await expect(page.locator("main")).not.toContainText("45.99");
  for (const url of seen) {
    expect(url, "a record's words in a URL").not.toContain("Stationery");
    expect(url, "an amount in a URL").not.toContain("4599");
  }
});
