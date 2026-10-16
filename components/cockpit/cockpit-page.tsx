"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { CompareEndings } from "@/components/cockpit/compare-endings";
import { ExampleFrame, ExampleNoteContext, ExampleOnlyNote, ExampleStory } from "@/components/cockpit/example-mode";
import { FoldButton, FoldedBar, FoldedStrip, useFolds } from "@/components/cockpit/folding";
import { useIsPhone, useSheet } from "@/components/cockpit/use-sheet";
import { DatePanel, MoneyListPanel, SkillsListPanel, type SkillKey } from "@/components/cockpit/gauge-panels";
import { GoalBar } from "@/components/cockpit/goal-bar";
import { NextOnYourRoad } from "@/components/cockpit/next-on-your-road";
import { OverlaySwitches } from "@/components/cockpit/overlay-switches";
import { StepPanel } from "@/components/cockpit/step-panel";
import { StructureLadderRail } from "@/components/cockpit/structure-ladder-rail";
import { TemplatesRail } from "@/components/cockpit/templates-rail";
import { StrategyMap } from "@/components/cockpit/strategy-map";
import { QuestionBox, ToldList, type BoxControl } from "@/components/cockpit/told-list";
import { useCockpitData, type KeptForIdea } from "@/components/cockpit/use-cockpit-data";
import { WHAT_IF_BAR_ID, WhatIfBar } from "@/components/cockpit/what-if-bar";
import type { ShownReceipt } from "@/components/cockpit/receipt-lines";
import { useJourney } from "@/components/shared/journey-provider";
import { PersonStatements } from "@/components/shared/person-statements";
import { AgreePrompt, postJson } from "@/components/ventures/agree-prompt";
import { FigureReminderBanners } from "@/components/ventures/figure-reminder-banners";
import { useIdeaReminders } from "@/components/ventures/use-idea-reminders";
import { PlaybookExportPanel } from "@/components/playbook-export-panel";
import { FieldRow, Pill, WordMark } from "@/components/ui";
import { allFolded } from "@/lib/cockpit/folds";
import { profileRows, ventureLine } from "@/lib/cockpit/profile-rows";
import {
  answerReceipt,
  compareEndings,
  forksToCompare,
  keepWhatIf,
  notToldYet,
  toldRows,
  type BoxQuestion,
  type KeptAnswers,
  type NotToldRow,
  type ToldRow,
} from "@/lib/cockpit/told";
import { cockpitInput, costLineNote, FIRST_OVERLAYS, nextOnYourRoad, overlayCounts, type GaugeId, type Overlays } from "@/lib/cockpit/view";
import { cockpitWords as words } from "@/lib/cockpit/words";
import type { CostLineAmountFrom, FigureView } from "@/lib/figures/types";
import { useLocalToday } from "@/lib/figures/use-local-today";
import type { CFENodeId } from "@/lib/engines/cfe/v2026";
import { oasisListForJob } from "@/lib/engines/oasis/v2026";
import { generalRoadV2026, roadsV2026, skillItemsV2026 } from "@/lib/engines/roads/v2026";
import { templatesCatalogV2026 } from "@/lib/engines/templates/v2026";
import type { ExampleFuture } from "@/lib/examples";
import { exampleStory } from "@/lib/examples/story";
import { roadForFuture, SHIPPED_ROADS_CATALOG, type SkillMarkValue, type StepStatus } from "@/lib/futures/types";
import { AUTOSAVE_DELAY_MS, formatSavedAt, saveScenario } from "@/lib/journey/save-scenario";
import { evaluateRoad, withoutIdeaAnswer, type RoadEvaluationInput } from "@/lib/roads";
import { EMPLOYMENT_WORDS } from "@/lib/roads/words";
import {
  branchDecisions,
  setIncorporateAt,
  updateScenarioBranch,
  type BranchDecision,
  type BranchDecisionId,
} from "@/lib/scenarios/branches";
import { isBranchDecided } from "@/lib/scenarios/graph";
import { isNotSaid } from "@/lib/scenarios/not-said";
import type { Scenario, VentureStructure } from "@/lib/scenarios/types";
import Link from "next/link";

/**
 * The cockpit (S2.5.4h/j shape): one venture, its lifecycle map as tier columns, the rails that
 * explain it.
 * Removed 2026-09-14 (S2.5.4h): labeled-example archetypes, the Lens chat, the five-year
 * projection footer, Track/Compare tabs, header fork chips and the dead Focus / ? /
 * "Graph language" controls. What is left is the cockpit itself — the map and the rails
 * that explain it.
 *
 * 2026-10-12, the future cockpit's screen, part 1 (docs/architecture/future-cockpit.md § 2, "Cockpit
 * screen as built"): the goal bar and its four gauges on top, the overlay switches over the map, the
 * step panel in place of node detail, the lists behind the gauges, and "Next on your road", all drawn
 * from one run of road evaluation (lib/roads/) on what is kept for this idea (lib/futures/).
 *
 * 2026-10-12, folding and phone width (future-cockpit.md § 2, "Folding and phone width"; issue #4): the
 * rail, the goal bar, the right-hand panel and the map's legend each fold with their own button, the
 * answers remembered in this browser (lib/cockpit/folds.ts). Below 768 px (Tailwind's `md`) the rail is
 * a full-width sheet opened from the header and the page scrolls down instead of squeezing the road;
 * below 1024 px (`lg`) the right-hand panel opens over the road (a full-width sheet on a phone, a 420 px
 * drawer between the two) instead of taking a column from it.
 *
 * 2026-10-12, part 2 (§ 2, "Cockpit screen as built, part 2"): "What you've told DotAmi / Not told yet"
 * with the one-question box at the top of the left rail, a receipt after every answer (road evaluation
 * before and after it, compared) where it was given and in "This visit", the what-if bar under the
 * map, and "Compare the two endings" with "This is mine" in the right-hand panel.
 *
 * After review (2026-10-12): the idea's own answers, kept with the map, wait for the map's save before
 * their receipt is worked out, from the idea the save read back; until then it says so, and a failed save
 * says it wasn't kept.
 *
 * 2026-10-13, the maintainer's answer: Compare is offered only at a fork whose own pick, not the rules,
 * puts steps on or off the path (`forksToCompare`), so today's Alberta road, whose two forks are the map's
 * own toggles and whose sides the tax rules colour, has no Compare.
 *
 * 2026-10-13, every region folds: the told / not-told list folds with the rail it sits in and Compare with
 * the panel; the what-if bar and "This visit" under the map fold together with their own button, the fifth
 * answer remembered (lib/cockpit/folds.ts `whatIf`), and the header's "Fold all panels" folds it too.
 *
 * 2026-10-13, the invented example future (docs/ui-spec/example/_index.md): given `example`, the page draws
 * that example's answers (lib/examples/) through the same road evaluation, read-only. It fetches nothing of
 * the person's, keeps folds for this page only, and every way to save either is disabled with the example's
 * note or answers in the banner, which never folds; nothing reaches the data file or the browser's storage.
 */

/** The regions' ids, for the fold buttons' aria-controls. */
const RAIL_ID = "cockpit-rail";
const PANEL_ID = "cockpit-panel";
const GOAL_BAR_ID = "cockpit-goal-bar";
const LEGEND_ID = "cockpit-map-legend";

/** A folded rail or panel on a wide window is a strip this wide. */
const STRIP = "44px";

/** One thing at a time in the right-hand slot: a step, the export, or one gauge's list. */
type RightPanel = null | "node" | "playbook" | "skills" | "money" | "date" | "compare";

/** Where an answer was given, so its receipt shows there (the map's own toggles show theirs in "This visit" only). */
type ReceiptPlace = "step" | "skills" | "money" | "date" | "told" | "compare" | "what-if" | "map";

/** The receipt on screen: where, its lines, and whether its save has answered yet. */
type Receipt = { place: ReceiptPlace } & ShownReceipt;

/**
 * An answer kept with the map whose save hasn't answered yet: the input before it, where it was given,
 * the what-if the "after" run uses, and what to say if nothing changed. `seq` counts the edits, so a save
 * that answers after a newer edit leaves the receipt to that edit's own save.
 */
type PendingReceipt = { before: RoadEvaluationInput; place: ReceiptPlace; whatIf: number | null; empty?: string; focusKey?: number; seq: number };

/** "This visit" keeps this many of this visit's receipt lines, newest first. */
const THIS_VISIT_LINES = 5;

/** The days kept with each answer, from what GET /api/futures/<id> and the figures list gave. */
function keptAnswers(kept: KeptForIdea | null, figures: FigureView[] | null): KeptAnswers {
  return {
    progress: kept?.progress ?? [],
    skillMarks: kept?.skillMarks ?? [],
    forkPickedOn: Object.fromEntries(Object.entries(kept?.future.forkPicks ?? {}).map(([id, pick]) => [id, pick.pickedOn])),
    targetMonthSetOn: kept?.future.targetMonthSetOn ?? null,
    figures: figures ?? [],
    incomeWantedOn: kept?.incomeWanted?.agreedOn ?? null,
  };
}

/** Every prep-tool reference, once the structure is set — there are four; no persona picks them. */
const ALL_TEMPLATE_IDS = templatesCatalogV2026.entries.map((entry) => entry.id);

interface CockpitPageProps {
  /** The most recently saved venture (or the one named by `?venture=`), or null when nothing is saved. */
  initialScenario: Scenario | null;
  /** S2.5.4i: `?venture=<id>` was explicit — it wins over the session and becomes the session. */
  pinned?: boolean;
  /** An invented example future, drawn read-only in place of a saved idea (docs/ui-spec/example/_index.md). */
  example?: ExampleFuture;
}

export function CockpitPage({ initialScenario, pinned = false, example }: CockpitPageProps) {
  const isExample = example !== undefined;
  const { scenario: journeyScenario, setScenario, hydrated } = useJourney();
  const [currentScenario, setCurrentScenario] = useState<Scenario | null>(
    example ? example.scenario : pinned ? initialScenario : (journeyScenario ?? initialScenario),
  );

  // `JourneyProvider` reads sessionStorage in its own effect, so on first paint
  // `journeyScenario` is still null and the server-loaded scenario is used. Once hydration
  // settles, adopt the session's scenario if one exists and differs — the user's most recent
  // unsaved edits win over the server snapshot (audit-2026-07-04 C2).
  useEffect(() => {
    // The example is its own: no session scenario ever replaces it.
    if (!hydrated || isExample) return;
    if (pinned) {
      // An explicit `?venture=` is a deliberate choice: make it the session's scenario.
      if (initialScenario && journeyScenario?.id !== initialScenario.id) setScenario(initialScenario);
      return;
    }
    if (journeyScenario && journeyScenario.id !== currentScenario?.id) {
      setCurrentScenario(journeyScenario);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  // A step id from the road on the map (today's map: the CFE node ids, unchanged).
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [rightPanel, setRightPanel] = useState<RightPanel>(null);
  // The overlays on the road, the gauge whose list is open, and a skill selected to light its steps.
  const [overlays, setOverlays] = useState<Overlays>(FIRST_OVERLAYS);
  const [activeGauge, setActiveGauge] = useState<GaugeId | null>(null);
  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null);
  // Which regions are folded (remembered in this browser), and, below 768 px, whether the rail's sheet is
  // open (not remembered: it starts closed so the road is what a phone shows first).
  const { folds, toggle, toggleAll } = useFolds(!isExample);
  const [railSheet, setRailSheet] = useState(false);
  // The last refusal from a save of the person's answers, in the server's words, shown where they clicked.
  const [answerError, setAnswerError] = useState<string | null>(null);
  // Part 2: the last answer's receipt and where it was given; this visit's newest receipt lines; the
  // what-if on now (whole dollars, kept nowhere); and the fork shown in Compare.
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [thisVisit, setThisVisit] = useState<string[]>([]);
  // The receipt of an answer kept with the map, until its save answers; and a counter for focus keys and edits.
  const pendingReceipt = useRef<PendingReceipt | null>(null);
  const counter = useRef(0);
  // An example may open with its own what-if on (kept nowhere, as every what-if); Mara's starts empty.
  const [whatIf, setWhatIf] = useState<number | null>(example?.whatIfFirstYearSalesDollars ?? null);
  // On the example, a count of clicks on controls that would save: the banner says nothing is kept.
  const [exampleNotice, setExampleNotice] = useState(0);
  const sayExample = () => setExampleNotice((n) => n + 1);
  const [compareForkId, setCompareForkId] = useState<string | null>(null);
  // Road evaluation's input before a number went into the agree prompt: its receipt comes once it is agreed.
  const reviewBefore = useRef<{ input: RoadEvaluationInput; place: ReceiptPlace } | null>(null);
  const router = useRouter();
  // Numbers the person just gave (a quote, their savings), waiting in the agree prompt.
  const [reviewing, setReviewing] = useState<FigureView[] | null>(null);
  // Issue #1: every edit on this page is written to the database after a short pause; the
  // line under "Save now" always says where things stand. `dirty` = an edit is waiting.
  const [saveState, setSaveState] = useState<"idle" | "dirty" | "saving" | "saved" | "error">(
    "idle",
  );
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const autosaveTimer = useRef<number | null>(null);
  useEffect(
    () => () => {
      if (autosaveTimer.current !== null) window.clearTimeout(autosaveTimer.current);
    },
    [],
  );

  // The saved idea behind this scenario, its figures (every state: the reminder banner needs to know
  // what is still waiting), and what the cockpit keeps for it. An idea not saved yet has none of it.
  // The example reads nothing of the person's: no settings, no saved idea, no figures.
  const reminders = useIdeaReminders(!isExample);
  const scenarioId = currentScenario?.id ?? null;
  const saved = useCockpitData(isExample ? null : scenarioId);
  // The example's answers stand in for what GET /api/futures/<id> and the figures list would give.
  const ventureId = isExample ? null : saved.ventureId;
  const figures = example ? example.figures : saved.figures;
  const kept: KeptForIdea | null = example ? example.kept : saved.kept;
  const reload = saved.reload;
  const ideaFigures = ventureId && figures ? { ideaId: ventureId, figures } : null;

  // The road this idea is drawn on: its own when it names one the catalog has, else today's general road.
  const roadId = kept?.future.roadId ?? null;
  const road = useMemo(() => roadForFuture(SHIPPED_ROADS_CATALOG, roadId), [roadId]);
  // The government's skills list for the job the person picked as closest to their work, or none.
  const jobCode = kept?.future.job?.code ?? null;
  const job = useMemo(() => (jobCode ? oasisListForJob(jobCode) : null), [jobCode]);

  // One run of road evaluation draws everything: the gauges, the step colours, the badges, the step
  // panel, "Next on your road", and the map's lever cards (its `rules`, run on the idea's own picks;
  // until 2026-10-11 the map ran on the default picks, so a flipped toggle didn't recolour the cards).
  // [8a] Only agreed business totals reach the rules (cockpitInput says how).
  // [8e] Today is the person's own day and moves on with the clock: a window left open past
  // midnight or a quarter end re-reads the figures against the new day instead of the old one.
  const today = useLocalToday();
  /**
   * Road evaluation's input from what is kept, the idea as the screen holds it and the what-if; any part
   * can be swapped, so a receipt compares the input before an answer with the one after it, built from
   * what the save read back.
   */
  const inputFor = useCallback(
    (over: { scenario?: Scenario; kept?: KeptForIdea | null; figures?: FigureView[] | null; whatIf?: number | null } = {}): RoadEvaluationInput | null => {
      const idea = over.scenario ?? currentScenario;
      if (!idea) return null;
      const k = over.kept !== undefined ? over.kept : kept;
      const f = over.figures !== undefined ? over.figures : figures;
      const w = over.whatIf !== undefined ? over.whatIf : whatIf;
      // The job's list from the same kept answers, so a receipt for a job pick compares before and after.
      const kJobCode = k?.future.job?.code ?? null;
      const kJob = k === kept ? job : kJobCode ? oasisListForJob(kJobCode) : null;
      return {
        ...cockpitInput({
          road: roadForFuture(SHIPPED_ROADS_CATALOG, k?.future.roadId ?? null),
          roadChosen: k?.future.roadChosen ?? false,
          skillItems: skillItemsV2026,
          scenario: idea,
          figures: f ?? [],
          personFigures: [],
          future: k?.future ?? null,
          progress: k?.progress ?? [],
          skillMarks: k?.skillMarks ?? [],
          job: kJob,
          today,
        }),
        // The what-if relights the rules for this run only; road evaluation never lets it touch a money sum.
        whatIf: w === null ? null : { firstYearSalesDollars: w },
      };
    },
    [currentScenario, kept, figures, whatIf, job, today],
  );
  const roadEvaluation = useMemo(() => {
    const input = inputFor();
    return input ? evaluateRoad(input) : null;
  }, [inputFor]);
  // The left list: every answer kept, with what it unlocked, and what isn't told yet. Worked out without
  // the what-if, which is never kept.
  const told = useMemo(() => {
    const base = inputFor({ whatIf: null });
    if (!base) return null;
    const evaluation = whatIf === null && roadEvaluation ? roadEvaluation : evaluateRoad(base);
    return { input: base, rows: toldRows(base, evaluation, keptAnswers(kept, figures)), notTold: notToldYet(base, evaluation) };
  }, [inputFor, whatIf, roadEvaluation, kept, figures]);
  // The forks Compare is offered at: only where the fork's own pick, not the rules, puts steps on or off
  // the path (the maintainer, 2026-10-13). None on today's Alberta road, whose sides the tax rules colour
  // whichever is picked, so both columns' counts would come out the same.
  const compareForks = useMemo(() => (told ? forksToCompare(told.input) : []), [told]);
  // The example's story: what each of the example person's answers changed, from road evaluation.
  const story = useMemo(
    () => (example && told ? exampleStory(told.input, example.whatIfFirstYearSalesDollars) : null),
    [example, told],
  );
  // Where the example's income goal comes from (2026-10-14): the statistic it is, so the goal bar says what
  // the number is rather than calling it the example person's own.
  const exampleStat = (id: string | null | undefined) => (id ? (example?.sources?.data.statistics.find((s) => s.id === id) ?? null) : null);
  const targetStat = exampleStat(example?.sources?.incomeWantedFrom);
  const targetFrom = targetStat ? { what: targetStat.inSentence ?? targetStat.what, period: targetStat.period } : null;
  const stepEvaluations = useMemo(
    () => new Map((roadEvaluation?.steps ?? []).map((step) => [step.stepId, step])),
    [roadEvaluation],
  );

  // Below 768 px the rail and the right-hand panel are sheets over the page: while one is open it holds
  // the keyboard, Escape closes it, and the page behind it is inert (components/cockpit/use-sheet.ts).
  const isPhone = useIsPhone();
  const railRef = useRef<HTMLElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const railModal = isPhone && railSheet;
  const panelModal = isPhone && rightPanel !== null && !folds.panel;
  useSheet(railModal, railRef, () => setRailSheet(false));
  useSheet(panelModal, panelRef, () => {
    setSelectedNodeId(null);
    setRightPanel(null);
    setActiveGauge(null);
  });

  // Folding the rail hides what it holds, which scrolls it back to the top; it comes back where it was.
  const railScroll = useRef(0);
  useLayoutEffect(() => {
    if (!folds.rail && railRef.current) railRef.current.scrollTop = railScroll.current;
  }, [folds.rail]);

  if (!currentScenario) {
    return <EmptyCockpit />;
  }

  const scenario = currentScenario;
  const structureAssumed = scenario.profile.structureSource !== "user";
  /** Ladder rung derived from the scenario's OWN structure (S2.5.4d). */
  const ladderStepId = structureAssumed
    ? null
    : scenario.profile.structure === "corporation"
      ? "structure-ccpc"
      : "structure-sole-prop";

  /**
   * Writes `target` to the database and reports the outcome on the save line. Never throws. A receipt
   * waiting on this save is worked out from the idea as the save read it back, or marked not saved.
   */
  async function persist(target: Scenario) {
    // Never reached on the example (changeScenario and Save now stop first); a second guard costs nothing.
    if (isExample) return sayExample();
    setSaveState("saving");
    const waiting = pendingReceipt.current;
    const result = await saveScenario(target);
    if (result.ok) {
      setSaveState("saved");
      setSavedAt(new Date());
      // Only when no newer edit came in meanwhile: that edit's own save brings its receipt.
      if (waiting && pendingReceipt.current === waiting) {
        pendingReceipt.current = null;
        // The route answers with the idea as kept; `target` only if an older server left it out.
        const after = inputFor({ scenario: result.kept ?? target, whatIf: waiting.whatIf });
        if (after) showReceipt(waiting.place, answerReceipt(waiting.before, after), { empty: waiting.empty, focusKey: waiting.focusKey });
      }
    } else {
      setSaveState("error");
      // Kept waiting, so "Save now" succeeding still brings the receipt; until then it says not saved.
      if (waiting && pendingReceipt.current === waiting) {
        setReceipt({ place: waiting.place, lines: [], status: "failed", focusKey: waiting.focusKey });
      }
    }
  }

  /** Debounced autosave: the last edit wins; the line reads "Unsaved changes…" until it lands. */
  function scheduleSave(next: Scenario) {
    setSaveState("dirty");
    if (autosaveTimer.current !== null) window.clearTimeout(autosaveTimer.current);
    autosaveTimer.current = window.setTimeout(() => {
      autosaveTimer.current = null;
      void persist(next);
    }, AUTOSAVE_DELAY_MS);
  }

  /** A new focus key for a receipt in the left list, where the control used is gone once answered. */
  function focusKeyFor(place: ReceiptPlace): number | undefined {
    counter.current += 1;
    return place === "told" ? counter.current : undefined;
  }

  /** Shows a kept answer's receipt where it was given, and keeps its lines in "This visit". */
  function showReceipt(place: ReceiptPlace, lines: string[], extra: { empty?: string; focusKey?: number } = {}) {
    setReceipt({ place, lines, status: "saved", empty: extra.empty, focusKey: extra.focusKey ?? focusKeyFor(place) });
    if (lines.length > 0) setThisVisit((kept) => [...lines, ...kept].slice(0, THIS_VISIT_LINES));
  }

  /**
   * One of the idea's own answers (kept with the map: the structure, a map pick, buying equipment, the
   * person's own incorporation number, first-year sales): shown at once and saved after the usual pause.
   * Unless `place` is null, its receipt waits for that save and is worked out from the idea before and the
   * idea the save read back (`persist`); until then the receipt says the answer is being saved.
   * `opts.before` and `opts.whatIf` set the two runs' what-if (Keep compares without one).
   */
  function changeScenario(
    next: Scenario,
    place: ReceiptPlace | null,
    opts: { before?: RoadEvaluationInput | null; whatIf?: number | null; empty?: string } = {},
  ) {
    // The example's answers are its own: nothing changes on screen, nothing is saved, the banner says so.
    if (isExample) return sayExample();
    const before = opts.before !== undefined ? opts.before : inputFor();
    setCurrentScenario(next);
    setScenario(next);
    if (place && before) {
      counter.current += 1;
      const seq = counter.current;
      const earlier = pendingReceipt.current;
      // Edits within one pause go in one save: the receipt runs from before the first of them.
      pendingReceipt.current = {
        before: earlier?.before ?? before,
        place,
        whatIf: opts.whatIf !== undefined ? opts.whatIf : whatIf,
        empty: opts.empty,
        focusKey: place === "told" ? seq : undefined,
        seq,
      };
      setReceipt({ place, lines: [], status: "saving", focusKey: pendingReceipt.current.focusKey });
    } else if (pendingReceipt.current) {
      // An edit with no receipt of its own (typing a number) still goes in the waiting one's save.
      pendingReceipt.current = { ...pendingReceipt.current, seq: (counter.current += 1) };
    }
    scheduleSave(next);
  }

  function handleBranchChange(decision: BranchDecision, optionId: CFENodeId, place: ReceiptPlace = "map") {
    changeScenario(updateScenarioBranch(scenario, decision.id, optionId), place);
  }

  /** The person's own "I'd incorporate at $___" (2026-10-11): theirs, saved like a branch pick. */
  function handleIncorporateAtChange(value: number | null) {
    // Saved as the person types, so no receipt per keystroke; the one-question box gives one on Save.
    changeScenario(setIncorporateAt(scenario, value), null);
  }

  /** S2.5.4d: the one place the person sets their structure. "" = not set (map assumes sole-prop). */
  function handleStructureChange(value: "" | VentureStructure) {
    const next: Scenario = {
      ...scenario,
      profile: {
        ...scenario.profile,
        structure: value === "" ? "sole-prop" : value,
        structureSource: value === "" ? "assumed" : "user",
      },
    };
    changeScenario(next, "told");
  }

  /** "Save now": skips the pause. Also the retry when autosave reported the database away. */
  function handleSave() {
    if (isExample) return sayExample();
    if (autosaveTimer.current !== null) {
      window.clearTimeout(autosaveTimer.current);
      autosaveTimer.current = null;
    }
    void persist(scenario);
  }

  const evaluation = roadEvaluation;
  const selectedStep = selectedNodeId ? road.steps.find((s) => s.id === selectedNodeId) : undefined;
  const selectedStepEvaluation = selectedNodeId ? stepEvaluations.get(selectedNodeId) : undefined;
  const canSave = ventureId !== null && kept !== null;
  const markOf = new Map((kept?.skillMarks ?? []).flatMap((m) => (m.skillItemId !== null ? [[m.skillItemId, m.mark] as const] : [])));

  function openStep(stepId: string) {
    setSelectedNodeId(stepId);
    setRightPanel("node");
    setAnswerError(null);
    setReceipt(null);
  }

  /** Opens a list in the right-hand panel, with its overlay on, as its gauge does. */
  function openList(list: "skills" | "money") {
    setAnswerError(null);
    setReceipt(null);
    setActiveGauge(list);
    setOverlays((o) => ({ ...o, [list]: true }));
    setRightPanel(list);
  }

  /** Opens Compare on a fork (the first fork in road order when none is named). */
  function openCompare(forkId?: string) {
    setAnswerError(null);
    setReceipt(null);
    setActiveGauge(null);
    setCompareForkId(forkId ?? compareForks[0]?.id ?? null);
    setRightPanel("compare");
  }

  /**
   * A gauge opens its overlay and its list (Steps opens the next step on the road). Pressed again, it
   * closes what it opened, so its pressed state is a real toggle; the overlay it switched on stays on.
   */
  function handleGauge(gauge: GaugeId) {
    setAnswerError(null);
    setReceipt(null);
    if (activeGauge === gauge) {
      setActiveGauge(null);
      if (gauge === "steps") setSelectedNodeId(null);
      setRightPanel(null);
      return;
    }
    setActiveGauge(gauge);
    if (gauge === "steps") {
      const next = evaluation ? nextOnYourRoad(evaluation, scenario, 1)[0] : undefined;
      if (next) openStep(next.stepId);
      return;
    }
    if (gauge === "skills") setOverlays((o) => ({ ...o, skills: true }));
    if (gauge === "money") setOverlays((o) => ({ ...o, money: true }));
    setRightPanel(gauge);
  }

  /**
   * Waits for one of the person's answers to be saved; on success reads back what is kept and shows the
   * receipt where it was given (road evaluation before the save against after it, from what was read
   * back), else shows the refusal.
   */
  async function saveAnswer(pending: () => ReturnType<typeof postJson>, place: ReceiptPlace, empty?: string): Promise<string | null> {
    // On the example nothing is sent: `pending` is only called below, so no request ever starts.
    if (isExample) {
      sayExample();
      return words.example.cantKeep;
    }
    setAnswerError(null);
    const before = inputFor();
    const result = await pending();
    if (!result.ok) {
      setAnswerError(result.error);
      return result.error;
    }
    const fresh = await reload();
    const after = fresh ? inputFor({ kept: fresh.kept, figures: fresh.figures }) : null;
    if (before && after) showReceipt(place, answerReceipt(before, after), { empty });
    return null;
  }

  function handleStatus(status: StepStatus | null) {
    if (!ventureId || !selectedNodeId) return;
    const stepId = selectedNodeId;
    void saveAnswer(() => postJson(`/api/futures/${encodeURIComponent(ventureId)}/progress`, { roadId: road.id, stepId, status }), "step");
  }

  /** Resolves once the ticks are saved and read back, so the step panel can hold its boxes until then. */
  function handleTicks(doneWhenIds: string[]): Promise<unknown> {
    if (!ventureId || !selectedNodeId) return Promise.resolve();
    const stepId = selectedNodeId;
    return saveAnswer(() => postJson(`/api/futures/${encodeURIComponent(ventureId)}/progress`, { roadId: road.id, stepId, doneWhenIds }), "step");
  }

  function handleMark(skill: SkillKey, mark: SkillMarkValue | null, place: ReceiptPlace) {
    void saveAnswer(() => postJson("/api/skill-marks", { ...skill, mark }), place);
  }

  /** The person's pick of job for the government's skills list, or null to take it back. */
  function handlePickJob(code: string | null) {
    if (!ventureId) return;
    // Picked in the Skills list, so its receipt shows there.
    void saveAnswer(() => postJson(`/api/futures/${encodeURIComponent(ventureId)}/job`, { code }), "skills");
  }

  /** From the step panel: the Skills list, where the job's list is (or the question, when none is picked). */
  function openJobList() {
    openList("skills");
  }

  // The step panel's one line about the job's list: its name, its count, and how many the person marked.
  const jobCount = evaluation?.gauges.skills.yourPickOfJob ?? null;
  const jobForStep = jobCount ? { label: jobCount.label, listed: jobCount.listed, marked: jobCount.listed - jobCount.notMarked } : null;

  /**
   * The person's own number (a quote for a named cost line, or their savings) is proposed, then the agree
   * prompt opens; it counts only once they click Agree there. Dated the person's own day: a planning
   * number is that day's amount.
   */
  async function proposeNumber(figure: Record<string, unknown>, place: ReceiptPlace): Promise<string | null> {
    if (isExample) {
      sayExample();
      return words.example.cantKeep;
    }
    if (!ventureId) return null;
    setAnswerError(null);
    // A proposed number counts for nothing, so the receipt compares now with after the person agrees.
    const before = inputFor();
    reviewBefore.current = before ? { input: before, place } : null;
    const result = await postJson("/api/figures/propose", {
      ventureId,
      source: { kind: "typed", label: "typed by you" },
      figures: [{ periodStart: today, periodEnd: today, currency: "CAD", ...figure }],
    });
    if (!result.ok) return result.error;
    const created = (result.body as { figures?: FigureView[] } | null)?.figures ?? [];
    if (created.length > 0) setReviewing(created);
    return null;
  }

  function handleProposeQuote(lineId: string, amountCents: number, from: CostLineAmountFrom) {
    if (!selectedNodeId) return Promise.resolve(null);
    return proposeNumber(
      {
        kind: "start-up-cost-line",
        amountCents,
        costLine: { roadId: road.id, stepId: selectedNodeId, lineId, amountFrom: from },
      },
      "step",
    );
  }

  async function handleSaveDate(month: string | null): Promise<string | null> {
    if (!ventureId) return null;
    const id = ventureId;
    return saveAnswer(() => postJson(`/api/futures/${encodeURIComponent(id)}/date`, { month }), "date");
  }

  /** After the agree prompt: the receipt of the number agreed, against the screen before it was proposed. */
  async function afterAgree() {
    const fresh = await reload();
    const before = reviewBefore.current;
    reviewBefore.current = null;
    const after = fresh ? inputFor({ kept: fresh.kept, figures: fresh.figures }) : null;
    if (before && after) showReceipt(before.place, answerReceipt(before.input, after));
  }

  // --- What you've told DotAmi: Change and Take back

  function handleToldChange(row: ToldRow) {
    const change = row.change;
    if (change.kind === "step") openStep(change.stepId);
    else if (change.kind === "skills") openList("skills");
    else if (change.kind === "compare") openCompare(change.forkId);
    else if (change.kind === "intake") router.push("/intake");
    else if (change.kind === "figures" && ventureId) router.push(`/ventures#figures-${encodeURIComponent(ventureId)}`);
  }

  /** Takes one answer back the way `withoutAnswer` does, so the receipt is the row's "what it unlocked" undone. */
  function handleTakeBack(row: ToldRow) {
    if (isExample) return sayExample();
    const back = row.takeBack;
    const id = ventureId ? encodeURIComponent(ventureId) : null;
    // A take back that changes nothing on the road still says what was taken back.
    const empty = words.receipts.nothingAfter(row.takenBack);
    if (back.kind === "idea") {
      const next = withoutIdeaAnswer(scenario, row.id);
      if (next) changeScenario(next, "told", { empty });
      return;
    }
    if (!id) return;
    if (back.kind === "skill-mark") void saveAnswer(() => postJson("/api/skill-marks", { skillItemId: back.skillItemId, mark: null }), "told", empty);
    else if (back.kind === "own-skill") void saveAnswer(() => postJson("/api/skill-marks", { ownLabel: back.ownLabel, mark: null }), "told", empty);
    else if (back.kind === "step-status") void saveAnswer(() => postJson(`/api/futures/${id}/progress`, { roadId: road.id, stepId: back.stepId, status: null }), "told", empty);
    else if (back.kind === "step-ticks") void saveAnswer(() => postJson(`/api/futures/${id}/progress`, { roadId: road.id, stepId: back.stepId, doneWhenIds: [] }), "told", empty);
    else if (back.kind === "figures") void saveAnswer(() => postJson("/api/figures/retract", { ventureId, figureIds: back.figureIds }), "told", empty);
    else if (back.kind === "date") void saveAnswer(() => postJson(`/api/futures/${id}/date`, { month: null }), "told", empty);
    else if (back.kind === "ending") void saveAnswer(() => postJson(`/api/futures/${id}/ending`, { forkId: back.forkId, stepId: null }), "told", empty);
  }

  function handleNotToldAnswer(row: NotToldRow) {
    if (row.answer === "skills" || row.answer === "money") openList(row.answer);
    else if (row.answer === "compare") openCompare(row.forkId);
  }

  /** The one-question box for each question the box asks, saved the way its own control elsewhere saves it. */
  function boxFor(question: BoxQuestion, close: () => void, dontKnow: () => void) {
    const q = words.questions;
    const done = (refused: string | null) => {
      if (!refused) close();
      return refused;
    };
    const viaScenario = (next: Scenario) => {
      changeScenario(next, "told");
      close();
      return Promise.resolve(null);
    };
    let title: string;
    let why: string;
    let control: BoxControl;
    let save: (value: string | number) => Promise<string | null>;
    if (question === "date") {
      title = q.date.question;
      why = q.date.why;
      control = { kind: "month", min: today.slice(0, 7), value: kept?.future.targetMonth ?? null };
      save = async (month) => (ventureId ? done(await saveAnswer(() => postJson(`/api/futures/${encodeURIComponent(ventureId)}/date`, { month }), "told")) : null);
    } else if (question === "savings") {
      title = q.savings.question;
      why = q.savings.why;
      control = { kind: "money" };
      save = async (cents) => done(await proposeNumber({ kind: "savings-for-start", amountCents: cents }, "told"));
    } else if (question === "structure") {
      title = q.structure.question;
      why = q.structure.why;
      control = {
        kind: "choice",
        options: [
          { id: "sole-prop", label: q.structure.soleProp },
          { id: "corporation", label: q.structure.corporation },
        ],
        value: structureAssumed ? null : scenario.profile.structure,
      };
      save = (value) =>
        viaScenario({ ...scenario, profile: { ...scenario.profile, structure: value as VentureStructure, structureSource: "user" } });
    } else if (question === "equipment") {
      title = q.equipment.question;
      why = q.equipment.why;
      const answered = scenario.profile.capitalPurchasePlanned;
      control = {
        kind: "choice",
        options: [
          { id: "yes", label: q.equipment.yes },
          { id: "no", label: q.equipment.no },
        ],
        value: answered === undefined ? null : answered ? "yes" : "no",
      };
      save = (value) => viaScenario({ ...scenario, profile: { ...scenario.profile, capitalPurchasePlanned: value === "yes" } });
    } else if (question === "incorporate-at") {
      title = q.incorporateAt.question;
      why = q.incorporateAt.why;
      control = { kind: "dollars", label: q.incorporateAt.box, value: scenario.state.incorporateAt ?? null };
      save = (dollars) => viaScenario(setIncorporateAt(scenario, Number(dollars)));
    } else {
      // A pick at one of the map's forks: its two sides, by the road's own step names.
      const forkId = question.slice("map-pick:".length) as BranchDecisionId;
      const fork = road.forks.find((x) => x.id === forkId);
      const decision = branchDecisions.find((d) => d.id === forkId);
      if (!fork || !decision) return null;
      title = q.mapPick.question(fork.label);
      why = q.mapPick.why;
      control = {
        kind: "choice",
        options: fork.sides.map((side) => ({ id: side, label: road.steps.find((x) => x.id === side)?.label ?? side })),
        value: isBranchDecided(forkId, scenario.state) ? scenario.state.activeBranches[forkId] : null,
      };
      save = (value) => viaScenario(updateScenarioBranch(scenario, decision.id, value as CFENodeId));
    }
    return <QuestionBox title={title} why={why} control={control} canSave={canSave} onSave={save} onDontKnow={dontKnow} />;
  }

  // --- Compare and This is mine

  function handleThisIsMine(forkId: string, stepId: string) {
    if (isExample) return sayExample();
    const decision = branchDecisions.find((d) => d.id === forkId);
    // Road 0's forks are the map's toggles, kept with the map; every other road's ending is kept on the future.
    if (road.id === generalRoadV2026.id && decision) {
      handleBranchChange(decision, stepId as CFENodeId, "compare");
      return;
    }
    if (!ventureId) return;
    void saveAnswer(() => postJson(`/api/futures/${encodeURIComponent(ventureId)}/ending`, { forkId, stepId }), "compare");
  }

  // --- The what-if

  function handleTryWhatIf(dollars: number) {
    const before = inputFor();
    const after = inputFor({ whatIf: dollars });
    setWhatIf(dollars);
    if (before && after) showReceipt("what-if", answerReceipt(before, after));
  }

  /** Keep: the what-if becomes the idea's own first-year sales (never a figure), and the what-if goes. */
  function handleKeepWhatIf() {
    // Keeping would make it the example's first-year sales: the example keeps nothing, and its what-if stays on.
    if (isExample) return sayExample();
    if (whatIf === null) return;
    const next = keepWhatIf(scenario, whatIf);
    setWhatIf(null);
    // Compared without the what-if on either side, so the receipt names only the number kept; it waits
    // for the save like every answer kept with the map.
    changeScenario(next, "what-if", { before: inputFor({ whatIf: null }), whatIf: null });
  }

  function handleClearWhatIf() {
    setWhatIf(null);
    if (receipt?.place === "what-if") setReceipt(null);
  }

  // The lists, the step panel, Compare and the what-if bar show a receipt once its save has answered (the
  // save line says while it is on its way, or failed); the left list shows each state, as its row is gone.
  const receiptAt = (place: ReceiptPlace) => (receipt?.place === place && receipt.status === "saved" ? receipt.lines : null);
  const toldReceipt: ShownReceipt | null = receipt?.place === "told" ? receipt : null;
  const compareView = rightPanel === "compare" && compareForkId && evaluation ? compareEndings(inputFor()!, compareForkId) : null;

  // Road 0's toggle for the fork the selected step is a side of, so it can be flipped from the panel too.
  const selectedDecision = selectedNodeId
    ? branchDecisions.find((d) => d.options.some((o) => o.id === selectedNodeId))
    : undefined;

  const showRightSlot =
    rightPanel === "playbook" ||
    rightPanel === "skills" ||
    rightPanel === "money" ||
    rightPanel === "date" ||
    rightPanel === "compare" ||
    (rightPanel === "node" && selectedStep !== undefined && selectedStepEvaluation !== undefined);

  /** What the right-hand panel holds, named on its folded strip. */
  const panelTitle =
    rightPanel === "node"
      ? (selectedStep?.label ?? "")
      : rightPanel === "skills"
        ? words.lists.skillsTitle
        : rightPanel === "money"
          ? words.lists.moneyTitle
          : rightPanel === "date"
            ? words.lists.dateTitle
            : rightPanel === "compare"
              ? words.compare.region
              : words.folds.exportTitle;

  // The body's columns from 768 px (the rail and the road) and from 1024 px (with the panel, when one is
  // open). A folded rail or panel keeps a narrow strip, so its way back stays where it was. The open rail is
  // up to 280 px wide so a told / not-told row and its receipt fit (part 2).
  const railColumn = folds.rail ? STRIP : "minmax(220px,280px)";
  const panelColumn = folds.panel ? STRIP : "minmax(280px,380px)";
  const bodyColumns = {
    "--cockpit-cols-md": `${railColumn} minmax(0,1fr)`,
    "--cockpit-cols-lg": showRightSlot ? `${railColumn} minmax(0,1fr) ${panelColumn}` : `${railColumn} minmax(0,1fr)`,
  } as CSSProperties;
  const everythingFolded = allFolded(folds);
  // The header's button names the regions that are drawn: the panel only while it holds something, the
  // goal bar, the legend and the what-if bar only once the road is evaluated.
  const foldAllControls = [
    RAIL_ID,
    ...(evaluation ? [GOAL_BAR_ID, LEGEND_ID, WHAT_IF_BAR_ID] : []),
    ...(showRightSlot ? [PANEL_ID] : []),
  ].join(" ");
  // While a sheet covers the page on a phone, everything behind it is inert.
  const behindSheet = railModal || panelModal;

  return (
    // On the example every panel's "nothing can be kept" line says it is an example (example-mode.tsx).
    <ExampleNoteContext.Provider value={isExample ? words.example.cantKeep : null}>
    {/* The example's banner: above the cockpit, outside every region that folds, so it never folds, and on a
        phone it stays at the top of the window (example-mode.tsx). On a person's own future this adds nothing. */}
    <ExampleFrame example={example ?? null} notice={exampleNotice} inert={behindSheet}>
    <div
      className={`grid ${example ? "min-h-0 flex-1" : "h-[calc(100vh-2.5rem)]"} grid-rows-[52px_auto_1fr] overflow-hidden bg-ink max-md:h-auto max-md:min-h-[calc(100vh-2.5rem)] max-md:overflow-visible`}
    >
      {/* Header — S2.5.4c: minmax(0, …) columns so nothing overlaps when the window is narrow. */}
      <header
        inert={behindSheet}
        className="grid grid-cols-[auto_minmax(0,1fr)_auto] border-b border-rule bg-[#0f0e12] md:grid-cols-[240px_minmax(0,1fr)_auto]"
      >
        <div className="flex min-w-0 items-center gap-3 border-r border-rule px-4 md:gap-[18px] md:px-[22px]">
          {/* The example has no saved futures behind it: its way back is the front door it came from. */}
          <Link href={isExample ? "/" : "/ventures"} className="font-mono text-[11px] text-stone transition hover:text-paper">
            {isExample ? words.example.back : "← Your futures"}
          </Link>
          {/* Below 768 px the header keeps the idea's name and its buttons; the word mark gives way. */}
          <span className="max-md:hidden">
            <WordMark size="sm" />
          </span>
        </div>

        <div className="flex min-w-0 items-center px-3 md:px-5">
          <span
            className="min-w-0 truncate font-serif text-sm font-bold tracking-tight text-paper"
            title={scenario.profile.name}
          >
            {scenario.profile.name}
          </span>
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2 border-l border-rule px-3 md:px-5">
          {/* Below 768 px the rail is a sheet, opened here. */}
          <Pill variant="ghost" size="small" className="md:hidden" aria-expanded={railSheet} aria-controls={RAIL_ID} onClick={() => setRailSheet(true)}>
            {words.folds.railSheet.open}
          </Pill>
          <span className="hidden md:inline-flex">
            <FoldButton
              folded={everythingFolded}
              label={everythingFolded ? words.folds.all.show : words.folds.all.fold}
              controls={foldAllControls}
              onClick={toggleAll}
            />
          </span>
          <Pill
            variant={rightPanel === "playbook" ? "maple" : "maple-out"}
            size="small"
            // The example makes no plan: the banner says nothing here is kept.
            onClick={() => (isExample ? sayExample() : setRightPanel(rightPanel === "playbook" ? null : "playbook"))}
          >
            Export
          </Pill>
        </div>
      </header>

      <div inert={behindSheet} className="min-w-0">
        {evaluation ? (
          <GoalBar
            road={road}
            evaluation={evaluation}
            scenario={scenario}
            firstWords={kept?.firstWords ?? null}
            destination={kept?.destination ?? null}
            target={kept?.incomeWanted ?? null}
            active={activeGauge}
            onGauge={handleGauge}
            onCompare={compareForks.length > 0 ? () => openCompare() : undefined}
            folded={folds.goal}
            onToggleFold={() => toggle("goal")}
            person={example?.person ?? null}
            targetFrom={targetFrom}
          />
        ) : null}
      </div>

      {/* Body: one column below 768 px, the rail and the road from 768 px, and the panel too from 1024 px. */}
      <div
        style={bodyColumns}
        className="grid min-h-0 grid-cols-1 overflow-hidden md:grid-cols-[var(--cockpit-cols-md)] lg:grid-cols-[var(--cockpit-cols-lg)] max-md:overflow-visible"
      >
        {/* Left rail: a column from 768 px, folding to a strip; below that a full-width sheet, closed until
            the header's button opens it. */}
        <aside
          id={RAIL_ID}
          ref={railRef}
          aria-label={words.folds.railSheet.open}
          inert={panelModal}
          onScroll={(event) => {
            // Its place while open, to come back to after a fold (folding scrolls it to the top).
            if (!folds.rail) railScroll.current = event.currentTarget.scrollTop;
          }}
          className={`min-w-0 border-r border-rule bg-ink3 ${folds.rail ? "md:overflow-hidden" : "md:overflow-y-auto"} ${
            // The sheet starts under the example's banner, which stays on screen (0 px on a person's own future).
            railSheet
              ? "max-md:fixed max-md:inset-x-0 max-md:bottom-0 max-md:top-[var(--example-banner-h,0px)] max-md:z-40 max-md:overflow-y-auto"
              : "max-md:hidden"
          }`}
        >
          {folds.rail ? (
            <div className="hidden h-full md:block">
              <FoldedStrip region="rail" label={words.folds.rail.show} controls={RAIL_ID} onClick={() => toggle("rail")} />
            </div>
          ) : null}
          {/* Folded on a wide window, this is hidden, never removed: what it holds is there when it opens. */}
          <div className={`flex min-h-full flex-col gap-3.5 p-5 ${folds.rail ? "md:hidden" : ""}`}>
            <div className="flex justify-end">
              <span className="hidden md:inline-flex">
                <FoldButton folded={false} region="rail" label={words.folds.rail.fold} controls={RAIL_ID} onClick={() => toggle("rail")} />
              </span>
              <Pill variant="ghost" size="small" className="md:hidden" onClick={() => setRailSheet(false)}>
                {words.folds.railSheet.close}
              </Pill>
            </div>
            {/* The example's story first: what each of the example person's answers changed. */}
            {example && story ? <ExampleStory person={example.person} parts={story} /> : null}
            {/* Part 2: what the person told DotAmi and what isn't told yet, above the rail as it was. */}
            {told ? (
              <ToldList
                person={example?.person ?? null}
                rows={told.rows}
                notTold={told.notTold}
                receipt={toldReceipt}
                canSave={canSave}
                error={rightPanel === null ? answerError : null}
                onChange={handleToldChange}
                onTakeBack={handleTakeBack}
                onAnswer={handleNotToldAnswer}
                boxFor={boxFor}
              />
            ) : null}

            <div className="border-t border-rule-soft pt-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-stone">Venture</p>
              <h3 className="mt-0.5 font-serif text-[22px] font-bold tracking-tight">
                {scenario.profile.name}
              </h3>
              {/* "Not said" stays as written; a kind the person gave is capitalised, as before. */}
              <p className={`text-[11px] text-stone ${isNotSaid(scenario.profile, "venture-type") ? "" : "capitalize"}`}>
                {ventureLine(scenario.profile)}
              </p>
            </div>

            {/* [8e] A period has ended that this idea's agreed figures don't cover. */}
            {ideaFigures ? (
              <FigureReminderBanners
                ideaId={ideaFigures.ideaId}
                ideaName={scenario.profile.name}
                figures={ideaFigures.figures}
                today={today}
                reminders={reminders}
                // The entry form lives on the ideas page; this opens it on this idea's card.
                addFiguresHref={`/ventures#figures-${encodeURIComponent(ideaFigures.ideaId)}`}
              />
            ) : null}

            {/* What a picked future was saved without says "Not said"; a target of no number is "not
                given", never $0 (lib/cockpit/profile-rows.ts). */}
            {profileRows(scenario.profile).map((row) => (
              <FieldRow key={row.label} label={row.label} value={row.value} />
            ))}
            <div className="border-t border-rule-soft py-2 text-xs">
              <div className="grid grid-cols-[1fr_auto] items-baseline gap-4">
                <span className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-stone">
                  Structure
                </span>
                <select
                  aria-label="Structure"
                  disabled={isExample}
                  value={structureAssumed ? "" : scenario.profile.structure}
                  onChange={(e) => handleStructureChange(e.target.value as "" | VentureStructure)}
                  className="rounded-sm border border-rule bg-ink px-1.5 py-0.5 font-mono text-[11px] text-paper"
                >
                  <option value="">Not set</option>
                  <option value="sole-prop">Sole prop</option>
                  <option value="corporation">Corporation</option>
                </select>
              </div>
              {structureAssumed ? (
                <p className="mt-1 text-[10px] leading-snug text-stone-dim">
                  Map assumes sole prop until you set it.
                </p>
              ) : null}
              <ExampleOnlyNote className="mt-1 text-[10px] leading-snug text-amber" />
            </div>
            <FieldRow
              label="Employed"
              // A future picked on Pick a future was saved before anyone asked: say so in words, not as a code.
              value={scenario.profile.employmentStatus === "not-said" ? EMPLOYMENT_WORDS["not-said"] : scenario.profile.employmentStatus}
            />

            {/* S2.5.4a "In your words" — dated verbatim statements, shown back, never scored. On the example,
                the example person's words from its file: never the real person's statements. */}
            <section className="border-t border-rule-soft pt-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-stone">
                {example ? words.example.theirWords(example.person) : "In your words"}
              </p>
              <div className="mt-2">
                {example ? (
                  example.kept.destination ? (
                    <p className="text-[12px] leading-snug text-paper">
                      “{example.kept.destination.text}”{" "}
                      <span className="font-mono text-[9.5px] text-stone">{example.kept.destination.saidAt}</span>
                    </p>
                  ) : null
                ) : (
                  <PersonStatements variant="rail" />
                )}
              </div>
            </section>

            <StructureLadderRail activeStepId={ladderStepId} />
            {structureAssumed ? (
              <section className="border-t border-rule-soft pt-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-stone">
                  Prep-tool references
                </p>
                <p className="mt-1 text-[10px] leading-snug text-stone-dim">
                  Appear once your structure is set.
                </p>
              </section>
            ) : (
              <TemplatesRail templateIds={ALL_TEMPLATE_IDS} />
            )}

            {/* The example keeps nothing, so it has no save line: its one way on is to start your own. */}
            {example ? (
              <div className="mt-4 flex flex-col gap-2.5">
                <Link href="/start">
                  <Pill variant="maple" className="w-full justify-center">
                    {words.example.startOwn}
                  </Pill>
                </Link>
              </div>
            ) : (
            <div className="mt-4 flex flex-col gap-2.5">
              <Pill variant="maple" className="w-full justify-center" onClick={() => handleSave()}>
                {saveState === "saving" ? "Saving…" : "Save now"}
              </Pill>
              {/* The save line — always truthful about where the person's edits are. */}
              {saveState === "dirty" ? (
                <p className="text-center font-mono text-[10px] text-stone">Unsaved changes…</p>
              ) : null}
              {saveState === "saved" && savedAt ? (
                <p className="text-center font-mono text-[10px] text-sage">Saved · {formatSavedAt(savedAt)}</p>
              ) : null}
              {saveState === "error" ? (
                <p className="text-center text-[10px] text-maple">
                  Save unavailable — kept in this tab. Save now retries.
                </p>
              ) : null}
              {saveState === "idle" ? (
                <p className="text-center font-mono text-[10px] text-stone-dim">Edits save automatically.</p>
              ) : null}
              <Link href="/intake">
                <Pill variant="ghost" className="w-full justify-center">
                  Edit venture profile
                </Pill>
              </Link>
              <Link href="/ventures">
                <Pill variant="ghost" className="w-full justify-center">
                  {words.allFutures}
                </Pill>
              </Link>
            </div>
            )}

            <p className="mt-auto border-t border-rule-soft pt-4 text-[10.5px] leading-snug text-stone">
              <span className="font-serif italic text-paper">Compass, not GPS.</span> Profile drives
              which surfaces appear on the map. DotAmi never files, predicts, or replaces an
              accountant.
            </p>
          </div>
        </aside>

        {/* Canvas — S2.5.4j: tier columns, not a graph; the overlay switches over it and "Next on your
            road" under it (2026-10-12). From 768 px the column scrolls down when what it holds is taller
            than the window (a what-if on, with its receipt): the map's box never shrinks below the road's
            minimum area plus the legend, so the legend can't slide under the what-if bar and cover its
            own fold button, as it did until 2026-10-14 (12-folding-and-phone.md). */}
        <div inert={behindSheet} className="relative flex min-h-0 flex-col bg-ink4 md:overflow-y-auto">
          {evaluation ? (
            <>
              <OverlaySwitches
                overlays={overlays}
                counts={overlayCounts(road, evaluation, scenario)}
                onToggle={(overlay) => setOverlays((o) => ({ ...o, [overlay]: !o[overlay] }))}
              />
              {/* No min-h-0 here: the box's minimum is the road's minimum area plus the legend. */}
              <div className="flex-1">
                <StrategyMap
                  // The idea's own road: today's general road until the person picks another future.
                  road={road}
                  scenario={scenario}
                  evaluation={evaluation.rules}
                  selectedStepId={selectedNodeId}
                  onSelectStep={(stepId) => {
                    setActiveGauge(null);
                    openStep(stepId);
                  }}
                  onBranchChange={handleBranchChange}
                  overlays={overlays}
                  stepEvaluations={stepEvaluations}
                  linkedSkillId={selectedSkillId}
                  cockpit={{ legendFolded: folds.legend, onToggleLegend: () => toggle("legend") }}
                />
              </div>
              <WhatIfBar
                whatIf={whatIf}
                receipt={receiptAt("what-if")}
                sinceLastTime={thisVisit}
                onTry={handleTryWhatIf}
                onKeep={handleKeepWhatIf}
                onClear={handleClearWhatIf}
                fold={{ folded: folds.whatIf, onToggle: () => toggle("whatIf") }}
              />
              <NextOnYourRoad road={road} evaluation={evaluation} scenario={scenario} onSelectStep={openStep} />
            </>
          ) : null}
        </div>

        {/* Right panel: one thing at a time. A column from 1024 px; below that it opens over the road, a
            full-width sheet on a phone and a 420 px drawer under the header between. Folded, it is a strip
            (or a bar along the bottom on a narrow window, with room left for it under the page's last
            line: app/globals.css) naming what it holds; what it holds stays, hidden. */}
        {showRightSlot ? (
          <div
            id={PANEL_ID}
            ref={panelRef}
            inert={railModal}
            {...(folds.panel ? { "data-cockpit-bottom-bar": "" } : {})}
            className={`flex min-h-0 min-w-0 flex-col bg-ink3 ${
              folds.panel
                ? "max-lg:fixed max-lg:inset-x-0 max-lg:bottom-0 max-lg:z-40 max-lg:border-t max-lg:border-rule"
                : // Under the example's banner too, when there is one (its height is 0 px on a person's own future).
                  "max-lg:fixed max-lg:inset-x-0 max-lg:bottom-0 max-lg:z-40 max-md:top-[var(--example-banner-h,0px)] md:max-lg:top-[calc(52px_+_var(--example-banner-h,0px))] md:max-lg:left-auto md:max-lg:w-[420px] md:max-lg:shadow-2xl"
            }`}
          >
            {folds.panel ? (
              <>
                <div className="hidden h-full border-l border-rule lg:block">
                  <FoldedStrip region="panel" label={words.folds.panel.show(panelTitle)} controls={PANEL_ID} onClick={() => toggle("panel")} />
                </div>
                <div className="lg:hidden">
                  <FoldedBar region="panel" label={words.folds.panel.show(panelTitle)} controls={PANEL_ID} onClick={() => toggle("panel")} />
                </div>
              </>
            ) : (
              <div className="flex justify-end border-b border-l border-rule px-3 py-1 max-lg:border-l-0">
                <FoldButton folded={false} region="panel" label={words.folds.panel.fold} controls={PANEL_ID} onClick={() => toggle("panel")} />
              </div>
            )}
            <div className={`min-h-0 flex-1 ${folds.panel ? "hidden" : ""}`}>
              {rightPanel === "node" && selectedStep && selectedStepEvaluation && evaluation ? (
                <div className="h-full overflow-y-auto border-l border-rule bg-ink3 max-lg:border-l-0">
                  <StepPanel
                    road={road}
                    step={selectedStep}
                    evaluation={selectedStepEvaluation}
                    rules={evaluation.rules}
                    skillItems={skillItemsV2026}
                    marks={markOf}
                    selectedSkillId={selectedSkillId}
                    branch={
                      selectedDecision
                        ? {
                            decision: selectedDecision,
                            activeOptionId: scenario.state.activeBranches[selectedDecision.id],
                            isDefault: !isBranchDecided(selectedDecision.id, scenario.state),
                            onChange: (optionId) => handleBranchChange(selectedDecision, optionId, "step"),
                          }
                        : null
                    }
                    canSave={canSave}
                    error={answerError}
                    onStatus={handleStatus}
                    onTicks={handleTicks}
                    onMark={(skillItemId, mark) => handleMark({ skillItemId }, mark, "step")}
                    onSelectSkill={setSelectedSkillId}
                    job={jobForStep}
                    onOpenJobList={openJobList}
                    onProposeQuote={handleProposeQuote}
                    province={scenario.profile.province}
                    ownNumber={scenario.state.incorporateAt ?? null}
                    onOwnNumberChange={handleIncorporateAtChange}
                    onClose={() => {
                      setSelectedNodeId(null);
                      setRightPanel(null);
                    }}
                    receipt={receiptAt("step")}
                    // Only on a side of a fork Compare is offered at; anywhere else the panel shows no Compare at all.
                    onCompare={compareForks.some((fork) => fork.sides.includes(selectedStep.id)) ? openCompare : undefined}
                  />
                </div>
              ) : null}

              {rightPanel === "skills" ? (
                <SkillsListPanel
                  road={road}
                  skillItems={skillItemsV2026}
                  marks={kept?.skillMarks ?? []}
                  selectedSkillId={selectedSkillId}
                  canSave={canSave}
                  error={answerError}
                  job={job}
                  jobPickedOn={kept?.future.job?.pickedOn ?? null}
                  onMark={(skill, mark) => handleMark(skill, mark, "skills")}
                  onSelectSkill={setSelectedSkillId}
                  onPickJob={handlePickJob}
                  receipt={receiptAt("skills")}
                  onClose={() => {
                    setRightPanel(null);
                    setActiveGauge(null);
                  }}
                />
              ) : null}

              {rightPanel === "money" && evaluation ? (
                <MoneyListPanel
                  road={road}
                  evaluation={evaluation}
                  canSave={canSave}
                  error={answerError}
                  onProposeSavings={(amountCents) => proposeNumber({ kind: "savings-for-start", amountCents }, "money")}
                  receipt={receiptAt("money")}
                  onSelectStep={openStep}
                  onClose={() => {
                    setRightPanel(null);
                    setActiveGauge(null);
                  }}
                />
              ) : null}

              {rightPanel === "date" && evaluation ? (
                <DatePanel
                  targetMonth={kept?.future.targetMonth ?? null}
                  monthsFromToday={evaluation.gauges.date?.monthsFromToday ?? null}
                  today={today}
                  canSave={canSave}
                  error={answerError}
                  onSave={handleSaveDate}
                  receipt={receiptAt("date")}
                  onClose={() => {
                    setRightPanel(null);
                    setActiveGauge(null);
                  }}
                />
              ) : null}

              {rightPanel === "compare" ? (
                <CompareEndings
                  view={compareView}
                  forks={compareForks.map((fork) => ({ id: fork.id, label: fork.label }))}
                  canSave={canSave}
                  error={answerError}
                  receipt={receiptAt("compare")}
                  onPickFork={(forkId) => {
                    setCompareForkId(forkId);
                    setReceipt(null);
                  }}
                  onThisIsMine={(stepId) => compareForkId && handleThisIsMine(compareForkId, stepId)}
                  onClose={() => setRightPanel(null)}
                />
              ) : null}

              {rightPanel === "playbook" ? (
                <div className="h-full overflow-y-auto border-l border-rule bg-ink3 max-lg:border-l-0">
                  <PlaybookExportPanel scenario={scenario} ventureId={ventureId} onClose={() => setRightPanel(null)} />
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>

      {reviewing && ventureId ? (
        <AgreePrompt
          ventureId={ventureId}
          figures={reviewing}
          rowNote={(figure) => costLineNote(roadsV2026, figure)}
          onDone={afterAgree}
          onClose={() => {
            // Closing decides nothing: the number stays waiting until the person agrees or turns it down.
            setReviewing(null);
            void reload();
          }}
        />
      ) : null}
    </div>
    </ExampleFrame>
    </ExampleNoteContext.Provider>
  );
}

/** No venture saved and none in this session: say so, point at the intake. */
function EmptyCockpit() {
  return (
    <div className="flex h-[calc(100vh-2.5rem)] flex-col bg-ink">
      <header className="flex h-[52px] items-center gap-[18px] border-b border-rule bg-[#0f0e12] px-[22px]">
        <Link href="/" className="font-mono text-[11px] text-stone transition hover:text-paper">
          ← Back
        </Link>
        <WordMark size="sm" />
      </header>
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="max-w-md text-center">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-stone">Cockpit</p>
          <h1 className="mt-2 font-serif text-[26px] font-bold leading-[1.15] tracking-tight text-paper">
            No venture on the map <span className="font-normal italic text-maple">yet.</span>
          </h1>
          <p className="mt-3 text-sm text-paper-dim">
            The cockpit shows the venture you describe on the intake. Nothing here is a sample —
            it is empty until it is yours.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href="/intake">
              <Pill variant="maple">Describe a venture →</Pill>
            </Link>
            <Link href="/ventures">
              <Pill variant="ghost">{words.allFutures}</Pill>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
