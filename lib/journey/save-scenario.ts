import type { FirstSave } from "@/lib/journey/first-save";
import type { Scenario } from "@/lib/scenarios/types";

/**
 * `kept` is the idea as the save read it back from the data file (null if the answer didn't carry it),
 * which is what a receipt's "after" is built from: never from what the screen sent.
 */
export type SaveScenarioResult = { ok: true; ventureId: string; kept: Scenario | null } | { ok: false; status: number | null };

/**
 * Client-side write of a scenario to the person's own database (`POST /api/scenario/save`,
 * an upsert keyed by `scenario.id`, so calling it again for the same scenario is idempotent).
 *
 * Issue #1 (2026-09-20): the intake calls this before it opens the map, and the cockpit calls
 * it (debounced) after every edit — nothing the person did should live only in the tab.
 * Fails soft: a 503 (no database) or a network error returns `{ ok: false }` and the caller
 * decides what to show; it never throws.
 *
 * `firstSave` (the typed sentence and the goal picks) is passed only by the intake, on the save that
 * creates the idea; the server writes it only when the idea is new (lib/journey/first-save.ts).
 */
export async function saveScenario(scenario: Scenario, firstSave?: FirstSave): Promise<SaveScenarioResult> {
  try {
    const response = await fetch("/api/scenario/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scenario, ...firstSave }),
    });
    if (!response.ok) return { ok: false, status: response.status };
    const body = (await response.json()) as { ventureId?: unknown; scenario?: unknown };
    const kept = body.scenario && typeof body.scenario === "object" ? (body.scenario as Scenario) : null;
    return { ok: true, ventureId: typeof body.ventureId === "string" ? body.ventureId : "", kept };
  } catch {
    return { ok: false, status: null };
  }
}

/** Milliseconds the cockpit waits after the last edit before it saves. */
export const AUTOSAVE_DELAY_MS = 800;

/** "12:04" for the "Saved · 12:04" line — local time, no seconds. */
export function formatSavedAt(date: Date): string {
  return date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}
