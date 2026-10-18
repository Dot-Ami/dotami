/**
 * Six named text sizes and no others (the maintainer's story S2.5.30d, 2026-10-17; docs/ui-spec/README.md,
 * "The type scale"). Until then the screens used twenty-three ad hoc sizes (`text-[11px]`, `text-[12.5px]`,
 * … in 661 places), and the clutter limit counted up to fifteen distinct sizes on one screen.
 *
 * The sizes are Tailwind theme tokens in app/globals.css (`--text-label` … `--text-display`, each with its
 * line height), used as `text-label` … `text-display`. This reads every source file under app/, components/
 * and lib/ and fails on any arbitrary text size written as a class (`text-[9px]`, `text-[0.7rem]`,
 * `text-[length:…]`), and on Tailwind's text-xs, text-sm, text-base and text-lg, which the named sizes
 * stand in for (body, lead, title), with the count, so a new one can't slip back in. Tailwind's text-xl and
 * up stay for headlines. A control plants each kind and checks it is found, and a second checks the tokens
 * are all defined and all in use.
 */
import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { readSource, simplify, sourceFiles, TS_FILES } from "./helpers/source-scan";

/** The six sizes, smallest first, as the theme names them. */
export const TEXT_SIZES = ["label", "small", "body", "lead", "title", "display"] as const;

/**
 * A text size that isn't one of the six: an arbitrary one written as a class (`text-[9px]`, `text-[9.5px]`,
 * `text-[0.7rem]`, `text-[length:12px]`, `text-[1.2em]`), or one of Tailwind's own that a named size stands
 * in for (`text-xs` is body, `text-sm` lead, `text-base` and `text-lg` title).
 */
const OTHER_SIZE = /(?<![\w-])text-(?:\[(?:length:)?\s*[\d.]+\s*(?:px|rem|em|pt|%|vw|vh|ch|ex)\s*\]|xs|sm|base|lg)(?![\w-])/g;

/** Every size in `code` that isn't a named one (comments left out: the theme's own comment names old ones). */
export function arbitrarySizes(code: string): string[] {
  return [...simplify(code, true).matchAll(OTHER_SIZE)].map((m) => m[0]);
}

const FOLDERS = ["app", "components", "lib"];

describe("the type scale: six named text sizes, no arbitrary ones", () => {
  it("no file under app/, components/ or lib/ writes an arbitrary text size", () => {
    const found: Record<string, string[]> = {};
    let total = 0;
    for (const file of sourceFiles(FOLDERS, TS_FILES)) {
      const sizes = arbitrarySizes(readSource(file));
      if (sizes.length > 0) {
        found[file] = sizes;
        total += sizes.length;
      }
    }
    const byValue = new Map<string, number>();
    for (const sizes of Object.values(found)) for (const size of sizes) byValue.set(size, (byValue.get(size) ?? 0) + 1);
    const report = [
      `${total} arbitrary text sizes in ${Object.keys(found).length} files, ${byValue.size} distinct: ${[...byValue]
        .sort((a, b) => b[1] - a[1])
        .map(([size, n]) => `${n}× ${size}`)
        .join(", ")}`,
      ...Object.entries(found).map(([file, sizes]) => `  ${file}: ${sizes.length}`),
    ].join("\n");
    expect(total, report).toBe(0);
  });

  it("control: finds each way of writing one, and leaves colours, comments, headline steps and the named sizes alone", () => {
    const planted = `
      // text-[9px] in a comment is not a class
      /* text-[11px] either */
      const a = "font-mono text-[9px] uppercase";
      const b = \`px-2 text-[12.5px] \${x}\`;
      const c = "text-[0.75rem] text-[1.2em] text-[length:13px] text-[ 10px ]";
      const d = "text-[#fff8ee] text-[var(--x)] text-label text-display text-xl text-2xl text-5xl lg:text-[46px]";
      const e = "text-xs md:text-sm text-base text-lg text-lgx text-sm/5 text-smoke";
    `;
    expect(arbitrarySizes(planted)).toEqual([
      "text-[9px]",
      "text-[12.5px]",
      "text-[0.75rem]",
      "text-[1.2em]",
      "text-[length:13px]",
      "text-[ 10px ]",
      "text-[46px]",
      "text-xs",
      "text-sm",
      "text-base",
      "text-lg",
      "text-sm",
    ]);
  });

  it("the theme defines the six sizes, each with a line height, and every one is in use", () => {
    const css = readFileSync(path.join(process.cwd(), "app", "globals.css"), "utf8");
    const code = sourceFiles(FOLDERS, TS_FILES)
      .map((file) => simplify(readSource(file), true))
      .join("\n");
    for (const size of TEXT_SIZES) {
      expect(css, `--text-${size} in app/globals.css`).toMatch(new RegExp(`^\\s*--text-${size}:\\s*[\\d.]+px;`, "m"));
      expect(css, `--text-${size}--line-height in app/globals.css`).toMatch(new RegExp(`^\\s*--text-${size}--line-height:\\s*[\\d.]+(?:px|rem);`, "m"));
      expect(code, `text-${size} used somewhere`).toMatch(new RegExp(`(?<![\\w-])text-${size}(?![\\w-])`));
    }
    // Smallest first, and nothing under 8.5 px (the smallest the clutter budgets allow on any screen).
    const px = TEXT_SIZES.map((size) => Number(css.match(new RegExp(`--text-${size}:\\s*([\\d.]+)px`))?.[1] ?? NaN));
    expect(px[0]).toBeGreaterThanOrEqual(8.5);
    expect([...px].sort((a, b) => a - b)).toEqual(px);
  });
});
