/**
 * The shape of the government's skills and knowledge lists for each job, as scripts/import-oasis.mjs
 * writes them into ./data.ts (docs/architecture/future-cockpit.md § 6, "Skills, and the government's list
 * for your pick of job, as built"). Compact on purpose: one row per job, one digit per rating.
 */

/** The two families the import reads. */
export type OasisFamily = "skills" | "knowledge";

/** [taxonomy code ("F.01.c.01"), family, name ("Numeracy")]. The code is what a permanent id is made from. */
export type OasisDescriptorRow = readonly [code: string, family: OasisFamily, name: string];

/**
 * [job code ("72311.00"), job name, skills ratings, knowledge ratings]. Each ratings string has one digit
 * per descriptor of its family, in the order of `descriptors`. The ratings are kept, never shown: names
 * only until the maintainer decides otherwise (item 20).
 */
export type OasisOccupationRow = readonly [code: string, label: string, skills: string, knowledge: string];

export interface OasisData {
  /** Each file the import read, with the SHA-256 of its text (no byte-order mark, "\n" line endings). */
  files: readonly { name: string; sha256: string }[];
  descriptors: readonly OasisDescriptorRow[];
  occupations: readonly OasisOccupationRow[];
}
