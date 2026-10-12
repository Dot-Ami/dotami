import type { PlaceCode } from "@/lib/places/codes";

import { DESTINATION_QUESTIONS, type DestinationQuestionId, type LookingFor } from "./questions";
import type { DestinationAnswer, IncomeAnswer } from "./receipts";

/**
 * *Your destination*'s answers so far, in the tab's journey draft (sessionStorage, `dotami-journey-v3`).
 * Questions 1 and 4 are also in the data file as soon as they are kept (a statement, a number the person
 * agreed to); these record what each came to, for the receipts. Questions 2 and 3 wait here until a
 * future is picked, which keeps them on the idea.
 */
export interface DestinationDraft {
  destination?: DestinationAnswer;
  lookingFor?: LookingFor;
  place?: PlaceCode;
  incomeWanted?: IncomeAnswer;
}

const KEY: Record<DestinationQuestionId, keyof DestinationDraft> = {
  destination: "destination",
  "looking-for": "lookingFor",
  place: "place",
  "income-wanted": "incomeWanted",
};

export function isAnswered(draft: DestinationDraft, id: DestinationQuestionId): boolean {
  return draft[KEY[id]] !== undefined;
}

/** The question being asked: the one the person chose to change, else the first not answered; null when all are. */
export function questionAsked(
  draft: DestinationDraft,
  changing: DestinationQuestionId | null,
): DestinationQuestionId | null {
  if (changing) return changing;
  return DESTINATION_QUESTIONS.find((q) => !isAnswered(draft, q.id))?.id ?? null;
}

/** *Pick a future* opens once every question has an answer, "I don't know" and "Skip" included. */
export function readyToPick(draft: DestinationDraft): boolean {
  return DESTINATION_QUESTIONS.every((q) => isAnswered(draft, q.id));
}
