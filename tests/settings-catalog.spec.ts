import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { FIGURE_STATUSES, type FigureStatus } from "@/lib/figures/types";
import { SETTING_GROUPS, SETTINGS } from "@/lib/settings/catalog";
import { SETTING_DEFINITIONS } from "@/lib/settings/values";

/**
 * The settings page is drawn from lib/settings/catalog.ts; the plan of record is Part 1 of
 * docs/architecture/settings-and-edge-cases.md. These tests fail the moment the two disagree —
 * a setting added to one and not the other, a changed default, or a warning reworded in one place.
 */
const doc = readFileSync(new URL("../docs/architecture/settings-and-edge-cases.md", import.meta.url), "utf8");

interface DocRow {
  label: string;
  defaultValue: string;
  options: string;
  warning: string;
  story: string;
}

function part1Rows(markdown: string): DocRow[] {
  const start = markdown.indexOf("## Part 1");
  const end = markdown.indexOf("## Part 2");
  const lines = markdown.slice(start, end).split("\n").filter((l) => l.startsWith("|"));
  // Drop the header row and the |---| separator.
  return lines.slice(2).map((line) => {
    const cells = line
      .split("|")
      .slice(1, -1)
      .map((c) => c.trim().replace(/\*\*/g, ""));
    const [label, defaultValue, options, warning, story] = cells;
    return { label, defaultValue, options, warning, story };
  });
}

const rows = part1Rows(doc);

describe("settings catalog matches Part 1 of the settings doc", () => {
  it("reads the table (a guard against the parser silently finding nothing)", () => {
    expect(rows.length).toBe(20);
  });

  it("has exactly the settings the doc lists", () => {
    // Compared as sets: the catalog is ordered by group for the page, the doc by story.
    expect(SETTINGS.map((s) => s.label).sort()).toEqual(rows.map((r) => r.label).sort());
  });

  it.each(rows)("$label: same default, choices and story", (row) => {
    const entry = SETTINGS.find((s) => s.label === row.label)!;
    expect(entry.defaultValue).toBe(row.defaultValue);
    expect(entry.options).toBe(row.options);
    if (row.story === "Part 4") {
      expect(entry.status).toBe("undecided");
      expect(entry.story).toBeNull();
    } else {
      expect(`[${entry.story}]`).toBe(row.story);
    }
  });

  it.each(rows)("$label: a warning where the doc has one, word for word", (row) => {
    const entry = SETTINGS.find((s) => s.label === row.label)!;
    if (row.warning.startsWith("—")) {
      expect(entry.warning).toBeNull();
      return;
    }
    expect(entry.warning).not.toBeNull();
    for (const [, quoted] of row.warning.matchAll(/"([^"]+)"/g)) {
      expect(entry.warning).toContain(quoted);
    }
  });
});

describe("settings catalog shape", () => {
  it("gives every setting a unique id and a known group", () => {
    const ids = SETTINGS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    const groups = new Set(SETTING_GROUPS.map((g) => g.id));
    for (const s of SETTINGS) expect(groups.has(s.group)).toBe(true);
  });

  it("leaves no group empty", () => {
    for (const g of SETTING_GROUPS) expect(SETTINGS.some((s) => s.group === g.id)).toBe(true);
  });

  it("has exactly the live settings listed here — a live one needs its control and a test that it survives a restart", () => {
    // When a story makes a setting live, it adds its id to this list in the same pull request
    // as the control, its storage and its browser test (story [7g]'s done-when). First: [8e].
    // [8i] "Encrypt the data file": its switch is on the settings page, and the desktop test checks it
    // is read at the next start.
    expect(SETTINGS.filter((s) => s.status === "live").map((s) => s.id)).toEqual(["database-encryption", "figure-reminders"]);
  });

  it("gives every live setting a definition of what it may hold, and every definition a live setting", () => {
    // lib/settings/values.ts decides what can be saved; a live setting without one couldn't be
    // saved at all, and a definition without a live setting would be saveable with no control.
    const live = SETTINGS.filter((s) => s.status === "live").map((s) => s.id).sort();
    expect(Object.keys(SETTING_DEFINITIONS).sort()).toEqual(live);
  });

  it("says where the app asks for every setting it asks for each time, and only those", () => {
    for (const s of SETTINGS) {
      if (s.status === "asked") expect(s.where).toMatch(/\S/);
      else expect(s.where).toBeUndefined();
    }
  });
});

describe("the settings page's Your figures line", () => {
  // The text the page shows under "Your figures", read from the component (the repo's way of
  // pinning wording: there is no render test setup, see tests/accessibility-contract.spec.ts).
  const page = readFileSync(new URL("../components/settings/settings-page.tsx", import.meta.url), "utf8");
  const start = page.indexOf('case "figures":');
  const figuresLine = page.slice(start, page.indexOf('case "lens":'));

  it("finds the line (a guard against the slice silently being empty)", () => {
    expect(start).toBeGreaterThan(-1);
    expect(figuresLine).toContain("<p>");
  });

  it("no longer says the figures store is yet to come, or names the story that built it", () => {
    expect(figuresLine).not.toMatch(/no confirmed figures/i);
    expect(figuresLine).not.toMatch(/arrives with/i);
    expect(figuresLine).not.toMatch(/\[\d+[a-z]?\]/);
  });

  it("points to the page that lists every figure", () => {
    expect(figuresLine).toContain('href="/your-data"');
    expect(figuresLine).toContain("What DotAmi knows about you");
  });

  it("says every kind of figure the data file holds, not only the agreed and taken-back ones", () => {
    // prisma/schema.prisma Figure.status stores all four of FIGURE_STATUSES, and the line has to be
    // true of each. Record<FigureStatus, …> means a fifth status can't be added without a phrase here.
    const SAYS: Record<FigureStatus, RegExp> = {
      proposed: /still waiting for your answer/,
      confirmed: /totals you agree to/,
      retracted: /took back/,
      discarded: /turned down/,
    };
    // The line is JSX text, so read it with the line breaks and the {" "} spacers folded away.
    const text = figuresLine.replace(/\{" "\}/g, " ").replace(/\s+/g, " ");
    for (const status of FIGURE_STATUSES) expect(text, `the line says nothing about "${status}" figures`).toMatch(SAYS[status]);
    // Only the agreed ones count; the rest are kept, and the line says so.
    expect(text).toMatch(/none of those count/i);
    expect(text).toMatch(/every one stays in your data file/);
  });
});
