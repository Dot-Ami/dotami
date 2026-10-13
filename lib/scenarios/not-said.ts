import { NOT_SAID_FIELDS, type NotSaidField, type VentureProfile } from "./types";

/**
 * Reads a not-said list (`VentureProfile.notSaid`) from anywhere it arrives, a save's body or the data
 * file's JSON column: only the known ids, each once, in the order `NOT_SAID_FIELDS` lists them. Anything
 * else is dropped, never guessed into one. An empty result means every answer was the person's.
 */
export function cleanNotSaid(value: unknown): NotSaidField[] {
  if (!Array.isArray(value)) return [];
  return NOT_SAID_FIELDS.filter((field) => value.includes(field));
}

/** Whether the idea was saved without this answer (a future picked on Pick a future, 2026-10-12). */
export function isNotSaid(profile: Pick<VentureProfile, "notSaid">, field: NotSaidField): boolean {
  return profile.notSaid?.includes(field) ?? false;
}
