import type { Expense, Prisma, PrismaClient, Receipt } from "@prisma/client";

import { personUserId, requireVenture } from "@/lib/figures/store";

import { isReceiptType } from "./receipts/types";
import type { ExpenseRecordKind, ExpenseSourceKind, ExpenseStatus, ExpenseView } from "./types";
import {
  checkRecordRules,
  validateExpenseEdit,
  validateExpenseInput,
  validateExpenseSource,
  type ExpenseEdit,
} from "./validate";

/**
 * Database side of the expense records store ([8i]). It mirrors lib/figures/store.ts and keeps the
 * same rules (docs/architecture/figures-privacy-review.md): nothing here logs an amount or a word
 * the person typed, and "confirmed" is only ever reached through `agreeToExpenses` —
 * `proposeExpenses` can create nothing but "proposed". Who may call `agreeToExpenses` (and
 * `attachExpenses`) is the route's job (app/api/expenses/agree/route.ts); this layer does what it is
 * told to records that belong to the person.
 *
 * No function here picks a category, sets a business share, marks anything deductible or totals a
 * deduction: a category or share is stored only when the person gave it or agreed to one that was
 * proposed.
 *
 * WHICH RECORDS A CALL MAY TOUCH. Since the maintainer's decisions (2026-10-08) a record may be "not
 * attached yet" to any idea, so most functions take a scope, `ventureId`:
 *   - a string: only that idea's records (the idea must be the person's);
 *   - null: only the records not attached to any idea;
 *   - undefined: any of the person's records — attached to one of their ideas, or not attached.
 * There is no sign-in: "the person's" means attached to an idea of the copy's one user, or not
 * attached at all (an unattached record has no other owner to belong to).
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

/** Which records a call may touch; see the file's header. */
export type ExpenseScope = string | null | undefined;

// A calendar day is stored as midnight UTC of that day and read back in UTC — the same way a
// figure's period dates are — so the day never shifts with the time zone.
const toDay = (d: Date) => d.toISOString().slice(0, 10);
const atMidnightUtc = (day: string) => new Date(`${day}T00:00:00Z`);

/** A BigInt column to a view number, which must be exactly representable. No value in the message: it would end up in a log. */
function exactNumber(value: bigint): number {
  const n = Number(value);
  if (!Number.isSafeInteger(n)) throw new Error("A stored expense is too large to show exactly.");
  return n;
}

/**
 * What every read that returns records asks the database for alongside each row: the description of
 * its receipt file, if it has one (never the file).
 */
export const WITH_RECEIPT = { receipt: true } as const;

/** Row to view. A row read without its receipt (a record just created has none) shows none. */
export function rowToExpense(row: Expense & { receipt?: Receipt | null }): ExpenseView {
  return {
    id: row.id,
    ventureId: row.ventureId,
    date: toDay(row.date),
    amountCents: exactNumber(row.amountCents),
    currency: row.currency,
    paidTo: row.paidTo,
    whatFor: row.whatFor,
    category: row.category,
    sellerAddress: row.sellerAddress,
    vendorGstNumber: row.vendorGstNumber,
    recordKind: row.recordKind as ExpenseRecordKind,
    refundOfId: row.refundOfId,
    gstHstCents: row.gstHstCents === null ? null : exactNumber(row.gstHstCents),
    creditNote: row.creditNote,
    businessSharePercent: row.businessSharePercent,
    sourceKind: row.sourceKind as ExpenseSourceKind,
    sourceLabel: row.sourceLabel,
    status: row.status as ExpenseStatus,
    editedByPerson: row.editedByPerson,
    proposedAt: row.proposedAt.toISOString(),
    agreedAt: row.agreedAt ? row.agreedAt.toISOString() : null,
    retractedAt: row.retractedAt ? row.retractedAt.toISOString() : null,
    receipt: row.receipt && isReceiptType(row.receipt.type)
      ? { type: row.receipt.type, bytes: row.receipt.bytes, addedAt: row.receipt.addedAt.toISOString() }
      : null,
  };
}

const BY_DAY = [{ date: "asc" as const }, { proposedAt: "asc" as const }, { id: "asc" as const }];

/**
 * The database filter for a scope. A named idea is checked first (VentureNotFoundError if it isn't the
 * person's). "Any of the person's" is attached to one of their ideas or not attached at all.
 */
async function scopeWhere(prisma: PrismaClient, ventureId: ExpenseScope): Promise<Prisma.ExpenseWhereInput> {
  if (typeof ventureId === "string") {
    await requireVenture(prisma, ventureId);
    return { ventureId };
  }
  if (ventureId === null) return { ventureId: null };
  const userId = await personUserId(prisma);
  return userId ? { OR: [{ ventureId: null }, { venture: { userId } }] } : { ventureId: null };
}

/** Every record in the scope except the discarded ones, by purchase day then by when it was proposed. */
export async function listExpenses(prisma: PrismaClient, ventureId: ExpenseScope): Promise<ExpenseView[]> {
  const scope = await scopeWhere(prisma, ventureId);
  const rows = await prisma.expense.findMany({
    where: { AND: [scope, { status: { not: "discarded" } }] },
    orderBy: BY_DAY,
    include: WITH_RECEIPT,
  });
  return rows.map(rowToExpense);
}

/**
 * One of the person's records by its id (any of their ideas, or not attached), with its receipt's
 * description, or null when there is no such record of theirs. For the receipts store
 * (lib/expenses/receipts/store.ts), which decides itself what each state allows.
 */
export async function findPersonExpense(prisma: PrismaClient, id: string) {
  const scope = await scopeWhere(prisma, undefined);
  return prisma.expense.findFirst({ where: { AND: [scope, { id }] }, include: WITH_RECEIPT });
}

/**
 * Checks every refund link in a batch against the database: each must name an expense of the
 * person's that hasn't been turned down, kept as a purchase (an "expense" record above zero), so a
 * refund never points at another refund. `position` is the record's place in the batch, for the
 * message; the person's words never go in it.
 */
async function checkRefundLinks(prisma: PrismaClient, links: { position: number; refundOfId: string }[]): Promise<void> {
  if (links.length === 0) return;
  const scope = await scopeWhere(prisma, undefined);
  const ids = [...new Set(links.map((l) => l.refundOfId))];
  const originals = await prisma.expense.findMany({
    where: { AND: [scope, { id: { in: ids } }, { status: { not: "discarded" } }] },
    select: { id: true, recordKind: true, amountCents: true },
  });
  const byId = new Map(originals.map((o) => [o.id, o]));
  for (const link of links) {
    const original = byId.get(link.refundOfId);
    if (!original) {
      throw new ExpenseInputError(`Expense ${link.position}: the expense this refund points to isn't one of your expense records.`);
    }
    if (original.recordKind !== "expense" || original.amountCents <= 0n) {
      throw new ExpenseInputError(`Expense ${link.position}: a refund has to point to a purchase, not to another refund or credit.`);
    }
  }
}

/**
 * Creates every record as "proposed", all or nothing. `source` and `inputs` are unknown on
 * purpose: this is the trust boundary for the typing screen, importers, the Lens and outside
 * agents, so each one is validated here whatever the caller already did. `ventureId` is the idea
 * they are for, or null to keep them "not attached yet". `today` is the person's own YYYY-MM-DD
 * (the computer's local day): a purchase can't be dated after it.
 */
export async function proposeExpenses(
  prisma: PrismaClient,
  ventureId: string | null,
  source: unknown,
  inputs: unknown,
  today: string,
): Promise<ExpenseView[]> {
  if (ventureId !== null) await requireVenture(prisma, ventureId);

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
  await checkRefundLinks(
    prisma,
    valid.flatMap((v, i) => (v.refundOfId === null ? [] : [{ position: i + 1, refundOfId: v.refundOfId }])),
  );

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
          recordKind: v.recordKind,
          refundOfId: v.refundOfId,
          gstHstCents: v.gstHstCents === null ? null : BigInt(v.gstHstCents),
          creditNote: v.creditNote,
          businessSharePercent: v.businessSharePercent,
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
  // null is a real value for the optional fields: it clears the field.
  if (edit.category !== undefined && edit.category !== current.category) data.category = edit.category;
  if (edit.sellerAddress !== undefined && edit.sellerAddress !== current.sellerAddress) {
    data.sellerAddress = edit.sellerAddress;
  }
  if (edit.vendorGstNumber !== undefined && edit.vendorGstNumber !== current.vendorGstNumber) {
    data.vendorGstNumber = edit.vendorGstNumber;
  }
  if (edit.gstHstCents !== undefined) {
    const next = edit.gstHstCents === null ? null : BigInt(edit.gstHstCents);
    if (next !== current.gstHstCents) data.gstHstCents = next;
  }
  if (edit.creditNote !== undefined && edit.creditNote !== current.creditNote) data.creditNote = edit.creditNote;
  if (edit.businessSharePercent !== undefined && edit.businessSharePercent !== current.businessSharePercent) {
    data.businessSharePercent = edit.businessSharePercent;
  }
  return data;
}

/** The record as it would be with `changes` applied, in the shape checkRecordRules reads. */
function withChanges(current: Expense, changes: Partial<Expense>) {
  const amount = changes.amountCents ?? current.amountCents;
  const gst = changes.gstHstCents !== undefined ? changes.gstHstCents : current.gstHstCents;
  return {
    recordKind: current.recordKind as ExpenseRecordKind,
    amountCents: Number(amount),
    refundOfId: current.refundOfId,
    gstHstCents: gst === null ? null : Number(gst),
    creditNote: changes.creditNote !== undefined ? changes.creditNote : current.creditNote,
  };
}

/**
 * Turns proposed records into confirmed ones — the person's click in the agree prompt. `edits`
 * carries what the person typed over the proposed values (the amount, the date, the words, the
 * category, the share); a field that really changed marks the record `editedByPerson`. Anything not
 * currently "proposed", or outside `ventureId`'s scope, is reported in `skipped` and never modified.
 * An edit that breaks a rule tying fields together (a refund record's amount below zero, a GST/HST
 * part above the amount) refuses the whole call: nothing is agreed. `today` is the person's own day,
 * so an edited date can't land in the future either.
 */
export async function agreeToExpenses(
  prisma: PrismaClient,
  ventureId: ExpenseScope,
  ids: unknown,
  edits: unknown,
  today: string,
): Promise<ExpenseChangeResult> {
  const scope = await scopeWhere(prisma, ventureId);
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
    for (const [index, id] of wanted.entries()) {
      const waiting: Prisma.ExpenseWhereInput = { AND: [scope, { id, status: "proposed" }] };
      const current = await tx.expense.findFirst({ where: waiting });
      if (!current) {
        skipped.push(id);
        continue;
      }
      const edit = checkedEdits.get(id);
      const changes = edit ? changedFields(current, edit) : {};
      if (Object.keys(changes).length > 0) {
        // Thrown inside the transaction, so every record already agreed in this call is undone too.
        const rules = checkRecordRules(withChanges(current, changes));
        if (!rules.ok) throw new ExpenseInputError(`Expense ${index + 1}: ${rules.error}`);
      }
      // The status in `where` makes this safe even if another request got in between the read and here.
      const { count } = await tx.expense.updateMany({
        where: waiting,
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
    const rows = await tx.expense.findMany({ where: { id: { in: confirmedIds } }, orderBy: BY_DAY, include: WITH_RECEIPT });
    return { changed: rows.map(rowToExpense), skipped };
  });
}

/** Moves records from one status to another, only the ones currently in `from`; the rest are skipped. */
async function moveExpenses(
  prisma: PrismaClient,
  ventureId: ExpenseScope,
  ids: unknown,
  from: ExpenseStatus,
  data: { status: ExpenseStatus; retractedAt?: Date },
): Promise<ExpenseChangeResult> {
  const scope = await scopeWhere(prisma, ventureId);
  const wanted = checkIds(ids);
  return prisma.$transaction(async (tx) => {
    const moved: string[] = [];
    const skipped: string[] = [];
    for (const id of wanted) {
      const { count } = await tx.expense.updateMany({ where: { AND: [scope, { id, status: from }] }, data });
      (count === 1 ? moved : skipped).push(id);
    }
    const rows = await tx.expense.findMany({ where: { id: { in: moved } }, orderBy: BY_DAY, include: WITH_RECEIPT });
    return { changed: rows.map(rowToExpense), skipped };
  });
}

/** The person turns a proposal down: proposed to discarded (hidden from every list). */
export async function discardExpenses(prisma: PrismaClient, ventureId: ExpenseScope, ids: unknown): Promise<ExpenseChangeResult> {
  return moveExpenses(prisma, ventureId, ids, "proposed", { status: "discarded" });
}

/** The person takes a confirmed record back: confirmed to retracted, with the day it happened. */
export async function retractExpenses(prisma: PrismaClient, ventureId: ExpenseScope, ids: unknown): Promise<ExpenseChangeResult> {
  return moveExpenses(prisma, ventureId, ids, "confirmed", { status: "retracted", retractedAt: new Date() });
}

/**
 * Attaches records to an idea, or (with `target` null) puts them back to "not attached yet" — the
 * person's own act on DotAmi's page (the maintainer's decision, 2026-10-08: a record can be saved
 * without an idea and attached later). Any of the person's records that hasn't been turned down may
 * move, whatever its status; its state, values and agreed day are kept, because which idea it sits
 * under is not part of what was agreed. Records already there, turned down or not the person's are skipped.
 */
export async function attachExpenses(prisma: PrismaClient, ids: unknown, target: string | null): Promise<ExpenseChangeResult> {
  if (target !== null) await requireVenture(prisma, target);
  const scope = await scopeWhere(prisma, undefined);
  const wanted = checkIds(ids);
  // "Not already there", spelled out: in SQL `ventureId <> 'x'` is not true for an empty ventureId,
  // so an unattached record needs its own branch.
  const elsewhere: Prisma.ExpenseWhereInput =
    target === null ? { ventureId: { not: null } } : { OR: [{ ventureId: null }, { ventureId: { not: target } }] };
  return prisma.$transaction(async (tx) => {
    const moved: string[] = [];
    const skipped: string[] = [];
    for (const id of wanted) {
      const { count } = await tx.expense.updateMany({
        where: { AND: [scope, { id, status: { not: "discarded" } }, elsewhere] },
        data: { ventureId: target },
      });
      (count === 1 ? moved : skipped).push(id);
    }
    const rows = await tx.expense.findMany({ where: { id: { in: moved } }, orderBy: BY_DAY, include: WITH_RECEIPT });
    return { changed: rows.map(rowToExpense), skipped };
  });
}
