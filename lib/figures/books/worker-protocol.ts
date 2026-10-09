/**
 * [8h] What the window and the books worker say to each other. Kept free of the reader itself, so
 * the window can import it without loading the unpacker and the XML reader into the page.
 */
import type { BookReadResult } from "./types";

/** Marks DotAmi's own reply, so nothing else said on the worker's channel is taken for one. */
export const BOOK_REPLY_LABEL = "dotami-book-reader";

/**
 * How long a read may take before the worker is stopped. An invented book of 167 MB of XML (near the
 * 200 MB unpacked limit) read in about four seconds in Node on a developer's laptop, so a minute
 * leaves room for a browser worker on a slow computer while still stopping a file that would keep a
 * thread busy for good.
 */
export const BOOK_READ_TIMEOUT_MS = 60_000;

/** The window → worker message: the book's bytes, moved (not copied) into the worker. */
export interface BookWorkerRequest {
  bytes: Uint8Array;
}

/** The worker → window reply: exactly one per request. */
export interface BookWorkerReply {
  label: typeof BOOK_REPLY_LABEL;
  result: BookReadResult;
}
