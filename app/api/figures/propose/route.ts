import { NextResponse } from "next/server";

import { readBody, storeErrorResponse, throttle, todayUtc } from "@/lib/figures/http";
import { proposeFigures } from "@/lib/figures/store";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RATE_LIMIT = { limit: 30, windowMs: 60_000 };
// 500 figures at roughly 250 bytes each, with room to spare.
const MAX_BODY_BYTES = 256 * 1024;

/** Keys that would let a caller pick a figure's state instead of leaving it to the person. */
const FORBIDDEN_KEYS = ["status", "confirmedAt", "editedByPerson"] as const;

const REFUSAL = "Figures can only be proposed here. Confirming is the person's click in the agree prompt.";

function carriesForbiddenKey(value: unknown): boolean {
  return (
    typeof value === "object" &&
    value !== null &&
    FORBIDDEN_KEYS.some((key) => Object.prototype.hasOwnProperty.call(value, key))
  );
}

/**
 * POST /api/figures/propose { ventureId, source: { kind, label, rows? }, figures: [...] }
 *
 * The route for importers, the Lens and outside agents. It can create "proposed" figures and
 * nothing else: a body or a figure that tries to name a status, a confirmation time or an
 * "edited by the person" flag is refused outright, with nothing created. Confirming happens
 * in /api/figures/agree, from the app's own page.
 */
export async function POST(request: Request) {
  const limited = throttle(request, "propose", RATE_LIMIT);
  if (limited) return limited;

  const read = await readBody(request, MAX_BODY_BYTES);
  if ("refusal" in read) return read.refusal;

  const body = (typeof read.body === "object" && read.body !== null ? read.body : {}) as {
    ventureId?: unknown;
    source?: unknown;
    figures?: unknown;
  };

  if (
    carriesForbiddenKey(body) ||
    carriesForbiddenKey(body.source) ||
    (Array.isArray(body.figures) && body.figures.some(carriesForbiddenKey))
  ) {
    return NextResponse.json({ error: REFUSAL }, { status: 400 });
  }
  if (typeof body.ventureId !== "string" || body.ventureId.length === 0) {
    return NextResponse.json({ error: "Say which idea this is for." }, { status: 400 });
  }

  try {
    const figures = await proposeFigures(prisma, body.ventureId, body.source, body.figures, todayUtc());
    return NextResponse.json({ figures }, { status: 201 });
  } catch (error) {
    return storeErrorResponse("propose", error);
  }
}
