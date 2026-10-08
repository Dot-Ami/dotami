/**
 * [8e] "Add to my calendar": the Figure reminders as a calendar file (.ics, RFC 5545).
 *
 * One repeating all-day event per ticked choice, on the first day after each month, quarter or
 * year ends. The file is made in the page from the ticked boxes alone; nothing is sent anywhere,
 * and nothing about the person goes in it: no amounts, no idea names, no figures. A calendar that
 * syncs sends its events to the company that runs it, which is why the words stay generic.
 *
 * The calendar can't see DotAmi, so the event comes whether or not the figures are already in,
 * and the text says so.
 *
 * Pure: the caller hands in the person's own day (lib/figures/age.ts localToday) and the moment
 * the file is made, so tests can pin both.
 *
 * Format notes (RFC 5545):
 *   - Lines end in CRLF (§3.1), including the last one.
 *   - A content line longer than 75 octets is folded: CRLF then one space (§3.1). Octets, not
 *     characters, so a multi-byte character is never cut in half.
 *   - TEXT values escape backslash, semicolon, comma and line breaks (§3.3.11).
 *   - The events are all-day (DATE values), which are "floating": they fall on that calendar day
 *     wherever the person is, so the file needs no time zone section (§3.3.4, §3.6.1).
 *   - UID is fixed per cadence. Importing the file again then updates the same event in a calendar
 *     that matches by UID, instead of adding a second copy.
 */

import { parseDay } from "./age";
import { REMINDER_CADENCES, type ReminderCadence } from "../settings/values";

export const CALENDAR_FILE_NAME = "DotAmi figure reminders.ics";
export const CALENDAR_MIME = "text/calendar;charset=utf-8";

/** The event's title, the same for every cadence. */
export const CALENDAR_EVENT_TITLE = "Bring your DotAmi figures up to date";

const CRLF = "\r\n";
const MAX_LINE_OCTETS = 75;

// RRULEs kept to the simplest form every calendar reads: the day of the month comes from DTSTART,
// which is always a 1st (RFC 5545 §3.3.10: a missing BYxxx part is taken from DTSTART).
const RULES: Record<ReminderCadence, { rrule: string; ended: string }> = {
  monthly: { rrule: "FREQ=MONTHLY", ended: "A month has ended." },
  quarterly: { rrule: "FREQ=MONTHLY;INTERVAL=3", ended: "A quarter (three months: January to March, April to June, July to September or October to December) has ended." },
  yearly: { rrule: "FREQ=YEARLY", ended: "A year has ended." },
};

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * The first day after today that starts a new month, calendar quarter or year: the day the first
 * event falls on. Strictly after today, so ticking a box on October 1 starts the quarterly event on
 * January 1 (the banner in the app already covers the quarter that ended yesterday).
 */
export function firstReminderDay(today: string, cadence: ReminderCadence): string {
  const t = parseDay(today);
  if (!t) throw new Error("firstReminderDay needs a day written YYYY-MM-DD.");
  if (cadence === "yearly") return `${t.y + 1}-01-01`;
  const span = cadence === "monthly" ? 1 : 3;
  // Months counted from year 0, so crossing a year end is plain arithmetic (as in lastEndedPeriod).
  const index = t.y * 12 + (t.m - 1);
  const next = index - (index % span) + span;
  return `${Math.floor(next / 12)}-${pad((next % 12) + 1)}-01`;
}

/** Escapes a TEXT value (RFC 5545 §3.3.11). */
export function escapeText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r\n|\r|\n/g, "\\n");
}

const encoder = new TextEncoder();

/**
 * Folds one content line to at most 75 octets per physical line (RFC 5545 §3.1). Each
 * continuation starts with a single space, which counts towards its 75. Splits only between
 * characters (code points), never inside one character's UTF-8 bytes.
 */
export function foldLine(line: string): string {
  const out: string[] = [];
  let current = "";
  let octets = 0;
  for (const char of line) {
    const size = encoder.encode(char).length;
    if (octets + size > MAX_LINE_OCTETS) {
      out.push(current);
      current = " ";
      octets = 1;
    }
    current += char;
    octets += size;
  }
  out.push(current);
  return out.join(CRLF);
}

/** A DATE value, 2026-10-01 → 20261001. */
function dateValue(day: string): string {
  return day.replace(/-/g, "");
}

/** The day after a 1st is always the 2nd of the same month; DTEND is exclusive (RFC 5545 §3.6.1). */
function dayAfterFirst(day: string): string {
  return `${day.slice(0, 8)}02`;
}

/** A UTC DATE-TIME, for DTSTAMP: 20261008T143005Z. */
function utcStamp(now: Date): string {
  return now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

export interface ReminderCalendarInput {
  /** The ticked choices; at least one (a calendar file must hold at least one event). */
  cadences: readonly ReminderCadence[];
  /** The person's own day, YYYY-MM-DD. */
  today: string;
  /** When the file is made; becomes each event's DTSTAMP. */
  now: Date;
}

/** The whole .ics file as text, CRLF line endings, one VEVENT per ticked choice. */
export function reminderCalendar({ cadences, today, now }: ReminderCalendarInput): string {
  // Each choice once, in the settings page's order, whatever order they arrived in.
  const chosen = REMINDER_CADENCES.filter((c) => cadences.includes(c));
  if (chosen.length === 0) throw new Error("reminderCalendar needs at least one ticked choice.");
  if (Number.isNaN(now.getTime())) throw new Error("reminderCalendar needs a real moment for DTSTAMP.");
  const stamp = utcStamp(now);

  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//DotAmi//Figure reminders//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH"];
  for (const cadence of chosen) {
    const start = firstReminderDay(today, cadence);
    const rule = RULES[cadence];
    const description = [
      rule.ended,
      "Open DotAmi to add your figures for it, or agree to the ones waiting.",
      "This calendar can't see DotAmi, so this reminder comes whether or not your figures are already in.",
    ].join(" ");
    lines.push(
      "BEGIN:VEVENT",
      `UID:dotami-figure-reminder-${cadence}`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${dateValue(start)}`,
      `DTEND;VALUE=DATE:${dateValue(dayAfterFirst(start))}`,
      `RRULE:${rule.rrule}`,
      `SUMMARY:${escapeText(CALENDAR_EVENT_TITLE)}`,
      `DESCRIPTION:${escapeText(description)}`,
      // An all-day reminder shouldn't show the person as busy.
      "TRANSP:TRANSPARENT",
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return lines.map(foldLine).join(CRLF) + CRLF;
}
