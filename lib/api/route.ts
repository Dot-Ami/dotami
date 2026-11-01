import { NextResponse } from "next/server";

import { readJsonWithLimit, rejectedResponse, RequestRejectedError } from "@/lib/api/body-limit";
import { logRouteError } from "@/lib/api/log-error";
import {
  checkRateLimit,
  clientKeyFromRequest,
  rateLimitResponse,
  type RateLimitOptions,
} from "@/lib/api/rate-limit";
import { launchGuardFromEnv, refuseWithoutLaunchSecret } from "@/lib/http/launch-secret";

/**
 * The few steps every API route takes before its own rule, written once: the rate limit, the "only
 * DotAmi's own window" check, reading the JSON body through the size and type guard, and turning a
 * store error into an answer. The pieces underneath are body-limit.ts, rate-limit.ts and log-error.ts
 * next to this file; until 2026-10-31 each domain's http.ts (figures, futures, expenses, landscape)
 * and nine routes wrote their own wrappers around them, so a fix to one copy could miss the others
 * (tests/route-helpers-one-copy.spec.ts now fails if a copy comes back).
 *
 * A domain's http.ts keeps only what is its own: the words a refused caller is told, and which of its
 * errors answer which status.
 */

/**
 * Counts the request against the route's own bucket; a 429 to return once the window's count is
 * spent, else null. `bucket` names the route ("figures-agree", "settings"…), and the caller's key is
 * added to it, so each route counts each caller on its own.
 */
export function throttle(
  bucket: string,
  request: Request,
  options: RateLimitOptions,
): Response | null {
  const result = checkRateLimit(`${bucket}:${clientKeyFromRequest(request)}`, options);
  return result.allowed ? null : rateLimitResponse(result);
}

/**
 * Returns a 403 unless this request comes from DotAmi's own page, else null. `message` is what a
 * refused caller is told; each route passes its own words.
 *
 * Two checks. First the launch secret (lib/http/launch-secret.ts), which middleware.ts already
 * demands of every request; checked here again so these routes stay closed even if the middleware's
 * matcher ever changed. In the desktop app only DotAmi's window carries it, so another program on
 * the computer (another Windows account's included) is refused, whatever headers it writes.
 *
 * Then `Sec-Fetch-Site`: browsers stamp every request with it, and the app's own page is
 * "same-origin". DotAmi's own agent paths (an importer, the Lens) calling the API send no such
 * header, so they can't do what only the person's own click may (confirm a figure, change a
 * setting, delete data). Honest limit: a program running as the
 * SAME Windows user can read the secret from the app's memory and write both headers; the privacy
 * review (docs/architecture/figures-privacy-review.md, "A program running as the person") says so.
 */
export function pageOnly(request: Request, message: string): Response | null {
  const noSecret = refuseWithoutLaunchSecret(request, launchGuardFromEnv(process.env));
  if (noSecret) return noSecret;
  if (request.headers.get("sec-fetch-site")?.trim().toLowerCase() === "same-origin") return null;
  return NextResponse.json({ error: message }, { status: 403 });
}

/**
 * Reads the JSON body through the shared guard (JSON only, from this site, size capped): the parsed
 * body, or a Response to return. A body that isn't JSON is told `invalidJson`; two older routes say
 * "Invalid JSON payload" there, and keep saying it.
 */
export async function readBody(
  request: Request,
  maxBytes: number,
  invalidJson = "Invalid JSON",
): Promise<{ body: unknown } | { refusal: Response }> {
  try {
    return { body: await readJsonWithLimit<unknown>(request, maxBytes) };
  } catch (error) {
    if (error instanceof RequestRejectedError) return { refusal: rejectedResponse(error) };
    return { refusal: NextResponse.json({ error: invalidJson }, { status: 400 }) };
  }
}

/**
 * Error classes a store throws, each with the status it answers with its own message. (`never[]`
 * so a class takes whatever arguments it likes: only `instanceof` is asked of it.)
 */
export type ErrorStatuses = ReadonlyArray<readonly [new (...args: never[]) => Error, number]>;

/**
 * Turns a store error into the answer: the store's own plain words for an error it named in
 * `statuses` (checked in order), and for anything else a 503 with only the error's name and code in
 * the log. Never the error itself: a database error can quote the values being written (a figure,
 * an expense, a name the person typed), and the log is a plain file on the person's computer
 * (docs/architecture/figures-privacy-review.md, rule 2). `route` is the log line's fixed label.
 */
export function failure(route: string, error: unknown, statuses: ErrorStatuses): Response {
  for (const [ErrorClass, status] of statuses) {
    if (error instanceof ErrorClass) return NextResponse.json({ error: error.message }, { status });
  }
  logRouteError(route, error);
  return NextResponse.json(
    { error: "No database reachable — nothing was changed." },
    { status: 503 },
  );
}
