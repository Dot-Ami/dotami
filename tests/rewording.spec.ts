/**
 * Task 37b: the corpus's ideas (tests/fixtures/ideas/v1.ts) reworded the ways people write: in capitals, in lower
 * case, with a typo, in another order, with emoji, without accents, with the city swapped for its province, and in
 * French (tests/helpers/rewording.ts). Each must keep what the person is shown: the province the words name, the job
 * found on step 1 by the person's own words, and step 3's roads with the click. Lloydminster, on the
 * Alberta–Saskatchewan border, never sets a single province.
 *
 * What fails today is listed in tests/fixtures/ideas/accuracy-gaps.ts (`REWORDING_GAPS`), the same ratchet as the
 * idea harness's: a failure not listed fails here, and so does a listed one that passes now. The controls
 * ("Calgary"/"calgary", "Québec"/"Quebec", a parser that reads Lloydminster as Alberta) are planted in the parser in
 * tests/rewording-plants.spec.ts.
 */
import { describe, expect, it } from "vitest";

import { REWORDING_GAPS } from "./fixtures/ideas/accuracy-gaps";
import { IDEAS_V1 } from "./fixtures/ideas/v1";
import { ideaId } from "./helpers/idea-harness-run";
import { keepingSearches } from "./helpers/idea-pipeline";
import { lloydminsterProvinces, reword, REWORDINGS, rewordingFailures, rewordingKey } from "./helpers/rewording";
import { parseIntentFallback } from "@/lib/journey/intent-fallback";

describe("the corpus reworded keeps the named province, the job and the roads (task 37b)", () => {
  it("rewords most ideas every way that applies to them", () => {
    // A rewording that applies to almost nothing would pass by never running.
    const applied = Object.fromEntries(REWORDINGS.map((how) => [how, IDEAS_V1.filter((idea) => reword(idea, how)).length]));
    expect(applied["upper case"]).toBe(IDEAS_V1.length);
    expect(applied["lower case"]).toBe(IDEAS_V1.length);
    expect(applied.emoji).toBe(IDEAS_V1.length);
    expect(applied.typo).toBeGreaterThan(300);
    expect(applied["word order"]).toBeGreaterThan(250);
    expect(applied["city for province"]).toBeGreaterThan(150);
    expect(applied["no accents"]).toBeGreaterThanOrEqual(15);
    expect(applied.French).toBeGreaterThanOrEqual(14);
  });

  it("every change a rewording makes is a known gap, and every known gap still fails", () => {
    const failures = keepingSearches(() => rewordingFailures(IDEAS_V1));
    const listed = new Set(REWORDING_GAPS.flatMap((gap) => gap.ideas.map((n) => rewordingKey({ ideaId: ideaId(n), how: gap.how, what: gap.what }))));
    const found = new Set(failures.map(rewordingKey));
    // A new one: fix it, or list it in accuracy-gaps.ts with its story (or, with none yet, who decides).
    expect(failures.filter((f) => !listed.has(rewordingKey(f))).map((f) => f.detail)).toEqual([]);
    // A listed one that passes now: take it off the list.
    expect([...listed].filter((key) => !found.has(key))).toEqual([]);
  }, 60_000);

  it("keeps each known gap to a story and its ideas once each", () => {
    const keys = REWORDING_GAPS.flatMap((gap) => gap.ideas.map((n) => `${n} · ${gap.how} · ${gap.what}`));
    expect(keys.filter((key, i) => keys.indexOf(key) !== i)).toEqual([]);
    for (const gap of REWORDING_GAPS) expect(gap.story.trim() && gap.why.trim(), `${gap.how} ${gap.what}`).toBeTruthy();
  });
});

describe("Lloydminster never sets a single province", () => {
  it("in place of each corpus idea's city, however it is written", () => {
    expect(lloydminsterProvinces(IDEAS_V1)).toEqual([]);
  });

  it("on its own and in a sentence", () => {
    for (const words of ["Lloydminster", "a bakery in Lloydminster", "LLOYDMINSTER BAKERY", "lloydminster 🌾 grain hauling", "je veux ouvrir une boulangerie à Lloydminster"]) {
      expect(parseIntentFallback(words).province, words).toBeNull();
    }
  });
});
