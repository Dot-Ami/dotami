/**
 * Helpers for the tests that read DotAmi's own source code to check a rule — "every browser-storage
 * key is on the privacy inventory, so is every kind of request out the scan names, and so is every
 * package DotAmi names that ships" (tests/privacy-inventory.spec.ts), "no route logs an error
 * object" (tests/error-logging.spec.ts).
 * The tests that use them also check they still find the things they are meant to find, so a scan
 * that quietly sees nothing can't pass for a clean one.
 *
 * Two kinds of reading live here:
 *   - The NETWORK scan (networkCalls, importedModules, importsFromUnscannedCode and what they use)
 *     reads the TypeScript syntax tree: the `typescript` package parses each file, so a comment, a
 *     string, the words on a page, a quote or backtick inside a regular expression, a name written
 *     with a unicode escape (fetch spelled with "u0066" after a backslash) and a template where a
 *     plain string is expected are each read as what they are. A file that doesn't parse fails it.
 *   - The browser-storage and log scans (everything built on simplify) still read TEXT. simplify
 *     is not a parser: a quote or backtick inside a regular expression literal throws it out of
 *     step and can hide the code after it. The "finds what it should find today" checks would not
 *     show that for a file written later.
 *
 * WHAT THE NETWORK SCAN IS, AND WHAT IT IS NOT
 * It is a safety net, not a proof. It names the kinds of request listed under REFUSED below, in
 * the files listed under THE FILES IT READS, and nothing else. When it is clean the accurate
 * statement is "none of those kinds of request is unlisted", never "nothing leaves this computer".
 * What it does not see is listed under STILL GETS PAST, and what stands behind it under WHAT ELSE
 * STANDS BEHIND IT.
 *
 * THE FILES IT READS (networkSourceFiles): every .ts, .tsx, .mts, .cts, .js, .jsx, .mjs and .cjs
 * file (type declarations aside) under app/, components/, lib/ and desktop/, and in the repo's top
 * folder (middleware.ts, next.config.mjs, instrumentation.ts, the tool configs: anything Next or
 * Electron runs from there). NOT read: any other folder (scripts/, prisma/, tests/, e2e/,
 * e2e-desktop/). The inventory lists each such folder that holds source with the reason
 * (UNSCANNED_FOLDERS), and the spec fails on a new one (a pages/, src/ or public/ folder, say)
 * until it is scanned or listed; importsFromUnscannedCode fails any file that imports code from
 * one. Also not read: files that aren't TypeScript or JavaScript (HTML such as
 * desktop/passphrase.html, CSS, JSON).
 *
 * REFUSED as an unlisted network path (unless the allow-list in lib/privacy/inventory.ts names that
 * one call; each line covers one call, so a second call, or one with another address or program,
 * needs a line of its own):
 *   - an address taken by a call: fetch(…), fetchLater(…), sendBeacon(…), `.open(method, address)`
 *     read only in a file that itself spells the word XMLHttpRequest (see STILL GETS PAST for a
 *     request made in one file and opened in another), new WebSocket(…), new EventSource(…), new WebTransport(…), new WebSocketStream(…),
 *     and any wrapper the allow-list names (postJson), however it is reached: imported, imported
 *     under another name, taken out of a dynamic import, called through a namespace, or
 *     re-exported under another name and called there. Fine only when the address is one literal
 *     "/…" path on DotAmi's own server. A wrapper handed on, held under another name or exported as
 *     a default is refused too;
 *   - new RTCPeerConnection(…) (WebRTC, also under its old webkit-prefixed name), whatever it is
 *     given: connect-src does not govern WebRTC;
 *   - those names handed on without being called (`const send = fetch`, `window.fetch`,
 *     `x.fetch.call(…)` / `.apply` / `.bind`, `const { fetch } = globalThis`), or looked up by a
 *     string (`globalThis["fetch"]`, `navigator["sendBeacon"]`);
 *   - node's http, https, http2, tls, dgram and dns: any import (and https.get, tls.connect and
 *     the like by name). Node's net and child_process: every CALL, named on its own with the
 *     start of its first argument (`net.createServer(`, `new net.Socket(`, `net.connect(443`,
 *     `child_process.spawn("python"`), followed through import, require, createRequire,
 *     process.getBuiltinModule, destructuring and renaming. A program that is not a string literal
 *     (or process.execPath) is flagged as such; handing the module or one of its functions on,
 *     calling it through .call or .then, or re-exporting it is refused. Importing one and never
 *     calling it, or only naming its types, is not;
 *   - electron: its own `net` and `autoUpdater` however they are reached (the update library
 *     electron-updater is a package import, below), loadURL, loadFile and downloadURL on any
 *     object (each call named: `loadURL(origin`), `fetch`, `preconnect` and `resolveHost` on a
 *     session (the default session, a partition, `win.webContents.session`, or a name holding one),
 *     even with a path that looks relative, and `crashReporter.start(…)` (it uploads crash dumps to
 *     the address it is given): each call named, the method taken off its object or `crashReporter`
 *     handed on refused, `crashReporter`'s other methods left alone;
 *   - importing or requiring a package on one of two lists, however it is quoted or reached
 *     (`import`, `import(…)`, `require`, `createRequire(…)(…)`, `process.getBuiltinModule(…)`; even an
 *     import only for its types): NETWORK_PACKAGE below (a fixed list of HTTP, update and analytics
 *     packages, by name), and every package the inventory's DEPENDENCIES marks "yes" (can reach the
 *     network) or "unverified". A package on neither list is NOT refused, however much it uses the
 *     network (the dependency check below is what makes a new package that ships get an entry). A
 *     package is matched by its name, so "@anthropic-ai/sdk/index", "axios/dist/node/axios.cjs",
 *     "@vercel/analytics/next" and a path through node_modules are the package. Also anything
 *     loaded from a URL;
 *   - a module name that is not a plain string (`import("node:" + "https")`, `require(name)`), and
 *     a module loaded through `require.call(…)` / `.apply` / `.bind`;
 *   - looking something up on globalThis, window, self, global, navigator, process or the electron
 *     module by a key that is not a plain string (`globalThis[k]`, `globalThis["fe" + "tch"]`), and
 *     Reflect.get on those. (A bare `parent`, `top` or `frames` is not read as a window here, so a
 *     tree node called `parent` can be indexed; `window.parent[k]` is.)
 * Two more checks sit beside it in the spec: a file importing a package that package.json doesn't
 * declare (a transitive one) fails, and so does a package that ships WITHOUT AN ENTRY in
 * DEPENDENCIES. "Ships" there means one of: package.json "dependencies"; a package
 * desktop/package.mjs copies into the installed app; or a package imported (even type-only) by a
 * file under app/, components/ or lib/, or by middleware.* or instrumentation*.* in the top folder,
 * which is what Next bundles whether package.json calls it a dependency or a devDependency. An
 * import from desktop/ is not counted on its own (the installer stages only what package.mjs
 * copies), and the packages those packages pull in are not listed: the list is what DotAmi names
 * itself, not the whole tree.
 *
 * STILL GETS PAST (the spec's "known gaps" test pins each of these, so the list can't go stale):
 *   - a request a package makes inside its own code. The scan sees the import, never what happens
 *     after it (Next.js, Prisma, React, electron-updater and the packages they pull in);
 *   - a copy of the global object under another name: `const w = window; const s = w.fetch; s(url)`,
 *     `document.defaultView.fetch` (a direct call `w.fetch(url)` IS caught, whatever `w` is);
 *   - making the page do the loading instead of calling a function: `new Image().src = url`, a
 *     <script src>, <img>, <iframe>, <link> or <form action>, `window.open(url)`,
 *     `location.href = url`, `location.assign(url)`, and in the desktop app `shell.openExternal(url)`;
 *   - workers and their scripts: `new Worker(url)`, `importScripts(url)`, `serviceWorker.register(url)`;
 *   - code made at run time, by the global `eval`, the Function constructor, or electron's
 *     `webContents.executeJavaScript(…)`, which runs a string in the page the same way;
 *   - an XMLHttpRequest made in one file and opened in another: a helper that returns
 *     `new XMLHttpRequest()` in one file and `makeRequest().open("GET", address)` in a file that
 *     never spells the word (the `.open` is read only where the file itself names XMLHttpRequest);
 *   - computed lookups other than the ones above: `Object.getOwnPropertyDescriptor(window, k)`; a
 *     wrapper looked up on a module by a variable key (`agree[k](url)`); loadURL and its kin looked
 *     up on a window by a variable key (`win[k](url)`); a `connect` called on an object the scan
 *     can't tell is node's net or tls because a function returned it;
 *   - other ways electron starts a program, such as `utilityProcess.fork(…)` (the desktop app uses
 *     it to start DotAmi's own server), and node internals and native add-ons:
 *     `process.binding(…)`, a `.node` file;
 *   - Next.js settings that make the SERVER fetch for a page: `rewrites` in next.config.mjs,
 *     `NextResponse.rewrite(…)` in middleware.ts, `images.remotePatterns`;
 *   - what another program does: the statute store's lookup.py is started with child_process, and
 *     its code is not in this repository;
 *   - the files and folders under THE FILES IT READS that are not read.
 *
 * WHAT ELSE STANDS BEHIND IT.
 *   1. GitHub's Dependency review check on a pull request (the "Dependency review" job in
 *      .github/workflows/ci.yml). It fails a change that adds a package with a known high or
 *      critical vulnerability or a licence the project can't ship. It does not look at what a
 *      package does on the network, and the job runs only while the repository variable
 *      DEPENDENCY_REVIEW is "on".
 *   2. IN THE BROWSER, the Content-Security-Policy that middleware.ts sets on every page:
 *      `connect-src 'self'` stops fetch, fetchLater, XMLHttpRequest, sendBeacon, WebSocket,
 *      EventSource and a link's ping reaching another address; `img-src 'self' blob: data:` stops
 *      `new Image().src` and <img>; `default-src 'self'` covers frames and media; `form-action 'self'`
 *      stops a form posting elsewhere. `script-src` stops a <script src> in the page's own HTML,
 *      but because it carries 'strict-dynamic' a script that is already running may add or import
 *      another one, so a script added by code is not reliably stopped. The policy does NOT stop
 *      WebRTC (connect-src does not govern it, and the policy sets no `webrtc` directive); it is
 *      not known to stop WebTransport or WebSocketStream (MDN's list for connect-src doesn't name
 *      them, so nothing here relies on it); and it does NOT stop navigation (window.open, a link,
 *      `location.href`; in the desktop app the window refuses to leave DotAmi's own pages and
 *      opens such addresses in the person's own browser instead). It covers only the pages
 *      middleware.ts serves: the API routes, everything that runs on the server, and the desktop
 *      app's main process are not under it (the passphrase window has a policy of its own,
 *      `default-src 'none'`), and there this scan and code review are all there is.
 *   3. Code review, which is all there is for everything under STILL GETS PAST that the browser
 *      policy doesn't stop.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { builtinModules } from "node:module";
import path from "node:path";
import ts from "typescript";

const ROOT = process.cwd();

/** TypeScript. */
export const TS_FILES = /\.(ts|tsx)$/;
/** Plain JavaScript (the desktop app's code, desktop/, is JavaScript modules). */
export const JS_FILES = /\.(js|jsx|mjs|cjs)$/;
/** Any file the network scan reads: TypeScript or JavaScript, with or without JSX, in any of the module flavours. */
export const SOURCE_FILES = /\.(ts|tsx|mts|cts|js|jsx|mjs|cjs)$/;
/** A type declaration (`x.d.ts`, `x.d.mts`, `x.d.cts`): no code runs from one. */
const DECLARATION_FILE = /\.d\.[cm]?ts$/;

/** The folders the network scan reads: the app's own code and the desktop app's. */
export const NETWORK_FOLDERS = ["app", "components", "lib", "desktop"];

/** Every file under the given folders (relative to `root`, the repo by default) whose name fits `pattern`, as repo-relative paths with forward slashes. */
export function sourceFiles(folders: string[], pattern: RegExp = TS_FILES, root: string = ROOT): string[] {
  const found: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(path.join(root, dir))) {
      if (name === "node_modules" || name === ".next") continue;
      const relative = `${dir}/${name}`;
      const full = path.join(root, relative);
      if (statSync(full).isDirectory()) walk(relative);
      else if (pattern.test(name) && !DECLARATION_FILE.test(name)) found.push(relative);
    }
  };
  for (const folder of folders) walk(folder);
  return found.sort();
}

/** The source files in the repo's top folder itself (`middleware.ts`, `next.config.mjs`, `instrumentation.ts`, the tool configs): anything Next or Electron runs from there. */
export function rootSourceFiles(root: string = ROOT): string[] {
  return readdirSync(root)
    .filter((name) => SOURCE_FILES.test(name) && !DECLARATION_FILE.test(name) && statSync(path.join(root, name)).isFile())
    .sort();
}

/**
 * Every file the network scan reads, repo-relative: all TypeScript and JavaScript (.ts .tsx .mts
 * .cts .js .jsx .mjs .cjs) under app/, components/, lib/ and desktop/, and every such file in the
 * repo's top folder. The one definition of "scanned": the real check and the tests of it both use it.
 */
export function networkSourceFiles(root: string = ROOT): string[] {
  return [...sourceFiles(NETWORK_FOLDERS, SOURCE_FILES, root), ...rootSourceFiles(root)].sort();
}

/** Top-level folders that never hold code a person runs: dependencies, build output and test reports. */
const OUTPUT_FOLDERS = new Set(["node_modules", "dist-desktop", "coverage", "playwright-report", "test-results"]);

/**
 * The top-level folders that hold source files the network scan does NOT read (everything but the
 * scanned folders, hidden folders and build output). The inventory lists each with the reason it
 * isn't read (UNSCANNED_FOLDERS), so a new folder such as pages/, src/ or public/ fails the check
 * until someone decides, rather than being silently skipped.
 */
export function unscannedSourceFolders(root: string = ROOT): string[] {
  return readdirSync(root)
    .filter((name) => !name.startsWith(".") && !OUTPUT_FOLDERS.has(name) && !NETWORK_FOLDERS.includes(name) && statSync(path.join(root, name)).isDirectory())
    .filter((name) => sourceFiles([name], SOURCE_FILES, root).length > 0)
    .sort();
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

/**
 * Makes a name safe to put inside a RegExp. The names here are JavaScript identifiers, so `$` is the
 * only special character they can hold today — escaping every one (backslash included) costs nothing
 * and keeps the patterns right if a caller ever passes something else.
 */
function escapeForRegExp(text: string): string {
  return text.replace(/[\\^$.*+?()[\]{}|]/g, "\\$&");
}

/** A pattern for the bare name `local` being called: `local(…)`, not `thing.local(…)`. */
function callOf(local: string): RegExp {
  return new RegExp(String.raw`(?<![\w$.])${escapeForRegExp(local)}${CALL}`, "g");
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
    const name = escapeForRegExp(local);
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
  const escaped = names.map(escapeForRegExp);
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
  /** The call as the inventory's allow-list spells it: `fetch(TELEMETRY`, `https.get(url`, `package "electron-updater"`, `child_process.spawn("python"`. */
  call: string;
  /** True when the address is a literal path on this app's own server ("/api/…"), which cannot leave the computer. */
  relative: boolean;
}

/** Functions that take an address as their first argument: a call is judged by that address. */
const ADDRESS_CALLS = ["fetch", "fetchLater", "sendBeacon"];
/** Constructors that take an address as their first argument: `new WebSocket(address)` is judged by it. */
const ADDRESS_CONSTRUCTORS = ["WebSocket", "EventSource", "WebTransport", "WebSocketStream"];
/** WebRTC. Its connections go to the peers and STUN/TURN servers named in the config it is given, and the page's connect-src does not govern them, so a call is refused whatever it is given. */
const WEBRTC_CONSTRUCTORS = ["RTCPeerConnection", "webkitRTCPeerConnection"];
const CONSTRUCTORS = [...ADDRESS_CONSTRUCTORS, ...WEBRTC_CONSTRUCTORS];
/** The ways a page or node sends something somewhere by a global name. A call of one is judged by its address (or refused); handing one on is refused. */
const NETWORK_NAMES = [...ADDRESS_CALLS, "XMLHttpRequest", ...CONSTRUCTORS];

/**
 * node's own modules that make requests. Importing one is refused unless the file is listed.
 * (`net` and `child_process` are judged one call at a time instead: PER_CALL_MODULES.)
 */
const NETWORK_BUILTIN = /^(?:https?|http2|tls|dgram|dns)$/;

/**
 * Packages whose job is to reach the network, or that DotAmi uses and that make requests of their
 * own: importing one is itself a way to reach out, so it is refused (unless the file is listed)
 * whether or not a call to it is visible. A fixed list by name: the two libraries DotAmi uses that
 * make requests, and the usual HTTP clients and trackers. The inventory's dependency list
 * (DEPENDENCIES) adds to this every package it marks as able to reach the network or as unverified.
 * A package on neither list is not refused, whatever it does.
 */
const NETWORK_PACKAGE =
  /^(?:@anthropic-ai\/sdk|electron-updater|axios|node-fetch|cross-fetch|isomorphic-fetch|undici|got|ky|superagent|ws|socket\.io-client|openai|posthog-js|@vercel\/analytics|@sentry\/[\w-]+|@segment\/[\w-]+)$/;

/** Whether the scan on its own refuses importing this package (a package name, not a subpath). */
export function isKnownNetworkPackage(name: string): boolean {
  return NETWORK_PACKAGE.test(name);
}

/** Modules whose every use is refused unless that one call is listed: they can start programs or open raw connections. */
const PER_CALL_MODULES = new Set(["net", "child_process"]);
/** Modules the scan follows through the names the file gives them (import, require, destructuring). */
const TRACKED_MODULES = new Set([...PER_CALL_MODULES, "electron"]);
/** Things electron offers that reach out on their own: refused wherever they are reached, unless listed. */
const ELECTRON_REFUSED = new Map([
  ["net", 'package "electron" (net)'],
  ["autoUpdater", 'package "electron" (autoUpdater)'],
]);
/** Electron methods that load an address or a file into a window, or download one. The address is the scan's business, whatever object they are called on. */
const ELECTRON_LOADERS = new Set(["loadURL", "loadFile", "downloadURL"]);
/** child_process functions that start a program: the label names the program as written. */
const PROGRAM_STARTERS = new Set(["spawn", "spawnSync", "exec", "execSync", "execFile", "execFileSync", "fork"]);

/** A module name that is an address: `import("https://…")` loads code over the network (and a data: address is code written into the name). */
const URL_SPECIFIER = /^(?:(?:https?|wss?|ftp|data|blob):|\/\/)/i;

/** node's request-making functions, and the modules they come from: `https.get(…)`, `net.connect(…)`. */
const NODE_REQUEST_METHODS = new Set(["request", "get", "connect", "createConnection"]);
const NODE_REQUEST_MODULES = new Set(["http", "https", "http2", "net", "tls"]);

/** Names of the global object. `window.fetch` is the page's own fetch; `router.fetch` is not. */
const GLOBAL_OBJECTS = new Set(["globalThis", "window", "self", "global", "navigator"]);
/** Other windows, which are global objects too. Common as the name of something else (`parent[key]` in a tree), so only trusted where it matters less (see isGlobalObject). */
const OTHER_WINDOWS = new Set(["top", "parent", "frames"]);

/** The names of node's own modules (`fs`, `https`, `fs/promises` → `fs`, `https`). */
const NODE_BUILTINS = new Set(builtinModules.map((name) => name.split("/")[0]));

/** What a module specifier points at. */
export interface ModuleName {
  /** `relative`: a file of our own ("./x", "../x", "@/lib/x"); `address`: loaded from a URL; `builtin`: one of node's; `package`: from node_modules. */
  kind: "relative" | "address" | "builtin" | "package";
  /** For a package, the package's own name: "@anthropic-ai/sdk/index" and "axios/dist/node/axios.cjs" are "@anthropic-ai/sdk" and "axios". For a builtin its name without "node:". Otherwise the specifier. */
  name: string;
}

/** Which module a specifier names, by its root: a subpath of a package is the package. */
export function moduleName(specifier: string): ModuleName {
  if (URL_SPECIFIER.test(specifier)) return { kind: "address", name: specifier };
  // A path into node_modules ("../node_modules/axios/index.js") is that package, however it is reached.
  const inNodeModules = specifier.match(/(?:^|\/)node_modules\/((?:@[^/]+\/)?[^/]+)/);
  if (inNodeModules) return { kind: "package", name: inNodeModules[1] };
  // "./x", "../x", "/abs/x", "@/lib/x" (tsconfig's alias for the repo root), "#x" (package.json's "imports"), file: URLs.
  if (/^(?:\.{0,2}\/|\.{1,2}$|@\/|#|file:)/.test(specifier)) return { kind: "relative", name: specifier };
  if (specifier.startsWith("node:")) return { kind: "builtin", name: specifier.slice("node:".length).split("/")[0] };
  const parts = specifier.split("/");
  const root = specifier.startsWith("@") ? parts.slice(0, 2).join("/") : parts[0];
  return NODE_BUILTINS.has(root) ? { kind: "builtin", name: root } : { kind: "package", name: root };
}

/** The module's name for a refusal: what the file wrote, cut back to the package (`node:dns/promises` → `node:dns`, `axios/dist/x.cjs` → `axios`). */
function moduleLabel(specifier: string, module: ModuleName): string {
  if (module.kind === "address" || module.kind === "relative") return tidy(specifier);
  return module.kind === "builtin" && specifier.startsWith("node:") ? `node:${module.name}` : module.name;
}

/** Collapses a source snippet to one short line, for naming a call. */
function tidy(text: string, max = 60): string {
  return text.replace(/\s+/g, " ").trim().slice(0, max);
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
 * Whether this identifier READS a name, as opposed to declaring it, importing it, naming a property
 * or attribute, or sitting in a type. `{ net }` reads `net`; `{ net: 1 }`, `x.net`, `<A net={…}/>`,
 * `function net() {}` and `import net from "…"` do not. A local `export { net }` reads it.
 */
function isUse(id: ts.Identifier): boolean {
  const parent = id.parent;
  if (inTypeOnlyPosition(id)) return false;
  if (ts.isPropertyAccessExpression(parent) && parent.name === id) return false;
  if (ts.isImportSpecifier(parent) || ts.isImportClause(parent) || ts.isNamespaceImport(parent) || ts.isImportEqualsDeclaration(parent)) return false;
  if (ts.isExportSpecifier(parent)) return !parent.parent.parent.moduleSpecifier && (parent.propertyName ?? parent.name) === id;
  if (ts.isBindingElement(parent) && (parent.name === id || parent.propertyName === id)) return false;
  if (ts.isPropertyAssignment(parent) && parent.name === id) return false;
  if (ts.isJsxAttribute(parent) || ts.isLabeledStatement(parent) || ts.isBreakOrContinueStatement(parent)) return false;
  if (
    (ts.isVariableDeclaration(parent) ||
      ts.isParameter(parent) ||
      ts.isFunctionDeclaration(parent) ||
      ts.isFunctionExpression(parent) ||
      ts.isClassDeclaration(parent) ||
      ts.isClassExpression(parent) ||
      ts.isMethodDeclaration(parent) ||
      ts.isPropertyDeclaration(parent) ||
      ts.isGetAccessorDeclaration(parent) ||
      ts.isSetAccessorDeclaration(parent) ||
      ts.isEnumDeclaration(parent) ||
      ts.isEnumMember(parent) ||
      ts.isModuleDeclaration(parent)) &&
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

/** Reads a file's text as the TypeScript parser would (the extension picks TypeScript, JSX or plain JavaScript). Throws when it doesn't parse: a file the scan can't read must not pass for a clean one. */
function parseSource(source: string, file: string): ts.SourceFile {
  const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
  const problems = (tree as unknown as { parseDiagnostics: readonly ts.Diagnostic[] }).parseDiagnostics;
  if (problems.length > 0) {
    const { line } = tree.getLineAndCharacterOfPosition(problems[0].start ?? 0);
    throw new Error(`${file}:${line + 1} doesn't parse (${ts.flattenDiagnosticMessageText(problems[0].messageText, " ")}), so the network scan can't read it`);
  }
  return tree;
}

/** What a name in the file stands for: a whole module (`member` null), or one thing taken from it. */
interface ModuleRef {
  /** The module's name without "node:" ("net", "child_process", "electron"). */
  module: string;
  member: string | null;
  /** The module as a refusal should name it ("node:net"). */
  spec: string;
}

/** Whether a declaration's name is one the scan can follow: a plain name, or `{ a, b: c, ...rest }` with plain keys. */
function isFollowable(name: ts.BindingName): boolean {
  if (ts.isIdentifier(name)) return true;
  return (
    ts.isObjectBindingPattern(name) &&
    name.elements.every((el) => ts.isIdentifier(el.name) && (!el.propertyName || ts.isIdentifier(el.propertyName) || ts.isStringLiteral(el.propertyName)))
  );
}

/** Helper names (the inventory's `wrapper`s) that a file's `import { x as y }` or `const { x: y } = …` gives other names, found with the file's own scan. */
function wrapperLocalsOf(tree: ts.SourceFile, wrapperNames: ReadonlySet<string>): Set<string> {
  const locals = new Set<string>();
  walk(tree, (node) => {
    if (ts.isImportSpecifier(node) && wrapperNames.has((node.propertyName ?? node.name).text)) locals.add(node.name.text);
    if (ts.isBindingElement(node) && ts.isIdentifier(node.name) && wrapperNames.has(((node.propertyName ?? node.name) as ts.Identifier | ts.StringLiteral).text)) {
      locals.add(node.name.text);
    }
  });
  return locals;
}

/**
 * The names this file hands on under which a wrapper (an inventory `wrapper`, such as postJson) can
 * be reached from another file: `export { postJson as send }`, `export { postJson as send } from
 * "./agree-prompt"`, `export const send = postJson`, and a name that stands for one in this file
 * (`import { postJson as p }; export { p }`). Those are new names for the same helper, so a call
 * of one anywhere is judged like a call of the helper (see wrapperNamesAcross).
 */
export function exportedWrapperNames(source: string, wrappers: readonly string[], file = "source.tsx"): string[] {
  const tree = parseSource(source, file);
  const names = new Set(wrappers);
  const locals = wrapperLocalsOf(tree, names);
  const isWrapper = (name: string) => names.has(name) || locals.has(name);
  const found = new Set<string>();
  walk(tree, (node) => {
    // (A default export can't be followed by name; the scan refuses it where it is written.)
    if (ts.isExportSpecifier(node) && node.name.text !== "default" && isWrapper((node.propertyName ?? node.name).text)) found.add(node.name.text);
    if (ts.isVariableStatement(node) && node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)) {
      for (const declaration of node.declarationList.declarations) {
        const init = declaration.initializer && unwrap(declaration.initializer);
        if (!init || !ts.isIdentifier(declaration.name)) continue;
        const reached = ts.isIdentifier(init) ? isWrapper(init.text) : (ts.isPropertyAccessExpression(init) || ts.isElementAccessExpression(init)) && names.has(nameOf(init) ?? "");
        if (reached) found.add(declaration.name.text);
      }
    }
  });
  return [...found];
}

/**
 * Every name the given files can reach a wrapper under: the wrappers' own names, plus the names any
 * file re-exports one as, and so on until nothing new turns up. A call of any of these is judged
 * like a call of the wrapper.
 */
export function wrapperNamesAcross(sources: readonly { file: string; code: string }[], wrappers: readonly string[]): string[] {
  const names = new Set(wrappers);
  for (let grew = names.size > 0; grew; ) {
    grew = false;
    for (const { file, code } of sources) {
      // A file can only re-export a wrapper if it writes the name of one (or of a name already found): no need to parse the rest.
      if (![...names].some((name) => code.includes(name))) continue;
      for (const name of exportedWrapperNames(code, [...names], file)) {
        if (!names.has(name)) {
          names.add(name);
          grew = true;
        }
      }
    }
  }
  return [...names];
}

const NO_PACKAGES: ReadonlySet<string> = new Set();

/** What else the scan is told besides the file. */
export interface ScanOptions {
  /** Package names (not subpaths) whose import is refused as well as the ones the scan knows: the inventory's dependency list gives it the packages it marks as able to reach the network, or as unverified. */
  packages?: ReadonlySet<string>;
  /**
   * Other names a wrapper is reached by from other files (wrapperNamesAcross finds them): a call of
   * one by that bare name, or on a name imported from one of our own files (`barrel.send(…)`), is
   * judged like a call of the wrapper. They are not matched on every object, so an unrelated
   * `ipcRenderer.send(…)` stays alone.
   */
  aliases?: readonly string[];
}

/**
 * Every place this code can reach the network, for the privacy inventory's scan. See the header of
 * this file for the full list of what is refused. In short: fetch, fetchLater, sendBeacon,
 * `.open(method, address)` in a file that spells XMLHttpRequest, WebSocket, EventSource, WebTransport, WebSocketStream and RTCPeerConnection
 * (also through the global object), any wrapper function named in `wrappers` however it is
 * imported, renamed, re-exported or reached through a namespace, node's http/https/http2/tls
 * request, get and connect, every call into node's net and child_process (named one by one:
 * `child_process.spawn("python"`), electron's net and autoUpdater, loadURL, loadFile and
 * downloadURL, session fetch, preconnect and resolveHost, crashReporter.start, the import of a
 * package on NETWORK_PACKAGE or in `options.packages` (matched by its package name, so a subpath
 * such as "axios/dist/node/axios.cjs" counts; a package on neither is not refused), and the
 * disguises listed in the header. A call
 * is `relative` only when its address is a literal "/…" path, the app's own server (see
 * isRelativeLiteral); one whose address is a variable, a constant, built up from pieces or an
 * absolute URL is not, because the scan can't see where it goes.
 *
 * `source` is a whole file's text and `file` its name (the extension picks TypeScript, JSX or plain
 * JavaScript for the parser). Throws when the file doesn't parse.
 */
export function networkCalls(source: string, wrappers: readonly string[] = [], file = "source.tsx", options: ScanOptions = {}): NetworkCall[] {
  return scan(source, wrappers, file, options).calls;
}

/** Every module the file loads by a plain name, as the file spells it, each listed once: `import … from "x"`, `export … from "x"`, `import("x")`, `require("x")`, `import type …`. */
export function importedModules(source: string, file = "source.tsx"): string[] {
  return scan(source, [], file, {}).modules;
}

/**
 * The imports in `file` of our own code (a relative path, or "@/…", tsconfig's alias for the repo's
 * top folder) that lead OUT of the folders the scan reads: `../prisma/seed-data`, `@/scripts/x.mjs`,
 * a path that climbs out of the repo. Code the app loads from there would run without being read. A
 * path the scan can't place ("/abs", "#x", "file:") is listed as it is. `file` is repo-relative.
 */
export function importsFromUnscannedCode(source: string, file: string): string[] {
  return importedModules(source, file).filter((spec) => {
    if (moduleName(spec).kind !== "relative") return false;
    let target: string;
    if (spec.startsWith("@/")) target = spec.slice(2);
    else if (spec.startsWith(".")) target = path.posix.normalize(path.posix.join(path.posix.dirname(file), spec));
    else return true;
    // A file in the repo's top folder is read; so is anything inside a scanned folder; a ".." climbs out of the repo.
    return !(NETWORK_FOLDERS.includes(target.split("/")[0]) || (!target.includes("/") && !/^\.{0,2}$/.test(target)));
  });
}

function scan(source: string, wrappers: readonly string[], file: string, options: ScanOptions): { calls: NetworkCall[]; modules: string[] } {
  const refusedPackages = options.packages ?? NO_PACKAGES;
  const tree = parseSource(source, file);
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
  walk(tree, (node) => {
    if (ts.isIdentifier(node) && node.text === "XMLHttpRequest") usesXhr = true;
    if (ts.isElementAccessExpression(node) && plainString(node.argumentExpression) === "XMLHttpRequest") usesXhr = true;
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) {
      const init = unwrap(node.initializer);
      const made = ts.isCallExpression(init) && nameOf(unwrap(init.expression)) === "createRequire";
      if (made || (ts.isIdentifier(init) && init.text === "require")) requireNames.add(node.name.text);
    }
  });

  // ---- Names for modules. `refs` says what each name the file declares stands for, for the modules
  // the scan follows (net, child_process, electron): `import net from "node:net"`, `const { spawn } =
  // require("child_process")`, `const run = spawn`. The plain word `electron` counts with no import in view.
  const refs = new Map<string, ModuleRef>([["electron", { module: "electron", member: null, spec: "electron" }]]);

  /** What `node` stands for when it names one of those modules or something taken from one: `(await import("node:net")).default`, `net.connect`, `spawn`. */
  const resolve = (node: ts.Node): ModuleRef | null => {
    let inner = unwrap(node);
    while (ts.isAwaitExpression(inner)) inner = unwrap(inner.expression);
    if (ts.isIdentifier(inner)) return refs.get(inner.text) ?? null;
    if (ts.isCallExpression(inner)) {
      const load = loading(inner, requireNames);
      const spec = load ? plainString(load.argument) : null;
      const module = spec !== null ? moduleName(spec) : null;
      if (spec !== null && module && (module.kind === "builtin" || module.kind === "package") && TRACKED_MODULES.has(module.name)) {
        return { module: module.name, member: null, spec: moduleLabel(spec, module) };
      }
      return null;
    }
    if (ts.isPropertyAccessExpression(inner) || ts.isElementAccessExpression(inner)) {
      const name = nameOf(inner);
      const base = name === null ? null : resolve(inner.expression);
      if (!base || base.member !== null) return null;
      return name === "default" ? base : { ...base, member: name };
    }
    return null;
  };
  const isElectron = (node: ts.Node): boolean => {
    const ref = resolve(node);
    return ref !== null && ref.module === "electron" && ref.member === null;
  };

  /** Whether `node` is an electron session: `session.defaultSession`, `win.webContents.session`, `session.fromPartition(…)`, or a name holding one. */
  const sessionLocals = new Set<string>();
  const isSession = (node: ts.Node): boolean => {
    const inner = unwrap(node);
    if (ts.isIdentifier(inner)) {
      const ref = refs.get(inner.text);
      return sessionLocals.has(inner.text) || (ref?.module === "electron" && ref.member === "session");
    }
    if (ts.isPropertyAccessExpression(inner) || ts.isElementAccessExpression(inner)) return ["session", "defaultSession"].includes(nameOf(inner) ?? "");
    if (ts.isCallExpression(inner)) {
      const callee = unwrap(inner.expression);
      return ["fromPartition", "fromPath"].includes(nameOf(callee) ?? "") && (ts.isPropertyAccessExpression(callee) || ts.isElementAccessExpression(callee)) && isSession(callee.expression);
    }
    return false;
  };

  /** Whether `node` is electron's crashReporter (`crashReporter`, `electron.crashReporter`, `require("electron").crashReporter`, or a name holding one). */
  const isCrashReporter = (node: ts.Node): boolean => {
    const ref = resolve(node);
    return ref !== null && ref.module === "electron" && ref.member === "crashReporter";
  };

  /**
   * Judges electron's crashReporter itself being handed on (passed to a function, returned,
   * re-exported): its `start` uploads crash dumps to an address, so the whole object going somewhere
   * the scan can't follow is refused. Reading a member off it (`crashReporter.start(…)`,
   * `crashReporter.getLastCrashReport()`) is judged where the member is written, and holding it
   * under another name is followed.
   */
  const judgeCrashReporter = (node: ts.Expression) => {
    if (!isCrashReporter(node)) return;
    if (ts.isIdentifier(node) && !isUse(node)) return;
    const ref = resolve(node)!;
    if (inTypeOnlyPosition(node) || isStep(node, ref)) return;
    const parent = node.parent;
    if ((ts.isPropertyAccessExpression(parent) || ts.isElementAccessExpression(parent)) && parent.expression === node) return;
    if (ts.isVariableDeclaration(parent) && parent.initializer === node && isFollowable(parent.name)) return;
    if (ts.isBinaryExpression(parent) && parent.operatorToken.kind === ts.SyntaxKind.EqualsToken && parent.right === node && ts.isIdentifier(parent.left)) return;
    refuse("crashReporter (used as a value)");
  };

  /**
   * Wrapper helpers (the inventory's `wrapper`s): `wrapperNames` are the helpers' own names, matched
   * on any object (`agree.postJson(…)`); `aliasNames` are the other names other files re-export
   * them under, matched as a bare name and on names imported from our own files; `wrapperLocals` are
   * the names this file gives them (`import { postJson as send }`).
   */
  const wrapperNames = new Set(wrappers);
  const aliasNames = new Set(options.aliases ?? []);
  const wrapperLocals = wrapperLocalsOf(tree, new Set([...wrapperNames, ...aliasNames]));
  const isWrapperName = (name: string) => wrapperNames.has(name) || aliasNames.has(name) || wrapperLocals.has(name);
  /** Names this file takes from our own files (`import * as b from "./barrel"`, `const b = require("./barrel")`): an alias is looked for on these. */
  const localImports = new Set<string>();
  walk(tree, (node) => {
    if (ts.isImportDeclaration(node) && node.importClause) {
      const spec = plainString(node.moduleSpecifier);
      if (spec === null || moduleName(spec).kind !== "relative") return;
      const { name, namedBindings } = node.importClause;
      if (name) localImports.add(name.text);
      if (namedBindings && ts.isNamespaceImport(namedBindings)) localImports.add(namedBindings.name.text);
      if (namedBindings && ts.isNamedImports(namedBindings)) for (const element of namedBindings.elements) localImports.add(element.name.text);
    }
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) {
      let init = unwrap(node.initializer);
      while (ts.isAwaitExpression(init)) init = unwrap(init.expression);
      const load = ts.isCallExpression(init) ? loading(init, requireNames) : null;
      const spec = load ? plainString(load.argument) : null;
      if (spec !== null && moduleName(spec).kind === "relative") localImports.add(node.name.text);
    }
  });
  /** Whether a property of some object is a wrapper helper: its own name on any object, or an alias on something taken from our own files. */
  const isWrapperProperty = (access: ts.PropertyAccessExpression | ts.ElementAccessExpression): boolean => {
    const name = nameOf(access);
    if (name === null) return false;
    if (wrapperNames.has(name)) return true;
    const receiver = unwrap(access.expression);
    return aliasNames.has(name) && ts.isIdentifier(receiver) && localImports.has(receiver.text);
  };

  for (let changed = true; changed; ) {
    changed = false;
    const bind = (name: string, ref: ModuleRef) => {
      const old = refs.get(name);
      if (!old || old.module !== ref.module || old.member !== ref.member) {
        refs.set(name, ref);
        changed = true;
      }
    };
    walk(tree, (node) => {
      if (ts.isImportDeclaration(node) && node.importClause) {
        const spec = plainString(node.moduleSpecifier);
        const module = spec !== null ? moduleName(spec) : null;
        if (spec !== null && module && (module.kind === "builtin" || module.kind === "package") && TRACKED_MODULES.has(module.name)) {
          const whole: ModuleRef = { module: module.name, member: null, spec: moduleLabel(spec, module) };
          const { name, namedBindings } = node.importClause;
          if (name) bind(name.text, whole);
          if (namedBindings && ts.isNamespaceImport(namedBindings)) bind(namedBindings.name.text, whole);
          if (namedBindings && ts.isNamedImports(namedBindings)) {
            for (const element of namedBindings.elements) {
              const imported = (element.propertyName ?? element.name).text;
              bind(element.name.text, imported === "default" ? whole : { ...whole, member: imported });
            }
          }
        }
      }
      if (ts.isImportEqualsDeclaration(node) && ts.isExternalModuleReference(node.moduleReference)) {
        const spec = plainString(node.moduleReference.expression);
        const module = spec !== null ? moduleName(spec) : null;
        if (spec !== null && module && (module.kind === "builtin" || module.kind === "package") && TRACKED_MODULES.has(module.name)) {
          bind(node.name.text, { module: module.name, member: null, spec: moduleLabel(spec, module) });
        }
      }
      if (ts.isVariableDeclaration(node) && node.initializer) {
        if (ts.isIdentifier(node.name) && isSession(node.initializer) && !sessionLocals.has(node.name.text)) {
          sessionLocals.add(node.name.text);
          changed = true;
        }
        const ref = resolve(node.initializer);
        if (ref) {
          if (ts.isIdentifier(node.name)) bind(node.name.text, ref);
          else if (ts.isObjectBindingPattern(node.name) && ref.member === null) {
            for (const element of node.name.elements) {
              if (!ts.isIdentifier(element.name)) continue;
              const key = element.propertyName ? (ts.isIdentifier(element.propertyName) || ts.isStringLiteral(element.propertyName) ? element.propertyName.text : null) : element.name.text;
              if (element.dotDotDotToken) bind(element.name.text, ref);
              else if (key !== null) bind(element.name.text, { ...ref, member: key });
            }
          }
        }
      }
      if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.EqualsToken && ts.isIdentifier(node.left)) {
        const ref = resolve(node.right);
        if (ref) bind(node.left.text, ref);
      }
    });
  }

  /** Whether `node` is one step inside a longer expression that stands for the same thing: `(x)`, `x as T`, `await x`, `x.default`. The outer one is the one judged. */
  const isStep = (node: ts.Node, ref: ModuleRef): boolean => {
    const parent = node.parent;
    if (
      (ts.isParenthesizedExpression(parent) ||
        ts.isAsExpression(parent) ||
        ts.isNonNullExpression(parent) ||
        ts.isTypeAssertionExpression(parent) ||
        ts.isSatisfiesExpression(parent) ||
        ts.isAwaitExpression(parent)) &&
      parent.expression === node
    ) {
      return true;
    }
    return (ts.isPropertyAccessExpression(parent) || ts.isElementAccessExpression(parent)) && parent.expression === node && ref.member === null && nameOf(parent) === "default";
  };

  /** How a call into a per-call module names what it starts or opens: a program as written (a literal, or `process.execPath`), anything else flagged. */
  const argumentText = (member: string, first: ts.Expression | undefined): string => {
    if (!first) return "";
    if (!PROGRAM_STARTERS.has(member)) return text(first);
    // Not cut short: two different long commands must not read alike.
    if (plainString(first) !== null) return tidy(first.getText(), 400);
    const inner = unwrap(first);
    if (ts.isPropertyAccessExpression(inner) && ts.isIdentifier(inner.expression) && inner.expression.text === "process" && inner.name.text === "execPath") return "process.execPath";
    return `${text(first)} (program not a string literal)`;
  };

  /**
   * Judges a use of node's `net` or `child_process`: a call (or `new`) of one of their functions is
   * named one at a time (`child_process.spawn("python"`, `net.createServer(`) and must be listed;
   * anything else done with them (handed on, returned, called through .call, re-exported) is refused as
   * "used as a value". Holding one under another name (`const run = spawn`) is followed, not refused.
   */
  const judgeModuleUse = (node: ts.Expression) => {
    const ref = resolve(node);
    if (!ref || !PER_CALL_MODULES.has(ref.module)) return;
    if (ts.isIdentifier(node) && !isUse(node)) return;
    if (inTypeOnlyPosition(node) || isStep(node, ref)) return;
    const parent = node.parent;
    if ((ts.isCallExpression(parent) || ts.isNewExpression(parent)) && parent.expression === node && ref.member !== null) {
      const first = parent.arguments?.[0];
      refuse(`${ts.isNewExpression(parent) ? "new " : ""}${ref.module}.${ref.member}(${argumentText(ref.member, first)}`);
      return;
    }
    // `net.createServer` inside `net.createServer()`: the longer expression is judged on its own.
    if ((ts.isPropertyAccessExpression(parent) || ts.isElementAccessExpression(parent)) && parent.expression === node && resolve(parent) !== null) return;
    // `const run = spawn`, `const { Socket } = net`, `x = require("node:net")`: held under another name, followed above.
    if (ts.isVariableDeclaration(parent) && parent.initializer === node && isFollowable(parent.name)) return;
    if (ts.isBinaryExpression(parent) && parent.operatorToken.kind === ts.SyntaxKind.EqualsToken && parent.right === node && ts.isIdentifier(parent.left)) return;
    refuse(ref.member !== null ? `${ref.module}.${ref.member} (used as a value)` : `package "${ref.spec}" (used as a value)`);
  };

  /** The modules the file loads by a plain name, each listed once (as the allow-list lists them). */
  const modules = new Set<string>();
  const load = (how: string, argument: ts.Expression | undefined) => {
    if (!argument) return;
    const name = plainString(argument);
    if (name !== null) modules.add(name);
    else refuse(`${how}(${text(argument)} (package name not a plain string)`);
  };
  /** Something electron offers that reaches out on its own (`net`, `autoUpdater`), however it is reached. */
  const electronMember = (name: string) => {
    const label = ELECTRON_REFUSED.get(name);
    if (label) refuse(label);
  };
  const electronElements = (elements: readonly (ts.ImportSpecifier | ts.ExportSpecifier)[]) => {
    for (const element of elements) electronMember((element.propertyName ?? element.name).text);
  };

  walk(tree, (node) => {
    // --- Modules: import … from "x", export … from "x", import x = require("x"), import("x"), require("x") and the like.
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
      const spec = plainString(node.moduleSpecifier);
      if (spec !== null) modules.add(spec);
      const module = spec !== null ? moduleName(spec) : null;
      if (spec !== null && module && (module.kind === "builtin" || module.kind === "package")) {
        if (module.name === "electron") {
          if (ts.isImportDeclaration(node)) {
            const named = node.importClause?.namedBindings;
            if (named && ts.isNamedImports(named)) electronElements(named.elements);
          } else if (node.exportClause && ts.isNamedExports(node.exportClause)) {
            electronElements(node.exportClause.elements);
            // `export { crashReporter } from "electron"` hands it on to files that read it as ordinary code.
            if (node.exportClause.elements.some((el) => (el.propertyName ?? el.name).text === "crashReporter")) refuse("crashReporter (used as a value)");
          }
        }
        // `export { spawn } from "node:child_process"` would hand the function to files the scan reads as ordinary code.
        if (ts.isExportDeclaration(node) && PER_CALL_MODULES.has(module.name)) refuse(`package "${moduleLabel(spec, module)}" (re-exported)`);
      }
    }
    if (ts.isImportEqualsDeclaration(node) && ts.isExternalModuleReference(node.moduleReference)) load("require", node.moduleReference.expression);
    if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument) && ts.isStringLiteral(node.argument.literal)) modules.add(node.argument.literal.text);

    // --- Node's net and child_process, followed through the names the file gives them.
    if (
      ts.isIdentifier(node) ||
      ts.isPropertyAccessExpression(node) ||
      ts.isElementAccessExpression(node) ||
      ts.isCallExpression(node) ||
      ts.isAwaitExpression(node) ||
      ts.isParenthesizedExpression(node) ||
      ts.isAsExpression(node) ||
      ts.isNonNullExpression(node) ||
      ts.isTypeAssertionExpression(node) ||
      ts.isSatisfiesExpression(node)
    ) {
      judgeModuleUse(node);
      judgeCrashReporter(node);
    }

    if (ts.isCallExpression(node)) {
      const loads = loading(node, requireNames);
      if (loads) load(loads.how, loads.argument);

      const callee = node.expression;
      const [first, second] = node.arguments;
      const calleeName = ts.isIdentifier(callee) || ts.isPropertyAccessExpression(callee) ? nameOf(callee) : null;
      const onSession = (ts.isPropertyAccessExpression(callee) || ts.isElementAccessExpression(callee)) && isSession(callee.expression);
      // fetch(address), x.fetch(address), sendBeacon(address, data), and a wrapper the allow-list names: the address is the first argument.
      if (calleeName !== null && ADDRESS_CALLS.includes(calleeName)) {
        // session.fetch(…) is electron's own request from the main process: named below, never "relative".
        if (!onSession) callAt(calleeName, first);
      } else if (ts.isIdentifier(callee) && isWrapperName(callee.text)) {
        callAt(callee.text, first);
      } else if ((ts.isPropertyAccessExpression(callee) || ts.isElementAccessExpression(callee)) && isWrapperProperty(callee)) {
        // agree.postJson(…), agree["postJson"](…): the helper reached through a namespace or any other object.
        callAt(tidy(callee.getText()), first);
      }

      // `owner.method(…)`: the method's name, and the name of what it is called on.
      const member = ts.isPropertyAccessExpression(callee) || ts.isElementAccessExpression(callee) ? callee : null;
      const method = member ? nameOf(member) : null;
      const owner = member ? nameOf(unwrap(member.expression)) : null;
      // xhr.open("GET", address): the address is the second argument. Only in a file that uses
      // XMLHttpRequest, so window.open(url) (a link the person clicks) isn't read as a request.
      if (usesXhr && method === "open" && node.arguments.length >= 2) callAt("XMLHttpRequest.open", second);
      // https.get(…), tls.connect(…): raw network calls never count as "relative" (a literal there is a
      // socket path or a host, not this app's own server). `net.connect` is named by the per-call
      // rule above when `net` is a name the scan can follow; this catches the bare word.
      if (method !== null && owner !== null && NODE_REQUEST_METHODS.has(method) && NODE_REQUEST_MODULES.has(owner)) {
        const followed = member ? resolve(member) : null;
        if (!(followed && PER_CALL_MODULES.has(followed.module))) refuse(`${owner}.${method}(${text(first)}`);
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

    // --- new WebSocket(address), new globalThis.EventSource(address), new globalThis["WebSocket"](address);
    // WebRTC is refused whatever it is given.
    if (ts.isNewExpression(node)) {
      const name = nameOf(unwrap(node.expression));
      if (name !== null && ADDRESS_CONSTRUCTORS.includes(name)) callAt(`new ${name}`, node.arguments?.[0]);
      else if (name !== null && WEBRTC_CONSTRUCTORS.includes(name)) refuse(`new ${name}(${text(node.arguments?.[0])}`);
    }

    // --- Things looked up on an object: `x.loadURL(…)`, `session.fetch(…)`, `agree.postJson`, `electron.net`.
    if (ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node)) {
      const name = nameOf(node);
      const called = isCalledOrConstructed(node);
      const args = called ? (node.parent as ts.CallExpression | ts.NewExpression).arguments : undefined;
      // Electron's loaders take an address or a file from any object they are called on: each call is named and listed.
      if (name !== null && ELECTRON_LOADERS.has(name)) refuse(called ? `${name}(${text(args?.[0])}` : `${name} (used as a value)`);
      // session.fetch / session.defaultSession.fetch: electron's own request from the main process. Called or not, never "relative".
      if (name === "fetch" && isSession(node.expression)) refuse(called ? `session.fetch(${text(args?.[0])}` : "session.fetch (used as a value)");
      // session.preconnect(…) opens connections to an address; session.resolveHost(…) looks a host name up
      // with the DNS server. Both are main-process calls the page's policy doesn't govern: each is named and listed.
      if ((name === "preconnect" || name === "resolveHost") && isSession(node.expression)) {
        refuse(called ? `session.${name}(${text(args?.[0])}` : `session.${name} (used as a value)`);
      }
      // crashReporter.start(…) sends crash dumps to the address it is given. Called or not, one at a time.
      if (name === "start" && isCrashReporter(node.expression)) refuse(called ? `crashReporter.start(${text(args?.[0])}` : "crashReporter.start (used as a value)");
      // A wrapper helper handed on, or reached through an object and then not called.
      if (isWrapperProperty(node) && !called) refuse(`${text(node)} (used as a value)`);
      // electron.net, electron["autoUpdater"]
      if (name !== null && ELECTRON_REFUSED.has(name) && isElectron(node.expression)) electronMember(name);
    }

    // --- A name looked up by a string or by something that isn't one.
    if (ts.isElementAccessExpression(node)) {
      const key = plainString(node.argumentExpression);
      const object = unwrap(node.expression);
      const constructed = ts.isNewExpression(node.parent) && node.parent.expression === node;
      // globalThis["fetch"]: named by a string, which the call rules can't read the address of.
      // (`new globalThis["WebSocket"](address)` is read as a constructor above.)
      if (key !== null && NETWORK_NAMES.includes(key) && !(constructed && CONSTRUCTORS.includes(key))) refuse(byName(key));
      const reached = isGlobalObject(object, false) || isElectron(object) || (ts.isIdentifier(object) && object.text === "process");
      // globalThis[k], globalThis["fe" + "tch"]: whatever the key is, the scan can't say it isn't fetch. (A number can't be.)
      if (reached && key === null && !ts.isNumericLiteral(unwrap(node.argumentExpression))) {
        refuse(`${text(node.expression)}[${text(node.argumentExpression)}] (key not a plain string)`);
      }
    }

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
        // const { net } = require("electron"), const { autoUpdater } = electron
        if ((ts.isIdentifier(key) || ts.isStringLiteral(key)) && isElectron(from)) electronMember(key.text);
        // const { loadURL } = win.webContents: the loader taken off its object.
        if ((ts.isIdentifier(key) || ts.isStringLiteral(key)) && ELECTRON_LOADERS.has(key.text)) refuse(`${key.text} (used as a value)`);
        // const { preconnect } = session.defaultSession, const { start } = crashReporter: the method taken off its object.
        if ((ts.isIdentifier(key) || ts.isStringLiteral(key)) && ["preconnect", "resolveHost"].includes(key.text) && isSession(from)) refuse(`session.${key.text} (used as a value)`);
        if ((ts.isIdentifier(key) || ts.isStringLiteral(key)) && key.text === "start" && isCrashReporter(from)) refuse("crashReporter.start (used as a value)");
        // const { [k]: f } = globalThis
        if (node.propertyName && ts.isComputedPropertyName(node.propertyName) && plainString(node.propertyName.expression) === null && (isGlobalObject(from, false) || isElectron(from))) {
          refuse(`${text(from)}[${text(node.propertyName.expression)}] (key not a plain string)`);
        }
      }
    }

    // --- Names handed on without being called: `const send = fetch`, `{ fetch: custom }`, `window.fetch`,
    // `const { fetch } = globalThis`, `navigator.sendBeacon.bind(navigator)`; a wrapper helper under any of its names.
    if (ts.isIdentifier(node)) {
      if (NETWORK_NAMES.includes(node.text) && isHandedOn(node)) refuse(`${node.text} (used as a value)`);
      // `export { postJson as send }` is a new name for the helper (wrapperNamesAcross follows it); anything else that isn't a call is the helper handed on.
      if (isWrapperName(node.text) && isUse(node) && !isCalledOrConstructed(node) && !ts.isExportSpecifier(node.parent)) refuse(`${node.text} (used as a value)`);
    }
    // `export default postJson` and `export { postJson as default }` can't be followed: the importer chooses the name.
    if (ts.isExportAssignment(node) && !node.isExportEquals) {
      const inner = unwrap(node.expression);
      if (ts.isIdentifier(inner) && isWrapperName(inner.text)) refuse(`${inner.text} (exported as default)`);
    }
    if (ts.isExportSpecifier(node) && node.name.text === "default" && isWrapperName((node.propertyName ?? node.name).text)) {
      refuse(`${(node.propertyName ?? node.name).text} (exported as default)`);
    }
  });

  // Modules whose import is refused, by package: a subpath such as "@anthropic-ai/sdk/index" is the
  // package, and a file that imports several parts of one is listed for the package once.
  const refusedModules = new Set<string>();
  for (const spec of modules) {
    const module = moduleName(spec);
    if (module.kind === "address") refusedModules.add(`package "${tidy(spec)}"`);
    else if (module.kind === "builtin" && NETWORK_BUILTIN.test(module.name)) refusedModules.add(`package "${moduleLabel(spec, module)}"`);
    else if (module.kind === "package" && (NETWORK_PACKAGE.test(module.name) || refusedPackages.has(module.name))) refusedModules.add(`package "${moduleLabel(spec, module)}"`);
  }
  for (const label of refusedModules) refuse(label);
  return { calls: found, modules: [...modules] };
}
