import type { Prisma, PrismaClient, SkillMark } from "@prisma/client";

import { isOasisItemId } from "@/lib/engines/oasis/v2026";
import { personUserId } from "@/lib/figures/store";

import { dayOnThisComputer, ensurePersonUserId } from "./person";
import { FutureInputError, isRecord, SHIPPED_ROADS_CATALOG, SKILL_MARKS, type RoadsCatalog, type SkillMarkValue } from "./types";

/**
 * The person's skill marks (docs/architecture/future-cockpit.md § 7, Storage as built): one per skill
 * item on the shared list, or per skill the person added in their own words, kept for the person rather
 * than for one future so a mark carries across every road listing the item, and across every job whose
 * government list has it (one id per skill, shared by every job). Only the person sets one:
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
    // A mark has to point at something: an id on neither the roads' shared list nor the government's
    // list for a job (lib/engines/oasis/v2026, its own catalog whatever the road) is refused, never kept.
    if (typeof id !== "string" || !(catalog.skillItems.some((item) => item.id === id) || isOasisItemId(id))) {
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
 * The person's own skills are matched whatever their capital letters ("Welding" and "welding" are one
 * skill). SQLite's unique index compares exactly, so the lookup is done here, over the person's own
 * marks, which are few.
 */
async function findMark(tx: PrismaClient | Prisma.TransactionClient, userId: string, key: SkillKey): Promise<{ id: string } | null> {
  if (key.skillItemId !== null) return tx.skillMark.findFirst({ where: { userId, skillItemId: key.skillItemId }, select: { id: true } });
  const wanted = key.ownLabel.toLocaleLowerCase();
  const own = await tx.skillMark.findMany({ where: { userId, skillItemId: null }, select: { id: true, ownLabel: true } });
  return own.find((m) => m.ownLabel?.toLocaleLowerCase() === wanted) ?? null;
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
    const current = userId ? await findMark(prisma, userId, key) : null;
    if (current) await prisma.skillMark.delete({ where: { id: current.id } });
    return null;
  }

  const userId = await ensurePersonUserId(prisma);
  return prisma.$transaction(async (tx) => {
    // One mark per skill (the table's unique keys say so too): marking again replaces it, and an own skill
    // is kept under the spelling typed last.
    const current = await findMark(tx, userId, key);
    const row = current
      ? await tx.skillMark.update({ where: { id: current.id }, data: { mark, markedAt: new Date(), ...(key.ownLabel !== null ? { ownLabel: key.ownLabel } : {}) } })
      : await tx.skillMark.create({ data: { userId, ...key, mark } });
    return toView(row);
  });
}
