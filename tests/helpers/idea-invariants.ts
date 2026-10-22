import { cockpitWords } from "@/lib/cockpit/words";
import type { Road } from "@/lib/engines/roads/v2026";
import type { StepEvaluation } from "@/lib/roads";

import { ROAD_IDS } from "../fixtures/ideas/v1";
import type { CockpitRun, IdeaRun } from "./idea-pipeline";
import { uncitedAmounts } from "./number-provenance";
import { withoutQuotedLabels, type TextPiece } from "./text-pieces";
import { findTimeWords } from "./time-words";
import { findVerdicts, VERDICT_WORDS } from "./verdict-words";

/**
 * The invariants every idea must hold, whatever the person typed (S2.5.29b). Each failure names its idea,
 * its invariant and a subject (which question, which line on screen, which tag), and the known-gaps list
 * (tests/fixtures/ideas/known-gaps.ts) points at those three, so fixing one cause of a gap shrinks the list
 * even when another cause on the same idea stays.
 *
 * 1. no-verdict: no verdict words or phrases in anything DotAmi writes (tests/helpers/verdict-words.ts).
 * 2. no-zero-for-a-blank: a cost line with no number never shows "$0".
 * 3. amounts-cited: every amount is an official fee, the person's own, a quoted threshold, or a sum of those
 *    (./number-provenance.ts).
 * 4. no-time-words: no durations, "weeks", "fastest"… in DotAmi's text; Your date and official requirement
 *    text allowed through ./time-words.ts.
 * 5. every path ends somewhere honest (docs/architecture/use-cases.md, "how to test that every path ends
 *    somewhere"): a road is drawn and says why; a next step, an unanswered question or the road done, and
 *    once every question is answered, a next step or the road done; every fork side reaches the end; every
 *    question asked changes something when answered, and goes off *Not told yet* once answered; the road is
 *    written for the idea's place; and the road drawn is the one written for the idea (typed) or the one the
 *    person picked (picked), not a silent fallback.
 * 6. nothing derived: no province, kind of work, equipment purchase or job set without the person's words
 *    naming it or the person picking it; a picked future's unasked answers stay "not said"; ID-like digits
 *    never copied into DotAmi's own text.
 * 7. same-output: the same idea gives the same run, checked by the spec (`runDigest` twice).
 */
export const INVARIANTS = [
  "no-verdict",
  "no-zero-for-a-blank",
  "amounts-cited",
  "no-time-words",
  "ends:road-drawn",
  "ends:next-question-or-done",
  "ends:forks-reach-the-end",
  "ends:questions-change-something",
  "ends:answered-question-goes",
  "ends:road-written-for-place",
  "ends:no-silent-fallback",
  "nothing-derived:province",
  "nothing-derived:kind-of-work",
  "nothing-derived:equipment",
  "nothing-derived:job",
  "nothing-derived:place-kept",
  "nothing-derived:picked-not-said",
  "nothing-derived:id-digits",
  "same-output",
] as const;
export type InvariantId = (typeof INVARIANTS)[number];

export interface Failure {
  ideaId: string;
  invariant: InvariantId;
  /** What failed, stable from run to run: a question's id, a line's place on screen, a tag. "" when the invariant has one subject. */
  subject: string;
  /** What was found, where: enough to find it without running anything. */
  detail: string;
}

/** The key a known gap is listed under. */
export const gapKey = (f: Pick<Failure, "ideaId" | "invariant" | "subject">) => `${f.ideaId} · ${f.invariant} · ${f.subject}`;

/** DotAmi's own words: its sentences and its catalogs' prose. Not the person's, not an official page's. */
const dotamiMade = (piece: TextPiece) => piece.kind === "dotami" || piece.kind === "catalog";

/** A piece's place on screen without the way in ("typed ›", "picked ›"): the same line either way in is one subject. */
const placeOf = (piece: TextPiece) => piece.where.replace(/^(typed|picked) › /, "");

/**
 * The same sentence turns up in run after run (a step's name, a source's title), so each check's answer for
 * a text is kept. The checks are pure functions of the text (and, for times, the date words), so a kept
 * answer is the answer.
 */
function remembered<T>(compute: (key: string) => T): (key: string) => T {
  const cache = new Map<string, T>();
  return (key) => {
    if (!cache.has(key)) cache.set(key, compute(key));
    return cache.get(key)!;
  };
}
const verdictsIn = remembered(findVerdicts);
const strictVerdictIn = remembered((text) => VERDICT_WORDS.exec(withoutQuotedLabels(text))?.[0] ?? null);
const timeWordsIn = remembered((key) => {
  const [text, ...dateWords] = key.split("\u0000");
  return findTimeWords(text, dateWords);
});

/**
 * A piece's time words. Text with a quote mark in it may hold a labelled run of official lines, which pass
 * only at their place and only when the run read them (tests/helpers/official-quotes.ts), so it's checked
 * with the piece's place and the run's lines each time; everything else is kept by its text alone.
 */
function timeWordsOf(piece: TextPiece, c: CockpitRun): string[] {
  if (!piece.text.includes("“")) return timeWordsIn([piece.text, ...c.dateWords].join("\u0000"));
  return findTimeWords(piece.text, c.dateWords, { where: piece.where, read: c.quotedLines });
}

// "$0" or "$0.00" on its own, not the start of "$0.50" or "$05".
const ZERO = /(?:^|[^\d])\$0(?:\.00)?(?![\d.,]*\d)/;
const NOT_PRICED = cockpitWords.plan.costKind["named-not-priced"];
const OFFICIAL_FEE = cockpitWords.plan.costKind["official-fee"];

/** True when every priced line on a step is an official fee and they add up to $0 (the CRA's business number is free). */
function onlyFreeFees(step: StepEvaluation | undefined): boolean {
  const priced = step?.costs.filter((c) => c.kind !== "named-not-priced" && !(c.kind === "official-fee" && c.onlyIf !== undefined)) ?? [];
  return priced.length > 0 && priced.every((c) => c.kind === "official-fee" && c.amountCents === 0);
}

/**
 * Where "$0" is allowed: the amount of an official fee that is $0, a sum of official fees only, or a step's
 * money badge when its only priced lines are such fees. Never next to a blank, never as "your numbers".
 */
function zeroAllowed(piece: TextPiece, c: CockpitRun): boolean {
  if (piece.where.endsWith(`› amount (${OFFICIAL_FEE})`)) return true;
  if (/^\$0 official fees \(\d+ lines?\)$|official fees now add up to \$0 across \d+ lines?/.test(piece.text)) return true;
  if (/› fees › \d$/.test(piece.where)) return true;
  const badge = /› (fresh|final) › step (\S+) › badge$/.exec(piece.where);
  if (badge && /^\$0(?: ·|$)/.test(piece.text)) {
    const evaluation = badge[1] === "fresh" ? c.fresh.evaluation : c.final.evaluation;
    return onlyFreeFees(evaluation.steps.find((s) => s.stepId === badge[2]));
  }
  return false;
}

/** True when walking a road's `next` arrows from `stepId` reaches a step with nothing after it, or the road's join. */
export function reachesTheEnd(road: Road, stepId: string): boolean {
  const byId = new Map(road.steps.map((s) => [s.id, s]));
  const lastColumn = new Set(road.columns.at(-1)?.steps ?? []);
  const seen = new Set<string>();
  const queue = [stepId];
  while (queue.length > 0) {
    const id = queue.shift()!;
    if (seen.has(id)) continue;
    seen.add(id);
    const step = byId.get(id);
    if (!step) continue;
    if (step.next.length === 0) return true;
    // A road that carries on into another (`joins`) ends where it joins: its last column.
    if (road.joins && lastColumn.has(id)) return true;
    queue.push(...step.next);
  }
  return false;
}

export type Fail = (invariant: InvariantId, subject: string, detail: string) => void;

/**
 * The failures of one cockpit run (invariants 1 to 6 on a way in). `checkRun` calls it for the typed and
 * picked ways of an idea; the property tests (tests/helpers/idea-properties.ts) call it on a cockpit run
 * built from a generated answer set, so the generated space is held to the same checks as the corpus.
 */
export function cockpitFailures(run: IdeaRun, c: CockpitRun, fail: Fail) {
  const ours = run.pieces.filter((p) => p.where.startsWith(`${c.way} ›`) && dotamiMade(p));

  // 1. No verdict: the phrases over everything DotAmi writes, the strict words over its own sentences.
  for (const piece of ours) {
    for (const found of verdictsIn(piece.text)) fail("no-verdict", placeOf(piece), `${piece.where}: ${found}`);
    if (piece.kind === "dotami") {
      const strict = strictVerdictIn(piece.text);
      if (strict) fail("no-verdict", placeOf(piece), `${piece.where}: “${strict}” in “${piece.text}”`);
    }
  }

  // 2. No $0 for a blank: the plan's blank lines have no amount, and "$0" shows only for official fees.
  for (const group of c.final.plan.money.byStep) {
    for (const line of group.lines) {
      if (line.kind === NOT_PRICED && line.amount !== null) {
        fail("no-zero-for-a-blank", `plan › money › ${line.lineId}`, `${c.way} › plan › ${group.step} › ${line.lineId}: a line not priced shows ${line.amount}`);
      }
    }
  }
  for (const piece of ours) {
    if (ZERO.test(piece.text) && !zeroAllowed(piece, c)) fail("no-zero-for-a-blank", placeOf(piece), `${piece.where}: “${piece.text}”`);
  }

  // 3. Every amount cited or the person's own.
  for (const piece of ours) {
    for (const found of uncitedAmounts([piece], c.ledger)) fail("amounts-cited", placeOf(piece), found);
  }

  // 4. No time words, Your date and official requirement text allowed.
  for (const piece of ours) {
    for (const found of timeWordsOf(piece, c)) fail("no-time-words", placeOf(piece), `${piece.where}: ${found}`);
  }

  // 5. Every path ends somewhere honest. The checks on the run as a whole name their way in as the subject:
  // the typed and picked ways reach the road through different code, so a failure on one is never the
  // same failure as a known gap on the other.
  const plan = c.final.plan;
  if (c.final.evaluation.steps.length === 0 || !plan.road.future || !plan.road.picked) {
    fail("ends:road-drawn", c.way, `${c.way}: no road drawn, or no line saying why (“${plan.road.picked}”)`);
  }
  // As it opens and after the fixed answers, *Not told yet* always asks something (the fixed answers never
  // answer structure, equipment or "I'd incorporate at"), so the last state, with every question answered,
  // is the one where a missing next step shows. A question still asked there was already answered (the
  // check below), so it can't be the honest end: there, only a next step or the road done is.
  const states = [["as it opens", c.fresh], ["after the answers", c.final], ...(c.answered ? [["after every question", c.answered] as const] : [])] as const;
  for (const [when, state] of states) {
    const done = state.evaluation.steps.every((s) => s.state === "not-on-your-path" || s.status === "done");
    const asked = when === "after every question" ? 0 : state.notTold.length;
    if (state.next.length === 0 && asked === 0 && !done) {
      fail("ends:next-question-or-done", `${c.way} › ${when}`, `${c.way} ${when}: no next step, no question asked, and the road isn't done`);
    }
  }
  // An answered question goes off *Not told yet*: one still asked after it was answered never ends.
  for (const row of c.answered?.notTold ?? []) {
    fail("ends:answered-question-goes", `${c.way} › ${row.id}`, `${c.way}: “Not told yet” still asks “${row.id}” after the person answered it (“${row.question}”)`);
  }
  for (const fork of c.road.forks) {
    for (const side of fork.sides) {
      if (!reachesTheEnd(c.road, side)) {
        fail("ends:forks-reach-the-end", `${fork.id} › ${side}`, `${c.road.id} › ${fork.id}: the side “${side}” never reaches the end of the road or its join`);
      }
    }
  }
  // By way in: the typed way carries the intake's answers (the Year 3 box) and the picked way doesn't, so the
  // same question can end on one way and not the other, and a known gap on one must not hide the other.
  for (const q of c.questions) {
    if (q.changes === 0) {
      fail("ends:questions-change-something", `${c.way} › ${q.id}`, `${c.way}: “Not told yet” asks “${q.id}”, and no answer to it changes anything on ${c.road.id}`);
    }
  }
  const province = c.final.input.scenario.profile.province;
  const places: readonly string[] = c.road.provinces;
  const writtenHere = places.includes(province) || places.includes("CA");
  if (!writtenHere) fail("ends:road-written-for-place", c.way, `${c.way}: drawn on ${c.road.id}, written for ${places.join(", ")}; the idea is in ${province}`);
  const expected = run.idea.road === "none-written-yet" ? null : ROAD_IDS[run.idea.road];
  // Typed: the road written for the idea, wherever it is written for. Picked: the road the person picked
  // on Pick a future (a card, or the general road "Not here yet?" opens), kept as their pick, whether or
  // not it is the one written for the idea: the person chose it. Drawn as "No future picked", even on the
  // right road, it fell back to the general road without saying so.
  const silent = c.pick ? c.pick.roadId !== c.road.id || !c.roadChosen : writtenHere && expected !== c.road.id;
  if (silent) {
    const meant = c.pick ? `the road the person picked is ${c.pick.roadId}` : `the road written for this idea is ${expected ?? "none yet"}`;
    fail(
      "ends:no-silent-fallback",
      c.way,
      `${c.way}: drawn on ${c.road.id}${c.roadChosen ? "" : " as no future picked"} (“${plan.road.picked}”), but ${meant}, and nothing says so`,
    );
  }

  // 6. Nothing derived downstream: no job picked for the person, the place they picked kept as picked.
  if (c.fresh.input.job || c.final.input.job || plan.skills.job) fail("nothing-derived:job", c.way, `${c.way}: a job is set though the person picked none`);
  if (c.way === "typed" && province !== run.province) fail("nothing-derived:place-kept", "", `typed: the person picked ${run.province}, the cockpit reads ${province}`);
  if (c.way === "picked") {
    const p = c.fresh.input.scenario.profile;
    const unasked = [
      p.employmentStatus !== "not-said" && `work situation “${p.employmentStatus}”`,
      (p.activityTags ?? []).length > 0 && `kinds of work ${p.activityTags!.join(", ")}`,
      p.capitalPurchasePlanned !== undefined && `equipment “${p.capitalPurchasePlanned}”`,
      (p.targetRevenueY1 !== 0 || p.targetRevenueY3 !== 0) && "a sales target",
    ].filter(Boolean);
    if (unasked.length > 0) fail("nothing-derived:picked-not-said", "", `picked: answers this way in never asks are set: ${unasked.join("; ")}`);
  }
}

/** Every failure of one idea's run, invariants 1 to 6. Invariant 7 needs two runs: see `sameOutput`. */
export function checkRun(run: IdeaRun): Failure[] {
  const failures: Failure[] = [];
  const seen = new Set<string>();
  const fail: Fail = (invariant, subject, detail) => {
    // One failure per idea, invariant and subject: the same line in the typed and picked runs is one. The
    // checks on a run as a whole carry their way in as the subject, so they are never merged this way.
    const failure = { ideaId: run.idea.id, invariant, subject, detail };
    if (seen.has(gapKey(failure))) return;
    seen.add(gapKey(failure));
    failures.push(failure);
  };
  const idea = run.idea;

  // 6. Nothing derived at the parse: only what the words name.
  if (run.parse) {
    if (run.parse.province !== null && !idea.named.includes(run.parse.province)) {
      fail(
        "nothing-derived:province",
        run.parse.province,
        `the parser proposed ${run.parse.province}; the words name ${idea.named.length > 0 ? idea.named.join(", ") : "no province"}`,
      );
    }
    for (const tag of run.parse.activityTags.filter((t) => !(idea.tags as readonly string[]).includes(t))) {
      fail("nothing-derived:kind-of-work", tag, `the parser proposed “${tag}”, which the words don't name`);
    }
    if (run.parse.capitalPurchasePlanned && !idea.buys) {
      fail("nothing-derived:equipment", "", "the parser proposed “Equipment / vehicle purchase on the path”; the words don't say the person is buying any");
    }
  }
  // ID-like digits typed by the person stay in the person's words only, however they are spaced: the same
  // digits in order, with or without spaces, dashes, dots or slashes between them ("000 000 000",
  // "000000000", "000-000-000"). A comma isn't one of them, so "$1,000,000" is an amount, not a copy.
  for (const typed of idea.words.match(/\d[\d -]{7,}\d/g) ?? []) {
    const digits = typed.replace(/\D/g, "");
    const copied = new RegExp(`(?<!\\d)${digits.split("").join("[\\s./–-]*")}(?!\\d)`);
    for (const piece of run.pieces.filter(dotamiMade)) {
      if (copied.test(piece.text)) fail("nothing-derived:id-digits", placeOf(piece), `${piece.where}: the person's digits “${typed}” are copied into DotAmi's text`);
    }
  }

  for (const c of [run.typed, run.picked]) if (c) cockpitFailures(run, c, fail);
  return failures;
}

/** Invariant 7: two runs of the same idea must give the same digest. */
export function sameOutput(ideaId: string, first: string, second: string): Failure[] {
  if (first === second) return [];
  let at = 0;
  while (at < first.length && first[at] === second[at]) at += 1;
  return [
    {
      ideaId,
      invariant: "same-output",
      subject: "",
      detail: `two runs differ at character ${at}: “${first.slice(Math.max(0, at - 40), at + 40)}” vs “${second.slice(Math.max(0, at - 40), at + 40)}”`,
    },
  ];
}
