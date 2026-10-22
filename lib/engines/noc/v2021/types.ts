/**
 * The shape of Statistics Canada's NOC 2021 Version 1.0 job groups, as scripts/import-noc.mjs writes them into
 * ./data.ts (task 28a). Flat rows in the file's order, so the module reads like the file it came from.
 */

/** [five-digit group code ("72311"), the group's title ("Cabinetmakers")]. */
export type NocGroupRow = readonly [code: string, title: string];

/**
 * The file's three kinds of title for a group: "illustrative" (its "Illustrative example(s)"), "all" (its
 * "All examples", which repeat the illustrative ones among the rest) and "inclusion" ("Inclusion(s)").
 */
export type NocTitleKind = "illustrative" | "all" | "inclusion";

/** [group code, kind, title ("custom wood furniture maker")]. */
export type NocTitleRow = readonly [code: string, kind: NocTitleKind, title: string];

/** [group code, one "Employment requirements" line, word for word]. */
export type NocRequirementRow = readonly [code: string, line: string];

export interface NocData {
  /** The file the import read, with the SHA-256 of its text (no byte-order mark, "\n" line endings). */
  files: readonly { name: string; sha256: string }[];
  groups: readonly NocGroupRow[];
  titles: readonly NocTitleRow[];
  requirements: readonly NocRequirementRow[];
}
