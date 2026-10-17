import { NextResponse } from "next/server";

import { guardWatched, readBody, watchedFailure } from "@/lib/landscape/http";
import { removeWatched } from "@/lib/landscape/watched";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RATE_LIMIT = { limit: 60, windowMs: 60_000 };
// The body is empty ({}); it is still read through the shared guard, as every write's is.
const MAX_BODY_BYTES = 1024;

/**
 * POST /api/futures/<idea id>/watched/<business id>/remove {} — removes one business from the idea's list, for
 * good: its name, link, note and ad links are deleted from the data file. Only from DotAmi's own window.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string; businessId: string }> }) {
  const refused = guardWatched(request, "watched-remove", RATE_LIMIT);
  if (refused) return refused;
  const { id, businessId } = await params;

  const read = await readBody(request, MAX_BODY_BYTES);
  if ("refusal" in read) return read.refusal;

  try {
    await removeWatched(prisma, id, businessId);
    return NextResponse.json({ removed: true });
  } catch (error) {
    return watchedFailure("futures/watched remove POST", error);
  }
}
