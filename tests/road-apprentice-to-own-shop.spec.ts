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
    // Order added, never ranked (decision 3).
    expect(roadsV2026.map((r) => r.id)).toEqual(["road-starting-any-business-ab", "road-apprentice-to-own-shop-ab"]);
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
    // 16 steps; more citations than steps, since every done-when line carries its own.
    expect(road.steps).toHaveLength(16);
    expect(all.length).toBeGreaterThan(road.steps.length * 3);
  });

  it("each was checked by the tool on 2026-10-12, with at least one quote of three words or more", () => {
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
      "skill-recognized-trade-certificate-outside-ab",
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

  it("the conditional rewrite fee says so in its label", () => {
    expect(fees.find((f) => f.id === "cost-shop-tqrc-rewrite")!.label).toMatch(/only if you fail/i);
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
