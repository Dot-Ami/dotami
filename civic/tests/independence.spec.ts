import { describe, expect, it } from "vitest";

import { SOURCES } from "@/lib/demo/sources";
import { getClaim } from "@/lib/query";
import { independence, rootPassage } from "@/lib/rules/independence";

describe("repeated copies of one claim are not independent corroboration", () => {
  it("a repost is followed back to the post it repeats", () => {
    expect(rootPassage({ sourceId: "repost-2", passageId: "caption" }, SOURCES)).toEqual({
      sourceId: "social-clip",
      passageId: "caption",
    });
  });

  it("'the rezoning is approved': four passages, two of them repeats, two independent origins", () => {
    const claim = getClaim("rezoning-approved")!;
    expect(claim.assertions.passages).toBe(4);
    expect(claim.assertions.repeats).toBe(2);
    expect(claim.assertions.origins.map((o) => o.publisherId).sort()).toEqual([
      "meadowmere-council",
      "meadowmere-watch",
    ]);
  });

  it("a news story retelling the minutes adds no independent origin to the evidence against", () => {
    const claim = getClaim("rezoning-approved")!;
    expect(claim.evidenceIndependence.origins.map((o) => o.publisherId)).toEqual([
      "meadowmere-council",
    ]);
  });

  it("the 2019 incident rests on two independent records: the regulator's and the company's", () => {
    expect(
      getClaim("parent-incident-2019")!
        .evidenceIndependence.origins.map((o) => o.publisherId)
        .sort(),
    ).toEqual(["corvane-holdings", "northern-regulator"]);
  });

  it("stops on a loop in the data instead of spinning", () => {
    const looped = [
      {
        ...SOURCES[0],
        id: "a",
        passages: [
          {
            id: "p",
            locator: { kind: "whole" as const },
            text: "",
            repeats: { sourceId: "b", passageId: "p" },
          },
        ],
      },
      {
        ...SOURCES[0],
        id: "b",
        passages: [
          {
            id: "p",
            locator: { kind: "whole" as const },
            text: "",
            repeats: { sourceId: "a", passageId: "p" },
          },
        ],
      },
    ];
    expect(independence([{ sourceId: "a", passageId: "p" }], looped).passages).toBe(1);
  });
});
