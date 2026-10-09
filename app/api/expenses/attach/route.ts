import { NextResponse } from "next/server";

import { readBody, refuseUnlessFromAppPage, storeErrorResponse, throttle } from "@/lib/expenses/http";
import { attachExpenses } from "@/lib/expenses/store";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RATE_LIMIT = { limit: 60, windowMs: 60_000 };
const MAX_BODY_BYTES = 64 * 1024;

const ATTACH_ONLY_MESSAGE = "Only DotAmi's own window can move expense records between ideas.";

/**
 * POST /api/expenses/attach { expenseIds, ventureId: <idea id> | null }
 *
 * Attaches records to an idea, or with null puts them back to "not attached yet" (the maintainer's
 * decision, 2026-10-08: a record can be kept without an idea and attached later). Like agreeing, it
 * is the person's own act and answers only to DotAmi's own page; an agent picks an idea when it
 * proposes, and that proposal still waits for the person. `ventureId` is required here, null
 * included, so a body that forgot it never detaches anything.
 */
export async function POST(request: Request) {
  const limited = throttle(request, "attach", RATE_LIMIT);
  if (limited) return limited;

  // Checked before the body is read: a request that isn't from the app's page gets nothing.
  const notFromApp = refuseUnlessFromAppPage(request, ATTACH_ONLY_MESSAGE);
  if (notFromApp) return notFromApp;

  const read = await readBody(request, MAX_BODY_BYTES);
  if ("refusal" in read) return read.refusal;

  const body = (typeof read.body === "object" && read.body !== null ? read.body : {}) as { ventureId?: unknown; expenseIds?: unknown };
  const target = body.ventureId;
  if (target !== null && (typeof target !== "string" || target.length === 0)) {
    return NextResponse.json({ error: "Say which idea to attach them to, or null for not attached yet." }, { status: 400 });
  }

  try {
    const { changed, skipped } = await attachExpenses(prisma, body.expenseIds, target);
    return NextResponse.json({ expenses: changed, skipped });
  } catch (error) {
    return storeErrorResponse("attach", error);
  }
}
