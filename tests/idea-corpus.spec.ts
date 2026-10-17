/**
 * The idea corpus holds its minimums (S2.5.29a): enough ideas of every kind of person, every place, every
 * job category, every kind of work and every odd case that the idea harness (tests/idea-harness.spec.ts)
 * means something for all of them. A bucket below its minimum fails here, with its count, before the
 * harness runs a single idea.
 */
import { describe, expect, it } from "vitest";

import { oasisJobByCode } from "@/lib/engines/oasis/v2026";
import { ACTIVITY_TAXONOMY } from "@/lib/journey/intent";
import { PROVINCES } from "@/lib/scenarios/types";

import { IDEAS_V1, ODD_KINDS, PEOPLE_TYPES, RETIRED_IDEA_IDS, type Idea } from "./fixtures/ideas/v1";

/** The minimums (the plan of 2026-10-17, S2.5.29a), and the written roads' (CONTRIBUTING.md: 10 ideas per road). */
const CORPUS_MINIMUMS ={ peopleType: 25, place: 10, nocCategory: 15, activityTag: 10, oddKind: 3, writtenRoad: 10 } as const;

const PLACES = [...PROVINCES, "outside-canada", "not-said"] as const;
const NOC_CATEGORIES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] as const;
const ROADS = ["road-0", "road-1"] as const;

function counts<K extends string | number>(keys: readonly K[], of: (idea: Idea) => readonly K[]): Record<string, number> {
  return Object.fromEntries(keys.map((key) => [String(key), IDEAS_V1.filter((idea) => of(idea).includes(key)).length]));
}

/** Each bucket under its minimum, as "name: count < minimum". */
function under(bucket: Record<string, number>, minimum: number): string[] {
  return Object.entries(bucket)
    .filter(([, n]) => n < minimum)
    .map(([name, n]) => `${name}: ${n} < ${minimum}`);
}

describe("the idea corpus (tests/fixtures/ideas/v1.ts)", () => {
  it("has about 330 ideas", () => {
    expect(IDEAS_V1.length).toBeGreaterThanOrEqual(330);
  });

  it("gives every idea a permanent id of its own, never a retired one", () => {
    const ids = IDEAS_V1.map((idea) => idea.id);
    expect(ids.filter((id) => !/^idea-v1-\d{4}$/.test(id))).toEqual([]);
    expect(ids.filter((id, i) => ids.indexOf(id) !== i)).toEqual([]);
    expect(ids.filter((id) => RETIRED_IDEA_IDS.includes(id))).toEqual([]);
  });

  it("has every kind of person at least 25 times", () => {
    expect(under(counts(PEOPLE_TYPES, (i) => [i.people]), CORPUS_MINIMUMS.peopleType)).toEqual([]);
  });

  it("has every province and territory, outside Canada and not said, at least 10 times each", () => {
    expect(under(counts(PLACES, (i) => [i.place]), CORPUS_MINIMUMS.place)).toEqual([]);
  });

  it("has every broad job category (NOC 2021, 0 to 9) at least 15 times", () => {
    expect(under(counts(NOC_CATEGORIES, (i) => (i.noc === null ? [] : [i.noc])), CORPUS_MINIMUMS.nocCategory)).toEqual([]);
  });

  it("has every kind of work the intake offers at least 10 times", () => {
    expect(under(counts(ACTIVITY_TAXONOMY, (i) => i.tags), CORPUS_MINIMUMS.activityTag)).toEqual([]);
  });

  it("has every odd case at least 3 times", () => {
    expect(under(counts(ODD_KINDS, (i) => i.odd ?? []), CORPUS_MINIMUMS.oddKind)).toEqual([]);
  });

  it("has at least 10 ideas that should reach each written road", () => {
    expect(under(counts(ROADS, (i) => [i.road]), CORPUS_MINIMUMS.writtenRoad)).toEqual([]);
  });

  it("names only jobs the government's list has", () => {
    const unknown = IDEAS_V1.flatMap((idea) => (idea.jobs ?? []).filter((code) => !oasisJobByCode(code)).map((code) => `${idea.id}: ${code}`));
    expect(unknown).toEqual([]);
  });

  it("expects a written road only where one is written: road 0 for an Alberta business, road 1 for an Alberta cabinetmaker", () => {
    const wrong = IDEAS_V1.filter((idea) => {
      if (idea.road === "road-0") return idea.place !== "AB" || idea.lookingFor !== "business";
      if (idea.road === "road-1") return idea.place !== "AB" || !/cabinet/i.test(idea.words);
      return false;
    }).map((idea) => idea.id);
    expect(wrong).toEqual([]);
  });

  it("expects no written road for closing, pausing, selling or catching up: none is written yet", () => {
    // docs/architecture/use-cases.md, people 9 and 10: the closing steps and the catch-up paths "None of
    // this exists yet" / "Needs". Road 0 is for starting a business, so it isn't the road written for them.
    // (Road 1 stays written for a cabinetmaker who is also behind: its apprenticeship steps are about them.)
    const closingOrBehind =
      /\b(?:closing|close (?:my|the|down)|wind(?:ing)? down|paus(?:e|ing)|shutting down|selling (?:the|my) company|never (?:registered|filed|reported|claimed|charged|set up)|not filed|hasn't filed|haven't done taxes|didn't report|behind on)\b/i;
    const wrong = IDEAS_V1.filter((idea) => idea.road === "road-0" && closingOrBehind.test(idea.words)).map((idea) => idea.id);
    expect(wrong).toEqual([]);
  });

  it("is what each odd case says it is", () => {
    const wrong = IDEAS_V1.flatMap((idea) =>
      (idea.odd ?? []).flatMap((odd) => {
        const ok =
          odd === "empty"
            ? idea.words.trim() === ""
            : odd === "very-long"
              ? idea.words.length >= 2000
              : odd === "emoji"
                ? /\p{Extended_Pictographic}/u.test(idea.words)
                : odd === "fifty-k"
                  ? /\b50k\b/i.test(idea.words)
                  : odd === "two-provinces"
                    ? idea.named.length >= 2
                    : odd === "id-like-digits"
                      ? /\d{3} ?\d{3} ?\d{3}/.test(idea.words)
                      : true;
        return ok ? [] : [`${idea.id}: ${odd}`];
      }),
    );
    expect(wrong).toEqual([]);
  });

  it("types no ID-like number anyone could have: every long run of digits is one digit repeated", () => {
    // fakeIdDigits makes them at run time from "0" or "9"; a real-looking number typed into the corpus fails.
    const real = IDEAS_V1.flatMap((idea) =>
      (idea.words.match(/\d[\d -]{5,}\d/g) ?? [])
        .map((run) => run.replace(/[ -]/g, ""))
        .filter((digits) => digits.length >= 7 && !/^(\d)\1+$/.test(digits))
        .map((digits) => `${idea.id}: ${digits}`),
    );
    expect(real).toEqual([]);
  });

  it("names a province only as one of today's places", () => {
    const wrong = IDEAS_V1.flatMap((idea) => idea.named.filter((p) => !(PROVINCES as readonly string[]).includes(p)).map((p) => `${idea.id}: ${p}`));
    expect(wrong).toEqual([]);
  });
});
