import { citationCheckProblems } from "../../shared/citation-check";
import type { PhaseCatalog, PhaseLegalFormId, PhaseSource } from "./types";

const LEGAL_FORMS: readonly PhaseLegalFormId[] = ["own-name", "partnership", "corporation"];
const FORM_ANSWERS = new Set(["yes", "no", "result", "not-said", "not-read"]);
// A page, never a downloaded file: the quote check reads web pages only (docs/engines/citations.md).
const FILE_ADDRESS = /\.(pdf|docx?|xlsx?|pptx?|zip|csv)(?:[?#]|$)/i;

/**
 * The sites the phase pages may come from: the CRA and canada.ca, the federal registries, Alberta's main site and,
 * since the maintainer's word of 2026-11-13 ("Use the Alberta page"), its career site ALIS, and Statistics Canada.
 * The catalog's sources and the test list it was written from (tests/phase-lists.spec.ts) are held to this one list,
 * so a new site is a decision made once, here.
 */
export const PHASE_SOURCE_HOSTS: ReadonlySet<string> = new Set([
  "www.canada.ca",
  "ised-isde.canada.ca",
  "www.alberta.ca",
  "alis.alberta.ca",
  "www23.statcan.gc.ca",
]);

/** The site of an address, or null when it is no address at all. */
function hostOf(url: string): string | null {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

/**
 * The checks the phase catalog must pass (docs/engines/phases.md; tests/phase-catalog.spec.ts runs them). The two of
 * the plan's § 3.2 first: every entry has a source, and every "leads to" names an entry that exists. Then: every "leads
 * to" cites the page that says so, every source is a page on one of PHASE_SOURCE_HOSTS checked the way every catalog's
 * is, ids are used once, every
 * change answers for all three legal forms and starts from a standing, and a road it names is written. Each problem is
 * one plain sentence naming the entry; an empty list means the catalog is fine. Pure: today's date and the written
 * roads' ids are passed in.
 */
export function phaseCatalogProblems(
  catalog: PhaseCatalog,
  { today, roadIds }: { today: string; roadIds: readonly string[] },
): string[] {
  const problems: string[] = [];
  const standingIds = new Set<string>(catalog.standings.map((s) => s.id));
  const changeIds = new Set<string>(catalog.changes.map((c) => c.id));

  // Standings, legal forms and changes share one set of ids, so a "leads to" can never mean two things.
  const seen = new Set<string>();
  for (const id of [...catalog.standings, ...catalog.legalForms, ...catalog.changes].map((e) => e.id)) {
    if (seen.has(id)) problems.push(`Phase id "${id}" is used twice.`);
    seen.add(id);
  }

  const checkSources = (where: string, sources: readonly PhaseSource[]) => {
    for (const source of sources) {
      if (!/^https:\/\//.test(source.url)) problems.push(`A source of ${where} is not an https page: ${source.url}`);
      if (FILE_ADDRESS.test(source.url)) problems.push(`A source of ${where} is a file, not a page: ${source.url}`);
      const host = hostOf(source.url);
      if (host !== null && !PHASE_SOURCE_HOSTS.has(host)) {
        problems.push(`A source of ${where} is on ${host}, which is not one of the sites phase pages may come from.`);
      }
      for (const p of citationCheckProblems(source, today)) problems.push(`A source of ${where}: ${p}.`);
      if (source.fold !== undefined && source.fold.label.trim() === "") problems.push(`A source of ${where} has a fold with no label.`);
      if (source.fold?.under !== undefined && source.fold.under.trim() === "") {
        problems.push(`A source of ${where} has a fold with a blank heading above it.`);
      }
    }
  };
  const entry = (kind: string, id: string, name: string, sources: readonly PhaseSource[]) => {
    const where = `${kind} "${id}"`;
    if (name.trim() === "") problems.push(`${where[0].toUpperCase()}${where.slice(1)} has no name.`);
    if (sources.length === 0) problems.push(`${where[0].toUpperCase()}${where.slice(1)} has no source.`);
    checkSources(where, sources);
  };

  for (const s of catalog.standings) entry("standing", s.id, s.name, s.citations);
  for (const f of catalog.legalForms) entry("legal form", f.id, f.name, f.citations);

  for (const c of catalog.changes) {
    entry("change", c.id, c.name, c.citations);
    const name = `Change "${c.id}"`;
    if (c.planLabel.trim() === "") problems.push(`${name} has no label from the plan.`);

    for (const form of LEGAL_FORMS) {
      const answer = c.forms[form];
      if (answer === undefined) problems.push(`${name} has no answer for ${form}.`);
      else if (!FORM_ANSWERS.has(answer)) problems.push(`${name} has "${answer}" for ${form}, which is not an answer.`);
    }
    if (LEGAL_FORMS.every((form) => c.forms[form] === "no")) problems.push(`${name} can apply to no legal form.`);

    if (c.from.length === 0) problems.push(`${name} starts from no standing.`);
    for (const s of c.from) {
      if (!standingIds.has(s)) problems.push(`${name} starts from "${s}", which is not a standing.`);
    }

    for (const link of c.leadsTo) {
      if (link.to === c.id) problems.push(`${name} leads to itself.`);
      else if (!standingIds.has(link.to) && !changeIds.has(link.to)) {
        problems.push(`${name} leads to "${link.to}", which is no standing or change.`);
      }
      // The plan's § 3.2: what a change leads to is shown with the page that says so, never on DotAmi's word alone.
      if (link.citation === undefined) problems.push(`${name} leads to "${link.to}" with no page that says so.`);
      else checkSources(`change "${c.id}" leading to "${link.to}"`, [link.citation]);
    }

    if (c.roadId !== null && !roadIds.includes(c.roadId)) problems.push(`${name} names road "${c.roadId}", which is not written.`);
  }
  return problems;
}
