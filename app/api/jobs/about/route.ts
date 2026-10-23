import { NextResponse } from "next/server";

import { aboutJobForAnswers } from "@/lib/about-job/view";
import { guardRead, readBody } from "@/lib/futures/http";
import { isRecord } from "@/lib/futures/types";
import { PROVINCES, type Province } from "@/lib/scenarios/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Asked once each time step 3 shows the no-road block, and again after a back-and-forth: far under this. */
const RATE_LIMIT = { limit: 300, windowMs: 60_000 };
/** A job code, a province, an area and a region: a few short strings. */
const MAX_BODY_BYTES = 1024;
/** The longest answer accepted for each; anything longer is refused, not cut. */
const MAX_ANSWER_CHARS = 32;

const answer = (value: unknown): string | null | undefined =>
  value === null || value === undefined ? null : typeof value === "string" && value.length <= MAX_ANSWER_CHARS ? value : undefined;

/**
 * POST /api/jobs/about { job: "63210.02", province: "AB", area: "cma-825" | null, region: "4830" | null } — *About
 * this job* for Pick a future's step 3 when no road is written for the picked job (docs/ui-spec/futures/
 * 03-road-match.md, case B; task 28c): the same rows as the cockpit's panel (lib/about-job/view.ts), for the
 * answers on screen so far.
 *
 * Read here, on DotAmi's own server on the person's computer, so the NOC lines and the wage file (about 2 MB
 * each) never go into a page's code. A POST, so the answers never sit in an address or a log line; nothing here
 * keeps them (the steps save nothing until a future is opened). The region is only ever the person's answer:
 * an answer that isn't on the list reads as not picked, and nothing is worked out from the area.
 */
export async function POST(request: Request) {
  const refused = guardRead(request, "jobs-about", RATE_LIMIT);
  if (refused) return refused;

  const read = await readBody(request, MAX_BODY_BYTES);
  if ("refusal" in read) return read.refusal;
  const body = read.body;
  if (!isRecord(body) || typeof body.job !== "string" || body.job.length > MAX_ANSWER_CHARS) {
    return NextResponse.json({ error: "Say which job, by its code." }, { status: 400 });
  }
  if (typeof body.province !== "string" || !(PROVINCES as readonly string[]).includes(body.province)) {
    return NextResponse.json({ error: "Say which province or territory." }, { status: 400 });
  }
  const area = answer(body.area);
  const region = answer(body.region);
  if (area === undefined || region === undefined) {
    return NextResponse.json({ error: "The area and the region are short answers, or none." }, { status: 400 });
  }

  const aboutJob = aboutJobForAnswers({ job: body.job, province: body.province as Province, area, region });
  if (!aboutJob) return NextResponse.json({ error: "That isn't a job on the government's list." }, { status: 404 });
  return NextResponse.json({ aboutJob });
}
