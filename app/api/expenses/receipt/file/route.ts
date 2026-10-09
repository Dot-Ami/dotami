import { NextResponse } from "next/server";

import { logRouteError } from "@/lib/api/log-error";
import { readBody, refuseUnlessFromAppPage, throttle } from "@/lib/expenses/http";
import { RECEIPT_FILE_HEADERS } from "@/lib/expenses/receipts/file-headers";
import { readReceiptFile, ReceiptError, receiptsFolder } from "@/lib/expenses/receipts/store";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Opening receipts one after another; generous, but a loop reading every receipt is slowed down.
const RATE_LIMIT = { limit: 60, windowMs: 60_000 };
const MAX_BODY_BYTES = 4 * 1024;

const PAGE_ONLY_MESSAGE = "Only DotAmi's own window can open a receipt. An agent or another program can't.";

/**
 * POST /api/expenses/receipt/file { expenseId }
 *
 * A record's receipt bytes, for the receipt viewer on the Expenses page. A POST with a JSON body, so
 * no link, picture, frame or window can load it as an address; it answers only DotAmi's own page (an
 * agent can't read a receipt). The file's path is built from the record's row; its size and SHA-256
 * must match what was kept (lib/expenses/receipts/store.ts readReceiptFile). Nothing about the file
 * goes in the log.
 */
export async function POST(request: Request) {
  const limited = throttle(request, "receipt-file", RATE_LIMIT);
  if (limited) return limited;

  const notFromApp = refuseUnlessFromAppPage(request, PAGE_ONLY_MESSAGE);
  if (notFromApp) return notFromApp;

  const read = await readBody(request, MAX_BODY_BYTES);
  if ("refusal" in read) return read.refusal;
  const body = (typeof read.body === "object" && read.body !== null ? read.body : {}) as { expenseId?: unknown };

  try {
    const { bytes } = await readReceiptFile(prisma, receiptsFolder(), body.expenseId);
    return new Response(new Uint8Array(bytes), { status: 200, headers: { ...RECEIPT_FILE_HEADERS, "Content-Length": String(bytes.length) } });
  } catch (error) {
    if (error instanceof ReceiptError) return NextResponse.json({ error: error.message }, { status: error.status });
    logRouteError("expenses/receipt/file", error);
    return NextResponse.json({ error: "The receipt couldn't be read: the data folder couldn't be reached." }, { status: 503 });
  }
}
