"use client";

import { useId, useState, type ReactNode } from "react";

import { ExampleOnlyNote } from "@/components/cockpit/example-mode";
import { ReceiptLines, type ShownReceipt } from "@/components/cockpit/receipt-lines";
import { toldDay, type BoxQuestion, type NotToldRow, type ToldRow } from "@/lib/cockpit/told";
import { cockpitWords as words } from "@/lib/cockpit/words";
import { parseMoneyToCents } from "@/lib/figures/money";

/**
 * The left list (docs/architecture/future-cockpit.md § 2, "Cockpit screen as built, part 2"):
 * "What you've told DotAmi", every answer the person gave with its day, what it unlocked (road evaluation
 * without it against with it), Change and Take back; and "Not told yet", each missing answer with the one
 * thing it would unlock and "I don't know". The rows are worked out by lib/cockpit/told.ts; this draws
 * them and hands every click to the page, which saves it and shows the receipt at the top.
 *
 * After an answer here the row or box the person used is gone, so the receipt takes the keyboard focus and
 * scrolls into view (2026-10-12, after review: it sat out of sight above the row, and the focus fell to
 * the page). Every button names its row or question for a screen reader.
 */

/** Questions not told yet that show before "n more". */
const VISIBLE_QUESTIONS = 5;

const heading = "font-mono text-small uppercase tracking-[0.14em] text-stone";
const small = "rounded-full border border-rule px-2 py-0.5 text-small text-stone hover:bg-ink2 disabled:opacity-50";

export function ToldList({
  person = null,
  rows,
  notTold,
  receipt,
  canSave,
  error,
  onChange,
  onTakeBack,
  onAnswer,
  boxFor,
}: {
  /** An invented example person's name: the list is then "What <name> told DotAmi", never the viewer's. */
  person?: string | null;
  rows: readonly ToldRow[];
  notTold: readonly NotToldRow[];
  /** The last answer's receipt, when it was given here; null for none. */
  receipt: ShownReceipt | null;
  canSave: boolean;
  error: string | null;
  /** "Change" for a row answered elsewhere (a step, the skills list, Compare, the intake, Your ideas). */
  onChange: (row: ToldRow) => void;
  onTakeBack: (row: ToldRow) => void;
  /** A question answered elsewhere: its list, or Compare. */
  onAnswer: (row: NotToldRow) => void;
  /**
   * The one-question box for a question, drawn by the page, which knows how to save each answer. `close`
   * shuts it after a save; `dontKnow` is its I don't know, which on a question also folds the question away.
   */
  boxFor: (question: BoxQuestion, close: () => void, dontKnow: () => void) => ReactNode;
}) {
  // Which row has its box open: a told row's Change, or a question's Answer.
  const [open, setOpen] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  // "I don't know" keeps nothing: the question folds away for this visit only.
  const [dontKnow, setDontKnow] = useState<ReadonlySet<string>>(new Set());
  const [showDontKnow, setShowDontKnow] = useState(false);

  const asked = notTold.filter((q) => showDontKnow || !dontKnow.has(q.id));
  const folded = notTold.filter((q) => dontKnow.has(q.id)).length;
  const visible = showAll ? asked : asked.slice(0, VISIBLE_QUESTIONS);
  const toldRegion = person ? words.example.theirs.toldRegion(person) : words.told.region;

  return (
    <div className="flex flex-col gap-4">
      <section aria-label={toldRegion}>
        <h2 className={heading}>{toldRegion}</h2>
        <p className="mt-0.5 text-body text-stone-dim">
          {person ? words.example.theirs.toldCount(person, rows.length) : words.told.count(rows.length)}
        </p>
        {/* On the invented example the buttons below are disabled; this says why. */}
        <ExampleOnlyNote className="mt-1 text-body text-amber" />
        {error ? (
          <p role="alert" className="mt-2 rounded-sm border border-amber/40 bg-amber/5 px-2.5 py-2 text-body text-amber">
            {error}
          </p>
        ) : null}
        {receipt ? (
          <div className="mt-2">
            <ReceiptLines {...receipt} />
          </div>
        ) : null}
        {rows.length === 0 ? <p className="mt-2 text-body text-stone">{words.told.none}</p> : null}
        <ul className="mt-2 space-y-2">
          {rows.map((row) => {
            const boxOpen = open === `told:${row.id}` && row.change.kind === "box";
            return (
              <li key={row.id} className="rounded-sm border border-rule-soft bg-ink2 p-2">
                <p className="text-body leading-snug text-paper">{row.said}</p>
                <p className="mt-0.5 font-mono text-label text-stone">
                  {toldDay(row)}
                </p>
                <Unlocked row={row} />
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {row.change.kind !== "none" ? (
                    <button
                      type="button"
                      className={small}
                      disabled={!canSave}
                      aria-label={words.told.changeFor(row.said)}
                      onClick={() => (row.change.kind === "box" ? setOpen(boxOpen ? null : `told:${row.id}`) : onChange(row))}
                    >
                      {words.told.change}
                    </button>
                  ) : null}
                  {row.takeBack.kind !== "none" ? (
                    <button type="button" className={small} disabled={!canSave} aria-label={words.told.takeBackFor(row.said)} onClick={() => onTakeBack(row)}>
                      {words.told.takeBack}
                    </button>
                  ) : null}
                </div>
                {row.takeBack.kind === "none" ? (
                  <p className="mt-1 text-small text-stone-dim">
                    {row.takeBack.why === "required" ? words.told.required : row.takeBack.why === "figures" ? words.told.figuresElsewhere : words.told.noRoute}
                  </p>
                ) : null}
                {boxOpen && row.change.kind === "box" ? <div className="mt-2">{boxFor(row.change.question, () => setOpen(null), () => setOpen(null))}</div> : null}
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-label={words.notTold.region}>
        <h2 className={heading}>{words.notTold.region}</h2>
        <p className="mt-0.5 text-small text-stone-dim">{words.notTold.order}</p>
        {asked.length === 0 ? <p className="mt-2 text-body text-stone">{words.notTold.none}</p> : null}
        <ul className="mt-2 space-y-2">
          {visible.map((q) => {
            const boxOpen = open === `ask:${q.id}`;
            const fold = () => {
              setOpen(null);
              setDontKnow((s) => new Set([...s, q.id]));
            };
            const answerWord =
              q.answer === "box"
                ? words.notTold.answer
                : q.answer === "skills"
                  ? words.notTold.openSkills
                  : q.answer === "money"
                    ? words.notTold.openMoney
                    : words.notTold.compare;
            return (
              <li key={q.id} className="rounded-sm border border-rule-soft bg-ink2 p-2">
                <p className="text-body leading-snug text-paper">
                  {q.question} <span className="text-stone">{`→ ${words.notTold.unlocks(q.unlocks)}`}</span>
                </p>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  <button
                    type="button"
                    className={small}
                    disabled={!canSave}
                    aria-label={words.notTold.forQuestion(answerWord, q.question)}
                    onClick={() => (q.answer === "box" ? setOpen(boxOpen ? null : `ask:${q.id}`) : onAnswer(q))}
                  >
                    {answerWord}
                  </button>
                  {!dontKnow.has(q.id) ? (
                    <button type="button" className={small} aria-label={words.notTold.forQuestion(words.notTold.dontKnow, q.question)} onClick={fold}>
                      {words.notTold.dontKnow}
                    </button>
                  ) : null}
                </div>
                {boxOpen && q.answer === "box" ? <div className="mt-2">{boxFor(q.id as BoxQuestion, () => setOpen(null), fold)}</div> : null}
              </li>
            );
          })}
        </ul>
        <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-small">
          {asked.length > VISIBLE_QUESTIONS ? (
            <button type="button" className="text-stone underline hover:text-paper" onClick={() => setShowAll((v) => !v)}>
              {showAll ? words.notTold.fewer : words.notTold.more(asked.length - VISIBLE_QUESTIONS)}
            </button>
          ) : null}
          {folded > 0 && !showDontKnow ? (
            <span className="text-stone-dim">
              {words.notTold.dontKnowFolded(folded)} ·{" "}
              <button type="button" className="text-stone underline hover:text-paper" onClick={() => setShowDontKnow(true)}>
                {words.notTold.showThem}
              </button>
            </span>
          ) : null}
        </div>
      </section>
    </div>
  );
}

/** What a row's answer unlocked: its receipt lines, or why there is none. */
function Unlocked({ row }: { row: ToldRow }) {
  if (row.unlocked === null) return null;
  return (
    <div className="mt-1">
      <p className="font-mono text-label uppercase tracking-[0.12em] text-stone-dim">{words.told.unlocked}</p>
      {row.unlocked.length === 0 ? (
        <p className="text-body text-stone">{words.told.nothingChanged}</p>
      ) : (
        <div className="space-y-0.5">
          {row.unlocked.map((line) => (
            <p key={line} className="text-body leading-snug text-stone">
              {line}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

/** One control in the one-question box. */
export type BoxControl =
  | { kind: "month"; min: string; value: string | null }
  | { kind: "dollars"; label: string; value: number | null }
  | { kind: "money" }
  | { kind: "choice"; options: readonly { id: string; label: string }[]; value: string | null };

/**
 * The one-question box (§ 2, "Overlays on top of everything"): one question, its why line, one control,
 * Save and I don't know. Save hands the value to the page, which keeps it and shows the receipt; a
 * refusal shows here in the server's words. I don't know keeps nothing.
 */
export function QuestionBox({
  title,
  why,
  control,
  canSave,
  onSave,
  onDontKnow,
}: {
  title: string;
  why: string;
  control: BoxControl;
  canSave: boolean;
  /** Keeps the answer: a month "2029-05", whole dollars, cents, or an option's id. Resolves to an error, or null. */
  onSave: (value: string | number) => Promise<string | null>;
  /** I don't know; left out, the box has none (the Incorporating step's own estimate box). */
  onDontKnow?: () => void;
}) {
  const id = useId();
  const [text, setText] = useState(
    control.kind === "month" ? (control.value ?? "") : control.kind === "dollars" && control.value !== null ? String(control.value) : "",
  );
  const [choice, setChoice] = useState<string | null>(control.kind === "choice" ? control.value : null);
  const [problem, setProblem] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    let value: string | number;
    if (control.kind === "choice") {
      if (choice === null) return setProblem(words.questions.box.pickOne);
      value = choice;
    } else if (control.kind === "month") {
      if (!/^\d{4}-\d{2}$/.test(text)) return setProblem(words.questions.box.monthNeeded);
      value = text;
    } else if (control.kind === "dollars") {
      const plain = text.trim().replace(/,/g, "");
      if (!/^\d+$/.test(plain)) return setProblem(words.questions.box.wholeDollars);
      value = Number(plain);
    } else {
      const cents = parseMoneyToCents(text);
      if (cents === null) return setProblem(words.amounts.unreadable);
      if (cents < 0) return setProblem(words.amounts.negative);
      value = cents;
    }
    setBusy(true);
    setProblem(null);
    const refused = await onSave(value);
    setBusy(false);
    if (refused) setProblem(refused);
  }

  return (
    <form onSubmit={(e) => void save(e)} className="flex flex-col gap-1.5 rounded-sm border border-rule bg-ink p-2.5">
      <p id={`${id}-title`} className="text-body font-semibold text-paper">
        {title}
      </p>
      <p id={`${id}-why`} className="text-small text-stone">
        {why}
      </p>
      {control.kind === "choice" ? (
        <fieldset aria-labelledby={`${id}-title`} className="flex flex-wrap gap-x-3 gap-y-1">
          {control.options.map((option) => (
            <label key={option.id} className="flex items-center gap-1.5 text-body text-paper">
              <input type="radio" name={`${id}-choice`} checked={choice === option.id} onChange={() => setChoice(option.id)} className="accent-[#c2593a]" />
              {option.label}
            </label>
          ))}
        </fieldset>
      ) : (
        <>
          <label htmlFor={`${id}-value`} className="font-mono text-label uppercase tracking-wider text-stone">
            {control.kind === "month" ? words.questions.box.month : control.kind === "dollars" ? control.label : words.amounts.amount}
          </label>
          <input
            id={`${id}-value`}
            type={control.kind === "month" ? "month" : "text"}
            inputMode={control.kind === "month" ? undefined : "decimal"}
            min={control.kind === "month" ? control.min : undefined}
            value={text}
            onChange={(e) => setText(e.target.value)}
            aria-describedby={`${id}-why`}
            aria-invalid={problem ? true : undefined}
            className="w-40 rounded-sm border border-rule bg-ink2 px-2 py-1 font-mono text-body text-paper outline-hidden focus:border-maple-soft"
          />
        </>
      )}
      {control.kind === "money" ? <p className="text-small text-stone">{words.amounts.agreeFirst}</p> : null}
      {problem ? (
        <p role="alert" className="text-body text-amber">
          {problem}
        </p>
      ) : null}
      <div className="flex gap-1.5">
        <button type="submit" disabled={!canSave || busy} className="rounded-full border border-maple bg-maple px-2.5 py-0.5 text-body text-[#fff8ee] disabled:opacity-50">
          {words.questions.box.save}
        </button>
        {/* A box drawn where nothing is being asked (a step panel's own box) has no I don't know. */}
        {onDontKnow ? (
          <button type="button" onClick={onDontKnow} className={small}>
            {words.questions.box.dontKnow}
          </button>
        ) : null}
      </div>
    </form>
  );
}
