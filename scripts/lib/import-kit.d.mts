// Types for scripts/lib/import-kit.mjs, so tests/import-kit.spec.ts and tests/data-check.spec.ts type-check against it.

import type { Licence, SourceCard } from "../../lib/engines/research-kit/v2026/types";

export type Encoding = "utf-8" | "latin1";

export const ROOT: string;
export const ENCODINGS: readonly Encoding[];
export const registry: { sources: readonly SourceCard[]; licences: Readonly<Record<string, Licence>> };

export function importAppModule(relative: string): Promise<Record<string, unknown>>;
export function decode(bytes: Uint8Array, encoding: Encoding, name?: string): string;
export function evenText(text: string): string;
export function fingerprint(text: string): string;
export function parseCsv(text: string, separator?: string): string[][];
export function expectHeader(rows: readonly (readonly string[])[], expected: readonly string[], name: string): void;
export function commentLines(text: string, width?: number): string[];
export function sourceCard(id: string, cards?: readonly SourceCard[]): SourceCard;
export function creditLine(card: SourceCard, inputs?: { tableId?: string; referencePeriod?: string }): string;
export function moduleHeader(card: SourceCard, inputs: { tableId?: string; referencePeriod?: string; note: string }): string[];

export interface ImportFile<Key extends string = string> {
  key: Key;
  name: string;
  sha256: string;
  encoding: Encoding;
  /** A UTF-8 file that must start with a byte-order mark; one without it is refused (and never downloaded over the committed one). */
  bom?: boolean;
}

export interface ImportSpec<Key extends string = string> {
  name: string;
  label: string;
  script: string;
  pinsName: string;
  sourceId: string;
  dataDir: string;
  modulePath: string;
  files: readonly ImportFile<Key>[];
  tableId?: string;
  referencePeriod?: string;
  build: (texts: Record<Key, string>) => string;
}

export interface RunOptions {
  root?: string;
  log?: (line: string) => void;
  /** The day the run takes as today, YYYY-MM-DD (for the next-release line). */
  on?: string;
}

export interface Importer<Key extends string = string> {
  name: string;
  script: string;
  card: SourceCard;
  dataDir: string;
  modulePath: string;
  files: readonly (ImportFile<Key> & { url: string })[];
  header: (note: string) => string[];
  readTexts: (root?: string) => Record<Key, string>;
  checkPins: (root?: string) => string[];
  main: (argv: string[], options?: RunOptions) => Promise<number>;
}

export function defineImport<Key extends string>(spec: ImportSpec<Key>, options?: { cards?: readonly SourceCard[] }): Importer<Key>;
export function runIfMain(importMetaUrl: string, importer: Importer): Promise<void>;
