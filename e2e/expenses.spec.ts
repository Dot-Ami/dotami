/**
 * [8i] Typing expense records, in a real browser against the production build: the main paths of
 * /expenses with the maintainer's decisions (2026-10-08) — type many and agree once (with an untick),
 * the business share shown beside the full amount, a record kept "not attached yet" and attached
 * later, refunds kept both ways, and an agent's proposal waiting for the agree click. Names are
 * invented; each test uses its own so a retried run (which finds the first run's rows) still passes.
 */
import { expect, test, type Locator, type Page } from "@playwright/test";

const CHINOOK = "Demo — Chinook Sign Painting";

/** The computer's own day, as the page measures it. */
const today = () => new Date().toLocaleDateString("en-CA");

/** Every address the page asks for, so a test can check no typed word or amount went into one. */
function recordUrls(page: Page): string[] {
  const seen: string[] = [];
  page.on("request", (r) => seen.push(r.url()));
  return seen;
}

/** Types one purchase into the form and adds it to the typed list. */
async function typePurchase(page: Page, values: { amount: string; paidTo: string; whatFor: string; share?: string }) {
  const form = page.getByRole("form", { name: "Type an expense" });
  await form.getByLabel("A purchase").check();
  await form.getByLabel("Day", { exact: true }).fill(today());
  await form.getByLabel("Amount", { exact: true }).fill(values.amount);
  await form.getByLabel("Paid to", { exact: true }).fill(values.paidTo);
  await form.getByLabel("What for", { exact: true }).fill(values.whatFor);
  if (values.share) await form.getByLabel("Business share % (optional)").fill(values.share);
  await form.getByRole("button", { name: "Add to the list" }).click();
}

const agreedList = (page: Page) => page.getByRole("list", { name: "Records you agreed to" });
const agreedRow = (page: Page, text: string): Locator => agreedList(page).getByRole("listitem").filter({ hasText: text });

/** Opens the review of the typed list and agrees to everything still ticked. */
async function reviewAndAgree(page: Page, count: number) {
  await page.getByRole("button", { name: `Review ${count}` }).click();
  const dialog = page.getByRole("dialog", { name: "Agree to keep these records?" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: `Agree to all ${count}` }).click();
  await expect(dialog).toBeHidden();
}

test("typing expenses: type several, untick one, agree to the rest at once; the share sits beside the full amount", async ({ page }) => {
  const PAPER = `Example Stationery typing test ${Date.now()}`;
  const COFFEE = `Example Cafe typing test ${Date.now()}`;
  const urls = recordUrls(page);

  // From the idea's card on the ideas page.
  await page.goto("/ventures");
  const card = page.getByRole("listitem").filter({ has: page.getByRole("heading", { name: CHINOOK, level: 2 }) }).first();
  await card.getByRole("link", { name: "Expense records for this idea →" }).click();
  await expect(page).toHaveURL(/\/expenses\?idea=/);
  await expect(page.getByRole("heading", { name: /Your expense records/, level: 1 })).toBeVisible();

  await typePurchase(page, { amount: "45.99", paidTo: PAPER, whatFor: "printer paper", share: "40" });
  await typePurchase(page, { amount: "12.50", paidTo: COFFEE, whatFor: "client coffee" });

  // Both wait on the typed list, for the idea the page was opened on; nothing is kept yet.
  const typed = page.getByRole("list", { name: "Typed, not kept yet" });
  await expect(typed.getByRole("listitem")).toHaveCount(2);
  await expect(page.getByLabel("For", { exact: true }).locator("option:checked")).toHaveText(CHINOOK);
  await expect(typed).toContainText(PAPER);
  await expect(agreedRow(page, PAPER)).toHaveCount(0);

  // Review: both listed and ticked; untick the coffee; the button counts what is left.
  await page.getByRole("button", { name: "Review 2" }).click();
  const dialog = page.getByRole("dialog", { name: "Agree to keep these records?" });
  await expect(dialog.getByRole("checkbox")).toHaveCount(2);
  await expect(dialog.getByText("Double-check what DotAmi did, and how, before you agree.")).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Agree to all 2" })).toBeEnabled();
  await dialog.getByRole("checkbox", { name: new RegExp(COFFEE) }).uncheck();
  await expect(dialog.getByText("1 left out: it stays where it is")).toBeVisible();
  await dialog.getByRole("button", { name: "Agree to all 1" }).click();
  await expect(dialog).toBeHidden();

  // The paper is kept, on the idea, with the share as the person's own number beside the full amount.
  await expect(page.getByRole("status").filter({ hasText: "Kept 1 record." })).toBeVisible();
  const paper = agreedRow(page, PAPER);
  await expect(paper).toBeVisible();
  await expect(paper).toContainText("$45.99");
  await expect(paper).toContainText("Business share: 40% (your number) of the full $45.99");
  await expect(paper).toContainText(`For ${CHINOOK}`);
  await expect(paper).not.toContainText("deductible");
  // The unticked coffee is still on the typed list, and not among the kept records.
  await expect(typed.getByRole("listitem")).toHaveCount(1);
  await expect(typed).toContainText(COFFEE);
  await expect(agreedRow(page, COFFEE)).toHaveCount(0);

  // It survives a reload (it is in the data file); the typed list does not (it lived only in the window).
  await page.reload();
  await expect(agreedRow(page, PAPER)).toBeVisible();
  await expect(page.getByRole("list", { name: "Typed, not kept yet" })).toHaveCount(0);

  for (const url of urls) {
    expect(url, "a record's words in an address").not.toContain("Stationery");
    expect(url, "an amount in an address").not.toContain("45.99");
    expect(url, "an amount in an address").not.toContain("4599");
  }
});

test("a record kept without an idea is attached later, and refunds are kept either way, linked to the purchase", async ({ page }) => {
  const DESK = `Example Desk Co attach test ${Date.now()}`;

  await page.goto("/expenses");
  await expect(page.getByRole("heading", { name: /Your expense records/, level: 1 })).toBeVisible();
  await typePurchase(page, { amount: "200.00", paidTo: DESK, whatFor: "a desk" });
  await expect(page.getByLabel("For", { exact: true }).locator("option:checked")).toHaveText("Not attached to an idea yet");
  await reviewAndAgree(page, 1);

  const desk = agreedRow(page, DESK).filter({ hasText: "a desk" });
  await expect(desk).toContainText("Not attached to an idea yet");

  // Attach it to the idea later.
  await desk.getByLabel("Attach to").selectOption({ label: CHINOOK });
  await desk.getByRole("button", { name: "Attach" }).click();
  await expect(desk).toContainText(`For ${CHINOOK}`);
  await expect(desk.getByRole("button", { name: "Move" })).toBeVisible();

  // A separate refund record, linked to the desk.
  await desk.getByRole("button", { name: "Record a refund for this" }).click();
  const form = page.getByRole("form", { name: "Type an expense" });
  await expect(form.getByLabel("A refund or credit")).toBeChecked();
  await expect(form.getByLabel("The purchase it came from (optional)").locator("option:checked")).toContainText(DESK);
  await form.getByLabel("A separate refund record, linked to the purchase").check();
  await form.getByRole("textbox", { name: "Amount that came back" }).fill("20");
  await form.getByLabel("What for", { exact: true }).fill("damaged leg, partial refund");
  await form.getByLabel("GST/HST part (optional)").fill("1.00");
  await form.getByLabel("Credit note (optional)").fill("CN-1043");
  await form.getByRole("button", { name: "Add to the list" }).click();
  await reviewAndAgree(page, 1);

  const separate = agreedRow(page, "damaged leg, partial refund");
  await expect(separate).toContainText("$20.00");
  await expect(separate).toContainText(`Refund record, linked to ${today()} · ${DESK} · $200.00`);
  await expect(separate).toContainText("GST/HST part: $1.00");
  await expect(separate).toContainText("Credit note: CN-1043");

  // And one kept as a negative amount.
  await desk.getByRole("button", { name: "Record a refund for this" }).click();
  await form.getByLabel("A negative amount on a record").check();
  await form.getByRole("textbox", { name: "Amount that came back" }).fill("5");
  await form.getByLabel("What for", { exact: true }).fill("price adjustment credit");
  await form.getByRole("button", { name: "Add to the list" }).click();
  await reviewAndAgree(page, 1);

  const negative = agreedRow(page, "price adjustment credit");
  await expect(negative).toContainText("-$5.00");
  await expect(negative).toContainText(`Refund or credit kept as a negative amount, linked to ${today()} · ${DESK} · $200.00`);
  // The desk keeps its own amount and lists both refunds linked to it.
  await expect(desk).toContainText("$200.00");
  await expect(desk).toContainText(`Refunds linked to it: $20.00 on ${today()}; $5.00 on ${today()}`);

  // "Not attached yet" now holds none of these: the desk and both refunds sit under the idea.
  await page.getByLabel("Show").selectOption({ label: "Not attached to an idea yet" });
  await expect(agreedRow(page, DESK)).toHaveCount(0);
  await page.getByLabel("Show").selectOption({ label: CHINOOK });
  await expect(agreedRow(page, DESK).filter({ hasText: "a desk" })).toBeVisible();
});

test("recording a refund for a purchase under an idea leaves records already typed where the person put them", async ({ page }) => {
  const LAMP = `Example Lamp Co shortcut test ${Date.now()}`;
  const INK = `Example Ink shortcut test ${Date.now()}`;

  // A purchase kept under the idea, from the idea's card.
  await page.goto("/ventures");
  const card = page.getByRole("listitem").filter({ has: page.getByRole("heading", { name: CHINOOK, level: 2 }) }).first();
  await card.getByRole("link", { name: "Expense records for this idea →" }).click();
  await expect(page).toHaveURL(/\/expenses\?idea=/);
  await typePurchase(page, { amount: "80.00", paidTo: LAMP, whatFor: "desk lamp" });
  await reviewAndAgree(page, 1);
  const lamp = agreedRow(page, LAMP).filter({ hasText: "desk lamp" });
  await expect(lamp).toContainText(`For ${CHINOOK}`);

  // Another purchase typed and set to "not attached yet", then the refund shortcut on the lamp.
  await typePurchase(page, { amount: "9.00", paidTo: INK, whatFor: "ink" });
  const forChoice = page.getByLabel("For", { exact: true });
  await forChoice.selectOption({ label: "Not attached to an idea yet" });
  await lamp.getByRole("button", { name: "Record a refund for this" }).click();
  const form = page.getByRole("form", { name: "Type an expense" });
  await expect(form.getByLabel("A refund or credit")).toBeChecked();
  // "For" covers the whole list, so it stays as the person set it, and the page says why.
  await expect(forChoice.locator("option:checked")).toHaveText("Not attached to an idea yet");
  await expect(page.getByRole("status").filter({ hasText: "The typed list stays for" })).toContainText(`the purchase is for ${CHINOOK}`);

  await form.getByRole("textbox", { name: "Amount that came back" }).fill("10");
  await form.getByLabel("What for", { exact: true }).fill("lamp shortcut credit");
  await form.getByRole("button", { name: "Add to the list" }).click();
  await reviewAndAgree(page, 2);

  // Both kept where the list's "For" said: not attached, the ink included.
  await page.getByLabel("Show").selectOption({ label: "All your records" });
  await expect(agreedRow(page, INK)).toContainText("Not attached to an idea yet");
  await expect(agreedRow(page, "lamp shortcut credit")).toContainText("Not attached to an idea yet");
  await expect(lamp).toContainText(`For ${CHINOOK}`);
});

test("an agent's proposal waits until the person agrees, and an outside caller can't agree or attach", async ({ page }) => {
  const PAYEE = `Example Courier agent test ${Date.now()}`;
  const proposed = await page.request.post("/api/expenses/propose", {
    data: { ventureId: null, source: { kind: "agent", label: "an outside agent" }, expenses: [{ date: today(), amountCents: 1_850, paidTo: PAYEE, whatFor: "parcel", businessSharePercent: 25 }] },
  });
  expect(proposed.status()).toBe(201);
  const [waiting] = ((await proposed.json()) as { expenses: { id: string; status: string }[] }).expenses;
  expect(waiting.status).toBe("proposed");
  // No Sec-Fetch-Site from DotAmi's page: refused.
  expect((await page.request.post("/api/expenses/agree", { data: { expenseIds: [waiting.id] } })).status()).toBe(403);
  expect((await page.request.post("/api/expenses/attach", { data: { expenseIds: [waiting.id], ventureId: null } })).status()).toBe(403);

  await page.goto("/expenses");
  const banner = page.getByRole("region", { name: "Waiting for you" });
  await expect(banner).toContainText(/\d+ records? waiting for you to agree/);
  await expect(agreedRow(page, PAYEE)).toHaveCount(0);

  await banner.getByRole("button", { name: "Review" }).click();
  const dialog = page.getByRole("dialog", { name: "Agree to these proposed records?" });
  await expect(dialog).toContainText(PAYEE);
  await expect(dialog).toContainText("From an outside agent · not attached to an idea");
  // The agent's share is shown as the agent's, never as the person's own number.
  await expect(dialog.getByRole("listitem").filter({ hasText: PAYEE })).toContainText("Business share: 25% (proposed by an outside agent) of the full $18.50");
  await expect(dialog.getByRole("listitem").filter({ hasText: PAYEE })).not.toContainText("your number");
  // Leave everything else waiting: untick all but this one.
  for (const box of await dialog.getByRole("listitem").filter({ hasNotText: PAYEE }).getByRole("checkbox").all()) await box.uncheck();
  await dialog.getByRole("button", { name: "Agree to all 1" }).click();
  await expect(dialog).toBeHidden();
  await expect(agreedRow(page, PAYEE)).toContainText("$18.50");
  await expect(agreedRow(page, PAYEE)).toContainText("from an outside agent");
  await expect(agreedRow(page, PAYEE)).toContainText("Business share: 25% (proposed by an outside agent, agreed by you) of the full $18.50");
});
