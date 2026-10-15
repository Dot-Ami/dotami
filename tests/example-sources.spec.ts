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
import { describe, expect, it } from "vitest";

import { cockpitWords } from "@/lib/cockpit/words";
import { roadApprenticeToOwnShopAB } from "@/lib/engines/roads/v2026";
import { exampleMara } from "@/lib/examples/mara";
import { MARA_SOURCES } from "@/lib/examples/mara-sources";
import { priceSummary, softwareSummaries, toolsTotalCents } from "@/lib/examples/stats";
import { formatMoney } from "@/lib/format/money-and-months";

import { readSource, simplify, sourceFiles, TS_FILES } from "./helpers/source-scan";

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

  it("her what-if is the official average revenue of small furniture businesses, never called a first-year figure", () => {
    const s = stat(ex.sources!.whatIfFrom)!;
    expect(s.url).toBe("https://ised-isde.canada.ca/app/ixb/cis/performance/rev/33712");
    expect(s.amountCents).toBe(printedCents(s.value, s.unit));
    expect(ex.whatIfFirstYearSalesDollars! * 100).toBe(s.amountCents);
    expect(s.caveat).toMatch(/NOT a first-year figure/);
    expect(cockpitWords.example.sources.whatIfNote(ex.person, s.period)).toBe("Mara's what-if is an industry average (Data year 2024), not a first-year figure.");
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
    for (const id of [ex.sources!.incomeWantedFrom, ex.sources!.whatIfFrom]) expect(stat(id)?.amountCents, String(id)).toBeGreaterThan(0);
    expect(new Set(src.statistics.map((s) => s.id)).size).toBe(src.statistics.length);
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
  // "buy this", never a ranking (CLAUDE.md, "Information and options, never a verdict").
  const VERDICT = /\b(recommend\w*|best|should|must buy|top pick|ranked|ranking|winner)\b/i;

  it("no sentence of the sources' words, and no text in the sources' data, ranks or recommends", () => {
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
    expect(strings.filter((s) => VERDICT.test(s))).toEqual([]);
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
