import type { DecisionStage, LegalForce, Provision, SourceDocument } from "../model";

/**
 * How a decision's stage is named. Only enacted and in-force decisions bind anyone; every other
 * stage says plainly that it doesn't, so a proposal is never read as law.
 */
export const STAGE_INFO: Record<
  DecisionStage,
  { label: string; inForce: boolean; meaning: string }
> = {
  "application-filed": {
    label: "Application filed: not decided",
    inForce: false,
    meaning: "Nothing has been decided.",
  },
  proposed: {
    label: "Proposed: not in force",
    inForce: false,
    meaning: "It has no legal effect unless it is passed.",
  },
  "consultation-open": {
    label: "Open for public input: not decided",
    inForce: false,
    meaning: "The decision-maker is taking input. Nothing has been decided.",
  },
  "consultation-closed": {
    label: "Input closed: not decided",
    inForce: false,
    meaning: "Input has closed. Nothing has been decided.",
  },
  "decided-approved": {
    label: "Approved",
    inForce: true,
    meaning: "Decided. Check any conditions and appeal window.",
  },
  "decided-refused": {
    label: "Refused",
    inForce: true,
    meaning: "Decided. Check any appeal window.",
  },
  enacted: { label: "Enacted", inForce: true, meaning: "Passed. Check when it comes into force." },
  "in-force": { label: "In force", inForce: true, meaning: "It binds now." },
  "under-appeal": {
    label: "Under appeal",
    inForce: false,
    meaning: "Decided, but the decision is being appealed.",
  },
  withdrawn: { label: "Withdrawn", inForce: false, meaning: "No longer being pursued." },
};

export const FORCE_INFO: Record<LegalForce, { label: string; meaning: string }> = {
  binding: { label: "Binding law, in force", meaning: "It applies now." },
  "binding-if-enacted": {
    label: "Would bind if passed: not in force",
    meaning: "Proposed text. It applies to nobody yet.",
  },
  guidance: {
    label: "Guidance: not a legal limit",
    meaning: "Not binding unless written into a binding decision.",
  },
  procedure: { label: "Procedure", meaning: "How a process runs." },
};

/**
 * The force a provision may be shown with. Text from a proposed law can never be shown as
 * binding, and a guideline can never be shown as more than guidance, whatever the data says.
 */
export function shownForce(provision: Provision, source: SourceDocument): LegalForce {
  if (source.kind === "proposed-law" && provision.force === "binding") return "binding-if-enacted";
  if (
    source.kind === "guideline" &&
    (provision.force === "binding" || provision.force === "binding-if-enacted")
  )
    return "guidance";
  return provision.force;
}
