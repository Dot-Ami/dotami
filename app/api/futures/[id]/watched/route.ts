import { NextResponse } from "next/server";

import { guardWatched, readBody, watchedFailure } from "@/lib/landscape/http";
import { addWatched, listWatched } from "@/lib/landscape/watched";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The panel reads the list when it opens and after each change; the caps stop a runaway loop, not a person.
const READ_LIMIT = { limit: 300, windowMs: 60_000 };
const ADD_LIMIT = { limit: 60, windowMs: 60_000 };
// A name, a link, a note of up to 2,000 characters and up to 20 ad links of up to 2,048 characters each:
// about 45 KB at the very most, so 64 KB leaves room for JSON's quoting and nothing more.
const MAX_BODY_BYTES = 64 * 1024;

/**
 * GET /api/futures/<idea id>/watched — the businesses the person is watching for this idea, in the order they
 * added them (docs/ui-spec/cockpit/landscape.md). Only from DotAmi's own window.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const refused = guardWatched(request, "watched-read", READ_LIMIT);
  if (refused) return refused;
  const { id } = await params;
  try {
    return NextResponse.json({ businesses: await listWatched(prisma, id) });
  } catch (error) {
    return watchedFailure("futures/watched GET", error);
  }
}

/**
 * POST /api/futures/<idea id>/watched { nameAsTyped, url?, note?, adLinks?: [{ url, seenOn }] } — adds a
 * business to the end of the idea's list. Links are http: or https: only; anything else is refused with
 * nothing kept (lib/landscape/links.ts). Answers the business as kept. Only from DotAmi's own window.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const refused = guardWatched(request, "watched-add", ADD_LIMIT);
  if (refused) return refused;
  const { id } = await params;

  const read = await readBody(request, MAX_BODY_BYTES);
  if ("refusal" in read) return read.refusal;

  try {
    return NextResponse.json({ business: await addWatched(prisma, id, read.body) });
  } catch (error) {
    return watchedFailure("futures/watched POST", error);
  }
}
