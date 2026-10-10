/**
 * [8i] Throwaway data files for the database tests: migrated by Prisma's own `migrate deploy` (the
 * referee the migrator is checked against), plain, and encrypted in place with a key the way the
 * desktop app's key would lock them (docs/architecture/database-encryption.md).
 */
import { execFileSync } from "node:child_process";
import { closeSync, openSync, readSync } from "node:fs";
import path from "node:path";

import Database from "better-sqlite3";

import { keyPragma } from "@/lib/db/client";

const prismaCli = path.join(process.cwd(), "node_modules", "prisma", "build", "index.js");

/** The `file:` URL Prisma and DotAmi's database client read, with forward slashes on every system. */
export function fileUrl(file: string): string {
  return `file:${file.replace(/\\/g, "/")}`;
}

/** A new data file at `file`, with every migration applied, and nothing in it. */
export function migratedFile(file: string): string {
  execFileSync(process.execPath, [prismaCli, "migrate", "deploy"], {
    env: { ...process.env, DATABASE_URL: fileUrl(file), CHECKPOINT_DISABLE: "1" },
    stdio: "pipe",
  });
  return file;
}

/** Encrypts a plain data file in place with `key` (SQLite3 Multiple Ciphers' rekey). */
export function encryptInPlace(file: string, key: Buffer): void {
  const db = new Database(file);
  try {
    db.pragma(`re${keyPragma(key)}`);
  } finally {
    db.close();
  }
}

/** Whether a file starts the way every plain SQLite file does ("SQLite format 3" and a zero byte). */
export function looksPlain(file: string): boolean {
  const head = Buffer.alloc(16);
  const fd = openSync(file, "r");
  try {
    readSync(fd, head, 0, 16, 0);
  } finally {
    closeSync(fd);
  }
  return head.equals(Buffer.from("SQLite format 3\0", "latin1"));
}
