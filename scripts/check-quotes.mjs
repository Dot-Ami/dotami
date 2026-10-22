// Checks that the words a citation relies on are on its page, as whole words: the tool behind a
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
// Before comparing, it evens out only whitespace, typographic quotes and primes (′ ″), dashes and
// the minus sign, and drops the invisible soft hyphen; case, punctuation, numbers and accents must
// match. A quote is found only as whole words (never inside a longer word or number), only inside
// one block of the page (never stitched across cells, list items or paragraphs), and never in text
// the page hides. A quote needs at least 3 words. Exit code 0 when every quote is found (and it
// prints the date to record as `checkedOn`), 1 when a quote is missing or a page couldn't be
// checked, 2 for a usage error. It never changes a file: the builder copies what it printed into
// the catalog. The quality report (`npm run quality:report -- --live`, scripts/quality-report.mjs)
// runs it over every tool check and counts what it found, through `onResult`.

import { pathToFileURL } from "node:url";

// ---- Page to text ----------------------------------------------------------------------------

// Elements whose content a reader never sees as page text.
const HIDDEN_ELEMENTS = ["head", "script", "style", "noscript", "template", "svg", "iframe", "object"];

// Tags that sit inside a line of text: removed with nothing in their place, so "GST/<abbr>HST</abbr>"
// stays "GST/HST" and "<strong>small</strong> operator" stays "small operator". Every other tag
// (paragraphs, list items, cells, line breaks…) becomes BLOCK, so two blocks never run together.
const INLINE_TAGS = new Set([
  "a", "abbr", "b", "bdi", "bdo", "cite", "code", "data", "dfn", "em", "i", "kbd", "mark", "q", "s",
  "samp", "small", "span", "strong", "sub", "sup", "time", "u", "var", "wbr", "del", "ins",
]);

// Marks where one block of the page ends and the next begins. It is a control character no quote
// contains and that isn't whitespace, so evening out the spaces never turns it into the space
// between two words of a quote: "$30,000" in one cell and "or less" in the next can't match
// "$30,000 or less".
const BLOCK = "\u001e";

// Elements with no closing tag, so hiding one hides nothing after it.
const VOID_ELEMENTS = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"]);

/** The end of the element opened just before `start`: after its own closing tag, counting nested ones of the same name. */
function closingEnd(html, name, start) {
  const tags = new RegExp(`<(/?)${name}\\b[^>]*>`, "gi");
  tags.lastIndex = start;
  let depth = 1;
  for (let t = tags.exec(html); t; t = tags.exec(html)) {
    depth += t[1] ? -1 : 1;
    if (depth === 0) return tags.lastIndex;
  }
  // Never closed: a browser would keep everything after it inside it.
  return html.length;
}

/** True for an opening tag's attributes that hide the element: `hidden`, or an inline display:none. */
function hidesElement(attrs) {
  // Attribute values blanked first, so class="foo hidden" or type="hidden" doesn't count.
  const names = attrs.replace(/(["'])[\s\S]*?\1/g, '""');
  if (/\shidden(?=[\s=/>]|$)/i.test(names)) return true;
  return /\sstyle\s*=\s*(["'])[^"']*\bdisplay\s*:\s*none/i.test(attrs);
}

/** The HTML without the elements the page itself hides (hidden attribute, inline display:none). */
function dropHiddenByAttribute(html) {
  const opening = /<([a-z][a-z0-9-]*)(\s[^>]*)?>/gi;
  let out = "";
  let from = 0;
  for (let m = opening.exec(html); m; m = opening.exec(html)) {
    const attrs = m[2] ?? "";
    if (!hidesElement(attrs)) continue;
    const name = m[1].toLowerCase();
    const end = VOID_ELEMENTS.has(name) || attrs.trimEnd().endsWith("/") ? opening.lastIndex : closingEnd(html, name, opening.lastIndex);
    out += html.slice(from, m.index) + (INLINE_TAGS.has(name) ? "" : BLOCK);
    from = end;
    opening.lastIndex = end;
  }
  return out + html.slice(from);
}

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

/**
 * The page's text: comments, elements that never show (head, scripts, styles…) and elements the page
 * hides (the hidden attribute, an inline display:none) dropped; tags removed, each block's end marked
 * with BLOCK; entities decoded. Text hidden only by a stylesheet class still counts, such as
 * canada.ca's screen-reader-only "wb-inv": a screen reader reads it, and this script doesn't read
 * stylesheets.
 */
export function pageToText(html) {
  let text = html.replace(/<!--[\s\S]*?-->/g, " ");
  for (const tag of HIDDEN_ELEMENTS) {
    text = text.replace(new RegExp(`<${tag}\\b[\\s\\S]*?</${tag}\\s*>`, "gi"), BLOCK);
  }
  text = dropHiddenByAttribute(text);
  text = text.replace(/<\/?([a-z][a-z0-9-]*)\b[^>]*>/gi, (_tag, name) => (INLINE_TAGS.has(name.toLowerCase()) ? "" : BLOCK));
  // A stray "<" that opened no tag is left alone; a doctype or processing instruction goes.
  text = text.replace(/<![^>]*>|<\?[^>]*>/g, " ");
  return decodeEntities(text);
}

// ---- What counts as the same words -----------------------------------------------------------

/**
 * Evens out only what a reader can't tell apart on screen: runs of whitespace (including
 * non-breaking spaces) become one space, typographic quotes and primes become straight ones, dashes
 * and the minus sign become a hyphen, and the invisible soft hyphen goes. A block boundary (with any
 * whitespace around it) stays one BLOCK, so it never becomes a space. Nothing else changes.
 */
export function normaliseForMatch(text) {
  return text
    .replace(/­/g, "")
    .replace(/[‘’‚‛′]/g, "'")
    .replace(/[“”„‟″]/g, '"')
    .replace(/[‐‑‒–—―−]/g, "-")
    .replace(/[\s\u001e]*\u001e[\s\u001e]*/g, BLOCK)
    .replace(/\s+/g, " ")
    .replace(/^[\s\u001e]+|[\s\u001e]+$/g, "");
}

const WORD_CHAR_AT_END = /[\p{L}\p{N}]$/u;
const WORD_CHAR_AT_START = /^[\p{L}\p{N}]/u;

/**
 * True when `needle` sits in `haystack` as whole words: a quote that starts or ends with a letter or
 * digit never matches inside a longer word or number, so "30,000 in a year" isn't found in
 * "$130,000 in a year" and "applicable here" isn't found in "inapplicable here". A number also can't
 * continue past a decimal point or comma ("$30,000" isn't found in "$30,000.50").
 */
function foundAsWholeWords(haystack, needle) {
  if (needle === "") return false;
  const startsWithWord = WORD_CHAR_AT_START.test(needle);
  const endsWithWord = WORD_CHAR_AT_END.test(needle);
  const startsWithDigit = /^\d/.test(needle);
  const endsWithDigit = /\d$/.test(needle);
  for (let at = haystack.indexOf(needle); at !== -1; at = haystack.indexOf(needle, at + 1)) {
    // Two code units are enough to see one character before or after, even a surrogate pair.
    const before = haystack.slice(Math.max(0, at - 2), at);
    const after = haystack.slice(at + needle.length, at + needle.length + 2);
    if (startsWithWord && WORD_CHAR_AT_END.test(before)) continue;
    if (endsWithWord && WORD_CHAR_AT_START.test(after)) continue;
    if (startsWithDigit && /\d[.,]$/.test(before)) continue;
    if (endsWithDigit && /^[.,]\d/.test(after)) continue;
    return true;
  }
  return false;
}

/** Each quote, found or not, in the page's text: whole words, inside one block. */
export function findQuotes(pageText, quotes) {
  const haystack = normaliseForMatch(pageText);
  return quotes.map((quote) => ({ quote, found: foundAsWholeWords(haystack, normaliseForMatch(quote)) }));
}

/** Words in a quote: runs between spaces that hold a letter or a digit ("$40,000 or less" is three). */
function wordCount(quote) {
  return quote.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
}

// The fewest words a quote may have; lib/engines/shared/citation-check.ts (MIN_QUOTE_WORDS) agrees.
const MIN_QUOTE_WORDS = 3;

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
  if (quotes.some((q) => wordCount(q) < MIN_QUOTE_WORDS)) {
    return `a quote needs at least ${MIN_QUOTE_WORDS} words: one letter or a bare number proves little`;
  }
  return { url, quotes };
}

/**
 * The whole run, with its outside world passed in so the test can use saved pages: `fetchPage`
 * (url → { ok, status, contentType, body }), `collect` (the recorded tool checks), `log` and `today`.
 * `onResult`, when given, gets what a run over every recorded tool check found (not a `--url` run):
 * { checkedOn, pages: [{ where, url, outcome, status }] }, `outcome` one of "found", "words-missing",
 * "answered" (the server answered `status`, not the page), "unreachable" or "pdf". The quality report
 * counts the dead pages from it (scripts/quality-report.mjs --live). Returns the exit code.
 */
export async function main(
  argv,
  { fetchPage = fetchLive, collect = collectToolChecked, log = console.log, today = new Date().toLocaleDateString("en-CA"), onResult } = {},
) {
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
  const pages = [];
  for (const target of targets) {
    log("");
    log(target.where === "--url" ? target.url : `${target.where}  ${target.url}`);
    const page = await fetchPage(target.url);
    let reason;
    let outcome;
    if (!page.ok) {
      reason = page.status ? `the server answered ${page.status}` : `the page couldn't be reached (${page.error ?? "no answer"})`;
      outcome = page.status ? "answered" : "unreachable";
    } else if (/application\/pdf/i.test(page.contentType) || page.body.startsWith("%PDF-")) {
      reason = "it is a PDF, which this script doesn't read; a person reads PDFs";
      outcome = "pdf";
    }
    if (reason) {
      log(`  could not be checked: ${reason}`);
      unchecked += target.quotes.length;
      pages.push({ where: target.where, url: target.url, outcome, status: page.status ?? 0 });
      continue;
    }
    let pageMissing = 0;
    for (const { quote, found } of findQuotes(pageToText(page.body), target.quotes)) {
      if (!found) pageMissing += 1;
      log(`  ${found ? "found     " : "NOT FOUND "} ${JSON.stringify(quote)}`);
    }
    missing += pageMissing;
    pages.push({ where: target.where, url: target.url, outcome: pageMissing > 0 ? "words-missing" : "found", status: page.status ?? 200 });
  }
  if (onResult && !args.url) onResult({ checkedOn: today, pages });

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
