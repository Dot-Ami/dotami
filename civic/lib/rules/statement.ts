import type {
  Claim,
  PassageRef,
  PositionStatement,
  StatementParagraph,
  SourceDocument,
} from "../model";
import { STATUS_INFO, shownStatus } from "./status";

/**
 * The check on a coalition's position statement. A paragraph that states something as fact must
 * rest on a passage, or on a claim shown as supported or partly supported. One that rests on an
 * unresolved, contradicted or under-evidenced claim is held back with the reason, however strongly
 * the coalition believes it. Asks and views don't need evidence: they are labelled as what they are.
 */
export interface ParagraphCheck {
  ok: boolean;
  problems: string[];
  cautions: string[];
}

export function checkParagraph(
  paragraph: StatementParagraph,
  claims: Claim[],
  sources: SourceDocument[],
): ParagraphCheck {
  const problems: string[] = [];
  const cautions: string[] = [];
  if (paragraph.kind !== "fact") return { ok: true, problems, cautions };
  if (paragraph.basis.length === 0) problems.push("States a fact with no evidence linked.");

  for (const basis of paragraph.basis) {
    if (basis.passage && !passageExists(basis.passage, sources))
      problems.push("Links to a passage that doesn't exist.");
    if (basis.claimId) {
      const claim = claims.find((c) => c.id === basis.claimId);
      if (!claim) {
        problems.push("Links to a claim that doesn't exist.");
        continue;
      }
      const shown = shownStatus(claim).status;
      if (shown === "partially-supported")
        cautions.push("Rests on a partly supported claim: say only the part that is supported.");
      else if (shown !== "supported") {
        problems.push(
          `Rests on a claim that is "${STATUS_INFO[shown].label}", so it can't be stated as fact. Rephrase it as a question or an ask, or remove it.`,
        );
      }
    }
  }
  return { ok: problems.length === 0, problems, cautions };
}

export function statementReadiness(
  statement: PositionStatement,
  claims: Claim[],
  sources: SourceDocument[],
) {
  const held = statement.paragraphs
    .filter((p) => !checkParagraph(p, claims, sources).ok)
    .map((p) => p.id);
  const reviewsDone = statement.reviews.length;
  return {
    heldBack: held,
    reviewsDone,
    reviewsNeeded: statement.reviewsNeeded,
    ready: held.length === 0 && reviewsDone >= statement.reviewsNeeded,
  };
}

function passageExists(ref: PassageRef, sources: SourceDocument[]): boolean {
  return Boolean(
    sources.find((s) => s.id === ref.sourceId)?.passages.some((p) => p.id === ref.passageId),
  );
}
