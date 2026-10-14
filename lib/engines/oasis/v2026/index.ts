import type { SkillItem } from "../../roads/v2026/types";
import { oasisData } from "./data";
import {
  OASIS_LICENCE_CITATION,
  OASIS_NOT_APPLICABLE_CITATION,
  oasisDatasetCitation,
  OASIS_DATASET_CHECK,
  OASIS_DATASET_URL,
} from "./licence";
import type { OasisFamily } from "./types";

export {
  OASIS_ATTRIBUTION,
  OASIS_DATASET_URL,
  OASIS_FAMILY_FILES,
  OASIS_LICENCE_URL,
  OASIS_VERSION,
  oasisDatasetCitation,
} from "./licence";
export type { OasisData, OasisFamily } from "./types";

/**
 * The government's skills and knowledge lists for each job, from OaSIS 2025 Version 1.0
 * (docs/architecture/future-cockpit.md § 6, "Skills, and the government's list for your pick of job, as
 * built"; the maintainer's decision 5 of 2026-10-11). A catalog like every other: code, never rows in the
 * database, and read-only.
 *
 * It counts as a source only through the person's own pick of job: nothing here links a business, a
 * road or a step to a job. A screen asks the person to pick the job closest to the work they'd do, and
 * shows that job's list, every item tagged "your pick of job". The ratings stay in ./data.ts: a list item
 * carries a name, its group, the tag and its citation, and nothing else, so no rating reaches a screen
 * while the maintainer's item 20 (names only, or the ratings too) is open.
 */

/** The tag every item of a job's list carries, on screen and in the data. */
export const OASIS_ITEM_TAG = "your-pick-of-job";

/** One skill or knowledge area on a job's list, as a screen gets it. */
export interface JobListItem extends SkillItem {
  kind: "listed-skill";
  group: OasisFamily;
  tag: typeof OASIS_ITEM_TAG;
}

/** The list for the job the person picked. */
export interface JobList {
  code: string;
  label: string;
  items: readonly JobListItem[];
}

export interface OasisJob {
  code: string;
  label: string;
}

/**
 * The permanent id of a skill or knowledge area: shared by every job, so a mark on Numeracy stays when
 * the person picks another job. Made from the taxonomy's code, which a later OaSIS version keeps.
 */
const itemId = (taxonomyCode: string) => `skill-ca-oasis-${taxonomyCode.toLowerCase()}`;

/** Every id on the lists, in the taxonomy's order (skills, then knowledge). Ids are forever. */
export const oasisItemIds: readonly string[] = oasisData.descriptors.map(([code]) => itemId(code));
const knownIds = new Set(oasisItemIds);

/** True for an id from the government's list: a skill mark may point at one. */
export function isOasisItemId(id: string): boolean {
  return knownIds.has(id);
}

/** Every job a person can pick, in the dataset's order (by code). Never ranked. */
export const oasisJobs: readonly OasisJob[] = oasisData.occupations.map(([code, label]) => ({ code, label }));
const jobRows = new Map(oasisData.occupations.map((row) => [row[0], row]));

export function oasisJobByCode(code: string): OasisJob | undefined {
  const row = jobRows.get(code);
  return row ? { code: row[0], label: row[1] } : undefined;
}

/** What a search finds: the first `limit` jobs that match, and how many match in all. */
export interface OasisJobSearch {
  jobs: OasisJob[];
  total: number;
}

/**
 * Jobs that hold every word typed (any capitals), each word anywhere in the name or at the start of the
 * code: "heavy duty mechanic" finds "Heavy-duty equipment mechanics", "72311" finds Cabinetmakers. The
 * first `limit` in the dataset's order, with the count of all that match so a screen can say when it
 * shows only some. Matching isn't scored, so no job is put first for being a "better" match.
 */
export function searchOasisJobs(query: string, limit = 10): OasisJobSearch {
  const words = query.toLocaleLowerCase("en").split(/\s+/).filter((w) => w !== "");
  if (words.length === 0) return { jobs: [], total: 0 };
  const jobs: OasisJob[] = [];
  let total = 0;
  for (const job of oasisJobs) {
    const name = job.label.toLocaleLowerCase("en");
    if (!words.every((w) => name.includes(w) || job.code.startsWith(w))) continue;
    total += 1;
    if (jobs.length < limit) jobs.push(job);
  }
  return { jobs, total };
}

// Each family's descriptors, in order, so a ratings string can be read digit by digit.
const familyDescriptors = (family: OasisFamily) => oasisData.descriptors.filter((d) => d[1] === family);
const FAMILY_ORDER: readonly OasisFamily[] = ["skills", "knowledge"];

/**
 * The list for one job: every skill and knowledge area the government rates 1 or more for it (a 0 is
 * "Not applicable" on its profile page), skills first, each family in the taxonomy's order. Null for a
 * code that isn't a job. The ratings decide only what is on the list; they are not passed on.
 */
export function oasisListForJob(code: string): JobList | null {
  const row = jobRows.get(code);
  if (!row) return null;
  const ratings: Record<OasisFamily, string> = { skills: row[2], knowledge: row[3] };
  const items: JobListItem[] = FAMILY_ORDER.flatMap((family) => {
    const citation = oasisDatasetCitation(family, code);
    return familyDescriptors(family).flatMap(([taxonomyCode, , name], i) =>
      ratings[family][i] === "0"
        ? []
        : [{ id: itemId(taxonomyCode), label: name, kind: "listed-skill" as const, group: family, tag: OASIS_ITEM_TAG, citations: [citation] }],
    );
  });
  return { code: row[0], label: row[1], items };
}

/**
 * The sources behind the list, for lib/engines/all-citations.ts, so scripts/check-quotes.mjs checks them
 * again with every other source: the dataset's page (each item's citation carries the same check), the
 * profile page that says what a 0 means, and the licence's page.
 */
export function oasisCatalogCitations() {
  return [
    { where: "oasis dataset", citation: { url: OASIS_DATASET_URL, title: "OaSIS 2025 Version 1.0 (dataset page)", toolCheck: OASIS_DATASET_CHECK } },
    { where: "oasis not-applicable", citation: OASIS_NOT_APPLICABLE_CITATION },
    { where: "oasis licence", citation: OASIS_LICENCE_CITATION },
  ];
}
