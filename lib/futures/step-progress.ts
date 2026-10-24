import type { Prisma, PrismaClient, StepProgress } from "@prisma/client";

import { toStringList } from "@/lib/db/json-list";
import { roadForPlace } from "@/lib/engines/roads/v2026";
import { requireVenture } from "@/lib/figures/store";

import {
  FutureInputError,
  isRecord,
  roadForFuture,
  SHIPPED_ROADS_CATALOG,
  STEP_STATUSES,
  ticksToSave,
  type RoadsCatalog,
  type StepStatus,
} from "./types";

/**
 * The person's progress on each step of a future's road (docs/architecture/future-cockpit.md § 7,
 * Storage as built): a status (doing, done, not for me, or none), the "done when" lines they ticked,
 * and the status changes with their moments for "Since last time". Kept against the road's and the
 * step's permanent ids, never a position or a title, and never used to rank anything.
 *
 * On road 0 too (2026-10-12, the cockpit screen): the map's active, done and set-aside lists are worked
 * out from its toggles on every load, so they never held a status the person set. The person's own
 * status for a road 0 step is kept here like any other road's, and the map's chip shows it
 * (docs/architecture/future-cockpit.md § 2, Cockpit screen as built). One step's status still lives in
 * one place: this table.
 */

/** How many status changes a step keeps: the newest ones. Plenty for "Since last time". */
export const STEP_CHANGES_KEPT = 100;

export interface StepChange {
  /** The moment of the change, ISO. */
  at: string;
  status: StepStatus | null;
}

export interface StepProgressView {
  roadId: string;
  stepId: string;
  status: StepStatus | null;
  doneWhenIds: string[];
  changes: StepChange[];
  /** ISO moment of the last change of any kind. */
  updatedAt: string;
}

const isStatus = (x: unknown): x is StepStatus => typeof x === "string" && (STEP_STATUSES as readonly string[]).includes(x);

/** The stored list of changes read back; anything malformed (a hand-edited file) is dropped, never guessed at. */
function readChanges(value: Prisma.JsonValue): StepChange[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!isRecord(item) || typeof item.at !== "string") return [];
    const status = item.status === null || isStatus(item.status) ? item.status : undefined;
    return status === undefined ? [] : [{ at: item.at, status }];
  });
}

const toView = (row: StepProgress): StepProgressView => ({
  roadId: row.roadId,
  stepId: row.stepId,
  status: isStatus(row.status) ? row.status : null,
  doneWhenIds: toStringList(row.doneWhenIds),
  changes: readChanges(row.changes),
  updatedAt: row.updatedAt.toISOString(),
});

/**
 * Every step of the future's current road the person has touched, in the order they first touched them.
 * Another road's rows stay in the file, so going back to that road brings them back.
 */
export async function listStepProgress(
  prisma: PrismaClient,
  ventureId: string,
  catalog: RoadsCatalog = SHIPPED_ROADS_CATALOG,
): Promise<StepProgressView[]> {
  await requireVenture(prisma, ventureId);
  const venture = await prisma.venture.findUniqueOrThrow({ where: { id: ventureId }, select: { roadId: true } });
  const roadId = roadForFuture(catalog, venture.roadId).id;
  const rows = await prisma.stepProgress.findMany({ where: { ventureId, roadId }, orderBy: [{ createdAt: "asc" }, { id: "asc" }] });
  return rows.map(toView);
}

/**
 * Changes one step's progress: `{ roadId, stepId, status?, doneWhenIds? }`. A field left out is left as
 * it is; `status: null` takes the status back. `doneWhenIds` is the step's ticks on the lines drawn for the
 * idea's place: a tick on a line its place leaves out (it rests on another province's page) is kept whatever
 * list is sent, so neither a tick nor Take back from another province removes it (second review of #207,
 * `ticksToSave`). Every id is checked against the road catalog: the road
 * has to be the future's own road, the step on it, each ticked line one of that step's "done when"
 * lines, so nothing is kept that points at nothing. Returns the step's progress as kept.
 */
export async function setStepProgress(
  prisma: PrismaClient,
  ventureId: string,
  input: unknown,
  catalog: RoadsCatalog = SHIPPED_ROADS_CATALOG,
): Promise<StepProgressView> {
  await requireVenture(prisma, ventureId);
  if (!isRecord(input) || typeof input.roadId !== "string" || typeof input.stepId !== "string") {
    throw new FutureInputError("Say which road and step.");
  }
  const { roadId, stepId } = input;
  const venture = await prisma.venture.findUniqueOrThrow({ where: { id: ventureId }, select: { roadId: true, province: true } });
  const road = roadForFuture(catalog, venture.roadId);
  if (roadId !== road.id) throw new FutureInputError("That road isn't the one this future is drawn on.");
  const step = road.steps.find((s) => s.id === stepId);
  if (!step) throw new FutureInputError("That step isn't on this road.");
  // The step as this idea's place draws it (`roadForPlace` keeps every step, so it is always found): a tick on a
  // line it leaves out is kept whatever list is sent (`ticksToSave`, second review of #207).
  const drawn = roadForPlace(road, venture.province).steps.find((s) => s.id === stepId)!;

  const statusGiven = input.status !== undefined;
  if (statusGiven && input.status !== null && !isStatus(input.status)) {
    throw new FutureInputError(`The status has to be one of: ${STEP_STATUSES.join(", ")}, or none.`);
  }
  const status = (input.status ?? null) as StepStatus | null;

  let doneWhenIds: string[] | undefined;
  if (input.doneWhenIds !== undefined) {
    const ids = input.doneWhenIds;
    if (!Array.isArray(ids) || ids.some((id) => typeof id !== "string" || !step.doneWhen.some((line) => line.id === id))) {
      throw new FutureInputError("Tick only this step's own “done when” lines.");
    }
    doneWhenIds = [...new Set(ids as string[])];
  }
  if (!statusGiven && doneWhenIds === undefined) throw new FutureInputError("Say what changed on this step.");

  return prisma.$transaction(async (tx) => {
    const where = { ventureId_roadId_stepId: { ventureId, roadId, stepId } };
    const current = await tx.stepProgress.findUnique({ where });
    // Nothing to keep on a step never touched (no status, no ticks): no empty row is written for it.
    if (!current && status === null && (doneWhenIds === undefined || doneWhenIds.length === 0)) {
      return { roadId, stepId, status: null, doneWhenIds: [], changes: [], updatedAt: new Date().toISOString() };
    }
    let changes = current ? readChanges(current.changes) : [];
    // Only a change of status is a change for "Since last time"; ticking a line is not.
    const before = current && isStatus(current.status) ? current.status : null;
    if (statusGiven && status !== before) changes = [...changes, { at: new Date().toISOString(), status }].slice(-STEP_CHANGES_KEPT);

    const data = {
      ...(statusGiven ? { status } : {}),
      ...(doneWhenIds !== undefined ? { doneWhenIds: ticksToSave(doneWhenIds, current ? toStringList(current.doneWhenIds) : [], step, drawn) } : {}),
      changes: changes as unknown as Prisma.InputJsonValue,
    };
    const row = current
      ? await tx.stepProgress.update({ where, data })
      : await tx.stepProgress.create({ data: { ventureId, roadId, stepId, ...data } });
    return toView(row);
  });
}
