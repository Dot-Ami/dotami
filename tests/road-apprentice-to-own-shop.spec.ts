import { describe, expect, it } from "vitest";

import { allCatalogCitations } from "@/lib/engines/all-citations";
import {
  generalRoadV2026,
  roadApprenticeToOwnShopAB,
  roadById,
  roadsV2026,
  roadStartingAnyBusinessAB,
  skillItemsV2026,
  type Road,
  type RoadStep,
} from "@/lib/engines/roads/v2026";
import type { EngineCitation } from "@/lib/engines/shared/types";
import { evaluateRoad, roadReceipt } from "@/lib/roads";

import { input } from "./helpers/road-to-evaluate";

/**
 * The first written future (decision 1 of 2026-10-11): "From apprentice to your own shop (Alberta)".
 * Its content was written and fact-checked from Alberta's, the CRA's and WCB-Alberta's pages; in the
 * catalog every source is a tool check (option B, docs/engines/citations.md), so these tests hold it
 * to exactly that: found words, never a read nobody did.
 */
const road = roadApprenticeToOwnShopAB;
const step = (id: string): RoadStep => {
  const found = road.steps.find((s) => s.id === id);
  if (!found) throw new Error(`no step ${id}`);
  return found;
};

/** Every citation in the road, with where it sits, so a failure names the entry. */
function citationsOf(r: Road): { where: string; citation: EngineCitation }[] {
  return r.steps.flatMap((s) => [
    ...s.citations.map((citation) => ({ where: s.id, citation })),
    ...s.doneWhen.map((d) => ({ where: d.id, citation: d.citation })),
    ...s.costs.flatMap((c) =>
      c.kind === "official-fee"
        ? [{ where: c.id, citation: c.citation }]
        : c.nameSource
          ? [{ where: c.id, citation: c.nameSource }]
          : [],
    ),
  ]);
}

/** Every step reachable from one, following `next`. */
function reachableFrom(id: string): Set<string> {
  const seen = new Set<string>();
  const queue = [id];
  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const next of step(current).next) {
      if (!seen.has(next)) {
        seen.add(next);
        queue.push(next);
      }
    }
  }
  return seen;
}

describe("the first written future is in the catalog", () => {
  it("loads, after road 0 in the order added, and road 0 stays the general road", () => {
    expect(roadById("road-apprentice-to-own-shop-ab")).toBe(road);
    expect(road.label).toBe("From apprentice to your own shop (Alberta)");
    // A career and a business together.
    expect(road.kind).toBe("both");
    expect(road.provinces).toEqual(["AB"]);
    // Order added, never ranked (decision 3); the federal steps came after it (2026-10-21, task 28d).
    expect(roadsV2026.map((r) => r.id)).toEqual(["road-starting-any-business-ab", "road-apprentice-to-own-shop-ab", "road-federal-steps-ca"]);
    expect(generalRoadV2026).toBe(roadStartingAnyBusinessAB);
  });

  it("has the four columns the content names, left to right", () => {
    expect(road.columns.map((c) => c.label)).toEqual([
      "Finish your training",
      "Certified",
      "Open the doors",
      "First years on your own",
    ]);
    for (const column of road.columns) expect(column.summary.length).toBeGreaterThan(0);
  });

  it("every step has a plain one-line summary and at least one done-when line", () => {
    for (const s of road.steps) {
      expect(s.summary.length, s.id).toBeGreaterThan(0);
      expect(s.summary, s.id).not.toMatch(/\n/);
      expect(s.doneWhen.length, s.id).toBeGreaterThan(0);
    }
  });

  it("then joins road 0 at Incorporating", () => {
    expect(road.joins).toEqual({ roadId: "road-starting-any-business-ab", columnId: "tier-3-incorporating" });
    expect(roadStartingAnyBusinessAB.columns.map((c) => c.id)).toContain("tier-3-incorporating");
  });
});

describe("the fork after Certified has two sides", () => {
  const [fork] = road.forks;
  const certified = road.columns.find((c) => c.label === "Certified")!;

  it("is the one fork, decided in the Certified column, between staying employed and opening a shop", () => {
    expect(road.forks).toHaveLength(1);
    expect(fork!.sides).toEqual(["step-shop-stay-employed", "step-shop-open-own-shop"]);
    expect(certified.forkId).toBe(fork!.id);
    for (const side of fork!.sides) expect(certified.steps).toContain(side);
    expect(step("step-shop-stay-employed").label).toMatch(/stay employed/i);
    expect(step("step-shop-open-own-shop").label).toMatch(/open your own shop/i);
  });

  it("both sides follow the certificate, and only the shop side leads into the business steps", () => {
    const fromCertificate = reachableFrom("step-shop-journeyperson-certificate");
    for (const side of fork!.sides) expect(fromCertificate.has(side)).toBe(true);
    expect(reachableFrom("step-shop-open-own-shop").has("step-shop-register-name")).toBe(true);
    expect(reachableFrom("step-shop-stay-employed").has("step-shop-register-name")).toBe(false);
  });

  it("the three ways to the certificate all lead to it, side by side, none picked for the person", () => {
    for (const start of ["step-shop-classroom-exams", "step-shop-tq-work-experience", "step-shop-tq-recognized-credential"]) {
      expect(step(start).next).toEqual(["step-shop-journeyperson-certificate"]);
    }
    // One done-when line per route on the certificate; the person ticks their own.
    expect(step("step-shop-journeyperson-certificate").doneWhen.map((d) => d.id)).toEqual([
      "dw-shop-jp-apprenticeship",
      "dw-shop-jp-tqwe",
      "dw-shop-jp-tqrc",
    ]);
  });
});

describe("every source is a tool check with its quotes, and none claims a read", () => {
  const all = citationsOf(road);

  it("every step, done-when line, fee and sourced cost line has one", () => {
    // 17 steps (16 on 2026-10-12, and Keep your records from day one since 2026-10-14); more citations
    // than steps, since every done-when line carries its own.
    expect(road.steps).toHaveLength(17);
    expect(all.length).toBeGreaterThan(road.steps.length * 3);
  });

  it("each was checked by the tool on 2026-10-12 (the records step's on 2026-10-14, the blanks looked up again on 2026-10-15), with at least one quote of three words or more", () => {
    // Keep your records from day one was added on 2026-10-14, its CRA pages checked that day; the three
    // cost lines whose sources changed when the blanks were looked up again (build list item 19) on 2026-10-15.
    const BLANKS = ["cost-shop-red-seal-application", "cost-shop-name-government-fee", "cost-shop-name-report"];
    const checkedOnFor = (where: string) =>
      BLANKS.includes(where)
        ? "2026-10-15"
        : where === "step-shop-keep-records" || where.startsWith("dw-shop-records-")
          ? "2026-10-14"
          : "2026-10-12";
    for (const { where, citation } of all) {
      expect(citation.toolCheck, where).toBeDefined();
      expect(citation.toolCheck!.checkedOn, where).toBe(checkedOnFor(where));
      expect(citation.toolCheck!.quotes.length, where).toBeGreaterThan(0);
      for (const quote of citation.toolCheck!.quotes) {
        expect(quote.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length, `${where}: ${quote}`).toBeGreaterThanOrEqual(3);
      }
      expect(citation.url, where).toMatch(/^https:\/\//);
    }
  });

  it("none records a read, so no card can say a person (or anyone) read these pages", () => {
    for (const { where, citation } of all) {
      expect(citation.lastVerified, where).toBeUndefined();
      expect(citation.readBy, where).toBeUndefined();
    }
    // With nothing read, the road carries no read date.
    expect(road.lastVerified).toBe("");
  });

  it("the skill items it needs are tool-checked the same way", () => {
    const needed = new Set(road.steps.flatMap((s) => s.needs));
    const items = skillItemsV2026.filter((i) => needed.has(i.id));
    expect(items.map((i) => i.id).sort()).toEqual([
      "skill-ab-alberta-student-number",
      "skill-ab-apprenticeship-education-agreement",
      "skill-ab-recognized-outside-trade-certificate",
    ]);
    for (const item of items) {
      // Legal requirements only; named skills from the government's list come with the OaSIS import.
      expect(item.kind, item.id).toBe("legal-requirement");
      for (const c of [...item.citations, ...(item.howToGetIt ? [item.howToGetIt.citation] : [])]) {
        expect(c.toolCheck?.checkedOn, item.id).toBe("2026-10-12");
        expect(c.lastVerified, item.id).toBeUndefined();
      }
    }
  });

  it("every one is in the list the quote checker re-checks", () => {
    const listed = allCatalogCitations().filter(({ where }) => where.startsWith("roads road-apprentice-to-own-shop-ab "));
    expect(listed).toHaveLength(all.length);
  });
});

describe("costs: official fees only where a page states them, everything else a named line", () => {
  const costs = road.steps.flatMap((s) => s.costs);
  const fees = costs.flatMap((c) => (c.kind === "official-fee" ? [c] : []));

  it("the official fees are exactly the amounts the pages state, each with its citation", () => {
    expect(Object.fromEntries(fees.map((f) => [f.id, f.amountCents]))).toEqual({
      "cost-shop-apprentice-application": 150_00,
      "cost-shop-tqwe-application": 450_00,
      "cost-shop-tqwe-practical": 160_00,
      "cost-shop-tqrc-application": 150_00,
      "cost-shop-tqrc-practical": 160_00,
      "cost-shop-tqrc-rewrite": 50_00,
      "cost-shop-blue-seal-application": 150_00,
      "cost-shop-business-number": 0,
      // Build list item 19 (2026-10-15): Tradesecrets' Apply Online page prices the Red Seal application.
      "cost-shop-red-seal-application": 150_00,
    });
    for (const fee of fees) expect(fee.citation, fee.id).toBeDefined();
  });

  it("each fee's own quotes hold its amount (a $0 fee quotes the page's 'no cost')", () => {
    for (const fee of fees) {
      const words = fee.citation.toolCheck!.quotes.join(" | ");
      if (fee.amountCents === 0) expect(words, fee.id).toMatch(/no cost/i);
      else expect(words, fee.id).toContain(`$${fee.amountCents / 100}`);
    }
  });

  it("the conditional rewrite fee is typed as conditional, so a total can leave it out, and its label says so too", () => {
    const rewrite = fees.find((f) => f.id === "cost-shop-tqrc-rewrite")!;
    expect(rewrite.label).toMatch(/only if you fail/i);
    expect(rewrite.onlyIf).toMatch(/fail/i);
    // Every other fee but the Red Seal application (below) applies to everyone on its step.
    const conditional = ["cost-shop-tqrc-rewrite", "cost-shop-red-seal-application"];
    for (const fee of fees.filter((f) => !conditional.includes(f.id))) expect(fee.onlyIf, fee.id).toBeUndefined();
  });

  it("the Red Seal fee applies only to an application made after you're certified, the way the Red Seal page splits the two ways", () => {
    const redSeal = fees.find((f) => f.id === "cost-shop-red-seal-application")!;
    expect(redSeal.label).toMatch(/only if you apply after you're certified/i);
    expect(redSeal.onlyIf).toMatch(/after you're certified/);
    // The page's application (with its fee) is for people already certified; an apprentice in a Red Seal
    // trade writes the exam in their final period, and the page names no fee for that.
    expect(quotesOf(line("dw-shop-red-seal-later").citation)).toContain("you can apply to write the Red Seal exam at any time afterward");
    expect(quotesOf(line("dw-shop-red-seal-apprentice").citation)).not.toMatch(/fee|pay/i);
  });

  it("every cost line still blank says why: no official page gives an amount, or its amount is in a catalogue a tool can't read", () => {
    const blanks = Object.fromEntries(costs.filter((c) => c.kind === "named").map((c) => [c.id, c]));
    // The exam and registry blanks this road had before build list item 19, each with its stated reason.
    const reasons: Record<string, RegExp> = {
      "cost-shop-tqwe-rewrite": /the page gives no amount/,
      "cost-shop-tqwe-panel-interview": /the page gives no amount/,
      "cost-shop-name-government-fee": /Registry Agent Product Catalogue/,
      "cost-shop-name-service-fee": /set by your agent/,
      "cost-shop-name-report": /NUANS members; the page gives no amount/,
    };
    for (const [id, reason] of Object.entries(reasons)) {
      expect(blanks[id], id).toBeDefined();
      expect(blanks[id]!.label, id).toMatch(reason);
      // Each reason is backed by the page's own words.
      expect(blanks[id]!.kind === "named" && blanks[id]!.nameSource, id).toBeTruthy();
    }
    // The government fee's page points to the catalogue that holds it.
    expect(quotesOf(blanks["cost-shop-name-government-fee"]!.kind === "named" ? blanks["cost-shop-name-government-fee"]!.nameSource : undefined)).toContain(
      "See the Registry agent product catalogue.",
    );
    expect(quotesOf(blanks["cost-shop-name-report"]!.kind === "named" ? blanks["cost-shop-name-report"]!.nameSource : undefined)).toContain(
      "The report is provided by authorized NUANS members.",
    );
  });

  it("named lines carry no amount at all", () => {
    for (const line of costs.filter((c) => c.kind === "named")) {
      expect(line, line.id).not.toHaveProperty("amountCents");
    }
  });

  it("Alberta's registry fees are named lines, never guessed: the catalogue that holds them stops tools", () => {
    const name = step("step-shop-register-name").costs;
    expect(name.find((c) => c.id === "cost-shop-name-government-fee")!.kind).toBe("named");
    expect(name.find((c) => c.id === "cost-shop-name-service-fee")!.kind).toBe("named");
  });

  it("names the cost lines a person prices for opening a shop", () => {
    expect(step("step-shop-open-own-shop").costs.map((c) => c.label)).toEqual(
      expect.arrayContaining([
        "Shop space deposit",
        "Woodworking machines and tools",
        "Insurance",
        "Vehicle",
        "First materials",
        "Design or CAD software",
        "Money to live on while starting",
      ]),
    );
  });
});

/** A done-when line anywhere on the road, by id. */
const line = (id: string) => {
  const found = road.steps.flatMap((s) => s.doneWhen).find((d) => d.id === id);
  if (!found) throw new Error(`no done-when line ${id}`);
  return found;
};
/** Every quote a list of citations relies on, as one string. */
const quotesOf = (...citations: (EngineCitation | undefined)[]) =>
  citations.flatMap((c) => c?.toolCheck?.quotes ?? []).join(" | ");

describe("a line says what its own page says, no more and no less", () => {
  // The numbers a line states, as digits: "8,160" is 8160, "$160.00" is 160, "four" is 4. Words for
  // numbers are the ones these pages use; "one" is left out ("one assigned mentor", "one or more").
  const WORDS: Record<string, string> = { two: "2", three: "3", four: "4", six: "6", eight: "8", fifteen: "15", eighteen: "18", thirty: "30", forty: "40" };
  const numbersIn = (text: string) => {
    const found = new Set<string>();
    for (const m of text.matchAll(/\d[\d,]*(?:\.\d+)?/g)) found.add(m[0].replace(/,/g, "").replace(/\.00$/, ""));
    for (const m of text.toLowerCase().matchAll(/\b(two|three|four|six|eight|fifteen|eighteen|thirty|forty)\b/g)) {
      found.add(WORDS[m[1]!]!);
    }
    return found;
  };
  const numbersOnItsOwnPage = (where: string, text: string, citations: (EngineCitation | undefined)[]) => {
    const quoted = numbersIn(quotesOf(...citations));
    for (const n of numbersIn(text)) expect(quoted.has(n), `${where}: "${n}" isn't in its own quotes`).toBe(true);
  };

  it("every number in a done-when line, a step's one line, a cost label or a how-to-get-it line is in that entry's own quotes", () => {
    for (const s of road.steps) {
      numbersOnItsOwnPage(`${s.id} (one line)`, s.summary, s.citations);
      for (const d of s.doneWhen) numbersOnItsOwnPage(d.id, d.text, [d.citation]);
      for (const c of s.costs) numbersOnItsOwnPage(c.id, c.label, [c.kind === "official-fee" ? c.citation : c.nameSource]);
    }
    for (const item of skillItemsV2026) {
      if (item.howToGetIt) numbersOnItsOwnPage(item.id, item.howToGetIt.text, [item.howToGetIt.citation]);
    }
  });

  it("someone who chooses a corporation is pointed to Incorporating on road 0, where this road joins it", () => {
    const joinColumn = roadStartingAnyBusinessAB.columns.find((c) => c.id === road.joins!.columnId)!;
    for (const id of ["step-shop-open-own-shop", "step-shop-register-name"]) {
      const summary = step(id).summary;
      expect(summary, id).toMatch(/corporation/i);
      expect(summary, id).toContain(joinColumn.label);
      expect(summary, id).toContain("Starting any business in Alberta");
    }
  });

  it("the legal-advice line keeps alberta.ca's condition, and the lawyer line is that same condition, cited", () => {
    expect(line("dw-shop-own-business-form").text).toMatch(/if you need help (deciding|choosing)/i);
    expect(line("dw-shop-own-business-form").text).not.toMatch(/strongly recommends/i);
    const lawyer = step("step-shop-open-own-shop").costs.find((c) => c.id === "cost-shop-lawyer-business-form")!;
    expect(lawyer.kind).toBe("named");
    expect(lawyer.label).toMatch(/if you want help/i);
    expect(lawyer.kind === "named" && lawyer.nameSource?.url).toBe("https://www.alberta.ca/register-business-name");
    expect(quotesOf(lawyer.kind === "named" ? lawyer.nameSource : undefined)).toMatch(/If you need help deciding/);
  });

  it("the name rule includes the short forms Alberta also bans", () => {
    const ending = line("dw-shop-name-ending");
    for (const short of ["Ltd.", "Inc.", "Corp."]) expect(ending.text, short).toContain(short);
    expect(quotesOf(ending.citation)).toContain("cannot use the abbreviated forms of these words");
  });

  it("the apprentice-to-mentor ratio is a limit, not a quota", () => {
    expect(line("dw-shop-sponsor-own-ratio").text).toMatch(/no more than two apprentices for each assigned mentor/i);
  });

  it("the Red Seal step can't be done without passing: one line says the exam was passed, from the page's own words", () => {
    const passed = line("dw-shop-red-seal-passed");
    expect(step("step-shop-red-seal").doneWhen.map((d) => d.id)).toContain("dw-shop-red-seal-passed");
    expect(passed.text).toMatch(/passed the Red Seal exam/i);
    expect(quotesOf(passed.citation)).toContain("hold a trade certificate with a Red Seal");
    expect(quotesOf(passed.citation)).toContain("If you are unsuccessful in your Red Seal exam");
  });

  it("the GST/HST lines count what the CRA counts: all revenues, all your businesses and your associates', worldwide", () => {
    for (const id of ["dw-shop-gst-checked", "dw-shop-gst-registered"]) expect(line(id).text, id).not.toMatch(/your (taxable )?sales/i);
    const checkedLine = line("dw-shop-gst-checked");
    expect(checkedLine.text).toMatch(/worldwide/);
    expect(checkedLine.text).toMatch(/associates/);
    expect(checkedLine.text).toMatch(/before expenses/);
    expect(quotesOf(checkedLine.citation)).toContain("If you are a sole proprietor, include the total amount of all revenues (before expenses)");
    expect(quotesOf(checkedLine.citation)).toContain("If you are a partnership or a corporation, include the total amount of all revenues");
  });

  it("the WCB lines name what each page backs: personal coverage for the owner, apart from the workers' premium", () => {
    const costs = step("step-shop-first-hire").costs;
    const personal = costs.find((c) => c.id === "cost-shop-wcb-personal-coverage")!;
    expect(personal.label).toMatch(/personal coverage for yourself/i);
    expect(personal.kind === "named" && personal.nameSource?.url).toMatch(/personal-coverage\.html$/);
    const workers = costs.find((c) => c.id === "cost-shop-wcb-premium")!;
    expect(workers.label).toMatch(/your workers/i);
    // The personal-coverage page backs only the personal-coverage line.
    for (const c of costs) {
      if (c.id === personal.id || c.kind !== "named") continue;
      expect(c.nameSource?.url ?? "", c.id).not.toMatch(/personal-coverage/);
    }
  });

  it("certification is optional in this trade, and the road says so in its own words", () => {
    expect(step("step-shop-journeyperson-certificate").summary).toMatch(/optional/i);
    expect(quotesOf(...step("step-shop-journeyperson-certificate").citations)).toContain("journeyperson certification optional");
    // Not the general page's "ticket to work", which says more than this trade's profile does.
    for (const s of road.steps) {
      for (const c of [...s.citations, ...s.doneWhen.map((d) => d.citation)]) {
        expect(quotesOf(c), s.id).not.toContain("ticket to work");
      }
    }
  });

  it("plain words: abbreviations spelled out, a period explained, Schedule 1 named", () => {
    const allText = road.steps.map((s) => [s.summary, ...s.doneWhen.map((d) => d.text)].join(" ")).join(" ");
    for (const spelled of [
      "Northern Alberta Institute of Technology",
      "Southern Alberta Institute of Technology",
      "Canada Revenue Agency",
      "Workers' Compensation Board",
      "Goods and Services Tax",
    ]) {
      expect(allText, spelled).toContain(spelled);
    }
    // A period is explained as a level. No times (2026-10-17): the summary doesn't say how long a period is
    // designed to take; that stays only in the official page's own words, quoted in the step's source.
    expect(step("step-shop-register-apprentice").summary).toContain("4 periods (levels)");
    expect(step("step-shop-register-apprentice").summary).not.toMatch(/about a year/);
    expect(quotesOf(...step("step-shop-register-apprentice").citations)).toContain("Each period designed to take ~1 year");
    const wages = line("dw-shop-sponsor-own-wages");
    expect(wages.text).toContain("Apprenticeship Education and Industry Training Programs Regulation");
    expect(quotesOf(wages.citation)).toContain("Schedule 1 (pages 20 and 21) of the Apprenticeship Education and Industry Training Programs Regulation");
  });

  it("the Alberta Student Number cites every page on this road that asks for it, and skill ids share one pattern", () => {
    const asn = skillItemsV2026.find((i) => i.id === "skill-ab-alberta-student-number")!;
    const urls = asn.citations.map((c) => c.url);
    // Each step that needs it has a page saying so, and that page is cited on the item.
    expect(urls).toEqual(
      expect.arrayContaining([
        "https://tradesecrets.alberta.ca/get-started/become-an-apprentice/apply-for-apprenticeship/",
        "https://tradesecrets.alberta.ca/become-certified/trades-qualifier-programs/qualify-based-on-work-experience/program-details/",
        "https://tradesecrets.alberta.ca/become-certified/trades-qualifier-programs/qualify-for-alberta-certification/program-details/",
        "https://tradesecrets.alberta.ca/become-certified/business-competencies-blue-seal/",
      ]),
    );
    for (const id of new Set(road.steps.flatMap((s) => s.needs))) expect(id).toMatch(/^skill-ab-/);
  });
});

describe("road evaluation reads it (lib/roads/)", () => {
  const evaluate = (forkPicks = {}) => evaluateRoad(input({ road, roadChosen: true, skillItems: skillItemsV2026, forkPicks }));
  const OWN_SHOP = { "fork-shop-employed-or-own": { stepId: "step-shop-open-own-shop", from: "you" as const } };

  it("every step gets a state and a reason, and every skill item it lists has a name in the shared list", () => {
    const result = evaluate();
    expect(result.steps.map((s) => s.stepId).sort()).toEqual(road.steps.map((s) => s.id).sort());
    for (const s of result.steps) expect(s.because.length).toBeGreaterThan(0);
    expect(result.gauges.skills.listed).toBe(new Set(road.steps.flatMap((s) => s.needs)).size);
  });

  it("a fee that applies only sometimes is counted apart and never added to the official fees", () => {
    for (const result of [evaluate(), evaluate(OWN_SHOP)]) {
      const counted = result.steps.filter((s) => s.money === "counted").flatMap((s) => s.costs);
      const fees = counted.filter((c) => c.kind === "official-fee");
      const always = fees.filter((c) => c.kind === "official-fee" && c.onlyIf === undefined);
      // The $50 exam rewrite on the Recognized Credential route is on the path before the fork.
      expect(fees.find((c) => c.lineId === "cost-shop-tqrc-rewrite")).toMatchObject({ onlyIf: expect.any(String) });
      expect(result.gauges.money.onlyIfFeeLines).toBe(fees.length - always.length);
      expect(result.gauges.money.onlyIfFeeLines).toBeGreaterThan(0);
      expect(result.gauges.money.officialFeeLines).toBe(always.length);
      expect(result.gauges.money.officialFeesCents).toBe(
        always.reduce((sum, c) => sum + (c.kind === "official-fee" ? c.amountCents : 0), 0),
      );
    }
  });

  it("picking the own-shop ending gives receipt lines, none of them a verdict", () => {
    const lines = roadReceipt(evaluate(), evaluate(OWN_SHOP));
    expect(lines.length).toBeGreaterThan(0);
    expect(lines.filter((line) => /\b(enough|ready|best|should|recommend\w*)\b/i.test(line))).toEqual([]);
  });
});
