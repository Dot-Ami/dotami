import { describe, expect, it } from "vitest";

import { CLAIMS } from "@/lib/demo/claims";
import type { Claim } from "@/lib/model";
import { claimSummary } from "@/lib/query";
import { STATUS_INFO, shownStatus } from "@/lib/rules/status";

const base: Claim = {
  id: "test",
  issueId: "test",
  proposition: "Test proposition.",
  kind: "factual",
  assertedIn: [],
  status: "supported",
  statusReason: "Recorded reason.",
  evidence: [],
  supportedConclusion: "",
  interpretation: "",
  unknowns: [],
  wouldChange: [],
  actionJustified: "",
  highStakes: false,
  review: { state: "draft", reviews: [], corrections: [] },
};

describe("unsupported claims stay visibly unresolved", () => {
  it("a claim recorded as supported with no supporting passage is shown as unresolved, with the reason", () => {
    const shown = shownStatus({
      ...base,
      status: "supported",
      evidence: [{ sourceId: "x", passageId: "y", stance: "context", note: "" }],
    });
    expect(shown).toEqual({
      status: "unresolved",
      withheld: true,
      reason: expect.stringContaining("no supporting evidence"),
    });
  });

  it("the same for partly supported, and for contradicted with nothing against it", () => {
    expect(shownStatus({ ...base, status: "partially-supported" }).status).toBe("unresolved");
    expect(shownStatus({ ...base, status: "contradicted" }).status).toBe("unresolved");
  });

  it("a claim with its evidence keeps its recorded status", () => {
    const shown = shownStatus({
      ...base,
      evidence: [{ sourceId: "x", passageId: "y", stance: "supports", note: "" }],
    });
    expect(shown).toEqual({ status: "supported", withheld: false, reason: "Recorded reason." });
  });

  it("no demo claim needs the fallback: every verdict in the data has evidence for it", () => {
    expect(CLAIMS.filter((c) => shownStatus(c).withheld).map((c) => c.id)).toEqual([]);
  });

  it("the demo's unsupported claims are shown as unresolved or insufficient evidence, never as a verdict", () => {
    for (const id of [
      "emissions-safe",
      "upset-conditions",
      "guideline-protects-children",
      "three-hundred-jobs",
      "ward2-conflict",
      "history-will-repeat",
    ]) {
      expect(["unresolved", "insufficient-evidence"], id).toContain(claimSummary(id)!.status);
    }
  });

  it("a claim with no supporting passage is never shown as supported or partly supported", () => {
    for (const c of CLAIMS.filter((c) => !c.evidence.some((e) => e.stance === "supports"))) {
      expect(["supported", "partially-supported"], c.id).not.toContain(claimSummary(c.id)!.status);
    }
  });

  it("'insufficient evidence' and 'unresolved' say in words that they don't mean false", () => {
    expect(STATUS_INFO["insufficient-evidence"].notMeaning).toMatch(
      /not .*false|isn't .*false|That it is false/i,
    );
    expect(STATUS_INFO.unresolved.notMeaning).toMatch(/false/);
  });

  it("every status has a symbol, so none is shown by colour alone", () => {
    const symbols = Object.values(STATUS_INFO).map((s) => s.symbol);
    expect(new Set(symbols).size).toBe(symbols.length);
  });
});
