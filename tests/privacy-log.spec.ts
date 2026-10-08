import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * docs/privacy-log.md is the running record the privacy policy and terms will be written from:
 * what each version keeps, sends, ships and asks. These tests make it hard to ship a version
 * without its section: a release bumps package.json's version, and this fails until the log
 * has a section for it.
 */

const repo = path.resolve(__dirname, "..");
const read = (file: string) => readFileSync(path.join(repo, file), "utf8");

const log = read("docs/privacy-log.md");
const version = (JSON.parse(read("package.json")) as { version: string }).version;

// "## [0.2.1] — 2026-10-08" → "0.2.1"; "## [Unreleased]" → "Unreleased".
const headings = (text: string) => [...text.matchAll(/^## \[([^\]]+)\]/gm)].map((match) => match[1]);

// The text of one "## [name]" section, up to the next one.
function section(name: string): string {
  const start = log.indexOf(`## [${name}]`);
  if (start < 0) return "";
  const next = log.indexOf("\n## [", start + 1);
  return log.slice(start, next < 0 ? undefined : next);
}

describe("the privacy log", () => {
  it("opens with [Unreleased], where the next change is written down", () => {
    expect(headings(log)[0]).toBe("Unreleased");
  });

  it("has a section for the version in package.json (bump the version, write its section)", () => {
    expect(headings(log), `docs/privacy-log.md has no "## [${version}]" section`).toContain(version);
  });

  it("has a section for every version in the changelog", () => {
    const released = headings(read("CHANGELOG.md")).filter((name) => name !== "Unreleased");
    expect(released.length).toBeGreaterThan(0);
    expect(released.filter((name) => !headings(log).includes(name))).toEqual([]);
  });

  it("lists the newest version first, like the changelog", () => {
    const versions = headings(log).filter((name) => name !== "Unreleased");
    const order = (name: string) => name.split(/[.-]/).map((part) => Number.parseInt(part, 10) || 0);
    const sorted = [...versions].sort((a, b) => {
      const [x, y] = [order(a), order(b)];
      for (let i = 0; i < Math.max(x.length, y.length); i++) if ((x[i] ?? 0) !== (y[i] ?? 0)) return (y[i] ?? 0) - (x[i] ?? 0);
      return 0;
    });
    expect(versions).toEqual(sorted);
  });

  it("gives every released version the parts the policy will be written from", () => {
    const parts = [
      "### What DotAmi keeps, and where",
      "### What leaves the computer, and to whom",
      "### Packages that ship",
      "### New powers or permissions",
      "### What the person must agree to",
      "### How to remove it",
      "### What the policy will need to say",
    ];
    const versions = headings(log).filter((name) => name !== "Unreleased");
    const missing = versions.flatMap((name) => parts.filter((part) => !section(name).includes(part)).map((part) => `${name}: ${part}`));
    expect(missing).toEqual([]);
  });
});
