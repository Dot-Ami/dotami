/**
 * The database library's own error report must not reach the log. For a request built wrongly,
 * Prisma's report quotes the values in it, and the desktop app copies stdout and stderr into
 * logs/server.log — which is rule 2 of docs/architecture/figures-privacy-review.md ("no figure
 * values in logs") broken by a library, not by DotAmi's own code. lib/prisma.ts therefore turns
 * the report into an event and prints one fixed line.
 *
 * The write runs in a separate process (tests/helpers/malformed-write.ts) so what is checked is
 * the real stdout and stderr, not whatever the test runner lets through.
 */
import { execFileSync, spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { FOLDERS } from "@/lib/privacy/inventory";

const dbFile = path.join(tmpdir(), `dotami-prisma-log-test-${randomUUID()}.db`);
const url = `file:${dbFile.replace(/\\/g, "/")}`;

// An invented value that appears nowhere else, standing in for a figure or a sentence the person typed.
const MARKER = `invented-marker-${randomUUID()}`;

beforeAll(() => {
  const prismaCli = path.join(process.cwd(), "node_modules", "prisma", "build", "index.js");
  execFileSync(process.execPath, [prismaCli, "migrate", "deploy"], {
    env: { ...process.env, DATABASE_URL: url },
    stdio: "pipe",
  });
}, 120_000);

afterAll(() => {
  for (const f of [dbFile, `${dbFile}-journal`]) {
    if (existsSync(f)) rmSync(f);
  }
});

describe("the database client's error report", () => {
  it("never carries what was being written to stdout or stderr", () => {
    const tsxCli = path.join(process.cwd(), "node_modules", "tsx", "dist", "cli.mjs");
    const script = path.join(process.cwd(), "tests", "helpers", "malformed-write.ts");
    const run = spawnSync(process.execPath, [tsxCli, script], {
      env: { ...process.env, DATABASE_URL: url, PRIVACY_TEST_MARKER: MARKER },
      encoding: "utf8",
      timeout: 60_000,
    });

    // The write did fail, and the error given back to the caller does quote the marker: so the
    // marker is missing from the streams because of the client's setup, not because nothing went wrong.
    expect(run.status, run.stderr).toBe(0);
    expect(run.stdout).toContain("thrown-error-quotes-the-marker: true");

    expect(run.stdout, "the library's report quoted the value on stdout").not.toContain(MARKER);
    expect(run.stderr, "the library's report quoted the value on stderr").not.toContain(MARKER);
    // Nor any of the other values or field names the library's message quotes.
    for (const quoted of ["12345", "userId", "saidAt", "invocation"]) {
      expect(run.stdout + run.stderr, `the report quotes "${quoted}"`).not.toContain(quoted);
    }

    // What is written instead: one line on stderr, naming only where the error came from, and
    // nothing else on stdout but the script's own sentinel.
    expect(run.stderr.trim().split(/\r?\n/)).toEqual([
      "[database] the database library reported an error (personStatement.create)",
    ]);
    expect(run.stdout.trim()).toBe("thrown-error-quotes-the-marker: true");
  }, 90_000);

  it("is described on /your-data as it now is: switched off, replaced by one fixed line", () => {
    // The page draws the log's description from the inventory (lib/privacy/inventory.ts).
    const log = FOLDERS.find((f) => f.id === "log")!.holds;
    expect(log).toContain("switched off");
    expect(log).toContain("one fixed line");
    expect(log).not.toMatch(/prints its own error report/);
  });
});
