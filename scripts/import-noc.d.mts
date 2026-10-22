// Types for scripts/import-noc.mjs, so tests/noc-import.spec.ts type-checks against it.

import type { RunOptions } from "./lib/import-kit.mjs";

export const NOC_DATA_DIR: string;
export const NOC_MODULE_PATH: string;
export const NOC_REFERENCE_PERIOD: string;
export const NOC_FILES: readonly { key: "elements"; name: string; url: string; sha256: string; encoding: "utf-8" | "latin1" }[];
export const NOC_HEADER: readonly string[];
export const NOC_ELEMENT_KINDS: Readonly<Record<string, "illustrative" | "all" | "inclusion" | "requirement" | null>>;

export function buildNocModule(texts: { elements: string }): string;
export function main(argv: string[], options?: RunOptions): Promise<number>;
