import { describe, expect, it } from "vitest";

import { checkText } from "@/lib/rules/moderation";

const kinds = (text: string) => checkText(text).map((f) => f.kind);

describe("the content check blocks doxxing and accusations stated as fact", () => {
  it("contact details", () => {
    expect(kinds("email them at someone@example.org")).toContain("email");
    expect(kinds("ring 555 201 3344 tonight")).toContain("phone");
    expect(kinds("call +1 (780) 555-0199")).toContain("phone");
  });

  it("where someone lives", () => {
    expect(kinds("she lives at the corner house")).toContain("personal-details");
    expect(kinds("go to 42 Maple Crescent")).toContain("street-address");
  });

  it("wrongdoing stated as fact", () => {
    expect(kinds("the councillor is corrupt")).toContain("accusation");
    expect(kinds("they were paid off")).toContain("accusation");
  });

  it("lets ordinary civic text through: dates, amounts, section numbers, questions", () => {
    for (const text of [
      "The hearing is on 25 March 2030 at 6:00 p.m.",
      "The approval application is file WERB-2030-0117.",
      "Table 5 gives 0.046 µg/m³ at 310 m.",
      "Did the Board ask for upset-condition modelling?",
      "Ask the Integrity Commissioner whether the declaration meets s. 5(1).",
    ]) {
      expect(checkText(text), text).toEqual([]);
    }
  });
});
