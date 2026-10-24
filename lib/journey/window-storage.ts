import type { DestinationDraft } from "@/lib/front-door/draft";
import type { DeleteKindId } from "@/lib/privacy/inventory";

import { afterStatementsDeleted } from "./first-save";
import { defaultIntakeDraft, type IntakeDraft } from "./types";

/**
 * Nothing of the journey goes into the window's storage (the maintainer's rule: it may hold how the screen was
 * left, `dotami-cockpit-folds`, and nothing the person typed or answered). *Your destination*'s answers came
 * out of it on 2026-10-23, and the rest of the journey on 2026-10-24: the intake in progress and the idea open
 * on the map are held in the window's memory only (lib/journey/held-journey.ts, through the journey provider,
 * components/shared/journey-provider.tsx). A reload, a new window or the desktop app's Go menu starts that
 * memory empty. What the person answers reaches the data file where the design already keeps it:
 *
 * - Your destination's words (question 1) and agreed income (question 4): the moment they are given, and
 *   `/start` reads them back on every visit (lib/front-door/kept.ts);
 * - the front door's sentence and the intake's goal chips: with the idea's first save (lib/journey/first-save.ts);
 * - business or career (question 2) and the place (question 3): with the idea a future is picked for
 *   (`Venture.lookingFor`, `Venture.province`). Before that there is no idea to keep them with, and keeping them
 *   beforehand would mean a second, person-wide copy the next idea could silently inherit, a fact about the
 *   person DotAmi worked out rather than one they gave for that idea; so they are asked again after a reload;
 * - the idea's own answers on the map: by the cockpit's autosave.
 */

/**
 * Keys older copies of DotAmi wrote with the person's own words or answers in them (lib/privacy/inventory.ts
 * RETIRED_WINDOW_STORAGE). Only ever removed now, never read or written (tests/privacy-inventory.spec.ts).
 */
export const RETIRED_JOURNEY_KEY = "dotami-journey-v3";
export const RETIRED_UNSAVED_STATEMENTS_KEY = "dotami-person-unsaved";
export const RETIRED_EMPLOYMENT_SUGGESTIONS_KEY = "dotami-employment-suggestions";

/**
 * Removes what an older DotAmi left in this window's storage, without reading it. The journey provider runs it
 * when one of the journey's pages opens; Mara's example, outside them, touches no storage at all.
 */
export function removeRetiredWindowStorage(): void {
  if (typeof window === "undefined") return;
  // One store at a time: a browser that refuses one (blocked site data) still has the other cleared.
  try {
    sessionStorage.removeItem(RETIRED_JOURNEY_KEY);
    sessionStorage.removeItem(RETIRED_UNSAVED_STATEMENTS_KEY);
  } catch {
    // Nothing to clear, or the browser refused.
  }
  try {
    localStorage.removeItem(RETIRED_EMPLOYMENT_SUGGESTIONS_KEY);
  } catch {
    // As above.
  }
}

/**
 * The destination answers held in memory after Delete on *What DotAmi knows about you* (2026-10-23):
 * deleting the statements takes the words, deleting the income takes the income, and deleting the ideas
 * takes everything (the whole journey is reset). Questions 2 and 3 are answers for the next idea, kept with
 * it once it is picked, so they go with the ideas.
 */
export function destinationAfterDelete(
  draft: DestinationDraft | undefined,
  deleted: readonly DeleteKindId[],
): DestinationDraft | undefined {
  if (!draft) return draft;
  if (deleted.includes("ideas")) return undefined;
  const out: DestinationDraft = { ...draft };
  if (deleted.includes("statements")) delete out.destination;
  if (deleted.includes("income-wanted")) delete out.incomeWanted;
  return Object.keys(out).length > 0 ? out : undefined;
}

/**
 * The intake held in the window's memory after Delete on *What DotAmi knows about you*: what goes from the data
 * file goes from memory too (2026-10-24). With the statements, the sentence typed on the front door and its copies
 * (lib/journey/first-save.ts `afterStatementsDeleted`) and Your destination's words; with the income, the income;
 * with the ideas, the whole intake (the Delete menu also drops the idea open on the map, so a Save there can't
 * bring a deleted idea back). Anything else Delete removes leaves the intake as it was.
 */
export function intakeAfterDelete(intake: IntakeDraft, deleted: readonly DeleteKindId[]): IntakeDraft {
  if (deleted.includes("ideas")) return defaultIntakeDraft();
  const draft = deleted.includes("statements") ? afterStatementsDeleted(intake) : intake;
  return { ...draft, destination: destinationAfterDelete(draft.destination, deleted) };
}
