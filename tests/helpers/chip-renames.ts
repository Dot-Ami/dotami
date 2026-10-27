import { cockpitWords } from "@/lib/cockpit/words";

/**
 * The map's words changed on 2026-10-23 (the pre-release review). The recordings in
 * tests/fixtures/strategy-map/ are never re-recorded; tests/road-map.spec.ts reads them with these put in
 * for the old words, so every other word and class is still compared exactly:
 *
 * - the two place chips (lib/scenarios/graph.ts `stageChipFor`): "now" became "first stage" and "done"
 *   became "starting point", in the chip itself and in the card's accessible name, because both were said
 *   of every idea whatever the person had told DotAmi. A chip the person set (Doing, Done, Not for me) is
 *   drawn by other code and is not in the recordings;
 * - the legend's line on the chip, which now says only the person's own marks are their status, and its
 *   "check first" line, whose "time-boxed" was a time word of DotAmi's own.
 */
export function withChipRenames(html: string): string {
  const legend = cockpitWords.map.legend;
  return html
    .replace(/(text-maple bg-maple\/15">)now</g, `$1${cockpitWords.map.chips["first-stage"]}<`)
    .replace(/text-sage bg-sage\/15">done</g, `text-stone bg-rule/30">${cockpitWords.map.chips["starting-point"]}<`)
    .replace(/(aria-label="[^"]*?), now, /g, `$1, ${cockpitWords.map.chips["first-stage"]}, `)
    .replace(/(aria-label="[^"]*?), done, /g, `$1, ${cockpitWords.map.chips["starting-point"]}, `)
    .replace(">Stage chip = where it sits on your path<", `>${legend.chip}<`)
    .replace("> check first — confirm, time-boxed, or one fork away<", `> ${legend.checkFirst}<`);
}
