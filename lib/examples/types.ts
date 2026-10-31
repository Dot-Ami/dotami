import type { FigureView } from "@/lib/figures/types";
import type { FutureView } from "@/lib/futures/future";
import type { SkillMarkView } from "@/lib/futures/skill-marks";
import type { StepProgressView } from "@/lib/futures/step-progress";
import type { Scenario } from "@/lib/scenarios/types";

/**
 * An invented example future (docs/architecture/future-cockpit.md § 13 and its appendix): everything the
 * cockpit reads for a saved idea, written as data in its own file instead of read from the data file, so
 * the cockpit can draw it read-only through the same components and the same road evaluation.
 *
 * Not a catalog and not the database: an example holds an invented person's answers, and the catalogs'
 * own facts (steps, fees, skills, sources) stay in the catalogs, named here only by id.
 */
export interface ExampleFuture {
  /** The example's permanent id, as its address says it: /example/<id>. */
  id: string;
  /** The invented person's first name, as the banner and the page's title say it. */
  person: string;
  /** The idea, as Pick a future would have saved it. */
  scenario: Scenario;
  /** What GET /api/futures/<id> would answer for it (the cockpit's `KeptForIdea`, the same shape). */
  kept: {
    future: FutureView;
    progress: StepProgressView[];
    skillMarks: SkillMarkView[];
    incomeWanted: { amountCents: number; agreedOn: string } | null;
    firstWords: { text: string; saidAt: string } | null;
    destination: { text: string; saidAt: string } | null;
  };
  /** Its agreed numbers, as the figures list would give them. */
  figures: FigureView[];
  /**
   * A what-if the example opens with (never kept, as everywhere), or null for a what-if bar that starts
   * empty. Mara's is null since the maintainer's pick A of 2026-10-15.
   */
  whatIfFirstYearSalesDollars: number | null;
  /**
   * Where the example's numbers come from (the maintainer, 2026-10-14, option A): the prices and statistics
   * behind them, and which of them each number is. Null for an example whose numbers have no sources.
   */
  sources: {
    data: ExampleSources;
    /** The cost line priced as the listed tools' averages added up, by its catalog id, or null. */
    toolsLineId: string | null;
    /** The statistic the yearly income wanted is, by its id in `data.statistics`, or null. */
    incomeWantedFrom: string | null;
    /**
     * Statistics shown beside the example person's numbers as context, never as one of them, by their ids
     * in `data.statistics` (each with `amountCents` and `inSentence`). Since 2026-10-15 (the maintainer's
     * pick A) ISED's average revenue for Mara, which until then was her what-if.
     */
    context: readonly string[];
  } | null;
}

/**
 * The research behind an example's numbers, as seen on one day (docs/ui-spec/example/_index.md, "Where these
 * numbers come from"). Plain observations: a price a seller listed, a plan a software maker listed, a
 * statistic a government or market report published, each with its link, the words seen around it and the
 * day. They are not legal citations (lib/engines/shared/: those name only government sources and back a
 * rule); these back an invented person's numbers, and no rule reads them.
 */
export interface ExampleSources {
  /** The day every entry was seen. */
  seenOn: string;
  /** The class of tool priced, the same at every seller, and what a price is (CAD, before GST and shipping). */
  tier: string;
  /** The official descriptions of the trade that name the tools. */
  officialSources: readonly { label: string; url: string }[];
  tools: readonly ToolPriced[];
  softwareCategories: readonly { id: SoftwareCategoryId; label: string }[];
  software: readonly SoftwarePlan[];
  statistics: readonly Statistic[];
  /** What stayed blank, and why. */
  notPriced: readonly { what: string; why: string }[];
  /** What was seen but not used (a price in another currency, a page that couldn't be read), and why. */
  leftOut: readonly { what: string; why: string }[];
}

/** One price a seller listed for a tool. */
export interface ListedPrice {
  seller: string;
  url: string;
  /** The product as the page names it, the page's title, and anything to know about the price (a sale…). */
  product: string;
  /** The listed price, in cents, CAD, before GST and shipping. */
  priceCents: number;
  /** The words seen on the page around the price, word for word. */
  quote: string;
  seenOn: string;
  /** What the second check, or a later look at the page, found worth saying about this price, if anything. */
  caution?: string;
}

/** A tool the trade's official descriptions name, and the prices sellers listed for one of its class. */
export interface ToolPriced {
  id: string;
  item: string;
  official: { mention: string; url: string; quote: string };
  prices: readonly ListedPrice[];
}

export type SoftwareCategoryId = "design" | "cut-lists" | "bookkeeping";

/** One plan a software maker listed, in Canadian dollars. */
export interface SoftwarePlan {
  category: SoftwareCategoryId;
  product: string;
  plan: string;
  url: string;
  /** In cents, CAD; 0 for a free tier. */
  priceCents: number;
  /**
   * How the page prints the price and how it is billed: "month" is billed month to month; "month-billed-yearly"
   * is a monthly figure the page prints for a plan billed once a year; "year" is a yearly price. Only "month"
   * is averaged (lib/examples/stats.ts): a plan billed once a year is a different kind of price, whatever unit
   * its page prints it in.
   */
  per: "month" | "month-billed-yearly" | "year" | "free";
  /** How it is billed or limited, as the page says. */
  note: string;
  quote: string;
  seenOn: string;
}

/** One statistic a government or market report published. */
export interface Statistic {
  id: string;
  group: "earnings" | "industry" | "space";
  what: string;
  /** The figure as the source prints it ("$52,255.00", "610.3"). */
  value: string;
  unit: string;
  period: string;
  source: string;
  url: string;
  quote: string;
  seenOn: string;
  caveat: string;
  /**
   * Only on a statistic an example's number is, or one shown as context beside its numbers: the figure in
   * whole cents, and how a sentence names it.
   */
  amountCents?: number;
  inSentence?: string;
}
