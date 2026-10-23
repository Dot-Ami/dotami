import { NextResponse } from "next/server";

import { guardRead, readBody } from "@/lib/futures/http";
import { isRecord } from "@/lib/futures/types";
import { searchJobTitles } from "@/lib/engines/oasis/v2026/title-search";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The box sends a search a short pause after the last key; 600 a minute is far above any honest typing. */
const RATE_LIMIT = { limit: 600, windowMs: 60_000 };
/** What the box holds, in JSON: a few words. The cap leaves room for a long sentence and nothing more. */
const MAX_BODY_BYTES = 4 * 1024;
/** The longest query searched; anything longer is refused, not cut. */
const MAX_QUERY_CHARS = 500;

/**
 * POST /api/jobs/search { query: "barber" } — "What's closest to your work?" (docs/ui-spec/futures/
 * 01-whats-closest-to-your-work.md): the government's example job titles searched for the person's words,
 * grouped by how many of them a job's titles hold, in code order inside each group, with DotAmi's word list's
 * finds in their own last group (lib/engines/oasis/v2026/title-search.ts `searchJobTitles`).
 *
 * The search runs here, on DotAmi's own server on the person's computer, so the titles (about 1 MB) never go into
 * a page's code: Pick a future, the intake and the cockpit's skills list all ask this one route, so there is one
 * picker. A POST, so the typed words never sit in an address or a log line; nothing here keeps them, and nothing
 * is picked: the answer is a list for the person to click.
 */
export async function POST(request: Request) {
  const refused = guardRead(request, "jobs-search", RATE_LIMIT);
  if (refused) return refused;

  const read = await readBody(request, MAX_BODY_BYTES);
  if ("refusal" in read) return read.refusal;
  if (!isRecord(read.body) || typeof read.body.query !== "string" || read.body.query.length > MAX_QUERY_CHARS) {
    return NextResponse.json({ error: "Send the words to search, as text." }, { status: 400 });
  }
  return NextResponse.json({ search: searchJobTitles(read.body.query) });
}
