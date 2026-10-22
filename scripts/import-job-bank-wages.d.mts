// Types for scripts/import-job-bank-wages.mjs, so tests/wages-import.spec.ts type-checks against it.

import type { WageData } from "../lib/engines/wages/v2026/types";
import type { RunOptions } from "./lib/import-kit.mjs";

export const WAGE_DATA_DIR: string;
export const WAGE_MODULE_PATH: string;
export const WAGE_FILES: readonly { key: "wages"; name: string; url: string; sha256: string; encoding: "utf-8" | "latin1" }[];

export function evenText(text: string): string;
export function fingerprint(text: string): string;
export function parseCsv(text: string): string[][];
export function readWageFile(text: string, options?: { name?: string }): WageData;
export function buildWageModule(texts: { wages: string }): string;
export function main(argv: string[], options?: RunOptions): Promise<number>;
