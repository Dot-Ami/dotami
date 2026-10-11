import type { IntakeDraft, IntakeGoalId } from "@/lib/journey/types";

/**
 * What the intake's first save of an idea carries besides the idea itself (2026-10-11): the sentence
 * the person typed on the front door, word for word with the day they typed it, and the goal chips
 * they picked. Until then both lived only in the browser tab and were lost when it closed.
 *
 * Only that first save sends this. The cockpit's autosave never does, so a sentence the person later
 * deleted (Delete → Your statements) can't be written back. Design:
 * docs/ui-spec/landing/01-free-text-entry.md § Persistence.
 */
export interface FirstSave {
  /** Kept as one dated statement in the person's own words, linked to the idea. */
  firstWords?: { text: string; saidAt: string };
  /** Kept on the idea, shown back on its card; no rule reads them. */
  goals?: IntakeGoalId[];
}

/** The first-save extras from the intake draft. `today` is the person's own day, used if the typing day is missing. */
export function firstSaveFromIntake(draft: IntakeDraft, today: string): FirstSave {
  // The sentence exactly as it was typed (the front door trims only its ends). Blank = none typed.
  const text = draft.manualEntry ?? "";
  const out: FirstSave = {};
  if (text.trim().length > 0) out.firstWords = { text, saidAt: draft.manualEntrySaidAt ?? today };
  out.goals = [...draft.goals];
  return out;
}
