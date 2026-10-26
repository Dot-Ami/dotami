import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { ALL } from "@/lib/query";
import { archiveMatches, canonicalText, sha256Hex } from "@/lib/rules/integrity";

describe("provenance: what is shown is what was archived", () => {
  it("every source's text matches the SHA-256 recorded for its archived copy", () => {
    const mismatched = ALL.SOURCES.filter((s) => !archiveMatches(s)).map(
      (s) => `${s.id}: now ${sha256Hex(canonicalText(s))}`,
    );
    expect(mismatched).toEqual([]);
  });

  it("changing one character of one passage breaks the match", () => {
    const source = structuredClone(ALL.SOURCES[0]);
    source.passages[0].text += ".";
    expect(archiveMatches(source)).toBe(false);
  });

  it("no record carries a quotation of its own: quotations are references to passages", () => {
    // Everything shown as "the source says" or "original wording" is a PassageRef ({ sourceId,
    // passageId }); a stray text field next to one would be a retyped quotation that could drift.
    const refs = [
      ...ALL.CLAIMS.flatMap((c) => [...c.assertedIn, ...c.evidence]),
      ...ALL.DECISIONS.flatMap((d) => d.provisions.map((p) => p.original)),
      ...ALL.RELATIONSHIPS.flatMap((r) => r.evidence),
    ];
    for (const ref of refs)
      expect(Object.keys(ref).filter((k) => /text|quote|wording/i.test(k))).toEqual([]);
  });

  it("the quotation component prints the passage's own text and nothing typed in its place", () => {
    const quote = readFileSync(path.join(__dirname, "..", "components", "quote.tsx"), "utf8");
    expect(quote).toContain("{passage.text}");
  });
});

/**
 * Our own words (interpretations, summaries, notes, explanations) stay calm. Loaded words belong
 * only inside quoted source passages, where they are evidence of what someone said.
 */
const LOADED =
  /\b(?:shocking|outrageous|bombshell|exposed|cover-?up|scandal|corrupt|sinister|poison(?:ing|ed)?|toxic|evil|lies|lying|rigged|scam|wake up)\b/i;

describe("tone: our own words don't reach for outrage", () => {
  it("no loaded words in anything the demo team wrote", () => {
    const ours: { where: string; text: string }[] = [];
    for (const c of ALL.CLAIMS) {
      for (const [k, v] of Object.entries({
        proposition: c.proposition,
        statusReason: c.statusReason,
        supported: c.supportedConclusion,
        interpretation: c.interpretation,
        action: c.actionJustified,
      })) {
        ours.push({ where: `${c.id}.${k}`, text: v });
      }
      c.evidence.forEach((e, i) => ours.push({ where: `${c.id}.evidence[${i}]`, text: e.note }));
    }
    for (const i of ALL.ISSUES)
      ours.push({
        where: i.id,
        text: `${i.oneLine} ${i.whatHappened} ${i.affected.map((a) => a.how).join(" ")}`,
      });
    for (const r of ALL.ACTION_ROUTES)
      ours.push({
        where: r.id,
        text: `${r.title} ${r.desiredOutcome} ${r.limitations.join(" ")} ${r.nextStep}`,
      });
    for (const r of ALL.RELATIONSHIPS)
      ours.push({ where: r.id, text: `${r.detail} ${r.doesNotEstablish.join(" ")}` });
    expect(ours.filter((o) => LOADED.test(o.text)).map((o) => o.where)).toEqual([]);
  });
});
