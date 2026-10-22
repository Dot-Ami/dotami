/**
 * The search behind "What's closest to your work?" (lib/engines/oasis/v2026/title-search.ts;
 * docs/ui-spec/futures/01-whats-closest-to-your-work.md; research note 28f, rule H), and DotAmi's word list
 * (lib/engines/oasis/v2026/dotami-word-list.ts). What it finds, how it groups, that nothing is ranked or picked,
 * that DotAmi's list is kept apart from the government's titles, and its measure on the idea corpus, with a
 * floor so a later change can't quietly lower it.
 */
import { describe, expect, it } from "vitest";

import { oasisData } from "@/lib/engines/oasis/v2026/data";
import { BUSINESS_WORDS, EVERYDAY_WORDS, FILLER_WORDS } from "@/lib/engines/oasis/v2026/dotami-word-list";
import { searchOasisJobs } from "@/lib/engines/oasis/v2026";
import {
  JOB_SEARCH_GROUP_KINDS,
  openGroupCodes,
  searchJobTitles,
  searchWords,
  wordsMatch,
  type JobSearch,
} from "@/lib/engines/oasis/v2026/title-search";
import { oasisTitles } from "@/lib/engines/oasis/v2026/titles";

import { IDEAS_V1 } from "./fixtures/ideas/v1";

const kinds = (r: JobSearch) => r.groups.map((g) => `${g.kind}:${g.total}`);
const codesIn = (r: JobSearch, kind: string) => r.groups.find((g) => g.kind === kind)?.jobs.map((j) => j.code) ?? [];
const hit = (r: JobSearch, code: string) => r.groups.flatMap((g) => g.jobs).find((j) => j.code === code);

describe("words, as the search compares them", () => {
  it("drops capitals, accents and apostrophes, and splits at anything that isn't a letter or digit", () => {
    expect(searchWords("Café owner's Ride-share  72311.00")).toEqual(["cafe", "owners", "ride", "share", "72311", "00"]);
  });

  it("matches a title word that starts with the same five letters, or all of the shorter word (4 letters or more)", () => {
    expect(wordsMatch("plumbing", "plumber")).toBe(true);
    expect(wordsMatch("bake", "bakery")).toBe(true);
    expect(wordsMatch("driving", "driver")).toBe(false); // "drivi" and "drive" differ at the fifth letter
    expect(wordsMatch("cat", "catering")).toBe(false); // a three-letter word must be the whole title word
    expect(wordsMatch("cat", "cat")).toBe(true);
  });
});

describe("the four states with nothing to pick, or something", () => {
  it("is empty with nothing typed, and too short under three letters", () => {
    expect(searchJobTitles("   ").state).toBe("empty");
    expect(searchJobTitles("ab").state).toBe("too-short");
  });

  it("finds no match for a word no title holds, and says so (a French word, in this version)", () => {
    expect(searchJobTitles("infirmière")).toEqual({ state: "no-match", searched: ["infirmiere"], leftOut: [], groups: [], total: 0 });
  });

  it("leaves out filler and business words, names each with its list, and searches nothing when nothing is left", () => {
    expect(searchJobTitles("my own shop")).toEqual({
      state: "no-match",
      searched: [],
      leftOut: [
        { word: "my", list: "filler" },
        { word: "own", list: "filler" },
        { word: "shop", list: "business" },
      ],
      groups: [],
      total: 0,
    });
  });

  it("finds a job by its code, as the skills list's search does", () => {
    const r = searchJobTitles("72311");
    expect(r.groups.map((g) => g.jobs.map((j) => [j.code, j.matched]))).toEqual([[["72311.00", { title: "72311.00", from: "job code" }]]]);
  });
});

describe("the government's titles, grouped by how many of the person's words they hold", () => {
  it("finds a job through its example titles, not only its name: “plumbing” finds Plumbers through “plumber apprentice”", () => {
    const r = searchJobTitles("plumbing");
    expect(r.state).toBe("results");
    expect(hit(r, "72300.00")?.matched).toEqual({ title: "plumber apprentice", from: "Example" });
    // Today's search, over the job names only, finds no job for it.
    expect(searchOasisJobs("plumbing").total).toBe(0);
  });

  it("names the first of the job's titles, in the file's order, that holds the words, and how many more do", () => {
    const barbers = hit(searchJobTitles("barber"), "63210.02")!;
    // The file lists "barber apprentice" before "barber"; the job's name ("Barbers") holds it too.
    expect([barbers.matched, barbers.moreTitles]).toEqual([{ title: "barber apprentice", from: "Example" }, 2]);
  });

  it("puts the jobs whose titles hold all the words first, then those holding at least one, the first group open", () => {
    const r = searchJobTitles("cake decorating");
    expect(kinds(r)).toEqual(["all:1", "some:9"]);
    expect(codesIn(r, "all")).toEqual(["63202.00"]);
    expect(r.groups.map((g) => g.open)).toEqual([true, false]);
  });

  it("has an all-but-one group only when three or more words were searched", () => {
    const r = searchJobTitles("heavy duty truck mechanic");
    expect(r.groups[0]!.kind).toBe("all-but-one");
    expect(codesIn(r, "all-but-one")).toContain("72401.00");
    for (const q of ["cake decorating", "hair salon", "fishing guide"]) {
      expect(searchJobTitles(q).groups.map((g) => g.kind), q).not.toContain("all-but-one");
    }
  });

  it("lists each group in the government's code order, never ranked, and says how many it holds past the first 50", () => {
    const r = searchJobTitles("manager");
    const all = r.groups[0]!;
    expect(all.total).toBeGreaterThan(50);
    expect(all.jobs).toHaveLength(50);
    const order = oasisData.occupations.map(([code]) => code);
    for (const g of [...r.groups, ...searchJobTitles("taco food truck").groups, ...searchJobTitles("heavy duty truck mechanic").groups]) {
      const codes = g.jobs.map((j) => j.code);
      expect(codes).toEqual([...codes].sort((a, b) => order.indexOf(a) - order.indexOf(b)));
    }
    expect(searchJobTitles("manager", 5).groups[0]!.jobs).toHaveLength(5);
  });

  it("gives each result only what the screen shows: its name and code, the count of words, the title and where it came from", () => {
    const keys = Object.keys(hit(searchJobTitles("barber"), "63210.02")!).sort();
    expect(keys).toEqual(["code", "label", "matched", "moreTitles", "viaWordList", "wordsHeld"]);
  });
});

describe("DotAmi's word list, kept apart from the government's titles", () => {
  it("finds a job only through the list in its own last group, closed when a government group holds a job", () => {
    const salon = searchJobTitles("salon");
    expect(kinds(salon).at(-1)).toBe("word-list:1");
    expect(salon.groups.at(-1)!.open).toBe(false);
    expect(hit(salon, "63210.01")).toEqual({
      code: "63210.01",
      label: "Hairstylists",
      wordsHeld: 0,
      matched: null,
      moreTitles: 0,
      viaWordList: [{ word: "salon", title: "hairstylist" }],
    });
    // Jobs whose own titles hold "salon" are found through those titles, not the list.
    expect(codesIn(salon, "all")).toEqual(["21120.00", "60040.00", "65329.01"]);
  });

  it("opens the list's group when it is the only one, as for “dayhome”", () => {
    const r = searchJobTitles("dayhome");
    expect(r.groups.map((g) => [g.kind, g.open, g.jobs.map((j) => j.code)])).toEqual([["word-list", true, ["44100.01"]]]);
  });

  it("never counts a word matched through the list toward a government group: “hair salon” puts Hairstylists under at least one word", () => {
    const r = searchJobTitles("hair salon");
    const hairstylists = hit(r, "63210.01")!;
    expect(codesIn(r, "some")).toContain("63210.01");
    expect([hairstylists.wordsHeld, hairstylists.viaWordList]).toEqual([1, [{ word: "salon", title: "hairstylist" }]]);
  });

  it("reads words in a row, and a hyphen as two words: “ride-share” finds Taxi and limousine drivers through the list", () => {
    for (const q of ["ride-share", "ride share", "Rideshare"]) {
      const taxi = hit(searchJobTitles(q), "75200.01");
      expect(taxi?.viaWordList, q).toHaveLength(1);
      expect(taxi?.viaWordList[0]!.title, q).toBe("taxi driver");
    }
    // A line's words must be the person's exactly: "ride" alone isn't "rideshare".
    expect(hit(searchJobTitles("ride"), "75200.01")).toBeUndefined();
  });

  it("points every line at one of its job's own government titles, word for word (so the list can't invent a title)", () => {
    for (const line of EVERYDAY_WORDS) {
      const job = oasisData.occupations.find(([code]) => code === line.job);
      expect(job, line.words).toBeDefined();
      const titles = [...oasisTitles.titles.filter(([code]) => code === line.job).map(([, , title]) => title), job![1]];
      expect(titles, line.words).toContain(line.title);
    }
  });

  it("keeps each list to words that do something: no line's word is a filler or business word, and no word is on two lists", () => {
    const filler = FILLER_WORDS.flatMap(searchWords);
    const business = BUSINESS_WORDS.flatMap(searchWords);
    expect(filler.filter((w) => business.includes(w))).toEqual([]);
    for (const line of EVERYDAY_WORDS) {
      for (const w of searchWords(line.words)) expect([...filler, ...business], line.words).not.toContain(w);
    }
    expect(new Set(EVERYDAY_WORDS.map((l) => `${l.words}|${l.job}`)).size).toBe(EVERYDAY_WORDS.length);
  });

  it("carries the header that says the maintainer approves every line", async () => {
    const { readFileSync } = await import("node:fs");
    const text = readFileSync("lib/engines/oasis/v2026/dotami-word-list.ts", "utf8");
    expect(text).toContain("THE MAINTAINER APPROVES EVERY LINE OF THIS FILE.");
    expect(text).toContain("These are DotAmi's words, not the government's.");
  });
});

// ---- The idea corpus ---------------------------------------------------------------------------------

/**
 * The corpus measure (research 28f's, on tests/fixtures/ideas/v1.ts): each idea with an expected job is
 * searched by its `work` words, and found when one of its expected jobs is in the open group (rule H's own
 * view), or anywhere in a group. The floors are this pull request's measure (2026-10-21); a change that
 * lowers one fails here and has to say why, and a change that raises one raises the floor.
 */
describe("on the idea corpus", () => {
  const ideas = IDEAS_V1.filter((idea) => (idea.jobs ?? []).length > 0);
  const found = (codes: readonly string[], jobs: readonly string[]) => jobs.some((c) => codes.includes(c));
  const measure = () => {
    let today = 0;
    let todayZero = 0;
    let open = 0;
    let open50 = 0;
    let anyGroup = 0;
    let zero = 0;
    for (const idea of ideas) {
      const jobs = idea.jobs ?? [];
      const old = searchOasisJobs(idea.work, 50);
      if (found(old.jobs.map((j) => j.code), jobs)) today += 1;
      if (old.total === 0) todayZero += 1;
      const all = searchJobTitles(idea.work, Number.POSITIVE_INFINITY);
      if (found(openGroupCodes(all), jobs)) open += 1;
      if (found(openGroupCodes(searchJobTitles(idea.work, 50)), jobs)) open50 += 1;
      if (found(all.groups.flatMap((g) => g.jobs.map((j) => j.code)), jobs)) anyGroup += 1;
      if (all.total === 0) zero += 1;
    }
    return { ideas: ideas.length, today, todayZero, open, open50, anyGroup, zero };
  };

  it("finds the expected job for many more ideas than today's search, and leaves almost none with nothing", () => {
    const m = measure();
    // The receipt, printed so the pull request can quote it.
    console.log(`job-title-search corpus measure: ${JSON.stringify(m)}`);
    expect(m.ideas).toBeGreaterThanOrEqual(220);
    // Today's search (job names and codes, every word): the before.
    expect(m.today).toBe(20);
    expect(m.todayZero).toBe(187);
    // The floors.
    expect(m.open).toBeGreaterThanOrEqual(153);
    expect(m.open50).toBeGreaterThanOrEqual(150);
    expect(m.anyGroup).toBeGreaterThanOrEqual(184);
    expect(m.zero).toBeLessThanOrEqual(4);
  }, 60_000);

  it("keeps every group kind in the fixed order on every corpus idea", () => {
    for (const idea of IDEAS_V1) {
      const r = searchJobTitles(idea.work);
      const order = r.groups.map((g) => JOB_SEARCH_GROUP_KINDS.indexOf(g.kind));
      expect(order, idea.work).toEqual([...order].sort((a, b) => a - b));
      expect(r.groups.filter((g) => g.open).length, idea.work).toBe(r.groups.length > 0 ? 1 : 0);
    }
  }, 60_000);
});
