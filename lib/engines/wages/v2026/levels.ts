import type { WageLevel } from "./types";

/**
 * The level tokens a Job Bank source code can carry, and what each says (research note 25s § 2;
 * docs/ui-spec/cockpit/about-this-job.md § 2). `ATL` is not one of them: it names the Atlantic provinces
 * together, which is none of these levels, so a code with only `ATL` reads as "level not stated", as the
 * screen's spec has it.
 */
const TOKENS: Readonly<Record<string, WageLevel>> = {
  CAN: "national",
  PR: "province",
  ER: "economic-region",
};

/** The source code of a row the government did not publish figures for. */
export const NOT_PUBLISHED = "N/A";

/**
 * The level a row's source code says, from the code alone: "LFS 2023-24 PR NOC5" is a province-wide figure
 * wherever the row sits, Calgary's region included. Throws on a code that names two levels, which no file has
 * had; the import stops on it rather than pick one.
 */
export function levelOfSourceCode(code: string): WageLevel {
  if (code === NOT_PUBLISHED) return "not-published";
  const found = code.split(/\s+/).filter((token) => Object.hasOwn(TOKENS, token));
  if (found.length > 1) throw new Error(`the source code "${code}" names more than one level (${found.join(", ")})`);
  return found.length === 1 ? TOKENS[found[0]] : "not-stated";
}
