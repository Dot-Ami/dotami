import { NextResponse } from "next/server";

import { logRouteError } from "@/lib/api/log-error";
import { receiptsFolder, sweepOrphanReceipts, type SweepResult } from "@/lib/expenses/receipts/store";
import { readBody, refuseUnlessFromAppPage, throttle } from "@/lib/figures/http";
import { prisma } from "@/lib/prisma";
import { DeleteInputError, deleteData, finishWipe } from "@/lib/privacy/delete";
import { databaseFilePath } from "@/lib/settings/today";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Deleting is rare and slow (the wipe rebuilds the file); a handful a minute is plenty.
const RATE_LIMIT = { limit: 10, windowMs: 60_000 };
// A list of kinds and a count per table: a few hundred bytes. 8 KB leaves room and no more.
const MAX_BODY_BYTES = 8 * 1024;

const PAGE_ONLY_MESSAGE =
  "Only DotAmi's own window can delete your data. An agent or another program can't, and nothing was deleted.";

/**
 * POST /api/your-data/delete
 *
 *   { kinds: ["statements", ...], seen: { PersonStatement: 3, ... } }  deletes the ticked kinds
 *   { retryWipe: true }                                                 finishes the wipe (and any safety
 *                                                                       copies and set-aside receipt folders
 *                                                                       an earlier Delete still owes)
 *
 * Answers only to DotAmi's own page: whether an agent may ever delete is a later decision, so like
 * agreeing to a figure it is the person's click and nothing else's (refuseUnlessFromAppPage). The
 * page has already asked twice; `seen` is what it showed, and a mismatch deletes nothing (409).
 * Nothing here goes in a URL or the log beyond the error's name and code.
 */
export async function POST(request: Request) {
  const limited = throttle(request, "your-data-delete", RATE_LIMIT);
  if (limited) return limited;

  const notFromApp = refuseUnlessFromAppPage(request, PAGE_ONLY_MESSAGE);
  if (notFromApp) return notFromApp;

  const read = await readBody(request, MAX_BODY_BYTES);
  if ("refusal" in read) return read.refusal;
  const body = (typeof read.body === "object" && read.body !== null ? read.body : {}) as {
    kinds?: unknown;
    seen?: unknown;
    retryWipe?: unknown;
  };

  // The data file this server uses: the safety copies and the wipe-pending note sit beside it.
  const files = { dataFile: databaseFilePath(process.env.DATABASE_URL) };
  try {
    if (body.retryWipe === true) {
      return NextResponse.json(await finishWipe(prisma, files));
    }
    const result = await deleteData(prisma, { kinds: body.kinds, seen: body.seen }, files);
    if (result.status === "deleted" && "Receipt" in result.deleted) {
      // The rows are gone (deleted, or taken with their records); now the files they described. A
      // file that can't go yet is counted, said on the page, and removed by the next sweep. Null when
      // the folder couldn't be read at all.
      let receiptFiles: SweepResult | null;
      try {
        receiptFiles = await sweepOrphanReceipts(prisma, receiptsFolder());
      } catch (error) {
        logRouteError("your-data/delete receipt files", error);
        receiptFiles = null;
      }
      return NextResponse.json({ ...result, receiptFiles });
    }
    if (result.status === "changed") {
      return NextResponse.json(
        {
          error: "Something changed in your data since you looked, so nothing was deleted. Check the counts again.",
          counts: result.counts,
        },
        { status: 409 },
      );
    }
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof DeleteInputError) return NextResponse.json({ error: error.message }, { status: 400 });
    logRouteError("your-data/delete", error);
    return NextResponse.json({ error: "The data file couldn't be reached, so nothing was deleted." }, { status: 503 });
  }
}
