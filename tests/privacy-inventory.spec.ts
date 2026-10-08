import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";

import {
  BUILD_TIME_ONLY,
  DEPENDENCIES,
  FOLDERS,
  LIBRARY_IMPORTS,
  LOCAL_REQUESTS,
  SENT_ELSEWHERE,
  STARTS_PROGRAMS,
  TABLES,
  UNSCANNED_FOLDERS,
  WINDOW_STORAGE,
  type AllowedCall,
  type DependencyEntry,
} from "@/lib/privacy/inventory";

import {
  BROWSER_PROBES,
  BROWSER_QUIET,
  DECLARED_IMPORT_QUIET,
  DESKTOP_PROBES,
  DESKTOP_QUIET,
  OUTSIDE_IMPORT_PROBES,
  OUTSIDE_IMPORT_QUIET,
  PROBE_FILE,
  PROGRAM_PROBES,
  SUBPATH_PROBES,
  SUBPATH_QUIET,
  UNLISTED_PACKAGE_PROBES,
  WRAPPER_PROBES,
  WRAPPER_QUIET,
  type Probe,
  type QuietProbe,
} from "./helpers/network-probes";
import {
  SOURCE_FILES,
  importedModules,
  importsFromUnscannedCode,
  moduleName,
  networkCalls,
  networkSourceFiles,
  readSource,
  rootSourceFiles,
  simplify,
  sourceFiles,
  unscannedSourceFolders,
  wrapperNamesAcross,
} from "./helpers/source-scan";

/**
 * The /your-data page is drawn from lib/privacy/inventory.ts, so the page is only as honest as
 * that list is complete. These tests read the schema, package.json and the source, and fail the
 * moment any of these happens:
 *   - a table is added that the inventory doesn't list;
 *   - a browser-storage key is added that it doesn't list (this one reads TEXT, so a quote inside a
 *     regular expression can hide a key written after it);
 *   - a package ships WITHOUT AN ENTRY in DEPENDENCIES (network yes/no/unverified, and why): one in
 *     package.json "dependencies", one desktop/package.mjs copies into the installer, or one
 *     imported by a file under app/, components/ or lib/ (or middleware.* / instrumentation*.* in
 *     the top folder), which Next bundles even when package.json calls it a devDependency. Or a
 *     file imports a package that package.json doesn't declare (a transitive one, say);
 *   - a .ts, .tsx, .mts, .cts, .js, .jsx, .mjs or .cjs file under app/, components/, lib/ or
 *     desktop/, or in the repo's top folder, makes one of the kinds of request the header of
 *     lib/privacy/inventory.ts names, and the inventory doesn't list that call;
 *   - a new top-level folder holds source that is neither scanned nor listed in UNSCANNED_FOLDERS
 *     with a reason, or a scanned file imports code from one of the unread folders.
 *
 * That is a safety net, not a proof. It does NOT see: a request a package makes inside its own code
 * (only the import is seen); deliberate disguises and the other gaps (the "known gaps" test below
 * pins each one, among them an XMLHttpRequest opened in another file than the one that made it, and
 * code run from a string by webContents.executeJavaScript);
 * anything that makes the page load an address instead of calling a function (an image, a script
 * tag, a link, window.open, location, shell.openExternal); Next.js settings that make the server
 * fetch; HTML and CSS files; the code in the folders listed as unread (scripts/, prisma/, tests/,
 * e2e/, e2e-desktop/); and what a program the app starts then does. What stands behind it:
 * GitHub's Dependency review check (known vulnerabilities and licences only, and only while the
 * repository variable DEPENDENCY_REVIEW is "on"), the Content-Security-Policy in the browser
 * (connect-src, img-src, default-src and form-action: not WebRTC, not navigation, and only for the
 * pages middleware.ts serves), and code review. tests/helpers/source-scan.ts has the full lists.
 */

const SCAN = ["app", "components", "lib"];
const files = sourceFiles(SCAN, SOURCE_FILES);

function schemaModels(): string[] {
  const schema = readFileSync(path.join(process.cwd(), "prisma", "schema.prisma"), "utf8");
  return [...schema.matchAll(/^model\s+(\w+)\s*\{/gm)].map((m) => m[1]);
}

describe("the privacy inventory lists every database table", () => {
  it("reads the schema (a guard against the scan silently finding nothing)", () => {
    expect(schemaModels()).toContain("Figure");
    expect(schemaModels().length).toBeGreaterThanOrEqual(6);
  });

  it("has an entry for every model in prisma/schema.prisma", () => {
    const listed = new Set(TABLES.map((t) => t.model));
    const missing = schemaModels().filter((m) => !listed.has(m));
    expect(missing, `add these to TABLES in lib/privacy/inventory.ts: ${missing.join(", ")}`).toEqual([]);
  });

  it("lists no table the schema doesn't have, and none twice", () => {
    const real = new Set(schemaModels());
    expect(TABLES.filter((t) => !real.has(t.model)).map((t) => t.model)).toEqual([]);
    expect(new Set(TABLES.map((t) => t.model)).size).toBe(TABLES.length);
  });

  it("says, for each one, what it holds and what takes a record out", () => {
    for (const t of TABLES) {
      expect(t.name.trim(), `${t.model} needs a name`).not.toBe("");
      expect(t.holds.trim(), `${t.model} needs to say what it holds`).not.toBe("");
      expect(t.removedBy.trim(), `${t.model} needs to say what removes it ("nothing" is an answer)`).not.toBe("");
    }
  });

  it("calls the button that removes a link by the label it really has", () => {
    const label = TABLES.find((t) => t.model === "VentureLink")!.removedBy.match(/“([^”]+)”/)?.[1];
    expect(label, "the VentureLink entry should quote the button's label in “curly quotes”").toBeDefined();
    expect(readSource("components/ventures/ventures-page.tsx")).toMatch(new RegExp(`>\\s*${label}\\s*</button>`));
  });

  it("says the placeholder account's address can be set, by the setting the code really reads", () => {
    expect(TABLES.find((t) => t.model === "User")!.holds).toContain("STUB_USER_EMAIL");
    expect(readSource("lib/person/statements.ts")).toContain("process.env.STUB_USER_EMAIL");
  });
});

describe("the privacy inventory lists every browser-storage key", () => {
  // The values of string constants, so `getItem(MY_KEY)` can be read as the key it stands for.
  const constants = new Map<string, string>();
  for (const f of files) {
    for (const m of simplify(readSource(f), true).matchAll(/\bconst\s+([A-Za-z_$][\w$]*)\s*=\s*(["'])([^"'\n]*)\2/g)) {
      constants.set(m[1], m[3]);
    }
  }

  const used = new Map<string, string[]>(); // "store:key" -> the files that use it
  const unreadable: string[] = [];
  const otherUses: string[] = [];
  const otherStores: string[] = [];

  for (const f of files) {
    const code = simplify(readSource(f), true);
    for (const m of code.matchAll(/\b(localStorage|sessionStorage)\s*\.\s*(getItem|setItem|removeItem)\s*\(\s*([^,)]*)/g)) {
      const arg = m[3].trim();
      const literal = arg.match(/^(["'`])([^"'`$]*)\1$/);
      const key = literal ? literal[2] : constants.get(arg);
      if (key === undefined) {
        unreadable.push(`${f}: ${m[1]}.${m[2]}(${arg})`);
        continue;
      }
      const id = `${m[1]}:${key}`;
      used.set(id, [...(used.get(id) ?? []), f]);
    }

    // Anything else done with the storage objects (clear(), key(), bracket access, handing the
    // object to another function) could touch keys this scan can't name, so it is refused outright.
    const plain = simplify(readSource(f), false);
    for (const m of plain.matchAll(/\b(localStorage|sessionStorage)\b/g)) {
      const after = plain.slice(m.index! + m[0].length);
      if (!/^\s*\.\s*(getItem|setItem|removeItem)\s*\(/.test(after)) otherUses.push(`${f}: ${m[0]}`);
    }
    // Other places a window can keep things.
    for (const m of plain.matchAll(/\b(indexedDB|cookieStore|openDatabase)\b|document\s*\.\s*cookie|\bcaches\s*\./g)) {
      otherStores.push(`${f}: ${m[0]}`);
    }
  }

  it("sees the keys DotAmi uses today (a guard against the scan silently finding nothing)", () => {
    expect([...used.keys()]).toEqual(
      expect.arrayContaining([
        "localStorage:dotami-employment-suggestions",
        "sessionStorage:dotami-journey-v3",
        "sessionStorage:dotami-person-unsaved",
      ]),
    );
  });

  it("has an entry for every key the code reads or writes", () => {
    const listed = new Set(WINDOW_STORAGE.map((w) => `${w.store}:${w.key}`));
    const missing = [...used.keys()].filter((k) => !listed.has(k));
    expect(missing, `add these to WINDOW_STORAGE in lib/privacy/inventory.ts: ${missing.join(", ")}`).toEqual([]);
  });

  it("lists no key the code never uses (a renamed key would leave a stale line)", () => {
    const stale = WINDOW_STORAGE.map((w) => `${w.store}:${w.key}`).filter((k) => !used.has(k));
    expect(stale).toEqual([]);
  });

  it("can name every key: each one is a string written out or a constant, never built at run time", () => {
    expect(unreadable, "use a string constant for the key so the inventory can list it").toEqual([]);
  });

  it("finds no use of the storage objects it can't account for", () => {
    expect(otherUses).toEqual([]);
  });

  it("finds no other kind of browser storage (cookies, IndexedDB, the cache)", () => {
    expect(otherStores, "add a kind of entry for it to lib/privacy/inventory.ts, and extend this scan").toEqual([]);
  });

  it("says what each holds and how long it lasts", () => {
    for (const w of WINDOW_STORAGE) {
      expect(w.name.trim()).not.toBe("");
      expect(w.holds.trim()).not.toBe("");
      expect(w.lasts.trim()).not.toBe("");
    }
  });
});

describe("the privacy inventory lists what the desktop app writes beside the data file", () => {
  it.each(FOLDERS)("$name is still written by $writtenBy.file", (folder) => {
    const text = readFileSync(path.join(process.cwd(), folder.writtenBy.file), "utf8");
    expect(text, `${folder.writtenBy.file} no longer mentions ${folder.writtenBy.mentions}; was it renamed?`).toContain(
      folder.writtenBy.mentions,
    );
  });
});

// Every file the scan reads (tests/helpers/source-scan.ts, networkSourceFiles): all TypeScript and
// JavaScript under app/, components/, lib/ and desktop/ (the desktop app runs the update check and
// starts the server), and every such file in the repo's top folder (middleware.ts and
// next.config.mjs configure the server; instrumentation.ts, if there is one, runs inside it).
const NETWORK_FILES = networkSourceFiles();
const networkSources = NETWORK_FILES.map((file) => ({ file, code: readSource(file) }));

// The calls the inventory explains: each entry's own, the ones that stay on this computer, the
// libraries imported without using their way out, the programs the app starts, and the build
// scripts (which never ship).
const ALLOWED: readonly AllowedCall[] = [
  ...SENT_ELSEWHERE.flatMap((s) => s.calls),
  ...LOCAL_REQUESTS,
  ...LIBRARY_IMPORTS,
  ...STARTS_PROGRAMS,
  ...BUILD_TIME_ONLY,
];
// Helper functions that wrap fetch: a call of one is judged like a fetch, however it is reached.
const WRAPPERS = ALLOWED.flatMap((c) => (c.wrapper ? [c.wrapper] : []));
// Packages the dependency list says can reach the network, or couldn't be verified: importing one is refused.
const NETWORK_PACKAGES: ReadonlySet<string> = new Set(DEPENDENCIES.filter((d) => d.network !== "no").map((d) => d.name));

/** `list` without one copy of each of `remove`'s items (the same call can be listed, or made, twice). */
function without(list: string[], remove: string[]): string[] {
  const rest = [...remove];
  return list.filter((item) => {
    const at = rest.indexOf(item);
    if (at === -1) return true;
    rest.splice(at, 1);
    return false;
  });
}

// What the scan said about a file, kept so a probe added to the real tree only re-reads its own file.
const scanned = new Map<string, string[]>();

/** The calls in one file that aren't a literal "/…" path on DotAmi's own server, as "file: call". */
function outsideCallsIn(file: string, code: string, names: readonly string[]): string[] {
  const key = `${file}\0${names.join(",")}\0${code}`;
  let found = scanned.get(key);
  if (!found) {
    const aliases = names.filter((n) => !WRAPPERS.includes(n));
    found = networkCalls(code, WRAPPERS, file, { packages: NETWORK_PACKAGES, aliases })
      .filter((c) => !c.relative)
      .map((c) => `${file}: ${c.call}`);
    scanned.set(key, found);
  }
  return found;
}

/**
 * Every way the given files can reach the network other than a literal "/…" path on DotAmi's own
 * server, as "file: call": `unlisted` are the ones the allow-list doesn't name (a failure),
 * `stale` are allow-list entries that match nothing (also a failure: the list outlived the code).
 * A wrapper helper is followed under every name the given files export it as.
 */
function requestsOutside(sources: { file: string; code: string }[], allowed: readonly AllowedCall[]) {
  const names = wrapperNamesAcross(sources, WRAPPERS);
  const found = sources.flatMap(({ file, code }) => outsideCallsIn(file, code, names));
  const listed = allowed.map((a) => `${a.file}: ${a.call}`);
  return { unlisted: without(found, listed), stale: without(listed, found) };
}

/** The real tree with a probe added: its code at the end of a real file, or as new files. What the scan names for it. */
function refusedFor(probe: Probe | QuietProbe): string[] {
  const extra = [...(probe.also ?? []), ...(probe.appendTo ? [] : [{ file: probe.file, code: probe.code }])];
  const sources = networkSources.map((s) => (probe.appendTo && s.file === probe.file ? { file: s.file, code: `${s.code}\n${probe.code}` } : s));
  expect(probe.appendTo ? sources.some((s) => s.file === probe.file) : true, `${probe.file} should be a real file the scan reads`).toBe(true);
  return requestsOutside([...sources.filter((s) => !extra.some((e) => e.file === s.file)), ...extra], ALLOWED).unlisted;
}

describe("the privacy inventory lists what can leave this computer", () => {
  // Where the app's own code talks to anything outside this computer. Each place must be one the
  // inventory describes, so a new request out can't be added without the page saying so.
  // (By package name, so an import of a subpath, or by require, counts too.)
  const sdkUsers = networkSources
    .filter(({ file, code }) => importedModules(code, file).some((spec) => moduleName(spec).name === "@anthropic-ai/sdk"))
    .map((s) => s.file);
  const found = requestsOutside(networkSources, ALLOWED);

  it("knows the only code that reaches Anthropic: the intake's sentence reader", () => {
    expect(sdkUsers).toEqual(["app/api/intent/parse/route.ts"]);
    expect(SENT_ELSEWHERE.map((s) => s.id)).toContain("intake-sentence");
  });

  it("sees the requests the app makes today (a guard against the scan silently finding nothing)", () => {
    const names = wrapperNamesAcross(networkSources, WRAPPERS);
    const aliases = names.filter((n) => !WRAPPERS.includes(n));
    const calls = networkSources.flatMap(({ file, code }) =>
      networkCalls(code, WRAPPERS, file, { packages: NETWORK_PACKAGES, aliases }).map((c) => ({ file, ...c })),
    );
    expect(calls.filter((c) => c.relative).length).toBeGreaterThanOrEqual(15);
    expect(calls.filter((c) => !c.relative).map((c) => `${c.file}: ${c.call}`)).toEqual(
      expect.arrayContaining(ALLOWED.map((a) => `${a.file}: ${a.call}`)),
    );
    // The whole file list: every folder, the desktop app, and the top folder's own files.
    expect(networkSources.map((s) => s.file)).toEqual(
      expect.arrayContaining([
        "app/layout.tsx",
        "components/ventures/agree-prompt.tsx",
        "lib/privacy/inventory.ts",
        "desktop/main.mjs",
        "desktop/passphrase.js",
        "desktop/passphrase-preload.cjs",
        "middleware.ts",
        "next.config.mjs",
      ]),
    );
  });

  it("reads the files in the repo's top folder too, whatever they are called (instrumentation.ts runs inside the server)", () => {
    expect(rootSourceFiles()).toEqual(expect.arrayContaining(["middleware.ts", "next.config.mjs"]));
    expect(networkSources.map((s) => s.file)).toEqual(expect.arrayContaining(rootSourceFiles()));
  });

  it("finds no request leaving this computer that the inventory doesn't list", () => {
    expect(
      found.unlisted,
      "describe it on an entry of SENT_ELSEWHERE (or in LOCAL_REQUESTS if it stays on this computer, LIBRARY_IMPORTS if it is a package imported without using its way out, STARTS_PROGRAMS if it starts another program, BUILD_TIME_ONLY if only a build script does it) in lib/privacy/inventory.ts",
    ).toEqual([]);
  });

  it("lists no request the code no longer makes", () => {
    expect(found.stale, "remove it from lib/privacy/inventory.ts").toEqual([]);
  });

  it("says why each listed call is allowed", () => {
    for (const a of ALLOWED) expect(a.why.trim(), `${a.file}: ${a.call}`).not.toBe("");
  });

  it("keeps the build-time entries out of the installed app: desktop/package.mjs doesn't copy those files", () => {
    // The installer's staging list: `for (const f of ["main.mjs", …])` in desktop/package.mjs.
    const staged = readSource("desktop/package.mjs").match(/for \(const f of \[([^\]]*)\]/)?.[1];
    expect(staged, "desktop/package.mjs no longer lists the files it stages in the form this test reads").toContain('"main.mjs"');
    expect(BUILD_TIME_ONLY.length).toBeGreaterThan(0);
    for (const entry of BUILD_TIME_ONLY) {
      expect(entry.file.startsWith("desktop/"), `${entry.file} should be a desktop build script`).toBe(true);
      expect(staged, `${entry.file} is listed as build-time only but desktop/package.mjs copies it into the app`).not.toContain(
        `"${path.basename(entry.file)}"`,
      );
    }
  });

  it("lists the program the app starts, and only where the app's own server runs it", () => {
    expect(STARTS_PROGRAMS.map((s) => s.file)).toEqual(["app/api/law/provision/route.ts"]);
    expect(readSource("app/api/law/provision/route.ts")).toMatch(/spawn\(\s*"python"/);
  });

  it("still has the update check it describes (the installed app asks GitHub at start)", () => {
    const main = readFileSync(path.join(process.cwd(), "desktop", "main.mjs"), "utf8");
    expect(main).toContain("electron-updater");
    expect(SENT_ELSEWHERE.map((s) => s.id)).toContain("update-check");
  });

  it("says what is sent, when, and whether it can be taken back", () => {
    for (const s of SENT_ELSEWHERE) {
      expect(s.name.trim()).not.toBe("");
      expect(s.when.trim()).not.toBe("");
      expect(s.what.trim()).not.toBe("");
      expect(s.canTakeBack.trim()).not.toBe("");
    }
  });
});

// A safety net, not a proof (see the header of tests/helpers/source-scan.ts): these tests show what
// the scan refuses and, in "known gaps", what it plainly does not see.
describe("the scan for requests leaving this computer reads the syntax tree and refuses the common disguises", () => {
  const BACKSLASH = String.fromCharCode(92);
  const outside = (code: string, file = PROBE_FILE) => requestsOutside([{ file, code }], ALLOWED).unlisted;

  // Each is code that sends something somewhere the scan can't see to be a literal path on DotAmi's
  // own server, and what the scan must call it. String.raw keeps the backslash in the fourth.
  const PROBES: [string, string, string][] = [
    [
      "an address held in a constant (a telemetry call)",
      `const TELEMETRY = "https://example.invalid/collect";\nexport async function report(data: unknown) {\n  await fetch(TELEMETRY, { method: "POST", body: JSON.stringify(data) });\n}`,
      "fetch(TELEMETRY",
    ],
    ["an absolute URL", `await fetch("https://example.invalid/x");`, 'fetch("https://example.invalid/x"'],
    ["a protocol-relative address (another host)", `await fetch("//example.invalid/x");`, 'fetch("//example.invalid/x"'],
    ["a slash-backslash address (another host)", String.raw`await fetch("/\example.invalid/x");`, String.raw`fetch("/\example.invalid/x"`],
    ["a template that could put a host after the slash", "await fetch(`/${where}`);", "fetch(`/${where}`"],
    // An address is a path on DotAmi's own server only when the whole first argument is one literal.
    // A slash that is then joined to more text can still be the "//" that starts a host.
    [
      "a protocol-relative address built from two literals",
      `await fetch("/" + "/example.invalid/collect");`,
      `fetch("/" + "/example.invalid/collect"`,
    ],
    ["a slash joined to a constant", `await fetch("/" + HOST_PATH);`, `fetch("/" + HOST_PATH`],
    ["a literal path with something added on", `await fetch("/api/ventures/" + id);`, `fetch("/api/ventures/" + id`],
    ["a template that starts with a constant", "await fetch(`${BASE}/api/ventures`);", "fetch(`${BASE}/api/ventures`"],
    ["a lone slash", `await fetch("/");`, `fetch("/"`],
    // Browsers drop a tab or a line break inside a URL, so "/<tab>/host" is read as "//host".
    // (The tab is written as \t here and becomes a real one in the probe; the scan names it with a space.)
    ["a slash, a tab and a slash (another host once the tab is dropped)", `await fetch("/\t/example.invalid/x");`, `fetch("/ /example.invalid/x"`],
    [
      "XMLHttpRequest.open",
      `const request = new XMLHttpRequest();\nrequest.open("POST", TELEMETRY);`,
      "XMLHttpRequest.open(TELEMETRY",
    ],
    ["navigator.sendBeacon", `navigator.sendBeacon(TELEMETRY, payload);`, "sendBeacon(TELEMETRY"],
    ["a WebSocket", `const socket = new WebSocket(TELEMETRY);`, "new WebSocket(TELEMETRY"],
    ["an EventSource", `const feed = new EventSource(TELEMETRY);`, "new EventSource(TELEMETRY"],
    // The same constructors reached through the global object. The scan names them as the bare constructor.
    ["a WebSocket reached through globalThis", `const socket = new globalThis.WebSocket(TELEMETRY);`, "new WebSocket(TELEMETRY"],
    ["a WebSocket reached through window", `const socket = new window.WebSocket(TELEMETRY);`, "new WebSocket(TELEMETRY"],
    ["an EventSource reached through self", `const feed = new self.EventSource(TELEMETRY);`, "new EventSource(TELEMETRY"],
    ["an EventSource reached through a longer chain", `const feed = new window.parent.EventSource(TELEMETRY);`, "new EventSource(TELEMETRY"],
    ["a WebSocket reached through a cast global", `const socket = new (globalThis as any).WebSocket(TELEMETRY);`, "new WebSocket(TELEMETRY"],
    ["a WebSocket looked up by name", `const socket = new globalThis["WebSocket"](TELEMETRY);`, "new WebSocket(TELEMETRY"],
    ["an EventSource looked up by name", `const feed = new self['EventSource'](TELEMETRY);`, "new EventSource(TELEMETRY"],
    ["node's https.get", `import https from "node:https";\nhttps.get(TELEMETRY, () => {});`, "https.get(TELEMETRY"],
    ["importing node's https at all", `import { request } from "https";`, 'package "https"'],
    ["node's net.connect", `import net from "node:net";\nnet.connect(443, "example.invalid");`, "net.connect(443"],
    ["an HTTP client on the scan's own list", `import axios from "axios";`, 'package "axios"'],
    ["a library required rather than imported", `const got = require("got");`, 'package "got"'],
    ["a library loaded on demand", `const { default: ky } = await import("ky");`, 'package "ky"'],
    ["fetch handed on under another name", `const send = fetch;\nawait send(TELEMETRY);`, "fetch (used as a value)"],
    // Taking fetch off the global object is still handing it on. Only another object's own `fetch` is left alone.
    ["fetch taken off window", `const send = window.fetch;\nawait send(TELEMETRY);`, "fetch (used as a value)"],
    ["fetch taken off globalThis", `const send = globalThis.fetch;`, "fetch (used as a value)"],
    ["fetch taken off self", `const send = self.fetch;`, "fetch (used as a value)"],
    ["fetch taken off a cast global", `const send = (window as unknown as Deps).fetch;`, "fetch (used as a value)"],
    ["fetch taken off the global object by optional chaining", `const send = globalThis?.fetch;`, "fetch (used as a value)"],
    ["fetch pulled out of window by destructuring", `const { fetch: send } = window;`, "fetch (used as a value)"],
    ["fetch passed to something else as a property", `startClient({ fetch: send });`, "fetch (used as a value)"],
    ["fetch inside a comparison and a ternary (not JSX)", `const pick = (a: number, b: number) => [a > 1 ? fetch : null, b <a];`, "fetch (used as a value)"],
    // Blanking the page's words must leave the code around them in view.
    [
      "a call inside an element's attribute, beside text that mentions one",
      `export const Send = () => <button onClick={() => fetch(TELEMETRY)}>Send (we fetch(x) for you)</button>;`,
      "fetch(TELEMETRY",
    ],
    ["a call in an expression between the page's words", `export const Sent = () => <p>Sent {fetch(TELEMETRY)} and done</p>;`, "fetch(TELEMETRY"],
    ["fetch looked up by name", `await globalThis["fetch"](TELEMETRY);`, 'fetch (by name: ["fetch"])'],
    ["a call through the wrapper around fetch", `await postJson("https://example.invalid/x", {});`, 'postJson("https://example.invalid/x"'],
  ];

  it.each(PROBES)("refuses %s", (_what, code, call) => {
    expect(outside(code)).toContain(`${PROBE_FILE}: ${call}`);
  });

  // Disguises found by the two re-checks of this scan (the first five were the lib/zz-probe.ts
  // cases) and the ones the syntax-tree scan was built to close. Each sends something somewhere
  // the older text scan could not see, and the scan must now name it.
  const DISGUISES: [string, string, string][] = [
    // A quote or backtick inside a regular expression threw the text reader out of step, so a real call after it was read as part of a string.
    ["a call after a double quote inside a regular expression", `const quote = /"/g; await fetch(TELEMETRY);`, "fetch(TELEMETRY"],
    [
      "a call after a backtick inside a regular expression",
      "const tick = /`/g;\nawait fetch(TELEMETRY);\nconst after = `done`;",
      "fetch(TELEMETRY",
    ],
    // The backslash is made at run time (not typed in this file) so the escape reaches the scan as an escape.
    ["a name written with a unicode escape", `await ${BACKSLASH}u0066etch(TELEMETRY);`, "fetch(TELEMETRY"],
    // An address is judged on the text as written: a second slash written as an escape is still another host.
    [
      "a protocol-relative address whose second slash is an escape",
      String.raw`await fetch("/\x2fexample.invalid/x");`,
      String.raw`fetch("/\x2fexample.invalid/x"`,
    ],
    ["a name written with a braced unicode escape", `await fet${BACKSLASH}u{63}h(TELEMETRY);`, "fetch(TELEMETRY"],
    ["a method name written with a unicode escape", `navigator.send${BACKSLASH}u0042eacon(TELEMETRY, payload);`, "sendBeacon(TELEMETRY"],
    ["a constructor name written with a unicode escape", `const socket = new Web${BACKSLASH}u0053ocket(TELEMETRY);`, "new WebSocket(TELEMETRY"],
    [
      "a name built from two strings",
      `await globalThis["fe" + "tch"](TELEMETRY);`,
      `globalThis["fe" + "tch"] (key not a plain string)`,
    ],
    ["importing node's https through a template literal", "const https = await import(`node:https`);", 'package "node:https"'],
    // Module names, however they are quoted, reached or built.
    ["a module name joined from two strings", `const https = await import("node:" + "https");`, `import("node:" + "https" (package name not a plain string)`],
    ["a module name that is a variable", `const https = require(name);`, "require(name (package name not a plain string)"],
    ["a module name that is a template with a part in it", "const https = await import(`node:${NAME}`);", "import(`node:${NAME}` (package name not a plain string)"],
    ["requiring https by a template literal", "const https = require(`https`);", 'package "https"'],
    ["requiring https in single quotes", `const https = require('node:https');`, 'package "node:https"'],
    ["requiring https with an escape inside the name", String.raw`const https = require("ht\x74ps");`, 'package "https"'],
    [
      "requiring https through createRequire",
      `import { createRequire } from "node:module";\nconst https = createRequire(import.meta.url)("https");`,
      'package "https"',
    ],
    [
      "requiring https through a name that holds createRequire's result",
      `import { createRequire } from "node:module";\nconst load = createRequire(import.meta.url);\nconst https = load("https");`,
      'package "https"',
    ],
    ["getting https from the process", `const https = process.getBuiltinModule("node:https");`, 'package "node:https"'],
    [
      "requiring https through .call",
      `const https = require.call(null, "https");`,
      'require.call("https" (a module loaded through .call, .apply or .bind)',
    ],
    ["re-exporting from https", `export * from "https";`, 'package "https"'],
    ["importing a module from a web address", `const code = await import("https://example.invalid/x.js");`, 'package "https://example.invalid/x.js"'],
    ["undici, an HTTP client on the scan's own list", `import { request } from "undici";`, 'package "undici"'],
    // Other ways to send: another program, electron's own net. Each call into child_process is named with the program it starts.
    ["running curl with child_process", `import { execFile } from "node:child_process";\nexecFile("curl", [TELEMETRY]);`, 'child_process.execFile("curl"'],
    ["child_process required without node:", `const { spawn } = require("child_process");\nspawn("curl", [TELEMETRY]);`, 'child_process.spawn("curl"'],
    ["electron's net looked up by a string", `import electron from "electron";\nelectron["net"].request(TELEMETRY);`, 'package "electron" (net)'],
    ["electron's net looked up by a string, with no import in view", `electron["net"].request(TELEMETRY);`, 'package "electron" (net)'],
    ["electron's net taken off a namespace import", `import * as e from "electron";\ne.net.request(TELEMETRY);`, 'package "electron" (net)'],
    ["electron's net taken out of require", `const { net } = require("electron");`, 'package "electron" (net)'],
    ["electron's net renamed on import", `import { net as electronNet } from "electron";`, 'package "electron" (net)'],
    ["electron looked up by a variable", `import electron from "electron";\nconst api = electron[WHICH];`, "electron[WHICH] (key not a plain string)"],
    // A name looked up on the global object by something other than a plain string.
    ["a global looked up by a variable", `const k = "fetch";\nawait globalThis[k](TELEMETRY);`, "globalThis[k] (key not a plain string)"],
    ["a global taken out by a computed key", `const { [KEY]: send } = globalThis;`, "globalThis[KEY] (key not a plain string)"],
    ["Reflect.get on the global object", `await Reflect.get(globalThis, "fetch")(TELEMETRY);`, "Reflect.get(globalThis"],
    ["Reflect.get with a variable key on window", `const send = Reflect.get(window, KEY);`, "Reflect.get(window"],
    // The network's functions called some other way.
    ["fetch called through .call on a copy of the global object", `const g: any = globalThis;\nawait g.fetch.call(g, TELEMETRY);`, "fetch (used as a value)"],
    ["fetch called through .apply", `await window.fetch.apply(window, [TELEMETRY]);`, "fetch (used as a value)"],
    ["sendBeacon looked up by a string", `navigator["sendBeacon"](TELEMETRY, payload);`, 'sendBeacon (by name: ["sendBeacon"])'],
    ["sendBeacon bound to the navigator", `const beacon = navigator.sendBeacon.bind(navigator);`, "sendBeacon (used as a value)"],
    ["an optional call of fetch", `await fetch?.(TELEMETRY);`, "fetch(TELEMETRY"],
    ["fetch looked up by a string key in an object", `startClient({ "fetch": send });`, 'fetch (by name: ["fetch"])'],
    ["WebSocket held under another name", `const Socket = WebSocket;\nconst socket = new Socket(TELEMETRY);`, "WebSocket (used as a value)"],
    ["WebSocket built through Reflect.construct", `const socket = Reflect.construct(globalThis.WebSocket, [TELEMETRY]);`, "WebSocket (used as a value)"],
    ["a class that extends WebSocket", `class Tunnel extends WebSocket {}`, "WebSocket (used as a value)"],
    ["XMLHttpRequest held under another name", `const Request = XMLHttpRequest;`, "XMLHttpRequest (used as a value)"],
    ["an XMLHttpRequest's open called through .call", `const xhr = new XMLHttpRequest();\nxhr.open.call(xhr, "GET", TELEMETRY);`, "XMLHttpRequest.open.call(xhr"],
    ["another window looked up by a variable", `const found = window.parent[KEY];`, "window.parent[KEY] (key not a plain string)"],
  ];

  it.each(DISGUISES)("refuses %s", (_what, code, call) => {
    expect(outside(code)).toContain(`${PROBE_FILE}: ${call}`);
  });

  it("leaves an escaped name alone when it isn't one of the network's", () => {
    expect(outside(`const ${BACKSLASH}u0066oo = 1; export const bar = ${BACKSLASH}u0066oo;`)).toEqual([]);
  });

  it("refuses a file it can't parse rather than calling it clean", () => {
    expect(() => networkCalls("const = ;", [], "broken.ts")).toThrow(/doesn't parse/);
  });

  it("refuses the telemetry probe inside the real files too (the same scan the real check runs)", () => {
    const [, probe] = PROBES[0];
    const before = requestsOutside(networkSources, ALLOWED).unlisted;
    const after = requestsOutside([...networkSources, { file: PROBE_FILE, code: probe }], ALLOWED).unlisted;
    expect(after).toEqual([...before, `${PROBE_FILE}: fetch(TELEMETRY`]);
  });

  it("lets through a literal path on DotAmi's own server", () => {
    expect(outside(`await fetch("/api/ventures", { cache: "no-store" });`)).toEqual([]);
    expect(outside("await fetch(`/api/ventures/${id}/links?linkId=${encodeURIComponent(linkId)}`);")).toEqual([]);
    expect(outside(`const request = new XMLHttpRequest();\nrequest.open("GET", "/api/readout");`)).toEqual([]);
    expect(outside(`await postJson("/api/figures/agree", { ventureId });`)).toEqual([]);
    // Single quotes, a query string and a template with several parts are still one literal.
    expect(outside(`await fetch('/api/figures?venture=abc');`)).toEqual([]);
    expect(outside("await fetch(`/api/figures?venture=${encodeURIComponent(venture.id)}`, { cache: \"no-store\" });")).toEqual([]);
    // "/api/…" followed by a comma is the end of the first argument, not the start of more of it.
    expect(outside(`await fetch("/api/readout", { method: "POST" });`)).toEqual([]);
  });

  it("is not fooled by the words in a comment or a message", () => {
    expect(outside(`// await fetch(TELEMETRY);\nconst note = "could not fetch(data) from https://example.invalid";`)).toEqual([]);
    expect(outside(`/* new WebSocket(TELEMETRY) */ export const label = "sendBeacon(x)";`)).toEqual([]);
    expect(outside(`// new globalThis.WebSocket(TELEMETRY)\nexport const label = "new self.EventSource(x) and new window['WebSocket'](y)";`)).toEqual([]);
    // window.open is a link the person clicks, not a request DotAmi makes.
    expect(outside(`window.open("https://example.invalid/", "_blank");`)).toEqual([]);
  });

  // The word "fetch" in these is not the network function, so the scan has nothing to say about them.
  const NOT_THE_NETWORK: [string, string][] = [
    ["the word in text on the page", `export const Note = () => <p>We fetch nothing</p>;`],
    [
      "the word in text after an expression, with punctuation and an entity",
      "export function Note({ count }: { count: number }) {\n  return (\n    <p>\n      {count} fetch (or two) &amp; more; done\n    </p>\n  );\n}",
    ],
    ["the word in the text of an element with attributes", `export const Note = () => <a href="/x" onClick={() => go()}>fetch it later</a>;`],
    // Text that reads like a call is still text: the page's words are not code for any of the scan's rules.
    [
      "text on the page that reads like a call",
      "export const Note = () => (\n  <p>\n    We fetch(url) and new WebSocket(x), and don't sendBeacon(y) or call https.get(z).\n  </p>\n);",
    ],
    ["a property of another object", `const go = router.fetch;`],
    ["a property reached through a longer path", `const go = this.client.fetch;\nconst again = api?.fetch;\nconst third = routes[0].fetch;`],
  ];

  it.each(NOT_THE_NETWORK)("is not fooled by the word fetch as %s", (_what, code) => {
    expect(outside(code)).toEqual([]);
  });

  // Ordinary code that looks a little like a disguise but isn't one. The tree-reading rules must
  // stay quiet on each, or the allow-list fills up with noise.
  const ORDINARY: [string, string][] = [
    ["a quote inside a regular expression, with a harmless line after it", `const quote = /"/g;\nexport const has = (s: string) => quote.test(s);`],
    ["a backtick inside a regular expression", "const tick = /`/g;\nexport const count = (s: string) => s.split(tick).length;"],
    ["a plain-string lookup on the global object that isn't the network's", `window["scrollTo"](0, 0);\nconst root = globalThis["__dotami"];`],
    ["a lookup by a variable on something that isn't the global object", `const pick = (table: Record<string, string>, key: string) => table[key];\nconst value = process.env[NAME];`],
    ["a number as the key on a frame list", `const first = window.frames[0];`],
    ["a tree node called parent, indexed by a variable", `export const sibling = (parent: Record<string, string>, key: string) => parent[key];`],
    ["importing and requiring modules that aren't network ones", "const reader = await import(`@/lib/figures/file/read-file`);\nconst fs = require('node:fs');\nimport path from \"node:path\";"],
    ["importing something from electron that isn't its net", `import { app, BrowserWindow } from "electron";\nconst { ipcRenderer } = require("electron");`],
    ["Reflect.get on something that isn't the global object", `const label = Reflect.get(config, "label");`],
    ["a type that names fetch or WebSocket (nothing runs)", `type Fetcher = typeof fetch;\nlet socket: WebSocket | null = null;\ninterface Deps { fetch: Fetcher }`],
    ["a class with a fetch method of its own", `class Cache { fetch(key: string) { return key; } }`],
    ["words in a comment or a string that read like a disguise", `// globalThis[k](url); require(name); import("node:" + "https")\nconst note = "require(name) and Reflect.get(globalThis, k)";`],
    ["router.fetch.name (another object's own fetch, not called)", `const label = router.fetch.name;`],
  ];

  it.each(ORDINARY)("stays quiet on %s", (_what, code) => {
    expect(outside(code)).toEqual([]);
  });

  // What the scan does NOT see, named plainly in the header of tests/helpers/source-scan.ts and in
  // lib/privacy/inventory.ts. Each of these sends something somewhere. This test pins that the scan
  // really does miss them, so those two comments can't claim more than is true: if one starts being
  // caught, move it from "still gets past" to "refused" in those comments, then delete it here.
  // (A request made this way is for code review; in a browser the page's Content-Security-Policy
  // also stops most of them.)
  const EVAL = "ev" + "al";
  const FUNCTION_CONSTRUCTOR = "Func" + "tion";
  // A third item names other files the code needs (read as new files beside the probe).
  const STILL_GETS_PAST: [string, string, { file: string; code: string }[]?][] = [
    ["a copy of window under another name, then its fetch", `const w = window;\nconst send = w.fetch;\nawait send(TELEMETRY);`],
    ["fetch taken off document.defaultView", `const send = document.defaultView.fetch;\nawait send(TELEMETRY);`],
    ["an image whose address carries the data", `new Image().src = "https://example.invalid/p?d=" + data;`],
    ["a script tag with an address", `export const Tag = () => <script src="https://example.invalid/x.js" />;`],
    ["window.open with the data in the address", `window.open("https://example.invalid/?d=" + data);`],
    ["moving the page to an address", `location.href = "https://example.invalid/?d=" + data;`],
    ["moving the page with location.assign", `location.assign("https://example.invalid/?d=" + data);`],
    ["a worker script from an address", `const worker = new Worker("https://example.invalid/w.js");\nimportScripts("https://example.invalid/x.js");`],
    ["a node internal binding", `process.binding("tcp_wrap");`],
    ["code built at run time", `${EVAL}("fetch(TELEMETRY)");`],
    ["code made by the Function constructor", `await ${FUNCTION_CONSTRUCTOR}("return fetch")()(TELEMETRY);`],
    // Code run from a string by electron: the same class as eval. (The string is only a string to the scan.)
    ["code run from a string by webContents.executeJavaScript", `await win.webContents.executeJavaScript("fetch('https://example.invalid/x')");`],
    // The `.open` of an XMLHttpRequest is read only in a file that itself spells the word.
    [
      "an XMLHttpRequest made by a helper in one file and opened in another",
      `import { makeRequest } from "@/lib/probe-xhr-helper";\nmakeRequest().open("POST", "https://example.invalid/x");`,
      [{ file: "lib/probe-xhr-helper.ts", code: `export const makeRequest = () => new XMLHttpRequest();` }],
    ],
    ["a property descriptor taken off the global object", `const d = Object.getOwnPropertyDescriptor(window, KEY);\nawait d?.value(TELEMETRY);`],
    // A wrapper (postJson) is followed by the names it is imported, renamed and re-exported under, but not through a computed lookup.
    ["a wrapper looked up on a module namespace by a variable key", `import * as agree from "@/components/ventures/agree-prompt";\nawait agree[HELPER]("https://example.invalid/x", {});`],
    // The names of electron's loaders are read when they are written out, not when they are looked up by a variable.
    ["loadURL looked up on a window by a variable key", `win[LOADER]("https://example.invalid/x");`],
    ["a program started by electron's own utilityProcess", `import { utilityProcess } from "electron";\nutilityProcess.fork("C:/somewhere/else.js");`],
    ["a connect called on something the scan can't tell is node's net or tls (a function returned it)", `const lib = pick();\nlib.connect(443, "example.invalid");`],
    // Next.js settings that make the SERVER fetch for a page are configuration, not a call.
    ["a Next.js rewrite to another address (next.config.mjs)", `export async function rewrites() {\n  return [{ source: "/a", destination: "https://example.invalid/:path*" }];\n}`],
    ["a middleware rewrite to another address", `export function middleware() {\n  return NextResponse.rewrite(new URL("https://example.invalid/x"));\n}`],
  ];

  it.each(STILL_GETS_PAST)(
    "does not see %s (a known gap, written down in the helper's header)",
    (_what, code, also = []) => {
      const found = requestsOutside([{ file: PROBE_FILE, code }, ...also], ALLOWED).unlisted;
      expect(found, "the scan now sees this: update the 'still gets past' lists in tests/helpers/source-scan.ts and lib/privacy/inventory.ts, then remove it from here").toEqual([]);
    },
  );

  it("allows a listed call only in the file it is listed for, and only as often as it is listed", () => {
    const listed = LOCAL_REQUESTS.find((c) => c.call === "fetch(url")!;
    expect(outside("await fetch(url, init);", listed.file)).toEqual([]);
    expect(outside("await fetch(url, init);")).toEqual([`${PROBE_FILE}: fetch(url`]);
    expect(outside("await fetch(url, init);\nawait fetch(url, other);", listed.file)).toEqual([`${listed.file}: fetch(url`]);
  });
});

// ---------------------------------------------------------------------------------------------
// The final re-check of the scan: each thing it found getting past, written as code the scan must
// now refuse. They are judged inside the REAL tree (a probe added to the end of a real file is read
// with that file's own listed calls; a new file is read beside the real ones), so a listing that is
// too wide shows up here. tests/helpers/network-probes.ts holds the code.
describe("the scan refuses what the final re-check found getting past it", () => {
  const MUST_REFUSE: [string, Probe[]][] = [
    ["a package by a subpath", SUBPATH_PROBES],
    ["a wrapper reached another way", WRAPPER_PROBES],
    ["a browser way to send", BROWSER_PROBES],
    ["a program started", PROGRAM_PROBES],
    ["the desktop app's main process", DESKTOP_PROBES],
  ];
  for (const [group, probes] of MUST_REFUSE) {
    it.each(probes.map((p) => [p.what, p] as const))(`refuses ${group}: %s`, (_what, probe) => {
      expect(refusedFor(probe)).toContain(`${probe.file}: ${probe.call}`);
    });
  }

  const MUST_STAY_QUIET: [string, QuietProbe[]][] = [
    ["a package by a subpath", SUBPATH_QUIET],
    ["a wrapper", WRAPPER_QUIET],
    ["a browser way to send", BROWSER_QUIET],
    ["a program or the desktop app", DESKTOP_QUIET],
  ];
  for (const [group, probes] of MUST_STAY_QUIET) {
    it.each(probes.map((p) => [p.what, p] as const))(`stays quiet on ${group}: %s`, (_what, probe) => {
      expect(refusedFor(probe)).toEqual([]);
    });
  }

  it("lists each of the calls it names as often as they are made: a second call of the listed program needs its own line", () => {
    const [listed] = STARTS_PROGRAMS;
    const twice = refusedFor({ what: "", file: listed.file, appendTo: true, code: `spawn("python", ["another.py"]);` });
    expect(twice).toEqual([`${listed.file}: ${listed.call}`]);
  });

  it("names the program of each call as written, so a different program is a different call", () => {
    const names = (code: string) => networkCalls(code, [], "lib/x.ts").map((c) => c.call);
    expect(names(`import { spawn } from "node:child_process";\nspawn("python", []);\nspawn("curl", []);`)).toEqual([
      'child_process.spawn("python"',
      'child_process.spawn("curl"',
    ]);
    // process.execPath is the Node that is already running DotAmi's own build.
    expect(names(`import { execFileSync } from "node:child_process";\nexecFileSync(process.execPath, []);`)).toEqual([
      "child_process.execFileSync(process.execPath",
    ]);
  });

  it("names a long shell command in full, so two commands with the same start don't read alike", () => {
    const first = 'cp.' + "ex" + 'ec("' + "a".repeat(80) + ' one")';
    const second = 'cp.' + "ex" + 'ec("' + "a".repeat(80) + ' two")';
    const calls = networkCalls(`import * as cp from "node:child_process";\n${first};\n${second};`, [], "lib/x.ts").map((c) => c.call);
    expect(new Set(calls).size).toBe(2);
  });

  it("matches an import to its package: every subpath is the package, once per file", () => {
    const names = (code: string) => networkCalls(code, [], "components/p.tsx", { packages: NETWORK_PACKAGES }).map((c) => c.call);
    expect(names(`import a from "@anthropic-ai/sdk";\nimport b from "@anthropic-ai/sdk/resources";\nconst c = require("@anthropic-ai/sdk/index");`)).toEqual([
      'package "@anthropic-ai/sdk"',
    ]);
    expect(names(`import https from "node:https";\nimport more from "https";`)).toEqual(['package "node:https"', 'package "https"']);
  });
});

// ---------------------------------------------------------------------------------------------
// Packages. The inventory lists every package that ships and that DotAmi names itself, and the code imports only packages that
// package.json declares.

/** The top-folder files Next runs inside the server (and so bundles): middleware and instrumentation. The tool configs (next.config.mjs, vitest.config.ts) are not. */
const BUNDLED_ROOT_FILE = /^(?:middleware|instrumentation(?:-client)?)\.[cm]?[jt]sx?$/;

/** The files whose imports end up inside the app: everything under app/, components/ and lib/, and the top folder's middleware and instrumentation. */
function bundledSources<T extends { file: string }>(sources: readonly T[]): T[] {
  return sources.filter(({ file }) => ["app/", "components/", "lib/"].some((folder) => file.startsWith(folder)) || BUNDLED_ROOT_FILE.test(file));
}

/** The packages these files import, by package name (a subpath is the package; node's own modules and our own files aren't packages). Type-only imports count. */
function importedPackages(sources: readonly { file: string; code: string }[]): string[] {
  const names = sources.flatMap(({ file, code }) =>
    importedModules(code, file)
      .map((spec) => moduleName(spec))
      .filter((m) => m.kind === "package")
      .map((m) => m.name),
  );
  return [...new Set(names)].sort();
}

/**
 * The packages that ship: package.json "dependencies", plus those desktop/package.mjs copies into
 * the installed app, plus `bundled`: the packages the code Next bundles imports (importedPackages of
 * bundledSources), because a devDependency imported from app/, components/ or lib/ is inside the
 * built app all the same.
 */
function shippingPackages(
  manifest: { dependencies?: Record<string, string>; optionalDependencies?: Record<string, string> },
  packageScript: string,
  bundled: readonly string[] = [],
): string[] {
  // `copyWithDependencies("electron-updater", stage)`; the function's own declaration has no quoted name.
  const copied = [...packageScript.matchAll(/copyWithDependencies\(\s*"([^"]+)"/g)].map((m) => m[1]);
  return [...new Set([...Object.keys(manifest.dependencies ?? {}), ...Object.keys(manifest.optionalDependencies ?? {}), ...copied, ...bundled])].sort();
}

/** The packages that ship with no entry in the list, and the entries for packages that don't ship. */
function dependencyGaps(shipping: readonly string[], entries: readonly DependencyEntry[]) {
  const listed = entries.map((e) => e.name);
  return { missing: shipping.filter((n) => !listed.includes(n)), stale: listed.filter((n) => !shipping.includes(n)) };
}

/** "file: package" for each package a file imports that isn't in `declared` (node's own modules and our own files aren't packages). */
function undeclaredImports(sources: readonly { file: string; code: string }[], declared: ReadonlySet<string>): string[] {
  return sources.flatMap(({ file, code }) => {
    const names = importedModules(code, file)
      .map((spec) => moduleName(spec))
      .filter((m) => m.kind === "package" && !declared.has(m.name))
      .map((m) => m.name);
    return [...new Set(names)].map((name) => `${file}: ${name}`);
  });
}

describe("the privacy inventory lists every package that ships and that DotAmi names", () => {
  const manifest = JSON.parse(readSource("package.json")) as { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };
  const packageScript = readSource("desktop/package.mjs");
  const bundledImports = importedPackages(bundledSources(networkSources));
  const shipping = shippingPackages(manifest, packageScript, bundledImports);
  const real = dependencyGaps(shipping, DEPENDENCIES);

  it("reads package.json, the installer script and the bundled code (a guard against the check silently finding nothing)", () => {
    expect(shipping).toEqual(expect.arrayContaining(["next", "react", "@prisma/client", "@anthropic-ai/sdk", "electron-updater"]));
    // What the bundled folders import today: the bundled-code half of the check really reads imports.
    expect(bundledImports).toEqual(expect.arrayContaining(["next", "react", "@prisma/client", "read-excel-file", "papaparse", "fflate", "@anthropic-ai/sdk"]));
    // Every one of those is in package.json "dependencies" today, so none is a devDependency that only this check would notice.
    expect(bundledImports.filter((n) => !Object.keys(manifest.dependencies ?? {}).includes(n))).toEqual([]);
    // electron-updater is a development dependency that the installer copies in: it ships all the same.
    expect(Object.keys(manifest.dependencies ?? {})).not.toContain("electron-updater");
    expect(Object.keys(manifest.devDependencies ?? {})).toContain("electron-updater");
  });

  it("has an entry in DEPENDENCIES for every package in dependencies, the installer copy list or the bundled code", () => {
    expect(
      real.missing,
      `add these to DEPENDENCIES in lib/privacy/inventory.ts: read each package's README and search its files for fetch, XMLHttpRequest, WebSocket and node's http, https and net, then say whether it can reach the network and why: ${real.missing.join(", ")}`,
    ).toEqual([]);
  });

  it("lists no package that doesn't ship, and none twice", () => {
    expect(real.stale, "remove it from DEPENDENCIES in lib/privacy/inventory.ts").toEqual([]);
    expect(new Set(DEPENDENCIES.map((d) => d.name)).size).toBe(DEPENDENCIES.length);
  });

  it("says, for each, whether it can reach the network, and what that was read from", () => {
    for (const d of DEPENDENCIES) {
      expect(["yes", "no", "unverified"], `${d.name} needs network: "yes", "no" or "unverified"`).toContain(d.network);
      expect(d.why.trim().length, `${d.name} needs to say what it found, and where`).toBeGreaterThan(40);
    }
  });

  it("refuses an import of a package marked yes or unverified, by whatever path it is reached", () => {
    const marked = DEPENDENCIES.filter((d) => d.network !== "no");
    expect(marked.map((d) => d.name)).toEqual(expect.arrayContaining(["@anthropic-ai/sdk", "electron-updater", "papaparse"]));
    for (const d of marked) {
      for (const spec of [d.name, `${d.name}/some/file.js`]) {
        const calls = networkCalls(`import x from "${spec}";`, [], "components/p.tsx", { packages: NETWORK_PACKAGES }).map((c) => c.call);
        expect(calls, `${spec} should be refused`).toContain(`package "${d.name}"`);
      }
    }
  });

  // The check must be able to fail: each of these is a dependency (or a package the installer copies in)
  // that is not in the list.
  it("fails on a new dependency that isn't listed (an analytics, email or AI package, an HTTP client)", () => {
    const added = ["posthog-js", "resend", "@sendgrid/mail", "@google/generative-ai", "axios", "nodemailer", "mixpanel-browser"];
    const grown = { dependencies: { ...manifest.dependencies, ...Object.fromEntries(added.map((n) => [n, "^1.0.0"])) } };
    const gaps = dependencyGaps(shippingPackages(grown, packageScript), DEPENDENCIES);
    expect(gaps.missing).toEqual([...added].sort());
  });

  it("fails on a package the installer copies in that isn't listed", () => {
    const script = `${packageScript}\ncopyWithDependencies("some-new-sdk", stage);`;
    expect(dependencyGaps(shippingPackages(manifest, script), DEPENDENCIES).missing).toEqual(["some-new-sdk"]);
  });

  it("fails on an entry for a package that was removed", () => {
    const shrunk = { dependencies: Object.fromEntries(Object.entries(manifest.dependencies ?? {}).filter(([n]) => n !== "fflate")) };
    expect(dependencyGaps(shippingPackages(shrunk, packageScript), DEPENDENCIES).stale).toEqual(["fflate"]);
  });

  it("doesn't ask for an entry for a development-only package that nothing bundled imports (tests, build tools)", () => {
    const withDev = { ...manifest, devDependencies: { ...manifest.devDependencies, "some-test-tool": "^1.0.0" } };
    expect(dependencyGaps(shippingPackages(withDev, packageScript, bundledImports), DEPENDENCIES).missing).toEqual([]);
    // Imported only from folders that aren't bundled into the app (tests, scripts, prisma, e2e, desktop, tool configs): not asked for either.
    const elsewhere = [
      { file: "tests/x.spec.ts", code: `import { Resend } from "resend";` },
      { file: "scripts/tool.mjs", code: `import mixpanel from "mixpanel-browser";` },
      { file: "prisma/seed.ts", code: `import x from "some-seed-tool";` },
      { file: "e2e/x.ts", code: `import y from "some-e2e-tool";` },
      { file: "desktop/extra.js", code: `import z from "some-desktop-tool";` },
      { file: "next.config.mjs", code: `import w from "some-config-tool";` },
    ];
    expect(bundledSources(elsewhere)).toEqual([]);
  });

  // The check must be able to fail for a package that is only a devDependency: Next bundles whatever
  // app/, components/ and lib/ import, so it ships whether or not package.json says "dependencies".
  const DEV_BUNDLED: [string, string, string, string][] = [
    ["an email SDK imported by an API route", "app/api/mail/route.ts", `import { Resend } from "resend";`, "resend"],
    ["an analytics SDK imported by a component", "components/probe-track.tsx", `import mixpanel from "mixpanel-browser";`, "mixpanel-browser"],
    ["a package required in a library file", "lib/probe-mail.ts", `const { Resend } = require("resend");`, "resend"],
    ["a package loaded on demand by a page", "app/probe/page.tsx", `const mixpanel = await import("mixpanel-browser");`, "mixpanel-browser"],
    ["a package imported by a subpath", "lib/probe-sub.ts", `import track from "mixpanel-browser/dist/mixpanel.cjs";`, "mixpanel-browser"],
    ["a package imported by the middleware", "middleware.ts", `import { Resend } from "resend";`, "resend"],
    ["a package imported only for its types", "components/probe-type.tsx", `import type { Mixpanel } from "mixpanel-browser";`, "mixpanel-browser"],
  ];

  it.each(DEV_BUNDLED)("fails on %s when it is only a devDependency and isn't listed", (_what, file, code, name) => {
    const withDev = { ...manifest, devDependencies: { ...manifest.devDependencies, [name]: "^1.0.0" } };
    const sources = [...networkSources, { file, code }];
    const gaps = dependencyGaps(shippingPackages(withDev, packageScript, importedPackages(bundledSources(sources))), DEPENDENCIES);
    expect(gaps.missing).toEqual([name]);
  });

  it("passes once the devDependency that bundled code imports has an entry (and goes stale when the import goes)", () => {
    const listed: DependencyEntry[] = [...DEPENDENCIES, { name: "resend", network: "yes", why: "Probe entry: the email SDK, read from its own README and files for this test." }];
    const sources = [...networkSources, { file: "app/api/mail/route.ts", code: `import { Resend } from "resend";` }];
    const withDev = { ...manifest, devDependencies: { ...manifest.devDependencies, resend: "^1.0.0" } };
    expect(dependencyGaps(shippingPackages(withDev, packageScript, importedPackages(bundledSources(sources))), listed)).toEqual({ missing: [], stale: [] });
    // The entry stays on the list but nothing imports the package any more: stale.
    expect(dependencyGaps(shippingPackages(withDev, packageScript, bundledImports), listed).stale).toEqual(["resend"]);
  });
});

describe("the app loads no code from a folder the scan doesn't read", () => {
  it("finds no file under the scanned folders that imports from scripts/, prisma/, tests/, e2e/ or anywhere else unread", () => {
    const outside = networkSources.flatMap(({ file, code }) => importsFromUnscannedCode(code, file).map((spec) => `${file}: ${spec}`));
    expect(outside, "code the app loads from an unread folder runs without being scanned: move it into a scanned folder, or stop importing it").toEqual([]);
  });

  it.each(OUTSIDE_IMPORT_PROBES.map((p) => [p.what, p] as const))("refuses an import of %s", (_what, probe) => {
    expect(importsFromUnscannedCode(probe.code, probe.file)).toEqual([probe.spec]);
  });

  it.each(OUTSIDE_IMPORT_QUIET.map((p) => [p.what, p] as const))("lets through an import of %s", (_what, probe) => {
    expect(importsFromUnscannedCode(probe.code, probe.file)).toEqual([]);
  });
});

describe("the scan refuses a package that package.json doesn't declare", () => {
  const manifest = JSON.parse(readSource("package.json")) as { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };
  const declared: ReadonlySet<string> = new Set([...Object.keys(manifest.dependencies ?? {}), ...Object.keys(manifest.devDependencies ?? {})]);

  it("finds no file that imports a package nobody declared", () => {
    expect(undeclaredImports(networkSources, declared), "add it to package.json (and DEPENDENCIES in lib/privacy/inventory.ts if it ships), or stop importing it: a package that is only there because another one needs it can change or vanish with that one").toEqual([]);
  });

  it("reads the real imports (a guard against the check silently finding nothing)", () => {
    const seen = new Set(networkSources.flatMap(({ file, code }) => importedModules(code, file).map((s) => moduleName(s).name)));
    expect([...seen]).toEqual(expect.arrayContaining(["next", "react", "@prisma/client", "electron", "electron-updater", "electron-builder", "fs", "path"]));
  });

  it.each(UNLISTED_PACKAGE_PROBES.map((p) => [p.what, p] as const))("refuses %s", (_what, probe) => {
    expect(undeclaredImports([{ file: probe.file, code: probe.code }], declared)).toEqual([`${probe.file}: ${probe.name}`]);
  });

  it.each(DECLARED_IMPORT_QUIET.map((p) => [p.what, p] as const))("lets through %s", (_what, probe) => {
    expect(undeclaredImports([{ file: probe.file, code: probe.code }], declared)).toEqual([]);
  });

  it("reads a module name as its package: subpaths, scopes, node's own and our own files", () => {
    expect(moduleName("next/server")).toEqual({ kind: "package", name: "next" });
    expect(moduleName("react-dom/client")).toEqual({ kind: "package", name: "react-dom" });
    expect(moduleName("@anthropic-ai/sdk")).toEqual({ kind: "package", name: "@anthropic-ai/sdk" });
    expect(moduleName("@anthropic-ai/sdk/resources/messages")).toEqual({ kind: "package", name: "@anthropic-ai/sdk" });
    expect(moduleName("axios/dist/node/axios.cjs")).toEqual({ kind: "package", name: "axios" });
    // A path into node_modules is the package, however it is spelled.
    expect(moduleName("../../node_modules/axios/index.js")).toEqual({ kind: "package", name: "axios" });
    expect(moduleName("./node_modules/@sentry/browser/build/x.js")).toEqual({ kind: "package", name: "@sentry/browser" });
    expect(moduleName("node:fs/promises")).toEqual({ kind: "builtin", name: "fs" });
    expect(moduleName("fs/promises")).toEqual({ kind: "builtin", name: "fs" });
    expect(moduleName("node:sqlite")).toEqual({ kind: "builtin", name: "sqlite" });
    expect(moduleName("https")).toEqual({ kind: "builtin", name: "https" });
    for (const own of ["./a", "../a", "../../a/b", "/abs/path", "@/lib/a", "#internal", ".", ".."]) expect(moduleName(own).kind, own).toBe("relative");
    for (const address of ["https://example.invalid/x.js", "http://x", "//example.invalid/x", "data:text/javascript,1"]) expect(moduleName(address).kind, address).toBe("address");
  });
});

// ---------------------------------------------------------------------------------------------
// Which files the scan reads

describe("the files the network scan reads", () => {
  const root = mkdtempSync(path.join(tmpdir(), "dotami-scan-"));
  const FETCH = `await fetch("https://example.invalid/x");\n`;
  const put = (file: string, text: string) => {
    mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    writeFileSync(path.join(root, file), text);
  };
  // What must be read: every kind of source file in the four folders and in the top folder.
  const READ = [
    "app/deep/er/page.tsx",
    "app/thing.cjs",
    "components/legacy.js",
    "components/legacy.jsx",
    "components/new.ts",
    "components/module-flavour.mts",
    "components/common-flavour.cts",
    "desktop/extra.js",
    "desktop/main.mjs",
    "instrumentation-client.ts",
    "instrumentation.ts",
    "lib/helper.mjs",
    "middleware.ts",
    "next.config.mjs",
    "sentry.server.config.js",
  ];
  // What must not be: other folders, type declarations, build output, and files that aren't code.
  const LEFT = ["scripts/tool.mjs", "prisma/seed.ts", "tests/x.spec.ts", "e2e/x.ts", "next-env.d.ts", "components/types.d.ts", "components/types.d.mts", "components/readme.md", "components/data.json", "desktop/page.html", "app/globals.css", "app/.next/x.js", "package.json"];
  for (const file of [...READ, ...LEFT]) put(file, FETCH);

  it("reads every .ts, .tsx, .mts, .cts, .js, .jsx, .mjs and .cjs file in app, components, lib and desktop, and in the top folder", () => {
    expect(networkSourceFiles(root)).toEqual([...READ].sort());
  });

  it("finds the request in each of them", () => {
    for (const file of networkSourceFiles(root)) {
      const calls = networkCalls(readFileSync(path.join(root, file), "utf8"), [], file).filter((c) => !c.relative);
      expect(calls.map((c) => c.call), file).toEqual([`fetch("https://example.invalid/x"`]);
    }
  });

  it("reads the top folder's files by what they are, not by a list of names", () => {
    expect(rootSourceFiles(root)).toEqual(["instrumentation-client.ts", "instrumentation.ts", "middleware.ts", "next.config.mjs", "sentry.server.config.js"]);
  });

  it("leaves out the files it should: the unscanned folders (named in the header of tests/helpers/source-scan.ts), declarations, build output, and what isn't code", () => {
    for (const file of LEFT) expect(networkSourceFiles(root), file).not.toContain(file);
  });

  it("lists every top-level folder of source it doesn't read, with the reason", () => {
    expect(unscannedSourceFolders()).toEqual(UNSCANNED_FOLDERS.map((f) => f.folder).sort());
    for (const f of UNSCANNED_FOLDERS) expect(f.why.trim(), `${f.folder} needs a reason`).not.toBe("");
  });

  it("fails on a new top-level folder of source (a pages, src or public folder, which Next.js would serve) until it is scanned or listed", () => {
    for (const file of ["pages/api/track.ts", "public/analytics.js", "src/app/page.tsx"]) put(file, FETCH);
    const unaccounted = unscannedSourceFolders(root).filter((folder) => !UNSCANNED_FOLDERS.some((f) => f.folder === folder));
    expect(unaccounted).toEqual(["pages", "public", "src"]);
    // And the ones the inventory lists are the ones this tree has too, so the check isn't comparing nothing.
    expect(unscannedSourceFolders(root)).toEqual(expect.arrayContaining(["scripts", "prisma", "tests", "e2e"]));
  });

  it("fails on a root-level or JavaScript file that isn't listed, once it is added to the real file list", () => {
    const sources = READ.map((file) => ({ file, code: readFileSync(path.join(root, file), "utf8") }));
    const outsideAll = requestsOutside(sources, ALLOWED).unlisted;
    expect(outsideAll).toEqual(expect.arrayContaining(["instrumentation.ts", "instrumentation-client.ts", "components/legacy.js", "components/legacy.jsx", "lib/helper.mjs", "app/thing.cjs"].map((f) => `${f}: fetch("https://example.invalid/x"`)));
  });

  afterAll(() => rmSync(root, { recursive: true, force: true }));
});
