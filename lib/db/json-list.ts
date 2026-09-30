import type { Prisma } from "@prisma/client";

/**
 * SQLite has no list columns, so `Venture.activityTags` and the three `ScenarioState` node-id
 * lists are stored as JSON arrays. Prisma hands them back as `JsonValue`; this turns one back
 * into the `string[]` the rest of the app expects.
 *
 * Anything that isn't an array of strings (a hand-edited database, a row written by an older
 * build) reads as an empty list rather than crashing the page — the non-string entries are
 * dropped, never guessed at.
 */
export function toStringList(value: Prisma.JsonValue): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}
