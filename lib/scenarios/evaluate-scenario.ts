import { evaluateProfile } from "@/lib/brain/evaluate";
import type { ConfirmedFigure, EvaluationResult } from "@/lib/brain/types";
import { buildEvaluationProfileFromScenario } from "./evaluation-profile";
import type { Scenario } from "./types";

/**
 * The one way a saved venture's map is coloured: the rules engine run on the venture's own answers
 * AND its own branch picks (GST timing, Incorporation timing).
 *
 * Until 2026-10-11 the cockpit called `evaluateProfile` with no picks, so it fell back to the
 * defaults and a flipped toggle moved the stage chips but not the card colours. Going through here
 * makes forgetting them impossible; tests/scenario-evaluation.spec.ts refuses any other file that
 * runs the evaluator on a scenario's profile directly.
 */
export function evaluateScenario(
  scenario: Scenario,
  options: {
    /** The person's own calendar day (YYYY-MM-DD). */
    today: string;
    /** The venture's CONFIRMED figures only; see `EvaluateOptions.figures`. */
    figures?: readonly ConfirmedFigure[];
  },
): EvaluationResult {
  return evaluateProfile(buildEvaluationProfileFromScenario(scenario), {
    today: options.today,
    activeBranches: scenario.state.activeBranches,
    figures: options.figures,
  });
}
