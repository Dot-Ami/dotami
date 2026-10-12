import type { EngineCitation } from "../../shared/types";
import type { CatalogCostLine, CostLineAsShown, Road, SkillItem } from "./types";

/**
 * The checks every road must pass before it ships (tests/roads.spec.ts runs them on every road in
 * the catalog). Each problem comes back as one plain sentence naming the id, so a contributor can
 * find it; an empty list means the road is fine. Pure: no I/O, nothing about any screen.
 *
 * Content still to be written (a step's done-when lines, cost lines, skills) may be empty; what is
 * written must be cited. That is how road 0 ships before its done-when lines are read and written.
 */
export function roadProblems(road: Road, skillItems: readonly SkillItem[]): string[] {
  const problems: string[] = [];
  const stepIds = new Set(road.steps.map((s) => s.id));
  const forkIds = new Set(road.forks.map((f) => f.id));
  const skillIds = new Set(skillItems.map((s) => s.id));

  // Ids: unique across the whole road, because storage keys on them (a tick on a done-when line,
  // a quote on a cost line) and two things answering to one id would mix up what the person said.
  const seen = new Set<string>();
  const allIds = [
    ...road.columns.map((c) => c.id),
    ...road.steps.flatMap((s) => [s.id, ...s.doneWhen.map((d) => d.id), ...s.costs.map((c) => c.id)]),
    ...road.forks.map((f) => f.id),
  ];
  for (const id of allIds) {
    if (seen.has(id)) problems.push(`The id "${id}" is used twice in road "${road.id}".`);
    seen.add(id);
  }

  // Columns: every step sits in exactly one, and a column names only real steps and forks.
  const placements = new Map<string, number>();
  for (const column of road.columns) {
    for (const stepId of column.steps) {
      if (!stepIds.has(stepId)) {
        problems.push(`Column "${column.id}" names a step the road doesn't have: "${stepId}".`);
      }
      placements.set(stepId, (placements.get(stepId) ?? 0) + 1);
    }
    if (column.forkId !== undefined && !forkIds.has(column.forkId)) {
      problems.push(`Column "${column.id}" names a fork the road doesn't have: "${column.forkId}".`);
    }
  }

  for (const step of road.steps) {
    const count = placements.get(step.id) ?? 0;
    if (count === 0) problems.push(`Step "${step.id}" sits in no column.`);
    if (count > 1) problems.push(`Step "${step.id}" sits in ${count} columns.`);

    if (step.citations.length === 0) problems.push(`Step "${step.id}" has no citation.`);
    for (const citation of step.citations) problems.push(...citationProblems(citation, `step "${step.id}"`));

    for (const target of step.next) {
      if (!stepIds.has(target)) {
        problems.push(`Step "${step.id}" leads to a step the road doesn't have: "${target}".`);
      }
    }

    for (const line of step.doneWhen) {
      // The type says every line has a citation; contributor files arrive as data, so check anyway.
      if (!line.citation) problems.push(`Done-when line "${line.id}" has no citation.`);
      else problems.push(...citationProblems(line.citation, `done-when line "${line.id}"`));
    }

    for (const need of step.needs) {
      if (!skillIds.has(need)) {
        problems.push(`Step "${step.id}" needs a skill item that isn't listed: "${need}".`);
      }
    }

    for (const cost of step.costs) problems.push(...costProblems(cost));
  }

  for (const fork of road.forks) {
    for (const side of fork.sides) {
      if (!stepIds.has(side)) problems.push(`Fork "${fork.id}" has a side the road doesn't have: "${side}".`);
    }
    if (fork.sides[0] === fork.sides[1]) problems.push(`Fork "${fork.id}" names the same step on both sides.`);
  }

  // The road's own date is the newest day any of its sources was read, so it never claims fresher
  // reading than it has (or hides a newer read).
  const newest = newestReadDate(road);
  if (newest !== undefined && road.lastVerified !== newest) {
    problems.push(
      `Road "${road.id}" says it was last read ${road.lastVerified}, but its newest source was read ${newest}.`,
    );
  }

  return problems;
}

/** The checks for the shared list of skill items: unique ids, and every item and route cited. */
export function skillItemProblems(items: readonly SkillItem[]): string[] {
  const problems: string[] = [];
  const seen = new Set<string>();
  for (const item of items) {
    if (seen.has(item.id)) problems.push(`The skill item id "${item.id}" is used twice.`);
    seen.add(item.id);
    if (item.citations.length === 0) problems.push(`Skill item "${item.id}" has no citation.`);
    const where = `skill item "${item.id}"`;
    for (const citation of item.citations) problems.push(...citationProblems(citation, where));
    if (item.howToGetIt) problems.push(...citationProblems(item.howToGetIt.citation, where));
  }
  return problems;
}

/** The newest real read date among every citation in the road, or undefined when it has none. */
export function newestReadDate(road: Road): string | undefined {
  const dates = road.steps
    .flatMap((step) => [
      ...step.citations,
      ...step.doneWhen.map((d) => d.citation),
      ...step.costs.flatMap((c) => (c.kind === "official-fee" ? [c.citation] : c.nameSource ? [c.nameSource] : [])),
    ])
    .filter((c): c is EngineCitation => Boolean(c))
    .map((c) => c.lastVerified)
    .filter(isRealDate);
  // ISO dates sort as text.
  return dates.sort().at(-1);
}

/**
 * Turns a catalog cost line, plus the amount the person agreed to for it (if any), into one of the
 * three kinds a screen shows. An official fee is always the official fee: a quote can't replace it.
 * A named line with no agreed amount carries no amount at all, so it can't be summed as $0; screens
 * count it in "N lines not priced yet" instead.
 */
export function costLineAsShown(line: CatalogCostLine, agreedQuoteCents?: number | null): CostLineAsShown {
  if (line.kind === "official-fee") {
    return {
      kind: "official-fee",
      lineId: line.id,
      label: line.label,
      amountCents: line.amountCents,
      citation: line.citation,
    };
  }
  if (agreedQuoteCents !== undefined && agreedQuoteCents !== null) {
    return { kind: "your-quote", lineId: line.id, label: line.label, amountCents: agreedQuoteCents };
  }
  return { kind: "named-not-priced", lineId: line.id, label: line.label };
}

function costProblems(cost: CatalogCostLine): string[] {
  const problems: string[] = [];
  if (cost.kind === "official-fee") {
    if (!Number.isInteger(cost.amountCents) || cost.amountCents < 0) {
      problems.push(
        `Official fee "${cost.id}" is not a whole, non-negative number of cents: ${cost.amountCents}.`,
      );
    }
    if (!cost.citation) problems.push(`Official fee "${cost.id}" has no citation.`);
    else problems.push(...citationProblems(cost.citation, `official fee "${cost.id}"`));
  } else if (cost.nameSource) {
    problems.push(...citationProblems(cost.nameSource, `cost line "${cost.id}"`));
  }
  return problems;
}

function citationProblems(citation: EngineCitation, where: string): string[] {
  const problems: string[] = [];
  if (!/^https:\/\//.test(citation.url)) {
    problems.push(`A citation on ${where} is not an https page: ${citation.url}`);
  }
  if (!isRealDate(citation.lastVerified)) {
    problems.push(`A citation on ${where} has no real read date: "${citation.lastVerified}".`);
  }
  return problems;
}

/** YYYY-MM-DD and a day that exists on the calendar (no 2026-02-30). */
function isRealDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
