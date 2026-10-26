/**
 * Your destination (/start) in the browser tests: its four questions' words and the steps several tests share
 * (e2e/front-door.spec.ts, e2e/your-data.spec.ts). Questions 1 and 4 are answered from the data file once an
 * earlier test kept them; 2 and 3 only from the window's memory (lib/journey/held-journey.ts), which a page
 * loaded afresh starts empty, so each test that reaches them answers them itself, and runs on its own too.
 */
import { expect, type Page } from "@playwright/test";

import { destinationWords } from "../lib/front-door/words";
import { waitForReact } from "../tests/helpers/react-ready";

// Case-blind: the question starts with "What" since 2026-10-20 (it began "In a few years, what …").
export const Q1 = /what do you want your work and life to look like/i;
export const Q2 = "Are you after a business of your own, a job or career, or both?";
export const Q3 = "Which province or territory are you in?";
export const Q4 = "What yearly income do you want, before tax?";

/** Question 1 is asked only when no words are kept (a test run on its own): "I don't know yet" keeps nothing and moves on. */
export async function skipQuestionOneIfAsked(page: Page) {
  const q1 = page.getByRole("textbox", { name: Q1 });
  await expect(q1.or(page.getByRole("heading", { name: Q2, level: 2 })).first()).toBeVisible();
  if (await q1.isVisible()) {
    const dontKnow = page.getByRole("button", { name: "I don't know yet" });
    await waitForReact(dontKnow);
    await dontKnow.click();
  }
}

/** Answers 2 (a business of my own) and 3 (the place), and nothing more: question 4 is left as it stands. */
export async function answerBusinessAndPlaceOnly(page: Page, place: string) {
  const business = page.getByRole("button", { name: "A business of my own" });
  await waitForReact(business);
  await business.click();
  await page.getByRole("combobox", { name: Q3 }).selectOption(place);
  await page.getByRole("button", { name: destinationWords.usePlace }).click();
}

/** Answers 2 and 3, then skips 4 when it is asked (no income kept yet), so the way on is offered. */
export async function answerBusinessAndPlace(page: Page, place: string) {
  await answerBusinessAndPlaceOnly(page, place);
  const skip = page.getByRole("button", { name: "Skip" });
  const next = page.getByRole("link", { name: destinationWords.next });
  await expect(skip.or(next).first()).toBeVisible();
  if (await skip.isVisible()) await skip.click();
  await expect(next).toBeVisible();
}

/**
 * Questions 2 and 3 not answered on this page: question 2's choices are buttons (answered, it shows its answer as
 * text and has none), and question 3 is drawn neither asked nor answered (answered, its heading stays on screen
 * with the place). Question 2's heading alone proves nothing: an answered question keeps it.
 */
export async function expectBusinessAndPlaceAsked(page: Page) {
  await skipQuestionOneIfAsked(page);
  await expect(page.getByRole("button", { name: "A business of my own" })).toBeVisible();
  await expect(page.getByRole("heading", { name: Q3, level: 2 })).toHaveCount(0);
}
