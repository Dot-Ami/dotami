/**
 * The words of "Others in this line of work" (lib/landscape/words.ts; docs/architecture/competitive-landscape.md
 * § 6 and docs/ui-spec/cockpit/landscape.md): no verdict, no ranking and none of the landscape's own judgement
 * words, no trade names, and the fixed lines word for word as the design and the maintainer's answers set them.
 * Also where the panel opens from: the step a road marks as opening a business.
 */
import { describe, expect, it } from "vitest";

import { roadApprenticeToOwnShopAB, roadsV2026 } from "@/lib/engines/roads/v2026";
import { AD_COST_READ_FROM, AD_LIBRARIES, landscapeWords } from "@/lib/landscape/words";

import { LANDSCAPE_WORDS, VERDICT_PHRASES, VERDICT_WORDS, findVerdicts } from "./helpers/verdict-words";

/** Every string a words object can produce, filling each function with plain values. */
function sentencesOf(words: unknown): string[] {
  const out: string[] = [];
  const walk = (value: unknown) => {
    if (typeof value === "string") out.push(value);
    else if (typeof value === "function") {
      const fn = value as (...args: unknown[]) => unknown;
      for (const args of [[0], [1], [3], ["Invented Shop"], ["2026-10-17"], ["“Label”", "2026-10-01"]]) {
        let result: unknown;
        try {
          result = fn(...args);
        } catch {
          // A function that needs other kinds of values is filled by the next set.
        }
        if (typeof result === "string") out.push(result);
      }
    } else if (value && typeof value === "object") for (const v of Object.values(value)) walk(v);
  };
  walk(words);
  return out;
}

// The link labels are drawn on the panel too (the two ad libraries, and the pages the "not published" line was
// read from), so they're read with the same checks as the words object.
const sentences = [...sentencesOf(landscapeWords), ...[...AD_LIBRARIES, ...AD_COST_READ_FROM].map((link) => link.label)];

describe("the panel's words", () => {
  it("has words to check", () => {
    expect(sentences.length).toBeGreaterThan(20);
  });

  it("no sentence gives a verdict", () => {
    for (const s of sentences) {
      expect(s, s).not.toMatch(VERDICT_WORDS);
      expect(findVerdicts(s), s).toEqual([]);
    }
  });

  it("no sentence uses the landscape's own judgement words (crowded, saturated, room for you, opportunity, gap, market share, per person, top, best-rated)", () => {
    for (const s of sentences) expect(s, s).not.toMatch(LANDSCAPE_WORDS);
  });

  it("names no trade: the panel is the same on every road", () => {
    const trades = /\b(cabinet\w*|furniture|carpent\w*|joiner\w*|woodwork\w*|apprentice\w*|plumb\w*|electrician\w*|bike|repair|salon|barber\w*)\b/i;
    for (const s of sentences) expect(s, s).not.toMatch(trades);
  });

  it("says the fixed lines word for word", () => {
    expect(landscapeWords.region).toBe("Others in this line of work");
    expect(landscapeWords.adCost.line).toBe(
      "Meta and Google don't publish this for ordinary ads in Canada, as their pages read on 15 October 2026. DotAmi has no number for it.",
    );
    expect(landscapeWords.watched.heading).toBe("Businesses you're watching · in the order you added them");
    expect(landscapeWords.watched.line).toBe("DotAmi doesn't check these. They stay on this computer and no rule reads them.");
    expect(landscapeWords.watched.exampleEmpty).toBe("An invented person's list would mean inventing businesses, so this stays empty in the example.");
    expect(landscapeWords.footer).toBe("Facts from public sources, side by side. Nothing here says whether this line of work fits you. Not legal advice.");
  });

  it("never counts the list against anything: no sentence says how many there are", () => {
    for (const s of sentences) expect(s, s).not.toMatch(/\b\d+ of \d+\b|\bout of\b|\bcount\b/i);
  });
});

describe("the ad libraries: plain links, nothing about the person in them", () => {
  it("each is an https address with no search words, no query and no fragment", () => {
    expect(AD_LIBRARIES.map((l) => l.label)).toEqual(["Meta's Ad Library", "Google's Ads Transparency Center"]);
    for (const link of [...AD_LIBRARIES, ...AD_COST_READ_FROM]) {
      const url = new URL(link.url);
      expect(url.protocol, link.url).toBe("https:");
      expect(url.search, link.url).toBe("");
      expect(url.hash, link.url).toBe("");
    }
  });
});

describe("the verdict phrases a screen may never show include the landscape's three", () => {
  it("crowded, saturated and room for you are caught on any screen", () => {
    const phrases = VERDICT_PHRASES.map((p) => p.phrase);
    for (const phrase of ["crowded", "saturated", "room for you"]) expect(phrases).toContain(phrase);
    expect(findVerdicts("This market is crowded.")).not.toEqual([]);
    expect(findVerdicts("A saturated line of work")).not.toEqual([]);
    expect(findVerdicts("There is room for you here.")).not.toEqual([]);
  });

  it("the landscape list catches each of its words, and leaves ordinary words alone", () => {
    for (const text of ["crowded", "saturated", "room for you", "an opportunity", "a gap", "market share", "3 per person", "the top shop", "best-rated"]) {
      expect(text, text).toMatch(LANDSCAPE_WORDS);
    }
    for (const text of ["stop", "topic", "gaps in the road", "laptop", "personal"]) {
      expect(text, text).not.toMatch(LANDSCAPE_WORDS);
    }
  });
});

describe("where the panel opens from: the step a road marks as opening a business", () => {
  it("road 1 marks its Open your own shop step, and only that one", () => {
    const marked = roadApprenticeToOwnShopAB.steps.filter((s) => s.opensABusiness === true).map((s) => s.id);
    expect(marked).toEqual(["step-shop-open-own-shop"]);
  });

  it("no other road marks a step that isn't on it", () => {
    for (const road of roadsV2026) {
      for (const step of road.steps) if (step.opensABusiness !== undefined) expect(step.opensABusiness).toBe(true);
    }
  });
});
