import { NextResponse } from "next/server";

import { failure, pageOnly, readBody, throttle, type ErrorStatuses } from "@/lib/api/route";
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
  return pageOnly(request, PAGE_ONLY_MESSAGE) ?? throttle("settings", request, RATE_LIMIT);
}

/** A value the store refuses is told in the store's own words; anything else is a logged 503. */
const SETTING_ERRORS: ErrorStatuses = [[SettingInputError, 400]];

/** GET /api/settings?id=<setting id> — `{ id, value }`: what was saved, or the setting's default. */
export async function GET(request: Request) {
  const refused = guard(request);
  if (refused) return refused;

  const id = new URL(request.url).searchParams.get("id");
  if (!isLiveSettingId(id)) return NextResponse.json({ error: "Say which setting: ?id=<setting id>." }, { status: 400 });

  try {
    return NextResponse.json({ id, value: await readSetting(prisma, id) });
  } catch (error) {
    return failure("settings GET", error, SETTING_ERRORS);
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

  const read = await readBody(request, MAX_BODY_BYTES);
  if ("refusal" in read) return read.refusal;
  const body = read.body;

  const { id, value } = (typeof body === "object" && body !== null ? body : {}) as { id?: unknown; value?: unknown };
  if (!isLiveSettingId(id)) return NextResponse.json({ error: "That isn't a setting DotAmi can save." }, { status: 400 });

  try {
    return NextResponse.json({ id, value: await writeSetting(prisma, id, value) });
  } catch (error) {
    return failure("settings PUT", error, SETTING_ERRORS);
  }
}
