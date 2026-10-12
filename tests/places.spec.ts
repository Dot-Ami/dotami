/**
 * Places as international codes (the maintainer's decision of 2026-10-11): CA for Canada, CA-AB for
 * Alberta, so Canada never collides with another country's code. lib/places/codes.ts maps today's
 * values (the AB of `Venture.province`, the CA of a federal catalog entry) to the codes and back.
 */
import { describe, expect, it } from "vitest";

import { PLACE_CODES, placeCodeFor, todaysValueFor } from "@/lib/places/codes";
import { PROVINCES } from "@/lib/scenarios/types";

describe("place codes", () => {
  it("gives Canada and each province and territory its ISO 3166-2 code", () => {
    expect(placeCodeFor("CA")).toBe("CA");
    expect(placeCodeFor("AB")).toBe("CA-AB");
    expect(placeCodeFor("BC")).toBe("CA-BC");
    expect(placeCodeFor("ON")).toBe("CA-ON");
    expect(placeCodeFor("NL")).toBe("CA-NL");
    // Every value today's province list can hold has a code, and only those plus Canada are codes.
    for (const p of PROVINCES) expect(placeCodeFor(p)).toBe(`CA-${p}`);
    expect([...PLACE_CODES].sort()).toEqual(["CA", ...PROVINCES.map((p) => `CA-${p}`)].sort());
  });

  it("passes a code through, and goes back to today's value", () => {
    expect(placeCodeFor("CA-AB")).toBe("CA-AB");
    for (const code of PLACE_CODES) expect(placeCodeFor(todaysValueFor(code))).toBe(code);
    expect(todaysValueFor("CA-AB")).toBe("AB");
    expect(todaysValueFor("CA")).toBe("CA");
  });

  it("refuses what isn't a place it knows, rather than guessing", () => {
    for (const bad of ["", "ab", "Alberta", "US-CA", "CA-XX", "CAAB", " AB", "CA-"]) expect(placeCodeFor(bad)).toBeNull();
  });
});
