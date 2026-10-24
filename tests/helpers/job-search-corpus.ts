import { searchOasisJobs } from "@/lib/engines/oasis/v2026";
import { JOB_SEARCH_GROUP_CAP, openGroupCodes, searchJobTitles, type JobSearch } from "@/lib/engines/oasis/v2026/title-search";

import { IDEAS_V1, type Idea } from "../fixtures/ideas/v1";

/**
 * Research 28f measured the cockpit's older job list (searchOasisJobs, by job name or code) on its first 50
 * results; the cockpit itself shows 10. Kept at 50 so the before-number stays the one the research quoted.
 */
export const COCKPIT_LIST_MEASURE_LIMIT = 50;

/** The job search against the idea corpus: every number, counted once. */
export interface JobSearchCorpusMeasure {
  /** Ideas in the corpus, and those that name an expected job. */
  ideas: number;
  withJob: number;
  /**
   * Of the ideas with an expected job, as "What's closest to your work?" lists the jobs (each part's first
   * JOB_SEARCH_GROUP_CAP; a group without parts, its first JOB_SEARCH_GROUP_CAP): in the group it opens, in any
   * group listed, not listed though other jobs were, and no job found at all.
   */
  firstGroup: number;
  anyGroup: number;
  notListed: number;
  noResults: number;
  /** Of every idea: no job found at all for its kind of work. */
  noResultsAll: number;
  /** The same, counting past each part's first JOB_SEARCH_GROUP_CAP (a match a person sees only by adding a word). */
  firstGroupUncapped: number;
  anyGroupUncapped: number;
  /** Of the ideas with an expected job: the cockpit's older job list finds it (first COCKPIT_LIST_MEASURE_LIMIT), or finds no job at all. */
  cockpitList: number;
  cockpitListNone: number;
}

const codesOf = (r: JobSearch) => r.groups.flatMap((g) => g.jobs.map((j) => j.code));
const holds = (codes: readonly string[], expected: readonly string[]) => expected.some((code) => codes.includes(code));

/**
 * Of the ideas given by number, those whose expected job the search no longer lists (in any group, as the screen
 * lists them), as "<number>: <work>". `search` is the screen's own unless a planted control passes another.
 */
export function ideasNoLongerListed(
  numbers: readonly number[],
  search: (work: string) => JobSearch = (work) => searchJobTitles(work, JOB_SEARCH_GROUP_CAP),
  ideas: readonly Idea[] = IDEAS_V1,
): string[] {
  return numbers.flatMap((n) => {
    const idea = ideas.find((i) => i.id === `idea-v1-${String(n).padStart(4, "0")}`);
    if (!idea) return [`${n}: no such idea`];
    return holds(codesOf(search(idea.work)), idea.jobs ?? []) ? [] : [`${n}: ${idea.work}`];
  });
}

/**
 * The one count of the job search against the corpus (research 28f's measure, on tests/fixtures/ideas/v1.ts):
 * the floors in tests/job-title-search.spec.ts, the idea harness's coverage report and the quality report all
 * read it, so they can't print different numbers under the same name. Each idea is searched by its `work`
 * words, as the screen searches them, with the screen's own cap.
 */
export function measureJobSearch(ideas: readonly Idea[] = IDEAS_V1): JobSearchCorpusMeasure {
  const m: JobSearchCorpusMeasure = {
    ideas: ideas.length,
    withJob: 0,
    firstGroup: 0,
    anyGroup: 0,
    notListed: 0,
    noResults: 0,
    noResultsAll: 0,
    firstGroupUncapped: 0,
    anyGroupUncapped: 0,
    cockpitList: 0,
    cockpitListNone: 0,
  };
  for (const idea of ideas) {
    const shown = searchJobTitles(idea.work, JOB_SEARCH_GROUP_CAP);
    if (shown.state !== "results") m.noResultsAll += 1;
    const expected = idea.jobs ?? [];
    if (expected.length === 0) continue;
    m.withJob += 1;
    const old = searchOasisJobs(idea.work, COCKPIT_LIST_MEASURE_LIMIT);
    if (holds(old.jobs.map((j) => j.code), expected)) m.cockpitList += 1;
    if (old.total === 0) m.cockpitListNone += 1;
    if (shown.state !== "results") {
      m.noResults += 1;
      continue;
    }
    if (holds(openGroupCodes(shown), expected)) m.firstGroup += 1;
    if (holds(codesOf(shown), expected)) m.anyGroup += 1;
    const all = searchJobTitles(idea.work, Number.POSITIVE_INFINITY);
    if (holds(openGroupCodes(all), expected)) m.firstGroupUncapped += 1;
    if (holds(codesOf(all), expected)) m.anyGroupUncapped += 1;
  }
  m.notListed = m.withJob - m.anyGroup - m.noResults;
  return m;
}
