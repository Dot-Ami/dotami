import type { LiveSettingId, SettingValues } from "./values";

/**
 * The browser's side of /api/settings, shared by the settings page and the ideas page. Both
 * answer null instead of throwing when the app can't be reached or refuses, so a page can say
 * "couldn't save" in its own words and leave the screen showing what is really saved.
 */

export async function loadSetting<K extends LiveSettingId>(id: K): Promise<SettingValues[K] | null> {
  try {
    const res = await fetch(`/api/settings?id=${encodeURIComponent(id)}`, { cache: "no-store" });
    if (!res.ok) return null;
    return ((await res.json()) as { value: SettingValues[K] }).value;
  } catch {
    return null;
  }
}

/** Saves the keys named in `patch`; answers the whole setting as the app now holds it. */
export async function saveSetting<K extends LiveSettingId>(id: K, patch: Partial<SettingValues[K]>): Promise<SettingValues[K] | null> {
  try {
    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, value: patch }),
    });
    if (!res.ok) return null;
    return ((await res.json()) as { value: SettingValues[K] }).value;
  } catch {
    return null;
  }
}
