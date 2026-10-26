import { describe, expect, it } from "vitest";

import { DECISIONS } from "@/lib/demo/decisions";
import { SOURCES } from "@/lib/demo/sources";
import type { DecisionStage, Provision, SourceDocument } from "@/lib/model";
import { getIssue, getTimeline } from "@/lib/query";
import { STAGE_INFO, shownForce } from "@/lib/rules/decisions";

describe("proposed policies are never labelled enacted", () => {
  it("every stage short of a decision says it isn't in force, and never says 'enacted'", () => {
    const undecided: DecisionStage[] = [
      "application-filed",
      "proposed",
      "consultation-open",
      "consultation-closed",
    ];
    for (const stage of undecided) {
      expect(STAGE_INFO[stage].inForce, stage).toBe(false);
      expect(STAGE_INFO[stage].label, stage).toMatch(/not in force|not decided/);
      expect(STAGE_INFO[stage].label, stage).not.toMatch(/enacted/i);
    }
  });

  it("the demo bylaw is proposed, and every view of it says so", () => {
    expect(DECISIONS.find((d) => d.id === "bylaw-2030-14")!.stage).toBe("proposed");
    const timeline = getTimeline("corvane-meadowmere").find((d) => d.id === "bylaw-2030-14")!;
    expect(timeline.stageLabel).toBe("Proposed: not in force");
    expect(timeline.inForce).toBe(false);
    const overview = getIssue("corvane-meadowmere")!.decisions.find(
      (d) => d.id === "bylaw-2030-14",
    )!;
    expect(overview.stageLabel).toBe("Proposed: not in force");
  });

  it("text from a proposed law is never shown as binding, whatever the data says", () => {
    const proposed = SOURCES.find((s) => s.kind === "proposed-law")!;
    const p: Provision = {
      id: "x",
      label: "x",
      original: { sourceId: proposed.id, passageId: proposed.passages[0].id },
      plainLanguage: "",
      force: "binding",
      effectiveDate: "2030-01-01",
      uncertainty: "",
      expertReviewNeeded: false,
    };
    expect(shownForce(p, proposed)).toBe("binding-if-enacted");
  });

  it("a guideline is never shown as more than guidance", () => {
    const guideline: SourceDocument = SOURCES.find((s) => s.kind === "guideline")!;
    const p = { force: "binding" } as Provision;
    expect(shownForce(p, guideline)).toBe("guidance");
  });

  it("every provision of the demo bylaw is shown as 'would bind if passed' with no effective date of its own", () => {
    const bylaw = getTimeline("corvane-meadowmere").find((d) => d.id === "bylaw-2030-14")!;
    for (const p of bylaw.provisions) {
      expect(p.force, p.id).toBe("binding-if-enacted");
      expect(p.forceLabel, p.id).toMatch(/not in force/);
      expect(p.effectiveDate, p.id).toBeNull();
    }
  });
});
