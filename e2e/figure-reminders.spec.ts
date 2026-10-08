/**
 * [8e] The figure reminder banner: "<September 2026> ended and your figures for <idea> don't cover
 * it", with "Add figures" and "Not this time", on the ideas page and on the idea's map.
 *
 * The page's clock is fixed (page.clock), so "today" is the same on every machine and every day:
 * 2026-10-07, which makes September 2026 the month, and July to September 2026 the quarter, that
 * have just ended. The other tests in this shared database count months back from the REAL date, so
 * on some days they leave agreed figures for these very periods behind. Each test here therefore
 * starts by retracting the agreed revenue figures that lie inside the periods it looks at
 * (clearRange) rather than trusting the database to be empty.
 *
 * Every "no banner" check is paired with something that proves the data has arrived first (a
 * banner that must be visible, or the card's "Loading…" gone): a banner is not drawn while the
 * figures or the setting are still loading, so an absence checked too early would pass whatever
 * the code did. Amounts are invented. Runs on the invented ideas "Demo — Salish Trail Maps" and "Demo — Chinook
 * Sign Painting".
 */
import { expect, test, type Locator, type Page } from "@playwright/test";

// Noon in Vancouver on October 7, 2026, so the person's own day is 2026-10-07 wherever this runs.
const NOW = "2026-10-07T19:00:00Z";
const SEPTEMBER_BANNER = "Figure reminder, monthly: September 2026";
const OCTOBER_BANNER = "Figure reminder, monthly: October 2026";
const QUARTER_BANNER = "Figure reminder, quarterly: July to September 2026";

test.use({ timezoneId: "America/Vancouver" });

function cardOf(page: Page, name: RegExp | string): Locator {
  return page
    .getByRole("listitem")
    .filter({ has: page.getByRole("heading", { name, level: 2 }) })
    .first();
}

async function ideaId(card: Locator): Promise<string> {
  const href = await card.getByRole("link", { name: /Open in cockpit/ }).getAttribute("href");
  return new URL(href!, "http://x").searchParams.get("venture")!;
}

/** Writes keys of the reminders setting, from inside the page (the routes answer only the app's own window). */
async function putReminders(page: Page, value: Record<string, unknown>) {
  const status = await page.evaluate(async (body) => {
    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: "figure-reminders", value: body }),
    });
    return res.status;
  }, value);
  expect(status).toBe(200);
}

async function savedReminders(page: Page) {
  return page.evaluate(async () => {
    const res = await fetch("/api/settings?id=figure-reminders", { cache: "no-store" });
    return ((await res.json()) as { value: { cadences: string[]; ideaIds: string[]; dismissed: unknown[] } }).value;
  });
}

/**
 * Takes a stretch of days out of the picture for one idea: retracts any agreed revenue figure that
 * lies inside it and discards any waiting one. Earlier runs, or tests that count back from the
 * real date, may have left some; a test must start from "nothing covers this period".
 */
async function clearRange(page: Page, ventureId: string, start: string, end: string) {
  await page.evaluate(async ({ id, start, end }) => {
    const post = (path: string, figureIds: string[]) =>
      fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ventureId: id, figureIds }) });
    const res = await fetch(`/api/figures?venture=${encodeURIComponent(id)}`, { cache: "no-store" });
    if (!res.ok) throw new Error(`listing figures failed: ${res.status} ${await res.text()}`);
    const { figures } = (await res.json()) as { figures: { id: string; kind: string; status: string; periodStart: string; periodEnd: string }[] };
    const inside = figures.filter((f) => f.kind === "gross-revenue" && f.periodStart >= start && f.periodEnd <= end);
    const ids = (status: string) => inside.filter((f) => f.status === status).map((f) => f.id);
    if (ids("confirmed").length) await post("/api/figures/retract", ids("confirmed"));
    if (ids("proposed").length) await post("/api/figures/discard", ids("proposed"));
  }, { id: ventureId, start, end });
}

const clearSeptember = (page: Page, ventureId: string) => clearRange(page, ventureId, "2026-09-01", "2026-09-30");

/** A reminder banner inside `scope`, found by the period it names. */
const banner = (scope: Locator | Page) => scope.getByRole("region", { name: SEPTEMBER_BANNER });
const quarterBanner = (scope: Locator | Page) => scope.getByRole("region", { name: QUARTER_BANNER });

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: NOW });
});

test("a switched-on idea with a ticked cadence and no figure for the month that just ended shows a banner; a switched-off one does not", async ({
  page,
}) => {
  await page.goto("/ventures");
  const salish = cardOf(page, /^Demo — Salish/);
  const chinook = cardOf(page, "Demo — Chinook Sign Painting");
  const salishId = await ideaId(salish);
  const chinookId = await ideaId(chinook);
  await clearSeptember(page, salishId);
  await clearSeptember(page, chinookId);

  // Monthly ticked, Salish switched on, Chinook not.
  await putReminders(page, { cadences: ["monthly"], ideaIds: [salishId], dismissed: [] });
  await page.reload();

  // Salish: the banner names the month and the idea, offers both buttons, and says no amount.
  await expect(banner(salish)).toBeVisible();
  await expect(banner(salish)).toContainText("September 2026 ended and your figures for Demo — Salish Trail Maps don't cover it");
  await expect(banner(salish).getByRole("button", { name: "Add figures" })).toBeVisible();
  await expect(banner(salish).getByRole("button", { name: "Not this time" })).toBeVisible();
  await expect(banner(salish)).not.toContainText("$");
  // Only the ticked cadence: no quarterly or yearly banner.
  await expect(salish.getByRole("region", { name: /Figure reminder, (quarterly|yearly)/ })).toHaveCount(0);

  // Chinook's switch is off: nothing, although nothing covers its September either.
  // (Chinook's own figures must have arrived first, or "no banner" would be true because it is still loading.)
  await expect(chinook.getByRole("switch", { name: "Remind me about this idea" })).not.toBeChecked();
  await expect(chinook.getByText("Loading…")).toHaveCount(0);
  await expect(chinook.getByRole("region", { name: /Figure reminder/ })).toHaveCount(0);

  // ...which the switch alone decides: turn it on and the banner appears, off and it goes.
  await chinook.getByRole("switch", { name: "Remind me about this idea" }).check();
  await expect(banner(chinook)).toBeVisible();
  await chinook.getByRole("switch", { name: "Remind me about this idea" }).uncheck();
  await expect(chinook.getByRole("region", { name: /Figure reminder/ })).toHaveCount(0);
  // Turning Chinook's switch on and off left Salish's banner and the ticked cadence alone.
  await expect(banner(salish)).toBeVisible();
  await expect.poll(async () => (await savedReminders(page)).cadences).toEqual(["monthly"]);

  // Nothing ticked: no banner for anyone, switches or not.
  await putReminders(page, { cadences: [] });
  await page.reload();
  await expect(salish.getByRole("switch", { name: "Remind me about this idea" })).toBeChecked();
  await expect(salish.getByText("Loading…")).toHaveCount(0);
  await expect(page.getByRole("region", { name: /Figure reminder/ })).toHaveCount(0);

  await putReminders(page, { cadences: [], ideaIds: [], dismissed: [] });
});

test("the idea's map shows the banner too, and its Add figures opens the figure entry on the ideas page", async ({ page }) => {
  await page.goto("/ventures");
  const salish = cardOf(page, /^Demo — Salish/);
  const salishId = await ideaId(salish);
  await clearSeptember(page, salishId);
  await putReminders(page, { cadences: ["monthly"], ideaIds: [salishId], dismissed: [] });
  await page.reload();

  await salish.getByRole("link", { name: /Open in cockpit/ }).click();
  await expect(page).toHaveURL(/\/cockpit/);
  const onMap = banner(page);
  await expect(onMap).toBeVisible();
  await expect(onMap).toContainText("September 2026 ended and your figures for Demo — Salish Trail Maps don't cover it");

  // "Add figures" on the map goes to this idea's figures on the ideas page, with the form open.
  await onMap.getByRole("link", { name: "Add figures" }).click();
  await expect(page).toHaveURL(new RegExp(`/ventures#figures-${salishId}$`));
  const card = cardOf(page, /^Demo — Salish/);
  await expect(card.getByLabel("From", { exact: true })).toBeVisible();
  await expect(card.getByLabel("Amount", { exact: true })).toBeVisible();

  await putReminders(page, { cadences: [], ideaIds: [], dismissed: [] });
});

test("Not this time hides the banner after a reload, here and on the map, until the next month has ended", async ({ page }) => {
  await page.goto("/ventures");
  const salish = cardOf(page, /^Demo — Salish/);
  const salishId = await ideaId(salish);
  // September and the quarter around it, and October (which the Nov 1 step below needs uncovered).
  await clearRange(page, salishId, "2026-07-01", "2026-09-30");
  await clearRange(page, salishId, "2026-10-01", "2026-10-31");
  // The quarterly box is ticked as well: its banner is the proof, before each "no banner" check
  // below, that the figures and the setting have loaded, and it is never dismissed here.
  await putReminders(page, { cadences: ["monthly", "quarterly"], ideaIds: [salishId], dismissed: [] });
  await page.reload();

  await expect(quarterBanner(salish)).toBeVisible();
  await banner(salish).getByRole("button", { name: "Not this time" }).click();
  await expect(banner(salish)).toHaveCount(0);
  // The button went away with the banner; focus moved on to the other banner instead of the page body.
  await expect(quarterBanner(salish).getByRole("button", { name: "Not this time" })).toBeFocused();

  // It is saved as one answer inside the reminders setting: this idea, this cadence, September's last day.
  await expect
    .poll(async () => (await savedReminders(page)).dismissed)
    .toEqual([{ ideaId: salishId, cadence: "monthly", periodEnd: "2026-09-30" }]);
  // ...and the choices around it are untouched.
  expect(await savedReminders(page)).toMatchObject({ cadences: ["monthly", "quarterly"], ideaIds: [salishId] });

  // Still hidden after a reload, and on the map. The quarterly banner is back first (data loaded),
  // so the missing monthly one is the dismissal at work and not a page still loading.
  await page.reload();
  await expect(salish.getByRole("switch", { name: "Remind me about this idea" })).toBeChecked();
  await expect(quarterBanner(salish)).toBeVisible();
  await expect(banner(salish)).toHaveCount(0);
  await salish.getByRole("link", { name: /Open in cockpit/ }).click();
  // The ideas page has the same heading and banner, so wait for the map itself before checking.
  await expect(page).toHaveURL(/\/cockpit\?venture=/);
  await expect(page.getByRole("heading", { name: /Demo — Salish/ }).first()).toBeVisible();
  await expect(quarterBanner(page)).toBeVisible();
  await expect(banner(page)).toHaveCount(0);

  // The next month's end brings it back: on November 1 the month that has just ended is October
  // (the quarter that has just ended is still July to September). The map is still open; the
  // window learns the new day when it is next focused (no reload).
  await page.clock.setSystemTime("2026-11-01T19:00:00Z");
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  const october = page.getByRole("region", { name: OCTOBER_BANNER });
  await expect(october).toBeVisible();
  await expect(quarterBanner(page)).toBeVisible();

  // Saving the new answer drops the old one: nothing stale is kept.
  await october.getByRole("button", { name: "Not this time" }).click();
  await expect
    .poll(async () => (await savedReminders(page)).dismissed)
    .toEqual([{ ideaId: salishId, cadence: "monthly", periodEnd: "2026-10-31" }]);

  await putReminders(page, { cadences: [], ideaIds: [], dismissed: [] });
});

test("adding the figure removes the banner; a figure still waiting for the person's agreement does not", async ({ page }) => {
  await page.goto("/ventures");
  const salish = cardOf(page, /^Demo — Salish/);
  const salishId = await ideaId(salish);
  await clearSeptember(page, salishId);
  await putReminders(page, { cadences: ["monthly"], ideaIds: [salishId], dismissed: [] });
  await page.reload();
  await expect(banner(salish)).toBeVisible();
  await expect(banner(salish)).not.toContainText("waiting for you to agree");

  // "Add figures" opens this idea's figure entry.
  await banner(salish).getByRole("button", { name: "Add figures" }).click();
  // ...and the cursor is in the form's first field, so a keyboard user knows something happened.
  await expect(salish.getByLabel("What", { exact: true })).toBeFocused();
  await salish.getByLabel("From", { exact: true }).fill("2026-09-01");
  await salish.getByLabel("To", { exact: true }).fill("2026-09-30");
  await salish.getByLabel("Amount", { exact: true }).fill("4,321");
  await salish.getByRole("button", { name: "Review this figure" }).click();
  const prompt = page.getByRole("dialog", { name: "Agree to these figures?" });
  await expect(prompt).toBeVisible();

  // Closing the prompt agrees to nothing: the figure is still only proposed, so the month is still
  // uncovered. The banner says one is waiting, and says no amount.
  await page.keyboard.press("Escape");
  await expect(prompt).toBeHidden();
  await expect(banner(salish)).toBeVisible();
  await expect(banner(salish)).toContainText("1 figure waiting for you to agree");
  await expect(banner(salish)).not.toContainText("4,321");

  // Agreeing covers September: the banner goes without a reload.
  await salish.getByRole("button", { name: "Review", exact: true }).click();
  await prompt.getByRole("button", { name: "Agree", exact: true }).click();
  await expect(prompt).toBeHidden();
  await expect(banner(salish)).toHaveCount(0);
  await page.reload();
  await expect(salish.getByRole("switch", { name: "Remind me about this idea" })).toBeChecked();
  // The card's figures must have arrived before the missing banner means anything.
  await expect(salish.getByText("Loading…")).toHaveCount(0);
  await expect(banner(salish)).toHaveCount(0);

  // Taking the figure back uncovers the month again, and the banner returns.
  // The agreed row is the one with a Retract button (a retracted one, listed below, has none).
  const row = salish
    .getByRole("listitem")
    .filter({ hasText: "September 2026" })
    .filter({ has: page.getByRole("button", { name: "Retract", exact: true }) })
    .first();
  await row.getByRole("button", { name: "Retract", exact: true }).click();
  await row.getByRole("button", { name: "Retract", exact: true }).click();
  await expect(banner(salish)).toBeVisible();

  await putReminders(page, { cadences: [], ideaIds: [], dismissed: [] });
});
