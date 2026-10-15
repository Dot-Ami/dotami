/**
 * No screen gives a verdict (CLAUDE.md: "Information and options, never a verdict"; "it never says 'you
 * should'"), checked on what a person actually sees, in a real browser on the production build.
 *
 * The unit tests check DotAmi's own words files sentence by sentence. This checks the screens whole: the
 * words files, the catalogs' prose and quotes, and whatever a component writes itself, as drawn. So a pull
 * request that slips "we recommend" into a component, a catalog step or a words file fails here even if no
 * unit test reads that file.
 *
 * It walks the journey and reads the visible text of every screen on it: the front door, the intake's
 * screens, Your destination, Pick a future, the cockpit on both written futures (with every card's panel
 * opened, its sources unfolded, each gauge's list, Compare and Export), Your plan for both, Your futures,
 * What DotAmi knows about you, Settings and Your expenses. The phrases, and the only allowances (quoted
 * official sentences, each with its reason), are in tests/helpers/verdict-words.ts.
 *
 * Not read here: /licences, which prints third-party licence texts word for word (the GPL's "You should
 * have received a copy…" among them), the packages' authors' words, not DotAmi's, and not a screen of the
 * journey; and the glossary, which is a document in the repository (docs/glossary.md), not a screen.
 */
import { expect, test, type Locator, type Page } from "@playwright/test";

import { generalRoadV2026, roadApprenticeToOwnShopAB } from "../lib/engines/roads/v2026";
import { waitForReact } from "../tests/helpers/react-ready";
import { OFFICIAL_QUOTE_ALLOWANCES, findVerdicts } from "../tests/helpers/verdict-words";

const GENERAL = generalRoadV2026.label;
const APPRENTICE = roadApprenticeToOwnShopAB.label;

const Q1 = /what do you want your work and life to look like/;
const Q2 = "Are you after a business of your own, a job or career, or both?";
const Q3 = "Which province or territory are you in?";

interface Seen {
  where: string;
  text: string;
}

/** Unfolds every <details> on the page, so what a person can open is read too. */
const unfoldAll = (page: Page) => page.evaluate(() => document.querySelectorAll("details").forEach((d) => (d.open = true)));

/** Reads the visible text of the page (or one part of it), with everything foldable unfolded. */
async function read(seen: Seen[], page: Page, where: string, part?: Locator) {
  await unfoldAll(page);
  seen.push({ where, text: await (part ?? page.locator("body")).innerText() });
}

const goalBar = (page: Page) => page.getByRole("region", { name: "Your goal and gauges" });
const gauge = (page: Page, name: string) => goalBar(page).getByRole("button", { name: new RegExp(`^${name}`) });

/**
 * The cockpit, read whole: as opened, with every question showing, each gauge's list, Compare where the
 * road offers it, Export, and the panel of every card on the road (steps, and rules and tax cards).
 * Returns how many cards' panels were read.
 */
async function readCockpit(seen: Seen[], page: Page, road: string): Promise<number> {
  await expect(goalBar(page)).toContainText(`Future: ${road}`);
  await expect(page.getByRole("region", { name: "The road" })).toBeVisible();
  const more = page.getByRole("region", { name: "Not told yet" }).getByRole("button", { name: /^\d+ more$/ });
  if ((await more.count()) > 0) await more.click();
  await read(seen, page, `cockpit (${road}), as opened`);

  for (const [name, region] of [
    ["Skills", "Skills on this road"],
    ["Start-up money", "Start-up money"],
    ["Your date", "Your date"],
  ] as const) {
    await gauge(page, name).click();
    const list = page.getByRole("region", { name: region }).last();
    await expect(list).toBeVisible();
    await read(seen, page, `cockpit (${road}), the ${name} list`, list);
  }

  const compareButton = goalBar(page).getByRole("button", { name: "Compare", exact: true });
  if ((await compareButton.count()) > 0) {
    await compareButton.click();
    const compare = page.getByRole("region", { name: "Compare the two endings" });
    await expect(compare).toBeVisible();
    await read(seen, page, `cockpit (${road}), Compare the two endings`, compare);
  }

  await page.getByRole("button", { name: "Export", exact: true }).click();
  await expect(page.getByRole("link", { name: /^Open your plan to read or print/ })).toBeVisible();
  await read(seen, page, `cockpit (${road}), Export`);

  // Every card's panel. A card's name is "<title>, <its states…>, opens detail", a rules and tax card's
  // title led by its kind ("Write-off: Home office expenses"): each click waits until the panel holds the
  // card's title (up to its first comma), so the text read is that card's.
  const cards = page.locator('button[aria-label$=", opens detail"]');
  const panel = page.locator("#cockpit-panel");
  const count = await cards.count();
  for (let i = 0; i < count; i++) {
    const card = cards.nth(i);
    const name = (await card.getAttribute("aria-label")) ?? "";
    const title = name.replace(/^[A-Za-z &-]+: /, "").split(", ")[0]!;
    expect(title.length, name).toBeGreaterThan(2);
    await card.click();
    await expect(panel, name).toContainText(title);
    await read(seen, page, `cockpit (${road}), panel of “${name}”`, panel);
  }
  return count;
}

/** The plan's address for the idea open in the cockpit, from its Export panel. */
async function planAddress(page: Page): Promise<string> {
  await page.getByRole("button", { name: "Export", exact: true }).click();
  const href = await page.getByRole("link", { name: /^Open your plan to read or print/ }).getAttribute("href");
  expect(href).toMatch(/^\/plan\?venture=/);
  return href!;
}

/** Every verdict phrase found, with the screen it was on. */
const verdictsIn = (seen: Seen[]) => seen.flatMap((s) => findVerdicts(s.text).map((found) => `${s.where} → ${found}`));

test("no screen of the journey says what to do or ranks anything: every visible word, both roads, every card's panel", async ({ page }) => {
  const seen: Seen[] = [];
  const stamp = Date.now();

  // The front door.
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await read(seen, page, "front door");

  // Door 2, the intake's screens, to the cockpit on road 0.
  const box = page.getByPlaceholder(/What are you building/);
  await waitForReact(box);
  await box.fill(`A mobile bike repair business with a van in Red Deer (invented ${stamp})`);
  await page.getByRole("button", { name: "Map it →" }).click();
  await expect(page.getByRole("heading", { name: /Did we get this/ })).toBeVisible();
  await read(seen, page, "intake: did we get this right");
  await page.getByRole("button", { name: "← Back" }).click();
  await expect(page.getByRole("heading", { name: /about you/ })).toBeVisible();
  await read(seen, page, "intake: about you");
  await page.getByRole("button", { name: "Continue →" }).click();
  await page.getByRole("button", { name: "Looks right →" }).click();
  const employment = page.getByText("Current employment", { exact: true }).locator("xpath=following-sibling::select");
  await expect(employment).toBeVisible();
  await read(seen, page, "intake: ground it");
  await employment.selectOption("self-employed");
  await page.getByRole("button", { name: "Open my map →" }).click();
  await expect(page).toHaveURL(/\/cockpit/);
  const road0Cards = await readCockpit(seen, page, GENERAL);
  const road0Plan = await planAddress(page);

  // Door 1: Your destination, answered, then Pick a future and the first written future.
  await page.goto("/start");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Your destination");
  const q1 = page.getByRole("textbox", { name: Q1 });
  await expect(q1.or(page.getByRole("heading", { name: Q2, level: 2 })).first()).toBeVisible();
  await read(seen, page, "Your destination, as opened");
  if (await q1.isVisible()) {
    const dontKnow = page.getByRole("button", { name: "I don't know yet" });
    await waitForReact(dontKnow);
    await dontKnow.click();
  }
  const both = page.getByRole("button", { name: "Both, or not sure" });
  await waitForReact(both);
  await both.click();
  await page.getByRole("combobox", { name: Q3 }).selectOption("CA-AB");
  await page.getByRole("button", { name: "Use this place" }).click();
  const skip = page.getByRole("button", { name: "Skip" });
  const pick = page.getByRole("link", { name: "Pick a future →" });
  await expect(skip.or(pick).first()).toBeVisible();
  if (await skip.isVisible()) await skip.click();
  await expect(pick).toBeVisible();
  await read(seen, page, "Your destination, answered");

  await pick.click();
  const cards = page.getByRole("list", { name: "Written futures" }).getByRole("listitem");
  await expect(cards.getByRole("heading", { level: 2 })).toHaveText([GENERAL, APPRENTICE]);
  await read(seen, page, "Pick a future");
  await page.getByRole("textbox", { name: "Name it (optional)" }).fill(`Invented — no verdict test ${stamp}`);
  await page.getByRole("button", { name: `Look inside ${APPRENTICE}` }).click();
  await expect(page).toHaveURL(/\/cockpit\?venture=/);
  const apprenticeCards = await readCockpit(seen, page, APPRENTICE);
  const apprenticePlan = await planAddress(page);

  // Your plan, for both.
  for (const [address, road] of [
    [road0Plan, GENERAL],
    [apprenticePlan, APPRENTICE],
  ] as const) {
    await page.goto(address);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("region", { name: "What this plan is" })).toBeVisible();
    await read(seen, page, `Your plan (${road})`);
  }

  // The pages around the journey.
  await page.goto("/ventures");
  await expect(page.getByRole("heading", { name: `Invented — no verdict test ${stamp}`, level: 2 })).toBeVisible();
  await read(seen, page, "Your futures");
  await page.goto("/your-data");
  await expect(page.getByRole("heading", { name: "What leaves this computer", level: 2 })).toBeVisible();
  await read(seen, page, "What DotAmi knows about you");
  await page.goto("/settings");
  await expect(page.getByRole("heading", { name: "Updates", level: 2 })).toBeVisible();
  await read(seen, page, "Settings");
  await page.goto("/expenses");
  await expect(page.getByRole("heading", { name: "Records you agreed to", level: 2 })).toBeVisible();
  await read(seen, page, "Your expenses");

  // The walk read what it meant to: every step's panel on both roads (and road 0's rules and tax cards),
  // and the sources under them, which is where the allowed official quotes show.
  expect(road0Cards).toBeGreaterThan(generalRoadV2026.steps.length);
  expect(apprenticeCards).toBeGreaterThanOrEqual(roadApprenticeToOwnShopAB.steps.length);
  const all = seen.map((s) => s.text).join("\n");
  for (const allowance of OFFICIAL_QUOTE_ALLOWANCES) expect(all, allowance.text).toContain(allowance.text);

  expect(verdictsIn(seen)).toEqual([]);
});

test("the control: the same reading catches a verdict put on a real screen", async ({ page }) => {
  await page.goto("/futures");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  const seen: Seen[] = [];
  await read(seen, page, "Pick a future, untouched");
  expect(verdictsIn(seen)).toEqual([]);

  // What an outside pull request might slip in: a badge and a line of advice on the screen.
  await page.evaluate(() => {
    const main = document.querySelector("main") ?? document.body;
    for (const words of ["Top pick", "We recommend this future for most people."]) {
      const line = document.createElement("p");
      line.textContent = words;
      main.append(line);
    }
  });
  await read(seen, page, "Pick a future, with a verdict added");
  const found = verdictsIn(seen);
  expect(found).toHaveLength(2);
  expect(found[0]).toMatch(/^Pick a future, with a verdict added → we recommend: /);
  expect(found[1]).toMatch(/^Pick a future, with a verdict added → top pick: /);
});
