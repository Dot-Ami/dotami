import { NextResponse } from "next/server";

import {
  AGREE_ONLY_MESSAGE,
  parseIdsBody,
  readBody,
  refuseUnlessFromAppPage,
  storeErrorResponse,
  throttle,
} from "@/lib/expenses/http";
import { retractExpenses } from "@/lib/expenses/store";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RATE_LIMIT = { limit: 60, windowMs: 60_000 };
const MAX_BODY_BYTES = 64 * 1024;

/**
 * POST /api/expenses/retract { ventureId?, expenseIds } (ventureId as in agree) — takes confirmed records back. Like
 * agreeing, it is the person's call and answers only to DotAmi's own page (see
 * `refuseUnlessFromAppPage`).
 */
export async function POST(request: Request) {
  const limited = throttle(request, "retract", RATE_LIMIT);
  if (limited) return limited;

  const notFromApp = refuseUnlessFromAppPage(request, AGREE_ONLY_MESSAGE);
  if (notFromApp) return notFromApp;

  const read = await readBody(request, MAX_BODY_BYTES);
  if ("refusal" in read) return read.refusal;

  const parsed = parseIdsBody(read.body);
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });

  try {
    const { changed, skipped } = await retractExpenses(prisma, parsed.ventureId, parsed.expenseIds);
    return NextResponse.json({ expenses: changed, skipped });
  } catch (error) {
    return storeErrorResponse("retract", error);
  }
}
