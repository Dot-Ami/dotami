import { NextResponse } from "next/server";

import { listVentures } from "@/lib/db/ventures";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * S2.5.4i — the ideas DB, read side. Every venture the person has saved, newest touched first, with its
 * cross-references. Facts only: no ordering by merit, no score (charter: DotAmi supplies
 * information and options; the person supplies judgment).
 */
export async function GET() {
  try {
    const ventures = await listVentures(prisma);
    return NextResponse.json({ ventures, db: { available: true } });
  } catch (error) {
    console.error("[ventures] list failed", error);
    return NextResponse.json(
      { ventures: [], db: { available: false, reason: "No database reachable." } },
      { status: 503 },
    );
  }
}
