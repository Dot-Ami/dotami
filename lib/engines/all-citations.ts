/**
 * Every citation in every catalog, each with where it came from ("compliance gst-hst-registration").
 *
 * One list, so the integrity test (tests/engine-integrity.spec.ts) and the quote checker
 * (scripts/check-quotes.mjs, docs/engines/citations.md) look at the same citations. The integrity
 * test also counts each catalog by hand, so a catalog left out of here fails it. Not used by any
 * screen.
 */

import { cfeCatalogV2026 } from "@/lib/engines/cfe/v2026";
import { incorporationRoutesV2026 } from "@/lib/engines/cfe/v2026/incorporation-routes";
import { complianceCatalogV2026, recordRetentionV2026 } from "@/lib/engines/compliance/v2026";
import { officialFeesV2026 } from "@/lib/engines/fees/v2026";
import { grantsCatalogV2026 } from "@/lib/engines/grants/v2026";
import { riskCatalogV2026 } from "@/lib/engines/risk/v2026";
import { roadsCatalogV2026, skillItemsV2026 } from "@/lib/engines/roads/v2026";
import type { CitationCheck } from "@/lib/engines/shared/types";
import { structureCatalogV2026 } from "@/lib/engines/structure/v2026";
import { taxLinesCatalogV2026 } from "@/lib/engines/taxlines/v2026";
import { templatesCatalogV2026 } from "@/lib/engines/templates/v2026";
import { writeOffsCatalogV2026 } from "@/lib/engines/writeoffs/v2026";

/** The fields every citation shares that the checks read. */
export type ListedCitation = { url: string; title: string } & CitationCheck;

export interface CitationInCatalog {
  /** "<catalog> <entry id>", plus the tax year for a tax line. */
  where: string;
  citation: ListedCitation;
}

export function allCatalogCitations(): CitationInCatalog[] {
  const out: CitationInCatalog[] = [];
  const add = (where: string, citations: readonly ListedCitation[]) => {
    for (const citation of citations) out.push({ where, citation });
  };

  for (const node of cfeCatalogV2026.nodes) add(`cfe ${node.id}`, node.citations);
  // The ways to incorporate on the Incorporating stage (2026-10-11): one source per line, each with a
  // tool check, so scripts/check-quotes.mjs re-checks their quotes with the rest.
  for (const route of incorporationRoutesV2026) {
    for (const line of route.lines) add(`routes ${route.id} ${line.id}`, [line.citation]);
  }
  // The official fees catalog (2026-10-12): one source per fee. Roads and routes show the same sources
  // through their fee lines, so those are listed again there: each place a source is shown is checked.
  for (const fee of officialFeesV2026) add(`fees ${fee.id}`, [fee.citation]);
  const entryCatalogs: [string, readonly { id: string; citations: readonly ListedCitation[] }[]][] = [
    ["structure", structureCatalogV2026.entries],
    ["grants", grantsCatalogV2026.entries],
    ["writeoffs", writeOffsCatalogV2026.entries],
    ["compliance", complianceCatalogV2026.entries],
    ["templates", templatesCatalogV2026.entries],
    ["risk", riskCatalogV2026.entries],
  ];
  for (const [name, entries] of entryCatalogs) for (const entry of entries) add(`${name} ${entry.id}`, entry.citations);
  for (const entry of taxLinesCatalogV2026.entries) {
    for (const year of entry.yearsRead) add(`taxlines ${entry.id} ${year.taxYear}`, year.citations);
  }
  add(`compliance ${recordRetentionV2026.id}`, recordRetentionV2026.citations);

  // Roads (lib/engines/roads/v2026/): each step's sources, its done-when lines' and cost lines'
  // sources, then the shared skill items'. Road 0's steps reuse the map stages' sources, so those
  // are listed twice (once under "cfe", once under "roads"): each place a source is shown is checked.
  for (const road of roadsCatalogV2026.entries) {
    for (const step of road.steps) {
      add(`roads ${road.id} ${step.id}`, step.citations);
      for (const line of step.doneWhen) add(`roads ${road.id} ${line.id}`, [line.citation]);
      for (const cost of step.costs) {
        if (cost.kind === "official-fee") add(`roads ${road.id} ${cost.id}`, [cost.citation]);
        else if (cost.nameSource) add(`roads ${road.id} ${cost.id}`, [cost.nameSource]);
      }
    }
  }
  for (const item of skillItemsV2026) {
    add(`skills ${item.id}`, item.citations);
    if (item.howToGetIt) add(`skills ${item.id}`, [item.howToGetIt.citation]);
  }
  return out;
}
