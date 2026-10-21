/**
 * The registry's validator (docs/architecture/research-kit.md § 5.2): every card has every field, names a
 * licence the registry knows, and keeps to the kit's rules. It returns what is wrong, in plain words, card by
 * card; an empty list means the registry is sound. tests/research-kit-registry.spec.ts runs it on every test
 * run, and plants one failure of each kind to show it still catches them.
 */
import type { Access, Feed, LicenceId, Licence, SourceCard } from "./types";

/** Every field § 5.2 names, which every card must carry (an empty list or null still counts as said). */
export const REQUIRED_FIELDS = [
  "id",
  "name",
  "publisher",
  "url",
  "phase",
  "access",
  "keyHolder",
  "keepLimit",
  "display",
  "figureKind",
  "feeds",
  "modelUseRule",
  "compareAllowed",
  "licence",
  "creditLine",
  "keyedBy",
  "termsUrl",
  "termsQuote",
  "seenOn",
  "checkedBy",
] as const satisfies readonly (keyof SourceCard)[];

const ACCESS: readonly Access[] = ["ship", "link", "lens-live", "page-person-opens", "never-automated"];
const PHASES = ["now", "phase-2", "phase-3"];
const KEY_HOLDERS = ["none", "person"];
const FIGURE_KINDS = ["published", "count", "vendor-estimate", "none"];
const FEEDS: readonly Feed[] = ["gauge", "total", "shown", "search"];
const KEY_KINDS = ["noc", "naics", "province", "area", "economic-region", "business-name", "asset-type", "line-kind", "none"];
const CHECKED_BY = ["person", "model", "tool", "not-read"];
const KEEP_FIELDS = ["content", "id", "coordinates"];
const MODEL_USES = ["no-training-on-inputs", "not-stored-by-model"];
/** The placeholders a credit line may hold, filled by the import from its table id and reference period. */
const PLACEHOLDERS = ["{table}", "{period}"];

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Ways of reaching a source in which DotAmi itself fetches something from it. */
const FETCHES: readonly Access[] = ["ship", "lens-live", "page-person-opens"];

/** Whether `url` is at or under `prefix` ("https://www.jobbank.gc.ca" covers ".../jobsearch", not "...gc.ca.evil"). */
export function isUnder(url: string, prefix: string): boolean {
  if (!url.startsWith(prefix)) return false;
  const next = url.charAt(prefix.length);
  return next === "" || next === "/" || next === "?" || next === "#" || prefix.endsWith("/");
}

/** The addresses DotAmi would fetch for a card: a shipped source's files, or the page or service itself. */
export function fetchedAddresses(card: SourceCard): string[] {
  if (!FETCHES.includes(card.access)) return [];
  const files = (card.files ?? []).map((f) => f.url);
  return card.access === "ship" ? files : [card.url, ...files];
}

const isHttps = (url: unknown) => typeof url === "string" && /^https:\/\/[^\s]+$/.test(url);
const said = (value: unknown) => typeof value === "string" && value.trim() !== "";

/**
 * What is wrong with the registry, as "<card id>: <problem>" lines. `today` (YYYY-MM-DD) bounds the days a card
 * may say it was seen on.
 */
export function validateRegistry(
  cards: readonly SourceCard[],
  licences: Readonly<Record<string, Licence>>,
  today: string,
): string[] {
  const problems: string[] = [];
  const seen = new Set<string>();
  // Every address a card bars, with the card that bars it (a card that bars addresses must be never-automated, below,
  // so one turned into something DotAmi fetches is refused twice: for that, and for fetching its own addresses).
  const barred = cards.flatMap((c) => (c.neverFetch ?? []).map((prefix) => ({ prefix, by: c.id })));

  cards.forEach((card, index) => {
    const who = typeof card.id === "string" && card.id ? card.id : `card ${index + 1}`;
    const problem = (text: string) => problems.push(`${who}: ${text}`);

    // Every field, said. A card missing one is refused before anything else is read from it.
    const record = card as unknown as Record<string, unknown>;
    const missing = REQUIRED_FIELDS.filter((field) => !(field in record) || record[field] === undefined);
    if (missing.length > 0) {
      problem(`missing ${missing.join(", ")}`);
      return;
    }

    if (!ID.test(card.id)) problem(`the id "${card.id}" isn't lower-case words joined by hyphens`);
    if (seen.has(card.id)) problem("the id is used by another card");
    seen.add(card.id);
    for (const field of ["name", "publisher"] as const) if (!said(card[field])) problem(`${field} is empty`);
    if (!isHttps(card.url)) problem(`the url "${card.url}" isn't an https address`);

    if (!PHASES.includes(card.phase)) problem(`unknown phase "${card.phase}"`);
    if (!ACCESS.includes(card.access)) problem(`unknown access "${card.access}"`);
    if (!KEY_HOLDERS.includes(card.keyHolder)) problem(`unknown keyHolder "${card.keyHolder}"`);
    if (!FIGURE_KINDS.includes(card.figureKind)) problem(`unknown figureKind "${card.figureKind}"`);
    if (!CHECKED_BY.includes(card.checkedBy)) problem(`unknown checkedBy "${card.checkedBy}"`);
    for (const feed of card.feeds) if (!FEEDS.includes(feed)) problem(`unknown feed "${feed}"`);
    if (card.keyedBy.length === 0) problem("keyedBy is empty (say \"none\" when nothing keys it)");
    for (const key of card.keyedBy) if (!KEY_KINDS.includes(key)) problem(`unknown key "${key}"`);

    // The licence: one the registry knows, and an open one for anything DotAmi ships.
    const licence = licences[card.licence as LicenceId] as Licence | undefined;
    if (!licence || licence.id !== card.licence) problem(`unknown licence "${card.licence}"`);
    else if (card.access === "ship" && !licence.open) problem(`ships under "${card.licence}", which lets DotAmi ship nothing`);

    // The credit line: owed for anything shipped, with only the import's placeholders in it.
    if (card.creditLine !== null && !said(card.creditLine)) problem("creditLine is empty (null when nothing is taken from the source)");
    if (card.access === "ship" && card.creditLine === null) problem("ships with no credit line");
    for (const placeholder of (card.creditLine ?? "").match(/\{[^}]*\}/g) ?? []) {
      if (!PLACEHOLDERS.includes(placeholder)) problem(`unknown placeholder ${placeholder} in the credit line`);
    }

    // The terms: read (with the words and the page) or plainly not read, and only a link may go unread.
    if (!DAY.test(card.seenOn)) problem(`seenOn "${card.seenOn}" isn't a day like 2026-10-20`);
    else if (card.seenOn > today) problem(`seenOn ${card.seenOn} is after today`);
    if (card.checkedBy === "not-read") {
      if (card.termsQuote !== null) problem("has a terms quote but says nobody read the terms");
      if (card.access !== "link" && card.access !== "never-automated") problem(`is ${card.access} with terms nobody has read`);
    } else {
      if (!said(card.termsQuote)) problem("has no terms quote (the deciding words, word for word)");
      if (!isHttps(card.termsUrl)) problem("has no https page the terms quote was read on");
    }

    // What may be kept: each limit says its field and carries the source's words, or why there are none.
    if (card.keepLimit.length === 0) problem("keepLimit is empty");
    for (const keep of card.keepLimit) {
      if (!KEEP_FIELDS.includes(keep.field)) problem(`keepLimit: unknown field "${keep.field}"`);
      if (keep.quote === null ? !said(keep.why) : !said(keep.quote)) problem(`keepLimit for ${keep.field}: no quote and no reason`);
    }
    if (card.access === "ship" && !card.keepLimit.some((k) => k.field === "content" && k.limit === "forever")) {
      problem("is shipped, but no keep limit lets its content be kept");
    }

    if (card.display.kind === "with-conditions" && (card.display.conditions.length === 0 || !card.display.conditions.every(said))) {
      problem("display has conditions with no words");
    }
    if (card.compareAllowed.allowed === "no" && !said(card.compareAllowed.quote)) problem("compareAllowed is no, with no quote");
    if (card.modelUseRule !== "none") {
      if (card.modelUseRule.length === 0) problem("modelUseRule is an empty list (say \"none\")");
      for (const rule of card.modelUseRule) {
        if (!MODEL_USES.includes(rule.rule)) problem(`unknown model-use rule "${rule.rule}"`);
        if (!said(rule.quote)) problem(`model-use rule ${rule.rule} has no quote`);
      }
    }

    // A vendor's own estimate is shown as theirs, never added into a gauge or a total (research-kit.md § 5.2).
    if (card.figureKind === "vendor-estimate" && card.feeds.some((f) => f === "gauge" || f === "total")) {
      problem("is a vendor's estimate, and feeds a gauge or a total");
    }
    // A source DotAmi doesn't fetch can't feed anything, or give a figure.
    if ((card.access === "link" || card.access === "never-automated") && (card.feeds.length > 0 || card.figureKind !== "none")) {
      problem(`is ${card.access}, so nothing from it can feed DotAmi or give a figure`);
    }

    // Per kind of access.
    if (card.access === "ship" && card.phase !== "phase-3" && (card.files ?? []).length === 0) problem("is shipped, but names no files");
    for (const file of card.files ?? []) {
      if (!said(file.name) || !isHttps(file.url)) problem(`the file "${file.name}" needs a name and an https address`);
    }
    if (card.access === "lens-live" && card.keyHolder !== "person") problem("is a live look-up that isn't on the person's own account");
    if (card.access === "never-automated" && (card.neverFetch ?? []).length === 0) problem("is never-automated, but bars no address");
    for (const prefix of card.neverFetch ?? []) if (!isHttps(prefix)) problem(`the barred address "${prefix}" isn't an https address`);
    if (card.access !== "never-automated" && (card.neverFetch ?? []).length > 0) problem("bars addresses but isn't never-automated");

    // A source whose terms bar scripts is never fetched, by any card.
    for (const address of fetchedAddresses(card)) {
      const bar = barred.find((b) => isUnder(address, b.prefix));
      if (bar) problem(`is ${card.access} and would fetch ${address}, which the ${bar.by} card marks never-automated`);
    }

    if (card.nextRelease !== undefined) {
      if (!DAY.test(card.nextRelease.date)) problem(`nextRelease "${card.nextRelease.date}" isn't a day like 2026-12-01`);
      if (!said(card.nextRelease.what)) problem("nextRelease doesn't say what is released (\"count\")");
    }
  });
  return problems;
}
