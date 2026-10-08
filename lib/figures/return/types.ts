/**
 * [8f] Read last year's return — shared types.
 *
 * A return PDF is read inside the app's own window, in memory, in a worker of its own. Its bytes
 * never go to the server or the disk, and in this slice nothing from it is proposed or kept: the
 * person sees what DotAmi found and closes it. Nothing in lib/figures/return logs a word of it.
 */

/** One run of text as pdf.js placed it on a page, in PDF points from the page's bottom-left corner. */
export interface TextItem {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

/** One page's text, in the order pdf.js read it. `page` counts from 1, the way a person counts. */
export interface PageText {
  page: number;
  items: TextItem[];
}

/** Why a PDF could not be read. Each code has one plain sentence (REFUSALS in read-pdf.ts). */
export type RefusalCode =
  | "empty"
  | "too-big"
  | "not-pdf"
  | "password"
  | "too-many-pages"
  | "pictures-only"
  | "no-t2125"
  | "failed";

/** What the worker hands back: every page's text, or why there is none. Never an exception's text. */
export type ExtractResult = { ok: true; pages: PageText[] } | { ok: false; code: RefusalCode };

/**
 * The worker's reply, labelled. pdf.js's parser also talks on the worker's message channel (it
 * announces itself with a "ready" message when it loads in a worker), so the page reads only
 * messages carrying this label and ignores the rest.
 */
export const REPLY_LABEL = "dotami-return-text";
export interface WorkerReply {
  label: typeof REPLY_LABEL;
  result: ExtractResult;
}

/** One place a line number is printed as a line (not mentioned in a sentence), and what sits beside it. */
export interface LineOccurrence {
  page: number;
  /** The amount exactly as printed ("48,250.00", "(1,200.00)"), or null when nothing readable is beside it. */
  printed: string | null;
  /** The same amount in whole cents, or null. */
  cents: number | null;
}

export interface LineFound {
  line: string;
  /** Every place this line is printed in this copy, page order. Empty when it isn't there. */
  occurrences: LineOccurrence[];
}

/** One T2125 in the PDF: the pages it spans and the four lines DotAmi looks for. */
export interface T2125Copy {
  firstPage: number;
  lastPage: number;
  lines: LineFound[];
}

export type ReturnReadResult =
  | { ok: true; pageCount: number; copies: T2125Copy[] }
  | { ok: false; code: RefusalCode; error: string };

/**
 * The largest PDF DotAmi reads. A whole return saved by tax software is a few MB at most; this
 * leaves room for one with pictures in it. Checked before a byte is read.
 */
export const MAX_RETURN_BYTES = 20 * 1024 * 1024;

/** More pages than any one person's return; a bigger PDF is refused rather than read for minutes. */
export const MAX_RETURN_PAGES = 300;

/** How long the worker may take before the read is abandoned and the worker stopped. */
export const READ_TIMEOUT_MS = 60_000;
