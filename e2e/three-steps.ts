/**
 * Pick a future's three steps (docs/ui-spec/futures/_index.md; 01, 02, 03), played in the browser the way a
 * person plays them, for the browser tests that go through Pick a future or the end of the intake. Since
 * 2026-10-22 both ways in end on these steps, so a test that used to click a card on Pick a future, or
 * **Open my map** on the intake, plays them first.
 *
 * The names are the screens' own words (lib/front-door/words.ts), so a change of words changes them here too.
 */
import { expect, type Page } from "@playwright/test";

import type { JobSearchGroupKind } from "../lib/engines/oasis/v2026/title-search";
import { generalRoadV2026 } from "../lib/engines/roads/v2026";
import { showGroupName } from "../lib/front-door/job-search-lines";
import { intakeStepsWords, jobStepWords, pickWords, whereStepWords } from "../lib/front-door/words";
import { waitForReact } from "../tests/helpers/react-ready";

/** Step 1's Skip: no job, so no area and no region either; step 3 opens at once. */
export async function skipTheJob(page: Page) {
  const skip = page.getByRole("button", { name: jobStepWords.skip, exact: true });
  await waitForReact(skip);
  await skip.click();
  // The skipped line is the place's own (outside Alberta it names the federal steps and the fold).
  const line = page.getByText(pickWords.skipped(false), { exact: true }).or(page.getByText(pickWords.skipped(true), { exact: true }));
  await expect(line).toBeVisible();
}

/**
 * Step 1: the person types the job's code (a code typed on its own finds exactly the jobs whose code starts
 * with it) and clicks the job. Typing words is tested on its own (e2e/three-steps.spec.ts).
 */
export async function pickTheJob(page: Page, job: { code: string; label: string }) {
  const box = page.getByRole("searchbox", { name: jobStepWords.boxLabel });
  await waitForReact(box);
  await box.fill(job.code);
  await page.getByRole("button", { name: jobStepWords.pickName(job.label, job.code), exact: true }).click();
}

/**
 * Step 1 played from the person's words, as the idea harness records it (tests/helpers/idea-pipeline.ts
 * `findTheJob`): type the words, open the group listing the job when it is shown folded, click the job. A word
 * search that can't list the job fails here, where typing its code wouldn't (the PR #202 review).
 */
export async function findTheJobByWords(
  page: Page,
  job: { code: string; label: string },
  search: { typed: string; group: JobSearchGroupKind; groupOpen: boolean; groupTotal: number },
) {
  const box = page.getByRole("searchbox", { name: jobStepWords.boxLabel });
  await waitForReact(box);
  await box.fill(search.typed);
  if (!search.groupOpen) {
    await page.getByRole("button", { name: showGroupName({ kind: search.group, total: search.groupTotal }), exact: true }).click();
  }
  const pick = page.getByRole("button", { name: jobStepWords.pickName(job.label, job.code), exact: true });
  await expect(pick).toBeVisible();
  await pick.click();
}

/** Step 2 in Alberta: the area (2a), then the region (2b), each the person's own pick (a value, or "" for Choose one). */
export async function answerWhereInAlberta(page: Page, area: string, region: string) {
  const areaBox = page.getByRole("combobox", { name: whereStepWords.area.label });
  await expect(areaBox).toBeVisible();
  await areaBox.selectOption(area);
  await page.getByRole("button", { name: whereStepWords.area.next, exact: true }).click();
  const regionBox = page.getByRole("combobox", { name: whereStepWords.region.label });
  await expect(regionBox).toBeVisible();
  await regionBox.selectOption(region);
  await page.getByRole("button", { name: whereStepWords.region.next, exact: true }).click();
}

/**
 * The intake's last screen on the typed way: **Next: the work closest to yours →**, Skip, then **Look inside**
 * the road named (the general road by default), which saves the idea and opens the map, as **Open my map** did.
 * Outside Alberta the roads written for Alberta are folded behind one button (task 28d): the person opens it first.
 */
export async function openTheMapFromTheIntake(page: Page, roadLabel: string = generalRoadV2026.label) {
  await page.getByRole("button", { name: intakeStepsWords.next, exact: true }).click();
  await skipTheJob(page);
  await lookInsideRoad(page, roadLabel);
}

/** Step 3's **Look inside** for the road named, opening the folded Alberta futures first when it is behind them. */
export async function lookInsideRoad(page: Page, roadLabel: string) {
  const lookInside = page.getByRole("button", { name: pickWords.lookInsideName(roadLabel), exact: true });
  const fold = page.getByRole("button", { name: /^Show the \d+ futures? written for Alberta$/ });
  await expect(lookInside.or(fold).first()).toBeVisible();
  if (!(await lookInside.isVisible())) await fold.click();
  await lookInside.click();
}
