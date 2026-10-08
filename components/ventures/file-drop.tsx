"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";

import { Pill } from "@/components/ui";
import {
  firstSheetWithRows,
  guessPicks,
  previewSheet,
  sheetHasRows,
  type Picks,
} from "@/lib/figures/file/preview";
import { sniffFile } from "@/lib/figures/file/sniff";
import { columnsOf } from "@/lib/figures/file/table";
import { splitAlreadyKnown } from "@/lib/figures/file/totals";
import {
  MAX_FILE_BYTES,
  type Cell,
  type DateOrder,
  type DecimalStyle,
  type ReadResult,
  type Sheet,
  type SkipReason,
} from "@/lib/figures/file/types";
import type { FigureView } from "@/lib/figures/types";

import { describePeriod, formatAmount, postJson } from "./agree-prompt";

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
 */

const FIELD =
  "rounded-sm border border-rule bg-ink px-2 py-1 text-sm text-paper outline-hidden placeholder:text-stone-dim focus:border-maple-soft";
const FIELD_LABEL = "block font-mono text-[9.5px] uppercase tracking-[0.14em] text-stone";
const ALERT = "mt-2 rounded-sm border border-amber/40 bg-amber/5 px-3 py-2 text-xs text-amber";
/** The bank-file notice: the same amber look as ALERT, but it is the first thing in the panel, so no top margin. */
const BANK_NOTICE = "rounded-sm border border-amber/40 bg-amber/5 px-3 py-2 text-xs text-amber";

/** Same limits as the screen spec: how far down the column names may be, and the route's cap. */
const HEADER_ROW_CHOICES = 30;
const MAX_FIGURES_PER_FILE = 500;
const MAX_ROW_NUMBERS_SHOWN = 5;
const MAX_LABEL_CHARS = 120;

const ACCEPT =
  ".xlsx,.csv,.txt,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const ACCOUNTING_LABEL = "Accounting software or a spreadsheet you keep";
const BANK_LABEL = "A bank or credit card account";
const READ_FAILED = "DotAmi couldn't read that file. Nothing was kept.";

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
const NO_PICKS: Picks = { headerRow: null, dateColumn: null, amountColumn: null, typeColumn: null };

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
    case "payment":
      // DotAmi can't tell whether these rows are money for a sale listed elsewhere (QuickBooks) or
      // the person's own sales (their own sheet, or a deposit straight to an income account), so
      // the line says what was done and how to undo it rather than claiming a sale was counted.
      return n === 1
        ? "1 row typed Payment or Deposit, left out because a Type column is chosen (in QuickBooks that is money received for a sale listed on another row; if it is a sale of yours, choose None)"
        : `${n} rows typed Payment or Deposit, left out because a Type column is chosen (in QuickBooks those are money received for sales listed on other rows; if they are sales of yours, choose None)`;
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

  /**
   * Back to the question, forgetting everything about any file already read. Bumping the token also
   * drops a read that is still in flight, so a late result can't land on the empty screen.
   */
  function askAgain() {
    readToken.current += 1;
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
    setDateAnswer(null);
    setStyleAnswer(null);
    setCurrency("CAD");
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

    const start = firstSheetWithRows(result.sheets);
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

  // The answers the person gave count only for the column they were given for.
  const dateKey = `${sheetIndex}:${picks.headerRow}:${picks.dateColumn}`;
  const dateOrderChoice: DateOrder | "" = dateAnswer?.key === dateKey ? dateAnswer.value : "";
  const styleKey = `${sheetIndex}:${picks.headerRow}:${picks.amountColumn}`;
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
        { dateOrder: dateOrderChoice, decimalStyle: styleChoice },
        localToday(),
        !currencyOk,
      ),
    [rows, picks, dateOrderChoice, styleChoice, currencyOk],
  );
  const { detectedOrder, decimalStyle } = preview;
  const needsDateQuestion = detectedOrder.ambiguous;

  const split = useMemo(
    () => (preview.result ? splitAlreadyKnown(preview.result.months, existing, code) : null),
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
    const result = preview.result;
    if (!result) return [];
    return LEFT_OUT_ORDER.map((reason) => {
      const hits = result.skipped.filter((s) => s.reason === reason);
      return {
        reason,
        count: hits.length,
        shown: hits.slice(0, MAX_ROW_NUMBERS_SHOWN).map((s) => s.row),
      };
    }).filter((group) => group.count > 0);
  }, [preview]);

  return (
    <div
      ref={panelRef}
      role="group"
      aria-label="Add from a file"
      // A file let go anywhere on the panel must not make the browser open it. While the question
      // or the bank warning is showing, the drop is simply ignored: it is never read.
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => e.preventDefault()}
      className="rounded-sm border border-rule-soft bg-ink px-3 py-3"
    >
      {origin === "ask" ? (
        <div>
          <p id={`${uid}-origin`} className="text-xs text-paper">
            Where is this file from?
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
          <p id={`${uid}-origin-hint`} className="mt-2 text-[11px] text-stone-dim">
            Accounting software means QuickBooks, Xero, Wave, FreshBooks or similar; a spreadsheet
            you keep is one in Excel. Nothing is opened until you answer.
          </p>
        </div>
      ) : null}

      {origin === "bank" ? (
        <div role="alert" className={BANK_NOTICE}>
          <p className="font-medium">DotAmi can&apos;t add bank or card statements yet.</p>
          <p className="mt-1">
            When it can, you&apos;ll pick which deposits are business revenue, after a warning about
            what DotAmi would keep. Nothing from your file was opened or kept.
          </p>
          <div className="mt-2">
            <Pill data-autofocus variant="ghost" size="small" onClick={askAgain}>
              Back
            </Pill>
          </div>
        </div>
      ) : null}

      {origin === "accounting" ? (
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2 text-[11px] text-stone-dim">
            <span>
              From: <span className="text-paper-dim">{ACCOUNTING_LABEL}</span>
            </span>
            <Pill variant="ghost" size="small" onClick={askAgain} disabled={busy}>
              Change
            </Pill>
          </div>
          {/* The drop area exists only until a file is accepted; for the next file the question comes back. */}
          {fileName === "" ? (
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
                <Pill
                  data-autofocus
                  variant="elev"
                  size="small"
                  onClick={() => inputRef.current?.click()}
                >
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
                It&apos;s read here, on this computer, and never kept — only the monthly totals you
                agree to are saved.
              </p>
            </div>
          ) : null}
        </div>
      ) : null}

      {origin === "accounting" && phase === "reading" ? (
        <p
          data-autofocus
          tabIndex={-1}
          role="status"
          className="mt-2 text-[11px] text-stone-dim outline-hidden"
        >
          Reading {fileName}…
        </p>
      ) : null}
      {origin === "accounting" && readError ? (
        <p role="alert" className={ALERT}>
          {readError}{" "}
          <Pill data-autofocus variant="ghost" size="small" onClick={askAgain}>
            Choose another file
          </Pill>
        </p>
      ) : null}

      {origin === "accounting" && phase === "ready" ? (
        <div className="mt-3">
          {/* Focus lands here once a file is read, since the Choose a file button it came from is gone. */}
          <p data-autofocus tabIndex={-1} className="text-xs text-paper-dim outline-hidden">
            File: <span className="text-paper">{fileName}</span>
          </p>
          {/* Shown for every file: DotAmi was only ever tried on invented files laid out from each
              program's help pages (tests/fixtures/packages/), never on a real export. */}
          <p className="mt-1 text-[11px] text-stone-dim">
            Each accounting program&apos;s export was tested on files shaped from that program&apos;s
            help pages, not on real exports, so check the columns and totals.
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
                    setPicks(NO_PICKS);
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
                <div>
                  <label htmlFor={`${uid}-type`} className={FIELD_LABEL}>
                    Type column (optional)
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
                    <option value="">None — count every row</option>
                    {columns.map((c) => (
                      <option key={c.index} value={c.index}>
                        {c.letter} · {c.label}
                      </option>
                    ))}
                  </select>
                  <p id={`${uid}-type-hint`} className="mt-1 max-w-xs text-[11px] text-stone-dim">
                    Some files list a sale and the payment received for it as two rows. With a type
                    column, rows typed Payment or Deposit are left out so the sale isn&apos;t
                    counted twice. That also leaves out a Deposit that is the only record of a sale,
                    so check the left-out list. Choose None to count every row.
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
        {origin === "accounting" ? (
          <p className="text-[11px] text-stone-dim">
            You&apos;ll be asked to agree before anything counts.
          </p>
        ) : null}
      </div>
    </div>
  );
}
