/**
 * [8g] The rules for a bank or card account's name, and when its statement needs the warning —
 * pure, so the server (lib/figures/source-accounts.ts) and the window share one copy.
 *
 * Why it isn't in lib/figures/bank: that folder is the statement-reading logic, and
 * tests/figures-bank-logic.spec.ts keeps it free of anything that stores data or has a field named
 * for an account. An account's name is stored, so it lives here.
 *
 * The name is the person's own words ("Business chequing"), and it is the only thing DotAmi keeps
 * about an account. An account or card number must never get in through it. The maintainer's
 * decision (2026-10-07): "ending" plus exactly four digits, at the end of the name, is allowed
 * ("Visa ending 1234"), so two cards can be told apart; any other run of four or more digits is
 * refused.
 */

import type { BankAllowChoice } from "@/lib/settings/catalog";

/** A name longer than this is refused. Long enough for "Business chequing at the credit union". */
export const MAX_ACCOUNT_NAME_LENGTH = 60;

/** The sentence a refused name gets when digits are the problem. Shown as is. */
export const DIGITS_REFUSED =
  "Leave the account number out. A name like “Business chequing” or “Visa ending 1234” is enough: four digits are allowed only after “ending”, at the end.";

/**
 * The one place four digits may stand: "ending" (any case), then exactly four digits 0-9, as the
 * last thing in the name. "ending" must be a word of its own, so "Spending 1234" doesn't count.
 */
const ENDING = /(?:^|\s)ending (\d{4})$/i;

/**
 * A run of digits, in any script (\p{Nd}: Arabic-Indic and full-width digits count too), where
 * spaces, hyphens, dots, slashes and underscores between digits don't break the run. Read as one
 * run on purpose: "1234 5678 9012" and "12-34-56-78" are account numbers with separators, and a
 * plain "four digits in a row" check would let them through.
 */
const DIGIT_RUN = /\p{Nd}(?:[\s\-./_]*\p{Nd})*/gu;

/**
 * Control characters and invisible format characters (a zero-width space between digits would
 * hide a run from the check above, and a line break has no place in a name).
 */
const HIDDEN = /[\p{Cc}\p{Cf}]/u;

export type AccountNameCheck = { ok: true; name: string } | { ok: false; reason: string };

/**
 * Checks a name the person typed. On success, `name` is what gets stored: trimmed, with runs of
 * spaces made one, so "Visa  ending 1234 " and "Visa ending 1234" are the same account.
 */
export function checkAccountName(raw: unknown): AccountNameCheck {
  if (typeof raw !== "string") return { ok: false, reason: "Give this account a name, like “Business chequing”." };
  if (HIDDEN.test(raw)) {
    return { ok: false, reason: "The name can't hold line breaks or hidden characters." };
  }
  const name = raw.trim().replace(/\s+/g, " ");
  if (name.length === 0) return { ok: false, reason: "Give this account a name, like “Business chequing”." };
  if (name.length > MAX_ACCOUNT_NAME_LENGTH) {
    return { ok: false, reason: `Keep the name to ${MAX_ACCOUNT_NAME_LENGTH} characters or fewer.` };
  }
  // Take the allowed "ending 1234" off the end, then look for any run of four or more digits in
  // what is left. The text before "ending" is checked like any other name.
  const rest = name.replace(ENDING, "");
  for (const [run] of rest.matchAll(DIGIT_RUN)) {
    const digits = run.match(/\p{Nd}/gu)?.length ?? 0;
    if (digits >= 4) return { ok: false, reason: DIGITS_REFUSED };
  }
  return { ok: true, name };
}

/** Two names for the same account? Compared without regard to case, after checkAccountName's tidying. */
export function sameAccountName(a: string, b: string): boolean {
  const fold = (s: string) => s.trim().replace(/\s+/g, " ").toLocaleLowerCase("en-CA");
  return fold(a) === fold(b);
}

/**
 * Which warning button an account was last allowed with — the same ids as the buttons
 * (BANK_STATEMENT_WARNING in lib/settings/catalog.ts). "every" means the account was added while
 * the person chose "Always allow every account"; on its own it is no lasting permission, so the
 * account's warning comes back once "every account" is taken back.
 */
export type AccountAllowance = BankAllowChoice;
export const ACCOUNT_ALLOWANCES: readonly AccountAllowance[] = ["once", "always", "every"];

/** One account as the window sees it. `agreedOn` is the calendar day on this computer, YYYY-MM-DD. */
export interface SourceAccountView {
  id: string;
  name: string;
  allowance: AccountAllowance;
  agreedOn: string;
}

/** The accounts list and the setting's state together, as the bank-sources routes answer. */
export interface BankSourcesState {
  /** The Settings switch. Always false while the setting is still planned. */
  on: boolean;
  /** The day "Always allow every account" was pressed, YYYY-MM-DD on this computer, or null. */
  everyAccountSince: string | null;
  /** Accounts in use (not taken back), oldest first. */
  accounts: SourceAccountView[];
}

/**
 * Does a statement from this account need the warning first? Yes, unless the person chose
 * "Always allow this account" for it, or "Always allow every account" and hasn't taken that back.
 * `account` is null for an account that isn't in the list yet: a new account always gets it,
 * unless every account is allowed.
 */
export function needsWarning(account: { allowance: AccountAllowance } | null, everyAccountSince: string | null): boolean {
  if (everyAccountSince !== null) return false;
  return account?.allowance !== "always";
}

/** What Settings says beside an account: which button was pressed, and when. */
export function describeAllowance(account: Pick<SourceAccountView, "allowance" | "agreedOn">): string {
  switch (account.allowance) {
    case "always":
      return `Always allowed since ${account.agreedOn}`;
    case "every":
      return `Allowed on ${account.agreedOn} with “Always allow every account”`;
    case "once":
      return `Allowed once, on ${account.agreedOn}; the warning shows again next time`;
  }
}
