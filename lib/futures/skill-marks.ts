import type { PrismaClient, SkillMark } from "@prisma/client";

import { personUserId } from "@/lib/figures/store";

import { dayOnThisComputer, ensurePersonUserId } from "./person";
import { FutureInputError, isRecord, SHIPPED_ROADS_CATALOG, SKILL_MARKS, type RoadsCatalog, type SkillMarkValue } from "./types";

/**
 * The person's skill marks (docs/architecture/future-cockpit.md § 7, Storage as built): one per skill
 * item on the shared list, or per skill the person added in their own words, kept for the person rather
 * than for one future so a mark carries across every road listing the item. Only the person sets one:
 * there is no code path that guesses a mark from anything else.
 */

/** Longest own skill name kept, after trimming. */
export const OWN_SKILL_LABEL_MAX = 120;

export interface SkillMarkView {
  id: string;
  /** A permanent id from the shared skill list, or null for a skill the person added. */
  skillItemId: string | null;
  /** The person's own name for a skill they added, or null for one from the list. */
  ownLabel: string | null;
  mark: SkillMarkValue;
  /** The day the person last set it, on this computer, YYYY-MM-DD. */
  markedOn: string;
}

const toView = (row: SkillMark): SkillMarkView => ({
  id: row.id,
  skillItemId: row.skillItemId,
  ownLabel: row.ownLabel,
  mark: row.mark as SkillMarkValue,
  markedOn: dayOnThisComputer(row.markedAt),
});

/** Every mark the person has set, in the order they first set them. */
export async function listSkillMarks(prisma: PrismaClient): Promise<SkillMarkView[]> {
  const userId = await personUserId(prisma);
  if (!userId) return [];
  const rows = await prisma.skillMark.findMany({ where: { userId }, orderBy: [{ createdAt: "asc" }, { id: "asc" }] });
  return rows.map(toView);
}

/** Which skill a request names: a list item by id, or the person's own by its (trimmed) label. */
type SkillKey = { skillItemId: string; ownLabel: null } | { skillItemId: null; ownLabel: string };

function readKey(input: Record<string, unknown>, catalog: RoadsCatalog): SkillKey {
  const hasItem = input.skillItemId !== undefined && input.skillItemId !== null;
  const hasOwn = input.ownLabel !== undefined && input.ownLabel !== null;
  if (hasItem === hasOwn) throw new FutureInputError("Say which skill: one from the list, or one of your own, not both.");
  if (hasItem) {
    const id = input.skillItemId;
    // A mark has to point at something: an id the shared list doesn't have is refused, never kept.
    if (typeof id !== "string" || !catalog.skillItems.some((item) => item.id === id)) {
      throw new FutureInputError("That skill isn't on DotAmi's list.");
    }
    return { skillItemId: id, ownLabel: null };
  }
  const label = typeof input.ownLabel === "string" ? input.ownLabel.trim() : "";
  if (label.length === 0 || label.length > OWN_SKILL_LABEL_MAX) {
    throw new FutureInputError(`Name your skill in 1 to ${OWN_SKILL_LABEL_MAX} characters.`);
  }
  return { skillItemId: null, ownLabel: label };
}

/**
 * Sets, changes or removes one mark: `{ skillItemId | ownLabel, mark }`, where `mark` is have, learning
 * or not-yet, or null for "I don't know", which removes the mark (the item then counts as not marked).
 * Returns the mark as kept, or null when there is none now. `input` is unknown on purpose: this is
 * where whatever calls it (a screen's route, later the Lens's proposal once the person ticks it) is
 * checked.
 */
export async function markSkill(
  prisma: PrismaClient,
  input: unknown,
  catalog: RoadsCatalog = SHIPPED_ROADS_CATALOG,
): Promise<SkillMarkView | null> {
  if (!isRecord(input)) throw new FutureInputError("Say which skill and your mark.");
  const key = readKey(input, catalog);
  const mark = input.mark;
  if (mark !== null && (typeof mark !== "string" || !(SKILL_MARKS as readonly string[]).includes(mark))) {
    throw new FutureInputError(`The mark has to be one of: ${SKILL_MARKS.join(", ")}, or none.`);
  }

  if (mark === null) {
    const userId = await personUserId(prisma);
    if (userId) await prisma.skillMark.deleteMany({ where: { userId, ...key } });
    return null;
  }

  const userId = await ensurePersonUserId(prisma);
  return prisma.$transaction(async (tx) => {
    // One mark per skill (the table's unique keys say so too): marking again replaces it.
    const current = await tx.skillMark.findFirst({ where: { userId, ...key }, select: { id: true } });
    const row = current
      ? await tx.skillMark.update({ where: { id: current.id }, data: { mark, markedAt: new Date() } })
      : await tx.skillMark.create({ data: { userId, ...key, mark } });
    return toView(row);
  });
}
