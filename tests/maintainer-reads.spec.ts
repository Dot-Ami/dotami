/**
 * The maintainer's reads of 2026-10-25 (docs/engines/citations.md, § The maintainer's reads of 2026-10-25): he read
 * 31 pages in full and ticked each one on his reading list that day. Every catalog citation of one of those pages
 * records that read (`lastVerified` "2026-10-25", `readBy` "person"), so its card says "Read by a person on
 * 2026-10-25"; a tool check it had stays (rule 5), and no other citation claims a read of that day.
 *
 * The pages come from tests/fixtures/maintainer-reads-2026-10-25.ts, copied from his list, never from a catalog, so
 * a change to a catalog's address can't move the test with it.
 *
 * One page has a later read of his (2026-10-29): the CRA's GST/HST rate page, whose table he read for its Ontario and
 * Alberta rows and answered "13%" and "5%" on his reading page (tests/fixtures/maintainer-reads-2026-10-29.ts). A
 * person's later read replaces the earlier one (citations.md rule 5), so that page's two citations say "Read by a
 * person on 2026-10-29", and the checks below hold them at that day instead; every other page stays at 2026-10-25.
 */
import { describe, expect, it } from "vitest";

import { allCatalogCitations, type ListedCitation } from "@/lib/engines/all-citations";
import { howCheckedWords, isCheckFirst } from "@/lib/engines/shared/citation-check";

import { MAINTAINER_READ_DAY, MAINTAINER_READ_PAGES } from "./fixtures/maintainer-reads-2026-10-25";
import { RATE_TABLE_READ } from "./fixtures/maintainer-reads-2026-10-29";

const all = allCatalogCitations();
const readUrls = new Set(MAINTAINER_READ_PAGES.map((page) => page.url));

/** Pages he read again later, with the day of that read: it is the one their citations carry. */
const LATER_READS: ReadonlyMap<string, string> = new Map([[RATE_TABLE_READ.url, RATE_TABLE_READ.day]]);
/** The day of his newest read of a page he read. */
const readDayOf = (url: string) => LATER_READS.get(url) ?? MAINTAINER_READ_DAY;

/** What is wrong with a citation of a page he read, in words; empty when it records his newest read of that page. */
function readProblems(c: ListedCitation): string[] {
  const problems: string[] = [];
  const day = readDayOf(c.url);
  if (c.lastVerified !== day) problems.push(`read date ${c.lastVerified ?? "none"}, not ${day}`);
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

  it("every citation of those pages records his read: read by a person on 2026-10-25, or on the day of his later read", () => {
    const wrong = all
      .filter(({ citation }) => readUrls.has(citation.url))
      .flatMap(({ where, citation }) => readProblems(citation).map((problem) => `${where}: ${citation.url}: ${problem}`));
    expect(wrong).toEqual([]);
  });

  it("each of them says so on screen, in grey, and none says no person has read it", () => {
    for (const { where, citation } of all.filter(({ citation }) => readUrls.has(citation.url))) {
      expect(howCheckedWords(citation), `${where}: ${citation.url}`).toBe(`Read by a person on ${readDayOf(citation.url)}`);
      expect(isCheckFirst(citation), `${where}: ${citation.url}`).toBe(false);
    }
  });

  it("the rate page, which he read again for its table on 2026-10-29, carries that read on both its citations", () => {
    // His answer of 2026-10-29: Ontario's row "13%", Alberta's row "5%". Both cards cite the page; a later read by a
    // person replaces his read of 2026-10-25 (rule 5), so neither still says 2026-10-25.
    expect(readUrls.has(RATE_TABLE_READ.url)).toBe(true);
    const cited = all.filter(({ citation }) => citation.url === RATE_TABLE_READ.url);
    expect(cited.map(({ where }) => where).sort()).toEqual(["compliance compliance-ab-no-pst", "compliance compliance-on-hst"]);
    for (const { where, citation } of cited) {
      expect({ lastVerified: citation.lastVerified, readBy: citation.readBy }, where).toEqual({ lastVerified: RATE_TABLE_READ.day, readBy: "person" });
      expect(howCheckedWords(citation), where).toBe("Read by a person on 2026-10-29");
    }
    // Every other page he read keeps the read of 2026-10-25.
    expect([...LATER_READS.keys()]).toEqual([RATE_TABLE_READ.url]);
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
    // The rate page: his read of 2026-10-25 is no longer enough there, and its later read is.
    const ratePage = { title: "GST/HST rates", url: RATE_TABLE_READ.url };
    expect(readProblems({ ...ratePage, lastVerified: MAINTAINER_READ_DAY, readBy: "person" })).toEqual(["read date 2026-10-25, not 2026-10-29"]);
    expect(readProblems({ ...ratePage, lastVerified: RATE_TABLE_READ.day, readBy: "person" })).toEqual([]);
  });
});
