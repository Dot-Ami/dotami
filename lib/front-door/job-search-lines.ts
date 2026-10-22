import type { JobMatch, JobSearch, JobSearchGroup } from "@/lib/engines/oasis/v2026/title-search";

import { jobStepWords as words } from "./words";

/**
 * The lines "What's closest to your work?" draws around a search's answer
 * (docs/ui-spec/futures/01-whats-closest-to-your-work.md), as pure functions so the screen
 * (components/front-door/job-search.tsx), the idea harness and the browser sweep all read the same words.
 */

/** Whether the search had nothing to look for: every word typed is on DotAmi's filler or business-word list. */
export function onlyLeftOutWords(search: JobSearch): boolean {
  return search.searched.length === 0 && search.leftOut.length > 0;
}

/**
 * What the status line says for a search that ran. A no-match line only ever names words that were searched:
 * when every word was left out, nothing was looked for, so the screen can't say no title holds them ("shop" is
 * in the government's "barber shop manager").
 */
export function searchStatusLine(search: JobSearch): string {
  if (search.state === "too-short") return words.tooShort;
  if (search.state === "no-match") {
    if (search.searched.length === 0) return words.nothingSearched;
    return words.noMatch(search.searched.map((w) => `“${w}”`).join(", "));
  }
  if (search.state !== "results") return "";
  const count = (kind: JobSearchGroup["kind"]) => search.groups.find((g) => g.kind === kind)?.total ?? 0;
  const list = count("word-list");
  return list > 0
    ? words.statusWithList(search.total, count("all"), count("all-but-one"), count("some"), list)
    : words.status(search.total, count("all"), count("all-but-one"), count("some"));
}

/**
 * The status line under the box, whatever state the search is in: the empty state's line before anything is
 * typed (none in the cockpit's narrow panel), the failure line when the search for these words couldn't run, the
 * searching line while it waits (the PR #202 review: it drew nothing there), and the answer's line once it is in.
 */
export function searchBoxStatusLine(state: { typed: boolean; compact: boolean; failed: boolean; search: JobSearch | null }): string {
  if (!state.typed) return state.compact ? "" : words.empty;
  if (state.failed) return words.searchFailed;
  return state.search ? searchStatusLine(state.search) : words.searching;
}

/** The *Not searched: …* line, or null when no word was left out. */
export function leftOutLine(search: JobSearch): string | null {
  return search.leftOut.length > 0 ? words.leftOut(search.leftOut.map((w) => `“${w.word}”`).join(", ")) : null;
}

/** *Titles are searched in English in this version.*: only after words were searched and none found a job. */
export function showsEnglishOnly(search: JobSearch): boolean {
  return search.state === "no-match" && search.searched.length > 0;
}

/** Each group's heading: a true statement about the government's titles, or, last, about DotAmi's list. */
export function groupHeading(group: JobSearchGroup, searchedWords: number): string {
  switch (group.kind) {
    case "all":
      return searchedWords === 1 ? words.groupOne : words.groupAll;
    case "all-but-one":
      return words.groupAllButOne;
    case "some":
      return words.groupSome;
    case "word-list":
      return words.groupList;
  }
}

/** The button that opens a folded group, saying what it shows. */
export function showGroupName(group: Pick<JobSearchGroup, "kind" | "total">): string {
  if (group.kind === "all-but-one") return words.showGroup(group.total);
  if (group.kind === "word-list") return words.showGroupList(group.total);
  return words.showGroupSome(group.total);
}

/** Where a job's words were found, in plain words: an example title, the job's name, or its code. */
export function matchedLine(match: JobMatch): string {
  if (match.from === "job name") return words.matchedName(match.title);
  if (match.from === "job code") return words.matchedCode(match.title);
  return words.matched(match.title);
}
