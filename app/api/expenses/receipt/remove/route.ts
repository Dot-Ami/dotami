import { NextResponse } from "next/server";

import { logRouteError } from "@/lib/api/log-error";
import { readBody, refuseUnlessFromAppPage, throttle } from "@/lib/expenses/http";
import { ReceiptError, receiptsFolder, removeReceipt } from "@/lib/expenses/receipts/store";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RATE_LIMIT = { limit: 30, windowMs: 60_000 };
const MAX_BODY_BYTES = 4 * 1024;

const PAGE_ONLY_MESSAGE = "Only DotAmi's own window can remove a receipt. An agent or another program can't, and nothing was removed.";

/**
 * POST /api/expenses/receipt/remove { expenseId }
 *
 * Removes one record's receipt: its row, then its file in the receipts folder (a file that can't go at
 * once is removed by the next sweep). The record itself stays, marked "no receipt". Answers only to
 * DotAmi's own page, like adding one.
 */
export async function POST(request: Request) {
  const limited = throttle(request, "receipt-remove", RATE_LIMIT);
  if (limited) return limited;

  const notFromApp = refuseUnlessFromAppPage(request, PAGE_ONLY_MESSAGE);
  if (notFromApp) return notFromApp;

  const read = await readBody(request, MAX_BODY_BYTES);
  if ("refusal" in read) return read.refusal;
  const body = (typeof read.body === "object" && read.body !== null ? read.body : {}) as { expenseId?: unknown };

  try {
    const expense = await removeReceipt(prisma, receiptsFolder(), body.expenseId);
    return NextResponse.json({ expense });
  } catch (error) {
    if (error instanceof ReceiptError) return NextResponse.json({ error: error.message }, { status: error.status });
    logRouteError("expenses/receipt/remove", error);
    return NextResponse.json({ error: "The data file couldn't be reached, so nothing was removed." }, { status: 503 });
  }
}
