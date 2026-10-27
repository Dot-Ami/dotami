/**
 * The map shows nothing DotAmi made up (docs/architecture/future-cockpit.md § 9, fixes 1 to 3;
 * docs/task-list.md [10f]).
 *
 * Until 2026-10-11:
 * - a first-year estimate at 70% of the GST/HST line (about $21,000) turned the GST/HST card amber
 *   and said the estimate was "approaching" it. No cited page sets 70%: it was DotAmi's own number.
 * - the GST/HST wording was a paraphrase ("$30,000 rolling four-quarter / single quarter", "Wait for
 *   $30K") that dropped the CRA's "(or fewer)".
 * - the Liability / SR&ED stage lit from the idea's activity tags and never said so.
 * - Incorporating showed no route to incorporate and had nowhere to keep the person's own number.
 */
import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { evaluateProfile, type ConfirmedFigure, type EvaluationProfile } from "@/lib/brain";
import { cfeCatalogV2026, type CFENodeId } from "@/lib/engines/cfe/v2026";
import { complianceCatalogV2026 } from "@/lib/engines/compliance/v2026";
import { howChecked, toolCheckQuotes } from "@/lib/engines/shared/citation-check";
import type { EngineCitation } from "@/lib/engines/shared/types";
import { structureLadderV2026 } from "@/lib/engines/structure/v2026";
import { parseScenarioInput } from "@/lib/db/parse-scenario-input";
import { evaluateScenario } from "@/lib/scenarios/evaluate-scenario";
import { branchDecisions, defaultActiveBranches, recomputeScenarioState, setIncorporateAt } from "@/lib/scenarios/branches";
import type { Scenario } from "@/lib/scenarios/types";

const TODAY = "2026-10-11";
const CRA_PAGE =
  "https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/gst-hst-businesses/when-register-charge.html";
const VOLUNTARY = "stage-2a-voluntary-gst-registration" satisfies CFENodeId;
const MANDATORY = "stage-2b-mandatory-gst-registration" satisfies CFENodeId;
const INCORPORATING = "stage-3a-incorporation-80k-net" satisfies CFENodeId;
const LIABILITY_SRED = "stage-3b-incorporation-liability-sred" satisfies CFENodeId;

// The CRA's two small-supplier tests, as on its page (page details: 2026-06-16), without the footnote
// numbers the page puts after "threshold"; tool-checked on 2026-10-12.
const SINGLE_QUARTER = "You exceed the $30,000 threshold in a single calendar quarter.";
const FOUR_QUARTERS =
  "You exceed the $30,000 threshold over the previous four (or fewer) consecutive calendar quarters (but not in a single calendar quarter).";

const base: EvaluationProfile = {
  goals: [],
  ventureType: "service",
  activityTags: [],
  province: "AB",
  employmentStatus: "employee",
  structure: "sole-prop",
  targetRevenueY1: 0,
  targetRevenueY3: 0,
  hireFirst: false,
  capitalPurchasePlanned: false,
};

const gstCard = (profile: Partial<EvaluationProfile>, figures?: ConfirmedFigure[]) => {
  const result = evaluateProfile({ ...base, ...profile }, { today: TODAY, figures });
  return { card: result.unlocks.find((u) => u.id === "compliance-gst-small-supplier")!, nodes: result.nodeStates };
};

const quarter = (start: string, end: string, dollars: number): ConfirmedFigure => ({
  id: `f-${start}`,
  kind: "gross-revenue",
  periodStart: start,
  periodEnd: end,
  amountCents: dollars * 100,
  currency: "CAD",
  sourceLabel: "typed by you",
  sourceRows: null,
});

describe("no 'getting close' line DotAmi chose", () => {
  it("an estimate under $30,000 never turns the GST/HST card amber, however close", () => {
    for (const y1 of [20_999, 21_000, 25_000, 29_999, 30_000]) {
      const { card, nodes } = gstCard({ targetRevenueY1: y1 });
      expect(card.state, `Y1 ${y1}`).toBe("green");
      expect(card.why, `Y1 ${y1}`).not.toMatch(/approach/i);
      // The GST/HST stage nobody picked stays grey until a CRA test is actually met.
      expect(nodes[VOLUNTARY], `Y1 ${y1}`).toBe("gray");
    }
  });

  it("over $30,000 the card still turns amber, and the stage nobody picked becomes the other way", () => {
    const { card, nodes } = gstCard({ targetRevenueY1: 30_001 });
    expect(card.state).toBe("yellow");
    expect(card.why).toContain("over $30,000");
    expect(nodes[MANDATORY]).toBe("green");
    expect(nodes[VOLUNTARY]).toBe("yellow");
  });

  it("a complete year of confirmed figures under the line says 'not over', never 'approaching'", () => {
    const year = [
      quarter("2025-10-01", "2025-12-31", 6_850),
      quarter("2026-01-01", "2026-03-31", 6_850),
      quarter("2026-04-01", "2026-06-30", 6_850),
      quarter("2026-07-01", "2026-09-30", 6_850),
    ];
    const { card, nodes } = gstCard({ targetRevenueY1: 45_000 }, year);
    expect(card.why).toContain("is $27,400 — not over $30,000");
    expect(card.why).not.toMatch(/approach/i);
    expect(card.state).toBe("green");
    expect(nodes[VOLUNTARY]).toBe("gray");
  });

  it("the rules code holds no watch ratio of its own", () => {
    const source = readFileSync(path.join(process.cwd(), "lib", "brain", "evaluate.ts"), "utf8");
    expect(source).not.toMatch(/WATCH_RATIO|\b0\.7\b|approaching|approaches/);
  });
});

describe("the GST/HST card quotes the CRA's two tests, word for word", () => {
  const rule = complianceCatalogV2026.entries.find((e) => e.id === "compliance-gst-small-supplier")!;

  it("the rule carries both tests, each with what the page says happens and from when", () => {
    expect(rule.officialWords?.url).toBe(CRA_PAGE);
    expect(rule.citations.map((c) => c.url)).toContain(CRA_PAGE);
    const passages = rule.officialWords!.passages;
    expect(passages.map((p) => p.sentences[0])).toEqual([SINGLE_QUARTER, FOUR_QUARTERS]);
    expect(passages[0].sentences).toContain("You must register for the GST/HST.");
    expect(passages[0].sentences).toContain(
      "Your effective date of registration is no later than the day of the supply that made you exceed $30,000.",
    );
    expect(passages[1].sentences).toContain(
      "You are no longer a small supplier at the end of the month following the quarter in which you exceed $30,000.",
    );
    expect(passages[1].sentences).toContain("You have to register for the GST/HST.");
    expect(passages[1].sentences).toContain(
      "Your effective date of registration is no later than the day of the first supply you make after you are no longer a small supplier.",
    );
    // How these words were checked on the page: a tool check (option B), never an older read date that would
    // claim someone read them. Since 2026-10-27 the citation also carries the maintainer's read of the page in
    // full on 2026-10-25 (tests/maintainer-reads.spec.ts), which wins on screen; the tool check stays.
    const citation = (rule.citations as readonly EngineCitation[]).find((c) => c.url === CRA_PAGE)!;
    expect(citation.toolCheck?.checkedOn).toBe("2026-10-12");
    expect(howChecked(citation)).toEqual({ kind: "person", on: "2026-10-25" });
  });

  it("every quoted sentence, on every card that quotes the page, is covered by that page's tool check", () => {
    // Each place that quotes the page, with the citation of the page it carries.
    const quoting = [
      { where: "compliance rule", words: rule.officialWords!, citations: rule.citations },
      ...cfeCatalogV2026.nodes
        .filter((n) => n.officialWords)
        .map((n) => ({ where: n.id, words: n.officialWords!, citations: n.citations })),
    ];
    expect(quoting.length).toBe(3);
    for (const { where, words, citations } of quoting) {
      const citation = (citations as readonly EngineCitation[]).find((c) => c.url === words.url);
      expect(citation, where).toBeDefined();
      // The tool check's own quotes, which the catalog keeps under a read too (a read wins on screen, so
      // toolCheckQuotes, what a screen lists, is empty once the page is read).
      expect(citation!.toolCheck, where).toBeDefined();
      expect(toolCheckQuotes(citation!), where).toEqual([]);
      const found = citation!.toolCheck!.quotes;
      for (const sentence of words.passages.flatMap((p) => p.sentences)) {
        // A sentence the tool found whole, or one of the two tests: the page puts a footnote number
        // straight after "threshold" ("threshold1"), so the tool found the words on each side of it.
        const whole = found.includes(sentence);
        const aroundFootnote =
          sentence.startsWith("You exceed the $30,000 threshold ") &&
          found.includes("You exceed the $30,000") &&
          found.some((q) => q !== sentence && sentence.endsWith(` ${q}`));
        expect(whole || aroundFootnote, `${where}: "${sentence}"`).toBe(true);
      }
    }
  });

  it("the card on the map carries the same words, wherever it lights", () => {
    for (const y1 of [0, 45_000]) {
      const words = gstCard({ targetRevenueY1: y1 }).card.officialWords;
      expect(words, `Y1 ${y1}`).toBeDefined();
      expect(words).toEqual(rule.officialWords);
    }
  });

  it("the mandatory stage quotes the same two tests, from a page it cites", () => {
    const node = cfeCatalogV2026.nodes.find((n) => n.id === MANDATORY)!;
    expect(node.officialWords?.passages.map((p) => p.sentences[0])).toEqual([SINGLE_QUARTER, FOUR_QUARTERS]);
    expect(node.citations.map((c) => c.url)).toContain(node.officialWords!.url);
  });

  it("no '$30K' shorthand reaches the screen, and every 'four quarters' keeps the CRA's 'previous four (or fewer)'", () => {
    const shown = JSON.stringify([
      cfeCatalogV2026.nodes,
      complianceCatalogV2026.entries,
      structureLadderV2026,
      branchDecisions,
      readFileSync(path.join(process.cwd(), "components", "discovery", "intake-page.tsx"), "utf8"),
    ]);
    expect(shown).not.toMatch(/\$30K/);
    for (const m of shown.matchAll(/.{0,40}four consecutive.{0,10}/g)) {
      // "do not exceed ... over four consecutive calendar quarters" is the CRA's own wording for the
      // small-supplier row; the tests themselves always say "previous four (or fewer)".
      expect(m[0], m[0]).toMatch(/previous four \(or fewer\) consecutive|not exceed the \$30,000 threshold over four consecutive/);
    }
    expect(shown).not.toMatch(/rolling four-quarter|four quarters in a row/);
  });
});

describe("Liability / SR&ED says which answers lit it", () => {
  it("names the activity tag on the intake that lit it", () => {
    const result = evaluateProfile({ ...base, activityTags: ["Software / SaaS", "Trades"] }, { today: TODAY });
    expect(result.nodeStates[LIABILITY_SRED]).toBe("yellow");
    const reason = result.nodeReasons[LIABILITY_SRED]!;
    expect(reason).toContain("Software / SaaS");
    expect(reason).not.toContain("Trades");
    // And that it reads tags, not a need the person stated.
    expect(reason).toMatch(/tag/);
  });

  it("with none of its tags, says which tags it reads and that none is on the intake", () => {
    const result = evaluateProfile({ ...base, activityTags: ["Trades"] }, { today: TODAY });
    expect(result.nodeStates[LIABILITY_SRED]).toBe("gray");
    const reason = result.nodeReasons[LIABILITY_SRED]!;
    for (const tag of ["Software / SaaS", "Manufacturing", "AI / ML / R&D"]) expect(reason).toContain(tag);
    expect(reason).toMatch(/none/i);
  });
});

describe("Incorporating lights only from the person's own number", () => {
  const pickIncorporating = { ...defaultActiveBranches };

  it("with no number of the person's own, it stays 'check first' at any sales, and says how to light it", () => {
    for (const y3 of [0, 80_000, 10_000_000]) {
      const result = evaluateProfile({ ...base, targetRevenueY3: y3 }, { today: TODAY, activeBranches: pickIncorporating });
      expect(result.nodeStates[INCORPORATING], `Y3 ${y3}`).toBe("yellow");
      // With no estimate it needs both numbers and says so, rather than inviting only the person's own
      // (the second review of PR #182, 2026-10-17; tests/honest-map-words.spec.ts).
      expect(result.nodeReasons[INCORPORATING]).toMatch(y3 > 0 ? /your own number/i : /a number of your own/i);
    }
  });

  it("lights green once the third-year estimate reaches the person's own number, and says both numbers", () => {
    const at = (y3: number) =>
      evaluateProfile({ ...base, targetRevenueY3: y3 }, { today: TODAY, activeBranches: pickIncorporating, incorporateAt: 120_000 });
    expect(at(119_999).nodeStates[INCORPORATING]).toBe("yellow");
    expect(at(120_000).nodeStates[INCORPORATING]).toBe("green");
    expect(at(120_000).nodeReasons[INCORPORATING]).toContain("$120,000");
    expect(at(150_000).nodeReasons[INCORPORATING]).toContain("$150,000");
  });

  it("is grey off the person's path, whatever their number", () => {
    const result = evaluateProfile(
      { ...base, targetRevenueY3: 500_000 },
      { today: TODAY, activeBranches: { ...defaultActiveBranches, incorporationTiming: LIABILITY_SRED }, incorporateAt: 100 },
    );
    expect(result.nodeStates[INCORPORATING]).toBe("gray");
  });

  it("the number is the person's, kept with the idea's map answers and read by evaluateScenario", () => {
    const idea: Scenario = {
      id: "own-number",
      profile: {
        name: "Invented",
        type: "service",
        province: "AB",
        targetRevenueY1: 0,
        targetRevenueY3: 150_000,
        structure: "sole-prop",
        structureSource: "assumed",
        employmentStatus: "self-employed",
        hireFirst: false,
      },
      state: recomputeScenarioState(defaultActiveBranches),
    };
    expect(idea.state.incorporateAt ?? null).toBeNull();
    const withNumber = setIncorporateAt(idea, 100_000);
    expect(withNumber.state.incorporateAt).toBe(100_000);
    expect(withNumber.state.activeBranches).toEqual(idea.state.activeBranches);
    expect(evaluateScenario(withNumber, { today: TODAY }).nodeStates[INCORPORATING]).toBe("green");
    expect(setIncorporateAt(withNumber, null).state.incorporateAt).toBeNull();
  });

  it("a save carries a whole-dollar number through, and drops anything else", () => {
    const body = (incorporateAt: unknown) => ({
      scenario: {
        id: "s",
        profile: {
          name: "Invented",
          type: "service",
          province: "AB",
          targetRevenueY1: 0,
          targetRevenueY3: 0,
          employmentStatus: "employee",
          hireFirst: false,
        },
        state: { activeBranches: defaultActiveBranches, incorporateAt },
      },
    });
    expect(parseScenarioInput(body(100_000))!.state.incorporateAt).toBe(100_000);
    expect(parseScenarioInput(body(99_999.6))!.state.incorporateAt).toBe(100_000);
    for (const bad of [-1, "100000", Number.NaN, 2e9, undefined, null]) {
      expect(parseScenarioInput(body(bad))!.state.incorporateAt ?? null, String(bad)).toBeNull();
    }
  });
});
