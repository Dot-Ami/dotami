import type { IntakeDraft, IntakeGoalId } from "@/lib/journey/types";

/**
 * What the intake's first save of an idea carries besides the idea itself (2026-10-11): the sentence
 * the person typed on the front door, word for word with the day they typed it, and the goal chips
 * as they stood on the intake. Until then both lived only in the browser tab and were lost when it closed.
 *
 * Only the intake's "Open my map" sends this; the cockpit's autosave never does. Every "Open my map"
 * makes a new idea, though, so the server's "only when the save creates the idea" isn't enough on its
 * own: the tab's draft also marks the sentence done once a save kept it, or once the person deleted
 * their statements (`afterFirstSave`, `afterStatementsDeleted`), and a done sentence is never sent again.
 * Design: docs/ui-spec/landing/01-free-text-entry.md § Persistence.
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
  if (text.trim().length > 0 && !draft.manualEntryDone) out.firstWords = { text, saidAt: draft.manualEntrySaidAt ?? today };
  // Goals belong to each new idea (they go with "Your ideas"), so every new idea gets the chips as they stand.
  out.goals = [...draft.goals];
  return out;
}

/**
 * The draft after "Open my map" saved. A save that carried the sentence and succeeded kept it, so the
 * sentence is done; a failed save (no database) leaves it to be sent by the next try.
 */
export function afterFirstSave(draft: IntakeDraft, sent: FirstSave, saved: { ok: boolean }): IntakeDraft {
  return saved.ok && sent.firstWords ? { ...draft, manualEntryDone: true } : draft;
}

/**
 * The draft after Delete removed the person's statements: the sentence in the tab is one of them now
 * or would have become one, so it is never sent again. The words stay in the tab, as typed, for the
 * intake to show; only a new sentence is kept again.
 */
export function afterStatementsDeleted(draft: IntakeDraft): IntakeDraft {
  return draft.manualEntry ? { ...draft, manualEntryDone: true } : draft;
}
