import { NextResponse } from "next/server";

import { logRouteError } from "@/lib/api/log-error";
import { checkRateLimit, clientKeyFromRequest, rateLimitResponse, type RateLimitOptions } from "@/lib/api/rate-limit";
import { refuseUnlessFromAppPage } from "@/lib/figures/http";
import { VentureNotFoundError } from "@/lib/figures/store";

import { WatchedInputError, WatchedNotFoundError } from "./watched";
import { landscapeWords } from "./words";

export { readBody } from "@/lib/futures/http";

/**
 * Shared plumbing for the routes of "Businesses you're watching" (app/api/futures/[id]/watched/…). The list is
 * the person's own notes, read and changed by their own clicks, so every route, the read included, answers
 * only DotAmi's own window, the way the cockpit's writes do (lib/futures/http.ts): an outside program, the
 * Lens included, has no way to it yet. Each route counts in its own rate-limit bucket.
 */

/** DotAmi's own window first (nothing else is read), then the route's own rate limit. */
export function guardWatched(request: Request, bucket: string, limit: RateLimitOptions): Response | null {
  const notFromApp = refuseUnlessFromAppPage(request, landscapeWords.errors.pageOnly);
  if (notFromApp) return notFromApp;
  const result = checkRateLimit(`${bucket}:${clientKeyFromRequest(request)}`, limit);
  return result.allowed ? null : rateLimitResponse(result);
}

/**
 * Turns a storage error into the answer: the storage's own plain words for what it refused, 404 for an idea or
 * a business that isn't there, and for anything else only the error's name and code in the log (a database
 * error can quote what was being written, here a name or a note the person typed).
 */
export function watchedFailure(route: string, error: unknown): Response {
  if (error instanceof WatchedInputError) return NextResponse.json({ error: error.message }, { status: 400 });
  if (error instanceof WatchedNotFoundError || error instanceof VentureNotFoundError) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }
  logRouteError(route, error);
  return NextResponse.json({ error: "No database reachable — nothing was changed." }, { status: 503 });
}
