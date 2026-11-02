import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * docs/architecture/overview.md and docs/architecture/engines.md are where a new contributor is sent to learn
 * the folders, the routes and the catalog contract. Both drifted from the code and nothing failed: the
 * house-cleaning audit of 2026-10-31 found overview.md naming four folders and files that had gone
 * (lib/paths/v2026, the lib/cfe shim, components/exploration, components/lens-chat-panel.tsx). These tests read
 * every path the two pages name under lib/, components/, app/ or desktop/ and fail on one that isn't on disk.
 *
 * Where a path is read from:
 *   - a span in backticks (`lib/roads/evaluate-road.ts`; a line number after a colon is dropped);
 *   - a folder tree in a fenced block with no language, indented two spaces a level, so "lib/", then
 *     "  engines/", then "    cfe/v2026/" names lib/engines/cfe/v2026/ (a "# comment" after a name is ignored);
 *   - a path-like word inside any other fenced block (the mermaid map's "lib/brain").
 * A line that says deleted or removed is history, not a claim about today, and is skipped. Not "until": a
 * line like "PostgreSQL until 2026-09-28; today `lib/db/client.ts`" names a live path, and must stay checked
 * (the review of #233). A segment in
 * angle brackets or with a star (`lib/engines/<name>/v2026/`) stands for any folder there. A last segment with
 * no extension may name a module (`components/cockpit/cockpit-page` is cockpit-page.tsx). Names are matched
 * with their exact case, so a page that passes on Windows passes on CI's Linux too.
 *
 * Only these two pages: design notes elsewhere under docs/ name deleted paths on purpose, with dated notes.
 */

const PAGES = ["docs/architecture/overview.md", "docs/architecture/engines.md"] as const;
const ROOTS = ["lib", "components", "app", "desktop"];
const HISTORY = /\b(deleted|removed)\b/i;
const MODULE_EXTENSIONS = ["", ".ts", ".tsx", ".mts", ".mjs", ".cjs", ".js"];

interface Named {
  line: number;
  path: string;
}

function underARoot(p: string): boolean {
  return ROOTS.some((root) => p === root || p === `${root}/` || p.startsWith(`${root}/`));
}

/** Every path a page's text names, with the line it is on. */
function pathsIn(text: string): Named[] {
  const named: Named[] = [];
  let fence: string | null = null; // the open fenced block's language ("" for none), or null outside one
  let tree: { indent: number; path: string }[] = [];

  text.split(/\r?\n/).forEach((lineText, index) => {
    const line = index + 1;
    const opener = lineText.match(/^\s*```(.*)$/);
    if (opener) {
      if (fence === null) {
        fence = opener[1].trim();
        tree = [];
      } else {
        fence = null;
      }
      return;
    }
    const history = HISTORY.test(lineText);

    if (fence === null) {
      if (history) return;
      for (const m of lineText.matchAll(/`([^`]+)`/g)) {
        const p = m[1].trim().replace(/:\d+(-\d+)?$/, "");
        if (underARoot(p)) named.push({ line, path: p });
      }
    } else if (fence === "") {
      // A folder tree: the stack holds the folders above this line, by their indent.
      const m = lineText.match(/^( *)([^\s#]+)/);
      if (!m) return;
      const indent = m[1].length;
      while (tree.length > 0 && tree[tree.length - 1].indent >= indent) tree.pop();
      const full = (tree.at(-1)?.path ?? "") + m[2];
      if (!history && underARoot(full)) named.push({ line, path: full });
      // A folder is kept on the stack even on a history line, so the lines under it keep their parent.
      if (m[2].endsWith("/")) tree.push({ indent, path: full });
    } else {
      if (history) return;
      for (const m of lineText.matchAll(
        /(?<![\w/.-])((?:lib|components|app|desktop)\/[\w\-./*<>]*)/g,
      )) {
        named.push({ line, path: m[1].replace(/\.+$/, "") });
      }
    }
  });
  return named;
}

const listing = new Map<string, string[]>();
/** A folder's entries, or none when it isn't a folder. Cached: the pages name the same folders often. */
function entries(dir: string): string[] {
  if (!listing.has(dir)) {
    let names: string[] = [];
    try {
      names = readdirSync(dir);
    } catch {
      names = [];
    }
    listing.set(dir, names);
  }
  return listing.get(dir)!;
}

function isPlaceholder(segment: string): boolean {
  return segment.includes("*") || /^<[^>]+>$/.test(segment);
}

function resolves(dir: string, segments: string[]): boolean {
  if (segments.length === 0) return true;
  const [head, ...rest] = segments;
  const here = entries(dir);
  if (isPlaceholder(head)) return here.some((name) => resolves(path.join(dir, name), rest));
  if (rest.length === 0) return MODULE_EXTENSIONS.some((ext) => here.includes(head + ext));
  return here.includes(head) && resolves(path.join(dir, head), rest);
}

/** Whether a path a page names is on disk, read from the repository's top folder. */
function onDisk(p: string): boolean {
  return resolves(process.cwd(), p.replace(/\/+$/, "").split("/").filter(Boolean));
}

describe("the path reader (it must be able to fail)", () => {
  const sample = [
    "Built: `lib/roads/evaluate-road.ts`, `lib/engines/shared/types.ts:118` and `components/cockpit/cockpit-page`.",
    "Deleted 2026-09-14: `lib/archetypes/`.",
    "PostgreSQL until 2026-09-28; today `lib/db/no-such-client.ts`.",
    "Every engine sits in `lib/engines/<name>/v2026/`. A made-up one: `lib/paths/v2026/`.",
    "```",
    "lib/",
    "  engines/",
    "    cfe/v2026/      # lifecycle nodes",
    "  cfe/              # a shim",
    "components/",
    "  lens-chat-panel.tsx",
    "```",
    "```mermaid",
    '  Brain["lib/brain (the rules)"] --> Gone["lib/exploration"]',
    "```",
  ].join("\n");
  const named = pathsIn(sample);

  it("reads spans, folder trees and other fenced blocks, skips deleted/removed lines, keeps until lines", () => {
    expect(named.map((n) => n.path)).toEqual([
      "lib/roads/evaluate-road.ts",
      "lib/engines/shared/types.ts",
      "components/cockpit/cockpit-page",
      "lib/db/no-such-client.ts",
      "lib/engines/<name>/v2026/",
      "lib/paths/v2026/",
      "lib/",
      "lib/engines/",
      "lib/engines/cfe/v2026/",
      "lib/cfe/",
      "components/",
      "components/lens-chat-panel.tsx",
      "lib/brain",
      "lib/exploration",
    ]);
  });

  it("finds what is on disk and refuses what isn't", () => {
    expect(named.filter((n) => !onDisk(n.path)).map((n) => n.path)).toEqual([
      "lib/db/no-such-client.ts",
      "lib/paths/v2026/",
      "lib/cfe/",
      "components/lens-chat-panel.tsx",
      "lib/exploration",
    ]);
    expect(onDisk("lib/engines/<name>/v1999/")).toBe(false);
    expect(onDisk("Lib/brain")).toBe(false);
  });
});

describe("docs/architecture names only paths that are on disk", () => {
  for (const page of PAGES) {
    const named = pathsIn(readFileSync(path.join(process.cwd(), page), "utf8"));

    it(`${page} names paths (a guard against the reader silently finding nothing)`, () => {
      expect(named.length).toBeGreaterThan(0);
    });

    it(`every path ${page} names is on disk`, () => {
      const missing = named
        .filter((n) => !onDisk(n.path))
        .map((n) => `${page}:${n.line} ${n.path}`);
      expect(
        missing,
        `these paths aren't on disk; fix the page, or say on the line when they were deleted`,
      ).toEqual([]);
    });
  }
});
