/**
 * The job-links catalog (docs/architecture/research-kit.md § 5.3; task 25e): what goes with a job, held once
 * per job (not per road), keyed by its 5-digit NOC 2021 code. A road inherits the links of the jobs it is
 * written for (`Road.codes.occupations`), so two roads for one job never repeat them.
 *
 * Only jobs a road is written for have an entry, and an entry holds only what a person reviewed. Every other
 * job has none, and `jobLinksFor` says so in words rather than handing back an empty list that could pass for
 * "reviewed, nothing goes with it". tests/job-links.spec.ts holds the catalog to that.
 *
 * What an entry can hold, and what waits:
 * - Industry candidates (NAICS 2022 codes), each with its reason and, where a source supports it, its
 *   citation (census table 98-10-0594, at sector level). They wait for phase 3: the NAICS list is imported
 *   then, with the industry question and the business counts (the maintainer's call of 2026-10-20), and a
 *   code can't be checked against a list DotAmi doesn't have. The census table is NAICS 2017 at sector level
 *   while the list is 2022, so the phase 3 import checks the sectors match before any candidate cites it.
 * - Place categories (a place list's category or match word), which wait for the place lists of S2.5.26.
 *
 * So in phase 2 an entry says which job it is for and that both lists are still to come. Pure data, no
 * network: this folder imports nothing from outside itself (tests/research-kit-registry.spec.ts).
 */

/** An industry that goes with a job, as a person reviewed it. Not used until the NAICS list is imported. */
export interface IndustryCandidate {
  /** A NAICS Canada 2022 code, checked against the imported list. */
  naics: string;
  /** Why it goes with the job, in plain words. */
  reason: string;
  /** The source that supports the choice, when one does (the census table, at sector level). */
  citation?: { title: string; url: string };
}

/** A category or match word in a place list that goes with a job. Not used until the place lists come. */
export interface PlaceCategory {
  /** The registry card of the place list it is from. */
  source: string;
  /** The list's own category, or the word matched in it. */
  category: string;
  reason: string;
}

export interface JobLinks {
  /** The job group's 5-digit NOC 2021 code ("72311"). Checked against the government's list by the tests. */
  noc: string;
  /** The group's name on the government's list, so a reader of this file knows which job it is. */
  label: string;
  industryCandidates: readonly IndustryCandidate[];
  placeCategories: readonly PlaceCategory[];
}

/**
 * Every job with links, in code order. Today one: Cabinetmakers, the job road 1 (From apprentice to your own
 * shop) is written for. Its two lists are empty because what fills them isn't in DotAmi yet (above), not
 * because a person found nothing.
 */
export const JOB_LINKS: readonly JobLinks[] = [{ noc: "72311", label: "Cabinetmakers", industryCandidates: [], placeCategories: [] }];

/** The words for a job's links, kept with the catalog so every screen that shows them says it the same way. */
export const jobLinksWords = {
  /** Every job with no entry: no road is written for it, so nobody has reviewed what goes with it. */
  none: "DotAmi lists industries and places only for the jobs a road is written for, and no road is written for this job.",
  /** An entry whose lists are empty because the lists they come from aren't in DotAmi. */
  noIndustriesYet: "The industries for this job come with the government's industry list, which isn't in DotAmi yet.",
  noPlacesYet: "The places for this job come with the place lists, which aren't in DotAmi yet.",
} as const;

/** What the catalog says about a job: its reviewed links, or that it has none, in words. */
export type JobLinksAnswer = { kind: "listed"; links: JobLinks } | { kind: "none"; line: string };

/**
 * The links for a job, by its 5-digit group ("72311") or the person's pick as kept on the idea ("72311.00").
 * A job with no entry gets the "none" line, never another job's links and never an empty entry made up for it.
 */
export function jobLinksFor(job: string): JobLinksAnswer {
  const noc = /^\d{5}(?:\.\d{2})?$/.test(job) ? job.slice(0, 5) : null;
  const links = noc === null ? undefined : JOB_LINKS.find((entry) => entry.noc === noc);
  return links ? { kind: "listed", links } : { kind: "none", line: jobLinksWords.none };
}
