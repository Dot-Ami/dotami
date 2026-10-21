/**
 * Lists that used to be kept by hand, now read from the registry (docs/architecture/research-kit.md § 5.2):
 * the ad libraries "Others in this line of work" links to, and the one never-automated list every story uses.
 */
import { SOURCES } from "./registry";
import type { ListName, SourceCard } from "./types";

/** A page the person opens themselves, in their own browser. */
export interface SourceLink {
  label: string;
  url: string;
}

/** The registry's cards on one hand-kept list, in the registry's order, as links. */
export function linksOn(list: ListName, cards: readonly SourceCard[] = SOURCES): SourceLink[] {
  return cards.filter((c) => (c.lists ?? []).includes(list)).map((c) => ({ label: c.name, url: c.url }));
}

/**
 * Every source nothing in DotAmi may fetch, for every story: S2.5.22's do-not-fetch pages and
 * competitive-landscape.md § 4.4's sites. The Lens's page reading (S2.5.22, 25p) refuses an address under any
 * of their `neverFetch` beginnings.
 */
export function neverAutomated(cards: readonly SourceCard[] = SOURCES): readonly SourceCard[] {
  return cards.filter((c) => c.access === "never-automated");
}
