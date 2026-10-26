"use client";

/**
 * Per-viewer conveniences kept in this browser only: unsent drafts and the person's own log of
 * what they did. Nothing here is sent anywhere or shared with anyone. Storage can be unavailable
 * or cleared at any time, so every access is guarded and the pages work without it.
 */
const PREFIX = "civic-trace:";

export function load<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

export function save(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // Not remembered; nothing else to do.
  }
}

export function clearAll(): void {
  try {
    for (const key of Object.keys(window.localStorage))
      if (key.startsWith(PREFIX)) window.localStorage.removeItem(key);
  } catch {
    // Nothing stored, or storage blocked.
  }
}

export interface PersonalLogEntry {
  id: string;
  date: string;
  routeId?: string;
  text: string;
}
