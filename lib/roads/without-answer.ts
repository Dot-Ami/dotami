import { branchDecisions, clearScenarioBranch, recomputeScenarioState, setIncorporateAt, type BranchDecisionId } from "@/lib/scenarios/branches";
import { isBranchDecided } from "@/lib/scenarios/graph";
import { withNotSaidAgain, withSalesTarget } from "@/lib/scenarios/not-said";
import type { Scenario } from "@/lib/scenarios/types";

import type { RoadEvaluationInput } from "./evaluate-road";

/**
 * One answer taken away (docs/architecture/future-cockpit.md § 2, "Cockpit screen as built, part 2").
 * "What you've told DotAmi" shows, for each answer, what it unlocked: road evaluation run without the
 * answer, against the run with it, through the same receipt a save shows (./receipts.ts). Taking an
 * answer back on screen makes exactly the same change, so the receipt of a take back is the row's own
 * "what it unlocked", read the other way. Pure: no I/O, and the input is never changed.
 *
 * Answer ids are road evaluation's own (`ToldAnswer.id` in ./evaluate-road.ts). An answer that isn't
 * there, or one the map can't be drawn without, gives null: never a guess at what "without" would be.
 */

/** The map can't be drawn without these, so they can be changed but never taken away. */
export const REQUIRED_ANSWER_IDS: readonly string[] = ["idea:place", "idea:venture-type", "idea:work-situation"];

const MAP_FORKS = new Set<string>(branchDecisions.map((d) => d.id));

/**
 * The idea's own answers (kept with the map: the intake's answers, the structure, the map's picks and the
 * person's own "I'd incorporate at" number), each taken back to its not-given state: the structure the map
 * assumes, kinds of work none, hire-first off, equipment unanswered, a sales number none, a map pick back
 * to its default. Null when the answer isn't one of these, isn't given, or can't be taken away.
 */
export function withoutIdeaAnswer(scenario: Scenario, answerId: string): Scenario | null {
  const profile = scenario.profile;
  const withProfile = (change: Partial<Scenario["profile"]>): Scenario => ({ ...scenario, profile: { ...profile, ...change } });

  switch (answerId) {
    case "idea:structure":
      // "assumed" is the map's own first rung; anything else (including an older row with no source) was set.
      return profile.structureSource === "assumed" ? null : withProfile({ structure: "sole-prop", structureSource: "assumed" });
    case "idea:kinds-of-work":
      return (profile.activityTags ?? []).length === 0 ? null : withProfile({ activityTags: [] });
    case "idea:hire-first": {
      if (!profile.hireFirst) return null;
      // The map's own lists follow the switch, as the intake's save leaves them; the picks and the
      // person's own number are kept as they were.
      const state = recomputeScenarioState(scenario.state.activeBranches, false);
      return {
        ...scenario,
        profile: { ...profile, hireFirst: false },
        state: { ...state, decidedBranchIds: scenario.state.decidedBranchIds, incorporateAt: scenario.state.incorporateAt },
      };
    }
    case "idea:equipment": {
      if (profile.capitalPurchasePlanned === undefined) return null;
      // Unanswered is the field left out, which the rules read as no and say so. On a picked future it
      // goes back on the not-said list too, so the idea reads as it did before the answer.
      const { capitalPurchasePlanned: _answered, ...rest } = profile;
      void _answered;
      return { ...scenario, profile: withNotSaidAgain(rest as Scenario["profile"], "equipment") };
    }
    // A sales number goes to 0, none; on a picked future that year goes back on the not-said list too, so
    // the rail and the plan say "Not said" again, as when it was picked (2026-10-21).
    case "idea:sales-year-1":
      return profile.targetRevenueY1 > 0 ? { ...scenario, profile: withSalesTarget(profile, 1, 0) } : null;
    case "idea:sales-year-3":
      return profile.targetRevenueY3 > 0 ? { ...scenario, profile: withSalesTarget(profile, 3, 0) } : null;
    case "idea:incorporate-at":
      return (scenario.state.incorporateAt ?? null) === null ? null : setIncorporateAt(scenario, null);
  }
  if (answerId.startsWith("map-pick:")) {
    const forkId = answerId.slice("map-pick:".length);
    if (!MAP_FORKS.has(forkId)) return null;
    const decision = forkId as BranchDecisionId;
    // A pick still on the map's default isn't the person's, so there is nothing of theirs to take back.
    return isBranchDecided(decision, scenario.state) ? clearScenarioBranch(scenario, decision) : null;
  }
  return null;
}

/**
 * Road evaluation's input with one answer taken away, and nothing else changed. Null for an answer the
 * input doesn't hold, and for the place, the kind of venture and the work situation (REQUIRED_ANSWER_IDS).
 */
export function withoutAnswer(input: RoadEvaluationInput, answerId: string): RoadEvaluationInput | null {
  if (REQUIRED_ANSWER_IDS.includes(answerId)) return null;

  if (answerId === "idea:figures") {
    return (input.confirmedFigures ?? []).length > 0 ? { ...input, confirmedFigures: [] } : null;
  }
  if (answerId === "what-if") return input.whatIf ? { ...input, whatIf: null } : null;
  if (answerId.startsWith("idea:") || answerId.startsWith("map-pick:")) {
    const scenario = withoutIdeaAnswer(input.scenario, answerId);
    return scenario === null ? null : { ...input, scenario };
  }

  const [kind, ...rest] = answerId.split(":");
  const key = rest.join(":");
  switch (kind) {
    case "skill": {
      if (!input.skillMarks.some((m) => m.skillItemId === key)) return null;
      return { ...input, skillMarks: input.skillMarks.filter((m) => m.skillItemId !== key) };
    }
    case "own-skill": {
      // One skill whatever its capital letters, as the storage and road evaluation keep it.
      const same = (m: (typeof input.skillMarks)[number]) => m.skillItemId === null && m.ownLabel?.toLocaleLowerCase() === key;
      if (!input.skillMarks.some(same)) return null;
      return { ...input, skillMarks: input.skillMarks.filter((m) => !same(m)) };
    }
    case "step": {
      if (!input.progress.some((p) => p.stepId === key && p.status !== null)) return null;
      return { ...input, progress: input.progress.map((p) => (p.stepId === key ? { ...p, status: null } : p)) };
    }
    case "ticks": {
      if (!input.progress.some((p) => p.stepId === key && p.doneWhenIds.length > 0)) return null;
      return { ...input, progress: input.progress.map((p) => (p.stepId === key ? { ...p, doneWhenIds: [] } : p)) };
    }
    case "fork": {
      if (!(key in input.forkPicks)) return null;
      const { [key]: _taken, ...picks } = input.forkPicks;
      void _taken;
      return { ...input, forkPicks: picks };
    }
    case "cost-line": {
      const [stepId, lineId] = key.split("/");
      const same = (q: (typeof input.agreed.costLines)[number]) => q.stepId === stepId && q.lineId === lineId;
      if (!input.agreed.costLines.some(same)) return null;
      return { ...input, agreed: { ...input.agreed, costLines: input.agreed.costLines.filter((q) => !same(q)) } };
    }
    case "savings":
      return input.agreed.savingsCents === null ? null : { ...input, agreed: { ...input.agreed, savingsCents: null } };
    case "income-wanted":
      return input.agreed.incomeWantedCents === null ? null : { ...input, agreed: { ...input.agreed, incomeWantedCents: null } };
    case "date":
      return input.targetMonth === null ? null : { ...input, targetMonth: null };
  }
  return null;
}
