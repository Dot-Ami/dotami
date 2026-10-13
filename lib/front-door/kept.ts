import type { PrismaClient } from "@prisma/client";

import { currentIncomeWanted } from "@/lib/futures/person-figures";
import { dayOnThisComputer } from "@/lib/futures/person";
import { latestDestination } from "@/lib/person/statements";

import type { KeptOnRecord } from "./draft";

/**
 * What *Your destination* already has on record (docs/architecture/future-cockpit.md § 1, "The way in as
 * built"): the newest answer to "where do you want to be" and the yearly income agreed to, read on the
 * server when `/start` is drawn, so a returning person sees them answered instead of being asked again.
 * The same two reads the cockpit makes (app/api/futures/[id]/route.ts). Each fails soft to "nothing on
 * record": with no database, the questions are asked as before.
 */
export async function keptOnRecord(prisma: PrismaClient): Promise<KeptOnRecord> {
  const [destination, income] = await Promise.all([
    latestDestination(prisma).catch(() => null),
    currentIncomeWanted(prisma).catch(() => null),
  ]);
  return {
    destination: destination ? { text: destination.text, saidAt: destination.saidAt } : null,
    // Only an agreed number counts: a proposed one waits for the person.
    incomeWanted:
      income && income.confirmedAt
        ? { amountCents: income.amountCents, agreedOn: dayOnThisComputer(new Date(income.confirmedAt)) }
        : null,
  };
}
