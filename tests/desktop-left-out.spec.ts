/**
 * What the desktop app's server leaves out (desktop/left-out.mjs): packages Next's file tracer
 * copies in that the server never loads — sharp with its libvips (LGPL-3.0-or-later), typescript,
 * and what only they pull in. desktop/build.mjs deletes them from the built server and writes the
 * third-party notices without them.
 *
 * What fails here:
 *   - the list stops covering sharp's scope or typescript, or starts covering a look-alike;
 *   - removal misses a nested copy, deletes something else, or leaves an empty scope folder;
 *   - a package that stays needs a left-out one, or the app's own server code requires one, and
 *     nothing notices (desktop/build.mjs stops on either);
 *   - the desktop notices still list a left-out package because DotAmi's dependencies name it
 *     (next names sharp as optional), or the list for a copy run from source loses it;
 *   - the build script stops removing them or stops passing the list to the notices.
 * The real build is checked by e2e-desktop/desktop.spec.ts: no left-out package in the server's
 * node_modules (built here or packaged), none in its notices, and the image route answers 404.
 */
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";

import { isLeftOut, LEFT_OUT, leftOutIn, removeLeftOut, requiredByServerCode, stillNeeded } from "../desktop/left-out.mjs";
import { collectNotices, packagesIn } from "../desktop/notices.mjs";

const ROOT = process.cwd();
const temp = mkdtempSync(path.join(tmpdir(), "dotami-left-out-"));
afterAll(() => rmSync(temp, { recursive: true, force: true }));

/** Writes a package folder with a package.json and a LICENSE. */
function fakePackage(
  nodeModules: string,
  name: string,
  version: string,
  opts: { deps?: Record<string, string>; optional?: Record<string, string> } = {},
) {
  const dir = path.join(nodeModules, name);
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    path.join(dir, "package.json"),
    JSON.stringify({ name, version, license: "MIT", dependencies: opts.deps ?? {}, optionalDependencies: opts.optional ?? {} }),
  );
  writeFileSync(path.join(dir, "LICENSE"), `Copyright (c) the ${name} authors`);
  return dir;
}

const names = (found: { name: string }[]) => found.map((p) => p.name).sort();

describe("isLeftOut: which packages the desktop server leaves out", () => {
  it("covers sharp, every package in sharp's @img scope and typescript", () => {
    for (const name of ["sharp", "@img/sharp-win32-x64", "@img/sharp-libvips-linux-x64", "@img/sharp-wasm32", "@img/colour", "typescript"]) {
      expect(isLeftOut(name), name).toBe(true);
    }
  });

  it("doesn't cover look-alikes or what the server runs on", () => {
    for (const name of ["next", "react", "@prisma/client", "sharp-cli", "typescript-eslint", "@imgix/js-core", "@img", "postcss", "source-map-js", "tslib"]) {
      expect(isLeftOut(name), name).toBe(false);
    }
  });

  it("gives a reason for each package it leaves out", () => {
    for (const p of LEFT_OUT) expect(p.why.length, p.name).toBeGreaterThan(20);
  });

  it("names only packages DotAmi installs (no stale entries)", () => {
    const lock = JSON.parse(readFileSync(path.join(ROOT, "package-lock.json"), "utf8")) as { packages: Record<string, unknown> };
    const locked = Object.keys(lock.packages).map((k) => k.replace(/^.*node_modules\//, ""));
    for (const p of LEFT_OUT) {
      const covers = p.name.endsWith("/*") ? (n: string) => n.startsWith(p.name.slice(0, -1)) : (n: string) => n === p.name;
      expect(locked.some(covers), p.name).toBe(true);
    }
  });
});

describe("removeLeftOut: what desktop/build.mjs deletes from the built server", () => {
  const modules = path.join(temp, "server", "node_modules");
  fakePackage(modules, "next", "15.0.0", { optional: { sharp: "1" } });
  fakePackage(modules, "react", "19.0.0");
  fakePackage(modules, "sharp", "0.35.0", { deps: { "detect-libc": "2", semver: "7" } });
  fakePackage(path.join(modules, "sharp", "node_modules"), "semver", "7.0.0");
  fakePackage(modules, "detect-libc", "2.0.0");
  fakePackage(modules, "@img/sharp-win32-x64", "0.35.0");
  fakePackage(modules, "@img/colour", "1.0.0");
  fakePackage(modules, "typescript", "5.9.0");
  // A copy nested inside a package that stays goes too.
  fakePackage(path.join(modules, "next", "node_modules"), "typescript", "5.8.0");
  fakePackage(path.join(modules, "next", "node_modules"), "kept-helper", "1.0.0");

  it("finds every left-out package, nested ones included", () => {
    expect(leftOutIn(modules).map((p) => p.rel).sort()).toEqual(
      ["@img/colour", "@img/sharp-win32-x64", "detect-libc", "next/node_modules/typescript", "sharp", "typescript"].sort(),
    );
  });

  it("deletes them, and what sits inside them, and nothing else", () => {
    const removed = removeLeftOut(modules);
    expect(names(removed)).toEqual(["@img/colour", "@img/sharp-win32-x64", "detect-libc", "sharp", "typescript", "typescript"]);
    expect(leftOutIn(modules)).toEqual([]);
    expect(packagesIn(modules).map((p) => p.rel).sort()).toEqual(["next", "next/node_modules/kept-helper", "react"]);
    // sharp's own semver went with it, and the emptied @img scope folder is gone.
    expect(readdirSync(modules).sort()).toEqual(["next", "react"]);
  });

  it("is a no-op on a server that has none of them", () => {
    expect(removeLeftOut(modules)).toEqual([]);
  });
});

describe("the checks desktop/build.mjs runs before removing anything", () => {
  it("stillNeeded names a package that stays and can't run without a left-out one; an optional one doesn't count", () => {
    const modules = path.join(temp, "needs", "node_modules");
    fakePackage(modules, "next", "15.0.0", { optional: { sharp: "1" } });
    fakePackage(modules, "uses-typescript", "1.0.0", { deps: { typescript: "5" } });
    fakePackage(modules, "typescript", "5.9.0");
    fakePackage(modules, "sharp", "0.35.0", { deps: { "detect-libc": "2" } });
    expect(stillNeeded(modules)).toEqual(["uses-typescript 1.0.0 needs typescript"]);
  });

  it("requiredByServerCode names a server file that requires or imports a left-out package, and nothing else", () => {
    const server = path.join(temp, "server-code");
    mkdirSync(path.join(server, "app", "api"), { recursive: true });
    mkdirSync(path.join(server, "chunks"), { recursive: true });
    writeFileSync(path.join(server, "app", "api", "route.js"), 'const s=require("sharp");const n=require("next/dist/server/x");');
    writeFileSync(path.join(server, "chunks", "1.js"), "import('@img/sharp-wasm32').then(()=>0);import x from 'typescript/lib/typescript.js';");
    writeFileSync(path.join(server, "chunks", "2.js"), 'const words="sharp, typescript and source-map";require("react");');
    writeFileSync(path.join(server, "chunks", "notes.txt"), 'require("typescript")');
    expect(requiredByServerCode(server)).toEqual([
      `${path.join("app", "api", "route.js")}: sharp`,
      `${path.join("chunks", "1.js")}: @img/sharp-wasm32`,
      `${path.join("chunks", "1.js")}: typescript`,
    ]);
  });
});

describe("collectNotices with leaveOut: the desktop notices drop what the server leaves out", () => {
  /** A checkout whose one dependency, next, names sharp as optional; sharp pulls in detect-libc. */
  function checkout(name: string) {
    const root = path.join(temp, name);
    const modules = path.join(root, "node_modules");
    mkdirSync(path.join(root, "app", "fonts"), { recursive: true });
    writeFileSync(path.join(root, "package.json"), JSON.stringify({ name: "dotami", version: "9.9.9", dependencies: { next: "15" } }));
    writeFileSync(path.join(root, "app", "fonts", "LICENSE-Inter.txt"), "Inter: SIL Open Font License 1.1");
    writeFileSync(path.join(root, "app", "fonts", "LICENSE-JetBrainsMono.txt"), "JetBrains Mono: SIL Open Font License 1.1");
    fakePackage(modules, "tailwindcss", "4.0.0");
    fakePackage(modules, "next", "15.0.0", { deps: { "styled-jsx": "5" }, optional: { sharp: "0.35" } });
    fakePackage(modules, "styled-jsx", "5.0.0");
    fakePackage(modules, "sharp", "0.35.0", { deps: { "detect-libc": "2" }, optional: { "@img/sharp-win32-x64": "0.35" } });
    fakePackage(modules, "detect-libc", "2.0.0");
    fakePackage(modules, "@img/sharp-win32-x64", "0.35.0");
    fakePackage(modules, "typescript", "5.9.0");
    fakePackage(modules, "electron", "38.0.0");
    fakePackage(modules, "electron-updater", "6.0.0");
    // The built server: next and styled-jsx, as after desktop/build.mjs took the rest out.
    const standalone = path.join(root, "standalone");
    fakePackage(path.join(standalone, "node_modules"), "next", "15.0.0");
    fakePackage(path.join(standalone, "node_modules"), "styled-jsx", "5.0.0");
    return { root, standalone };
  }

  it("lists sharp and what it pulls in for a copy run from source, where npm installs them", () => {
    const { root } = checkout("from-source");
    expect(collectNotices(root).map((e) => e.name)).toEqual(expect.arrayContaining(["next", "styled-jsx", "sharp", "detect-libc", "@img/sharp-win32-x64"]));
  });

  it("leaves them out of the desktop list, and keeps everything else", () => {
    const { root, standalone } = checkout("desktop");
    const listed = collectNotices(root, { standalone, leaveOut: isLeftOut }).map((e) => e.name);
    expect(listed).toEqual(expect.arrayContaining(["electron", "next", "styled-jsx", "electron-updater", "tailwindcss"]));
    expect(listed.filter((n) => isLeftOut(n))).toEqual([]);
  });

  it("without leaveOut, the desktop list still names sharp through next (the reason the build passes it)", () => {
    const { root, standalone } = checkout("desktop-unfiltered");
    expect(collectNotices(root, { standalone }).map((e) => e.name)).toContain("sharp");
  });
});

describe("desktop/build.mjs and next.config.mjs", () => {
  const build = readFileSync(path.join(ROOT, "desktop", "build.mjs"), "utf8");
  const config = readFileSync(path.join(ROOT, "next.config.mjs"), "utf8");

  it("the build removes the left-out packages, checks first that nothing needs them, and writes the notices without them", () => {
    expect(build).toContain("removeLeftOut(modules)");
    expect(build).toContain("stillNeeded(modules)");
    expect(build).toContain('requiredByServerCode(path.join(standalone, ".next-desktop", "server"))');
    expect(build).toMatch(/writeNotices\(root, [^\n]*\{ standalone, leaveOut: isLeftOut \}\);/);
    // Removal comes before the notices are written, so the notices describe the trimmed server.
    expect(build.indexOf("removeLeftOut(modules)")).toBeLessThan(build.indexOf("writeNotices("));
  });

  it("the desktop build turns Next's image optimiser off, so /_next/image never loads sharp", () => {
    expect(config).toMatch(/desktopBuild \? \{[^}]*images: \{ unoptimized: true \}/);
  });
});
