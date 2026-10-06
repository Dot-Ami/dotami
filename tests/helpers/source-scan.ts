/**
 * Helpers for the tests that read DotAmi's own source code to check a rule — "every browser-storage
 * key and every way out to the network is on the privacy inventory" (tests/privacy-inventory.spec.ts),
 * "no route logs an error object" (tests/error-logging.spec.ts). The tests that use them also check
 * they still find the things they are meant to find, so a scan that quietly sees nothing can't pass
 * for a clean one.
 *
 * Two kinds of reading live here:
 *   - The NETWORK scan (networkCalls) reads the TypeScript syntax tree: the `typescript` package
 *     parses each file, so a comment, a string, the words on a page, a quote or backtick inside a
 *     regular expression, a name written with a unicode escape (fetch spelled with "u0066" after a
 *     backslash) and a template where a plain string is expected are each read as what they are.
 *   - The browser-storage and log scans (everything built on simplify) still read TEXT. simplify
 *     is not a parser: a quote or backtick inside a regular expression literal throws it out of
 *     step and can hide the code after it. The "finds what it should find today" checks would not
 *     show that for a file written later.
 *
 * WHAT THE NETWORK SCAN IS, AND WHAT IT IS NOT
 * It is a safety net, not a proof. It catches network calls written in ordinary code and it
 * refuses the common disguises. It is NOT proof against code written to hide a request: code
 * review is what covers that. When this scan is clean, the accurate statement is "no ordinary or
 * commonly disguised request is unlisted", never "nothing leaves this computer".
 *
 * Refused as an unlisted network path (unless the allow-list in lib/privacy/inventory.ts names it):
 *   - fetch(…), sendBeacon(…), new WebSocket(…), new EventSource(…), an XMLHttpRequest's open(…),
 *     node's http/https/http2/net/tls request/get/connect, and any wrapper the allow-list names,
 *     unless the address is one literal "/…" path on DotAmi's own server;
 *   - those functions handed on without being called (`const send = fetch`, `window.fetch`,
 *     `x.fetch.call(…)` / `.apply` / `.bind`, `const { fetch } = globalThis`), or looked up by a
 *     string (`globalThis["fetch"]`, `navigator["sendBeacon"]`);
 *   - importing or requiring, however it is quoted or reached (`import`, `import(…)`, `require`,
 *     `createRequire(…)(…)`, `process.getBuiltinModule(…)`; even an import only for its types),
 *     node's http, https, http2, net, tls, dgram, dns or child_process (which can run `curl`),
 *     electron's `net`, the HTTP, update and analytics libraries in NETWORK_MODULE, and anything
 *     loaded from a URL;
 *   - a module name that is not a plain string (`import("node:" + "https")`, `require(name)`), and
 *     a module loaded through `require.call(…)` / `.apply` / `.bind`;
 *   - looking something up on globalThis, window, self, global, navigator, process or the electron
 *     module by a key that is not a plain string (`globalThis[k]`, `globalThis["fe" + "tch"]`), and
 *     Reflect.get on those. (A bare `parent`, `top` or `frames` is not read as a window here, so a
 *     tree node called `parent` can be indexed; `window.parent[k]` is.)
 *
 * STILL GETS PAST (the spec's "known gaps" test pins each of these, so the list can't go stale):
 *   - a copy of the global object under another name: `const w = window; const s = w.fetch; s(url)`,
 *     `document.defaultView.fetch` (a direct call `w.fetch(url)` IS caught, whatever `w` is);
 *   - making the page do the loading instead of calling a function: `new Image().src = url`, a
 *     <script src>, <img>, <iframe>, <link> or <form action>, `window.open(url)`,
 *     `location.href = url`, `location.assign(url)`, and in the desktop app `shell.openExternal(url)`;
 *   - workers and their scripts: `new Worker(url)`, `importScripts(url)`, `serviceWorker.register(url)`;
 *   - code made at run time, by the global `eval` or the Function constructor;
 *   - computed lookups other than the ones above: `Object.getOwnPropertyDescriptor(window, k)`;
 *   - node internals and native add-ons: `process.binding(…)`, a `.node` file;
 *   - a wrapper named in the allow-list, handed on and called under another name;
 *   - anything outside the files it reads (app/, components/, lib/, desktop/, middleware.ts,
 *     next.config.mjs): scripts/, prisma/, tests, and the packages in node_modules (Next.js and
 *     Prisma make requests of their own; Settings → Privacy says which ones DotAmi knows of);
 *   - what another program does: the statute store's lookup.py is started with child_process, and
 *     its code is not in this repository.
 *
 * IN THE BROWSER the Content-Security-Policy that middleware.ts sets stops most of those at run
 * time: `connect-src 'self'` stops fetch, XMLHttpRequest, sendBeacon, WebSocket, EventSource and
 * a link's ping to any other address; `img-src 'self' blob: data:` stops `new Image().src` and
 * <img>; `default-src 'self'` covers frames and media; `form-action 'self'` stops a form posting
 * elsewhere. `script-src` stops a <script src> in the page's own HTML, but because it carries
 * 'strict-dynamic' a script that is already running may add or import another one, so a script
 * added by code is not reliably stopped. The policy does NOT stop navigation (window.open, a
 * link, `location.href`; in the desktop app the window refuses to leave DotAmi's own pages and
 * opens such addresses in the person's own browser instead). It also covers only the pages
 * middleware.ts serves: the API routes, everything that runs on the server, and the desktop
 * app's main process are not under it, and there this scan and code review are all there is.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import ts from "typescript";

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

/**
 * The code with comments removed, and with the text inside quotes kept or emptied.
 *
 * Comments go first so a sentence like "the journey lives in sessionStorage" doesn't count as code.
 * With `keepStrings` false every string becomes an empty pair of quotes (a template keeps its
 * `${…}` parts, which are code), so parentheses and words inside a message can't be mistaken for
 * code. NOT a parser: a quote or backtick inside a regular expression literal throws it out of
 * step, and code after it can then be read as part of a string and go unseen. A check that the
 * scan still finds today's keys or writes would not show that for a file written later; the
 * network scan (networkCalls) reads the syntax tree instead, so it doesn't have this limit.
 */
export function simplify(code: string, keepStrings: boolean): string {
  type Frame = { kind: "code"; braces: number } | { kind: "template" };
  const frames: Frame[] = [{ kind: "code", braces: 0 }];
  /** What is written for the characters of a string. */
  const inString = (s: string) => (keepStrings ? s : "");
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

/** What the name of something reached by property is when the code looks it up with brackets: the string inside them is gone (simplify(…, false)), so it can't be read. */
const LOOKED_UP = "[…]";

/** Index of the "(" (or "{") a match ends with: the bracket that opens the arguments or the block. */
const openingOf = (m: RegExpMatchArray) => m.index! + m[0].length - 1;

/** A property read: `.name`, `?.name`, or `["name"]` / `?.["name"]` (the name inside the brackets is unreadable, see LOOKED_UP). */
const PROPERTY = String.raw`(?:\??\.\s*(\w+)|\??\.?\s*\[[^\]]*\])`;
/** `.write`, `?.write` or `["write"]`: the ways of reaching a stream's write. */
const WRITE = String.raw`(?:\??\.\s*write\b|\??\.?\s*\[[^\]]*\])`;
/** The end of a call: the "(" itself, or `?.(`. */
const CALL = String.raw`\s*(?:\?\.\s*)?\(`;

/** The `{ a, b: c }` of a destructuring, as the name looked up and the name it is held under. `pattern` is what is between the braces. */
function destructured(pattern: string): { key: string; local: string }[] {
  return pattern.split(",").flatMap((part) => {
    const m = part.trim().match(/^([A-Za-z_$][\w$]*)\s*(?::\s*([A-Za-z_$][\w$]*))?\s*(?:=[\s\S]*)?$/);
    return m ? [{ key: m[1], local: m[2] ?? m[1] }] : [];
  });
}

/** A pattern for the bare name `local` being called: `local(…)`, not `thing.local(…)`. */
function callOf(local: string): RegExp {
  return new RegExp(String.raw`(?<![\w$.])${local.replace(/\$/g, "\\$&")}${CALL}`, "g");
}

/**
 * Every console call in the code, with what was passed to it: `console.error(…)`, `console?.error(…)`,
 * `console["error"](…)` (named `[…]`), and a method taken out of console and called by its own name
 * (`const { error: log } = console; log(…)`). `code` must be simplify(…, false); `within` is the
 * whole file when `code` is only a part of it, since a method taken out of console is named in the
 * file's other lines.
 */
export function consoleCalls(code: string, within: string = code): { method: string; args: string }[] {
  const calls: { method: string; args: string }[] = [];
  for (const m of code.matchAll(new RegExp(String.raw`\bconsole\s*${PROPERTY}${CALL}`, "g"))) {
    calls.push({ method: m[1] ?? LOOKED_UP, args: argumentsAt(code, openingOf(m)) });
  }
  for (const taken of within.matchAll(/\b(?:const|let|var)\s*\{([^}]*)\}\s*=\s*console\b(?!\s*[.[])/g)) {
    for (const { key, local } of destructured(taken[1])) {
      for (const m of code.matchAll(callOf(local))) calls.push({ method: key, args: argumentsAt(code, openingOf(m)) });
    }
  }
  return calls;
}

// ---------------------------------------------------------------------------------------------
// What gets written to the log

/**
 * Every direct write to the process's output: `process.stdout.write(…)`, `process.stderr.write(…)`,
 * `process["stderr"].write(…)`, and a stream held under another name (`const { stderr } = process;`
 * or `const out = process.stderr;` and then `stderr.write(…)`). `code` must be simplify(…, false);
 * `within` is the whole file when `code` is only a part of it, as for consoleCalls.
 */
export function streamWrites(code: string, within: string = code): { method: string; args: string }[] {
  const writes: { method: string; args: string }[] = [];
  const add = (stream: string, m: RegExpMatchArray) =>
    writes.push({ method: `process.${stream}.write`, args: argumentsAt(code, openingOf(m)) });

  for (const m of code.matchAll(new RegExp(String.raw`\bprocess\s*(?:\??\.\s*(stdout|stderr)\b|\??\.?\s*\[[^\]]*\])\s*${WRITE}${CALL}`, "g"))) {
    add(m[1] ?? LOOKED_UP, m);
  }

  // The streams the file holds under a name of its own, and what each stands for.
  const held = new Map<string, string>();
  for (const m of within.matchAll(/\b(?:const|let|var)\s*\{([^}]*)\}\s*=\s*process\b(?!\s*[.[])/g)) {
    for (const { key, local } of destructured(m[1])) if (key === "stdout" || key === "stderr") held.set(local, key);
  }
  for (const m of within.matchAll(/\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*(?::[^=;]+)?=\s*process\s*(?:\??\.\s*(stdout|stderr)\b|\[[^\]]*\])(?!\s*[.[(])/g)) {
    held.set(m[1], m[2] ?? LOOKED_UP);
  }
  for (const [local, stream] of held) {
    const name = local.replace(/\$/g, "\\$&");
    for (const m of code.matchAll(new RegExp(String.raw`(?<![\w$.])${name}\s*${WRITE}${CALL}`, "g"))) add(stream, m);
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

/** A function written out as an argument (`(x) => …`, `x => …`, `function (x) {…}`): the name it gives its first parameter, and its text. Null when `argument` isn't one. */
function handlerScope(argument: string): CatchScope | null {
  const handler = argument.match(/^\s*(?:async\s+)?(?:function\b[^(]*\(([^)]*)\)|\(([^)]*)\)\s*(?::[^=]*)?=>|([A-Za-z_$][\w$]*)\s*=>)/);
  return handler ? { names: boundNames(handler[1] ?? handler[2] ?? handler[3] ?? ""), body: argument } : null;
}

/**
 * Every place the code catches an error: `catch (x) { … }` (the names come from the parentheses, so
 * `catch (boom)` is read as well as `catch (error)`) and a promise's `.catch((x) => …)` or the
 * rejection handler in the second argument of `.then(ok, (x) => …)`, which are the other ways to
 * name a caught error. `code` must be simplify(…, false).
 */
export function catchScopes(code: string): CatchScope[] {
  const scopes: CatchScope[] = [];
  for (const m of code.matchAll(/\bcatch\s*\(([^)]*)\)\s*\{/g)) {
    scopes.push({ names: boundNames(m[1]), body: blockAt(code, openingOf(m)) });
  }
  for (const m of code.matchAll(/\.\s*catch\s*\(/g)) {
    const scope = handlerScope(argumentsAt(code, openingOf(m)));
    if (scope) scopes.push(scope);
  }
  // .then's first argument is for the result; only the second one is told about an error.
  for (const m of code.matchAll(/\.\s*then\s*\(/g)) {
    const scope = handlerScope(callArguments(code, openingOf(m))[1] ?? "");
    if (scope) scopes.push(scope);
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
  // `text` is the whole file or a catch's part of it; a console method or stream the file holds under
  // another name is declared outside the catch, so the whole file is what names them.
  const writesIn = (text: string) => [
    ...consoleCalls(text, code).map((c) => ({
      call: `console${c.method === LOOKED_UP ? c.method : `.${c.method}`}(${c.args.trim()})`,
      args: c.args,
    })),
    ...streamWrites(text, code).map((w) => ({ call: `${w.method}(${w.args.trim()})`, args: w.args })),
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
// Reading a call's arguments from text (catchScopes uses this; the network scan reads the syntax tree)

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

// ---------------------------------------------------------------------------------------------
// What can reach the network. Read from the syntax tree: see the header for what that does and
// does not catch.

/** A place where the code can reach the network. */
export interface NetworkCall {
  /** The call as the inventory's allow-list spells it: `fetch(TELEMETRY`, `https.get(url`, `package "electron-updater"`. */
  call: string;
  /** True when the address is a literal path on this app's own server ("/api/…"), which cannot leave the computer. */
  relative: boolean;
}

/** The ways a page or node sends something somewhere. A call of one is judged by its address; handing one on is refused. */
const NETWORK_NAMES = ["fetch", "sendBeacon", "XMLHttpRequest", "WebSocket", "EventSource"];

/**
 * Modules that talk to the network, or whose job is to: importing one is itself a way to reach out,
 * so it is listed whether or not a call to it is visible. Node's own network modules (and
 * child_process, which can run `curl`), the two libraries DotAmi uses that make requests on their
 * own, and the usual HTTP clients and trackers.
 */
const NETWORK_MODULE =
  /^(?:node:)?(?:https?|http2|net|tls|dgram|dns|child_process)(?:\/promises)?$|^(?:@anthropic-ai\/sdk|electron-updater|axios|node-fetch|cross-fetch|isomorphic-fetch|undici|got|ky|superagent|ws|socket\.io-client|openai|posthog-js|@vercel\/analytics|@sentry\/[\w-]+|@segment\/[\w-]+)$/;

/** A module name that is an address: `import("https://…")` loads code over the network (and a data: address is code written into the name). */
const URL_SPECIFIER = /^(?:(?:https?|wss?|ftp|data|blob):|\/\/)/i;

/** node's request-making functions, and the modules they come from: `https.get(…)`, `net.connect(…)`. */
const NODE_REQUEST_METHODS = new Set(["request", "get", "connect", "createConnection"]);
const NODE_REQUEST_MODULES = new Set(["http", "https", "http2", "net", "tls"]);

/** Names of the global object. `window.fetch` is the page's own fetch; `router.fetch` is not. */
const GLOBAL_OBJECTS = new Set(["globalThis", "window", "self", "global", "navigator"]);
/** Other windows, which are global objects too. Common as the name of something else (`parent[key]` in a tree), so only trusted where it matters less (see isGlobalObject). */
const OTHER_WINDOWS = new Set(["top", "parent", "frames"]);

/** Collapses a source snippet to one short line, for naming a call. */
function tidy(text: string): string {
  return text.replace(/\s+/g, " ").trim().slice(0, 60);
}

/** `node` without the brackets, casts and `!` that wrap it without changing what it is: `(globalThis as any)` is `globalThis`. */
function unwrap(node: ts.Node): ts.Node {
  let inner = node;
  while (
    ts.isParenthesizedExpression(inner) ||
    ts.isAsExpression(inner) ||
    ts.isNonNullExpression(inner) ||
    ts.isTypeAssertionExpression(inner) ||
    ts.isSatisfiesExpression(inner)
  ) {
    inner = inner.expression;
  }
  return inner;
}

/** What a string written out says: "x", 'x' or `x` with no ${} in it. Null for anything else, however constant it looks ("a" + "b"). */
function plainString(node: ts.Node | undefined): string | null {
  const inner = node && unwrap(node);
  return inner && (ts.isStringLiteral(inner) || ts.isNoSubstitutionTemplateLiteral(inner)) ? inner.text : null;
}

/**
 * The name `node` ends in: `fetch`, `x.fetch`, `x["fetch"]`. Null when it isn't a name written out.
 * ts.Identifier.text is the name after TypeScript has decoded any unicode escapes in it, so a
 * `fetch` spelled with an escape reads as plain `fetch`.
 */
function nameOf(node: ts.Node): string | null {
  if (ts.isIdentifier(node)) return node.text;
  if (ts.isPropertyAccessExpression(node)) return node.name.text;
  if (ts.isElementAccessExpression(node)) return plainString(node.argumentExpression);
  return null;
}

/**
 * Whether `node` is the global object itself: `window`, `(globalThis as any)`, `window.parent`,
 * `window["navigator"]`. A bare `top`, `parent` or `frames` is another window only when `bareWindows`
 * (the default): a lookup by a computed key refuses just the unambiguous names, so a tree node
 * called `parent` can be indexed freely.
 */
function isGlobalObject(node: ts.Node, bareWindows = true): boolean {
  const inner = unwrap(node);
  const known = (name: string) => GLOBAL_OBJECTS.has(name) || OTHER_WINDOWS.has(name);
  if (ts.isIdentifier(inner)) return GLOBAL_OBJECTS.has(inner.text) || (bareWindows && OTHER_WINDOWS.has(inner.text));
  if (ts.isPropertyAccessExpression(inner)) return known(inner.name.text) && isGlobalObject(inner.expression, bareWindows);
  if (ts.isElementAccessExpression(inner)) {
    const key = plainString(inner.argumentExpression);
    return key !== null && known(key) && isGlobalObject(inner.expression, bareWindows);
  }
  return false;
}

/** Whether `node` is what a call or `new` is made on: the call rules judge those by their address. */
function isCalledOrConstructed(node: ts.Node): boolean {
  const parent = node.parent;
  return (ts.isCallExpression(parent) || ts.isNewExpression(parent)) && parent.expression === node;
}

/** Whether `node` has `.call`, `.apply` or `.bind` taken off it: another way to call it, with the address in a later argument. */
function isRecalledOrBound(node: ts.Node): boolean {
  const parent = node.parent;
  const taken = (ts.isPropertyAccessExpression(parent) || ts.isElementAccessExpression(parent)) && parent.expression === node;
  return taken && ["call", "apply", "bind"].includes(nameOf(parent) ?? "");
}

/**
 * Whether `node` sits where only a type is written (`let s: WebSocket`, `typeof fetch`, `interface
 * Deps { fetch: … }`): nothing there runs. A class that EXTENDS something is a real use.
 */
function inTypeOnlyPosition(node: ts.Node): boolean {
  for (let up: ts.Node | undefined = node.parent; up && !ts.isSourceFile(up); up = up.parent) {
    if (ts.isExpressionWithTypeArguments(up) && ts.isHeritageClause(up.parent) && up.parent.token === ts.SyntaxKind.ExtendsKeyword && !ts.isInterfaceDeclaration(up.parent.parent)) {
      return false;
    }
    if (ts.isTypeNode(up) || ts.isInterfaceDeclaration(up) || ts.isTypeAliasDeclaration(up)) return true;
  }
  return false;
}

/**
 * Whether this identifier, spelled like one of the network's functions, is that function being
 * passed around rather than called, defined by the code, or the word in some other thing's name.
 */
function isHandedOn(id: ts.Identifier): boolean {
  const parent = id.parent;
  if (isCalledOrConstructed(id) || inTypeOnlyPosition(id)) return false;
  if (ts.isPropertyAccessExpression(parent) && parent.name === id) {
    if (isCalledOrConstructed(parent)) return false;
    // router.fetch, this.client.fetch: some other object's own. Only the global object's is the
    // network's, and `anything.fetch.call(…)` is a way of calling it whatever that is.
    return isGlobalObject(parent.expression) || isRecalledOrBound(parent);
  }
  // function fetch(…) {…}, a method called fetch, class WebSocket {…}: code defining its own, which is not using the network's.
  if (
    (ts.isFunctionDeclaration(parent) ||
      ts.isFunctionExpression(parent) ||
      ts.isMethodDeclaration(parent) ||
      ts.isClassDeclaration(parent) ||
      ts.isClassExpression(parent)) &&
    parent.name === id
  ) {
    return false;
  }
  return true;
}

/**
 * A literal path on this app's own server. The whole argument must be one string (or one template)
 * that starts with a single "/" and a character of the path's first segment. Refused, because a
 * browser could read each as another computer or the scan can't see what the address ends up as:
 *   "//host" and "/\host";            a lone "/";
 *   "/${…" (the template could put a host there), and anything that starts with "${…}";
 *   "/" + "/host", "/" + HOST_PATH and "/api/" + id: a literal with more joined to it;
 *   "/<tab>/host": a browser drops tabs and line breaks from an address, which leaves "//host".
 * It is judged on the text as written, not on what an escape decodes to, so "/\x2fhost" is refused too.
 */
function isRelativeLiteral(address: ts.Expression | undefined): boolean {
  if (!address) return false;
  if (!ts.isStringLiteral(address) && !ts.isNoSubstitutionTemplateLiteral(address) && !ts.isTemplateExpression(address)) return false;
  return /^(["'`])\/(?![/\\\s\u0000-\u001f\u007f]|\$\{|\1)/.test(address.getText());
}

/** What a call loads as a module, and the argument that names it. */
interface Loading {
  /** How the call is written, for the name of a refusal: `import`, `require`, `process.getBuiltinModule`. */
  how: string;
  argument: ts.Expression | undefined;
}

/**
 * Whether this call loads a module: `import("x")`, `require("x")`, `module.require("x")`,
 * `createRequire(import.meta.url)("x")` (or a name that holds the result of createRequire), and
 * `process.getBuiltinModule("x")`.
 */
function loading(call: ts.CallExpression, requireNames: ReadonlySet<string>): Loading | null {
  const callee = unwrap(call.expression);
  const argument = call.arguments[0];
  if (callee.kind === ts.SyntaxKind.ImportKeyword) return { how: "import", argument };
  if (ts.isCallExpression(callee) && nameOf(unwrap(callee.expression)) === "createRequire") return { how: "require", argument };
  const name = nameOf(callee);
  if (name === "require" || (ts.isIdentifier(callee) && requireNames.has(callee.text))) return { how: "require", argument };
  if (name === "getBuiltinModule") return { how: "process.getBuiltinModule", argument };
  return null;
}

/** Calls `visit` on `node` and everything inside it. */
function walk(node: ts.Node, visit: (node: ts.Node) => void) {
  visit(node);
  ts.forEachChild(node, (child) => walk(child, visit));
}

/**
 * Every place this code can reach the network, for the privacy inventory's scan: fetch (and any
 * wrapper function named in `wrappers`), XMLHttpRequest's open, navigator.sendBeacon, WebSocket,
 * EventSource (also through the global object: `new globalThis.WebSocket(…)`), node's
 * http/https/net request, get and connect, the import of a module that makes requests, and the
 * disguises listed in this file's header. A call is `relative` only when its address is a literal
 * "/…" path, the app's own server (see isRelativeLiteral); one whose address is a variable, a
 * constant, built up from pieces or an absolute URL is not, because the scan can't see where it
 * goes. `source` is a whole file's text and `file` its name (the extension picks TypeScript, JSX or
 * plain JavaScript for the parser). Throws when the file doesn't parse: a file the scan can't read
 * must not pass for a clean one.
 */
export function networkCalls(source: string, wrappers: readonly string[] = [], file = "source.tsx"): NetworkCall[] {
  const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
  const problems = (tree as unknown as { parseDiagnostics: readonly ts.Diagnostic[] }).parseDiagnostics;
  if (problems.length > 0) {
    const { line } = tree.getLineAndCharacterOfPosition(problems[0].start ?? 0);
    throw new Error(`${file}:${line + 1} doesn't parse (${ts.flattenDiagnosticMessageText(problems[0].messageText, " ")}), so the network scan can't read it`);
  }

  const found: NetworkCall[] = [];
  const refuse = (call: string) => found.push({ call, relative: false });
  const text = (node: ts.Node | undefined) => (node ? tidy(node.getText()) : "");
  /** A call whose address is `address`: relative only when that is a literal path on this server. */
  const callAt = (label: string, address: ts.Expression | undefined) =>
    found.push({ call: `${label}(${text(address)}`, relative: isRelativeLiteral(address) });
  const byName = (name: string) => `${name} (by name: ["${name}"])`;

  // What the file calls some things, found before the rules run (a name can be declared after it is used).
  let usesXhr = false;
  /** `const load = createRequire(…)`: calling `load("x")` loads a module like require does. */
  const requireNames = new Set<string>();
  /** The module "electron" under whatever name this file gives it, and the plain word `electron`. */
  const electronNames = new Set<string>(["electron"]);
  walk(tree, (node) => {
    if (ts.isIdentifier(node) && node.text === "XMLHttpRequest") usesXhr = true;
    if (ts.isElementAccessExpression(node) && plainString(node.argumentExpression) === "XMLHttpRequest") usesXhr = true;
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) {
      const init = unwrap(node.initializer);
      const made = ts.isCallExpression(init) && nameOf(unwrap(init.expression)) === "createRequire";
      if (made || (ts.isIdentifier(init) && init.text === "require")) requireNames.add(node.name.text);
    }
  });
  /** Whether `node` is the electron module: its name, `require("electron")`, `(await import("electron")).default`. */
  const isElectron = (node: ts.Node): boolean => {
    let inner = unwrap(node);
    while (ts.isAwaitExpression(inner) || (ts.isPropertyAccessExpression(inner) && inner.name.text === "default")) inner = unwrap(inner.expression);
    if (ts.isIdentifier(inner)) return electronNames.has(inner.text);
    if (ts.isCallExpression(inner)) {
      const load = loading(inner, requireNames);
      return load !== null && plainString(load.argument) === "electron";
    }
    return false;
  };
  walk(tree, (node) => {
    if (ts.isImportDeclaration(node) && plainString(node.moduleSpecifier) === "electron") {
      const clause = node.importClause;
      if (clause?.name) electronNames.add(clause.name.text);
      if (clause?.namedBindings && ts.isNamespaceImport(clause.namedBindings)) electronNames.add(clause.namedBindings.name.text);
    }
    if (ts.isImportEqualsDeclaration(node) && ts.isExternalModuleReference(node.moduleReference) && plainString(node.moduleReference.expression) === "electron") {
      electronNames.add(node.name.text);
    }
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer && isElectron(node.initializer)) electronNames.add(node.name.text);
  });

  /** The modules the file loads by a plain name, each listed once (as the allow-list lists them). */
  const modules = new Set<string>();
  const load = (how: string, argument: ts.Expression | undefined) => {
    if (!argument) return;
    const name = plainString(argument);
    if (name !== null) modules.add(name);
    else refuse(`${how}(${text(argument)} (package name not a plain string)`);
  };
  /** electron's own `net` (requests from the main process), however it is reached. */
  const electronNet = () => refuse('package "electron" (net)');

  walk(tree, (node) => {
    // --- Modules: import … from "x", export … from "x", import x = require("x"), import("x"), require("x") and the like.
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
      const spec = plainString(node.moduleSpecifier);
      if (spec !== null) modules.add(spec);
      if (spec === "electron") {
        const names = ts.isImportDeclaration(node)
          ? node.importClause?.namedBindings && ts.isNamedImports(node.importClause.namedBindings)
            ? node.importClause.namedBindings.elements
            : []
          : node.exportClause && ts.isNamedExports(node.exportClause)
            ? node.exportClause.elements
            : [];
        for (const element of names) if ((element.propertyName ?? element.name).text === "net") electronNet();
      }
    }
    if (ts.isImportEqualsDeclaration(node) && ts.isExternalModuleReference(node.moduleReference)) load("require", node.moduleReference.expression);
    if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument) && ts.isStringLiteral(node.argument.literal)) modules.add(node.argument.literal.text);

    if (ts.isCallExpression(node)) {
      const loads = loading(node, requireNames);
      if (loads) load(loads.how, loads.argument);

      const callee = node.expression;
      const [first, second] = node.arguments;
      const calleeName = ts.isIdentifier(callee) || ts.isPropertyAccessExpression(callee) ? nameOf(callee) : null;
      // fetch(address), x.fetch(address), sendBeacon(address, data), and a wrapper the allow-list names: the address is the first argument.
      if (calleeName === "fetch" || calleeName === "sendBeacon") callAt(calleeName, first);
      else if (ts.isIdentifier(callee) && wrappers.includes(callee.text)) callAt(callee.text, first);

      // `owner.method(…)`: the method's name, and the name of what it is called on.
      const member = ts.isPropertyAccessExpression(callee) || ts.isElementAccessExpression(callee) ? callee : null;
      const method = member ? nameOf(member) : null;
      const owner = member ? nameOf(unwrap(member.expression)) : null;
      // xhr.open("GET", address): the address is the second argument. Only in a file that uses
      // XMLHttpRequest, so window.open(url) (a link the person clicks) isn't read as a request.
      if (usesXhr && method === "open" && node.arguments.length >= 2) callAt("XMLHttpRequest.open", second);
      // https.get(…), net.connect(…): raw network calls never count as "relative" (a literal there is a
      // socket path or a host, not this app's own server).
      if (method !== null && owner !== null && NODE_REQUEST_METHODS.has(method) && NODE_REQUEST_MODULES.has(owner)) {
        refuse(`${owner}.${method}(${text(first)}`);
      }
      // Reflect.get(globalThis, …): looks a name up on the global object without writing it.
      if (method === "get" && owner === "Reflect") {
        if ((first && (isGlobalObject(first, false) || isElectron(first))) || NETWORK_NAMES.includes(plainString(second) ?? "")) refuse(`Reflect.get(${text(first)}`);
      }
      // require.call(null, "https"), process.getBuiltinModule.apply(…): a module loaded with its name in a later argument.
      if (member && ["call", "apply", "bind"].includes(method ?? "")) {
        const loader = nameOf(unwrap(member.expression));
        if (loader === "require" || loader === "getBuiltinModule" || (loader !== null && requireNames.has(loader))) {
          refuse(`${loader}.${method}(${text(second ?? first)} (a module loaded through .call, .apply or .bind)`);
        }
      }
      // xhr.open.call(xhr, "GET", address): the same request with the address in a later argument.
      if (usesXhr && member && ["call", "apply", "bind"].includes(method ?? "") && nameOf(unwrap(member.expression)) === "open") {
        refuse(`XMLHttpRequest.open.${method}(${text(first)}`);
      }
    }

    // --- new WebSocket(address), new globalThis.EventSource(address), new globalThis["WebSocket"](address).
    if (ts.isNewExpression(node)) {
      const name = nameOf(unwrap(node.expression));
      if (name === "WebSocket" || name === "EventSource") callAt(`new ${name}`, node.arguments?.[0]);
    }

    // --- A name looked up by a string or by something that isn't one.
    if (ts.isElementAccessExpression(node)) {
      const key = plainString(node.argumentExpression);
      const object = unwrap(node.expression);
      const constructed = ts.isNewExpression(node.parent) && node.parent.expression === node;
      // globalThis["fetch"]: named by a string, which the call rules can't read the address of.
      // (`new globalThis["WebSocket"](address)` is read as a constructor above.)
      if (key !== null && NETWORK_NAMES.includes(key) && !(constructed && (key === "WebSocket" || key === "EventSource"))) refuse(byName(key));
      if (key === "net" && isElectron(object)) electronNet();
      const reached = isGlobalObject(object, false) || isElectron(object) || (ts.isIdentifier(object) && object.text === "process");
      // globalThis[k], globalThis["fe" + "tch"]: whatever the key is, the scan can't say it isn't fetch. (A number can't be.)
      if (reached && key === null && !ts.isNumericLiteral(unwrap(node.argumentExpression))) {
        refuse(`${text(node.expression)}[${text(node.argumentExpression)}] (key not a plain string)`);
      }
    }
    if (ts.isPropertyAccessExpression(node) && node.name.text === "net" && isElectron(node.expression)) electronNet();

    // --- Object keys that are strings: { "fetch": send }, { ["fetch"]: send }, const { "fetch": send } = window.
    if ((ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) && NETWORK_NAMES.includes(node.text)) {
      const parent = node.parent;
      const isKey =
        (ts.isPropertyAssignment(parent) && parent.name === node) ||
        (ts.isBindingElement(parent) && parent.propertyName === node) ||
        ts.isComputedPropertyName(parent);
      if (isKey) refuse(byName(node.text));
    }
    if (ts.isBindingElement(node)) {
      const pattern = node.parent;
      const declaration = pattern.parent;
      const from = ts.isObjectBindingPattern(pattern) && ts.isVariableDeclaration(declaration) ? declaration.initializer : undefined;
      if (from) {
        const key = node.propertyName ?? node.name;
        // const { net } = require("electron")
        if ((ts.isIdentifier(key) || ts.isStringLiteral(key)) && key.text === "net" && isElectron(from)) electronNet();
        // const { [k]: f } = globalThis
        if (node.propertyName && ts.isComputedPropertyName(node.propertyName) && plainString(node.propertyName.expression) === null && (isGlobalObject(from, false) || isElectron(from))) {
          refuse(`${text(from)}[${text(node.propertyName.expression)}] (key not a plain string)`);
        }
      }
    }

    // --- fetch (or another of the network's functions) handed on without being called: `const send = fetch`,
    // `{ fetch: custom }`, `window.fetch`, `const { fetch } = globalThis`, `navigator.sendBeacon.bind(navigator)`.
    if (ts.isIdentifier(node) && NETWORK_NAMES.includes(node.text) && isHandedOn(node)) refuse(`${node.text} (used as a value)`);
  });

  for (const spec of modules) if (NETWORK_MODULE.test(spec) || URL_SPECIFIER.test(spec)) refuse(`package "${tidy(spec)}"`);
  return found;
}
