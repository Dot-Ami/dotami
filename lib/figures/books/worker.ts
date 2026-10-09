/**
 * [8h] The books worker: a GnuCash book's bytes in, its accounts and posted lines out.
 *
 * Reading a big book (up to 50 MB, 200 MB once unpacked) takes seconds; doing it here keeps the
 * window responsive, and lets read-book.ts stop a read that runs too long by ending the worker.
 * The script is served by DotAmi from /_next/static under the static files' own
 * Content-Security-Policy (next.config.mjs, workerPolicy: default-src 'none'), so nothing in this
 * thread can make a connection. It loads nothing else and logs nothing.
 */
import { answerBookMessage } from "./worker-answer";
import type { BookWorkerReply } from "./worker-protocol";

/** The bits of a dedicated worker's global scope this file uses (the project's TypeScript setup has the window's types, not a worker's). */
interface WorkerScope {
  onmessage: ((event: MessageEvent<unknown>) => void) | null;
  postMessage(message: BookWorkerReply): void;
  location: { origin: string };
}

const scope = globalThis as unknown as WorkerScope;

scope.onmessage = (event) => {
  // A dedicated worker only hears from the page that started it, and those messages carry an
  // empty origin. Anything that names a different origin isn't from DotAmi's page: ignore it.
  if (event.origin && event.origin !== scope.location.origin) return;
  const reply = answerBookMessage(event.data);
  if (reply) scope.postMessage(reply);
};
