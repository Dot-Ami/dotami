import { NextResponse } from "next/server";

import { logRouteError } from "@/lib/api/log-error";
import { readBody, throttle } from "@/lib/api/route";
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
  const limited = throttle("scenario-save", request, RATE_LIMIT);
  if (limited) return limited;

  const read = await readBody(request, MAX_BODY_BYTES);
  if ("refusal" in read) return read.refusal;
  const body = read.body;

  const scenario = parseScenarioInput(body);
  if (!scenario) {
    return NextResponse.json({ error: "Invalid scenario payload" }, { status: 400 });
  }

  // The intake's first save also carries the typed sentence and the goal picks; the cockpit's
  // autosaves carry neither. Kept only when this save creates the idea.
  const firstSave = parseFirstSave(body, new Date(), scenario.profile.province);

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
