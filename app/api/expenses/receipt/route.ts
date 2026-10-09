import { NextResponse } from "next/server";

import { logRouteError } from "@/lib/api/log-error";
import { readBody, refuseUnlessFromAppPage, throttle } from "@/lib/expenses/http";
import { addReceipt, ReceiptError, receiptsFolder } from "@/lib/expenses/receipts/store";
import { MAX_RECEIPT_BYTES } from "@/lib/expenses/receipts/types";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Adding a receipt is a click per file; this leaves room for a person working through a pile.
const RATE_LIMIT = { limit: 30, windowMs: 60_000 };
// The file travels as base64 inside the JSON body (every write route reads JSON through
// readJsonWithLimit): 4 characters for every 3 bytes of a 10 MB file, plus room for the field names.
const MAX_BODY_BYTES = Math.ceil(MAX_RECEIPT_BYTES / 3) * 4 + 1024;

const PAGE_ONLY_MESSAGE =
  "Only DotAmi's own window can add a receipt. An agent or another program can't, and nothing was kept.";

/** Standard base64, nothing else: Buffer would quietly skip characters that don't belong. */
const BASE64 = /^[A-Za-z0-9+/]*={0,2}$/;

/**
 * POST /api/expenses/receipt { expenseId, file: "<base64 of the file's bytes>" }
 *
 * Keeps a copy of a receipt file for one of the person's agreed records (lib/expenses/receipts/store.ts:
 * the type is read from the bytes, at most 10 MB, a name DotAmi makes up). Answers only to DotAmi's own
 * page: an agent may propose records, never add or read a receipt, and a receipt never leaves the
 * computer (the maintainer's decision). The file's name isn't sent or kept. Nothing about the file or
 * the record goes in the address or the log.
 */
export async function POST(request: Request) {
  const limited = throttle(request, "receipt", RATE_LIMIT);
  if (limited) return limited;

  // Checked before the body is read: a request that isn't from the app's page gets nothing.
  const notFromApp = refuseUnlessFromAppPage(request, PAGE_ONLY_MESSAGE);
  if (notFromApp) return notFromApp;

  const read = await readBody(request, MAX_BODY_BYTES);
  if ("refusal" in read) {
    // The body cap is the file cap, said in the same words as the window says it.
    if (read.refusal.status === 413) {
      return NextResponse.json({ error: "That file is over 10 MB, the most a receipt can be." }, { status: 413 });
    }
    return read.refusal;
  }
  const body = (typeof read.body === "object" && read.body !== null ? read.body : {}) as { expenseId?: unknown; file?: unknown };
  if (typeof body.file !== "string" || body.file.length % 4 !== 0 || !BASE64.test(body.file)) {
    return NextResponse.json({ error: "Send the receipt's bytes as base64 in `file`." }, { status: 400 });
  }
  const bytes = new Uint8Array(Buffer.from(body.file, "base64"));

  try {
    const expense = await addReceipt(prisma, receiptsFolder(), body.expenseId, bytes);
    return NextResponse.json({ expense });
  } catch (error) {
    if (error instanceof ReceiptError) return NextResponse.json({ error: error.message }, { status: error.status });
    logRouteError("expenses/receipt", error);
    return NextResponse.json({ error: "The receipt couldn't be kept: the data folder couldn't be reached. Nothing was changed." }, { status: 503 });
  }
}
