/**
 * Which of the cockpit's regions the person folded, remembered in this browser (docs/architecture/
 * future-cockpit.md § 2, "Folding and phone width"). Four answers: the left rail, the goal bar, the
 * right-hand panel and the map's legend; true means folded.
 *
 * Kept in localStorage under one key as a small JSON object. It is a convenience, never a record: nothing
 * here reaches the data file or leaves the computer, and every read and write is wrapped, so a browser
 * that refuses storage (a private window, storage switched off, the server's first drawing) simply gets
 * everything open and folding that lasts until the window closes.
 */

export type FoldRegion = "rail" | "goal" | "panel" | "legend";
export type Folds = Readonly<Record<FoldRegion, boolean>>;

/** In the order the regions sit on the screen, left to right and top to bottom. */
export const FOLD_REGIONS: readonly FoldRegion[] = ["rail", "goal", "panel", "legend"];

/** Everything open: how the cockpit starts, and what anything unreadable falls back to. */
export const ALL_OPEN: Folds = { rail: false, goal: false, panel: false, legend: false };
export const ALL_FOLDED: Folds = { rail: true, goal: true, panel: true, legend: true };

/** The browser-storage key (listed in lib/privacy/inventory.ts WINDOW_STORAGE). */
export const COCKPIT_FOLDS_KEY = "dotami-cockpit-folds";

/**
 * The stored text, read back. Only a real `true` folds a region: a string, a number, a missing key or
 * anything that isn't a JSON object reads as open, so a damaged value can never hide a region.
 */
export function parseFolds(raw: string | null | undefined): Folds {
  if (!raw) return ALL_OPEN;
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return ALL_OPEN;
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) return ALL_OPEN;
  const stored = value as Partial<Record<FoldRegion, unknown>>;
  return {
    rail: stored.rail === true,
    goal: stored.goal === true,
    panel: stored.panel === true,
    legend: stored.legend === true,
  };
}

/** This browser's remembered answers, or everything open when there are none or they can't be read. */
export function readFolds(): Folds {
  try {
    return parseFolds(localStorage.getItem(COCKPIT_FOLDS_KEY));
  } catch {
    // No localStorage at all (the server), or the browser refused it.
    return ALL_OPEN;
  }
}

/** Remembers the answers. A browser that refuses is left alone: the fold still works until the window closes. */
export function writeFolds(folds: Folds): void {
  try {
    // Written key by key so nothing but the four answers is ever stored.
    const value: Record<FoldRegion, boolean> = {
      rail: folds.rail,
      goal: folds.goal,
      panel: folds.panel,
      legend: folds.legend,
    };
    localStorage.setItem(COCKPIT_FOLDS_KEY, JSON.stringify(value));
  } catch {
    // Storage full, switched off or absent: nothing to do.
  }
}

/** True when all four are folded: the header's button then offers to show them all. */
export function allFolded(folds: Folds): boolean {
  return FOLD_REGIONS.every((region) => folds[region]);
}
