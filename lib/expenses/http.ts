import { NextResponse } from "next/server";

import { logRouteError } from "@/lib/api/log-error";
import { checkRateLimit, clientKeyFromRequest, rateLimitResponse, type RateLimitOptions } from "@/lib/api/rate-limit";
import { VentureNotFoundError } from "@/lib/figures/store";

import { ExpenseInputError } from "./store";

/**
 * Shared plumbing for the /api/expenses routes, so each route file reads as its own rule. The
 * body reader and the "only DotAmi's own page" check are the figures routes' own (lib/figures/http.ts):
 * one definition of what counts as the app's page, for figures and expenses alike.
 */
export { readBody, refuseUnlessFromAppPage } from "@/lib/figures/http";

export const AGREE_ONLY_MESSAGE = "Only the agree prompt in DotAmi's window can confirm expense records.";

/** Rate limit for one route; a 429 response to return, or null to carry on. */
export function throttle(request: Request, route: string, options: RateLimitOptions): Response | null {
  const result = checkRateLimit(`expenses-${route}:${clientKeyFromRequest(request)}`, options);
  return result.allowed ? null : rateLimitResponse(result);
}

/**
 * Turns a store error into the response. Unknown failures log only the error's name and code
 * (logRouteError) — never the error itself, because a database error can carry the values being
 * written, and what the person paid, to whom and for what never goes in a log.
 */
export function storeErrorResponse(route: string, error: unknown): Response {
  if (error instanceof VentureNotFoundError) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }
  if (error instanceof ExpenseInputError) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  logRouteError(`expenses/${route}`, error);
  return NextResponse.json({ error: "No database reachable — nothing was changed." }, { status: 503 });
}

/** Pulls `ventureId` and a list of ids out of an agree/discard/retract body, or says what is wrong. */
export function parseIdsBody(body: unknown): { ventureId: string; expenseIds: unknown } | { error: string } {
  const b = (typeof body === "object" && body !== null ? body : {}) as { ventureId?: unknown; expenseIds?: unknown };
  if (typeof b.ventureId !== "string" || b.ventureId.length === 0) return { error: "Say which idea this is for." };
  return { ventureId: b.ventureId, expenseIds: b.expenseIds };
}
