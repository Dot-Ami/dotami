import { NextResponse } from "next/server";

import { readJsonWithLimit, rejectedResponse, RequestRejectedError } from "@/lib/api/body-limit";
import { logRouteError } from "@/lib/api/log-error";
import { checkRateLimit, clientKeyFromRequest, rateLimitResponse } from "@/lib/api/rate-limit";
import { ensureVentureFromScenario } from "@/lib/db/ensure-venture-from-scenario";
import { parseFirstSave, parseScenarioInput } from "@/lib/db/parse-scenario-input";
import { loadVentureScenarioById } from "@/lib/db/ventures";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Autosave is debounced client-side; 120/min per client is far above any honest rate. */
const RATE_LIMIT = { limit: 120, windowMs: 60_000 };
/** A saved scenario is a few KB; this is a ceiling, not a target. */
const MAX_BODY_BYTES = 128 * 1024;

export async function POST(request: Request) {
  const rateLimit = checkRateLimit(`scenario-save:${clientKeyFromRequest(request)}`, RATE_LIMIT);
  if (!rateLimit.allowed) return rateLimitResponse(rateLimit);

  let body: unknown;
  try {
    body = await readJsonWithLimit<unknown>(request, MAX_BODY_BYTES);
  } catch (error) {
    if (error instanceof RequestRejectedError) return rejectedResponse(error);
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const scenario = parseScenarioInput(body);
  if (!scenario) {
    return NextResponse.json({ error: "Invalid scenario payload" }, { status: 400 });
  }

  // The intake's first save also carries the typed sentence and the goal picks; the cockpit's
  // autosaves carry neither. Kept only when this save creates the idea.
  const firstSave = parseFirstSave(body, new Date());

  try {
    const { ventureId } = await ensureVentureFromScenario(prisma, scenario, firstSave);
    // The idea as the data file now holds it, read back the way a reload reads it, so the cockpit builds
    // a receipt from what was kept, never from what it sent (2026-10-12).
    const kept = await loadVentureScenarioById(prisma, ventureId);
    return NextResponse.json({ ok: true as const, ventureId, scenario: kept });
  } catch (error) {
    logRouteError("scenario/save", error);
    return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
  }
}
