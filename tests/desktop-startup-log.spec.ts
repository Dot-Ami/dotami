/**
 * The desktop app's log (desktop/log.mjs) keeps what a start wrote even when that start is killed.
 *
 * On 2026-10-08 an update to 0.2.1 started, made its safety copy of the database and stopped before
 * applying anything; logs/server.log had no line from that run, not even "starting DotAmi", because
 * the log was a WriteStream (it opens and writes in the background) while start-up up to the server
 * is synchronous. This replays that start in a separate Node process — the start line, the
 * migrator writing through the log — and kills the process the moment the migrator reports its
 * backup, the point where the real one stopped. The log must still hold every line.
 */
import { spawnSync } from "node:child_process";
import { chmodSync, cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { DatabaseSync } from "node:sqlite";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { migrate } from "../desktop/migrate.mjs";

const root = path.resolve(__dirname, "..");
const migrations = path.join(root, "prisma", "migrations");
const names = readdirSync(migrations, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && existsSync(path.join(migrations, entry.name, "migration.sql")))
  .map((entry) => entry.name)
  .sort();

let dir = "";

beforeEach(() => {
  dir = mkdtempSync(path.join(os.tmpdir(), "dotami-startlog-"));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
});

// The start as desktop/main.mjs does it, up to the migrator, in a process that is killed (on
// Windows, TerminateProcess; elsewhere SIGKILL) as soon as the backup is reported. Nothing after
// the kill runs: no exit handlers, no flushing.
const CHILD = `
import { openLog } from ${JSON.stringify(pathToFileURL(path.join(root, "desktop", "log.mjs")).href)};
import { migrate } from ${JSON.stringify(pathToFileURL(path.join(root, "desktop", "migrate.mjs")).href)};

const [dbFile, migrationsDir, logFile] = process.argv.slice(2);
const log = openLog(logFile);
log.write("\\n--- starting DotAmi 9.9.9 (started by the updater)\\n");
migrate(dbFile, migrationsDir, {
  log: (line) => {
    log.write(line + "\\n");
    if (line.includes("backed up to")) process.kill(process.pid, "SIGKILL");
  },
});
log.write("[desktop] database ready\\n");
`;

describe("a start killed right after its safety copy", () => {
  it("still leaves its start line and the backup line in the log, and nothing applied", () => {
    expect(names.length).toBeGreaterThan(1);

    // A database from an older version: the first migration applied, the rest waiting.
    const older = path.join(dir, "older-migrations");
    mkdirSync(older);
    cpSync(path.join(migrations, names[0]), path.join(older, names[0]), { recursive: true });
    const dbFile = path.join(dir, "dotami.db");
    migrate(dbFile, older);

    const script = path.join(dir, "start.mjs");
    writeFileSync(script, CHILD);
    const logFile = path.join(dir, "logs", "server.log");
    const run = spawnSync(process.execPath, ["--no-warnings", script, dbFile, migrations, logFile], { encoding: "utf8" });

    // The process really was killed, not finished: no exit code, and a backup on disk.
    expect(run.status, run.stderr).not.toBe(0);
    const backups = readdirSync(path.join(dir, "backups"));
    expect(backups).toHaveLength(1);
    expect(backups[0]).toMatch(new RegExp(`^dotami-before-${names[1]}-\\d+\\.db$`));

    // What the log has to show for it.
    expect(existsSync(logFile)).toBe(true);
    const written = readFileSync(logFile, "utf8");
    expect(written).toContain("--- starting DotAmi 9.9.9 (started by the updater)");
    expect(written).toContain(`[migrate] backed up to ${path.join(dir, "backups", backups[0])}`);
    expect(written).not.toContain("database ready");

    // And, as on 2026-10-08, the database itself is untouched: only the first migration recorded.
    const db = new DatabaseSync(dbFile);
    try {
      const rows = db.prepare(`SELECT migration_name FROM "_prisma_migrations"`).all() as { migration_name: string }[];
      expect(rows.map((r) => r.migration_name)).toEqual([names[0]]);
    } finally {
      db.close();
    }
  });

  it("appends to the log a previous run left, line by line, and keeps the server's output too", async () => {
    const { openLog } = await import("../desktop/log.mjs");
    const logFile = path.join(dir, "logs", "server.log");
    mkdirSync(path.dirname(logFile));
    writeFileSync(logFile, "from an earlier run\n");

    const log = openLog(logFile);
    log.write("first\n");
    // On the disk already, before anything else runs.
    expect(readFileSync(logFile, "utf8")).toBe("from an earlier run\nfirst\n");

    const { PassThrough } = await import("node:stream");
    const out = new PassThrough();
    log.follow(out);
    log.follow(null);
    out.write("server says hello\n");
    await new Promise((resolve) => setImmediate(resolve));
    expect(readFileSync(logFile, "utf8")).toBe("from an earlier run\nfirst\nserver says hello\n");
  });
});

// The log is a note, not the data: a log that can't be opened must not stop DotAmi from starting.
// Before this, openLog threw and main.mjs's start() ended in "DotAmi couldn't start."
describe("a log that can't be opened", () => {
  it("gives a log that does nothing when the logs folder is really a file", async () => {
    const { openLog } = await import("../desktop/log.mjs");
    writeFileSync(path.join(dir, "logs"), "not a folder");
    const log = openLog(path.join(dir, "logs", "server.log"));
    expect(log.file).toBe(path.join(dir, "logs", "server.log"));
    expect(() => log.write("still running\n")).not.toThrow();
    expect(() => log.follow(null)).not.toThrow();
    expect(readFileSync(path.join(dir, "logs"), "utf8")).toBe("not a folder");
  });

  // Root can write to a read-only file, so this case only means something for an ordinary user.
  it.skipIf(process.getuid?.() === 0)("gives a log that does nothing when server.log is read-only", async () => {
    const { openLog } = await import("../desktop/log.mjs");
    const logFile = path.join(dir, "logs", "server.log");
    mkdirSync(path.dirname(logFile));
    writeFileSync(logFile, "kept\n");
    chmodSync(logFile, 0o444);
    try {
      const log = openLog(logFile);
      expect(log.file).toBe(logFile);
      expect(() => log.write("still running\n")).not.toThrow();
      expect(readFileSync(logFile, "utf8")).toBe("kept\n");
    } finally {
      chmodSync(logFile, 0o644);
    }
  });
});

describe("describeError", () => {
  it("gives the error's name and code, never its message", async () => {
    const { describeError } = await import("../desktop/log.mjs");
    const error = Object.assign(new Error("secret words 1234"), { code: "EPERM" });
    expect(describeError(error)).toBe("Error, EPERM");
    expect(describeError(new TypeError("x"))).toBe("TypeError, -");
    expect(describeError("a string")).toBe("unknown, -");
    expect(describeError(null)).toBe("unknown, -");
  });
});

describe("desktop/main.mjs", () => {
  const main = readFileSync(path.join(root, "desktop", "main.mjs"), "utf8");

  it("writes its log through desktop/log.mjs, never a stream that writes later", () => {
    expect(main).toMatch(/import \{[^}]*\bopenLog\b[^}]*\} from "\.\/log\.mjs";/);
    expect(main).toMatch(/log = openLog\(path\.join\(logDir, "server\.log"\)\)/);
    expect(main).not.toMatch(/createWriteStream|\.pipe\(log/);
  });

  it("opens the log before the migrator runs, and fail() writes its message there before the dialog", () => {
    expect(main.indexOf("log = openLog(")).toBeGreaterThan(-1);
    expect(main.indexOf("log = openLog(")).toBeLessThan(main.indexOf("migrate(dbFile"));
    const failBody = main.slice(main.indexOf("function fail("));
    expect(failBody.indexOf("log?.write(`[desktop] stopped:")).toBeGreaterThan(-1);
    expect(failBody.indexOf("log?.write(`[desktop] stopped:")).toBeLessThan(failBody.indexOf("dialog.showErrorBox"));
  });

  it("fail() logs only the error's name and code, never the error itself", () => {
    const start = main.indexOf("function fail(");
    const failBody = main.slice(start, main.indexOf("dialog.showErrorBox", start));
    const line = failBody.slice(failBody.indexOf("log?.write(`[desktop] stopped:"));
    expect(line).toContain("describeError(error)");
    expect(line).not.toMatch(/\$\{error\}|String\(error\)/);
  });

  it("ships every file of its own that it imports (desktop/package.mjs copies a fixed list)", () => {
    const own = [...main.matchAll(/from "\.\/([\w.-]+)"/g)].map((m) => m[1]);
    expect(own).toEqual(expect.arrayContaining(["log.mjs", "update-notice.mjs", "migrate.mjs", "backup.mjs"]));
    const packaging = readFileSync(path.join(root, "desktop", "package.mjs"), "utf8");
    const list = packaging.match(/for \(const f of \[([^\]]+)\]\)/);
    expect(list, "desktop/package.mjs no longer lists the files it ships the way this test reads").not.toBeNull();
    const shipped = [...list![1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
    for (const file of own) expect(shipped, `${file} is imported by main.mjs but not shipped`).toContain(file);
  });
});
