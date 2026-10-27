import { MAINTAINER_READ_ON } from "@/lib/engines/shared/maintainer-reads";
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
      // Read on 2026-10-08 (who read it wasn't recorded), then in full by the maintainer on 2026-10-25: his read wins
      // on screen, and the tool check stays. Since 2026-10-24 the citation also
      // keeps the CRA's own sentences, its "Generally" first, so the six years are never restated without it: the
      // maintainer's reading list found both on the live page on 2026-10-23 with the repo's matcher (the same
      // whole-word, one-block match as scripts/check-quotes.mjs), with every other quote held for this page. Every
      // road's Keep your records step holds the same two (lib/engines/roads/v2026/keep-records.ts, checked
      // 2026-10-14). A networked `node scripts/check-quotes.mjs` run should find them again (docs/engines/citations.md,
      // rule 4).
      lastVerified: MAINTAINER_READ_ON,
      readBy: "person",
      toolCheck: {
        checkedOn: "2026-10-23",
        quotes: [
          "Generally, you must keep all required records and supporting documents for a period of six years from the end of the last tax year they relate to.",
          "In some situations, you must retain your records for a different period of time.",
        ],
      },
      note:
        "Read 2026-10-08 (page modified 2026-08-03): required records and supporting documents are generally kept for six years from the end of the last tax year they relate to. Longer for long-term property, a late-filed return, an objection or appeal, and the other cases the page lists; shorter in a few others, such as a dissolved corporation.",
    },
  ],
};
