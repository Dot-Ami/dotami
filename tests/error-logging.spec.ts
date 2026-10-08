import { afterEach, describe, expect, it, vi } from "vitest";

import { describeError, logRouteError } from "@/lib/api/log-error";

import { catchScopes, consoleCalls, errorWrites, readSource, simplify, sourceFiles, streamWrites } from "./helpers/source-scan";

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
function errorWritesIn(sources: { file: string; code: string }[]): string[] {
  return sources.flatMap(({ file, code }) => errorWrites(simplify(code, false)).map((call) => `${file}: ${call}`));
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
