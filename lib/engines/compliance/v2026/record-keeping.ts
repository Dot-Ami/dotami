import type { EngineCitation } from "@/lib/engines/shared/types";

/**
 * How long the CRA says business records are generally kept. Not a rule the map evaluates: it is
 * the one cited line on the Delete menu (/your-data), which says that Delete removes only DotAmi's
 * own copy and doesn't touch the person's books. The maintainer chose (2026-10-07) to show it, from
 * a catalog entry rather than words in a component, because it states a tax rule.
 *
 * Information only, never "you should keep...": the exceptions are many (a late-filed return, an
 * objection, long-term property), and the CRA's page is the place to read them.
 */
export interface RecordRetentionEntry {
  id: string;
  label: string;
  /** The usual period, in years. A typed field, so no sentence hides the number. */
  retentionYears: number;
  /** When the period starts counting, in the CRA's words, lower-case so it can end a sentence. */
  countsFrom: string;
  /** What deleting in DotAmi leaves alone. */
  scope: string;
  citations: EngineCitation[];
}

export const recordRetentionV2026: RecordRetentionEntry = {
  id: "cra-business-records-retention",
  label: "How long business records are kept",
  retentionYears: 6,
  countsFrom: "the end of the last tax year they relate to",
  scope:
    "Deleting here removes DotAmi's own copy only. It doesn't touch your books, receipts, bank statements or anything else you keep outside DotAmi.",
  citations: [
    {
      title: "Where to keep your records, for how long and how to request the permission to destroy them early",
      authority: "CRA",
      jurisdiction: "CA",
      url: "https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/keeping-records/where-keep-your-records-long-request-permission-destroy-them-early.html",
      lastVerified: "2026-10-08",
      note:
        "Read 2026-10-08 (page modified 2026-08-03): required records and supporting documents are generally kept for six years from the end of the last tax year they relate to. Longer for long-term property, a late-filed return, an objection or appeal, and the other cases the page lists; shorter in a few others, such as a dissolved corporation.",
    },
  ],
};
