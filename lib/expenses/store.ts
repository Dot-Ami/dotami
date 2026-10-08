import type { Expense, PrismaClient } from "@prisma/client";

import { requireVenture } from "@/lib/figures/store";

import type { ExpenseSourceKind, ExpenseStatus, ExpenseView } from "./types";
import {
  validateExpenseEdit,
  validateExpenseInput,
  validateExpenseSource,
  type ExpenseEdit,
} from "./validate";

/**
 * Database side of the expense records store ([8i]). It mirrors lib/figures/store.ts and keeps the
 * same rules (docs/architecture/figures-privacy-review.md): nothing here logs an amount or a word
 * the person typed, and "confirmed" is only ever reached through `agreeToExpenses` —
 * `proposeExpenses` can create nothing but "proposed". Who may call `agreeToExpenses` is the
 * route's job (app/api/expenses/agree/route.ts); this layer does what it is told to an idea that
 * belongs to the person.
 *
 * No function here picks a category, marks anything deductible or totals a deduction: a category
 * is stored only when the person gave it or agreed to one that was proposed.
 */

/** Most records one call may touch — a month of receipts with room to spare, and a cap on a runaway agent. */
export const MAX_EXPENSES_PER_CALL = 500;

/** The caller sent something the store refuses; the message is plain English for the caller. */
export class ExpenseInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ExpenseInputError";
  }
}

// A calendar day is stored as midnight UTC of that day and read back in UTC — the same way a
// figure's period dates are — so the day never shifts with the time zone.
const toDay = (d: Date) => d.toISOString().slice(0, 10);
const atMidnightUtc = (day: string) => new Date(`${day}T00:00:00Z`);

/** Row to view. The amount is BigInt in the database; a view number must be exactly representable. */
export function rowToExpense(row: Expense): ExpenseView {
  const amount = Number(row.amountCents);
  if (!Number.isSafeInteger(amount)) {
    // No amount in the message: it would end up in a log.
    throw new Error("A stored expense is too large to show exactly.");
  }
  return {
    id: row.id,
    ventureId: row.ventureId,
    date: toDay(row.date),
    amountCents: amount,
    currency: row.currency,
    paidTo: row.paidTo,
    whatFor: row.whatFor,
    category: row.category,
    sellerAddress: row.sellerAddress,
    vendorGstNumber: row.vendorGstNumber,
    sourceKind: row.sourceKind as ExpenseSourceKind,
    sourceLabel: row.sourceLabel,
    status: row.status as ExpenseStatus,
    editedByPerson: row.editedByPerson,
    proposedAt: row.proposedAt.toISOString(),
    agreedAt: row.agreedAt ? row.agreedAt.toISOString() : null,
    retractedAt: row.retractedAt ? row.retractedAt.toISOString() : null,
  };
}

const BY_DAY = [{ date: "asc" as const }, { proposedAt: "asc" as const }, { id: "asc" as const }];

/** Every record of the idea except the discarded ones, by purchase day then by when it was proposed. */
export async function listExpenses(prisma: PrismaClient, ventureId: string): Promise<ExpenseView[]> {
  await requireVenture(prisma, ventureId);
  const rows = await prisma.expense.findMany({
    where: { ventureId, status: { not: "discarded" } },
    orderBy: BY_DAY,
  });
  return rows.map(rowToExpense);
}

/**
 * Creates every record as "proposed", all or nothing. `source` and `inputs` are unknown on
 * purpose: this is the trust boundary for the typing screen, importers, the Lens and outside
 * agents, so each one is validated here whatever the caller already did. `today` is the person's
 * own YYYY-MM-DD (the computer's local day): a purchase can't be dated after it.
 */
export async function proposeExpenses(
  prisma: PrismaClient,
  ventureId: string,
  source: unknown,
  inputs: unknown,
  today: string,
): Promise<ExpenseView[]> {
  await requireVenture(prisma, ventureId);

  if (!Array.isArray(inputs) || inputs.length === 0) {
    throw new ExpenseInputError("Send at least one expense.");
  }
  if (inputs.length > MAX_EXPENSES_PER_CALL) {
    throw new ExpenseInputError(`Send at most ${MAX_EXPENSES_PER_CALL} expenses at a time.`);
  }
  const checkedSource = validateExpenseSource(source);
  if (!checkedSource.ok) throw new ExpenseInputError(checkedSource.error);

  const valid = inputs.map((input, i) => {
    const checked = validateExpenseInput(input, today);
    // The record's position, never its content, goes in the message: the words are the person's.
    if (!checked.ok) throw new ExpenseInputError(`Expense ${i + 1}: ${checked.error}`);
    return checked.value;
  });

  const rows = await prisma.$transaction(
    valid.map((v) =>
      prisma.expense.create({
        data: {
          ventureId,
          date: atMidnightUtc(v.date),
          amountCents: BigInt(v.amountCents),
          currency: v.currency,
          paidTo: v.paidTo,
          whatFor: v.whatFor,
          category: v.category,
          sellerAddress: v.sellerAddress,
          vendorGstNumber: v.vendorGstNumber,
          sourceKind: checkedSource.value.kind,
          sourceLabel: checkedSource.value.label,
          // Not left to the column default: proposing never confirms, and this line says so.
          status: "proposed",
        },
      }),
    ),
  );
  return rows.map(rowToExpense);
}

export interface ExpenseChangeResult {
  /** The records this call actually moved to their new status, with their new values. */
  changed: ExpenseView[];
  /** Ids that were not in the status the change needs (already done, someone else's, unknown) — left untouched. */
  skipped: string[];
}

function checkIds(ids: unknown): string[] {
  if (!Array.isArray(ids) || ids.length === 0 || ids.some((id) => typeof id !== "string" || id.length === 0)) {
    throw new ExpenseInputError("Say which expenses you mean.");
  }
  if (ids.length > MAX_EXPENSES_PER_CALL) {
    throw new ExpenseInputError(`Name at most ${MAX_EXPENSES_PER_CALL} expenses at a time.`);
  }
  return [...new Set(ids as string[])];
}

/** Which of the editable fields really differ from the stored record (a value typed over itself is no edit). */
function changedFields(current: Expense, edit: ExpenseEdit): Partial<Expense> {
  const data: Partial<Expense> = {};
  if (edit.date !== undefined && edit.date !== toDay(current.date)) data.date = atMidnightUtc(edit.date);
  if (edit.amountCents !== undefined && BigInt(edit.amountCents) !== current.amountCents) {
    data.amountCents = BigInt(edit.amountCents);
  }
  if (edit.paidTo !== undefined && edit.paidTo !== current.paidTo) data.paidTo = edit.paidTo;
  if (edit.whatFor !== undefined && edit.whatFor !== current.whatFor) data.whatFor = edit.whatFor;
  // null is a real value for the optional three: it clears the field.
  if (edit.category !== undefined && edit.category !== current.category) data.category = edit.category;
  if (edit.sellerAddress !== undefined && edit.sellerAddress !== current.sellerAddress) {
    data.sellerAddress = edit.sellerAddress;
  }
  if (edit.vendorGstNumber !== undefined && edit.vendorGstNumber !== current.vendorGstNumber) {
    data.vendorGstNumber = edit.vendorGstNumber;
  }
  return data;
}

/**
 * Turns proposed records into confirmed ones — the person's click in the agree prompt. `edits`
 * carries what the person typed over the proposed values (the amount, the date, the words, the
 * category); a field that really changed marks the record `editedByPerson`. Anything not currently
 * "proposed" is reported in `skipped` and never modified. `today` is the person's own day, so an
 * edited date can't land in the future either.
 */
export async function agreeToExpenses(
  prisma: PrismaClient,
  ventureId: string,
  ids: unknown,
  edits: unknown,
  today: string,
): Promise<ExpenseChangeResult> {
  await requireVenture(prisma, ventureId);
  const wanted = checkIds(ids);

  const checkedEdits = new Map<string, ExpenseEdit>();
  if (edits !== undefined) {
    if (typeof edits !== "object" || edits === null || Array.isArray(edits)) {
      throw new ExpenseInputError("Edits have to be an object keyed by expense id.");
    }
    for (const [id, edit] of Object.entries(edits)) {
      if (!wanted.includes(id)) throw new ExpenseInputError("An edit names an expense that isn't being agreed to.");
      const checked = validateExpenseEdit(edit, today);
      if (!checked.ok) throw new ExpenseInputError(checked.error);
      checkedEdits.set(id, checked.value);
    }
  }

  const now = new Date();
  return prisma.$transaction(async (tx) => {
    const confirmedIds: string[] = [];
    const skipped: string[] = [];
    for (const id of wanted) {
      const current = await tx.expense.findFirst({ where: { id, ventureId, status: "proposed" } });
      if (!current) {
        skipped.push(id);
        continue;
      }
      const edit = checkedEdits.get(id);
      const changes = edit ? changedFields(current, edit) : {};
      // The status in `where` makes this safe even if another request got in between the read and here.
      const { count } = await tx.expense.updateMany({
        where: { id, ventureId, status: "proposed" },
        data: {
          ...changes,
          status: "confirmed",
          agreedAt: now,
          ...(Object.keys(changes).length > 0 ? { editedByPerson: true } : {}),
        },
      });
      if (count === 1) confirmedIds.push(id);
      else skipped.push(id);
    }
    const rows = await tx.expense.findMany({ where: { id: { in: confirmedIds } }, orderBy: BY_DAY });
    return { changed: rows.map(rowToExpense), skipped };
  });
}

/** Moves records from one status to another, only the ones currently in `from`; the rest are skipped. */
async function moveExpenses(
  prisma: PrismaClient,
  ventureId: string,
  ids: unknown,
  from: ExpenseStatus,
  data: { status: ExpenseStatus; retractedAt?: Date },
): Promise<ExpenseChangeResult> {
  await requireVenture(prisma, ventureId);
  const wanted = checkIds(ids);
  return prisma.$transaction(async (tx) => {
    const moved: string[] = [];
    const skipped: string[] = [];
    for (const id of wanted) {
      const { count } = await tx.expense.updateMany({ where: { id, ventureId, status: from }, data });
      (count === 1 ? moved : skipped).push(id);
    }
    const rows = await tx.expense.findMany({ where: { id: { in: moved } }, orderBy: BY_DAY });
    return { changed: rows.map(rowToExpense), skipped };
  });
}

/** The person turns a proposal down: proposed to discarded (hidden from every list). */
export async function discardExpenses(prisma: PrismaClient, ventureId: string, ids: unknown): Promise<ExpenseChangeResult> {
  return moveExpenses(prisma, ventureId, ids, "proposed", { status: "discarded" });
}

/** The person takes a confirmed record back: confirmed to retracted, with the day it happened. */
export async function retractExpenses(prisma: PrismaClient, ventureId: string, ids: unknown): Promise<ExpenseChangeResult> {
  return moveExpenses(prisma, ventureId, ids, "confirmed", { status: "retracted", retractedAt: new Date() });
}
