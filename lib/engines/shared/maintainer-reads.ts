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
