// Writes THIRD-PARTY-NOTICES.txt: one entry for every work by someone else that ships with DotAmi,
// with its version, the licence its package names, where it ships, and the licence and notice
// files from the package itself, word for word.
//
// Why: the built server and page code are minified and the installer carries packages without
// their licence files, but licences such as MIT and Apache-2.0 (section 4) ask whoever passes the
// code on to keep the copyright and licence notice with it. This file is that notice. The settings
// page links to it (/licences) and the desktop app shows it from Help → Licences.
//
// Two ways it runs:
// - `npm run build` / `npm run notices` (a copy run from the source code): the packages DotAmi
//   depends on, as package-lock.json records them (everything not marked as a development tool),
//   plus the fonts and the styles Tailwind writes into the page. Written to the top folder, where
//   `next start` reads it (it's in .gitignore: it's made, never edited).
// - desktop/build.mjs (the installer): the same, plus every package actually inside the built
//   server's node_modules (Next's file tracer copies some that package-lock.json calls development
//   tools, such as typescript), the desktop app's own packages (electron-updater and what it pulls
//   in) and Electron itself. Written beside server.js. desktop/package.mjs then refuses to package
//   an app with a package in it that this file doesn't list.
//
// A package whose folder holds no licence file stops the build, unless LICENCE_ELSEWHERE below says
// where its terms are. Nothing here reaches the network: it reads files in node_modules.
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

export const NOTICES_FILE = "THIRD-PARTY-NOTICES.txt";
// Each entry starts after a line of "=" and its text after a line of "-": lib/licences/notices.ts
// splits the file on them for the /licences page. A licence that holds the separator line itself
// would break that, so writeNotices refuses one.
export const SEPARATOR = "=".repeat(78);
export const RULE = "-".repeat(78);

/**
 * The packages desktop/package.mjs copies into the installed app beside the server
 * (`copyWithDependencies("…", stage)`); tests/third-party-notices.spec.ts fails if the two differ.
 */
export const DESKTOP_APP_PACKAGES = ["electron-updater"];

/** Where each entry ships, in the words the file and the /licences page use. */
export const SHIPS = {
  dependency:
    "DotAmi's dependencies (package.json \"dependencies\" and the packages they pull in): the parts DotAmi uses are bundled into its built server and page code",
  server: "the desktop app's server (resources/server/node_modules in the installed app)",
  app: "the desktop app itself (packed into resources/app.asar in the installed app)",
  runtime: "the desktop app's runtime (DotAmi.exe and the files beside it)",
  styles: "the page's styles: Tailwind writes its own base styles into DotAmi's style sheet",
  fonts: "the page's fonts (app/fonts), served from DotAmi's own server",
};

/**
 * Packages whose published folder holds no licence file, and what is known about their terms
 * instead. A package that turns up without one stops the build until someone reads its
 * package.json and README and says so here. Each of these was read on 2026-10-08 (in this checkout's
 * node_modules, or for the Linux builds CI installs, in the package npm serves): the package.json
 * names the licence and nothing in the folder is a licence file. A key ending in "*" covers every
 * package whose name starts with what comes before it: the builds of one program for each kind of
 * computer (npm installs only the one for the computer it runs on). `readme: true` copies the
 * README's own "Licensing" section into the notices, word for word. Where there is no copyright
 * line to keep, because the package ships none, the note points to where the project keeps its
 * licence.
 * @type {Record<string, { why: string; readme?: boolean; text?: string; file?: string }>}
 */
export const LICENCE_ELSEWHERE = {
  "@napi-rs/canvas-*":
    { why: "This build of @napi-rs/canvas for one kind of computer holds no licence file; its package.json names MIT and its repository is github.com/Brooooooklyn/canvas. @napi-rs/canvas is an optional dependency of pdfjs-dist for reading PDFs under Node.js; DotAmi reads PDFs in the page, not on the server." },
  "@next/env":
    { why: "The published package holds no licence file; its package.json names MIT and its repository is github.com/vercel/next.js (packages/next-env), whose licence is Next.js's own (see the entry for next)." },
  "@next/swc-*":
    { why: "This build of Next.js's compiler for one kind of computer holds no licence file; its package.json names MIT and its repository is github.com/vercel/next.js (crates/napi). It is used while building." },
  "@img/sharp-libvips-*":
    { readme: true, why: "Prebuilt libvips and the libraries it uses, for sharp on one kind of computer. The package holds no licence file; its package.json names LGPL-3.0-or-later and its README lists each library and its licence (below). sharp is Next.js's image library; DotAmi doesn't use Next's image optimiser." },
  "client-only":
    { why: "The published package holds no licence file and no README; its package.json names MIT and gives reactjs.org as its homepage. It is an empty marker module that stops code meant for the page being used on the server." },
  standardwebhooks:
    { why: "The published package holds no licence file; its package.json names MIT and its repository is github.com/standard-webhooks/standard-webhooks. It comes with @anthropic-ai/sdk." },
  "worker-f":
    { why: "The published package holds no licence file; its package.json names MIT and its repository is gitlab.com/catamphetamine/worker-f. It comes with read-excel-file." },
  "lazy-val":
    { why: "The published package holds no licence file; its package.json names MIT and its repository is github.com/develar/lazy-val. It comes with electron-updater, the installed app's update check." },
};

/** Fonts committed to app/fonts, each with the licence file committed beside it. */
const FONTS = [
  { name: "Inter (font)", licence: "OFL-1.1", file: "app/fonts/LICENSE-Inter.txt", version: "as committed in app/fonts" },
  { name: "JetBrains Mono (font)", licence: "OFL-1.1", file: "app/fonts/LICENSE-JetBrainsMono.txt", version: "as committed in app/fonts" },
];

/**
 * Packages whose README carries licence information the licence file doesn't: sharp's builds for
 * each kind of computer bundle libvips and some 30 other libraries, and say which licence each is
 * used under only in the README's "Licensing" section. That section is added to their entry.
 */
const README_LICENSING = [/^@img\/sharp-/];

/** A package's LICENCE_ELSEWHERE entry: its own name, or a "prefix*" key that covers it. */
export function licenceElsewhere(name) {
  if (Object.hasOwn(LICENCE_ELSEWHERE, name)) return LICENCE_ELSEWHERE[name];
  const key = Object.keys(LICENCE_ELSEWHERE).find((k) => k.endsWith("*") && name.startsWith(k.slice(0, -1)));
  return key ? LICENCE_ELSEWHERE[key] : undefined;
}

/** The "## Licensing" (or "## License") section of a package's README, word for word; null if none. */
export function readmeLicensing(dir) {
  const readme = existsSync(dir) ? readdirSync(dir).find((f) => /^readme(\.md|\.markdown)?$/i.test(f)) : undefined;
  if (!readme) return null;
  const lines = readFileSync(path.join(dir, readme), "utf8").replace(/\r\n?/g, "\n").split("\n");
  const start = lines.findIndex((l) => /^#{1,3}\s+licen[cs](e|ing)\b/i.test(l));
  if (start < 0) return null;
  const level = lines[start].match(/^#+/)[0].length;
  const end = lines.findIndex((l, i) => i > start && new RegExp(`^#{1,${level}}\\s`).test(l));
  return { file: `${readme} (its "${lines[start].replace(/^#+\s+/, "")}" section)`, text: lines.slice(start, end < 0 ? undefined : end).join("\n").trimEnd() };
}

/** LICENSE, LICENCE.md, license-mit, COPYING, NOTICE, NOTICE.txt… but not "licenses.d.ts" or a folder. */
const LICENCE_FILE = /^(licen[cs]e|copying|notice)(?:[-._][a-z0-9-]+)?(?:\.(?:md|txt|markdown))?$/i;

/** The licence and notice files directly in a package's folder, in a fixed order. */
export function licenceFiles(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => LICENCE_FILE.test(f) && statSync(path.join(dir, f)).isFile())
    .sort((a, b) => a.localeCompare(b, "en"))
    .map((file) => ({ file, text: readFileSync(path.join(dir, file), "utf8").replace(/\r\n?/g, "\n").trimEnd() }));
}

/** The licence a package.json names: "MIT", the old `{ type }` form, or a `licenses` list. */
function licenceId(pkg) {
  if (typeof pkg.license === "string") return pkg.license;
  if (pkg.license && typeof pkg.license.type === "string") return pkg.license.type;
  if (Array.isArray(pkg.licenses)) return pkg.licenses.map((l) => l.type ?? l).join(" OR ");
  return "not stated in its package.json";
}

function readJson(file) {
  return JSON.parse(readFileSync(file, "utf8"));
}

/**
 * Every package in a node_modules folder, nested ones included: { name, version, licence, rel }
 * where `rel` is the folder relative to the node_modules folder given. Folders starting with "."
 * are skipped: .bin holds launchers, and .prisma holds the database client Prisma generates from
 * DotAmi's own schema (covered by @prisma/client's licence).
 */
export function packagesIn(nodeModules, prefix = "") {
  const found = [];
  if (!existsSync(nodeModules)) return found;
  for (const entry of readdirSync(nodeModules, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name.startsWith(".")) continue;
    const dirs = entry.name.startsWith("@")
      ? readdirSync(path.join(nodeModules, entry.name), { withFileTypes: true })
          .filter((d) => d.isDirectory())
          .map((d) => `${entry.name}/${d.name}`)
      : [entry.name];
    for (const d of dirs) {
      const dir = path.join(nodeModules, d);
      const manifest = path.join(dir, "package.json");
      if (!existsSync(manifest)) continue;
      const pkg = readJson(manifest);
      if (typeof pkg.name === "string" && typeof pkg.version === "string") {
        found.push({ name: pkg.name, version: pkg.version, licence: licenceId(pkg), rel: `${prefix}${d}` });
      }
      found.push(...packagesIn(path.join(dir, "node_modules"), `${prefix}${d}/node_modules/`));
    }
  }
  return found;
}

/**
 * Where node would find `dep` when `fromRel` (a folder under node_modules, such as
 * "sharp/node_modules/semver") requires it: its own node_modules first, then each parent's, then
 * the top. Null when it isn't installed (an optional package for another system).
 */
function resolveRel(root, fromRel, dep) {
  const parts = fromRel ? fromRel.split("/node_modules/") : [];
  for (let i = parts.length; i >= 0; i--) {
    const rel = [...parts.slice(0, i), dep].join("/node_modules/");
    if (existsSync(path.join(root, "node_modules", rel, "package.json"))) return rel;
  }
  return null;
}

/**
 * The packages `names` need to run, and the ones those need, as node would load them: each
 * package's "dependencies" and "optionalDependencies" (installed ones), never its peers or
 * development tools. A package.json's peers are left out on purpose: next names @playwright/test and
 * @prisma/client names the prisma command as peers, and neither runs inside DotAmi.
 *
 * `copied` adds every package nested inside a listed package's folder, the way desktop/package.mjs's
 * copyWithDependencies copies whole folders: those ship whether or not anything loads them.
 */
export function dependencyClosure(root, names, { copied = false } = {}) {
  const found = new Map();
  const visit = (rel) => {
    if (found.has(rel)) return;
    const pkg = readJson(path.join(root, "node_modules", rel, "package.json"));
    found.set(rel, { name: pkg.name, version: pkg.version, licence: licenceId(pkg), rel });
    if (copied) {
      for (const nested of packagesIn(path.join(root, "node_modules", rel, "node_modules"), `${rel}/node_modules/`)) {
        if (!found.has(nested.rel)) found.set(nested.rel, nested);
      }
    }
    for (const [dep, optional] of [
      ...Object.keys(pkg.dependencies ?? {}).map((d) => [d, false]),
      ...Object.keys(pkg.optionalDependencies ?? {}).map((d) => [d, true]),
    ]) {
      const at = resolveRel(root, rel, dep);
      if (at) visit(at);
      else if (!optional) throw new Error(`third-party notices: ${pkg.name} needs ${dep}, which is not installed; run npm ci`);
    }
  };
  for (const name of names) {
    if (!resolveRel(root, "", name)) throw new Error(`third-party notices: ${name} is not installed; run npm ci`);
    visit(name);
  }
  return [...found.values()];
}

/** What DotAmi's own package.json "dependencies" need to run (see dependencyClosure). */
export function productionPackages(root) {
  const manifest = readJson(path.join(root, "package.json"));
  return dependencyClosure(root, Object.keys({ ...manifest.dependencies, ...manifest.optionalDependencies }));
}

/**
 * Code another package carries inside itself: Next.js ships copies of more than a hundred packages
 * in next/dist/compiled. Each is listed under the package that carries it, with its licence file
 * when that package includes one (many don't: the entry then says so).
 */
function bundledInside(root, owner, shipped) {
  const compiled = path.join(root, "node_modules", owner.rel, "dist", "compiled");
  if (!existsSync(compiled)) return [];
  const shippedCompiled = shipped ? path.join(shipped, owner.rel, "dist", "compiled") : null;
  const out = [];
  for (const entry of readdirSync(compiled, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const dirs = entry.name.startsWith("@")
      ? readdirSync(path.join(compiled, entry.name), { withFileTypes: true })
          .filter((d) => d.isDirectory())
          .map((d) => `${entry.name}/${d.name}`)
      : [entry.name];
    for (const d of dirs) {
      // In the desktop build, only what Next's file tracer actually copied into the server ships.
      if (shippedCompiled && !existsSync(path.join(shippedCompiled, d))) continue;
      const dir = path.join(compiled, d);
      const manifest = path.join(dir, "package.json");
      const pkg = existsSync(manifest) ? readJson(manifest) : {};
      out.push({
        name: typeof pkg.name === "string" ? pkg.name : d,
        version: typeof pkg.version === "string" ? pkg.version : `not recorded (inside ${owner.name} ${owner.version})`,
        licence: existsSync(manifest) ? licenceId(pkg) : "not stated",
        inside: `${owner.name} ${owner.version}`,
        texts: licenceFiles(dir),
      });
    }
  }
  return out;
}

/**
 * Everything that ships, as entries ready to write. `standalone` is the built server's folder
 * (desktop/build.mjs's .next-desktop/standalone); with it, the list is the installer's.
 */
export function collectNotices(root, { standalone } = {}) {
  /** @type {Map<string, any>} */
  const byKey = new Map();
  const rootModules = path.join(root, "node_modules");
  const add = (p, where, from = rootModules) => {
    const key = `${p.name}@${p.version}`;
    let entry = byKey.get(key);
    if (!entry) {
      // The licence comes from the full copy in this checkout's node_modules: the built server's
      // copies hold only the files the server runs, and the licence file usually isn't one.
      const dir = path.join(rootModules, p.rel);
      const full = existsSync(path.join(dir, "package.json")) ? readJson(path.join(dir, "package.json")) : null;
      if (!full || full.version !== p.version) {
        throw new Error(`third-party notices: ${p.name} ${p.version} ships in ${path.relative(root, from)} but node_modules/${p.rel} isn't that version; run npm ci and build again`);
      }
      entry = { kind: "package", name: p.name, version: p.version, licence: p.licence, ships: new Set(), texts: licenceFiles(dir), rel: p.rel };
      byKey.set(key, entry);
    }
    entry.ships.add(where);
  };

  for (const p of productionPackages(root)) add(p, SHIPS.dependency);
  const shippedModules = standalone ? path.join(standalone, "node_modules") : null;
  if (shippedModules) {
    for (const p of packagesIn(shippedModules)) add(p, SHIPS.server, shippedModules);
    for (const p of dependencyClosure(root, DESKTOP_APP_PACKAGES, { copied: true })) add(p, SHIPS.app);
  }

  // Tailwind isn't a runtime package, but the style sheet it generates carries its base styles.
  const tailwind = readJson(path.join(rootModules, "tailwindcss", "package.json"));
  add({ name: tailwind.name, version: tailwind.version, licence: licenceId(tailwind), rel: "tailwindcss" }, SHIPS.styles);

  const packages = [...byKey.values()];
  const unexplained = [];
  for (const entry of packages) {
    const dir = path.join(rootModules, entry.rel);
    if (entry.texts.length === 0) {
      const elsewhere = licenceElsewhere(entry.name);
      if (!elsewhere) {
        unexplained.push(`${entry.name} ${entry.version} (node_modules/${entry.rel})`);
        continue;
      }
      entry.note = elsewhere.why;
      if (elsewhere.text) entry.texts = [{ file: elsewhere.file ?? "(from where the note says)", text: elsewhere.text }];
      if (elsewhere.readme) {
        const section = readmeLicensing(dir);
        if (!section) throw new Error(`third-party notices: LICENCE_ELSEWHERE says ${entry.name}'s README has a Licensing section, but it has none`);
        entry.texts.push(section);
      }
    } else if (README_LICENSING.some((r) => r.test(entry.name))) {
      const section = readmeLicensing(dir);
      if (section) entry.texts.push(section);
    }
  }
  if (unexplained.length) {
    throw new Error(
      `third-party notices: these ship but their folder has no LICENSE, COPYING or NOTICE file:\n  ${unexplained.join("\n  ")}\n` +
        "Find where each one's licence is (its README, its repository) and add it to LICENCE_ELSEWHERE in desktop/notices.mjs.",
    );
  }

  // Code that a shipped package carries inside itself (Next.js's dist/compiled).
  const inside = packages.flatMap((owner) => bundledInside(root, owner, shippedModules && owner.ships.has(SHIPS.server) ? shippedModules : null));
  for (const entry of inside) {
    entry.kind = "inside";
    entry.ships = new Set([`inside ${entry.inside}`]);
    if (entry.texts.length === 0) entry.note = `${entry.inside.split(" ")[0]}'s package carries no licence file for this copy; its package.json names: ${entry.licence}.`;
  }

  const fonts = FONTS.map((f) => ({
    kind: "font",
    name: f.name,
    version: f.version,
    licence: f.licence,
    ships: new Set([SHIPS.fonts]),
    texts: [{ file: path.basename(f.file), text: readFileSync(path.join(root, f.file), "utf8").replace(/\r\n?/g, "\n").trimEnd() }],
  }));

  const runtime = [];
  if (standalone) {
    const electron = readJson(path.join(rootModules, "electron", "package.json"));
    runtime.push({
      kind: "runtime",
      name: "electron",
      version: electron.version,
      licence: licenceId(electron),
      ships: new Set([SHIPS.runtime]),
      note:
        "Electron includes Chromium and Node.js. The installed app also carries Electron's licence as LICENSE.electron.txt and Chromium's own notices as LICENSES.chromium.html, beside DotAmi.exe (electron-builder copies both from Electron's download; desktop/package.mjs checks they are there).",
      texts: licenceFiles(path.join(rootModules, "electron")),
    });
  }

  const byName = (a, b) => a.name.localeCompare(b.name, "en") || a.version.localeCompare(b.version, "en");
  return [...runtime, ...packages.sort(byName), ...inside.sort(byName), ...fonts];
}

/** The file's text: a short header, then one block per entry. */
export function formatNotices(entries, { version, desktop }) {
  const header = [
    "THIRD-PARTY NOTICES",
    `DotAmi ${version}${desktop ? " (desktop app)" : " (run from the source code)"}`,
    "",
    "DotAmi's own code is open source under the Apache License 2.0 (LICENSE in its source code,",
    "https://github.com/Dot-Ami/dotami). It is built with, and ships, the works below, written by",
    "others. Each is listed with the version that ships, the licence its package names, where it",
    "ships, and the licence and notice files from the package itself, word for word.",
    "",
    "This file is written by desktop/notices.mjs each time the app is built. Don't edit it by hand.",
  ].join("\n");
  const blocks = entries.map((e) => {
    const fields = [
      `Name: ${e.name}`,
      `Version: ${e.version}`,
      `Licence: ${e.licence}`,
      `Kind: ${e.kind}`,
      ...[...e.ships].map((s) => `Ships in: ${s}`),
      ...(e.note ? [`Note: ${e.note}`] : []),
    ];
    const texts = e.texts.map((t) => {
      if (t.text.split("\n").some((line) => line === SEPARATOR || line === RULE)) {
        throw new Error(`third-party notices: ${e.name}'s ${t.file} holds a separator line; change SEPARATOR or RULE`);
      }
      return `--- ${t.file} ---\n${t.text}`;
    });
    return `${fields.join("\n")}\n${RULE}\n${texts.length ? texts.join("\n\n") : "(no licence file)"}`;
  });
  return `${header}\n\n${blocks.map((b) => `${SEPARATOR}\n${b}`).join("\n\n")}\n`;
}

/** Collects, formats and writes the file; returns the entries written. */
export function writeNotices(root, out, { standalone } = {}) {
  const entries = collectNotices(root, { standalone });
  const version = readJson(path.join(root, "package.json")).version;
  writeFileSync(out, formatNotices(entries, { version, desktop: Boolean(standalone) }));
  return entries;
}

/**
 * The packages inside these node_modules folders that the notices file has no entry for (name and
 * version both have to match). desktop/package.mjs refuses to package while this finds any.
 */
export function missingFromNotices(noticesText, nodeModulesDirs) {
  const listed = new Set();
  let name = null;
  for (const line of noticesText.split(/\r?\n/)) {
    if (line === SEPARATOR) name = null;
    else if (line.startsWith("Name: ")) name = line.slice(6);
    else if (line.startsWith("Version: ") && name !== null) listed.add(`${name}@${line.slice(9)}`);
  }
  const missing = [];
  for (const dir of nodeModulesDirs) {
    for (const p of packagesIn(dir)) {
      const key = `${p.name}@${p.version}`;
      if (!listed.has(key) && !missing.includes(key)) missing.push(key);
    }
  }
  return missing.sort();
}

// `node desktop/notices.mjs` (npm run notices, and npm run build): the list for a copy run from
// the source code, in the top folder. Matched by the script's path rather than import.meta, because
// Playwright loads this file for the desktop test through its own CommonJS transform, where
// import.meta is a syntax error.
if (process.argv[1] && /[\\/]desktop[\\/]notices\.mjs$/.test(path.resolve(process.argv[1]))) {
  const root = process.cwd();
  const entries = writeNotices(root, path.join(root, NOTICES_FILE));
  console.log(`${NOTICES_FILE}: ${entries.length} entries`);
}
