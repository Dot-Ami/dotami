import type { Prisma, PrismaClient, SourceAccount } from "@prisma/client";

import { localDay } from "@/lib/figures/age";
import { SETTINGS, type BankAllowChoice } from "@/lib/settings/catalog";
import { BANK_RECORDS_DEFINITION, readStoredWith, type BankRecordsValue } from "@/lib/settings/values";

import {
  ACCOUNT_ALLOWANCES,
  checkAccountName,
  sameAccountName,
  type AccountAllowance,
  type BankSourcesState,
  type SourceAccountView,
} from "./source-account-name";

/**
 * [8g] The database side of the bank and card accounts list (the `SourceAccount` table) and of the
 * "Bank and card records" setting.
 *
 * An account is added, or allowed again, only by the person's click on the statement warning
 * (Allow once / Always allow this account / Always allow every account), and taken back from
 * Settings. The routes that call this answer only DotAmi's own page. Nothing is stored about an
 * account but the person's name for it, which button they pressed, and when.
 *
 * The switch: an account can be added only while "Bank and card records" is on. The setting is
 * still `planned` (the statement screen that makes it do something is the next step), so today
 * it reads as off and adding is refused; taking back always works.
 */

/** More accounts than anyone has; a cap so a runaway caller can't grow the table without bound. */
export const MAX_LIVE_ACCOUNTS = 100;

const SETTING_ID = "bank-records";

/** The request can't be carried out as asked. The route answers 400 with the message. */
export class AccountInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AccountInputError";
  }
}

/** No account in use has that id. The route answers 404. */
export class AccountNotFoundError extends Error {
  constructor() {
    super("That account isn't in your list any more.");
    this.name = "AccountNotFoundError";
  }
}

/** The person hasn't turned the setting on (or it isn't built yet). The route answers 409. */
export class BankRecordsOffError extends Error {
  constructor() {
    super("Bank and card records is off in Settings, so no account can be added.");
    this.name = "BankRecordsOffError";
  }
}

type Db = PrismaClient | Prisma.TransactionClient;

/** True once the catalog marks the setting live — the step that gives it its switch. */
export function bankRecordsBuilt(): boolean {
  return SETTINGS.some((s) => s.id === SETTING_ID && s.status === "live");
}

/** The stored value as written, whether or not the setting is live; the fallback when nothing is saved. */
async function storedBankRecords(db: Db): Promise<BankRecordsValue> {
  const row = await db.setting.findUnique({ where: { key: SETTING_ID } });
  return readStoredWith(BANK_RECORDS_DEFINITION, row?.value ?? null);
}

/**
 * The setting as it applies now. While the setting is planned it is off, whatever the file
 * holds: a switch the person was never shown can't have been turned on.
 */
export async function readBankRecords(db: Db): Promise<BankRecordsValue> {
  if (!bankRecordsBuilt()) return structuredClone(BANK_RECORDS_DEFINITION.fallback);
  return storedBankRecords(db);
}

async function writeBankRecords(db: Db, patch: Partial<BankRecordsValue>): Promise<void> {
  const next = { ...(await storedBankRecords(db)), ...patch };
  const value = JSON.stringify(next);
  await db.setting.upsert({ where: { key: SETTING_ID }, create: { key: SETTING_ID, value }, update: { value } });
}

function toView(row: SourceAccount): SourceAccountView {
  // A value the code never writes (a hand-edited file) reads as "once", the direction that shows the warning.
  const allowance = (ACCOUNT_ALLOWANCES as readonly string[]).includes(row.allowance) ? (row.allowance as AccountAllowance) : "once";
  // The day on this computer: the server runs on the person's own machine, as /your-data assumes.
  return { id: row.id, name: row.name, allowance, agreedOn: localDay(row.agreedAt) ?? row.agreedAt.toISOString().slice(0, 10) };
}

const live = { retiredAt: null } as const;

/** The accounts in use, oldest first, and the setting's state — what the routes and Settings show. */
export async function readBankSources(db: Db): Promise<BankSourcesState> {
  const [setting, rows] = await Promise.all([
    readBankRecords(db),
    db.sourceAccount.findMany({ where: live, orderBy: [{ createdAt: "asc" }, { id: "asc" }] }),
  ]);
  return {
    on: setting.on,
    everyAccountSince: setting.everyAccountSince === null ? null : localDay(setting.everyAccountSince),
    accounts: rows.map(toView),
  };
}

const isPlainObject = (raw: unknown): raw is Record<string, unknown> =>
  typeof raw === "object" && raw !== null && !Array.isArray(raw);

const CHOICES: readonly BankAllowChoice[] = ["once", "always", "every"];

/**
 * The person pressed one of the warning's three buttons. The body names the button (`allow`) and
 * either an account already in the list (`id`) or a new one (`name`), never both.
 *
 *  - once: the account is listed (a statement's figures will need a listed account) and the warning
 *    shows again before its next statement.
 *  - always: no warning for this account again until it is taken back.
 *  - every: no warning for any account until "every account" is taken back; the account is listed
 *    with that button, so taking "every account" back brings its warning back too.
 *
 * Every button records the moment of the click as the account's agreed date. Refused, with
 * nothing written, while the setting is off. Returns the account as listed.
 */
export async function allowAccount(prisma: PrismaClient, body: unknown, now: Date = new Date()): Promise<SourceAccountView> {
  if (!isPlainObject(body)) throw new AccountInputError("Say which account, and which button was pressed.");
  const keys = Object.keys(body);
  // A field this doesn't know is refused, not ignored, so a typo can't look like it worked — and no
  // account number can ride along in a field nobody reads.
  if (keys.some((k) => k !== "allow" && k !== "id" && k !== "name")) {
    throw new AccountInputError("Only the button and the account can be sent.");
  }
  const allow = body.allow;
  if (!CHOICES.includes(allow as BankAllowChoice)) throw new AccountInputError("Say which button was pressed: once, always or every.");
  const hasId = "id" in body;
  const hasName = "name" in body;
  if (hasId === hasName) throw new AccountInputError("Name a new account or pick one from your list, not both.");

  let name: string | null = null;
  if (hasName) {
    const checked = checkAccountName(body.name);
    if (!checked.ok) throw new AccountInputError(checked.reason);
    name = checked.name;
  } else if (typeof body.id !== "string" || body.id.length === 0 || body.id.length > 100) {
    throw new AccountNotFoundError();
  }

  return prisma.$transaction(async (tx) => {
    if (!(await readBankRecords(tx)).on) throw new BankRecordsOffError();

    let row: SourceAccount;
    if (name !== null) {
      const inUse = await tx.sourceAccount.findMany({ where: live, select: { name: true } });
      if (inUse.some((a) => sameAccountName(a.name, name!))) {
        throw new AccountInputError("An account with that name is already in your list. Pick it from the list instead.");
      }
      if (inUse.length >= MAX_LIVE_ACCOUNTS) {
        throw new AccountInputError(`Your list already holds ${MAX_LIVE_ACCOUNTS} accounts. Take one back in Settings first.`);
      }
      row = await tx.sourceAccount.create({ data: { name, allowance: allow as string, agreedAt: now } });
    } else {
      const found = await tx.sourceAccount.findFirst({ where: { id: body.id as string, ...live } });
      if (!found) throw new AccountNotFoundError();
      row = await tx.sourceAccount.update({ where: { id: found.id }, data: { allowance: allow as string, agreedAt: now } });
    }

    if (allow === "every") await writeBankRecords(tx, { everyAccountSince: now.toISOString() });
    return toView(row);
  });
}

/**
 * Takes an account back (Settings). It leaves the list and can't be used for a statement again;
 * a statement from that account later starts over as a new account, with the warning. The row
 * stays in the file (its name and dates) until Delete removes every account, and the figures
 * already read from its statements are left alone: nothing links a figure to its account yet.
 */
export async function retireAccount(prisma: PrismaClient, id: unknown, now: Date = new Date()): Promise<void> {
  if (typeof id !== "string" || id.length === 0 || id.length > 100) throw new AccountNotFoundError();
  // updateMany with the "still in use" condition, so a second click (or two tabs) can't move the date.
  const { count } = await prisma.sourceAccount.updateMany({ where: { id, ...live }, data: { retiredAt: now } });
  if (count === 0) throw new AccountNotFoundError();
}

/**
 * Takes "Always allow every account" back (Settings): each account then shows its warning again,
 * unless it was allowed with "Always allow this account". Works whether or not the switch is on —
 * taking a permission back must never be blocked.
 */
export async function takeBackEveryAccount(prisma: PrismaClient): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const row = await tx.setting.findUnique({ where: { key: SETTING_ID } });
    if (row) await writeBankRecords(tx, { everyAccountSince: null });
  });
}
