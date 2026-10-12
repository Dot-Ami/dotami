/**
 * Road evaluation: a road plus everything the person told DotAmi, turned into step states, the four
 * gauges and receipts (docs/architecture/future-cockpit.md § 6, "Road evaluation as built"). Pure.
 */
export { agreedPlanning, NO_AGREED_PLANNING, type AgreedPlanning } from "./agreed";
export {
  evaluateRoad,
  type MarkCounts,
  type RoadEvaluation,
  type RoadEvaluationInput,
  type RoadGauges,
  type StepEvaluation,
  type StepReason,
  type StepState,
  type ToldAnswer,
} from "./evaluate-road";
export { columnNumbers, firstSteps, futureEdges, futureSet, reachableAvoiding, type FutureEdge } from "./paths";
export { roadReceipt } from "./receipts";
export { REQUIRED_ANSWER_IDS, withoutAnswer, withoutIdeaAnswer } from "./without-answer";
