import { amountAsWritten, quotesAmount } from "../../shared/amounts";
import { citationCheckProblems, howChecked, newestRead } from "../../shared/citation-check";
import type { EngineCitation } from "../../shared/types";
import type { CatalogCostLine, CostLineAsShown, Road, SkillItem } from "./types";

/**
 * The checks every road must pass before it ships (tests/roads.spec.ts runs them on every road in
 * the catalog). Each problem comes back as one plain sentence naming the id, so a contributor can
 * find it; an empty list means the road is fine. Pure apart from the clock (read only when no `now`
 * is passed, to tell whether a read date has come yet): no I/O, nothing about any screen.
 *
 * Content still to be written (a step's done-when lines, cost lines, skills) may be empty; what is
 * written must be cited. That is how road 0 ships before its done-when lines are read and written.
 */
export function roadProblems(road: Road, skillItems: readonly SkillItem[], now: Date = new Date()): string[] {
  const problems: string[] = [];
  const today = newestTodayOnEarth(now);
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
    for (const citation of step.citations) problems.push(...citationProblems(citation, `step "${step.id}"`, today));

    // A link the person opens themselves is held to the same rule as a citation: an https page, so a
    // contributor's file can't slip in a "javascript:" or plain-http address.
    for (const link of step.officialLinks) {
      if (!isHttpsPage(link.url)) {
        problems.push(`An official link on step "${step.id}" is not an https page: ${link.url}`);
      }
    }

    for (const target of step.next) {
      if (!stepIds.has(target)) {
        problems.push(`Step "${step.id}" leads to a step the road doesn't have: "${target}".`);
      }
    }

    for (const line of step.doneWhen) {
      // The type says every line has a citation; contributor files arrive as data, so check anyway.
      if (!line.citation) problems.push(`Done-when line "${line.id}" has no citation.`);
      else problems.push(...citationProblems(line.citation, `done-when line "${line.id}"`, today));
    }

    for (const need of step.needs) {
      if (!skillIds.has(need)) {
        problems.push(`Step "${step.id}" needs a skill item that isn't listed: "${need}".`);
      }
    }

    for (const cost of step.costs) problems.push(...costProblems(cost, today));
  }

  for (const fork of road.forks) {
    for (const side of fork.sides) {
      if (!stepIds.has(side)) problems.push(`Fork "${fork.id}" has a side the road doesn't have: "${side}".`);
    }
    if (fork.sides[0] === fork.sides[1]) problems.push(`Fork "${fork.id}" names the same step on both sides.`);
  }

  // The road's own date is the newest day any of its sources was read, so it never claims fresher
  // reading than it has (or hides a newer read). A road whose sources were only checked by a tool has
  // no read at all, so it carries no date: any date there would be a read nobody did.
  const newest = newestReadDate(road);
  if (newest !== undefined && road.lastVerified !== newest) {
    problems.push(
      `Road "${road.id}" says it was last read ${road.lastVerified}, but its newest source was read ${newest}.`,
    );
  }
  if (newest === undefined && road.lastVerified !== "") {
    problems.push(`Road "${road.id}" says it was last read ${road.lastVerified}, but none of its sources has been read.`);
  }

  return problems;
}

/**
 * The checks on where roads carry on after their last column: the road a join names is in the list,
 * it has the column named, and it isn't the road itself. Run over the whole catalog, since one road
 * can't see the others.
 */
export function roadJoinProblems(roads: readonly Road[]): string[] {
  const problems: string[] = [];
  for (const road of roads) {
    if (!road.joins) continue;
    const { roadId, columnId } = road.joins;
    if (roadId === road.id) {
      problems.push(`Road "${road.id}" joins itself.`);
      continue;
    }
    const target = roads.find((r) => r.id === roadId);
    if (!target) {
      problems.push(`Road "${road.id}" joins a road the catalog doesn't have: "${roadId}".`);
    } else if (!target.columns.some((c) => c.id === columnId)) {
      problems.push(`Road "${road.id}" joins road "${roadId}" at a column it doesn't have: "${columnId}".`);
    }
  }
  return problems;
}

/** The checks for the shared list of skill items: unique ids, and every item and route cited. */
export function skillItemProblems(items: readonly SkillItem[], now: Date = new Date()): string[] {
  const problems: string[] = [];
  const today = newestTodayOnEarth(now);
  const seen = new Set<string>();
  for (const item of items) {
    if (seen.has(item.id)) problems.push(`The skill item id "${item.id}" is used twice.`);
    seen.add(item.id);
    if (item.citations.length === 0) problems.push(`Skill item "${item.id}" has no citation.`);
    const where = `skill item "${item.id}"`;
    for (const citation of item.citations) problems.push(...citationProblems(citation, where, today));
    if (item.howToGetIt) problems.push(...citationProblems(item.howToGetIt.citation, where, today));
  }
  return problems;
}

/**
 * The newest real read date among every citation in the road, or undefined when it has none. A tool
 * check is not a read, so a source only a tool has checked doesn't date the road
 * (docs/engines/citations.md).
 */
export function newestReadDate(road: Road): string | undefined {
  const citations = road.steps
    .flatMap((step) => [
      ...step.citations,
      ...step.doneWhen.map((d) => d.citation),
      ...step.costs.flatMap((c) => (c.kind === "official-fee" ? [c.citation] : c.nameSource ? [c.nameSource] : [])),
    ])
    .filter((c): c is EngineCitation => Boolean(c));
  return newestRead(citations);
}

/**
 * Turns a catalog cost line, plus the amount the person agreed to for it (if any), into one of the
 * three kinds a screen shows. An official fee is always the official fee: a quote can't replace it.
 * A named line with no agreed amount carries no amount at all, so it can't be summed as $0; screens
 * count it in "N lines not priced yet" instead. So does a quote that isn't a whole, non-negative number
 * of cents (NaN, a negative, a fraction): a broken number is shown as a blank, never added up. Zero is
 * a real quote (something the person already owns).
 */
export function costLineAsShown(line: CatalogCostLine, agreedQuoteCents?: number | null): CostLineAsShown {
  if (line.kind === "official-fee") {
    return {
      kind: "official-fee",
      lineId: line.id,
      label: line.label,
      amountCents: line.amountCents,
      citation: line.citation,
      // Only when there is one: a fee that always applies has no condition, not an empty one.
      ...(line.onlyIf !== undefined ? { onlyIf: line.onlyIf } : {}),
    };
  }
  if (
    agreedQuoteCents !== undefined &&
    agreedQuoteCents !== null &&
    Number.isInteger(agreedQuoteCents) &&
    agreedQuoteCents >= 0
  ) {
    return { kind: "your-quote", lineId: line.id, label: line.label, amountCents: agreedQuoteCents };
  }
  return { kind: "named-not-priced", lineId: line.id, label: line.label };
}

function costProblems(cost: CatalogCostLine, today: string): string[] {
  const problems: string[] = [];
  if (cost.kind === "official-fee") {
    if (!Number.isInteger(cost.amountCents) || cost.amountCents < 0) {
      problems.push(
        `Official fee "${cost.id}" is not a whole, non-negative number of cents: ${cost.amountCents}.`,
      );
    }
    // A fee that applies only sometimes must say so in a field a total can read, not just in words a
    // person reads: otherwise a sum of a step's fees would count it for everyone.
    if (cost.onlyIf !== undefined && cost.onlyIf.trim() === "") {
      problems.push(`Official fee "${cost.id}" has a blank onlyIf condition.`);
    } else if (cost.onlyIf === undefined && /\bonly if\b/i.test(cost.label)) {
      problems.push(`Official fee "${cost.id}" says "only if" in its label but has no onlyIf condition.`);
    }
    if (!cost.citation) problems.push(`Official fee "${cost.id}" has no citation.`);
    else {
      problems.push(...citationProblems(cost.citation, `official fee "${cost.id}"`, today));
      // A tool check proves only that its quotes are on the page, so a fee nobody read must quote its
      // own amount, or the typed number is one nobody found there. A $0 fee is exempt: pages say "no
      // cost" or "free", not "$0".
      const how = howChecked(cost.citation);
      if (how.kind === "tool" && cost.amountCents > 0 && !how.quotes.some((q) => quotesAmount(q, cost.amountCents))) {
        const written = amountAsWritten(cost.amountCents);
        problems.push(
          `Official fee "${cost.id}" is checked only by a tool, and none of its quotes has its amount (${written.slice(0, 2).join(" or ")}).`,
        );
      }
    }
  } else if (cost.nameSource) {
    problems.push(...citationProblems(cost.nameSource, `cost line "${cost.id}"`, today));
  }
  return problems;
}

function citationProblems(citation: EngineCitation, where: string, today: string): string[] {
  const problems: string[] = [];
  if (!isHttpsPage(citation.url)) {
    problems.push(`A citation on ${where} is not an https page: ${citation.url}`);
  }
  // How it was checked follows the rules every catalog's citations follow (docs/engines/citations.md):
  // a read (a real day, not after today), a tool check with its quotes, or both. "Today" here is the
  // newest date anywhere on Earth, so a reader east of UTC isn't refused their own today.
  for (const problem of citationCheckProblems(citation, today)) {
    problems.push(`A citation on ${where}: ${problem}.`);
  }
  return problems;
}

function isHttpsPage(url: string): boolean {
  return /^https:\/\//.test(url);
}

/**
 * Today's date in the earliest time zone on Earth (UTC+14), as YYYY-MM-DD. A read date is refused only
 * once it is after this, so a contributor east of UTC is never told their own today hasn't come yet.
 */
export function newestTodayOnEarth(now: Date): string {
  return new Date(now.getTime() + 14 * 60 * 60 * 1000).toISOString().slice(0, 10);
}
