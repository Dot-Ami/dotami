import { NextResponse } from "next/server";

import { BANK_SOURCES_PAGE_ONLY, bankSourcesFailure, readBody, refuseUnlessFromAppPage, throttle } from "@/lib/figures/http";
import { readBankSources, retireAccount, takeBackEveryAccount } from "@/lib/figures/source-accounts";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RATE_LIMIT = { limit: 60, windowMs: 60_000 };
const MAX_BODY_BYTES = 4 * 1024;

/**
 * [8g] POST /api/figures/bank-sources/retire { id } — takes one account back: it leaves the list,
 * and its next statement starts over with the warning as a new account. { every: true } takes
 * "Always allow every account" back instead. Both work whether the setting is on or off: taking a
 * permission back is never blocked. Figures already read from the account's statements are left
 * alone (nothing links a figure to its account yet). Page-only: taking an account back is the
 * person's click in Settings. Answers the list as it now stands, like GET /api/figures/bank-sources.
 */
export async function POST(request: Request) {
  const limited = throttle(request, "bank-sources-retire", RATE_LIMIT);
  if (limited) return limited;
  const notFromApp = refuseUnlessFromAppPage(request, BANK_SOURCES_PAGE_ONLY);
  if (notFromApp) return notFromApp;

  const read = await readBody(request, MAX_BODY_BYTES);
  if ("refusal" in read) return read.refusal;
  const body = (typeof read.body === "object" && read.body !== null && !Array.isArray(read.body) ? read.body : {}) as Record<string, unknown>;
  const keys = Object.keys(body);

  try {
    if (keys.length === 1 && body.every === true) {
      await takeBackEveryAccount(prisma);
    } else if (keys.length === 1 && "id" in body) {
      await retireAccount(prisma, body.id);
    } else {
      return NextResponse.json({ error: "Say which account to take back ({ id }), or { every: true }." }, { status: 400 });
    }
    return NextResponse.json(await readBankSources(prisma));
  } catch (error) {
    return bankSourcesFailure("figures/bank-sources/retire", error);
  }
}
