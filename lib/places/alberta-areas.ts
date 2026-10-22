/**
 * The areas the "Which area are you in?" question lists (docs/ui-spec/futures/02-where-you-are.md, part 2a;
 * task 23g): Alberta's four census metropolitan areas in the 2021 census, A to Z, then "Somewhere else in
 * Alberta" and "I don't know". Each is kept as its value here (Statistics Canada's census metropolitan area
 * code for the four), with the moment it was picked, on the idea (`Venture.landscapeArea`).
 *
 * Asked once, right after the person picks a job, and only in Alberta for now (the maintainer's picks of
 * 2026-10-20 and call 2 of 2026-10-21). It is kept for the official counts of businesses by area, which aren't
 * in this version, so nothing reads it yet. The economic region is never worked out from it: the region is its
 * own question (lib/engines/research-kit/v2026/economic-regions.ts `regionThePersonPicked`).
 *
 * Values are ids, kept forever: add to the list, never rename or reuse one.
 */

export interface AlbertaArea {
  /** What is kept: `cma-<code>` for a census metropolitan area, or one of the two answers that aren't one. */
  value: string;
  /** The words the drop-down shows (lib/front-door/words.ts `whereStepWords.area`). */
  key: "calgary" | "edmonton" | "lethbridge" | "redDeer" | "elsewhere" | "dontKnow";
}

/** The answers, in the order the drop-down lists them: the four areas A to Z, then the other two. */
export const ALBERTA_AREAS: readonly AlbertaArea[] = [
  { value: "cma-825", key: "calgary" },
  { value: "cma-835", key: "edmonton" },
  { value: "cma-810", key: "lethbridge" },
  { value: "cma-830", key: "redDeer" },
  { value: "ab-elsewhere", key: "elsewhere" },
  { value: "dont-know", key: "dontKnow" },
];

/** The provinces the area question is asked in: Alberta only, as the region question (REGION_QUESTION_PROVINCES). */
export const AREA_QUESTION_PROVINCES: readonly string[] = ["AB"];

/** Whether `value` is an answer the area question offers. Anything else is never kept, and never guessed into one. */
export function isAlbertaArea(value: unknown): value is string {
  return typeof value === "string" && ALBERTA_AREAS.some((area) => area.value === value);
}
