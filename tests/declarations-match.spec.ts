/**
 * The hand-written type declarations beside the desktop app's and the scripts' JavaScript modules say
 * the same names the modules export.
 *
 * `npm run typecheck` reads TypeScript only, so a test that imports `desktop/sqlite.mjs` is typed
 * against `desktop/sqlite.d.mts`, written by hand beside it, never against the module itself. If one of
 * the two gains, loses or renames an export and the other doesn't follow, the tests are typed against
 * something that isn't there (or miss something that is), and nothing said so. This reads both files'
 * syntax trees and compares the names each exports as a value: every name a `.d.mts` declares must be
 * exported by its `.mjs`, and the other way round. Type-only exports (interfaces, type aliases,
 * `export type`) have nothing to match in JavaScript and are left out. It compares names only, not the
 * types: the second half of that gap is `tsconfig.desktop.json`, which checks the modules themselves.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import ts from "typescript";
import { describe, expect, it } from "vitest";

const root = process.cwd();

/** The folders whose `.mjs` modules have hand-written `.d.mts` declarations beside them. */
const FOLDERS = ["desktop", "scripts", "scripts/lib"];

type Pair = { declarations: string; module: string };

/** Every `X.d.mts` in those folders with the `X.mjs` it describes (whether or not that file exists). */
function declarationPairs(): Pair[] {
  return FOLDERS.flatMap((folder) =>
    readdirSync(path.join(root, folder))
      .filter((name) => name.endsWith(".d.mts"))
      .sort()
      .map((name) => ({
        declarations: `${folder}/${name}`,
        module: `${folder}/${name.replace(/\.d\.mts$/, ".mjs")}`,
      })),
  );
}

const hasExportKeyword = (node: ts.Node) =>
  ts.canHaveModifiers(node) &&
  (ts.getModifiers(node) ?? []).some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
const hasDefaultKeyword = (node: ts.Node) =>
  ts.canHaveModifiers(node) &&
  (ts.getModifiers(node) ?? []).some((m) => m.kind === ts.SyntaxKind.DefaultKeyword);

/** The names a destructuring `export const { a, b: [c] } = …` binds. */
function boundNames(name: ts.BindingName): string[] {
  if (ts.isIdentifier(name)) return [name.text];
  return name.elements.flatMap((element) =>
    ts.isOmittedExpression(element) ? [] : boundNames(element.name),
  );
}

/**
 * The names a module exports as values: what `import { name } from "…"` can read from it when it runs
 * ("default" for a default export). Read from the syntax tree, so a comment or a string that looks like
 * an export is not one. `export * from "x"` can't be listed without reading "x", so it comes back as
 * the line itself, "* from x": a declaration file and its module then match only when both say it.
 */
function valueExports(text: string, fileName: string): string[] {
  const source = ts.createSourceFile(
    fileName,
    text,
    ts.ScriptTarget.Latest,
    true,
    fileName.endsWith(".mjs") ? ts.ScriptKind.JS : ts.ScriptKind.TS,
  );
  const names = new Set<string>();

  // Names declared in this file only as types, so a plain `export { Name }` of one is a type export.
  const typeOnlyLocals = new Set<string>();
  const valueLocals = new Set<string>();
  for (const statement of source.statements) {
    if (ts.isInterfaceDeclaration(statement) || ts.isTypeAliasDeclaration(statement))
      typeOnlyLocals.add(statement.name.text);
    else if (
      (ts.isFunctionDeclaration(statement) ||
        ts.isClassDeclaration(statement) ||
        ts.isEnumDeclaration(statement)) &&
      statement.name
    )
      valueLocals.add(statement.name.text);
    else if (ts.isVariableStatement(statement))
      statement.declarationList.declarations.forEach((d) =>
        boundNames(d.name).forEach((n) => valueLocals.add(n)),
      );
    else if (ts.isImportDeclaration(statement) && statement.importClause) {
      const clause = statement.importClause;
      const add = (name: string, typeOnly: boolean) =>
        (typeOnly ? typeOnlyLocals : valueLocals).add(name);
      if (clause.name) add(clause.name.text, clause.isTypeOnly);
      const bindings = clause.namedBindings;
      if (bindings && ts.isNamespaceImport(bindings)) add(bindings.name.text, clause.isTypeOnly);
      if (bindings && ts.isNamedImports(bindings))
        bindings.elements.forEach((e) => add(e.name.text, clause.isTypeOnly || e.isTypeOnly));
    }
  }
  const isTypeOnlyLocal = (name: string) => typeOnlyLocals.has(name) && !valueLocals.has(name);

  for (const statement of source.statements) {
    if (ts.isExportAssignment(statement)) {
      // `export default …` (and `export = …`, which a .d.mts shouldn't have, reported the same way).
      names.add("default");
    } else if (ts.isExportDeclaration(statement)) {
      if (statement.isTypeOnly) continue;
      const clause = statement.exportClause;
      const from =
        statement.moduleSpecifier && ts.isStringLiteral(statement.moduleSpecifier)
          ? statement.moduleSpecifier.text
          : null;
      if (!clause) names.add(`* from ${from}`);
      else if (ts.isNamespaceExport(clause)) names.add(clause.name.text);
      else
        for (const element of clause.elements) {
          if (element.isTypeOnly) continue;
          // `export { Name }` of a local interface or type alias exports a type, not a value.
          if (!from && isTypeOnlyLocal((element.propertyName ?? element.name).text)) continue;
          names.add(element.name.text);
        }
    } else if (hasExportKeyword(statement)) {
      if (ts.isInterfaceDeclaration(statement) || ts.isTypeAliasDeclaration(statement)) continue;
      if (hasDefaultKeyword(statement)) names.add("default");
      else if (ts.isVariableStatement(statement))
        statement.declarationList.declarations.forEach((d) =>
          boundNames(d.name).forEach((n) => names.add(n)),
        );
      else if (
        (ts.isFunctionDeclaration(statement) ||
          ts.isClassDeclaration(statement) ||
          ts.isEnumDeclaration(statement)) &&
        statement.name
      )
        names.add(statement.name.text);
      else if (ts.isModuleDeclaration(statement) && ts.isIdentifier(statement.name)) {
        // `export namespace N` is a value only when it holds one; a namespace of types alone is a type.
        const body = statement.body;
        const holdsAValue =
          !!body &&
          ts.isModuleBlock(body) &&
          body.statements.some(
            (s) => !ts.isInterfaceDeclaration(s) && !ts.isTypeAliasDeclaration(s),
          );
        if (holdsAValue) names.add(statement.name.text);
      } else {
        throw new Error(
          `${fileName}: an export this test doesn't know how to read: ${statement.getText(source).slice(0, 80)}`,
        );
      }
    }
  }
  return [...names].sort();
}

/** What differs between a declaration file and its module, one line per name, empty when they match. */
function mismatches(pair: Pair, declarationsText: string, moduleText: string): string[] {
  const declared = valueExports(declarationsText, pair.declarations);
  const exported = valueExports(moduleText, pair.module);
  return [
    ...declared
      .filter((name) => !exported.includes(name))
      .map(
        (name) => `${pair.declarations} declares "${name}", which ${pair.module} doesn't export`,
      ),
    ...exported
      .filter((name) => !declared.includes(name))
      .map(
        (name) => `${pair.module} exports "${name}", which ${pair.declarations} doesn't declare`,
      ),
  ];
}

const read = (file: string) => readFileSync(path.join(root, file), "utf8");

describe("every hand-written .d.mts declares exactly the names its .mjs exports", () => {
  const pairs = declarationPairs();

  it("finds the declaration files it is guarding (a moved folder can't pass by being empty)", () => {
    // 18 in desktop/ and 8 in scripts/ on 2026-10-31; more is fine, fewer means files went missing.
    expect(
      pairs.filter((p) => p.declarations.startsWith("desktop/")).length,
    ).toBeGreaterThanOrEqual(18);
    expect(
      pairs.filter((p) => p.declarations.startsWith("scripts/")).length,
    ).toBeGreaterThanOrEqual(8);
    expect(pairs.map((p) => p.declarations)).toContain("desktop/sqlite.d.mts");
  });

  it("every declaration file has its module beside it", () => {
    expect(
      pairs.filter((p) => !existsSync(path.join(root, p.module))).map((p) => p.declarations),
    ).toEqual([]);
  });

  it.each(
    pairs
      .filter((p) => existsSync(path.join(root, p.module)))
      .map((p) => [p.declarations, p] as const),
  )("%s", (_, pair) => {
    expect(mismatches(pair, read(pair.declarations), read(pair.module))).toEqual([]);
  });

  it("reads the kinds of export the files use", () => {
    // A positive check on real files, so a reader that quietly saw nothing couldn't pass the comparison.
    expect(valueExports(read("desktop/sqlite.mjs"), "desktop/sqlite.mjs")).toEqual(
      expect.arrayContaining([
        "useSqliteFrom",
        "keyPragma",
        "CannotOpenDatabase",
        "openDatabase",
        "FileNotReadable",
      ]),
    );
    // `export { A, B } from "…"` in a declaration file, and `export { A, B }` of imported names in the module.
    expect(valueExports(read("desktop/database-key.d.mts"), "desktop/database-key.d.mts")).toEqual(
      expect.arrayContaining([
        "KeyStoreNotSaved",
        "NoKeyStore",
        "DATABASE_KEY_FILE",
        "openDatabaseKey",
      ]),
    );
    expect(valueExports(read("desktop/database-key.mjs"), "desktop/database-key.mjs")).toEqual(
      expect.arrayContaining([
        "KeyStoreNotSaved",
        "NoKeyStore",
        "DATABASE_KEY_FILE",
        "openDatabaseKey",
      ]),
    );
    // Type-only exports are left out; overloads count once; comments and strings are not exports.
    const declarations = [
      `import type { Thing } from "./thing.mjs";`,
      `export type Shape = { a: number };`,
      `export interface Box { b: string }`,
      `export type { Thing };`,
      `export function pick(a: string): string;`,
      `export function pick(a: number): number;`,
      `export const LIMIT: number, NAME: string;`,
      `export class Failure extends Error {}`,
      `// export function commented(): void;`,
      `export const text: "export function inAString";`,
      `export default function main(): void;`,
    ].join("\n");
    expect(valueExports(declarations, "planted.d.mts")).toEqual([
      "Failure",
      "LIMIT",
      "NAME",
      "default",
      "pick",
      "text",
    ]);
    const module = [
      `import { a as renamed } from "./a.mjs";`,
      `export const { first, second: [third] } = { first: 1, second: [2] };`,
      `export async function load() {}`,
      `export { renamed as again };`,
      `export * from "./elsewhere.mjs";`,
      `export * as everything from "./elsewhere.mjs";`,
      `/** @typedef {{ a: number }} NotAnExport */`,
    ].join("\n");
    expect(valueExports(module, "planted.mjs")).toEqual([
      "* from ./elsewhere.mjs",
      "again",
      "everything",
      "first",
      "load",
      "third",
    ]);
  });

  it("names the difference when a declaration file and its module part (planted controls)", () => {
    const pair = { declarations: "desktop/sqlite.d.mts", module: "desktop/sqlite.mjs" };
    const declarations = read(pair.declarations);
    const module = read(pair.module);
    expect(mismatches(pair, declarations, module)).toEqual([]);
    // A declaration with nothing behind it: a test typed against it would compile and then fail to import.
    expect(
      mismatches(pair, `${declarations}\nexport function notInTheModule(): void;\n`, module),
    ).toEqual([
      'desktop/sqlite.d.mts declares "notInTheModule", which desktop/sqlite.mjs doesn\'t export',
    ]);
    // A renamed export in the module, with the declaration file left behind: both sides are named.
    expect(
      mismatches(
        pair,
        declarations,
        module.replace("export function useSqliteFrom(", "export function loadSqliteFrom("),
      ),
    ).toEqual([
      'desktop/sqlite.d.mts declares "useSqliteFrom", which desktop/sqlite.mjs doesn\'t export',
      'desktop/sqlite.mjs exports "loadSqliteFrom", which desktop/sqlite.d.mts doesn\'t declare',
    ]);
  });
});
