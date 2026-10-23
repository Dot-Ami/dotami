/**
 * The search behind "What's closest to your work?" (lib/engines/oasis/v2026/title-search.ts;
 * docs/ui-spec/futures/01-whats-closest-to-your-work.md; research note 28f, rule H), and DotAmi's word list
 * (lib/engines/oasis/v2026/dotami-word-list.ts). What it finds, how it groups, that nothing is ranked or picked,
 * that DotAmi's list is kept apart from the government's titles, and its measure on the idea corpus, with a
 * floor so a later change can't quietly lower it.
 */
import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { oasisData } from "@/lib/engines/oasis/v2026/data";
import { BUSINESS_WORDS, EVERYDAY_WORDS, FILLER_WORDS } from "@/lib/engines/oasis/v2026/dotami-word-list";
import { searchOasisJobs } from "@/lib/engines/oasis/v2026";
import {
  JOB_SEARCH_GROUP_CAP,
  JOB_SEARCH_GROUP_KINDS,
  JOB_SEARCH_PART_KINDS,
  openGroupCodes,
  searchJobTitles,
  searchWords,
  wordsMatch,
  type JobSearch,
} from "@/lib/engines/oasis/v2026/title-search";
import { oasisTitles } from "@/lib/engines/oasis/v2026/titles";
import { jobStepWords } from "@/lib/front-door/words";

import { LISTED_BEFORE_WHOLE_WORDS_FIRST } from "./fixtures/ideas/job-search-listed";
import { IDEAS_V1 } from "./fixtures/ideas/v1";
import { ideasNoLongerListed, measureJobSearch } from "./helpers/job-search-corpus";

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
  it("finds a job through its example titles, not only its name: “plumbing” finds Plumbers through “plumbing installer”", () => {
    const r = searchJobTitles("plumbing");
    expect(r.state).toBe("results");
    // Whole words first (a-call-11): the title named is the first holding the person's exact word; before, the
    // first holding a word that starts like it ("plumber apprentice").
    expect(hit(r, "72300.00")?.matched).toEqual({ title: "plumbing installer", from: "Index" });
    expect(hit(r, "72300.00")?.part).toBe("exact");
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

  it("lists each part of a group in the government's code order, never ranked, and says how many it holds past the first 50", () => {
    const r = searchJobTitles("manager");
    const all = r.groups[0]!;
    expect(all.total).toBeGreaterThan(50);
    // Each part lists its first 50: the exact word "manager" in 50 (of more), "management" and the like after.
    expect(all.parts.map((p) => p.kind)).toEqual(["exact", "word-start"]);
    expect(all.parts[0]!.total).toBeGreaterThan(50);
    expect(all.jobs.filter((j) => j.part === "exact")).toHaveLength(50);
    expect(all.jobs.filter((j) => j.part === "word-start")).toHaveLength(Math.min(50, all.parts[1]!.total));
    const order = oasisData.occupations.map(([code]) => code);
    for (const g of [...r.groups, ...searchJobTitles("taco food truck").groups, ...searchJobTitles("heavy duty truck mechanic").groups]) {
      for (const part of [...g.parts.map((p) => p.kind), null]) {
        const codes = g.jobs.filter((j) => j.part === part).map((j) => j.code);
        expect(codes).toEqual([...codes].sort((a, b) => order.indexOf(a) - order.indexOf(b)));
      }
    }
    expect(searchJobTitles("manager", 5).groups[0]!.jobs).toHaveLength(10);
  });

  it("gives each result only what the screen shows: its name and code, the count of words, the title, where it came from and its part", () => {
    const keys = Object.keys(hit(searchJobTitles("barber"), "63210.02")!).sort();
    expect(keys).toEqual(["code", "label", "matched", "moreTitles", "part", "viaWordList", "wordsHeld"]);
  });
});

describe("whole words first: inside each group, the exact word, then a word that starts like it (a-call-11)", () => {
  it("puts the jobs whose title holds the exact word first, the word starts after, and the group's parts add up", () => {
    const r = searchJobTitles("barber");
    const all = r.groups[0]!;
    expect(all.parts).toEqual([
      { kind: "exact", total: 2 },
      { kind: "word-start", total: 1 },
    ]);
    // Barbers and the barber shop manager hold "barber"; the barbed wire machine tender holds a word that starts like it.
    expect(all.jobs.map((j) => [j.code, j.part, j.matched?.title])).toEqual([
      ["60040.00", "exact", "barber shop manager"],
      ["63210.02", "exact", "barber apprentice"],
      ["94107.00", "word-start", "barbed wire machine tender"],
    ]);
  });

  it("keeps every part's jobs together, exact first, and their totals the group's, on every corpus idea", () => {
    for (const idea of IDEAS_V1) {
      for (const g of searchJobTitles(idea.work).groups) {
        expect(g.parts.reduce((sum, p) => sum + p.total, 0), idea.work).toBe(g.kind === "word-list" ? 0 : g.total);
        const order = g.jobs.map((j) => (j.part === null ? 2 : JOB_SEARCH_PART_KINDS.indexOf(j.part)));
        expect(order, idea.work).toEqual([...order].sort((a, b) => a - b));
      }
    }
  }, 60_000);

  it("names, in the exact-word part, a title that holds the person's words word for word", () => {
    for (const q of ["plumbing", "cake decorating", "I build custom kitchen cabinets", "wedding photography", "manager"]) {
      const r = searchJobTitles(q);
      for (const j of r.groups.flatMap((g) => g.jobs).filter((x) => x.part === "exact")) {
        const words = new Set(searchWords(j.matched!.title));
        expect(r.searched.filter((w) => words.has(w)).length, `${q}: ${j.code} “${j.matched!.title}”`).toBe(j.wordsHeld);
      }
    }
  });

  it("labels the exact part with its rule: one title holds all the counted words exactly, not just one of them", () => {
    // Review of #206: "registered nurse" files General duty registered nurses under the word-start part, though its
    // titles hold each word word for word: "nurse" in "general duty nurse", "registered" in the job's name (where
    // "nurses" only starts like "nurse"). The old label, "Their titles have your exact word", was true of it too, so
    // the screen didn't say why it sat second.
    const r = searchJobTitles("registered nurse");
    const nurses = hit(r, "31301.01")!;
    expect(nurses.part).toBe("word-start");
    const titles = [nurses.label, ...oasisTitles.titles.filter(([code]) => code === "31301.01").map(([, , title]) => title)].map(
      (title) => new Set(searchWords(title)),
    );
    expect(titles.some((w) => w.has("registered"))).toBe(true);
    expect(titles.some((w) => w.has("nurse"))).toBe(true);
    expect(titles.some((w) => w.has("registered") && w.has("nurse"))).toBe(false);
    // So the label says the rule: one title, all the words.
    expect(jobStepWords.partExact).toBe("One of their titles has your exact words");
  });

  it("opens the closest group whole: “I build custom kitchen cabinets” shows Cabinetmakers on row 10 without a click", () => {
    // Before (main 694007d): every job in one "at least one" group of 85 in code order, Cabinetmakers 64th, past the
    // first 50, so not listed at all. Its titles hold "custom" ("custom wood furniture maker") word for word.
    const r = searchJobTitles("I build custom kitchen cabinets");
    expect(r.groups.map((g) => [g.kind, g.open, g.parts])).toEqual([
      [
        "some",
        true,
        [
          { kind: "exact", total: 14 },
          { kind: "word-start", total: 71 },
        ],
      ],
    ]);
    expect(openGroupCodes(r).indexOf("72311.00") + 1).toBe(10);
    expect(hit(r, "72311.00")!.part).toBe("exact");
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
      part: null,
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

  it("carries the header that says the maintainer approves every line", () => {
    const text = readFileSync("lib/engines/oasis/v2026/dotami-word-list.ts", "utf8");
    expect(text).toContain("THE MAINTAINER APPROVES EVERY LINE OF THIS FILE.");
    expect(text).toContain("These are DotAmi's words, not the government's.");
  });
});

// ---- The idea corpus ---------------------------------------------------------------------------------

/**
 * The corpus measure (research 28f's, on tests/fixtures/ideas/v1.ts), counted once in
 * tests/helpers/job-search-corpus.ts, which the idea harness's coverage report and the quality report read
 * too: each idea with an expected job is searched by its `work` words with the screen's own cap per group, and
 * found when one of its expected jobs is in the open group (rule H's own view), or in any group as listed;
 * the same counted past the cap, for the record. The floors are the measure of 2026-10-21 (the group listed
 * in full since 2026-10-22); a change that lowers one fails here and has to say why, and a change that raises
 * one raises the floor.
 */
describe("on the idea corpus", () => {
  it("finds the expected job for many more ideas than today's search, and leaves almost none with nothing", () => {
    const m = measureJobSearch();
    // The receipt, printed so the pull request can quote it.
    console.log(`job-title-search corpus measure: ${JSON.stringify(m)}`);
    expect(m.withJob).toBeGreaterThanOrEqual(220);
    // Today's search (job names and codes, every word): the before.
    expect(m.cockpitList).toBe(20);
    expect(m.cockpitListNone).toBe(187);
    // The floors, as the screen lists the jobs (each part's first JOB_SEARCH_GROUP_CAP, the closest group open
    // whole): 150 and 172 before whole words first (main 694007d), 152 and 181 with it (a-call-11, 2026-10-23).
    expect(m.firstGroup).toBeGreaterThanOrEqual(152);
    expect(m.anyGroup).toBeGreaterThanOrEqual(181);
    expect(m.noResults).toBeLessThanOrEqual(4);
    // Counted past the cap.
    expect(m.firstGroupUncapped).toBeGreaterThanOrEqual(153);
    expect(m.anyGroupUncapped).toBeGreaterThanOrEqual(184);
  }, 60_000);

  it("still lists every idea it listed before whole words first (a-call-11: no idea that was listed drops out)", () => {
    expect(LISTED_BEFORE_WHOLE_WORDS_FIRST).toHaveLength(172);
    expect(ideasNoLongerListed(LISTED_BEFORE_WHOLE_WORDS_FIRST)).toEqual([]);
  }, 60_000);

  it("fails when a listed idea drops out (a planted control: the group capped at 50 in all, not each part)", () => {
    // The mistake this check exists for: both parts shown, but cut at 50 jobs together, so a word-start part
    // after a full exact part lists nothing.
    const cappedWhole = (work: string): JobSearch => {
      const r = searchJobTitles(work, JOB_SEARCH_GROUP_CAP);
      return { ...r, groups: r.groups.map((g) => ({ ...g, jobs: g.jobs.slice(0, JOB_SEARCH_GROUP_CAP) })) };
    };
    const dropped = ideasNoLongerListed(LISTED_BEFORE_WHOLE_WORDS_FIRST, cappedWhole);
    console.log(`planted control, ideas no longer listed: ${dropped.length} (${dropped.slice(0, 3).join("; ")}…)`);
    expect(dropped.length).toBeGreaterThan(0);
  }, 60_000);

  it("counts with the screen's own cap, never a number of its own", () => {
    // A cap typed here as a number would leave the floors standing when the screen's cap changed.
    const text = readFileSync("tests/helpers/job-search-corpus.ts", "utf8");
    expect(text).toContain("searchJobTitles(idea.work, JOB_SEARCH_GROUP_CAP)");
    expect(text).not.toMatch(/searchJobTitles\([^)]*\b\d+\)/);
  });

  it("keeps every group kind in the fixed order on every corpus idea", () => {
    for (const idea of IDEAS_V1) {
      const r = searchJobTitles(idea.work);
      const order = r.groups.map((g) => JOB_SEARCH_GROUP_KINDS.indexOf(g.kind));
      expect(order, idea.work).toEqual([...order].sort((a, b) => a - b));
      expect(r.groups.filter((g) => g.open).length, idea.work).toBe(r.groups.length > 0 ? 1 : 0);
    }
  }, 60_000);
});
