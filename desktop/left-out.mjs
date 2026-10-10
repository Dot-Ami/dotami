// The packages Next's file tracer copies into the desktop app's server that the app never loads,
// and the code desktop/build.mjs uses to take them out.
//
// Why they get copied at all: the tracer follows every require() it can see in Next's own code,
// including ones that only run on paths DotAmi never takes. Two families came along that way
// (checked on the 0.2.1 build, 2026-10-08):
// - sharp, Next's image library, with its prebuilt libvips (LGPL-3.0-or-later) — about 20 MB.
//   Only next/dist/server/image-optimizer.js loads it, and only to resize an image for next/image.
//   DotAmi has no next/image, no image files to serve, and the desktop build turns the optimiser
//   off (`images.unoptimized` in next.config.mjs), so /_next/image answers 404 before it would ever
//   load sharp. Vercel's own builds leave sharp out the same way (the `hasNextSupport` ignores in
//   next/dist/build/collect-build-traces.js).
// - typescript — about 9 MB. Next loads it to type-check and to read tsconfig.json while it
//   builds, and to compile a next.config.ts; the built server does neither (its config is written
//   into server.js as JSON, and DotAmi's config is next.config.mjs).
// The rest of the list is what only those two pull in. The desktop tests (npm run test:desktop and
// the packaged-app run) drive the app without any of them.
//
// Nothing here reaches the network: it reads and deletes folders in the build's own node_modules.
import { existsSync, readdirSync, readFileSync, rmdirSync, rmSync } from "node:fs";
import path from "node:path";

import { packagesIn } from "./notices.mjs";

/**
 * What the desktop server leaves out. A name ending in "/*" covers every package in that scope.
 * @type {readonly { name: string; why: string }[]}
 */
export const LEFT_OUT = [
  { name: "sharp", why: "Next's image library, loaded only by Next's image optimiser, which the desktop build turns off." },
  { name: "@img/*", why: "sharp's own scope: its prebuilt builds for each kind of computer (with libvips) and its colour library." },
  { name: "detect-libc", why: "Used by sharp to pick its build; nothing else in the server needs it." },
  { name: "@emnapi/runtime", why: "Used only by sharp's WebAssembly build (@img/sharp-wasm32)." },
  { name: "typescript", why: "Used by Next while it builds (type checks, tsconfig.json, next.config.ts), never by the built server." },
  { name: "source-map-support", why: "Required only by typescript." },
  { name: "buffer-from", why: "Required only by source-map-support." },
  { name: "source-map", why: "Required only by source-map-support (Next carries its own copies in next/dist/compiled)." },
];

/**
 * [8i] Files left out of a package that stays: better-sqlite3-multiple-ciphers (the database, under the
 * name better-sqlite3) carries a prebuilt SQLite for eight kinds of computer, about 2.4 MB each, and
 * loads only the one for the computer it runs on (its lib/binding.js picks prebuilds/<system>-<cpu>.node).
 * The tracer copies all eight; the desktop server keeps the one for the computer the app is built for.
 */
export const OTHER_PLATFORM_BUILDS = { name: "better-sqlite3-multiple-ciphers", folder: "prebuilds", extension: ".node" };

/**
 * The prebuilt file better-sqlite3-multiple-ciphers loads on this computer: "<system>-<cpu>.node", the
 * system written "linuxmusl" on a Linux without glibc (the package's own rule, lib/binding.js).
 */
export function ownPlatformBuild(platform = process.platform, arch = process.arch, musl = isLinuxMusl(platform)) {
  return `${platform === "linux" && musl ? "linuxmusl" : platform}-${arch}${OTHER_PLATFORM_BUILDS.extension}`;
}

function isLinuxMusl(platform) {
  return platform === "linux" && !process.report.getReport().header.glibcVersionRuntime;
}

/**
 * Deletes the other kinds of computer's prebuilt files from every copy of the package in a node_modules
 * folder, keeping `keep`. Returns { removed: [relative paths], kept: [relative paths] }; desktop/build.mjs
 * stops unless exactly one is kept in each copy.
 */
export function removeOtherPlatformBuilds(nodeModules, keep = ownPlatformBuild()) {
  const removed = [];
  const kept = [];
  for (const p of packagesIn(nodeModules).filter((p) => p.name === OTHER_PLATFORM_BUILDS.name)) {
    const dir = path.join(nodeModules, p.rel, OTHER_PLATFORM_BUILDS.folder);
    if (!existsSync(dir)) continue;
    for (const file of readdirSync(dir)) {
      if (!file.endsWith(OTHER_PLATFORM_BUILDS.extension)) continue;
      const rel = `${p.rel}/${OTHER_PLATFORM_BUILDS.folder}/${file}`;
      if (file === keep) kept.push(rel);
      else {
        rmSync(path.join(dir, file));
        removed.push(rel);
      }
    }
  }
  return { removed, kept };
}

/** Whether the desktop server leaves this package out. */
export function isLeftOut(name) {
  return LEFT_OUT.some((p) => (p.name.endsWith("/*") ? name.startsWith(p.name.slice(0, -1)) : name === p.name));
}

/** The left-out packages inside a node_modules folder, nested copies included. */
export function leftOutIn(nodeModules) {
  return packagesIn(nodeModules).filter((p) => isLeftOut(p.name));
}

/**
 * Deletes the left-out packages from a node_modules folder (nested copies too, and a scope folder
 * such as @img once it is empty). Returns what it deleted.
 */
export function removeLeftOut(nodeModules) {
  // Shallowest first: deleting a package deletes whatever is nested inside it.
  const found = leftOutIn(nodeModules).sort((a, b) => a.rel.length - b.rel.length);
  const removed = [];
  for (const p of found) {
    const dir = path.join(nodeModules, p.rel);
    if (!existsSync(dir)) continue;
    rmSync(dir, { recursive: true, force: true });
    removed.push(p);
    const parent = path.dirname(dir);
    if (path.basename(parent).startsWith("@") && readdirSync(parent).length === 0) rmdirSync(parent);
  }
  return removed;
}

/**
 * Packages left in the folder that name a left-out package among the dependencies they can't run
 * without ("dependencies"; optional ones and peers don't count: next names sharp as optional).
 * desktop/build.mjs stops if this finds any: the list above would then be leaving out something
 * the server does load.
 */
export function stillNeeded(nodeModules) {
  const needs = [];
  for (const p of packagesIn(nodeModules)) {
    if (isLeftOut(p.name)) continue;
    const manifest = JSON.parse(readFileSync(path.join(nodeModules, p.rel, "package.json"), "utf8"));
    for (const dep of Object.keys(manifest.dependencies ?? {})) {
      if (isLeftOut(dep)) needs.push(`${p.name} ${p.version} needs ${dep}`);
    }
  }
  return needs.sort();
}

/**
 * The built app's own server code (`.next-desktop/server` inside the standalone folder) that
 * requires or imports a left-out package: webpack leaves a package it doesn't bundle as a plain
 * `require("name")`. Returns "file: name" lines; desktop/build.mjs stops if there are any.
 */
export function requiredByServerCode(serverDir) {
  const hits = [];
  if (!existsSync(serverDir)) return hits;
  // `require("x")`, `require("x/sub")`, `import("x")`, `from "x"`, with either kind of quote.
  const spec = /(?:require\(|import\(|from\s*)\s*["']((?:@[^"'/]+\/)?[^"'/]+)/g;
  (function walk(dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.(c|m)?js$/.test(entry.name)) {
        const names = new Set([...readFileSync(full, "utf8").matchAll(spec)].map((m) => m[1]).filter(isLeftOut));
        for (const name of names) hits.push(`${path.relative(serverDir, full)}: ${name}`);
      }
    }
  })(serverDir);
  return hits.sort();
}
