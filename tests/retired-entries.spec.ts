/**
 * Entries taken off the catalogs after the maintainer's reading list of 2026-10-23, and the rule that their ids are
 * never used again (CLAUDE.md: IDs are forever). Each catalog keeps its own list of what it took off, the way the
 * grants catalog's RETIRED_GRANT_PROGRAMS does (#207): the id, its label, the page it cited, the day the reading list
 * opened that page, and why it came off. Nothing in those lists reaches a screen.
 *
 * - Ontario food premises licensing (`compliance-food-premises-on`): the regulation it cited, O. Reg. 562/90, is
 *   revoked, and the regulation in force hasn't been read, so nothing replaces it yet.
 * - Repeated losses → hobby reclassification (`risk-hobby-reclassification`): its one source, the CRA's Setting up
 *   your business, doesn't support its words, and DotAmi holds no quote from a page that does.
 *
 * The loan program's read (`risk-self-declared-valuation`) stays, saying only ISED's rule on security
 * (tests/reading-list-corrections.spec.ts). Each check fails on the code before the change unless its comment says
 * it is a guard.
 */
import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { evaluateProfile, type EvaluationProfile } from "@/lib/brain";
import { NODE_ENGINE_HINTS } from "@/lib/brain/node-items";
import { allCatalogCitations } from "@/lib/engines/all-citations";
import { complianceRulesV2026, RETIRED_COMPLIANCE_RULES } from "@/lib/engines/compliance/v2026";
import { grantProgramsV2026 } from "@/lib/engines/grants/v2026/programs";
import { RETIRED_RISK_ENTRIES, riskCombinationsV2026, riskEntriesV2026 } from "@/lib/engines/risk/v2026";
import { roadsV2026 } from "@/lib/engines/roads/v2026";
import { structureCatalogV2026 } from "@/lib/engines/structure/v2026";
import { writeOffsCatalogV2026 } from "@/lib/engines/writeoffs/v2026";

const TODAY = "2026-10-24";
/** The day the reading list's tool opened every page it lists. */
const LIST_DAY = "2026-10-23";
const REVOKED = "https://www.ontario.ca/laws/regulation/900562";
const SETTING_UP = "https://www.canada.ca/en/revenue-agency/services/tax/businesses/small-businesses-self-employed-income/setting-your-business.html";

/** Every compliance rule that ever shipped (the official-fees catalog's SHIPPED_FEE_IDS is the model). */
const SHIPPED_COMPLIANCE_IDS = [
  "compliance-gst-small-supplier",
  "compliance-bc-pst",
  "compliance-on-hst",
  "compliance-ab-no-pst",
  "compliance-hobby-vs-business",
  "compliance-trades-licensing-ab",
  "compliance-food-premises-on",
  "compliance-gst-taxi-ride-sharing",
  "compliance-platform-reporting-rideshare",
];
/** Every risk read that ever shipped. */
const SHIPPED_RISK_IDS = [
  "risk-home-office-percentage",
  "risk-vehicle-logbook",
  "risk-mixed-use-equipment",
  "risk-immediate-expensing-timing",
  "risk-sred-documentation",
  "risk-hobby-reclassification",
  "risk-ladder-skipping",
  "risk-self-declared-valuation",
];

const repo = path.resolve(__dirname, "..");
/** A doc's section that starts at a "## Retired" heading, up to the next "## " heading. */
function retiredSection(file: string): string {
  const doc = readFileSync(path.join(repo, file), "utf8");
  const start = doc.search(/^## Retired/m);
  if (start === -1) return "";
  const next = doc.indexOf("\n## ", start + 1);
  return doc.slice(start, next === -1 ? undefined : next);
}

/** An invented Alberta idea; each check changes what it needs. */
const idea = (change: Partial<EvaluationProfile> = {}): EvaluationProfile => ({
  goals: [],
  ventureType: "service",
  activityTags: [],
  province: "AB",
  employmentStatus: "self-employed",
  structure: "sole-prop",
  targetRevenueY1: 10_000,
  targetRevenueY3: 10_000,
  hireFirst: false,
  capitalPurchasePlanned: false,
  ...change,
});
const unlocks = (p: EvaluationProfile) => evaluateProfile(p, { today: TODAY }).unlocks;

/** Every id a live entry has in the catalogs a retired id could be mistaken for. */
const liveIds = () => [
  ...grantProgramsV2026.map((e) => e.id),
  ...complianceRulesV2026.map((e) => e.id),
  ...riskEntriesV2026.map((e) => e.id),
  ...riskCombinationsV2026.map((e) => e.id),
  ...writeOffsCatalogV2026.entries.map((e) => e.id),
  ...structureCatalogV2026.entries.map((e) => e.id),
];
/** Every id something else on the map names: road steps' cards, the old node hints, and the risk reads' targets. */
const namedIds = () => [
  ...roadsV2026.flatMap((r) => r.steps.flatMap((s) => s.engineHints ?? [])),
  ...Object.values(NODE_ENGINE_HINTS).flatMap((ids) => ids ?? []),
  ...riskEntriesV2026.flatMap((e) => e.appliesTo),
  ...riskCombinationsV2026.flatMap((c) => c.memberIds),
];

describe("1. Ontario food premises licensing came off the compliance catalog", () => {
  it("is not a rule in the catalog", () => {
    expect(complianceRulesV2026.map((r) => r.id)).not.toContain("compliance-food-premises-on");
  });

  it("is in the retired list with the page it cited, the day the reading list opened it, and why", () => {
    expect(RETIRED_COMPLIANCE_RULES, "the compliance catalog's list of retired rules").toBeDefined();
    expect(RETIRED_COMPLIANCE_RULES.map((r) => r.id)).toEqual(["compliance-food-premises-on"]);
    const [food] = RETIRED_COMPLIANCE_RULES;
    expect(food!.label).toBe("Ontario food premises licensing");
    expect(food!.url).toBe(REVOKED);
    expect(food!.readOn).toBe(LIST_DAY);
    expect(food!.why).toMatch(/562\/90/);
    expect(food!.why).toMatch(/revoked/i);
  });

  it("no citation points at the revoked regulation", () => {
    expect(allCatalogCitations().filter(({ citation }) => citation.url === REVOKED).map((l) => l.where)).toEqual([]);
  });

  it("an Ontario food-service or hospitality idea no longer gets the card, and still gets Ontario's own rules", () => {
    for (const tag of ["Food service", "Hospitality"]) {
      const shown = unlocks(idea({ province: "ON", activityTags: [tag] }));
      expect(shown.map((u) => u.id), tag).not.toContain("compliance-food-premises-on");
      expect(shown.map((u) => u.title), tag).not.toContain("Ontario food premises licensing");
      // The check really reached Ontario's rules.
      expect(shown.map((u) => u.id), tag).toContain("compliance-on-hst");
    }
  });
});

describe("2. The repeated-losses read came off the risk catalog; the loan program's read stays", () => {
  it("the hobby read is in the risk catalog's retired list with its page, the day the reading list opened it, and why", () => {
    expect(RETIRED_RISK_ENTRIES, "the risk catalog's list of retired reads").toBeDefined();
    expect(RETIRED_RISK_ENTRIES.map((r) => r.id)).toEqual(["risk-hobby-reclassification"]);
    const [hobby] = RETIRED_RISK_ENTRIES;
    expect(hobby!.url).toBe(SETTING_UP);
    expect(hobby!.readOn).toBe(LIST_DAY);
    expect(hobby!.why.length).toBeGreaterThan(0);
    expect(riskEntriesV2026.map((e) => e.id)).not.toContain("risk-hobby-reclassification");
  });

  it("the Hobby vs. business card still shows, with no risk box", () => {
    const hobby = unlocks(idea({ activityTags: ["Content / streaming"] })).find((u) => u.id === "compliance-hobby-vs-business");
    expect(hobby).toBeDefined();
    expect(hobby!.risk).toBeUndefined();
  });

  it("the loan program's read is not retired: its card still carries a risk box", () => {
    expect(riskEntriesV2026.map((e) => e.id)).toContain("risk-self-declared-valuation");
    expect(RETIRED_RISK_ENTRIES.map((r) => r.id)).not.toContain("risk-self-declared-valuation");
    const csbfp = unlocks(idea({ activityTags: ["Software / SaaS"] })).find((u) => u.id === "grant-csbfp");
    expect(csbfp?.risk).toBeDefined();
  });
});

describe("3. A retired id is never used again", () => {
  const retired = () => [...RETIRED_COMPLIANCE_RULES, ...RETIRED_RISK_ENTRIES];

  it("no live entry in any catalog has a retired id, and nothing on the map names one", () => {
    for (const { id } of retired()) {
      expect(liveIds(), id).not.toContain(id);
      expect(namedIds(), id).not.toContain(id);
    }
  });

  it("every compliance rule and risk read that ever shipped is live or retired, and a new one is added to the list", () => {
    // A guard, as tests/official-fees.spec.ts keeps for fees: an id can't quietly disappear.
    const compliance = [...complianceRulesV2026.map((r) => r.id), ...RETIRED_COMPLIANCE_RULES.map((r) => r.id)];
    expect(compliance).toEqual(expect.arrayContaining(SHIPPED_COMPLIANCE_IDS));
    for (const { id } of complianceRulesV2026) expect(SHIPPED_COMPLIANCE_IDS, `add ${id} to the shipped list`).toContain(id);
    const risk = [...riskEntriesV2026.map((e) => e.id), ...RETIRED_RISK_ENTRIES.map((r) => r.id)];
    expect(risk).toEqual(expect.arrayContaining(SHIPPED_RISK_IDS));
    for (const { id } of riskEntriesV2026) expect(SHIPPED_RISK_IDS, `add ${id} to the shipped list`).toContain(id);
  });

  it("a retired entry that says how its subject comes back says under a new id, in the catalog and in its doc", () => {
    // One rule for every catalog: the first check here fails on any live entry with a retired id, so a subject that
    // comes back can only come back under a new one (citations.md: a retired id is never used for anything else).
    const underTheOldId = /under (this|the same|its old|its own) id/i;
    for (const r of retired()) {
      if (/comes back/i.test(r.why)) expect(r.why, r.id).toMatch(/only under a new id/i);
      expect(r.why, r.id).not.toMatch(underTheOldId);
    }
    for (const file of ["docs/engines/compliance.md", "docs/brain/risk-calculator.md"]) {
      expect(retiredSection(file).replace(/\s+/g, " "), file).not.toMatch(underTheOldId);
    }
  });

  it("each retired entry says why without claiming that a person read its page", () => {
    // The maintainer's reads are not on record yet (his answer of 2026-10-24): readOn is the day the reading list's
    // tool opened the page, as it is for the grants catalog's retired programs.
    for (const r of retired()) {
      expect(r.readOn, r.id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(r.readOn <= TODAY, r.id).toBe(true);
      expect(r.why, r.id).not.toMatch(/read by a person|maintainer read/i);
    }
  });

  it("each catalog's doc lists what it took off, under a Retired heading", () => {
    expect(retiredSection("docs/engines/compliance.md")).toContain("compliance-food-premises-on");
    expect(retiredSection("docs/brain/risk-calculator.md")).toContain("risk-hobby-reclassification");
  });
});
