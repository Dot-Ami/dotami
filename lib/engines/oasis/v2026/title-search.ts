import { oasisData } from "./data";
import { BUSINESS_WORDS, EVERYDAY_WORDS, FILLER_WORDS } from "./dotami-word-list";
import { oasisTitles } from "./titles";
import type { OasisTitleType } from "./types";

/**
 * The search behind "What's closest to your work?" (docs/ui-spec/futures/01-whats-closest-to-your-work.md,
 * "How the search works"; research note 28f, rule H). A pure function over the government's example job
 * titles (./titles.ts, OaSIS 2025 "Example Titles": Example, Index and Inclusion titles) and the jobs' own
 * names (./data.ts), with DotAmi's word list (./dotami-word-list.ts) on top, kept apart.
 *
 * How it works:
 * 1. The person's words are split into words. Words on DotAmi's filler and business-word lists are left
 *    out, and the result names each one left out.
 * 2. A searched word matches a title word when the two are the same, or when both have 4 letters or more and
 *    they start with the same five letters (or all of the shorter one): "plumbing" finds "plumber", "bake"
 *    finds "bakery". A three-letter word must be the whole title word.
 * 3. Each job is counted by how many of the searched words one of its titles holds (the title holding the
 *    most), and put in one group: all the words; all but one (only when three or more were searched); at
 *    least one. Every group heading is then a true statement about the government's titles.
 * 4. DotAmi's everyday words come last: a line finds its job only where none of that job's titles holds the
 *    word, and a job found only that way sits in its own last group, never under a heading about the
 *    government's titles. A job that is in a government group anyway carries the line too, so the screen can
 *    say where the other word was matched.
 * 5. Inside a group, jobs are in the government's code order. Nothing is scored or ranked: the group is a
 *    count of the person's own words. Each group lists its first 50 jobs (the app's own measure) and says
 *    how many it holds.
 *
 * Nothing is picked: the result is a list for the person to click. The typed words aren't kept anywhere.
 *
 * Imported by its own path (`@/lib/engines/oasis/v2026/title-search`), not through ./index.ts, so a screen
 * that only shows a job's skills list doesn't carry the titles (about 1 MB of them) with it.
 */

/** How many jobs a group lists, unless the caller says otherwise (tests/helpers/idea-coverage-report.ts uses 50). */
export const JOB_SEARCH_GROUP_CAP = 50;

/** Fewer letters and digits than this, all told, and the search waits ("Type at least 3 letters."). */
export const JOB_SEARCH_MIN_LETTERS = 3;

/** The groups, in the order a screen shows them. */
export const JOB_SEARCH_GROUP_KINDS = ["all", "all-but-one", "some", "word-list"] as const;
export type JobSearchGroupKind = (typeof JOB_SEARCH_GROUP_KINDS)[number];

/** Where a job's matching words were found: one of the government's example titles, the job's name, or its code. */
export type JobMatchSource = OasisTitleType | "job name" | "job code";

export interface JobMatch {
  /** The title, word for word as the government wrote it (the job's name, or its code, for those two). */
  title: string;
  from: JobMatchSource;
}

/** One of DotAmi's everyday-word lines that found this job: the person's word, and the government title it points at. */
export interface ViaWordList {
  word: string;
  title: string;
}

export interface JobSearchHit {
  code: string;
  label: string;
  /** How many of the searched words the job's best-holding title has. 0 only in the word-list group. */
  wordsHeld: number;
  /**
   * The title that holds them: the first, in the government file's order, of the titles holding that many
   * (example titles first, then the job's name). Null only in the word-list group.
   */
  matched: JobMatch | null;
  /** How many more of the job's titles hold that many words. */
  moreTitles: number;
  /** The person's words that reached this job only through DotAmi's word list (none of its titles holds them). */
  viaWordList: readonly ViaWordList[];
}

export interface JobSearchGroup {
  kind: JobSearchGroupKind;
  /** How many jobs the group holds. */
  total: number;
  /** The first `cap` of them, in the government's code order. */
  jobs: readonly JobSearchHit[];
  /** True for the first group that holds a job: the one shown open (the rest are one click away). */
  open: boolean;
}

export interface LeftOutWord {
  word: string;
  list: "filler" | "business";
}

export interface JobSearch {
  /**
   * "empty": nothing typed; "too-short": fewer than 3 letters; "no-match": nothing searched found a job (or
   * every word was left out); "results": at least one group holds a job.
   */
  state: "empty" | "too-short" | "no-match" | "results";
  /** The words searched, as compared (no capitals, accents or apostrophes), in the person's order. */
  searched: readonly string[];
  /** The words left out, in the person's order, each with the list it is on. */
  leftOut: readonly LeftOutWord[];
  /** The groups that hold a job, in JOB_SEARCH_GROUP_KINDS order. */
  groups: readonly JobSearchGroup[];
  /** Jobs in all the groups together. */
  total: number;
}

// ---- Words -----------------------------------------------------------------------------------------

/**
 * Text as the search compares it: lower case, accents taken off ("Café" is "cafe"), apostrophes dropped
 * ("parent's" is "parents"), then split at anything that isn't a letter or a digit.
 */
export function searchWords(text: string): string[] {
  return text
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLocaleLowerCase("en")
    .replace(/['’‘`]/g, "")
    .split(/[^a-z0-9]+/)
    .filter((w) => w !== "");
}

/**
 * Whether a searched word matches a title word (research 28f's rule, word-start length 5): the same word, or,
 * when both have at least 4 letters, the same first five letters (or all of the shorter one).
 */
export function wordsMatch(searched: string, titleWord: string): boolean {
  if (searched === titleWord) return true;
  if (searched.length < 4 || titleWord.length < 4) return false;
  const n = Math.min(5, searched.length, titleWord.length);
  return searched.slice(0, n) === titleWord.slice(0, n);
}

const FILLER = new Set(FILLER_WORDS.flatMap(searchWords));
const BUSINESS = new Set(BUSINESS_WORDS.flatMap(searchWords));

// ---- The titles, read once -------------------------------------------------------------------------

interface Candidate {
  title: string;
  from: JobMatchSource;
  words: ReadonlySet<string>;
}

interface IndexedJob {
  code: string;
  label: string;
  candidates: readonly Candidate[];
}

const titlesByJob = new Map<string, Candidate[]>();
for (const [code, type, title] of oasisTitles.titles) {
  const list = titlesByJob.get(code) ?? [];
  list.push({ title, from: type, words: new Set(searchWords(title)) });
  titlesByJob.set(code, list);
}

/** Every job in the dataset's order (by code), each with its example titles in the file's order, then its name. */
const JOBS: readonly IndexedJob[] = oasisData.occupations.map(([code, label]) => ({
  code,
  label,
  candidates: [...(titlesByJob.get(code) ?? []), { title: label, from: "job name" as const, words: new Set(searchWords(label)) }],
}));

/** Every word in every title, so a searched word's matches are worked out once per search. */
const VOCABULARY: readonly string[] = [...new Set(JOBS.flatMap((job) => job.candidates.flatMap((c) => [...c.words])))];

/** DotAmi's everyday-word lines, as compared. */
const EVERYDAY = EVERYDAY_WORDS.map((line) => ({ ...line, keys: searchWords(line.words) }));

// ---- The search ------------------------------------------------------------------------------------

/** A code typed on its own ("72311", "72311.00"): the jobs whose code starts with it. */
const CODE_QUERY = /^\d[\d.]*$/;

/**
 * The jobs whose government titles hold the person's words, grouped by how many they hold, in code order
 * inside each group, with DotAmi's word list's finds in their own last group. `cap` is how many jobs each
 * group lists (it always says how many it holds).
 */
export function searchJobTitles(query: string, cap: number = JOB_SEARCH_GROUP_CAP): JobSearch {
  const trimmed = query.trim();
  const none = { searched: [], leftOut: [], groups: [], total: 0 };
  if (trimmed === "") return { state: "empty", ...none };
  const typed = searchWords(trimmed);
  if (typed.join("").length < JOB_SEARCH_MIN_LETTERS) return { state: "too-short", ...none };

  if (CODE_QUERY.test(trimmed)) return codeSearch(trimmed, cap);

  const leftOut: LeftOutWord[] = [];
  const searched: string[] = [];
  for (const word of typed) {
    if (FILLER.has(word)) leftOut.push({ word, list: "filler" });
    else if (BUSINESS.has(word)) leftOut.push({ word, list: "business" });
    else searched.push(word);
  }
  if (searched.length === 0) return { state: "no-match", searched, leftOut, groups: [], total: 0 };

  // For each title word that matches any searched word, which searched words (by place) it matches.
  const matchedBy = new Map<string, number[]>();
  for (const t of VOCABULARY) {
    const at = searched.flatMap((word, i) => (wordsMatch(word, t) ? [i] : []));
    if (at.length > 0) matchedBy.set(t, at);
  }
  /** The places of the searched words a title holds. */
  const heldBy = (c: Candidate) => {
    const held = new Set<number>();
    for (const w of c.words) for (const i of matchedBy.get(w) ?? []) held.add(i);
    return held;
  };

  // DotAmi's lines whose words stand, in a row, among the searched words: [line, the searched words' places].
  // A line's words must be the person's words exactly (no word-start rule), so "rideshare" never reads "ride".
  const lines = EVERYDAY.flatMap((line) => {
    const found: { line: (typeof EVERYDAY)[number]; at: number[] }[] = [];
    for (let start = 0; start + line.keys.length <= searched.length; start += 1) {
      if (line.keys.every((key, k) => key === searched[start + k])) {
        found.push({ line, at: line.keys.map((_, k) => start + k) });
      }
    }
    return found;
  });

  const n = searched.length;
  const byKind = new Map<JobSearchGroupKind, JobSearchHit[]>(JOB_SEARCH_GROUP_KINDS.map((k) => [k, []]));
  for (const job of JOBS) {
    // How many words each title holds, and which words any title holds.
    const held = job.candidates.map(heldBy);
    const counts = held.map((h) => h.size);
    const wordsHeld = Math.max(...counts);
    const heldAnywhere = new Set(held.flatMap((h) => [...h]));

    // The government's titles come first: a line is used for this job only for words none of its titles holds.
    const viaWordList: ViaWordList[] = [];
    for (const { line, at } of lines) {
      if (line.job !== job.code || at.every((i) => heldAnywhere.has(i))) continue;
      const word = at.map((i) => searched[i]).join(" ");
      if (!viaWordList.some((v) => v.word === word && v.title === line.title)) viaWordList.push({ word, title: line.title });
    }

    let kind: JobSearchGroupKind | null = null;
    if (wordsHeld === n) kind = "all";
    else if (n >= 3 && wordsHeld === n - 1) kind = "all-but-one";
    else if (wordsHeld >= 1) kind = "some";
    else if (viaWordList.length > 0) kind = "word-list";
    if (kind === null) continue;

    const first = wordsHeld > 0 ? counts.indexOf(wordsHeld) : -1;
    byKind.get(kind)!.push({
      code: job.code,
      label: job.label,
      wordsHeld,
      matched: first >= 0 ? { title: job.candidates[first]!.title, from: job.candidates[first]!.from } : null,
      moreTitles: first >= 0 ? counts.filter((c) => c === wordsHeld).length - 1 : 0,
      viaWordList,
    });
  }
  return finish(searched, leftOut, byKind, cap);
}

/** A typed code: every job whose code starts with it, in one group, matched by its code. */
function codeSearch(code: string, cap: number): JobSearch {
  const hits = JOBS.filter((job) => job.code.startsWith(code)).map((job) => ({
    code: job.code,
    label: job.label,
    wordsHeld: 1,
    matched: { title: job.code, from: "job code" as const },
    moreTitles: 0,
    viaWordList: [],
  }));
  return finish([code], [], new Map([["all", hits]]), cap);
}

/** The groups that hold a job, each capped, the first one open. */
function finish(searched: string[], leftOut: LeftOutWord[], byKind: Map<JobSearchGroupKind, JobSearchHit[]>, cap: number): JobSearch {
  const groups = JOB_SEARCH_GROUP_KINDS.flatMap((kind) => {
    const jobs = byKind.get(kind) ?? [];
    return jobs.length === 0 ? [] : [{ kind, total: jobs.length, jobs: jobs.slice(0, cap), open: false }];
  });
  if (groups.length > 0) groups[0]!.open = true;
  const total = groups.reduce((sum, g) => sum + g.total, 0);
  return { state: total > 0 ? "results" : "no-match", searched, leftOut, groups, total };
}

/**
 * The codes of the jobs the open group lists (rule H's own view: the closest group that holds any job). For
 * the corpus measure (tests/job-title-search.spec.ts) and the coverage report.
 */
export function openGroupCodes(result: JobSearch): string[] {
  const open = result.groups.find((g) => g.open);
  return open ? open.jobs.map((j) => j.code) : [];
}
