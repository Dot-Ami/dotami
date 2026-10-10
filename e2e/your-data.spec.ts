/**
 * [8d] "What DotAmi knows about you" (/your-data), in a real browser on the production build.
 *
 * Runs after e2e/app.spec.ts in the same throwaway database, so it makes its own figure and
 * statement rather than relying on what the earlier tests left, and asserts only on those.
 */
import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

import { PrismaClient } from "@prisma/client";
import { expect, test, type Locator, type Page } from "@playwright/test";

import { SENT_ELSEWHERE, SET_ASIDE_RECEIPTS_WARNING as WARNING, TABLES, WINDOW_STORAGE } from "../lib/privacy/inventory";

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
  // This run's data file is the throwaway prisma/e2e/dotami.db, the same one Settings shows.
  await expect(computer.locator("code").filter({ hasText: /e2e[\\/]dotami\.db$/ })).toBeVisible();
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

test("what DotAmi knows changes nothing until Delete is opened: no form control, no forget button", async ({ page }) => {
  await page.goto("/your-data");
  // The one control that can change anything is the Delete button; its menu is closed.
  const removing = page.getByRole("region", { name: "Taking things out" });
  await expect(removing.getByRole("button", { name: "Delete", exact: true })).toBeVisible();
  await expect(removing.getByRole("button", { name: "Delete", exact: true })).toHaveAttribute("aria-expanded", "false");
  await expect(removing).toContainText("can't pick out a single figure, statement or idea");
  await expect(page.locator("main").locator("input, select, textarea")).toHaveCount(0);
  await expect(page.getByRole("button", { name: /delete/i })).toHaveCount(1);
  await expect(page.getByRole("button", { name: /forget|erase|remove/i })).toHaveCount(0);
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

// [8i] This drives the expense routes the way an outside agent or script would, on the production
// build, and reads the result on /your-data. The typing screen has its own tests (e2e/expenses.spec.ts).
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

  // The card says what a record holds and that nothing erases one yet. (The count is read, not
  // assumed to be zero, so a retried run, which finds the first run's record, still passes.)
  const before = await cardOnPage();
  await expect(before).toContainText("Never a bank or card number");
  await expect(before).toContainText("Nothing in the app erases a single record yet");

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

// [8d] Delete. These three run LAST in the last browser-test file (files run A to Z, one worker): the
// last deletes every idea, which the earlier tests rely on. A new e2e file named after
// "your-data" would run after them and find no demo ideas.

/** Reads a table card's count on /your-data: "None" is 0. */
async function tableCount(page: Page, name: string): Promise<number> {
  const card = page
    .getByRole("region", { name: "Everything else in the data file" })
    .getByRole("listitem")
    .filter({ has: page.getByRole("heading", { name, level: 3, exact: true }) });
  await expect(card).toBeVisible();
  const found = ((await card.textContent()) ?? "").match(/(\d+) records?/);
  return found ? Number(found[1]) : 0;
}

async function openDeleteMenu(page: Page) {
  await page.goto("/your-data");
  const removing = page.getByRole("region", { name: "Taking things out" });
  await removing.getByRole("button", { name: "Delete", exact: true }).click();
  await expect(removing.getByRole("group", { name: "What do you want to delete?" })).toBeVisible();
  return removing;
}

const STATEMENTS_BOX = "Your statements (“In your words”)";
const IDEAS_BOX = "Your ideas, with their notes, links and map progress";
const BACKUPS_BOX = "Safety copies in the backups folder";

// This run's data file is prisma/e2e/dotami.db (playwright.config.ts), so its backups folder and its
// wipe-pending note sit beside it in prisma/e2e/. Tests that put files there remove them again.
const DATA_DIR = path.join(process.cwd(), "prisma", "e2e");
const BACKUPS_DIR = path.join(DATA_DIR, "backups");
const WIPE_NOTE = path.join(DATA_DIR, "dotami.db.wipe-pending");

test("Delete: Escape or Cancel at either ask deletes nothing, and the last ask starts on Cancel", async ({ page }) => {
  expect((await page.request.post("/api/person/statements", { data: { text: "a statement Escape must keep" } })).status()).toBe(200);
  await page.goto("/your-data");
  const statementsBefore = await tableCount(page, "Your statements");
  expect(statementsBefore).toBeGreaterThan(0);

  const removing = await openDeleteMenu(page);
  await removing.getByLabel(STATEMENTS_BOX).check();
  await removing.getByRole("button", { name: "Delete what's ticked…" }).click();

  // First ask: Escape goes back to the menu with the box still ticked.
  const first = page.getByRole("dialog", { name: "Delete these?" });
  await expect(first).toContainText(`Your statements: ${statementsBefore} record`);
  await page.keyboard.press("Escape");
  await expect(first).toBeHidden();
  await expect(removing.getByLabel(STATEMENTS_BOX)).toBeChecked();

  // Second ask: focus starts on Cancel, so Enter cancels; Escape cancels too.
  await removing.getByRole("button", { name: "Delete what's ticked…" }).click();
  await page.getByRole("dialog", { name: "Delete these?" }).getByRole("button", { name: "Yes, continue" }).click();
  const second = page.getByRole("dialog", { name: "Delete them now?" });
  await expect(second).toContainText("This can't be undone");
  await expect(second.getByRole("button", { name: "Cancel" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(second).toBeHidden();
  await removing.getByRole("button", { name: "Delete what's ticked…" }).click();
  await page.getByRole("dialog", { name: "Delete these?" }).getByRole("button", { name: "Yes, continue" }).click();
  await expect(page.getByRole("dialog", { name: "Delete them now?" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "Delete them now?" })).toBeHidden();

  await page.reload();
  expect(await tableCount(page, "Your statements")).toBe(statementsBefore);
});

test("Delete: when the wipe couldn't run, the page says the space isn't wiped yet, and Try the wipe again finishes it", async ({ page }) => {
  await page.goto("/your-data");
  const statements = await tableCount(page, "Your statements");
  expect(statements).toBeGreaterThan(0);

  // The server's answer when the rows are gone but the wipe met a lock (tests/privacy-delete.spec.ts
  // makes that happen for real). Here the delete itself is answered by the test, so nothing is
  // deleted; the retry goes to the real server.
  await page.route("**/api/your-data/delete", async (route) => {
    const body = route.request().postDataJSON() as { retryWipe?: boolean };
    if (body.retryWipe) return route.continue();
    return route.fulfill({
      json: { status: "deleted", deleted: { PersonStatement: statements }, left: { PersonStatement: 0 }, wiped: false },
    });
  });

  const removing = await openDeleteMenu(page);
  await removing.getByLabel(STATEMENTS_BOX).check();
  await removing.getByRole("button", { name: "Delete what's ticked…" }).click();
  await page.getByRole("dialog", { name: "Delete these?" }).getByRole("button", { name: "Yes, continue" }).click();
  await page.getByRole("dialog", { name: "Delete them now?" }).getByRole("button", { name: "Delete now" }).click();

  const done = removing.getByRole("status");
  await expect(done).toContainText("Deleted.");
  await expect(done).toContainText("their space in the data file isn't wiped yet");
  await expect(done).not.toContainText("Their space in the data file is wiped");
  await done.getByRole("button", { name: "Try the wipe again" }).click();
  await expect(done).toContainText("Their space in the data file is wiped");
  await expect(done.getByRole("button", { name: "Try the wipe again" })).toBeHidden();
});

/**
 * [8g] The e2e database, opened from the test itself. Nothing in the app adds a bank or card account
 * yet (the statement screen that asks is the next step), so the test puts them in the file the way
 * that screen will.
 */
async function withE2eDb<T>(fn: (db: PrismaClient) => Promise<T>): Promise<T> {
  const file = path.join(process.cwd(), "prisma", "e2e", "dotami.db").split(path.sep).join("/");
  const db = new PrismaClient({ datasourceUrl: `file:${file}` });
  try {
    return await fn(db);
  } finally {
    await db.$disconnect();
  }
}

const ACCOUNTS_BOX = "Your bank and card accounts";

test("Delete: bank and card accounts have their own box, the taken-back ones too, and figures stay", async ({ page }) => {
  // With no account, the box is there and has nothing to delete.
  let removing = await openDeleteMenu(page);
  const box = () => removing.getByRole("listitem").filter({ has: page.getByLabel(ACCOUNTS_BOX) });
  await expect(box()).toContainText("Nothing to delete");
  await expect(removing.getByLabel(ACCOUNTS_BOX)).toBeDisabled();

  // One account in use and one taken back, as the statement screen and Settings will leave them.
  await withE2eDb(async (db) => {
    await db.sourceAccount.create({ data: { name: "Example chequing", allowance: "always", agreedAt: new Date() } });
    await db.sourceAccount.create({ data: { name: "Example Visa ending 4321", allowance: "once", agreedAt: new Date(), retiredAt: new Date() } });
  });
  await page.goto("/your-data");
  expect(await tableCount(page, ACCOUNTS_BOX)).toBe(2);
  const figuresBefore = await tableCount(page, "Your figures");
  // The page counts the accounts and shows no name: Settings is where they are listed.
  await expect(page.locator("main")).not.toContainText("Example chequing");

  removing = await openDeleteMenu(page);
  await expect(box()).toContainText(`${ACCOUNTS_BOX}: 2`);
  await expect(box()).toContainText("including the ones you took back");
  await expect(box()).toContainText("Figures read from their statements stay");
  await box().getByText("Learn more").click();
  await expect(box()).toContainText("“Always allow every account” is a saved choice, so it goes with “Your settings”");

  await removing.getByLabel(ACCOUNTS_BOX).check();
  await removing.getByRole("button", { name: "Delete what's ticked…" }).click();
  const first = page.getByRole("dialog", { name: "Delete these?" });
  await expect(first).toContainText(`${ACCOUNTS_BOX}: 2 records`);
  await first.getByRole("button", { name: "Yes, continue" }).click();
  await page.getByRole("dialog", { name: "Delete them now?" }).getByRole("button", { name: "Delete now" }).click();
  const done = removing.getByRole("status");
  await expect(done).toContainText(`${ACCOUNTS_BOX}: 2 records deleted, 0 left`);
  await expect(done).toContainText("Their space in the data file is wiped");

  await page.reload();
  expect(await tableCount(page, ACCOUNTS_BOX)).toBe(0);
  expect(await tableCount(page, "Your figures")).toBe(figuresBefore);
  expect(await withE2eDb((db) => db.sourceAccount.count())).toBe(0);
});

test("Delete: tick ideas and statements, see what goes and what stays, say yes twice; after a reload the expense records are kept, not attached yet", async ({ page }) => {
  // Two expense records attached to an idea and one not attached, all proposed the way an agent
  // would (an agent may propose, never agree), so this test knows three of the records exist. One
  // of the attached ones is then turned down: it is kept and counted, but no list shows it.
  const ATTACHED = `Example Courier delete test ${Date.now()}`;
  const TURNED = `Example Turned Down delete test ${Date.now()}`;
  const LOOSE = `Example Kiosk delete test ${Date.now()}`;
  const { ventures } = (await (await page.request.get("/api/ventures")).json()) as { ventures: { id: string; name: string }[] };
  const chinook = ventures.find((v) => v.name === "Demo — Chinook Sign Painting")!;
  expect(chinook).toBeDefined();

  await page.goto("/your-data");
  const ideasBefore = await tableCount(page, "Your ideas");
  expect(ideasBefore).toBeGreaterThan(0);
  const expensesBefore = await tableCount(page, "Your expense records");
  const removingBefore = await openDeleteMenu(page);
  const attachedLine = (box: Locator) => box.getByText(/^Expense records attached to them: \d+/);
  const readAttached = async (box: Locator) =>
    Number(((await attachedLine(box).textContent()) ?? "").match(/: (\d+)/)![1]);
  const attachedBefore = await readAttached(removingBefore.getByRole("listitem").filter({ has: page.getByLabel(IDEAS_BOX) }));

  for (const [ventureId, paidTo] of [
    [chinook.id, ATTACHED],
    [chinook.id, TURNED],
    [null, LOOSE],
  ] as const) {
    const res = await page.request.post("/api/expenses/propose", {
      data: { ventureId, source: { kind: "agent", label: "a test agent" }, expenses: [{ date: "2026-09-15", amountCents: 990, paidTo, whatFor: "delete test" }] },
    });
    expect(res.status()).toBe(201);
  }
  const expenses = expensesBefore + 3;
  const attached = attachedBefore + 2;

  // Turn one attached record down on the Expenses page, the way a person would.
  await page.goto("/expenses");
  await page.getByRole("region", { name: "Waiting for you" }).getByRole("button", { name: "Review" }).click();
  const reviewing = page.getByRole("dialog", { name: "Agree to these proposed records?" });
  const turnedRow = reviewing.getByRole("listitem").filter({ hasText: TURNED });
  await expect(turnedRow).toBeVisible();
  await turnedRow.getByRole("button", { name: "Turn down" }).click();
  await expect(reviewing.getByRole("listitem").filter({ hasText: ATTACHED })).toBeVisible();
  await expect(turnedRow).toHaveCount(0);
  await page.keyboard.press("Escape");

  // Every table checked for 0 after the reload holds something now, so each 0 is a real change.
  await page.goto("/your-data");
  const goneAfter = ["Your statements", "Map progress", "Your figures", "Links between ideas"];
  for (const name of goneAfter) expect(await tableCount(page, name), name).toBeGreaterThan(0);
  expect(await tableCount(page, "Your expense records")).toBe(expenses);

  // An agent or a script can't delete: the route answers only to DotAmi's own window.
  const agent = await page.request.post("/api/your-data/delete", { data: { kinds: ["statements"], seen: { PersonStatement: 1 } } });
  expect(agent.status()).toBe(403);

  const removing = await openDeleteMenu(page);
  // Every box says what goes with it; the ideas box names the figures and map progress, and says
  // the expense records stay (the maintainer's decision of 2026-10-08), with how many.
  const ideasBox = removing.getByRole("listitem").filter({ has: page.getByLabel(IDEAS_BOX) });
  await expect(ideasBox).toContainText("also deletes their notes, the links between them, their map progress and every figure");
  await expect(ideasBox).toContainText(`Your ideas: ${ideasBefore}`);
  await expect(attachedLine(ideasBox)).toHaveText(`Expense records attached to them: ${attached} (they stay, as “not attached yet”)`);
  await expect(ideasBox).toContainText("Your expense records stay, as “not attached yet”");
  // The whole-table count of expense records is only on their own box, and it counts every one.
  await expect(ideasBox).not.toContainText("Your expense records:");
  const expensesBox = removing.getByRole("listitem").filter({ has: page.getByLabel("Your expense records", { exact: true }) });
  await expect(expensesBox).toContainText(`Your expense records: ${expenses}`);
  await expect(expensesBox).toContainText("attached to an idea or not");
  await ideasBox.getByText("Learn more").click();
  await expect(ideasBox).toContainText("Expense records attached to an idea are kept, as “not attached yet”");
  await expect(ideasBox).not.toContainText("always belong to an idea");
  await expect(removing.getByRole("listitem").filter({ has: page.getByLabel("Remembered columns") })).toContainText("Not kept yet");
  await expect(removing.getByLabel("Remembered columns")).toBeDisabled();
  await expect(removing.getByRole("listitem").filter({ has: page.getByLabel(STATEMENTS_BOX) })).toContainText("All of them go at once");

  // The cited records line, and what Delete doesn't reach, said plainly.
  await expect(removing).toContainText("generally kept for six years");
  await expect(removing.getByRole("link", { name: /^CRA: Where to keep your records/ })).toHaveAttribute("href", /canada\.ca\/en\/revenue-agency/);
  await expect(removing).toContainText("What the window stored in earlier launches. Not cleared yet.");
  // The safety copies have their own box; this run has none, so there is nothing to tick.
  const backupsBox = removing.getByRole("listitem").filter({ has: page.getByLabel(BACKUPS_BOX) });
  await expect(backupsBox).toContainText("Nothing to delete");
  await expect(removing.getByLabel(BACKUPS_BOX)).toBeDisabled();

  // Ticking ideas shows the warning under the box at once: how many stay, as what, where, how to delete.
  const warning = `${attached} expense record${attached === 1 ? " stays" : "s stay"}, as “not attached yet”.`;
  await expect(ideasBox).not.toContainText(warning);
  await removing.getByLabel(IDEAS_BOX).check();
  await expect(ideasBox).toContainText(warning);
  await expect(ideasBox).toContainText("They are kept in DotAmi's data file on this computer");
  // The count includes the turned-down record, which the Expenses page doesn't list, and the warning says so.
  await expect(ideasBox).toContainText("lists the ones you haven't turned down under “Not attached to an idea yet”");
  await expect(ideasBox).toContainText("Records you turned down are kept and counted too, but no list shows them.");
  // Ticking the expense records too deletes them all, so the warning goes and the line says so.
  const expensesLabel = removing.getByLabel("Your expense records", { exact: true });
  await expensesLabel.check();
  await expect(ideasBox).not.toContainText(warning);
  await expect(attachedLine(ideasBox)).toHaveText(`Expense records attached to them: ${attached} (they go too: “Your expense records” is ticked)`);
  await expensesLabel.uncheck();
  await expect(ideasBox).toContainText(warning);
  await removing.getByLabel(STATEMENTS_BOX).check();
  await removing.getByRole("button", { name: "Delete what's ticked…" }).click();

  // The first ask lists what goes, with true counts, and, apart, what stays and how to delete it.
  const first = page.getByRole("dialog", { name: "Delete these?" });
  await expect(first).toContainText(`Your ideas: ${ideasBefore} record`);
  await expect(first).toContainText("Map progress:");
  await expect(first).toContainText("Your figures:");
  await expect(first).not.toContainText("Your expense records:");
  await expect(first).toContainText("Kept, not deleted");
  await expect(first).toContainText(warning);
  await expect(first).toContainText("this page counts them under “Your expense records”");
  await expect(first).toContainText("To delete them as well, tick “Your expense records” too.");
  await expect(first).toContainText("Records you turned down are kept and counted too, but no list shows them.");
  // This run has no safety copies, so the ask doesn't talk about leaving them.
  await expect(first).not.toContainText("safety copies");
  await first.getByRole("button", { name: "Yes, continue" }).click();
  await page.getByRole("dialog", { name: "Delete them now?" }).getByRole("button", { name: "Delete now" }).click();

  const done = removing.getByRole("status");
  await expect(done).toContainText("Deleted.");
  await expect(done).toContainText(`Your ideas: ${ideasBefore} record${ideasBefore === 1 ? "" : "s"} deleted, 0 left`);
  await expect(done).toContainText(
    `Your expense records: ${attached} record${attached === 1 ? "" : "s"} kept, now “not attached yet”; ${expenses} records in all`,
  );
  await expect(done).not.toContainText("Your expense records: " + expenses + " records deleted");
  await expect(done).toContainText("Their space in the data file is wiped");

  // After a reload: the ideas and what went with them are gone; every expense record is still there.
  await page.reload();
  await expect(page.getByRole("heading", { name: "What DotAmi knows about you", level: 1 })).toBeVisible();
  for (const name of ["Your ideas", ...goneAfter]) {
    expect(await tableCount(page, name), name).toBe(0);
  }
  expect(await tableCount(page, "Your expense records")).toBe(expenses);
  await expect(page.getByRole("region", { name: "Your figures, by source" })).toContainText("No figures are kept.");
  await page.goto("/ventures");
  await expect(page.getByText("Nothing saved yet.")).toBeVisible();

  // On the Expenses page the record that was on the idea now shows as not attached to an idea.
  await page.goto("/expenses");
  const banner = page.getByRole("region", { name: "Waiting for you" });
  await banner.getByRole("button", { name: "Review" }).click();
  const review = page.getByRole("dialog", { name: "Agree to these proposed records?" });
  await expect(review.getByRole("listitem").filter({ hasText: ATTACHED })).toContainText("From a test agent · not attached to an idea");
  await expect(review.getByRole("listitem").filter({ hasText: LOOSE })).toContainText("From a test agent · not attached to an idea");
  // The turned-down record isn't listed (it was counted in the "N stay" above, and still is in the total).
  await expect(review).not.toContainText(TURNED);
  await expect(page.locator("main")).not.toContainText(TURNED);
  await page.keyboard.press("Escape");
  // And no record the page lists points at an idea any more.
  const listed = (await (await page.request.get("/api/expenses")).json()) as { expenses: { ventureId: string | null; paidTo: string }[] };
  expect(listed.expenses.length).toBeGreaterThan(0);
  expect(listed.expenses.filter((e) => e.ventureId !== null)).toEqual([]);
  expect(listed.expenses.map((e) => e.paidTo)).toContain(ATTACHED);
  expect(listed.expenses.map((e) => e.paidTo)).not.toContain(TURNED);
});

test("Delete: the safety-copies box warns, then deletes DotAmi's own copies in the backups folder and nothing else there", async ({ page }) => {
  const copies = ["dotami-before-20261008005701_settings-1760000000001.db", "dotami-before-restore-1760000000000.db"];
  mkdirSync(BACKUPS_DIR, { recursive: true });
  for (const c of copies) writeFileSync(path.join(BACKUPS_DIR, c), "a safety copy made for the browser test");
  writeFileSync(path.join(BACKUPS_DIR, "my own notes.txt"), "the person's own file");
  try {
    const removing = await openDeleteMenu(page);
    const box = removing.getByRole("listitem").filter({ has: page.getByLabel(BACKUPS_BOX) });
    // Only DotAmi's own copies are counted: the notes file isn't one.
    await expect(box).toContainText("Safety copies: 2");
    await expect(box).toContainText("Afterwards, only a backup you saved somewhere else could bring anything back.");
    await removing.getByLabel(BACKUPS_BOX).check();
    await removing.getByRole("button", { name: "Delete what's ticked…" }).click();

    const first = page.getByRole("dialog", { name: "Delete these?" });
    await expect(first).toContainText("Safety copies: 2 files");
    await expect(first).toContainText("The safety copies go too, so afterwards only a backup you saved somewhere else could bring anything back.");
    await first.getByRole("button", { name: "Yes, continue" }).click();
    const second = page.getByRole("dialog", { name: "Delete them now?" });
    await expect(second).toContainText("Afterwards, only a backup you saved somewhere else could bring anything back.");
    await expect(second.getByRole("button", { name: "Cancel" })).toBeFocused();
    await second.getByRole("button", { name: "Delete now" }).click();

    const done = removing.getByRole("status");
    await expect(done).toContainText("Deleted.");
    await expect(done).toContainText("Safety copies: 2 files deleted, 0 left");
    expect(readdirSync(BACKUPS_DIR)).toEqual(["my own notes.txt"]);
    expect(existsSync(WIPE_NOTE)).toBe(false);

    await page.reload();
    await removing.getByRole("button", { name: "Delete", exact: true }).click();
    await expect(removing.getByRole("listitem").filter({ has: page.getByLabel(BACKUPS_BOX) })).toContainText("Nothing to delete");
  } finally {
    rmSync(BACKUPS_DIR, { recursive: true, force: true });
  }
});

test("Delete: the safety-copies box also clears the receipt folders set aside in the backups folder, after a warning that names them ([8i])", async ({ page }) => {
  // What Start a new key and a restore leave in backups/ (expense-records.md § 10, § 7), as files.
  const locked = path.join(BACKUPS_DIR, "receipts-locked-1760000000000");
  const before = path.join(BACKUPS_DIR, "receipts-before-restore-1760000000001");
  mkdirSync(locked, { recursive: true });
  mkdirSync(before, { recursive: true });
  writeFileSync(path.join(locked, `${"a1".repeat(16)}.png`), "a receipt locked with a lost key");
  writeFileSync(path.join(locked, "receipts.key"), "{}");
  writeFileSync(path.join(before, `${"b2".repeat(16)}.pdf`), "a receipt from before a restore");
  writeFileSync(path.join(before, "my scan.png"), "the person's own file");
  try {
    const removing = await openDeleteMenu(page);
    // Nothing on What Delete doesn't reach about them any more: the box below reaches them.
    await expect(removing).not.toContainText("Receipts folders moved into the backups folder");
    const box = removing.getByRole("listitem").filter({ has: page.getByLabel(BACKUPS_BOX) });
    await expect(box).toContainText("Safety copies: 0 · Set-aside receipt folders: 2");
    await expect(box).not.toContainText(WARNING);
    await removing.getByLabel(BACKUPS_BOX).check();
    // Ticked: the warning, in place, before anything is asked.
    await expect(box).toContainText(WARNING);
    await removing.getByRole("button", { name: "Delete what's ticked…" }).click();

    const first = page.getByRole("dialog", { name: "Delete these?" });
    await expect(first).toContainText("Set-aside receipt folders: 2 folders");
    await expect(first).toContainText(WARNING);
    await first.getByRole("button", { name: "Yes, continue" }).click();
    const second = page.getByRole("dialog", { name: "Delete them now?" });
    await expect(second).toContainText(WARNING);
    await expect(second.getByRole("button", { name: "Cancel" })).toBeFocused();
    await second.getByRole("button", { name: "Delete now" }).click();

    const done = removing.getByRole("status");
    await expect(done).toContainText("Deleted.");
    await expect(done).toContainText("Set-aside receipt folders: 2 folders deleted, 0 left");
    // Only DotAmi's own files went; the person's file stays, and the folder with it.
    expect(existsSync(locked)).toBe(false);
    expect(readdirSync(before)).toEqual(["my scan.png"]);
    expect(existsSync(WIPE_NOTE)).toBe(false);

    await page.reload();
    await removing.getByRole("button", { name: "Delete", exact: true }).click();
    await expect(removing.getByRole("listitem").filter({ has: page.getByLabel(BACKUPS_BOX) })).toContainText("Nothing to delete");
  } finally {
    rmSync(BACKUPS_DIR, { recursive: true, force: true });
  }
});

test("Delete: a wipe an earlier Delete left owed is said on the page, and Finish it now finishes it", async ({ page }) => {
  writeFileSync(WIPE_NOTE, `${JSON.stringify({ format: 1, since: "2026-10-08T12:00:00.000Z", backups: [] })}\n`);
  try {
    await page.goto("/your-data");
    // The note is listed beside the data file, with what it holds.
    const outside = page.getByRole("listitem").filter({ has: page.getByRole("heading", { name: "A note that a wipe is still owed", level: 3 }) });
    await expect(outside).toContainText("nothing of yours");
    await expect(outside).not.toContainText("None: no wipe is owed.");

    const removing = page.getByRole("region", { name: "Taking things out" });
    const pending = removing.getByRole("status");
    await expect(pending).toContainText("An earlier Delete hasn't finished");
    await pending.getByRole("button", { name: "Finish it now" }).click();
    await expect(removing.getByRole("status")).toContainText("Finished: the earlier Delete's wipe is done.");
    expect(existsSync(WIPE_NOTE)).toBe(false);

    await page.reload();
    await expect(outside).toContainText("None: no wipe is owed.");
    await expect(removing.getByRole("button", { name: "Finish it now" })).toHaveCount(0);
  } finally {
    rmSync(WIPE_NOTE, { force: true });
  }
});
