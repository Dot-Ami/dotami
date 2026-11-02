"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";

import { Pill } from "@/components/ui";
import { BookReader } from "@/lib/figures/books/read-book";
import type { BookData } from "@/lib/figures/books/types";
import { monthInWords } from "@/lib/figures/file/dates";
import {
  datesCheckKey,
  datesCheckSentence,
  datesConfirmed,
  datesReadSentence,
  exportInsteadSentence,
  firstSheetWithRows,
  followDatesCheck,
  guessAcrossPicks,
  guessLayout,
  guessPicks,
  monthsReadSentence,
  NO_DATES_CHECK,
  previewAcross,
  previewSheet,
  sheetHasRows,
  type AcrossPicks,
  type AddUp,
  type DatesCheck,
  type Layout,
  type Picks,
} from "@/lib/figures/file/preview";
import { sniffFile } from "@/lib/figures/file/sniff";
import { columnLetter, columnsOf, isBlankRow } from "@/lib/figures/file/table";
import { splitAlreadyKnown } from "@/lib/figures/file/totals";
import {
  MAX_FILE_BYTES,
  type AcrossResult,
  type Cell,
  type CellPlace,
  type Century,
  type DateOrder,
  type DecimalStyle,
  type ReadResult,
  type Sheet,
  type SkipReason,
} from "@/lib/figures/file/types";
import type { FigureView } from "@/lib/figures/types";
import { venturesWords } from "@/lib/ventures/words";

import { describePeriod, formatAmount, postJson } from "./agree-prompt";
import { BookReview, type BookProposal } from "./books-drop";

const words = venturesWords.fileDrop;
const common = venturesWords.common;

/**
 * [8c] "Add from a file": reads a spreadsheet inside this window and proposes one total per
 * month. Before anything can be dropped or chosen, the person says where the file is from, every
 * time; a bank or card file is turned away without being opened (the maintainer's decision, 2026-10-07).
 * The file's bytes are read in memory and dropped as soon as they are turned into rows;
 * nothing from the file is sent anywhere, kept, or logged. Only the monthly totals leave this
 * component, through /api/figures/propose, and they wait in the agree prompt like every other
 * figure (docs/architecture/figures-privacy-review.md, rules 1-3).
 *
 * The parsing code (zip and XML readers) is loaded only when a file is picked, so the ideas page
 * costs nothing extra for someone who never uses this.
 *
 * [8h] A GnuCash book is told from its first bytes and goes to the books reader instead: it is read
 * in a background worker (lib/figures/books/read-book.ts, up to 50 MB, with a time limit), and its
 * accounts and totals are shown by books-drop.tsx.
 */

const FIELD =
  "rounded-sm border border-rule bg-ink px-2 py-1 text-lead text-paper outline-hidden placeholder:text-stone-dim focus:border-maple-soft";
const FIELD_LABEL = "block font-mono text-label uppercase tracking-[0.14em] text-stone";
const ALERT = "mt-2 rounded-sm border border-amber/40 bg-amber/5 px-3 py-2 text-body text-amber";
/** The bank-file notice: the same amber look as ALERT, but it is the first thing in the panel, so no top margin. */
const BANK_NOTICE = "rounded-sm border border-amber/40 bg-amber/5 px-3 py-2 text-body text-amber";

/** Same limits as the screen spec: how far down the column names may be, and the route's cap. */
const HEADER_ROW_CHOICES = 30;
const MAX_FIGURES_PER_FILE = 500;
const MAX_ROW_NUMBERS_SHOWN = 5;
const MAX_LABEL_CHARS = 120;

// .gnucash is GnuCash's own name for a book (compressed or not); .xml and .gz for a copy renamed.
const ACCEPT =
  ".xlsx,.csv,.txt,.gnucash,.xml,.gz,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
/** How much of a file is looked at to tell what it is (a book, a workbook, a CSV) before it is read. */
const HEAD_BYTES = 8192;
const ACCOUNTING_LABEL = words.accounting;
const BANK_LABEL = words.bank;
const READ_FAILED = words.readFailed;

type Phase = "pick" | "reading" | "ready";

/**
 * Where the person says the file is from. Asked for every file and never remembered: it lives only
 * in this component's state, so Cancel, a finished review and "Change" all bring the question back.
 * Only "accounting" lets a file be read at all.
 */
type Origin = "ask" | "accounting" | "bank";

/** An answer the person gave about one column, remembered only for the column it was given for. */
interface Answer<T> {
  key: string;
  value: T;
}

/** The person's own calendar day (not UTC's) as YYYY-MM-DD: a month is "over" by their clock. */
function localToday(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** The pickers' value for "nothing chosen yet". */
const NO_PICKS: Picks = {
  headerRow: null,
  dateColumn: null,
  amountColumn: null,
  typeColumn: null,
  statusColumn: null,
};
const NO_ACROSS_PICKS: AcrossPicks = { monthsRow: null, addUp: "every-row" };

/** The most rows offered as "take only this row" for a months-across table. */
const MAX_TOTAL_ROW_CHOICES = 200;
/** How much of a row's label the "take only this row" choice shows. */
const MAX_ROW_LABEL_CHARS = 40;

function rowWord(n: number): string {
  return n === 1 ? words.places.row : words.places.rows;
}

/** Beside a month's total: what its refunds took off, e.g. "1 refund taken off ($40.00)". */
function refundsText(refunds: { rows: number; cents: number }, currency: string): string {
  return words.refundsTakenOff(refunds.rows, formatAmount(refunds.cents, currency));
}

/** "1 row 7" / "2 rows 3, 9" / "6 rows 3, 4, 5, 6, 7, …": the first few row numbers or cell names. */
function placesText(word: string, plural: string, places: string[]): string {
  const shown = places.slice(0, MAX_ROW_NUMBERS_SHOWN);
  const more = places.length > shown.length ? ", …" : "";
  return `${shown.length === 1 ? word : plural} ${shown.join(", ")}${more}`;
}

/**
 * The left-out lines for a months-across table. In this layout what is left out can be a whole row
 * (the file's own totals row, a blank row, a row with nothing under any month), a single cell under
 * a month (empty, or an amount DotAmi can't read), or a whole month column that isn't over yet, so
 * the wording names cells as Excel does ("C6") and month columns by letter.
 */
function acrossLeftOut(result: AcrossResult): string[] {
  const lines: string[] = [];
  const cellsFor = (reason: "bad-amount" | "empty" | "unsaved-formula") =>
    result.skippedCells
      .filter((c) => c.reason === reason)
      .map((c) => `${columnLetter(c.column)}${c.row}`);
  const rowsFor = (reason: "blank" | "total" | "no-amount") =>
    result.skippedRows.filter((r) => r.reason === reason).map((r) => String(r.row));

  const { places, across } = words;
  const cellPlaces = (list: string[]) => placesText(places.cell, places.cells, list);
  const rowPlaces = (list: string[]) => placesText(places.row, places.rows, list);

  const bad = cellsFor("bad-amount");
  if (bad.length > 0) lines.push(across.badCells(bad.length, cellPlaces(bad)));
  const unsaved = cellsFor("unsaved-formula");
  if (unsaved.length > 0) lines.push(across.unsavedCells(unsaved.length, cellPlaces(unsaved)));
  const empty = cellsFor("empty");
  if (empty.length > 0) lines.push(across.emptyCells(empty.length, cellPlaces(empty)));
  const totals = rowsFor("total");
  if (totals.length > 0) {
    lines.push(`${leftOutText("total", totals.length)}: ${rowPlaces(totals)}`);
  }
  const nothing = rowsFor("no-amount");
  if (nothing.length > 0) lines.push(across.nothingUnderAnyMonth(nothing.length, rowPlaces(nothing)));
  if (result.notOver.length > 0) {
    const columns = result.notOver.map((m) => `${columnLetter(m.column)} (${monthInWords(m.month)})`);
    lines.push(across.notOverMonths(columns.length, placesText(places.column, places.columns, columns)));
  }
  const blank = rowsFor("blank");
  if (blank.length > 0) {
    lines.push(`${leftOutText("blank", blank.length)}: ${rowPlaces(blank)}`);
  }
  return lines;
}

/** A row's first cell outside the month columns that has something in it, cut short: "Total", "Client A". */
function rowLabel(row: Cell[] | undefined, monthColumns: Set<number>): string {
  for (const [index, cell] of (row ?? []).entries()) {
    if (monthColumns.has(index) || cell === null || cell === undefined) continue;
    const text = cell instanceof Date ? cell.toISOString().slice(0, 10) : String(cell).trim();
    if (text !== "") {
      return text.length > MAX_ROW_LABEL_CHARS ? `${text.slice(0, MAX_ROW_LABEL_CHARS)}…` : text;
    }
  }
  return "";
}

/** No unsaved formulas: one shared empty list, so a CSV doesn't make the preview work again. */
const NO_PLACES: CellPlace[] = [];

/** Sentence for rows the totals leave out, e.g. "2 rows without a date DotAmi can read". */
function leftOutText(reason: SkipReason, n: number): string {
  const line = words.leftOut;
  switch (reason) {
    case "blank":
      return line.blank(n);
    case "total":
      return line.total(n);
    case "no-date":
      return line.noDate(n);
    case "no-amount":
      return line.noAmount(n);
    case "bad-amount":
      return line.badAmount(n);
    case "unsaved-formula":
      return line.unsavedFormula(n);
    case "payment":
      return line.payment(n);
    case "void-or-draft":
      return line.voidOrDraft(n);
    case "not-over":
      return line.notOver(n);
  }
}

/** The things that matter most come first; blank rows are the least interesting, so they go last. */
const LEFT_OUT_ORDER: SkipReason[] = [
  "no-date",
  "no-amount",
  "bad-amount",
  "unsaved-formula",
  "total",
  "void-or-draft",
  "payment",
  "not-over",
  "blank",
];

export function FileDrop({
  ventureId,
  existing,
  onCancel,
  onProposed,
}: {
  ventureId: string;
  existing: FigureView[];
  onCancel: () => void;
  onProposed: (figures: FigureView[]) => void;
}) {
  const uid = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  // Bumped for every file picked and when the screen closes, so a slow read can't land on a newer file.
  const readToken = useRef(0);
  // True from the moment a file is accepted until the question is asked again. The answer covers
  // ONE file: a ref (not state) so two drops in the same instant can't both slip through.
  const answerUsed = useRef(false);

  const [origin, setOrigin] = useState<Origin>("ask");
  const [dragging, setDragging] = useState(false);
  const [phase, setPhase] = useState<Phase>("pick");
  const [fileName, setFileName] = useState("");
  const [readError, setReadError] = useState<string | null>(null);

  // Only the rows are kept from the file; its bytes are gone once they are turned into rows.
  const [sheets, setSheets] = useState<Sheet[]>([]);
  const [sheetIndex, setSheetIndex] = useState(0);
  const [picks, setPicks] = useState<Picks>(NO_PICKS);
  const [guessed, setGuessed] = useState(false);
  // One row per sale with a date, or months across the top ([8c-3]); guessed per sheet, the
  // person's to change. The months-across pickers are filled whichever layout the sheet starts on.
  const [layout, setLayout] = useState<Layout>("rows");
  const [acrossPicks, setAcrossPicks] = useState<AcrossPicks>(NO_ACROSS_PICKS);
  const [acrossGuessed, setAcrossGuessed] = useState(false);
  const [dateAnswer, setDateAnswer] = useState<Answer<DateOrder | ""> | null>(null);
  // "Is 05 the year 2005?": like the date order, kept only for the column it was given for and
  // forgotten with the file, so the next file is asked again.
  const [centuryAnswer, setCenturyAnswer] = useState<Answer<Century | ""> | null>(null);
  const [styleAnswer, setStyleAnswer] = useState<Answer<DecimalStyle> | null>(null);
  const [currency, setCurrency] = useState("CAD");
  // "These dates are right": ticked under one reading of the dates only (see followDatesCheck).
  // fileCount goes into that reading, so every file read is confirmed afresh.
  const [fileCount, setFileCount] = useState(0);
  const [datesCheck, setDatesCheck] = useState<DatesCheck>(NO_DATES_CHECK);

  // [8h] A GnuCash book, once the books worker has read it: its accounts and posted lines, in memory.
  const [book, setBook] = useState<BookData | null>(null);
  const [readingBook, setReadingBook] = useState(false);
  // The books worker, started on the first book and stopped whenever the file is forgotten.
  const bookReader = useRef<BookReader | null>(null);

  const [busy, setBusy] = useState(false);
  const [proposeError, setProposeError] = useState<string | null>(null);

  useEffect(() => {
    const token = readToken;
    const reader = bookReader;
    return () => {
      token.current += 1;
      // The panel closed: stop the worker and whatever book it holds.
      reader.current?.close();
    };
  }, []);

  // Keyboard focus follows the screen: the button that was pressed (an answer, Choose a file, Back,
  // Change) disappears, so focus moves to the first [data-autofocus] element of what replaced it.
  // Compared with the last screen rather than counted, so the first render (and React's development
  // double-run of effects) moves nothing.
  const screen = `${origin}|${phase}|${readError ?? ""}`;
  const lastScreen = useRef(screen);
  useEffect(() => {
    if (lastScreen.current === screen) return;
    lastScreen.current = screen;
    panelRef.current?.querySelector<HTMLElement>("[data-autofocus]")?.focus();
  }, [screen]);

  const rows = useMemo(() => sheets[sheetIndex]?.rows ?? [], [sheets, sheetIndex]);
  // Excel only: the cells holding a formula saved with no value, so they aren't called empty.
  const unsavedFormulas = useMemo(
    () => sheets[sheetIndex]?.unsavedFormulas ?? NO_PLACES,
    [sheets, sheetIndex],
  );
  const nonEmptySheets = useMemo(
    () =>
      sheets.map((sheet, index) => ({ sheet, index })).filter(({ sheet }) => sheetHasRows(sheet)),
    [sheets],
  );

  /** Fills the pickers for a sheet from a guess; `forcedHeader` when the person chose the header row. */
  function applyGuess(sheetRows: Cell[][], forcedHeader?: number) {
    const guess = guessPicks(sheetRows, forcedHeader);
    setPicks(guess.picks);
    setGuessed(guess.guessed);
  }

  /** A sheet just opened: guess its layout, its columns and its row of month names. */
  function startSheet(sheetRows: Cell[][]) {
    applyGuess(sheetRows);
    setLayout(guessLayout(sheetRows).layout);
    const across = guessAcrossPicks(sheetRows);
    setAcrossPicks(across);
    setAcrossGuessed(across.monthsRow !== null);
  }

  /**
   * Back to the question, forgetting everything about any file already read. Bumping the token also
   * drops a read that is still in flight, so a late result can't land on the empty screen.
   */
  function askAgain() {
    readToken.current += 1;
    // A book still being read is stopped with its worker; one already read is forgotten below.
    bookReader.current?.close();
    setBook(null);
    setReadingBook(false);
    answerUsed.current = false;
    setOrigin("ask");
    setDragging(false);
    setPhase("pick");
    setFileName("");
    setReadError(null);
    setProposeError(null);
    setSheets([]);
    setSheetIndex(0);
    setPicks(NO_PICKS);
    setGuessed(false);
    setLayout("rows");
    setAcrossPicks(NO_ACROSS_PICKS);
    setAcrossGuessed(false);
    setDateAnswer(null);
    setCenturyAnswer(null);
    setStyleAnswer(null);
    setCurrency("CAD");
    setDatesCheck(NO_DATES_CHECK);
  }

  async function openFile(file: File) {
    // The one gate every read goes through: nothing about the file is touched (not its bytes, not a
    // sniff, not its name) unless the person said it comes from accounting software or their own
    // spreadsheet. A bank or card file therefore never reaches the parser.
    if (origin !== "accounting") return;
    // And the answer buys one file only: a second file (read, refused or still reading) goes back
    // to the question, so a bank file can't ride in on an earlier "accounting software" answer.
    if (answerUsed.current) return;
    answerUsed.current = true;
    const token = ++readToken.current;
    setFileName(file.name);
    setReadError(null);
    setProposeError(null);
    setSheets([]);
    setBook(null);
    setPhase("reading");

    // What kind of file is it? Only its first bytes are looked at, so a file that is too big for
    // what it turns out to be (a spreadsheet over 10 MB, a GnuCash book over 50 MB) is refused
    // before the rest of it is read.
    let sniffed: ReturnType<typeof sniffFile>;
    try {
      const head = new Uint8Array(await file.slice(0, HEAD_BYTES).arrayBuffer());
      sniffed = sniffFile(file.name, file.size, head);
    } catch {
      sniffed = { ok: false, error: READ_FAILED };
    }
    if (token !== readToken.current) return; // a newer file was picked, or the screen closed
    if (!sniffed.ok) {
      setReadError(sniffed.error);
      setPhase("pick");
      return;
    }
    if (sniffed.format === "gnucash") {
      await openBook(file, token);
      return;
    }
    // A spreadsheet past its limit was refused above; this is a second guard for the full read.
    if (file.size > MAX_FILE_BYTES) {
      setReadError(READ_FAILED);
      setPhase("pick");
      return;
    }

    let result: ReadResult;
    try {
      // The zip and XML readers load now, not with the page.
      const { readSpreadsheet } = await import("@/lib/figures/file/read-file");
      result = await readSpreadsheet(file.name, new Uint8Array(await file.arrayBuffer()));
    } catch {
      result = { ok: false, error: READ_FAILED };
    }
    if (token !== readToken.current) return; // a newer file was picked, or the screen closed

    if (!result.ok) {
      setReadError(result.error);
      setPhase("pick");
      return;
    }

    const start = firstSheetWithRows(result.sheets);
    setSheets(result.sheets);
    setSheetIndex(start);
    setDateAnswer(null);
    setCenturyAnswer(null);
    setStyleAnswer(null);
    setFileCount((n) => n + 1);
    startSheet(result.sheets[start]?.rows ?? []);
    setPhase("ready");
  }

  /**
   * [8h] Reads a GnuCash book in the books worker. The window stays usable while it reads, and
   * Change or Cancel stop the worker. Only what the worker hands back (accounts and posted lines)
   * is kept, in this component's state; the bytes went to the worker, which holds on to nothing
   * once it has answered.
   */
  async function openBook(file: File, token: number) {
    setReadingBook(true);
    bookReader.current ??= new BookReader();
    const result = await bookReader.current.read(file);
    if (token !== readToken.current) return; // a newer file was picked, or the screen closed
    setReadingBook(false);
    if (!result.ok) {
      setReadError(result.error);
      setPhase("pick");
      return;
    }
    setBook(result.book);
    setPhase("ready");
  }

  function onPicked(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    // Clear the input so choosing the same file again still fires a change.
    e.target.value = "";
    if (file) void openFile(file);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void openFile(file);
  }

  // The answers the person gave count only for the column they were given for.
  const dateKey = `${sheetIndex}:${picks.headerRow}:${picks.dateColumn}`;
  const dateOrderChoice: DateOrder | "" = dateAnswer?.key === dateKey ? dateAnswer.value : "";
  const centuryChoice: Century | "" = centuryAnswer?.key === dateKey ? centuryAnswer.value : "";
  // The amounts' style answer is kept per amount column, or per row of month names when across.
  const styleKey =
    layout === "across"
      ? `${sheetIndex}:across:${acrossPicks.monthsRow}`
      : `${sheetIndex}:${picks.headerRow}:${picks.amountColumn}`;
  const styleChoice = styleAnswer?.key === styleKey ? styleAnswer.value : undefined;

  const code = currency.trim().toUpperCase();
  const currencyOk = /^[A-Z]{3}$/.test(code);

  // Everything the screen works out from the sheet and the picks lives in lib/figures/file/preview.ts,
  // the same function the practice-file tests run. The currency only holds the totals back.
  const preview = useMemo(
    () =>
      previewSheet(
        rows,
        picks,
        { dateOrder: dateOrderChoice, century: centuryChoice, decimalStyle: styleChoice },
        localToday(),
        !currencyOk,
        unsavedFormulas,
      ),
    [rows, picks, dateOrderChoice, centuryChoice, styleChoice, currencyOk, unsavedFormulas],
  );
  const { detectedOrder, twoDigitYear } = preview;
  const needsDateQuestion = detectedOrder.ambiguous;

  // Months across the top: the same kind of preview from lib/figures/file/preview.ts.
  const acrossPreview = useMemo(
    () =>
      layout === "across"
        ? previewAcross(
            rows,
            acrossPicks,
            { decimalStyle: styleChoice },
            localToday(),
            !currencyOk,
            unsavedFormulas,
          )
        : null,
    [layout, rows, acrossPicks, styleChoice, currencyOk, unsavedFormulas],
  );

  // What the bottom of the screen shows, from whichever layout is in use.
  const shown = acrossPreview
    ? {
        state: acrossPreview.state,
        message: acrossPreview.message,
        months: acrossPreview.result?.months ?? null,
        readSentence: acrossPreview.result
          ? monthsReadSentence(acrossPreview.result.monthsRead)
          : null,
      }
    : {
        state: preview.state,
        message: preview.message,
        months: preview.result?.months ?? null,
        readSentence: preview.result ? datesReadSentence(preview.result.datesRead) : null,
      };
  const decimalStyle = acrossPreview ? acrossPreview.decimalStyle : preview.decimalStyle;

  // The reading of the dates now on screen. When it differs from the one the box was last looked at
  // under, the box is emptied right here in render (React's way of resetting state when what it
  // depends on changes; no effect, so there is never a frame with a stale tick).
  const datesKey = datesCheckKey({
    file: fileCount,
    sheet: sheetIndex,
    layout,
    headerRow: picks.headerRow,
    dateColumn: picks.dateColumn,
    dateOrder: dateOrderChoice,
    century: centuryChoice,
    monthsRow: acrossPicks.monthsRow,
    // With the totals held back (say, the currency half retyped) there is no line on screen; the
    // last one stands in, so the tick survives CAD becoming USD.
    sentence: datesCheckSentence(shown.readSentence, datesCheck),
  });
  const followedCheck = followDatesCheck(datesCheck, datesKey);
  if (followedCheck !== datesCheck) setDatesCheck(followedCheck);
  const datesOk = datesConfirmed(datesCheck, datesKey);
  const datesBoxLabel = acrossPreview ? words.monthsRight : words.datesRight;

  const split = useMemo(
    () => (shown.months ? splitAlreadyKnown(shown.months, existing, code) : null),
    [shown.months, existing, code],
  );

  async function review() {
    // The button is disabled until the dates are confirmed; this is the second lock on the same door.
    if (busy || !split || !datesOk) return;
    const label = fileName.trim().slice(0, MAX_LABEL_CHARS) || words.aFile;
    // Row counts go along only when each row lands in exactly one month. With the months across
    // the top, one client row adds into every month, and the agree prompt (and the cards' "from
    // your records") add the figures' counts up: 3 clients over 3 months would read "9 rows".
    // No count is better than a wrong one; the preview above still shows each month's rows.
    const withRows = !acrossPreview;
    await propose({
      ventureId,
      source: {
        kind: "file",
        label,
        ...(withRows ? { rows: split.fresh.reduce((sum, m) => sum + m.rows, 0) } : {}),
      },
      figures: split.fresh.map((m) => ({
        kind: "gross-revenue",
        periodStart: m.periodStart,
        periodEnd: m.periodEnd,
        amountCents: m.amountCents,
        currency: code,
        ...(withRows ? { rows: m.rows } : {}),
      })),
    });
  }

  /** Sends the totals (from a spreadsheet or a book) to wait in the agree prompt, then opens it. */
  async function propose(body: BookProposal | Record<string, unknown>) {
    if (busy) return;
    setProposeError(null);
    setBusy(true);
    const result = await postJson("/api/figures/propose", body);
    setBusy(false);
    if (!result.ok) {
      setProposeError(result.error);
      return;
    }
    const created = (result.body as { figures?: FigureView[] } | null)?.figures;
    if (!Array.isArray(created) || created.length === 0) {
      setProposeError(common.notThrough);
      return;
    }
    onProposed(created);
  }

  const columns = useMemo(
    () => (picks.headerRow !== null ? columnsOf(rows, picks.headerRow) : []),
    [rows, picks.headerRow],
  );
  const headerChoices = Math.min(HEADER_ROW_CHOICES, rows.length);
  const noGuess = phase === "ready" && layout === "rows" && picks.headerRow === null;
  // With no column names found, the report to export instead (Wave's Income by Customer has no dates).
  const exportInstead = useMemo(
    () => (noGuess ? exportInsteadSentence(rows) : null),
    [noGuess, rows],
  );

  // Months across: which columns are months, which aren't, and the rows that can be taken alone.
  const monthSet = useMemo(
    () => new Set(acrossPreview?.monthColumns.map((m) => m.column) ?? []),
    [acrossPreview],
  );
  const notMonths = useMemo(
    () =>
      layout === "across" && acrossPicks.monthsRow !== null && monthSet.size > 0
        ? columnsOf(rows, acrossPicks.monthsRow).filter((c) => !monthSet.has(c.index))
        : [],
    [layout, rows, acrossPicks.monthsRow, monthSet],
  );
  const totalRowChoices = useMemo(() => {
    if (layout !== "across" || acrossPicks.monthsRow === null) return [];
    const choices: { index: number; label: string }[] = [];
    for (let i = acrossPicks.monthsRow + 1; i < rows.length; i += 1) {
      if (choices.length >= MAX_TOTAL_ROW_CHOICES) break;
      if (isBlankRow(rows[i])) continue;
      choices.push({ index: i, label: rowLabel(rows[i], monthSet) });
    }
    return choices;
  }, [layout, rows, acrossPicks.monthsRow, monthSet]);
  const asNumber = (value: string): number | null => (value === "" ? null : Number(value));

  // Skipped rows grouped by reason, each with its count and the first few row numbers; for months
  // across, rows, cells and month columns (acrossLeftOut).
  const leftOut = useMemo(() => {
    if (acrossPreview) return acrossPreview.result ? acrossLeftOut(acrossPreview.result) : [];
    const result = preview.result;
    if (!result) return [];
    return LEFT_OUT_ORDER.map((reason) => {
      const hits = result.skipped.filter((s) => s.reason === reason);
      const rowsHit = hits.slice(0, MAX_ROW_NUMBERS_SHOWN).map((s) => s.row);
      if (hits.length === 0) return null;
      return `${leftOutText(reason, hits.length)}: ${rowWord(rowsHit.length)} ${rowsHit.join(", ")}${
        hits.length > rowsHit.length ? ", …" : ""
      }`;
    }).filter((line): line is string => line !== null);
  }, [acrossPreview, preview]);

  return (
    <div
      ref={panelRef}
      role="group"
      aria-label={words.region}
      // A file let go anywhere on the panel must not make the browser open it. While the question
      // or the bank warning is showing, the drop is simply ignored: it is never read.
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => e.preventDefault()}
      className="rounded-sm border border-rule-soft bg-ink px-3 py-3"
    >
      {origin === "ask" ? (
        <div>
          <p id={`${uid}-origin`} className="text-body text-paper">
            {words.whereFrom}
          </p>
          <div
            role="group"
            aria-labelledby={`${uid}-origin`}
            className="mt-2 flex flex-wrap items-center gap-2"
          >
            <Pill
              data-autofocus
              variant="elev"
              size="small"
              aria-describedby={`${uid}-origin-hint`}
              onClick={() => setOrigin("accounting")}
            >
              {ACCOUNTING_LABEL}
            </Pill>
            <Pill variant="elev" size="small" onClick={() => setOrigin("bank")}>
              {BANK_LABEL}
            </Pill>
          </div>
          <p id={`${uid}-origin-hint`} className="mt-2 text-body text-stone-dim">
            {words.whereFromHint}
          </p>
        </div>
      ) : null}

      {origin === "bank" ? (
        <div role="alert" className={BANK_NOTICE}>
          <p className="font-medium">{words.bankNotice.cantYet}</p>
          <p className="mt-1">{words.bankNotice.whenItCan}</p>
          <div className="mt-2">
            <Pill data-autofocus variant="ghost" size="small" onClick={askAgain}>
              {words.bankNotice.back}
            </Pill>
          </div>
        </div>
      ) : null}

      {origin === "accounting" ? (
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2 text-body text-stone-dim">
            <span>
              {words.from} <span className="text-paper-dim">{ACCOUNTING_LABEL}</span>
            </span>
            <Pill variant="ghost" size="small" onClick={askAgain} disabled={busy}>
              {words.change}
            </Pill>
          </div>
          {/* The drop area exists only until a file is accepted; for the next file the question comes back. */}
          {fileName === "" ? (
            <div
              role="group"
              aria-label={words.dropRegion}
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              className={`rounded-sm border border-dashed px-3 py-3 transition ${
                dragging
                  ? "border-maple bg-maple/10"
                  : "border-rule hover:border-maple-soft focus-within:border-maple-soft"
              }`}
            >
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-body text-paper-dim">{words.dropLine}</p>
                <Pill
                  data-autofocus
                  variant="elev"
                  size="small"
                  onClick={() => inputRef.current?.click()}
                >
                  {words.chooseFile}
                </Pill>
                <input
                  ref={inputRef}
                  type="file"
                  accept={ACCEPT}
                  aria-label={words.chooseFile}
                  tabIndex={-1}
                  onChange={onPicked}
                  className="sr-only"
                />
              </div>
              <p className="mt-2 text-body text-stone-dim">{words.readHere}</p>
            </div>
          ) : null}
        </div>
      ) : null}

      {origin === "accounting" && phase === "reading" ? (
        <p
          data-autofocus
          tabIndex={-1}
          role="status"
          className="mt-2 text-body text-stone-dim outline-hidden"
        >
          {common.reading} {fileName}…{readingBook ? ` ${words.bookInBackground}` : ""}
        </p>
      ) : null}
      {origin === "accounting" && readError ? (
        <p role="alert" className={ALERT}>
          {readError}{" "}
          <Pill data-autofocus variant="ghost" size="small" onClick={askAgain}>
            {common.chooseAnother}
          </Pill>
        </p>
      ) : null}

      {origin === "accounting" && phase === "ready" && book ? (
        <BookReview
          ventureId={ventureId}
          fileName={fileName}
          book={book}
          existing={existing}
          busy={busy}
          onReview={(body) => void propose(body)}
        />
      ) : null}

      {origin === "accounting" && phase === "ready" && !book ? (
        <div className="mt-3">
          {/* Focus lands here once a file is read, since the Choose a file button it came from is gone. */}
          <p data-autofocus tabIndex={-1} className="text-body text-paper-dim outline-hidden">
            {common.file} <span className="text-paper">{fileName}</span>
          </p>
          {/* Shown for every file: DotAmi was only ever tried on invented files laid out from each
              program's help pages (tests/fixtures/packages/), never on a real export. */}
          <p className="mt-1 text-body text-stone-dim">{words.testedOn}</p>

          {nonEmptySheets.length > 1 ? (
            <div className="mt-2">
              <label htmlFor={`${uid}-sheet`} className={FIELD_LABEL}>
                {words.sheet}
              </label>
              <select
                id={`${uid}-sheet`}
                value={sheetIndex}
                onChange={(e) => {
                  const next = Number(e.target.value);
                  setSheetIndex(next);
                  setDateAnswer(null);
                  setCenturyAnswer(null);
                  setStyleAnswer(null);
                  startSheet(sheets[next]?.rows ?? []);
                }}
                className={`${FIELD} mt-1`}
              >
                {nonEmptySheets.map(({ sheet, index }) => (
                  <option key={index} value={index}>
                    {sheet.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          <div className="mt-2">
            <label htmlFor={`${uid}-layout`} className={FIELD_LABEL}>
              {words.layout.label}
            </label>
            <select
              id={`${uid}-layout`}
              value={layout}
              onChange={(e) => setLayout(e.target.value as Layout)}
              className={`${FIELD} mt-1`}
            >
              <option value="rows">{words.layout.rows}</option>
              <option value="across">{words.layout.across}</option>
            </select>
          </div>

          {noGuess ? (
            <p className="mt-2 text-body text-amber">{words.noColumnNames}</p>
          ) : null}
          {exportInstead ? (
            <p className="mt-1 max-w-prose text-body text-amber">{exportInstead}</p>
          ) : null}
          {layout === "rows" && guessed ? (
            <p className="mt-2 text-body text-stone-dim">{words.guessedColumns}</p>
          ) : null}

          {layout === "across" ? (
            <div className="mt-2">
              {acrossPicks.monthsRow === null ? (
                <p className="text-body text-amber">{words.noMonthNames}</p>
              ) : null}
              {acrossGuessed ? (
                <p className="text-body text-stone-dim">{words.guessedMonthsRow}</p>
              ) : null}
              <div className="mt-2 flex flex-wrap items-start gap-3">
                <div>
                  <label htmlFor={`${uid}-months-row`} className={FIELD_LABEL}>
                    {words.monthNamesRow}
                  </label>
                  <select
                    id={`${uid}-months-row`}
                    value={acrossPicks.monthsRow ?? ""}
                    onChange={(e) => {
                      // A new row of month names: rows above it can't hold their totals.
                      setAcrossPicks({ monthsRow: asNumber(e.target.value), addUp: "every-row" });
                      setAcrossGuessed(false);
                    }}
                    className={`${FIELD} mt-1`}
                  >
                    <option value="">{words.pickRow}</option>
                    {Array.from({ length: headerChoices }, (_, i) => (
                      <option key={i} value={i}>
                        {words.row} {i + 1}
                      </option>
                    ))}
                  </select>
                </div>
                {acrossPicks.monthsRow !== null ? (
                  <div>
                    <label htmlFor={`${uid}-add-up`} className={FIELD_LABEL}>
                      {words.totalsFrom}
                    </label>
                    <select
                      id={`${uid}-add-up`}
                      value={String(acrossPicks.addUp)}
                      onChange={(e) => {
                        const addUp: AddUp =
                          e.target.value === "every-row" ? "every-row" : Number(e.target.value);
                        setAcrossPicks({ ...acrossPicks, addUp });
                        setAcrossGuessed(false);
                      }}
                      aria-describedby={`${uid}-add-up-hint`}
                      className={`${FIELD} mt-1`}
                    >
                      <option value="every-row">{words.everyRow}</option>
                      {totalRowChoices.map((choice) => (
                        <option key={choice.index} value={choice.index}>
                          {words.rowOnly(choice.index + 1, choice.label)}
                        </option>
                      ))}
                    </select>
                    <p id={`${uid}-add-up-hint`} className="mt-1 max-w-xs text-body text-stone-dim">
                      {words.everyRowHint}
                    </p>
                  </div>
                ) : null}
              </div>
              {acrossPreview && acrossPreview.monthColumns.length > 0 ? (
                <div className="mt-2 text-body text-stone-dim">
                  <p className="font-mono text-label uppercase tracking-wider">{words.readAsMonths}</p>
                  <ul className="mt-1 space-y-0.5">
                    {acrossPreview.monthColumns.map((m) => (
                      <li key={m.column}>
                        {columnLetter(m.column)} · {monthInWords(m.month)}
                      </li>
                    ))}
                  </ul>
                  {notMonths.length > 0 ? (
                    <p className="mt-1">
                      {words.notMonths}{" "}
                      {notMonths.map((c) => `${c.letter} · ${c.label}`).join(", ")}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}

          {layout === "rows" ? (
            <div className="mt-2 flex flex-wrap items-start gap-3">
              <div>
                <label htmlFor={`${uid}-header`} className={FIELD_LABEL}>
                  {words.columnNamesRow}
                </label>
                <select
                  id={`${uid}-header`}
                  value={picks.headerRow ?? ""}
                  onChange={(e) => {
                    const next = asNumber(e.target.value);
                    if (next === null) {
                      setPicks(NO_PICKS);
                      setGuessed(false);
                      return;
                    }
                    applyGuess(rows, next);
                  }}
                  className={`${FIELD} mt-1`}
                >
                  <option value="">{words.pickRow}</option>
                  {Array.from({ length: headerChoices }, (_, i) => (
                    <option key={i} value={i}>
                      {words.row} {i + 1}
                    </option>
                  ))}
                </select>
              </div>
  
              {picks.headerRow !== null ? (
                <>
                  <div>
                    <label htmlFor={`${uid}-date`} className={FIELD_LABEL}>
                      {words.dateColumn}
                    </label>
                    <select
                      id={`${uid}-date`}
                      value={picks.dateColumn ?? ""}
                      onChange={(e) => {
                        setPicks({ ...picks, dateColumn: asNumber(e.target.value) });
                        setGuessed(false);
                      }}
                      className={`${FIELD} mt-1`}
                    >
                      <option value="">{words.pickColumn}</option>
                      {columns.map((c) => (
                        <option key={c.index} value={c.index}>
                          {c.letter} · {c.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor={`${uid}-amount`} className={FIELD_LABEL}>
                      {words.amountColumn}
                    </label>
                    <select
                      id={`${uid}-amount`}
                      value={picks.amountColumn ?? ""}
                      onChange={(e) => {
                        setPicks({ ...picks, amountColumn: asNumber(e.target.value) });
                        setGuessed(false);
                      }}
                      aria-describedby={`${uid}-tax`}
                      className={`${FIELD} mt-1`}
                    >
                      <option value="">{words.pickColumn}</option>
                      {columns.map((c) => (
                        <option key={c.index} value={c.index}>
                          {c.letter} · {c.label}
                        </option>
                      ))}
                    </select>
                    <p id={`${uid}-tax`} className="mt-1 max-w-xs text-body text-stone-dim">
                      {words.taxHint}
                    </p>
                  </div>
                  <div>
                    <label htmlFor={`${uid}-refund`} className={FIELD_LABEL}>
                      {words.refundColumn}
                    </label>
                    {/* Never pre-filled: a column that takes money off the totals is only ever the
                        person's own pick (lib/figures/file/preview.ts, Picks.refundColumn). */}
                    <select
                      id={`${uid}-refund`}
                      value={picks.refundColumn ?? ""}
                      onChange={(e) => {
                        setPicks({ ...picks, refundColumn: asNumber(e.target.value) });
                        setGuessed(false);
                      }}
                      aria-describedby={`${uid}-refund-hint`}
                      className={`${FIELD} mt-1`}
                    >
                      <option value="">{words.noRefunds}</option>
                      {columns.map((c) => (
                        <option key={c.index} value={c.index}>
                          {c.letter} · {c.label}
                        </option>
                      ))}
                    </select>
                    <p id={`${uid}-refund-hint`} className="mt-1 max-w-xs text-body text-stone-dim">
                      {words.refundHint}
                    </p>
                  </div>
                  <div>
                    <label htmlFor={`${uid}-type`} className={FIELD_LABEL}>
                      {words.typeColumn}
                    </label>
                    <select
                      id={`${uid}-type`}
                      value={picks.typeColumn ?? ""}
                      onChange={(e) => {
                        setPicks({ ...picks, typeColumn: asNumber(e.target.value) });
                        setGuessed(false);
                      }}
                      aria-describedby={`${uid}-type-hint`}
                      className={`${FIELD} mt-1`}
                    >
                      <option value="">{words.countEveryRow}</option>
                      {columns.map((c) => (
                        <option key={c.index} value={c.index}>
                          {c.letter} · {c.label}
                        </option>
                      ))}
                    </select>
                    <p id={`${uid}-type-hint`} className="mt-1 max-w-xs text-body text-stone-dim">
                      {words.typeHint}
                    </p>
                  </div>
                  <div>
                    <label htmlFor={`${uid}-status`} className={FIELD_LABEL}>
                      {words.statusColumn}
                    </label>
                    <select
                      id={`${uid}-status`}
                      value={picks.statusColumn ?? ""}
                      onChange={(e) => {
                        setPicks({ ...picks, statusColumn: asNumber(e.target.value) });
                        setGuessed(false);
                      }}
                      aria-describedby={`${uid}-status-hint`}
                      className={`${FIELD} mt-1`}
                    >
                      <option value="">{words.countEveryRow}</option>
                      {columns.map((c) => (
                        <option key={c.index} value={c.index}>
                          {c.letter} · {c.label}
                        </option>
                      ))}
                    </select>
                    <p id={`${uid}-status-hint`} className="mt-1 max-w-xs text-body text-stone-dim">
                      {words.statusHint}
                    </p>
                  </div>
                </>
              ) : null}
            </div>
          ) : null}

          {layout === "rows" &&
          picks.headerRow !== null &&
          picks.dateColumn !== null &&
          (needsDateQuestion || detectedOrder.conflicting) ? (
            <div className="mt-3">
              {detectedOrder.conflicting ? (
                <p className="text-body text-amber">{words.conflictingDates}</p>
              ) : null}
              <label htmlFor={`${uid}-order`} className={FIELD_LABEL}>
                {words.datesWritten}
              </label>
              <select
                id={`${uid}-order`}
                value={dateOrderChoice}
                required={needsDateQuestion}
                onChange={(e) =>
                  setDateAnswer({ key: dateKey, value: e.target.value as DateOrder | "" })
                }
                className={`${FIELD} mt-1`}
              >
                <option value="">{needsDateQuestion ? words.pickOne : words.onlyClearDates}</option>
                <option value="mdy">{words.monthFirst}</option>
                <option value="dmy">{words.dayFirst}</option>
              </select>
            </div>
          ) : null}

          {/* Asked once per file when a date has a two-digit year (12-03-05): DotAmi never picks
              the century itself (the maintainer's decision, 2026-10-07). */}
          {layout === "rows" &&
          picks.headerRow !== null &&
          picks.dateColumn !== null &&
          twoDigitYear !== null ? (
            <div className="mt-3">
              <label htmlFor={`${uid}-century`} className={FIELD_LABEL}>
                {words.century.question(twoDigitYear)}
              </label>
              <select
                id={`${uid}-century`}
                value={centuryChoice}
                required
                onChange={(e) =>
                  setCenturyAnswer({
                    key: dateKey,
                    value: e.target.value === "" ? "" : (Number(e.target.value) as Century),
                  })
                }
                aria-describedby={`${uid}-century-hint`}
                className={`${FIELD} mt-1`}
              >
                <option value="">{words.pickOne}</option>
                <option value="2000">{words.century.yes(twoDigitYear)}</option>
                <option value="1900">{words.century.no(twoDigitYear)}</option>
              </select>
              <p id={`${uid}-century-hint`} className="mt-1 max-w-xs text-body text-stone-dim">
                {words.century.hint}
              </p>
            </div>
          ) : null}

          {(layout === "rows" && picks.headerRow !== null && picks.amountColumn !== null) ||
          (acrossPreview !== null && acrossPreview.monthColumns.length > 0) ? (
            <div className="mt-3 flex flex-wrap items-start gap-3">
              <div>
                <label htmlFor={`${uid}-style`} className={FIELD_LABEL}>
                  {words.amountsWritten}
                </label>
                <select
                  id={`${uid}-style`}
                  value={decimalStyle}
                  onChange={(e) =>
                    setStyleAnswer({ key: styleKey, value: e.target.value as DecimalStyle })
                  }
                  className={`${FIELD} mt-1`}
                >
                  <option value="point">1,234.56</option>
                  <option value="comma">1 234,56</option>
                </select>
              </div>
            </div>
          ) : null}

          <div className="mt-3">
            <label htmlFor={`${uid}-currency`} className={FIELD_LABEL}>
              {common.currency}
            </label>
            <input
              id={`${uid}-currency`}
              type="text"
              maxLength={3}
              value={currency}
              onChange={(e) => setCurrency(e.target.value.toUpperCase())}
              aria-invalid={currencyOk ? undefined : true}
              className={`${FIELD} mt-1 w-16 font-mono uppercase`}
            />
            {!currencyOk ? (
              <p className="mt-1 text-body text-amber">{common.currencyHelp}</p>
            ) : null}
          </div>

          {shown.state === "waiting" && shown.message ? (
            <p className="mt-3 text-body text-stone-dim">{shown.message}</p>
          ) : null}
          {shown.state === "failed" ? (
            <p role="alert" className={ALERT}>
              {shown.message}
            </p>
          ) : null}

          {shown.state === "ready" && split ? (
            <div className="mt-3 border-t border-rule-soft pt-3">
              {/* Every file: how the dates (or, across the top, the months) were read, in words, so
                  a wrong order, century or month shows. */}
              {shown.readSentence ? (
                <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1">
                  <p id={`${uid}-dates-read`} className="text-body text-paper-dim">
                    {shown.readSentence}
                  </p>
                  {/* The person confirms the dates before Review (the maintainer's decision,
                      2026-10-07). Emptied whenever the reading changes: see datesKey above. */}
                  {split.fresh.length > 0 ? (
                    <label className="flex items-center gap-2 text-body text-paper">
                      <input
                        type="checkbox"
                        checked={datesOk}
                        onChange={(e) => setDatesCheck({ key: datesKey, ticked: e.target.checked })}
                        aria-describedby={`${uid}-dates-read`}
                        className="size-4 accent-maple"
                      />
                      {datesBoxLabel}
                    </label>
                  ) : null}
                </div>
              ) : null}
              {split.fresh.length > 0 ? (
                <table className="text-body">
                  <caption className="mb-1 text-left font-mono text-label uppercase tracking-[0.14em] text-stone">
                    {common.monthlyTotalsFrom} {fileName}
                  </caption>
                  <tbody>
                    {split.fresh.map((m) => (
                      <tr key={m.periodStart}>
                        <th scope="row" className="pr-4 text-left font-normal text-stone">
                          {describePeriod(m.periodStart, m.periodEnd)}
                        </th>
                        <td className="pr-4 text-right font-mono text-paper">
                          {formatAmount(m.amountCents, code)}
                        </td>
                        <td className="text-stone-dim">
                          {m.rows} {rowWord(m.rows)}
                          {m.refunds ? ` · ${refundsText(m.refunds, code)}` : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-body text-paper-dim">{words.nothingNew}</p>
              )}

              {split.fresh.some((m) => m.refunds) ? (
                // The refund rule's one surprise, said where the totals are: a refund lowers the
                // month the money went back, which can be a later month than the sale's.
                <p className="mt-2 text-body text-stone-dim">{words.refundsNote}</p>
              ) : null}

              {split.known.length > 0 ? (
                <ul className="mt-2 space-y-0.5 text-body text-stone-dim">
                  {split.known.map((m) => (
                    <li key={m.periodStart}>
                      {describePeriod(m.periodStart, m.periodEnd)} {common.alreadyInDotAmi}
                    </li>
                  ))}
                </ul>
              ) : null}

              {leftOut.length > 0 ? (
                <div className="mt-2">
                  <p className="font-mono text-label uppercase tracking-wider text-stone-dim">
                    {common.leftOut}
                  </p>
                  <ul className="mt-1 space-y-0.5 text-body text-stone-dim">
                    {leftOut.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {split.fresh.length > MAX_FIGURES_PER_FILE ? (
                <p className={ALERT}>
                  {words.tooMany.before} {MAX_FIGURES_PER_FILE} {words.tooMany.after}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      {proposeError ? (
        <p role="alert" className={ALERT}>
          {proposeError}
        </p>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {split && split.fresh.length > 0 && split.fresh.length <= MAX_FIGURES_PER_FILE ? (
          <Pill
            variant="maple"
            size="small"
            onClick={() => void review()}
            disabled={busy || !datesOk}
            aria-describedby={datesOk ? undefined : `${uid}-confirm-first`}
          >
            {split.fresh.length === 1 ? common.reviewOne : common.reviewMany(split.fresh.length)}
          </Pill>
        ) : null}
        {split && split.fresh.length > 0 && split.fresh.length <= MAX_FIGURES_PER_FILE && !datesOk ? (
          <p id={`${uid}-confirm-first`} className="text-body text-amber">
            {words.tickOnceTheyMatch(datesBoxLabel)}
          </p>
        ) : null}
        <Pill variant="ghost" size="small" onClick={onCancel} disabled={busy}>
          {common.cancel}
        </Pill>
        {origin === "accounting" ? <p className="text-body text-stone-dim">{words.askedToAgree}</p> : null}
      </div>
    </div>
  );
}
