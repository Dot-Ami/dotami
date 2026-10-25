import { generalRoadV2026, roadsV2026, skillItemsV2026, type Road, type RoadStep, type SkillItem } from "@/lib/engines/roads/v2026";

/**
 * Phase 1 storage for the future cockpit — shared types (docs/architecture/future-cockpit.md § 7,
 * Storage as built). What a person tells the cockpit is kept against the road catalog's permanent ids
 * (road, step, fork, done-when line, cost line, skill item), never a position or a title, so rewriting
 * a screen or moving a step never loses anyone's marks or progress.
 *
 * Every value list here is a list of ids, and ids are forever: add to a list, never rename or reuse.
 */

/** The person's mark on a skill or requirement. "I don't know" is not a mark: it removes one. */
export const SKILL_MARKS = ["have", "learning", "not-yet"] as const;
export type SkillMarkValue = (typeof SKILL_MARKS)[number];

/** A step's status as the person sets it. "next" and "ahead" are worked out from the road, never stored. */
export const STEP_STATUSES = ["doing", "done", "not-for-me"] as const;
export type StepStatus = (typeof STEP_STATUSES)[number];

/** Numbers the person gives about themselves rather than about one future, and what each is per. */
export const PERSON_FIGURE_KINDS = ["income-wanted"] as const;
export type PersonFigureKind = (typeof PERSON_FIGURE_KINDS)[number];
export const PERSON_FIGURE_PER: Record<PersonFigureKind, "year"> = { "income-wanted": "year" };
export const PERSON_FIGURE_KIND_LABELS: Record<PersonFigureKind, string> = {
  "income-wanted": "The yearly income you want, before tax",
};

/**
 * The roads and skill items the storage checks ids against. The shipped catalog by default; a test
 * passes its own (an invented road), since road 0 has no skill items or named cost lines yet.
 */
export interface RoadsCatalog {
  roads: readonly Road[];
  skillItems: readonly SkillItem[];
}

export const SHIPPED_ROADS_CATALOG: RoadsCatalog = { roads: roadsV2026, skillItems: skillItemsV2026 };

/** The road a saved future is drawn on: its own when it names one the catalog has, else today's general road. */
export function roadForFuture(catalog: RoadsCatalog, roadId: string | null): Road {
  return (roadId !== null && catalog.roads.find((road) => road.id === roadId)) || generalRoadV2026;
}

/**
 * The ticks one save of a step keeps (second review of #207, 2026-10-24): the list sent, plus each tick already
 * kept on a line of the step as written that the road drawn for a place leaves out (`roadForPlace`: the line
 * rests on another province's page). No screen for that place draws the line, so a list sent from one never means
 * to untick it; it shows again where the place draws it. A kept id that is no line of the step is dropped, as
 * before. The storage asks with the idea's place as kept; the cockpit with the place on screen, which runs ahead
 * of the file while a change of place is being saved, or after that save failed.
 */
export function ticksToSave(
  sent: readonly string[],
  kept: readonly string[],
  written: Pick<RoadStep, "doneWhen">,
  drawn: Pick<RoadStep, "doneWhen">,
): string[] {
  const shown = new Set(drawn.doneWhen.map((line) => line.id));
  const leftOut = new Set(written.doneWhen.filter((line) => !shown.has(line.id)).map((line) => line.id));
  return [...new Set([...sent, ...kept.filter((id) => leftOut.has(id))])];
}

/** The caller sent something the storage refuses; the message is plain English, and never holds an amount. */
export class FutureInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FutureInputError";
  }
}

export function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null && !Array.isArray(x);
}
