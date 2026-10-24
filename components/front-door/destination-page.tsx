"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode, type RefObject } from "react";

import { IncomeAgreePrompt } from "@/components/front-door/income-agree-prompt";
import { useJourney } from "@/components/shared/journey-provider";
import { Chip, GhostLink, Pill, WordMark } from "@/components/ui";
import { AMOUNT_HELP } from "@/components/ventures/agree-prompt";
import { roadsV2026 } from "@/lib/engines/roads/v2026";
import { parseMoneyToCents } from "@/lib/figures/money";
import { useLocalToday } from "@/lib/figures/use-local-today";
import {
  isAnswered,
  questionAsked,
  readyToPick,
  withKept,
  type DestinationDraft,
  type KeptOnRecord,
} from "@/lib/front-door/draft";
import { listedRoads } from "@/lib/front-door/futures";
import {
  DESTINATION_QUESTIONS,
  type DestinationQuestion,
  type DestinationQuestionId,
} from "@/lib/front-door/questions";
import {
  destinationReceipt,
  incomeReceipt,
  lookingForReceipt,
  placeName,
  placeReceipt,
  provinceOfPlace,
  type StillAgreed,
} from "@/lib/front-door/receipts";
import { destinationWords as words } from "@/lib/front-door/words";
import type { PlaceCode } from "@/lib/places/codes";
import { STATEMENT_FULL_NOTE } from "@/lib/person/types";

/**
 * Every count on this page is of the futures Pick a future lists for the place answered (lib/front-door/futures.ts):
 * outside Alberta that includes the federal steps for any business in Canada (task 28d).
 */
const listedFor = (draft: DestinationDraft) => listedRoads(roadsV2026, draft.place ? provinceOfPlace(draft.place) : null);

/**
 * *Your destination* (`/start`; docs/ui-spec/start/): the four questions of lib/front-door/questions.ts,
 * one at a time, each answered one staying on screen with the answer shown back, its one-line receipt and
 * Change. The screen draws whatever that list holds; every sentence is from lib/front-door/words.ts, and
 * every receipt from lib/front-door/receipts.ts, worked out from the answer and the catalogs.
 *
 * Question 1 is kept at once as the person's destination (a dated, word-for-word statement); question 4 is
 * proposed and counts only once agreed in the prompt. Questions 2 and 3 wait in the window's memory
 * (lib/journey/held-journey.ts; never in window storage), and each future picked (/futures) keeps them on its
 * idea; nothing reads them back from there, so a page loaded afresh asks them again. What the data file already
 * holds for 1 and 4 (`kept`, read on the server when the page is drawn) counts as answered, so a returning
 * person isn't asked again.
 */
export function DestinationPage({ kept }: { kept: KeptOnRecord }) {
  const { intake, setIntake, hydrated } = useJourney();
  const draft: DestinationDraft = withKept(intake.destination ?? {}, kept);
  const today = useLocalToday();
  // A question the person chose to change; otherwise the first one not answered is asked.
  const [changing, setChanging] = useState<DestinationQuestionId | null>(null);
  // The newest words and agreed income in the data file, as far as this page knows: the server's read,
  // then whatever is kept here. "I don't know yet" and "Skip" delete neither, and their receipts say so.
  const [keptWords, setKeptWords] = useState(kept.destination);
  const [agreedIncome, setAgreedIncome] = useState<StillAgreed | null>(kept.incomeWanted);
  // Focus moves on only after something the person did, never on the first paint.
  const [moveFocus, setMoveFocus] = useState(false);
  const nextLinkRef = useRef<HTMLAnchorElement>(null);
  const asked = questionAsked(draft, changing);
  const total = DESTINATION_QUESTIONS.length;
  const askedIndex = DESTINATION_QUESTIONS.findIndex((q) => q.id === asked);

  function answer(change: Partial<DestinationDraft>) {
    setIntake((prev) => ({ ...prev, destination: { ...prev.destination, ...change } }));
    if (change.destination?.kept === "saved") {
      setKeptWords({ text: change.destination.text, saidAt: change.destination.saidAt });
    }
    if (change.incomeWanted?.kind === "agreed") {
      setAgreedIncome({ amountCents: change.incomeWanted.amountCents, agreedOn: change.incomeWanted.agreedOn });
    }
    setChanging(null);
    setMoveFocus(true);
  }

  function change(id: DestinationQuestionId) {
    setChanging(id);
    setMoveFocus(true);
  }

  // With every question answered, focus goes to the way on (the asked question's heading takes it otherwise).
  const allAnswered = hydrated && asked === null && readyToPick(draft);
  useEffect(() => {
    if (moveFocus && allAnswered) nextLinkRef.current?.focus();
  }, [moveFocus, allAnswered]);

  return (
    <div className="flex h-[calc(100vh-2.5rem)] flex-col bg-ink">
      {/* data-region marks the blocks the clutter limit counts (docs/ui-spec/README.md, "The layout rule"). */}
      <nav data-region="nav" className="flex items-center gap-6 border-b border-rule-soft px-8 py-[18px]">
        <GhostLink href="/" tone="stone">
          {words.back}
        </GhostLink>
        <WordMark />
        <p className="ml-auto font-mono text-small uppercase tracking-[0.14em] text-stone">
          {asked === null ? words.allAnswered(total) : words.navLabel(askedIndex + 1, total)}
        </p>
      </nav>

      <main className="min-h-0 flex-1 overflow-y-auto">
        <div data-region="questions" className="mx-auto w-full max-w-2xl space-y-6 px-4 py-10 sm:px-8">
          {/* The page's name for a screen reader; the nav above already says it on screen. */}
          <h1 className="sr-only">{words.pageHeading}</h1>
          {/* The tab's answers are read after the first paint; asking before then could ask one already answered. */}
          {hydrated
            ? DESTINATION_QUESTIONS.map((question) =>
                asked === question.id ? (
                  <AskedQuestion
                    key={question.id}
                    question={question}
                    draft={draft}
                    today={today}
                    keptWords={keptWords}
                    agreedIncome={agreedIncome}
                    focusOnMount={moveFocus}
                    onAnswer={answer}
                  />
                ) : isAnswered(draft, question.id) ? (
                  <AnsweredQuestion
                    key={question.id}
                    question={question}
                    draft={draft}
                    onChange={() => change(question.id)}
                  />
                ) : null,
              )
            : null}

          {allAnswered ? (
            <div className="flex justify-end">
              <Link
                ref={nextLinkRef}
                href="/futures"
                className="inline-flex items-center gap-2 rounded-full border border-maple bg-maple px-4 py-2 text-body font-medium tracking-wide text-[#fff8ee]"
              >
                {words.next}
              </Link>
            </div>
          ) : null}
        </div>
      </main>
    </div>
  );
}

/** The question's words, why it is asked and what it unlocks. The heading names the answer controls. */
function QuestionHead({
  question,
  headingId,
  headingRef,
}: {
  question: DestinationQuestion;
  headingId: string;
  headingRef?: RefObject<HTMLHeadingElement | null>;
}) {
  return (
    <header>
      {/* tabIndex -1: focus is moved here after each answer, so a keyboard or screen reader user meets
          the next question instead of the page body. It isn't in the Tab order. */}
      <h2
        id={headingId}
        ref={headingRef}
        tabIndex={headingRef ? -1 : undefined}
        className="font-serif text-2xl font-bold leading-[1.2] tracking-tight text-paper outline-hidden"
      >
        {question.ask}
      </h2>
      <p className="mt-2 text-body leading-snug text-stone">{words.why(question.why)}</p>
      <p className="mt-0.5 text-body leading-snug text-stone">
        {words.unlocks(question.unlocks)}
      </p>
    </header>
  );
}

function AskedQuestion({
  question,
  draft,
  today,
  keptWords,
  agreedIncome,
  focusOnMount,
  onAnswer,
}: {
  question: DestinationQuestion;
  draft: DestinationDraft;
  today: string;
  keptWords: KeptOnRecord["destination"];
  agreedIncome: StillAgreed | null;
  /** True once the person has answered or chosen Change: the heading takes focus as the question opens. */
  focusOnMount: boolean;
  onAnswer: (change: Partial<DestinationDraft>) => void;
}) {
  const headingId = useId();
  const headingRef = useRef<HTMLHeadingElement>(null);
  // Only on mount: each question is keyed by its id, so a new question is a new mount.
  useEffect(() => {
    if (focusOnMount) headingRef.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <section
      aria-labelledby={headingId}
      className="space-y-4 rounded-lg border border-maple-soft bg-ink2 p-5"
    >
      <QuestionHead question={question} headingId={headingId} headingRef={headingRef} />
      {question.answer.kind === "own-words" ? (
        <OwnWords
          question={question}
          draft={draft}
          today={today}
          keptWords={keptWords}
          labelledBy={headingId}
          onAnswer={onAnswer}
        />
      ) : question.answer.kind === "one-choice" ? (
        <div className="flex flex-wrap gap-2">
          {question.answer.choices.map((choice) => (
            <Chip
              key={choice.id}
              active={draft.lookingFor === choice.id}
              onClick={() => onAnswer({ lookingFor: choice.id })}
            >
              {choice.label}
            </Chip>
          ))}
        </div>
      ) : question.answer.kind === "place" ? (
        <PlacePicker
          places={question.answer.places}
          draft={draft}
          labelledBy={headingId}
          onAnswer={onAnswer}
        />
      ) : (
        <IncomeAmount
          question={question}
          today={today}
          agreedIncome={agreedIncome}
          labelledBy={headingId}
          onAnswer={onAnswer}
        />
      )}
    </section>
  );
}

function OwnWords({
  question,
  draft,
  today,
  keptWords,
  labelledBy,
  onAnswer,
}: {
  question: DestinationQuestion;
  draft: DestinationDraft;
  today: string;
  keptWords: KeptOnRecord["destination"];
  labelledBy: string;
  onAnswer: (change: Partial<DestinationDraft>) => void;
}) {
  const before =
    draft.destination && draft.destination.kept !== "dont-know" ? draft.destination.text : "";
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
      const body = (await res.json().catch(() => null)) as {
        statement?: { text: string; saidAt: string };
        error?: string;
      } | null;
      if (res.ok && body?.statement) {
        onAnswer({
          destination: { kept: "saved", text: body.statement.text, saidAt: body.statement.saidAt },
        });
      } else if (res.status === 503) {
        // No database: only the window's memory holds the words, and the receipt says so.
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
        className="min-h-[88px] w-full resize-y rounded-[10px] border border-rule bg-ink px-4 py-3 text-lead leading-relaxed text-paper outline-hidden focus:border-maple-soft"
      />
      {text.length >= maxChars ? (
        <p role="status" className="text-body text-amber">
          {STATEMENT_FULL_NOTE}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="text-body text-amber">
          {error}
        </p>
      ) : null}
      <div className="flex flex-wrap justify-end gap-3">
        {question.skip ? (
          <Pill
            variant="ghost"
            // Deletes nothing: words already kept still show on top, and the receipt says so.
            onClick={() =>
              onAnswer({ destination: keptWords ? { kept: "dont-know", stillKept: keptWords } : { kept: "dont-know" } })
            }
            disabled={busy}
          >
            {question.skip}
          </Pill>
        ) : null}
        <Pill
          variant="maple"
          onClick={() => void keep()}
          disabled={busy || text.trim().length === 0}
        >
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
        className="w-full max-w-sm rounded-sm border border-rule bg-ink px-3 py-2.5 text-lead text-paper outline-hidden focus:border-maple-soft"
      >
        <option value="">{words.choosePlace}</option>
        {places.map((code) => (
          <option key={code} value={code}>
            {placeName(code)}
          </option>
        ))}
      </select>
      <Pill
        variant="maple"
        onClick={() => place !== "" && onAnswer({ place })}
        disabled={place === ""}
      >
        {words.usePlace}
      </Pill>
    </div>
  );
}

function IncomeAmount({
  question,
  today,
  agreedIncome,
  labelledBy,
  onAnswer,
}: {
  question: DestinationQuestion;
  today: string;
  agreedIncome: StillAgreed | null;
  labelledBy: string;
  onAnswer: (change: Partial<DestinationDraft>) => void;
}) {
  const [text, setText] = useState("");
  const [problem, setProblem] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // The number waiting in the agree prompt, as the propose route gave it back.
  const [proposal, setProposal] = useState<{ id: string; amountCents: number } | null>(null);
  // Where focus goes when the prompt is closed without deciding: "Keep it" is disabled as it opens.
  const amountRef = useRef<HTMLInputElement>(null);
  // Turning a new number down or skipping takes back nothing agreed before; the receipt says it stands.
  const stillAgreed = agreedIncome ? { stillAgreed: agreedIncome } : {};

  async function keep(e?: FormEvent) {
    // Enter in the amount box submits the form: it does what "Keep it" does.
    e?.preventDefault();
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
      const body = (await res.json().catch(() => null)) as {
        figures?: { id: string; amountCents: number }[];
        error?: string;
      } | null;
      const proposed = body?.figures?.[0];
      if (res.ok && proposed) setProposal({ id: proposed.id, amountCents: proposed.amountCents });
      // Nothing was proposed, so nothing is held: only the box keeps the amount, and the line says so.
      else setProblem(body?.error ?? words.receipts.incomeNotKept);
    } catch {
      setProblem(words.receipts.incomeNotKept);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <form className="space-y-3" onSubmit={(e) => void keep(e)} noValidate>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center rounded-sm border border-rule bg-ink focus-within:border-maple-soft">
            <span className="pl-3 text-lead text-stone-dim">$</span>
            <input
              ref={amountRef}
              type="text"
              inputMode="decimal"
              aria-labelledby={labelledBy}
              aria-invalid={problem ? true : undefined}
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                setProblem(null);
              }}
              className="w-40 bg-transparent px-2 py-2 text-lead text-paper outline-hidden"
            />
          </div>
          <span className="text-body text-stone">{words.perYear}</span>
        </div>
        {problem ? (
          <p role="alert" className="text-body text-amber">
            {problem}
          </p>
        ) : null}
        <div className="flex flex-wrap justify-end gap-3">
          {question.skip ? (
            <Pill
              variant="ghost"
              onClick={() => onAnswer({ incomeWanted: { kind: "skipped", ...stillAgreed } })}
              disabled={busy}
            >
              {question.skip}
            </Pill>
          ) : null}
          <Pill type="submit" variant="maple" disabled={busy || text.trim().length === 0}>
            {busy ? words.saving : words.keepAmount}
          </Pill>
        </div>
      </form>
      {/* Outside the form: Enter in the prompt's own box must not submit this one and propose again. */}
      {proposal ? (
        <IncomeAgreePrompt
          proposal={proposal}
          today={today}
          returnFocusTo={amountRef}
          onAgreed={(amountCents) =>
            onAnswer({ incomeWanted: { kind: "agreed", amountCents, agreedOn: today } })
          }
          onTurnedDown={() => onAnswer({ incomeWanted: { kind: "turned-down", ...stillAgreed } })}
          onClose={() => setProposal(null)}
        />
      ) : null}
    </>
  );
}

/** An answered question: its words, the answer shown back, its receipt (read out by a screen reader) and Change. */
function AnsweredQuestion({
  question,
  draft,
  onChange,
}: {
  question: DestinationQuestion;
  draft: DestinationDraft;
  onChange: () => void;
}) {
  const headingId = useId();
  let shown: ReactNode = null;
  let receipt = "";
  if (question.id === "destination" && draft.destination) {
    const kept = draft.destination;
    shown =
      kept.kept === "dont-know" ? (
        <p className="text-lead text-paper-dim">{question.skip}</p>
      ) : (
        <>
          <p className="font-serif text-title italic leading-snug text-paper">“{kept.text}”</p>
          <p className="text-body text-stone">{words.yourWords(kept.saidAt)}</p>
        </>
      );
    receipt = destinationReceipt(kept);
  } else if (
    question.id === "looking-for" &&
    draft.lookingFor &&
    question.answer.kind === "one-choice"
  ) {
    const choice = question.answer.choices.find((c) => c.id === draft.lookingFor);
    shown = <p className="text-lead text-paper">{choice?.label}</p>;
    receipt = lookingForReceipt(draft.lookingFor, listedFor(draft));
  } else if (question.id === "place" && draft.place) {
    shown = <p className="text-lead text-paper">{words.answeredPlace(placeName(draft.place))}</p>;
    receipt = placeReceipt(draft.place, listedFor(draft));
  } else if (question.id === "income-wanted" && draft.incomeWanted) {
    const income = draft.incomeWanted;
    // A number turned down in the prompt shows nothing here: its receipt says what became of it.
    shown =
      income.kind === "agreed" ? (
        <p className="text-lead text-paper">{words.answeredAmount(income.amountCents)}</p>
      ) : income.kind === "skipped" ? (
        <p className="text-lead text-paper-dim">{words.skipped}</p>
      ) : null;
    receipt = incomeReceipt(income);
  }

  return (
    <section
      aria-labelledby={headingId}
      className="space-y-2 rounded-lg border border-rule bg-ink2 px-5 py-4"
    >
      <div className="flex items-start justify-between gap-4">
        <h2 id={headingId} className="text-body font-semibold text-paper-dim">
          {question.ask}
        </h2>
        <button
          type="button"
          onClick={onChange}
          className="shrink-0 border-b border-rule-soft pb-0.5 text-body text-stone hover:text-paper"
        >
          {words.change}
        </button>
      </div>
      {shown}
      <p role="status" className="text-body text-sage">
        {receipt}
      </p>
      {/* Questions 2 and 3 are kept with each future picked and nowhere else; the window's memory holds them
          (lib/journey/held-journey.ts), so a page loaded afresh asks them again, and the person is told so. */}
      {question.id === "looking-for" || question.id === "place" ? (
        <p className="text-body text-stone">{words.keptWithEachFuture}</p>
      ) : null}
    </section>
  );
}
