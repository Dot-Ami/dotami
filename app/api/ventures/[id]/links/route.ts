import { NextResponse } from "next/server";

import { PayloadTooLargeError, payloadTooLargeResponse, readJsonWithLimit } from "@/lib/api/body-limit";
import { checkRateLimit, clientKeyFromRequest, rateLimitResponse } from "@/lib/api/rate-limit";
import { linkVentures, unlinkVentures, VENTURE_LINK_KINDS, type VentureLinkKind } from "@/lib/db/ventures";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NOTE_MAX = 2_000;
const RATE_LIMIT = { limit: 60, windowMs: 60_000 };
const MAX_BODY_BYTES = 16 * 1024;

/** POST { toId, kind, note? } — cross-reference this idea with another. One row per pair. */
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const rateLimit = checkRateLimit(`venture-links:${clientKeyFromRequest(request)}`, RATE_LIMIT);
  if (!rateLimit.allowed) return rateLimitResponse(rateLimit);

  let raw: unknown;
  try {
    raw = await readJsonWithLimit<unknown>(request, MAX_BODY_BYTES);
  } catch (error) {
    if (error instanceof PayloadTooLargeError) return payloadTooLargeResponse(error);
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const body = (raw ?? {}) as { toId?: unknown; kind?: unknown; note?: unknown };
  const toId = typeof body.toId === "string" ? body.toId.trim() : "";
  if (!toId) return NextResponse.json({ error: "toId required" }, { status: 400 });
  if (toId === params.id) return NextResponse.json({ error: "an idea cannot link to itself" }, { status: 400 });
  if (!(VENTURE_LINK_KINDS as readonly string[]).includes(body.kind as string)) {
    return NextResponse.json({ error: `kind must be one of ${VENTURE_LINK_KINDS.join(", ")}` }, { status: 400 });
  }
  const note = typeof body.note === "string" ? body.note.slice(0, NOTE_MAX) : "";

  try {
    const link = await linkVentures(prisma, params.id, toId, body.kind as VentureLinkKind, note);
    return NextResponse.json({ ok: true, id: link.id });
  } catch (error) {
    console.error("[ventures/links]", error);
    return NextResponse.json({ error: "Link failed — do both ids exist?" }, { status: 503 });
  }
}

/** DELETE ?linkId=… — remove one cross-reference. */
export async function DELETE(request: Request) {
  const linkId = new URL(request.url).searchParams.get("linkId")?.trim();
  if (!linkId) return NextResponse.json({ error: "linkId query required" }, { status: 400 });
  try {
    await unlinkVentures(prisma, linkId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[ventures/links/delete]", error);
    return NextResponse.json({ error: "Unlink failed" }, { status: 503 });
  }
}
