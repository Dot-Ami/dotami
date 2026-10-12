import type { Road, RoadKind, SkillItem } from "@/lib/engines/roads/v2026";
import { howChecked } from "@/lib/engines/shared/citation-check";
import type { EngineCitation, Province } from "@/lib/engines/shared/types";

import { pickWords } from "./words";

/**
 * *Pick a future*'s cards (docs/architecture/future-cockpit.md § 1, "The way in as built"): every
 * written future, in the order the catalog lists them (the order added, never ranked), each as counts
 * of what its road holds and how its sources were checked. Counts only: no score, no fit, no "best".
 */

/** How many of a road's citations were checked each way (lib/engines/shared/citation-check.ts decides the kind). */
export interface SourceCounts {
  /** Read by a person, on record. */
  person: number;
  /** Read, with no record of who read it. */
  unrecorded: number;
  /** Read by an AI model only. */
  model: number;
  /** Checked by a tool only: the quoted words found on the live page. */
  tool: number;
}

export interface FutureCard {
  roadId: string;
  label: string;
  kind: RoadKind;
  writtenFor: readonly Province[];
  steps: number;
  /** Skill items the road lists, each once. */
  skillsListed: number;
  officialFees: number;
  /** Named cost lines: the ones the person prices themselves. */
  linesToPrice: number;
  sources: SourceCounts;
}

/**
 * Every citation behind what the card counts: each step's own sources, its *done when* lines, its fees
 * and the sources of its named lines' names, and the skill items it lists (their sources and the source
 * of the way to get each). Counted where they appear, so a page cited twice counts twice.
 */
function roadCitations(road: Road, skillItems: readonly SkillItem[]): EngineCitation[] {
  const listed = new Set(road.steps.flatMap((step) => step.needs));
  return [
    ...road.steps.flatMap((step) => [
      ...step.citations,
      ...step.doneWhen.map((line) => line.citation),
      ...step.costs.flatMap((cost) => (cost.kind === "official-fee" ? [cost.citation] : cost.nameSource ? [cost.nameSource] : [])),
    ]),
    ...skillItems
      .filter((item) => listed.has(item.id))
      .flatMap((item) => [...item.citations, ...(item.howToGetIt ? [item.howToGetIt.citation] : [])]),
  ];
}

function countSources(citations: readonly EngineCitation[]): SourceCounts {
  const counts: SourceCounts = { person: 0, unrecorded: 0, model: 0, tool: 0 };
  for (const citation of citations) {
    const kind = howChecked(citation).kind;
    counts[kind === "read" ? "unrecorded" : kind] += 1;
  }
  return counts;
}

export function futureCards(roads: readonly Road[], skillItems: readonly SkillItem[]): FutureCard[] {
  return roads.map((road) => {
    const costs = road.steps.flatMap((step) => step.costs);
    return {
      roadId: road.id,
      label: road.label,
      kind: road.kind,
      writtenFor: road.provinces,
      steps: road.steps.length,
      skillsListed: new Set(road.steps.flatMap((step) => step.needs)).size,
      officialFees: costs.filter((cost) => cost.kind === "official-fee").length,
      linesToPrice: costs.filter((cost) => cost.kind === "named").length,
      sources: countSources(roadCitations(road, skillItems)),
    };
  });
}

/**
 * The card's sources line, as parts: each kind it has, and only those, in the order a read beats a tool
 * check. `checkFirst` marks the parts no person has read (amber on screen, as everywhere else).
 */
export function sourcesLine(counts: SourceCounts): { text: string; checkFirst: boolean }[] {
  const words = pickWords.sources;
  const parts: { text: string; checkFirst: boolean }[] = [];
  if (counts.person > 0) parts.push({ text: words.person(counts.person), checkFirst: false });
  if (counts.unrecorded > 0) parts.push({ text: words.unrecorded(counts.unrecorded), checkFirst: false });
  if (counts.model > 0) parts.push({ text: words.model(counts.model), checkFirst: true });
  if (counts.tool > 0) parts.push({ text: words.tool(counts.tool), checkFirst: true });
  return parts;
}
