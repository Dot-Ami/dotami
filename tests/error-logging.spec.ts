import { afterEach, describe, expect, it, vi } from "vitest";

import { describeError, logRouteError } from "@/lib/api/log-error";

import { updaterLogger } from "../desktop/log.mjs";

import {
  catchScopes,
  consoleCalls,
  errorWrites,
  logFileWrites,
  readSource,
  simplify,
  SOURCE_FILES,
  sourceFiles,
  streamWrites,
} from "./helpers/source-scan";

/**
 * Task 7 of [8d]: a route that fails writes the error's name and code to the log — never the
 * error. A database error can quote what was being written (a statement, an idea's name, a revenue
 * estimate), and the page /your-data tells the person what the log holds
 * (docs/architecture/figures-privacy-review.md, rule 2).
 */

// An error shaped like the ones Prisma throws, carrying invented personal values in its message.
const MARKER = "invented-marker-4417";
function databaseError(): Error {
  const error = new Error(`Invalid invocation: { data: { text: "${MARKER}", amountCents: 987654321 } }`);
  error.name = "PrismaClientKnownRequestError";
  (error as Error & { code: string }).code = "P2002";
  return error;
}

describe("describeError", () => {
  it("gives the error's name and code, and nothing from its message", () => {
    const summary = describeError(databaseError());
    expect(summary).toBe("PrismaClientKnownRequestError, P2002");
    expect(summary).not.toContain(MARKER);
    expect(summary).not.toContain("987654321");
  });

  it("copes with things that aren't errors, or have no usable code", () => {
    expect(describeError("a string")).toBe("unknown, -");
    expect(describeError(null)).toBe("unknown, -");
    expect(describeError(undefined)).toBe("unknown, -");
    expect(describeError({ code: 42 })).toBe("unknown, -");
    expect(describeError(new TypeError("no code"))).toBe("TypeError, -");
  });
});

describe("logRouteError", () => {
  afterEach(() => vi.restoreAllMocks());

  it("writes one line of plain text — not the error object — with no part of the message in it", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    logRouteError("scenario/save", databaseError());

    expect(spy).toHaveBeenCalledTimes(1);
    const args = spy.mock.calls[0];
    expect(args).toHaveLength(1);
    expect(typeof args[0]).toBe("string");
    expect(args[0]).toBe("[scenario/save] failed (PrismaClientKnownRequestError, P2002)");
    expect(String(args[0])).not.toContain(MARKER);
  });
});

/** The writes to the log in these files that pass an error (or something from one), as "file: call". */
function errorWritesIn(sources: { file: string; code: string }[], options: { desktop?: boolean } = {}): string[] {
  return sources.flatMap(({ file, code }) => errorWrites(simplify(code, false), options).map((call) => `${file}: ${call}`));
}

describe("the scan that checks the routes", () => {
  const flagged = (src: string) => errorWrites(simplify(src, false)).length > 0;

  it("flags a console call that passes an error, and one that quotes its message", () => {
    expect(flagged(`try {} catch (error) { console.error("[x]", error); }`)).toBe(true);
    expect(flagged("try {} catch (error) { console.error(`[x] ${error.message}`); }")).toBe(true);
    expect(flagged(`try {} catch (e) { console.warn(e); }`)).toBe(true);
    expect(flagged(`console.error("[x] failed (" + name + ", " + code + ")");`)).toBe(false);
    // Words inside a message aren't code.
    expect(flagged(`console.error("an error happened (really)");`)).toBe(false);
  });

  // Each of these writes a caught error to the log by a way the first version of the scan missed:
  // a stream write instead of console, or a catch variable with a name nobody had listed.
  const PROBES: [string, string, string][] = [
    [
      "a stream write of a caught error",
      `export async function save(data: unknown) {\n  try {\n    await store(data);\n  } catch (problem) {\n    process.stderr.write(String(problem) + "\\n");\n  }\n}`,
      "problem",
    ],
    [
      "a console call with a catch variable of any other name",
      `export async function save(data: unknown) {\n  try {\n    await store(data);\n  } catch (boom) {\n    console.error("[save] failed", boom);\n  }\n}`,
      "boom",
    ],
    ["a stdout write of the message", "try {} catch (failure) { process.stdout.write(`failed: ${failure.message}`); }", "failure"],
    ["a typed catch variable", `try {} catch (failure: unknown) { console.error(failure); }`, "failure"],
    ["a destructured catch variable", `try {} catch ({ message: why }) { console.log(why); }`, "why"],
    ["a promise's catch handler", `store().catch((oops) => console.warn("[save]", oops));`, "oops"],
    ["a promise's catch handler without brackets", `store().catch(oops => { console.log(oops); });`, "oops"],
    ["a stream write of an error held under a usual name", "process.stdout.write(`failed: ${err}`);", "err"],
    // A rejection handler is named by the second argument of .then(), not only by .catch().
    ["a rejection handler passed as .then's second argument", `store().then(ok, (boom) => console.error(boom));`, "boom"],
    ["a rejection handler written as a function", `store().then(ok, function (boom) { console.log("[save]", boom); });`, "boom"],
    ["a rejection handler on a .then that spans lines", `store().then(\n  (saved) => keep(saved),\n  async (boom: unknown) => {\n    console.warn("[save]", boom);\n  },\n);`, "boom"],
    // A console method looked up by name, or reached through an optional chain.
    ["a console method looked up by name", `try {} catch (boom) { console["error"](boom); }`, "boom"],
    ["a console method looked up by a variable", `try {} catch (boom) { console[level](boom); }`, "boom"],
    ["a console call through an optional chain", `try {} catch (boom) { console?.error(boom); }`, "boom"],
    ["a console method called with an optional call", `try {} catch (boom) { console.error?.(boom); }`, "boom"],
    // A stream (or a console method) held under another name, so the write doesn't say `process.stderr`.
    [
      "a stream destructured out of process",
      `const { stderr } = process;\nexport function save() {\n  try {} catch (boom) {\n    stderr.write(String(boom));\n  }\n}`,
      "boom",
    ],
    [
      "a stream destructured out of process under another name",
      `const { stdout: out, stderr: oops } = process;\ntry {} catch (boom) { oops.write(\`failed: \${boom}\`); }`,
      "boom",
    ],
    ["a stream held in a variable", `const out = process.stderr;\ntry {} catch (boom) { out.write(String(boom)); }`, "boom"],
    ["a stream looked up by name", `try {} catch (boom) { process["stderr"].write(String(boom)); }`, "boom"],
    ["a console method destructured out of console", `const { error: log } = console;\ntry {} catch (boom) { log(boom); }`, "boom"],
    ["a destructured stream written to with a usual name", `const { stderr } = process;\nstderr.write(String(err));`, "err"],
  ];

  it.each(PROBES)("flags %s", (_what, code, name) => {
    const writes = errorWrites(simplify(code, false));
    expect(writes.length).toBeGreaterThan(0);
    expect(writes.join("\n")).toContain(name);
  });

  it("flags the first two probes inside the real files too (the same scan the real check runs)", () => {
    const real = sourceFiles(["app", "lib", "components"]).map((file) => ({ file, code: readSource(file) }));
    const before = errorWritesIn(real);
    const after = errorWritesIn([
      ...real,
      { file: "lib/probe-one.ts", code: PROBES[0][1] },
      { file: "lib/probe-two.ts", code: PROBES[1][1] },
    ]);
    expect(after).toHaveLength(before.length + 2);
  });

  it("lets through writes that don't carry an error", () => {
    expect(flagged(`try {} catch (boom) { console.error("[save] failed"); }`)).toBe(false);
    expect(flagged(`try {} catch (boom) { logRouteError("save", boom); }`)).toBe(false);
    expect(flagged(`process.stdout.write("ready\\n");`)).toBe(false);
    // A name means the caught error only inside its own catch.
    expect(flagged(`const boom = 3; console.log(boom);`)).toBe(false);
    expect(flagged(`try {} catch (boom) { keep(boom); }\nconsole.log(boom);`)).toBe(false);
    // The same, for the other ways of writing to the log.
    expect(flagged(`store().then(ok, (boom) => console.error("[save] failed"));`)).toBe(false);
    expect(flagged(`store().then((result) => console.log(result), () => console.log("[save] failed"));`)).toBe(false);
    // .then's first argument is the success handler: what it names is a result, not an error.
    expect(flagged(`store().then((boom) => console.log(boom));`)).toBe(false);
    expect(flagged(`try {} catch (boom) { console["error"]("[save] failed"); }`)).toBe(false);
    expect(flagged(`const { stderr } = process;\nstderr.write("ready\\n");`)).toBe(false);
    expect(flagged(`const { stderr } = process;\ntry {} catch (boom) { stderr.write("[save] failed\\n"); }`)).toBe(false);
    // A stream or a name that process and console didn't hand over is not theirs.
    expect(flagged(`const stderr = makeStream();\ntry {} catch (boom) { stderr.write(String(boom)); }`)).toBe(false);
    expect(flagged(`const { error: log } = logger;\ntry {} catch (boom) { log(boom); }`)).toBe(false);
  });

  it("counts a console call or a stream write however it is spelled (the routes may use neither)", () => {
    const count = (src: string) => {
      const code = simplify(src, false);
      return { console: consoleCalls(code).length, streams: streamWrites(code).length };
    };
    expect(count(`console.log("x");`)).toEqual({ console: 1, streams: 0 });
    expect(count(`console["log"]("x");`)).toEqual({ console: 1, streams: 0 });
    expect(count(`console?.log("x");`)).toEqual({ console: 1, streams: 0 });
    expect(count(`const { warn } = console;\nwarn("x");`)).toEqual({ console: 1, streams: 0 });
    expect(count(`process.stdout.write("x");`)).toEqual({ console: 0, streams: 1 });
    expect(count(`const { stdout } = process;\nstdout.write("x");`)).toEqual({ console: 0, streams: 1 });
    expect(count(`const out = process.stderr;\nout.write("x");`)).toEqual({ console: 0, streams: 1 });
    expect(count(`process["stdout"].write("x");`)).toEqual({ console: 0, streams: 1 });
    expect(count(`const { stdout } = other;\nstdout.write("x");\nlogger.write("y");`)).toEqual({ console: 0, streams: 0 });
  });

  it("reads the names from the catch, so it finds the catch variables in the real routes", () => {
    const scopes = catchScopes(simplify(readSource("app/api/scenario/save/route.ts"), false));
    expect(scopes.length).toBeGreaterThan(0);
    expect(scopes.flatMap((c) => c.names)).toContain("error");
  });
});

// Routes that log something of their own are listed here with the reason it is safe. Everything
// else under app/api goes through logRouteError.
const OWN_LOGGING = new Map([
  [
    "app/api/law/provision/route.ts",
    "logs the exit code and the first 500 characters of a local statute lookup's own error text — a citation lookup, nothing the person typed",
  ],
]);

describe("no route logs an error object", () => {
  const routeFiles = sourceFiles(["app/api"]).filter((f) => f.endsWith("/route.ts"));

  it("finds the routes (a guard against the scan silently finding nothing)", () => {
    expect(routeFiles.length).toBeGreaterThanOrEqual(12);
    expect(routeFiles).toContain("app/api/scenario/save/route.ts");
  });

  it("uses logRouteError, never console or a stream write, in every route except the listed ones", () => {
    const offenders = routeFiles
      .filter((f) => !OWN_LOGGING.has(f))
      .filter((f) => {
        const code = simplify(readSource(f), false);
        return consoleCalls(code).length > 0 || streamWrites(code).length > 0;
      });
    expect(offenders, "log failures with logRouteError(route, error) from lib/api/log-error.ts").toEqual([]);
  });

  it("keeps the exception honest: the listed route still logs, and not an error", () => {
    for (const f of OWN_LOGGING.keys()) {
      const code = simplify(readSource(f), false);
      expect(consoleCalls(code).length, `${f} no longer logs; remove it from the list`).toBeGreaterThan(0);
      expect(errorWrites(code), `${f} now logs an error`).toEqual([]);
    }
  });

  it("no code in app/, lib/ or components/ writes an error (or its message) to the log, by console or by process.stdout/stderr", () => {
    const sources = sourceFiles(["app", "lib", "components"]).map((file) => ({ file, code: readSource(file) }));
    expect(errorWritesIn(sources)).toEqual([]);
  });

  it("the routes that used to log whole errors now use the helper", () => {
    for (const f of [
      "app/api/person/statements/route.ts",
      "app/api/scenario/save/route.ts",
      "app/api/ventures/route.ts",
      "app/api/ventures/[id]/route.ts",
      "app/api/ventures/[id]/links/route.ts",
      "app/api/readout/route.ts",
    ]) {
      expect(readSource(f), f).toContain("logRouteError(");
    }
  });
});

// The desktop app's own log, logs/server.log in the data folder (desktop/log.mjs), holds the same
// rule since 2026-10-12: a failure writes the error's name and code (describeError), never its
// message, which can name folders on the computer or quote what the code was given. Until then four
// lines in desktop/main.mjs (a failed update check, backup, refused restore and restore) wrote the
// whole error. The scan reads desktop/ with its log-file writes counted too ({ desktop: true }).

// The desktop code's writes that still name an error, each with why. One entry covers one write.
const DESKTOP_EXCEPTIONS: { file: string; call: string; why: string }[] = [
  {
    file: "desktop/main.mjs",
    call: "log.write(`${error}`)",
    why: "start(): a failed database update keeps the database's own words, which update failed and what it objected to (a table or a column), which is what fixing it needs; the privacy inventory's entry for the log says so",
  },
  {
    file: "desktop/main.mjs",
    call: "console.error(error)",
    why: "fail(): the main process's own console, seen only when DotAmi is started from a terminal; nothing writes it to the log file",
  },
];

describe("no desktop code writes an error to DotAmi's log, by any of its ways of writing there", () => {
  const files = sourceFiles(["desktop"], SOURCE_FILES);
  const sources = files.map((file) => ({ file, code: readSource(file) }));

  it("finds the desktop files and their writes to the log (a guard against the scan silently finding nothing)", () => {
    expect(files).toContain("desktop/main.mjs");
    expect(files.length).toBeGreaterThanOrEqual(20);
    const main = simplify(readSource("desktop/main.mjs"), false);
    expect(logFileWrites(main).length).toBeGreaterThanOrEqual(50);
  });

  it("flags a log-file write that passes an error, and lets through its name and code", () => {
    const flagged = (src: string) => errorWrites(simplify(src, false), { desktop: true }).length > 0;
    // The ways the desktop code writes to the log.
    expect(flagged("try {} catch (error) { log?.write(`[backup] failed: ${error}\\n`); }")).toBe(true);
    expect(flagged("try {} catch (error) { log.write(error.message); }")).toBe(true);
    expect(flagged("try {} catch (boom) { log(`[x] ${boom}`); }")).toBe(true);
    expect(flagged("const say = (line) => log.write(`[database] ${line}\\n`);\ntry {} catch (boom) { say(String(boom)); }")).toBe(true);
    // The ways it names an error without its message.
    expect(flagged("try {} catch (error) { log?.write(`[backup] failed (${describeError(error)})\\n`); }")).toBe(false);
    expect(flagged("try {} catch (error) { log(`[x] (${error?.code ?? error?.name ?? \"error\"})`); }")).toBe(false);
    expect(flagged("try {} catch (error) { say(`(${error instanceof Stopped ? error.kind : describeError(error)})`); }")).toBe(false);
    expect(flagged("log?.write(`[x] ${message}${error ? ` (${describeError(error)})` : \"\"}\\n`);")).toBe(false);
    // Read without { desktop: true }, as app/, lib/ and components/ are, a log-file write isn't one.
    expect(errorWrites(simplify("try {} catch (error) { log.write(`${error}`); }", false))).toEqual([]);
  });

  it("writes no error to the log anywhere in desktop/, except the listed ones", () => {
    const left = errorWritesIn(sources, { desktop: true });
    for (const { file, call } of DESKTOP_EXCEPTIONS) {
      const at = left.indexOf(`${file}: ${call}`);
      if (at >= 0) left.splice(at, 1);
    }
    expect(left, "write describeError(error) (desktop/log.mjs), not the error").toEqual([]);
  });

  it("keeps the exceptions honest: each listed write is still there", () => {
    const all = errorWritesIn(sources, { desktop: true });
    for (const { file, call } of DESKTOP_EXCEPTIONS) expect(all, `${file}: ${call} is gone; remove it from the list`).toContain(`${file}: ${call}`);
  });

  it("the update checker's own error report doesn't reach the log either", () => {
    // electron-updater hands its logger `Error: <stack>` for every failure; the stack names folders on
    // this computer. desktop/main.mjs gives it updaterLogger (desktop/log.mjs), tested below.
    const main = simplify(readSource("desktop/main.mjs"), false);
    expect(main).toMatch(/autoUpdater\.logger\s*=\s*updaterLogger\(/);
  });

  // 2026-10-12, review: the error channel wrote a fixed line, but electron-updater (6.8.9; 6.8.11 has the
  // same messages at the same lines, re-read 2026-10-30) also puts
  // an error's message or stack in its warn lines and in some info lines. These are its own messages,
  // copied from node_modules/electron-updater/out, with a made-up folder in the error.
  describe("updaterLogger: what electron-updater's messages leave in the log", () => {
    const FOLDER = "C:\\Users\\someone-4417\\AppData\\Roaming\\DotAmi";
    const ERR = `Error: EPERM: operation not permitted, open '${FOLDER}\\.updaterId'`;
    function written(channel: "info" | "warn" | "error" | "debug", message: string): string {
      const lines: string[] = [];
      updaterLogger((text) => lines.push(text))[channel](message);
      return lines.join("");
    }

    it.each([
      ["AppUpdater.js:202", "error", `Error: ${ERR}\n    at AppUpdater.getOrCreateStagingUserId (${FOLDER}\\app.asar\\x.js:1:1)`],
      ["AppUpdater.js:514", "warn", `Couldn't read staging user ID, creating a blank one: ${ERR}`],
      ["AppUpdater.js:523", "warn", `Couldn't write out staging user ID: ${ERR}`],
      ["AppUpdater.js:456", "warn", `Cannot dispatch error event: ${ERR}\n    at ${FOLDER}\\x.js:1:1`],
      ["NsisUpdater.js:135", "info", `Cannot run installer: error code: EACCES, error message: "spawn ${FOLDER}\\installer.exe EACCES", will be executed again using elevate if EACCES`],
      ["DownloadedUpdateHelper.js:102", "info", `No cached update info available (error on read: Unexpected token in JSON at ${FOLDER}\\update-info.json)`],
    ] as const)("%s (%s) leaves one fixed line, no folder", (_where, channel, message) => {
      const line = written(channel, message);
      expect(line).toMatch(/^\[update\] [^\n]+\n$/);
      expect(line).not.toContain("someone-4417");
      expect(line).not.toContain("EPERM");
    });

    it("an ordinary progress line is kept as it was given", () => {
      expect(written("info", "Checking for update")).toBe("[update] Checking for update\n");
      expect(written("debug", "anything")).toBe("");
    });
  });
});
