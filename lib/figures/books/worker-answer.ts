/**
 * [8h] The books worker's one job, as a plain function so the tests can run it without a worker:
 * a message in, the reader's answer out (or null for a message that isn't a book to read).
 */
import { readGnuCashBook } from "./gnucash-xml";
import { BOOK_REPLY_LABEL, type BookWorkerReply } from "./worker-protocol";

export function answerBookMessage(data: unknown): BookWorkerReply | null {
  const bytes = (data as { bytes?: unknown } | null)?.bytes;
  if (!(bytes instanceof Uint8Array)) return null;
  // readGnuCashBook never throws: every failure is one of its fixed sentences.
  return { label: BOOK_REPLY_LABEL, result: readGnuCashBook(bytes) };
}
