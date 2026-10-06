/**
 * Helpers for the tests that read DotAmi's own source code to prove a rule holds everywhere —
 * "every browser-storage key is on the privacy inventory" (tests/privacy-inventory.spec.ts),
 * "no route logs an error object" (tests/error-logging.spec.ts). These are blunt on purpose: they
 * read text, not a syntax tree, and the tests that use them also check they still find the
 * things they are meant to find, so a scan that quietly sees nothing can't pass for a clean one.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

/** The app's own code: TypeScript. */
export const TS_FILES = /\.(ts|tsx)$/;
/** The desktop app's code (desktop/) is plain JavaScript modules. */
export const JS_FILES = /\.(mjs|cjs|js)$/;

/** Every file under the given folders (relative to the repo) whose name fits `pattern`, as repo-relative paths with forward slashes. */
export function sourceFiles(folders: string[], pattern: RegExp = TS_FILES): string[] {
  const found: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(path.join(ROOT, dir))) {
      if (name === "node_modules" || name === ".next") continue;
      const relative = `${dir}/${name}`;
      const full = path.join(ROOT, relative);
      if (statSync(full).isDirectory()) walk(relative);
      else if (pattern.test(name) && !name.endsWith(".d.ts")) found.push(relative);
    }
  };
  for (const folder of folders) walk(folder);
  return found.sort();
}

export function readSource(file: string): string {
  return readFileSync(path.join(ROOT, file), "utf8");
}

/** What `simplify(…, "mask")` writes for each character inside a string: not a character that code uses. */
const FILL = "§";

/**
 * The code with comments removed, and with the text inside quotes kept, emptied, or masked.
 *
 * Comments go first so a sentence like "the journey lives in sessionStorage" doesn't count as code.
 * With `keepStrings` false every string becomes an empty pair of quotes (a template keeps its
 * `${…}` parts, which are code), so parentheses and words inside a message can't be mistaken for
 * code. With "mask" each character of a string becomes a filler character instead, so the result is
 * exactly as long as the `true` version: a scan can find code in the masked text and read what a
 * string says at the same offset in the kept text. Not a full parser: a quote character inside a
 * regular expression would confuse it, which the sanity checks in the tests that use it would show
 * up as a scan that finds nothing.
 */
export function simplify(code: string, keepStrings: boolean | "mask"): string {
  type Frame = { kind: "code"; braces: number } | { kind: "template" };
  const frames: Frame[] = [{ kind: "code", braces: 0 }];
  /** What is written for the characters of a string. */
  const inString = (s: string) => (keepStrings === true ? s : keepStrings === "mask" ? FILL.repeat(s.length) : "");
  let out = "";
  let i = 0;
  const n = code.length;

  while (i < n) {
    const top = frames[frames.length - 1];
    const ch = code[i];
    const next = code[i + 1];

    if (top.kind === "template") {
      if (ch === "\\") {
        out += inString(ch + (next ?? ""));
        i += 2;
      } else if (ch === "`") {
        out += "`";
        frames.pop();
        i += 1;
      } else if (ch === "$" && next === "{") {
        out += "${";
        frames.push({ kind: "code", braces: 0 });
        i += 2;
      } else {
        out += inString(ch);
        i += 1;
      }
      continue;
    }

    if (ch === "/" && next === "/") {
      while (i < n && code[i] !== "\n") i += 1;
    } else if (ch === "/" && next === "*") {
      const end = code.indexOf("*/", i + 2);
      i = end === -1 ? n : end + 2;
      out += " ";
    } else if (ch === '"' || ch === "'") {
      let j = i + 1;
      while (j < n && code[j] !== ch && code[j] !== "\n") j += code[j] === "\\" ? 2 : 1;
      out += ch + inString(code.slice(i + 1, j)) + ch;
      i = j + 1;
    } else if (ch === "`") {
      out += "`";
      frames.push({ kind: "template" });
      i += 1;
    } else if (ch === "{") {
      top.braces += 1;
      out += ch;
      i += 1;
    } else if (ch === "}") {
      if (top.braces === 0 && frames.length > 1) frames.pop();
      else top.braces -= 1;
      out += ch;
      i += 1;
    } else {
      out += ch;
      i += 1;
    }
  }
  return out;
}

/** The text between the parenthesis at `open` and its partner. `code` should be simplified with strings emptied. */
export function argumentsAt(code: string, open: number): string {
  let depth = 0;
  for (let i = open; i < code.length; i += 1) {
    if (code[i] === "(") depth += 1;
    else if (code[i] === ")") {
      depth -= 1;
      if (depth === 0) return code.slice(open + 1, i);
    }
  }
  return code.slice(open + 1);
}

/** Every `console.<method>(…)` call in the code, with what was passed to it. `code` must be simplify(…, false). */
export function consoleCalls(code: string): { method: string; args: string }[] {
  const calls: { method: string; args: string }[] = [];
  for (const m of code.matchAll(/\bconsole\s*\.\s*(\w+)\s*\(/g)) {
    calls.push({ method: m[1], args: argumentsAt(code, m.index! + m[0].length - 1) });
  }
  return calls;
}

// ---------------------------------------------------------------------------------------------
// What gets written to the log

/** Every direct write to the process's output — `process.stdout.write(…)`, `process.stderr.write(…)`. `code` must be simplify(…, false). */
export function streamWrites(code: string): { method: string; args: string }[] {
  const writes: { method: string; args: string }[] = [];
  for (const m of code.matchAll(/\bprocess\s*\.\s*(stdout|stderr)\s*\.\s*write\s*\(/g)) {
    writes.push({ method: `process.${m[1]}.write`, args: argumentsAt(code, m.index! + m[0].length - 1) });
  }
  return writes;
}

/** The `{ … }` block whose opening brace is at `open`: what is inside it. `code` must be simplify(…, false), so every brace is code. */
function blockAt(code: string, open: number): string {
  let depth = 0;
  for (let i = open; i < code.length; i += 1) {
    if (code[i] === "{") depth += 1;
    else if (code[i] === "}") {
      depth -= 1;
      if (depth === 0) return code.slice(open + 1, i);
    }
  }
  return code.slice(open + 1);
}

/** The names a catch binding introduces: `e`, `e: unknown`, or the names in `{ message: why }`. */
function boundNames(binding: string): string[] {
  const words = binding.match(/[A-Za-z_$][\w$]*/g) ?? [];
  return /^\s*[{[]/.test(binding) ? words : words.slice(0, 1);
}

/** A place where an error is caught, the name(s) it is held under there, and the code in which those names mean it. */
export interface CatchScope {
  names: string[];
  body: string;
}

/**
 * Every place the code catches an error: `catch (x) { … }` (the names come from the parentheses, so
 * `catch (boom)` is read as well as `catch (error)`) and a promise's `.catch((x) => …)`, which is the
 * other way to name a caught error. `code` must be simplify(…, false).
 */
export function catchScopes(code: string): CatchScope[] {
  const scopes: CatchScope[] = [];
  for (const m of code.matchAll(/\bcatch\s*\(([^)]*)\)\s*\{/g)) {
    scopes.push({ names: boundNames(m[1]), body: blockAt(code, m.index! + m[0].length - 1) });
  }
  for (const m of code.matchAll(/\.\s*catch\s*\(/g)) {
    const args = argumentsAt(code, m.index! + m[0].length - 1);
    const handler = args.match(/^\s*(?:async\s+)?(?:function\b[^(]*\(([^)]*)\)|\(([^)]*)\)\s*(?::[^=]*)?=>|([A-Za-z_$][\w$]*)\s*=>)/);
    if (handler) scopes.push({ names: boundNames(handler[1] ?? handler[2] ?? handler[3] ?? ""), body: args });
  }
  return scopes;
}

/** What a caught error usually goes by. A write of one of these is refused wherever it is, catch block or not. */
const USUAL_ERROR_NAMES = ["error", "err", "e", "cause", "exception"];

function namesPattern(names: readonly string[]): RegExp {
  const escaped = names.map((n) => n.replace(/[$]/g, "\\$&"));
  return new RegExp(`(?<![\\w$])(?:${escaped.join("|")})(?![\\w$])`);
}

/**
 * The writes to the log (console.*, process.stdout.write, process.stderr.write) that pass an error
 * or something taken from one: any call that names one of the usual error variables, and any call
 * inside a catch that names the variable that catch binds, whatever it is called. Each is returned
 * as the call's text. `code` must be simplify(…, false).
 */
export function errorWrites(code: string): string[] {
  const writesIn = (text: string) => [
    ...consoleCalls(text).map((c) => ({ call: `console.${c.method}(${c.args.trim()})`, args: c.args })),
    ...streamWrites(text).map((w) => ({ call: `${w.method}(${w.args.trim()})`, args: w.args })),
  ];
  const found = new Set<string>();
  const usual = namesPattern(USUAL_ERROR_NAMES);
  for (const w of writesIn(code)) if (usual.test(w.args)) found.add(w.call);
  for (const scope of catchScopes(code)) {
    if (scope.names.length === 0) continue;
    const caught = namesPattern(scope.names);
    for (const w of writesIn(scope.body)) if (caught.test(w.args)) found.add(w.call);
  }
  return [...found];
}

// ---------------------------------------------------------------------------------------------
// What can reach the network

/** A place where the code can reach the network. */
export interface NetworkCall {
  /** The call as the inventory's allow-list spells it: `fetch(TELEMETRY`, `https.get(url`, `package "electron-updater"`. */
  call: string;
  /** True when the address is a literal path on this app's own server ("/api/…"), which cannot leave the computer. */
  relative: boolean;
}

/**
 * A literal path on this app's own server: it starts with one "/". Not "//host" or "/\host", which
 * a browser reads as another computer, and not "/${…" where the template could put one there.
 */
function isRelativeLiteral(address: string): boolean {
  return /^(["'`])\/(?![/\\]|\$\{)/.test(address.trim());
}

/** Index just past the string or template literal that opens at `i`. */
function skipLiteral(code: string, i: number): number {
  const quote = code[i];
  let j = i + 1;
  while (j < code.length) {
    const ch = code[j];
    if (ch === "\\") j += 2;
    else if (ch === quote) return j + 1;
    else if (quote === "`" && ch === "$" && code[j + 1] === "{") j = skipBraces(code, j + 1);
    else if (quote !== "`" && ch === "\n") return j;
    else j += 1;
  }
  return j;
}

/** Index just past the `{ … }` that opens at `open`, skipping any strings inside it. */
function skipBraces(code: string, open: number): number {
  let depth = 0;
  let j = open;
  while (j < code.length) {
    const ch = code[j];
    if (ch === '"' || ch === "'" || ch === "`") j = skipLiteral(code, j);
    else {
      if (ch === "{") depth += 1;
      else if (ch === "}" && (depth -= 1) === 0) return j + 1;
      j += 1;
    }
  }
  return j;
}

/** The arguments of the call whose "(" is at `open`, split at the top-level commas. `code` keeps its strings (simplify(…, true)). */
export function callArguments(code: string, open: number): string[] {
  const args: string[] = [];
  let depth = 0;
  let start = open + 1;
  let j = open;
  while (j < code.length) {
    const ch = code[j];
    if (ch === '"' || ch === "'" || ch === "`") {
      j = skipLiteral(code, j);
      continue;
    }
    if (ch === "(" || ch === "[" || ch === "{") depth += 1;
    else if (ch === ")" || ch === "]" || ch === "}") {
      depth -= 1;
      if (depth === 0) {
        args.push(code.slice(start, j));
        return args;
      }
    } else if (ch === "," && depth === 1) {
      args.push(code.slice(start, j));
      start = j + 1;
    }
    j += 1;
  }
  args.push(code.slice(start));
  return args;
}

/**
 * Modules that talk to the network, or whose job is to: importing one is itself a way to reach out,
 * so it is listed whether or not a call to it is visible. Node's own network modules, the two
 * libraries DotAmi uses that make requests on their own, and the usual HTTP clients and trackers.
 */
const NETWORK_MODULE =
  /^(?:node:)?(?:https?|http2|net|tls|dgram|dns)(?:\/promises)?$|^(?:@anthropic-ai\/sdk|electron-updater|axios|node-fetch|cross-fetch|isomorphic-fetch|undici|got|ky|superagent|ws|socket\.io-client|openai|posthog-js|@vercel\/analytics|@sentry\/[\w-]+|@segment\/[\w-]+)$/;

/** Collapses a source snippet to one short line, for naming a call. */
function tidy(text: string): string {
  return text.replace(/\s+/g, " ").trim().slice(0, 60);
}

/**
 * Every place this code can reach the network, for the privacy inventory's scan: fetch (and any
 * wrapper function named in `wrappers`), XMLHttpRequest's open, navigator.sendBeacon, WebSocket,
 * EventSource, node's http/https/net request, get and connect, and the import of a module that
 * makes requests. A call is `relative` only when its address is a literal "/…" path, the app's
 * own server; one whose address is a variable, a constant or an absolute URL is not, because the
 * scan can't see where it goes. `source` is a whole file's text.
 */
export function networkCalls(source: string, wrappers: readonly string[] = []): NetworkCall[] {
  const kept = simplify(source, true);
  // Same length as `kept`, with every string blanked: finds code without being fooled by a word in a message.
  const masked = simplify(source, "mask");
  const found: NetworkCall[] = [];

  const callAt = (label: string, open: number, addressIndex: number) => {
    const address = callArguments(kept, open)[addressIndex] ?? "";
    found.push({ call: `${label}(${tidy(address)}`, relative: isRelativeLiteral(address) });
  };

  const addressFirst: [RegExp, string][] = [
    [/(?<!\bfunction\s+)\bfetch\s*\(/g, "fetch"],
    [/\bsendBeacon\s*\(/g, "sendBeacon"],
    [/\bnew\s+WebSocket\s*\(/g, "new WebSocket"],
    [/\bnew\s+EventSource\s*\(/g, "new EventSource"],
  ];
  // Wrapper functions around fetch (the allow-list names them): a call to one is judged like a fetch.
  for (const name of wrappers) {
    addressFirst.push([new RegExp(`(?<![\\w$.])(?<!\\bfunction\\s+)${name}\\s*\\(`, "g"), name]);
  }
  for (const [pattern, label] of addressFirst) {
    for (const m of masked.matchAll(pattern)) callAt(label, m.index! + m[0].length - 1, 0);
  }

  // xhr.open("GET", address): the address is the second argument. Only in a file that uses
  // XMLHttpRequest, so window.open(url) (a link the person clicks) isn't read as a request.
  if (/\bXMLHttpRequest\b/.test(masked)) {
    for (const m of masked.matchAll(/\.\s*open\s*\(/g)) {
      const open = m.index! + m[0].length - 1;
      if (callArguments(kept, open).length >= 2) callAt("XMLHttpRequest.open", open, 1);
    }
  }

  // https.get(…), net.connect(…): raw network calls never count as "relative" (a literal there is a
  // socket path or a host, not this app's own server).
  for (const m of masked.matchAll(/\b(https?|http2|net|tls)\s*\.\s*(request|get|connect|createConnection)\s*\(/g)) {
    const address = callArguments(kept, m.index! + m[0].length - 1)[0] ?? "";
    found.push({ call: `${m[1]}.${m[2]}(${tidy(address)}`, relative: false });
  }

  // fetch handed on without being called (`const send = fetch`, `{ fetch: custom }`, `["fetch"]`) is a way around the scan.
  found.push(
    ...[...masked.matchAll(/(?<![\w$])fetch\b(?!\s*\()/g)].map(() => ({ call: "fetch (used as a value)", relative: false })),
  );
  if (/\[\s*(["'`])fetch\1\s*\]/.test(kept)) found.push({ call: 'fetch (by name: ["fetch"])', relative: false });

  // Modules: from "x", import("x"), require("x"), import "x".
  const modules = new Set<string>();
  for (const m of kept.matchAll(/\bfrom\s*(["'])([^"'\n]+)\1|\b(?:import|require)\s*\(\s*(["'])([^"'\n]+)\3\s*\)|\bimport\s*(["'])([^"'\n]+)\5/g)) {
    modules.add(m[2] ?? m[4] ?? m[6]);
  }
  for (const spec of modules) if (NETWORK_MODULE.test(spec)) found.push({ call: `package "${spec}"`, relative: false });
  // Electron's own `net` (requests from the main process) comes out of the "electron" module by name.
  if (/\{[^}]*\bnet\b[^}]*\}\s*(?:from\s*|=\s*require\s*\(\s*)(["'])electron\1/.test(kept)) {
    found.push({ call: 'package "electron" (net)', relative: false });
  }
  return found;
}
