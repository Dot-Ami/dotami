import { NextResponse } from "next/server";

import { parseIdsBody, readBody, storeErrorResponse, throttle } from "@/lib/figures/http";
import { discardFigures } from "@/lib/figures/store";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RATE_LIMIT = { limit: 60, windowMs: 60_000 };
const MAX_BODY_BYTES = 64 * 1024;

/**
 * POST /api/figures/discard { ventureId, figureIds } — turns proposed figures down. Open to any
 * caller (an importer may withdraw its own proposal): discarding changes nothing the person has
 * agreed to, and only "proposed" figures move.
 */
export async function POST(request: Request) {
  const limited = throttle(request, "discard", RATE_LIMIT);
  if (limited) return limited;

  const read = await readBody(request, MAX_BODY_BYTES);
  if ("refusal" in read) return read.refusal;

  const parsed = parseIdsBody(read.body);
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });

  try {
    const { changed, skipped } = await discardFigures(prisma, parsed.ventureId, parsed.figureIds);
    return NextResponse.json({ figures: changed, skipped });
  } catch (error) {
    return storeErrorResponse("discard", error);
  }
}
