import { NextResponse } from "next/server";

import { guardWatched, readBody, watchedFailure } from "@/lib/landscape/http";
import { editWatched } from "@/lib/landscape/watched";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RATE_LIMIT = { limit: 60, windowMs: 60_000 };
// The same business as an add sends (app/api/futures/[id]/watched/route.ts says how it is sized).
const MAX_BODY_BYTES = 64 * 1024;

/**
 * POST /api/futures/<idea id>/watched/<business id> { nameAsTyped, url?, note?, adLinks? } — replaces what is
 * kept for one business on the idea's list: the whole business is sent again, and a field left out is cleared.
 * Its place in the list and the day it was added stay. Only from DotAmi's own window.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string; businessId: string }> }) {
  const refused = guardWatched(request, "watched-edit", RATE_LIMIT);
  if (refused) return refused;
  const { id, businessId } = await params;

  const read = await readBody(request, MAX_BODY_BYTES);
  if ("refusal" in read) return read.refusal;

  try {
    return NextResponse.json({ business: await editWatched(prisma, id, businessId, read.body) });
  } catch (error) {
    return watchedFailure("futures/watched edit POST", error);
  }
}
