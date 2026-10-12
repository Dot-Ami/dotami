import { describe, expect, it } from "vitest";

import { allCatalogCitations } from "@/lib/engines/all-citations";
import { cfeNodesV2026 } from "@/lib/engines/cfe/v2026";
import { roadStartingAnyBusinessAB, type RoadStep } from "@/lib/engines/roads/v2026";
import type { EngineCitation } from "@/lib/engines/shared/types";

/**
 * Road 0's content (docs/architecture/future-cockpit.md § 6, "Road 0's content as built"): about three
 * cited done-when lines on each of today's ten steps, and the three "before you open" steps the design
 * names. Every line is written from an official page and recorded as a tool check made on 2026-10-12
 * (option B, docs/engines/citations.md): found words, never a read nobody did.
 */
const road = roadStartingAnyBusinessAB;
const step = (id: string): RoadStep => {
  const found = road.steps.find((s) => s.id === id);
  if (!found) throw new Error(`no step ${id}`);
  return found;
};
const line = (id: string) => {
  const found = road.steps.flatMap((s) => s.doneWhen).find((d) => d.id === id);
  if (!found) throw new Error(`no done-when line ${id}`);
  return found;
};
const quotesOf = (...citations: (EngineCitation | undefined)[]) =>
  citations.flatMap((c) => c?.toolCheck?.quotes ?? []).join(" | ");

const BEFORE_YOU_OPEN = ["step-start-register-name", "step-start-permits-bizpal", "step-start-business-account"];

/** The new citations this content adds: done-when lines, the new steps' own sources, their cost lines' name sources. */
function newCitations(): { where: string; citation: EngineCitation }[] {
  return road.steps.flatMap((s) => [
    ...s.doneWhen.map((d) => ({ where: d.id, citation: d.citation })),
    ...(BEFORE_YOU_OPEN.includes(s.id) ? s.citations.map((citation) => ({ where: s.id, citation })) : []),
    ...s.costs.flatMap((c) =>
      c.kind === "official-fee" ? [{ where: c.id, citation: c.citation }] : c.nameSource ? [{ where: c.id, citation: c.nameSource }] : [],
    ),
  ]);
}

describe("every step on road 0 has its done-when lines", () => {
  it("each of today's ten steps has three or four, in the order written", () => {
    expect(Object.fromEntries(cfeNodesV2026.map((n) => [n.id, step(n.id).doneWhen.map((d) => d.id)]))).toEqual({
      "stage-0-employee-apprentice-baseline": [
        "dw-start-baseline-employment",
        "dw-start-baseline-business-lines",
        "dw-start-baseline-sole-prop",
      ],
      "stage-1-sole-prop-activation": [
        "dw-start-soleprop-records",
        "dw-start-soleprop-return",
        "dw-start-soleprop-instalments",
      ],
      "stage-2a-voluntary-gst-registration": [
        "dw-start-gstvol-registered",
        "dw-start-gstvol-charge-file",
        "dw-start-gstvol-one-year",
        "dw-start-gstvol-itc-evidence",
      ],
      "stage-2b-mandatory-gst-registration": [
        "dw-start-gstman-tests",
        "dw-start-gstman-one-quarter",
        "dw-start-gstman-four-quarters",
        "dw-start-gstman-charging",
      ],
      "stage-3a-incorporation-80k-net": [
        "dw-start-inc-articles",
        "dw-start-inc-t2",
        "dw-start-inc-guarantee",
        "dw-start-inc-directors",
      ],
      "stage-3b-incorporation-liability-sred": [
        "dw-start-incsred-incorporated",
        "dw-start-incsred-ccpc",
        "dw-start-incsred-associated",
      ],
      "branch-hire-first-employee": [
        "dw-start-hire-status",
        "dw-start-hire-before-pay",
        "dw-start-hire-payroll-account",
        "dw-start-hire-wcb",
      ],
      "branch-service-vs-productize": [
        "dw-start-service-income-records",
        "dw-start-service-separate-records",
        "dw-start-service-name",
      ],
      "stage-4-retained-earnings-planning": [
        "dw-start-retained-t5",
        "dw-start-retained-eligible",
        "dw-start-retained-no-switch",
      ],
      "stage-4-sred-deepening": ["dw-start-sred-t661", "dw-start-sred-spent", "dw-start-sred-deadline"],
    });
  });

  it("every step, the new ones too, has at least three, each a plain one-liner", () => {
    expect(road.steps).toHaveLength(13);
    for (const s of road.steps) {
      expect(s.doneWhen.length, s.id).toBeGreaterThanOrEqual(3);
      for (const d of s.doneWhen) {
        expect(d.text.length, d.id).toBeGreaterThan(0);
        expect(d.text, d.id).not.toMatch(/\n/);
      }
    }
  });
});

describe("the three before-you-open steps the design names", () => {
  it("sit in the first column, under the baseline, and each leads to Sole Prop activation", () => {
    const first = road.columns[0]!;
    expect(first.id).toBe("tier-1-before");
    expect(first.steps).toEqual(["stage-0-employee-apprentice-baseline", ...BEFORE_YOU_OPEN]);
    for (const id of BEFORE_YOU_OPEN) expect(step(id).next, id).toEqual(["stage-1-sole-prop-activation"]);
    expect(BEFORE_YOU_OPEN.map((id) => step(id).label)).toEqual([
      "Register your business name, if you use one",
      "Look up your permits and licences (BizPaL)",
      "A separate bank account for the business, if it has a name other than yours",
    ]);
  });

  it("leave today's ten steps where they were: no existing step's arrows change", () => {
    for (const node of cfeNodesV2026) expect(step(node.id).next, node.id).toEqual(node.branches);
  });

  it("each has its own lines, and links to the official pages the person opens themselves", () => {
    expect(step("step-start-register-name").doneWhen.map((d) => d.id)).toEqual([
      "dw-start-name-when",
      "dw-start-name-ending",
      "dw-start-name-report",
      "dw-start-name-form",
      "dw-start-name-proof",
      "dw-start-name-email",
    ]);
    expect(step("step-start-permits-bizpal").doneWhen.map((d) => d.id)).toEqual([
      "dw-start-bizpal-searched",
      "dw-start-bizpal-more",
      "dw-start-bizpal-city-hall",
      "dw-start-bizpal-applied",
    ]);
    expect(step("step-start-business-account").doneWhen.map((d) => d.id)).toEqual([
      "dw-start-account-named",
      "dw-start-account-billing",
      "dw-start-account-statements",
    ]);
    expect(step("step-start-register-name").officialLinks.map((l) => l.url)).toEqual([
      "https://www.alberta.ca/register-business-name",
      "https://www.alberta.ca/find-business-registry",
    ]);
    expect(step("step-start-permits-bizpal").officialLinks.map((l) => l.url)).toContain("https://bizpal.ca/");
  });

  it("the bank account step keeps the CRA's condition: a business with a name other than your own", () => {
    const account = step("step-start-business-account");
    expect(account.summary).toMatch(/name other than your own/);
    expect(line("dw-start-account-named").text).toMatch(/^If your business has a name other than your own/);
    expect(quotesOf(line("dw-start-account-named").citation)).toContain(
      "If your business has a name other than your own, you'll need a separate bank account",
    );
  });

  it("Alberta's registry fees, permit fees and bank fees are named lines with no amount", () => {
    const costs = BEFORE_YOU_OPEN.flatMap((id) => step(id).costs);
    expect(costs.map((c) => c.id)).toEqual([
      "cost-start-name-government-fee",
      "cost-start-name-service-fee",
      "cost-start-permit-licence-fees",
      "cost-start-bank-fees",
    ]);
    for (const c of costs) {
      expect(c.kind, c.id).toBe("named");
      expect(c, c.id).not.toHaveProperty("amountCents");
    }
  });

  it("today's ten steps still carry no cost lines, skill items or links: those come later", () => {
    for (const node of cfeNodesV2026) {
      expect(step(node.id).costs, node.id).toEqual([]);
      expect(step(node.id).needs, node.id).toEqual([]);
      expect(step(node.id).officialLinks, node.id).toEqual([]);
    }
  });
});

describe("every new source is a tool check made on 2026-10-12, and none claims a read", () => {
  const all = newCitations();

  it("each has quotes of three words or more, found by the tool that day, on an https page", () => {
    // 47 done-when lines, plus the new steps' own sources and their cost lines' name sources.
    expect(road.steps.flatMap((s) => s.doneWhen)).toHaveLength(47);
    expect(all.length).toBeGreaterThan(47);
    for (const { where, citation } of all) {
      expect(citation.toolCheck, where).toBeDefined();
      expect(citation.toolCheck!.checkedOn, where).toBe("2026-10-12");
      expect(citation.toolCheck!.quotes.length, where).toBeGreaterThan(0);
      for (const quote of citation.toolCheck!.quotes) {
        expect(quote.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length, `${where}: ${quote}`).toBeGreaterThanOrEqual(3);
      }
      expect(citation.url, where).toMatch(/^https:\/\//);
    }
  });

  it("none has a read date or a reader, so no card can say a person read these pages", () => {
    for (const { where, citation } of all) {
      expect(citation.lastVerified, where).toBeUndefined();
      expect(citation.readBy, where).toBeUndefined();
    }
    // A tool check is not a read: the road's date stays the newest read among the map stages' sources.
    const newestStageRead = cfeNodesV2026.flatMap((n) => n.citations.map((c) => c.lastVerified)).sort().at(-1);
    expect(road.lastVerified).toBe(newestStageRead);
  });

  it("every one is in the list the quote checker re-checks", () => {
    const listed = allCatalogCitations().filter(
      ({ where, citation }) => where.startsWith("roads road-starting-any-business-ab ") && citation.toolCheck !== undefined,
    );
    expect(listed).toHaveLength(all.length);
  });
});

describe("a line says what its own page says", () => {
  const WORDS: Record<string, string> = { two: "2", three: "3", four: "4", six: "6", fifteen: "15", eighteen: "18", thirty: "30" };
  const numbersIn = (text: string) => {
    const found = new Set<string>();
    for (const m of text.matchAll(/\d[\d,]*(?:\.\d+)?/g)) found.add(m[0].replace(/,/g, "").replace(/\.00$/, ""));
    for (const m of text.toLowerCase().matchAll(/\b(two|three|four|six|fifteen|eighteen|thirty)\b/g)) found.add(WORDS[m[1]!]!);
    return found;
  };

  it("every number in a done-when line, a new step's one line or a cost label is in that entry's own quotes", () => {
    for (const s of road.steps) {
      for (const d of s.doneWhen) {
        const quoted = numbersIn(quotesOf(d.citation));
        for (const n of numbersIn(d.text)) expect(quoted.has(n), `${d.id}: "${n}" isn't in its own quotes`).toBe(true);
      }
      if (!BEFORE_YOU_OPEN.includes(s.id)) continue;
      const quoted = numbersIn(quotesOf(...s.citations));
      for (const n of numbersIn(s.summary)) expect(quoted.has(n), `${s.id}: "${n}" isn't in its own quotes`).toBe(true);
      for (const c of s.costs) expect(numbersIn(c.label).size, c.id).toBe(0);
    }
  });

  it("no line tells the person what to do: information and options, never 'you should'", () => {
    const text = road.steps.flatMap((s) => [s.label, s.summary, ...s.doneWhen.map((d) => d.text), ...s.costs.map((c) => c.label)]);
    for (const t of text) expect(t, t).not.toMatch(/\b(you should|we recommend|best to|make sure you)\b/i);
  });

  it("the GST/HST lines keep the CRA's two tests and its 29 days, word for word in their quotes", () => {
    expect(quotesOf(line("dw-start-gstman-tests").citation)).toContain("over the previous four (or fewer) consecutive calendar quarters");
    for (const id of ["dw-start-gstman-one-quarter", "dw-start-gstman-four-quarters"]) {
      expect(line(id).text, id).toMatch(/29 days/);
      expect(quotesOf(line(id).citation), id).toContain("register within 29 days of your effective date of registration");
    }
  });

  it("lines on steps whose own pages moved cite the pages where that content is now", () => {
    // The stages' own sources (the tax map's) point at pages that answer "page not found" today; their
    // lines cite the current pages, never the dead ones.
    const dead = [
      "employment-self-employment-income/employment-income.html",
      "line-4600-dividends-received.html",
      "scientific-research-experimental-development-tax-incentive/claim-sred-expenditures.html",
      "scientific-research-experimental-development-tax-incentive/glossary.html",
    ];
    for (const d of road.steps.flatMap((s) => s.doneWhen)) {
      for (const path of dead) expect(d.citation.url, d.id).not.toContain(path);
    }
    expect(line("dw-start-sred-t661").citation.url).toContain("scientific-research-experimental-development-tax-incentive-program/");
  });
});

// Review of 2026-10-12: each of these lines read as unconditional, while the sentence or section it
// quotes carries a condition or exceptions. A line keeps them, quoted from the same page.
describe("a line keeps the conditions and exceptions its own page attaches", () => {
  it("the small-supplier line says what doesn't count, and when an associate's revenues do", () => {
    const tests = line("dw-start-gstman-tests");
    expect(tests.text).not.toMatch(/all revenues/);
    expect(tests.text).toMatch(/financial services/);
    expect(tests.text).toMatch(/capital property/);
    expect(tests.text).toMatch(/goodwill from the sale of a business/);
    expect(tests.text).toMatch(/associated at the beginning of the calendar quarter/);
    const quoted = quotesOf(tests.citation);
    expect(quoted).toContain("do not include revenues from supplies of financial services, sales of capital property");
    expect(quoted).toContain("and goodwill from the sale of a business.");
    expect(quoted).toContain("if they were associated at the beginning of the particular calendar quarter");
  });

  it("the T5 line names the T5 Guide's exceptions: under $50 to one recipient, and capital dividends", () => {
    const t5 = line("dw-start-retained-t5");
    expect(t5.text).toMatch(/less than \$50/);
    expect(t5.text).toMatch(/capital dividends/);
    const quoted = quotesOf(t5.citation);
    expect(quoted).toContain("You do not have to prepare a T5 slip to report:");
    expect(quoted).toContain("amounts paid to one recipient when the total amount for the year is less than $50");
    expect(quoted).toContain("capital dividends, as described in Income Tax Folio S3-F2-C1, Capital Dividends");
  });

  it("a personal guarantee is one place limited liability stops, and directors' liability is another", () => {
    const guarantee = line("dw-start-inc-guarantee");
    expect(guarantee.text).not.toMatch(/where limited liability stops/);
    expect(guarantee.text).toMatch(/one place limited liability stops/);
    expect(quotesOf(guarantee.citation)).toContain("However, limited liability may not always protect you from creditors.");

    const directors = line("dw-start-inc-directors");
    expect(directors.text).toMatch(/director/);
    for (const act of ["Income Tax Act", "Employment Insurance Act", "Canada Pension Plan", "Excise Act 2001", "Excise Tax Act"]) {
      expect(directors.text, act).toContain(act);
    }
    expect(quotesOf(directors.citation)).toContain("Directors may also be liable to pay amounts owed by the corporation");
    expect(directors.citation.url).toBe(guarantee.citation.url);
  });

  it("the payroll line keeps 'unless the CRA tells you to remit using a different frequency'", () => {
    const payroll = line("dw-start-hire-payroll-account");
    expect(payroll.text).toMatch(/unless the CRA tells you to remit using a different frequency/);
    expect(quotesOf(payroll.citation)).toContain(
      "from your employee's pay, unless the CRA tells you to remit using a different frequency.",
    );
  });

  it("the salary-into-dividends line keeps its condition: recorded as salary, with deductions at source required", () => {
    const noSwitch = line("dw-start-retained-no-switch");
    expect(noSwitch.text).toMatch(/recorded as salary/);
    expect(noSwitch.text).toMatch(/deductions at source were required/);
    expect(quotesOf(noSwitch.citation)).toContain(
      "If the payments you made to a shareholder were recorded as salary payments (in your books and records) and deductions at source were required",
    );
  });

  it("the record-keeping lines say 'generally', as the CRA does", () => {
    for (const id of ["dw-start-soleprop-records", "dw-start-account-statements"]) {
      expect(line(id).text, id).toMatch(/generally/);
      expect(quotesOf(line(id).citation), id).toContain("You are generally required to keep your records");
    }
  });

  it("the Business Name Report is a line, not a cost: its page names no price for it", () => {
    const name = step("step-start-register-name");
    expect(name.costs.map((c) => c.label).join(" | ")).not.toMatch(/Business Name Report/);
    const report = line("dw-start-name-report");
    expect(report.text).toMatch(/optional/);
    expect(quotesOf(report.citation)).toContain("This step is recommended, but not mandatory.");
    expect(quotesOf(report.citation)).toContain("The report is provided by authorized NUANS members.");
    // The register-name page says a government fee and a service fee are charged; it gives no amount.
    for (const c of [...name.citations, ...name.doneWhen.map((d) => d.citation)]) {
      if (c.url === "https://www.alberta.ca/register-business-name") expect(c.note, c.title).not.toMatch(/what it costs/);
    }
  });

  it("the bank account card's own name carries the CRA's condition", () => {
    expect(step("step-start-business-account").label).toMatch(/, if it has a name other than yours$/);
  });
});
