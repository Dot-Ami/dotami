import { NextResponse } from "next/server";

import { pickEnding, readFuture } from "@/lib/futures/future";
import { futureFailure, guardWrite, readBody } from "@/lib/futures/http";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RATE_LIMIT = { limit: 120, windowMs: 60_000 };
// A fork id and a step id: 4 KB is far more than either can need.
const MAX_BODY_BYTES = 4 * 1024;

/**
 * POST /api/futures/<idea id>/ending { forkId, stepId | null } — "This is mine" (docs/architecture/
 * future-cockpit.md § 2, "Cockpit screen as built, part 2"): the ending the person picked at one fork of
 * the future's road, or null to take it back. The step has to be one of that fork's two sides; today's
 * general road's forks are refused, since the map keeps those with its toggles (lib/futures/future.ts
 * `pickEnding`). Answers the future as kept. Only from DotAmi's own window: only the person picks.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const refused = guardWrite(request, "futures-ending", RATE_LIMIT);
  if (refused) return refused;
  const { id } = await params;

  const read = await readBody(request, MAX_BODY_BYTES);
  if ("refusal" in read) return read.refusal;

  try {
    await pickEnding(prisma, id, read.body);
    return NextResponse.json({ future: await readFuture(prisma, id) });
  } catch (error) {
    return futureFailure("futures/ending POST", error);
  }
}
