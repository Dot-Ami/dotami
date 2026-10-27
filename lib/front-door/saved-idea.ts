import type { PrismaClient } from "@prisma/client";

import { LISTED_EXPENSE } from "@/lib/expenses/store";

/**
 * Whether the person has a saved idea, for the front door (2026-10-23): *Your futures* and *Open cockpit* are
 * offered only then, since for a brand-new person both opened empty pages. There is one person per copy (no
 * sign-in), so any saved idea is theirs, as for the intake's first screen (lib/journey/intake-start.ts). Read
 * on the server when the page is drawn; with no database it reads as none, and the links stay away.
 */
export async function hasSavedIdea(prisma: Pick<PrismaClient, "venture">): Promise<boolean> {
  try {
    return (await prisma.venture.count()) > 0;
  } catch {
    return false;
  }
}

/**
 * Whether the Expenses page has a record to list, for the front door (2026-10-24): with no idea saved, its
 * *Your expenses →* is the way to records kept when Delete took the ideas, or proposed by an agent and
 * waiting. Counted by the page's own rule (`LISTED_EXPENSE`, every record but those turned down). With no idea
 * saved every record is not attached to one, so this is what the page lists; the front door asks it only
 * then. Read on the server when the page is drawn; with no database it reads as none, like `hasSavedIdea`.
 */
export async function hasListedExpenses(prisma: Pick<PrismaClient, "expense">): Promise<boolean> {
  try {
    return (await prisma.expense.count({ where: LISTED_EXPENSE })) > 0;
  } catch {
    return false;
  }
}
