/**
 * The calm first view (2026-10-17, S2.5.30c; docs/architecture/future-cockpit.md § 2, "First visit and return
 * visits"): every browser test starts in a fresh browser, so every cockpit it opens is a first visit, with the
 * rail, the legend, the what-if bar and the road ahead folded, Money and Rules & tax off, and Compare
 * and Others in this line of work behind the goal bar's "Look closer" menu, which also shows the folded legend
 * and what-if bar (2026-10-20). These open what a test needs, the
 * way a person would, with the same buttons; nothing here changes what a test then checks.
 */
import { expect, type Locator, type Page } from "@playwright/test";

import { waitForReact } from "../tests/helpers/react-ready";

// The folded road ahead's name goes on to say what it holds ("Show the road ahead: Incorporating · …").
const showButton = (page: Page, name: string) =>
  page.getByRole("button", name === "Show the road ahead" ? { name: /^Show the road ahead: / } : { name, exact: true });

/**
 * Waits until the cockpit has been taken over by React and has read what this browser remembers, which it
 * does in the effect right after: the server draws a first visit, so until then a region a return visit has
 * open would still look folded.
 */
export async function cockpitSettled(page: Page) {
  const top = page.getByRole("region", { name: "Your goal and gauges" }).getByRole("button").first();
  await expect(top).toBeVisible();
  await waitForReact(top);
  // Two frames: the effect that reads the browser's storage has run and its drawing is committed.
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
}

/** Clicks the button that shows a folded region, when it is drawn; waits for the region's fold button. */
async function show(page: Page, showName: string, foldName: string) {
  await cockpitSettled(page);
  const button = showButton(page, showName).filter({ visible: true });
  if ((await button.count()) > 0) {
    await button.first().click();
    await expect(showButton(page, foldName).filter({ visible: true }).first()).toBeVisible();
  }
}

/** The left rail (from 768 px; below that it is a sheet, opened from the header as before). */
export const showRail = (page: Page) => show(page, "Show venture details", "Fold venture details");
/**
 * Picks the Look closer item that shows a region folded under the map, when it is listed (it is only while
 * the region is folded); waits for the region's fold button. Since 2026-10-20 the legend and the what-if bar
 * are shown from there, no longer from a button each at the end of Next on your road.
 */
async function showFromLookCloser(page: Page, item: string, foldName: string) {
  if (!(await lookCloserItems(page)).includes(item)) return;
  await lookCloser(page, item);
  await expect(showButton(page, foldName).filter({ visible: true }).first()).toBeVisible();
}

/** The map's legend, from the goal bar's Look closer menu. */
export const showLegend = (page: Page) => showFromLookCloser(page, "Show the legend", "Fold the legend");
/** The what-if bar and This visit, from the goal bar's Look closer menu. */
export const showWhatIfBar = (page: Page) => showFromLookCloser(page, "Show the what-if bar", "Fold the what-if bar");
/** The road's later columns. */
export const showRoadAhead = (page: Page) => show(page, "Show the road ahead", "Fold the road ahead");
/** Switches an overlay on (Skills, Money or Rules & tax); every switch is drawn, on or off. */
export async function overlayOn(page: Page, label: "Skills" | "Money" | "Rules & tax") {
  await cockpitSettled(page);
  const overlays = page.getByRole("group", { name: "Overlays" });
  const button = overlays.getByRole("button", { name: new RegExp(`^${label}`) });
  // A layer with nothing on this road (road 1 has no rules and tax cards) has a switch that can't be
  // pressed: there is nothing for it to show.
  if (await button.isDisabled()) return;
  if ((await button.getAttribute("aria-pressed")) !== "true") await button.click();
  await expect(button).toHaveAttribute("aria-pressed", "true");
}

/**
 * Everything the cockpit had open before the calm first view: the rail, the legend, the what-if bar, the road
 * ahead, and Rules & tax on (it started on until 2026-10-17).
 */
export async function openTheCockpit(page: Page) {
  await showRail(page);
  await showRoadAhead(page);
  await showLegend(page);
  await showWhatIfBar(page);
  await overlayOn(page, "Rules & tax");
}

/**
 * For a file whose tests are about the map's content or another screen, not about how the cockpit first
 * looks: every page this test opens finds the cockpit as a person left it who had opened everything, Rules &
 * tax on and the tip put away (a return visit; lib/cockpit/folds.ts), which is how every cockpit looked
 * before the calm first view. Written only when nothing is stored yet, so a fold the test makes is kept
 * across its own reloads. The first view itself is held by cockpit.spec.ts, journey.spec.ts and the clutter
 * limit. Not for the example, which never reads the browser's storage.
 */
export async function startAsAReturnVisit(page: Page) {
  await page.addInitScript(() => {
    try {
      if (window.localStorage.getItem("dotami-cockpit-folds") === null) {
        window.localStorage.setItem(
          "dotami-cockpit-folds",
          JSON.stringify({
            rail: false,
            goal: false,
            panel: false,
            legend: false,
            whatIf: false,
            roadAhead: false,
            overlays: { skills: false, money: false, rules: true },
            coachDismissed: true,
          }),
        );
      }
    } catch {
      // A page with no storage of its own (about:blank): nothing to do.
    }
  });
}

/**
 * "Look closer" in the goal bar, then one of its items (Compare the two endings, Others in this line of work,
 * and, while folded, Show the legend and Show the what-if bar). Folded, the goal bar's one line has it too.
 */
export async function lookCloser(page: Page, item: string, within?: Locator) {
  await cockpitSettled(page);
  const scope = within ?? page;
  await scope.getByRole("button", { name: "Look closer" }).click();
  await page.getByRole("menuitem", { name: item, exact: true }).click();
}

/** The Look closer menu's items, read by opening it and closing it again with Escape. */
export async function lookCloserItems(page: Page, within?: Locator): Promise<string[]> {
  await cockpitSettled(page);
  const scope = within ?? page;
  const button = scope.getByRole("button", { name: "Look closer" });
  if ((await button.count()) === 0) return [];
  await button.click();
  const items = await page.getByRole("menuitem").allInnerTexts();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("menu")).toHaveCount(0);
  return items.map((text) => text.trim());
}

/**
 * Picks a job the way a person does (task 25h's tests): the Skills gauge opens the list, the job is searched
 * by its name and clicked. Waits until the pick is kept and shown. `label` is the government's job name, `code`
 * its OaSIS code ("Athletes", "53200.00").
 */
export async function pickJob(page: Page, label: string, code: string) {
  await cockpitSettled(page);
  await page.getByRole("region", { name: "Your goal and gauges" }).getByRole("button", { name: /^Skills/ }).click();
  const skills = page.getByRole("region", { name: "Skills on this road" }).last();
  await skills.getByRole("searchbox", { name: "Search jobs by name or code" }).fill(code);
  await skills.getByRole("button", { name: `${label} · ${code}` }).click();
  // Picked: the list's line names the job, its code and the day ("Athletes · 53200.00 · picked 2026-10-21").
  await expect(skills.getByText(`${label} · ${code} · picked`)).toBeVisible();
}
