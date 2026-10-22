/**
 * The way in, in a real browser on the production build (docs/architecture/future-cockpit.md § 1,
 * "The way in as built"; the maintainer's decision 6 of 2026-10-11: the front door leads with the dream).
 *
 * The browser tests' database holds the two demo ideas from the start, so every intake here belongs to a
 * person with a saved idea: it opens on the screen they came for, not on *About you* (issue #38). A
 * first-time person's *About you* is checked by the desktop app's tests, which start on an empty data
 * folder (e2e-desktop/desktop.spec.ts).
 *
 * The tests run in this order on one database (playwright.config.ts): the first keeps a destination and
 * an income, and the third comes back as that same person in a fresh tab; the fourth, as that person
 * again, picks the first written future (it also runs on its own, answering what the first would have).
 */
import { expect, test, type Page } from "@playwright/test";

import { roadApprenticeToOwnShopAB } from "../lib/engines/roads/v2026";
import { waitForReact } from "../tests/helpers/react-ready";

import { showRail } from "./cockpit-calm";

const GENERAL = "Starting any business in Alberta (tax and structure)";
const APPRENTICE = "From apprentice to your own shop (Alberta)";

// Case-blind: the question starts with "What" since 2026-10-20 (it began "In a few years, what …").
const Q1 = /what do you want your work and life to look like/i;
const Q2 = "Are you after a business of your own, a job or career, or both?";
const Q3 = "Which province or territory are you in?";
const Q4 = "What yearly income do you want, before tax?";

/** The person's own calendar day, as the page sees it. */
const todayIn = (page: Page) => page.evaluate(() => new Date().toLocaleDateString("en-CA"));

// Kept by the first test, read back by the third.
const words = `My own small furniture shop,  four-day weeks, home for supper (invented ${Date.now()})`;

test("door 1: four answers, each with its receipt and focus moving on, then the listed future opens in the cockpit", async ({ page }) => {
  await page.goto("/", { waitUntil: "networkidle" });
  const today = await todayIn(page);

  // The dream first, then three doors in their order; the third opens the invented example future, and
  // says it is invented (since 2026-10-13; e2e/example-future.spec.ts drives it).
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/See the road to the work and life you want\./);
  const doors = page.getByRole("list", { name: "Three ways in" });
  await expect(doors.getByRole("heading", { level: 2 })).toHaveText(["Start from where I want to be", "I already have an idea", "Show me an example first"]);
  const example = doors.getByRole("listitem").nth(2);
  await expect(example).toContainText("Look inside a filled-in future for Mara, an invented apprentice cabinetmaker in Alberta");
  await expect(example.getByRole("link")).toHaveAttribute("href", "/example/mara");
  await expect(example.getByRole("button")).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Your futures →" })).toBeVisible();

  await page.getByRole("link", { name: "Start here →" }).click();
  await expect(page).toHaveURL(/\/start$/);
  // One level 1 heading names the page for a screen reader.
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Your destination");

  // 1. Where you want to be, in their own words: kept at once, word for word and dated. Keys only, so
  // focus is checked the way a keyboard user meets it.
  const box = page.getByRole("textbox", { name: Q1 });
  await waitForReact(box);
  await box.fill(words);
  await page.getByRole("button", { name: "Keep my words" }).focus();
  await page.keyboard.press("Enter");
  const receipts = page.getByRole("status");
  await expect(receipts.filter({ hasText: "Kept word for word" })).toHaveText(
    `Kept word for word, dated ${today}. It goes at the top of each future you pick on Pick a future; an idea you describe in your own sentence shows that sentence instead.`,
  );
  await expect(page.getByText(`“${words}”`, { exact: true })).toBeVisible();
  // Focus moves on to the next question, never to the page body.
  await expect(page.getByRole("heading", { name: Q2, level: 2 })).toBeFocused();

  // 2. Business, career or both: a count of the futures listed, nothing filtered.
  await page.getByRole("button", { name: "Both, or not sure" }).click();
  await expect(receipts.filter({ hasText: "listed" })).toHaveText("All 2 futures listed are shown.");
  await expect(page.getByRole("heading", { name: Q3, level: 2 })).toBeFocused();

  // 3. The place, by code.
  await page.getByRole("combobox", { name: Q3 }).selectOption("CA-AB");
  await page.getByRole("button", { name: "Use this place" }).click();
  await expect(receipts.filter({ hasText: "federal rules" })).toHaveText("Alberta's rules and the federal rules apply. 2 futures listed are written for Alberta.");
  await expect(page.getByRole("heading", { name: Q4, level: 2 })).toBeFocused();

  // 4. The yearly income: Enter in the box proposes it; closing the prompt gives focus back to the box.
  const amount = page.getByRole("textbox", { name: Q4 });
  await amount.fill("70,000");
  await amount.press("Enter");
  const prompt = page.getByRole("dialog", { name: "Agree to this number?" });
  await expect(prompt).toContainText("The yearly income you want, before tax");
  await expect(prompt).toContainText("Double-check the number you typed before you agree.");
  await expect(prompt.getByRole("textbox")).toHaveValue("70,000.00");
  await page.keyboard.press("Escape");
  await expect(prompt).toHaveCount(0);
  await expect(amount).toBeFocused();

  // Counted only once the person agrees; then focus goes to the way on.
  await page.getByRole("button", { name: "Keep it" }).click();
  await prompt.getByRole("button", { name: "Agree" }).click();
  await expect(prompt).toHaveCount(0);
  await expect(receipts.filter({ hasText: "Your target" })).toHaveText(
    `Your target: $70,000 a year, before tax, agreed ${today}. Nothing compares it with anything.`,
  );
  await expect(page.getByRole("link", { name: "Pick a future →" })).toBeFocused();

  // Change opens a question again with its answer, and the others keep theirs.
  await expect(page.getByRole("button", { name: "Change" })).toHaveCount(4);

  await page.getByRole("link", { name: "Pick a future →" }).click();
  await expect(page).toHaveURL(/\/futures$/);

  // Road 0 and the first written future, in the order written (the maintainer's yes of 2026-10-13, design § 13).
  const cards = page.getByRole("list", { name: "Written futures" }).getByRole("listitem");
  await expect(cards.getByRole("heading", { level: 2 })).toHaveText([GENERAL, APPRENTICE]);
  // The first written future's card says plainly, in amber, that no person has read its sources.
  const apprentice = cards.nth(1);
  await expect(apprentice).toContainText("A career and a business");
  const toolChecked = apprentice.getByText(/^\d+ checked by a tool only, not read by a person yet$/);
  await expect(toolChecked).toBeVisible();
  await expect(toolChecked).toHaveClass(/text-amber/);
  await expect(apprentice).not.toContainText(/\d+ read by a person/);
  await expect(apprentice).not.toContainText("wasn't recorded");
  const general = cards.first();
  await expect(general).toContainText("A business");
  await expect(general).toContainText("Written for Alberta");
  await expect(general).toContainText(/\d+ steps · \d+ skills? listed · \d+ official fees? found · \d+ cost lines? you'd price/);
  await expect(page.getByText("In the order they were written, not ranked. More futures are being written.")).toBeVisible();

  await general.getByRole("button", { name: `Look inside ${GENERAL}` }).click();
  await expect(page).toHaveURL(/\/cockpit\?venture=/);

  // The cockpit draws that road, with the person's words and target on top.
  const goal = page.getByRole("region", { name: "Your goal and gauges" });
  await expect(goal).toContainText(`“${words}”`);
  await expect(goal).toContainText(`where you want to be · your words · ${today}`);
  await expect(goal).toContainText(`Future: ${GENERAL}`);
  await expect(goal).toContainText("Your target: $70,000 a year, before tax");
  await expect(page.getByRole("button", { name: /^Sole Prop activation, / })).toBeVisible();
  // What this way in never asked is said to be not said, not shown as the intake's starting values. It is in
  // the rail, folded on a first visit (2026-10-17): one click.
  await showRail(page);
  await expect(page.getByText("Not said · AB")).toBeVisible();

  // Kept in the data file: a fresh read of the idea says the road was chosen today, with the answer to question 2.
  const ventureId = new URL(page.url()).searchParams.get("venture")!;
  const kept = (await (await page.request.get(`/api/futures/${ventureId}`)).json()) as {
    future: { roadId: string; roadChosen: boolean; lookingFor: string; place: string };
  };
  expect(kept.future).toMatchObject({ roadId: "road-starting-any-business-ab", roadChosen: true, lookingFor: "both-or-not-sure", place: "CA-AB" });

  // And it is one of the person's futures.
  await page.goto("/ventures");
  await expect(page.getByRole("heading", { name: GENERAL, level: 2 }).first()).toBeVisible();
});

test("door 2 is today's box and intake; with an idea saved, the intake skips About you, and Back still reaches it (#38)", async ({ page }) => {
  await page.goto("/");
  const box = page.getByPlaceholder(/What are you building/);
  await waitForReact(box);
  await box.fill("A mobile bike repair business with a van in Calgary");
  await page.getByRole("button", { name: "Map it →" }).click();

  // Straight to the screen the person came for.
  await expect(page).toHaveURL(/\/intake/);
  await expect(page.getByRole("heading", { name: /Did we get this/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: /about you/ })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Trades", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Looks right →" }).click();
  await page.getByText("Current employment", { exact: true }).locator("xpath=following-sibling::select").selectOption("self-employed");
  await page.getByRole("button", { name: "Open my map →" }).click();
  await expect(page).toHaveURL(/\/cockpit/);
  await expect(page.getByRole("button", { name: /^Sole Prop activation, / })).toBeVisible();

  // A second idea from Your futures: the front door's doors, then the intake, still not About you.
  await page.getByRole("link", { name: "← Your futures" }).click();
  await expect(page).toHaveURL(/\/ventures$/);
  await expect(page.getByText("Your futures", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "+ Another future" }).click();
  await expect(page).toHaveURL(/\/$/);
  const again = page.getByPlaceholder(/What are you building/);
  await waitForReact(again);
  await again.fill("Weekend woodworking");
  await page.getByRole("button", { name: "Map it →" }).click();
  await expect(page.getByRole("heading", { name: /Did we get this/ })).toBeVisible();

  // About you is one click back, as before.
  await page.getByRole("button", { name: "← Back" }).click();
  await expect(page.getByRole("heading", { name: /about you/ })).toBeVisible();
});

test("a returning person in a fresh tab: words and income already kept count as answered, and the receipts say what stays", async ({ page }) => {
  // A fresh tab has no answers in it; the data file has the first test's.
  await page.goto("/futures");
  await expect(page.getByText("Say which province or territory you're in first.")).toBeVisible();
  await page.getByRole("link", { name: "Your destination", exact: true }).click();
  await expect(page).toHaveURL(/\/start$/);
  const today = await todayIn(page);
  const receipts = page.getByRole("status");

  // Questions 1 and 4 are answered from the data file; the first one asked is question 2.
  await expect(page.getByRole("heading", { name: Q2, level: 2 })).toBeVisible();
  await expect(page.getByText(`“${words}”`, { exact: true })).toBeVisible();
  await expect(page.getByText("$70,000 a year, before tax", { exact: true })).toBeVisible();
  await expect(page.getByRole("textbox", { name: Q1 })).toHaveCount(0);

  // "I don't know yet" now keeps nothing new, and says the earlier words still stand on top.
  const change = page.getByRole("button", { name: "Change" });
  await waitForReact(change.first());
  await change.first().click();
  await expect(page.getByRole("heading", { name: Q1, level: 2 })).toBeFocused();
  await page.getByRole("button", { name: "I don't know yet" }).click();
  await expect(receipts.filter({ hasText: "Nothing new kept" })).toHaveText(
    `Nothing new kept. Your words of ${today} are still kept and still show on top of your futures; Delete on What DotAmi knows about you removes them, with all your statements.`,
  );

  await page.getByRole("button", { name: "A business of my own" }).click();
  await expect(receipts.filter({ hasText: "listed" }).first()).toHaveText("Of the 2 futures listed, 2 include a business of your own.");
  await page.getByRole("combobox", { name: Q3 }).selectOption("CA-YT");
  await page.getByRole("button", { name: "Use this place" }).click();
  // Outside Alberta the federal steps are listed too, written for all of Canada (task 28d), and counted as that,
  // never as written for Yukon: the card below says Yukon's own steps aren't written yet.
  await expect(receipts.filter({ hasText: "federal rules" })).toHaveText(
    "The federal rules apply; Yukon's own rules aren't written yet. 1 future listed is written for all of Canada; none is written for Yukon yet.",
  );

  // Skipping the income now keeps nothing new, and says the target agreed before still stands.
  await change.last().click();
  await page.getByRole("button", { name: "Skip" }).click();
  await expect(receipts.filter({ hasText: "Not given" })).toHaveText(
    `Not given. Nothing here waits on it. Your target of $70,000, agreed ${today}, still stands; Delete on What DotAmi knows about you removes it.`,
  );
  await page.getByRole("link", { name: "Pick a future →" }).click();

  // The federal steps first, written for all of Canada, saying Yukon's own steps aren't written yet (task 28d).
  const canada = page.getByRole("list", { name: "Written for all of Canada" }).getByRole("listitem");
  await expect(canada).toHaveCount(1);
  await expect(canada).toContainText("The federal steps for any business in Canada");
  await expect(canada).toContainText("Written for all of Canada.");
  await expect(canada).toContainText("The federal steps only. Yukon's own steps aren't written yet; a step shows a Yukon page only where a federal step cites one.");
  // Alberta's two behind one button; opened, each card says it is written for Alberta, and that the person said Yukon.
  const show = page.getByRole("button", { name: "Show the 2 futures written for Alberta" });
  await expect(show).toHaveAttribute("aria-expanded", "false");
  const alberta = page.getByRole("list", { name: "Written for Alberta" });
  await expect(alberta).toBeHidden();
  await show.click();
  const hide = page.getByRole("button", { name: "Hide the futures written for Alberta" });
  await expect(hide).toHaveAttribute("aria-expanded", "true");
  const cards = alberta.getByRole("listitem");
  await expect(cards).toHaveCount(2);
  for (const card of await cards.all()) await expect(card).toContainText("Written for Alberta. You said Yukon.");
  await hide.click();
  await expect(alberta).toBeHidden();

  const note = `Mobile sauna rentals (invented ${Date.now()})`;
  await page.getByRole("textbox", { name: "Not here yet?" }).fill(note);
  await page.getByRole("button", { name: "Keep my note and look inside the general road" }).click();
  await expect(page).toHaveURL(/\/cockpit\?venture=/);
  await expect(page.getByRole("region", { name: "Your goal and gauges" })).toContainText(GENERAL);
  const statements = (await (await page.request.get("/api/person/statements")).json()) as { statements: { text: string }[] };
  expect(statements.statements.map((s) => s.text)).toContain(note);
});

test("the first written future, picked on Pick a future, opens in the cockpit on its own road, and a step's status is kept", async ({ page }) => {
  const road = roadApprenticeToOwnShopAB;
  const first = road.steps[0]!;
  await page.goto("/start");
  // Questions 1 and 4 are normally answered from the data file by the first test; 2 and 3 are asked here.
  // Run on its own, question 1 is asked first: "I don't know yet" keeps nothing and moves on.
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
  // Run on its own, without the first test's income, question 4 is still asked: skipped, it waits on nothing.
  const skip = page.getByRole("button", { name: "Skip" });
  if (await skip.isVisible()) await skip.click();
  await page.getByRole("link", { name: "Pick a future →" }).click();
  await expect(page).toHaveURL(/\/futures$/);

  await page.getByRole("button", { name: `Look inside ${APPRENTICE}` }).click();
  await expect(page).toHaveURL(/\/cockpit\?venture=/);

  // The cockpit draws the road picked, not road 0.
  const goal = page.getByRole("region", { name: "Your goal and gauges" });
  await expect(goal).toContainText(`Future: ${APPRENTICE}`);
  await expect(goal.getByRole("button", { name: /^Steps/ })).toContainText(`0 of ${road.steps.length} marked done`);
  await expect(page.getByRole("button", { name: /^Sole Prop activation, / })).toHaveCount(0);
  const step = page.getByRole("button", { name: new RegExp(`^${first.label}, `) });
  await expect(step).toBeVisible();

  // Its step opens, and its sources say, in amber, that a tool checked them and no person has read them yet.
  await step.click();
  const panel = page.getByRole("region", { name: "Step" });
  await panel.getByText(/Sources for this step · \d+/).click();
  const check = panel.getByText(/^Checked by a tool on \d{4}-\d{2}-\d{2}: .*Not read by a person yet\.$/).first();
  await expect(check).toBeVisible();
  await expect(check).toHaveClass(/text-amber/);

  // A status set on it is kept in the data file, on this road, and shown again after a reload.
  const doing = panel.getByRole("button", { name: "Doing", exact: true });
  await doing.click();
  await expect(doing).toHaveAttribute("aria-pressed", "true");
  await page.reload();
  await page.getByRole("button", { name: new RegExp(`^${first.label}, `) }).click();
  await expect(page.getByRole("region", { name: "Step" }).getByRole("button", { name: "Doing", exact: true })).toHaveAttribute("aria-pressed", "true");

  const ventureId = new URL(page.url()).searchParams.get("venture")!;
  const kept = (await (await page.request.get(`/api/futures/${ventureId}`)).json()) as {
    future: { roadId: string; roadChosen: boolean; lookingFor: string; place: string };
  };
  expect(kept.future).toMatchObject({ roadId: road.id, roadChosen: true, lookingFor: "business", place: "CA-AB" });
});
