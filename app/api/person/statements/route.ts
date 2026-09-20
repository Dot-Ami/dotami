import { NextResponse } from "next/server";

import { addTypedStatement, listTypedStatements } from "@/lib/person/statements";
import {
  isValidSaidAt,
  sortStatementsNewestFirst,
  STATEMENT_MAX_CHARS,
  type PersonStatement,
} from "@/lib/person/types";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET — everything DotAmi currently holds about the person: typed rows from Postgres, newest
 * first. The database half fails soft and SAYS SO in the response, so the surface can show
 * "saving is off" instead of an empty list that looks like "nothing on record".
 * (`vault` is kept in the shape for compatibility; a self-hosted build may add its own
 * read-only source of statements behind it.)
 */
export interface StatementsResponse {
  statements: PersonStatement[];
  db: { available: boolean; reason?: string };
  vault: { available: boolean; reason?: string };
}

export async function GET() {
  let typed: PersonStatement[] = [];
  let db: StatementsResponse["db"] = { available: true };
  try {
    typed = await listTypedStatements(prisma);
  } catch (error) {
    console.error("[person/statements] list failed", error);
    db = { available: false, reason: "No database reachable — nothing typed here will be saved." };
  }

  const body: StatementsResponse = {
    statements: sortStatementsNewestFirst(typed),
    db,
    vault: { available: false, reason: "No external statement source configured." },
  };
  return NextResponse.json(body);
}

/** POST { text, saidAt? } — appends one verbatim statement. `saidAt` defaults to today (UTC). */
export async function POST(request: Request) {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const body = (raw ?? {}) as { text?: unknown; saidAt?: unknown };
  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (text.length === 0) {
    return NextResponse.json({ error: "Say something first — the statement is empty." }, { status: 400 });
  }
  if (text.length > STATEMENT_MAX_CHARS) {
    return NextResponse.json(
      { error: `Keep it under ${STATEMENT_MAX_CHARS} characters — split it into two if you need to.` },
      { status: 400 },
    );
  }

  // The client sends its LOCAL calendar day; the server only knows UTC. Allow one day of
  // slack so no timezone's "today" is rejected as "the future".
  const today = new Date().toISOString().slice(0, 10);
  const latestAllowed = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const saidAt = body.saidAt === undefined ? today : body.saidAt;
  if (!isValidSaidAt(saidAt, latestAllowed)) {
    return NextResponse.json(
      { error: "The date has to be a real day, written YYYY-MM-DD, and not in the future." },
      { status: 400 },
    );
  }

  try {
    const statement = await addTypedStatement(prisma, { text, saidAt });
    return NextResponse.json({ ok: true as const, statement });
  } catch (error) {
    console.error("[person/statements] save failed", error);
    return NextResponse.json(
      { error: "No database reachable — not saved. It stays in this tab only." },
      { status: 503 },
    );
  }
}
