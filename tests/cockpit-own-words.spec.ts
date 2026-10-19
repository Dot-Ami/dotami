/**
 * Every sentence and label the cockpit shows comes from lib/cockpit/words.ts (or another words file), never
 * from a component (the maintainer's story S2.5.30e, 2026-10-17; the decision of 2026-10-11 that new screens
 * keep their words in one place). The words tests read the words files: tests/cockpit-screen.spec.ts runs
 * every sentence there past the verdict words, tests/idea-invariants.spec.ts past the time words. Text
 * written straight into a component is text those tests never see.
 *
 * tests/helpers/own-words.ts reads each file's syntax tree and names the text it wrote itself: JSX text,
 * and strings that read as a sentence or a label (the header there says what is left alone: class names,
 * ids, paths, what an Error is made with). This runs it over every file in components/cockpit/ and fails on
 * each piece found, line by line, unless the allowance below names it with the reason. A control plants
 * each kind and checks it is caught, and that the things left alone stay left alone.
 */
import path from "node:path";

import { describe, expect, it } from "vitest";

import { ownWords, readsAsWords } from "./helpers/own-words";
import { readSource, sourceFiles } from "./helpers/source-scan";

/** A piece of text a cockpit component may write itself, and why. Each must still be found, or it is stale. */
const ALLOWED: readonly { file: string; text: string; why: string }[] = [
  {
    file: "components/cockpit/strategy-map.tsx",
    text: "Compass, not GPS — nothing here is a recommendation.",
    why: "The legend's last line. The strict word list the words file is checked against (VERDICT_WORDS, tests/cockpit-screen.spec.ts) refuses the word even in a denial, and the map's recordings in tests/fixtures/strategy-map/ hold the line word for word, so it waits in the component for the maintainer's other words (2026-10-17).",
  },
];

const FILES = sourceFiles(["components/cockpit"], /\.(ts|tsx)$/);

describe("the cockpit's components write no words of their own", () => {
  it("scans every file in components/cockpit/", () => {
    expect(FILES.length).toBeGreaterThan(20);
    expect(FILES).toContain("components/cockpit/cockpit-page.tsx");
    expect(FILES).toContain("components/cockpit/strategy-map.tsx");
  });

  it("every sentence and label is in a words file, not in a component", () => {
    const found: string[] = [];
    const used = new Set<number>();
    for (const file of FILES) {
      for (const own of ownWords(readSource(file), path.basename(file))) {
        const allowed = ALLOWED.findIndex((a) => a.file === file && a.text === own.text);
        if (allowed !== -1) {
          used.add(allowed);
          continue;
        }
        found.push(`${file}:${own.line} (${own.where}): ${JSON.stringify(own.text)}`);
      }
    }
    expect(found, `${found.length} pieces of text written in components/cockpit/ instead of lib/cockpit/words.ts`).toEqual([]);
    // An allowance nothing uses any more is stale: take it out.
    expect(ALLOWED.filter((_, i) => !used.has(i))).toEqual([]);
  });

  it("control: catches each way a component can write words", () => {
    const planted = `
      "use client";
      import { cn } from "@/lib/utils/cn";
      const CHIP = { label: "done", className: "text-sage bg-sage/15" };
      const COLOURS = { green: "applies as answered" };
      type State = "idle" | "dirty";
      export function Planted({ what }: { what: string }) {
        const classes = cn("rounded-full border", what === "x" ? "px-2" : "px-4");
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
            <code>{what}</code>
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
