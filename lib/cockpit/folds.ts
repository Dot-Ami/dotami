import type { Overlays } from "@/lib/cockpit/view";

/**
 * What the cockpit remembers about how the person left it, in this browser (docs/architecture/
 * future-cockpit.md § 2, "Folding and phone width" and "First visit and return visits"): which regions
 * they folded, the overlays they last had on, and whether they put the first visit's coach line away.
 *
 * Seven fold answers, true meaning folded: the left rail, the goal bar, the right-hand panel, the map's
 * legend, the what-if bar under the map, the road ahead (the road's later columns) and the extra layers
 * (the Money and Rules & tax switches).
 *
 * - The what-if bar (with "This visit") joined on 2026-10-13, so that every region of the cockpit folds.
 * - The road ahead and the extra layers joined on 2026-10-17 with the calm first view (S2.5.30c), and so did
 *   the overlays and the coach line.
 *
 * A first visit (nothing stored yet) opens calm: the road, the goal and the next steps, everything else
 * folded one click away (`FIRST_VISIT`). A return visit opens the way the person left it. An answer stored
 * before an answer existed reads that answer as open, so a person who had everything open before the calm
 * view still has everything open.
 *
 * Kept in localStorage under one key as a small JSON object. It is a convenience, never a record: nothing
 * here reaches the data file or leaves the computer, and every read and write is wrapped. A browser that
 * refuses storage (a private window, storage switched off, the server's first drawing) gets the first visit
 * every time, and folding that lasts until the window closes; a stored value that can't be read opens
 * everything, so a damaged value can never hide a region.
 */

export type FoldRegion = "rail" | "goal" | "panel" | "legend" | "whatIf" | "roadAhead" | "layers";
export type Folds = Readonly<Record<FoldRegion, boolean>>;

/** In the order the regions sit on the screen, left to right and top to bottom. */
export const FOLD_REGIONS: readonly FoldRegion[] = ["rail", "goal", "panel", "legend", "whatIf", "roadAhead", "layers"];

/** Everything open: what a stored value that can't be read falls back to. */
export const ALL_OPEN: Folds = {
  rail: false,
  goal: false,
  panel: false,
  legend: false,
  whatIf: false,
  roadAhead: false,
  layers: false,
};
export const ALL_FOLDED: Folds = {
  rail: true,
  goal: true,
  panel: true,
  legend: true,
  whatIf: true,
  roadAhead: true,
  layers: true,
};

/**
 * The first visit (the layout rule's third line, docs/ui-spec/README.md): the road, the goal and the next
 * steps; everything else folded, each one click away. The panel opens when the person opens something in it.
 */
export const FIRST_VISIT: Folds = {
  rail: true,
  goal: false,
  panel: false,
  legend: true,
  whatIf: true,
  roadAhead: true,
  layers: true,
};

/** Everything the cockpit remembers in this browser. */
export interface CockpitMemory {
  folds: Folds;
  /** The overlays the person last had on; null when they never changed them (the first visit's are used). */
  overlays: Overlays | null;
  /** True once the person put the first visit's coach line away: it doesn't come back. */
  coachDismissed: boolean;
}

/** Nothing remembered yet: the designed first visit. */
export const FIRST_VISIT_MEMORY: CockpitMemory = { folds: FIRST_VISIT, overlays: null, coachDismissed: false };

/** The browser-storage key (listed in lib/privacy/inventory.ts WINDOW_STORAGE). */
export const COCKPIT_FOLDS_KEY = "dotami-cockpit-folds";

/**
 * The stored text, read back. Nothing stored is a first visit. Only a real `true` folds a region, turns an
 * overlay on or puts the coach line away: a string, a number or a missing key reads as open, off or not put
 * away, and anything that isn't a JSON object opens everything, so a damaged value can never hide a region.
 */
export function parseMemory(raw: string | null | undefined): CockpitMemory {
  if (!raw) return FIRST_VISIT_MEMORY;
  const unreadable: CockpitMemory = { folds: ALL_OPEN, overlays: null, coachDismissed: false };
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return unreadable;
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) return unreadable;
  const stored = value as Partial<Record<FoldRegion | "overlays" | "coachDismissed", unknown>>;
  const folds = Object.fromEntries(FOLD_REGIONS.map((region) => [region, stored[region] === true])) as Record<FoldRegion, boolean>;
  // The overlays only as an object: anything else reads as never changed, and the first visit's are used.
  const o = stored.overlays;
  const overlays =
    o && typeof o === "object" && !Array.isArray(o)
      ? {
          skills: (o as Record<string, unknown>).skills === true,
          money: (o as Record<string, unknown>).money === true,
          rules: (o as Record<string, unknown>).rules === true,
        }
      : null;
  return { folds, overlays, coachDismissed: stored.coachDismissed === true };
}

/** Just the folds of a stored value (the first visit's when nothing is stored). */
export function parseFolds(raw: string | null | undefined): Folds {
  return parseMemory(raw).folds;
}

/** This browser's remembered cockpit, or the first visit when there is none or storage is refused. */
export function readMemory(): CockpitMemory {
  try {
    return parseMemory(localStorage.getItem(COCKPIT_FOLDS_KEY));
  } catch {
    // No localStorage at all (the server), or the browser refused it.
    return FIRST_VISIT_MEMORY;
  }
}

/** Remembers it all. A browser that refuses is left alone: the fold still works until the window closes. */
export function writeMemory(memory: CockpitMemory): void {
  try {
    // Written key by key so nothing but these answers is ever stored.
    const value: Record<string, unknown> = Object.fromEntries(FOLD_REGIONS.map((region) => [region, memory.folds[region]]));
    if (memory.overlays) {
      value.overlays = { skills: memory.overlays.skills, money: memory.overlays.money, rules: memory.overlays.rules };
    }
    if (memory.coachDismissed) value.coachDismissed = true;
    localStorage.setItem(COCKPIT_FOLDS_KEY, JSON.stringify(value));
  } catch {
    // Storage full, switched off or absent: nothing to do.
  }
}

/** True when every region is folded: the header's button then offers to show them all. */
export function allFolded(folds: Folds): boolean {
  return FOLD_REGIONS.every((region) => folds[region]);
}
