import { failure } from "@/lib/api/route";
import { VentureNotFoundError } from "@/lib/figures/store";

import { WatchedInputError, WatchedNotFoundError } from "./watched";

/**
 * What the routes of "Businesses you're watching" (app/api/futures/[id]/watched/…) answer that is their
 * own. The list is the person's own notes, read and changed by their own clicks, so every route, the read
 * included, answers only DotAmi's own window (pageOnly with landscapeWords.errors.pageOnly, then the
 * route's own rate-limit bucket; lib/api/route.ts), the way the cockpit's writes do: an outside program,
 * the Lens included, has no way to it yet.
 */

/**
 * Turns a storage error into the answer: the storage's own plain words for what it refused, 404 for an idea or
 * a business that isn't there, and for anything else only the error's name and code in the log (a database
 * error can quote what was being written, here a name or a note the person typed).
 */
export function watchedFailure(route: string, error: unknown): Response {
  return failure(route, error, [
    [WatchedInputError, 400],
    [WatchedNotFoundError, 404],
    [VentureNotFoundError, 404],
  ]);
}
