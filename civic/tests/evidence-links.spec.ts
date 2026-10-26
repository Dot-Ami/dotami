import { describe, expect, it } from "vitest";

import { ALL } from "@/lib/query";
import type { PassageRef } from "@/lib/model";

/**
 * Every pointer to evidence resolves to a real source and passage inside the prototype. A link
 * that doesn't resolve would show a quotation with nothing behind it.
 */
const {
  SOURCES,
  CLAIMS,
  RELATIONSHIPS,
  DECISIONS,
  AUTHORITIES,
  ACTION_ROUTES,
  NO_ROUTES,
  OUTCOMES,
  ISSUES,
  ENTITIES,
  COALITION,
} = ALL;

function resolves(ref: PassageRef): boolean {
  return Boolean(
    SOURCES.find((s) => s.id === ref.sourceId)?.passages.some((p) => p.id === ref.passageId),
  );
}

/** Every PassageRef anywhere in the dataset, with where it came from. */
function allRefs(): { where: string; ref: PassageRef }[] {
  const out: { where: string; ref: PassageRef }[] = [];
  const add = (where: string, refs: (PassageRef | undefined)[]) =>
    refs.forEach((ref) => ref && out.push({ where, ref }));
  for (const c of CLAIMS) {
    add(`claim ${c.id} assertedIn`, c.assertedIn);
    add(`claim ${c.id} evidence`, c.evidence);
    add(
      `claim ${c.id} science`,
      (c.scientificQuestions ?? []).flatMap((q) => q.basis ?? []),
    );
  }
  for (const r of RELATIONSHIPS) add(`relationship ${r.id}`, r.evidence);
  for (const d of DECISIONS) {
    add(`decision ${d.id} stage`, d.stageBasis);
    add(
      `decision ${d.id} provisions`,
      d.provisions.map((p) => p.original),
    );
    add(
      `decision ${d.id} timeline`,
      d.timeline.map((e) => e.source),
    );
  }
  for (const a of AUTHORITIES) add(`authority ${a.id}`, a.basis);
  for (const r of ACTION_ROUTES) {
    add(`route ${r.id} process`, r.process.basis);
    add(`route ${r.id} eligibility`, r.eligibilityBasis);
    add(`route ${r.id} deadline`, [r.deadline?.source]);
  }
  for (const n of NO_ROUTES) add(`no-route ${n.id}`, n.basis);
  for (const o of OUTCOMES) add(`outcome ${o.id}`, [o.source]);
  for (const i of ISSUES)
    add(
      `issue ${i.id} affected`,
      i.affected.flatMap((g) => g.basis),
    );
  for (const s of SOURCES)
    add(
      `source ${s.id} repeats`,
      s.passages.map((p) => p.repeats),
    );
  add(
    "coalition statement",
    COALITION.statement.paragraphs.flatMap((p) => p.basis.map((b) => b.passage)),
  );
  return out;
}

describe("evidence links resolve within the prototype", () => {
  it("finds the links it is checking (the check isn't comparing nothing)", () => {
    expect(allRefs().length).toBeGreaterThan(100);
  });

  it("every passage reference points at a source and passage that exist", () => {
    const broken = allRefs().filter(({ ref }) => !resolves(ref));
    expect(broken.map((b) => `${b.where} → ${b.ref.sourceId}#${b.ref.passageId}`)).toEqual([]);
  });

  it("passage ids are unique within each source, so every #anchor lands on one passage", () => {
    for (const s of SOURCES) {
      const ids = s.passages.map((p) => p.id);
      expect(new Set(ids).size, s.id).toBe(ids.length);
    }
  });

  it("every source, claim and entity id is unique", () => {
    for (const list of [SOURCES, CLAIMS, ENTITIES, ACTION_ROUTES, DECISIONS]) {
      const ids = list.map((x) => x.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it("every claim, entity, authority and figure reference names something that exists", () => {
    const claimIds = new Set(CLAIMS.map((c) => c.id));
    const entityIds = new Set(ENTITIES.map((e) => e.id));
    const authorityIds = new Set(AUTHORITIES.map((a) => a.id));
    const extractionIds = new Set(
      SOURCES.flatMap((s) => s.figures ?? []).flatMap((f) => f.extractions.map((e) => e.id)),
    );
    const missing: string[] = [];
    const need = (ok: boolean, what: string) => ok || missing.push(what);

    for (const c of CLAIMS) {
      [...(c.splitInto ?? []), ...(c.related ?? [])].forEach((id) =>
        need(claimIds.has(id), `claim ${c.id} → claim ${id}`),
      );
      (c.dependsOnExtractions ?? []).forEach((id) =>
        need(extractionIds.has(id), `claim ${c.id} → extraction ${id}`),
      );
    }
    for (const i of ISSUES)
      i.claimIds.forEach((id) => need(claimIds.has(id), `issue ${i.id} → claim ${id}`));
    for (const s of SOURCES) {
      need(entityIds.has(s.publisherId), `source ${s.id} publisher`);
      if (s.commissionedById)
        need(entityIds.has(s.commissionedById), `source ${s.id} commissioner`);
      if (s.derivedFromId)
        need(
          SOURCES.some((x) => x.id === s.derivedFromId),
          `source ${s.id} derivedFrom`,
        );
      for (const f of s.figures ?? [])
        need(
          s.passages.some((p) => p.id === f.captionPassageId),
          `figure ${f.id} caption`,
        );
    }
    for (const r of RELATIONSHIPS) {
      need(entityIds.has(r.fromId), `relationship ${r.id} from`);
      need(entityIds.has(r.toId), `relationship ${r.id} to`);
    }
    for (const a of AUTHORITIES) need(entityIds.has(a.entityId), `authority ${a.id}`);
    for (const d of DECISIONS) need(authorityIds.has(d.authorityId), `decision ${d.id}`);
    for (const r of ACTION_ROUTES) {
      need(authorityIds.has(r.authorityId), `route ${r.id} authority`);
      need(entityIds.has(r.receivedById), `route ${r.id} receiver`);
      r.restsOnClaims.forEach((id) => need(claimIds.has(id), `route ${r.id} → claim ${id}`));
    }
    for (const p of COALITION.statement.paragraphs)
      p.basis.forEach((b) => b.claimId && need(claimIds.has(b.claimId), `paragraph ${p.id}`));
    expect(missing).toEqual([]);
  });
});
