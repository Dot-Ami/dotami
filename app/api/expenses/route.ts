import { NextResponse } from "next/server";

import { storeErrorResponse, throttle } from "@/lib/expenses/http";
import { listExpenses } from "@/lib/expenses/store";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RATE_LIMIT = { limit: 120, windowMs: 60_000 };

/**
 * GET /api/expenses?venture=<id> — the expense records DotAmi holds for one idea (everything except
 * the ones the person turned down). Only the idea's id travels in the URL; who was paid, what for
 * and the amounts come back in the response body, never in an address (privacy review, rule 6).
 */
export async function GET(request: Request) {
  const limited = throttle(request, "list", RATE_LIMIT);
  if (limited) return limited;

  const ventureId = new URL(request.url).searchParams.get("venture");
  if (!ventureId) return NextResponse.json({ error: "Say which idea: ?venture=<id>." }, { status: 400 });

  try {
    return NextResponse.json({ expenses: await listExpenses(prisma, ventureId) });
  } catch (error) {
    return storeErrorResponse("list", error);
  }
}
