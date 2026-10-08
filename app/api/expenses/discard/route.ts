import { NextResponse } from "next/server";

import {
  AGREE_ONLY_MESSAGE,
  parseIdsBody,
  readBody,
  refuseUnlessFromAppPage,
  storeErrorResponse,
  throttle,
} from "@/lib/expenses/http";
import { discardExpenses } from "@/lib/expenses/store";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RATE_LIMIT = { limit: 60, windowMs: 60_000 };
const MAX_BODY_BYTES = 64 * 1024;

/**
 * POST /api/expenses/discard { ventureId?, expenseIds } (ventureId as in agree) — turns proposed records down. Answers only
 * to DotAmi's own page, like agree and retract. Unlike figures' discard it is NOT open to any
 * caller: nothing records who proposed a row, so an open route would let a script hide a record
 * the person typed while it waits for their click. Only "proposed" records move.
 */
export async function POST(request: Request) {
  const limited = throttle(request, "discard", RATE_LIMIT);
  if (limited) return limited;

  // Checked before the body is read: a request that isn't from the app's page gets nothing.
  const notFromApp = refuseUnlessFromAppPage(request, AGREE_ONLY_MESSAGE);
  if (notFromApp) return notFromApp;

  const read = await readBody(request, MAX_BODY_BYTES);
  if ("refusal" in read) return read.refusal;

  const parsed = parseIdsBody(read.body);
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });

  try {
    const { changed, skipped } = await discardExpenses(prisma, parsed.ventureId, parsed.expenseIds);
    return NextResponse.json({ expenses: changed, skipped });
  } catch (error) {
    return storeErrorResponse("discard", error);
  }
}
