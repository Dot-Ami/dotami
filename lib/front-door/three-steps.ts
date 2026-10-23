import { REGION_QUESTION_PROVINCES } from "@/lib/engines/research-kit/v2026/economic-regions";
import type { StepAnswers } from "@/lib/journey/first-save";
import { AREA_QUESTION_PROVINCES } from "@/lib/places/alberta-areas";

import { jobStepWords, pickWords, whereStepWords } from "./words";

/**
 * The three steps' flow (docs/ui-spec/futures/_index.md, 01, 02, 03): one part on screen at a time, asked before
 * any road is drawn, on Pick a future and at the end of the intake. Pure, so the screens, the idea harness and the
 * tests share one reading of what comes next and what the back link says.
 *
 * The answers live here only, in the page's memory: never in the window's storage and never saved until the
 * person opens a future (step 3's Look inside). Going back keeps every answer given and offers it again.
 *
 * - "work": What's closest to your work? A click on a job goes on; Skip goes straight to the futures, with no
 *   job, and so no area and no region (neither is asked without a job).
 * - "area" then "region": in Alberta only, one question each.
 * - "outside": everywhere else in Canada, one short part that asks nothing and says why (the maintainer's call 2
 *   of 2026-10-21).
 * - "road": Pick a future.
 */
export type StepPart = "work" | "area" | "region" | "outside" | "road";

export interface PickedJob {
  code: string;
  label: string;
}

export interface StepsState {
  part: StepPart;
  /** The job the person clicked; null before a click and after Skip. */
  job: PickedJob | null;
  /** The area and the region as picked, or null ("Choose one", not asked, or skipped). */
  area: string | null;
  region: string | null;
}

export const FIRST_STEP: StepsState = { part: "work", job: null, area: null, region: null };

/** Whether the area and region questions are asked for a province (Alberta only for now). */
export function asksWhere(province: string | null): boolean {
  return province !== null && AREA_QUESTION_PROVINCES.includes(province) && REGION_QUESTION_PROVINCES.includes(province);
}

/** A click on a job: the next part is where you are. A different job than before clears nothing else. */
export function pickedJob(state: StepsState, job: PickedJob, province: string | null): StepsState {
  return { ...state, job, part: asksWhere(province) ? "area" : "outside" };
}

/** Skip this question: no job, so no area or region either, and on to the futures. */
export function skipped(): StepsState {
  return { part: "road", job: null, area: null, region: null };
}

/** The part's Next button. */
export function next(state: StepsState): StepsState {
  if (state.part === "area") return { ...state, part: "region" };
  if (state.part === "region" || state.part === "outside") return { ...state, part: "road" };
  return state;
}

/** The nav's one back link, which goes back one part; null on the first part, where the page's own back link leads out. */
export function back(state: StepsState, province: string | null): StepsState | null {
  switch (state.part) {
    case "work":
      return null;
    case "area":
    case "outside":
      return { ...state, part: "work" };
    case "region":
      return { ...state, part: "area" };
    case "road":
      return { ...state, part: state.job === null ? "work" : asksWhere(province) ? "region" : "outside" };
  }
}

/** The back link's words on each part; `first` is the page's own on the first part. */
export function backLabel(state: StepsState, province: string | null, first: string): string {
  switch (state.part) {
    case "work":
      return first;
    case "area":
    case "outside":
      return jobStepWords.changePick;
    case "region":
      return whereStepWords.area.back;
    case "road":
      return state.job === null ? pickWords.backToWork : asksWhere(province) ? pickWords.backToRegion : pickWords.backToWhere;
  }
}

/** What the save at Look inside carries: only answers given, and the area and region only where they were asked. */
export function answersOf(state: StepsState, province: string | null): StepAnswers {
  const where = state.job !== null && asksWhere(province);
  return { job: state.job?.code ?? null, area: where ? state.area : null, region: where ? state.region : null };
}
