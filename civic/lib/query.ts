import { ACTION_ROUTES, NO_ROUTES, OUTCOMES } from "./demo/actions";
import { CLAIMS } from "./demo/claims";
import { COALITION } from "./demo/coalition";
import { AUTHORITIES, DECISIONS } from "./demo/decisions";
import { ISSUES } from "./demo/issues";
import { RELATIONSHIPS, RELATIONSHIP_TYPES } from "./demo/relationships";
import { SOURCES } from "./demo/sources";
import { DEMO_CLOCK, ENTITIES, JURISDICTIONS } from "./demo/world";
import type { ActionRoute, Extraction, PassageRef, SourceDocument } from "./model";
import { actionableNow, checkDeadline } from "./rules/deadlines";
import { FORCE_INFO, STAGE_INFO, shownForce } from "./rules/decisions";
import { independence } from "./rules/independence";
import { REVIEW_INFO, reviewGate } from "./rules/review";
import { STATUS_INFO, shownStatus } from "./rules/status";

/**
 * The one way in to the evidence system. Pages, the read-only API (app/api/v0/) and a future MCP
 * server all call these functions, so the rules in lib/rules/ (what status may be shown, which
 * deadlines count as current, how much a provision binds) apply everywhere the same way.
 *
 * Everything returned is plain data, safe to send as JSON.
 */

export function entity(id: string) {
  return ENTITIES.find((e) => e.id === id) ?? null;
}

export function jurisdiction(id: string) {
  return JURISDICTIONS.find((j) => j.id === id) ?? null;
}

export function source(id: string): SourceDocument | null {
  return SOURCES.find((s) => s.id === id) ?? null;
}

/** A passage with its source, for showing a quotation and linking to it. Null if it doesn't resolve. */
export function passage(ref: PassageRef) {
  const doc = source(ref.sourceId);
  const found = doc?.passages.find((p) => p.id === ref.passageId);
  if (!doc || !found) return null;
  return {
    ...found,
    sourceId: doc.id,
    sourceTitle: doc.title,
    sourceKind: doc.kind,
    publisher: entity(doc.publisherId)?.name ?? doc.publisherId,
    publishedOn: doc.publishedOn,
    href: `/sources/${doc.id}#${found.id}`,
  };
}

export type ResolvedPassage = NonNullable<ReturnType<typeof passage>>;

function resolveAll(refs: PassageRef[]): ResolvedPassage[] {
  return refs.map(passage).filter((p): p is ResolvedPassage => p !== null);
}

function allExtractions(): Extraction[] {
  return SOURCES.flatMap((s) => s.figures ?? []).flatMap((f) => f.extractions);
}

// ---------------------------------------------------------------------------------------------

export function searchIssues(query = "", jurisdictionId = "") {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  return ISSUES.filter((issue) => !jurisdictionId || issue.jurisdictionIds.includes(jurisdictionId))
    .filter((issue) => {
      if (words.length === 0) return true;
      const haystack = [issue.title, issue.oneLine, issue.whatHappened, ...issue.tags]
        .join(" ")
        .toLowerCase();
      return words.every((w) => haystack.includes(w));
    })
    .map((issue) => ({
      id: issue.id,
      title: issue.title,
      state: issue.state,
      oneLine: issue.oneLine,
      jurisdictions: issue.jurisdictionIds.map((id) => jurisdiction(id)?.name ?? id),
      claimCount: issue.claimIds.length,
      lastReviewedOn: issue.lastReviewedOn ?? null,
      fictional: issue.fictional,
    }));
}

export function claimSummary(id: string) {
  const claim = CLAIMS.find((c) => c.id === id);
  if (!claim) return null;
  const shown = shownStatus(claim);
  const review = reviewGate(claim, allExtractions());
  return {
    id: claim.id,
    issueId: claim.issueId,
    proposition: claim.proposition,
    kind: claim.kind,
    status: shown.status,
    statusLabel: STATUS_INFO[shown.status].label,
    statusSymbol: STATUS_INFO[shown.status].symbol,
    statusReason: shown.reason,
    statusWithheld: shown.withheld,
    review: review.state,
    reviewLabel: REVIEW_INFO[review.state].label,
    highStakes: claim.highStakes,
  };
}

export type ClaimSummary = NonNullable<ReturnType<typeof claimSummary>>;

export function getIssue(id: string) {
  const issue = ISSUES.find((i) => i.id === id);
  if (!issue) return null;
  const decisions = DECISIONS.filter((d) => issue.decisionIds.includes(d.id)).map((d) => ({
    id: d.id,
    title: d.title,
    stage: d.stage,
    stageLabel: STAGE_INFO[d.stage].label,
    inForce: STAGE_INFO[d.stage].inForce,
    authority: authorityView(d.authorityId),
    nextIntervention:
      d.timeline.find((e) => e.interventionPoint && e.date && e.date >= DEMO_CLOCK) ?? null,
  }));
  const routes = ACTION_ROUTES.filter((r) => r.issueId === id);
  return {
    ...issue,
    jurisdictions: issue.jurisdictionIds.map((j) => jurisdiction(j)?.name ?? j),
    claims: issue.claimIds.map(claimSummary).filter((c): c is ClaimSummary => c !== null),
    decisions,
    affected: issue.affected.map((group) => ({ ...group, basis: resolveAll(group.basis) })),
    actionableNow: actionableNow(routes, DEMO_CLOCK).map((r) => routeView(r, DEMO_CLOCK)),
    routeCount: routes.length,
    noRouteCount: NO_ROUTES.filter((n) => n.issueId === id).length,
    outcomes: outcomesFor(id),
    hasCoalition: COALITION.issueId === id,
    today: DEMO_CLOCK,
  };
}

export type IssueView = NonNullable<ReturnType<typeof getIssue>>;

export function getClaim(id: string) {
  const claim = CLAIMS.find((c) => c.id === id);
  if (!claim) return null;
  const extractions = allExtractions().filter((e) => claim.dependsOnExtractions?.includes(e.id));
  const figures = SOURCES.flatMap((s) =>
    (s.figures ?? []).map((f) => ({ ...f, sourceId: s.id })),
  ).filter((f) => f.extractions.some((e) => claim.dependsOnExtractions?.includes(e.id)));
  return {
    ...claim,
    summary: claimSummary(id)!,
    reviewGate: reviewGate(claim, allExtractions()),
    assertedIn: resolveAll(claim.assertedIn),
    assertions: independence(claim.assertedIn, SOURCES),
    evidence: claim.evidence.map((link) => ({ ...link, passage: passage(link) })),
    evidenceIndependence: independence(
      claim.evidence.filter((l) => l.stance === "supports" || l.stance === "contradicts"),
      SOURCES,
    ),
    scientificQuestions: claim.scientificQuestions?.map((q) => ({
      ...q,
      basis: resolveAll(q.basis ?? []),
    })),
    extractions,
    figures,
    splitInto: (claim.splitInto ?? [])
      .map(claimSummary)
      .filter((c): c is ClaimSummary => c !== null),
    related: (claim.related ?? []).map(claimSummary).filter((c): c is ClaimSummary => c !== null),
  };
}

export type ClaimView = NonNullable<ReturnType<typeof getClaim>>;

export function authorityView(id: string) {
  const authority = AUTHORITIES.find((a) => a.id === id);
  if (!authority) return null;
  return {
    ...authority,
    name: entity(authority.entityId)?.name ?? authority.entityId,
    jurisdiction: jurisdiction(authority.jurisdictionId)?.name ?? authority.jurisdictionId,
    basis: resolveAll(authority.basis),
  };
}

export function getTimeline(issueId: string) {
  return DECISIONS.filter((d) => d.issueId === issueId).map((d) => ({
    id: d.id,
    title: d.title,
    instrument: d.instrument,
    stage: d.stage,
    stageLabel: STAGE_INFO[d.stage].label,
    stageMeaning: STAGE_INFO[d.stage].meaning,
    inForce: STAGE_INFO[d.stage].inForce,
    stageBasis: resolveAll(d.stageBasis),
    authority: authorityView(d.authorityId),
    jurisdiction: jurisdiction(d.jurisdictionId)?.name ?? d.jurisdictionId,
    provisions: d.provisions.map((p) => {
      const force = shownForce(p, source(p.original.sourceId)!);
      return {
        ...p,
        force,
        forceLabel: FORCE_INFO[force].label,
        forceMeaning: FORCE_INFO[force].meaning,
        original: passage(p.original),
      };
    }),
    events: [...d.timeline]
      .sort((a, b) => (a.date ?? "9999").localeCompare(b.date ?? "9999"))
      .map((e) => ({
        ...e,
        source: e.source ? passage(e.source) : null,
        when: !e.date
          ? ("unknown" as const)
          : e.date < DEMO_CLOCK
            ? ("past" as const)
            : ("ahead" as const),
      })),
  }));
}

function routeView(route: ActionRoute, today: string) {
  return {
    ...route,
    authority: authorityView(route.authorityId),
    receivedBy: entity(route.receivedById)?.name ?? route.receivedById,
    jurisdiction: jurisdiction(route.jurisdictionId)?.name ?? route.jurisdictionId,
    processBasis: resolveAll(route.process.basis),
    eligibilityBasis: resolveAll(route.eligibilityBasis),
    deadline: route.deadline
      ? {
          ...route.deadline,
          check: checkDeadline(route.deadline, today),
          source: passage(route.deadline.source),
        }
      : null,
    restsOn: route.restsOnClaims.map(claimSummary).filter((c): c is ClaimSummary => c !== null),
  };
}

export type RouteView = ReturnType<typeof routeView>;

export function getActions(issueId: string, today = DEMO_CLOCK) {
  const routes = ACTION_ROUTES.filter((r) => r.issueId === issueId).map((r) => routeView(r, today));
  const state = (r: RouteView) => r.deadline?.check.state ?? "no-deadline";
  return {
    today,
    open: routes
      .filter((r) => state(r) === "open")
      .sort((a, b) => a.deadline!.date.localeCompare(b.deadline!.date)),
    checkDate: routes.filter((r) => state(r) === "check-date"),
    noDeadline: routes.filter((r) => state(r) === "no-deadline"),
    closed: routes.filter((r) => state(r) === "closed"),
    noRoutes: NO_ROUTES.filter((n) => n.issueId === issueId).map((n) => ({
      ...n,
      basis: resolveAll(n.basis),
    })),
    outcomes: outcomesFor(issueId),
  };
}

export function getRoute(id: string) {
  const route = ACTION_ROUTES.find((r) => r.id === id);
  return route ? routeView(route, DEMO_CLOCK) : null;
}

function outcomesFor(issueId: string) {
  return OUTCOMES.filter((o) => o.issueId === issueId)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((o) => ({ ...o, source: o.source ? passage(o.source) : null }));
}

export function getOrganisations(issueId: string) {
  if (!ISSUES.some((i) => i.id === issueId && i.state === "researched-demo")) return null;
  const relationships = RELATIONSHIPS.map((r) => ({
    ...r,
    from: entity(r.fromId),
    to: entity(r.toId),
    typeInfo: RELATIONSHIP_TYPES[r.type],
    statusLabel: STATUS_INFO[r.status].label,
    evidence: r.evidence.map((l) => ({ ...l, passage: passage(l) })),
  }));
  const involved = new Set(relationships.flatMap((r) => [r.fromId, r.toId]));
  return {
    entities: ENTITIES.filter(
      (e) => involved.has(e.id) || AUTHORITIES.some((a) => a.entityId === e.id),
    ),
    relationships,
    types: RELATIONSHIP_TYPES,
  };
}

export function getSource(id: string) {
  const doc = source(id);
  if (!doc) return null;
  const citedBy = CLAIMS.filter(
    (c) => c.evidence.some((l) => l.sourceId === id) || c.assertedIn.some((r) => r.sourceId === id),
  ).map((c) => claimSummary(c.id)!);
  return {
    ...doc,
    publisher: entity(doc.publisherId)?.name ?? doc.publisherId,
    commissionedBy: doc.commissionedById
      ? (entity(doc.commissionedById)?.name ?? doc.commissionedById)
      : null,
    derivedFrom: doc.derivedFromId ? source(doc.derivedFromId) : null,
    passages: doc.passages.map((p) => ({
      ...p,
      repeatsPassage: p.repeats ? passage(p.repeats) : null,
    })),
    citedBy,
  };
}

export function getCoalition(issueId: string) {
  return COALITION.issueId === issueId ? COALITION : null;
}

export const ALL = {
  ISSUES,
  CLAIMS,
  SOURCES,
  ENTITIES,
  JURISDICTIONS,
  DECISIONS,
  AUTHORITIES,
  ACTION_ROUTES,
  NO_ROUTES,
  OUTCOMES,
  RELATIONSHIPS,
  COALITION,
};
