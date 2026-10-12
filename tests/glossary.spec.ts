import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * docs/glossary.md explains the short forms a person meets in DotAmi, each linked to its official
 * page. Whether an entry says only what its page says is checked by running scripts/check-quotes.mjs
 * on its quotes (that needs the network, so it isn't a unit test). These tests keep the parts that
 * can be read offline honest: the number of entries other files give, and that the short forms the
 * screens use are either explained or named in the page's list of what isn't explained yet.
 */

const repo = path.resolve(__dirname, "..");
const read = (file: string) => readFileSync(path.join(repo, file), "utf8");

const glossary = read("docs/glossary.md");

// Every entry is a "### " heading; the "## " headings are the groups.
const entries = [...glossary.matchAll(/^### (.+)$/gm)].map((match) => match[1]);

// The section that names what the page doesn't explain yet, up to the next "## " heading.
function notYetSection(): string {
  const start = glossary.indexOf("\n## Not explained here yet");
  if (start === -1) return "";
  const next = glossary.indexOf("\n## ", start + 1);
  return glossary.slice(start, next === -1 ? undefined : next);
}

// Short forms and terms that appear in the words of today's cards and road steps (found by a scan
// of the catalogs' prose on 2026-10-12). Each one needs an entry, or a line under "Not explained
// here yet" saying so, so the page's promise to explain the short forms on screen stays true.
const ON_SCREEN = [
  { term: "TD1", where: "lib/engines/roads/v2026/starting-any-business-ab.ts" },
  { term: "T4", where: "lib/engines/cfe/v2026/nodes.ts" },
  { term: "T5", where: "lib/engines/roads/v2026/starting-any-business-ab.ts" },
  { term: "Eligible dividend", where: "lib/engines/roads/v2026/starting-any-business-ab.ts" },
  { term: "GRIP", where: "lib/engines/cfe/v2026/nodes.ts" },
  { term: "LRIP", where: "lib/engines/cfe/v2026/nodes.ts" },
  { term: "RDTOH", where: "lib/engines/structure/v2026/ladder.ts" },
  { term: "Holdco", where: "lib/engines/structure/v2026/ladder.ts" },
  { term: "Opco", where: "lib/engines/structure/v2026/ladder.ts" },
];

describe("docs/glossary.md", () => {
  it("has entries", () => {
    expect(entries.length).toBeGreaterThan(0);
  });

  it("says how many entries it has the same way everywhere the number is given", () => {
    const changelog = read("CHANGELOG.md").match(
      /\*\*A plain-words glossary\*\*[^\n]*?(\d+) entries/,
    );
    const taskList = read("docs/task-list.md").match(
      /A plain-words glossary \(\[glossary\.md\][^)]*\) — [^:]*: (\d+) entries/,
    );
    expect(changelog?.[1], "CHANGELOG.md's glossary line gives no entry count").toBeDefined();
    expect(taskList?.[1], "docs/task-list.md's glossary line gives no entry count").toBeDefined();
    expect(Number(changelog?.[1])).toBe(entries.length);
    expect(Number(taskList?.[1])).toBe(entries.length);
  });

  it.each(ON_SCREEN)(
    "explains $term (used in $where), or names it as not explained yet",
    ({ term, where }) => {
      // The term must exist where the test says it does, so a reworded card retires its line here.
      const word = new RegExp(`\\b${term}\\b`, "i");
      expect(word.test(read(where)), `${term} is no longer in ${where}`).toBe(true);
      const hasEntry = entries.some((heading) => word.test(heading));
      const namedAsNotYet = word.test(notYetSection());
      expect(
        hasEntry || namedAsNotYet,
        `${term} has no entry and isn't under "Not explained here yet"`,
      ).toBe(true);
    },
  );
});
