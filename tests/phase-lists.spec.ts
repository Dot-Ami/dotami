/**
 * The phase lists hold together (task 48a, story S2.5.48): where a business stands, its legal form, and the changes
 * it can go through, as written in tests/fixtures/phases/v1.ts. Nothing in the app reads them yet; this test keeps
 * them whole until the catalog built from them (task 48c) has checks of its own.
 */
import { describe, expect, it } from "vitest";

import { roadsV2026 } from "@/lib/engines/roads/v2026";

import { networkSourceFiles, readSource } from "./helpers/source-scan";
import {
  CHANGES,
  CHANGE_GROUPS,
  LATER_FORMS,
  LEGAL_FORMS,
  SITUATIONS,
  STANDINGS,
  type FormAnswer,
  type OfficialPage,
} from "./fixtures/phases/v1";

/** The governments whose pages the lists may name: the CRA and canada.ca, the federal registries, Alberta, Statistics Canada. */
const OFFICIAL_HOSTS = new Set(["www.canada.ca", "ised-isde.canada.ca", "www.alberta.ca", "www23.statcan.gc.ca"]);
const FORM_ANSWERS: readonly FormAnswer[] = ["yes", "no", "result", "not-said", "not-read"];

/**
 * The ids that share one name space: a change's "leads to" can name a standing or another change, and the forms sit
 * beside them. The groups and the 12 situation values are labels of their own (a situation and a group may both be
 * called "growing"), each list unique within itself.
 */
const ID_SPACES: readonly (readonly string[])[] = [
  [...STANDINGS.map((s) => s.id), ...LEGAL_FORMS.map((f) => f.id), ...LATER_FORMS.map((f) => f.id), ...CHANGES.map((c) => c.id)],
  CHANGE_GROUPS.map((g) => g.id),
  SITUATIONS.map((s) => s.id),
];

/** Why an official page can't stand behind an entry, or null when it can. */
function pageProblem(page: OfficialPage): string | null {
  let url: URL;
  try {
    url = new URL(page.url);
  } catch {
    return "not an address";
  }
  if (url.protocol !== "https:") return "not https";
  if (!OFFICIAL_HOSTS.has(url.hostname)) return `not an official host (${url.hostname})`;
  if (/\.(pdf|docx?|xlsx?|zip|csv)$/i.test(url.pathname)) return "a file, not a page";
  if (!page.page.trim()) return "no page name";
  return null;
}

describe("the phase lists (task 48a)", () => {
  it("uses every id once in its name space, in lower-case words joined by hyphens", () => {
    for (const ids of ID_SPACES) {
      const seen = new Set<string>();
      expect(ids.filter((id) => (seen.has(id) ? true : (seen.add(id), false)))).toEqual([]);
      expect(ids.filter((id) => !/^[a-z]+(-[a-z]+)*$/.test(id))).toEqual([]);
    }
  });

  it("puts at least one official page behind every standing, legal form and change, never a file", () => {
    const entries = [...STANDINGS, ...LEGAL_FORMS, ...LATER_FORMS, ...CHANGES];
    const problems = entries.flatMap((e) =>
      e.sources.length === 0 ? [`${e.id}: no page`] : e.sources.flatMap((p) => (pageProblem(p) ? [`${e.id}: ${p.url}: ${pageProblem(p)}`] : [])),
    );
    expect(problems).toEqual([]);
  });

  it("lists the four standings and the CRA's three business structures, two of them in DotAmi's rules today", () => {
    expect(STANDINGS.map((s) => s.id)).toEqual(["not-started", "running", "paused", "ended"]);
    expect(LEGAL_FORMS.map((f) => [f.id, f.inRulesToday])).toEqual([
      ["own-name", true],
      ["partnership", false],
      ["corporation", true],
    ]);
  });

  it("keeps a later form apart from the three, so none is counted twice", () => {
    const three = new Set(LEGAL_FORMS.map((f) => f.id as string));
    expect(LATER_FORMS.filter((f) => three.has(f.id)).map((f) => f.id)).toEqual([]);
  });

  it("says, on every change, what its pages say for each of the three legal forms", () => {
    const problems = CHANGES.flatMap((c) =>
      LEGAL_FORMS.flatMap((f) => (FORM_ANSWERS.includes(c.forms[f.id]) ? [] : [`${c.id}: ${f.id} is "${String(c.forms[f.id])}"`])),
    );
    expect(problems).toEqual([]);
    // A change no form can meet would be no change at all.
    expect(CHANGES.filter((c) => LEGAL_FORMS.every((f) => c.forms[f.id] === "no")).map((c) => c.id)).toEqual([]);
  });

  it("names only real standings and changes in where a change starts and what it leads to", () => {
    const standings = new Set(STANDINGS.map((s) => s.id as string));
    const targets = new Set([...standings, ...CHANGES.map((c) => c.id)]);
    const problems = CHANGES.flatMap((c) => [
      ...(c.from.length === 0 ? [`${c.id}: starts from nowhere`] : []),
      ...c.from.filter((s) => !standings.has(s)).map((s) => `${c.id}: from "${s}"`),
      ...c.leadsTo.filter((t) => !targets.has(t)).map((t) => `${c.id}: leads to "${t}"`),
      ...(c.leadsTo.includes(c.id) ? [`${c.id}: leads to itself`] : []),
    ]);
    expect(problems).toEqual([]);
  });

  it("gives a way out of every standing but the end, and a way back from the end", () => {
    // Stopping, pausing and coming back must stay reachable as the list is edited.
    const leadsInto = (standing: string) => CHANGES.some((c) => c.leadsTo.includes(standing));
    const startsIn = (standing: string) => CHANGES.some((c) => c.from.some((s) => s === standing));
    expect(["paused", "ended", "running"].filter((s) => !leadsInto(s))).toEqual([]);
    expect(["running", "paused", "ended"].filter((s) => !startsIn(s))).toEqual([]);
  });

  it("names a road only when one is written for the change, and none is yet", () => {
    const roads = new Set(roadsV2026.map((r) => r.id));
    expect(CHANGES.filter((c) => c.roadId !== null && !roads.has(c.roadId)).map((c) => c.id)).toEqual([]);
  });

  it("files every change in one of the six groups, and no group holds fewer than it did when first written", () => {
    const groups = new Set(CHANGE_GROUPS.map((g) => g.id as string));
    expect(CHANGES.filter((c) => !groups.has(c.group)).map((c) => c.id)).toEqual([]);
    const counts = CHANGE_GROUPS.map((g) => [g.id, CHANGES.filter((c) => c.group === g.id).length]);
    const below = counts.filter(([id, n]) => (n as number) < CHANGE_GROUPS.find((g) => g.id === id)!.firstCount);
    expect(below).toEqual([]);
    expect(CHANGES.length).toBeGreaterThanOrEqual(33);
  });

  it("maps each of the 12 situation values onto the lists, or says why it is no phase", () => {
    expect(SITUATIONS).toHaveLength(12);
    const standings = new Set(STANDINGS.map((s) => s.id as string));
    const forms = new Set(LEGAL_FORMS.map((f) => f.id as string));
    const groups = new Set(CHANGE_GROUPS.map((g) => g.id as string));
    const problems = SITUATIONS.flatMap((s) => {
      if ("notAPhase" in s.maps) return s.maps.notAPhase.trim() ? [] : [`${s.id}: no reason given`];
      const m = s.maps;
      return [
        ...(m.standings.length === 0 ? [`${s.id}: no standing`] : []),
        ...m.standings.filter((x) => !standings.has(x)).map((x) => `${s.id}: standing "${x}"`),
        ...(typeof m.forms === "string" ? [] : m.forms.filter((x) => !forms.has(x)).map((x) => `${s.id}: form "${x}"`)),
        ...m.groups.filter((x) => !groups.has(x)).map((x) => `${s.id}: group "${x}"`),
      ];
    });
    expect(problems).toEqual([]);
  });

  it("leaves only the record changes without a situation value of their own", () => {
    // The five record changes (an address, a name, directors, the year-end, the kind of work) are reports with no road of
    // their own; every other group is some situation value's. A new group needs a value, or a line here saying why not.
    const covered = new Set(SITUATIONS.flatMap((s) => ("groups" in s.maps ? s.maps.groups : [])));
    expect(CHANGE_GROUPS.map((g) => g.id).filter((g) => !covered.has(g))).toEqual(["record"]);
  });

  it("is read by nothing in the app (the catalog the screens read is task 48c)", () => {
    // Every file the app and the desktop app run from (tests/helpers/source-scan.ts), the same list the network check reads.
    expect(networkSourceFiles().filter((file) => readSource(file).includes("fixtures/phases"))).toEqual([]);
  }, 60_000);
});
