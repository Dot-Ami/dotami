/**
 * How a source was checked: read by a person, or checked by a tool (decided 2026-10-11, option B;
 * docs/engines/citations.md).
 *
 * Every screen that shows a citation's date gets its words from one function, so these tests pin
 * those words, the rules a citation's check must follow, the playbook export, and that no screen
 * reads a citation's date by itself and prints "verified" again.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { citationCheckProblems, howChecked, howCheckedWords } from "@/lib/engines/shared/citation-check";
import type { EngineCitation } from "@/lib/engines/shared/types";
import { renderPlaybookMarkdown } from "@/lib/playbook/render-markdown";
import type { PlaybookSkeleton } from "@/lib/playbook/types";

const BASE = {
  title: "An invented page",
  authority: "CRA",
  jurisdiction: "CA",
  url: "https://www.canada.ca/en/invented.html",
  note: "Invented for this test.",
} as const;

const PERSON: EngineCitation = { ...BASE, lastVerified: "2026-10-10" };
const TOOL: EngineCitation = { ...BASE, toolCheck: { checkedOn: "2026-10-11", quotes: ["the exact words"] } };
const BOTH: EngineCitation = { ...BASE, lastVerified: "2026-09-01", toolCheck: { checkedOn: "2026-10-11", quotes: ["the exact words"] } };

const TOOL_WORDS = "Checked by a tool on 2026-10-11: the quoted words were found on the page. Not read by a person yet.";

describe("the words every screen shows", () => {
  it("a person's read says so, with its date", () => {
    expect(howCheckedWords(PERSON)).toBe("Read by a person on 2026-10-10");
    expect(howChecked(PERSON)).toEqual({ kind: "person", on: "2026-10-10" });
  });

  it("a tool check says what the tool did and that no person has read it", () => {
    expect(howCheckedWords(TOOL)).toBe(TOOL_WORDS);
    expect(howChecked(TOOL)).toEqual({ kind: "tool", on: "2026-10-11", quotes: ["the exact words"] });
  });

  it("when both exist, the person's read wins", () => {
    expect(howCheckedWords(BOTH)).toBe("Read by a person on 2026-09-01");
  });
});

describe("the rules a citation's check follows", () => {
  const TODAY = "2026-10-11";

  it("a person's date, a tool check, or both, are all fine", () => {
    expect(citationCheckProblems(PERSON, TODAY)).toEqual([]);
    expect(citationCheckProblems(TOOL, TODAY)).toEqual([]);
    expect(citationCheckProblems(BOTH, TODAY)).toEqual([]);
  });

  it("a citation with neither is refused", () => {
    // Cast: the type already refuses this; the catalogs are checked at run time too.
    const neither = { ...BASE } as unknown as EngineCitation;
    expect(citationCheckProblems(neither, TODAY)).toEqual(["has neither a person's read (lastVerified) nor a tool check"]);
  });

  it("a tool check needs at least one quote, and no empty quote", () => {
    const none = { ...BASE, toolCheck: { checkedOn: "2026-10-11", quotes: [] } } as EngineCitation;
    expect(citationCheckProblems(none, TODAY)).toEqual(["tool check has no quote"]);
    const blank = { ...BASE, toolCheck: { checkedOn: "2026-10-11", quotes: ["the exact words", "   "] } } as EngineCitation;
    expect(citationCheckProblems(blank, TODAY)).toEqual(["tool check quote 2 is empty"]);
  });

  it("a tool check's date is never after today", () => {
    const tomorrow = { ...BASE, toolCheck: { checkedOn: "2026-10-12", quotes: ["the exact words"] } } as EngineCitation;
    expect(citationCheckProblems(tomorrow, TODAY)).toEqual(["tool check date 2026-10-12 is after today (2026-10-11)"]);
    expect(citationCheckProblems(TOOL, "2026-10-11")).toEqual([]);
  });

  it("dates are written YYYY-MM-DD and are real days", () => {
    expect(citationCheckProblems({ ...BASE, lastVerified: "10/10/2026" } as EngineCitation, TODAY)).toEqual([
      'person\'s read date "10/10/2026" is not written YYYY-MM-DD',
    ]);
    expect(
      citationCheckProblems({ ...BASE, toolCheck: { checkedOn: "2026-02-30", quotes: ["x"] } } as EngineCitation, TODAY),
    ).toEqual(['tool check date "2026-02-30" is not written YYYY-MM-DD']);
  });
});

describe("the playbook export", () => {
  const skeleton: PlaybookSkeleton = {
    scenarioId: "s-1",
    profile: {
      name: "Invented",
      type: "service",
      province: "AB",
      targetRevenueY1: 0,
      targetRevenueY3: 0,
      structure: "sole-prop",
      structureSource: "assumed",
      employmentStatus: "self-employed",
      hireFirst: false,
      activityTags: [],
      stage: "idea",
    } as unknown as PlaybookSkeleton["profile"],
    decisions: [],
    sections: [
      {
        stageKey: "stage-0",
        heading: "Stage 0",
        nodes: [],
        citations: [
          { ...PERSON, title: "Read page", url: "https://www.canada.ca/a.html" },
          { ...TOOL, title: "Tool page", url: "https://www.canada.ca/b.html" },
          // Checked before the person's read above, so a catalog date taken from tool checks would show.
          { ...BASE, title: "Older tool page", url: "https://www.canada.ca/c.html", toolCheck: { checkedOn: "2026-09-30", quotes: ["x"] } },
        ],
      },
    ],
    disclaimer: "Not advice.",
  };

  it("says how each source was checked, in the same words as the screens", () => {
    const md = renderPlaybookMarkdown(skeleton);
    expect(md).toContain("- [Read page](https://www.canada.ca/a.html) — CRA / CA · Read by a person on 2026-10-10");
    expect(md).toContain(`- [Tool page](https://www.canada.ca/b.html) — CRA / CA · ${TOOL_WORDS}`);
    expect(md).not.toMatch(/· verified /);
  });

  it("dates the catalog by the oldest person's read only, and counts the sources no person has read", () => {
    const md = renderPlaybookMarkdown(skeleton);
    expect(md).toContain("catalog_last_verified: 2026-10-10\n");
    expect(md).toContain("sources_not_read_by_a_person: 2");
    const allRead = renderPlaybookMarkdown({ ...skeleton, sections: [{ ...skeleton.sections[0], citations: [skeleton.sections[0].citations[0]] }] });
    expect(allRead).not.toContain("sources_not_read_by_a_person");
  });
});

describe("one place reads a citation's date", () => {
  // Every screen, the playbook and the readout go through lib/engines/shared/citation-check.ts, so
  // none of them can print a person's date for a tool check, or "verified" for either.
  function filesUnder(dir: string): string[] {
    return readdirSync(dir).flatMap((name) => {
      const full = path.join(dir, name);
      if (statSync(full).isDirectory()) return filesUnder(full);
      return /\.(ts|tsx)$/.test(name) ? [full] : [];
    });
  }

  it("nothing in app/, components/ or lib/ reads .lastVerified except that file", () => {
    const root = process.cwd();
    const offenders = ["app", "components", "lib"]
      .flatMap((d) => filesUnder(path.join(root, d)))
      .map((f) => path.relative(root, f).split(path.sep).join("/"))
      .filter((f) => f !== "lib/engines/shared/citation-check.ts")
      .filter((f) => /\.lastVerified\b/.test(readFileSync(path.join(root, f), "utf8")));
    expect(offenders).toEqual([]);
  });
});
