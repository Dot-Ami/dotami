// Types for scripts/import-oasis-titles.mjs, so tests/oasis-titles-import.spec.ts type-checks against it.

import type { RunOptions } from "./lib/import-kit.mjs";

export const OASIS_TITLES_DATA_DIR: string;
export const OASIS_TITLES_MODULE_PATH: string;
export const OASIS_TITLES_FILES: readonly { key: "titles"; name: string; url: string; sha256: string; encoding: "utf-8" | "latin1" }[];
export const OASIS_TITLES_HEADER: readonly string[];
export const OASIS_TITLE_TYPES: readonly string[];

export function buildOasisTitlesModule(texts: { titles: string }): string;
export function main(argv: string[], options?: RunOptions): Promise<number>;
