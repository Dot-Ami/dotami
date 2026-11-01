/**
 * Every sentence and label a screen shows comes from a words file (lib/<area>/words.ts), never from a component.
 * The rule is the maintainer's decision of 2026-10-11 that screens keep their words in one place. It was first
 * enforced for the cockpit (story S2.5.30e, 2026-10-17) and, since the house-cleaning audit of 2026-10-31, for
 * every file under components/. The words tests read the words files: the verdict words (tests/cockpit-screen.spec.ts
 * and the other words files' specs, and the last block below for the words files that took the other folders'
 * sentences on 2026-10-31) and the time words (tests/idea-invariants.spec.ts reads every words file under lib/).
 * Text written straight into a component is text those tests never see.
 *
 * tests/helpers/own-words.ts reads each file's syntax tree and names the text it wrote itself: JSX text, and
 * strings that read as a sentence or a label (the header there says what is left alone: class names, ids,
 * paths, what an Error is made with). This runs it over every file in components/ and fails on each piece
 * found, unless the allowance below names it with the reason. A control plants each kind and checks it is
 * caught, and that the things left alone stay left alone.
 *
 * Two lists let text stay in a component, and both can only shrink, like the clutter budgets
 * (tests/clutter-budgets.spec.ts): ALLOWED names single pieces with the reason, and NOT_MOVED_YET counts, file by
 * file, what was still written in a component on 2026-10-31 so the move can land folder by folder. An entry that
 * isn't on main's list fails, a count above main's fails, and so does an entry or a count the scan no longer
 * matches.
 */
import { execFileSync } from "node:child_process";
import { readdirSync, statSync } from "node:fs";
import path from "node:path";

import ts from "typescript";
import { describe, expect, it } from "vitest";

import { ownWords, readsAsWords, WORDS_FILES_FROM_COMPONENTS } from "./helpers/own-words";
import { readSource, sourceFiles } from "./helpers/source-scan";
import { findVerdicts, VERDICT_WORDS } from "./helpers/verdict-words";

/**
 * A piece of text a component may write itself, why, and since when. Each must still be found, or it is stale.
 * Nothing may be added here that isn't on main's list (see "the allowance only shrinks" below).
 */
const ALLOWED: readonly { file: string; text: string; since: string; why: string }[] = [
  {
    file: "components/cockpit/strategy-map.tsx",
    text: "Compass, not GPS — nothing here is a recommendation.",
    since: "2026-10-17",
    why: "The legend's last line. The strict word list the words file is checked against (VERDICT_WORDS, tests/cockpit-screen.spec.ts) refuses the word even in a denial, and the map's recordings in tests/fixtures/strategy-map/ hold the line word for word, so it waits in the component for the maintainer's other words (2026-10-17).",
  },
];

/**
 * How many pieces of text each file still wrote itself on 2026-10-31, when this test was widened from
 * components/cockpit/ to all of components/ (the house-cleaning audit's item architecture-5). A file's count must
 * match what the scan finds: more fails (put the new words in a words file), and fewer fails too (lower the count
 * here, so it can't creep back up). When a file's words have all moved, its row goes. Rows and counts may only go
 * down from main's (see "the counts only go down" below).
 */
const NOT_MOVED_YET: { since: string; pieces: Readonly<Record<string, number>> } = {
  since: "2026-10-31",
  pieces: {
    "components/discovery/intake-page.tsx": 68,
    "components/discovery/landing-page.tsx": 3,
    "components/front-door/income-agree-prompt.tsx": 1,
    "components/node-detail-panel.tsx": 25,
    "components/playbook-export-panel.tsx": 7,
    "components/shared/citation-links.tsx": 16,
    "components/shared/official-words.tsx": 1,
    "components/shared/person-statements.tsx": 13,
    "components/ui/or-divider.tsx": 1,
    "components/ui/section-card.tsx": 3,
    "components/ui/word-mark.tsx": 3,
    "components/your-data/delete-menu.tsx": 64,
    "components/your-data/figures-by-source.tsx": 12,
    "components/your-data/format.ts": 11,
    "components/your-data/your-data-page.tsx": 65,
  },
};

const FILES = sourceFiles(["components"], /\.(ts|tsx)$/);

/** Every piece of text written in a component that the allowance doesn't name, by file. */
function ownWordsByFile(): { found: Map<string, string[]>; used: Set<number> } {
  const found = new Map<string, string[]>();
  const used = new Set<number>();
  for (const file of FILES) {
    for (const own of ownWords(readSource(file), path.basename(file))) {
      const allowed = ALLOWED.findIndex((a) => a.file === file && a.text === own.text);
      if (allowed !== -1) {
        used.add(allowed);
        continue;
      }
      found.set(file, [...(found.get(file) ?? []), `${file}:${own.line} (${own.where}): ${JSON.stringify(own.text)}`]);
    }
  }
  return { found, used };
}

describe("no component writes words of its own", () => {
  it("scans every file in every folder of components/", () => {
    expect(FILES.length).toBeGreaterThan(70);
    // Every folder under components/ is read, and the files at its top.
    const folders = readdirSync(path.join(process.cwd(), "components")).filter((name) =>
      statSync(path.join(process.cwd(), "components", name)).isDirectory(),
    );
    expect(folders.length).toBeGreaterThanOrEqual(10);
    for (const folder of folders) expect(FILES.some((file) => file.startsWith(`components/${folder}/`)), folder).toBe(true);
    for (const file of [
      "components/cockpit/cockpit-page.tsx",
      "components/cockpit/strategy-map.tsx",
      "components/expenses/expenses-page.tsx",
      "components/licences/licences-page.tsx",
      "components/settings/settings-page.tsx",
      "components/ventures/ventures-page.tsx",
      "components/your-data/your-data-page.tsx",
      "components/node-detail-panel.tsx",
    ]) {
      expect(FILES).toContain(file);
    }
  });

  it("every sentence and label is in a words file, not in a component", () => {
    const { found, used } = ownWordsByFile();
    const counts = Object.fromEntries([...found].map(([file, pieces]) => [file, pieces.length]));
    const total = [...found.values()].reduce((sum, pieces) => sum + pieces.length, 0);
    expect(
      counts,
      `${total} pieces of text written in components/ instead of a words file, against the counts in NOT_MOVED_YET:\n${[...found.values()].flat().join("\n")}`,
    ).toEqual(NOT_MOVED_YET.pieces);
    // An allowance nothing uses any more is stale: take it out.
    expect(ALLOWED.filter((_, i) => !used.has(i))).toEqual([]);
  });

  it("the allowance only shrinks: nothing on it that isn't on main's", () => {
    const main = mainCommit();
    if (!main) {
      // No history to compare with (a copy without .git, or a clone too shallow). A pull request must always be
      // compared, so there this fails; anywhere else the stale check above still holds.
      expect(process.env.GITHUB_EVENT_NAME, "no main commit to compare the allowance with").not.toBe("pull_request");
      return;
    }
    const before = git("show", `${main}:tests/cockpit-own-words.spec.ts`);
    if (before === null) return;
    const onMain = allowedIn(before).map((a) => `${a.file}: ${a.text}`);
    expect(
      ALLOWED.map((a) => `${a.file}: ${a.text}`).filter((a) => !onMain.includes(a)),
      `allowed here but not on main (${main.slice(0, 7)}); move the words to a words file instead`,
    ).toEqual([]);
  });

  it("the counts only go down: no file, and no count, above main's", () => {
    const main = mainCommit();
    if (!main) {
      expect(process.env.GITHUB_EVENT_NAME, "no main commit to compare the counts with").not.toBe("pull_request");
      return;
    }
    const before = git("show", `${main}:tests/cockpit-own-words.spec.ts`);
    // Main has no counts yet (the pull request that adds them): the scan above is the whole limit.
    const onMain = before === null ? null : notMovedYetIn(before);
    if (onMain === null) return;
    expect(
      Object.entries(NOT_MOVED_YET.pieces)
        .filter(([file, n]) => onMain[file] === undefined || n > onMain[file])
        .map(([file, n]) => `${file}: ${n} > ${onMain[file] ?? 0}`),
      `counts above main's (${main.slice(0, 7)}); move the words to a words file instead of raising a count`,
    ).toEqual([]);
  });

  it("control: the allowance is read from a copy of this file, so an added entry would be seen", () => {
    const planted = `const ALLOWED: readonly { file: string; text: string }[] = [{ file: "components/a.tsx", text: "Save now", why: "x" }];`;
    expect(allowedIn(planted)).toEqual([{ file: "components/a.tsx", text: "Save now" }]);
    expect(allowedIn(readSource("tests/cockpit-own-words.spec.ts"))).toEqual(ALLOWED.map(({ file, text }) => ({ file, text })));
    // The counts too: read from a copy, so a row added or raised would be seen.
    expect(notMovedYetIn(`const NOT_MOVED_YET = { since: "2026-10-31", pieces: { "components/a.tsx": 3 } };`)).toEqual({ "components/a.tsx": 3 });
    expect(notMovedYetIn("const ALLOWED = [];")).toBeNull();
    expect(notMovedYetIn(readSource("tests/cockpit-own-words.spec.ts"))).toEqual(NOT_MOVED_YET.pieces);
  });

  it("control: catches each way a component can write words", () => {
    const planted = `
      "use client";
      import { cn } from "@/lib/utils/cn";
      const CHIP = { label: "done", className: "text-sage bg-sage/15" };
      const COLOURS = { green: "applies as answered" };
      type State = "idle" | "dirty";
      export function Planted({ what, busy }: { what: string; busy: boolean }) {
        const classes = cn("rounded-full border", what === "x" ? "px-2" : "px-4");
        const compared = what === "Not shown" || what !== "Never shown";
        if (!what) throw new Error("no venture to draw");
        return (
          <aside id="cockpit-rail" data-region="rail" aria-label="Venture details" className={\`flex \${classes}\`}>
            <p className="font-mono text-label uppercase">Venture</p>
            <span>· fork</span>
            <button type="button" title="Fold the rail">Export</button>
            <input placeholder="Month and year" value="" />
            <a href="/ventures">{"← Your futures"}</a>
            <i aria-hidden />
            <b aria-label={\`\${what}: \${what}, opens detail\`} />
            <u aria-label="done" />
            <em>{what ?? "Not set"}</em>
            <small>{"Saved · " + what}</small>
            {busy && "Unsaved changes…"}
            {busy || "Edits save automatically."}
            <code>{compared ? what : ""}</code>
            <q>“{what}”</q>
            {" "}
            <span>doesn&apos;t apply as answered</span>
          </aside>
        );
      }
    `;
    const found = ownWords(planted, "planted.tsx").map((own) => `${own.where}: ${own.text}`);
    expect(found).toEqual([
      "property label: done",
      "property green: applies as answered",
      "attribute aria-label: Venture details",
      "jsx text: Venture",
      "jsx text: · fork",
      "attribute title: Fold the rail",
      "jsx text: Export",
      "attribute placeholder: Month and year",
      "string: ← Your futures",
      "template: ${…}: ${…}, opens detail",
      "attribute aria-label: done",
      "string: Not set",
      "string: Saved ·",
      "string: Unsaved changes…",
      "string: Edits save automatically.",
      "jsx text: doesn&apos;t apply as answered",
    ]);
  });

  it("control: tells a sentence or a label from a token, a class string or a path", () => {
    for (const words of ["Save now", "Export", "Not set", "no rule yet", "doesn't apply", "Saving…", ", opens detail", "set aside by you.", "Compass, not GPS."]) {
      expect(readsAsWords(words), words).toBe(true);
    }
    for (const token of [
      "sole-prop",
      "step",
      "roadAhead",
      "whatIf",
      "CAD",
      "text-stone border border-rule",
      "hidden h-full md:block",
      "relative flex min-h-0 flex-col bg-ink4 md:overflow-y-auto",
      "/api/skill-marks",
      "@/lib/cockpit/words",
      "./folding",
      "https://example.test/page",
      "application/json",
      "2026-10-17",
      " · ",
      "",
    ]) {
      expect(readsAsWords(token), token).toBe(false);
    }
  });
});

/**
 * Every piece of text a words file holds, as a person could read it: each string, and each template with `${…}` in
 * its holes. Left out, as in tests/helpers/own-words.ts: module names, types, property names, and what a value is
 * compared with (`kind === "typed"`, `case "file":`), none of which is ever shown.
 */
function textsIn(source: string, file: string): { line: number; text: string }[] {
  const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const out: { line: number; text: string }[] = [];
  const shown = (node: ts.Node) => {
    const parent = node.parent;
    if (ts.isImportDeclaration(parent) || ts.isExportDeclaration(parent) || ts.isExternalModuleReference(parent)) return false;
    if (ts.isPropertyAssignment(parent) && parent.name === node) return false;
    if (ts.isElementAccessExpression(parent) && parent.argumentExpression === node) return false;
    if (ts.isCaseClause(parent)) return false;
    if (ts.isBinaryExpression(parent) && [ts.SyntaxKind.EqualsEqualsEqualsToken, ts.SyntaxKind.ExclamationEqualsEqualsToken, ts.SyntaxKind.EqualsEqualsToken, ts.SyntaxKind.ExclamationEqualsToken].includes(parent.operatorToken.kind)) {
      return false;
    }
    for (let up: ts.Node | undefined = parent; up && !ts.isSourceFile(up); up = up.parent) if (ts.isTypeNode(up)) return false;
    return true;
  };
  const line = (node: ts.Node) => tree.getLineAndCharacterOfPosition(node.getStart(tree)).line + 1;
  const visit = (node: ts.Node) => {
    if ((ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) && shown(node)) out.push({ line: line(node), text: node.text });
    else if (ts.isTemplateExpression(node) && shown(node)) {
      out.push({ line: line(node), text: [node.head.text, ...node.templateSpans.map((span) => span.literal.text)].join("${…}") });
    }
    ts.forEachChild(node, visit);
  };
  visit(tree);
  return out.filter(({ text }) => /[A-Za-z]/.test(text));
}

/** Each verdict a piece of text gives: a word on the strict list the words files are held to, or a phrase. */
const verdictsIn = (text: string) => [...(VERDICT_WORDS.exec(text) ? [`word “${VERDICT_WORDS.exec(text)![0]}”`] : []), ...findVerdicts(text)];

describe("the words files that took the components' sentences give no verdict", () => {
  // The other words files have their own verdict checks (tests/cockpit-screen.spec.ts, tests/front-door.spec.ts,
  // tests/landscape-words.spec.ts, tests/about-job.spec.ts); these had none, or didn't exist, until 2026-10-31.
  it("reads every string and template in each of those words files", () => {
    for (const file of WORDS_FILES_FROM_COMPONENTS) expect(textsIn(readSource(file), file).length, file).toBeGreaterThan(5);
  });

  it("no word or phrase on the verdict lists, in any of them", () => {
    const found = WORDS_FILES_FROM_COMPONENTS.flatMap((file) =>
      textsIn(readSource(file), file).flatMap(({ line, text }) => verdictsIn(text).map((v) => `${file}:${line}: ${v} in ${JSON.stringify(text)}`)),
    );
    expect(found).toEqual([]);
  });

  it("control: a verdict in a string, a template or a function's words is caught; keys, types and comparisons are not words", () => {
    const planted = `
      type Kind = "best" | "worse";
      export const plantedWords = {
        tick: "Tick what should go.",
        refund: (idea: string) => \`The refund is recommended for \${idea}.\`,
        count: (n: number) => \`\${n} records, top pick first\`,
        "best-key": "Saved.",
        quiet: (kind: string) => (kind === "ready" ? "Kept." : "Not kept."),
      } as const;
    `;
    expect(textsIn(planted, "planted.ts").flatMap(({ text }) => verdictsIn(text).map((v) => v.split(":")[0]))).toEqual([
      "word “should”",
      "word “recommended”",
      "recommended",
      "top pick",
    ]);
  });
});

/** The `file` and `text` of each entry in the ALLOWED list a copy of this spec holds, read from its syntax tree. */
function allowedIn(source: string): { file: string; text: string }[] {
  const tree = ts.createSourceFile("spec.ts", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const entries: { file: string; text: string }[] = [];
  const visit = (node: ts.Node) => {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === "ALLOWED" && node.initializer && ts.isArrayLiteralExpression(node.initializer)) {
      for (const element of node.initializer.elements) {
        if (!ts.isObjectLiteralExpression(element)) continue;
        const value = (name: string) => {
          const property = element.properties.find((p) => ts.isPropertyAssignment(p) && ts.isIdentifier(p.name) && p.name.text === name);
          return property && ts.isPropertyAssignment(property) && ts.isStringLiteralLike(property.initializer) ? property.initializer.text : "";
        };
        entries.push({ file: value("file"), text: value("text") });
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(tree);
  return entries;
}

/** The counts in the NOT_MOVED_YET a copy of this spec holds, read from its syntax tree; null when it has none. */
function notMovedYetIn(source: string): Record<string, number> | null {
  const tree = ts.createSourceFile("spec.ts", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  let counts: Record<string, number> | null = null;
  const visit = (node: ts.Node) => {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === "NOT_MOVED_YET" && node.initializer && ts.isObjectLiteralExpression(node.initializer)) {
      const found: Record<string, number> = {};
      const pieces = node.initializer.properties.find((p) => ts.isPropertyAssignment(p) && ts.isIdentifier(p.name) && p.name.text === "pieces");
      if (pieces && ts.isPropertyAssignment(pieces) && ts.isObjectLiteralExpression(pieces.initializer)) {
        for (const row of pieces.initializer.properties) {
          if (ts.isPropertyAssignment(row) && ts.isStringLiteral(row.name) && ts.isNumericLiteral(row.initializer)) found[row.name.text] = Number(row.initializer.text);
        }
      }
      counts = found;
    }
    ts.forEachChild(node, visit);
  };
  visit(tree);
  return counts;
}

/** Runs git in the checkout; null when it fails (no git, no such commit, no such file). */
function git(...args: string[]): string | null {
  try {
    return execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
  } catch {
    return null;
  }
}

/**
 * The commit to compare the lists with, found the way tests/clutter-budgets.spec.ts finds it: `OWN_WORDS_BASE` when
 * set (any commit; for trying the check by hand), on CI the checked-out commit's first parent (a pull request is
 * checked out merged into main), locally where the branch left main.
 */
function mainCommit(): string | null {
  const candidate =
    process.env.OWN_WORDS_BASE ||
    (process.env.GITHUB_ACTIONS === "true" ? "HEAD^1" : (git("merge-base", "HEAD", "origin/main") ?? git("merge-base", "HEAD", "main"))?.trim());
  if (!candidate) return null;
  return git("rev-parse", "--verify", "--quiet", `${candidate}^{commit}`)?.trim() || null;
}
