/**
 * The whole journey in one go, in a real browser on the production build (docs/architecture/future-cockpit.md
 * § 1, "The journey, screen by screen", and § 2): the front door, Your destination's four questions with
 * their receipts, Pick a future, the cockpit on the first written future (skills marked, a start-up line
 * priced with the person's own number, their month, a what-if, Compare and This is mine, a business added
 * to Others in this line of work with an ad link, a region folded and opened again), Your plan, then a reload that reads back what was kept, and Your futures listing it.
 * Then the other way in: "I already have an idea", to the cockpit on road 0.
 *
 * The screens are each tested on their own elsewhere (e2e/front-door.spec.ts, e2e/cockpit*.spec.ts,
 * e2e/plan.spec.ts); this file checks they still join up, one after the other, as a person meets them,
 * so a change to one screen that breaks the way to the next fails here.
 *
 * It also reads the page after each thing a person does on the way (an answer and its receipt, an agree
 * prompt, a skill marked, a line priced, a date, a what-if, This is mine, the plan with all of it in) and
 * fails on a verdict there, with the same findVerdicts as e2e/no-verdict.spec.ts, which reads every
 * screen as it opens. Words a component writes only once something is done, such as the what-if banner,
 * are on no screen as opened, so this is where they are read.
 *
 * The run's database is fresh (playwright.config.ts), but this file runs after e2e/front-door.spec.ts on
 * it, which keeps a destination and an income. So questions 1 and 4 may already be answered from the data
 * file: the test then changes each, which asks it again, so the four questions and their receipts are met
 * either way. Skill marks belong to the person, not to one future, so the marks made here are taken back
 * at the end, after the reload has shown them kept.
 */
import { expect, test, type Page } from "@playwright/test";

import { generalRoadV2026, roadApprenticeToOwnShopAB, skillItemsV2026 } from "../lib/engines/roads/v2026";
import { waitForReact } from "../tests/helpers/react-ready";
import { findVerdicts } from "../tests/helpers/verdict-words";

import { lookCloser, showLegend, showRail, showRoadAhead, showWhatIfBar } from "./cockpit-calm";
import { openTheMapFromTheIntake, skipTheJob } from "./three-steps";

const GENERAL = generalRoadV2026.label;
const APPRENTICE = roadApprenticeToOwnShopAB.label;

// Case-blind: the question starts with "What" since 2026-10-20 (it began "In a few years, what …").
const Q1 = /what do you want your work and life to look like/i;
const Q2 = "Are you after a business of your own, a job or career, or both?";
const Q3 = "Which province or territory are you in?";
const Q4 = "What yearly income do you want, before tax?";

// What this test marks and prices on the apprentice road, read from the road itself so a renamed step
// or line fails here with its new name in the message rather than a timeout on an old label.
const listedSkills = new Set(roadApprenticeToOwnShopAB.steps.flatMap((s) => s.needs));
const skillLabel = (id: string) => skillItemsV2026.find((item) => item.id === id)!.label;
const ASN = skillLabel("skill-ab-alberta-student-number");
const AGREEMENT = skillLabel("skill-ab-apprenticeship-education-agreement");
const sponsorStep = roadApprenticeToOwnShopAB.steps.find((s) => s.id === "step-shop-sponsor-hours")!;
const handTools = sponsorStep.costs.find((c) => c.id === "cost-shop-hand-tools")!;
const fork = roadApprenticeToOwnShopAB.forks[0]!;
const stepLabel = (id: string) => roadApprenticeToOwnShopAB.steps.find((s) => s.id === id)!.label;
const ownShop = stepLabel(fork.sides[1]!);

/** The person's own calendar day, as the page sees it. */
const todayIn = (page: Page) => page.evaluate(() => new Date().toLocaleDateString("en-CA"));
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const goalBar = (page: Page) => page.getByRole("region", { name: "Your goal and gauges" });
const gauge = (page: Page, name: string) => goalBar(page).getByRole("button", { name: new RegExp(`^${name}`) });
const stage = (page: Page, name: string) => page.getByRole("button", { name: new RegExp(`^${escape(name)}, `) });
const stepPanel = (page: Page) => page.getByRole("region", { name: "Step" });
const told = (page: Page) => page.getByRole("region", { name: "What you've told DotAmi" });
const skillsList = (page: Page) => page.getByRole("region", { name: "Skills and legal requirements" });
const skillRow = (page: Page, label: string) => skillsList(page).getByRole("listitem").filter({ has: page.getByText(label, { exact: true }) });
const whatIf = (page: Page) => page.getByRole("region", { name: "What-if" });
const compare = (page: Page) => page.getByRole("region", { name: "Compare the two endings" });
const button = (page: Page, name: string) => page.getByRole("button", { name, exact: true });

/** What the page shows right now, after something was done, kept with where it was. */
interface Seen {
  where: string;
  text: string;
}
const look = async (seen: Seen[], page: Page, where: string) => seen.push({ where, text: await page.locator("body").innerText() });
/** Every verdict phrase found, with the moment it was on screen. */
const verdictsIn = (seen: Seen[]) => seen.flatMap((s) => findVerdicts(s.text).map((found) => `${s.where} → ${found}`));

test("the whole journey: front door → destination → pick a future → the cockpit worked through → your plan → kept after a reload → your futures", async ({ page }) => {
  // The road this test walks has the skills, the cost line and the fork it uses.
  expect(listedSkills).toContain("skill-ab-alberta-student-number");
  expect(listedSkills).toContain("skill-ab-apprenticeship-education-agreement");
  expect(handTools.kind).toBe("named");
  expect(fork.sides).toHaveLength(2);

  const seen: Seen[] = [];
  const stamp = Date.now();
  const words = `My own cabinet shop, my own hours (invented ${stamp})`;
  const ideaName = `Invented — journey test ${stamp}`;

  // ---- The front door: the dream first, three doors.
  await page.goto("/");
  const today = await todayIn(page);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/See the road to the work and life you want\./);
  await expect(page.getByRole("list", { name: "Three ways in" }).getByRole("heading", { level: 2 })).toHaveText([
    "Start from where I want to be",
    "I already have an idea",
    "Show me an example first",
  ]);
  const startHere = page.getByRole("link", { name: "Start here →" });
  await waitForReact(startHere);
  await startHere.click();

  // ---- Your destination: four questions, each answer with its receipt.
  await expect(page).toHaveURL(/\/start$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Your destination");
  const receipts = page.getByRole("status");

  // 1. Where you want to be. Already kept from an earlier test? Change asks it again.
  const q1 = page.getByRole("textbox", { name: Q1 });
  await expect(q1.or(page.getByRole("heading", { name: Q2, level: 2 })).first()).toBeVisible();
  if (!(await q1.isVisible())) {
    const change = button(page, "Change").first();
    await waitForReact(change);
    await change.click();
  }
  await waitForReact(q1);
  await q1.fill(words);
  await button(page, "Keep my words").click();
  await expect(receipts.filter({ hasText: "Kept word for word" })).toContainText(`Kept word for word, dated ${today}.`);
  await expect(page.getByText(`“${words}”`, { exact: true })).toBeVisible();
  await look(seen, page, "Your destination, after the first answer and its receipt");

  // 2. Business, career or both: a count of the futures listed, nothing filtered out.
  await expect(page.getByRole("heading", { name: Q2, level: 2 })).toBeFocused();
  await button(page, "Both, or not sure").click();
  await expect(receipts.filter({ hasText: "listed" })).toHaveText("All 2 futures listed are shown.");

  // 3. The place.
  await page.getByRole("combobox", { name: Q3 }).selectOption("CA-AB");
  await button(page, "Use this place").click();
  await expect(receipts.filter({ hasText: "federal rules" })).toHaveText("Alberta's rules and the federal rules apply. 2 futures listed are written for Alberta.");

  // 4. The yearly income, through the agree prompt. Already agreed earlier? Change asks it again.
  const amount = page.getByRole("textbox", { name: Q4 });
  await expect(amount.or(page.getByRole("link", { name: "Pick a future →" })).first()).toBeVisible();
  if (!(await amount.isVisible())) await button(page, "Change").last().click();
  await amount.fill("65,000");
  await button(page, "Keep it").click();
  const prompt = page.getByRole("dialog", { name: "Agree to this number?" });
  await expect(prompt).toContainText("The yearly income you want, before tax");
  await look(seen, page, "Your destination, the agree prompt for the yearly income");
  await prompt.getByRole("button", { name: "Agree" }).click();
  await expect(prompt).toHaveCount(0);
  await expect(receipts.filter({ hasText: "Your target" })).toHaveText(`Your target: $65,000 a year, before tax, agreed ${today}. Nothing compares it with anything.`);
  await look(seen, page, "Your destination, all four answered");

  // ---- Pick a future: both written futures, in the order written, never ranked.
  await page.getByRole("link", { name: "Pick a future →" }).click();
  await expect(page).toHaveURL(/\/futures$/);
  // Pick a future opens on its first step since 2026-10-22: skipped, every future is listed with no job to match.
  await skipTheJob(page);
  const cards = page.getByRole("list", { name: "Written futures" }).getByRole("listitem");
  await expect(cards.getByRole("heading", { level: 2 })).toHaveText([GENERAL, APPRENTICE]);
  await expect(page.getByText("In the order they were written, not ranked. More futures are being written.")).toBeVisible();
  await page.getByRole("textbox", { name: "Name it (optional)" }).fill(ideaName);
  await page.getByRole("button", { name: `Look inside ${APPRENTICE}` }).click();

  // ---- The cockpit, on the road picked, with the person's words and target on top.
  await expect(page).toHaveURL(/\/cockpit\?venture=/);
  const ventureId = new URL(page.url()).searchParams.get("venture")!;
  await expect(goalBar(page)).toContainText(`Future: ${APPRENTICE}`);
  await expect(goalBar(page)).toContainText(`“${words}”`);
  await expect(goalBar(page)).toContainText("Your target: $65,000 a year, before tax");
  await expect(gauge(page, "Steps")).toContainText(`0 of ${roadApprenticeToOwnShopAB.steps.length} marked done`);
  // The calm first view (2026-10-17): the road, the goal and the next steps, with the one coach line; the
  // rail (the told list) and the what-if bar are opened here, one click each, as a person would.
  await expect(page.getByRole("note", { name: "A first look" })).toBeVisible();
  await look(seen, page, "cockpit, the first visit as it opens");
  await showRail(page);
  await showWhatIfBar(page);

  // Skills: mark two of the road's own and add one of the person's; each mark gets its receipt.
  await gauge(page, "Skills").click();
  await skillRow(page, ASN).getByRole("button", { name: "Have", exact: true }).click();
  await expect(skillRow(page, ASN).getByRole("button", { name: "Have", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(skillsList(page).getByRole("status", { name: "What changed" })).toContainText(`Because you told us you have “${ASN}”`);
  await skillRow(page, AGREEMENT).getByRole("button", { name: "Learning", exact: true }).click();
  await expect(skillsList(page).getByRole("status", { name: "What changed" })).toContainText(`Because you told us you're learning “${AGREEMENT}”`);
  const own = `Joinery (invented ${stamp})`;
  await skillsList(page).getByLabel("A skill in your own words").fill(own);
  await skillsList(page).getByRole("button", { name: "Add as learning" }).click();
  await expect(skillsList(page).getByRole("listitem").filter({ hasText: own }).getByRole("button", { name: "Learning", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(gauge(page, "Skills")).toContainText("1 have · 1 learning · 0 not yet");
  await look(seen, page, "cockpit, the Skills list with marks and their receipts");
  await gauge(page, "Skills").click();
  await expect(skillsList(page)).toHaveCount(0);

  // A start-up line priced with the person's own number: it counts only once agreed.
  await stage(page, sponsorStep.label).click();
  const line = stepPanel(page).getByRole("listitem").filter({ has: page.getByText(handTools.label, { exact: true }) });
  await expect(line).toContainText("not priced yet");
  await line.getByRole("button", { name: "Add your quote" }).click();
  await line.getByLabel("Amount").fill("1,250");
  await line.getByLabel("Where it came from").selectOption("your-guess");
  await line.getByRole("button", { name: "Next: agree" }).click();
  const figures = page.getByRole("dialog", { name: "Agree to these figures?" });
  await expect(figures).toBeVisible();
  await expect(gauge(page, "Start-up money")).toContainText("your numbers: not given yet");
  await look(seen, page, "cockpit, the agree prompt for a start-up line");
  await figures.getByRole("button", { name: "Agree", exact: true }).click();
  await expect(figures).toHaveCount(0);
  await expect(line).toContainText("$1,250");
  await expect(line).toContainText("your quote · agreed");
  await expect(gauge(page, "Start-up money")).toContainText("$1,250 your numbers (1 line)");
  const pricedTold = `You told us your number for “${handTools.label}” on “${sponsorStep.label}” is $1,250`;
  await expect(told(page).getByText(pricedTold, { exact: true })).toBeVisible();
  await look(seen, page, "cockpit, a start-up line priced and agreed");

  // Your month.
  await gauge(page, "Your date").click();
  const date = page.getByRole("region", { name: "Your date" });
  await date.getByLabel("Month and year").fill("2099-05");
  await date.getByRole("button", { name: "Save", exact: true }).click();
  await expect(gauge(page, "Your date")).toContainText("May 2099");
  await expect(gauge(page, "Your date")).toContainText(/\d+ months from today/);
  await look(seen, page, "cockpit, the person's month set");

  // A what-if: the rules relit under the "not a forecast" banner, and nothing kept.
  await whatIf(page).getByLabel("Try first-year sales of $").fill("45000");
  await whatIf(page).getByRole("button", { name: "Try", exact: true }).click();
  await expect(whatIf(page).getByText("Your what-if, not a forecast", { exact: true })).toBeVisible();
  await expect(whatIf(page)).toContainText("First-year sales of $45,000, for this look only");
  await expect(told(page).getByText(/what-if/)).toHaveCount(0);
  await look(seen, page, "cockpit, a what-if on");

  // Compare the two endings, side by side, and This is mine on one (from the goal bar's Look closer menu).
  await lookCloser(page, "Compare the two endings", goalBar(page));
  await expect(compare(page)).toContainText("In the order the road shows them.");
  await expect(compare(page).getByText("No side picked yet.")).toBeVisible();
  const mine = compare(page).getByRole("button", { name: "This is mine" });
  await expect(mine).toHaveCount(2);
  await mine.nth(1).click();
  await expect(mine.nth(1)).toHaveAttribute("aria-pressed", "true");
  await expect(compare(page).getByRole("status")).toContainText(`Because you picked “${ownShop}” at “${fork.label}”`);
  await look(seen, page, "cockpit, Compare after This is mine");

  // Others in this line of work: a business the person is watching, with an ad link and the day it was seen.
  await lookCloser(page, "Others in this line of work", goalBar(page));
  const landscape = page.getByRole("region", { name: "Others in this line of work" });
  await expect(landscape).toContainText("DotAmi has no number for it.");
  const watchedName = `Invented Shop ${stamp}`;
  await landscape.getByRole("button", { name: "+ Add a business" }).click();
  const addBusiness = landscape.getByRole("form", { name: "Add a business" });
  await addBusiness.getByLabel("Name").fill(watchedName);
  await addBusiness.getByLabel("Your note (optional)").fill("A stall at the weekend market.");
  await addBusiness.getByRole("button", { name: "+ Add an ad link" }).click();
  await addBusiness.getByLabel("Ad link 1", { exact: true }).fill("https://example.com/ads/1");
  await addBusiness.getByLabel("Day you saw ad link 1").fill("2026-10-01");
  await addBusiness.getByRole("button", { name: "Save", exact: true }).click();
  await expect(landscape.getByRole("status")).toContainText("Added to your list.");
  const watchedRow = landscape.getByRole("list", { name: "Businesses you're watching" }).getByRole("listitem").filter({ hasText: watchedName });
  await expect(watchedRow).toContainText("seen 2026-10-01");
  await look(seen, page, "cockpit, Others in this line of work with a business and an ad link added");

  // Fold a region and open it again: what it held is back. The legend, folded on the first visit, opened first.
  await showLegend(page);
  const legendLine = page.getByRole("group", { name: "Legend" }).getByText("applies as answered", { exact: true });
  await expect(legendLine).toBeVisible();
  await button(page, "Fold the legend").click();
  await expect(legendLine).toBeHidden();
  // Shown again from the goal bar's Look closer menu (2026-10-20).
  await lookCloser(page, "Show the legend");
  await expect(legendLine).toBeVisible();

  // ---- Your plan, from Export: every section, with what was just done in it.
  await button(page, "Export").click();
  await page.getByRole("link", { name: /^Open your plan to read or print/ }).click();
  await expect(page).toHaveURL(new RegExp(`/plan\\?venture=${ventureId}$`));
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(ideaName);
  await expect(page.getByRole("heading", { level: 2 })).toHaveText([
    "In your words",
    "The future and its ending",
    "Each step",
    "Skills and requirements, with your marks",
    "Start-up money",
    "What you've told DotAmi",
    "What this plan is",
  ]);
  const section = (name: string) => page.getByRole("region", { name });
  await expect(section("In your words")).toContainText(words);
  await expect(section("The future and its ending")).toContainText(`Future: ${APPRENTICE}`);
  await expect(section("The future and its ending")).toContainText(ownShop);
  await expect(section("Start-up money")).toContainText(handTools.label);
  await expect(section("Start-up money")).toContainText("$1,250");
  await expect(section("Skills and requirements, with your marks")).toContainText(own);
  await look(seen, page, "Your plan, with the marks, the priced line and the ending in it");

  // ---- Back in the cockpit, and a reload: what was kept is read back from the data file.
  await page.getByRole("link", { name: "← Back to the cockpit" }).click();
  await expect(page).toHaveURL(new RegExp(`/cockpit\\?venture=${ventureId}$`));
  await page.reload();
  await expect(goalBar(page)).toContainText(`Future: ${APPRENTICE}`);
  await expect(gauge(page, "Skills")).toContainText("1 have · 1 learning · 0 not yet");
  await expect(gauge(page, "Start-up money")).toContainText("$1,250 your numbers (1 line)");
  await expect(gauge(page, "Your date")).toContainText("May 2099");
  await expect(told(page).getByText(pricedTold, { exact: true })).toBeVisible();
  await expect(told(page).getByRole("listitem").filter({ hasText: `You picked “${ownShop}” at “${fork.label}”` })).toBeVisible();
  // The what-if was kept nowhere: a reload starts without it.
  await expect(whatIf(page).getByText("Your what-if, not a forecast", { exact: true })).toHaveCount(0);
  await look(seen, page, "cockpit, after a reload, with what was kept");

  // Skill marks are the person's, across futures: take them back, so later tests start from the person's marks as they were.
  await gauge(page, "Skills").click();
  await skillRow(page, ASN).getByRole("button", { name: "I don't know", exact: true }).click();
  await expect(skillRow(page, ASN).getByRole("button", { name: "Have", exact: true })).toHaveAttribute("aria-pressed", "false");
  await skillRow(page, AGREEMENT).getByRole("button", { name: "I don't know", exact: true }).click();
  await expect(skillRow(page, AGREEMENT).getByRole("button", { name: "Learning", exact: true })).toHaveAttribute("aria-pressed", "false");
  await skillsList(page).getByRole("listitem").filter({ hasText: own }).getByRole("button", { name: "Remove", exact: true }).click();
  await expect(skillsList(page).getByRole("listitem").filter({ hasText: own })).toHaveCount(0);

  // ---- Your futures lists it, and opens it in the cockpit.
  await page.goto("/ventures");
  const card = page.getByRole("heading", { name: ideaName, level: 2 });
  await expect(card).toBeVisible();
  await expect(page.locator(`a[href="/cockpit?venture=${encodeURIComponent(ventureId)}"]`).first()).toBeVisible();
  await look(seen, page, "Your futures, with the new future");

  // No verdict anywhere on the way. And the reads above did catch the states they name: the what-if
  // banner, the agree prompts and This is mine's receipt were on screen when read, so a read can't
  // quietly miss them.
  const at = (where: string) => seen.find((s) => s.where.startsWith(where))!.text;
  // (The banner is set in capitals by its style, and the page's text comes back as drawn, hence /i.)
  expect(at("cockpit, a what-if on")).toMatch(/Your what-if, not a forecast/i);
  expect(at("cockpit, the agree prompt for a start-up line")).toMatch(/Agree to these figures\?/i);
  expect(at("Your destination, the agree prompt")).toMatch(/Agree to this number\?/i);
  expect(at("cockpit, Compare after This is mine")).toContain(`Because you picked “${ownShop}”`);
  expect(at("cockpit, Others in this line of work")).toContain("A stall at the weekend market.");
  expect(at("cockpit, the first visit as it opens")).toContain("Start anywhere. Each thing you tell us lights up part of the road.");
  expect(verdictsIn(seen)).toEqual([]);
});

test("the other way in: \"I already have an idea\" → the intake → the cockpit on road 0, with the idea's own sentence on top", async ({ page }) => {
  const sentence = `A mobile bike repair business with a van in Edmonton (invented ${Date.now()})`;
  await page.goto("/");
  const today = await todayIn(page);
  const box = page.getByPlaceholder(/What are you building/);
  await waitForReact(box);
  await box.fill(sentence);
  await button(page, "Map it →").click();

  await expect(page).toHaveURL(/\/intake/);
  await expect(page.getByRole("heading", { name: /Did we get this/ })).toBeVisible();
  await button(page, "Looks right →").click();
  await page.getByText("Current employment", { exact: true }).locator("xpath=following-sibling::select").selectOption("self-employed");
  await openTheMapFromTheIntake(page);

  // Road 0, drawn whole: its steps, counted from the road's own data, and the idea's sentence on top, dated.
  // (The intake opens the cockpit on the tab's own idea, so the address carries no idea id.)
  await expect(page).toHaveURL(/\/cockpit/);
  await expect(goalBar(page)).toContainText(`Future: ${GENERAL}`);
  await expect(goalBar(page)).toContainText(`“${sentence}”`);
  await expect(goalBar(page)).toContainText(`your words · ${today}`);
  await expect(gauge(page, "Steps")).toContainText(`0 of ${generalRoadV2026.steps.length} marked done`);
  await expect(page.getByRole("region", { name: "Next on your road" }).getByRole("button").first()).toBeVisible();
  // A first visit: the first two columns drawn, the rest folded into the road ahead, named, one click away.
  const [firstColumns, ahead] = [generalRoadV2026.columns.slice(0, 2), generalRoadV2026.columns.slice(2)];
  const label = (id: string) => generalRoadV2026.steps.find((s) => s.id === id)!.label;
  for (const id of firstColumns.flatMap((c) => c.steps)) await expect(stage(page, label(id)), label(id)).toBeVisible();
  for (const id of ahead.flatMap((c) => c.steps)) await expect(stage(page, label(id)), label(id)).toBeHidden();
  const seen: Seen[] = [];
  await look(seen, page, "cockpit on road 0, from the intake, the first visit");
  await showRoadAhead(page);
  for (const step of generalRoadV2026.steps) await expect(stage(page, step.label), step.label).toBeVisible();

  // And it is one of the person's futures, with the sentence typed for it on the front door.
  await look(seen, page, "cockpit on road 0, from the intake");
  expect(verdictsIn(seen)).toEqual([]);

  await page.goto("/ventures");
  await expect(page.getByText(sentence).first()).toBeVisible();
});
