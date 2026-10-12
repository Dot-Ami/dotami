import { NextResponse } from "next/server";

import { firstWordsOf } from "@/lib/db/ventures";
import { readFuture } from "@/lib/futures/future";
import { futureFailure, guardRead } from "@/lib/futures/http";
import { currentIncomeWanted } from "@/lib/futures/person-figures";
import { dayOnThisComputer } from "@/lib/futures/person";
import { listSkillMarks } from "@/lib/futures/skill-marks";
import { listStepProgress } from "@/lib/futures/step-progress";
import { latestDestination } from "@/lib/person/statements";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The cockpit reads this once when an idea opens and again after each answer is saved; the cap is here
// to stop a runaway loop, not normal use (the same as the figures list).
const RATE_LIMIT = { limit: 600, windowMs: 60_000 };

/**
 * GET /api/futures/<idea id> — what the cockpit keeps for one idea (docs/architecture/future-cockpit.md
 * § 2, "Cockpit screen as built"): its road, picks and month (`future`), its step progress, the person's
 * skill marks (kept once for the person, so the same on every idea), the yearly income they agreed to
 * with the day agreed, the sentence typed on the front door for it, and the person's newest destination. Only the idea's id travels in
 * the address; amounts come back in the body.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const limited = guardRead(request, "futures-read", RATE_LIMIT);
  if (limited) return limited;
  const { id } = await params;

  try {
    const future = await readFuture(prisma, id);
    const [progress, skillMarks, income, firstWords, destination] = await Promise.all([
      listStepProgress(prisma, id),
      listSkillMarks(prisma),
      currentIncomeWanted(prisma),
      firstWordsOf(prisma, id),
      latestDestination(prisma),
    ]);
    return NextResponse.json({
      future,
      progress,
      skillMarks,
      // Only the agreed number: a proposed one waits for the person, and nothing judges it.
      incomeWanted:
        income && income.confirmedAt
          ? { amountCents: income.amountCents, agreedOn: dayOnThisComputer(new Date(income.confirmedAt)) }
          : null,
      firstWords,
      // The person's, not the idea's: the goal bar shows it when the idea has no first sentence (2026-10-12).
      destination: destination ? { text: destination.text, saidAt: destination.saidAt } : null,
    });
  } catch (error) {
    return futureFailure("futures GET", error);
  }
}
