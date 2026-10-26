import { describe, expect, it } from "vitest";

import { CLAIMS } from "@/lib/demo/claims";
import { COALITION } from "@/lib/demo/coalition";
import { SOURCES } from "@/lib/demo/sources";
import type { Claim } from "@/lib/model";
import { getClaim } from "@/lib/query";
import { reviewGate } from "@/lib/rules/review";
import { checkParagraph, statementReadiness } from "@/lib/rules/statement";

const extractions = SOURCES.flatMap((s) => s.figures ?? []).flatMap((f) => f.extractions);

describe("review gate", () => {
  it("a claim resting on values estimated by eye can't be shown as reviewed without a science reviewer", () => {
    const claim = structuredClone(CLAIMS.find((c) => c.id === "below-guideline-normal")!);
    claim.review.state = "reviewed";
    expect(reviewGate(claim, extractions)).toMatchObject({ state: "needs-expert-review" });
    claim.review.reviews.push({
      reviewer: "Expert (test)",
      expertise: "science",
      date: "2030-03-12",
      note: "",
    });
    expect(reviewGate(claim, extractions).state).toBe("reviewed");
  });

  it("a high-stakes claim needs two reviews to be shown as reviewed", () => {
    const claim: Claim = structuredClone(CLAIMS.find((c) => c.id === "ward2-conflict")!);
    claim.review.reviews = claim.review.reviews.slice(0, 1);
    expect(reviewGate(claim, extractions).state).toBe("in-review");
  });

  it("the demo's chart-dependent claim is shown as needing expert review", () => {
    expect(getClaim("below-guideline-normal")!.reviewGate.state).toBe("needs-expert-review");
  });
});

describe("position statement check", () => {
  it("holds back a paragraph that states as fact what the evidence doesn't establish", () => {
    const p4 = COALITION.statement.paragraphs.find((p) => p.id === "p4")!;
    const check = checkParagraph(p4, CLAIMS, SOURCES);
    expect(check.ok).toBe(false);
    expect(check.problems.join(" ")).toMatch(/Insufficient evidence.*can't be stated as fact/);
  });

  it("lets through facts that rest on a passage, and asks that need no evidence", () => {
    for (const id of ["p1", "p2", "p3"]) {
      expect(
        checkParagraph(
          COALITION.statement.paragraphs.find((p) => p.id === id)!,
          CLAIMS,
          SOURCES,
        ).ok,
        id,
      ).toBe(true);
    }
  });

  it("a fact with no evidence at all is held back", () => {
    expect(
      checkParagraph(
        { id: "x", kind: "fact", text: "Something.", proposedBy: "t", basis: [] },
        CLAIMS,
        SOURCES,
      ).ok,
    ).toBe(false);
  });

  it("the demo statement isn't ready: one paragraph held back and one review short", () => {
    expect(statementReadiness(COALITION.statement, CLAIMS, SOURCES)).toEqual({
      heldBack: ["p4"],
      reviewsDone: 1,
      reviewsNeeded: 2,
      ready: false,
    });
  });
});
