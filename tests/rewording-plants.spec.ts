/**
 * The planted controls of task 37b's rewording test (tests/rewording.spec.ts): each plant breaks the keyword parser
 * the app runs without an AI key (lib/journey/intent-fallback.ts) the way a real change could, and the rewording
 * check must fail naming the idea, the rewording and the province:
 *
 * - "Calgary"/"calgary": the parser stops lowering the words' case before it reads them, so a capitalised city no
 *   longer matches its lower-case list;
 * - "Québec"/"Quebec": the parser keeps one spelling only, the one without the accent;
 * - Lloydminster: the parser counts it among Alberta's cities;
 * - "à Regina": the parser reads place words in English only again (before the maintainer's call a-call-14).
 */
import { afterEach, describe, expect, it, vi } from "vitest";

const plants = vi.hoisted(() => ({ caseMatters: false, oneSpellingOfQuebec: false, lloydminsterInAlberta: false, englishPlaceWordsOnly: false }));

vi.mock("@/lib/journey/intent-fallback", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/lib/journey/intent-fallback")>();
  return {
    ...real,
    parseIntentFallback: (rawText: string) => {
      const parse = real.parseIntentFallback(rawText);
      // Every capital letter hidden from the province reading: what reading the words un-lowered does to a list of
      // lower-case names.
      if (plants.caseMatters) return { ...parse, province: real.parseIntentFallback(rawText.replace(/\p{Lu}/gu, "\u0000")).province };
      // "é" hidden: only "quebec", without its accent, is still a name the list holds.
      if (plants.oneSpellingOfQuebec) return { ...parse, province: real.parseIntentFallback(rawText.replace(/é/giu, "\u0000")).province };
      if (plants.lloydminsterInAlberta && /lloydminster/i.test(rawText)) return { ...parse, province: "AB" as const };
      // The French place words hidden, so a name-like city after one reads as a name again.
      if (plants.englishPlaceWordsOnly) {
        return { ...parse, province: real.parseIntentFallback(rawText.replace(/(^|[^\p{L}])(?:à|au|aux|en|dans)(?=\s)/giu, "$1et")).province };
      }
      return parse;
    },
  };
});

import { IDEAS_V1 } from "./fixtures/ideas/v1";
import { keepingSearches } from "./helpers/idea-pipeline";
import { lloydminsterProvinces, rewordingFailures, rewordingKey } from "./helpers/rewording";

const idea = (n: number) => IDEAS_V1.find((i) => i.id === `idea-v1-${String(n).padStart(4, "0")}`)!;
// A mobile bike repair business in Calgary, and an illustration studio "à Québec", in French.
const CALGARY = idea(1);
const QUEBEC = idea(10);
// Tax returns in spring, and an administrative assistant in Regina the rest of the year: in French, "à Regina".
const REGINA = idea(32);

afterEach(() => {
  plants.caseMatters = false;
  plants.oneSpellingOfQuebec = false;
  plants.lloydminsterInAlberta = false;
  plants.englishPlaceWordsOnly = false;
});

// The province each rewording names (idea 10 also has a known typo gap on step 1's search, which is no plant's).
const keys = () => keepingSearches(() => rewordingFailures([CALGARY, QUEBEC])).map(rewordingKey).filter((key) => key.endsWith(" · province"));

describe("the rewording check fails on a planted parser fault (controls)", () => {
  it("passes on the same two ideas without a plant", () => {
    expect(keys()).toEqual([]);
  });

  it("“Calgary” and “calgary”: a parser that minds capitals fails, naming the idea, the rewording and the province", () => {
    plants.caseMatters = true;
    expect(keys()).toContain("idea-v1-0001 · lower case · province");
    const detail = keepingSearches(() => rewordingFailures([CALGARY], ["lower case"]))[0]!.detail;
    expect(detail).toContain("province: AB, where “I want to start a mobile bike-repair business in Calgary” gives none");
  });

  it("“Québec” and “Quebec”: a parser that knows one spelling fails, naming the idea, the rewording and the province", () => {
    plants.oneSpellingOfQuebec = true;
    expect(keys()).toContain("idea-v1-0010 · no accents · province");
    const detail = keepingSearches(() => rewordingFailures([QUEBEC], ["no accents"]))[0]!.detail;
    expect(detail).toContain("province: QC, where “J'ai envie de lancer mon studio d'illustration à Québec” gives none");
  });

  it("Lloydminster read as Alberta fails, naming each idea", () => {
    plants.lloydminsterInAlberta = true;
    const problems = lloydminsterProvinces([CALGARY]);
    expect(problems).toEqual([
      "idea-v1-0001: “I want to start a mobile bike-repair business in Lloydminster” names AB, where the words without a city name none",
      "idea-v1-0001: “I want to start a mobile bike-repair business in lloydminster” names AB, where the words without a city name none",
      "idea-v1-0001: “I want to start a mobile bike-repair business in LLOYDMINSTER” names AB, where the words without a city name none",
    ]);
  });

  it("“à Regina”: a parser that reads place words in English only fails, naming the idea, the rewording and the province", () => {
    const reginaKeys = () => keepingSearches(() => rewordingFailures([REGINA], ["French"])).map(rewordingKey);
    expect(reginaKeys()).toEqual([]);
    plants.englishPlaceWordsOnly = true;
    expect(reginaKeys()).toEqual(["idea-v1-0032 · French · province"]);
    const detail = keepingSearches(() => rewordingFailures([REGINA], ["French"]))[0]!.detail;
    expect(detail).toContain("province: none, where");
  });
});
