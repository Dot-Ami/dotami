import { NextResponse } from "next/server";

import { PayloadTooLargeError, payloadTooLargeResponse, readJsonWithLimit } from "@/lib/api/body-limit";
import { checkRateLimit, clientKeyFromRequest, rateLimitResponse } from "@/lib/api/rate-limit";
import { ensureVentureFromScenario } from "@/lib/db/ensure-venture-from-scenario";
import { parseScenarioInput } from "@/lib/db/parse-scenario-input";
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
    if (error instanceof PayloadTooLargeError) return payloadTooLargeResponse(error);
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const scenario = parseScenarioInput(body);
  if (!scenario) {
    return NextResponse.json({ error: "Invalid scenario payload" }, { status: 400 });
  }

  try {
    const { ventureId } = await ensureVentureFromScenario(prisma, scenario);
    return NextResponse.json({ ok: true as const, ventureId });
  } catch (error) {
    console.error("[scenario/save]", error);
    return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
  }
}
