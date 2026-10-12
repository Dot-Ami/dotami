import type { PersonFigure, PrismaClient } from "@prisma/client";

import { personUserId } from "@/lib/figures/store";

import { ensurePersonUserId } from "./person";
import { FutureInputError, PERSON_FIGURE_PER, type PersonFigureKind } from "./types";

/**
 * Numbers the person gives about themselves rather than about one future (docs/architecture/future-
 * cockpit.md § 7, Storage as built): today only the yearly income they want, before tax. Agreed like a
 * figure, under the same rules (docs/architecture/figures-privacy-review.md): proposing can only
 * create "proposed", only the person's click in the agree prompt confirms, and no amount is ever put in
 * a message (messages can reach the log). Nothing here judges the number: it is never compared with
 * anything as a pass or a fail.
 *
 * No route calls this yet. When the screen that asks comes, its agree route answers only DotAmi's own
 * window, like the figures' agree route (app/api/figures/agree/route.ts).
 */

export type PersonFigureStatus = "proposed" | "confirmed" | "retracted" | "discarded";

export interface PersonFigureView {
  id: string;
  kind: PersonFigureKind;
  /** Whole cents, never negative. */
  amountCents: number;
  currency: string;
  per: "year";
  sourceKind: "typed";
  sourceLabel: string;
  status: PersonFigureStatus;
  editedByPerson: boolean;
  /** ISO moments. */
  proposedAt: string;
  confirmedAt: string | null;
  retractedAt: string | null;
}

/** Most one call may name: far more than a person has, and a cap on a runaway caller. */
const MAX_PER_CALL = 50;

function toView(row: PersonFigure): PersonFigureView {
  const amount = Number(row.amountCents);
  // No amount in the message: it would end up in a log.
  if (!Number.isSafeInteger(amount)) throw new Error("A stored number is too large to show exactly.");
  return {
    id: row.id,
    kind: row.kind as PersonFigureKind,
    amountCents: amount,
    currency: row.currency,
    per: row.per as "year",
    sourceKind: row.sourceKind as "typed",
    sourceLabel: row.sourceLabel,
    status: row.status as PersonFigureStatus,
    editedByPerson: row.editedByPerson,
    proposedAt: row.proposedAt.toISOString(),
    confirmedAt: row.confirmedAt ? row.confirmedAt.toISOString() : null,
    retractedAt: row.retractedAt ? row.retractedAt.toISOString() : null,
  };
}

const checkAmount = (x: unknown): x is number => typeof x === "number" && Number.isSafeInteger(x) && x >= 0;

/** Every number the person gave, except the ones they turned down, oldest first. */
export async function listPersonFigures(prisma: PrismaClient): Promise<PersonFigureView[]> {
  const userId = await personUserId(prisma);
  if (!userId) return [];
  const rows = await prisma.personFigure.findMany({
    where: { userId, status: { not: "discarded" } },
    orderBy: [{ proposedAt: "asc" }, { id: "asc" }],
  });
  return rows.map(toView);
}

/**
 * The yearly income the person typed, waiting for their agreement: `{ amountCents, currency? }`. Always
 * created as "proposed"; nothing counts on it until `agreeToPersonFigures`. Returned as a list, like
 * proposeFigures, so the agree prompt can take either.
 */
export async function proposeIncomeWanted(prisma: PrismaClient, input: unknown): Promise<PersonFigureView[]> {
  const given = typeof input === "object" && input !== null ? (input as Record<string, unknown>) : {};
  if (!checkAmount(given.amountCents)) throw new FutureInputError("The amount has to be a whole number of cents, zero or more.");
  const currency = given.currency === undefined ? "CAD" : given.currency;
  if (typeof currency !== "string" || !/^[A-Z]{3}$/.test(currency)) {
    throw new FutureInputError("The currency has to be a three-letter code such as CAD.");
  }
  const userId = await ensurePersonUserId(prisma);
  const row = await prisma.personFigure.create({
    data: {
      userId,
      kind: "income-wanted",
      amountCents: BigInt(given.amountCents),
      currency,
      per: PERSON_FIGURE_PER["income-wanted"],
      sourceKind: "typed",
      sourceLabel: "typed by you",
      // Not left to the column default: proposing never confirms, and this line says so.
      status: "proposed",
    },
  });
  return [toView(row)];
}

function checkIds(ids: unknown): string[] {
  if (!Array.isArray(ids) || ids.length === 0 || ids.some((id) => typeof id !== "string" || id.length === 0)) {
    throw new FutureInputError("Say which numbers you mean.");
  }
  if (ids.length > MAX_PER_CALL) throw new FutureInputError(`Name at most ${MAX_PER_CALL} at a time.`);
  return [...new Set(ids as string[])];
}

export interface PersonFigureChangeResult {
  changed: PersonFigureView[];
  /** Ids not in the state the change needs (already done, unknown): left untouched. */
  skipped: string[];
}

/**
 * The person's click in the agree prompt: proposed to confirmed, with any amount they typed over the
 * proposed one (`editedByPerson` when it really changed). There is one current number of each kind, so
 * the one agreed before is taken back (retracted, with the day) in the same step; it stays in the
 * history, as a retracted figure does.
 */
export async function agreeToPersonFigures(
  prisma: PrismaClient,
  ids: unknown,
  edits: Record<string, { amountCents: number }> = {},
): Promise<PersonFigureChangeResult> {
  const wanted = checkIds(ids);
  for (const [id, edit] of Object.entries(edits)) {
    if (!wanted.includes(id)) throw new FutureInputError("An edit names a number that isn't being agreed to.");
    if (!edit || !checkAmount(edit.amountCents)) throw new FutureInputError("An edited amount has to be a whole number of cents, zero or more.");
  }
  const userId = await personUserId(prisma);
  if (!userId) return { changed: [], skipped: wanted };

  const now = new Date();
  return prisma.$transaction(async (tx) => {
    const confirmed: string[] = [];
    const skipped: string[] = [];
    for (const id of wanted) {
      const current = await tx.personFigure.findFirst({ where: { id, userId, status: "proposed" } });
      if (!current) {
        skipped.push(id);
        continue;
      }
      const edit = Object.hasOwn(edits, id) ? edits[id] : undefined;
      const changed = edit !== undefined && BigInt(edit.amountCents) !== current.amountCents;
      // The older agreed number of the same kind is taken back first, so there is never more than one.
      await tx.personFigure.updateMany({
        where: { userId, kind: current.kind, status: "confirmed" },
        data: { status: "retracted", retractedAt: now },
      });
      const { count } = await tx.personFigure.updateMany({
        where: { id, userId, status: "proposed" },
        data: { status: "confirmed", confirmedAt: now, ...(changed ? { amountCents: BigInt(edit.amountCents), editedByPerson: true } : {}) },
      });
      (count === 1 ? confirmed : skipped).push(id);
    }
    const rows = await tx.personFigure.findMany({ where: { id: { in: confirmed } }, orderBy: [{ proposedAt: "asc" }, { id: "asc" }] });
    return { changed: rows.map(toView), skipped };
  });
}

async function move(
  prisma: PrismaClient,
  ids: unknown,
  from: PersonFigureStatus,
  data: { status: PersonFigureStatus; retractedAt?: Date },
): Promise<PersonFigureChangeResult> {
  const wanted = checkIds(ids);
  const userId = await personUserId(prisma);
  if (!userId) return { changed: [], skipped: wanted };
  return prisma.$transaction(async (tx) => {
    const moved: string[] = [];
    const skipped: string[] = [];
    for (const id of wanted) {
      const { count } = await tx.personFigure.updateMany({ where: { id, userId, status: from }, data });
      (count === 1 ? moved : skipped).push(id);
    }
    const rows = await tx.personFigure.findMany({ where: { id: { in: moved } }, orderBy: [{ proposedAt: "asc" }, { id: "asc" }] });
    return { changed: rows.map(toView), skipped };
  });
}

/** The person turns a proposal down: proposed to discarded, hidden from every list. */
export async function discardPersonFigures(prisma: PrismaClient, ids: unknown): Promise<PersonFigureChangeResult> {
  return move(prisma, ids, "proposed", { status: "discarded" });
}

/** The person takes an agreed number back: confirmed to retracted, with the day. */
export async function retractPersonFigures(prisma: PrismaClient, ids: unknown): Promise<PersonFigureChangeResult> {
  return move(prisma, ids, "confirmed", { status: "retracted", retractedAt: new Date() });
}

/** The yearly income the person agreed to, or null when there is none. */
export async function currentIncomeWanted(prisma: PrismaClient): Promise<PersonFigureView | null> {
  const userId = await personUserId(prisma);
  if (!userId) return null;
  const row = await prisma.personFigure.findFirst({
    where: { userId, kind: "income-wanted", status: "confirmed" },
    orderBy: [{ confirmedAt: "desc" }, { id: "desc" }],
  });
  return row ? toView(row) : null;
}
