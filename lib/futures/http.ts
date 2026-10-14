import { NextResponse } from "next/server";

import { readJsonWithLimit, rejectedResponse, RequestRejectedError } from "@/lib/api/body-limit";
import { logRouteError } from "@/lib/api/log-error";
import { checkRateLimit, clientKeyFromRequest, rateLimitResponse, type RateLimitOptions } from "@/lib/api/rate-limit";
import { refuseUnlessFromAppPage } from "@/lib/figures/http";
import { VentureNotFoundError } from "@/lib/figures/store";

import { FutureInputError } from "./types";

/**
 * Shared plumbing for the cockpit's routes (docs/architecture/future-cockpit.md § 2, "Cockpit screen as
 * built"), so each route file reads as its own rule. The writes are the person's own clicks (a status, a
 * tick, a month, a skill mark), so they answer only DotAmi's own window, as the settings routes do; an
 * agent's way to suggest one is the Lens's proposal, later.
 */

export const COCKPIT_PAGE_ONLY =
  "Your progress, your date, your pick of job and your skill marks can only be changed from DotAmi's own window. An outside agent can't change them yet.";

/** A write's guard: DotAmi's own window first (nothing else is read), then the rate limit. */
export function guardWrite(request: Request, route: string, limit: RateLimitOptions): Response | null {
  const notFromApp = refuseUnlessFromAppPage(request, COCKPIT_PAGE_ONLY);
  if (notFromApp) return notFromApp;
  const result = checkRateLimit(`${route}:${clientKeyFromRequest(request)}`, limit);
  return result.allowed ? null : rateLimitResponse(result);
}

/** A read's guard: the rate limit only, like the figures list. */
export function guardRead(request: Request, route: string, limit: RateLimitOptions): Response | null {
  const result = checkRateLimit(`${route}:${clientKeyFromRequest(request)}`, limit);
  return result.allowed ? null : rateLimitResponse(result);
}

/** Reads the JSON body through the shared guard (JSON only, size capped); a Response on refusal. */
export async function readBody(request: Request, maxBytes: number): Promise<{ body: unknown } | { refusal: Response }> {
  try {
    return { body: await readJsonWithLimit<unknown>(request, maxBytes) };
  } catch (error) {
    if (error instanceof RequestRejectedError) return { refusal: rejectedResponse(error) };
    return { refusal: NextResponse.json({ error: "Invalid JSON" }, { status: 400 }) };
  }
}

/**
 * Turns a storage error into the answer: the storage's own plain words for something it refused, 404 for
 * an idea that isn't there, and for anything else only the error's name and code in the log (a database
 * error can quote what was being written).
 */
export function futureFailure(route: string, error: unknown): Response {
  if (error instanceof FutureInputError) return NextResponse.json({ error: error.message }, { status: 400 });
  if (error instanceof VentureNotFoundError) return NextResponse.json({ error: error.message }, { status: 404 });
  logRouteError(route, error);
  return NextResponse.json({ error: "No database reachable — nothing was changed." }, { status: 503 });
}
