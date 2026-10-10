// [8i] Types for the part of `better-sqlite3` DotAmi uses. The package behind that name is
// better-sqlite3-multiple-ciphers (package.json); it ships full types in index.d.ts, but its "exports"
// map doesn't name them, so TypeScript can't reach them by the package's name. Only what DotAmi
// calls is described here: a new use adds its line.
declare module "better-sqlite3" {
  namespace Database {
    interface RunResult {
      changes: number;
      lastInsertRowid: number | bigint;
    }
    interface Statement {
      run(...params: unknown[]): RunResult;
      get(...params: unknown[]): unknown;
      all(...params: unknown[]): unknown[];
      raw(toggle?: boolean): this;
    }
    interface Options {
      readonly?: boolean;
      fileMustExist?: boolean;
      timeout?: number;
    }
    interface Database {
      readonly open: boolean;
      readonly inTransaction: boolean;
      readonly name: string;
      prepare(sql: string): Statement;
      /** Runs one or more SQL statements (SQLite's own, never a program). */
      exec(sql: string): this;
      pragma(sql: string, options?: { simple?: boolean }): unknown;
      serialize(options?: { attached?: string }): Buffer;
      close(): this;
    }
  }
  interface DatabaseConstructor {
    new (filename?: string | Buffer, options?: Database.Options): Database.Database;
    (filename?: string | Buffer, options?: Database.Options): Database.Database;
  }
  const Database: DatabaseConstructor;
  export = Database;
}
