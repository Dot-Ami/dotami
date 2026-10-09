import { NextResponse } from "next/server";

import { BANK_SOURCES_PAGE_ONLY, bankSourcesFailure, readBody, refuseUnlessFromAppPage, throttle } from "@/lib/figures/http";
import { allowAccount, readBankSources } from "@/lib/figures/source-accounts";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RATE_LIMIT = { limit: 60, windowMs: 60_000 };
// A name of at most 60 characters, a button and an id: 4 KB is far more than that needs.
const MAX_BODY_BYTES = 4 * 1024;

/**
 * [8g] GET /api/figures/bank-sources — `{ on, everyAccountSince, accounts }`: whether "Bank and card
 * records" is on, the day "Always allow every account" was pressed (or null), and the accounts in
 * use, each with the person's name for it, the button pressed and the day agreed.
 *
 * Page-only, like the settings routes: the names are the person's own words, and which agents may
 * see or change them is a later decision. Under /api/figures so the browser tests' privacy checks
 * on that path cover it.
 */
export async function GET(request: Request) {
  const limited = throttle(request, "bank-sources", RATE_LIMIT);
  if (limited) return limited;
  const notFromApp = refuseUnlessFromAppPage(request, BANK_SOURCES_PAGE_ONLY);
  if (notFromApp) return notFromApp;

  try {
    return NextResponse.json(await readBankSources(prisma));
  } catch (error) {
    return bankSourcesFailure("figures/bank-sources GET", error);
  }
}

/**
 * POST /api/figures/bank-sources { allow: "once" | "always" | "every", name } for a new account, or
 * { allow, id } for one already listed — the person's answer to the statement warning. Refused
 * (409) while the setting is off; a name holding an account number (any run of four or more
 * digits other than "ending" plus four at the end) is refused (400) with nothing written. Answers
 * `{ account, ...state }`: the account as listed, and the list as it now stands.
 */
export async function POST(request: Request) {
  const limited = throttle(request, "bank-sources", RATE_LIMIT);
  if (limited) return limited;
  const notFromApp = refuseUnlessFromAppPage(request, BANK_SOURCES_PAGE_ONLY);
  if (notFromApp) return notFromApp;

  const read = await readBody(request, MAX_BODY_BYTES);
  if ("refusal" in read) return read.refusal;

  try {
    const account = await allowAccount(prisma, read.body);
    return NextResponse.json({ account, ...(await readBankSources(prisma)) });
  } catch (error) {
    return bankSourcesFailure("figures/bank-sources POST", error);
  }
}
