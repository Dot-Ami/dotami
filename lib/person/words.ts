/**
 * The words of *In your words*' box (components/shared/person-statements.tsx), on About you and the cockpit's
 * rail: what it says after **Keep this**.
 */
export const statementWords = {
  kept: "Kept, with the date.",
  couldNotKeep: "Couldn't keep that.",
  /**
   * The server answered that it can't keep it (no database; the status line above the list says why). Nothing
   * is kept anywhere else since 2026-10-24 (until then the window's storage held it): the words stay in the box.
   */
  notKept: "Not kept. Your words are still in the box, and Keep this tries again.",
  /** No answer from the server at all. */
  noAnswer: "Not kept: the server didn't answer. Your words are still in the box, and Keep this tries again.",
} as const;
