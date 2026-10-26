import { createHash } from "node:crypto";

import type { SourceDocument } from "../model";

/**
 * The text an archived copy's hash is taken over: each passage's id and words, in order. The
 * source page recomputes it on every view and says whether it still matches the hash recorded
 * when the copy was archived, so a quotation edited after archiving shows up as a mismatch.
 */
export function canonicalText(source: SourceDocument): string {
  return source.passages.map((p) => `${p.id}\n${p.text}`).join("\n\n");
}

export function sha256Hex(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

export function archiveMatches(source: SourceDocument): boolean {
  return sha256Hex(canonicalText(source)) === source.archive.sha256;
}
