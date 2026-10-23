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
  /** The code keys the road names (docs/architecture/research-kit.md § 5.3): today, the jobs it is written for. */
  codes: RoadCodes;
  /** Left to right. */
  columns: RoadColumn[];
  /** Every step on the road, each listed once; columns say where each one sits. */
  steps: RoadStep[];
  /** Each fork once: two steps a person chooses between. */
  forks: Fork[];
  /**
   * The newest read date of any source in the road (the checks hold it to that), or "" when none of
   * its sources has been read yet. The road's own date, not a citation's: a tool check is not a read
   * and doesn't count (docs/engines/citations.md).
   */
  lastVerified: string;
  /**
   * Where the road carries on after its last column, if it does: another road's id and the column on
   * it to carry on from (the first written future joins road 0 at "Incorporating"). Data, not layout;
   * `roadJoinProblems` checks both exist.
   */
  joins?: RoadJoin;
}

/**
 * What a road says about the work it is written for (task 25e, 2026-10-21). It only describes the road: the
 * person's job is still their own pick (lib/futures/job.ts), and nothing here is read to pick one for them.
 */
export interface RoadCodes {
  /**
   * The jobs the road is written for, as 5-digit NOC 2021 codes ("72311" for Cabinetmakers), in the order the
   * road's writer put them; each must be a job group on the government's list (`roadCodeProblems` checks it
   * against OaSIS). A road written for no particular job, such as road 0's tax and structure steps for any
   * business, says so with "no-particular-job" rather than an empty list, so a road nobody gave codes to
   * can't pass as one written for no job.
   */
  occupations: readonly string[] | "no-particular-job";
}

export interface RoadJoin {
  roadId: string;
  columnId: string;
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
  /**
   * The rules and tax cards that belong on this step, by their catalog ids (write-offs, grants,
   * compliance entries). Whether a card applies to the person is still the rules' call; this only says
   * the card is about this step. Optional: a step with none shows no cards on it. (2026-10-12: moved
   * here from lib/brain/node-items.ts, so a road names its own cards.)
   */
  engineHints?: string[];
  /**
   * Set only on a step that is about some kinds of work (road 0's SR&ED deepening, 2026-10-13, issue
   * #40). Without one of these on the idea, road evaluation puts the step off the person's path with
   * the reason below; the step stays on the map and still opens, it is never removed.
   */
  onlyForKindsOfWork?: OnlyForKindsOfWork;
  /**
   * Set only on the step where the person opens a business of their own (road 1's Open your own shop,
   * 2026-10-17). Its step panel then offers "Others in this line of work" too, as the goal bar does on every
   * road (docs/architecture/competitive-landscape.md § 6). It says what the step is about, nothing more: no
   * rule reads it and it changes no colour.
   */
  opensABusiness?: true;
  /**
   * Set only by `roadForPlace` (./index.ts), never in a road's file: how many other provinces' pages this step's
   * *done when* lines, cost lines and official links rested on, left out for the idea's place (pages the step's
   * own sources also cite are counted there, not again). The step's "N sources for other provinces" line adds it.
   */
  pagesLeftOutForPlace?: number;
}

export interface OnlyForKindsOfWork {
  /**
   * The intake's kinds of work (activity tags), one of which the step needs to be on the path. The reason
   * on screen is built from these and the idea's own kinds of work only, never a sentence about what the
   * person told DotAmi: a kind of work typed in the person's own words isn't one of these, and may well say
   * the same thing (review of 2026-10-13).
   */
  tags: string[];
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
 * A fee with an official source: either read there (the citation's read date is the day the fee was
 * read), or checked by a tool whose quotes include the amount as the page writes it ("$150.00"), so
 * the number is one the tool found on the page. The amount is whole cents, never a range or an
 * average, and a tool-checked quote may not write it as one end of a range.
 */
export interface OfficialFeeLine {
  /** Permanent: the line's own id on this road, apart from the fee's, so two steps can show one fee. */
  id: string;
  kind: "official-fee";
  /** The road's own words for the fee on this step; the catalog keeps what the fee is for. */
  label: string;
  /**
   * The fee in the official fees catalog (lib/engines/fees/v2026/, since 2026-10-12). Build the line with
   * `feeLine`, which copies the amount, source and condition below from it; never type them here
   * (`feeReferenceProblems` refuses any difference).
   */
  feeId: string;
  amountCents: number;
  citation: EngineCitation;
  /**
   * Set only on a fee that applies only sometimes: the condition, in plain words ("You failed an exam
   * and choose to rewrite it"). A total must leave the fee out unless the person says the condition
   * holds, and a screen shows the condition next to the fee. The checks refuse a label that says
   * "only if" without one, so a conditional fee can't hide in prose.
   */
  onlyIf?: string;
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
  | {
      kind: "official-fee";
      lineId: string;
      label: string;
      amountCents: number;
      citation: EngineCitation;
      /** The fee's condition, when it applies only sometimes (`OfficialFeeLine.onlyIf`). */
      onlyIf?: string;
    }
  | { kind: "your-quote"; lineId: string; label: string; amountCents: number }
  | { kind: "named-not-priced"; lineId: string; label: string };
