import { NextResponse } from "next/server";

import { futureFailure, guardWrite, readBody } from "@/lib/futures/http";
import { setStepProgress } from "@/lib/futures/step-progress";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RATE_LIMIT = { limit: 120, windowMs: 60_000 };
// A road, a step and a few line ids: 16 KB is far more than any of them can need.
const MAX_BODY_BYTES = 16 * 1024;

/**
 * POST /api/futures/<idea id>/progress { roadId, stepId, status?, doneWhenIds? } — the person's status on
 * one step (doing, done, not for me, or null to take it back) and the "done when" lines they ticked. Every
 * id is checked against the road catalog by the storage code (lib/futures/step-progress.ts); a tick on a line
 * the idea's place leaves out (another province's page) is kept whatever list is sent. Answers the step's
 * progress as kept. Only from DotAmi's own window.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const refused = guardWrite(request, "futures-progress", RATE_LIMIT);
  if (refused) return refused;
  const { id } = await params;

  const read = await readBody(request, MAX_BODY_BYTES);
  if ("refusal" in read) return read.refusal;

  try {
    return NextResponse.json({ progress: await setStepProgress(prisma, id, read.body) });
  } catch (error) {
    return futureFailure("futures/progress POST", error);
  }
}
