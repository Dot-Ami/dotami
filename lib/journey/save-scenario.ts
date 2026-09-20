import type { Scenario } from "@/lib/scenarios/types";

export type SaveScenarioResult = { ok: true; ventureId: string } | { ok: false; status: number | null };

/**
 * Client-side write of a scenario to the person's own database (`POST /api/scenario/save`,
 * an upsert keyed by `scenario.id`, so calling it again for the same scenario is idempotent).
 *
 * Issue #1 (2026-09-20): the intake calls this before it opens the map, and the cockpit calls
 * it (debounced) after every edit — nothing the person did should live only in the tab.
 * Fails soft: a 503 (no database) or a network error returns `{ ok: false }` and the caller
 * decides what to show; it never throws.
 */
export async function saveScenario(scenario: Scenario): Promise<SaveScenarioResult> {
  try {
    const response = await fetch("/api/scenario/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scenario }),
    });
    if (!response.ok) return { ok: false, status: response.status };
    const body = (await response.json()) as { ventureId?: unknown };
    return { ok: true, ventureId: typeof body.ventureId === "string" ? body.ventureId : "" };
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
