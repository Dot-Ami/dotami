import { NextResponse } from "next/server";

import { futureFailure, guardRead, readBody } from "@/lib/futures/http";
import { discardPersonFigures } from "@/lib/futures/person-figures";
import { isRecord } from "@/lib/futures/types";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RATE_LIMIT = { limit: 60, windowMs: 60_000 };
const MAX_BODY_BYTES = 8 * 1024;

/**
 * POST /api/person-figures/discard { ids } — turns proposed numbers about the person down ("No, I'll do
 * it myself"). Open to any caller, like /api/figures/discard: only "proposed" ones move, so nothing the
 * person agreed to changes.
 */
export async function POST(request: Request) {
  const limited = guardRead(request, "person-figures-discard", RATE_LIMIT);
  if (limited) return limited;

  const read = await readBody(request, MAX_BODY_BYTES);
  if ("refusal" in read) return read.refusal;
  if (!isRecord(read.body)) return NextResponse.json({ error: "Say which numbers you mean." }, { status: 400 });

  try {
    const { changed, skipped } = await discardPersonFigures(prisma, read.body.ids);
    return NextResponse.json({ figures: changed, skipped });
  } catch (error) {
    return futureFailure("person-figures/discard", error);
  }
}
