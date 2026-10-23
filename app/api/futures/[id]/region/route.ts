import { NextResponse } from "next/server";

import { readFuture } from "@/lib/futures/future";
import { futureFailure, guardWrite, readBody } from "@/lib/futures/http";
import { changeRegion } from "@/lib/futures/region";
import { isRecord } from "@/lib/futures/types";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RATE_LIMIT = { limit: 120, windowMs: 60_000 };
// A region code is four characters ("dont-know" nine); the cap leaves room for the JSON around it and nothing more.
const MAX_BODY_BYTES = 1024;

/**
 * POST /api/futures/<idea id>/region { region: "4830" | "dont-know" } — About this job's **Change** for the region
 * (docs/ui-spec/cockpit/about-this-job.md, row 2; task 28h): the person's answer to "Which region are you in?",
 * kept on the idea with its day (`lib/futures/region.ts`). Alberta only in this version; an answer the drop-down
 * doesn't offer is refused. Answers the future as kept. Only from DotAmi's own window: the answer is the person's
 * own click.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const refused = guardWrite(request, "futures-region", RATE_LIMIT);
  if (refused) return refused;
  const { id } = await params;

  const read = await readBody(request, MAX_BODY_BYTES);
  if ("refusal" in read) return read.refusal;
  if (!isRecord(read.body) || !("region" in read.body)) {
    return NextResponse.json({ error: "Say which region, or I don't know." }, { status: 400 });
  }

  try {
    await changeRegion(prisma, id, read.body.region);
    return NextResponse.json({ future: await readFuture(prisma, id) });
  } catch (error) {
    return futureFailure("futures/region POST", error);
  }
}
