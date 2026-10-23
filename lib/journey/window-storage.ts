import type { DestinationDraft } from "@/lib/front-door/draft";
import type { DeleteKindId } from "@/lib/privacy/inventory";

import type { IntakeDraft, JourneyState } from "./types";

/**
 * What of the journey goes into the tab's window storage (`sessionStorage`, `dotami-journey-v3`), and what
 * never does (2026-10-23, the pre-release review of 30f).
 *
 * *Your destination*'s answers are the person's own (their words, business or career or both, their
 * province or territory, the income they agreed to), and the rule is that nothing about the person sits
 * in window storage: their answers belong in the data file. They are held in the page's memory only
 * (the journey provider, `components/shared/journey-provider.tsx`) and reach the data file where the
 * design already puts them:
 *
 * - question 1 (the words) and question 4 (the agreed income) are kept in the data file the moment they
 *   are given, and `/start` reads them back on every visit (lib/front-door/kept.ts);
 * - questions 2 and 3 (business or career, the place) are kept with the idea when a future is picked
 *   (`Venture.lookingFor`, `Venture.province`). Before that there is no idea to keep them with, so they
 *   live in memory only, and a reload or a new window asks them again (the receipts say so).
 *
 * Memory, not a new place in the data file, because both are answers about one idea: the data file already
 * keeps them on the idea, and keeping them beforehand would mean a second, person-wide copy that the next
 * idea could silently inherit, which would be a fact about the person DotAmi worked out rather than one they
 * gave for that idea.
 */
export function forWindowStorage(state: JourneyState): JourneyState {
  return { ...state, intake: withoutDestination(state.intake) };
}

/**
 * What is read back from window storage, without any destination answers an older copy of DotAmi wrote
 * there before 2026-10-23: the provider writes the journey straight back, so those answers are gone from
 * the window as soon as the page loads.
 */
export function fromWindowStorage(stored: Partial<JourneyState> | null): Partial<JourneyState> | null {
  if (!stored) return null;
  return stored.intake ? { ...stored, intake: withoutDestination(stored.intake) } : stored;
}

function withoutDestination<T extends Partial<IntakeDraft>>(intake: T): T {
  const { destination: _held, ...rest } = intake;
  return rest as T;
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
