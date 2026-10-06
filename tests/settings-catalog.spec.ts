import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { SETTING_GROUPS, SETTINGS } from "@/lib/settings/catalog";

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
    expect(rows.length).toBe(19);
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

  it("has no live setting yet — a live one needs its control and a test that it survives a restart", () => {
    // When a story makes a setting live, it changes this expectation in the same pull request
    // as the control, its storage and its browser test (story [7g]'s done-when).
    expect(SETTINGS.filter((s) => s.status === "live")).toEqual([]);
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
});
