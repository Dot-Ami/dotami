/**
 * Every page fits a phone (docs/ui-spec/README.md, "The layout rule"; docs/ui-spec/cockpit/12-folding-and-phone.md):
 * at 375x812 no page the screen review of 2026-10-23 walked scrolls sideways, and on the cockpit the four
 * gauges are stacked inside the window (none in a strip that scrolls sideways), the idea's name is shown
 * whole, and the first visit's coach line is drawn clear of the road.
 *
 * The check (`e2e/phone-fit.ts`) is held to a planted control first: a page with one element wider than the
 * window fails it.
 */
import { expect, test, type Page } from "@playwright/test";

import { generalRoadV2026, roadApprenticeToOwnShopAB, roadFederalStepsCA } from "../lib/engines/roads/v2026";
import { cockpitWords } from "../lib/cockpit/words";
import { waitForReact } from "../tests/helpers/react-ready";

import { sidewaysReport } from "./phone-fit";
import { skipTheJob } from "./three-steps";

const PHONE = { width: 375, height: 812 };

test.use({ viewport: PHONE });

/** Waits until the page is drawn and its fonts are in, then reads what sticks out sideways. */
async function fits(page: Page, what: string) {
  await page.waitForLoadState("networkidle");
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
  const report = await page.evaluate(sidewaysReport);
  expect.soft(report, `${what} at 375 px: nothing past the window's right edge`).toEqual({ page: 0, wide: [] });
}

/** Your destination answered the way a person who doesn't know yet answers it, in `place`; ends on Pick a future. */
async function answerDestination(page: Page, place: string) {
  await page.goto("/start");
  const q1 = page.getByRole("textbox", { name: /what do you want your work and life to look like/i });
  await expect(q1.or(page.getByRole("heading", { name: "Are you after a business of your own, a job or career, or both?", level: 2 })).first()).toBeVisible();
  if (await q1.isVisible()) {
    const dontKnow = page.getByRole("button", { name: "I don't know yet" });
    await waitForReact(dontKnow);
    await dontKnow.click();
  }
  const business = page.getByRole("button", { name: "A business of my own" });
  await waitForReact(business);
  await business.click();
  await page.getByRole("combobox", { name: "Which province or territory are you in?" }).selectOption(place);
  await page.getByRole("button", { name: "Use this place" }).click();
  const next = page.getByRole("link", { name: "Pick a future →" });
  const skip = page.getByRole("button", { name: "Skip" });
  await expect(next.or(skip).first()).toBeVisible();
  if (await skip.isVisible()) await skip.click();
  await next.click();
  await expect(page).toHaveURL(/\/futures$/);
}

/** A fresh idea on `roadLabel`, picked on Pick a future with the job skipped; returns the cockpit's address. */
async function pickFuture(page: Page, roadLabel: string, place = "CA-AB"): Promise<string> {
  await answerDestination(page, place);
  await skipTheJob(page);
  const lookInside = page.getByRole("button", { name: `Look inside ${roadLabel}` });
  await waitForReact(lookInside);
  await lookInside.click();
  await expect(page).toHaveURL(/\/cockpit\?venture=/);
  await expect(page.getByRole("region", { name: "The road" })).toBeVisible();
  return new URL(page.url()).pathname + new URL(page.url()).search;
}

test("the check fails on a planted element wider than the window", async ({ page }) => {
  await page.goto("/settings");
  await page.waitForLoadState("networkidle");
  expect(await page.evaluate(sidewaysReport)).toEqual({ page: 0, wide: [] });
  await page.evaluate(() => {
    const planted = document.createElement("div");
    planted.style.width = "600px";
    planted.style.height = "10px";
    planted.setAttribute("aria-label", "planted");
    document.body.appendChild(planted);
  });
  const report = await page.evaluate(sidewaysReport);
  expect(report.page).toBeGreaterThan(0);
  expect(report.wide).toContain("div r=600 planted");
});

test("no page the screen review walked scrolls sideways at 375 px", async ({ page }) => {
  test.setTimeout(180_000);
  for (const [url, what] of [
    ["/", "the front door"],
    ["/intake", "the intake"],
    ["/example/mara", "Mara's example"],
    ["/your-data", "What DotAmi knows about you"],
    ["/settings", "Settings"],
    ["/licences", "Licences"],
  ] as const) {
    await page.goto(url);
    await fits(page, what);
  }

  await answerDestination(page, "CA-AB");
  await fits(page, "Pick a future, step 1");
  await skipTheJob(page);
  await fits(page, "Pick a future, step 3");

  // Your destination is answered already: straight on to the futures listed, and road 1 opened from there.
  const lookInside = page.getByRole("button", { name: `Look inside ${roadApprenticeToOwnShopAB.label}` });
  await waitForReact(lookInside);
  await lookInside.click();
  await expect(page).toHaveURL(/\/cockpit\?venture=/);
  await expect(page.getByRole("region", { name: "The road" })).toBeVisible();
  const cockpit = new URL(page.url()).pathname + new URL(page.url()).search;
  await fits(page, "the cockpit on road 1");
  await page.goto(cockpit.replace("/cockpit", "/plan"));
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await fits(page, "Your plan");
  await page.goto("/start");
  await fits(page, "Your destination, answered");

  await page.goto("/ventures");
  await expect(page.getByText("Loading…", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Open in cockpit →" }).first()).toBeVisible();
  await fits(page, "Your futures");
  await page.goto("/expenses");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await fits(page, "Your expenses");
});

for (const [roadLabel, place] of [
  [generalRoadV2026.label, "CA-AB"],
  [roadApprenticeToOwnShopAB.label, "CA-AB"],
  [roadFederalStepsCA.label, "CA-ON"],
] as const) {
  test(`the cockpit on ${roadLabel} at 375 px: gauges stacked, the name whole, the coach line clear of the road`, async ({ page }) => {
    await pickFuture(page, roadLabel, place);
    await page.evaluate(async () => {
      await document.fonts.ready;
    });

    // Every gauge is inside the window, whole: none is out of sight in a strip that scrolls sideways.
    const gauges = page.getByRole("region", { name: "Your goal and gauges" }).getByRole("button", { name: /^(Steps|Skills|Start-up money|Your date)/ });
    await expect(gauges).toHaveCount(4);
    for (const box of await gauges.evaluateAll((els) => els.map((el) => ({ text: (el as HTMLElement).innerText.split("\n")[0], ...el.getBoundingClientRect().toJSON() })))) {
      expect.soft(box.left, `${box.text}: its left edge in the window`).toBeGreaterThanOrEqual(0);
      expect.soft(box.right, `${box.text}: its right edge in the window`).toBeLessThanOrEqual(PHONE.width);
    }

    // The idea's name in the header is shown whole: not cut short with an ellipsis, on one line or two.
    const name = page.locator('[data-region="header"] span[title]');
    await expect(name).toHaveText(roadLabel);
    const cut = await name.evaluate((el) => ({ width: el.scrollWidth - el.clientWidth, height: el.scrollHeight - el.clientHeight }));
    expect.soft(cut, "the idea's name: nothing of it cut off").toEqual({ width: 0, height: 0 });

    // The coach line is drawn off the road: on a phone, after Next on your road, so it never sits on a card the
    // road's own area cuts off at its edge (the review's 375 shot showed it over "Trades Qualifier").
    const coach = page.getByRole("note", { name: cockpitWords.coach.region }).filter({ visible: true });
    await expect(coach).toHaveCount(1);
    const coachTop = (await coach.boundingBox())!.y;
    const roadBox = (await page.getByRole("region", { name: "The road" }).boundingBox())!;
    const nextBox = (await page.getByRole("region", { name: cockpitWords.next.title }).boundingBox())!;
    expect.soft(coachTop, "the coach line starts below the road's own area").toBeGreaterThanOrEqual(roadBox.y + roadBox.height);
    expect.soft(coachTop, "the coach line starts below Next on your road").toBeGreaterThanOrEqual(nextBox.y + nextBox.height - 0.5);
  });
}
