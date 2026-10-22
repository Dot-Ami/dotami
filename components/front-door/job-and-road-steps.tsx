"use client";

import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";

import { Pill } from "@/components/ui";
import {
  ALBERTA_ECONOMIC_REGIONS,
  ALBERTA_REGIONS_PAGE,
  DONT_KNOW_REGION,
  economicRegionsCreditLine,
  regionNameOnScreen,
} from "@/lib/engines/research-kit/v2026/economic-regions";
import { generalRoadV2026, skillItemsV2026, type Road } from "@/lib/engines/roads/v2026";
import { futureCards, type FutureCard } from "@/lib/front-door/futures";
import { placeName, provinceOfPlace } from "@/lib/front-door/receipts";
import { roadJobGroups, roadMatch } from "@/lib/front-door/road-match";
import { answersOf, next, pickedJob, skipped, type StepsState } from "@/lib/front-door/three-steps";
import { areaLabel } from "@/lib/front-door/where";
import { jobStepWords, pickWords, whereStepWords } from "@/lib/front-door/words";
import type { StepAnswers } from "@/lib/journey/first-save";
import { STATEMENT_MAX_CHARS } from "@/lib/person/types";
import { ALBERTA_AREAS } from "@/lib/places/alberta-areas";
import type { PlaceCode } from "@/lib/places/codes";
import { PROVINCE_LABELS } from "@/lib/scenarios/types";

import { FutureCardItem } from "./future-card";
import { JobSearchBox } from "./job-search";

/** The five-digit groups' titles each listed road is written for, read on the server from the NOC file (too big for a page). */
export type RoadJobNames = Record<string, readonly { code: string; title: string }[]>;

/**
 * Pick a future's three steps (docs/ui-spec/futures/_index.md; 01, 02, 03), one part at a time in the page's one
 * step region, asked before any road is drawn: 1. What's closest to your work? 2. Where you are. 3. Pick a future.
 * The same component on Pick a future (`host="futures"`) and at the end of the intake's typed way
 * (`host="intake"`, the maintainer's call 1 of 2026-10-21), so both ways in end on the same three steps.
 *
 * On Pick a future each block carries its own `data-region` mark, as the page's blocks did; on the intake the steps
 * sit inside the intake's own `intake` region and draw no marks or *Name it* box of their own
 * (docs/ui-spec/futures/03-road-match.md, "On the intake page").
 *
 * Every answer lives in the page's memory (`state`, held by the page) until the person opens a future: nothing is
 * saved before **Look inside**, nothing is kept in the window's storage, and a job with no written road saves
 * nothing unless a future is opened (the maintainer's call 3 of 2026-10-21).
 *
 * A job with no written road (case B): the honest line, then the place *About this job*'s rows go, marked as not
 * built yet. Task 25h's pull request fills that slot (`data-about-this-job-slot`); nothing is drawn in its place
 * silently, and no road is put there instead.
 */
export function JobAndRoadSteps({
  host,
  state,
  setState,
  place,
  listed,
  roadJobs,
  firstSentence = null,
  introExtra = null,
  onLookInside,
}: {
  host: "futures" | "intake";
  state: StepsState;
  setState: (state: StepsState) => void;
  place: PlaceCode;
  /** The roads Pick a future lists, in the order written. */
  listed: readonly Road[];
  roadJobs: RoadJobNames;
  /** The typed way's own first sentence, shown word for word above the search box; never searched by itself. */
  firstSentence?: string | null;
  /** Pick a future's receipt for question 2, under step 3's order line. */
  introExtra?: ReactNode;
  /**
   * Saves the idea on `road` with the steps' answers, then opens the cockpit. Resolves to false when it couldn't be
   * saved (nothing is opened then); `name` is the *Name it* box's (empty on the intake, which asks its own).
   */
  onLookInside: (road: Road, answers: StepAnswers, name: string) => Promise<boolean>;
}) {
  const regions = host === "futures";
  const mark = (name: string) => (regions ? { "data-region": name } : {});
  const province = provinceOfPlace(place);
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const firstPart = useRef(true);

  // Each new part moves focus to its question (step 2's drop-down, read with its label and why-line) or else its
  // heading, so a screen reader hears the question next (docs/ui-spec/futures/02-where-you-are.md); not on the
  // first draw.
  useEffect(() => {
    if (firstPart.current) {
      firstPart.current = false;
      return;
    }
    const question = document.querySelector<HTMLElement>("[data-step-question]");
    (question ?? headingRef.current)?.focus({ preventScroll: true });
  }, [state.part]);

  const intro = (kicker: string, heading: string, lines: ReactNode) => (
    <header {...mark("intro")}>
      <p className="font-mono text-small uppercase tracking-[0.14em] text-stone">{kicker}</p>
      <h1 ref={headingRef} tabIndex={-1} className="mt-1 font-serif text-display font-bold leading-[1.15] tracking-tight text-paper outline-hidden">
        {heading}
      </h1>
      {lines}
    </header>
  );
  const pickedLine = state.job ? <p className="mt-2 text-body text-paper">{whereStepWords.picked(state.job.label, state.job.code)}</p> : null;

  if (state.part === "work") {
    return (
      <>
        {intro(jobStepWords.stepCount, jobStepWords.heading, <p className="mt-2 text-lead text-paper-dim">{jobStepWords.lead}</p>)}
        <WorkStep regions={regions} firstSentence={firstSentence} onPick={(job) => setState(pickedJob(state, job, province))} onSkip={() => setState(skipped())} />
      </>
    );
  }

  if (state.part === "area" || state.part === "region") {
    return (
      <>
        {intro(whereStepWords.stepCount, whereStepWords.heading, pickedLine)}
        <WhereStep regions={regions} state={state} setState={setState} />
      </>
    );
  }

  if (state.part === "outside") {
    const name = province ? PROVINCE_LABELS[province] : placeName(place);
    return (
      <>
        {intro(whereStepWords.stepCount, whereStepWords.outside.heading(name), pickedLine)}
        <div {...mark("step")} className="max-w-2xl space-y-3">
          <p className="text-lead text-paper-dim">{whereStepWords.outside.notAsked(name)}</p>
          <p className="text-body text-stone">{whereStepWords.outside.why}</p>
          <div className="flex justify-end pt-2">
            <Pill variant="maple" onClick={() => setState(next(state))}>
              {whereStepWords.outside.next}
            </Pill>
          </div>
        </div>
      </>
    );
  }

  return (
    <RoadStep
      host={host}
      state={state}
      place={place}
      listed={listed}
      roadJobs={roadJobs}
      intro={(lines) =>
        intro(
          pickWords.stepCount,
          pickWords.heading,
          <>
            <p className="mt-2 text-lead text-paper-dim">{pickWords.order}</p>
            {introExtra}
            {lines}
          </>,
        )
      }
      onLookInside={onLookInside}
    />
  );
}

/** Step 1: the search box, Skip, and the results (the one job picker, components/front-door/job-search.tsx). */
function WorkStep({
  regions,
  firstSentence,
  onPick,
  onSkip,
}: {
  regions: boolean;
  firstSentence: string | null;
  onPick: (job: { code: string; label: string }) => void;
  onSkip: () => void;
}) {
  const skipHintId = useId();
  const groupId = useId();
  return (
    <div {...(regions ? { "data-region": "step" } : {})} role="group" aria-labelledby={groupId} className="max-w-2xl space-y-4">
      <span id={groupId} className="sr-only">
        {jobStepWords.heading}
      </span>
      {firstSentence ? <p className="text-body text-stone">{jobStepWords.yourIdea(firstSentence)}</p> : null}
      <JobSearchBox onPick={onPick} />
      <div className="space-y-1 border-t border-rule-soft pt-3">
        <Pill variant="ghost" aria-describedby={skipHintId} onClick={onSkip}>
          {jobStepWords.skip}
        </Pill>
        <p id={skipHintId} className="text-body text-stone-dim">
          {jobStepWords.skipHint}
        </p>
      </div>
      <p className="text-body text-stone-dim">{jobStepWords.notKept}</p>
    </div>
  );
}

/** Step 2 in Alberta: the area (2a), then the region (2b), one question on screen at a time. */
function WhereStep({ regions, state, setState }: { regions: boolean; state: StepsState; setState: (state: StepsState) => void }) {
  const selectId = useId();
  const labelId = useId();
  const whyId = useId();
  const hintId = useId();
  const areaPart = state.part === "area";
  const w = areaPart ? whereStepWords.area : whereStepWords.region;
  const value = (areaPart ? state.area : state.region) ?? "";
  const set = (v: string) => setState(areaPart ? { ...state, area: v === "" ? null : v } : { ...state, region: v === "" ? null : v });
  return (
    <div {...(regions ? { "data-region": "step" } : {})} role="group" aria-labelledby={labelId} className="max-w-2xl space-y-3">
      {areaPart ? null : (
        <p className="text-body text-paper">
          {whereStepWords.area.shownBack(areaLabel(state.area) ?? whereStepWords.area.notAnswered)}
        </p>
      )}
      <label id={labelId} htmlFor={selectId} className="block font-serif text-title font-bold tracking-tight text-paper">
        {w.label}
      </label>
      <p id={whyId} className="text-body text-stone">
        {w.why}
      </p>
      <select
        id={selectId}
        data-step-question
        aria-describedby={`${whyId} ${hintId}`}
        value={value}
        onChange={(e) => set(e.target.value)}
        className="w-full max-w-sm rounded-sm border border-rule bg-ink px-3 py-2.5 text-lead text-paper outline-hidden focus:border-maple-soft"
      >
        <option value="">{w.choose}</option>
        {areaPart
          ? ALBERTA_AREAS.map((a) => (
              <option key={a.value} value={a.value}>
                {whereStepWords.area[a.key]}
              </option>
            ))
          : [
              ...ALBERTA_ECONOMIC_REGIONS.map((r) => (
                <option key={r.code} value={r.code}>
                  {regionNameOnScreen(r.name)}
                </option>
              )),
              <option key={DONT_KNOW_REGION} value={DONT_KNOW_REGION}>
                {whereStepWords.region.dontKnow}
              </option>,
            ]}
      </select>
      <div id={hintId} className="space-y-1 text-body text-stone-dim">
        {areaPart ? (
          <p>{whereStepWords.area.hint}</p>
        ) : (
          <>
            <p>{whereStepWords.region.order}</p>
            <p>{whereStepWords.region.dontKnowNote}</p>
          </>
        )}
      </div>
      {/* Statistics Canada's list of towns, a fixed link carrying nothing about the person: only once "I don't know" is picked. */}
      {!areaPart && state.region === DONT_KNOW_REGION ? (
        <p className="text-body">
          <a
            href={ALBERTA_REGIONS_PAGE}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={whereStepWords.region.lookupName}
            className="border-b border-rule-soft text-paper hover:text-maple"
          >
            {whereStepWords.region.lookup}
          </a>
        </p>
      ) : null}
      {areaPart ? null : <p className="text-body text-stone-dim">{economicRegionsCreditLine()}</p>}
      <p className="text-body text-stone-dim">{whereStepWords.kept}</p>
      <div className="flex justify-end pt-2">
        <Pill variant="maple" onClick={() => setState(next(state))}>
          {w.next}
        </Pill>
      </div>
    </div>
  );
}

/** Step 3: the futures, the one written for the picked job first, or the honest no-road block (case B). */
function RoadStep({
  host,
  state,
  place,
  listed,
  roadJobs,
  intro,
  onLookInside,
}: {
  host: "futures" | "intake";
  state: StepsState;
  place: PlaceCode;
  listed: readonly Road[];
  roadJobs: RoadJobNames;
  intro: (lines: ReactNode) => ReactNode;
  onLookInside: (road: Road, answers: StepAnswers, name: string) => Promise<boolean>;
}) {
  const regions = host === "futures";
  const mark = (name: string) => (regions ? { "data-region": name } : {});
  const province = provinceOfPlace(place);
  const cards = useMemo(() => futureCards(listed, skillItemsV2026), [listed]);
  const cardOf = (road: Road): FutureCard => cards.find((c) => c.roadId === road.id)!;
  const match = roadMatch(state.job?.code ?? null, listed);
  const answers = answersOf(state, province);
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [opening, setOpening] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const nameId = useId();
  const noteId = useId();
  const noRoadId = useId();

  async function open(road: Road, failed: string = pickWords.saveFailed) {
    if (opening) return;
    setOpening(road.id);
    setError(null);
    const ok = await onLookInside(road, answers, name);
    if (!ok) {
      setOpening(null);
      setError(failed);
    }
  }

  /** Keeps the note as one of the person's statements, then opens the general road the same way. */
  async function keepNote() {
    const typed = note.trim();
    if (typed.length === 0 || opening) return;
    setOpening(generalRoadV2026.id);
    setError(null);
    try {
      const res = await fetch("/api/person/statements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: typed, saidAt: new Date().toLocaleDateString("en-CA") }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        setOpening(null);
        setError(body?.error ?? pickWords.saveFailed);
        return;
      }
    } catch {
      setOpening(null);
      setError(pickWords.saveFailed);
      return;
    }
    // The note is kept: empty the box, so pressing again can't keep it twice.
    setNote("");
    setOpening(null);
    await open(generalRoadV2026, pickWords.notHere.keptNotOpened);
  }

  /** A card's line about the person's pick of job: what each road is written for, or that road 0 isn't. */
  const jobLine = (road: Road): string | null => {
    if (!state.job) return null;
    const groups = roadJobGroups(road);
    if (groups.length > 0) {
      const named = groups.map((code) => roadJobs[road.id]?.find((g) => g.code === code)?.title ?? code);
      return groups.map((code, i) => pickWords.writtenForJob(named[i]!, code)).join(" ");
    }
    return match.case === "no-road" && road.id === generalRoadV2026.id ? pickWords.road0NotForJob(state.job.label) : null;
  };

  const list = (roads: readonly Road[]) => (
    <ul aria-label={pickWords.listLabel} className="grid gap-4 md:grid-cols-2">
      {roads.map((road) => (
        <FutureCardItem
          key={road.id}
          card={cardOf(road)}
          personPlace={province}
          personPlaceLabel={placeName(place)}
          jobLine={jobLine(road)}
          opening={opening}
          onLookInside={() => void open(road)}
        />
      ))}
    </ul>
  );
  const groupHeading = (text: string) => <h2 className="font-serif text-title font-bold tracking-tight text-paper">{text}</h2>;

  const nameIt =
    host === "futures" ? (
      <div {...mark("name-it")} className="max-w-sm">
        <label htmlFor={nameId} className="mb-1.5 block font-mono text-small uppercase tracking-[0.14em] text-stone">
          {pickWords.nameIt}
        </label>
        <input
          id={nameId}
          type="text"
          value={name}
          maxLength={80}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-lg border border-rule bg-ink px-3 py-2 text-lead text-paper focus:border-maple focus:outline-hidden"
        />
        <p className="mt-1 text-body text-stone-dim">{pickWords.nameHint}</p>
      </div>
    ) : null;

  return (
    <>
      {intro(
        state.job ? (
          <p className="mt-2 text-body text-paper">
            {pickWords.pickLine(state.job.label, state.job.code)}{" "}
            <span className="font-mono text-small uppercase tracking-wider text-stone">· {pickWords.pickTag}</span>
          </p>
        ) : null,
      )}

      {match.case === "no-road" ? null : nameIt}

      {error ? (
        <p role="alert" className="rounded-lg border border-amber/40 bg-amber/5 px-4 py-3 text-lead text-amber">
          {error}
        </p>
      ) : null}

      <div {...mark("futures")} className="space-y-4">
        {match.case === "written" ? (
          <>
            {groupHeading(pickWords.writtenForJobHeading)}
            {list(match.forJob)}
            {match.others.length > 0 ? (
              <>
                {groupHeading(pickWords.othersHeading)}
                {list(match.others)}
              </>
            ) : null}
          </>
        ) : match.case === "no-road" && state.job ? (
          <>
            <section aria-labelledby={noRoadId} className="space-y-3 rounded-lg border border-rule bg-ink2 p-5">
              <h2 id={noRoadId} className="font-serif text-title font-bold tracking-tight text-paper">
                {pickWords.noRoad.heading(state.job.label, state.job.code)}
              </h2>
              <p className="text-body text-paper-dim">{pickWords.noRoad.body(state.job.label)}</p>
              {/* About this job's rows go here, open by default (K6 A); task 25h's pull request fills this slot. */}
              <p data-about-this-job-slot={state.job.code} className="rounded-lg border border-dashed border-amber/60 px-4 py-3 text-body text-amber">
                {pickWords.noRoad.aboutJobPending(state.job.label)}
              </p>
              <p className="text-body text-stone">{pickWords.noRoad.nothingSaved}</p>
            </section>
            {groupHeading(pickWords.othersHeading)}
            {list(match.others)}
          </>
        ) : (
          <>
            <p className="text-body text-stone">{pickWords.skipped}</p>
            <p className="text-body text-stone">{pickWords.skippedNoneFor}</p>
            {list(match.others)}
          </>
        )}
      </div>

      {match.case === "no-road" ? nameIt : null}

      <section {...mark("not-here")} aria-labelledby={noteId} className="space-y-3 rounded-lg border border-rule bg-ink2 p-5">
        <h2 id={noteId} className="font-serif text-title font-bold tracking-tight text-paper">
          {pickWords.notHere.label}
        </h2>
        <p className="text-body text-stone">{pickWords.notHere.hint}</p>
        <textarea
          aria-labelledby={noteId}
          value={note}
          maxLength={STATEMENT_MAX_CHARS}
          rows={2}
          onChange={(e) => setNote(e.target.value)}
          className="w-full resize-y rounded-[10px] border border-rule bg-ink px-4 py-3 text-lead text-paper outline-hidden focus:border-maple-soft"
        />
        <div className="flex justify-end">
          <Pill variant="ghost" onClick={() => void keepNote()} disabled={opening !== null || note.trim().length === 0}>
            {pickWords.notHere.button}
          </Pill>
        </div>
      </section>
    </>
  );
}
