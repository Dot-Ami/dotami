import { describe, expect, it } from "vitest";
import { isValidSaidAt, sortStatementsNewestFirst, type PersonStatement } from "@/lib/person/types";

describe("statement ordering and validation", () => {
  it("sorts newest first by saidAt, then by recordedAt", () => {
    const mk = (saidAt: string, recordedAt?: string): PersonStatement => ({
      id: `${saidAt}-${recordedAt ?? ""}`,
      text: "x",
      saidAt,
      source: "typed",
      sourceRef: "app",
      recordedAt,
    });
    const sorted = sortStatementsNewestFirst([
      mk("2026-08-12", "2026-08-12T10:00:00Z"),
      mk("2026-09-01"),
      mk("2026-08-12", "2026-08-12T12:00:00Z"),
    ]);
    expect(sorted.map((s) => s.id)).toEqual([
      "2026-09-01-",
      "2026-08-12-2026-08-12T12:00:00Z",
      "2026-08-12-2026-08-12T10:00:00Z",
    ]);
  });

  it("accepts a real past date and rejects the future, non-dates, and impossible days", () => {
    const today = "2026-09-13";
    expect(isValidSaidAt("2026-09-13", today)).toBe(true);
    expect(isValidSaidAt("2026-08-12", today)).toBe(true);
    expect(isValidSaidAt("2026-09-14", today)).toBe(false);
    expect(isValidSaidAt("2026-02-30", today)).toBe(false);
    expect(isValidSaidAt("yesterday", today)).toBe(false);
    expect(isValidSaidAt(20260913, today)).toBe(false);
  });
});
