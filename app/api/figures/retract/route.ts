import { NextResponse } from "next/server";

import { readBody, throttle } from "@/lib/api/route";
import { parseIdsBody, refuseUnlessFromAppPage, storeErrorResponse } from "@/lib/figures/http";
import { retractFigures } from "@/lib/figures/store";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RATE_LIMIT = { limit: 60, windowMs: 60_000 };
const MAX_BODY_BYTES = 64 * 1024;

/**
 * POST /api/figures/retract { ventureId, figureIds } — takes confirmed figures back. Retracting
 * changes what the cards say, so like agreeing it is the person's call and answers only to
 * DotAmi's own page (see `refuseUnlessFromAppPage`).
 */
export async function POST(request: Request) {
  const limited = throttle("figures-retract", request, RATE_LIMIT);
  if (limited) return limited;

  const notFromApp = refuseUnlessFromAppPage(request);
  if (notFromApp) return notFromApp;

  const read = await readBody(request, MAX_BODY_BYTES);
  if ("refusal" in read) return read.refusal;

  const parsed = parseIdsBody(read.body);
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });

  try {
    const { changed, skipped } = await retractFigures(prisma, parsed.ventureId, parsed.figureIds);
    return NextResponse.json({ figures: changed, skipped });
  } catch (error) {
    return storeErrorResponse("retract", error);
  }
}
