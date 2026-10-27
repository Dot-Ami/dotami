/**
 * Where Mara's numbers come from (the maintainer, 2026-10-14: "Lets go for A, but try to go as in depth as
 * possible; like recommending tools, software, and lets use stats to drum up the average cost of these
 * tools. Once done; make sure to let the user know where you got those numbers and averages."):
 * docs/ui-spec/example/_index.md, "Where these numbers come from".
 *
 * Held true here: every number in her data traces to an entry in lib/examples/mara-sources.ts (a price a
 * seller listed or a statistic a source published, each with its link, its words and the day it was seen);
 * every average is the function's result over its listed prices, recomputed here by hand so a wrong
 * function fails; the made-up numbers she had before are gone; and nothing in the sources or their words
 * ranks, recommends or tells anyone what to do.
 */
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ExampleSources } from "@/components/cockpit/example-sources";
import { cockpitWords } from "@/lib/cockpit/words";
import { roadApprenticeToOwnShopAB } from "@/lib/engines/roads/v2026";
import { exampleMara } from "@/lib/examples/mara";
import { MARA_SOURCES } from "@/lib/examples/mara-sources";
import { priceSummary, softwareSummaries, toolsTotalCents } from "@/lib/examples/stats";
import { formatMoney } from "@/lib/format/money-and-months";

import { readSource, simplify, sourceFiles, TS_FILES } from "./helpers/source-scan";
import { findTimeWords } from "./helpers/time-words";
import { FRAMING, VERDICT } from "./helpers/verdict-words";

const ex = exampleMara;
const src = MARA_SOURCES;
const road = roadApprenticeToOwnShopAB;

/** The mean and median worked out the long way, independently of lib/examples/stats.ts. */
function byHand(cents: number[]) {
  let sum = 0;
  for (const c of cents) sum += c;
  const sorted = [...cents].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 === 1 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
  return { count: cents.length, meanCents: Math.round(sum / cents.length), medianCents: median, lowCents: sorted[0], highCents: sorted[sorted.length - 1] };
}

/** "Where these numbers come from" drawn to HTML, as the browser gets it before React takes over. */
const panelHtml = () => renderToStaticMarkup(createElement(ExampleSources, { example: ex }));

/** The panel's text, tags dropped and the entities React writes turned back into characters. */
function panelText(): string {
  return panelHtml()
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/<!-- -->/g, "")
    .replace(/\s+/g, " ");
}

/** A figure as a source prints it ("$52,255.00", "610.3" thousands) in whole cents. */
function printedCents(value: string, unit: string): number {
  const n = Number(value.replace(/[$,]/g, ""));
  return Math.round(n * (unit.startsWith("thousands") ? 1000 : 1) * 100);
}

describe("the average function", () => {
  it("gives count, mean, median, lowest and highest, in whole cents, for odd and even counts", () => {
    expect(priceSummary([300, 100, 200])).toEqual({ count: 3, meanCents: 200, medianCents: 200, lowCents: 100, highCents: 300 });
    // Even count: the median is the middle two's mean; half a cent rounds up, as Math.round does.
    expect(priceSummary([100, 201, 400, 999])).toEqual({ count: 4, meanCents: 425, medianCents: 301, lowCents: 100, highCents: 999 });
    expect(priceSummary([269995, 299900, 299995, 535900]).meanCents).toBe(351448);
  });

  it("refuses an empty list and a price that isn't a whole, positive number of cents (never an average of nothing)", () => {
    expect(() => priceSummary([])).toThrow();
    expect(() => priceSummary([100, 0])).toThrow();
    expect(() => priceSummary([100, 12.5])).toThrow();
    expect(() => priceSummary([100, -5])).toThrow();
  });

  it("the tools' total is their averages added up, one of each", () => {
    const total = src.tools.reduce((sum, t) => sum + byHand(t.prices.map((p) => p.priceCents)).meanCents, 0);
    expect(toolsTotalCents(src.tools)).toBe(total);
    // The control: today's twelve tools at their averages, seen 2026-10-14.
    expect(total).toBe(1_499_362);
  });
});

describe("the tools: what the trade's official descriptions name, priced by Canadian sellers", () => {
  it("twelve tools, each named by an official source with its words and link, each priced by at least three sellers", () => {
    expect(src.tools).toHaveLength(12);
    for (const t of src.tools) {
      expect(t.official.url, t.id).toMatch(/^https:\/\/(tradesecrets\.alberta\.ca|www\.red-seal\.ca)\//);
      expect(t.official.quote.length, t.id).toBeGreaterThan(10);
      expect(t.prices.length, t.id).toBeGreaterThanOrEqual(3);
      expect(new Set(t.prices.map((p) => p.seller)).size, `${t.id}: one price per seller`).toBe(t.prices.length);
    }
    expect(new Set(src.tools.map((t) => t.id)).size).toBe(12);
  });

  it("every price has its seller, link, product, the page's words with the price in them, and the day seen", () => {
    for (const t of src.tools) {
      for (const p of t.prices) {
        const ref = `${t.id} / ${p.seller}`;
        expect(p.url, ref).toMatch(/^https:\/\//);
        expect(p.product.length, ref).toBeGreaterThan(5);
        expect(p.seenOn, ref).toBe("2026-10-14");
        expect(Number.isInteger(p.priceCents) && p.priceCents > 0, ref).toBe(true);
        // The price as the page prints it is in the words seen on the page: "$2,699.95" for 269995.
        const printed = `$${(p.priceCents / 100).toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        expect(p.quote.replace(/\$ /g, "$"), ref).toContain(printed);
      }
    }
  });

  it("each tool's average is the function's result over its own listed prices", () => {
    for (const t of src.tools) expect(priceSummary(t.prices.map((p) => p.priceCents)), t.id).toEqual(byHand(t.prices.map((p) => p.priceCents)));
  });
});

describe("the software: plans listed in Canadian dollars", () => {
  it("every plan has its link, words, day seen, and a price in whole cents (0 only for a free tier)", () => {
    expect(src.software.length).toBeGreaterThanOrEqual(20);
    for (const s of src.software) {
      const ref = `${s.product} / ${s.plan}`;
      expect(s.url, ref).toMatch(/^https:\/\//);
      expect(s.seenOn, ref).toBe("2026-10-14");
      expect(Number.isInteger(s.priceCents), ref).toBe(true);
      expect(s.per === "free" ? s.priceCents === 0 : s.priceCents > 0, ref).toBe(true);
      expect(src.softwareCategories.map((c) => c.id), ref).toContain(s.category);
    }
  });

  it("each category's average is over its plans listed by the month, worked out by the function; free tiers apart", () => {
    const summaries = softwareSummaries(src.software, src.softwareCategories);
    for (const c of src.softwareCategories) {
      const monthly = src.software.filter((s) => s.category === c.id && s.per === "month").map((s) => s.priceCents);
      const got = summaries.find((x) => x.category === c.id)!;
      expect(got.monthly, c.id).toEqual(monthly.length > 0 ? byHand(monthly) : null);
      expect(got.free, c.id).toEqual(src.software.filter((s) => s.category === c.id && s.per === "free"));
    }
    // Controls: today's plans.
    expect(summaries.find((x) => x.category === "bookkeeping")!.monthly!.meanCents).toBe(4_900);
    expect(summaries.find((x) => x.category === "cut-lists")!.monthly).toBeNull();
  });

  it("a plan billed once a year is never averaged with plans billed month to month, whatever unit its page prints", () => {
    // Review, 2026-10-14: SketchUp's "per month / billed annually" plans were averaged with month-to-month
    // ones while Fusion's own billed-annually price was left out. Both makers are now treated the same way.
    for (const s of src.software) {
      const ref = `${s.product} / ${s.plan}`;
      if (/billed annually|pay annually/i.test(s.quote)) expect(s.per, ref).not.toBe("month");
      if (s.per === "month-billed-yearly") expect(s.quote, ref).toMatch(/billed annually/i);
    }
    const design = softwareSummaries(src.software, src.softwareCategories).find((x) => x.category === "design")!;
    // Control: SketchUp Go and Pro monthly and Fusion's monthly plan, (2899 + 13999 + 12000) / 3.
    expect(design.monthly).toEqual({ count: 3, meanCents: 9_633, medianCents: 12_000, lowCents: 2_899, highCents: 13_999 });
    expect(src.software.filter((s) => s.per === "month-billed-yearly").map((s) => s.plan)).toEqual(["Go, annual", "Pro, annual"]);
    expect(cockpitWords.example.sources.per["month-billed-yearly"](1_508)).toBe("$15.08 a month, billed yearly");
    expect(cockpitWords.example.sources.softwareAverage(3, 9_633, 12_000, 2_899, 13_999)).toBe(
      "Average of 3 plans billed month to month: $96.33 a month (median $120; from $28.99 to $139.99)",
    );
  });
});

describe("the statistics say what their source gives", () => {
  const stat = (id: string) => src.statistics.find((s) => s.id === id);

  it("each market report's whole-market row is listed in full: net rent, the costs on top of it and the gross rent", () => {
    // Review, 2026-10-14: the Edmonton caveat said the report gives no taxes or operating costs, but its
    // MARKET STATISTICS row "EDMONTON TOTALS" prints them ($4.99) and the gross rent ($16.71).
    const rows = [
      { source: "CBRE Calgary", ids: ["cbre-calgary-net", "cbre-calgary-tmi", "cbre-calgary-gross"], values: ["$11.24", "$5.04", "$16.28"] },
      { source: "Cushman & Wakefield Edmonton", ids: ["cw-edmonton-net", "cw-edmonton-additional", "cw-edmonton-gross"], values: ["$11.72", "$4.99", "$16.71"] },
    ];
    for (const row of rows) {
      expect(row.ids.map((id) => stat(id)?.value), row.source).toEqual(row.values);
      for (const id of row.ids) expect(stat(id)!.url, id).toBe(stat(row.ids[0])!.url);
    }
    // Nothing is called missing that the source gives.
    expect(src.statistics.filter((s) => /doesn't give|does not give/i.test(s.caveat) && /tax|operating/i.test(s.caveat)).map((s) => s.id)).toEqual([]);
  });

  it("every link goes to the page's own address, none through the retired www.ic.gc.ca, which only redirects", () => {
    const urls = [
      ...src.tools.flatMap((t) => [t.official.url, ...t.prices.map((p) => p.url)]),
      ...src.software.map((s) => s.url),
      ...src.statistics.map((s) => s.url),
    ];
    expect(urls.filter((u) => new URL(u).hostname === "www.ic.gc.ca")).toEqual([]);
    // ISED's report is drawn through its own form and needs the browser's cookies: the caveat says so.
    expect(stat("ised-337123-margin")!.caveat).toMatch(/cookies/);
  });
});

describe("every number in Mara's data traces to a source entry", () => {
  const stat = (id: string | null) => src.statistics.find((s) => s.id === id);

  it("her one start-up cost line is the tools' total, on Woodworking machines and tools, from links", () => {
    const shop = road.steps.find((s) => s.label === "Open your own shop")!;
    const lines = ex.figures.filter((f) => f.kind === "start-up-cost-line");
    expect(lines).toHaveLength(1);
    const line = lines[0];
    expect(shop.costs.find((c) => c.id === line.costLine!.lineId)?.label).toBe("Woodworking machines and tools");
    expect(line.costLine!.lineId).toBe(ex.sources!.toolsLineId);
    expect(line.costLine!.amountFrom).toBe("link");
    expect(line.amountCents).toBe(toolsTotalCents(src.tools));
  });

  it("her yearly income goal is the official Alberta cabinetmaker yearly figure, as the source prints it", () => {
    const s = stat(ex.sources!.incomeWantedFrom)!;
    expect(s.url).toBe("https://alis.alberta.ca/occinfo/wages-and-salaries-in-alberta/cabinetmakers/72311/");
    expect(s.value).toBe("$52,255.00");
    expect(s.unit).toMatch(/per year/);
    expect(s.amountCents).toBe(printedCents(s.value, s.unit));
    expect(ex.kept.incomeWanted?.amountCents).toBe(s.amountCents);
  });

  // The maintainer's pick A (2026-10-15, "I agree, it should be A"): her what-if starts empty, and ISED's
  // average is shown only as context, labelled as what it is, never as one of her numbers.
  it("she has no what-if; ISED's $610,300 is context only, labelled an industry average over existing businesses of every age", () => {
    expect(ex.whatIfFirstYearSalesDollars).toBeNull();
    expect(Object.keys(ex.sources!)).not.toContain("whatIfFrom");
    expect(ex.sources!.context).toEqual(["ised-33712-revenue"]);
    const s = stat("ised-33712-revenue")!;
    expect(s.url).toBe("https://ised-isde.canada.ca/app/ixb/cis/performance/rev/33712");
    expect(s.period).toBe("Data year 2024");
    expect(s.amountCents).toBe(printedCents(s.value, s.unit));
    expect(s.amountCents).toBe(61_030_000);
    expect(s.caveat).toMatch(/NOT a first-year figure/);
    expect(cockpitWords.example.sources.context(ex.person, s.amountCents!, s.inSentence!, s.period)).toBe(
      "$610,300 a year: the average yearly revenue of small and medium household and institutional furniture makers in Canada (NAICS 33712, ISED) (Data year 2024). An industry average over existing businesses of every age, not a first-year figure and not one of Mara's numbers.",
    );
    // The what-if bar's example-only note is gone with her what-if: no words for it remain.
    expect(Object.keys(cockpitWords.example.sources)).not.toContain("whatIfNote");
    expect(Object.keys(cockpitWords.example.sources)).not.toContain("whatIf");
  });

  it("the panel draws $610,300 once, under the context heading after her numbers, never in her numbers' list", () => {
    const text = panelText();
    const w = cockpitWords.example.sources;
    const numbersAt = text.indexOf(w.numbersHeading(ex.person));
    const contextAt = text.indexOf(w.contextHeading(ex.person));
    const toolsAt = text.indexOf(w.toolsHeading(src.tools.length));
    expect(numbersAt).toBeGreaterThan(-1);
    expect(contextAt).toBeGreaterThan(numbersAt);
    expect(toolsAt).toBeGreaterThan(contextAt);
    // Her numbers' list: the tools line, the income goal and what stayed blank; no ISED figure, no what-if.
    const numbersPart = text.slice(numbersAt, contextAt);
    expect(numbersPart).toContain("$14,993.62");
    expect(numbersPart).toContain("$52,255");
    expect(numbersPart).not.toMatch(/610,300|what-if/);
    // The context part: the one line, with its link, and that the what-if bar starts empty.
    const contextPart = text.slice(contextAt, toolsAt);
    const s = stat("ised-33712-revenue")!;
    expect(contextPart).toContain(w.context(ex.person, s.amountCents!, s.inSentence!, s.period));
    expect(contextPart).toContain(w.contextWhatIf(ex.person));
    expect(text.split("$610,300").length - 1).toBe(1);
    expect(panelHtml()).toContain(`href="${s.url}"`);
  });

  it("the panel check can fail: a panel that drew the figure among her numbers is caught", () => {
    const w = cockpitWords.example.sources;
    const text = panelText();
    const moved = text.replace(w.blank(ex.person), `${w.blank(ex.person)} $610,300`);
    expect(moved).not.toBe(text);
    expect(moved.slice(moved.indexOf(w.numbersHeading(ex.person)), moved.indexOf(w.contextHeading(ex.person)))).toMatch(/610,300/);
  });

  it("nothing else: no savings and no deposit, which nothing real can supply, and each is listed as not priced", () => {
    expect(ex.figures.filter((f) => f.kind === "savings-for-start")).toEqual([]);
    expect(ex.figures.some((f) => f.costLine?.lineId === "cost-shop-space-deposit")).toBe(false);
    expect(ex.figures).toHaveLength(1);
    const notPriced = src.notPriced.map((n) => n.what).join(" | ");
    expect(notPriced).toMatch(/savings/i);
    expect(notPriced).toMatch(/deposit/i);
    expect(notPriced).toMatch(/Design or CAD software/);
  });

  it("every statistic used has its source, link, period, words and day seen; the ones Mara's numbers use carry their amount", () => {
    for (const s of src.statistics) {
      expect(s.url, s.id).toMatch(/^https:\/\//);
      expect(s.seenOn, s.id).toBe("2026-10-14");
      expect(s.quote.length, s.id).toBeGreaterThan(5);
      expect(s.period.length, s.id).toBeGreaterThan(3);
      // The figure is in the words seen on the page (the value without its "$", as tables print it).
      expect(s.quote, s.id).toContain(s.value.replace(/^\$/, "").split(" / ")[0]);
    }
    for (const id of [ex.sources!.incomeWantedFrom, ...ex.sources!.context]) expect(stat(id)?.amountCents, String(id)).toBeGreaterThan(0);
    expect(new Set(src.statistics.map((s) => s.id)).size).toBe(src.statistics.length);
  });
});

describe("Mara's numbers are worked out in her file, never typed there", () => {
  // The value checks above pass a correct number typed by hand (review, 2026-10-14: `const TOOLS_CENTS =
  // 1_499_362;` passed every test). The panel says every average is "never typed by hand", so this reads
  // lib/examples/mara.ts itself: each of her two numbers must come through the function or the statistic,
  // her what-if must be null (the maintainer's pick A, 2026-10-15), and none of their values, nor the ISED
  // figure shown beside them as context, may appear in it as a number or as money written out.
  const FILE = "lib/examples/mara.ts";
  /** Her two numbers and the context figures, all in whole cents. */
  const numbers = () => [
    toolsTotalCents(src.tools),
    ex.kept.incomeWanted!.amountCents,
    ...ex.sources!.context.map((id) => src.statistics.find((s) => s.id === id)!.amountCents!),
  ];

  /** What in this code types one of her numbers by hand (empty when each is worked out). */
  function typedByHand(code: string, cents: number[]): string[] {
    // Comments go and strings are emptied, so only code is read.
    const bare = simplify(code, false);
    const problems: string[] = [];
    if (!/\bTOOLS_CENTS\s*=\s*toolsTotalCents\(\s*MARA_SOURCES\.tools\s*\)/.test(bare)) problems.push("TOOLS_CENTS is not toolsTotalCents(MARA_SOURCES.tools)");
    if (!/\bagreed\(\s*""\s*,\s*""\s*,\s*TOOLS_CENTS\s*,/.test(bare)) problems.push("the machines-and-tools figure is not TOOLS_CENTS");
    if (!/\bincomeWanted:\s*\{\s*amountCents:\s*statistic\(\s*INCOME_FROM\s*\)\.amountCents!?\s*,/.test(bare)) problems.push("incomeWanted is not statistic(INCOME_FROM)");
    if (!/\bwhatIfFirstYearSalesDollars:\s*null\s*,/.test(bare)) problems.push("the what-if is not null");
    // Any numeric literal equal to one of the numbers, in cents or in dollars, written with or without "_".
    const forbidden = new Set(cents.flatMap((v) => [v, v / 100, v * 100]));
    for (const m of bare.matchAll(/\b\d[\d_]*(?:\.\d+)?\b/g)) {
      if (forbidden.has(Number(m[0].replace(/_/g, "")))) problems.push(`the number ${m[0]} is typed`);
    }
    // And written out as money anywhere, strings and comments included ("$610,300", "610,300").
    for (const v of cents) {
      for (const form of new Set([formatMoney(v), (v / 100).toLocaleString("en-CA")])) {
        if (code.includes(form)) problems.push(`${form} is written`);
      }
    }
    return problems;
  }

  it("each of her two is read through toolsTotalCents( or statistic(, her what-if is null, and none (nor the context figure) is written", () => {
    expect(numbers()).toEqual([1_499_362, 5_225_500, 61_030_000]);
    expect(typedByHand(readSource(FILE), numbers())).toEqual([]);
  });

  it("the scan can fail: each number typed by hand, even correctly, is found", () => {
    const code = readSource(FILE);
    const typed: [string | RegExp, string][] = [
      ["toolsTotalCents(MARA_SOURCES.tools)", "1_499_362"],
      ["statistic(INCOME_FROM).amountCents!", "5_225_500"],
      ["whatIfFirstYearSalesDollars: null", "whatIfFirstYearSalesDollars: 610_300"],
      // A Windows clone with core.autocrlf=true ends this line with \r\n.
      [/TOOLS_CENTS,\r?\n/, "14993.62 * 100,\n"],
    ];
    for (const [from, to] of typed) {
      const changed = code.replace(from, to);
      expect(changed, String(from)).not.toBe(code);
      expect(typedByHand(changed, numbers()).length, String(from)).toBeGreaterThan(0);
    }
    // A number typed anywhere else in the file, even in a line that doesn't feed her figures.
    expect(typedByHand(`${code}\nconst spare = 5225500;`, numbers())).toEqual(["the number 5225500 is typed"]);
    // The context figure, as a number or as money in a string or a comment.
    expect(typedByHand(`${code}\nconst spare = 610300;`, numbers())).toEqual(["the number 610300 is typed"]);
    expect(typedByHand(`${code}\nconst label = "$610,300";`, numbers())).toEqual(["$610,300 is written", "610,300 is written"]);
    expect(typedByHand(`${code}\n// first-year sales of 610,300\n`, numbers())).toEqual(["610,300 is written"]);
  });
});

describe("the made-up numbers are gone", () => {
  // Her five old invented figures, in the forms code would write them: whole cents, money as a screen prints
  // it, and the plain dollars of the two big ones ($70,000, $45,000). The others' plain dollars are left out:
  // 12000 (her old $12,000 savings) is also a real price written in cents, Autodesk Fusion's CA$120 a
  // month, and 2000 or 3400 could be anything; their cents and money forms are looked for.
  const old = [7_000_000, 340_000, 200_000, 1_200_000, 4_500_000];
  const grouped = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, "_?");
  const literal = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = old.flatMap((c) => [
    new RegExp(`\\b${grouped(c)}\\b`),
    new RegExp(literal(formatMoney(c))),
    ...(c / 100 >= 40_000 ? [new RegExp(`\\b${grouped(c / 100)}\\b`), new RegExp(`\\b${literal((c / 100).toLocaleString("en-CA"))}\\b`)] : []),
  ]);
  // The cited catalogs are left out (a real fee may be the same amount by chance), and so is the what-if
  // bar's own hint, "like 45000", shown to every person since before Mara existed.
  const allowed = { file: "lib/cockpit/words.ts", text: cockpitWords.questions.box.wholeDollars };

  it("the scan can fail: it finds them in the file as it was", () => {
    const before = "const INCOME_WANTED_CENTS = 7_000_000; const TABLE_SAW_QUOTE_CENTS = 340_000; // $2,000 deposit, $12,000 savings, $45,000";
    expect(patterns.filter((p) => p.test(before)).length).toBeGreaterThanOrEqual(5);
  });

  it("no file under app/, components/ or lib/ (the cited catalogs aside) writes one", () => {
    expect(simplify(readSource(allowed.file), true)).toContain(allowed.text);
    const found = sourceFiles(["app", "components", "lib"], TS_FILES)
      .map((f) => f.split("\\").join("/"))
      .filter((f) => !f.startsWith("lib/engines/"))
      .flatMap((f) => {
        const code = simplify(readSource(f), true).split(allowed.text).join("");
        return patterns.filter((p) => p.test(code)).map((p) => `${f}: ${p}`);
      });
    expect(found).toEqual([]);
  });
});

describe("information and options, never a verdict", () => {
  // "recommending tools" is built as a sourced list of what the trade names and what sellers charge: never
  // "buy this", never a ranking (CLAUDE.md, "Information and options, never a verdict"). The word lists are
  // tests/helpers/verdict-words.ts, shared with the browser test.

  it("the word lists catch every verdict and framing phrase review found, and no ordinary phrase the page uses", () => {
    // Controls, one per word: each phrase must be caught.
    const verdicts = [
      "great value, a must-have",
      "The table saw is our top choice.",
      "the top pick",
      "our pick for a first shop",
      "We recommend it",
      "recommended",
      "the best saw",
      "You should buy the SawStop",
      "a must buy",
      "the ideal router",
      "my go-to sander",
      "worth buying",
      "worth it",
      "worth the money",
      "worth every cent",
      "an essential tool",
      "good value",
      "value for money",
      "ranked by price",
      "the ranking",
      "the winner",
      "a favourite",
      "a favorite",
      "the twelve core start-up tools",
    ];
    for (const v of verdicts) expect(VERDICT.test(v), v).toBe(true);
    for (const f of ["the trade's own list", "Software a small shop uses", "tools a small professional shop buys new"]) expect(FRAMING.test(f), f).toBe(true);
    // Ordinary phrases the example says, which must pass.
    const ordinary = ["Mara's pick of job", "Pick a future", "must be paid", "the value as the source prints it", "net worth", "picked for this example", "score"];
    for (const o of ordinary) expect(VERDICT.test(o) || FRAMING.test(o), o).toBe(false);
  });

  it("no sentence of the sources' words, and no text in the sources' data, ranks, recommends or frames a pick as the trade's", () => {
    const strings: string[] = [];
    const walk = (v: unknown) => {
      if (typeof v === "string") strings.push(v);
      else if (typeof v === "function") {
        const fn = v as (...args: unknown[]) => unknown;
        for (const args of [["Mara", 100, 3, 200, 300, 400], ["Mara", "a figure", "2024"]]) {
          try {
            const out = fn(...args);
            if (typeof out === "string") strings.push(out);
          } catch {
            // A function that needs other kinds of values is filled by the next set.
          }
        }
      } else if (v && typeof v === "object") for (const x of Object.values(v)) walk(x);
    };
    walk(cockpitWords.example);
    walk(src);
    expect(strings.length).toBeGreaterThan(200);
    expect(strings.filter((s) => VERDICT.test(s) || FRAMING.test(s))).toEqual([]);
  });

  // No times (the maintainer, 2026-10-17: "NO TIMES!"). A seller's page may say how long its promotion runs,
  // inside the quote; DotAmi's own words about it don't. One phrase is let through, how a plan is billed, as
  // whole words and exactly as often as the sources use it today, so a new use, or any other time word, fails.
  it("DotAmi's own words in the sources hold no duration, past the one billing phrase", () => {
    const BILLED = { phrase: "billed month to month", uses: 5, why: "how a plan is billed, which keeps month-to-month plans apart from yearly ones" };
    const own: string[] = [];
    const walk = (v: unknown, key = "") => {
      if (key === "quote" || key === "url" || key === "seenOn") return;
      if (typeof v === "string") own.push(v);
      else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) walk(x, k);
    };
    walk(src);
    expect(own.length).toBeGreaterThan(500);
    const billed = new RegExp(`(?<![\\w-])${BILLED.phrase}(?![\\w-])`, "gi");
    let uses = 0;
    const withTimes = own.filter((text) => {
      uses += text.match(billed)?.length ?? 0;
      return findTimeWords(text.replace(billed, " ")).length > 0;
    });
    expect(withTimes).toEqual([]);
    expect(uses, BILLED.why).toBe(BILLED.uses);
  });

  // The words module isn't the only place text can be typed: a component can hold a string of its own.
  const EXAMPLE_COMPONENTS = ["components/cockpit/example-sources.tsx", "components/cockpit/example-mode.tsx"];
  /** Verdict or framing words in a component's code and strings, its comments aside. */
  const verdictsIn = (code: string) => {
    const text = simplify(code, true);
    return [VERDICT, FRAMING].flatMap((re) => text.match(new RegExp(re.source, "gi")) ?? []);
  };

  it("no string typed in the example's own components ranks, recommends or frames a pick", () => {
    for (const f of EXAMPLE_COMPONENTS) expect(verdictsIn(readSource(f)), f).toEqual([]);
  });

  it("the component scan can fail: a verdict typed inline in the panel is found", () => {
    const code = readSource(EXAMPLE_COMPONENTS[0]);
    const typed = code.replace("{words.toolsOrder}", "{words.toolsOrder} You should buy the SawStop; it is the best.");
    expect(typed).not.toBe(code);
    expect(verdictsIn(typed)).toEqual(["should", "best"]);
    // A comment saying the same is not a string on the page.
    expect(verdictsIn(`${code}\n// never "the best", never "you should"`)).toEqual([]);
  });

  it("the tools are listed in the order the curriculum teaches them, never sorted by price", () => {
    const means = src.tools.map((t) => priceSummary(t.prices.map((p) => p.priceCents)).meanCents);
    const sortedUp = [...means].sort((a, b) => a - b);
    const sortedDown = [...sortedUp].reverse();
    expect(means).not.toEqual(sortedUp);
    expect(means).not.toEqual(sortedDown);
  });
});

describe("the banner and the sources' words", () => {
  it("the banner says Mara is invented and the prices and statistics are real, from the sources listed, seen that day", () => {
    expect(cockpitWords.example.banner(ex.person, src.seenOn)).toBe(
      "Mara is invented; the prices and statistics are real, from the sources listed, seen on 2026-10-14. Nothing here is saved.",
    );
    expect(cockpitWords.example.sources.open).toBe("Where these numbers come from");
  });

  it("the panel's intro says the prices and statistics are real, not every number: her answers and counts are invented", () => {
    // Review, 2026-10-14: "Every number on this page is real" while her 9 marks and 1 step done are invented.
    const intro = cockpitWords.example.sources.intro(ex.person, src.seenOn);
    expect(intro).toBe(
      "Mara is invented, and so are Mara's answers. Every price and statistic on this page is real: a price a Canadian seller listed, or a statistic a government or a market report published, each seen on 2026-10-14; the official fees are from DotAmi's own cited catalog. Every average is worked out by DotAmi from the prices listed here, never typed by hand.",
    );
    expect(intro).not.toMatch(/every number/i);
  });

  it("the tools and the software are said to be picked for this example, not the trade's whole list", () => {
    const w = cockpitWords.example.sources;
    expect(w.toolsHeading(src.tools.length)).toBe("12 of the tools the trade's official descriptions name, picked for this example, with average prices from Canadian sellers");
    expect(w.softwareHeading).toBe("Software listed for this example, with listed prices in Canadian dollars");
    expect(src.tier).toMatch(/^Mid-range, shop-grade, picked for this example:/);
    expect(src.notPriced.find((n) => n.what.startsWith("Shaper"))!.why).toBe("Named in NOC 72311 or the curriculum, but not among the twelve tools picked for this example.");
  });

  it("the panel's context part is headed as not one of hers, and says the what-if bar starts empty and keeps nothing", () => {
    const w = cockpitWords.example.sources;
    expect(w.contextHeading(ex.person)).toBe("For context, not one of Mara's numbers");
    expect(w.contextWhatIf(ex.person)).toBe(
      "Mara's example has no what-if: the what-if bar under the map starts empty, and a number tried there is for that look only, kept nowhere.",
    );
  });

  it("the tools' line says how many prices each average is of, and the range", () => {
    expect(cockpitWords.example.sources.average(4, 351_448, 299_948, 269_995, 535_900)).toBe(
      "Average of 4 listed prices: $3,514.48 (median $2,999.48; from $2,699.95 to $5,359)",
    );
  });
});

describe("the sources' data stays in the example's own file", () => {
  it("they are not legal citations: the citation types allow only government sources, and these are sellers and reports", () => {
    const code = readSource("lib/examples/mara-sources.ts");
    expect(code).not.toMatch(/from "@\/lib\/engines\/shared\/citation/);
    expect(code).toMatch(/not legal citations/i);
  });
});
