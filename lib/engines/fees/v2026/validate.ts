import type { CFERoute } from "../../cfe/v2026/types";
import type { Road } from "../../roads/v2026/types";
import { newestTodayOnEarth } from "../../roads/v2026/validate";
import { amountAsWritten, quotesAmount } from "../../shared/amounts";
import { citationCheckProblems, howChecked } from "../../shared/citation-check";
import type { EngineCitation } from "../../shared/types";
import type { OfficialFee } from "./types";

/**
 * The checks the official fees catalog must pass (docs/engines/fees.md; tests/official-fees.spec.ts runs
 * them). Each problem is one plain sentence naming the fee; an empty list means the catalog is fine. Pure
 * apart from the clock (read only when no `now` is passed, to tell whether a date has come yet).
 */
export function officialFeeProblems(fees: readonly OfficialFee[], now: Date = new Date()): string[] {
  const problems: string[] = [];
  const today = newestTodayOnEarth(now);
  const seen = new Set<string>();
  for (const fee of fees) {
    // Ids are forever and a road names a fee by its id, so two fees answering to one id would mix them up.
    if (seen.has(fee.id)) problems.push(`Official fee id "${fee.id}" is used twice.`);
    seen.add(fee.id);
    const name = `Official fee "${fee.id}"`;
    if (fee.label.trim() === "") problems.push(`${name} has no label.`);

    // The place: an international code, the same place as its source, and the start of its id.
    if (!/^CA(-[A-Z]{2})?$/.test(fee.place)) {
      problems.push(`${name} has a place that isn't an international code: "${fee.place}".`);
    } else {
      const sourcePlace = fee.citation.jurisdiction === "CA" ? "CA" : `CA-${fee.citation.jurisdiction}`;
      if (sourcePlace !== fee.place) problems.push(`${name} is for ${fee.place}, but its source is for ${sourcePlace}.`);
      const prefix = `fee-${fee.place === "CA" ? "ca" : fee.place.slice(3).toLowerCase()}-`;
      if (!fee.id.startsWith(prefix)) problems.push(`${name} is for ${fee.place}; its id must start with "${prefix}".`);
    }

    // A fee that applies only sometimes says so in a field a total can read, not only in its words.
    if (fee.onlyIf !== undefined && fee.onlyIf.trim() === "") {
      problems.push(`${name} has a blank onlyIf condition.`);
    } else if (fee.onlyIf === undefined && /\bonly if\b/i.test(fee.label)) {
      problems.push(`${name} says "only if" in its label but has no onlyIf condition.`);
    }

    if (!/^https:\/\//.test(fee.citation.url)) {
      problems.push(`A citation on official fee "${fee.id}" is not an https page: ${fee.citation.url}`);
    }
    for (const problem of citationCheckProblems(fee.citation, today)) {
      problems.push(`A citation on official fee "${fee.id}": ${problem}.`);
    }

    if (!Number.isInteger(fee.amountCents) || fee.amountCents < 0) {
      problems.push(`${name} is not a whole, non-negative number of cents: ${fee.amountCents}.`);
      continue;
    }
    // A tool check proves only that its quotes are on the page, so a fee nobody read must quote its own
    // amount, or the typed number is one nobody found there. A $0 fee is exempt: pages say "no cost".
    const how = howChecked(fee.citation);
    if (how.kind === "tool" && fee.amountCents > 0 && !how.quotes.some((q) => quotesAmount(q, fee.amountCents))) {
      const written = amountAsWritten(fee.amountCents);
      problems.push(`${name} is checked only by a tool, and none of its quotes has its amount (${written.slice(0, 2).join(" or ")}).`);
    }
  }
  return problems;
}

/**
 * The check over the whole catalog that keeps every amount in one place: every official fee line on a
 * road, and on a way to incorporate, names a fee the catalog has and carries exactly that fee's amount,
 * source and condition (on a way to incorporate, its how-often and quotes too). A road file never types an
 * amount; `feeLine` and `routeFeeLine` copy it, and this refuses a line that drifted.
 */
export function feeReferenceProblems(
  fees: readonly OfficialFee[],
  roads: readonly Road[],
  routes: readonly CFERoute[],
): string[] {
  const problems: string[] = [];
  const byId = new Map(fees.map((f) => [f.id, f]));
  for (const road of roads) {
    for (const step of road.steps) {
      for (const line of step.costs) {
        if (line.kind !== "official-fee") continue;
        const where = `Official fee line "${line.id}" on road "${road.id}"`;
        const fee = byId.get(line.feeId);
        if (!fee) {
          problems.push(`${where} names a fee the catalog doesn't have: "${line.feeId}".`);
          continue;
        }
        if (line.amountCents !== fee.amountCents) {
          problems.push(`${where} says ${line.amountCents} cents; fee "${fee.id}" is ${fee.amountCents}.`);
        }
        if (line.onlyIf !== fee.onlyIf) problems.push(`${where} has a different condition from fee "${fee.id}".`);
        if (!sameCitation(line.citation, fee.citation)) problems.push(`${where} has a different source from fee "${fee.id}".`);
      }
    }
  }
  for (const route of routes) {
    for (const line of route.lines) {
      if (line.kind !== "official-fee") continue;
      const where = `Official fee line "${line.id}" on "${route.id}"`;
      const fee = line.feeId === undefined ? undefined : byId.get(line.feeId);
      if (!fee) {
        problems.push(`${where} names a fee the catalog doesn't have: "${line.feeId ?? ""}".`);
        continue;
      }
      // The way-to-incorporate card shows whole dollars.
      if (line.amountCad === undefined || line.amountCad * 100 !== fee.amountCents) {
        problems.push(`${where} says $${line.amountCad}; fee "${fee.id}" is $${fee.amountCents / 100}.`);
      }
      if (line.per !== fee.per) problems.push(`${where} is paid ${line.per ?? "(not said)"}; fee "${fee.id}" is paid ${fee.per ?? "(not said)"}.`);
      if (JSON.stringify(line.quotes) !== JSON.stringify(fee.citation.toolCheck?.quotes ?? [])) {
        problems.push(`${where} shows different quotes from fee "${fee.id}".`);
      }
      if (!sameCitation(line.citation, fee.citation)) problems.push(`${where} has a different source from fee "${fee.id}".`);
    }
  }
  return problems;
}

/** Two citations say the same thing: every field equal, nested ones included, whatever the key order. */
function sameCitation(a: EngineCitation, b: EngineCitation): boolean {
  return canonical(a) === canonical(b);
}

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value !== null && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}
