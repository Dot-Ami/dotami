import { NextResponse } from "next/server";

import { throttle, storeErrorResponse } from "@/lib/figures/http";
import { listFigures } from "@/lib/figures/store";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RATE_LIMIT = { limit: 120, windowMs: 60_000 };

/**
 * GET /api/figures?venture=<id> — the figures DotAmi holds for one idea (everything except the
 * ones the person turned down). Only the idea's id travels in the URL; amounts come back in the
 * response body, never in an address (privacy review, rule 1).
 */
export async function GET(request: Request) {
  const limited = throttle(request, "list", RATE_LIMIT);
  if (limited) return limited;

  const ventureId = new URL(request.url).searchParams.get("venture");
  if (!ventureId) return NextResponse.json({ error: "Say which idea: ?venture=<id>." }, { status: 400 });

  try {
    return NextResponse.json({ figures: await listFigures(prisma, ventureId) });
  } catch (error) {
    return storeErrorResponse("list", error);
  }
}
