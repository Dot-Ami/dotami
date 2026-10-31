import type { JourneyState } from "./types";

/**
 * The journey (the intake in progress, *Your destination*'s answers, the idea open on the map and any edit on the
 * map no save has kept yet), held in this window's memory: a variable of the page's own code, never the window's
 * storage (2026-10-24, the maintainer's rule that nothing about the person sits there;
 * lib/journey/window-storage.ts says where each answer is kept instead).
 *
 * Not the journey provider's React state alone: the provider lives in app/(journey)/layout.tsx and is unmounted
 * whenever the person moves to a page outside it, the invented example (app/example/, outside on purpose so it
 * touches none of the person's journey), and its state starts empty when they come back. This variable lives as
 * long as the page's code does, so the journey is there again after *Show me an example first* and back. A page
 * loaded afresh (a reload, a new window, the desktop app's Go menu, which opens its pages with loadURL) starts
 * it empty.
 *
 * Browser only: on the server one module serves every request, so nothing is held or given back there. Only the
 * journey provider's effects call these, and effects never run on the server.
 */
let held: JourneyState | undefined;

/** The journey last held in this window, or undefined (nothing held yet, or on the server). */
export function heldJourney(): JourneyState | undefined {
  return typeof window === "undefined" ? undefined : held;
}

/** Holds the journey as it stands now; the provider calls it on every change. */
export function holdJourney(next: JourneyState): void {
  if (typeof window === "undefined") return;
  held = next;
}
