// Checks that the words a citation relies on are on its page, word for word: the tool behind a
// "Checked by a tool on <date>" source (decided 2026-10-11, option B; docs/engines/citations.md).
//
// A developer script. It is never shipped: the installer copies the built app, not scripts/. It is
// also outside the app's network check (tests/helpers/source-scan.ts reads app/, components/,
// lib/, desktop/ and the top folder, not scripts/), so the fetch below is never something DotAmi
// does on a person's computer; it runs only when a builder runs it.
//
//   node scripts/check-quotes.mjs --url "https://…" --quote "exact words" [--quote "more words"]
//       Before recording a tool check: fetches that one page and looks for each quote.
//   node scripts/check-quotes.mjs
//       Every citation in the catalogs that already has a tool check, checked again.
//
// For each page it turns the HTML into plain text and reports every quote as found or NOT FOUND.
// Before comparing, it evens out only whitespace, typographic quotes and dashes; case, punctuation,
// numbers and accents must match. Exit code 0 when every quote is found (and it prints the date to
// record as `checkedOn`), 1 when a quote is missing or a page couldn't be checked, 2 for a usage
// error. It never changes a file: the builder copies what it printed into the catalog.

import { pathToFileURL } from "node:url";

// ---- Page to text ----------------------------------------------------------------------------

// Elements whose content a reader never sees as page text.
const HIDDEN_ELEMENTS = ["head", "script", "style", "noscript", "template", "svg", "iframe", "object"];

// Tags that sit inside a line of text: removed with nothing in their place, so "GST/<abbr>HST</abbr>"
// stays "GST/HST" and "<strong>small</strong> operator" stays "small operator". Every other tag
// (paragraphs, list items, cells, line breaks…) becomes a space, so two blocks never run together.
const INLINE_TAGS = new Set([
  "a", "abbr", "b", "bdi", "bdo", "cite", "code", "data", "dfn", "em", "i", "kbd", "mark", "q", "s",
  "samp", "small", "span", "strong", "sub", "sup", "time", "u", "var", "wbr", "del", "ins",
]);

// The named entities government pages use; any numeric one (&#8230; &#x2011;) is decoded too. An
// entity not listed stays as written, so a quote relying on it is reported not found, never guessed.
const ENTITIES = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", shy: "­",
  lsquo: "‘", rsquo: "’", sbquo: "‚", ldquo: "“", rdquo: "”", bdquo: "„",
  ndash: "–", mdash: "—", hellip: "…", laquo: "«", raquo: "»", middot: "·",
  copy: "©", reg: "®", trade: "™", sect: "§", para: "¶", deg: "°",
  percnt: "%", dollar: "$", euro: "€", cent: "¢", pound: "£", times: "×",
  agrave: "à", aacute: "á", acirc: "â", auml: "ä", ccedil: "ç",
  egrave: "è", eacute: "é", ecirc: "ê", euml: "ë", icirc: "î", iuml: "ï",
  ocirc: "ô", ouml: "ö", ugrave: "ù", ucirc: "û", uuml: "ü", oelig: "œ",
  Agrave: "À", Acirc: "Â", Ccedil: "Ç", Egrave: "È", Eacute: "É",
  Ecirc: "Ê", Icirc: "Î", Ocirc: "Ô", Ucirc: "Û", OElig: "Œ",
};

function decodeEntities(text) {
  return text.replace(/&(#x[0-9a-f]+|#[0-9]+|[a-z]+);/gi, (whole, name) => {
    if (name[0] === "#") {
      const code = name[1] === "x" || name[1] === "X" ? parseInt(name.slice(2), 16) : parseInt(name.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : whole;
    }
    return Object.hasOwn(ENTITIES, name) ? ENTITIES[name] : whole;
  });
}

/** The text a reader sees on the page: hidden elements and comments dropped, tags removed, entities decoded. */
export function pageToText(html) {
  let text = html.replace(/<!--[\s\S]*?-->/g, " ");
  for (const tag of HIDDEN_ELEMENTS) {
    text = text.replace(new RegExp(`<${tag}\\b[\\s\\S]*?</${tag}\\s*>`, "gi"), " ");
  }
  text = text.replace(/<\/?([a-z][a-z0-9-]*)\b[^>]*>/gi, (_tag, name) => (INLINE_TAGS.has(name.toLowerCase()) ? "" : " "));
  // A stray "<" that opened no tag is left alone; a doctype or processing instruction goes.
  text = text.replace(/<![^>]*>|<\?[^>]*>/g, " ");
  return decodeEntities(text);
}

// ---- What counts as the same words -----------------------------------------------------------

/**
 * Evens out only what a reader can't tell apart on screen: runs of whitespace (including
 * non-breaking spaces) become one space, typographic quotes become straight ones, dashes become a
 * hyphen, and the invisible soft hyphen goes. Nothing else changes.
 */
export function normaliseForMatch(text) {
  return text
    .replace(/­/g, "")
    .replace(/[‘’‚‛′]/g, "'")
    .replace(/[“”„‟″]/g, '"')
    .replace(/[‐‑‒–—―−]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

/** Each quote, found or not, in the page's text. */
export function findQuotes(pageText, quotes) {
  const haystack = normaliseForMatch(pageText);
  return quotes.map((quote) => ({ quote, found: haystack.includes(normaliseForMatch(quote)) }));
}

// ---- Which citations to check ----------------------------------------------------------------

/** The citations that carry a tool check, each with its own quotes. */
export function toolCheckedTargets(listed) {
  return listed
    .filter(({ citation }) => citation.toolCheck)
    .map(({ where, citation }) => ({ where, url: citation.url, quotes: [...citation.toolCheck.quotes] }));
}

/** Every recorded tool check in the catalogs (TypeScript, loaded through tsx, which reads tsconfig's "@/" paths). */
async function collectToolChecked() {
  const { tsImport } = await import("tsx/esm/api");
  const { allCatalogCitations } = await tsImport("../lib/engines/all-citations.ts", import.meta.url);
  return toolCheckedTargets(allCatalogCitations());
}

// ---- Fetching --------------------------------------------------------------------------------

/** The live page. Never throws: a failure comes back as an answer that isn't ok. */
async function fetchLive(url) {
  try {
    const response = await fetch(url, { redirect: "follow", headers: { "user-agent": "DotAmi quote check (developer script)" } });
    return { ok: response.ok, status: response.status, contentType: response.headers.get("content-type") ?? "", body: await response.text() };
  } catch (error) {
    return { ok: false, status: 0, contentType: "", body: "", error: error instanceof Error ? error.message : String(error) };
  }
}

// ---- Running ---------------------------------------------------------------------------------

function usage(log, problem) {
  log(`check-quotes: ${problem}`);
  log('Usage: node scripts/check-quotes.mjs --url "https://…" --quote "exact words" [--quote "more words"]');
  log("       node scripts/check-quotes.mjs          (every citation that already has a tool check)");
  return 2;
}

/** Reads `--url X --quote Y …`; a string is a usage problem. */
function parseArgs(argv) {
  let url;
  const quotes = [];
  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i];
    const value = argv[i + 1];
    if ((flag === "--url" || flag === "--quote") && value === undefined) return `${flag} needs a value`;
    if (flag === "--url") url = value;
    else if (flag === "--quote") quotes.push(value);
    else return `unknown argument "${flag}"`;
    i += 1;
  }
  if (url === undefined && quotes.length === 0) return { url: undefined, quotes };
  if (url === undefined) return "--quote needs a --url";
  if (!/^https:\/\//.test(url)) return "the URL must start with https://";
  if (quotes.length === 0) return "give at least one --quote";
  if (quotes.some((q) => q.trim() === "")) return "a quote is empty";
  return { url, quotes };
}

/**
 * The whole run, with its outside world passed in so the test can use saved pages: `fetchPage`
 * (url → { ok, status, contentType, body }), `collect` (the recorded tool checks), `log` and `today`.
 * Returns the exit code.
 */
export async function main(argv, { fetchPage = fetchLive, collect = collectToolChecked, log = console.log, today = new Date().toLocaleDateString("en-CA") } = {}) {
  const args = parseArgs(argv);
  if (typeof args === "string") return usage(log, args);

  const targets = args.url ? [{ where: "--url", url: args.url, quotes: args.quotes }] : await collect();
  if (targets.length === 0) {
    log("No citation has a tool check yet. Nothing to check.");
    return 0;
  }

  const quoteCount = targets.reduce((n, t) => n + t.quotes.length, 0);
  log(`Checking ${targets.length} page${targets.length === 1 ? "" : "s"} (${quoteCount} quote${quoteCount === 1 ? "" : "s"})…`);

  let missing = 0;
  let unchecked = 0;
  for (const target of targets) {
    log("");
    log(target.where === "--url" ? target.url : `${target.where}  ${target.url}`);
    const page = await fetchPage(target.url);
    let reason;
    if (!page.ok) reason = page.status ? `the server answered ${page.status}` : `the page couldn't be reached (${page.error ?? "no answer"})`;
    else if (/application\/pdf/i.test(page.contentType) || page.body.startsWith("%PDF-")) {
      reason = "it is a PDF, which this script doesn't read; a person reads PDFs";
    }
    if (reason) {
      log(`  could not be checked: ${reason}`);
      unchecked += target.quotes.length;
      continue;
    }
    for (const { quote, found } of findQuotes(pageToText(page.body), target.quotes)) {
      if (!found) missing += 1;
      log(`  ${found ? "found     " : "NOT FOUND "} ${JSON.stringify(quote)}`);
    }
  }

  log("");
  if (missing === 0 && unchecked === 0) {
    if (args.url) {
      log(`${quoteCount === 1 ? "The quote was found" : `All ${quoteCount} quotes were found`}. To record: toolCheck: { checkedOn: ${JSON.stringify(today)}, quotes: ${JSON.stringify(args.quotes)} }`);
    } else {
      log(`All ${quoteCount} quotes were found on ${today}. The recorded tool checks still hold.`);
    }
    return 0;
  }
  const parts = [];
  if (missing > 0) parts.push(`${missing} of ${quoteCount} quotes not found`);
  if (unchecked > 0) parts.push(`${unchecked} of ${quoteCount} quotes not checked`);
  log(`${parts.join("; ")}. Nothing to record.`);
  return 1;
}

// Run only when called as a script, not when the test imports it.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await main(process.argv.slice(2));
}
