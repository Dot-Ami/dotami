import type { ActionRoute } from "../model";
import { checkText } from "./moderation";

/**
 * The gate in front of every external action.
 *
 * The prototype has no way to send anything: no endpoint accepts a submission, no code posts to
 * another site, and the browser policy (middleware.ts) blocks connections and form posts to any
 * other address. What the gate decides is whether a draft may be handed back to the person as
 * final text for them to send themselves. It allows that only after the person has confirmed,
 * for this route and this exact text, who it goes to and that they read it. Change one character
 * after approving, and the approval no longer counts.
 */
export interface Approval {
  routeId: string;
  /** The person confirmed the destination shown to them. */
  confirmedDestination: boolean;
  /** The person confirmed they read the whole text and it says what they mean. */
  confirmedText: boolean;
  /** Fingerprint of the text at the moment of approval (textFingerprint). */
  fingerprint: string;
}

export interface Handoff {
  /** The only kind there is: the person copies the text and sends it themselves. */
  kind: "copy-and-send-yourself";
  destinationLabel: string;
  text: string;
  sent: false;
}

export type GateResult =
  { allowed: true; handoff: Handoff } | { allowed: false; reasons: string[] };

/**
 * FNV-1a over the text. Detects any edit made after approval; it is not a security measure and
 * doesn't need to be (the person approving and the person editing are the same person).
 */
export function textFingerprint(text: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

/** Square-bracketed parts of a template the person hasn't filled in yet. */
export function unfilledPlaceholders(text: string): string[] {
  return [...text.matchAll(/\[[^\]]+\]/g)].map((m) => m[0]);
}

export function prepareHandoff(
  route: ActionRoute,
  text: string,
  approval: Approval | null,
): GateResult {
  const reasons: string[] = [];
  if (text.trim() === "") reasons.push("The draft is empty.");
  const placeholders = unfilledPlaceholders(text);
  if (placeholders.length)
    reasons.push(`Fill in or remove the parts in square brackets (${placeholders.length} left).`);
  for (const finding of checkText(text)) reasons.push(finding.message);

  if (!approval) reasons.push("You haven't approved this text yet.");
  else {
    if (approval.routeId !== route.id) reasons.push("That approval was for a different action.");
    if (!approval.confirmedDestination) reasons.push("Confirm who it goes to.");
    if (!approval.confirmedText) reasons.push("Confirm you have read the whole text.");
    if (approval.fingerprint !== textFingerprint(text))
      reasons.push("The text changed after you approved it. Approve it again.");
  }

  if (reasons.length) return { allowed: false, reasons: [...new Set(reasons)] };
  return {
    allowed: true,
    handoff: {
      kind: "copy-and-send-yourself",
      destinationLabel: route.destinationLabel,
      text,
      sent: false,
    },
  };
}
