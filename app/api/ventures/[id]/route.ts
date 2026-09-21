import { NextResponse } from "next/server";

import { PayloadTooLargeError, payloadTooLargeResponse, readJsonWithLimit } from "@/lib/api/body-limit";
import { checkRateLimit, clientKeyFromRequest, rateLimitResponse } from "@/lib/api/rate-limit";
import { updateVenture, type VentureUpdate } from "@/lib/db/ventures";
import { prisma } from "@/lib/prisma";
import { VENTURE_STAGES, type VentureStage } from "@/lib/scenarios/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NOTES_MAX = 20_000;
const NAME_MAX = 80;
const RATE_LIMIT = { limit: 120, windowMs: 60_000 };
const MAX_BODY_BYTES = 96 * 1024;

/** PATCH { stage?, notes?, name? } — the three things the ideas page edits. Everything else is the map's. */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const rateLimit = checkRateLimit(`venture-patch:${clientKeyFromRequest(request)}`, RATE_LIMIT);
  if (!rateLimit.allowed) return rateLimitResponse(rateLimit);

  let raw: unknown;
  try {
    raw = await readJsonWithLimit<unknown>(request, MAX_BODY_BYTES);
  } catch (error) {
    if (error instanceof PayloadTooLargeError) return payloadTooLargeResponse(error);
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const body = (raw ?? {}) as { stage?: unknown; notes?: unknown; name?: unknown };
  const patch: VentureUpdate = {};

  if (body.stage !== undefined) {
    if (!(VENTURE_STAGES as readonly string[]).includes(body.stage as string)) {
      return NextResponse.json({ error: `stage must be one of ${VENTURE_STAGES.join(", ")}` }, { status: 400 });
    }
    patch.stage = body.stage as VentureStage;
  }
  if (body.notes !== undefined) {
    if (typeof body.notes !== "string" || body.notes.length > NOTES_MAX) {
      return NextResponse.json({ error: `notes must be a string of at most ${NOTES_MAX} characters` }, { status: 400 });
    }
    patch.notes = body.notes;
  }
  if (body.name !== undefined) {
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (name.length === 0 || name.length > NAME_MAX) {
      return NextResponse.json({ error: `name must be 1–${NAME_MAX} characters` }, { status: 400 });
    }
    patch.name = name;
  }
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "nothing to update" }, { status: 400 });
  }

  try {
    const row = await updateVenture(prisma, id, patch);
    return NextResponse.json({ ok: true, id: row.id, updatedAt: row.updatedAt.toISOString() });
  } catch (error) {
    console.error("[ventures/patch]", error);
    return NextResponse.json({ error: "Update failed — is the database up and the id real?" }, { status: 503 });
  }
}
