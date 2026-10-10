/**
 * [8i] The database package is the one that was reviewed, and only that one.
 *
 * Prisma's adapter asks for `better-sqlite3`; DotAmi gives it better-sqlite3-multiple-ciphers under that
 * name (package.json: an npm alias in "dependencies" and an "overrides" entry pointing the adapter's
 * own requirement at it). The real better-sqlite3 has no encryption and downloads its binary when it
 * installs (`prebuild-install || node-gyp rebuild`), a network call DotAmi's source scan can't see. If
 * the override ever lapsed (a lockfile that drifted, a nested version range), that unreviewed package
 * would be installed and shipped. These checks fail first (docs/architecture/database-encryption.md § 3,
 * docs/connectors/better-sqlite3-multiple-ciphers-review.md).
 */
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

import { describe, expect, it } from "vitest";

const root = process.cwd();
const REVIEWED = { name: "better-sqlite3-multiple-ciphers", version: "13.0.3" };
const ADAPTER = "6.19.3";

type LockEntry = { name?: string; version?: string; resolved?: string; hasInstallScript?: boolean; dependencies?: Record<string, string> };
type Lockfile = { packages: Record<string, LockEntry> };

/**
 * What is wrong with a lockfile's database packages: every installed `better-sqlite3`, at any depth, must
 * be the reviewed package at the reviewed version, from npm's own address for it; nothing may install
 * prebuild-install (the real better-sqlite3's downloader) or have an install script of its own.
 */
function lockfileProblems(lock: Lockfile): string[] {
  const problems: string[] = [];
  const tarball = `https://registry.npmjs.org/${REVIEWED.name}/-/${REVIEWED.name}-${REVIEWED.version}.tgz`;
  let found = 0;
  for (const [where, entry] of Object.entries(lock.packages)) {
    if (/(^|\/)node_modules\/prebuild-install$/.test(where)) problems.push(`${where} is installed`);
    if (/(^|\/)node_modules\/better-sqlite3$/.test(where)) {
      found += 1;
      if (entry.name !== REVIEWED.name || entry.version !== REVIEWED.version || entry.resolved !== tarball) {
        problems.push(`${where} is ${entry.name ?? "better-sqlite3"} ${entry.version} from ${entry.resolved}`);
      }
      if (entry.hasInstallScript) problems.push(`${where} has an install script`);
    }
  }
  if (found !== 1) problems.push(`better-sqlite3 is installed ${found} times (once expected)`);
  return problems;
}

const lock = JSON.parse(readFileSync(path.join(root, "package-lock.json"), "utf8")) as Lockfile;
const manifest = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8")) as {
  dependencies: Record<string, string>;
  overrides: Record<string, string>;
};

describe("the database package", () => {
  it("package.json pins the reviewed package under the adapter's name, and points the adapter's own requirement at it", () => {
    expect(manifest.dependencies["better-sqlite3"]).toBe(`npm:${REVIEWED.name}@${REVIEWED.version}`);
    expect(manifest.overrides["better-sqlite3"]).toBe("$better-sqlite3");
    // The adapter is pinned too, at the version of Prisma it was read with.
    expect(manifest.dependencies["@prisma/adapter-better-sqlite3"]).toBe(ADAPTER);
    expect(JSON.parse(readFileSync(path.join(root, "node_modules", "@prisma", "client", "package.json"), "utf8")).version).toBe(ADAPTER);
  });

  it("the lockfile installs it once, from npm, with no downloader and no install script", () => {
    expect(lockfileProblems(lock)).toEqual([]);
    expect(lock.packages["node_modules/@prisma/adapter-better-sqlite3"]?.version).toBe(ADAPTER);
  });

  it("the check fails on a lockfile where the override lapsed (the control)", () => {
    // What npm writes when the adapter's ^11.9.0 is no longer overridden: the real package nested under it.
    const lapsed: Lockfile = {
      packages: {
        ...lock.packages,
        "node_modules/@prisma/adapter-better-sqlite3/node_modules/better-sqlite3": {
          version: "11.10.0",
          resolved: "https://registry.npmjs.org/better-sqlite3/-/better-sqlite3-11.10.0.tgz",
          hasInstallScript: true,
          dependencies: { bindings: "^1.5.0", "prebuild-install": "^7.1.1" },
        },
        "node_modules/prebuild-install": { version: "7.1.3" },
      },
    };
    expect(lockfileProblems(lapsed)).toEqual([
      "node_modules/@prisma/adapter-better-sqlite3/node_modules/better-sqlite3 is better-sqlite3 11.10.0 from https://registry.npmjs.org/better-sqlite3/-/better-sqlite3-11.10.0.tgz",
      "node_modules/@prisma/adapter-better-sqlite3/node_modules/better-sqlite3 has an install script",
      "node_modules/prebuild-install is installed",
      "better-sqlite3 is installed 2 times (once expected)",
    ]);
  });

  it("the adapter, asking for better-sqlite3 from its own folder, gets the reviewed package, and it has the encryption extension", () => {
    const fromAdapter = createRequire(require.resolve("@prisma/adapter-better-sqlite3"));
    const found = JSON.parse(readFileSync(fromAdapter.resolve("better-sqlite3/package.json"), "utf8")) as { name: string; version: string };
    expect(found).toMatchObject(REVIEWED);
    // Loaded, it is SQLite with SQLite3 Multiple Ciphers (the plain package has no sqlite3mc_version).
    const Database = fromAdapter("better-sqlite3") as typeof import("better-sqlite3");
    const db = new Database(":memory:");
    try {
      expect(db.prepare("SELECT sqlite_version() AS sqlite, sqlite3mc_version() AS ciphers").get()).toEqual({
        sqlite: "3.53.4",
        ciphers: "SQLite3 Multiple Ciphers 2.4.0",
      });
    } finally {
      db.close();
    }
  });
});
