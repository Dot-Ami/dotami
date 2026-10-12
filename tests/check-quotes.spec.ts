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
});

describe("checking one page before recording a tool check (--url, --quote)", () => {
  it("every quote found: exit 0, each one listed, and the date to record", async () => {
    const r = await run(["--url", URL_A, "--quote", "small operator", "--quote", "$40,000 or less"], { [URL_A]: html(GOVERNMENT) });
    expect(r.code).toBe(0);
    expect(r.out).toContain(`found      "small operator"`);
    expect(r.out).toContain(`found      "$40,000 or less"`);
    expect(r.out).toContain('All 2 quotes were found. To record: toolCheck: { checkedOn: "2026-10-11", quotes: [');
    expect(r.asked).toEqual([URL_A]);
  });

  it("a quote the page no longer has: exit 1 and nothing to record", async () => {
    const r = await run(["--url", URL_A, "--quote", "small operator", "--quote", "$40,000 or less"], { [URL_A]: html(CHANGED) });
    expect(r.code).toBe(1);
    expect(r.out).toContain(`found      "small operator"`);
    expect(r.out).toContain(`NOT FOUND  "$40,000 or less"`);
    expect(r.out).toContain("1 of 2 quotes not found. Nothing to record.");
    expect(r.out).not.toContain("checkedOn");
  });

  it("a page that can't be fetched is not checked: exit 1", async () => {
    const r = await run(["--url", URL_A, "--quote", "small operator"], {});
    expect(r.code).toBe(1);
    expect(r.out).toContain("could not be checked: the server answered 404");
  });

  it("a PDF is left to a person: exit 1", async () => {
    const r = await run(["--url", URL_A, "--quote", "small operator"], {
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
    const header = source.slice(0, source.indexOf("*/"));
    expect(header).toMatch(/never shipped/i);
    expect(header).toMatch(/outside the app's network check/i);
  });
});
