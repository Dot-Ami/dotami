import type { Prisma, PrismaClient } from "@prisma/client";

import { generalRoadV2026 } from "@/lib/engines/roads/v2026";
import { requireVenture } from "@/lib/figures/store";
import { placeCodeFor, type PlaceCode } from "@/lib/places/codes";

import { FutureInputError, isRecord, roadForFuture, SHIPPED_ROADS_CATALOG, type RoadsCatalog } from "./types";

/**
 * What a saved future (a `Venture` row) keeps for the cockpit (docs/architecture/future-cockpit.md § 7,
 * Storage as built): the road it is drawn on, the ending the person picked at each fork of that road,
 * and the person's own month and year. All optional; an idea saved before roads existed reads as
 * today's general road with nothing picked.
 *
 * Road 0's two forks (GST timing, Incorporation timing) are NOT kept here: they are picked on the map
 * and stay in `ScenarioState.activeBranches`, which the map's save rewrites whole. That is also why
 * every other road's endings are kept on the future itself: in that column they would be wiped by the
 * next save of the map.
 */

export interface FutureView {
  ventureId: string;
  /** The road it is drawn on: its own, or today's general road when it names none. */
  roadId: string;
  /** True when the person chose that road; false when it is the general road by default. */
  roadChosen: boolean;
  /** Where the future is, as an international code ("CA-AB"); null if the stored value isn't a place DotAmi knows. */
  place: PlaceCode | null;
  /** The ending picked at each fork of this road, `{ fork id: step id }`. */
  forkPicks: Record<string, string>;
  /** The person's own month and year, "2029-05", or null. */
  targetMonth: string | null;
}

/** The stored picks read back as `{ fork id: step id }`; anything else in the column is dropped, never guessed at. */
function readPicks(value: Prisma.JsonValue): Record<string, string> {
  if (!isRecord(value)) return {};
  return Object.fromEntries(Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === "string"));
}

/** Reads what the cockpit keeps on one future. */
export async function readFuture(prisma: PrismaClient, ventureId: string, catalog: RoadsCatalog = SHIPPED_ROADS_CATALOG): Promise<FutureView> {
  await requireVenture(prisma, ventureId);
  const row = await prisma.venture.findUniqueOrThrow({
    where: { id: ventureId },
    select: { province: true, roadId: true, forkPicks: true, targetMonth: true },
  });
  const road = roadForFuture(catalog, row.roadId);
  const stored = readPicks(row.forkPicks);
  // Only this road's picks, and only a pick that is still a side of its fork. A pick made on another road
  // stays kept, so going back to that road brings it back.
  const forkPicks = Object.fromEntries(
    road.forks.filter((fork) => fork.sides.includes(stored[fork.id])).map((fork) => [fork.id, stored[fork.id]]),
  );
  return {
    ventureId,
    roadId: road.id,
    roadChosen: row.roadId !== null && row.roadId === road.id,
    place: placeCodeFor(row.province),
    forkPicks,
    targetMonth: row.targetMonth,
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
  await prisma.venture.update({ where: { id: ventureId }, data: { roadId } });
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
    else picks[forkId] = stepId;
    await tx.venture.update({ where: { id: ventureId }, data: { forkPicks: picks } });
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
  await prisma.venture.update({ where: { id: ventureId }, data: { targetMonth: month } });
}
