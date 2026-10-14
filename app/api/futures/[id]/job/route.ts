import { NextResponse } from "next/server";

import { readFuture } from "@/lib/futures/future";
import { futureFailure, guardWrite, readBody } from "@/lib/futures/http";
import { pickJob } from "@/lib/futures/job";
import { isRecord } from "@/lib/futures/types";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RATE_LIMIT = { limit: 120, windowMs: 60_000 };
// A job code is eight characters; the cap leaves room for the JSON around it and nothing more.
const MAX_BODY_BYTES = 1024;

/**
 * POST /api/futures/<idea id>/job { code: "72311.00" | null } — the job the person picks as closest to the
 * work they'd do themselves, for the government's skills list (docs/architecture/future-cockpit.md § 6,
 * "Skills, and the government's list for your pick of job, as built"), or null to take the pick back. A
 * code that isn't a job on the list is refused. Answers the future as kept. Only from DotAmi's own window:
 * the pick is the person's own click.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const refused = guardWrite(request, "futures-job", RATE_LIMIT);
  if (refused) return refused;
  const { id } = await params;

  const read = await readBody(request, MAX_BODY_BYTES);
  if ("refusal" in read) return read.refusal;
  if (!isRecord(read.body) || !("code" in read.body)) {
    return NextResponse.json({ error: "Say which job, by its code, or none." }, { status: 400 });
  }

  try {
    await pickJob(prisma, id, read.body.code);
    return NextResponse.json({ future: await readFuture(prisma, id) });
  } catch (error) {
    return futureFailure("futures/job POST", error);
  }
}
