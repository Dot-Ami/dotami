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

import { allCatalogCitations } from "@/lib/engines/all-citations";
import { citationCheckProblems, howChecked, howCheckedWords, isCheckFirst } from "@/lib/engines/shared/citation-check";
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

const QUOTE = "the exact words here";
const PERSON: EngineCitation = { ...BASE, lastVerified: "2026-10-10", readBy: "person" };
// A read whose reader nobody recorded: most catalog entries written before 2026-10-11.
const UNRECORDED: EngineCitation = { ...BASE, lastVerified: "2026-06-08" };
const MODEL: EngineCitation = { ...BASE, lastVerified: "2026-10-06", readBy: "model" };
const TOOL: EngineCitation = { ...BASE, toolCheck: { checkedOn: "2026-10-11", quotes: [QUOTE] } };
const BOTH: EngineCitation = { ...BASE, lastVerified: "2026-09-01", readBy: "person", toolCheck: { checkedOn: "2026-10-11", quotes: [QUOTE] } };

const TOOL_WORDS = "Checked by a tool on 2026-10-11: it found on the page the exact words this entry relies on. Not read by a person yet.";

describe("the words every screen shows", () => {
  it("a read a person is recorded as doing says so, with its date", () => {
    expect(howCheckedWords(PERSON)).toBe("Read by a person on 2026-10-10");
    expect(howChecked(PERSON)).toEqual({ kind: "person", on: "2026-10-10" });
  });

  it("a read with no record of who did it never claims a person", () => {
    expect(howCheckedWords(UNRECORDED)).toBe("Read on 2026-06-08. Who read it wasn't recorded.");
    expect(howChecked(UNRECORDED)).toEqual({ kind: "read", on: "2026-06-08" });
  });

  it("a read by an AI model says so, and that no person has read it", () => {
    expect(howCheckedWords(MODEL)).toBe("Read by an AI model on 2026-10-06. Not read by a person yet.");
    expect(howChecked(MODEL)).toEqual({ kind: "model", on: "2026-10-06" });
  });

  it("a tool check says what the tool did and that no person has read it, without pointing at words it doesn't show", () => {
    expect(howCheckedWords(TOOL)).toBe(TOOL_WORDS);
    expect(howChecked(TOOL)).toEqual({ kind: "tool", on: "2026-10-11", quotes: [QUOTE] });
  });

  it("when a read and a tool check both exist, the read wins", () => {
    expect(howCheckedWords(BOTH)).toBe("Read by a person on 2026-09-01");
    expect(howCheckedWords({ ...UNRECORDED, toolCheck: { checkedOn: "2026-10-11", quotes: [QUOTE] } })).toBe(
      "Read on 2026-06-08. Who read it wasn't recorded.",
    );
  });

  it("only checks that say no person has read the page are shown as check first (amber)", () => {
    expect([PERSON, UNRECORDED, MODEL, TOOL, BOTH].map(isCheckFirst)).toEqual([false, false, true, true, false]);
  });
});

describe("what the catalogs say about who read them", () => {
  const all = allCatalogCitations();

  it("the GST/HST small-supplier page, which moved and was re-read only by a model, says so", () => {
    const gst = all.filter(({ citation }) => citation.url.endsWith("/when-register-charge.html"));
    expect(gst.length).toBeGreaterThan(0);
    for (const { citation } of gst) expect(howChecked(citation)).toEqual({ kind: "model", on: "2026-10-06" });
  });

  it("the record-keeping page under Delete doesn't claim a person read it", () => {
    const rk = all.filter(({ where }) => where === "compliance cra-business-records-retention");
    expect(rk.length).toBe(1);
    expect(howChecked(rk[0].citation).kind).not.toBe("person");
  });

  it("the T2125 lines the maintainer checked on 2026-10-10 say a person read them", () => {
    const lines = all.filter(({ where }) => where.startsWith("taxlines "));
    expect(lines.length).toBeGreaterThan(0);
    for (const { citation } of lines) expect(howChecked(citation)).toEqual({ kind: "person", on: "2026-10-10" });
  });
});

describe("the rules a citation's check follows", () => {
  const TODAY = "2026-10-11";

  it("a read (by anyone), a tool check, or both, are all fine", () => {
    expect(citationCheckProblems(PERSON, TODAY)).toEqual([]);
    expect(citationCheckProblems(UNRECORDED, TODAY)).toEqual([]);
    expect(citationCheckProblems(MODEL, TODAY)).toEqual([]);
    expect(citationCheckProblems(TOOL, TODAY)).toEqual([]);
    expect(citationCheckProblems(BOTH, TODAY)).toEqual([]);
  });

  it("a read is never dated after today either", () => {
    expect(citationCheckProblems({ ...BASE, lastVerified: "2027-01-01" } as EngineCitation, TODAY)).toEqual([
      "read date 2027-01-01 is after today (2026-10-11)",
    ]);
    expect(citationCheckProblems({ ...PERSON, lastVerified: TODAY }, TODAY)).toEqual([]);
  });

  it("who read it is a person or an AI model, and only on a citation that has a read date", () => {
    expect(citationCheckProblems({ ...TOOL, readBy: "person" } as unknown as EngineCitation, TODAY)).toEqual([
      'readBy "person" needs a read date (lastVerified)',
    ]);
    expect(citationCheckProblems({ ...UNRECORDED, readBy: "intern" } as unknown as EngineCitation, TODAY)).toEqual([
      'readBy "intern" is not "person" or "model"',
    ]);
  });

  it("a tool check's quote has at least three words: one letter or a bare number proves little", () => {
    for (const q of ["a", "30", "or less", "$40,000 —"]) {
      const short = { ...BASE, toolCheck: { checkedOn: "2026-10-11", quotes: [QUOTE, q] } } as EngineCitation;
      expect(citationCheckProblems(short, TODAY), q).toEqual(["tool check quote 2 has fewer than 3 words"]);
    }
  });

  it("a citation with neither is refused", () => {
    // Cast: the type already refuses this; the catalogs are checked at run time too.
    const neither = { ...BASE } as unknown as EngineCitation;
    expect(citationCheckProblems(neither, TODAY)).toEqual(["has neither a read (lastVerified) nor a tool check"]);
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
      'read date "10/10/2026" is not a real day written YYYY-MM-DD',
    ]);
    expect(
      citationCheckProblems({ ...BASE, toolCheck: { checkedOn: "2026-02-30", quotes: [QUOTE] } } as EngineCitation, TODAY),
    ).toEqual(['tool check date "2026-02-30" is not a real day written YYYY-MM-DD']);
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
          // Checked before every read here, so a catalog date taken from tool checks would show.
          { ...BASE, title: "Older tool page", url: "https://www.canada.ca/c.html", toolCheck: { checkedOn: "2026-05-01", quotes: [QUOTE] } },
          // Read before both, by someone nobody recorded: a read of any kind dates the catalog.
          { ...UNRECORDED, title: "Unrecorded page", url: "https://www.canada.ca/d.html" },
        ],
      },
    ],
    disclaimer: "Not advice.",
  };

  it("says how each source was checked, in the same words as the screens", () => {
    const md = renderPlaybookMarkdown(skeleton);
    expect(md).toContain("- [Read page](https://www.canada.ca/a.html) — CRA / CA · Read by a person on 2026-10-10");
    expect(md).toContain(`- [Tool page](https://www.canada.ca/b.html) — CRA / CA · ${TOOL_WORDS}`);
    expect(md).toContain("- [Unrecorded page](https://www.canada.ca/d.html) — CRA / CA · Read on 2026-06-08. Who read it wasn't recorded.");
    expect(md).not.toMatch(/· verified /);
  });

  it("lists the words a tool check found under its line, so a reader can see what was checked", () => {
    const md = renderPlaybookMarkdown(skeleton);
    expect(md).toContain(`- [Tool page](https://www.canada.ca/b.html) — CRA / CA · ${TOOL_WORDS}\n  - *Words found on the page:* "${QUOTE}"\n  - *Note:*`);
    // A read source has no quotes to list.
    expect(md).toContain("Read by a person on 2026-10-10\n  - *Note:*");
  });

  it("dates the catalog by the oldest read of any kind (a tool check is not a read), and counts the sources a person read", () => {
    const md = renderPlaybookMarkdown(skeleton);
    expect(md).toContain("catalog_last_verified: 2026-06-08\n");
    expect(md).toContain("sources_read_by_a_person: 1 of 4\n");
    expect(md).not.toContain("sources_not_read_by_a_person");
    const onlyTools = renderPlaybookMarkdown({ ...skeleton, sections: [{ ...skeleton.sections[0], citations: skeleton.sections[0].citations.slice(1, 3) }] });
    expect(onlyTools).toContain("catalog_last_verified: n/a\n");
    expect(onlyTools).toContain("sources_read_by_a_person: 0 of 2\n");
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

  it("nothing in app/, components/ or lib/ reads .lastVerified or .readBy except that file", () => {
    const root = process.cwd();
    const offenders = ["app", "components", "lib"]
      .flatMap((d) => filesUnder(path.join(root, d)))
      .map((f) => path.relative(root, f).split(path.sep).join("/"))
      .filter((f) => f !== "lib/engines/shared/citation-check.ts")
      .filter((f) => /\.(lastVerified|readBy)\b/.test(readFileSync(path.join(root, f), "utf8")));
    expect(offenders).toEqual([]);
  });
});
