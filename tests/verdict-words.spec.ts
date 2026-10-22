import { describe, expect, it } from "vitest";

import { allCatalogCitations } from "@/lib/engines/all-citations";
import { toolCheckQuotes } from "@/lib/engines/shared/citation-check";

import { OFFICIAL_QUOTE_ALLOWANCES, VERDICT_PHRASES, VERDICT_WORDS, findVerdicts } from "./helpers/verdict-words";

/**
 * The verdict lists in tests/helpers/verdict-words.ts: what they catch, what they leave alone, and that
 * the allowances for quoted official text are real quotes and the only ones needed. The screens
 * themselves are checked in a real browser by e2e/no-verdict.spec.ts.
 */

// Every quote a tool found on an official page, from every catalog: the only text that may carry a
// verdict phrase onto a screen, in the page's own voice.
const officialQuotes = [...new Set(allCatalogCitations().flatMap(({ citation }) => toolCheckQuotes(citation)))];

// The allowances for a citation's quote. The ones with a source kind (a line of the government's
// requirement text, allowed only under its label) are checked in tests/official-quotes.spec.ts.
const citationAllowances = OFFICIAL_QUOTE_ALLOWANCES.filter((a) => !a.sourceKind);

describe("the phrases a screen may never show", () => {
  it("catches each phrase on the list, however it is capitalised", () => {
    const samples: Record<string, string> = {
      "you should": "You should incorporate first.",
      "you ought to": "You ought to register now.",
      "you'd better": "You'd better register.",
      "we recommend": "We recommend the apprentice road.",
      "highly recommend": "Highly recommend this road",
      "suggested": "Suggested future",
      recommended: "Recommended for most people",
      "our recommendation": "Our recommendation: register.",
      "best option": "This is the best option for a trade.",
      "best for you": "The road that is best for you",
      "the right choice": "Incorporating is the right choice here.",
      "top pick": "Top pick",
      "first choice": "First choice",
      "#1": "#1 Apprentice to your own shop",
      "no. 1": "No. 1 future",
      "number one": "The number one future",
      "ranked first": "Ranked first of the futures",
      "top-rated": "Top-rated future",
      "most popular": "Most popular",
      // The competitive landscape's own verdicts (docs/architecture/competitive-landscape.md § 6, 2026-10-17).
      crowded: "This line of work is crowded.",
      saturated: "A saturated market",
      "room for you": "There's room for you here.",
    };
    // Every phrase on the list has a sample, so none is added without being tried.
    expect(Object.keys(samples).sort()).toEqual(VERDICT_PHRASES.map((p) => p.phrase).sort());
    for (const [phrase, text] of Object.entries(samples)) {
      const found = findVerdicts(text);
      expect(found.length, text).toBeGreaterThan(0);
      expect(found[0], text).toMatch(new RegExp(`^${phrase.replace(/[.*+?^${}()|[\]\\#]/g, "\\$&")}: `));
    }
  });

  it("catches the common rewordings, whoever is made to say it", () => {
    // Each of these got past the first version of the list (found in review, 2026-10-14).
    const rewordings = [
      "DotAmi recommends this road.",
      "DotAmi recommends the apprentice road.",
      "I recommend the apprentice road.",
      "I recommend this future.",
      "We'd recommend starting here.",
      "We would recommend the general road.",
      "We strongly suggest a lawyer.",
      "We advise registering first.",
      "Our top recommendation",
      "Our suggestion: incorporate.",
      "Our pick for you",
      "Highly recommend this road",
      "Suggested future",
      "1st choice",
      "First choice",
      "No. 1 future",
      "Top-rated future",
      "Most popular",
      "The smartest choice is road 1.",
      "This road is ideal for you.",
      "Best fit for you",
      "Your best bet is the apprentice road.",
      "The best way to start is a sole proprietorship.",
      "You shouldn't register yet.",
      "You’d better register.",
      "You had better register.",
    ];
    for (const text of rewordings) expect(findVerdicts(text), text).not.toEqual([]);
  });

  it("matches across a line break or a run of spaces, as a screen's text can split a phrase", () => {
    // innerText puts a newline at a block edge, so a badge laid out in two blocks reads "Top\npick".
    for (const text of ["You\nshould register first.", "Top\npick", "we   recommend\tthis"]) {
      expect(findVerdicts(text), JSON.stringify(text)).not.toEqual([]);
    }
  });

  it("leaves alone a recommendation that is someone else's, named as theirs, and saying nothing is one", () => {
    const neutral = [
      // The apprentice road's own line, which says the province recommends legal advice (lib/engines/roads/v2026/).
      "You've chosen a business form (sole proprietorship, partnership or corporation); if you need help deciding, alberta.ca highly recommends legal advice.",
      // The cockpit's legend (components/cockpit/strategy-map.tsx).
      "Compass, not GPS — nothing here is a recommendation.",
      // The skills list's licence note (lib/engines/oasis/v2026/licence.ts).
      "The data is shown with the attribution line and a link to this page, and nothing in DotAmi suggests the government endorses it or anyone's use of the list.",
    ];
    for (const text of neutral) expect(findVerdicts(text), text).toEqual([]);
  });

  it("leaves alone what DotAmi says instead: the order things come in, counts, and that it ranks nothing", () => {
    const neutral = [
      "In the order they were written, not ranked. More futures are being written.",
      "the order steps happen, not importance",
      "In the order DotAmi asks them, not importance.",
      "The road splits here: you choose",
      "it shows what you told DotAmi and where each fact comes from, and it ranks nothing.",
      "Step 1 · Register your business name, if you use one",
      "1 · Register your business name",
      "Of the 2 futures listed, 2 include a business of your own.",
      "Issue 41",
      "a #10 envelope",
      // Settings, where a setting's default and its choices sit in two blocks: read whole, the words join
      // up as "asked first CHOICES", which is a label after a label, not a rank (found in a browser run).
      "DEFAULT\non, asked first\nCHOICES\non · off",
    ];
    for (const text of neutral) expect(findVerdicts(text), text).toEqual([]);
  });

  it("says where a phrase was, with the words around it", () => {
    expect(findVerdicts("Your road. We recommend the first step. Then the second.")).toEqual([
      "we recommend: “…Your road. We recommend the first step. Then the second.…”",
    ]);
  });
});

describe("the allowances for quoted official text", () => {
  it("each one is word for word a quote a tool found on an official page, and says why it is allowed", () => {
    for (const allowance of citationAllowances) {
      expect(officialQuotes, allowance.text).toContain(allowance.text);
      expect(allowance.why.length, allowance.text).toBeGreaterThan(20);
      expect(allowance.where.length, allowance.text).toBeGreaterThan(10);
    }
  });

  it("each one is needed: it holds a verdict phrase, which the allowance takes out", () => {
    for (const allowance of citationAllowances) {
      expect(VERDICT_PHRASES.some((p) => p.pattern.test(allowance.text)), allowance.text).toBe(true);
      expect(findVerdicts(`Sources: “${allowance.text}”`), allowance.text).toEqual([]);
    }
  });

  it("no other official quote in the catalogs holds a verdict phrase: a new one needs its own allowance and reason", () => {
    const allowed = new Set(OFFICIAL_QUOTE_ALLOWANCES.map((a) => a.text));
    const needing = officialQuotes.filter((q) => !allowed.has(q) && findVerdicts(q).length > 0);
    expect(needing).toEqual([]);
  });

  it("an allowance with a source kind says where and why, holds a verdict phrase, and isn't a catalog quote (those need no kind)", () => {
    const byKind = OFFICIAL_QUOTE_ALLOWANCES.filter((a) => a.sourceKind);
    expect(byKind.length).toBeGreaterThan(0);
    for (const allowance of byKind) {
      expect(allowance.why.length, allowance.text).toBeGreaterThan(20);
      expect(allowance.where.length, allowance.text).toBeGreaterThan(10);
      expect(VERDICT_PHRASES.some((p) => p.pattern.test(allowance.text)), allowance.text).toBe(true);
      expect(officialQuotes, allowance.text).not.toContain(allowance.text);
      // In quote marks with no label, it is caught: the kind's label is what lets it through.
      expect(findVerdicts(`Words found on the page: “${allowance.text}”`), allowance.text).not.toEqual([]);
    }
  });

  it("an allowance covers only its own words: the same phrase elsewhere on the screen is still caught", () => {
    const quote = OFFICIAL_QUOTE_ALLOWANCES[0]!.text;
    expect(findVerdicts(`“${quote}” This road is recommended.`)).toHaveLength(1);
  });

  it("an allowance covers its words only inside quote marks, as a source's quote shows: copied in as DotAmi's own line, they are caught", () => {
    for (const allowance of citationAllowances) {
      expect(findVerdicts(`Open a bank account. ${allowance.text}`), allowance.text).not.toEqual([]);
      expect(findVerdicts(`Words found on the page: “${allowance.text}”`), allowance.text).toEqual([]);
      // The plan page and a laid-out panel can split a quote over lines; it is still the quote.
      expect(findVerdicts(`“${allowance.text.replace(/ /, "\n")}”`), allowance.text).toEqual([]);
    }
  });
});

describe("the single words DotAmi's own sentences are checked against", () => {
  it("catch the words, and not the counts", () => {
    for (const text of ["You're ready to open.", "That is enough savings.", "the best road", "you should register", "on track", "a score of 4"]) {
      expect(text, text).toMatch(VERDICT_WORDS);
    }
    for (const text of ["3 of 13 marked done", "Not priced yet", "In the order they were written, not ranked."]) {
      expect(text, text).not.toMatch(VERDICT_WORDS);
    }
  });
});
