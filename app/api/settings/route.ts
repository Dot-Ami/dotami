import { NextResponse } from "next/server";

import { readJsonWithLimit, rejectedResponse, RequestRejectedError } from "@/lib/api/body-limit";
import { logRouteError } from "@/lib/api/log-error";
import { checkRateLimit, clientKeyFromRequest, rateLimitResponse } from "@/lib/api/rate-limit";
import { refuseUnlessFromAppPage } from "@/lib/figures/http";
import { prisma } from "@/lib/prisma";
import { SettingInputError, readSetting, writeSetting } from "@/lib/settings/store";
import { isLiveSettingId } from "@/lib/settings/values";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RATE_LIMIT = { limit: 120, windowMs: 60_000 };
// A setting's value is a few short lists; 64 KB is far more than any of them can need.
const MAX_BODY_BYTES = 64 * 1024;

const PAGE_ONLY_MESSAGE =
  "Settings can only be changed from DotAmi's own window. An outside agent can't read or change them yet.";

/**
 * Settings are the person's own choices, and agent access to them is a later decision, so
 * both routes answer only DotAmi's own page — the same check the figure-agreeing routes use. A
 * program on this computer can still forge the header; it can also read the database file.
 */
function guard(request: Request): Response | null {
  const notFromApp = refuseUnlessFromAppPage(request, PAGE_ONLY_MESSAGE);
  if (notFromApp) return notFromApp;
  const result = checkRateLimit(`settings:${clientKeyFromRequest(request)}`, RATE_LIMIT);
  return result.allowed ? null : rateLimitResponse(result);
}

function failure(route: string, error: unknown): Response {
  if (error instanceof SettingInputError) return NextResponse.json({ error: error.message }, { status: 400 });
  logRouteError(route, error);
  return NextResponse.json({ error: "No database reachable — nothing was changed." }, { status: 503 });
}

/** GET /api/settings?id=<setting id> — `{ id, value }`: what was saved, or the setting's default. */
export async function GET(request: Request) {
  const refused = guard(request);
  if (refused) return refused;

  const id = new URL(request.url).searchParams.get("id");
  if (!isLiveSettingId(id)) return NextResponse.json({ error: "Say which setting: ?id=<setting id>." }, { status: 400 });

  try {
    return NextResponse.json({ id, value: await readSetting(prisma, id) });
  } catch (error) {
    return failure("settings GET", error);
  }
}

/**
 * PUT /api/settings { id, value } — saves the keys `value` names and leaves the setting's other
 * keys as they were (lib/settings/values.ts). An unknown id, a setting whose story isn't built, an
 * unknown key or a value of the wrong kind is refused with nothing saved. Answers the whole
 * setting as it now stands.
 */
export async function PUT(request: Request) {
  const refused = guard(request);
  if (refused) return refused;

  let body: unknown;
  try {
    body = await readJsonWithLimit<unknown>(request, MAX_BODY_BYTES);
  } catch (error) {
    if (error instanceof RequestRejectedError) return rejectedResponse(error);
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { id, value } = (typeof body === "object" && body !== null ? body : {}) as { id?: unknown; value?: unknown };
  if (!isLiveSettingId(id)) return NextResponse.json({ error: "That isn't a setting DotAmi can save." }, { status: 400 });

  try {
    return NextResponse.json({ id, value: await writeSetting(prisma, id, value) });
  } catch (error) {
    return failure("settings PUT", error);
  }
}
