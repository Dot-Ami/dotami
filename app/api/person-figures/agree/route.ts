import { NextResponse } from "next/server";

import { checkRateLimit, clientKeyFromRequest, rateLimitResponse } from "@/lib/api/rate-limit";
import { refuseUnlessFromAppPage } from "@/lib/figures/http";
import { futureFailure, readBody } from "@/lib/futures/http";
import { agreeToPersonFigures } from "@/lib/futures/person-figures";
import { isRecord } from "@/lib/futures/types";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RATE_LIMIT = { limit: 60, windowMs: 60_000 };
const MAX_BODY_BYTES = 8 * 1024;

const AGREE_ONLY = "Only the agree prompt in DotAmi's window can agree to a number about you.";

/**
 * POST /api/person-figures/agree { ids, edits?: { [id]: { amountCents } } }
 *
 * THE PERSON'S CLICK. The only way a proposed number about the person becomes one they agreed to, and
 * it answers only DotAmi's own page (`Sec-Fetch-Site: same-origin`), like /api/figures/agree; see
 * `refuseUnlessFromAppPage` for what that does and doesn't stop. Agreeing takes back the one agreed
 * before it, which stays in the history (lib/futures/person-figures.ts).
 */
export async function POST(request: Request) {
  // Checked before anything else is read: a request that isn't from the app's page gets nothing.
  const notFromApp = refuseUnlessFromAppPage(request, AGREE_ONLY);
  if (notFromApp) return notFromApp;
  const limited = checkRateLimit(`person-figures-agree:${clientKeyFromRequest(request)}`, RATE_LIMIT);
  if (!limited.allowed) return rateLimitResponse(limited);

  const read = await readBody(request, MAX_BODY_BYTES);
  if ("refusal" in read) return read.refusal;
  const body = isRecord(read.body) ? read.body : {};
  const edits = body.edits;
  if (edits !== undefined && !isRecord(edits)) {
    return NextResponse.json({ error: "Edits have to be an object keyed by the number's id." }, { status: 400 });
  }

  try {
    const { changed, skipped } = await agreeToPersonFigures(prisma, body.ids, (edits ?? {}) as Record<string, { amountCents: number }>);
    return NextResponse.json({ figures: changed, skipped });
  } catch (error) {
    return futureFailure("person-figures/agree", error);
  }
}
