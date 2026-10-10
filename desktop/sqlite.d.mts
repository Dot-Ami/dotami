// Types for desktop/sqlite.mjs, so the TypeScript tests can import it.
import type Database from "better-sqlite3";

export function useSqliteFrom(folder: string): void;
export function keyPragma(key: Buffer): string;
export class CannotOpenDatabase extends Error {
  keyed: boolean;
}
export function openDatabase(file: string, options?: { key?: Buffer | null; readonly?: boolean; fileMustExist?: boolean }): Database.Database;
export function openImage(image: Buffer): Database.Database;
export function runSql(db: Database.Database, sql: string): Database.Database;
export function fileKind(file: string): "absent" | "plain" | "encrypted";
