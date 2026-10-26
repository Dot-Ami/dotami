import type { PassageRef, SourceDocument } from "../model";

/**
 * Repetition is not corroboration. A passage that restates another (`repeats`) is followed back to
 * the passage it restates, and what counts is the number of different publishers at the roots.
 * Four posts making one claim, three of them copies of the first, are one origin.
 */
export function rootPassage(ref: PassageRef, sources: SourceDocument[]): PassageRef {
  let current = ref;
  const seen = new Set<string>();
  for (;;) {
    const key = `${current.sourceId}#${current.passageId}`;
    if (seen.has(key)) return current; // a loop in the data: stop rather than spin
    seen.add(key);
    const passage = sources
      .find((s) => s.id === current.sourceId)
      ?.passages.find((p) => p.id === current.passageId);
    if (!passage?.repeats) return current;
    current = passage.repeats;
  }
}

export interface Independence {
  passages: number;
  /** How many of the passages restate another passage. */
  repeats: number;
  /** The distinct publishers behind the root passages: the independent origins. */
  origins: { publisherId: string; sourceIds: string[] }[];
}

export function independence(refs: PassageRef[], sources: SourceDocument[]): Independence {
  const byPublisher = new Map<string, Set<string>>();
  let repeats = 0;
  for (const ref of refs) {
    const root = rootPassage(ref, sources);
    if (root.sourceId !== ref.sourceId || root.passageId !== ref.passageId) repeats += 1;
    const publisherId = sources.find((s) => s.id === root.sourceId)?.publisherId ?? "unknown";
    if (!byPublisher.has(publisherId)) byPublisher.set(publisherId, new Set());
    byPublisher.get(publisherId)!.add(root.sourceId);
  }
  return {
    passages: refs.length,
    repeats,
    origins: [...byPublisher].map(([publisherId, ids]) => ({ publisherId, sourceIds: [...ids] })),
  };
}
