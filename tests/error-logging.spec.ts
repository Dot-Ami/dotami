import { afterEach, describe, expect, it, vi } from "vitest";

import { describeError, logRouteError } from "@/lib/api/log-error";

import { consoleCalls, readSource, simplify, sourceFiles } from "./helpers/source-scan";

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

describe("the scan that checks the routes", () => {
  it("flags a console call that passes an error, and one that quotes its message", () => {
    const flagged = (src: string) =>
      consoleCalls(simplify(src, false)).some((c) => /\b(error|err|e)\b/.test(c.args));
    expect(flagged(`try {} catch (error) { console.error("[x]", error); }`)).toBe(true);
    expect(flagged("try {} catch (error) { console.error(`[x] ${error.message}`); }")).toBe(true);
    expect(flagged(`try {} catch (e) { console.warn(e); }`)).toBe(true);
    expect(flagged(`console.error("[x] failed (" + name + ", " + code + ")");`)).toBe(false);
    // Words inside a message aren't code.
    expect(flagged(`console.error("an error happened (really)");`)).toBe(false);
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

  it("uses logRouteError, never console, in every route except the listed ones", () => {
    const offenders = routeFiles
      .filter((f) => !OWN_LOGGING.has(f))
      .filter((f) => consoleCalls(simplify(readSource(f), false)).length > 0);
    expect(offenders, "log failures with logRouteError(route, error) from lib/api/log-error.ts").toEqual([]);
  });

  it("keeps the exception honest: the listed route still logs, and not an error", () => {
    for (const f of OWN_LOGGING.keys()) {
      const calls = consoleCalls(simplify(readSource(f), false));
      expect(calls.length, `${f} no longer logs; remove it from the list`).toBeGreaterThan(0);
      for (const c of calls) expect(c.args).not.toMatch(/\b(error|err|e)\b/);
    }
  });

  it("no code in app/, lib/ or components/ passes an error (or its message) to the console", () => {
    const offenders: string[] = [];
    for (const f of sourceFiles(["app", "lib", "components"])) {
      for (const c of consoleCalls(simplify(readSource(f), false))) {
        if (/\b(error|err|e|cause|exception)\b/.test(c.args)) offenders.push(`${f}: console.${c.method}(${c.args.trim()})`);
      }
    }
    expect(offenders).toEqual([]);
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
