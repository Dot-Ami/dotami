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

/** Every .ts/.tsx file under the given folders (relative to the repo), as repo-relative paths with forward slashes. */
export function sourceFiles(folders: string[]): string[] {
  const found: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(path.join(ROOT, dir))) {
      if (name === "node_modules" || name === ".next") continue;
      const relative = `${dir}/${name}`;
      const full = path.join(ROOT, relative);
      if (statSync(full).isDirectory()) walk(relative);
      else if (/\.(ts|tsx)$/.test(name) && !name.endsWith(".d.ts")) found.push(relative);
    }
  };
  for (const folder of folders) walk(folder);
  return found.sort();
}

export function readSource(file: string): string {
  return readFileSync(path.join(ROOT, file), "utf8");
}

/**
 * The code with comments removed, and with the text inside quotes either kept or emptied.
 *
 * Comments go first so a sentence like "the journey lives in sessionStorage" doesn't count as code.
 * With `keepStrings` false every string becomes an empty pair of quotes (a template keeps its
 * `${…}` parts, which are code), so parentheses and words inside a message can't be mistaken for
 * code. Not a full parser: a quote character inside a regular expression would confuse it, which
 * the sanity checks in the tests that use it would show up as a scan that finds nothing.
 */
export function simplify(code: string, keepStrings: boolean): string {
  type Frame = { kind: "code"; braces: number } | { kind: "template" };
  const frames: Frame[] = [{ kind: "code", braces: 0 }];
  let out = "";
  let i = 0;
  const n = code.length;

  while (i < n) {
    const top = frames[frames.length - 1];
    const ch = code[i];
    const next = code[i + 1];

    if (top.kind === "template") {
      if (ch === "\\") {
        if (keepStrings) out += ch + (next ?? "");
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
        if (keepStrings) out += ch;
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
      out += ch + (keepStrings ? code.slice(i + 1, j) : "") + ch;
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
