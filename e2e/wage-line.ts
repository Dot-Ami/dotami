/**
 * A wage row's figures line, as *About this job* draws it (lib/about-job/text.ts `wageFiguresLine`), read back by
 * the words' own shapes: "Hourly · low $18.00 · median $23.00 · high $30.00", or "Yearly · …", a figure the file
 * leaves empty said as "not published". Where two or three published levels are the same amount the line ends with
 * a note saying so, " · low and median the same, as published" (the pre-release fix of 2026-10-23), and the note is
 * read as a note: it must name exactly the levels whose drawn figures are the same, and be there whenever two are.
 *
 * No browser in here, so tests/wage-line-read.spec.ts can hold it; e2e/about-job-read.ts reads the open panel's
 * wage blocks through it.
 *
 * Why it is a file of its own (2026-11-11): the panel's reader was written before the note existed and took
 * everything after "high" as the high figure, so "$63,200 · low and median the same, as published" read as no
 * amount at all. The browser idea sweep failed on the first idea it drew whose job has two equal levels (a musician
 * in Ontario, idea 156), with a screen that was right.
 */
import { aboutJobWords } from "../lib/about-job/words";
import { amountsIn } from "../tests/helpers/number-provenance";

const w = aboutJobWords.wages;

/** Stands in for an argument when a words function's sentence is turned into a pattern. */
export const SLOT = "\u0001";
const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const slotsToCaptures = (sentence: string) => escape(sentence).split(SLOT).join("(.+?)");
/** A words function's sentence as a pattern, each argument a capture. */
export const shape = (sentence: string) => new RegExp(`^${slotsToCaptures(sentence)}$`);

const FIGURES = [
  ["hour", shape(w.hourly(SLOT, SLOT, SLOT))],
  ["year", shape(w.yearly(SLOT, SLOT, SLOT))],
] as const;
// The note sits after the figures, joined by the line's own " · ". The first capture is greedy, so it holds the
// whole figures part and the second only the levels the note names.
const WITH_NOTE = new RegExp(`^(.+) · (${slotsToCaptures(w.sameAsPublished(SLOT))})$`);

/** A figure as drawn: null for "not published", its cents for one amount, NaN for anything else. */
export function drawnFigure(text: string): number | null {
  if (text.trim() === w.figureNotPublished) return null;
  const amounts = amountsIn(text);
  return amounts.length === 1 && amounts[0].written === text.trim() ? amounts[0].cents : Number.NaN;
}

export interface FiguresLine {
  per: "hour" | "year";
  /** Low, median and high, each as `drawnFigure` reads it. */
  figures: [number | null, number | null, number | null];
  /** The note the line ends with, word for word ("low and median the same, as published"); null when it has none. */
  note: string | null;
}

/** A figures line read back, or null when the line isn't one (a label, a period line). */
export function readFiguresLine(line: string): FiguresLine | null {
  const noted = WITH_NOTE.exec(line);
  const figuresPart = noted ? noted[1] : line;
  for (const [per, re] of FIGURES) {
    const m = re.exec(figuresPart);
    if (m)
      return {
        per,
        figures: [drawnFigure(m[1]), drawnFigure(m[2]), drawnFigure(m[3])],
        note: noted ? noted[2] : null,
      };
  }
  return null;
}

const LEVELS = ["low", "median", "high"] as const;

/**
 * The note a line with these figures ends with: the levels that share their amount with another published level,
 * in the line's order, joined as the words file joins them; null when no two are the same. Worked out here from the
 * words alone, not by calling the screen's own function, so the check doesn't agree with the screen by construction.
 */
export function sameLevelsNote(figures: FiguresLine["figures"]): string | null {
  const published = (figure: number | null): figure is number =>
    typeof figure === "number" && !Number.isNaN(figure);
  const same = LEVELS.filter(
    (_, i) => published(figures[i]) && figures.some((other, j) => j !== i && other === figures[i]),
  );
  if (same.length < 2) return null;
  const names = same.map((level) => w.levelNames[level]);
  const joined =
    names.length === 2
      ? names.join(` ${w.and} `)
      : `${names.slice(0, -1).join(", ")} ${w.and} ${names.at(-1)}`;
  return w.sameAsPublished(joined);
}

/**
 * What a figures line's ending gets wrong, as findings: a note its own figures don't bear out, or two figures the
 * same with no note. Empty for a line that isn't a figures line, and for one whose ending is right.
 */
export function sameNoteProblems(line: string): string[] {
  const read = readFiguresLine(line);
  if (!read) return [];
  const expected = sameLevelsNote(read.figures);
  if (expected === read.note) return [];
  if (expected === null)
    return [`the line says “${read.note}”, but no two of the figures drawn are the same`];
  if (read.note === null)
    return [`two of the figures drawn are the same, and the line doesn't say “${expected}”`];
  return [`the line says “${read.note}”, where the figures drawn make it “${expected}”`];
}
