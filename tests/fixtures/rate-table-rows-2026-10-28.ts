/**
 * The maintainer's answer about two rows of the CRA's GST/HST rate table, copied from his reading page (item 1 of its
 * `answers`: `ontarioRow` "13%", `albertaRow` "5%"). He gave it on 2026-10-28, Alberta time: the page saved it at
 * 2026-10-29T02:20:20Z, and stamped its `savedOn` with the UTC day, 2026-10-29 (a bug of that page's, since fixed).
 *
 * The table is drawn on the page by a script, so no tool can see its rows (docs/engines/citations.md, § Blocked,
 * items 1 and 2); his answer is what settles them. Item 1 asked him to copy the two rows, not to read the page in
 * full, so it is not a read: the page's citations keep `lastVerified` at his full read of 2026-10-25
 * (tests/fixtures/maintainer-reads-2026-10-25.ts), and his answer is recorded here and in the citations' comments
 * (citations.md, rule 5).
 *
 * Written out here, not imported from a catalog, so a change to a catalog can't move the test with it.
 */
export const RATE_TABLE_ROWS = {
  /** The day he gave the answer, in Alberta. */
  answeredOn: "2026-10-28",
  /** When his reading page saved it. */
  savedAtUtc: "2026-10-29T02:20:20Z",
  url: "https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/gst-hst-businesses/charge-collect-which-rate.html",
  /** What he wrote for each row, as he wrote it. */
  wrote: { ontarioRow: "13%", albertaRow: "5%" },
} as const;
