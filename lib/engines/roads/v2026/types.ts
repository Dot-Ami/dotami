import type { EngineCitation, Province } from "../../shared/types";

/**
 * A road: one future (a business, a career, or both) drawn as columns of cited steps, left to right.
 * Design: docs/architecture/future-cockpit.md § 6 ("The road data model" and "The road type as built").
 *
 * Roads are catalogs like every other engine: typed, versioned, cited, never rows in the database.
 * Every id here is permanent. A person's skill marks, step progress and fork picks are kept against
 * these ids, so a label can change but an id never does (tests/roads.spec.ts keeps the list).
 *
 * Nothing here knows how a screen lays a road out; the map (components/cockpit/strategy-map.tsx)
 * reads these fields and decides that itself.
 */
export type RoadKind = "business" | "career" | "both";

export interface Road {
  /** Permanent, e.g. "road-starting-any-business-ab". */
  id: string;
  /** The name a person sees on the card: "Starting any business in Alberta (tax and structure)". */
  label: string;
  kind: RoadKind;
  /** Where it is written for, in today's place values. */
  provinces: Province[];
  /** Left to right. */
  columns: RoadColumn[];
  /** Every step on the road, each listed once; columns say where each one sits. */
  steps: RoadStep[];
  /** Each fork once: two steps a person chooses between. */
  forks: Fork[];
  /**
   * The newest read date of any source in the road (the checks hold it to that). The road's own date,
   * not a citation's: a tool check is not a read and doesn't count (docs/engines/citations.md).
   */
  lastVerified: string;
}

export interface RoadColumn {
  /** Permanent. */
  id: string;
  label: string;
  /** One line under the label: what this column is about, in plain words. */
  summary: string;
  /** Step ids, top to bottom. */
  steps: string[];
  /**
   * The fork decided in this column, if any. Data, not layout: it carries today's two toggles over,
   * and the map chooses to show them in the column's header.
   */
  forkId?: string;
}

export interface RoadStep {
  /** Permanent. */
  id: string;
  label: string;
  /** One line a first-timer can repeat back; the card shows it under the name. */
  summary: string;
  /** The steps this one leads to; the map's hover arrows follow these to the end of the road. */
  next: string[];
  /** Each line written from this step's official page, with that page as its citation. */
  doneWhen: DoneWhenLine[];
  /** Skill item ids (legal requirements and listed skills) from the shared list. */
  needs: string[];
  /** Official fees and named cost lines. A person's own quote is never here (see `CostLineAsShown`). */
  costs: CatalogCostLine[];
  /** Pages the person opens themselves (a registry, BizPaL). Nothing about the person goes in them. */
  officialLinks: OfficialLink[];
  /** At least one. */
  citations: EngineCitation[];
}

export interface DoneWhenLine {
  /** Permanent: a person's tick is kept against it. */
  id: string;
  text: string;
  citation: EngineCitation;
}

export interface OfficialLink {
  label: string;
  url: string;
}

export interface Fork {
  /**
   * Permanent, and the key the person's pick is kept under. Road 0's forks use the keys today's
   * saved branch picks already use (`gstTiming`, `incorporationTiming`).
   */
  id: string;
  label: string;
  sides: [string, string];
}

export interface SkillItem {
  /** Permanent and shared across roads, so a person's mark carries over to every road listing it. */
  id: string;
  label: string;
  kind: "legal-requirement" | "listed-skill";
  howToGetIt?: { text: string; citation: EngineCitation };
  citations: EngineCitation[];
}

/**
 * A fee with an official source. Its citation's `lastVerified` is the day a person read the fee
 * there; the amount is whole cents, never a range or an average.
 */
export interface OfficialFeeLine {
  id: string;
  kind: "official-fee";
  label: string;
  amountCents: number;
  citation: EngineCitation;
}

/** A cost the person prices themselves ("tools: add your quote"). Named, never given an amount here. */
export interface NamedCostLine {
  id: string;
  kind: "named";
  label: string;
  /** Where the name itself comes from (a blank cash-flow template), when it has one. */
  nameSource?: EngineCitation;
}

/** The two kinds of cost line a catalog may hold. */
export type CatalogCostLine = OfficialFeeLine | NamedCostLine;

/**
 * The three kinds of cost line a screen shows (decision 2 of 2026-10-11): an official fee with its
 * source and read date; the person's own agreed quote for a named line; a named line not priced yet,
 * which has no amount at all so it can never be added up as $0.
 */
export type CostLineAsShown =
  | { kind: "official-fee"; lineId: string; label: string; amountCents: number; citation: EngineCitation }
  | { kind: "your-quote"; lineId: string; label: string; amountCents: number }
  | { kind: "named-not-priced"; lineId: string; label: string };
