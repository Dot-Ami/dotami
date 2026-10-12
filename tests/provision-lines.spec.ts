import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ProvisionText } from "@/components/shared/citation-links";
import { provisionLines, type ProvisionLine } from "@/lib/law/provision-lines";

/**
 * "Show the words" draws a provision with its paragraph breaks (#9).
 *
 * The law store hands a provision over as one string: the Act's paragraphs, subparagraphs and the
 * marginal notes between them run together with no space ("…for a taxation year,(a)no amount…",
 * "…business or property;Capital outlay or loss(b)an outlay…"). The fixtures in
 * tests/fixtures/provision-text/ are the store's own answers, read through its contract
 * (`contract/lookup.py`, the same call /api/law/provision makes) on 2026-10-12: the Income Tax Act
 * current to 2026-06-14 and the Income Tax Regulations current to 2026-06-21.
 *
 * The split is for the eye only: the words are never changed, so the lines put back together are
 * the store's string, character for character.
 */
type Fixture = { text: string; documentCurrency: string; source: string; label: string; sub: string | null };

function fixture(name: string): Fixture {
  return JSON.parse(readFileSync(new URL(`./fixtures/provision-text/${name}`, import.meta.url), "utf8")) as Fixture;
}

/** A line as "depth|start of its text", or "depth|note: …" for a marginal note: easy to read in a failure. */
function shape(lines: ProvisionLine[], chars = 24): string[] {
  return lines.map((l) => `${l.depth}|${l.note ? "note: " : ""}${l.text.slice(0, chars)}`);
}

const ITA_18_12 = fixture("ita-18-12.json");
const ITA_18_1 = fixture("ita-18-1-start.json");
const ITR_1100_2_C3 = fixture("itr-1100-2-c3.json");

describe("the words are never changed", () => {
  it.each([
    ["ITA 18(12)", ITA_18_12.text],
    ["ITA 18(1), paragraphs (a) to (l)", ITA_18_1.text],
    ["Reg. 1100(2)(c.3)", ITR_1100_2_C3.text],
  ])("%s: the lines put back together are the store's text, character for character", (_name, text) => {
    expect(provisionLines(text).map((l) => l.text).join("")).toBe(text);
  });

  it("gives one line for text with no paragraph labels, and none for no text", () => {
    expect(provisionLines("No deduction shall be made.")).toEqual([{ text: "No deduction shall be made.", depth: 0, note: false }]);
    expect(provisionLines("")).toEqual([]);
  });
});

describe("ITA 18(12), the work-space rule the issue names", () => {
  const lines = provisionLines(ITA_18_12.text);

  it("puts the subsection, each paragraph and each subparagraph on its own line, indented by level", () => {
    expect(shape(lines)).toEqual([
      "0|(12)Notwithstanding any ",
      "1|(a)no amount shall be de",
      "2|(i)the individual’s prin",
      "2|(ii)used exclusively for",
      "1|(b)if the conditions set",
      "1|(c)any amount not deduct",
      // The store's walk ends on the next subsection's marginal note; it gets a line of its own.
      "0|note: When s. (15) applies to ",
    ]);
  });

  it("keeps a reference to other paragraphs inside the sentence: \"subparagraph (a)(i) or (ii)\", \"paragraphs 18(12)(a) and 18(12)(b)\"", () => {
    const b = lines.find((l) => l.text.startsWith("(b)"))!;
    expect(b.text).toContain("subparagraph (a)(i) or (ii) are met");
    const c = lines.find((l) => l.text.startsWith("(c)"))!;
    expect(c.text).toContain("paragraph 18(12)(b) in computing");
    expect(c.text).toContain("paragraphs 18(12)(a) and 18(12)(b), may be deducted");
  });

  it("leaves \"and\" and \"or\" at the end of the line they close, as the Act prints them", () => {
    expect(lines[2].text.endsWith("principal place of business, or")).toBe(true);
    expect(lines[4].text.endsWith("section 34.1; and")).toBe(true);
  });
});

describe("Reg. 1100(2)(c.3), the Class 50 rate the issue's spec quotes", () => {
  it("splits (c.3) and its two subparagraphs; (i) after (c.3) is a subparagraph, not paragraph (i)", () => {
    expect(shape(provisionLines(ITR_1100_2_C3.text), 30)).toEqual([
      "1|(c.3)if the class is Class 50,",
      "2|(i)9/11, for property that was",
      "2|(ii)nil, for property that bec",
    ]);
  });
});

describe("ITA 18(1), paragraphs (a) to (l): marginal notes, and the letter (i) next to the numeral (i)", () => {
  const lines = provisionLines(ITA_18_1.text);

  it("draws the section heading and every marginal note on a line of its own, above the paragraph it names", () => {
    expect(shape(lines)).toEqual([
      "0|note: General limitations",
      "0|18(1)In computing the in",
      "1|note: General limitation",
      "1|(a)an outlay or expense ",
      "1|note: Capital outlay or loss",
      "1|(b)an outlay, loss or re",
      "1|note: Limitation re exempt inc",
      "1|(c)an outlay or expense ",
      "1|note: Annual value of property",
      "1|(d)the annual value of p",
      "1|note: Reserves, etc.",
      "1|(e)an amount as, or on a",
      "1|note: Unpaid claims under insu",
      "1|(e.1)an amount in respec",
      "1|note: Payments on discounted b",
      "1|(f)an amount paid or pay",
      "1|note: Payments on income bonds",
      "1|(g)an amount paid by a c",
      "2|(i)to afford relief to t",
      "2|(ii)in place of or as an",
      "1|note: Personal and living expe",
      "1|(h)personal or living ex",
      "1|note: Limitation re employer’s",
      // Paragraph (i), the letter after (h): not a subparagraph of (h).
      "1|(i)an amount paid by an ",
      "1|note: Limitation re employer’s",
      "1|(j)an amount paid by an ",
      "1|note: Limitation re employer’s",
      "1|(k)an amount paid by an ",
      "2|(i)an employees profit s",
      "2|(ii)a deferred profit sh",
      "2|(iii)a pooled registered",
      "1|note: Use of recreational faci",
      "1|(l)an outlay or expense ",
      "2|(i)for the use or mainte",
      "2|(ii)as membership fees o",
    ]);
  });

  it("splits a subparagraph that follows a year, \"…since 1930(i)to afford…\", and not a reference, \"…paragraph 20(1)(f) except…\"", () => {
    expect(lines.find((l) => l.text.startsWith("(g)"))!.text.endsWith("since 1930")).toBe(true);
    expect(lines.find((l) => l.text.startsWith("(f)"))!.text).toContain("described in paragraph 20(1)(f) except as expressly permitted");
  });

  it("keeps words in brackets that aren't a label inside their line", () => {
    expect(lines.at(-1)!.text).toContain("(whether initiation fees or otherwise)");
  });
});

describe("text typed with spaces, as a person copies it from the Act's web page", () => {
  it("splits on a label after a comma, a semicolon, a colon, or \", and\" / \"; or\"", () => {
    const text = "(c.3) if the class is Class 50, (i) 9/11, for property acquired before 2027, and (ii) nil, for property after 2026;";
    expect(provisionLines(text).map((l) => [l.depth, l.text])).toEqual([
      [1, "(c.3) if the class is Class 50, "],
      [2, "(i) 9/11, for property acquired before 2027, and "],
      [2, "(ii) nil, for property after 2026;"],
    ]);
  });

  it("does not split a list of references: \"paragraphs (a), (b) or (c)\"", () => {
    const text = "an amount described in paragraphs (a), (b) or (c) of the definition";
    expect(provisionLines(text)).toHaveLength(1);
  });
});

describe("the panel draws the lines", () => {
  it("one paragraph per line, indented by level, a marginal note in small italics, and the cut-off mark on the last line", () => {
    const html = renderToStaticMarkup(createElement(ProvisionText, { text: ITR_1100_2_C3.text, more: true }));
    const paragraphs = html.match(/<p[ >]/g) ?? [];
    expect(paragraphs).toHaveLength(3);
    expect(html).toContain('<p class="whitespace-pre-wrap pl-3">(c.3)if the class is Class 50,</p>');
    expect(html).toContain('<p class="whitespace-pre-wrap pl-6">(i)9/11, for property');
    expect(html).toMatch(/after 2026, …<\/p><\/div>$/);

    const withNote = renderToStaticMarkup(createElement(ProvisionText, { text: ITA_18_12.text, more: false }));
    expect(withNote).toContain('<p class="whitespace-pre-wrap pl-0 text-[10px] italic text-stone">When s. (15) applies to money lenders</p>');
    expect(withNote).not.toContain("…");
  });
});
