/**
 * Helpers for the tests that read DotAmi's own source code to prove a rule holds everywhere —
 * "every browser-storage key is on the privacy inventory" (tests/privacy-inventory.spec.ts),
 * "no route logs an error object" (tests/error-logging.spec.ts). These are blunt on purpose: they
 * read text, not a syntax tree (the one exception is whether `fetch` is handed on without being
 * called, which text can't tell from the word in a sentence on the page or from another object's
 * `fetch`), and the tests that use them also check they still find the things they are meant to
 * find, so a scan that quietly sees nothing can't pass for a clean one.
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
// What can reach the network

/** A place where the code can reach the network. */
export interface NetworkCall {
  /** The call as the inventory's allow-list spells it: `fetch(TELEMETRY`, `https.get(url`, `package "electron-updater"`. */
  call: string;
  /** True when the address is a literal path on this app's own server ("/api/…"), which cannot leave the computer. */
  relative: boolean;
}

/**
 * A literal path on this app's own server. The whole argument must be one string (or one template)
 * that starts with a single "/" and a character of the path's first segment. Refused, because a
 * browser could read each as another computer or the scan can't see what the address ends up as:
 *   "//host" and "/\host";            a lone "/";
 *   "/${…" (the template could put a host there), and anything that starts with "${…}";
 *   "/" + "/host", "/" + HOST_PATH and "/api/" + id: a literal with more joined to it;
 *   "/<tab>/host": a browser drops tabs and line breaks from an address, which leaves "//host".
 */
function isRelativeLiteral(address: string): boolean {
  const text = address.trim();
  if (!/^(["'`])\/(?![/\\\s\u0000-\u001f\u007f]|\$\{|\1)/.test(text)) return false;
  // That was only the start of the argument: nothing may follow the literal that opened it.
  const end = skipLiteral(text, 0);
  return text[end - 1] === text[0] && text.slice(end).trim() === "";
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
 * What can stand between `new` and the name of a constructor reached through another object:
 * `globalThis.`, `window.parent.`, `(globalThis as any).`. Lazy, so `new WebSocket(` matches with nothing there.
 */
const NEW_PREFIX = String.raw`(?:[\w$.\s]|\([^()]*\))*?`;

/** Names of the global object, and of the windows that are one. `window.fetch` is the page's own fetch; `router.fetch` is not. */
const GLOBAL_OBJECTS = new Set(["globalThis", "window", "self", "global", "top", "parent", "frames"]);

/** Whether `node` is the global object itself: `window`, `(globalThis as any)`, `window.parent`. */
function isGlobalObject(node: ts.Node): boolean {
  let inner = node;
  // A cast or a pair of brackets around it is still the same object.
  while (
    ts.isParenthesizedExpression(inner) ||
    ts.isAsExpression(inner) ||
    ts.isNonNullExpression(inner) ||
    ts.isTypeAssertionExpression(inner) ||
    ts.isSatisfiesExpression(inner)
  ) {
    inner = inner.expression;
  }
  if (ts.isIdentifier(inner)) return GLOBAL_OBJECTS.has(inner.text);
  if (ts.isPropertyAccessExpression(inner)) return GLOBAL_OBJECTS.has(inner.name.text) && isGlobalObject(inner.expression);
  if (ts.isQualifiedName(inner)) return GLOBAL_OBJECTS.has(inner.right.text) && isGlobalObject(inner.left);
  return false;
}

/** Whether `node` is what a plain call `node(…)` calls: the call rule in networkCalls judges those by their address. (`node?.(…)` and `node<T>(…)` it can't read, so they are not plain.) */
function isCalled(node: ts.Node): boolean {
  const call = node.parent;
  return ts.isCallExpression(call) && call.expression === node && !call.questionDotToken && !call.typeArguments;
}

/** Whether this `fetch` is the network's function being passed around, rather than called, defined by the code, or the word in some other thing's name. */
function isFetchHandedOn(id: ts.Identifier): boolean {
  const parent = id.parent;
  if (isCalled(id)) return false;
  // router.fetch, this.client.fetch: some other object's own. Only the global object's is the network's.
  if (ts.isPropertyAccessExpression(parent) && parent.name === id) return !isCalled(parent) && isGlobalObject(parent.expression);
  if (ts.isQualifiedName(parent) && parent.right === id) return isGlobalObject(parent.left);
  // function fetch(…) {…} and a method called fetch: code defining its own, which is not using the network's.
  if (
    (ts.isFunctionDeclaration(parent) || ts.isFunctionExpression(parent) || ts.isMethodDeclaration(parent) || ts.isMethodSignature(parent)) &&
    parent.name === id
  ) {
    return false;
  }
  return true;
}

/**
 * How many times `fetch` is handed on rather than called: `const send = fetch`, `{ fetch: custom }`,
 * `window.fetch`, `const { fetch } = globalThis`. Read from the syntax tree, because the word also
 * appears as another object's property (`router.fetch`), which the text alone can't tell from a real
 * use. A comment, a string or the text of a page (see withoutJsxText) holds no identifier at all.
 */
function fetchHandedOn(tree: ts.SourceFile): number {
  let count = 0;
  const visit = (node: ts.Node) => {
    if (ts.isIdentifier(node) && node.text === "fetch" && isFetchHandedOn(node)) count += 1;
    ts.forEachChild(node, visit);
  };
  visit(tree);
  return count;
}

/**
 * The source with the text of the page blanked out: what sits between the tags in JSX
 * (`<p>We fetch(url) nothing</p>`) is words for a person, not code, but the scans below read text and
 * would take a `fetch(` in a sentence for a call. Same length as the source, line breaks kept.
 */
function withoutJsxText(source: string, tree: ts.SourceFile): string {
  let out = "";
  let copied = 0; // how much of `source` is already in `out`
  const visit = (node: ts.Node) => {
    if (ts.isJsxText(node)) {
      out += source.slice(copied, node.pos) + source.slice(node.pos, node.end).replace(/[^\n]/g, " ");
      copied = node.end;
    }
    ts.forEachChild(node, visit);
  };
  visit(tree);
  return out + source.slice(copied);
}

/**
 * Every place this code can reach the network, for the privacy inventory's scan: fetch (and any
 * wrapper function named in `wrappers`), XMLHttpRequest's open, navigator.sendBeacon, WebSocket,
 * EventSource (also through the global object: `new globalThis.WebSocket(…)`), node's
 * http/https/net request, get and connect, and the import of a module that makes requests. A call
 * is `relative` only when its address is a literal "/…" path, the app's own server (see
 * isRelativeLiteral); one whose address is a variable, a constant, built up from pieces or an
 * absolute URL is not, because the scan can't see where it goes. `source` is a whole file's text and
 * `file` its name (the extension picks TypeScript, JSX or plain JavaScript for the one rule that
 * reads the syntax tree).
 */
export function networkCalls(source: string, wrappers: readonly string[] = [], file = "source.tsx"): NetworkCall[] {
  const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
  const code = withoutJsxText(source, tree);
  const kept = simplify(code, true);
  // Same length as `kept`, with every string blanked: finds code without being fooled by a word in a message.
  const masked = simplify(code, "mask");
  const found: NetworkCall[] = [];

  const callAt = (label: string, open: number, addressIndex: number) => {
    const address = callArguments(kept, open)[addressIndex] ?? "";
    found.push({ call: `${label}(${tidy(address)}`, relative: isRelativeLiteral(address) });
  };

  const addressFirst: [RegExp, string][] = [
    [/(?<!\bfunction\s+)\bfetch\s*\(/g, "fetch"],
    [/\bsendBeacon\s*\(/g, "sendBeacon"],
    // Also `new globalThis.WebSocket(…)`, `new self.EventSource(…)`, `new (window as any).WebSocket(…)`: named as the bare constructor.
    [new RegExp(String.raw`\bnew\s+${NEW_PREFIX}\bWebSocket\s*\(`, "g"), "new WebSocket"],
    [new RegExp(String.raw`\bnew\s+${NEW_PREFIX}\bEventSource\s*\(`, "g"), "new EventSource"],
  ];
  // Wrapper functions around fetch (the allow-list names them): a call to one is judged like a fetch.
  for (const name of wrappers) {
    addressFirst.push([new RegExp(`(?<![\\w$.])(?<!\\bfunction\\s+)${name}\\s*\\(`, "g"), name]);
  }
  for (const [pattern, label] of addressFirst) {
    for (const m of masked.matchAll(pattern)) callAt(label, m.index! + m[0].length - 1, 0);
  }
  // The same two looked up by name: `new globalThis["WebSocket"](…)`. The name is a string, so it is
  // found as a blanked string in `masked` and read from the same place in `kept`.
  const lookedUp = new RegExp(String.raw`\bnew\s+${NEW_PREFIX}\[\s*(["'\`])(${FILL}+)\1\s*\]\s*\(`, "dg");
  for (const m of masked.matchAll(lookedUp)) {
    const [start, end] = m.indices![2];
    const name = kept.slice(start, end);
    if (name === "WebSocket" || name === "EventSource") callAt(`new ${name}`, m.index! + m[0].length - 1, 0);
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

  // fetch handed on without being called (`const send = fetch`, `{ fetch: custom }`, `window.fetch`, `["fetch"]`) is a way around the scan.
  for (let n = fetchHandedOn(tree); n > 0; n -= 1) found.push({ call: "fetch (used as a value)", relative: false });
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
