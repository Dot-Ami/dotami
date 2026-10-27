/**
 * The maintainer's reads of 2026-10-25 (docs/engines/citations.md, § The maintainer's reads of 2026-10-25): he read
 * 31 pages in full and ticked each one on his reading list that day. Every catalog citation of one of those pages
 * records that read (`lastVerified` "2026-10-25", `readBy` "person"), so its card says "Read by a person on
 * 2026-10-25"; a tool check it had stays (rule 5), and no other citation claims a read of that day.
 *
 * The pages come from tests/fixtures/maintainer-reads-2026-10-25.ts, copied from his list, never from a catalog, so
 * a change to a catalog's address can't move the test with it.
 */
import { describe, expect, it } from "vitest";

import { allCatalogCitations, type ListedCitation } from "@/lib/engines/all-citations";
import { howCheckedWords, isCheckFirst } from "@/lib/engines/shared/citation-check";

import { MAINTAINER_READ_DAY, MAINTAINER_READ_PAGES } from "./fixtures/maintainer-reads-2026-10-25";

const all = allCatalogCitations();
const readUrls = new Set(MAINTAINER_READ_PAGES.map((page) => page.url));

/** What is wrong with a citation of a page he read, in words; empty when it records his read of that day. */
function readProblems(c: ListedCitation): string[] {
  const problems: string[] = [];
  if (c.lastVerified !== MAINTAINER_READ_DAY) problems.push(`read date ${c.lastVerified ?? "none"}, not ${MAINTAINER_READ_DAY}`);
  if (c.readBy !== "person") problems.push(`readBy ${c.readBy ?? "none"}, not "person"`);
  return problems;
}

describe("the maintainer's reads of 2026-10-25", () => {
  it("the list holds 31 distinct pages, each an https address", () => {
    expect(MAINTAINER_READ_PAGES).toHaveLength(31);
    expect(readUrls.size).toBe(31);
    for (const { url, title } of MAINTAINER_READ_PAGES) {
      expect(url, title).toMatch(/^https:\/\/[^\s]+$/);
      expect(title.trim(), url).not.toBe("");
    }
  });

  it("every page he read is cited somewhere in the catalogs, at the address he read", () => {
    const cited = new Set(all.map(({ citation }) => citation.url));
    expect(MAINTAINER_READ_PAGES.filter(({ url }) => !cited.has(url)).map(({ url }) => url)).toEqual([]);
    // Planted control: an address one letter off is cited nowhere, so a moved address can't pass unseen.
    const offByOne = MAINTAINER_READ_PAGES[0]!.url.replace(/\.html$/, ".htm");
    expect(cited.has(offByOne)).toBe(false);
  });

  it("every citation of those pages records his read: read by a person on 2026-10-25", () => {
    const wrong = all
      .filter(({ citation }) => readUrls.has(citation.url))
      .flatMap(({ where, citation }) => readProblems(citation).map((problem) => `${where}: ${citation.url}: ${problem}`));
    expect(wrong).toEqual([]);
  });

  it("each of them says so on screen, in grey, and none says no person has read it", () => {
    for (const { where, citation } of all.filter(({ citation }) => readUrls.has(citation.url))) {
      expect(howCheckedWords(citation), `${where}: ${citation.url}`).toBe(`Read by a person on ${MAINTAINER_READ_DAY}`);
      expect(isCheckFirst(citation), `${where}: ${citation.url}`).toBe(false);
    }
  });

  it("no citation of any other page claims a read of that day", () => {
    const others = all
      .filter(({ citation }) => !readUrls.has(citation.url) && citation.lastVerified === MAINTAINER_READ_DAY)
      .map(({ where, citation }) => `${where}: ${citation.url}`);
    expect(others).toEqual([]);
  });

  it("planted controls: the check catches a citation without his read, with an older read, or read by a model", () => {
    const page = MAINTAINER_READ_PAGES[0]!;
    const base = { title: page.title, url: page.url };
    const toolOnly: ListedCitation = { ...base, toolCheck: { checkedOn: "2026-10-23", quotes: ["the basic rate words"] } };
    const olderRead: ListedCitation = { ...base, lastVerified: "2026-05-01" };
    const byAModel: ListedCitation = { ...base, lastVerified: MAINTAINER_READ_DAY, readBy: "model" };
    const unrecorded: ListedCitation = { ...base, lastVerified: MAINTAINER_READ_DAY };
    const hisRead: ListedCitation = { ...toolOnly, lastVerified: MAINTAINER_READ_DAY, readBy: "person" };
    expect(readProblems(toolOnly)).toEqual(['read date none, not 2026-10-25', 'readBy none, not "person"']);
    expect(readProblems(olderRead)).toEqual(['read date 2026-05-01, not 2026-10-25', 'readBy none, not "person"']);
    expect(readProblems(byAModel)).toEqual(['readBy model, not "person"']);
    expect(readProblems(unrecorded)).toEqual(['readBy none, not "person"']);
    // His read wins on screen, and the tool check it had stays in the citation (rule 5).
    expect(readProblems(hisRead)).toEqual([]);
    expect(howCheckedWords(hisRead)).toBe("Read by a person on 2026-10-25");
    expect(hisRead.toolCheck?.checkedOn).toBe("2026-10-23");
  });
});
