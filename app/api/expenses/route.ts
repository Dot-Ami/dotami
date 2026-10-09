import { NextResponse } from "next/server";

import { storeErrorResponse, throttle } from "@/lib/expenses/http";
import { listExpenses } from "@/lib/expenses/store";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RATE_LIMIT = { limit: 120, windowMs: 60_000 };

/**
 * GET /api/expenses — the expense records DotAmi holds (everything except the ones the person turned
 * down), for one of three scopes:
 *   ?venture=<id>  one idea's records;
 *   ?unattached    the records not attached to any idea yet;
 *   (neither)      every record of the person's, attached or not (the Expenses screen's "All").
 * Only an idea's id travels in the URL; who was paid, what for and the amounts come back in the
 * response body, never in an address (privacy review, rule 6).
 */
export async function GET(request: Request) {
  const limited = throttle(request, "list", RATE_LIMIT);
  if (limited) return limited;

  const params = new URL(request.url).searchParams;
  const ventureId = params.get("venture");
  if (ventureId !== null && params.has("unattached")) {
    return NextResponse.json({ error: "Ask for one idea or for the records not attached yet, not both." }, { status: 400 });
  }
  if (ventureId === "") return NextResponse.json({ error: "Say which idea: ?venture=<id>." }, { status: 400 });
  const scope = ventureId ?? (params.has("unattached") ? null : undefined);

  try {
    return NextResponse.json({ expenses: await listExpenses(prisma, scope) });
  } catch (error) {
    return storeErrorResponse("list", error);
  }
}
