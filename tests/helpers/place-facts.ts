import type { WageShown } from "@/lib/about-job/types";
import { aboutJobForFuture, wageFileProvince } from "@/lib/about-job/view";
import { cockpitWords } from "@/lib/cockpit/words";
import { incorporationRoutesFor, incorporationRoutesV2026 } from "@/lib/engines/cfe/v2026/incorporation-routes";
import { roadsV2026 } from "@/lib/engines/roads/v2026";
import { wages } from "@/lib/engines/wages/v2026";
import { PROVINCES } from "@/lib/scenarios/types";

import type { CockpitRun } from "./idea-pipeline";

/**
 * The facts one cockpit run shows that a place can be tied to (task 37a, the province swap): each step of the plan,
 * its sources, its *done when* lines' sources, its official links, its cost lines, the ways to incorporate the
 * Incorporating stage lists (components/node-detail-panel.tsx `incorporationRoutesFor`), *About this job*'s wage
 * rows (`aboutJobForFuture`, what GET /api/futures/<id> reads) and its links. Each is read from what the screens
 * draw (the plan view, the panel's own function), and given the place it is written for, as its source says.
 *
 * `jurisdiction` is "CA" for a federal fact, a province's code for a fact written for one, or null for a fact
 * that names no place (a cost line DotAmi named with no source, a link to a page no catalog cites).
 */
export interface PlaceFact {
  kind: "step" | "source" | "done when" | "official link" | "cost line" | "way to incorporate" | "wage row" | "about this job link";
  /** Where on screen: the step's id, or "about this job". */
  where: string;
  /** What it is: an address, a line's label and id, a wage row's place. */
  what: string;
  jurisdiction: string | null;
}

const OFFICIAL_FEE = cockpitWords.plan.costKind["official-fee"];

/** Every address the catalogs cite, with the place its citation says it is written for. */
const JURISDICTION_OF = new Map<string, string>();
for (const road of roadsV2026) {
  for (const step of road.steps) {
    for (const c of [...step.citations, ...step.doneWhen.map((line) => line.citation)]) JURISDICTION_OF.set(c.url, c.jurisdiction);
    for (const cost of step.costs) {
      const source = cost.kind === "official-fee" ? cost.citation : cost.nameSource;
      if (source) JURISDICTION_OF.set(source.url, source.jurisdiction);
    }
  }
}
for (const route of incorporationRoutesV2026) for (const line of route.lines) JURISDICTION_OF.set(line.citation.url, line.citation.jurisdiction);

/**
 * The place a step is written for, by its own sources and its *done when* lines' sources: "CA" when any is federal,
 * a province's code when every one is that province's, null when they name several provinces and no federal page.
 */
function stepPlace(step: (typeof roadsV2026)[number]["steps"][number]): string | null {
  const places = new Set([...step.citations, ...step.doneWhen.map((line) => line.citation)].map((c) => c.jurisdiction));
  if (places.has("CA")) return "CA";
  return places.size === 1 ? [...places][0]! : null;
}

/** The province or territory a wage file geography belongs to ("ER4830" is Alberta's), "CA" for Canada's row. */
export function wageRowPlace(code: string): string | null {
  if (code === "ER00") return "CA";
  for (const province of PROVINCES) {
    const whole = wages.wholeProvinceCode(wageFileProvince(province));
    if (whole && (code === whole || (whole.length === 4 && code.startsWith(whole)))) return province;
  }
  return null;
}

function wageRows(shown: WageShown): { code: string; name: string }[] {
  if (shown.kind === "missing") return [];
  if (shown.kind === "row") return [shown.row.geography];
  return [shown.row.geography, ...(shown.pointsTo ? wageRows(shown.pointsTo) : [])];
}

/** The place-tied facts of one cockpit run, in the order the screens show them. */
export function placeFacts(c: CockpitRun): PlaceFact[] {
  const facts: PlaceFact[] = [];
  const province = c.final.input.scenario.profile.province;
  const plan = c.final.plan;
  for (const column of plan.steps.columns) {
    for (const shownStep of column.steps) {
      const step = c.road.steps.find((s) => s.id === shownStep.id)!;
      const own = stepPlace(step);
      // A link or a cost line with no source of its own is the step's: on a step written for one province it is
      // that province's (Alberta's registry links on "Register your business name"), elsewhere it names no place.
      const inherited = own !== "CA" ? own : null;
      const at = (url: string) => JURISDICTION_OF.get(url) ?? inherited;
      facts.push({ kind: "step", where: step.id, what: shownStep.label, jurisdiction: own });
      for (const source of shownStep.sources) facts.push({ kind: "source", where: step.id, what: source.url, jurisdiction: at(source.url) });
      for (const line of shownStep.doneWhen) facts.push({ kind: "done when", where: step.id, what: `${line.text} (${line.source.url})`, jurisdiction: at(line.source.url) });
      for (const link of shownStep.officialLinks) facts.push({ kind: "official link", where: step.id, what: link.url, jurisdiction: at(link.url) });
      for (const way of incorporationRoutesFor(step.id, province).routes) {
        for (const line of way.lines) facts.push({ kind: "way to incorporate", where: step.id, what: `${line.label} (${line.id})`, jurisdiction: way.jurisdiction });
      }
    }
  }
  for (const group of plan.money.byStep) {
    for (const line of group.lines) {
      const step = c.road.steps.find((s) => s.costs.some((cost) => cost.id === line.lineId));
      const cost = step?.costs.find((x) => x.id === line.lineId);
      const source = cost ? (cost.kind === "official-fee" ? cost.citation : cost.nameSource) : undefined;
      const own = step ? stepPlace(step) : null;
      const jurisdiction = source?.jurisdiction ?? (own !== "CA" ? own : null);
      // An official fee's amount is the place's fact; a quote's is the person's own number, so it isn't one. (The
      // invented person quotes the first cost line the road names, which is Alberta's name fee on road 0 and the
      // permit fees on the federal steps: the same answer, given to the line each road shows first.)
      const amount = line.kind === OFFICIAL_FEE && line.amount ? ` ${line.amount}` : "";
      facts.push({ kind: "cost line", where: step?.id ?? group.step, what: `${line.label} (${line.lineId})${amount}`, jurisdiction });
    }
  }
  // About this job, for the job the person picked, as the cockpit's panel reads it for the saved future.
  const about = aboutJobForFuture({
    job: c.steps.job,
    place: `CA-${province}`,
    area: c.steps.area ? { value: c.steps.area } : null,
    region: c.steps.region ? { value: c.steps.region } : null,
  });
  if (about) {
    for (const row of wageRows(about.wages.shown)) {
      facts.push({ kind: "wage row", where: "about this job", what: `${row.name} (${row.code})`, jurisdiction: wageRowPlace(row.code) });
    }
    for (const link of about.links.pages) {
      facts.push({ kind: "about this job link", where: "about this job", what: link.url, jurisdiction: link.id === "tradesecrets" ? "AB" : "CA" });
    }
  }
  return facts;
}

/** A fact as one line, the same in every run that shows it. */
export const factLine = (f: PlaceFact) => `${f.kind} · ${f.where} · ${f.what}`;
