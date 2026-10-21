/**
 * The shape of a "connector card": one outside source, what its own terms let DotAmi do with it, and how it
 * must be credited (docs/architecture/research-kit.md § 5.2). The cards themselves are in ./registry.ts and
 * ./validate.ts checks them.
 *
 * A card is a dated observation of a source's terms, not a legal citation: it backs no rule. It says how a
 * source may be reached (a link the person opens, a file a maintainer's script ships, a live look-up on the
 * person's own account), what may be kept and for how long, and the words that decided it.
 */

/**
 * How DotAmi may reach the source (research-kit.md § 3.2):
 * - `ship`: a maintainer's script imports the source's files before a release, and the app ships what it made.
 *   Nothing is fetched on the person's computer.
 * - `link`: the person clicks a link and opens the page in their own browser. DotAmi reads nothing from it.
 * - `lens-live`: the Lens looks things up through the source's official API or MCP server on the person's own
 *   account. Only after the source's terms for agent use have been read (research-kit.md § 5.2).
 * - `page-person-opens`: DotAmi may read the one page the person opens, once per ask (S2.5.22's rule).
 * - `never-automated`: the source's terms bar automated access, so nothing in DotAmi ever fetches it. A person
 *   may still open it through a link.
 */
export type Access = "ship" | "link" | "lens-live" | "page-person-opens" | "never-automated";

/** Whose key or sign-in a look-up needs: none, or the person's own (kept in the OS keychain, § 5.9). */
export type KeyHolder = "none" | "person";

/** What a keep limit is about: the source's content, its ids, or coordinates. */
export type KeepField = "content" | "id" | "coordinates";

/** How long it may be kept: for good, not at all, or for so many hours or days. */
export type KeepLimitValue = "forever" | "never" | { hours: number } | { days: number };

/**
 * One limit on keeping. `quote` is the source's own words, word for word; when the source says nothing about
 * keeping (a page DotAmi only links to), `quote` is null and `why` says what DotAmi does instead.
 */
export interface KeepLimit {
  field: KeepField;
  limit: KeepLimitValue;
  quote: string | null;
  why?: string;
}

/** Whether what DotAmi takes from the source may be shown as it is, or only on conditions (their words). */
export type Display = { kind: "allowed" } | { kind: "with-conditions"; conditions: readonly string[] };

/**
 * What kind of figure the source gives: one an official body published, a count, or a vendor's own model
 * ("estimations", in Similarweb's word). `none`: no figure from it ever reaches DotAmi (a link, a page
 * DotAmi never fetches).
 */
export type FigureKind = "published" | "count" | "vendor-estimate" | "none";

/**
 * What in DotAmi reads the source: a gauge on the cockpit, a total DotAmi adds up, a row shown as published,
 * or a search the person runs. Empty when nothing reads it. A vendor's estimate never feeds a gauge or a
 * total (research-kit.md § 5.2).
 */
export type Feed = "gauge" | "total" | "shown" | "search";

/** A rule the source's terms set on the model that sees its results (research-kit.md § 3.2, Grounding Lite). */
export type ModelUse = "no-training-on-inputs" | "not-stored-by-model";
export type ModelUseRule = "none" | readonly { rule: ModelUse; quote: string }[];

/** Whether results may be counted, sorted or compared; a "no" carries the source's words (Yelp's, say). */
export type CompareAllowed = { allowed: "yes" } | { allowed: "no"; quote: string };

/** The licences a card may name. ./registry.ts lists each with its name and page; anything else is refused. */
export type LicenceId = "ogl-canada-2.0" | "statcan-open-licence" | "site-terms";

export interface Licence {
  id: LicenceId;
  /** The licence's name, as its own page gives it. */
  name: string;
  url: string;
  /** Whether it lets DotAmi ship what it made from the source. A site's own terms of use don't. */
  open: boolean;
}

/** The code keys a source is looked up by (research-kit.md § 5.3). */
export type KeyKind =
  | "noc"
  | "naics"
  | "province"
  | "area"
  | "economic-region"
  | "business-name"
  | "asset-type"
  | "line-kind"
  | "none";

/**
 * Who checked the terms quote: a person read the page; an AI model read it in a build session (through a
 * fetch or summarising tool, not a person); a tool found the quote word for word on the live page
 * (scripts/check-quotes.mjs); or nobody has read the terms yet, so `termsQuote` is null.
 */
export type CheckedBy = "person" | "model" | "tool" | "not-read";

/** When DotAmi uses the source: today, or from a later phase of the plan (the card says it ahead of time). */
export type Phase = "now" | "phase-2" | "phase-3";

/** The hand-kept lists that are views over the registry (./views.ts). */
export type ListName = "ad-libraries";

/** A file of a shipped source, with where the government publishes it. Its pinned SHA-256 lives in its importer. */
export interface SourceFile {
  name: string;
  url: string;
}

export interface SourceCard {
  /** Permanent id, lower case words joined by hyphens. */
  id: string;
  /** The source's name as DotAmi shows it (an official dataset's own title). */
  name: string;
  publisher: string;
  /** The source's own page: the dataset's record, or the site a link opens. */
  url: string;
  phase: Phase;
  access: Access;
  keyHolder: KeyHolder;
  keepLimit: readonly KeepLimit[];
  display: Display;
  figureKind: FigureKind;
  feeds: readonly Feed[];
  modelUseRule: ModelUseRule;
  compareAllowed: CompareAllowed;
  licence: LicenceId;
  /**
   * The credit line, word for word, or null when DotAmi takes nothing from the source. It may hold `{table}`
   * and `{period}`, which the import fills from its table id and reference period (scripts/lib/import-kit.mjs).
   */
  creditLine: string | null;
  keyedBy: readonly KeyKind[];
  /** The page the deciding words were read on (a licence, or terms of use), or null when nothing was read. */
  termsUrl: string | null;
  /** The deciding words, word for word; null only when `checkedBy` is "not-read". */
  termsQuote: string | null;
  /** The day the terms were read or checked (or, when not read, the day the page was last tried). YYYY-MM-DD. */
  seenOn: string;
  checkedBy: CheckedBy;
  /**
   * The source's next release, when the publisher states a date, and what the release is ("count"). After that
   * day, a catalog made from the source shows the amber "A newer … may be out." line (./freshness.ts).
   */
  nextRelease?: { date: string; what: string };
  /** The files a `ship` source publishes that its importer reads. A later-phase card may leave them out. */
  files?: readonly SourceFile[];
  /**
   * For a `never-automated` source: the address beginnings nothing in DotAmi may fetch ("https://www.jobbank.gc.ca").
   * The validator refuses any fetchable card whose address starts with one of them.
   */
  neverFetch?: readonly string[];
  /** The hand-kept lists this source appears on (./views.ts). */
  lists?: readonly ListName[];
  /** Anything a reader of the card should know, in plain words: where a fact came from, what's still open. */
  note?: string;
}
