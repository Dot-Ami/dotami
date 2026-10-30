/**
 * scripts/check-quotes.mjs, the developer script behind a "checked by a tool" citation
 * (docs/engines/citations.md). It fetches a page, turns it into plain text and reports each quote
 * as found or not found. These tests feed it saved, invented sample pages through a fake fetch, so
 * nothing here reaches the network.
 */
import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { findQuotes, main, normaliseForMatch, pageToText, toolCheckedTargets } from "../scripts/check-quotes.mjs";
import type { FetchPage, FetchedPage } from "../scripts/check-quotes.mjs";

const FIXTURES = path.join(process.cwd(), "tests", "fixtures", "check-quotes");
const page = (name: string) => readFileSync(path.join(FIXTURES, name), "utf8");
const GOVERNMENT = page("government-page.html");
const CHANGED = page("changed-page.html");
const URL_A = "https://www.canada.ca/en/invented-a.html";
const URL_B = "https://www.canada.ca/en/invented-b.html";

/** A fake fetch: each URL answers with a saved page, or the answer given. */
function fakeFetch(pages: Record<string, FetchedPage>): { fetchPage: FetchPage; asked: string[] } {
  const asked: string[] = [];
  return {
    asked,
    fetchPage: async (url: string) => {
      asked.push(url);
      return pages[url] ?? { ok: false, status: 404, contentType: "text/html", body: "" };
    },
  };
}
const html = (body: string): FetchedPage => ({ ok: true, status: 200, contentType: "text/html; charset=utf-8", body });

/** Runs the script's main with a fake fetch and a fixed day, collecting what it prints. */
async function run(argv: string[], pages: Record<string, FetchedPage>, collect?: () => Promise<{ where: string; url: string; quotes: string[] }[]>) {
  const lines: string[] = [];
  const fake = fakeFetch(pages);
  const code = await main(argv, {
    fetchPage: fake.fetchPage,
    collect: collect ?? (async () => []),
    log: (line: string) => lines.push(line),
    today: "2026-10-11",
  });
  return { code, out: lines.join("\n"), asked: fake.asked };
}

describe("turning a page into text", () => {
  it("keeps what a reader sees and drops the head, scripts, styles, noscript and templates", () => {
    const text = pageToText(GOVERNMENT);
    expect(text).toContain("Invented registration page");
    expect(text).not.toContain("Decoy");
    expect(text).not.toContain("dataLayer");
  });

  it("decodes entities, and joins words split only by inline tags", () => {
    const text = normaliseForMatch(pageToText(GOVERNMENT));
    expect(text).toContain("small operator");
    expect(text).toContain("IA/IR schedule…");
    expect(text).toContain("Café owners and food-truck operators");
  });
});

describe("what counts as the same words", () => {
  it("only whitespace, typographic quotes and dashes are evened out", () => {
    expect(normaliseForMatch("a  \t\n b")).toBe("a b");
    expect(normaliseForMatch("“operator test” — it’s")).toBe('"operator test" - it\'s');
    expect(normaliseForMatch("food‑truck – −")).toBe("food-truck - -");
    // The soft hyphen is a line-break hint no reader sees.
    expect(normaliseForMatch("regis­tration")).toBe("registration");
  });

  it("case, punctuation, numbers and accents still have to match", () => {
    const text = pageToText(GOVERNMENT);
    expect(findQuotes(text, ["Small Operator", "$40,000 or less", "$40000 or less", "Cafe owners"])).toEqual([
      { quote: "Small Operator", found: false },
      { quote: "$40,000 or less", found: true },
      { quote: "$40000 or less", found: false },
      { quote: "Cafe owners", found: false },
    ]);
  });

  it("a quote typed with straight quotes and a hyphen matches the page's curly quotes and dash", () => {
    const text = pageToText(GOVERNMENT);
    expect(findQuotes(text, ['The agency calls this the "operator test" - it\'s applied each quarter.'])).toEqual([
      { quote: 'The agency calls this the "operator test" - it\'s applied each quarter.', found: true },
    ]);
    // Line breaks and runs of spaces in the page's source don't matter.
    expect(findQuotes(text, ["you have to register by the day after the month in which you passed it."])[0].found).toBe(true);
  });

  it("words that sit only in a script or the head are never found", () => {
    expect(findQuotes(pageToText(GOVERNMENT), ["register within thirty days of your first sale"])[0].found).toBe(false);
  });

  // A match has to be whole words: a dropped leading digit or a dropped prefix changes exactly the
  // numbers and conditions an entry relies on.
  it("a quote is found only as whole words, never inside a longer word or number", () => {
    const found = (body: string, quote: string) => findQuotes(pageToText(body), [quote])[0].found;
    expect(found("<p>revenue over $130,000 in a year</p>", "30,000 in a year")).toBe(false);
    expect(found("<p>the rule is inapplicable here</p>", "applicable here")).toBe(false);
    expect(found("<p>the rule is applicable hereafter</p>", "rule is applicable here")).toBe(false);
    expect(found("<p>a limit of $30,000.50 a year</p>", "a limit of $30,000")).toBe(false);
    expect(found("<p>a limit of 1.5 per cent</p>", "5 per cent")).toBe(false);
    // The same words standing alone are still found, with punctuation or the text's edge around them.
    expect(found("<p>revenue over $30,000 in a year.</p>", "30,000 in a year")).toBe(true);
    expect(found("<p>(the rule is applicable here)</p>", "applicable here")).toBe(true);
    expect(found("<p>applicable here</p>", "applicable here")).toBe(true);
    // A second, whole-word place on the page is found even when the first was inside a word.
    expect(found("<p>inapplicable here, but applicable here too</p>", "applicable here")).toBe(true);
  });

  it("a quote can't be stitched together from separate cells, list items or paragraphs", () => {
    const found = (body: string, quote: string) => findQuotes(pageToText(body), [quote])[0].found;
    // Two cells of one row join only through the row's own joiner, " | " (next describe), never as one run of words.
    expect(found("<table><tr><td>$30,000</td><td>or less</td></tr></table>", "$30,000 or less")).toBe(false);
    expect(found("<ul><li>You must register</li><li>within 29 days</li></ul>", "You must register within 29 days")).toBe(false);
    expect(found("<p>You must register</p><p>within 29 days</p>", "You must register within 29 days")).toBe(false);
    // Inside one block, line breaks in the page's source still don't matter.
    expect(found("<td>$30,000\n   or less</td>", "$30,000 or less")).toBe(true);
  });

  it("text the page hides (the hidden attribute, an inline display:none) is never found", () => {
    const found = (body: string, quote: string) => findQuotes(pageToText(body), [quote])[0].found;
    expect(found("<p hidden>register within thirty days</p>", "register within thirty days")).toBe(false);
    expect(found('<div style="color: red; display:none"><p>register within thirty days</p></div>', "register within thirty days")).toBe(false);
    expect(found("<div hidden><div>register within</div> thirty days</div><p>after</p>", "register within thirty days")).toBe(false);
    // Nested elements of the same name close at the right place: the text after them still counts.
    expect(found("<div hidden><div>gone</div></div><div>register within thirty days</div>", "register within thirty days")).toBe(true);
    // aria-hidden hides an element from screen readers, not from the eye, and type="hidden" is a form field.
    expect(found('<p aria-hidden="true">register within thirty days</p>', "register within thirty days")).toBe(true);
    expect(found('<input type="hidden" value="x"><p>register within thirty days</p>', "register within thirty days")).toBe(true);
  });
});

// The maintainer's answer of 2026-10-29 on his reading page (item 5, the Canada-Alberta Productivity Grant): "Teach
// the checker to read a table row as one piece". Each table row also yields one piece of its own, its cells in order
// joined by " | ", so a quote can hold a row's label cell with the line beside it ("Employer | Must contribute 25%
// …"). Every cell still is a block of its own, so every quote found before is found the same way. The invented
// table below has the shape of that page's funding table: a label cell, then a cell holding a list.
describe("reading a table row as one piece (cells joined by \" | \")", () => {
  const TABLE =
    "<table><tbody>" +
    "<tr>\n  <th><strong>Contributor</strong></th>\n  <th><strong>Training costs covered</strong></th>\n</tr>" +
    "<tr><td>Employer</td><td><ul><li>Must contribute 25% of the invented costs.</li></ul></td></tr>" +
    "<tr><td>Government of Alberta</td><td><ul><li>Contributes the other 75% of the invented cost.</li><li>An employer is eligible for up to $100,000 in this example.</li></ul></td></tr>" +
    "</tbody></table>";
  const found = (body: string, quote: string) => findQuotes(pageToText(body), [quote])[0].found;

  it("a whole row is found: its cells in order, joined by \" | \", header cells too", () => {
    expect(found(TABLE, "Employer | Must contribute 25% of the invented costs.")).toBe(true);
    expect(found(TABLE, "Contributor | Training costs covered")).toBe(true);
    // A cell holding a list reaches across the cell's edge only to its nearest item: the label and the first line.
    expect(found(TABLE, "Government of Alberta | Contributes the other 75% of the invented cost.")).toBe(true);
  });

  it("a quote spanning two rows is not found", () => {
    expect(found(TABLE, "Employer | Must contribute 25% of the invented costs. | Government of Alberta")).toBe(false);
    expect(found(TABLE, "Must contribute 25% of the invented costs. Government of Alberta")).toBe(false);
    expect(found(TABLE, "Training costs covered | Employer | Must contribute 25%")).toBe(false);
  });

  it("a cell alone is still found, as before", () => {
    expect(found(TABLE, "Must contribute 25% of the invented costs.")).toBe(true);
    expect(found(TABLE, "Contributes the other 75% of the invented cost.")).toBe(true);
    expect(found(TABLE, "An employer is eligible for up to $100,000 in this example.")).toBe(true);
    expect(found(TABLE, "Government of Alberta")).toBe(true);
  });

  it("planted control: a wrong label in front of a line is not found", () => {
    expect(found(TABLE, "Government of Alberta | Must contribute 25% of the invented costs.")).toBe(false);
    expect(found(TABLE, "Employer | Contributes the other 75% of the invented cost.")).toBe(false);
    // Without the joiner, or with another one, the label and its line are still two pieces.
    expect(found(TABLE, "Employer Must contribute 25% of the invented costs.")).toBe(false);
    expect(found(TABLE, "Employer: Must contribute 25% of the invented costs.")).toBe(false);
  });

  it("inside a cell, two list items are still two pieces, in the row too", () => {
    expect(found(TABLE, "Contributes the other 75% of the invented cost. An employer is eligible")).toBe(false);
    expect(found(TABLE, "Contributes the other 75% of the invented cost. | An employer is eligible")).toBe(false);
    // The label cell sits beside the list's first item only: it is never joined to the second.
    expect(found(TABLE, "Government of Alberta | An employer is eligible for up to $100,000 in this example.")).toBe(false);
  });

  it("a row the page hides is never read, and a row that holds another table gives no piece of its own", () => {
    expect(found("<table><tr hidden><td>Secret label here</td><td>secret line here</td></tr></table>", "Secret label here | secret line here")).toBe(false);
    const nested = "<table><tr><td>Outer label cell</td><td><table><tr><td>Inner label cell</td><td>inner line cell</td></tr></table></td></tr></table>";
    expect(found(nested, "Inner label cell | inner line cell")).toBe(true);
    expect(found(nested, "Outer label cell | Inner label cell")).toBe(false);
  });

  it("a page's own vertical bar inside one block is found as before", () => {
    expect(found("<ul><li>Red Seal Application | $150</li></ul>", "Red Seal Application | $150")).toBe(true);
  });

  it("the script reports a row quote like any other: found, with the date to record, or NOT FOUND", async () => {
    const row = "Employer | Must contribute 25% of the invented costs.";
    const ok = await run(["--url", URL_A, "--quote", row, "--quote", "Must contribute 25% of the invented costs."], { [URL_A]: html(TABLE) });
    expect(ok.code).toBe(0);
    expect(ok.out).toContain(`found      ${JSON.stringify(row)}`);
    expect(ok.out).toContain('All 2 quotes were found. To record: toolCheck: { checkedOn: "2026-10-11", quotes: [');
    const wrong = "Government of Alberta | Must contribute 25% of the invented costs.";
    const bad = await run(["--url", URL_A, "--quote", row, "--quote", wrong], { [URL_A]: html(TABLE) });
    expect(bad.code).toBe(1);
    expect(bad.out).toContain(`NOT FOUND  ${JSON.stringify(wrong)}`);
  });
});

describe("checking one page before recording a tool check (--url, --quote)", () => {
  it("every quote found: exit 0, each one listed, and the date to record", async () => {
    const r = await run(["--url", URL_A, "--quote", "a small operator", "--quote", "$40,000 or less"], { [URL_A]: html(GOVERNMENT) });
    expect(r.code).toBe(0);
    expect(r.out).toContain(`found      "a small operator"`);
    expect(r.out).toContain(`found      "$40,000 or less"`);
    expect(r.out).toContain('All 2 quotes were found. To record: toolCheck: { checkedOn: "2026-10-11", quotes: [');
    expect(r.asked).toEqual([URL_A]);
  });

  it("a quote the page no longer has: exit 1 and nothing to record", async () => {
    const r = await run(["--url", URL_A, "--quote", "a small operator", "--quote", "$40,000 or less"], { [URL_A]: html(CHANGED) });
    expect(r.code).toBe(1);
    expect(r.out).toContain(`found      "a small operator"`);
    expect(r.out).toContain(`NOT FOUND  "$40,000 or less"`);
    expect(r.out).toContain("1 of 2 quotes not found. Nothing to record.");
    expect(r.out).not.toContain("checkedOn");
  });

  it("a page that can't be fetched is not checked: exit 1", async () => {
    const r = await run(["--url", URL_A, "--quote", "a small operator"], {});
    expect(r.code).toBe(1);
    expect(r.out).toContain("could not be checked: the server answered 404");
  });

  it("a PDF is left to a person: exit 1", async () => {
    const r = await run(["--url", URL_A, "--quote", "a small operator"], {
      [URL_A]: { ok: true, status: 200, contentType: "application/pdf", body: "%PDF-1.7" },
    });
    expect(r.code).toBe(1);
    expect(r.out).toContain("could not be checked: it is a PDF, which this script doesn't read; a person reads PDFs");
  });

  it("a missing quote, an empty quote or a URL that isn't https is a usage error: exit 2, nothing fetched", async () => {
    for (const argv of [["--url", URL_A], ["--url", URL_A, "--quote", "  "], ["--url", "http://example.com", "--quote", "x"], ["--quote", "x"]]) {
      const r = await run(argv, { [URL_A]: html(GOVERNMENT) });
      expect(r.code, argv.join(" ")).toBe(2);
      expect(r.asked).toEqual([]);
    }
  });

  it("a quote of fewer than three words is a usage error: one letter or a bare number proves little", async () => {
    for (const quote of ["a", "30", "or less", "$40,000 —"]) {
      const r = await run(["--url", URL_A, "--quote", quote], { [URL_A]: html(GOVERNMENT) });
      expect(r.code, quote).toBe(2);
      expect(r.out).toContain("a quote needs at least 3 words");
      expect(r.asked).toEqual([]);
    }
  });
});

describe("checking every recorded tool check again (no arguments)", () => {
  it("only citations with a tool check are checked, each with its own quotes", () => {
    const targets = toolCheckedTargets([
      { where: "compliance a", citation: { url: URL_A, lastVerified: "2026-10-10" } },
      { where: "grants b", citation: { url: URL_B, toolCheck: { checkedOn: "2026-10-11", quotes: ["small operator"] } } },
    ]);
    expect(targets).toEqual([{ where: "grants b", url: URL_B, quotes: ["small operator"] }]);
  });

  it("reports every page, and fails when one page changed", async () => {
    const r = await run([], { [URL_A]: html(GOVERNMENT), [URL_B]: html(CHANGED) }, async () => [
      { where: "compliance a", url: URL_A, quotes: ["$40,000 or less"] },
      { where: "grants b", url: URL_B, quotes: ["$40,000 or less"] },
    ]);
    expect(r.code).toBe(1);
    expect(r.out).toContain(`compliance a  ${URL_A}`);
    expect(r.out).toContain(`grants b  ${URL_B}`);
    expect(r.out).toContain("1 of 2 quotes not found. Nothing to record.");
  });

  it("with no tool checks recorded yet, says so and passes without fetching anything", async () => {
    const r = await run([], {});
    expect(r.code).toBe(0);
    expect(r.out).toContain("No citation has a tool check yet.");
    expect(r.asked).toEqual([]);
  });
});

describe("the script itself", () => {
  const source = readFileSync(path.join(process.cwd(), "scripts", "check-quotes.mjs"), "utf8");

  it("never writes a file", () => {
    expect(source).not.toMatch(/writeFile|appendFile|createWriteStream|rmSync|renameSync|copyFile/);
  });

  it("says in its header that it is never shipped and sits outside the app's network check", () => {
    // The comment lines before the first line of code, joined into one text.
    const lines = source.split(/\r?\n/);
    const header = lines
      .slice(0, lines.findIndex((l) => !l.startsWith("//")))
      .map((l) => l.replace(/^\/\/ ?/, ""))
      .join(" ");
    expect(header).toMatch(/never shipped/i);
    expect(header).toMatch(/outside the app's network check/i);
  });
});
