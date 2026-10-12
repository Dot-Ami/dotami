import type { UnlockState } from "@/lib/brain/types";

import type { RoadEvaluation, StepEvaluation, StepState, ToldAnswer } from "./evaluate-road";
import { changed, listOf, manyAnswers, manyTakenBack, receiptLine, type AnswerGroup } from "./words";

/**
 * Receipts (docs/architecture/future-cockpit.md § 4 and § 6, "Road evaluation as built"): after an
 * answer, the cockpit runs road evaluation before and after it, and this compares the two results.
 * Each change is one plain line that starts with the answers that differ between the two runs:
 * "Because you told us you have “Welding”, 3 steps now have every skill they list marked have." Built
 * only from the two results (catalog words, the person's values, counts), so the same two runs always
 * give the same lines, and no model ever writes one. No change gives no lines.
 *
 * Meant for one answer at a time, as each screen saves one: every line names every answer that
 * differs, so with two answers changed at once a line can name one that couldn't have caused it.
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

  // Steps whose every listed skill is now marked have, and the other way round. A count of skills
  // only: the step's "done when" lines and money are counted elsewhere.
  const allHave = (s: StepEvaluation) => s.needs.listed > 0 && s.needs.have === s.needs.listed;
  const nowAllHave = both.filter(([b, a]) => !allHave(b) && allHave(a)).length;
  const noLonger = both.filter(([b, a]) => allHave(b) && !allHave(a)).length;
  if (nowAllHave > 0) changes.push(changed.allSkillsHave(nowAllHave));
  if (noLonger > 0) changes.push(changed.notAllSkillsHave(noLonger));

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
 * changed reads as said, one that is gone reads as taken back. Three or more of one kind are counted,
 * those given apart from those taken back ("you marked 9 skills", "you took back 3 skill marks").
 * Null when no answer changed (the month turned over, say).
 */
function answersThatChanged(before: readonly ToldAnswer[], after: readonly ToldAnswer[]): string | null {
  const was = new Map(before.map((a) => [a.id, a]));
  const now = new Map(after.map((a) => [a.id, a]));
  type Way = "said" | "taken-back";
  const differ: { group: AnswerGroup; way: Way; clause: string }[] = [];
  for (const a of after) {
    const b = was.get(a.id);
    if (!b || b.said !== a.said) differ.push({ group: a.group, way: "said", clause: a.said });
  }
  for (const b of before) {
    if (!now.has(b.id)) differ.push({ group: b.group, way: "taken-back", clause: b.takenBack });
  }
  if (differ.length === 0) return null;

  // Grouped by kind and by which way it went, so three marks taken back never read as "you marked".
  const groups = new Map<string, { group: AnswerGroup; way: Way; clauses: string[] }>();
  for (const d of differ) {
    const key = `${d.way}:${d.group}`;
    const entry = groups.get(key) ?? { group: d.group, way: d.way, clauses: [] };
    entry.clauses.push(d.clause);
    groups.set(key, entry);
  }
  const parts = [...groups.values()].flatMap(({ group, way, clauses }) =>
    clauses.length >= 3 ? [way === "said" ? manyAnswers(group, clauses.length) : manyTakenBack(group, clauses.length)] : clauses,
  );
  return listOf(parts);
}
