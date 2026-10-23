"use client";

import { JobAndRoadSteps, type RoadJobNames } from "@/components/front-door/job-and-road-steps";
import { useJourney } from "@/components/shared/journey-provider";
import { CitationLinks, StatusChip, worstStatus } from "@/components/shared/citation-links";
import { PersonStatements } from "@/components/shared/person-statements";
import { Chip, GhostLink, Pill, WordMark } from "@/components/ui";
import { buildEvaluationProfile, evaluateProfile } from "@/lib/brain";
import type { UnlockItem } from "@/lib/brain";
import { ACTIVITY_TAXONOMY, applyIntentToDraft, type IntentParseResult } from "@/lib/journey/intent";
import { parseIntentFallback } from "@/lib/journey/intent-fallback";
import { saveScenario } from "@/lib/journey/save-scenario";
import { afterFirstSave, firstSaveFromIntake, withTheSteps, type StepAnswers } from "@/lib/journey/first-save";
import { roadsV2026, type Road } from "@/lib/engines/roads/v2026";
import { listedRoads } from "@/lib/front-door/futures";
import type { PlaceCode } from "@/lib/places/codes";
import { back as stepBack, FIRST_STEP, type StepsState } from "@/lib/front-door/three-steps";
import { intakeStepsWords, pickWords } from "@/lib/front-door/words";
import { INTAKE_GOAL_IDS, INTAKE_GOAL_LABELS, type IntakeDraft, type IntakeGoalId } from "@/lib/journey/types";
import { STATEMENT_FULL_NOTE, STATEMENT_MAX_CHARS } from "@/lib/person/types";
import { buildScenarioFromIntake } from "@/lib/scenarios/build-scenario-from-intake";
import {
  FULL_COVERAGE_PROVINCES,
  PROVINCES,
  PROVINCE_LABELS,
  type EmploymentStatus,
  type Province,
  type VentureType,
} from "@/lib/scenarios/types";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

/**
 * Three-screen intake. Screen 0 (2026-09-13, S2.5.4a — decided: get to know the person first)
 * asks what the person wants DotAmi to know about them, kept as dated verbatim statements
 * that feed nothing downstream. Then the 2026-07-02 pair (W1/W5/W6): Screen A confirms the
 * AI's translation of the user's own words; Screen B grounds it (location + optional
 * numbers) and opens the cockpit. One question per screen. The preview starts empty and
 * fills as answers land — all content comes from the Strategy Rules Engine, never this
 * component.
 */

type ScreenId = "about" | "confirm" | "ground" | "steps";

const SCREEN_LABEL: Record<ScreenId, string> = {
  about: "1 of 3 · About you",
  confirm: "2 of 3 · Confirm",
  ground: "3 of 3 · Ground it",
  // Pick a future's three steps, on this page since 2026-10-22: each step says its own "n of 3".
  steps: pickWords.navLabel,
};

/** The roads Pick a future lists, which the steps at the end of the intake list too. */
const LISTED = listedRoads(roadsV2026);

const VENTURE_TYPES: { id: VentureType; label: string }[] = [
  { id: "service", label: "Service" },
  { id: "product", label: "Product" },
  { id: "side-gig", label: "Side gig" },
];

// The names live in lib/journey/types.ts, so the idea's card shows the picks under the same names.
const GOAL_CHIPS: { id: IntakeGoalId; label: string }[] = INTAKE_GOAL_IDS.map((id) => ({ id, label: INTAKE_GOAL_LABELS[id] }));

const EMPLOYMENT_OPTIONS: { id: EmploymentStatus; label: string }[] = [
  { id: "employee", label: "Employed (full- or part-time)" },
  { id: "self-employed", label: "Already self-employed" },
  { id: "business-owner", label: "Already run a business" },
  { id: "apprentice", label: "Apprentice / student" },
  { id: "retired", label: "Retired" },
  { id: "unemployed", label: "Between roles" },
  { id: "other", label: "Other…" },
];

const EMPLOYMENT_SUGGESTIONS_KEY = "dotami-employment-suggestions";

function readEmploymentSuggestions(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(EMPLOYMENT_SUGGESTIONS_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function saveEmploymentSuggestion(value: string) {
  const v = value.trim();
  if (!v || typeof window === "undefined") return;
  try {
    const list = [...new Set([v, ...readEmploymentSuggestions()])].slice(0, 20);
    localStorage.setItem(EMPLOYMENT_SUGGESTIONS_KEY, JSON.stringify(list));
  } catch {
    // ignore quota errors
  }
}

/** Consequence-first rank (forks and time-boxed items carry the differentiating info). */
function rankUnlocks(unlocks: UnlockItem[]): UnlockItem[] {
  const score = (item: UnlockItem) =>
    (item.fork ? 4 : 0) + (item.expires ? 2 : 0) + (item.state === "yellow" ? 1 : 0);
  return [...unlocks]
    .filter((u) => u.state !== "gray")
    .sort((a, b) => score(b) - score(a));
}

/**
 * `firstScreen` is read on the server (app/(journey)/intake/page.tsx): "about" for a person with no saved
 * idea yet, "confirm" once they have one (issue #38), so a second idea doesn't pass through About you
 * again. Back from Screen A still opens it.
 */
export function IntakePage({
  firstScreen = "about",
  roadJobs = {},
}: {
  firstScreen?: "about" | "confirm";
  /** The job groups each listed road is written for, with their titles, read on the server (app/(journey)/intake/page.tsx). */
  roadJobs?: RoadJobNames;
}) {
  const router = useRouter();
  const { intake, setIntake, setScenario } = useJourney();
  const [screen, setScreen] = useState<ScreenId>(firstScreen);
  // Pick a future's three steps, after Screen B (the maintainer's call 1 of 2026-10-21): in this page's memory only.
  const [steps, setSteps] = useState<StepsState>(FIRST_STEP);
  const [freeText, setFreeText] = useState("");
  const [parsing, setParsing] = useState(false);
  const [opening, setOpening] = useState(false);

  // Local calendar day, same as the cockpit — a UTC slice flipped time-boxed items a day early
  // in the evening anywhere west of UTC (found 2026-09-14).
  const today = useMemo(() => new Date().toLocaleDateString("en-CA"), []);
  const evaluation = useMemo(
    () => evaluateProfile(buildEvaluationProfile(intake), { today }),
    [intake, today],
  );

  const hasInput =
    intake.intentParse != null ||
    intake.activityTags.length > 0 ||
    intake.customTags.length > 0 ||
    intake.goals.length > 0 ||
    (intake.manualEntry ?? "").length > 0;

  async function handleInlineParse() {
    const trimmed = freeText.trim();
    if (trimmed.length === 0 || parsing) return;
    setParsing(true);
    let result: IntentParseResult;
    try {
      const res = await fetch("/api/intent/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: trimmed }),
      });
      result = res.ok ? ((await res.json()) as IntentParseResult) : parseIntentFallback(trimmed);
    } catch {
      result = parseIntentFallback(trimmed);
    }
    setIntake((prev) => applyIntentToDraft(prev, result, trimmed, new Date().toLocaleDateString("en-CA")));
    setParsing(false);
  }

  function toggleGoal(id: IntakeGoalId) {
    setIntake((prev) => ({
      ...prev,
      goals: prev.goals.includes(id) ? prev.goals.filter((g) => g !== id) : [...prev.goals, id],
    }));
  }

  function toggleTag(tag: string) {
    setIntake((prev) => ({
      ...prev,
      activityTags: prev.activityTags.includes(tag)
        ? prev.activityTags.filter((t) => t !== tag)
        : [...prev.activityTags, tag],
    }));
  }

  function addCustomTag(raw: string) {
    const tag = raw.trim();
    if (!tag) return;
    setIntake((prev) => ({
      ...prev,
      customTags: prev.customTags.includes(tag) ? prev.customTags : [...prev.customTags, tag],
    }));
  }

  /**
   * Step 3's Look inside, on the typed way (2026-10-22): saves the idea from the intake's answers on the road the
   * person opened, with the steps' answers, then opens the map. Until then Screen B's "Open my map" did this on the
   * general road with no road picked. A save that fails opens nothing (resolves false), as on Pick a future: the
   * tab's copy would be drawn on the general road, not the road the person opened.
   */
  async function lookInside(road: Road, answers: StepAnswers): Promise<boolean> {
    if (intake.province === null || intake.employmentStatus === null || opening) return false;
    const employmentStatus = intake.employmentStatus;
    if (intake.employmentStatus === "other") {
      saveEmploymentSuggestion(intake.employmentOther);
    }
    setIntake((prev) => ({ ...prev, intentParse: null }));
    const scenario = buildScenarioFromIntake(
      {
        // S2.5.4d: never the parse's raw sentence — that is often about the person, not the venture.
        name: intake.name.trim() || "My venture",
        type: intake.ventureType,
        targetRevenueY1: intake.targetRevenueY1,
        targetRevenueY3: intake.targetRevenueY3,
        province: intake.province,
        hireFirst: intake.hireFirst,
        employmentStatus,
        activityTags: [...intake.activityTags, ...intake.customTags],
        capitalPurchasePlanned: intake.capitalPurchasePlanned,
        stage: intake.ventureStage,
      },
      crypto.randomUUID(),
    );
    setScenario(scenario);
    // Issue #1: the venture reaches the database here, not only when someone finds "Save" on
    // the cockpit rail. Since 2026-10-22 a save that fails opens nothing and step 3 says so, as on
    // Pick a future: the tab's copy would be drawn without the road the person opened.
    setOpening(true);
    // This first save also keeps the sentence the person typed, word for word with its day, and the goal
    // chips, with the idea (lib/journey/first-save.ts). Later saves of the idea never carry them, and once
    // a save has kept the sentence this tab never sends it again: the next "Open my map" is a new idea.
    const sent = withTheSteps(firstSaveFromIntake(intake, new Date().toLocaleDateString("en-CA")), road.id, answers);
    const saved = await saveScenario(scenario, sent);
    setIntake((prev) => afterFirstSave(prev, sent, saved));
    setOpening(false);
    if (!saved.ok) return false;
    router.push("/cockpit");
    return true;
  }

  const coverage = evaluation.provinceCoverage;

  return (
    <div className="flex min-h-[calc(100vh-2.5rem)] flex-col bg-ink">
      {/* data-region marks the blocks the clutter limit counts (docs/ui-spec/README.md, "The layout rule"). */}
      <nav data-region="nav" className="flex items-center gap-6 border-b border-rule-soft px-8 py-[18px]">
        {screen === "about" ? (
          <GhostLink href="/" tone="stone">
            ← Back
          </GhostLink>
        ) : (
          <button
            type="button"
            // On the steps the one back button goes back one part, and from the first part to Screen B.
            onClick={() => {
              if (screen !== "steps") return setScreen(screen === "ground" ? "confirm" : "about");
              const previous = stepBack(steps, intake.province);
              if (previous === null) setScreen("ground");
              else setSteps(previous);
            }}
            className="border-b border-rule-soft pb-0.5 text-body text-stone transition hover:opacity-80"
          >
            ← Back
          </button>
        )}
        <WordMark />
        <p className="ml-auto font-mono text-small uppercase tracking-[0.14em] text-stone">
          {SCREEN_LABEL[screen]}
        </p>
      </nav>

      <div className={screen === "steps" ? "grid min-h-0 flex-1 grid-cols-1" : "grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[1fr_420px]"}>
        <div data-region="intake" className="overflow-y-auto bg-ink2 px-8 py-10 md:px-10">
          <div className={screen === "steps" ? "mx-auto max-w-4xl space-y-6" : "mx-auto max-w-2xl space-y-8"}>
            {screen === "steps" && intake.province !== null ? (
              // The same three steps as Pick a future, inside this page's own region, the preview rail put away.
              <JobAndRoadSteps
                host="intake"
                state={steps}
                setState={setSteps}
                place={`CA-${intake.province}` as PlaceCode}
                listed={LISTED}
                roadJobs={roadJobs}
                firstSentence={intake.manualEntry?.trim() ? intake.manualEntry : null}
                onLookInside={(road, answers) => lookInside(road, answers)}
              />
            ) : screen === "about" ? (
              <AboutScreen onContinue={() => setScreen("confirm")} />
            ) : screen === "confirm" ? (
              !hasInput ? (
                <ConfirmEmptyState
                  freeText={freeText}
                  setFreeText={setFreeText}
                  parsing={parsing}
                  onParse={handleInlineParse}
                />
              ) : (
                <>
                  <header>
                    <h1 className="font-serif text-display font-bold leading-[1.15] tracking-tight text-paper">
                      Did we get this <span className="font-normal italic text-maple">right?</span>
                    </h1>
                    {intake.intentParse?.rawLabel ? (
                      <p className="mt-2 text-lead italic text-paper-dim">
                        “{intake.intentParse.rawLabel}”
                      </p>
                    ) : null}
                  </header>

                  {intake.intentParse && intake.intentParse.unmapped.length > 0 ? (
                    <div className="rounded-lg border border-amber/40 bg-amber/5 p-4">
                      <p className="font-mono text-small uppercase tracking-[0.14em] text-amber">
                        We couldn&apos;t map this — pick the closest below
                      </p>
                      <p className="mt-1.5 text-lead text-paper">
                        {intake.intentParse.unmapped.join(" · ")}
                      </p>
                    </div>
                  ) : null}

                  <FieldGroup label="Venture type">
                    <div className="flex flex-wrap gap-2">
                      {VENTURE_TYPES.map((t) => (
                        <Chip
                          key={t.id}
                          active={intake.ventureType === t.id}
                          onClick={() => setIntake((p) => ({ ...p, ventureType: t.id }))}
                        >
                          {t.label}
                        </Chip>
                      ))}
                    </div>
                  </FieldGroup>

                  <FieldGroup label="What kind of work">
                    <div className="flex flex-wrap gap-2">
                      {ACTIVITY_TAXONOMY.map((tag) => (
                        <Chip
                          key={tag}
                          active={intake.activityTags.includes(tag)}
                          onClick={() => toggleTag(tag)}
                        >
                          {tag}
                        </Chip>
                      ))}
                      {intake.customTags.map((tag) => (
                        <Chip
                          key={tag}
                          active
                          onClick={() =>
                            setIntake((p) => ({
                              ...p,
                              customTags: p.customTags.filter((t) => t !== tag),
                            }))
                          }
                        >
                          {tag} ×
                        </Chip>
                      ))}
                    </div>
                    <input
                      aria-label="Add your own kind of work"
                      placeholder="Add your own — press Enter"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          addCustomTag(e.currentTarget.value);
                          e.currentTarget.value = "";
                        }
                      }}
                      className="mt-3 w-full max-w-xs rounded-sm border border-rule bg-ink px-3 py-2 text-lead text-paper outline-hidden placeholder:text-stone-dim focus:border-maple-soft"
                    />
                  </FieldGroup>

                  <FieldGroup label="What you want out of it">
                    <div className="flex flex-wrap gap-2">
                      {GOAL_CHIPS.map((g) => (
                        <Chip key={g.id} active={intake.goals.includes(g.id)} onClick={() => toggleGoal(g.id)}>
                          {g.label}
                        </Chip>
                      ))}
                    </div>
                  </FieldGroup>

                  <FieldGroup label="Also picked up">
                    <div className="flex flex-wrap gap-2">
                      <Chip
                        active={intake.capitalPurchasePlanned}
                        onClick={() =>
                          setIntake((p) => ({
                            ...p,
                            capitalPurchasePlanned: !p.capitalPurchasePlanned,
                          }))
                        }
                      >
                        Equipment / vehicle purchase on the path
                      </Chip>
                      {intake.province !== null ? (
                        <Chip
                          active
                          onClick={() => setIntake((p) => ({ ...p, province: null }))}
                        >
                          {PROVINCE_LABELS[intake.province]} ×
                        </Chip>
                      ) : null}
                    </div>
                  </FieldGroup>

                  <div className="flex justify-end pt-2">
                    <Pill variant="maple" onClick={() => setScreen("ground")}>
                      Looks right →
                    </Pill>
                  </div>
                </>
              )
            ) : (
              <>
                <header>
                  <h1 className="font-serif text-display font-bold leading-[1.15] tracking-tight text-paper">
                    Where does this <span className="font-normal italic text-maple">operate?</span>
                  </h1>
                </header>

                <FieldGroup label="Province / territory" htmlFor="intake-province">
                  <select
                    id="intake-province"
                    value={intake.province ?? ""}
                    onChange={(e) =>
                      setIntake((p) => ({
                        ...p,
                        province: e.target.value === "" ? null : (e.target.value as Province),
                      }))
                    }
                    className="w-full max-w-sm rounded-sm border border-rule bg-ink px-3 py-2.5 text-lead text-paper outline-hidden focus:border-maple-soft"
                  >
                    <option value="">Choose…</option>
                    {PROVINCES.map((code) => (
                      <option key={code} value={code}>
                        {PROVINCE_LABELS[code]}
                      </option>
                    ))}
                  </select>
                  <p className="mt-2 max-w-sm text-body leading-snug text-stone-dim">
                    Canada is the first jurisdiction mapped; other countries are not on the map yet.
                  </p>
                  {intake.province !== null &&
                  !FULL_COVERAGE_PROVINCES.includes(intake.province) ? (
                    <p className="mt-2 max-w-sm rounded-sm border border-rule bg-ink px-3 py-2 text-body leading-snug text-stone">
                      <span className="text-amber">Federal rules apply.</span> Provincial coverage
                      for {PROVINCE_LABELS[intake.province]} is coming — nothing shown will be
                      wrong, some provincial programs just won&apos;t appear yet.
                    </p>
                  ) : null}
                </FieldGroup>

                <FieldGroup label="Current employment" htmlFor="intake-employment">
                  <select
                    id="intake-employment"
                    value={intake.employmentStatus ?? ""}
                    onChange={(e) =>
                      setIntake((p) => ({
                        ...p,
                        employmentStatus:
                          e.target.value === ""
                            ? null
                            : (e.target.value as EmploymentStatus),
                      }))
                    }
                    className="w-full max-w-sm rounded-sm border border-rule bg-ink px-3 py-2.5 text-lead text-paper outline-hidden focus:border-maple-soft"
                  >
                    <option value="">Choose…</option>
                    {EMPLOYMENT_OPTIONS.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  {intake.employmentStatus === "other" ? (
                    <>
                      <input
                        list="employment-suggestions"
                        value={intake.employmentOther}
                        onChange={(e) =>
                          setIntake((p) => ({ ...p, employmentOther: e.target.value }))
                        }
                        aria-label="Your employment, in your words"
                        placeholder="Tell us in your words"
                        className="mt-2 w-full max-w-sm rounded-sm border border-rule bg-ink px-3 py-2 text-lead text-paper outline-hidden placeholder:text-stone-dim focus:border-maple-soft"
                      />
                      <datalist id="employment-suggestions">
                        {readEmploymentSuggestions().map((s) => (
                          <option key={s} value={s} />
                        ))}
                      </datalist>
                    </>
                  ) : null}
                </FieldGroup>

                <FieldGroup label="Name it — optional" htmlFor="intake-name">
                  <input
                    id="intake-name"
                    type="text"
                    value={intake.name}
                    maxLength={80}
                    onChange={(e) => setIntake((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="What the map should call this venture (default: My venture)"
                    className="w-full max-w-sm rounded-lg border border-rule bg-ink px-3 py-2 text-lead text-paper placeholder:text-stone-dim focus:border-maple focus:outline-hidden"
                  />
                </FieldGroup>

                <FieldGroup label="Numbers — optional">
                  <p className="mb-3 text-body leading-snug text-stone">
                    Numbers let the map check your estimates against official tests, like the Canada Revenue Agency&apos;s GST/HST small-supplier tests.
                    Skippable.
                  </p>
                  <div className="grid max-w-sm grid-cols-2 gap-3">
                    <RevenueInput
                      label="Year 1 revenue"
                      value={intake.targetRevenueY1}
                      onChange={(v) => setIntake((p) => ({ ...p, targetRevenueY1: v }))}
                    />
                    <RevenueInput
                      label="Year 3 revenue"
                      value={intake.targetRevenueY3}
                      onChange={(v) => setIntake((p) => ({ ...p, targetRevenueY3: v }))}
                    />
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Chip
                      active={intake.capitalPurchasePlanned}
                      onClick={() =>
                        setIntake((p) => ({
                          ...p,
                          capitalPurchasePlanned: !p.capitalPurchasePlanned,
                        }))
                      }
                    >
                      Buying equipment / vehicle / tools
                    </Chip>
                    <Chip
                      active={intake.hireFirst}
                      onClick={() => setIntake((p) => ({ ...p, hireFirst: !p.hireFirst }))}
                    >
                      Show a hire-first path
                    </Chip>
                  </div>
                </FieldGroup>

                <div className="flex items-center justify-end gap-4 pt-2">
                  <Pill
                    variant="maple"
                    onClick={() => {
                      setSteps(FIRST_STEP);
                      setScreen("steps");
                    }}
                    disabled={intake.province === null || intake.employmentStatus === null}
                  >
                    {intakeStepsWords.next}
                  </Pill>
                </div>
                {intake.province === null ? (
                  <p className="text-right text-body text-stone-dim">
                    Pick a province to open the map — it gates most of the rules.
                  </p>
                ) : intake.employmentStatus === null ? (
                  <p className="text-right text-body text-stone-dim">
                    Choose your current employment context to open the map — it affects which paths may apply.
                  </p>
                ) : null}
              </>
            )}
          </div>
        </div>

        {screen === "steps" ? null : <PreviewRail unlocks={rankUnlocks(evaluation.unlocks)} coverage={coverage} />}
      </div>
    </div>
  );
}

/**
 * Screen 0 — "About you". Asks nothing about the venture. What is typed here is kept as a
 * dated statement in the person's own words (POST /api/person/statements) and shown back
 * verbatim on the cockpit rail; it is never summarised and never enters the evaluator.
 * Skippable: nothing here gates the map (the province gate on Screen B still does).
 */
function AboutScreen({ onContinue }: { onContinue: () => void }) {
  return (
    <>
      <header>
        <h1 className="font-serif text-display font-bold leading-[1.15] tracking-tight text-paper">
          Before the venture — <span className="font-normal italic text-maple">about you.</span>
        </h1>
        <p className="mt-2 max-w-xl text-lead text-paper-dim">
          What should DotAmi know about you? How you work, what you won&apos;t do, what
          you&apos;re after. It keeps your words with the date you said them — it does not
          turn them into a type of person, and nothing you write here is used to rank anything.
        </p>
      </header>

      <PersonStatements variant="full" />

      <div className="flex items-center justify-between gap-4 border-t border-rule-soft pt-6">
        <p className="text-body text-stone-dim">
          You can skip this. Nothing here gates the map.
        </p>
        <Pill variant="maple" onClick={onContinue}>
          Continue →
        </Pill>
      </div>
    </>
  );
}

function ConfirmEmptyState({
  freeText,
  setFreeText,
  parsing,
  onParse,
}: {
  freeText: string;
  setFreeText: (v: string) => void;
  parsing: boolean;
  onParse: () => void;
}) {
  return (
    <>
      <header>
        <h1 className="font-serif text-display font-bold leading-[1.15] tracking-tight text-paper">
          What are you <span className="font-normal italic text-maple">building?</span>
        </h1>
      </header>
      <div className="flex overflow-hidden rounded-[10px] border border-rule bg-ink text-left focus-within:border-maple-soft">
        <textarea
          value={freeText}
          onChange={(e) => setFreeText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) onParse();
          }}
          placeholder="Any venture works: a video game studio, weekend woodworking, a plumbing company, “I bought a workstation”…"
          rows={3}
          // The most a statement holds; the browser drops anything past it, so a note says so below.
          maxLength={STATEMENT_MAX_CHARS}
          className="min-h-[88px] flex-1 resize-none border-none bg-transparent px-5 py-4 text-lead leading-relaxed text-paper outline-hidden placeholder:text-stone-dim"
        />
        <div className="flex flex-col items-end justify-end self-stretch border-l border-rule-soft px-4 py-3">
          <Pill variant="maple" onClick={onParse} disabled={parsing || freeText.trim().length === 0}>
            {parsing ? "Reading…" : "Map it →"}
          </Pill>
        </div>
      </div>
      {freeText.length >= STATEMENT_MAX_CHARS ? (
        <p role="status" className="text-body text-amber">
          {STATEMENT_FULL_NOTE}
        </p>
      ) : null}
    </>
  );
}

/**
 * A group on the intake: its name, then its fields. Given `htmlFor` (the id of the one field the
 * name stands for) the name is a <label> tied to that field, so a screen reader says it when the
 * field takes focus and clicking it moves to the field. Without, the name is a plain heading line,
 * for groups of buttons or of fields that carry names of their own.
 */
function FieldGroup({ label, htmlFor, children }: { label: string; htmlFor?: string; children: React.ReactNode }) {
  const className = "mb-3 block font-mono text-small uppercase tracking-[0.14em] text-stone";
  return (
    <div>
      {htmlFor ? (
        <label htmlFor={htmlFor} className={className}>
          {label}
        </label>
      ) : (
        <p className={className}>{label}</p>
      )}
      {children}
    </div>
  );
}

function RevenueInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-body text-stone">{label}</span>
      <div className="flex items-center rounded-sm border border-rule bg-ink focus-within:border-maple-soft">
        <span className="pl-3 text-lead text-stone-dim">$</span>
        <input
          inputMode="numeric"
          value={value === 0 ? "" : value}
          onChange={(e) => {
            const n = Number(e.target.value.replace(/[^0-9]/g, ""));
            onChange(Number.isFinite(n) ? n : 0);
          }}
          placeholder="0"
          className="w-full bg-transparent px-2 py-2 text-lead text-paper outline-hidden placeholder:text-stone-dim"
        />
      </div>
    </label>
  );
}

const PREVIEW_VISIBLE = 3;

function PreviewRail({
  unlocks,
  coverage,
}: {
  unlocks: UnlockItem[];
  coverage: "full" | "federal-only" | "unknown";
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const visible = unlocks.slice(0, PREVIEW_VISIBLE);
  const hiddenCount = unlocks.length - visible.length;

  return (
    <aside data-region="preview" className="flex flex-col border-t border-rule-soft bg-ink px-6 py-8 lg:border-l lg:border-t-0">
      <p className="font-mono text-small uppercase tracking-[0.14em] text-stone">Live preview</p>

      {coverage === "federal-only" ? (
        <p className="mt-3 rounded-sm border border-rule bg-ink2 px-3 py-2 text-small leading-snug text-stone">
          <span className="text-amber">Federal rules only</span> for your province so far —
          provincial coverage coming.
        </p>
      ) : null}

      <div className="mt-4 flex-1 space-y-2 overflow-y-auto">
        {visible.length === 0 ? (
          <p className="rounded-lg border border-dashed border-rule p-4 text-body leading-relaxed text-stone">
            Answer to see what unlocks — every item is sourced, explained, and risk-rated.
          </p>
        ) : (
          visible.map((item) => (
            <PreviewRow
              key={item.id}
              item={item}
              expanded={expandedId === item.id}
              onToggle={() => setExpandedId(expandedId === item.id ? null : item.id)}
            />
          ))
        )}
        {hiddenCount > 0 ? (
          <p className="pt-1 text-center font-mono text-small uppercase tracking-[0.14em] text-stone-dim">
            {hiddenCount} more in your map →
          </p>
        ) : null}
      </div>

      <p className="mt-4 border-t border-rule-soft pt-4 text-small leading-snug text-stone-dim">
        Compass language: if an item applies, it may unlock a branch. Nothing here is a
        guarantee — sources open in a new tab.
      </p>
    </aside>
  );
}

function PreviewRow({
  item,
  expanded,
  onToggle,
}: {
  item: UnlockItem;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className={`rounded-lg border bg-ink3 ${
        item.state === "yellow" ? "border-amber/40" : "border-rule"
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        aria-label={`${expanded ? "Hide" : "Show"} details for ${item.title}`}
        className="flex w-full items-center gap-3 p-3 text-left"
      >
        <span
          className={`h-1.5 w-1.5 shrink-0 rounded-full ${
            item.state === "yellow" ? "bg-amber" : "bg-sage"
          }`}
          aria-hidden
        />
        <span className="shrink-0 rounded-sm border border-maple-soft bg-maple/10 px-1.5 py-0.5 font-mono text-label uppercase tracking-[0.14em] text-maple">
          {item.typeChip}
        </span>
        <span className="flex-1 truncate text-body font-semibold text-paper">{item.title}</span>
        {worstStatus(item.citations) === "partial" ? <StatusChip status="partial" className="shrink-0" /> : null}
        <span className="shrink-0 text-small text-stone-dim">{expanded ? "−" : "+"}</span>
      </button>

      {expanded ? (
        <div className="space-y-2 border-t border-rule-soft p-3 text-body leading-snug">
          <p className="text-stone">{item.why}</p>
          <p className="text-stone-dim">{item.payoff}</p>
          {item.expires ? (
            <p className="font-mono text-label uppercase tracking-[0.14em] text-amber">
              Time-boxed — in use before {item.expires.slice(0, 4)}
            </p>
          ) : null}
          {item.fork ? (
            <div className="rounded-sm border border-amber/40 bg-amber/5 p-2">
              <p className="font-mono text-label uppercase tracking-[0.14em] text-amber">
                {item.fork.label}
              </p>
              <p className="mt-1 text-stone">{item.fork.note}</p>
            </div>
          ) : null}
          {item.risk ? (
            <div className="rounded-sm border border-rule bg-ink2 p-2">
              <p
                className={`font-mono text-label uppercase tracking-[0.14em] ${
                  item.risk.level === "professional-required" ? "text-maple" : "text-amber"
                }`}
              >
                {item.risk.level === "professional-required"
                  ? "Professional required"
                  : item.risk.level === "caution"
                    ? "Audit-sensitive — caution"
                    : "Keep records"}
                {item.risk.gaar ? " · GAAR" : ""}
              </p>
              <p className="mt-1 text-stone">{item.risk.why}</p>
              <p className="mt-1 text-stone-dim">{item.risk.mitigation}</p>
            </div>
          ) : null}
          {/* S2.5.4f: every citation, as a link to its official URL, with its statute-check status. */}
          <CitationLinks citations={item.citations} compact />
        </div>
      ) : null}
    </div>
  );
}
