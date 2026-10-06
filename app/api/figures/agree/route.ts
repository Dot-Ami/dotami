import { NextResponse } from "next/server";

import { parseIdsBody, readBody, refuseUnlessFromAppPage, storeErrorResponse, throttle } from "@/lib/figures/http";
import { agreeToFigures } from "@/lib/figures/store";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RATE_LIMIT = { limit: 60, windowMs: 60_000 };
const MAX_BODY_BYTES = 64 * 1024;

/**
 * POST /api/figures/agree { ventureId, figureIds, edits?: { [id]: { amountCents } } }
 *
 * THE PERSON'S CLICK. This is the only way a proposed figure becomes a confirmed one, and it
 * answers only to DotAmi's own page (`Sec-Fetch-Site: same-origin`); see
 * `refuseUnlessFromAppPage` for what that does and doesn't stop. Importers, the Lens and
 * outside agents use /api/figures/propose and wait for the person to agree.
 */
export async function POST(request: Request) {
  const limited = throttle(request, "agree", RATE_LIMIT);
  if (limited) return limited;

  // Checked before the body is read: a request that isn't from the app's page gets nothing.
  const notFromApp = refuseUnlessFromAppPage(request);
  if (notFromApp) return notFromApp;

  const read = await readBody(request, MAX_BODY_BYTES);
  if ("refusal" in read) return read.refusal;

  const parsed = parseIdsBody(read.body);
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const edits = (read.body as { edits?: unknown }).edits;
  if (edits !== undefined && (typeof edits !== "object" || edits === null || Array.isArray(edits))) {
    return NextResponse.json({ error: "Edits have to be an object keyed by figure id." }, { status: 400 });
  }

  try {
    const { changed, skipped } = await agreeToFigures(
      prisma,
      parsed.ventureId,
      parsed.figureIds,
      (edits ?? {}) as Record<string, { amountCents: number }>,
    );
    return NextResponse.json({ figures: changed, skipped });
  } catch (error) {
    return storeErrorResponse("agree", error);
  }
}
