/**
 * No cost panel prints a doubled full stop (the maintainer's yes of 2026-10-14; flagged in PR #165).
 *
 * An official fee that applies only sometimes carries its condition from the catalog (`onlyIf`), and the
 * one written so far ends in a full stop of its own: "You failed an exam and choose to rewrite it." The
 * step panel's words wrapped it as "Only if: <condition>. Not added to any total.", so the step panel and
 * the money list printed "rewrite it.. Not added". The fix is in the words (`cockpitWords.panel.onlyIf`),
 * so every screen that draws the condition, and the printable plan, gets it from one place.
 */
import { describe, expect, it } from "vitest";

import { cockpitWords } from "@/lib/cockpit/words";
import { roadsV2026 } from "@/lib/engines/roads/v2026";

import { drawCostPanels } from "./helpers/cost-panels";

/** Two full stops in a row that are not part of an ellipsis (three or more). */
const DOUBLED = /(?<!\.)\.\.(?!\.)/;

/** The text a panel shows: its HTML with the tags taken out and the entities a stop could hide behind read. */
function visibleText(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&#x2E;|&#46;|&period;/gi, ".")
    .replace(/&amp;/g, "&");
}

describe("the doubled full stop check itself", () => {
  // A control, so the check below can fail: it flags the sentence as it was and lets an ellipsis by.
  it("finds '..' in the old sentence and nothing in an ellipsis or a single stop", () => {
    expect(DOUBLED.test("Only if: You failed an exam and choose to rewrite it.. Not added to any total.")).toBe(true);
    expect(DOUBLED.test("Wait for it... then go.")).toBe(false);
    expect(DOUBLED.test("Only if: You failed an exam. Not added to any total.")).toBe(false);
  });

  it("reads the panel's text, not its tags", () => {
    expect(DOUBLED.test(visibleText("<p>rewrite it.</p><p>.</p>"))).toBe(false);
    expect(DOUBLED.test(visibleText("<p>rewrite it.&#46; Not added</p>"))).toBe(true);
  });
});

describe("an official fee's condition gets exactly one full stop", () => {
  it("a condition that ends in a full stop keeps it and gets no second one", () => {
    expect(cockpitWords.panel.onlyIf("You failed an exam and choose to rewrite it.")).toBe(
      "Only if: You failed an exam and choose to rewrite it. Not added to any total.",
    );
  });

  // Control: a condition written without a full stop still ends its sentence with one.
  it("a condition with no full stop of its own gets one", () => {
    expect(cockpitWords.panel.onlyIf("You failed the exam and rewrite it")).toBe(
      "Only if: You failed the exam and rewrite it. Not added to any total.",
    );
  });

  it("a condition that ends in a question mark, an exclamation mark or an ellipsis is left as written", () => {
    expect(cockpitWords.panel.onlyIf("Did you fail the exam?")).toBe("Only if: Did you fail the exam? Not added to any total.");
    expect(cockpitWords.panel.onlyIf("You failed it!")).toBe("Only if: You failed it! Not added to any total.");
    expect(cockpitWords.panel.onlyIf("You failed it…")).toBe("Only if: You failed it… Not added to any total.");
    expect(cockpitWords.panel.onlyIf("You failed it...")).toBe("Only if: You failed it... Not added to any total.");
  });
});

describe("every step panel and money list of every road", () => {
  const panels = drawCostPanels(roadsV2026);

  it("draws the panels that show a condition (so the check below is not empty)", () => {
    const withCondition = Object.keys(panels).filter((key) => panels[key].includes("Only if: "));
    expect(withCondition.sort()).toEqual([
      "road-apprentice-to-own-shop-ab/money",
      "road-apprentice-to-own-shop-ab/step-shop-tq-recognized-credential",
    ]);
  });

  it("prints no '..' outside an ellipsis", () => {
    const doubled = Object.entries(panels)
      .filter(([, html]) => DOUBLED.test(visibleText(html)))
      .map(([key, html]) => `${key}: ${visibleText(html).match(/.{0,40}(?<!\.)\.\.(?!\.).{0,20}/)?.[0]}`);
    expect(doubled).toEqual([]);
  });
});
