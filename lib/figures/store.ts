import type { Figure, PrismaClient } from "@prisma/client";

import type { FigureKind, FigureSourceKind, FigureStatus, FigureView } from "./types";
import { validateFigureInput, validateFigureSource } from "./validate";

const STUB_EMAIL = process.env.STUB_USER_EMAIL ?? "stub@dotami.local";

/**
 * Database side of the figures store ([8a]). Rules it keeps (docs/architecture/figures-privacy-review.md):
 * nothing here logs an amount, and "confirmed" is only ever reached through `agreeToFigures` —
 * `proposeFigures` can create nothing but "proposed". Who is allowed to call `agreeToFigures`
 * is the route's job (app/api/figures/agree/route.ts); this layer just does what it is told
 * to a venture that belongs to the person.
 */

/** Most figures one call may touch — a year of months with room to spare, and a cap on a runaway agent. */
export const MAX_FIGURES_PER_CALL = 500;

/** The venture doesn't exist, or isn't the (stub) user's. The routes answer this with a 404. */
export class VentureNotFoundError extends Error {
  constructor() {
    super("That idea isn't in DotAmi.");
    this.name = "VentureNotFoundError";
  }
}

/** The caller sent something the store refuses; the message is plain English for the caller. */
export class FigureInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FigureInputError";
  }
}

/** Throws unless the venture belongs to the stub user — same ownership rule as lib/db/ventures.ts. */
export async function requireVenture(prisma: PrismaClient, ventureId: string): Promise<void> {
  if (typeof ventureId !== "string" || ventureId.length === 0) throw new VentureNotFoundError();
  const user = await prisma.user.findUnique({ where: { email: STUB_EMAIL } });
  if (!user) throw new VentureNotFoundError();
  const venture = await prisma.venture.findFirst({ where: { id: ventureId, userId: user.id }, select: { id: true } });
  if (!venture) throw new VentureNotFoundError();
}

const toDay = (d: Date) => d.toISOString().slice(0, 10);
const atMidnightUtc = (day: string) => new Date(`${day}T00:00:00Z`);

/** Row to view. The amount is BigInt in the database; a view number must be exactly representable. */
export function rowToFigure(row: Figure): FigureView {
  const amount = Number(row.amountCents);
  if (!Number.isSafeInteger(amount)) {
    // No amount in the message: it would end up in a log.
    throw new Error("A stored figure is too large to show exactly.");
  }
  return {
    id: row.id,
    ventureId: row.ventureId,
    kind: row.kind as FigureKind,
    periodStart: toDay(row.periodStart),
    periodEnd: toDay(row.periodEnd),
    amountCents: amount,
    currency: row.currency,
    sourceKind: row.sourceKind as FigureSourceKind,
    sourceLabel: row.sourceLabel,
    sourceRows: row.sourceRows,
    taxYear: row.taxYear,
    formLine: row.formLine,
    status: row.status as FigureStatus,
    editedByPerson: row.editedByPerson,
    proposedAt: row.proposedAt.toISOString(),
    confirmedAt: row.confirmedAt ? row.confirmedAt.toISOString() : null,
    retractedAt: row.retractedAt ? row.retractedAt.toISOString() : null,
  };
}

/** Every figure of the venture except the discarded ones, by period then by when it was proposed. */
export async function listFigures(prisma: PrismaClient, ventureId: string): Promise<FigureView[]> {
  await requireVenture(prisma, ventureId);
  const rows = await prisma.figure.findMany({
    where: { ventureId, status: { not: "discarded" } },
    orderBy: [{ periodStart: "asc" }, { proposedAt: "asc" }],
  });
  return rows.map(rowToFigure);
}

/**
 * Creates every figure as "proposed", all or nothing. `source` and `inputs` are unknown on
 * purpose: this is the trust boundary for importers, the Lens and outside agents, so each one
 * is validated here whatever the caller already did. `today` is YYYY-MM-DD.
 */
export async function proposeFigures(
  prisma: PrismaClient,
  ventureId: string,
  source: unknown,
  inputs: unknown,
  today: string,
): Promise<FigureView[]> {
  await requireVenture(prisma, ventureId);

  if (!Array.isArray(inputs) || inputs.length === 0) {
    throw new FigureInputError("Send at least one figure.");
  }
  if (inputs.length > MAX_FIGURES_PER_CALL) {
    throw new FigureInputError(`Send at most ${MAX_FIGURES_PER_CALL} figures at a time.`);
  }
  const checkedSource = validateFigureSource(source);
  if (!checkedSource.ok) throw new FigureInputError(checkedSource.error);

  const valid = inputs.map((input, i) => {
    const checked = validateFigureInput(input, today);
    if (!checked.ok) throw new FigureInputError(`Figure ${i + 1}: ${checked.error}`);
    // [8f] The screens say a form line was "printed on your return", so only a figure read from a
    // return may carry one. A typed, file or agent total keeps its tax year and no form line.
    if (checked.value.formLine !== undefined && checkedSource.value.kind !== "tax-return") {
      throw new FigureInputError(`Figure ${i + 1}: Only a figure read from a tax return can carry the form line printed on it.`);
    }
    return checked.value;
  });

  const rows = await prisma.$transaction(
    valid.map((v) =>
      prisma.figure.create({
        data: {
          ventureId,
          kind: v.kind,
          periodStart: atMidnightUtc(v.periodStart),
          periodEnd: atMidnightUtc(v.periodEnd),
          amountCents: BigInt(v.amountCents),
          currency: v.currency,
          sourceKind: checkedSource.value.kind,
          sourceLabel: checkedSource.value.label,
          // A figure's own row count (one month of a file) wins over the batch's.
          sourceRows: v.rows ?? checkedSource.value.rows,
          // [8f] Only a T2125 total has these; validateFigureInput refuses them on any other kind.
          taxYear: v.taxYear ?? null,
          formLine: v.formLine ?? null,
          // Not left to the column default: proposing never confirms, and this line says so.
          status: "proposed",
        },
      }),
    ),
  );
  return rows.map(rowToFigure);
}

export interface FigureChangeResult {
  /** The figures this call actually moved to their new status, with their new values. */
  changed: FigureView[];
  /** Ids that were not in the status the change needs (already done, someone else's, unknown) — left untouched. */
  skipped: string[];
}

function checkIds(ids: unknown): string[] {
  if (!Array.isArray(ids) || ids.length === 0 || ids.some((id) => typeof id !== "string" || id.length === 0)) {
    throw new FigureInputError("Say which figures you mean.");
  }
  if (ids.length > MAX_FIGURES_PER_CALL) {
    throw new FigureInputError(`Name at most ${MAX_FIGURES_PER_CALL} figures at a time.`);
  }
  return [...new Set(ids as string[])];
}

/**
 * Turns proposed figures into confirmed ones — the person's click in the agree prompt ([8b]).
 * `edits` carries amounts the person typed over the proposed ones; an amount that really
 * changed marks the figure `editedByPerson`. Anything not currently "proposed" is reported in
 * `skipped` and never modified.
 */
export async function agreeToFigures(
  prisma: PrismaClient,
  ventureId: string,
  ids: unknown,
  edits: Record<string, { amountCents: number }> = {},
): Promise<FigureChangeResult> {
  await requireVenture(prisma, ventureId);
  const wanted = checkIds(ids);

  for (const [id, edit] of Object.entries(edits)) {
    if (!wanted.includes(id)) throw new FigureInputError("An edit names a figure that isn't being agreed to.");
    if (!edit || typeof edit.amountCents !== "number" || !Number.isSafeInteger(edit.amountCents)) {
      throw new FigureInputError("An edited amount has to be a whole number of cents.");
    }
  }

  const now = new Date();
  return prisma.$transaction(async (tx) => {
    const confirmedIds: string[] = [];
    const skipped: string[] = [];
    for (const id of wanted) {
      const current = await tx.figure.findFirst({ where: { id, ventureId, status: "proposed" } });
      if (!current) {
        skipped.push(id);
        continue;
      }
      const edit = Object.hasOwn(edits, id) ? edits[id] : undefined;
      const changed = edit !== undefined && BigInt(edit.amountCents) !== current.amountCents;
      // The status in `where` makes this safe even if another request got in between the read and here.
      const { count } = await tx.figure.updateMany({
        where: { id, ventureId, status: "proposed" },
        data: {
          status: "confirmed",
          confirmedAt: now,
          ...(changed ? { amountCents: BigInt(edit.amountCents), editedByPerson: true } : {}),
        },
      });
      if (count === 1) confirmedIds.push(id);
      else skipped.push(id);
    }
    const rows = await tx.figure.findMany({
      where: { id: { in: confirmedIds } },
      orderBy: [{ periodStart: "asc" }, { proposedAt: "asc" }],
    });
    return { changed: rows.map(rowToFigure), skipped };
  });
}

/** Moves figures from one status to another, only the ones currently in `from`; the rest are skipped. */
async function moveFigures(
  prisma: PrismaClient,
  ventureId: string,
  ids: unknown,
  from: FigureStatus,
  data: { status: FigureStatus; retractedAt?: Date },
): Promise<FigureChangeResult> {
  await requireVenture(prisma, ventureId);
  const wanted = checkIds(ids);
  return prisma.$transaction(async (tx) => {
    const moved: string[] = [];
    const skipped: string[] = [];
    for (const id of wanted) {
      const { count } = await tx.figure.updateMany({ where: { id, ventureId, status: from }, data });
      (count === 1 ? moved : skipped).push(id);
    }
    const rows = await tx.figure.findMany({
      where: { id: { in: moved } },
      orderBy: [{ periodStart: "asc" }, { proposedAt: "asc" }],
    });
    return { changed: rows.map(rowToFigure), skipped };
  });
}

/** The person turns a proposal down: proposed to discarded (hidden from every list). */
export async function discardFigures(prisma: PrismaClient, ventureId: string, ids: unknown): Promise<FigureChangeResult> {
  return moveFigures(prisma, ventureId, ids, "proposed", { status: "discarded" });
}

/** The person takes a confirmed figure back: confirmed to retracted, with the day it happened. */
export async function retractFigures(prisma: PrismaClient, ventureId: string, ids: unknown): Promise<FigureChangeResult> {
  return moveFigures(prisma, ventureId, ids, "confirmed", { status: "retracted", retractedAt: new Date() });
}
