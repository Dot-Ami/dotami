import { describe, expect, it } from "vitest";

import { parseIntentFallback } from "@/lib/journey/intent-fallback";

describe("intent fallback matcher", () => {
  it("maps the verification scenario: video game studio in Winnipeg + PC write-off", () => {
    const r = parseIntentFallback("A video game studio in Winnipeg, I want to write off my PC");
    expect(r.activityTags).toContain("Software / SaaS");
    expect(r.province).toBe("MB");
    expect(r.capitalPurchasePlanned).toBe(true);
    expect(r.goals).toContain("write-offs");
    expect(r.source).toBe("fallback");
    expect(r.unmapped).toHaveLength(0);
  });

  it("maps trades + vehicle", () => {
    const r = parseIntentFallback("I do renovations in Calgary and want my truck to count");
    expect(r.activityTags).toContain("Trades");
    expect(r.province).toBe("AB");
    expect(r.capitalPurchasePlanned).toBe(true);
  });

  it("detects side-gig framing and hobby monetization", () => {
    const r = parseIntentFallback("Turn my weekend woodworking hobby into something official");
    expect(r.ventureType).toBe("side-gig");
    expect(r.activityTags).toContain("Trades");
  });

  it("never guesses a province from tone", () => {
    const r = parseIntentFallback("A SaaS app for accountants");
    expect(r.province).toBeNull();
  });

  it("is honest about unmappable ventures", () => {
    const r = parseIntentFallback("I'm inventing a brand new team sport league");
    // "invention" hits AI/R&D? "inventing" contains "invention"? No — "inventing" does not
    // contain "invention". Whatever maps, the contract is: no silent drop.
    if (r.activityTags.length === 0) {
      expect(r.unmapped.length).toBeGreaterThan(0);
    }
    expect(r.rawLabel.toLowerCase()).toContain("sport");
  });

  it("discover-now from uncertainty", () => {
    const r = parseIntentFallback("I don't know where to start, just show me what's available");
    expect(r.goals).toContain("discover-now");
  });

  it("keeps labels short", () => {
    const r = parseIntentFallback("x".repeat(300));
    expect(r.rawLabel.length).toBeLessThanOrEqual(80);
  });

  it("maps bike repair van in Calgary to Trades and not AI / ML / R&D", () => {
    const r = parseIntentFallback("A mobile bike repair van in Calgary — I drive to people's homes and offices and fix their bikes on the spot.");
    expect(r.activityTags).toContain("Trades");
    expect(r.activityTags).not.toContain("AI / ML / R&D");
    expect(r.province).toBe("AB");
    expect(r.capitalPurchasePlanned).toBe(true); // "van" is a capital purchase
  });

  it("maps short phrase 'bike repair van in Calgary' to Trades and not AI / ML / R&D", () => {
    const r = parseIntentFallback("bike repair van in Calgary");
    expect(r.activityTags).toContain("Trades");
    expect(r.activityTags).not.toContain("AI / ML / R&D");
    expect(r.province).toBe("AB");
    expect(r.capitalPurchasePlanned).toBe(true);
  });

  it("does not treat carpenter as a vehicle purchase", () => {
    const r = parseIntentFallback("I am an independent carpenter building custom tables");
    expect(r.activityTags).toContain("Trades");
    expect(r.capitalPurchasePlanned).toBe(false); // "car" in "carpenter" should not trigger vehicle
  });

  it("does not light AI / ML / R&D from words containing 'ai' as substring", () => {
    const samples = [
      "Residential interior painting and staining",
      "Hair and nail salon studio",
      "Retail clothing boutique",
      "Personal fitness training coach",
      "Industrial equipment maintenance and repair",
    ];
    for (const text of samples) {
      const r = parseIntentFallback(text);
      expect(r.activityTags, `Text "${text}" should not match AI / ML / R&D`).not.toContain("AI / ML / R&D");
    }
  });

  it("lights AI / ML / R&D on actual standalone AI and A.I. tokens", () => {
    expect(parseIntentFallback("An applied AI assistant for law firms").activityTags).toContain("AI / ML / R&D");
    expect(parseIntentFallback("Building a.i. agents and tools").activityTags).toContain("AI / ML / R&D");
    expect(parseIntentFallback("Machine learning research and development").activityTags).toContain("AI / ML / R&D");
  });

  it("does not trigger capital purchases on substrings like 'van' in advance or 'pc' in space", () => {
    const r1 = parseIntentFallback("Advance consulting on business strategy");
    expect(r1.capitalPurchasePlanned).toBe(false);

    const r2 = parseIntentFallback("Interior space planning and decorating");
    expect(r2.capitalPurchasePlanned).toBe(false);
  });
});
