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

  it("does not treat repair as AI or a van as a generic substring", () => {
    const r = parseIntentFallback(
      "A mobile bike repair van in Calgary — I drive to people's homes and offices and fix their bikes on the spot.",
    );
    expect(r.activityTags).toEqual(["Trades"]);
    expect(r.capitalPurchasePlanned).toBe(true);
    expect(r.province).toBe("AB");
  });

  it("does not treat carpenter as a car purchase", () => {
    const r = parseIntentFallback("I am a carpenter in Calgary");
    expect(r.activityTags).toContain("Trades");
    expect(r.capitalPurchasePlanned).toBe(false);
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
});
