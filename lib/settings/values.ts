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

import { parseDay } from "../figures/age";

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
/** One dismissal per idea per cadence is the most that can be current at once. */
export const MAX_DISMISSALS = MAX_REMINDED_IDEAS * REMINDER_CADENCES.length;
/** An idea id is a cuid (25 characters); this leaves room without letting a long string through. */
const MAX_ID_LENGTH = 100;

/**
 * One "Not this time" on a reminder banner: the idea, which cadence, and the last day of the
 * period it was dismissed for. It hides that one reminder and nothing else. Once the next period
 * of that cadence has ended the period no longer matches, and the reminder comes back by itself.
 */
export interface ReminderDismissal {
  ideaId: string;
  cadence: ReminderCadence;
  /** Last day of the dismissed period, YYYY-MM-DD. */
  periodEnd: string;
}

/**
 * The saved value of "Figure reminders" ([8e]).
 *  - cadences: which of monthly, quarterly and yearly the person ticked — any combination, or none.
 *    Kept in the order above, each at most once.
 *  - ideaIds: the ideas whose "Remind me about this idea" switch is on. Ids of ideas that no longer
 *    exist may linger here; whoever reads the list ignores ids it doesn't recognise.
 *  - dismissed: the banners the person answered "Not this time" (see ReminderDismissal). It lives
 *    inside this setting rather than as a setting of its own because a Setting key is a
 *    settings-catalog id (lib/settings/store.ts refuses any other) and a dismissal is not a choice
 *    the Settings page offers. Whoever saves a dismissal drops the ones for periods that are no
 *    longer the latest (lib/figures/reminder.ts, pruneDismissals), so the list stays short.
 *
 * Cadences or ideas empty (the default) means no reminder for anything. A reminder needs a cadence
 * AND an idea.
 */
export interface FigureRemindersValue {
  cadences: ReminderCadence[];
  ideaIds: string[];
  dismissed: ReminderDismissal[];
}

/**
 * [8i] The saved value of "Encrypt the data file" (docs/architecture/database-encryption.md, the
 * maintainer's decision 4 of 2026-10-10).
 *  - on: true (the default) means the desktop app encrypts the data file wherever there is a key store,
 *    asking first when an existing file is still plain; false is the person's "Never": the file stays
 *    unencrypted and the window doesn't ask again. Turning it back on makes the next start ask again.
 * The desktop app's main process reads it from the data file before the server starts (desktop/main.mjs
 * readEncryptionChoice) and writes it when the person answers "Never" there. Once the file is encrypted
 * the switch can't turn it off: DotAmi doesn't decrypt a file (the decision was a switch to turn it on).
 */
export interface DatabaseEncryptionValue {
  on: boolean;
}

/** The values of every live setting, keyed by its catalog id. */
export interface SettingValues {
  "figure-reminders": FigureRemindersValue;
  "database-encryption": DatabaseEncryptionValue;
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

/** One dismissal, or null when it isn't exactly an {ideaId, cadence, periodEnd} of the right kinds. */
function parseDismissal(raw: unknown): ReminderDismissal | null {
  if (!isPlainObject(raw)) return null;
  const keys = Object.keys(raw);
  if (keys.length !== 3 || !keys.includes("ideaId") || !keys.includes("cadence") || !keys.includes("periodEnd")) return null;
  const { ideaId, cadence, periodEnd } = raw;
  if (typeof ideaId !== "string" || ideaId.length === 0 || ideaId.length > MAX_ID_LENGTH) return null;
  if (!REMINDER_CADENCES.includes(cadence as ReminderCadence)) return null;
  // A real calendar day written YYYY-MM-DD (parseDay refuses anything else, including 2026-02-30).
  if (typeof periodEnd !== "string" || parseDay(periodEnd) === null) return null;
  return { ideaId, cadence: cadence as ReminderCadence, periodEnd };
}

const figureReminders: SettingDefinition<FigureRemindersValue> = {
  fallback: { cadences: [], ideaIds: [], dismissed: [] },
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
      } else if (key === "dismissed") {
        if (!Array.isArray(value) || value.length > MAX_DISMISSALS) return null;
        const seen = new Set<string>();
        const list: ReminderDismissal[] = [];
        for (const item of value) {
          const one = parseDismissal(item);
          if (!one) return null;
          // The same banner dismissed twice is one dismissal.
          const id = JSON.stringify([one.ideaId, one.cadence, one.periodEnd]);
          if (seen.has(id)) continue;
          seen.add(id);
          list.push(one);
        }
        out.dismissed = list;
      } else {
        return null;
      }
    }
    return out;
  },
};

const databaseEncryption: SettingDefinition<DatabaseEncryptionValue> = {
  fallback: { on: true },
  parsePatch(raw) {
    if (!isPlainObject(raw)) return null;
    const keys = Object.keys(raw);
    if (keys.length !== 1 || keys[0] !== "on" || typeof raw.on !== "boolean") return null;
    return { on: raw.on };
  },
};

export const SETTING_DEFINITIONS: { [K in LiveSettingId]: SettingDefinition<SettingValues[K]> } = {
  "figure-reminders": figureReminders,
  "database-encryption": databaseEncryption,
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
  return readStoredWith(SETTING_DEFINITIONS[id] as SettingDefinition<SettingValues[K]>, stored);
}

/** valueFromStored for a definition in hand (one not registered above yet, such as BANK_RECORDS_DEFINITION). */
export function readStoredWith<V extends object>(def: SettingDefinition<V>, stored: string | null): V {
  if (stored === null) return structuredClone(def.fallback);
  try {
    const patch = def.parsePatch(JSON.parse(stored));
    if (patch) return { ...structuredClone(def.fallback), ...patch };
  } catch {
    // Not JSON: fall through to the fallback.
  }
  return structuredClone(def.fallback);
}

/**
 * [8g] What the saved value of "Bank and card records" will hold.
 *
 * The setting is still `planned` in lib/settings/catalog.ts: it is the statement screen (the next
 * step) that makes the switch do anything, and until that lands nobody is shown a switch that does
 * nothing. This definition is ready for that step, which adds it to SettingValues and
 * SETTING_DEFINITIONS above in the same change that flips the catalog row to live
 * (tests/settings-catalog.spec.ts refuses a registered definition for a setting that isn't live).
 * Until then lib/figures/source-accounts.ts reads the setting as off, whatever the file holds.
 *
 *  - on: the switch on the Settings page. Off to start; turning it on shows the catalog's warning.
 *  - everyAccountSince: when the person pressed "Always allow every account" on a statement's
 *    warning, as an ISO date-time, or null. While it is set, no account's statement shows the
 *    warning. Settings lists it with its date and can take it back.
 */
export interface BankRecordsValue {
  on: boolean;
  everyAccountSince: string | null;
}

/** A date-time as Date.prototype.toISOString writes it, and a real one (not 2026-02-30). */
function isIsoInstant(raw: unknown): raw is string {
  if (typeof raw !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(raw)) return false;
  const t = new Date(raw);
  return !Number.isNaN(t.getTime()) && t.toISOString() === raw;
}

export const BANK_RECORDS_DEFINITION: SettingDefinition<BankRecordsValue> = {
  fallback: { on: false, everyAccountSince: null },
  parsePatch(raw) {
    if (!isPlainObject(raw)) return null;
    const out: Partial<BankRecordsValue> = {};
    for (const [key, value] of Object.entries(raw)) {
      if (key === "on") {
        if (typeof value !== "boolean") return null;
        out.on = value;
      } else if (key === "everyAccountSince") {
        if (value !== null && !isIsoInstant(value)) return null;
        out.everyAccountSince = value;
      } else {
        return null;
      }
    }
    return out;
  },
};
