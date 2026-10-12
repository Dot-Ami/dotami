"use client";

import Link from "next/link";
import { useId, useState, type ReactNode } from "react";

import { IncomeAgreePrompt } from "@/components/front-door/income-agree-prompt";
import { useJourney } from "@/components/shared/journey-provider";
import { Chip, GhostLink, Pill, WordMark } from "@/components/ui";
import { AMOUNT_HELP } from "@/components/ventures/agree-prompt";
import { roadsV2026 } from "@/lib/engines/roads/v2026";
import { parseMoneyToCents } from "@/lib/figures/money";
import { useLocalToday } from "@/lib/figures/use-local-today";
import { isAnswered, questionAsked, readyToPick, type DestinationDraft } from "@/lib/front-door/draft";
import { DESTINATION_QUESTIONS, type DestinationQuestion, type DestinationQuestionId } from "@/lib/front-door/questions";
import { destinationReceipt, incomeReceipt, lookingForReceipt, placeName, placeReceipt } from "@/lib/front-door/receipts";
import { destinationWords as words } from "@/lib/front-door/words";
import type { PlaceCode } from "@/lib/places/codes";
import { STATEMENT_FULL_NOTE } from "@/lib/person/types";

/**
 * *Your destination* (`/start`; docs/ui-spec/start/): the four questions of lib/front-door/questions.ts,
 * one at a time, each answered one staying on screen with the answer shown back, its one-line receipt and
 * Change. The screen draws whatever that list holds; every sentence is from lib/front-door/words.ts, and
 * every receipt from lib/front-door/receipts.ts, worked out from the answer and the catalogs.
 *
 * Question 1 is kept at once as the person's destination (a dated, word-for-word statement); question 4 is
 * proposed and counts only once agreed in the prompt. Questions 2 and 3 wait in the tab until a future is
 * picked (/futures), which keeps them on the idea.
 */
export function DestinationPage() {
  const { intake, setIntake, hydrated } = useJourney();
  const draft: DestinationDraft = intake.destination ?? {};
  const today = useLocalToday();
  // A question the person chose to change; otherwise the first one not answered is asked.
  const [changing, setChanging] = useState<DestinationQuestionId | null>(null);
  const asked = questionAsked(draft, changing);
  const total = DESTINATION_QUESTIONS.length;
  const askedIndex = DESTINATION_QUESTIONS.findIndex((q) => q.id === asked);

  function answer(change: Partial<DestinationDraft>) {
    setIntake((prev) => ({ ...prev, destination: { ...prev.destination, ...change } }));
    setChanging(null);
  }

  return (
    <div className="flex min-h-[calc(100vh-2.5rem)] flex-col bg-ink">
      <nav className="flex items-center gap-6 border-b border-rule-soft px-8 py-[18px]">
        <GhostLink href="/" tone="stone">
          {words.back}
        </GhostLink>
        <WordMark />
        <p className="ml-auto font-mono text-[10px] uppercase tracking-[0.14em] text-stone">
          {asked === null ? words.allAnswered(total) : words.navLabel(askedIndex + 1, total)}
        </p>
      </nav>

      <main className="mx-auto w-full max-w-2xl flex-1 space-y-6 px-4 py-10 sm:px-8">
        {/* The tab's answers are read after the first paint; asking before then could ask one already answered. */}
        {hydrated
          ? DESTINATION_QUESTIONS.map((question) =>
              asked === question.id ? (
                <AskedQuestion key={question.id} question={question} draft={draft} today={today} onAnswer={answer} />
              ) : isAnswered(draft, question.id) ? (
                <AnsweredQuestion key={question.id} question={question} draft={draft} onChange={() => setChanging(question.id)} />
              ) : null,
            )
          : null}

        {hydrated && asked === null && readyToPick(draft) ? (
          <div className="flex justify-end">
            <Link
              href="/futures"
              className="inline-flex items-center gap-2 rounded-full border border-maple bg-maple px-4 py-2 text-xs font-medium tracking-wide text-[#fff8ee]"
            >
              {words.next}
            </Link>
          </div>
        ) : null}
      </main>
    </div>
  );
}

/** The question's words, why it is asked and what it unlocks. The heading names the answer controls. */
function QuestionHead({ question, headingId }: { question: DestinationQuestion; headingId: string }) {
  return (
    <header>
      <h2 id={headingId} className="font-serif text-[22px] font-bold leading-[1.2] tracking-tight text-paper">
        {question.ask}
      </h2>
      <p className="mt-2 text-[12px] leading-snug text-stone">{words.why(question.why)}</p>
      <p className="mt-0.5 text-[12px] leading-snug text-stone">{words.unlocks(question.unlocks)}</p>
    </header>
  );
}

function AskedQuestion({
  question,
  draft,
  today,
  onAnswer,
}: {
  question: DestinationQuestion;
  draft: DestinationDraft;
  today: string;
  onAnswer: (change: Partial<DestinationDraft>) => void;
}) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className="space-y-4 rounded-lg border border-maple-soft bg-ink2 p-5">
      <QuestionHead question={question} headingId={headingId} />
      {question.answer.kind === "own-words" ? (
        <OwnWords question={question} draft={draft} today={today} labelledBy={headingId} onAnswer={onAnswer} />
      ) : question.answer.kind === "one-choice" ? (
        <div className="flex flex-wrap gap-2">
          {question.answer.choices.map((choice) => (
            <Chip key={choice.id} active={draft.lookingFor === choice.id} onClick={() => onAnswer({ lookingFor: choice.id })}>
              {choice.label}
            </Chip>
          ))}
        </div>
      ) : question.answer.kind === "place" ? (
        <PlacePicker places={question.answer.places} draft={draft} labelledBy={headingId} onAnswer={onAnswer} />
      ) : (
        <IncomeAmount question={question} today={today} labelledBy={headingId} onAnswer={onAnswer} />
      )}
    </section>
  );
}

function OwnWords({
  question,
  draft,
  today,
  labelledBy,
  onAnswer,
}: {
  question: DestinationQuestion;
  draft: DestinationDraft;
  today: string;
  labelledBy: string;
  onAnswer: (change: Partial<DestinationDraft>) => void;
}) {
  const before = draft.destination && draft.destination.kept !== "dont-know" ? draft.destination.text : "";
  const [text, setText] = useState(before);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const maxChars = question.answer.kind === "own-words" ? question.answer.maxChars : 0;

  async function keep() {
    const typed = text.trim();
    if (typed.length === 0 || busy) return;
    setBusy(true);
    setError(null);
    try {
      // The person's own day: a statement's day is the day they say they said it.
      const res = await fetch("/api/person/statements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: typed, saidAt: today, kind: "destination" }),
      });
      const body = (await res.json().catch(() => null)) as { statement?: { text: string; saidAt: string }; error?: string } | null;
      if (res.ok && body?.statement) {
        onAnswer({ destination: { kept: "saved", text: body.statement.text, saidAt: body.statement.saidAt } });
      } else if (res.status === 503) {
        // No database: the words stay in this tab, and the receipt says so.
        onAnswer({ destination: { kept: "tab-only", text: typed, saidAt: today } });
      } else {
        setError(body?.error ?? words.receipts.destinationTabOnly);
      }
    } catch {
      onAnswer({ destination: { kept: "tab-only", text: typed, saidAt: today } });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <textarea
        aria-labelledby={labelledBy}
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        maxLength={maxChars}
        className="min-h-[88px] w-full resize-y rounded-[10px] border border-rule bg-ink px-4 py-3 text-[15px] leading-relaxed text-paper outline-hidden focus:border-maple-soft"
      />
      {text.length >= maxChars ? (
        <p role="status" className="text-[12px] text-amber">
          {STATEMENT_FULL_NOTE}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="text-[12px] text-amber">
          {error}
        </p>
      ) : null}
      <div className="flex flex-wrap justify-end gap-3">
        {question.skip ? (
          <Pill variant="ghost" onClick={() => onAnswer({ destination: { kept: "dont-know" } })} disabled={busy}>
            {question.skip}
          </Pill>
        ) : null}
        <Pill variant="maple" onClick={() => void keep()} disabled={busy || text.trim().length === 0}>
          {busy ? words.saving : words.keepWords}
        </Pill>
      </div>
    </div>
  );
}

function PlacePicker({
  places,
  draft,
  labelledBy,
  onAnswer,
}: {
  places: readonly PlaceCode[];
  draft: DestinationDraft;
  labelledBy: string;
  onAnswer: (change: Partial<DestinationDraft>) => void;
}) {
  const [place, setPlace] = useState<PlaceCode | "">(draft.place ?? "");
  return (
    <div className="flex flex-wrap items-center gap-3">
      <select
        aria-labelledby={labelledBy}
        value={place}
        onChange={(e) => setPlace(e.target.value as PlaceCode | "")}
        className="w-full max-w-sm rounded-sm border border-rule bg-ink px-3 py-2.5 text-sm text-paper outline-hidden focus:border-maple-soft"
      >
        <option value="">{words.choosePlace}</option>
        {places.map((code) => (
          <option key={code} value={code}>
            {placeName(code)}
          </option>
        ))}
      </select>
      <Pill variant="maple" onClick={() => place !== "" && onAnswer({ place })} disabled={place === ""}>
        {words.usePlace}
      </Pill>
    </div>
  );
}

function IncomeAmount({
  question,
  today,
  labelledBy,
  onAnswer,
}: {
  question: DestinationQuestion;
  today: string;
  labelledBy: string;
  onAnswer: (change: Partial<DestinationDraft>) => void;
}) {
  const [text, setText] = useState("");
  const [problem, setProblem] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // The number waiting in the agree prompt, as the propose route gave it back.
  const [proposal, setProposal] = useState<{ id: string; amountCents: number } | null>(null);

  async function keep() {
    if (busy) return;
    const cents = parseMoneyToCents(text);
    if (cents === null || cents < 0) {
      setProblem(AMOUNT_HELP);
      return;
    }
    setBusy(true);
    setProblem(null);
    try {
      const res = await fetch("/api/person-figures/propose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "income-wanted", amountCents: cents }),
      });
      const body = (await res.json().catch(() => null)) as { figures?: { id: string; amountCents: number }[]; error?: string } | null;
      const proposed = body?.figures?.[0];
      if (res.ok && proposed) setProposal({ id: proposed.id, amountCents: proposed.amountCents });
      else setProblem(body?.error ?? words.receipts.destinationTabOnly);
    } catch {
      setProblem(words.receipts.destinationTabOnly);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center rounded-sm border border-rule bg-ink focus-within:border-maple-soft">
          <span className="pl-3 text-sm text-stone-dim">$</span>
          <input
            type="text"
            inputMode="decimal"
            aria-labelledby={labelledBy}
            aria-invalid={problem ? true : undefined}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setProblem(null);
            }}
            className="w-40 bg-transparent px-2 py-2 text-sm text-paper outline-hidden"
          />
        </div>
        <span className="text-[12px] text-stone">{words.perYear}</span>
      </div>
      {problem ? (
        <p role="alert" className="text-[12px] text-amber">
          {problem}
        </p>
      ) : null}
      <div className="flex flex-wrap justify-end gap-3">
        {question.skip ? (
          <Pill variant="ghost" onClick={() => onAnswer({ incomeWanted: { kind: "skipped" } })} disabled={busy}>
            {question.skip}
          </Pill>
        ) : null}
        <Pill variant="maple" onClick={() => void keep()} disabled={busy || text.trim().length === 0}>
          {busy ? words.saving : words.keepAmount}
        </Pill>
      </div>
      {proposal ? (
        <IncomeAgreePrompt
          proposal={proposal}
          today={today}
          onAgreed={(amountCents) => onAnswer({ incomeWanted: { kind: "agreed", amountCents, agreedOn: today } })}
          onTurnedDown={() => onAnswer({ incomeWanted: { kind: "turned-down" } })}
          onClose={() => setProposal(null)}
        />
      ) : null}
    </div>
  );
}

/** An answered question: its words, the answer shown back, its receipt (read out by a screen reader) and Change. */
function AnsweredQuestion({ question, draft, onChange }: { question: DestinationQuestion; draft: DestinationDraft; onChange: () => void }) {
  const headingId = useId();
  let shown: ReactNode = null;
  let receipt = "";
  if (question.id === "destination" && draft.destination) {
    const kept = draft.destination;
    shown =
      kept.kept === "dont-know" ? (
        <p className="text-sm text-paper-dim">{question.skip}</p>
      ) : (
        <>
          <p className="font-serif text-[17px] italic leading-snug text-paper">“{kept.text}”</p>
          <p className="text-[11.5px] text-stone">{words.yourWords(kept.saidAt)}</p>
        </>
      );
    receipt = destinationReceipt(kept);
  } else if (question.id === "looking-for" && draft.lookingFor && question.answer.kind === "one-choice") {
    const choice = question.answer.choices.find((c) => c.id === draft.lookingFor);
    shown = <p className="text-sm text-paper">{choice?.label}</p>;
    receipt = lookingForReceipt(draft.lookingFor, roadsV2026);
  } else if (question.id === "place" && draft.place) {
    shown = <p className="text-sm text-paper">{words.answeredPlace(placeName(draft.place))}</p>;
    receipt = placeReceipt(draft.place, roadsV2026);
  } else if (question.id === "income-wanted" && draft.incomeWanted) {
    const income = draft.incomeWanted;
    // A number turned down in the prompt shows nothing here: its receipt says it wasn't kept.
    shown =
      income.kind === "agreed" ? (
        <p className="text-sm text-paper">{words.answeredAmount(income.amountCents)}</p>
      ) : income.kind === "skipped" ? (
        <p className="text-sm text-paper-dim">{words.skipped}</p>
      ) : null;
    receipt = incomeReceipt(income);
  }

  return (
    <section aria-labelledby={headingId} className="space-y-2 rounded-lg border border-rule bg-ink2 px-5 py-4">
      <div className="flex items-start justify-between gap-4">
        <h2 id={headingId} className="text-[13px] font-semibold text-paper-dim">
          {question.ask}
        </h2>
        <button type="button" onClick={onChange} className="shrink-0 border-b border-rule-soft pb-0.5 text-xs text-stone hover:text-paper">
          {words.change}
        </button>
      </div>
      {shown}
      <p role="status" className="text-[12px] text-sage">
        {receipt}
      </p>
    </section>
  );
}
