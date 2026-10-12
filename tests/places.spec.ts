/**
 * Places as international codes (the maintainer's decision of 2026-10-11): CA for Canada, CA-AB for
 * Alberta, so Canada never collides with another country's code. The data file stores each idea's place
 * as its code (prisma/schema.prisma maps each `Province` value to one); lib/places/codes.ts maps the
 * app's own values (AB, and the CA of a federal catalog entry) to the codes.
 */
import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { PLACE_CODES, placeCodeFor } from "@/lib/places/codes";
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

  it("passes a code through", () => {
    for (const code of PLACE_CODES) expect(placeCodeFor(code)).toBe(code);
  });

  it("the data file stores every province and territory as its code: each Province value is mapped to one", () => {
    const schema = readFileSync(path.join(process.cwd(), "prisma", "schema.prisma"), "utf8");
    const block = /enum Province \{([^}]*)\}/.exec(schema)![1];
    const values = block
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line !== "" && !line.startsWith("//"));
    expect(values).toEqual(PROVINCES.map((p) => `${p} @map("${placeCodeFor(p)}")`));
  });

  it("refuses what isn't a place it knows, rather than guessing", () => {
    for (const bad of ["", "ab", "Alberta", "US-CA", "CA-XX", "CAAB", " AB", "CA-"]) expect(placeCodeFor(bad)).toBeNull();
  });
});
