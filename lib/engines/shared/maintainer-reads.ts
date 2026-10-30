import type { ReadBy } from "./types";

/**
 * The maintainer's reads of 2026-10-25 (docs/engines/citations.md, § The maintainer's reads of 2026-10-25): he read
 * 31 source pages in full and ticked each one "I've read it in full now" on his reading list that day. On 2026-10-24
 * he decided that his reads made with an AI model's help count as a person's read, for the pages he checked himself.
 *
 * Every catalog citation of one of those pages records the read as `lastVerified: MAINTAINER_READ_ON` with
 * `readBy: "person"` (rule 5: a person's read sets both; a tool check the citation had stays). A read wins on screen
 * (rule 3), so those sources say "Read by a person on 2026-10-25". tests/maintainer-reads.spec.ts holds every
 * citation of the 31 pages at that read, and no other citation at that day.
 */
export const MAINTAINER_READ_ON = "2026-10-25";

/** A read of a whole page, for a catalog that builds its citations from page objects (the roads). */
export interface PageRead {
  lastVerified: string;
  readBy: ReadBy;
}

/** The maintainer's read of 2026-10-25, as a page object carries it. */
export const MAINTAINER_READ: Readonly<PageRead> = { lastVerified: MAINTAINER_READ_ON, readBy: "person" };

/**
 * The maintainer's later read of one of those pages: the CRA's GST/HST rate page (charge-collect-which-rate.html),
 * whose table of rates is drawn by a script, so no tool can see its rows (docs/engines/citations.md, § Blocked, items 1
 * and 2). On his reading page on 2026-10-29 he wrote what the table shows for the two rows DotAmi relies on: Ontario's
 * "13%" and Alberta's "5%". A person's later read replaces the earlier one (rule 5), so both citations of that page
 * carry this day; tests/maintainer-reads.spec.ts holds them there, and every other page of his at 2026-10-25.
 */
export const MAINTAINER_RATE_TABLE_READ_ON = "2026-10-29";
