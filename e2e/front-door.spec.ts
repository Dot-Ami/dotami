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

import { cockpitWords } from "../lib/cockpit/words";
import { roadApprenticeToOwnShopAB, roadFederalStepsCA } from "../lib/engines/roads/v2026";
import { destinationWords, frontDoorWords } from "../lib/front-door/words";
import { waitForReact } from "../tests/helpers/react-ready";

import { showRail } from "./cockpit-calm";
import {
  answerBusinessAndPlace,
  answerBusinessAndPlaceOnly,
  expectBusinessAndPlaceAsked,
  Q1,
  Q2,
  Q3,
  Q4,
  skipQuestionOneIfAsked,
} from "./destination";
import { openTheMapFromTheIntake, skipTheJob } from "./three-steps";

const GENERAL = "Starting any business in Alberta (tax and structure)";
const APPRENTICE = "From apprentice to your own shop (Alberta)";

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
  // Pick a future opens on its first step since 2026-10-22: skipped, every future is listed with no job to match.
  await skipTheJob(page);

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

  // And it is one of the person's futures. Its card says the kind of venture was not said: this way in never
  // asks it, and the "service" it was saved with is only the intake's starting value (2026-10-23).
  await page.goto("/ventures");
  const href = `/cockpit?venture=${encodeURIComponent(ventureId)}`;
  const card = page.getByRole("listitem").filter({ has: page.locator(`a[href="${href}"]`, { hasText: "Open in cockpit" }) });
  await expect(card.getByRole("heading", { name: GENERAL, level: 2 })).toBeVisible();
  // Found by its words as written; read as drawn. The line's `capitalize` once drew them "Type Not Said"
  // (2026-10-24), which a check on the text alone never saw.
  await expect(card.getByText(/^type not said · AB · /i)).toHaveText(/^type not said · AB · /, { useInnerText: true });
  // Control: an idea whose kind was given keeps it on its card (the demo idea saved as a product).
  const typed = page.getByRole("listitem").filter({ has: page.getByRole("heading", { name: "Demo — Salish Trail Maps", level: 2 }) });
  await expect(typed.getByText(/^product · BC · /)).toBeVisible();
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
  await openTheMapFromTheIntake(page);
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
  // Pick a future opens on its first step since 2026-10-22: skipped, every future is listed with no job to match.
  await skipTheJob(page);

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
  // Outside Alberta the note opens the federal steps (the maintainer's call 33 of 2026-10-22).
  await page.getByRole("button", { name: "Keep my note and look inside the federal steps" }).click();
  await expect(page).toHaveURL(/\/cockpit\?venture=/);
  await expect(page.getByRole("region", { name: "Your goal and gauges" })).toContainText(
    `Future: ${roadFederalStepsCA.label} · Yukon's own steps aren't written yet`,
  );
  const statements = (await (await page.request.get("/api/person/statements")).json()) as { statements: { text: string }[] };
  expect(statements.statements.map((s) => s.text)).toContain(note);
});

test("the first written future, picked on Pick a future, opens in the cockpit on its own road, and a step's status is kept", async ({ page }) => {
  const road = roadApprenticeToOwnShopAB;
  const first = road.steps[0]!;
  await page.goto("/start");
  // Questions 1 and 4 are normally answered from the data file by the first test; 2 and 3 are asked here.
  // Run on its own, question 1 is asked first and question 4 after the place: both are passed over.
  await skipQuestionOneIfAsked(page);
  await answerBusinessAndPlace(page, "CA-AB");
  await page.getByRole("link", { name: "Pick a future →" }).click();
  await expect(page).toHaveURL(/\/futures$/);
  // Pick a future opens on its first step since 2026-10-22: skipped, every future is listed with no job to match.
  await skipTheJob(page);

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

/** Everything this page's window storage holds, as text (both stores, every key). */
const windowStorage = (page: Page) =>
  page.evaluate(() => {
    const dump = (s: Storage) => Object.fromEntries(Array.from({ length: s.length }, (_, i) => [s.key(i)!, s.getItem(s.key(i)!)]));
    return JSON.stringify({ local: dump(localStorage), session: dump(sessionStorage) });
  });

test("Your destination's answers never sit in window storage; a visit to the example keeps them, a reload or a new window asks 2 and 3 again, and the idea picked keeps them (2026-10-23)", async ({ page, context }) => {
  // Nothing about the person in window storage: questions 2 and 3 are held in the window's memory
  // (lib/journey/held-journey.ts) and kept only with a future picked, in the data file. A page loaded afresh asks
  // them again, a future picked or not, and the line under each receipt says so (destinationWords.keptWithEachFuture).
  await page.goto("/start");
  await skipQuestionOneIfAsked(page);
  await answerBusinessAndPlace(page, "CA-NS");
  await expect(page.getByText(destinationWords.keptWithEachFuture, { exact: true })).toHaveCount(2);

  // Answered on screen, and none of it in either store: not the place code, not the pick, not the draft.
  const stored = await windowStorage(page);
  expect(stored).not.toContain("CA-NS");
  expect(stored).not.toContain("lookingFor");
  expect(stored).not.toContain('\\"destination\\"');
  // Nothing of the journey is there at all (2026-10-24): the session store is empty, and the local one holds at
  // most how the cockpit was left.
  const { local, session } = JSON.parse(stored) as { local: Record<string, string>; session: Record<string, string> };
  expect(session).toEqual({});
  expect(Object.keys(local).filter((k) => k !== "dotami-cockpit-folds")).toEqual([]);

  // Out to the invented example and back by the links a person uses: the example sits outside the journey's
  // pages, and the answers are still there, held in the window's memory and still not in its storage.
  await page.getByRole("link", { name: destinationWords.back, exact: true }).click();
  const example = page.getByRole("link", { name: frontDoorWords.doors.example.go });
  await waitForReact(example);
  await example.click();
  await expect(page).toHaveURL(/\/example\/mara$/);
  const startOwn = page.getByRole("region", { name: cockpitWords.example.region }).getByRole("link", { name: cockpitWords.example.startOwn });
  await waitForReact(startOwn);
  await startOwn.click();
  await expect(page).toHaveURL(/\/start$/);
  await expect(page.getByText("Nova Scotia", { exact: true })).toBeVisible();
  await expect(page.getByText(destinationWords.keptWithEachFuture, { exact: true })).toHaveCount(2);
  await expect(page.getByRole("link", { name: destinationWords.next })).toBeVisible();
  expect(await windowStorage(page)).not.toContain("CA-NS");

  // A reload keeps this tab's sessionStorage, where both answers were kept until 2026-10-23 and would come back.
  // Only the window's memory held them, so both are asked again.
  await page.reload();
  await expectBusinessAndPlaceAsked(page);
  // A new window shares localStorage and the data file with this one, never its memory: asked again there too.
  const second = await context.newPage();
  await second.goto("/start");
  await expectBusinessAndPlaceAsked(second);
  await second.close();

  // Answered again and picked: the idea keeps both in the data file, and a new window reads them there.
  await answerBusinessAndPlace(page, "CA-NS");
  await page.getByRole("link", { name: destinationWords.next }).click();
  await skipTheJob(page);
  await page.getByRole("button", { name: `Look inside ${roadFederalStepsCA.label}` }).click();
  await expect(page).toHaveURL(/\/cockpit\?venture=/);
  const ventureId = new URL(page.url()).searchParams.get("venture")!;
  const third = await context.newPage();
  const kept = (await (await third.request.get(`/api/futures/${ventureId}`)).json()) as {
    future: { lookingFor: string; place: string };
  };
  expect(kept.future).toMatchObject({ lookingFor: "business", place: "CA-NS" });
  await third.goto(`/cockpit?venture=${encodeURIComponent(ventureId)}`);
  await expect(third.getByRole("region", { name: "Your goal and gauges" })).toContainText("Nova Scotia");
  await third.close();
  // After the pick: not the place code, not the idea's own province either ("NS", which "CA-NS" never matched),
  // and not the pick: the idea open on the map is held in the window's memory, not its storage.
  const after = await windowStorage(page);
  expect(after).not.toContain("CA-NS");
  expect(after).not.toContain('\\"NS\\"');
  expect(after).not.toContain("lookingFor");
  expect((JSON.parse(after) as { session: Record<string, string> }).session).toEqual({});
});

/** A server that answers with a crash's own page, no JSON: nothing in it says why. */
const CRASH_PAGE = { status: 500, contentType: "text/html", body: "<!doctype html><title>Internal Server Error</title>" };

test("words the server didn't keep: a refusal with no words of its own keeps the question open, no answer at all is said as such (2026-10-24)", async ({ page }) => {
  // Both said "Not kept: no database reachable" until a review of 2026-10-24, though the database was never asked.
  await page.goto("/start");
  const box = page.getByRole("textbox", { name: Q1 });
  await expect(box.or(page.getByRole("heading", { name: Q2, level: 2 })).first()).toBeVisible();
  // Words an earlier test kept answer question 1 from the data file: Change asks it here.
  if (!(await box.isVisible())) await page.getByRole("button", { name: destinationWords.change }).first().click();
  const typed = `Words the server didn't keep (invented ${Date.now()})`;
  await waitForReact(box);
  await box.fill(typed);

  // The question's own region: Next.js keeps a route announcer of its own with the alert role.
  const question = page.getByRole("region", { name: Q1 });
  await page.route("**/api/person/statements", (route) => route.fulfill(CRASH_PAGE));
  await question.getByRole("button", { name: destinationWords.keepWords }).click();
  await expect(question.getByRole("alert")).toHaveText(destinationWords.receipts.destinationNotKept);
  await expect(box).toHaveValue(typed);

  await page.unroute("**/api/person/statements");
  await page.route("**/api/person/statements", (route) => route.abort());
  await question.getByRole("button", { name: destinationWords.keepWords }).click();
  await expect(question.getByRole("status")).toHaveText(destinationWords.receipts.destinationNoAnswer);
  await expect(question.getByText(`“${typed}”`, { exact: true })).toBeVisible();
  await page.unroute("**/api/person/statements");
});

test("a yearly income the server can't take is said not kept, and the amount stays in its box (2026-10-24)", async ({ page }) => {
  // The words with no database reachable said "Only this page holds it" here until 2026-10-24, though nothing was
  // held: the proposal never reached the server, and only the box holds the amount. Until a review of the same day
  // the line said "no database reachable" though the database was never asked; a server that answers 503 gives
  // its own words.
  await page.route("**/api/person-figures/propose", (route) => route.abort());
  await page.goto("/start");
  await skipQuestionOneIfAsked(page);
  await answerBusinessAndPlaceOnly(page, "CA-AB");
  // Question 4 is asked, or answered from the data file (the first test's income): Change opens it again.
  const income = page.getByRole("region", { name: Q4 });
  const amount = income.getByRole("textbox", { name: Q4 });
  const change = income.getByRole("button", { name: destinationWords.change });
  await expect(amount.or(change).first()).toBeVisible();
  if (await change.isVisible()) await change.click();
  await amount.fill("61,234");
  await income.getByRole("button", { name: destinationWords.keepAmount }).click();
  await expect(income.getByRole("alert")).toHaveText(destinationWords.receipts.incomeNoAnswer);
  await expect(amount).toHaveValue("61,234");
  // Nothing was proposed, so there is nothing to agree to.
  await expect(page.getByRole("dialog")).toHaveCount(0);

  // A server that answers with no words of its own: not kept, and no cause DotAmi doesn't know.
  await page.unroute("**/api/person-figures/propose");
  await page.route("**/api/person-figures/propose", (route) => route.fulfill(CRASH_PAGE));
  await income.getByRole("button", { name: destinationWords.keepAmount }).click();
  await expect(income.getByRole("alert")).toHaveText(destinationWords.receipts.incomeNotKept);
  await expect(amount).toHaveValue("61,234");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.unroute("**/api/person-figures/propose");
});
