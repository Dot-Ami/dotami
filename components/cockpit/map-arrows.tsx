"use client";

import { useCallback, useEffect, useLayoutEffect, useState } from "react";

import type { Road, RoadStep } from "@/lib/engines/roads/v2026";

/**
 * S2.5.4j (decided 2026-09-16): hovering a stage card shows arrows along the paths that lead
 * from it — how completing this step opens the next ones, all the way down the tree. The
 * arrows are the road's own `RoadStep.next`, walked to the end of the road: solid for the next
 * step, dashed and fainter for every step after. (Until 2026-10-11 they walked the tax map's
 * `CFENode.branches`; road 0 carries those over unchanged.)
 */

export interface FutureEdge {
  from: string;
  to: string;
  /** 1 = the next step from the focused card; 2+ = further into the future. */
  depth: number;
}

/** Breadth-first over `next` from one step. A road's checks don't forbid loops, so they are guarded. */
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

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface ArrowOverlayProps {
  /** The element the SVG is positioned inside — cards are measured relative to it. */
  container: HTMLElement | null;
  /** Registered stage-card elements by step id. */
  cards: ReadonlyMap<string, HTMLElement>;
  /** Column number per step id, so an arrow knows whether to go right or down. */
  columnOf: (id: string) => number;
  edges: FutureEdge[];
}

function measure(container: HTMLElement, el: HTMLElement): Rect {
  const base = container.getBoundingClientRect();
  const r = el.getBoundingClientRect();
  return { x: r.left - base.left, y: r.top - base.top, w: r.width, h: r.height };
}

/** A cubic curve between two cards: rightwards when the target is in a later column, downwards otherwise. */
function pathBetween(a: Rect, b: Rect, forward: boolean): string {
  if (forward) {
    const x1 = a.x + a.w;
    const y1 = a.y + a.h / 2;
    const x2 = b.x;
    const y2 = b.y + b.h / 2;
    const dx = Math.max(24, (x2 - x1) / 2);
    return `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
  }
  const x1 = a.x + a.w / 2;
  const y1 = a.y + a.h;
  const x2 = b.x + b.w / 2;
  const y2 = b.y;
  const dy = Math.max(16, (y2 - y1) / 2);
  return `M ${x1} ${y1} C ${x1} ${y1 + dy}, ${x2} ${y2 - dy}, ${x2} ${y2}`;
}

export function ArrowOverlay({ container, cards, columnOf, edges }: ArrowOverlayProps) {
  const [paths, setPaths] = useState<Array<{ key: string; d: string; depth: number }>>([]);

  const compute = useCallback(() => {
    if (!container || edges.length === 0) {
      setPaths([]);
      return;
    }
    const next: Array<{ key: string; d: string; depth: number }> = [];
    for (const edge of edges) {
      const a = cards.get(edge.from);
      const b = cards.get(edge.to);
      if (!a || !b) continue;
      const ra = measure(container, a);
      const rb = measure(container, b);
      const forward = columnOf(edge.to) > columnOf(edge.from);
      next.push({ key: `${edge.from}->${edge.to}`, d: pathBetween(ra, rb, forward), depth: edge.depth });
    }
    setPaths(next);
  }, [container, cards, columnOf, edges]);

  useLayoutEffect(() => {
    compute();
  }, [compute]);

  useEffect(() => {
    window.addEventListener("resize", compute);
    return () => window.removeEventListener("resize", compute);
  }, [compute]);

  if (paths.length === 0) return null;

  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible" aria-hidden>
      <defs>
        <marker id="map-arrow-solid" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#B94A2C" />
        </marker>
        <marker id="map-arrow-faint" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#B94A2C" fillOpacity="0.5" />
        </marker>
      </defs>
      {/* deeper (fainter) first, so the next step draws on top */}
      {[...paths].sort((p, q) => q.depth - p.depth).map((p) => (
        <path
          key={p.key}
          d={p.d}
          fill="none"
          stroke="#B94A2C"
          strokeWidth={p.depth === 1 ? 2 : 1.25}
          strokeOpacity={p.depth === 1 ? 0.95 : Math.max(0.2, 0.55 - (p.depth - 2) * 0.12)}
          strokeDasharray={p.depth === 1 ? undefined : "5 4"}
          markerEnd={p.depth === 1 ? "url(#map-arrow-solid)" : "url(#map-arrow-faint)"}
        />
      ))}
    </svg>
  );
}
