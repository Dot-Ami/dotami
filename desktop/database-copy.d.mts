// Types for desktop/database-copy.mjs, so the TypeScript tests can import it.
import type Database from "better-sqlite3";

export interface DatabaseContents {
  tables: Record<string, { sql: string; rows: number; sha256: string }>;
  others: string[];
}
export function copyIntoKeyedFile(source: Database.Database, target: string, key: Buffer): void;
export function copyIntoPlainFile(source: Database.Database, target: string): void;
export function flushFile(file: string): void;
export function contentsOf(db: Database.Database): DatabaseContents;
export function differences(a: DatabaseContents, b: DatabaseContents): string[];
