/**
 * *About this job* (task 25h; docs/ui-spec/cockpit/about-this-job.md): the panel for the person's picked job,
 * checked for every job group the government lists, the way the screen checks read a screen.
 *
 * - Its words (lib/about-job/words.ts): no verdict, no time, no trade named, and the lead line in the shape
 *   the screen checks lift the quoted lines by.
 * - The rows, in Alberta with and without a region and outside Alberta: the requirement lines word for word in
 *   the file's order, the wage row the spec names for each case with the label its own source code gives, a
 *   "not published" row with the government's note and the row it points to, never a silent fallback.
 * - Drawn for every group, in Alberta and in Ontario: no verdict and no time in DotAmi's words (the quoted
 *   lines lifted only under their lead line, at the rules row, and only lines read from the shipped file);
 *   every amount a figure of the row it stands with; no link carrying the job or the person.
 * - Controls: the same lines without the lead line, a sentence of DotAmi's own in quote marks under a copied
 *   lead line, and a wage with no row each fail.
 * - The NOC and wage modules never reach the browser: no "use client" file imports them, directly or not.
 */
import { readFileSync } from "node:fs";
import path from "node:path";

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { AboutThisJobPanel } from "@/components/cockpit/about-this-job-panel";
import { ABOUT_JOB_LINKS } from "@/lib/about-job/links";
import { quoted, rulesLead, wageBlock, type WageBlock } from "@/lib/about-job/text";
import type { AboutJobView, WageRowView } from "@/lib/about-job/types";
import { aboutJobForFuture, aboutThisJob, isRequirementSubheading, requirementEntries } from "@/lib/about-job/view";
import { aboutJobWords } from "@/lib/about-job/words";
import { nocGroups, nocRequirements } from "@/lib/engines/noc/v2021";
import { jobGroupOf, oasisJobs } from "@/lib/engines/oasis/v2026";
import { ALBERTA_ECONOMIC_REGIONS, regionThePersonPicked } from "@/lib/engines/research-kit/v2026/economic-regions";
import { SOURCES } from "@/lib/engines/research-kit/v2026/registry";

import { uncitedAmounts, type AmountLedger, type AmountPiece, type PublishedWageRow } from "./helpers/number-provenance";
import { QUOTED_SOURCE_KINDS, REQUIREMENT_LINES_PLACE, quotedRun, type QuotedLines } from "./helpers/official-quotes";
import { readSource, sourceFiles } from "./helpers/source-scan";
import { normaliseSpaces } from "./helpers/text-pieces";
import { findTimeWords } from "./helpers/time-words";
import { OFFICIAL_QUOTE_ALLOWANCES, VERDICT_WORDS, findVerdicts } from "./helpers/verdict-words";

/** Every string a words object can produce, each function filled with plain values. */
function sentencesOf(words: unknown): string[] {
  const out: string[] = [];
  const walk = (value: unknown) => {
    if (typeof value === "string") out.push(value);
    else if (typeof value === "function") {
      const fn = value as (...args: unknown[]) => unknown;
      const filled = fn(...Array.from({ length: fn.length }, (_, i) => ["Invented", "00000.00", "00000"][i] ?? "Invented"));
      if (typeof filled === "string") out.push(filled);
    } else if (value && typeof value === "object") for (const v of Object.values(value)) walk(v);
  };
  walk(words);
  return out;
}

const AB = (region: string | null = null) => ({ region: regionThePersonPicked(region, "AB"), area: null });
const one = (jobCode: string, province: string, region: string | null = null) => {
  const view = aboutThisJob({ jobCode, province, ...(province === "AB" ? AB(region) : { region: { kind: "not-picked" as const }, area: null }) });
  if (!view) throw new Error(`no view for ${jobCode}`);
  return view;
};

/** One job per group, the first the government lists for it. */
const firstJobOfEachGroup = [...new Map(oasisJobs.map((job) => [jobGroupOf(job.code), job])).values()];

/** The panel drawn, as plain text with a line break at every block's edge, the way a screen's innerText reads. */
function drawn(view: AboutJobView, part?: string): string {
  let html = renderToStaticMarkup(createElement(AboutThisJobPanel, { view, onClose: () => {} }));
  if (part) {
    const start = html.indexOf(`data-about-row="${part}"`);
    const end = html.indexOf("data-about-row=", start + 10);
    html = html.slice(start, end === -1 ? undefined : end);
  }
  return html
    .replace(/<\/(p|h2|h3|li|blockquote|div|button)>/g, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

/** The figures of a row, in cents, from the file's own text. */
const cents = (text: string | null) => (text === null ? null : Math.round(Number(text) * 100));
const LEVEL_OF: Record<Exclude<WageRowView["level"], "not-published">, PublishedWageRow["level"]> = {
  "economic-region": "economic-region",
  "small-area": "small-area",
  province: "province",
  canada: "canada",
  "not-stated": "not-stated",
};
function published(row: WageRowView): PublishedWageRow {
  if (row.level === "not-published") throw new Error("a row with no figures is never a published fact");
  return {
    noc: row.noc,
    regionCode: row.geography.code,
    sourceCode: row.sourceCode,
    level: LEVEL_OF[row.level],
    period: row.period,
    per: row.basis === "annual" ? "year" : "hour",
    lowCents: cents(row.low),
    medianCents: cents(row.median),
    highCents: cents(row.high),
  };
}

/** The wage row as the harness collects it: one piece per block, carrying the row it shows. */
function wagePieces(block: WageBlock, where = `cockpit › about this job › wages`): AmountPiece[] {
  const piece: AmountPiece = { where, text: [block.label ?? "", ...block.lines].join(" "), ...(block.row ? { wageRow: published(block.row) } : {}) };
  return [piece, ...(block.then ? wagePieces(block.then, `${where} › the row the note points to`) : [])];
}
function rowsOf(block: WageBlock | null): PublishedWageRow[] {
  return block ? [...(block.row ? [published(block.row)] : []), ...rowsOf(block.then)] : [];
}
const ledgerFor = (rows: PublishedWageRow[]): AmountLedger => ({ officialFees: [], yours: [], quotedThresholds: [], addable: [], publishedWageRows: rows });

/** The lines the run read from the shipped file, for the group a view shows. */
const readFor = (view: AboutJobView): QuotedLines =>
  view.group ? [{ kind: "noc-employment-requirements", group: view.group.code, lines: nocRequirements(view.group.code) }] : [];
const RULES_WHERE = `cockpit › ${REQUIREMENT_LINES_PLACE}`;

/** What the screen checks find on one drawn panel: verdicts, time words outside the quote, uncited amounts. */
function findings(view: AboutJobView): string[] {
  const found: string[] = [];
  const whole = drawn(view);
  for (const v of findVerdicts(whole)) found.push(`verdict: ${v}`);
  for (const t of findTimeWords(drawn(view, "rules"), [], { where: RULES_WHERE, read: readFor(view) })) found.push(`time (rules): ${t}`);
  for (const part of ["wages", "counts", "links"]) for (const t of findTimeWords(drawn(view, part))) found.push(`time (${part}): ${t}`);
  const block = wageBlock(view.wages.shown);
  for (const u of uncitedAmounts(wagePieces(block), ledgerFor(rowsOf(block)))) found.push(`amount: ${u}`);
  // Nothing outside the wage row writes an amount at all.
  for (const part of ["rules", "counts", "links"]) for (const u of uncitedAmounts([{ where: part, text: drawn(view, part) }], ledgerFor([]))) found.push(`amount: ${u}`);
  for (const href of whole.match(/href="[^"]*"/g) ?? []) found.push(`link: ${href}`);
  return found;
}

describe("About this job's words (lib/about-job/words.ts)", () => {
  const sentences = [...sentencesOf(aboutJobWords), ...ABOUT_JOB_LINKS.map((l) => l.label)];

  it("has words to check", () => {
    expect(sentences.length).toBeGreaterThan(40);
  });

  it("no sentence gives a verdict or says a time", () => {
    for (const s of sentences) {
      expect(s, s).not.toMatch(VERDICT_WORDS);
      expect(findVerdicts(s), s).toEqual([]);
      expect(findTimeWords(s), s).toEqual([]);
    }
  });

  it("names no trade: the words are the same for every job", () => {
    const trades = /\b(cabinet\w*|furniture|carpent\w*|hair\w*|barber\w*|athlete\w*|plumb\w*|electrician\w*|weld\w*)\b/i;
    for (const s of sentences) expect(s, s).not.toMatch(trades);
  });

  it("keeps the lead line in the shape the screen checks lift the quoted lines by", () => {
    const kind = QUOTED_SOURCE_KINDS.find((k) => k.id === "noc-employment-requirements")!;
    const lead = aboutJobWords.rules.lead("72311", "Cabinetmakers");
    const match = [...normaliseSpaces(lead).matchAll(new RegExp(kind.label.source, "g"))];
    expect(match).toHaveLength(1);
    expect(match[0]![0]).toBe(lead);
    expect(match[0]![1]).toBe("72311");
  });

  it("are the spec's words, word for word, where the spec fixes them", () => {
    expect(aboutJobWords.wages.notYours).toBe("What workers in this job group were paid. Not what a shop earns, and not what you would earn.");
    expect(aboutJobWords.footer).toBe("What the government publishes about this job, side by side. Nothing here says whether it fits you.");
    expect(aboutJobWords.kicker("Cabinetmakers", "72311.00")).toBe("Cabinetmakers · 72311.00 · your pick of job");
    expect(aboutJobWords.links.copyText("Cabinetmakers", "72311.00", "72311")).toBe("Cabinetmakers · 72311.00 · NOC 72311");
  });
});

describe("Employment requirements: the government's lines, word for word", () => {
  it("quotes 72311 Cabinetmakers' four lines in the file's order, the double space kept", () => {
    const view = one("72311.00", "AB");
    expect(rulesLead(view)).toBe("The government's words, quoted in full for job group 72311 Cabinetmakers:");
    expect(view.rules.entries).toEqual(nocRequirements("72311").map((text) => ({ kind: "line", text: text.trim() })));
    expect(view.rules.entries).toHaveLength(4);
    expect(view.rules.entries[1]!.text).toContain("program  or A combination");
    expect(view.rules.groupHoldsOthers).toBe(false);
    const text = drawn(view, "rules");
    expect(text).toContain(quoted(nocRequirements("72311")[0]!.trim()));
    expect(text).toContain("program  or A combination");
  });

  it("keeps 63210's sub-headings as sub-headings, and says the group holds another job", () => {
    const view = one("63210.02", "AB");
    const subheadings = view.rules.entries.filter((e) => e.kind === "subheading").map((e) => e.text);
    expect(subheadings).toEqual(["Hairstylists", "Barbers"]);
    expect(view.rules.groupHoldsOthers).toBe(true);
    const text = drawn(view, "rules");
    expect(text).toContain("Barbers\n");
    expect(text).not.toContain("“Barbers”");
    expect(text).toContain(aboutJobWords.rules.groupNote);
  });

  it("reads a line as a sub-heading only when it is short, ends without punctuation and says nothing", () => {
    const all = nocGroups.flatMap((g) => nocRequirements(g.code));
    expect(all).toHaveLength(2122);
    const subheadings = all.filter(isRequirementSubheading);
    // The file's 62 lines with no closing punctuation: 57 name a job, 5 are sentences without a full stop.
    expect(subheadings).toHaveLength(57);
    // The longest is 75 characters; the screen checks read a sub-heading of up to 100 (tests/helpers/official-quotes.ts).
    expect(Math.max(...subheadings.map((s) => s.trim().length))).toBe(75);
    for (const sentence of [
      "On-the-job training is provided for several weeks",
      "Dental assistants require completion of an eight-month to one-year college or other program",
      "Border services student officers must complete Control and Defensive Tactics (CDT) training",
      "Several years of related retail or wholesale sales experience",
      "Cable television service technicians require completion",
    ]) {
      expect(all.some((line) => line.startsWith(sentence) && !isRequirementSubheading(line)), sentence).toBe(true);
    }
  });

  it("quotes every line of every group, and nothing else", () => {
    for (const { code } of nocGroups) {
      expect(requirementEntries(code).map((e) => e.text)).toEqual(nocRequirements(code).map((line) => line.trim()));
    }
  });
});

describe("Wages published for this job group: the row the spec names, labelled by its own code", () => {
  it("in Alberta with no region kept: the province's own row, and says the region isn't picked", () => {
    const view = one("72311.00", "AB");
    expect(view.wages.context).toEqual({ kind: "not-picked" });
    const block = wageBlock(view.wages.shown);
    expect(block.row?.geography.code).toBe("ER48");
    expect(block.label).toBe("Alberta-wide figure");
    expect(block.lines).toEqual(["Hourly · low $18.00 · median $23.00 · high $30.00", "Reference period 2023-2024 · Employment Insurance Survey Data"]);
    const text = drawn(view, "wages");
    expect(text).toContain("Your region isn't picked.");
    expect(text).toContain(aboutJobWords.wages.notYours);
    expect(text).toContain(aboutJobWords.wages.lowHigh);
    expect(text).toContain("Job Bank wage file 2025, revised 2025-11-19. Contains information licensed under the Open Government Licence – Canada.");
  });

  it("with Calgary picked: Calgary's row, an economic region by its code", () => {
    const block = wageBlock(one("72311.00", "AB", "4830").wages.shown);
    expect(block.row?.geography.code).toBe("ER4830");
    expect(block.label).toBe("Economic region: Calgary");
    expect(drawn(one("72311.00", "AB", "4830"), "wages")).toContain("Your region: Calgary (your pick)");
  });

  it("with I don't know: the province's row, saying so", () => {
    const view = one("72311.00", "AB", "dont-know");
    expect(wageBlock(view.wages.shown).row?.geography.code).toBe("ER48");
    expect(drawn(view, "wages")).toContain("You said you don't know your region.");
  });

  it("a province's figure shown under a region says so (63210 under Calgary carries a PR code)", () => {
    const block = wageBlock(one("63210.01", "AB", "4830").wages.shown);
    expect(block.label).toBe("Alberta-wide figure");
    expect(block.lines[0]).toBe("Shown under Calgary, but the government's code for this row says it is an Alberta-wide figure.");
    expect(block.lines[1]).toBe("Hourly · low $15.00 · median $19.23 · high $26.00");
  });

  it("a note pointing to Canada's row: that row, itself not published, and its note names no level, so nothing more", () => {
    // 00013 (senior managers in health, education, social and community services) in Alberta: N/A, "at the
    // national level"; Canada's row is N/A too, with a note that names no level.
    const block = wageBlock(one("00013.00", "AB").wages.shown);
    expect(block.lines[0]).toBe("Not published for Alberta.");
    expect(block.lines[1]).toMatch(/^The government's note: “.*at the national level\.”$/);
    expect(block.lines[2]).toBe("The row that note points to:");
    expect(block.then).toEqual({ label: null, lines: ["Not published for Canada."], row: null, then: null });
  });

  it("a region with no figures whose note names no level: only the not-published line, and no other row", () => {
    // 31100 (Anesthesiologists, 31100.01) under Calgary: N/A with no note.
    const block = wageBlock(one("31100.01", "AB", "4830").wages.shown);
    expect(block).toEqual({ label: null, lines: ["Not published for Calgary."], row: null, then: null });
  });

  it("a region with no figures: not published, the government's note, and the row it points to, never silently", () => {
    const block = wageBlock(one("72311.00", "AB", "4850").wages.shown);
    expect(block.row).toBeNull();
    expect(block.lines).toEqual([
      "Not published for Red Deer.",
      "The government's note: “Due to data limitations, the wage for this occupation cannot be published. Please refer to the wage published for this occupation at the provincial level.”",
      "The row that note points to:",
    ]);
    expect(block.then?.row?.geography.code).toBe("ER48");
    expect(block.then?.label).toBe("Alberta-wide figure");
  });

  it("outside Alberta: the row for the province or territory as a whole, labelled by its own code, with no Tradesecrets", () => {
    const on = one("72311.00", "ON");
    expect(on.wages.context).toEqual({ kind: "outside-alberta", place: "Ontario" });
    expect(wageBlock(on.wages.shown).row?.geography.code).toBe("ER35");
    const text = drawn(on);
    expect(text).toContain(
      "DotAmi asks your region only in Alberta for now, so this is the row the wage file gives for Ontario as a whole, with the level its own code gives it.",
    );
    expect(text).not.toContain("Tradesecrets: trade profiles");
    expect(text).toContain("Tradesecrets is Alberta's trade list, so it isn't listed for Ontario.");
    // A territory's one code, named after the place itself; its label from its own code.
    for (const [province, code] of [
      ["YT", "ER6010"],
      ["NT", "ER6110"],
      ["NU", "ER6210"],
      ["PE", "ER1110"],
    ] as const) {
      const view = one("72311.00", province);
      const shown = view.wages.shown;
      const row = shown.kind === "missing" ? null : shown.row;
      if (row) expect(row.geography.code, province).toBe(code);
      expect(drawn(view)).not.toMatch(/province-wide|this province/i);
    }
  });

  it("formats only the file's own digits", async () => {
    const { wageAmount } = await import("@/lib/about-job/text");
    expect(wageAmount("18", "hourly")).toBe("$18.00");
    expect(wageAmount("19.23", "hourly")).toBe("$19.23");
    expect(wageAmount("84000", "annual")).toBe("$84,000");
    expect(wageAmount("184000", "annual")).toBe("$184,000");
    expect(wageAmount("47.5", "hourly")).toBe("$47.50");
  });
});

describe("Business counts and Where to look yourself", () => {
  it("says counts aren't in this version, and the area the person gave or that none is picked", () => {
    expect(drawn(one("72311.00", "AB"), "counts")).toContain("Your area isn't picked.");
    const withArea = aboutThisJob({ jobCode: "72311.00", province: "AB", region: { kind: "not-picked" }, area: "Somewhere else in Alberta" })!;
    expect(drawn(withArea, "counts")).toContain("Your area: Somewhere else in Alberta (your pick). Nothing reads it yet.");
    expect(drawn(withArea, "counts")).toContain(aboutJobWords.counts.notInVersion);
  });

  it("shows the job's name and code as text to copy, and three general pages with no search words", () => {
    const view = one("72311.00", "AB");
    const text = drawn(view, "links");
    expect(text).toContain("Cabinetmakers · 72311.00 · NOC 72311");
    expect(view.links.pages.map((l) => l.url)).toEqual([
      "https://www.jobbank.gc.ca/trend-analysis/search-wages",
      "https://bizpal.ca/",
      "https://tradesecrets.alberta.ca/trades-in-alberta/profiles/",
    ]);
    const html = renderToStaticMarkup(createElement(AboutThisJobPanel, { view, onClose: () => {} }));
    expect(html.match(/<a /g)).toHaveLength(3);
    expect(html.match(/target="_blank" rel="noopener noreferrer"/g)).toHaveLength(3);
  });

  it("each link is a fixed https address on its registry card's site, with no query, fragment or code", () => {
    for (const link of ABOUT_JOB_LINKS) {
      const url = new URL(link.url);
      const card = SOURCES.find((c) => c.id === link.card);
      expect(card, link.card).toBeDefined();
      expect(url.protocol).toBe("https:");
      expect(url.hostname, link.id).toBe(new URL(card!.url).hostname);
      expect(url.search, link.url).toBe("");
      expect(url.hash, link.url).toBe("");
      expect(link.url, link.url).not.toMatch(/\d{5}/);
    }
  });
});

describe("drawn for every job group: what the screen checks find", () => {
  it("finds nothing in Alberta, with no region and with each of the eight", () => {
    const found: string[] = [];
    for (const job of firstJobOfEachGroup) {
      for (const region of [null, ...ALBERTA_ECONOMIC_REGIONS.map((r) => r.code)]) {
        for (const f of findings(one(job.code, "AB", region))) found.push(`${job.code} AB ${region ?? "not picked"}: ${f}`);
      }
    }
    expect(found.slice(0, 20)).toEqual([]);
  }, 300_000);

  it("finds nothing in every other province and territory", () => {
    const found: string[] = [];
    for (const job of firstJobOfEachGroup) {
      for (const province of ["BC", "MB", "NB", "NL", "NS", "NT", "NU", "ON", "PE", "QC", "SK", "YT"]) {
        for (const f of findings(one(job.code, province))) found.push(`${job.code} ${province}: ${f}`);
      }
    }
    expect(found.slice(0, 20)).toEqual([]);
  }, 300_000);

  it("shows group 53200's line with its allowance only inside the labelled quote", () => {
    const athletes = OFFICIAL_QUOTE_ALLOWANCES.find((a) => a.sourceKind === "noc-employment-requirements")!;
    const view = one("53200.00", "AB");
    const text = drawn(view, "rules");
    expect(text).toContain(`“${athletes.text}”`);
    expect(findVerdicts(text)).toEqual([]);
  });
});

describe("the controls: the screen checks still catch what they should", () => {
  const athletes = OFFICIAL_QUOTE_ALLOWANCES.find((a) => a.sourceKind === "noc-employment-requirements")!;

  it("the requirement lines without their lead line are DotAmi's words, and fail", () => {
    const lines = nocRequirements("72311").map((l) => `“${l.trim()}”`).join("\n");
    expect(findTimeWords(lines, [], { where: RULES_WHERE, read: readFor(one("72311.00", "AB")) }).length).toBeGreaterThan(0);
    expect(findVerdicts(`“${athletes.text}”`).length).toBeGreaterThan(0);
  });

  it("a sentence of DotAmi's own in quote marks under a copied lead line fails", () => {
    const view = one("72311.00", "AB");
    const planted = quotedRun(rulesLead(view)!, ["Most people finish the program in four years."]);
    expect(findTimeWords(planted, [], { where: RULES_WHERE, read: readFor(view) }).length).toBeGreaterThan(0);
  });

  it("the real lines under their lead line fail on any other row", () => {
    const view = one("72311.00", "AB");
    expect(findTimeWords(drawn(view, "rules"), [], { where: "cockpit › about this job › wages", read: readFor(view) }).length).toBeGreaterThan(0);
  });

  it("a wage with no row, or on another row's piece, has no source", () => {
    const block = wageBlock(one("72311.00", "AB", "4830").wages.shown);
    const [piece] = wagePieces(block);
    const ledger = ledgerFor(rowsOf(block));
    expect(uncitedAmounts([piece!], ledger)).toEqual([]);
    expect(uncitedAmounts([{ where: piece!.where, text: piece!.text }], ledger).length).toBe(3);
    expect(uncitedAmounts([{ ...piece!, where: "cockpit › money" }], ledger).length).toBe(3);
  });
});

describe("the data stays on the server", () => {
  it("aboutJobForFuture reads the future's job and place; no job, no panel", () => {
    expect(aboutJobForFuture({ job: null, place: "CA-AB" }, null)).toBeNull();
    expect(aboutJobForFuture({ job: { code: "72311.00" }, place: null }, null)).toBeNull();
    const view = aboutJobForFuture({ job: { code: "72311.00" }, place: "CA-AB" }, null)!;
    expect(view.wages.context).toEqual({ kind: "not-picked" });
    expect(aboutJobForFuture({ job: { code: "99999.99" }, place: "CA-AB" }, null)).toBeNull();
  });

  /** Every module a file imports for real (type-only imports are erased), resolved to repository paths. */
  function importsOf(file: string): string[] {
    const source = readSource(file);
    const out: string[] = [];
    for (const match of source.matchAll(/^\s*(?:import|export)\s+(?!type\b)(?:[^'";]*?\sfrom\s+)?["']([^"']+)["']/gm)) {
      const spec = match[1]!;
      let base: string | null = null;
      if (spec.startsWith("@/")) base = spec.slice(2);
      else if (spec.startsWith(".")) base = path.posix.join(path.posix.dirname(file), spec);
      if (base === null) continue;
      for (const candidate of [`${base}.ts`, `${base}.tsx`, `${base}/index.ts`, `${base}/index.tsx`, base]) {
        try {
          readFileSync(path.join(process.cwd(), candidate));
          out.push(candidate);
          break;
        } catch {
          // Not this one.
        }
      }
    }
    return out;
  }

  /** Every module reachable from `start` through real imports. */
  function reachable(start: string): Set<string> {
    const seen = new Set<string>();
    const queue = [start];
    while (queue.length > 0) {
      const file = queue.pop()!;
      if (seen.has(file)) continue;
      seen.add(file);
      if (/\.(ts|tsx)$/.test(file)) queue.push(...importsOf(file));
    }
    return seen;
  }

  const SERVER_ONLY = ["lib/engines/noc/v2021/data.ts", "lib/engines/wages/v2026/data.ts", "lib/about-job/view.ts"];

  it("no browser module reaches the NOC or wage data", () => {
    const clientFiles = sourceFiles(["app", "components", "lib"], /\.(ts|tsx)$/).filter((file) => /^\s*["']use client["']/.test(readSource(file)));
    expect(clientFiles).toContain("components/cockpit/about-this-job-panel.tsx");
    const leaks: string[] = [];
    for (const file of clientFiles) for (const reached of reachable(file)) if (SERVER_ONLY.includes(reached)) leaks.push(`${file} → ${reached}`);
    expect(leaks).toEqual([]);
  });

  it("control: the walk finds the data behind the server's view", () => {
    expect([...reachable("lib/about-job/view.ts")]).toEqual(expect.arrayContaining(SERVER_ONLY));
  });
});
