/**
 * The Motor vehicle expenses write-off's s.67.3 source, on the maintainer's answer of 2026-10-28 (Alberta time; his
 * reading page saved it 2026-10-29 02:20 UTC) on his reading page (item 1, `s673` "A"): its title names only what its
 * page holds, s.67.3, under the section's own heading, and a line under the title says in plain English what the page
 * holds. His note: "there should be a subtitle explaining what the page holds in plain english so the user (if they
 * read it) knows what to looks for while reading."
 *
 * - The page, https://laws-lois.justice.gc.ca/eng/acts/I-3.3/section-67.3.html, holds s.67.3 alone; its heading is
 *   "Limitation re cost of leasing passenger vehicle", which `node scripts/check-quotes.mjs` found on it on
 *   2026-10-29 (and didn't find s.67's or s.67.2's headings there). The title said "s.18(1)(a), s.67, s.67.2,
 *   s.67.3 — purpose test, reasonableness, interest and lease caps" until then.
 * - The `corpus` list keeps all four provisions: "Show the words" reads them from DotAmi's own statute store, not
 *   from that page.
 * - The line (`pageHolds`, an optional field of a citation) is DotAmi's own words, so it lives in a words file
 *   (lib/engines/shared/words.ts) and is held to the words files' rules: no verdict, no time, nothing about the
 *   person, no number that isn't on the page. Every line in the words file is held to them, not only this one. It is
 *   set on this source only; whether every source gets one is the maintainer's open question (docs/task-list.md
 *   [14p], "A line under every source's title").
 * - components/shared/citation-links.tsx draws it as one line under the title, only when it is set.
 */
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { CitationLinks } from "@/components/shared/citation-links";
import { allCatalogCitations } from "@/lib/engines/all-citations";
import { howCheckedWords } from "@/lib/engines/shared/citation-check";
import type { EngineCitation } from "@/lib/engines/shared/types";
import { sourceWords } from "@/lib/engines/shared/words";
import { writeOffCategoriesV2026 } from "@/lib/engines/writeoffs/v2026";

import { findTimeWords } from "./helpers/time-words";
import { VERDICT_WORDS, findVerdicts } from "./helpers/verdict-words";

const S67_3 = "https://laws-lois.justice.gc.ca/eng/acts/I-3.3/section-67.3.html";
/** The section's own heading, as scripts/check-quotes.mjs found it on the page on 2026-10-29. */
const HEADING = "Limitation re cost of leasing passenger vehicle";
const TITLE = `Income Tax Act s.67.3 — ${HEADING}`;
const LINE = sourceWords.pageHolds.ita67_3;

const vehicleSource = (): EngineCitation => {
  const entry = writeOffCategoriesV2026.find((w) => w.id === "writeoff-vehicle");
  expect(entry, "writeoff-vehicle").toBeDefined();
  const cited = entry!.citations.filter((c) => c.url === S67_3);
  expect(cited, "the write-off cites s.67.3's page once").toHaveLength(1);
  return cited[0]!;
};

describe("the s.67.3 source's title names only what its page holds", () => {
  it("is the Act, the section and the section's own heading", () => {
    expect(vehicleSource().title).toBe(TITLE);
  });

  it("names no provision the page doesn't hold", () => {
    const { title } = vehicleSource();
    expect(title).not.toMatch(/18\(1\)\(a\)|s\.67,|s\.67\.2\b|purpose test|reasonableness/);
    // Planted control: the title before his answer is caught.
    expect("Income Tax Act s.18(1)(a), s.67, s.67.2, s.67.3 — purpose test, reasonableness, interest and lease caps").toMatch(
      /18\(1\)\(a\)|s\.67,|s\.67\.2\b|purpose test|reasonableness/,
    );
  });

  it("keeps its address, its read, its statute check and all four provisions for Show the words", () => {
    // A guard: his answer changes the title only.
    const c = vehicleSource();
    expect(c.url).toBe(S67_3);
    expect(howCheckedWords(c)).toBe("Read by a person on 2026-10-25");
    expect(c.verification?.status).toBe("supported");
    expect(c.corpus).toEqual([
      { source: "ita", label: "18", sub: "(1)(a)" },
      { source: "ita", label: "67" },
      { source: "ita", label: "67.2" },
      { source: "ita", label: "67.3" },
    ]);
  });
});

describe("the line under its title says what the page holds", () => {
  it("is set on this source, from the words file", () => {
    expect(vehicleSource().pageHolds).toBe(LINE);
  });

  it("is set on no other source", () => {
    const others = allCatalogCitations()
      .filter(({ citation }) => "pageHolds" in citation && citation.url !== S67_3)
      .map(({ where, citation }) => `${where}: ${citation.url}`);
    expect(others).toEqual([]);
  });

  it("is one short plain sentence about the page, in the page's own terms", () => {
    expect(LINE).not.toMatch(/\n/);
    expect(LINE.length).toBeLessThanOrEqual(160);
    expect(LINE).toMatch(/\.$/);
    // What a reader looks for on the page: the section, lease charges, a passenger vehicle.
    expect(LINE).toContain("67.3");
    expect(LINE).toContain("lease charges");
    expect(LINE).toContain("passenger vehicle");
  });

  it("no line in the words file gives a verdict, a time, anything about the person, or a number that isn't on its page", () => {
    // Every `pageHolds` line, not only this one. Each line's numbers are listed here with the page they come from, so
    // a new line can't add one unseen: the list must name every line, and a line may hold only its own page's numbers.
    const NUMBERS_ON_THE_PAGE: Record<string, readonly string[]> = {
      ita67_3: ["67.3"], // the section's own number, which the page and the title hold
    };
    const lines = Object.entries(sourceWords.pageHolds);
    expect(lines.length).toBeGreaterThan(0);
    expect(Object.keys(NUMBERS_ON_THE_PAGE).sort()).toEqual(lines.map(([key]) => key).sort());
    for (const [key, line] of lines) {
      expect(line, key).not.toMatch(VERDICT_WORDS);
      expect(findVerdicts(line), key).toEqual([]);
      expect(findTimeWords(line), key).toEqual([]);
      expect(line, key).not.toMatch(/\b(you|your|you're|yours)\b/i);
      expect(line, key).not.toMatch(/\n/);
      expect(line.match(/\d[\d.,]*\d|\d/g) ?? [], key).toEqual(NUMBERS_ON_THE_PAGE[key]);
    }
    // Planted controls: each check catches what it is for.
    expect("You should keep a logbook for each day.").toMatch(VERDICT_WORDS);
    expect(findTimeWords("A limit for each 30 days of the lease.")).not.toEqual([]);
    expect("Your lease is capped.").toMatch(/\b(you|your|you're|yours)\b/i);
    expect("Up to $1,100 for 67.3".match(/\d[\d.,]*\d|\d/g)).toEqual(["1,100", "67.3"]);
  });
});

describe("the source list draws it as one line under the title, only when it is set", () => {
  const markup = (c: EngineCitation) => renderToStaticMarkup(createElement(CitationLinks, { citations: [c] }));
  // The line as the markup writes it: React escapes its apostrophe.
  const LINE_HTML = LINE.replace(/'/g, "&#x27;");

  it("draws the line once, after the title and before how the page was checked", () => {
    const html = markup(vehicleSource());
    expect(html.split(LINE_HTML)).toHaveLength(2);
    const title = html.indexOf(HEADING);
    const line = html.indexOf(LINE_HTML);
    const check = html.indexOf("Read by a person on 2026-10-25");
    expect(title).toBeGreaterThan(-1);
    expect(line).toBeGreaterThan(title);
    expect(check).toBeGreaterThan(line);
    // Its own element, a line of its own.
    expect(html).toMatch(new RegExp(`<span class="[^"]*\\bblock\\b[^"]*">${LINE_HTML.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}</span>`));
  });

  it("draws nothing more for a source without one", () => {
    const { pageHolds: _line, ...without } = vehicleSource();
    const html = markup(without as EngineCitation);
    expect(html).not.toContain(LINE_HTML);
    // The only difference the line makes is its own element.
    expect(markup(vehicleSource()).replace(/<span class="[^"]*">[^<]*<\/span>/g, (s) => (s.includes(LINE_HTML) ? "" : s))).toBe(html);
  });
});
