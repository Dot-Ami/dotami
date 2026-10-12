import { NextResponse } from "next/server";

import { localToday } from "@/lib/figures/age";
import { readFuture, setTargetMonth } from "@/lib/futures/future";
import { futureFailure, guardWrite, readBody } from "@/lib/futures/http";
import { isRecord } from "@/lib/futures/types";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RATE_LIMIT = { limit: 120, windowMs: 60_000 };
const MAX_BODY_BYTES = 4 * 1024;

/**
 * POST /api/futures/<idea id>/date { month: "2029-05" | null } — the person's own month and year for this
 * future, or null to clear it. A month already gone is refused, by this computer's own calendar day (the
 * person's, in the desktop app). Answers the future as kept. Only from DotAmi's own window.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const refused = guardWrite(request, "futures-date", RATE_LIMIT);
  if (refused) return refused;
  const { id } = await params;

  const read = await readBody(request, MAX_BODY_BYTES);
  if ("refusal" in read) return read.refusal;
  if (!isRecord(read.body) || !("month" in read.body)) {
    return NextResponse.json({ error: "Give a month and year, written like 2029-05, or none." }, { status: 400 });
  }

  try {
    await setTargetMonth(prisma, id, read.body.month, localToday());
    return NextResponse.json({ future: await readFuture(prisma, id) });
  } catch (error) {
    return futureFailure("futures/date POST", error);
  }
}
