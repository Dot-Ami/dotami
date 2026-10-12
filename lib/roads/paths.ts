import type { Road, RoadStep } from "@/lib/engines/roads/v2026";

/**
 * Walking a road's `next` arrows: which steps lie ahead of a step, each step's column, and which steps
 * can still be reached when some steps are left out. Pure, and nothing here knows how a screen draws
 * a road. The map's hover arrows (components/cockpit/map-arrows.tsx) and road evaluation
 * (./evaluate-road.ts) both walk the road through these, so the two can never disagree about what
 * comes after what. (Until 2026-10-12 the first three lived in the map's own file.)
 */

export interface FutureEdge {
  from: string;
  to: string;
  /** 1 = the next step from the focused card; 2+ = further into the future. */
  depth: number;
}

/**
 * Hovering a stage card shows arrows along the paths that lead from it (decided 2026-09-16): how
 * completing this step opens the next ones, all the way down the road. Breadth-first over `next` from
 * one step. A road's checks don't forbid loops, so they are guarded.
 */
export function futureEdges(stepsById: ReadonlyMap<string, Pick<RoadStep, "next">>, startId: string): FutureEdge[] {
  const edges: FutureEdge[] = [];
  const seen = new Set<string>([startId]);
  let frontier: string[] = [startId];
  let depth = 1;
  while (frontier.length > 0) {
    const next: string[] = [];
    for (const id of frontier) {
      const step = stepsById.get(id);
      for (const target of step?.next ?? []) {
        if (!stepsById.has(target)) continue;
        edges.push({ from: id, to: target, depth });
        if (!seen.has(target)) {
          seen.add(target);
          next.push(target);
        }
      }
    }
    frontier = next;
    depth += 1;
  }
  return edges;
}

/** Every step reachable from `startId`, the card itself excluded. */
export function futureSet(edges: FutureEdge[]): Set<string> {
  return new Set(edges.map((e) => e.to));
}

/** Each step's column, counted from 1 at the left, so an arrow knows whether to go right or down. */
export function columnNumbers(road: Road): Map<string, number> {
  const out = new Map<string, number>();
  road.columns.forEach((column, i) => {
    for (const stepId of column.steps) out.set(stepId, i + 1);
  });
  return out;
}

/**
 * Where the road begins: the steps no other step leads to. A road written as one loop has none, so
 * then its first column is the start.
 */
export function firstSteps(road: Road): string[] {
  const led = new Set(road.steps.flatMap((s) => s.next));
  const roots = road.steps.map((s) => s.id).filter((id) => !led.has(id));
  return roots.length > 0 ? roots : [...(road.columns[0]?.steps ?? [])];
}

/**
 * Every step that can be reached from where the road begins without stepping on any of `avoid`.
 * A step two endings both lead to stays reachable while either ending is still allowed.
 */
export function reachableAvoiding(road: Road, avoid: ReadonlySet<string>): Set<string> {
  const stepsById = new Map(road.steps.map((s) => [s.id, s]));
  const reached = new Set<string>();
  const queue = firstSteps(road).filter((id) => !avoid.has(id));
  while (queue.length > 0) {
    const id = queue.shift()!;
    if (reached.has(id) || !stepsById.has(id)) continue;
    reached.add(id);
    for (const target of stepsById.get(id)!.next) {
      if (!avoid.has(target) && !reached.has(target)) queue.push(target);
    }
  }
  return reached;
}
