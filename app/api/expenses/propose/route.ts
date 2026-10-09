import { NextResponse } from "next/server";

import { readBody, storeErrorResponse, throttle } from "@/lib/expenses/http";
import { proposeExpenses } from "@/lib/expenses/store";
import { localToday } from "@/lib/figures/age";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RATE_LIMIT = { limit: 30, windowMs: 60_000 };
// 500 records at roughly 1 KB each (the longest words allowed come to about 700 bytes), with room to spare.
const MAX_BODY_BYTES = 768 * 1024;

/** Keys that would let a caller pick a record's state instead of leaving it to the person. */
const FORBIDDEN_KEYS = ["status", "agreedAt", "retractedAt", "editedByPerson"] as const;

const REFUSAL = "Expenses can only be proposed here. Confirming is the person's click in the agree prompt.";

function carriesForbiddenKey(value: unknown): boolean {
  return (
    typeof value === "object" &&
    value !== null &&
    FORBIDDEN_KEYS.some((key) => Object.prototype.hasOwnProperty.call(value, key))
  );
}

/**
 * POST /api/expenses/propose { ventureId: <idea id> | null, source: { kind, label }, expenses: [...] }
 *
 * Open to DotAmi's own page (the typing screen) and to importers, the Lens and outside agents —
 * the same as /api/figures/propose. It can create "proposed" records and nothing else: a body or a
 * record that tries to name a status, an agreed time or an "edited by the person" flag is refused
 * outright, with nothing created. Confirming happens in /api/expenses/agree, from the app's own page.
 */
export async function POST(request: Request) {
  const limited = throttle(request, "propose", RATE_LIMIT);
  if (limited) return limited;

  const read = await readBody(request, MAX_BODY_BYTES);
  if ("refusal" in read) return read.refusal;

  const body = (typeof read.body === "object" && read.body !== null ? read.body : {}) as {
    ventureId?: unknown;
    source?: unknown;
    expenses?: unknown;
  };

  if (
    carriesForbiddenKey(body) ||
    carriesForbiddenKey(body.source) ||
    (Array.isArray(body.expenses) && body.expenses.some(carriesForbiddenKey))
  ) {
    return NextResponse.json({ error: REFUSAL }, { status: 400 });
  }
  // The idea is optional since the maintainer's decisions (2026-10-08), but it has to be said: an
  // idea's id, or null to keep the records "not attached yet". A body that leaves it out is refused,
  // so a caller that forgot it doesn't quietly create unattached records.
  const ventureId = body.ventureId;
  if (ventureId !== null && (typeof ventureId !== "string" || ventureId.length === 0)) {
    return NextResponse.json(
      { error: "Say which idea this is for, or send null to keep the records not attached to an idea yet." },
      { status: 400 },
    );
  }

  try {
    // "Not in the future" is measured against the computer's own calendar day, which in the desktop
    // app and a self-hosted copy is the person's day. The UTC day runs ahead of a Canadian evening,
    // so it would accept a purchase dated "tomorrow" for the person.
    const expenses = await proposeExpenses(prisma, ventureId, body.source, body.expenses, localToday());
    return NextResponse.json({ expenses }, { status: 201 });
  } catch (error) {
    return storeErrorResponse("propose", error);
  }
}
