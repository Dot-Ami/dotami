import type { PlaceCode } from "@/lib/places/codes";

import { DESTINATION_QUESTIONS, type DestinationQuestionId, type LookingFor } from "./questions";
import type { DestinationAnswer, IncomeAnswer } from "./receipts";

/**
 * *Your destination*'s answers so far, in the journey draft the page holds in memory: never in window storage
 * (2026-10-23; lib/journey/window-storage.ts says why).
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

/**
 * What the data file already holds for questions 1 and 4: the person's newest destination and the
 * yearly income they agreed to, each with its day (read on the server by lib/front-door/kept.ts).
 */
export interface KeptOnRecord {
  destination: { text: string; saidAt: string } | null;
  incomeWanted: { amountCents: number; agreedOn: string } | null;
}

/**
 * The draft with what is already kept counted as answered (review of 2026-10-12): a returning person, in a
 * new tab, after a restart or after the front door's Map it started the tab's journey afresh, isn't asked
 * questions 1 and 4 again. An answer given on this page wins, since it is the newer one; 2 and 3 are held
 * in the page's memory only until a future is picked (which keeps them with it), so they are asked again.
 */
export function withKept(draft: DestinationDraft, kept: KeptOnRecord): DestinationDraft {
  const out: DestinationDraft = { ...draft };
  if (out.destination === undefined && kept.destination) {
    out.destination = { kept: "saved", text: kept.destination.text, saidAt: kept.destination.saidAt };
  }
  if (out.incomeWanted === undefined && kept.incomeWanted) {
    out.incomeWanted = { kind: "agreed", amountCents: kept.incomeWanted.amountCents, agreedOn: kept.incomeWanted.agreedOn };
  }
  return out;
}
