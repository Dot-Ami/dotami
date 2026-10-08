import { describe, expect, it } from "vitest";

import {
  CALENDAR_EVENT_TITLE,
  CALENDAR_FILE_NAME,
  escapeText,
  firstReminderDay,
  foldLine,
  randomUuid,
  reminderCalendar,
} from "@/lib/figures/calendar";
import type { ReminderCadence } from "@/lib/settings/values";

/**
 * [8e] "Add to my calendar": the .ics text. The checks below read the file the way RFC 5545 says
 * a calendar must — unfold first, then split into content lines — rather than comparing against a
 * copy of the builder's own output, so a broken fold or a missing CRLF fails here.
 */

const NOW = new Date("2026-10-08T14:30:05.123Z");
const octets = (s: string) => new TextEncoder().encode(s).length;
/** A random version 4 UUID, lower-case (RFC 4122 §4.4); RFC 7986 §5.3 recommends one as the UID. */
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

/** RFC 5545 §3.1: a CRLF followed by one space or tab is removed before the line is read. */
function unfold(text: string): string {
  return text.replace(/\r\n[ \t]/g, "");
}

/** The content lines, as [name, params, value]; fails the test on a line that doesn't parse. */
function contentLines(text: string): Array<{ name: string; params: string; value: string }> {
  const lines = unfold(text).split("\r\n");
  expect(lines.pop()).toBe(""); // the file ends in CRLF
  return lines.map((line) => {
    // name *(";" param) ":" value — param values here never contain a colon.
    const match = line.match(/^([A-Z][A-Z0-9-]*)((?:;[A-Z-]+=[^;:]*)*):(.*)$/);
    expect(match, `not a content line: ${JSON.stringify(line)}`).not.toBeNull();
    return { name: match![1], params: match![2], value: match![3] };
  });
}

/** The VEVENTs, each as a map of property name → list of [params, value]. */
function events(text: string) {
  const out: Array<Map<string, Array<{ params: string; value: string }>>> = [];
  let current: Map<string, Array<{ params: string; value: string }>> | null = null;
  for (const line of contentLines(text)) {
    if (line.name === "BEGIN" && line.value === "VEVENT") current = new Map();
    else if (line.name === "END" && line.value === "VEVENT") {
      out.push(current!);
      current = null;
    } else if (current) current.set(line.name, [...(current.get(line.name) ?? []), line]);
  }
  return out;
}

const one = (event: Map<string, Array<{ params: string; value: string }>>, name: string) => {
  const found = event.get(name) ?? [];
  expect(found, `${name} should appear exactly once`).toHaveLength(1);
  return found[0];
};

describe("firstReminderDay — the first day after today that starts a month, quarter or year", () => {
  it.each<[string, ReminderCadence, string]>([
    ["2026-10-08", "monthly", "2026-11-01"],
    ["2026-10-08", "quarterly", "2027-01-01"],
    ["2026-10-08", "yearly", "2027-01-01"],
    // Strictly after today: on a 1st, the next one.
    ["2026-10-01", "monthly", "2026-11-01"],
    ["2026-10-01", "quarterly", "2027-01-01"],
    ["2026-01-01", "yearly", "2027-01-01"],
    // The last day of a period: the very next day.
    ["2026-03-31", "quarterly", "2026-04-01"],
    ["2026-12-31", "monthly", "2027-01-01"],
    ["2026-12-31", "yearly", "2027-01-01"],
    ["2026-05-15", "quarterly", "2026-07-01"],
    ["2026-08-20", "quarterly", "2026-10-01"],
    ["2028-02-29", "monthly", "2028-03-01"],
  ])("%s, %s → %s", (today, cadence, expected) => {
    expect(firstReminderDay(today, cadence)).toBe(expected);
  });

  it("refuses a day that isn't on the calendar", () => {
    expect(() => firstReminderDay("2026-02-30", "monthly")).toThrow();
    expect(() => firstReminderDay("not a day", "yearly")).toThrow();
  });
});

describe("escapeText (RFC 5545 §3.3.11)", () => {
  it("escapes backslash, semicolon, comma and line breaks", () => {
    expect(escapeText("a,b;c\\d\ne\r\nf")).toBe("a\\,b\\;c\\\\d\\ne\\nf");
  });
  it("leaves a colon alone (allowed in TEXT)", () => {
    expect(escapeText("Note: x")).toBe("Note: x");
  });
});

describe("foldLine (RFC 5545 §3.1)", () => {
  it("keeps a short line as it is", () => {
    expect(foldLine("SUMMARY:short")).toBe("SUMMARY:short");
  });

  it("folds a long line into lines of at most 75 octets that unfold back to the original", () => {
    const line = `DESCRIPTION:${"x".repeat(200)}`;
    const folded = foldLine(line);
    const physical = folded.split("\r\n");
    expect(physical.length).toBeGreaterThan(2);
    for (const p of physical) expect(octets(p)).toBeLessThanOrEqual(75);
    expect(octets(physical[0])).toBe(75);
    for (const p of physical.slice(1)) expect(p.startsWith(" ")).toBe(true);
    expect(unfold(folded)).toBe(line);
  });

  it("counts octets, not characters, and never cuts a character's bytes in half", () => {
    // é is 2 bytes, — is 3, the emoji 4: a character-counting fold would make lines over 75 octets.
    const line = `DESCRIPTION:${"é—😀".repeat(40)}`;
    const folded = foldLine(line);
    const strict = new TextDecoder("utf-8", { fatal: true });
    for (const p of folded.split("\r\n")) {
      expect(octets(p)).toBeLessThanOrEqual(75);
      // Each physical line on its own is valid UTF-8: no split sequence.
      expect(() => strict.decode(new TextEncoder().encode(p))).not.toThrow();
    }
    expect(unfold(folded)).toBe(line);
  });
});

describe("reminderCalendar — the whole file", () => {
  const all = reminderCalendar({ cadences: ["monthly", "quarterly", "yearly"], today: "2026-10-08", now: NOW });

  it("uses CRLF for every line ending and ends with one", () => {
    expect(all.endsWith("END:VCALENDAR\r\n")).toBe(true);
    // No bare LF and no bare CR anywhere.
    expect(all.replace(/\r\n/g, "")).not.toMatch(/[\r\n]/);
  });

  it("keeps every physical line within 75 octets", () => {
    for (const p of all.split("\r\n")) expect(octets(p)).toBeLessThanOrEqual(75);
    // The descriptions are long enough that folding really happened.
    expect(all).toMatch(/\r\n /);
  });

  it("is one VCALENDAR with VERSION 2.0 and a PRODID, each once", () => {
    const lines = contentLines(all);
    expect(lines[0]).toMatchObject({ name: "BEGIN", value: "VCALENDAR" });
    expect(lines.at(-1)).toMatchObject({ name: "END", value: "VCALENDAR" });
    expect(lines.filter((l) => l.name === "VERSION").map((l) => l.value)).toEqual(["2.0"]);
    expect(lines.filter((l) => l.name === "PRODID")).toHaveLength(1);
    expect(lines.filter((l) => l.name === "BEGIN" && l.value === "VCALENDAR")).toHaveLength(1);
  });

  it("has one event per ticked choice, each with its own UID, a UTC DTSTAMP and an all-day start on a 1st", () => {
    const evs = events(all);
    expect(evs).toHaveLength(3);
    const uids = evs.map((e) => one(e, "UID").value);
    expect(new Set(uids).size).toBe(3);
    for (const e of evs) {
      expect(one(e, "DTSTAMP")).toEqual({ name: "DTSTAMP", params: "", value: "20261008T143005Z" });
      expect(one(e, "DTSTART").params).toBe(";VALUE=DATE");
      expect(one(e, "DTSTART").value).toMatch(/^\d{6}01$/);
      // DTEND is the next day (exclusive), so the event is that one day.
      expect(one(e, "DTEND")).toMatchObject({ params: ";VALUE=DATE", value: one(e, "DTSTART").value.slice(0, 6) + "02" });
      expect(one(e, "SUMMARY").value).toBe(CALENDAR_EVENT_TITLE);
      expect(one(e, "TRANSP").value).toBe("TRANSPARENT");
    }
  });

  it("repeats monthly, every three months from a quarter's start, and yearly on January 1", () => {
    // In the page's order: monthly, quarterly, yearly.
    expect(events(all).map((e) => [one(e, "DTSTART").value, one(e, "RRULE").value])).toEqual([
      ["20261101", "FREQ=MONTHLY"],
      ["20270101", "FREQ=MONTHLY;INTERVAL=3"],
      ["20270101", "FREQ=YEARLY"],
    ]);
  });

  it("says the calendar can't see DotAmi, and holds nothing but generic words", () => {
    for (const e of events(all)) {
      const description = one(e, "DESCRIPTION").value.replace(/\\(.)/g, "$1");
      expect(description).toContain("can't see DotAmi");
      expect(description).toContain("whether or not your figures are already in");
      // No amount can be in it: the only digits in the event are its dates and the rule.
      expect(description).not.toMatch(/\d/);
    }
  });

  it("only the ticked choices, each once, in the page's order", () => {
    const text = reminderCalendar({ cadences: ["yearly", "monthly", "yearly"], today: "2026-10-08", now: NOW });
    expect(events(text).map((e) => one(e, "RRULE").value)).toEqual(["FREQ=MONTHLY", "FREQ=YEARLY"]);
  });

  it("gives every event a random UUID as its UID, new each time the file is made", () => {
    // RFC 5545 §3.8.4.7: unique everywhere, so two people importing into one shared calendar never
    // overwrite each other's events. RFC 7986 §5.3: a random UUID, with nothing in it that could
    // identify a person, a computer or a domain.
    const first = events(all).map((e) => one(e, "UID").value);
    const again = events(reminderCalendar({ cadences: ["monthly", "quarterly", "yearly"], today: "2026-10-08", now: NOW })).map(
      (e) => one(e, "UID").value,
    );
    for (const uid of [...first, ...again]) {
      expect(uid).toMatch(UUID_V4);
      expect(uid).not.toMatch(/dotami|@/i);
    }
    // Same ticks, same day, same moment: still six different UIDs.
    expect(new Set([...first, ...again]).size).toBe(6);
  });

  it("randomUuid makes version 4 UUIDs that don't repeat", () => {
    const many = Array.from({ length: 500 }, randomUuid);
    for (const uid of many) expect(uid).toMatch(UUID_V4);
    expect(new Set(many).size).toBe(500);
  });

  it("uses the UID maker it is handed, one call per event", () => {
    let n = 0;
    const text = reminderCalendar({ cadences: ["monthly", "yearly"], today: "2026-10-08", now: NOW, newUid: () => `uid-${++n}` });
    expect(events(text).map((e) => one(e, "UID").value)).toEqual(["uid-1", "uid-2"]);
  });

  it("refuses an empty list (a calendar file must hold at least one event) and a bad moment", () => {
    expect(() => reminderCalendar({ cadences: [], today: "2026-10-08", now: NOW })).toThrow();
    expect(() => reminderCalendar({ cadences: ["monthly"], today: "2026-10-08", now: new Date("nope") })).toThrow();
  });

  it("is saved as an .ics file", () => {
    expect(CALENDAR_FILE_NAME).toMatch(/\.ics$/);
  });
});
