import { NextResponse } from "next/server";

import { logRouteError } from "@/lib/api/log-error";
import { readBody, refuseUnlessFromAppPage, throttle } from "@/lib/expenses/http";
import { receiptLock } from "@/lib/expenses/receipts/lock";
import { startNewReceiptKey } from "@/lib/expenses/receipts/new-key";
import { ReceiptError } from "@/lib/expenses/receipts/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Pressed once, after two warnings; a few a minute is plenty.
const RATE_LIMIT = { limit: 5, windowMs: 60_000 };
// The body is { "giveUp": true }: a few bytes. 1 KB leaves room and no more.
const MAX_BODY_BYTES = 1024;

const PAGE_ONLY_MESSAGE =
  "Only DotAmi's own window can start a new key for your receipts. An agent or another program can't, and nothing was moved.";

/**
 * POST /api/expenses/receipt/new-key { giveUp: true }
 *
 * "Start a new key" (docs/architecture/expense-records.md § 10): while the receipts' key can't be
 * opened, moves the receipts locked with it, and the key file, into backups/receipts-locked-<time>/
 * (never deleted), and answers { movedTo, receipts, keyFile }. The desktop app makes the new key at its
 * next start. Refused (409, nothing moved) unless this server's key can't be opened.
 *
 * Answers only to DotAmi's own page, like agreeing and deleting: giving up receipts is the person's
 * click, after the page has asked twice, and nothing else's. `giveUp: true` is that click, said in the
 * body; anything else moves nothing. The log gets the error's name and code only, never a path.
 */
export async function POST(request: Request) {
  const limited = throttle(request, "receipt-new-key", RATE_LIMIT);
  if (limited) return limited;

  const notFromApp = refuseUnlessFromAppPage(request, PAGE_ONLY_MESSAGE);
  if (notFromApp) return notFromApp;

  const read = await readBody(request, MAX_BODY_BYTES);
  if ("refusal" in read) return read.refusal;
  const body = (typeof read.body === "object" && read.body !== null ? read.body : {}) as { giveUp?: unknown };
  if (body.giveUp !== true) {
    return NextResponse.json({ error: "Say that you give up the locked receipts ({ giveUp: true }). Nothing was moved." }, { status: 400 });
  }

  try {
    return NextResponse.json(startNewReceiptKey(process.env.DATABASE_URL, receiptLock()));
  } catch (error) {
    if (error instanceof ReceiptError) return NextResponse.json({ error: error.message }, { status: error.status });
    logRouteError("expenses/receipt/new-key", error);
    // Each move is a rename, and the key file goes last: whatever moved is in the backups folder, and
    // pressing again moves the rest (desktop/receipt-key.mjs setAsideLockedReceipts).
    return NextResponse.json(
      {
        error:
          "DotAmi couldn't move all the locked receipts aside. Nothing was deleted: any it moved are in the backups folder beside its data file, in a folder whose name starts with receipts-locked-. Try again.",
      },
      { status: 503 },
    );
  }
}
