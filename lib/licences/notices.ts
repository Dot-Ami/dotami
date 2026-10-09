import { readFileSync } from "node:fs";
import path from "node:path";

/**
 * Reads THIRD-PARTY-NOTICES.txt for the /licences page. The file is written when the app is built
 * (desktop/notices.mjs: `npm run build` puts it in the top folder, desktop/build.mjs puts it beside
 * the desktop app's server.js), so a copy that was never built has none and the page says so.
 *
 * The format is the one desktop/notices.mjs writes: a header, then one block per entry, each
 * starting after a line of 78 "=", with "Key: value" lines, a line of 78 "-", then the licence and
 * notice files word for word. tests/third-party-notices.spec.ts writes a real file and reads it back
 * through parseNotices, so the two can't drift apart.
 */

export const NOTICES_FILE = "THIRD-PARTY-NOTICES.txt";
const SEPARATOR = "=".repeat(78);
const RULE = "-".repeat(78);

export type NoticeKind = "runtime" | "package" | "inside" | "font";

export interface NoticeEntry {
  name: string;
  version: string;
  /** The licence the package names (an SPDX expression such as "MIT", usually). */
  licence: string;
  kind: NoticeKind;
  /** Where it ships, one line each. */
  shipsIn: string[];
  note: string | null;
  /** The licence and notice files, word for word, each headed "--- <file name> ---". */
  text: string;
}

export interface Notices {
  /** The file's opening lines (which version, which build, what the file is). */
  header: string;
  entries: NoticeEntry[];
}

const KINDS: readonly NoticeKind[] = ["runtime", "package", "inside", "font"];

/** Splits the file into its header and entries. Throws on a block that isn't in the expected shape. */
export function parseNotices(text: string): Notices {
  const blocks = text.replace(/\r\n?/g, "\n").split(`\n${SEPARATOR}\n`);
  const header = blocks.shift()!.trim();
  const entries = blocks.map((block, i) => {
    const ruleAt = block.indexOf(`\n${RULE}\n`);
    if (ruleAt < 0) throw new Error(`notices: entry ${i + 1} has no rule line`);
    const fields = block.slice(0, ruleAt).split("\n");
    const one = (key: string) => fields.find((f) => f.startsWith(`${key}: `))?.slice(key.length + 2) ?? null;
    const name = one("Name");
    const version = one("Version");
    const kind = one("Kind") as NoticeKind | null;
    if (!name || !version || !kind || !KINDS.includes(kind)) throw new Error(`notices: entry ${i + 1} is missing its name, version or kind`);
    return {
      name,
      version,
      licence: one("Licence") ?? "not stated",
      kind,
      shipsIn: fields.filter((f) => f.startsWith("Ships in: ")).map((f) => f.slice("Ships in: ".length)),
      note: one("Note"),
      text: block.slice(ruleAt + RULE.length + 2).trimEnd(),
    };
  });
  return { header, entries };
}

/**
 * The notices for the copy that is running, read from the folder the server runs in (the top folder
 * of a checkout, or the desktop app's server folder). "missing" when there is no file (a copy that
 * was never built); "unreadable" when it is there but not in the expected shape.
 */
export function readNotices(cwd: string = process.cwd()): Notices | "missing" | "unreadable" {
  let text: string;
  try {
    text = readFileSync(path.join(cwd, NOTICES_FILE), "utf8");
  } catch {
    return "missing";
  }
  try {
    return parseNotices(text);
  } catch {
    return "unreadable";
  }
}
