import { MAINTAINER_READ_ON } from "@/lib/engines/shared/maintainer-reads";
import type { EngineCitation } from "@/lib/engines/shared/types";

/**
 * Income Tax Act s.245, the general anti-avoidance rule (GAAR), in its own words: one citation and one set of quotes
 * for the GAAR risk read (`risk-ladder-skipping`, ./triggers.ts) and the two structure cards it shows on (Holding
 * company and Family trust, lib/engines/structure/v2026/ladder.ts), so the copies can't drift. No screen draws a risk
 * read's own sources, so the section the box quotes is listed under those cards instead.
 *
 * Since 2026-10-24 (the maintainer's reading list of 2026-10-23, item risk-ladder-skipping): the read had cited the
 * section with no quote, and its mitigation was DotAmi's own advice. The quotes are four of the five docs/glossary.md's
 * GAAR entry holds (the fifth, on the main purposes, only the glossary quotes): `node scripts/check-quotes.mjs` found
 * them on the live page on 2026-10-12, so that is the check's date (docs/engines/citations.md, rule 4). The risk
 * catalog recorded a read of 2026-07-02 for this page, with no record of who read it; the maintainer read it in full
 * on 2026-10-25, and that read is the one kept (§ The maintainer's reads of 2026-10-25). Change a quote only after the
 * script finds it on the page.
 */
export const S245_QUOTES = {
  contains: "This section of the Act contains the general anti-avoidance rule",
  denies:
    "applies to deny the tax benefit of avoidance transactions that result directly or indirectly either in a misuse of provisions of the Act",
  abuse: "an abuse having regard to those provisions read as a whole",
  parliament: "while not preventing taxpayers from obtaining tax benefits contemplated by Parliament",
} as const;

export const S245_CITATION: EngineCitation = {
  title: "Income Tax Act s.245 — General Anti-Avoidance Rule",
  authority: "federal",
  jurisdiction: "CA",
  url: "https://laws-lois.justice.gc.ca/eng/acts/I-3.3/section-245.html",
  lastVerified: MAINTAINER_READ_ON,
  readBy: "person",
  toolCheck: { checkedOn: "2026-10-12", quotes: Object.values(S245_QUOTES) },
  note: "GAAR statutory text: the general anti-avoidance rule, in the section's own words.",
};
