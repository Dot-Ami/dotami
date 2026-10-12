import type { UnlockState } from "@/lib/brain/types";

import type { RoadEvaluation, StepEvaluation, StepState, ToldAnswer } from "./evaluate-road";
import { changed, listOf, manyAnswers, receiptLine, type AnswerGroup } from "./words";

/**
 * Receipts (docs/architecture/future-cockpit.md § 4 and § 6, "Road evaluation as built"): after an
 * answer, the cockpit runs road evaluation before and after it, and this compares the two results.
 * Each change is one plain line that starts with the answers that differ between the two runs:
 * "Because you told us you have “Welding”, 3 steps now need nothing more from you." Built only from the
 * two results (catalog words, the person's values, counts), so the same two runs always give the same
 * lines, and no model ever writes one. No change gives no lines.
 */
export function roadReceipt(before: RoadEvaluation, after: RoadEvaluation): string[] {
  const because = answersThatChanged(before.answers, after.answers);
  const changes: string[] = [];

  // Steps that changed state, counted by the state they are in now.
  const was = new Map(before.steps.map((s) => [s.stepId, s]));
  const both = after.steps.flatMap((now) => (was.has(now.stepId) ? [[was.get(now.stepId)!, now] as const] : []));
  for (const state of ["applies", "check-first", "not-on-your-path"] as const satisfies readonly StepState[]) {
    const n = both.filter(([b, a]) => b.state !== a.state && a.state === state).length;
    if (n > 0) changes.push(changed.stepsNow(n, state));
  }

  // Steps whose every listed need the person now has, and the other way round.
  const complete = (s: StepEvaluation) => s.needs.listed > 0 && s.needs.have === s.needs.listed;
  const nowComplete = both.filter(([b, a]) => !complete(b) && complete(a)).length;
  const noLonger = both.filter(([b, a]) => complete(b) && !complete(a)).length;
  if (nowComplete > 0) changes.push(changed.needNothingMore(nowComplete));
  if (noLonger > 0) changes.push(changed.needSomethingAgain(noLonger));

  const g0 = before.gauges;
  const g1 = after.gauges;
  if (g0.steps.done !== g1.steps.done || g0.steps.total !== g1.steps.total) {
    changes.push(changed.stepsDone(g1.steps.done, g1.steps.total));
  }

  const s0 = g0.skills;
  const s1 = g1.skills;
  if (s0.have !== s1.have || s0.learning !== s1.learning || s0.notYet !== s1.notYet || s0.notMarked !== s1.notMarked) {
    changes.push(changed.skills(s1.have, s1.learning, s1.notYet, s1.notMarked));
  }
  const o0 = s0.addedByYou;
  const o1 = s1.addedByYou;
  if (o0.have !== o1.have || o0.learning !== o1.learning || o0.notYet !== o1.notYet) {
    changes.push(changed.ownSkills(o1.have, o1.learning, o1.notYet));
  }

  const m0 = g0.money;
  const m1 = g1.money;
  if (m0.officialFeesCents !== m1.officialFeesCents || m0.officialFeeLines !== m1.officialFeeLines) {
    changes.push(changed.officialFees(m1.officialFeesCents, m1.officialFeeLines));
  }
  if (m0.yourNumbersCents !== m1.yourNumbersCents || m0.yourNumberLines !== m1.yourNumberLines) {
    changes.push(changed.yourNumbers(m1.yourNumbersCents, m1.yourNumberLines));
  }
  if (m0.notPricedLines !== m1.notPricedLines) changes.push(changed.notPriced(m1.notPricedLines));
  const waitingBefore = new Map(m0.waitingOnForks.map((w) => [w.forkId, w]));
  const waitingAfter = new Map(m1.waitingOnForks.map((w) => [w.forkId, w]));
  for (const forkId of new Set([...waitingBefore.keys(), ...waitingAfter.keys()])) {
    const b = waitingBefore.get(forkId);
    const a = waitingAfter.get(forkId);
    if ((b?.lines ?? 0) !== (a?.lines ?? 0)) changes.push(changed.waitingOnFork(a?.lines ?? 0, (a ?? b)!.label));
  }
  if (m0.leftOutLines !== m1.leftOutLines) changes.push(changed.leftOut(m1.leftOutLines));
  if (m0.savingsCents !== m1.savingsCents) changes.push(changed.savings(m1.savingsCents));
  if (m0.differenceCents !== m1.differenceCents) changes.push(changed.difference(m1.differenceCents));

  if (g0.date?.targetMonth !== g1.date?.targetMonth || g0.date?.monthsFromToday !== g1.date?.monthsFromToday) {
    changes.push(changed.date(g1.date?.targetMonth ?? null, g1.date?.monthsFromToday ?? null));
  }
  if (before.yourTarget?.incomeWantedCents !== after.yourTarget?.incomeWantedCents) {
    changes.push(changed.target(after.yourTarget?.incomeWantedCents ?? null));
  }

  // Today's rules and tax cards whose colour changed, counted by the colour they are now.
  const cardsBefore = new Map(before.rules.unlocks.map((u) => [u.id, u.state]));
  const cardsAfter = new Map(after.rules.unlocks.map((u) => [u.id, u.state]));
  for (const state of ["green", "yellow", "gray"] as const satisfies readonly UnlockState[]) {
    const n = [...cardsAfter].filter(([id, s]) => s === state && cardsBefore.get(id) !== state).length;
    if (n > 0) changes.push(changed.cardsNow(n, state));
  }
  const gone = [...cardsBefore.keys()].filter((id) => !cardsAfter.has(id)).length;
  if (gone > 0) changes.push(changed.cardsGone(gone));

  return changes.map((change) => receiptLine(because, change));
}

/**
 * The answers that differ between two runs, as the "Because …" part of a line: an answer given or
 * changed reads as said, one that is gone reads as taken back. Three or more of one kind are counted
 * ("you marked 9 skills"). Null when no answer changed (the month turned over, say).
 */
function answersThatChanged(before: readonly ToldAnswer[], after: readonly ToldAnswer[]): string | null {
  const was = new Map(before.map((a) => [a.id, a]));
  const now = new Map(after.map((a) => [a.id, a]));
  const differ: { group: AnswerGroup; clause: string }[] = [];
  for (const a of after) {
    const b = was.get(a.id);
    if (!b || b.said !== a.said) differ.push({ group: a.group, clause: a.said });
  }
  for (const b of before) {
    if (!now.has(b.id)) differ.push({ group: b.group, clause: b.takenBack });
  }
  if (differ.length === 0) return null;

  const groups = new Map<AnswerGroup, string[]>();
  for (const d of differ) groups.set(d.group, [...(groups.get(d.group) ?? []), d.clause]);
  const parts = [...groups].flatMap(([group, clauses]) => (clauses.length >= 3 ? [manyAnswers(group, clauses.length)] : clauses));
  return listOf(parts);
}
