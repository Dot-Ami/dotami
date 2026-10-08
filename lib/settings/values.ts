/**
 * What a saved setting's value may look like — one definition per `live` setting in
 * lib/settings/catalog.ts. Pure on purpose (no database, no Node), so the settings page, the
 * ideas page and the server all read the same rules.
 *
 * Every setting's value is a small JSON object. A setting that later needs one more field adds a
 * key here and nothing else changes: the database keeps the object as text under the setting's id
 * (the `Setting` table, lib/settings/store.ts).
 *
 * A write carries a PATCH: only the keys it names change, the rest keep their stored value. That
 * is what lets the settings page save its tick-boxes and the ideas page save its switches into
 * the same setting without either one needing to know — or overwrite — the other's half.
 */

/** How often the person asked to be reminded to bring their figures up to date. */
export const REMINDER_CADENCES = ["monthly", "quarterly", "yearly"] as const;
export type ReminderCadence = (typeof REMINDER_CADENCES)[number];

export const REMINDER_CADENCE_LABELS: Record<ReminderCadence, string> = {
  monthly: "Monthly",
  quarterly: "Quarterly",
  yearly: "Yearly",
};

/** More than anyone has ideas; a cap so a runaway caller can't grow one setting without bound. */
export const MAX_REMINDED_IDEAS = 500;
/** An idea id is a cuid (25 characters); this leaves room without letting a long string through. */
const MAX_ID_LENGTH = 100;

/**
 * The saved value of "Figure reminders" ([8e]).
 *  - cadences: which of monthly, quarterly and yearly the person ticked — any combination, or none.
 *    Kept in the order above, each at most once.
 *  - ideaIds: the ideas whose "Remind me about this idea" switch is on. Ids of ideas that no longer
 *    exist may linger here; whoever reads the list ignores ids it doesn't recognise.
 *
 * Both empty (the default) means no reminder for anything. A reminder needs a cadence AND an idea.
 */
export interface FigureRemindersValue {
  cadences: ReminderCadence[];
  ideaIds: string[];
}

/** The values of every live setting, keyed by its catalog id. */
export interface SettingValues {
  "figure-reminders": FigureRemindersValue;
}
export type LiveSettingId = keyof SettingValues;

export interface SettingDefinition<V> {
  /** What a setting reads as before anything is saved. Must match the catalog's default. */
  fallback: V;
  /**
   * Checks a patch from a caller (or a stored value). Returns the cleaned keys it names, or null
   * to refuse the whole thing: unknown keys and values of the wrong kind are refused, never
   * trimmed away, so a typo can't look like it worked.
   */
  parsePatch(raw: unknown): Partial<V> | null;
}

const isPlainObject = (raw: unknown): raw is Record<string, unknown> =>
  typeof raw === "object" && raw !== null && !Array.isArray(raw);

const figureReminders: SettingDefinition<FigureRemindersValue> = {
  fallback: { cadences: [], ideaIds: [] },
  parsePatch(raw) {
    if (!isPlainObject(raw)) return null;
    const out: Partial<FigureRemindersValue> = {};
    for (const [key, value] of Object.entries(raw)) {
      if (key === "cadences") {
        if (!Array.isArray(value)) return null;
        const wanted = new Set<unknown>(value);
        // Every entry must be one of the three; a stray string is a mistake, not something to drop.
        if (value.some((c) => !REMINDER_CADENCES.includes(c as ReminderCadence))) return null;
        out.cadences = REMINDER_CADENCES.filter((c) => wanted.has(c));
      } else if (key === "ideaIds") {
        if (!Array.isArray(value)) return null;
        if (value.some((id) => typeof id !== "string" || id.length === 0 || id.length > MAX_ID_LENGTH)) return null;
        const ids = [...new Set(value as string[])];
        if (ids.length > MAX_REMINDED_IDEAS) return null;
        out.ideaIds = ids;
      } else {
        return null;
      }
    }
    return out;
  },
};

export const SETTING_DEFINITIONS: { [K in LiveSettingId]: SettingDefinition<SettingValues[K]> } = {
  "figure-reminders": figureReminders,
};

export function isLiveSettingId(id: unknown): id is LiveSettingId {
  return typeof id === "string" && Object.prototype.hasOwnProperty.call(SETTING_DEFINITIONS, id);
}

/**
 * Turns stored text into a value. Anything that doesn't read back as a valid value (a hand-edited
 * file, a value from a future version) reads as the setting's fallback rather than breaking the
 * page — for the reminders, the fallback is "no reminder", the quiet direction.
 */
export function valueFromStored<K extends LiveSettingId>(id: K, stored: string | null): SettingValues[K] {
  const def = SETTING_DEFINITIONS[id] as SettingDefinition<SettingValues[K]>;
  if (stored === null) return structuredClone(def.fallback);
  try {
    const patch = def.parsePatch(JSON.parse(stored));
    if (patch) return { ...structuredClone(def.fallback), ...patch };
  } catch {
    // Not JSON: fall through to the fallback.
  }
  return structuredClone(def.fallback);
}
