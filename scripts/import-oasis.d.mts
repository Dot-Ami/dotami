// Types for scripts/import-oasis.mjs, so tests/oasis-import.spec.ts type-checks against it.

import type { RunOptions } from "./lib/import-kit.mjs";

export type OasisFileKey = "guide" | "skills" | "knowledge" | "labels";

export const OASIS_DATA_DIR: string;
export const OASIS_MODULE_PATH: string;
export const OASIS_FILES: readonly { key: OasisFileKey; name: string; url: string; sha256: string; encoding: "utf-8" | "latin1" }[];

export function evenText(text: string): string;
export function fingerprint(text: string): string;
export function parseSemicolonCsv(text: string): string[][];
export function buildOasisModule(texts: Record<OasisFileKey, string>): string;
export function main(argv: string[], options?: RunOptions): Promise<number>;
