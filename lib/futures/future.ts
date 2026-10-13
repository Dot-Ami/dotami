import type { Prisma, PrismaClient } from "@prisma/client";

import { generalRoadV2026, type Road } from "@/lib/engines/roads/v2026";
import { LOOKING_FOR, type LookingFor } from "@/lib/front-door/questions";
import { requireVenture } from "@/lib/figures/store";
import { placeCodeFor, type PlaceCode } from "@/lib/places/codes";

import { dayOnThisComputer } from "./person";
import { FutureInputError, isRecord, roadForFuture, SHIPPED_ROADS_CATALOG, type RoadsCatalog } from "./types";

/**
 * What a saved future (a `Venture` row) keeps for the cockpit (docs/architecture/future-cockpit.md § 7,
 * Storage as built): the road it is drawn on, the ending the person picked at each fork of that road,
 * and the person's own month and year, each with the moment it was set. All optional; an idea saved
 * before roads existed reads as today's general road with the map's own picks.
 *
 * Road 0's two forks (GST timing, Incorporation timing) are NOT kept here: they are picked on the map
 * and stay in `ScenarioState.activeBranches`, which the map's save rewrites whole. That is also why
 * every other road's endings are kept on the future itself: in that column they would be wiped by the
 * next save of the map. Reading a future still gives one set of picks whatever its road.
 */

/** One fork's ending as reading a future gives it. */
export interface ForkPick {
  stepId: string;
  /** The day the person picked it, on this computer; null for a pick read from the map, which keeps no day. */
  pickedOn: string | null;
  /**
   * "you": picked by the person and kept on the future. "map": road 0's toggle as the map holds it, which
   * may still be the map's default rather than a choice the person made (the map doesn't save which).
   */
  from: "you" | "map";
}

export interface FutureView {
  ventureId: string;
  /** The road it is drawn on: its own, or today's general road when it names none. */
  roadId: string;
  /** True when the person chose that road; false when it is the general road by default. */
  roadChosen: boolean;
  /** The day the person chose the road, on this computer; null on the general road. */
  roadChosenOn: string | null;
  /** Where the future is, as an international code ("CA-AB"); null if the stored value isn't a place DotAmi knows. */
  place: PlaceCode | null;
  /** The ending picked at each fork of this road, by fork id. On road 0, the map's picks. */
  forkPicks: Record<string, ForkPick>;
  /** The person's own month and year, "2029-05", or null. */
  targetMonth: string | null;
  /** The day the person set that month, on this computer, or null. */
  targetMonthSetOn: string | null;
  /**
   * The answer to "a business, a job or career, or both?" kept when the future was picked on *Pick a
   * future* (2026-10-12); null for an idea saved any other way.
   */
  lookingFor: LookingFor | null;
  /** The day that answer was kept, on this computer, or null. */
  lookingForOn: string | null;
}

/** A pick as stored on the future: the step and the moment it was picked. */
interface StoredPick {
  stepId: string;
  pickedAt: string;
}

/** The stored picks read back by fork id; anything else in the column (a hand-edited file) is dropped, never guessed at. */
function readPicks(value: Prisma.JsonValue): Record<string, StoredPick> {
  if (!isRecord(value)) return {};
  return Object.fromEntries(
    Object.entries(value).flatMap(([forkId, pick]) =>
      isRecord(pick) && typeof pick.stepId === "string" && typeof pick.pickedAt === "string"
        ? [[forkId, { stepId: pick.stepId, pickedAt: pick.pickedAt }]]
        : [],
    ),
  );
}

/** A stored moment as the day it fell on here, or null when there is none or it isn't a moment. */
function dayOf(moment: Date | string | null): string | null {
  if (moment === null) return null;
  const date = moment instanceof Date ? moment : new Date(moment);
  return Number.isNaN(date.getTime()) ? null : dayOnThisComputer(date);
}

/** Only a pick that is still a side of its fork on this road: a fork rewritten later never shows a stale step. */
const sideOfFork = (road: Road, forkId: string, stepId: unknown): stepId is string =>
  typeof stepId === "string" && road.forks.some((fork) => fork.id === forkId && fork.sides.includes(stepId));

/** Reads what the cockpit keeps on one future. */
export async function readFuture(prisma: PrismaClient, ventureId: string, catalog: RoadsCatalog = SHIPPED_ROADS_CATALOG): Promise<FutureView> {
  await requireVenture(prisma, ventureId);
  const row = await prisma.venture.findUniqueOrThrow({
    where: { id: ventureId },
    select: {
      province: true,
      roadId: true,
      roadChosenAt: true,
      forkPicks: true,
      targetMonth: true,
      targetMonthSetAt: true,
      lookingFor: true,
      lookingForSetAt: true,
      scenarioState: { select: { activeBranches: true } },
    },
  });
  const road = roadForFuture(catalog, row.roadId);

  let forkPicks: Record<string, ForkPick>;
  if (road.id === generalRoadV2026.id) {
    // Road 0: the map's own toggles, from where the map keeps them, so the cockpit reads one set of picks.
    const branches = isRecord(row.scenarioState?.activeBranches) ? row.scenarioState.activeBranches : {};
    forkPicks = Object.fromEntries(
      road.forks.flatMap((fork) => {
        const stepId = branches[fork.id];
        return sideOfFork(road, fork.id, stepId) ? [[fork.id, { stepId, pickedOn: null, from: "map" as const }]] : [];
      }),
    );
  } else {
    // Only this road's picks. A pick made on another road stays kept, so going back to that road brings it back.
    const stored = readPicks(row.forkPicks);
    forkPicks = Object.fromEntries(
      road.forks.flatMap((fork) => {
        const pick = stored[fork.id];
        return pick && sideOfFork(road, fork.id, pick.stepId)
          ? [[fork.id, { stepId: pick.stepId, pickedOn: dayOf(pick.pickedAt), from: "you" as const }]]
          : [];
      }),
    );
  }

  const roadChosen = row.roadId !== null && row.roadId === road.id;
  // Only an answer the question offers; a hand-edited file's other text reads as none, never guessed.
  const lookingFor = (LOOKING_FOR as readonly (string | null)[]).includes(row.lookingFor) ? (row.lookingFor as LookingFor) : null;
  return {
    ventureId,
    roadId: road.id,
    roadChosen,
    roadChosenOn: roadChosen ? dayOf(row.roadChosenAt) : null,
    place: placeCodeFor(row.province),
    forkPicks,
    targetMonth: row.targetMonth,
    targetMonthSetOn: row.targetMonth === null ? null : dayOf(row.targetMonthSetAt),
    lookingFor,
    lookingForOn: lookingFor === null ? null : dayOf(row.lookingForSetAt),
  };
}

/** Draws the future on a road from the catalog, or (null) back on today's general road. */
export async function chooseRoad(
  prisma: PrismaClient,
  ventureId: string,
  roadId: unknown,
  catalog: RoadsCatalog = SHIPPED_ROADS_CATALOG,
): Promise<void> {
  await requireVenture(prisma, ventureId);
  if (roadId !== null && (typeof roadId !== "string" || !catalog.roads.some((road) => road.id === roadId))) {
    throw new FutureInputError("That road isn't one DotAmi has written.");
  }
  // The moment goes with the answer: none for the general road, which nobody chose, and the first moment
  // kept when the same road is chosen again, since the answer didn't change.
  const current = await prisma.venture.findUniqueOrThrow({ where: { id: ventureId }, select: { roadId: true } });
  if (current.roadId === roadId) return;
  await prisma.venture.update({ where: { id: ventureId }, data: { roadId, roadChosenAt: roadId === null ? null : new Date() } });
}

/**
 * Keeps the ending picked at one fork of the future's road, `{ forkId, stepId }`, or takes it back
 * (`stepId: null`). The step has to be one of that fork's two sides. Road 0's forks are refused: they
 * are picked on the map, and one pick kept in two places could say two different things.
 */
export async function pickEnding(
  prisma: PrismaClient,
  ventureId: string,
  input: unknown,
  catalog: RoadsCatalog = SHIPPED_ROADS_CATALOG,
): Promise<void> {
  await requireVenture(prisma, ventureId);
  if (!isRecord(input) || typeof input.forkId !== "string" || (input.stepId !== null && typeof input.stepId !== "string")) {
    throw new FutureInputError("Say which fork, and which side of it, or none.");
  }
  const { forkId, stepId } = input as { forkId: string; stepId: string | null };
  if (generalRoadV2026.forks.some((fork) => fork.id === forkId)) {
    throw new FutureInputError("This choice is made on the map, with its toggle, and kept with the map.");
  }

  await prisma.$transaction(async (tx) => {
    const row = await tx.venture.findUniqueOrThrow({ where: { id: ventureId }, select: { roadId: true, forkPicks: true } });
    const fork = roadForFuture(catalog, row.roadId).forks.find((f) => f.id === forkId);
    if (!fork) throw new FutureInputError("That fork isn't on this future's road.");
    if (stepId !== null && !fork.sides.includes(stepId)) throw new FutureInputError("That step isn't one of this fork's two sides.");
    const picks = readPicks(row.forkPicks);
    if (stepId === null) delete picks[forkId];
    // Picking the same side again keeps the day it was first picked: the answer didn't change.
    else if (picks[forkId]?.stepId !== stepId) picks[forkId] = { stepId, pickedAt: new Date().toISOString() };
    await tx.venture.update({ where: { id: ventureId }, data: { forkPicks: picks as unknown as Prisma.InputJsonValue } });
  });
}

const MONTH = /^(\d{4})-(0[1-9]|1[0-2])$/;

/**
 * Keeps the person's own month and year ("2029-05"), or clears it (null). The current month is
 * allowed, an earlier one isn't. `today` is the person's own calendar day, YYYY-MM-DD.
 */
export async function setTargetMonth(prisma: PrismaClient, ventureId: string, month: unknown, today: string): Promise<void> {
  await requireVenture(prisma, ventureId);
  if (month !== null) {
    if (typeof month !== "string" || !MONTH.test(month)) throw new FutureInputError("Give a month and year, written like 2029-05.");
    // YYYY-MM compares correctly as text.
    if (month < today.slice(0, 7)) throw new FutureInputError("That month has already gone.");
  }
  // Setting the same month again keeps the moment it was first set.
  const current = await prisma.venture.findUniqueOrThrow({ where: { id: ventureId }, select: { targetMonth: true } });
  if (current.targetMonth === month) return;
  await prisma.venture.update({ where: { id: ventureId }, data: { targetMonth: month, targetMonthSetAt: month === null ? null : new Date() } });
}
