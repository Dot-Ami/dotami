"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";

import { Pill } from "@/components/ui";
import { detectDecimalStyle } from "@/lib/figures/file/amounts";
import { detectDateOrder } from "@/lib/figures/file/dates";
import { sniffFile } from "@/lib/figures/file/sniff";
import { columnsOf, guessColumns, isBlankRow } from "@/lib/figures/file/table";
import { monthlyTotals, splitAlreadyKnown } from "@/lib/figures/file/totals";
import {
  MAX_FILE_BYTES,
  type Cell,
  type ColumnChoice,
  type DateOrder,
  type DecimalStyle,
  type ReadResult,
  type Sheet,
  type SkipReason,
  type TotalsResult,
} from "@/lib/figures/file/types";
import type { FigureView } from "@/lib/figures/types";

import { describePeriod, formatAmount, postJson } from "./agree-prompt";

/**
 * [8c] "Add from a file": reads a spreadsheet inside this window and proposes one total per
 * month. The file's bytes are read in memory and dropped as soon as they are turned into rows;
 * nothing from the file is sent anywhere, kept, or logged. Only the monthly totals leave this
 * component, through /api/figures/propose, and they wait in the agree prompt like every other
 * figure (docs/architecture/figures-privacy-review.md, rules 1-3).
 *
 * The parsing code (zip and XML readers) is loaded only when a file is picked, so the ideas page
 * costs nothing extra for someone who never uses this.
 */

const FIELD =
  "rounded-sm border border-rule bg-ink px-2 py-1 text-sm text-paper outline-hidden placeholder:text-stone-dim focus:border-maple-soft";
const FIELD_LABEL = "block font-mono text-[9.5px] uppercase tracking-[0.14em] text-stone";
const ALERT = "mt-2 rounded-sm border border-amber/40 bg-amber/5 px-3 py-2 text-xs text-amber";

/** Same limits as the screen spec: how far down the column names may be, and the route's cap. */
const HEADER_ROW_CHOICES = 30;
const MAX_FIGURES_PER_FILE = 500;
const MAX_ROW_NUMBERS_SHOWN = 5;
const MAX_LABEL_CHARS = 120;

const ACCEPT =
  ".xlsx,.csv,.txt,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const READ_FAILED = "DotAmi couldn't read that file. Nothing was kept.";

type Phase = "pick" | "reading" | "ready";

/** Which row holds the column names and which columns hold the dates and amounts (null = not chosen). */
interface Picks {
  headerRow: number | null;
  dateColumn: number | null;
  amountColumn: number | null;
}

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

/** True when a sheet has at least one row with something in it. */
function sheetHasRows(sheet: Sheet): boolean {
  return sheet.rows.some((row) => !isBlankRow(row));
}

/**
 * A first guess at the table's columns. With `forcedHeader`, the person has said which row holds
 * the column names, so the guess only counts if that very row reads as column names; otherwise
 * nothing is pre-filled and they pick.
 */
function guessPicks(rows: Cell[][], forcedHeader?: number): Picks | null {
  if (forcedHeader === undefined) {
    const guess = guessColumns(rows);
    return (
      guess && {
        headerRow: guess.headerRow,
        dateColumn: guess.dateColumn,
        amountColumn: guess.amountColumn,
      }
    );
  }
  // Looking from the chosen row down keeps every column index the same as in the whole sheet.
  const guess = guessColumns(rows.slice(forcedHeader));
  if (!guess || guess.headerRow !== 0) return null;
  return {
    headerRow: forcedHeader,
    dateColumn: guess.dateColumn,
    amountColumn: guess.amountColumn,
  };
}

/** The cells under the column names in one column (all of them, blank or not; callers skip what they don't need). */
function columnCells(rows: Cell[][], headerRow: number, column: number): Cell[] {
  const cells: Cell[] = [];
  for (let i = headerRow + 1; i < rows.length; i += 1) cells.push(rows[i][column] ?? null);
  return cells;
}

function rowWord(n: number): string {
  return n === 1 ? "row" : "rows";
}

/** Sentence for rows the totals leave out, e.g. "2 rows without a date DotAmi can read". */
function leftOutText(reason: SkipReason, n: number): string {
  switch (reason) {
    case "blank":
      return `${n} blank ${rowWord(n)}`;
    case "total":
      return `${n} ${rowWord(n)} that ${n === 1 ? "is a totals row" : "are totals rows"} (the file's own sum)`;
    case "no-date":
      return `${n} ${rowWord(n)} without a date DotAmi can read`;
    case "no-amount":
      return `${n} ${rowWord(n)} with a date but no amount`;
    case "bad-amount":
      return `${n} ${rowWord(n)} with an amount DotAmi can't read`;
    case "not-over":
      return `${n} ${rowWord(n)} in a month that isn't over yet`;
  }
}

/** The things that matter most come first; blank rows are the least interesting, so they go last. */
const LEFT_OUT_ORDER: SkipReason[] = [
  "no-date",
  "no-amount",
  "bad-amount",
  "total",
  "not-over",
  "blank",
];

/** What the preview works out from the person's choices: totals, or the one reason there are none yet. */
type Preview =
  | { state: "waiting"; message: string | null }
  | { state: "failed"; message: string }
  | { state: "ready"; result: TotalsResult };

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
  // Bumped for every file picked and when the screen closes, so a slow read can't land on a newer file.
  const readToken = useRef(0);

  const [dragging, setDragging] = useState(false);
  const [phase, setPhase] = useState<Phase>("pick");
  const [fileName, setFileName] = useState("");
  const [readError, setReadError] = useState<string | null>(null);

  // Only the rows are kept from the file; its bytes are gone once they are turned into rows.
  const [sheets, setSheets] = useState<Sheet[]>([]);
  const [sheetIndex, setSheetIndex] = useState(0);
  const [picks, setPicks] = useState<Picks>({
    headerRow: null,
    dateColumn: null,
    amountColumn: null,
  });
  const [guessed, setGuessed] = useState(false);
  const [dateAnswer, setDateAnswer] = useState<Answer<DateOrder | ""> | null>(null);
  const [styleAnswer, setStyleAnswer] = useState<Answer<DecimalStyle> | null>(null);
  const [currency, setCurrency] = useState("CAD");

  const [busy, setBusy] = useState(false);
  const [proposeError, setProposeError] = useState<string | null>(null);

  useEffect(() => {
    const token = readToken;
    return () => {
      token.current += 1;
    };
  }, []);

  const rows = useMemo(() => sheets[sheetIndex]?.rows ?? [], [sheets, sheetIndex]);
  const nonEmptySheets = useMemo(
    () =>
      sheets.map((sheet, index) => ({ sheet, index })).filter(({ sheet }) => sheetHasRows(sheet)),
    [sheets],
  );

  /** Fills the pickers for a sheet from a guess; `forcedHeader` when the person chose the header row. */
  function applyGuess(sheetRows: Cell[][], forcedHeader?: number) {
    const guess = guessPicks(sheetRows, forcedHeader);
    if (guess) {
      setPicks(guess);
      setGuessed(
        guess.dateColumn !== null || guess.amountColumn !== null || forcedHeader === undefined,
      );
    } else {
      setPicks({ headerRow: forcedHeader ?? null, dateColumn: null, amountColumn: null });
      setGuessed(false);
    }
  }

  async function openFile(file: File) {
    const token = ++readToken.current;
    setFileName(file.name);
    setReadError(null);
    setProposeError(null);
    setSheets([]);
    setPhase("reading");

    // Too big: say so without reading a single byte of it.
    if (file.size > MAX_FILE_BYTES) {
      const refusal = sniffFile(file.name, file.size, new Uint8Array(0));
      setReadError(refusal.ok ? READ_FAILED : refusal.error);
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

    const first = result.sheets.findIndex(sheetHasRows);
    const start = first === -1 ? 0 : first;
    setSheets(result.sheets);
    setSheetIndex(start);
    setDateAnswer(null);
    setStyleAnswer(null);
    applyGuess(result.sheets[start]?.rows ?? []);
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

  // The dates in the chosen column, and what they say about how they're written.
  const dateCells = useMemo(
    () =>
      picks.headerRow !== null && picks.dateColumn !== null
        ? columnCells(rows, picks.headerRow, picks.dateColumn)
        : [],
    [rows, picks.headerRow, picks.dateColumn],
  );
  const detectedOrder = useMemo(() => detectDateOrder(dateCells), [dateCells]);
  const dateKey = `${sheetIndex}:${picks.headerRow}:${picks.dateColumn}`;
  const dateOrderChoice: DateOrder | "" = dateAnswer?.key === dateKey ? dateAnswer.value : "";

  // The amounts in the chosen column, and the style they're mostly written in.
  const amountCells = useMemo(
    () =>
      picks.headerRow !== null && picks.amountColumn !== null
        ? columnCells(rows, picks.headerRow, picks.amountColumn)
        : [],
    [rows, picks.headerRow, picks.amountColumn],
  );
  const detectedStyle = useMemo(() => detectDecimalStyle(amountCells), [amountCells]);
  const styleKey = `${sheetIndex}:${picks.headerRow}:${picks.amountColumn}`;
  const decimalStyle: DecimalStyle =
    styleAnswer?.key === styleKey ? styleAnswer.value : detectedStyle;

  const code = currency.trim().toUpperCase();
  const currencyOk = /^[A-Z]{3}$/.test(code);

  const needsDateQuestion = detectedOrder.ambiguous;
  // Asked (or conflicting) dates follow the person's answer; otherwise whatever the dates themselves prove.
  const dateOrder: DateOrder | null =
    needsDateQuestion || detectedOrder.conflicting ? dateOrderChoice || null : detectedOrder.order;

  const preview = useMemo<Preview>(() => {
    if (picks.headerRow === null || picks.dateColumn === null || picks.amountColumn === null) {
      return { state: "waiting", message: null };
    }
    if (picks.dateColumn === picks.amountColumn) {
      return { state: "waiting", message: "The date and the amount can't be the same column." };
    }
    if (needsDateQuestion && dateOrder === null) {
      return { state: "waiting", message: "Say how the dates are written to see the totals." };
    }
    if (!currencyOk) return { state: "waiting", message: null };
    const choice: ColumnChoice = {
      headerRow: picks.headerRow,
      dateColumn: picks.dateColumn,
      amountColumn: picks.amountColumn,
      dateOrder,
      decimalStyle,
    };
    try {
      return { state: "ready", result: monthlyTotals(rows, choice, localToday()) };
    } catch (error) {
      // The only throw is the "too large" sentence, which carries no amount.
      return { state: "failed", message: error instanceof Error ? error.message : READ_FAILED };
    }
  }, [rows, picks, needsDateQuestion, dateOrder, decimalStyle, currencyOk]);

  const split = useMemo(
    () =>
      preview.state === "ready" ? splitAlreadyKnown(preview.result.months, existing, code) : null,
    [preview, existing, code],
  );

  async function review() {
    if (busy || !split) return;
    setProposeError(null);
    const label = fileName.trim().slice(0, MAX_LABEL_CHARS) || "a file";
    setBusy(true);
    const result = await postJson("/api/figures/propose", {
      ventureId,
      source: { kind: "file", label, rows: split.fresh.reduce((sum, m) => sum + m.rows, 0) },
      figures: split.fresh.map((m) => ({
        kind: "gross-revenue",
        periodStart: m.periodStart,
        periodEnd: m.periodEnd,
        amountCents: m.amountCents,
        currency: code,
        rows: m.rows,
      })),
    });
    setBusy(false);
    if (!result.ok) {
      setProposeError(result.error);
      return;
    }
    const created = (result.body as { figures?: FigureView[] } | null)?.figures;
    if (!Array.isArray(created) || created.length === 0) {
      setProposeError("That didn't go through. Nothing was changed.");
      return;
    }
    onProposed(created);
  }

  const columns = useMemo(
    () => (picks.headerRow !== null ? columnsOf(rows, picks.headerRow) : []),
    [rows, picks.headerRow],
  );
  const headerChoices = Math.min(HEADER_ROW_CHOICES, rows.length);
  const noGuess = phase === "ready" && picks.headerRow === null;
  const asNumber = (value: string): number | null => (value === "" ? null : Number(value));

  // Skipped rows grouped by reason, each with its count and the first few row numbers.
  const leftOut = useMemo(() => {
    if (preview.state !== "ready") return [];
    return LEFT_OUT_ORDER.map((reason) => {
      const hits = preview.result.skipped.filter((s) => s.reason === reason);
      return {
        reason,
        count: hits.length,
        shown: hits.slice(0, MAX_ROW_NUMBERS_SHOWN).map((s) => s.row),
      };
    }).filter((group) => group.count > 0);
  }, [preview]);

  return (
    <div className="rounded-sm border border-rule-soft bg-ink px-3 py-3">
      <div
        role="group"
        aria-label="Drop a spreadsheet here"
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
          <p className="text-xs text-paper-dim">Drop a .xlsx or .csv file here, or</p>
          <Pill variant="elev" size="small" onClick={() => inputRef.current?.click()}>
            Choose a file
          </Pill>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT}
            aria-label="Choose a file"
            tabIndex={-1}
            onChange={onPicked}
            className="sr-only"
          />
        </div>
        <p className="mt-2 text-[11px] text-stone-dim">
          It&apos;s read here, on this computer, and never kept — only the monthly totals you agree
          to are saved.
        </p>
      </div>

      {phase === "reading" ? (
        <p role="status" className="mt-2 text-[11px] text-stone-dim">
          Reading {fileName}…
        </p>
      ) : null}
      {readError ? (
        <p role="alert" className={ALERT}>
          {readError} <span className="text-stone-dim">You can choose another file above.</span>
        </p>
      ) : null}

      {phase === "ready" ? (
        <div className="mt-3">
          <p className="text-xs text-paper-dim">
            File: <span className="text-paper">{fileName}</span>
          </p>

          {nonEmptySheets.length > 1 ? (
            <div className="mt-2">
              <label htmlFor={`${uid}-sheet`} className={FIELD_LABEL}>
                Sheet
              </label>
              <select
                id={`${uid}-sheet`}
                value={sheetIndex}
                onChange={(e) => {
                  const next = Number(e.target.value);
                  setSheetIndex(next);
                  setDateAnswer(null);
                  setStyleAnswer(null);
                  applyGuess(sheets[next]?.rows ?? []);
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

          {noGuess ? (
            <p className="mt-2 text-[11px] text-amber">
              DotAmi couldn&apos;t find a row of column names in the first 30 rows.
            </p>
          ) : null}
          {guessed ? (
            <p className="mt-2 text-[11px] text-stone-dim">
              DotAmi guessed these from the column names — check them.
            </p>
          ) : null}

          <div className="mt-2 flex flex-wrap items-start gap-3">
            <div>
              <label htmlFor={`${uid}-header`} className={FIELD_LABEL}>
                Column names are in row
              </label>
              <select
                id={`${uid}-header`}
                value={picks.headerRow ?? ""}
                onChange={(e) => {
                  const next = asNumber(e.target.value);
                  if (next === null) {
                    setPicks({ headerRow: null, dateColumn: null, amountColumn: null });
                    setGuessed(false);
                    return;
                  }
                  applyGuess(rows, next);
                }}
                className={`${FIELD} mt-1`}
              >
                <option value="">Pick a row</option>
                {Array.from({ length: headerChoices }, (_, i) => (
                  <option key={i} value={i}>
                    Row {i + 1}
                  </option>
                ))}
              </select>
            </div>

            {picks.headerRow !== null ? (
              <>
                <div>
                  <label htmlFor={`${uid}-date`} className={FIELD_LABEL}>
                    Date column
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
                    <option value="">Pick a column</option>
                    {columns.map((c) => (
                      <option key={c.index} value={c.index}>
                        {c.letter} · {c.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor={`${uid}-amount`} className={FIELD_LABEL}>
                    Amount column (revenue)
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
                    <option value="">Pick a column</option>
                    {columns.map((c) => (
                      <option key={c.index} value={c.index}>
                        {c.letter} · {c.label}
                      </option>
                    ))}
                  </select>
                  <p id={`${uid}-tax`} className="mt-1 max-w-xs text-[11px] text-stone-dim">
                    If the file also has a tax column, check whether this one includes the tax.
                  </p>
                </div>
              </>
            ) : null}
          </div>

          {picks.headerRow !== null &&
          picks.dateColumn !== null &&
          (needsDateQuestion || detectedOrder.conflicting) ? (
            <div className="mt-3">
              {detectedOrder.conflicting ? (
                <p className="text-[11px] text-amber">
                  Some dates in this column only make sense month first and others only day first —
                  check the column.
                </p>
              ) : null}
              <label htmlFor={`${uid}-order`} className={FIELD_LABEL}>
                Dates are written
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
                <option value="">
                  {needsDateQuestion ? "Pick one" : "Only read dates that are clear"}
                </option>
                <option value="mdy">Month first — 03/01/2026 is March 1</option>
                <option value="dmy">Day first — 03/01/2026 is 3 January</option>
              </select>
            </div>
          ) : null}

          {picks.headerRow !== null && picks.amountColumn !== null ? (
            <div className="mt-3 flex flex-wrap items-start gap-3">
              <div>
                <label htmlFor={`${uid}-style`} className={FIELD_LABEL}>
                  Amounts are written
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
              Currency
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
              <p className="mt-1 text-[11px] text-amber">
                Write the currency as three letters, like CAD.
              </p>
            ) : null}
          </div>

          {preview.state === "waiting" && preview.message ? (
            <p className="mt-3 text-[11px] text-stone-dim">{preview.message}</p>
          ) : null}
          {preview.state === "failed" ? (
            <p role="alert" className={ALERT}>
              {preview.message}
            </p>
          ) : null}

          {preview.state === "ready" && split ? (
            <div className="mt-3 border-t border-rule-soft pt-3">
              {split.fresh.length > 0 ? (
                <table className="text-xs">
                  <caption className="mb-1 text-left font-mono text-[9.5px] uppercase tracking-[0.14em] text-stone">
                    Monthly totals from {fileName}
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
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-xs text-paper-dim">Nothing new to propose from this file.</p>
              )}

              {split.known.length > 0 ? (
                <ul className="mt-2 space-y-0.5 text-[11px] text-stone-dim">
                  {split.known.map((m) => (
                    <li key={m.periodStart}>
                      {describePeriod(m.periodStart, m.periodEnd)} — already in DotAmi with the same
                      total, not proposed again
                    </li>
                  ))}
                </ul>
              ) : null}

              {leftOut.length > 0 ? (
                <div className="mt-2">
                  <p className="font-mono text-[9px] uppercase tracking-wider text-stone-dim">
                    Left out
                  </p>
                  <ul className="mt-1 space-y-0.5 text-[11px] text-stone-dim">
                    {leftOut.map((group) => (
                      <li key={group.reason}>
                        {leftOutText(group.reason, group.count)}
                        {`: ${rowWord(group.shown.length)} ${group.shown.join(", ")}${
                          group.count > group.shown.length ? ", …" : ""
                        }`}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {split.fresh.length > MAX_FIGURES_PER_FILE ? (
                <p className={ALERT}>
                  This file has more than {MAX_FIGURES_PER_FILE} months of totals, more than DotAmi
                  proposes at once. Remove the oldest rows and drop it again.
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
          <Pill variant="maple" size="small" onClick={() => void review()} disabled={busy}>
            {split.fresh.length === 1
              ? "Review this figure"
              : `Review these ${split.fresh.length} figures`}
          </Pill>
        ) : null}
        <Pill variant="ghost" size="small" onClick={onCancel} disabled={busy}>
          Cancel
        </Pill>
        <p className="text-[11px] text-stone-dim">
          You&apos;ll be asked to agree before anything counts.
        </p>
      </div>
    </div>
  );
}
