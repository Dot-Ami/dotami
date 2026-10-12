import { NextResponse } from "next/server";

import { futureFailure, guardWrite, readBody } from "@/lib/futures/http";
import { markSkill } from "@/lib/futures/skill-marks";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RATE_LIMIT = { limit: 120, windowMs: 60_000 };
// One skill and a mark; an own skill's name is at most 120 characters.
const MAX_BODY_BYTES = 4 * 1024;

/**
 * POST /api/skill-marks { skillItemId | ownLabel, mark } — the person's mark on one skill: have, learning
 * or not-yet, or null for "I don't know", which removes the mark. Kept once for the person, so it carries
 * across every future that lists the skill. A skill item DotAmi's list doesn't have is refused
 * (lib/futures/skill-marks.ts). Answers the mark as kept, or null. Only from DotAmi's own window: only the
 * person sets a mark.
 */
export async function POST(request: Request) {
  const refused = guardWrite(request, "skill-marks", RATE_LIMIT);
  if (refused) return refused;

  const read = await readBody(request, MAX_BODY_BYTES);
  if ("refusal" in read) return read.refusal;

  try {
    return NextResponse.json({ mark: await markSkill(prisma, read.body) });
  } catch (error) {
    return futureFailure("skill-marks POST", error);
  }
}
