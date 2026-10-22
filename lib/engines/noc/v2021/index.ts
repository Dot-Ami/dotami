import { nocData } from "./data";
import type { NocTitleKind } from "./types";

export type { NocData, NocGroupRow, NocRequirementRow, NocTitleKind, NocTitleRow } from "./types";

/**
 * Statistics Canada's NOC 2021 Version 1.0 job groups (task 28a): each five-digit group's title, its example
 * titles and its "Employment requirements", read from the pinned elements file by scripts/import-noc.mjs. A
 * catalog like every other: code, never rows in the database, and read-only.
 *
 * The requirements are the government's words and stay that way: a screen shows them word for word, in
 * quote marks and labelled as the government's (docs/ui-spec/cockpit/about-this-job.md, row 1), never
 * reworded and never read by a rule. Nothing here links a person, a road or a business to a group; a group is
 * reached only through the job the person picked.
 */

/** The notice the Statistics Canada Open Licence asks for, word for word, as the module's first lines carry it. */
export const NOC_ATTRIBUTION =
  "Adapted from Statistics Canada, National Occupational Classification (NOC) 2021 Version 1.0, 2021. This does not constitute an endorsement by Statistics Canada of this product.";

/** The licence's page. */
export const NOC_LICENCE_URL = "https://www.statcan.gc.ca/en/reference/licence";

/** The classification's page at Statistics Canada. */
export const NOC_URL = "https://www.statcan.gc.ca/en/subjects/standard/noc/2021/indexV1";

export interface NocGroup {
  /** Five digits: "72311". */
  code: string;
  title: string;
}

const groupTitles = new Map(nocData.groups);

/** Every group, in the file's order (by code). */
export const nocGroups: readonly NocGroup[] = nocData.groups.map(([code, title]) => ({ code, title }));

/** The five-digit group an OaSIS job code ("72311.00") or a group code ("72311") is in. */
export function nocGroupCode(code: string): string {
  return code.slice(0, 5);
}

/** The group an OaSIS job code or a group code is in, or undefined when the file has no such group. */
export function nocGroup(code: string): NocGroup | undefined {
  const group = nocGroupCode(code);
  const title = groupTitles.get(group);
  return title === undefined ? undefined : { code: group, title };
}

/**
 * The group's "Employment requirements", every line in the file's order, word for word. Some groups put a
 * line naming the job before that job's lines ("Hairstylists", then its lines, then "Barbers", in 63210); the
 * file doesn't mark those, so they come back as lines like any other. Empty for a code with no group.
 */
export function nocRequirements(code: string): readonly string[] {
  const group = nocGroupCode(code);
  return nocData.requirements.filter(([c]) => c === group).map(([, line]) => line);
}

/** The group's titles of one kind (or of every kind), in the file's order. Empty for a code with no group. */
export function nocTitles(code: string, kind?: NocTitleKind): readonly string[] {
  const group = nocGroupCode(code);
  return nocData.titles.filter(([c, k]) => c === group && (kind === undefined || k === kind)).map(([, , title]) => title);
}
