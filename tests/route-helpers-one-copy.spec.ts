/**
 * One copy of the thin route helpers (house-cleaning audit of 2026-10-31, item architecture-6).
 *
 * Every API route does the same few things before its own rule: count the request against a rate
 * limit, check that it came from DotAmi's own window when it must, read the JSON body through the
 * size and type guard, and turn a store error into an answer without logging the error itself. The
 * pieces underneath were already shared (lib/api/body-limit.ts, rate-limit.ts, log-error.ts), but
 * the wrappers around them were written again in each domain's http.ts and in nine routes by hand,
 * so a fix to the rate limit or the "own window only" check in one copy could miss the others.
 *
 * Since then the wrappers live once, in lib/api/route.ts. This test reads the domain http.ts files
 * and every route file and fails, naming the copies, if one comes back:
 *   (a) readBody, throttle, pageOnly and failure are defined only in lib/api/route.ts, and no other
 *       helper has their shape (an error-to-answer mapper, or the same-origin check);
 *   (b) nothing but lib/api/route.ts calls checkRateLimit or readJsonWithLimit itself;
 *   (c) no domain's http.ts imports or re-exports from another domain's http.ts.
 * What each helper answers is pinned by tests/route-answers-unchanged.spec.ts.
 */
import { existsSync } from "node:fs";
import path from "node:path";

import ts from "typescript";
import { describe, expect, it } from "vitest";

import { readSource, sourceFiles } from "./helpers/source-scan";

const SHARED = "lib/api/route.ts";
const DOMAIN_HTTP = sourceFiles(["lib"]).filter((file) => file.endsWith("/http.ts"));
const ROUTES = sourceFiles(["app/api"]).filter((file) => file.endsWith("/route.ts"));
const SCANNED = [
  ...DOMAIN_HTTP,
  ...ROUTES,
  ...(existsSync(path.join(process.cwd(), SHARED)) ? [SHARED] : []),
].sort();

/** The functions a route file exports for Next to call. Their own catch blocks keep their own words. */
const HANDLERS = new Set(["GET", "POST", "PUT", "PATCH", "DELETE"]);

interface Helper {
  file: string;
  name: string;
  body: ts.Node;
}

function parse(file: string, code: string = readSource(file)): ts.SourceFile {
  return ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
}

/** The top-level functions of a file: `function x() {}` and `const x = () => {}` alike. */
function helpersIn(file: string, source: ts.SourceFile = parse(file)): Helper[] {
  const found: Helper[] = [];
  for (const statement of source.statements) {
    if (ts.isFunctionDeclaration(statement) && statement.name && statement.body) {
      found.push({ file, name: statement.name.text, body: statement.body });
    }
    if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        const init = declaration.initializer;
        if (
          ts.isIdentifier(declaration.name) &&
          init &&
          (ts.isArrowFunction(init) || ts.isFunctionExpression(init))
        ) {
          found.push({ file, name: declaration.name.text, body: init.body });
        }
      }
    }
  }
  return found;
}

/** `node` and every node under it, depth first (an arrow function's body can be one expression). */
function nodesUnder(node: ts.Node): ts.Node[] {
  const all: ts.Node[] = [];
  const visit = (child: ts.Node) => {
    all.push(child);
    ts.forEachChild(child, visit);
  };
  visit(node);
  return all;
}

/**
 * An error-to-answer mapper: it asks `instanceof` of an error, answers with the error's own message,
 * and falls back to a 503. Five domain helpers and the settings route each had one.
 */
function isErrorMapper(body: ts.Node): boolean {
  const nodes = nodesUnder(body);
  return (
    nodes.some(
      (n) => ts.isBinaryExpression(n) && n.operatorToken.kind === ts.SyntaxKind.InstanceOfKeyword,
    ) &&
    nodes.some((n) => ts.isPropertyAccessExpression(n) && n.name.text === "message") &&
    nodes.some((n) => ts.isNumericLiteral(n) && n.text === "503")
  );
}

/** The "only DotAmi's own window" check: a comparison with "same-origin". */
function isPageCheck(body: ts.Node): boolean {
  return nodesUnder(body).some(
    (n) =>
      ts.isBinaryExpression(n) &&
      (n.operatorToken.kind === ts.SyntaxKind.EqualsEqualsEqualsToken ||
        n.operatorToken.kind === ts.SyntaxKind.EqualsEqualsToken) &&
      [n.left, n.right].some((side) => ts.isStringLiteral(side) && side.text === "same-origin"),
  );
}

/** "file: name" for every call to `name(...)` in the file. */
function callsTo(name: string, file: string, source: ts.SourceFile = parse(file)): string[] {
  return nodesUnder(source)
    .filter(
      (n) => ts.isCallExpression(n) && ts.isIdentifier(n.expression) && n.expression.text === name,
    )
    .map((n) => `${file}:${source.getLineAndCharacterOfPosition(n.getStart()).line + 1} ${name}(`);
}

/** The domain folder a lib/<domain>/http.ts belongs to, or null for any other module. */
function domainOf(specifier: string): string | null {
  return /^@\/lib\/([^/]+)\/http$/.exec(specifier)?.[1] ?? null;
}

const helpers = SCANNED.flatMap((file) => helpersIn(file));
const definedIn = (name: string) =>
  [...new Set(helpers.filter((h) => h.name === name).map((h) => h.file))].sort();

describe("the scan reads what it should", () => {
  it("finds the four domain http.ts files and the API routes", () => {
    for (const file of [
      "lib/expenses/http.ts",
      "lib/figures/http.ts",
      "lib/futures/http.ts",
      "lib/landscape/http.ts",
    ]) {
      expect(DOMAIN_HTTP).toContain(file);
    }
    expect(ROUTES.length).toBeGreaterThanOrEqual(40);
  });

  it("flags a mapper and a page check written out, and not a helper that hands its errors to failure()", () => {
    const sample = parse(
      "sample.ts",
      [
        `function mapper(route: string, error: unknown) {`,
        `  if (error instanceof Oops) return Response.json({ error: error.message }, { status: 400 });`,
        `  return Response.json({ error: "x" }, { status: 503 });`,
        `}`,
        `const page = (request: Request) => request.headers.get("sec-fetch-site") === "same-origin";`,
        `function handsOn(route: string, error: unknown) { return failure(route, error, [[Oops, 400]]); }`,
      ].join("\n"),
    );
    const found = helpersIn("sample.ts", sample);
    expect(found.filter((h) => isErrorMapper(h.body)).map((h) => h.name)).toEqual(["mapper"]);
    expect(found.filter((h) => isPageCheck(h.body)).map((h) => h.name)).toEqual(["page"]);
  });
});

describe("(a) the route helpers are defined once, in lib/api/route.ts", () => {
  it("readBody", () => {
    expect(definedIn("readBody")).toEqual([SHARED]);
  });

  it("throttle", () => {
    expect(definedIn("throttle")).toEqual([SHARED]);
  });

  it("pageOnly", () => {
    expect(definedIn("pageOnly")).toEqual([SHARED]);
  });

  it("failure", () => {
    expect(definedIn("failure")).toEqual([SHARED]);
  });

  it("no other helper checks for same-origin itself", () => {
    const copies = helpers
      .filter((h) => h.file !== SHARED && isPageCheck(h.body))
      .map((h) => `${h.file}: ${h.name}`);
    expect(copies).toEqual([]);
  });

  it("no other helper maps an error to an answer itself (a route's own catch block keeps its own words)", () => {
    const copies = helpers
      .filter((h) => h.file !== SHARED && !HANDLERS.has(h.name) && isErrorMapper(h.body))
      .map((h) => `${h.file}: ${h.name}`);
    expect(copies).toEqual([]);
  });
});

describe("(b) every route goes through the helpers", () => {
  it("nothing but lib/api/route.ts calls checkRateLimit", () => {
    const calls = SCANNED.filter((file) => file !== SHARED).flatMap((file) =>
      callsTo("checkRateLimit", file),
    );
    expect(calls).toEqual([]);
  });

  it("nothing but lib/api/route.ts calls readJsonWithLimit", () => {
    const calls = SCANNED.filter((file) => file !== SHARED).flatMap((file) =>
      callsTo("readJsonWithLimit", file),
    );
    expect(calls).toEqual([]);
  });
});

describe("(c) a domain's http.ts reaches into no other domain's http.ts", () => {
  it("imports and re-exports from no other domain's http.ts", () => {
    const reaches = DOMAIN_HTTP.flatMap((file) => {
      const own = domainOf(`@/${file.replace(/\.ts$/, "")}`);
      return parse(file)
        .statements.filter(
          (s): s is ts.ImportDeclaration | ts.ExportDeclaration =>
            ts.isImportDeclaration(s) || ts.isExportDeclaration(s),
        )
        .map((s) =>
          s.moduleSpecifier && ts.isStringLiteral(s.moduleSpecifier)
            ? { s, specifier: s.moduleSpecifier.text }
            : null,
        )
        .filter(
          (x): x is { s: ts.ImportDeclaration | ts.ExportDeclaration; specifier: string } =>
            x !== null,
        )
        .filter(({ specifier }) => {
          const other = domainOf(specifier);
          return other !== null && other !== own;
        })
        .map(
          ({ s, specifier }) =>
            `${file}: ${ts.isExportDeclaration(s) ? "re-exports from" : "imports from"} ${specifier}`,
        );
    });
    expect(reaches).toEqual([]);
  });
});
