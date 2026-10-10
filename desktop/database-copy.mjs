// [8i] Writing a data file's contents into a new, encrypted file, and checking that two copies hold the
// same thing (docs/architecture/database-encryption.md § 6, steps 2 and 3).
//
// The encrypted copy is written by SQLite itself, straight into a file opened with the key: the source
// (a plain file, or a page image held in memory) is the main database of a connection, the new file is
// attached to it with its key, and every table, its rows and its indexes are copied across. So no
// second plain copy is ever written to the disk. (Measured 2026-10-10 with SQLite3 Multiple Ciphers
// 2.4.0: `VACUUM INTO` and the backup API can't write a plain source into a keyed file, and there is no
// `sqlcipher_export`; an attached keyed file can be written, from a file or from memory.)
import { closeSync, fsyncSync, openSync } from "node:fs";
import { createHash } from "node:crypto";

import { keyPragma, runSql } from "./sqlite.mjs";

/** SQLite's own tables (sqlite_sequence, sqlite_stat1…) are made and kept by SQLite, never copied by hand. */
const OWN = /^sqlite_/;

/**
 * The tables and indexes of `schema` on `db`, as SQLite keeps their definitions: { tables, others }, each
 * { type, name, sql } in the order SQLite lists them. Views and triggers would be in `others`; DotAmi's
 * migrations make none.
 */
function objectsOf(db, schema) {
  const rows = db.prepare(`SELECT type, name, tbl_name, sql FROM "${schema}".sqlite_master WHERE sql IS NOT NULL ORDER BY rowid`).all();
  const own = rows.filter((r) => !OWN.test(r.name));
  return { tables: own.filter((r) => r.type === "table"), others: own.filter((r) => r.type !== "table") };
}

/** A CREATE statement made to create its object in the attached schema `into` instead of in main. */
function intoSchema(sql, into) {
  const m = sql.match(/^CREATE\s+(TABLE|UNIQUE\s+INDEX|INDEX|VIEW|TRIGGER)\s+(IF\s+NOT\s+EXISTS\s+)?/i);
  if (!m) throw new Error("a schema object DotAmi can't copy");
  return `${m[0]}"${into}".${sql.slice(m[0].length)}`;
}

/** Quotes an SQLite name. */
const q = (name) => `"${String(name).replace(/"/g, '""')}"`;

/**
 * Copies everything in `source`'s main database into a new file at `target`, encrypted with `key`, then
 * flushes the new file to the disk. `target` must not exist. `source` is an open connection (a plain
 * file, or an image in memory) that may create files: SQLite opens an attached file with the main file's
 * flags, so a connection opened with fileMustExist can't create the copy. `source` isn't changed.
 * Foreign keys are off on `source` while copying (rows go in table by table), and the copy is checked
 * afterwards (contentsOf, differences).
 * @param {any} source
 * @param {string} target
 * @param {Buffer} key
 */
export function copyIntoKeyedFile(source, target, key) {
  const ATTACHED = "dotami_encrypted";
  const fk = source.pragma("foreign_keys", { simple: true });
  source.pragma("foreign_keys = OFF");
  // The key goes in as SQL text, in the form SQLite3 Multiple Ciphers reads as a raw key.
  source.prepare(`ATTACH DATABASE ? AS ${ATTACHED} KEY ${keyPragma(key).slice("key = ".length)}`).run(target);
  try {
    const { tables, others } = objectsOf(source, "main");
    runSql(source, "BEGIN IMMEDIATE");
    try {
      for (const t of tables) runSql(source, intoSchema(t.sql, ATTACHED));
      for (const t of tables) runSql(source, `INSERT INTO ${ATTACHED}.${q(t.name)} SELECT * FROM main.${q(t.name)}`);
      for (const o of others) runSql(source, intoSchema(o.sql, ATTACHED));
      for (const pragma of ["user_version", "application_id"]) {
        const value = Number(source.pragma(pragma, { simple: true }));
        runSql(source, `PRAGMA ${ATTACHED}.${pragma} = ${Number.isInteger(value) ? value : 0}`);
      }
      runSql(source, "COMMIT");
    } catch (error) {
      runSql(source, "ROLLBACK");
      throw error;
    }
  } finally {
    runSql(source, `DETACH DATABASE ${ATTACHED}`);
    source.pragma(`foreign_keys = ${fk ? "ON" : "OFF"}`);
  }
  flushFile(target);
}

/** Flushes a file's bytes to the disk (fsync). */
export function flushFile(file) {
  const fd = openSync(file, "r+");
  try {
    fsyncSync(fd);
  } finally {
    closeSync(fd);
  }
}

/** A value made comparable as text: whole numbers as BigInt text, bytes as hex, null as null. */
function normal(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === "bigint") return `i:${value}`;
  if (typeof value === "number") return Number.isInteger(value) ? `i:${value}` : `r:${value}`;
  if (Buffer.isBuffer(value)) return `b:${value.toString("hex")}`;
  return `t:${value}`;
}

/**
 * What a database holds, table by table, for comparing two copies: each table's definition, its row
 * count and a SHA-256 over its rows in primary-key order (rowid order when it has none); and the
 * definitions of its indexes. Values are compared exactly (whole numbers as whole numbers, text as text).
 * @param {any} db an open connection
 */
export function contentsOf(db) {
  const { tables, others } = objectsOf(db, "main");
  const out = { tables: {}, others: others.map((o) => `${o.type}:${o.name}:${o.sql}`) };
  for (const t of tables) {
    const keys = db
      .prepare(`SELECT name, pk FROM pragma_table_info(?) WHERE pk > 0 ORDER BY pk`)
      .all(t.name)
      .map((c) => q(c.name));
    const order = keys.length ? keys.join(", ") : "rowid";
    const hash = createHash("sha256");
    let rows = 0;
    const statement = db.prepare(`SELECT * FROM main.${q(t.name)} ORDER BY ${order}`);
    statement.safeIntegers(true);
    for (const row of statement.raw(true).iterate()) {
      hash.update(JSON.stringify(row.map(normal)));
      hash.update("\n");
      rows += 1;
    }
    out.tables[t.name] = { sql: t.sql, rows, sha256: hash.digest("hex") };
  }
  return out;
}

/**
 * The differences between two databases' contents (contentsOf), as plain sentences; empty when they
 * hold the same tables, rows and indexes.
 */
export function differences(a, b) {
  const found = [];
  const names = new Set([...Object.keys(a.tables), ...Object.keys(b.tables)]);
  for (const name of [...names].sort()) {
    const x = a.tables[name];
    const y = b.tables[name];
    if (!x || !y) found.push(`table ${name} is only in one copy`);
    else if (x.sql !== y.sql) found.push(`table ${name} is defined differently`);
    else if (x.rows !== y.rows) found.push(`table ${name} has ${x.rows} rows in one copy and ${y.rows} in the other`);
    else if (x.sha256 !== y.sha256) found.push(`table ${name}'s rows differ`);
  }
  if (JSON.stringify([...a.others].sort()) !== JSON.stringify([...b.others].sort())) found.push("the indexes differ");
  return found;
}
