import { complianceCatalogV2026 } from "@/lib/engines/compliance/v2026";
import { grantsCatalogV2026 } from "@/lib/engines/grants/v2026";
import { riskCatalogV2026 } from "@/lib/engines/risk/v2026";
import { structureLadderV2026 } from "@/lib/engines/structure/v2026";
import { writeOffsCatalogV2026 } from "@/lib/engines/writeoffs/v2026";
import type { GrantProgram } from "@/lib/engines/grants/v2026/types";
import type { WriteOffCategory } from "@/lib/engines/writeoffs/v2026/types";
import type { ComplianceRule } from "@/lib/engines/compliance/v2026/types";
import type { RiskSeverity } from "@/lib/engines/risk/v2026/types";
import type { StructureEntityType, StructureStep } from "@/lib/engines/structure/v2026/types";
import type { IntakeDraft } from "@/lib/journey/types";
import { FULL_COVERAGE_PROVINCES, PROVINCE_LABELS } from "@/lib/scenarios/types";
import type { CFENodeId } from "@/lib/engines/cfe/v2026";

import { GOAL_EFFECTS, REFINE_EFFECTS } from "./goal-effects";
import { matchPredicate, tagsIntersect } from "./predicates";
import { formatCad, longDay, monthName, readRevenue } from "./records";
import type {
  ConfirmedFigure,
  EvaluationProfile,
  EvaluationResult,
  IntakeStep,
  NodeStateColor,
  RecordsBasis,
  UnlockItem,
  UnlockState,
  UnlockTypeChip,
} from "./types";

/**
 * Deterministic Strategy Rules Engine v0 (docs/brain/strategy-rules-engine.md).
 *
 * `(profile, catalogs) → unlocks + node states`. Pure: no LLM, no network, no clock —
 * callers pass `today` so time-boxed incentives evaluate reproducibly.
 *
 * Semantics: green = conditions met as answered; yellow = plausible but needs
 * professional confirmation, is time-boxed, is near a threshold, or is ONE fork away
 * (the near-miss rule — e.g. "incorporating would unlock IRAP"); gray = not applicable.
 * Aggressive-but-legal levers are never hidden — they surface yellow with the honest read.
 */

const PROVINCE_NAMES: Record<string, string> = PROVINCE_LABELS;

const STRUCTURE_LABELS: Record<string, string> = {
  "sole-prop": "sole proprietorship",
  "sole-prop-gst": "GST-registered sole proprietorship",
  ccpc: "CCPC",
  holdco: "holding company",
  "family-trust": "family trust",
};

/** Ordering of the structure ladder — used to gate forward-looking structure unlocks. */
const STRUCTURE_RUNG: Record<StructureEntityType, number> = {
  "sole-prop": 0,
  "sole-prop-gst": 1,
  ccpc: 2,
  holdco: 3,
  "family-trust": 4,
};

/** Revenue within this fraction of a threshold counts as "approaching it". */
const THRESHOLD_WATCH_RATIO = 0.7;

export function buildEvaluationProfile(intake: IntakeDraft): EvaluationProfile {
  return {
    goals: intake.goals,
    ventureType: intake.ventureType,
    activityTags: intake.activityTags,
    province: intake.province,
    employmentStatus: intake.employmentStatus,
    structure: "sole-prop", // intake has no structure picker; scenarios override via evaluateProfile input
    targetRevenueY1: intake.targetRevenueY1,
    targetRevenueY3: intake.targetRevenueY3,
    hireFirst: intake.hireFirst,
    // S2.5.4h: only the explicit toggle. Deriving this from the "write-offs" goal chip asserted
    // an equipment purchase the person never mentioned (found 2026-09-14).
    capitalPurchasePlanned: intake.capitalPurchasePlanned,
  };
}

function provinceMatches(profile: EvaluationProfile, provinces: string[]): boolean {
  // No province yet → federal (CA-wide) entries only; never guess provincial rules.
  if (profile.province === null) return provinces.includes("CA");
  return provinces.includes(profile.province) || provinces.includes("CA");
}

function provinceCoverageFor(province: EvaluationProfile["province"]) {
  if (province === null) return "unknown" as const;
  return FULL_COVERAGE_PROVINCES.includes(province) ? ("full" as const) : ("federal-only" as const);
}

function provinceName(province: EvaluationProfile["province"]): string {
  return province === null ? "your province" : PROVINCE_NAMES[province];
}

function tagList(profile: EvaluationProfile, entryTags: string[]): string {
  const matched = entryTags.filter((t) => tagsIntersect(profile.activityTags, [t]));
  return matched.slice(0, 2).join(" and ");
}

function grantChip(kind: GrantProgram["kind"]): UnlockTypeChip {
  if (kind === "financing") return "Financing";
  if (kind === "tax-credit") return "Tax credit";
  return "Grant";
}

function firstCitationSource(citations: { title: string; url: string; authority: string }[]) {
  const first = citations[0];
  return { label: first.authority === "CRA" ? "CRA" : first.title, href: first.url };
}

function evaluateWriteOff(profile: EvaluationProfile, entry: WriteOffCategory, today: string): UnlockItem | null {
  if (!provinceMatches(profile, entry.provinces)) return null;
  if (!entry.structures.includes(profile.structure)) return null;

  const tagsMatch = tagsIntersect(profile.activityTags, entry.activityTags);
  const capitalRelevant = entry.ccaClass !== undefined && profile.capitalPurchasePlanned;
  if (!tagsMatch && !capitalRelevant) return null;

  let state: UnlockState = "green";
  let payoff = entry.lensAnnotations.tax;
  let expires: string | undefined;

  const incentive = entry.firstYearIncentive;
  if (incentive) {
    // The enhanced treatment only exists inside its acquisition window (audit H4:
    // `acquiredAfter` was typed but never read) AND before its expiry.
    const acquisitionWindowOpen =
      incentive.acquiredAfter === undefined || today >= incentive.acquiredAfter;
    const stillAvailable = incentive.availableForUseBefore > today;
    if (acquisitionWindowOpen && stillAvailable) {
      // Time-boxed incentives are the compass yellow: real, dated, professional-confirmed.
      state = "yellow";
      expires = incentive.availableForUseBefore;
      payoff = incentive.note;
    }
    // Outside the acquisition window, or lapsed: entry stays with its base treatment,
    // no expired or not-yet-open promises.
  }

  const why = tagsMatch
    ? `Shown because your ${STRUCTURE_LABELS[profile.structure]} venture includes ${tagList(profile, entry.activityTags)} activity.`
    : `Shown because a capital equipment purchase is on your path and this category covers it.`;

  return {
    id: entry.id,
    engine: "writeoffs",
    state,
    typeChip: "Write-off",
    title: entry.label,
    why,
    payoff,
    source: firstCitationSource(entry.citations),
    citations: entry.citations,
    step: "venture",
    expires,
  };
}

function evaluateGrant(profile: EvaluationProfile, entry: GrantProgram): UnlockItem | null {
  if (!provinceMatches(profile, entry.provinces)) return null;

  const tagsMatch = entry.activityTags.length === 0 || tagsIntersect(profile.activityTags, entry.activityTags);
  if (!tagsMatch) return null;

  const structureMatch = entry.structures.includes(profile.structure);
  const ccpcWouldUnlock = !structureMatch && entry.structures.includes("ccpc");
  if (!structureMatch && !ccpcWouldUnlock) return null;

  const currentRate = entry.ratesByStructure?.find((r) => r.structure === profile.structure);
  const ccpcRate = entry.ratesByStructure?.find((r) => r.structure === "ccpc");

  if (structureMatch) {
    // Structure-gated rate deltas surface as forks even when eligible today (SR&ED 15% → 35%).
    const betterAtCcpc =
      currentRate && ccpcRate && profile.structure !== "ccpc" && ccpcRate.rate > currentRate.rate;

    return {
      id: entry.id,
      engine: "grants",
      state: "yellow", // program eligibility always needs confirmation — never claim qualification
      typeChip: grantChip(entry.kind),
      title: entry.label,
      why: `Shown because ${provinceName(profile.province)} and your ${tagList(profile, entry.activityTags) || "venture"} activity match this program.`,
      payoff: currentRate
        ? `If eligible as a ${STRUCTURE_LABELS[profile.structure]}, this may be worth ${Math.round(currentRate.rate * 100)}% (${currentRate.refundable ? "refundable" : "non-refundable"}). ${currentRate.note ?? ""}`.trim()
        : entry.lensAnnotations.tax,
      source: firstCitationSource(entry.citations),
      citations: entry.citations,
      step: "venture",
      fork: betterAtCcpc
        ? {
            label: "Incorporating (CCPC) changes this",
            note: `A CCPC may access ${Math.round(ccpcRate.rate * 100)}% ${ccpcRate.refundable ? "refundable" : "non-refundable"} treatment instead of ${Math.round(currentRate.rate * 100)}%. ${ccpcRate.note ?? ""}`.trim(),
          }
        : undefined,
    };
  }

  // Near-miss: gray→yellow fork. This is most of the aggressive-picture promise.
  return {
    id: entry.id,
    engine: "grants",
    state: "yellow",
    typeChip: grantChip(entry.kind),
    title: entry.label,
    why: `Shown because your activity matches, but this program requires incorporation (CCPC).`,
    payoff: entry.lensAnnotations.tax,
    source: firstCitationSource(entry.citations),
    citations: entry.citations,
    step: "venture",
    fork: {
      label: "Incorporating (CCPC) would unlock this",
      note: ccpcRate
        ? `As a CCPC this may be worth ${Math.round(ccpcRate.rate * 100)}% (${ccpcRate.refundable ? "refundable" : "non-refundable"}).`
        : "This program is only open to incorporated ventures — incorporation timing is a fork worth modeling.",
    },
  };
}

/**
 * [8a] What the person's confirmed revenue figures say about a quarter-based threshold rule.
 * `decides` is true only when the figures settle it — a quarter (or the window, counted as a lower
 * bound) already over the line, or every month of the window covered. Otherwise the estimate keeps
 * deciding and `why` says how far the figures got. A figure beats an estimate; a partial set of
 * figures doesn't pretend to.
 */
interface RecordsVerdict {
  decides: boolean;
  crossed: boolean;
  /** At or above the watch ratio but not over. */
  near: boolean;
  why: string;
  basis: RecordsBasis;
}

const NUMBER_WORDS: Record<number, string> = { 2: "two", 3: "three", 4: "four" };

function recordsVerdict(entry: ComplianceRule, figures: readonly ConfirmedFigure[] | undefined, today: string): RecordsVerdict | null {
  if (entry.thresholdAmount === undefined || !entry.thresholdTest || !figures?.length) return null;
  const thresholdCents = entry.thresholdAmount * 100;
  const n = entry.thresholdTest.consecutiveQuarters;
  const read = readRevenue(figures, { today, consecutiveQuarters: n, thresholdCents });
  if (!read) return null;

  const line = formatCad(thresholdCents);
  const span = `the ${NUMBER_WORDS[n] ?? n} calendar quarters from ${monthName(read.window[0].start.slice(0, 7))} to ${monthName(read.window[n - 1].end.slice(0, 7))}`;
  const total = formatCad(read.windowCents);
  const single = entry.thresholdTest.singleQuarter ? read.overSingleQuarter : null;

  let decides = true;
  let crossed = false;
  let near = false;
  let why: string;
  if (single) {
    crossed = true;
    why = `Shown because your confirmed revenue for ${single.label} is ${formatCad(single.cents)} — over ${line} in a single calendar quarter.`;
  } else if (read.windowCents > thresholdCents) {
    crossed = true;
    why = `Shown because your confirmed revenue for ${span} is ${read.windowComplete ? "" : "at least "}${total} — over ${line}.`;
  } else if (read.windowComplete) {
    near = read.windowCents >= thresholdCents * THRESHOLD_WATCH_RATIO;
    why = `Shown because your confirmed revenue for ${span} is ${total} — ${near ? "approaching" : "under"} ${line}.`;
  } else {
    decides = false;
    const covered = read.window.filter((q) => q.monthsCovered === 3).length;
    why = `Your confirmed figures cover ${covered} of the last ${NUMBER_WORDS[n] ?? n} calendar quarters (${total} so far) — not enough to replace the estimate yet.`;
  }
  if (read.conflictMonths.length > 0) {
    why += ` Two figures cover ${monthName(read.conflictMonths[0])}${read.conflictMonths.length > 1 ? " and other months" : ""}; that quarter is left out until you choose which one counts.`;
  }
  if (read.notCounted.length > 0) {
    const k = read.notCounted.length;
    why += ` ${k === 1 ? "One figure isn't" : `${k} figures aren't`} counted: ${read.notCounted[0].reason}${k > 1 ? ", and others" : ""}.`;
  }

  // [8e] How recent the counted figures are, and what the read leaves out. A quarter already
  // explained as a conflict is not listed again as uncovered.
  const newestPeriodEnd = read.used.reduce<string | null>(
    (newest, f) => (newest === null || f.periodEnd > newest ? f.periodEnd : newest),
    null,
  );
  const uncoveredQuarters = read.window
    .filter((q) => q.monthsCovered < 3 && !q.conflict)
    .map((q) => q.label)
    .reverse();
  const notes: string[] = [];
  if (newestPeriodEnd) notes.push(`Newest figure ends ${longDay(newestPeriodEnd)}.`);
  if (uncoveredQuarters.length === 1) {
    notes.push(`${uncoveredQuarters[0]} isn't fully covered yet.`);
  } else if (uncoveredQuarters.length > 1) {
    const earlier = uncoveredQuarters.length - 1;
    notes.push(`${uncoveredQuarters[0]} and ${earlier} earlier ${earlier === 1 ? "quarter" : "quarters"} aren't fully covered yet.`);
  }
  if (read.outsideWindow.length > 0) {
    const k = read.outsideWindow.length;
    const readSpan = `${monthName(read.window[0].start.slice(0, 7))} to ${monthName(read.window[n - 1].end.slice(0, 7))}`;
    notes.push(
      `${k === 1 ? "One older figure isn't" : `${k} older figures aren't`} read: this rule looks only at the last ${NUMBER_WORDS[n] ?? n} calendar quarters (${readSpan}).`,
    );
  }

  const rows = read.used.reduce((sum, f) => sum + (f.sourceRows ?? 0), 0);
  const labels = new Map<string, number | null>();
  for (const f of read.used) {
    const prev = labels.get(f.sourceLabel);
    labels.set(f.sourceLabel, f.sourceRows === null ? (prev ?? null) : (prev ?? 0) + f.sourceRows);
  }
  const count = read.used.length;
  return {
    decides,
    crossed,
    near,
    why,
    basis: {
      summary: `From your records · ${count} figure${count === 1 ? "" : "s"}${rows > 0 ? ` · ${rows} rows` : ""}`,
      figureIds: read.used.map((f) => f.id),
      sources: [...labels.entries()].map(([label, r]) => ({ label, rows: r })),
      newestPeriodEnd,
      uncoveredQuarters,
      notes,
    },
  };
}

/** The GST small-supplier rule's verdict, for the map's GST stages (same rule as its card). */
function gstRecordsVerdict(figures: readonly ConfirmedFigure[] | undefined, today: string): RecordsVerdict | null {
  const rule = complianceCatalogV2026.entries.find((e) => e.id === "compliance-gst-small-supplier");
  return rule ? recordsVerdict(rule, figures, today) : null;
}

function evaluateComplianceRule(
  profile: EvaluationProfile,
  entry: ComplianceRule,
  figures: readonly ConfirmedFigure[] | undefined,
  today: string,
): UnlockItem | null {
  if (!provinceMatches(profile, entry.provinces)) return null;
  if (entry.industryTags && !tagsIntersect(profile.activityTags, entry.industryTags)) return null;

  let state: UnlockState = "green";
  let typeChip: UnlockTypeChip = "Compliance";
  let step: IntakeStep = "location";
  let payoff = entry.lensAnnotations.tax;
  let why = `Shown because you selected ${provinceName(profile.province)}.`;
  let fromRecords: RecordsBasis | undefined;

  if (entry.thresholdAmount !== undefined) {
    typeChip = "Threshold";
    const verdict = recordsVerdict(entry, figures, today);
    if (verdict?.decides) {
      // The person's own confirmed figures settle it: they beat the estimate.
      fromRecords = verdict.basis;
      why = verdict.why;
      if (verdict.crossed) {
        state = "yellow";
        step = "refine";
        payoff = "If this holds, registration may already be required — the CRA page says from when. Take it to your accountant.";
      } else if (verdict.near) {
        state = "yellow";
        step = "refine";
        payoff = "If revenue keeps near this line, the voluntary-vs-mandatory registration fork is worth modeling now.";
      }
    } else {
      const y1 = profile.targetRevenueY1;
      // CRA's small-supplier rule triggers on EXCEEDING the threshold, not reaching it —
      // registration is required once revenue is over $30K, not at exactly $30K (audit
      // H3). Matches the `>` used in `computeNodeStates`'s `gstTriggered` below.
      if (y1 > entry.thresholdAmount) {
        state = "yellow";
        step = "refine";
        why = `Shown because your Y1 revenue target crosses the ${entry.threshold ?? "registration"} threshold.`;
        payoff = "If your assumptions hold, registration timing becomes a checkpoint on the map, not a surprise.";
      } else if (y1 >= entry.thresholdAmount * THRESHOLD_WATCH_RATIO) {
        state = "yellow";
        step = "refine";
        why = `Shown because your Y1 revenue target approaches the ${entry.threshold ?? "registration"} threshold.`;
        payoff = "If revenue lands near this line, the voluntary-vs-mandatory registration fork is worth modeling early.";
      }
      // Figures that were read but couldn't decide still say so, next to the estimate's reason.
      if (verdict) {
        why = `${why} ${verdict.why}`;
        fromRecords = verdict.basis;
      }
    }
  }

  return {
    id: entry.id,
    engine: "compliance",
    state,
    typeChip,
    title: entry.label,
    why,
    payoff,
    source: firstCitationSource(entry.citations),
    citations: entry.citations,
    step,
    ...(fromRecords ? { fromRecords } : {}),
  };
}

/**
 * Surfaces Holdco/Family trust as forward-looking, never-triggered forks once a profile
 * has already reached CCPC. Fixes half of audit H2: `risk-ladder-skipping` (GAAR) could
 * never attach because nothing in `unlocks` ever carried a `structure-holdco` /
 * `structure-family-trust` id. Sole-prop and sole-prop-gst rungs aren't modeled here —
 * they're structural facts the intake/cockpit already show elsewhere, not forks.
 */
function evaluateStructureStep(profile: EvaluationProfile, step: StructureStep): UnlockItem | null {
  if (!provinceMatches(profile, step.provinces)) return null;

  const rung = STRUCTURE_RUNG[step.entityType];
  const currentRung = STRUCTURE_RUNG[profile.structure];
  if (rung <= 2 || currentRung < 2 || rung <= currentRung) return null;

  return {
    id: step.id,
    engine: "structure",
    // Always yellow: this is a forward-looking fork, never something the answers as given
    // trigger — the honest read is "worth understanding", not "reached".
    state: "yellow",
    typeChip: "Structure",
    title: step.label,
    why: `Shown as the next rung on the structure ladder past ${STRUCTURE_LABELS[profile.structure] ?? profile.structure} — not something your current answers trigger.`,
    payoff: step.lensAnnotations.tax,
    source: firstCitationSource(step.citations),
    citations: step.citations,
    step: "venture",
    fork: {
      label: `${step.label} needs a real business purpose first`,
      note: step.transitionTrigger,
    },
  };
}

function goalUnlocks(profile: EvaluationProfile): UnlockItem[] {
  return profile.goals.map((goal) => ({
    ...GOAL_EFFECTS[goal],
    id: `goal-${goal}`,
    engine: "goal" as const,
    state: "green" as const,
    step: "goals" as const,
  }));
}

function refineUnlocks(profile: EvaluationProfile): UnlockItem[] {
  const items: UnlockItem[] = [];
  if (profile.hireFirst) {
    items.push({
      ...REFINE_EFFECTS["hire-first"],
      id: "refine-hire-first",
      engine: "goal",
      state: "green",
      step: "refine",
    });
  }
  return items;
}

function computeNodeStates(
  profile: EvaluationProfile,
  activeBranches: Record<string, CFENodeId>,
  today: string,
  gstRecords: RecordsVerdict | null,
): Record<CFENodeId, NodeStateColor> {
  const states: Record<string, NodeStateColor> = {};
  const gstThreshold = 30000;
  const incorporationNetTrigger = 80000;
  const rdTags = tagsIntersect(profile.activityTags, ["AI / ML / R&D", "Software / SaaS", "Manufacturing"]);

  states["stage-0-employee-apprentice-baseline"] = "green";
  states["stage-1-sole-prop-activation"] = "green";

  const gstPick = activeBranches["gstTiming"];
  // Exceed, not reach — mirrors `evaluateComplianceRule`'s threshold check (audit H3). When the
  // person's confirmed figures settle it ([8a]), they decide instead of the estimate.
  const recordsDecide = gstRecords?.decides === true;
  const gstTriggered = recordsDecide ? gstRecords.crossed : profile.targetRevenueY1 > gstThreshold;
  const gstNear = recordsDecide
    ? gstRecords.crossed || gstRecords.near
    : profile.targetRevenueY1 >= gstThreshold * THRESHOLD_WATCH_RATIO;
  for (const nodeId of ["stage-2a-voluntary-gst-registration", "stage-2b-mandatory-gst-registration"]) {
    if (nodeId === gstPick) {
      states[nodeId] = gstTriggered ? "green" : "yellow";
    } else {
      // Alternate GST path stays visible as a fork when revenue is near the line.
      states[nodeId] = gstNear ? "yellow" : "gray";
    }
  }

  const incPick = activeBranches["incorporationTiming"];
  const incTriggeredByRevenue = profile.targetRevenueY3 >= incorporationNetTrigger;
  for (const nodeId of ["stage-3a-incorporation-80k-net", "stage-3b-incorporation-liability-sred"]) {
    const triggerMet = nodeId === "stage-3b-incorporation-liability-sred" ? rdTags : incTriggeredByRevenue;
    if (nodeId === incPick) {
      states[nodeId] = triggerMet ? "green" : "yellow";
    } else {
      states[nodeId] = triggerMet ? "yellow" : "gray";
    }
  }

  const incorporated = profile.structure === "ccpc";
  states["stage-4-sred-deepening"] = incorporated && rdTags ? "yellow" : "gray";
  states["stage-4-retained-earnings-planning"] = incorporated || incTriggeredByRevenue ? "yellow" : "gray";

  states["branch-hire-first-employee"] = profile.hireFirst ? "yellow" : "gray";
  states["branch-service-vs-productize"] = "yellow";

  void today; // reserved: stage-state expiries (none in v2026 CFE yet)

  return states as Record<CFENodeId, NodeStateColor>;
}

const SEVERITY_ORDER = { info: 0, caution: 1, "professional-required": 2 } as const;

const COMBO_MITIGATION =
  "Review this position alongside the other maximized claims it's stacked with — the combination is what draws review attention, not any single line on its own.";

/**
 * Attaches the honest risk read to every surfaced lever (docs/brain/risk-calculator.md).
 * Risk informs — it never removes or down-ranks an option. A professional-required read
 * does downgrade green → yellow, because "needs a professional first" IS the yellow state.
 *
 * Also evaluates `riskCatalogV2026.combinations` (audit H2): strategy stacks whose members
 * are all live in the same result raise the severity beyond any single member's own risk
 * read. This catalog data was previously loaded but never consumed. When both an entry-level
 * risk and a live combination apply to the same item, severity takes the worse of the two
 * and `why` states both reasons — never silently drops one for the other.
 */
function attachRisk(profile: EvaluationProfile, unlocks: UnlockItem[]): UnlockItem[] {
  const unlockIds = new Set(unlocks.map((u) => u.id));
  const liveCombinations = riskCatalogV2026.combinations.filter((combo) =>
    combo.memberIds.every((id) => unlockIds.has(id)),
  );

  return unlocks.map((unlock) => {
    if (unlock.engine === "goal") return unlock;

    const entries = riskCatalogV2026.entries.filter(
      (entry) =>
        entry.appliesTo.includes(unlock.id) &&
        (entry.trigger === undefined || matchPredicate(profile, entry.trigger)),
    );
    const combos = liveCombinations.filter((combo) => combo.memberIds.includes(unlock.id));
    if (entries.length === 0 && combos.length === 0) return unlock;

    const worstEntry =
      entries.length > 0
        ? entries.reduce((a, b) => (SEVERITY_ORDER[b.severity] > SEVERITY_ORDER[a.severity] ? b : a))
        : null;
    const worstCombo =
      combos.length > 0
        ? combos.reduce((a, b) => (SEVERITY_ORDER[b.severityBump] > SEVERITY_ORDER[a.severityBump] ? b : a))
        : null;

    const severity: RiskSeverity =
      worstCombo && (!worstEntry || SEVERITY_ORDER[worstCombo.severityBump] > SEVERITY_ORDER[worstEntry.severity])
        ? worstCombo.severityBump
        : worstEntry!.severity;

    return {
      ...unlock,
      state: severity === "professional-required" && unlock.state === "green" ? "yellow" : unlock.state,
      risk: {
        level: severity,
        gaar: worstEntry?.gaarExposure ?? false,
        why: [worstEntry?.why, worstCombo?.why].filter((s): s is string => Boolean(s)).join(" "),
        mitigation: worstEntry?.mitigation ?? COMBO_MITIGATION,
      },
    };
  });
}

export interface EvaluateOptions {
  /** ISO date used for time-boxed incentives — pass a fixed value in tests. */
  today: string;
  /** Cockpit branch picks; defaults mirror recomputeScenarioState's defaults. */
  activeBranches?: Record<string, CFENodeId>;
  /**
   * [8a] The venture's CONFIRMED figures only (proposed, retracted or discarded ones must never be
   * passed). A figure beats an estimate where it settles a rule; cards it decided carry
   * `fromRecords`.
   */
  figures?: readonly ConfirmedFigure[];
}

export function evaluateProfile(profile: EvaluationProfile, options: EvaluateOptions): EvaluationResult {
  const { today } = options;
  const activeBranches = options.activeBranches ?? {
    gstTiming: "stage-2b-mandatory-gst-registration",
    incorporationTiming: "stage-3a-incorporation-80k-net",
  };

  const unlocks: UnlockItem[] = [
    ...goalUnlocks(profile),
    ...refineUnlocks(profile),
    ...writeOffsCatalogV2026.entries
      .map((entry) => evaluateWriteOff(profile, entry, today))
      .filter((item): item is UnlockItem => item !== null),
    ...grantsCatalogV2026.entries
      .map((entry) => evaluateGrant(profile, entry))
      .filter((item): item is UnlockItem => item !== null),
    ...complianceCatalogV2026.entries
      .map((entry) => evaluateComplianceRule(profile, entry, options.figures, today))
      .filter((item): item is UnlockItem => item !== null),
    ...structureLadderV2026
      .map((step) => evaluateStructureStep(profile, step))
      .filter((item): item is UnlockItem => item !== null),
  ];

  return {
    unlocks: attachRisk(profile, unlocks),
    nodeStates: computeNodeStates(profile, activeBranches, today, gstRecordsVerdict(options.figures, today)),
    provinceCoverage: provinceCoverageFor(profile.province),
  };
}
