/**
 * One catalog of official fees (docs/architecture/future-cockpit.md § 6, "The official fees catalog and
 * start-up cost lines as built"; decision 2 of 2026-10-11: official fees with a source, plus the
 * person's own quotes, no averages). Each fee is written once, with its amount, what it is for, the place
 * it applies to as an international code, and its source; a road or a way to incorporate names it by id
 * instead of typing the amount again.
 */
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { incorporationRoutesV2026 } from "@/lib/engines/cfe/v2026/incorporation-routes";
import {
  feeReferenceProblems,
  officialFeeById,
  officialFeeProblems,
  officialFeesV2026,
  type OfficialFee,
} from "@/lib/engines/fees/v2026";
import { roadsV2026, type Road } from "@/lib/engines/roads/v2026";
import { howChecked } from "@/lib/engines/shared/citation-check";
import { PLACE_CODES } from "@/lib/places/codes";

/** Every fee id that has ever shipped. Ids are forever: add new ones here, never take one out. */
const SHIPPED_FEE_IDS = [
  "fee-ca-incorporation-online",
  "fee-ca-incorporation-express",
  "fee-ca-annual-return-online",
  "fee-ab-apprenticeship-application",
  "fee-ab-trades-qualifier-work-experience-application",
  "fee-ab-cabinetmaker-practical-exam",
  "fee-ab-trades-qualifier-recognized-credential-application",
  "fee-ab-trades-qualifier-recognized-credential-rewrite",
  "fee-ab-blue-seal-application",
  "fee-ab-business-number",
];

const fee = (id: string): OfficialFee => {
  const found = officialFeeById(id);
  if (!found) throw new Error(`no fee ${id}`);
  return found;
};

describe("the official fees catalog", () => {
  it("passes its own checks", () => {
    expect(officialFeeProblems(officialFeesV2026)).toEqual([]);
  });

  it("no fee id that ever shipped is removed or renamed, and every fee id is on the shipped list", () => {
    const ids = officialFeesV2026.map((f) => f.id);
    expect(ids).toEqual(expect.arrayContaining(SHIPPED_FEE_IDS));
    for (const id of ids) expect(SHIPPED_FEE_IDS, `add ${id} to the shipped list`).toContain(id);
  });

  it("holds the amounts the cards already showed, each with what it is for and its place as a code", () => {
    const amounts = Object.fromEntries(officialFeesV2026.map((f) => [f.id, [f.place, f.amountCents, f.per ?? null]]));
    expect(amounts).toEqual({
      "fee-ca-incorporation-online": ["CA", 200_00, "once"],
      "fee-ca-incorporation-express": ["CA", 100_00, "once"],
      "fee-ca-annual-return-online": ["CA", 12_00, "year"],
      "fee-ab-apprenticeship-application": ["CA-AB", 150_00, null],
      "fee-ab-trades-qualifier-work-experience-application": ["CA-AB", 450_00, null],
      "fee-ab-cabinetmaker-practical-exam": ["CA-AB", 160_00, null],
      "fee-ab-trades-qualifier-recognized-credential-application": ["CA-AB", 150_00, null],
      "fee-ab-trades-qualifier-recognized-credential-rewrite": ["CA-AB", 50_00, null],
      "fee-ab-blue-seal-application": ["CA-AB", 150_00, null],
      "fee-ab-business-number": ["CA-AB", 0, null],
    });
    for (const f of officialFeesV2026) {
      expect(PLACE_CODES, f.id).toContain(f.place);
      expect(f.label.trim().length, f.id).toBeGreaterThan(0);
    }
    // The only fee that applies only sometimes keeps its condition.
    expect(fee("fee-ab-trades-qualifier-recognized-credential-rewrite").onlyIf).toBe("You failed an exam and choose to rewrite it.");
    expect(officialFeesV2026.filter((f) => f.onlyIf !== undefined)).toHaveLength(1);
  });

  it("every source is a tool check made on 2026-10-12, whose quotes hold the amount; none claims a read", () => {
    for (const f of officialFeesV2026) {
      const how = howChecked(f.citation);
      expect(how.kind, f.id).toBe("tool");
      expect(how.on, f.id).toBe("2026-10-12");
      expect(f.citation.lastVerified, f.id).toBeUndefined();
      expect(f.citation.readBy, f.id).toBeUndefined();
    }
  });

  it("Alberta's registry fees are not in it: they stay named blanks until a person reads the catalogue", () => {
    for (const f of officialFeesV2026) {
      expect(f.label, f.id).not.toMatch(/registry|registr(y|ation) agent|NUANS|annual return.*Alberta/i);
    }
  });
});

describe("the catalog's checks refuse a bad fee", () => {
  const good = (): OfficialFee => structuredClone(fee("fee-ca-incorporation-online"));
  const problemsOf = (change: (f: OfficialFee) => void) => {
    const f = good();
    change(f);
    return officialFeeProblems([f]);
  };

  it("a good fee passes", () => {
    expect(officialFeeProblems([good()])).toEqual([]);
  });

  it("an amount that isn't whole, non-negative cents", () => {
    expect(problemsOf((f) => (f.amountCents = 199.5))).toEqual([
      'Official fee "fee-ca-incorporation-online" is not a whole, non-negative number of cents: 199.5.',
    ]);
    expect(problemsOf((f) => (f.amountCents = -1))[0]).toMatch(/not a whole, non-negative number of cents/);
  });

  it("a tool-checked fee whose quotes don't hold its amount", () => {
    expect(problemsOf((f) => (f.amountCents = 250_00))).toEqual([
      'Official fee "fee-ca-incorporation-online" is checked only by a tool, and none of its quotes has its amount ($250 or $250.00).',
    ]);
  });

  it("a place that isn't an international code, or that doesn't match its source's place", () => {
    expect(problemsOf((f) => (f.place = "AB" as OfficialFee["place"]))).toContain(
      'Official fee "fee-ca-incorporation-online" has a place that isn\'t an international code: "AB".',
    );
    expect(problemsOf((f) => (f.place = "CA-AB"))).toContain(
      'Official fee "fee-ca-incorporation-online" is for CA-AB, but its source is for CA.',
    );
  });

  it("an id that doesn't start with fee- and its place", () => {
    expect(problemsOf((f) => (f.id = "fee-ab-incorporation-online"))).toEqual([
      'Official fee "fee-ab-incorporation-online" is for CA; its id must start with "fee-ca-".',
    ]);
  });

  it("two fees with one id", () => {
    expect(officialFeeProblems([good(), good()])).toEqual(['Official fee id "fee-ca-incorporation-online" is used twice.']);
  });

  it("a condition only in the label, or a blank one", () => {
    expect(problemsOf((f) => (f.label = "Express (only if you want it)"))).toEqual([
      'Official fee "fee-ca-incorporation-online" says "only if" in its label but has no onlyIf condition.',
    ]);
    expect(problemsOf((f) => (f.onlyIf = " "))).toEqual(['Official fee "fee-ca-incorporation-online" has a blank onlyIf condition.']);
  });
});

describe("roads and the ways to incorporate name a fee by id instead of typing its amount", () => {
  it("every official fee on a road or a way to incorporate names a catalog fee and carries exactly its amount, source and condition", () => {
    expect(feeReferenceProblems(officialFeesV2026, roadsV2026, incorporationRoutesV2026)).toEqual([]);
    const onRoads = roadsV2026.flatMap((r) => r.steps.flatMap((s) => s.costs)).filter((c) => c.kind === "official-fee");
    const onRoutes = incorporationRoutesV2026.flatMap((r) => r.lines).filter((l) => l.kind === "official-fee");
    // Nine fee lines on the first written future, three on the federal way to incorporate.
    expect(onRoads).toHaveLength(9);
    expect(onRoutes).toHaveLength(3);
    // Every catalog fee is used somewhere: nothing sits in the catalog that no card shows.
    const used = new Set([...onRoads.map((c) => c.feeId), ...onRoutes.map((l) => l.feeId)]);
    expect([...used].sort()).toEqual(officialFeesV2026.map((f) => f.id).sort());
  });

  it("a road fee line that names no catalog fee, or carries a different amount, source or condition, is refused", () => {
    const road = structuredClone(roadsV2026.find((r) => r.id === "road-apprentice-to-own-shop-ab")!) as Road;
    const line = road.steps.flatMap((s) => s.costs).find((c) => c.id === "cost-shop-apprentice-application")!;
    if (line.kind !== "official-fee") throw new Error("expected the application fee line");
    line.amountCents = 151_00;
    expect(feeReferenceProblems(officialFeesV2026, [road], [])).toEqual([
      'Official fee line "cost-shop-apprentice-application" on road "road-apprentice-to-own-shop-ab" says 15100 cents; fee "fee-ab-apprenticeship-application" is 15000.',
    ]);
    line.amountCents = 150_00;
    line.onlyIf = "Invented condition (test only).";
    expect(feeReferenceProblems(officialFeesV2026, [road], [])).toEqual([
      'Official fee line "cost-shop-apprentice-application" on road "road-apprentice-to-own-shop-ab" has a different condition from fee "fee-ab-apprenticeship-application".',
    ]);
    delete line.onlyIf;
    line.citation = { ...line.citation, url: "https://example.org/invented" };
    expect(feeReferenceProblems(officialFeesV2026, [road], [])).toEqual([
      'Official fee line "cost-shop-apprentice-application" on road "road-apprentice-to-own-shop-ab" has a different source from fee "fee-ab-apprenticeship-application".',
    ]);
    line.feeId = "fee-ab-nobody-wrote";
    expect(feeReferenceProblems(officialFeesV2026, [road], [])).toEqual([
      'Official fee line "cost-shop-apprentice-application" on road "road-apprentice-to-own-shop-ab" names a fee the catalog doesn\'t have: "fee-ab-nobody-wrote".',
    ]);
  });

  it("a way to incorporate whose fee line differs from its catalog fee is refused", () => {
    const routes = structuredClone(incorporationRoutesV2026.slice());
    const line = routes[0]!.lines.find((l) => l.id === "federal-incorporation-fee")!;
    line.amountCad = 250;
    expect(feeReferenceProblems(officialFeesV2026, [], routes)).toEqual([
      'Official fee line "federal-incorporation-fee" on "incorporation-route-federal" says $250; fee "fee-ca-incorporation-online" is $200.',
    ]);
  });

  it("no road file or the incorporation routes types a fee amount: amounts live only in the fees catalog", () => {
    const root = path.resolve(__dirname, "..");
    const files = [
      ...readdirSync(path.join(root, "lib/engines/roads/v2026")).map((f) => path.join(root, "lib/engines/roads/v2026", f)),
      path.join(root, "lib/engines/cfe/v2026/incorporation-routes.ts"),
    ].filter((f) => f.endsWith(".ts") && !f.endsWith("types.ts") && !f.endsWith("validate.ts"));
    for (const file of files) {
      expect(readFileSync(file, "utf8"), path.relative(root, file)).not.toMatch(/amount(Cents|Cad)\s*:\s*[\d_]/);
    }
  });
});
