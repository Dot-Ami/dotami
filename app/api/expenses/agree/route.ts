import { NextResponse } from "next/server";

import {
  AGREE_ONLY_MESSAGE,
  parseIdsBody,
  readBody,
  refuseUnlessFromAppPage,
  storeErrorResponse,
  throttle,
} from "@/lib/expenses/http";
import { agreeToExpenses } from "@/lib/expenses/store";
import { localToday } from "@/lib/figures/age";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RATE_LIMIT = { limit: 60, windowMs: 60_000 };
// Edits can carry words, so more room than the figures' agree route; still small.
const MAX_BODY_BYTES = 512 * 1024;

/**
 * POST /api/expenses/agree { ventureId?, expenseIds, edits?: { [id]: { amountCents?, date?, paidTo?, whatFor?, category?, sellerAddress?, vendorGstNumber?, gstHstCents?, creditNote?, businessSharePercent? } } }
 *
 * `ventureId` narrows which records may be agreed to: an idea's id, null for the records not attached
 * to an idea, or left out for any of the person's (the Expenses screen agrees to a typed batch at once).
 *
 * THE PERSON'S CLICK. This is the only way a proposed record becomes a confirmed one, and it
 * answers only to DotAmi's own page (`Sec-Fetch-Site: same-origin`); see `refuseUnlessFromAppPage`
 * (lib/figures/http.ts) for what that does and doesn't stop. Importers, the Lens and outside
 * agents use /api/expenses/propose and wait for the person to agree.
 */
export async function POST(request: Request) {
  const limited = throttle(request, "agree", RATE_LIMIT);
  if (limited) return limited;

  // Checked before the body is read: a request that isn't from the app's page gets nothing.
  const notFromApp = refuseUnlessFromAppPage(request, AGREE_ONLY_MESSAGE);
  if (notFromApp) return notFromApp;

  const read = await readBody(request, MAX_BODY_BYTES);
  if ("refusal" in read) return read.refusal;

  const parsed = parseIdsBody(read.body);
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const edits = (read.body as { edits?: unknown }).edits;

  try {
    const { changed, skipped } = await agreeToExpenses(prisma, parsed.ventureId, parsed.expenseIds, edits, localToday());
    return NextResponse.json({ expenses: changed, skipped });
  } catch (error) {
    return storeErrorResponse("agree", error);
  }
}
