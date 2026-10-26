import { describe, expect, it } from "vitest";

import { RELATIONSHIPS, RELATIONSHIP_TYPES } from "@/lib/demo/relationships";

describe("relationship types stay precise", () => {
  it("there is no generic 'controls', 'owns' or 'linked to' type", () => {
    for (const key of Object.keys(RELATIONSHIP_TYPES))
      expect(key).not.toMatch(/control|linked|behind|associated|^owns$/);
  });

  it("every type says what it means and what it doesn't", () => {
    for (const [key, t] of Object.entries(RELATIONSHIP_TYPES)) {
      expect(t.means.length, key).toBeGreaterThan(10);
      expect(t.doesNotMean.length, key).toBeGreaterThan(10);
    }
  });

  it("every relationship has evidence and says what it doesn't establish", () => {
    for (const r of RELATIONSHIPS) {
      expect(r.evidence.length, r.id).toBeGreaterThan(0);
      expect(r.doesNotEstablish.length, r.id).toBeGreaterThan(0);
    }
  });

  it("holding shares for clients is recorded as that, not as ownership", () => {
    const ardent = RELATIONSHIPS.filter((r) => r.fromId === "ardent-peak")
      .map((r) => r.type)
      .sort();
    expect(ardent).toEqual(["assets-managed-for-clients", "voting-authority"]);
  });
});
