/**
 * The maintainer's read of the CRA's GST/HST rate table, 2026-10-29, copied from his answer on his reading page that
 * day (item 1 of its `answers`: `ontarioRow` "13%", `albertaRow` "5%"). The table is drawn on the page by a script, so
 * no tool can see its rows (docs/engines/citations.md, § Blocked, items 1 and 2); his read of the rows is what settles
 * them. He had read the page in full on 2026-10-25 (tests/fixtures/maintainer-reads-2026-10-25.ts), so this is a later
 * person's read of the same page: every citation of it carries this day now, and the 2026-10-25 test leaves it out.
 *
 * Written out here, not imported from a catalog, so a change to a catalog can't move the test with it.
 */
export const RATE_TABLE_READ = {
  day: "2026-10-29",
  url: "https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/gst-hst-businesses/charge-collect-which-rate.html",
  /** What he wrote for each row, as he wrote it. */
  wrote: { ontarioRow: "13%", albertaRow: "5%" },
} as const;
