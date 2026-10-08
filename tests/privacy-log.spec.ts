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

// Newest first, the way the changelog lists versions. The numbers compare first; for the same
// numbers a final release ("0.2.2") ranks above its pre-releases ("0.2.2-dev.1"), which compare by
// their own dot-separated parts (numbers as numbers), as semver orders them.
function newerFirst(a: string, b: string): number {
  const [coreA, preA] = splitVersion(a);
  const [coreB, preB] = splitVersion(b);
  for (let i = 0; i < 3; i++) if (coreA[i] !== coreB[i]) return coreB[i] - coreA[i];
  if (preA === preB) return 0;
  if (preA === "") return -1;
  if (preB === "") return 1;
  const [x, y] = [preA.split("."), preB.split(".")];
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    if (x[i] === y[i]) continue;
    if (x[i] === undefined) return 1; // fewer parts is older: 1.0.0-dev < 1.0.0-dev.1
    if (y[i] === undefined) return -1;
    const [m, n] = [Number(x[i]), Number(y[i])];
    if (Number.isInteger(m) && Number.isInteger(n)) return n - m;
    return y[i] < x[i] ? -1 : 1;
  }
  return 0;
}

function splitVersion(name: string): [number[], string] {
  const dash = name.indexOf("-");
  const core = dash < 0 ? name : name.slice(0, dash);
  const parts = core.split(".").map((part) => Number.parseInt(part, 10) || 0);
  return [[parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0], dash < 0 ? "" : name.slice(dash + 1)];
}

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
    expect(versions).toEqual([...versions].sort(newerFirst));
  });

  it("orders a pre-release below its final release (the release steps bump to 0.2.0-dev.1 first)", () => {
    expect(["0.2.1", "0.2.2-dev.1", "0.2.2", "0.10.0"].sort(newerFirst)).toEqual(["0.10.0", "0.2.2", "0.2.2-dev.1", "0.2.1"]);
    expect(["0.3.0-dev.2", "0.3.0-dev.10", "0.3.0-dev", "0.3.0-alpha.1"].sort(newerFirst)).toEqual([
      "0.3.0-dev.10",
      "0.3.0-dev.2",
      "0.3.0-dev",
      "0.3.0-alpha.1",
    ]);
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
    // A heading with nothing under it doesn't count: renaming [Unreleased] and leaving its parts
    // bare would pass the check above. Each part's text runs to the next "### " heading.
    const empty = versions.flatMap((name) =>
      parts
        .filter((part) => {
          const text = section(name);
          const start = text.indexOf(part) + part.length;
          const end = text.indexOf("\n### ", start);
          return text.slice(start, end < 0 ? undefined : end).replace(/^---$/gm, "").trim() === "";
        })
        .map((part) => `${name}: ${part}`),
    );
    expect(empty, "these parts have a heading but nothing under it").toEqual([]);
  });
});
