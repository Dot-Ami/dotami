/**
 * A provision's text, split into the lines the Act prints it in, for "Show the words" (#9).
 *
 * The law store hands a provision over as one string. Its paragraphs and the marginal notes between
 * them run together with no space, as the Act's XML nodes were joined: "…for a taxation
 * year,(a)no amount…", "…business or property;Capital outlay or loss(b)an outlay…" (read through
 * the store's contract on 2026-10-12; tests/provision-lines.spec.ts holds three of its answers).
 * This finds where each subsection, paragraph, subparagraph, clause and subclause starts, and where
 * each marginal note sits, so the panel can draw them on their own lines.
 *
 * Layout only, never content: every character of the text lands in exactly one line, in order, so
 * the lines joined back together are the text. Nothing here knows what a provision means; a wrong
 * guess draws a line break in an odd place and changes no word.
 */

export interface ProvisionLine {
  /** This line's part of the text, exactly as the store gave it. */
  text: string;
  /** 0 subsection "(1)" · 1 paragraph "(a)" · 2 subparagraph "(i)" · 3 clause "(A)" · 4 subclause "(I)". */
  depth: number;
  /** A marginal note (a short heading the Act prints beside a provision), or the section's own heading. */
  note: boolean;
}

/**
 * A label in brackets, "(a)", "(c.3)", "(ii)", "(12)", with the section number glued in front of it
 * when there is one ("18(1)"). Spaces never appear inside a label, so "(in this subsection referred
 * to as …)" and "(whether initiation fees or otherwise)" are never one.
 */
const LABEL = /(\d+(?:\.\d+)*)?\(([0-9A-Za-z]{1,6}(?:\.\d+)*)\)/g;

/**
 * Where a structural label starts and how deep it is. A label is the start of a new part, not a
 * reference inside a sentence, when either:
 *  - its words follow it with no space ("(a)no amount"): the store's way of joining the Act's
 *    nodes. A reference is followed by a space or another bracket ("paragraph 20(1)(f) except");
 *  - it is followed by a space and comes first, or right after ";", ":", "—", a comma that doesn't
 *    close another label, or ", and" / "; or": the way a person copies the Act from its web page
 *    ("…Class 50, (i) 9/11, …, and (ii) nil"). A list of references, "paragraphs (a), (b) or (c)",
 *    has a ")" before each comma or "or", so it stays in its sentence.
 */
function structuralLabels(text: string): { at: number; base: string; kind: LabelKind }[] {
  const found: { at: number; base: string; kind: LabelKind }[] = [];
  for (const m of text.matchAll(LABEL)) {
    const [whole, number = "", inner] = m;
    let at = m.index!;
    // A section number counts as part of the label only when it is glued to the words before it
    // ("General limitations18(1)In"): after a space it is a reference ("paragraph 20(1)(f)").
    if (number && at > 0 && !/[A-Za-z’)]/.test(text[at - 1])) at += number.length;
    const end = m.index! + whole.length;
    const next = text[end] ?? "";
    const before = text.slice(0, at).trimEnd();

    const glued = /[A-Za-z0-9“"‘'’]/.test(next);
    const spaced =
      /\s/.test(next) && (before === "" || /[^)][;:,—]$/.test(before) || /[;,]\s*(?:and|or)$/.test(before));
    if (!glued && !spaced) continue;
    found.push({ at, base: inner.replace(/\.\d+$/, ""), kind: kindOf(inner) });
  }
  return found;
}

type LabelKind = "number" | "lower" | "lower-roman" | "lower-either" | "upper" | "upper-roman" | "upper-either";

function kindOf(inner: string): LabelKind {
  const base = inner.replace(/\.\d+$/, "");
  if (/^\d+$/.test(base)) return "number";
  // A single i, v or x could be a letter or a numeral; the labels around it decide (below).
  if (/^[ivx]$/.test(base)) return "lower-either";
  if (/^[ivx]+$/.test(base)) return "lower-roman";
  if (/^[a-z]+$/.test(base)) return "lower";
  if (/^[IVX]$/.test(base)) return "upper-either";
  if (/^[IVX]+$/.test(base)) return "upper-roman";
  return "upper";
}

const DEPTH: Record<"number" | "lower" | "lower-roman" | "upper" | "upper-roman", number> = {
  number: 0,
  lower: 1,
  "lower-roman": 2,
  upper: 3,
  "upper-roman": 4,
};

/** The letter before this one: "h" for "i". */
function letterBefore(letter: string): string {
  return String.fromCharCode(letter.charCodeAt(0) - 1);
}

/** The numeral after a one-letter numeral: "ii" after "i", "vi" after "v", "xi" after "x". */
function numeralAfter(numeral: string): string {
  return numeral === numeral.toLowerCase() ? `${numeral}i` : `${numeral}I`;
}

/**
 * Where, in a stretch of text that ends just before a label (or at the end of the text), a marginal
 * note starts: right after the last ";", ":", "." or "," that closes a word, or the last small
 * letter, directly followed by a capital ("property;Capital outlay or loss", "in respect
 * ofGeneral limitation"). The note may hold commas and full stops ("Reserves, etc.") but not ";" or
 * ":", which end a provision's sentences. -1 when there is none.
 */
function noteStart(stretch: string, atEnd: boolean): number {
  for (let k = stretch.length - 2; k >= 1; k -= 1) {
    if (!/[A-Z]/.test(stretch[k + 1])) continue;
    const c = stretch[k];
    const closesWord = /[;:.,]/.test(c) && /[a-z0-9)’”]/.test(stretch[k - 1]);
    if (!closesWord && !/[a-z]/.test(c)) continue;
    const note = stretch.slice(k + 1);
    if (/[;:]/.test(note)) return -1;
    // At the very end, a note has no label after it to prove it is one; take it only when it
    // doesn't end like a sentence.
    if (atEnd && /[.,;:]$/.test(note)) return -1;
    return k + 1;
  }
  return -1;
}

/** The text as the lines the Act prints it in. Joined back together, the lines are `text`. */
export function provisionLines(text: string): ProvisionLine[] {
  if (text === "") return [];
  const labels = structuralLabels(text);

  // How deep each label is. A one-letter i, v or x is the paragraph after h, u or w (the letter)
  // when the last paragraph was that letter and the next label isn't ii, vi or xi; otherwise it is
  // a subparagraph (the numeral). The same for I, V and X between clauses and subclauses.
  const lastAt: string[] = [];
  const depths = labels.map((label, i) => {
    let depth: number;
    if (label.kind === "lower-either" || label.kind === "upper-either") {
      const letterDepth = label.kind === "lower-either" ? DEPTH.lower : DEPTH.upper;
      const nextBase = labels[i + 1]?.base;
      const isLetter = lastAt[letterDepth] === letterBefore(label.base) && nextBase !== numeralAfter(label.base);
      depth = isLetter ? letterDepth : letterDepth + 1;
    } else {
      depth = DEPTH[label.kind];
    }
    lastAt[depth] = label.base;
    lastAt.length = depth + 1; // a new paragraph starts its subparagraphs afresh
    return depth;
  });

  const lines: ProvisionLine[] = [];
  const starts = [0, ...labels.map((l) => l.at)].filter((at, i, all) => i === 0 || at > all[i - 1]);
  const firstIsLabel = labels[0]?.at === 0;

  starts.forEach((start, i) => {
    const end = starts[i + 1] ?? text.length;
    const labelIndex = firstIsLabel ? i : i - 1;
    const depth = labelIndex >= 0 ? depths[labelIndex] : 0;
    const stretch = text.slice(start, end);

    // Text before the first label is the section's heading ("General limitations"), unless it ends
    // like a sentence; text with no label in it at all is just the words.
    if (labelIndex < 0) {
      lines.push({ text: stretch, depth: 0, note: labels.length > 0 && !/[;:.,]\s*$/.test(stretch) });
      return;
    }
    const atEnd = end === text.length;
    const split = noteStart(stretch, atEnd);
    if (split <= 0) {
      lines.push({ text: stretch, depth, note: false });
      return;
    }
    lines.push({ text: stretch.slice(0, split), depth, note: false });
    // A note before a label belongs to the part that label starts; the store's walk can also end
    // on the next subsection's note, which belongs to no line drawn here.
    const noteDepth = atEnd ? 0 : depths[labelIndex + 1];
    lines.push({ text: stretch.slice(split), depth: noteDepth, note: true });
  });
  return lines;
}
