/**
 * The third-party notices (THIRD-PARTY-NOTICES.txt, desktop/notices.mjs): one entry, with the
 * licence word for word, for everything by someone else that ships with DotAmi.
 *
 * What fails here:
 *   - a package in a node_modules folder that ships has no entry (or an entry for another version):
 *     missingFromNotices, the check desktop/package.mjs runs over the installed app's server and
 *     app folders before it packages anything;
 *   - a package that ships has no licence file and nobody has said where its terms are;
 *   - a package the bundled code imports (app/, components/, lib/, middleware) or the style sheet
 *     imports isn't in the list, even one package.json calls a development tool: Next bundles it;
 *   - desktop/package.mjs copies a package into the installed app that the notices don't follow;
 *   - a package's third-party notice file (TypeScript's ThirdPartyNoticeText.txt) is left out;
 *   - the file the generator writes can't be read back by the /licences page, or two entries in one
 *     section of it share a name and version.
 * The installer's real list (the built server's node_modules) is checked by e2e-desktop/desktop.spec.ts
 * on the build it starts, and again by desktop/package.mjs on every package.
 */
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";

import {
  collectNotices,
  dependencyClosure,
  DESKTOP_APP_PACKAGES,
  formatNotices,
  LICENCE_ELSEWHERE,
  licenceElsewhere,
  licenceFiles,
  missingFromNotices,
  packagesIn,
  productionPackages,
  SEPARATOR,
} from "../desktop/notices.mjs";
import { NOTICES_FILE, parseNotices, readNotices } from "@/lib/licences/notices";

import { importedModules, moduleName, readSource, rootSourceFiles, sourceFiles, SOURCE_FILES } from "./helpers/source-scan";

const ROOT = process.cwd();
const temp = mkdtempSync(path.join(tmpdir(), "dotami-notices-"));
afterAll(() => rmSync(temp, { recursive: true, force: true }));

/** Writes a package folder: package.json, plus a LICENSE unless `licence` is null. */
function fakePackage(nodeModules: string, name: string, version: string, opts: { licence?: string | null; deps?: Record<string, string> } = {}) {
  const dir = path.join(nodeModules, name);
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, "package.json"), JSON.stringify({ name, version, license: "MIT", dependencies: opts.deps ?? {} }));
  if (opts.licence !== null) writeFileSync(path.join(dir, "LICENSE"), opts.licence ?? `Copyright (c) the ${name} authors\n\nPermission is hereby granted…`);
  return dir;
}

/** A checkout-shaped folder with the pieces collectNotices always reads (Tailwind, the two fonts). */
function fakeCheckout(name: string, dependencies: Record<string, string>) {
  const root = path.join(temp, name);
  const modules = path.join(root, "node_modules");
  mkdirSync(path.join(root, "app", "fonts"), { recursive: true });
  writeFileSync(path.join(root, "package.json"), JSON.stringify({ name: "dotami", version: "9.9.9", dependencies }));
  writeFileSync(path.join(root, "app", "fonts", "LICENSE-Inter.txt"), "Inter: SIL Open Font License 1.1");
  writeFileSync(path.join(root, "app", "fonts", "LICENSE-JetBrainsMono.txt"), "JetBrains Mono: SIL Open Font License 1.1");
  fakePackage(modules, "tailwindcss", "4.0.0");
  return { root, modules };
}

describe("missingFromNotices: a package that ships with no entry stops the installer", () => {
  const modules = path.join(temp, "shipped", "node_modules");
  fakePackage(modules, "listed", "1.0.0");
  fakePackage(modules, "@scope/listed", "2.0.0");
  fakePackage(path.join(modules, "listed", "node_modules"), "nested", "3.0.0");
  /** A notices file listing these name@version pairs (a scoped name keeps its leading @). */
  const notices = (keys: string[]) =>
    formatNotices(
      keys.map((key) => {
        const at = key.lastIndexOf("@");
        return { kind: "package" as const, name: key.slice(0, at), version: key.slice(at + 1), licence: "MIT", ships: new Set(["the test"]), texts: [{ file: "LICENSE", text: "MIT" }] };
      }),
      { version: "0.0.0", desktop: true },
    );

  it("finds every package in the folder, scoped and nested ones too", () => {
    expect(packagesIn(modules).map((p) => `${p.name}@${p.version}`).sort()).toEqual(["@scope/listed@2.0.0", "listed@1.0.0", "nested@3.0.0"]);
  });

  it("is empty when each one is listed", () => {
    expect(missingFromNotices(notices(["listed@1.0.0", "@scope/listed@2.0.0", "nested@3.0.0"]), [modules])).toEqual([]);
  });

  it("names a package the file doesn't list", () => {
    expect(missingFromNotices(notices(["listed@1.0.0", "@scope/listed@2.0.0"]), [modules])).toEqual(["nested@3.0.0"]);
  });

  it("counts an entry for another version as missing: the licence can change between versions", () => {
    expect(missingFromNotices(notices(["listed@0.9.0", "@scope/listed@2.0.0", "nested@3.0.0"]), [modules])).toEqual(["listed@1.0.0"]);
  });

  it("skips the folders that aren't packages (.bin, and .prisma, generated from DotAmi's own schema)", () => {
    mkdirSync(path.join(modules, ".prisma", "client"), { recursive: true });
    writeFileSync(path.join(modules, ".prisma", "client", "package.json"), JSON.stringify({ name: ".prisma/client", version: "0.0.0" }));
    expect(missingFromNotices(notices(["listed@1.0.0", "@scope/listed@2.0.0", "nested@3.0.0"]), [modules])).toEqual([]);
  });

  it("reads only an entry's own Name and Version lines, never ones inside a licence text", () => {
    const text = formatNotices(
      [
        {
          kind: "package" as const,
          name: "listed",
          version: "1.0.0",
          licence: "MIT",
          ships: new Set(["the test"]),
          texts: [{ file: "LICENSE", text: "Some licence\nName: nested\nVersion: 3.0.0\nName: @scope/listed\nVersion: 2.0.0" }],
        },
      ],
      { version: "0.0.0", desktop: true },
    );
    // The entry itself is read (listed is not missing)…
    expect(missingFromNotices(text, [modules])).not.toContain("listed@1.0.0");
    // …and the two packages named only inside its licence text still are.
    expect(missingFromNotices(text, [modules])).toEqual(["@scope/listed@2.0.0", "nested@3.0.0"]);
  });
});

describe("collectNotices: what the generator lists, and what stops it", () => {
  it("follows dependencies (not peers), takes each licence word for word, and adds the fonts and Tailwind", () => {
    const { root, modules } = fakeCheckout("follows", { app: "1.0.0" });
    fakePackage(modules, "app", "1.0.0", { deps: { helper: "1" }, licence: "Copyright (c) app authors\nMIT terms" });
    fakePackage(modules, "helper", "2.0.0");
    // A peer that happens to be installed (as next's @playwright/test is) is not a dependency.
    writeFileSync(
      path.join(modules, "app", "package.json"),
      JSON.stringify({ name: "app", version: "1.0.0", license: "MIT", dependencies: { helper: "1" }, peerDependencies: { tool: "1" } }),
    );
    fakePackage(modules, "tool", "1.0.0");
    const entries = collectNotices(root);
    expect(entries.map((e) => `${e.kind}:${e.name}`)).toEqual([
      "package:app",
      "package:helper",
      "package:tailwindcss",
      "font:Inter (font)",
      "font:JetBrains Mono (font)",
    ]);
    expect(entries[0].texts).toEqual([{ file: "LICENSE", text: "Copyright (c) app authors\nMIT terms" }]);
  });

  it("takes a package's third-party notice and copyright notice files as well as its licence", () => {
    const { root, modules } = fakeCheckout("third-party", { compiler: "1.0.0" });
    const dir = fakePackage(modules, "compiler", "1.0.0", { licence: "Apache License 2.0" });
    writeFileSync(path.join(dir, "ThirdPartyNoticeText.txt"), "Third party notices: code from others, with their copyright lines");
    writeFileSync(path.join(dir, "CopyrightNotice.txt"), "Copyright (c) the compiler authors");
    writeFileSync(path.join(dir, "THIRD-PARTY-NOTICES.md"), "More notices");
    writeFileSync(path.join(dir, "notices.d.ts"), "export {}"); // code, not a notice
    const entry = collectNotices(root).find((e) => e.name === "compiler")!;
    expect(entry.texts.map((t: { file: string }) => t.file)).toEqual(["CopyrightNotice.txt", "LICENSE", "THIRD-PARTY-NOTICES.md", "ThirdPartyNoticeText.txt"]);
  });

  it("refuses a package that ships with no licence file, naming it", () => {
    const { root, modules } = fakeCheckout("no-licence", { app: "1.0.0" });
    fakePackage(modules, "app", "1.0.0", { deps: { "quiet-helper": "1" } });
    fakePackage(modules, "quiet-helper", "1.0.0", { licence: null });
    expect(() => collectNotices(root)).toThrow(/quiet-helper 1\.0\.0[\s\S]*LICENCE_ELSEWHERE/);
  });

  it("copies a README's Licensing section when LICENCE_ELSEWHERE says that is where the terms are", () => {
    const { root, modules } = fakeCheckout("readme", { "@img/sharp-libvips-test": "1.0.0" });
    const dir = fakePackage(modules, "@img/sharp-libvips-test", "1.0.0", { licence: null });
    writeFileSync(path.join(dir, "README.md"), "# libvips\n\nIntro.\n\n## Licensing\n\n| libvips | LGPLv3 |\n\n## Other\n\nNot this.\n");
    const entry = collectNotices(root).find((e) => e.name === "@img/sharp-libvips-test")!;
    expect(entry.note).toContain("LGPL-3.0-or-later");
    expect(entry.texts).toEqual([{ file: 'README.md (its "Licensing" section)', text: "## Licensing\n\n| libvips | LGPLv3 |" }]);
  });

  it("every LICENCE_ELSEWHERE key names packages DotAmi installs, and none of those has a licence file (no stale excuses)", () => {
    const lock = JSON.parse(readFileSync(path.join(ROOT, "package-lock.json"), "utf8")) as { packages: Record<string, unknown> };
    const locked = Object.keys(lock.packages).map((k) => k.replace(/^.*node_modules\//, ""));
    for (const [key, { why }] of Object.entries(LICENCE_ELSEWHERE)) {
      expect(why.length, key).toBeGreaterThan(40);
      // On any computer: the lock file names a package the key covers (each platform installs its own build).
      expect(locked.some((name) => licenceElsewhere(name) === LICENCE_ELSEWHERE[key] && (key.endsWith("*") ? name.startsWith(key.slice(0, -1)) : name === key)), key).toBe(true);
    }
    // On this computer: each installed package an entry covers really has no licence file.
    const installed = [...productionPackages(ROOT), ...dependencyClosure(ROOT, DESKTOP_APP_PACKAGES, { copied: true })];
    const covered = installed.filter((p) => licenceElsewhere(p.name));
    expect(covered.length).toBeGreaterThan(3);
    for (const p of covered) expect(licenceFiles(path.join(ROOT, "node_modules", p.rel)), p.name).toEqual([]);
  });
});

describe("the list for this checkout", () => {
  const entries = collectNotices(ROOT);
  const listed = new Set(entries.map((e) => e.name));

  it("lists DotAmi's dependencies with a licence text each, and the packages named in the task by name", () => {
    for (const name of ["next", "react", "react-dom", "@prisma/client", "pdfjs-dist", "ofx-js", "papaparse", "fflate", "read-excel-file", "tailwindcss"]) {
      expect(listed, name).toContain(name);
    }
    for (const p of productionPackages(ROOT)) expect(listed, p.name).toContain(p.name);
    for (const e of entries.filter((x) => x.kind === "package")) {
      expect(e.texts.length > 0 || Boolean(licenceElsewhere(e.name)), `${e.name} has no licence text and no note`).toBe(true);
    }
    // A copy run from source carries no Electron: that entry is the installer's.
    expect(entries.some((e) => e.kind === "runtime")).toBe(false);
  });

  it("lists every package the bundled code or the style sheet imports, even a development tool", () => {
    const bundled = [...sourceFiles(["app", "components", "lib"], SOURCE_FILES), ...rootSourceFiles().filter((f) => /^(middleware|instrumentation)/.test(f))];
    const imported = new Set(
      bundled.flatMap((file) =>
        importedModules(readSource(file), file)
          .map((s) => moduleName(s))
          .filter((m) => m.kind === "package")
          .map((m) => m.name),
      ),
    );
    // CSS: `@import "tailwindcss"` in app/globals.css pulls Tailwind's own styles into the page.
    for (const css of sourceFiles(["app", "components", "lib"], /\.css$/)) {
      for (const m of readSource(css).matchAll(/@import\s+["']([^"'./][^"']*)["']/g)) imported.add(m[1].startsWith("@") ? m[1].split("/").slice(0, 2).join("/") : m[1].split("/")[0]);
    }
    expect(imported.size).toBeGreaterThan(5);
    expect([...imported].filter((n) => !listed.has(n)).sort(), "add it to desktop/notices.mjs (collectNotices)").toEqual([]);
  });

  it("reads TypeScript's and tslib's notice files as well as their licences", () => {
    // TypeScript (Apache-2.0) keeps the notices for the code it carries in ThirdPartyNoticeText.txt,
    // and tslib its copyright notice in CopyrightNotice.txt; LICENSE.txt alone isn't the whole notice.
    expect(licenceFiles(path.join(ROOT, "node_modules", "typescript")).map((t: { file: string }) => t.file)).toEqual(["LICENSE.txt", "ThirdPartyNoticeText.txt"]);
    expect(licenceFiles(path.join(ROOT, "node_modules", "tslib")).map((t: { file: string }) => t.file)).toEqual(["CopyrightNotice.txt", "LICENSE.txt"]);
  });

  it("gives each entry of one kind its own name and version, so two copies of one package can be told apart", () => {
    // The /licences page lists each kind in its own section, keyed by name@version. A package and
    // Next's copy of it (client-only 0.0.1 is both) sit in different sections, so kind is part of the key.
    const keys = entries.map((e) => `${e.kind}:${e.name}@${e.version}`);
    expect(keys.length).toBeGreaterThan(20);
    expect(keys.filter((k, i) => keys.indexOf(k) !== i)).toEqual([]);
  });

  it("follows what desktop/package.mjs copies into the installed app", () => {
    const script = readSource("desktop/package.mjs");
    const copied = [...script.matchAll(/copyWithDependencies\(\s*"([^"]+)"/g)].map((m) => m[1]);
    expect(copied.length).toBeGreaterThan(0);
    expect([...DESKTOP_APP_PACKAGES].sort()).toEqual([...new Set(copied)].sort());
  });

  it("writes a file the /licences page reads back entry for entry", () => {
    const text = formatNotices(entries, { version: "0.0.0-test", desktop: false });
    const parsed = parseNotices(text);
    expect(parsed.header).toContain("THIRD-PARTY NOTICES");
    expect(parsed.entries.map((e) => `${e.name}@${e.version}`)).toEqual(entries.map((e) => `${e.name}@${e.version}`));
    const react = parsed.entries.find((e) => e.name === "react")!;
    expect(react.licence).toBe("MIT");
    expect(react.text).toContain("Permission is hereby granted");
    expect(react.shipsIn.length).toBeGreaterThan(0);
    // The page's split lines can't occur inside a licence: the writer refuses one that holds them.
    const bad = [{ ...entries[0], texts: [{ file: "LICENSE", text: `before\n${SEPARATOR}\nafter` }] }];
    expect(() => formatNotices(bad, { version: "0", desktop: false })).toThrow(/separator/);
  });
});

describe("readNotices: what the /licences page gets from the folder the server runs in", () => {
  it("reads a file the generator wrote, says 'missing' with no file and 'unreadable' for a malformed one", () => {
    const good = path.join(temp, "read-good");
    mkdirSync(good, { recursive: true });
    const one = { kind: "package" as const, name: "only", version: "1.0.0", licence: "MIT", ships: new Set(["the test"]), texts: [{ file: "LICENSE", text: "MIT" }] };
    writeFileSync(path.join(good, NOTICES_FILE), formatNotices([one], { version: "0.0.0", desktop: false }));
    const read = readNotices(good);
    expect(typeof read === "object" && read.entries.map((e) => e.name)).toEqual(["only"]);

    const none = path.join(temp, "read-none");
    mkdirSync(none, { recursive: true });
    expect(readNotices(none)).toBe("missing");

    const bad = path.join(temp, "read-bad");
    mkdirSync(bad, { recursive: true });
    // An entry with no rule line between its fields and its licence text.
    writeFileSync(path.join(bad, NOTICES_FILE), `header\n${SEPARATOR}\nName: only\nVersion: 1.0.0\nKind: package\n`);
    expect(readNotices(bad)).toBe("unreadable");
  });
});

describe("the menu and the page", () => {
  it("Help → Licences opens /licences in the desktop app, and the settings page links to it", () => {
    expect(readSource("desktop/main.mjs")).toContain('{ id: "licences", label: "Licences", click: go("/licences") }');
    expect(readSource("components/settings/settings-page.tsx")).toContain('href="/licences"');
    expect(readFileSync(path.join(ROOT, "app", "(journey)", "licences", "page.tsx"), "utf8")).toContain("readNotices()");
  });
});
