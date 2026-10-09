import { NextResponse } from "next/server";

import { readJsonWithLimit, rejectedResponse, RequestRejectedError } from "@/lib/api/body-limit";
import { checkRateLimit, clientKeyFromRequest, rateLimitResponse, type RateLimitOptions } from "@/lib/api/rate-limit";

import { logRouteError } from "@/lib/api/log-error";

import { AccountInputError, AccountNotFoundError, BankRecordsOffError } from "./source-accounts";
import { FigureInputError, VentureNotFoundError } from "./store";

/** Shared plumbing for the /api/figures routes, so each route file reads as its own rule. */

export const AGREE_ONLY_MESSAGE = "Only the agree prompt in DotAmi's window can confirm figures.";

/** What a caller other than DotAmi's own page is told by the [8g] bank-sources routes. */
export const BANK_SOURCES_PAGE_ONLY =
  "Bank and card accounts can only be listed, allowed or taken back from DotAmi's own window. An outside agent can't reach them.";

/**
 * [8g] Turns a bank-sources store error into the answer. Anything unexpected logs only the error's
 * name and code: a database error can quote what was being written, and an account's name is the
 * person's own words.
 */
export function bankSourcesFailure(route: string, error: unknown): Response {
  if (error instanceof AccountInputError) return NextResponse.json({ error: error.message }, { status: 400 });
  if (error instanceof AccountNotFoundError) return NextResponse.json({ error: error.message }, { status: 404 });
  if (error instanceof BankRecordsOffError) return NextResponse.json({ error: error.message }, { status: 409 });
  logRouteError(route, error);
  return NextResponse.json({ error: "No database reachable — nothing was changed." }, { status: 503 });
}

/**
 * Returns a 403 unless this request comes from DotAmi's own page, else null.
 *
 * Browsers stamp every request with `Sec-Fetch-Site`, and the app's own page is "same-origin".
 * A script, an importer, the Lens or an outside agent calling the API with fetch/curl from a
 * program sends no such header, so it is refused. Honest limit: a program running on the same
 * computer can simply write that header itself. The privacy review
 * (docs/architecture/figures-privacy-review.md, "Another program on this computer") says such a
 * program already has the person's own trust — it can read the database file. What this does
 * stop is DotAmi's own agent paths confirming figures for the person, and anything that isn't
 * the app's page. `message` is what a refused caller is told; the settings routes pass their own.
 */
export function refuseUnlessFromAppPage(request: Request, message: string = AGREE_ONLY_MESSAGE): Response | null {
  if (request.headers.get("sec-fetch-site")?.trim().toLowerCase() === "same-origin") return null;
  return NextResponse.json({ error: message }, { status: 403 });
}

/** Rate limit for one route; a 429 response to return, or null to carry on. */
export function throttle(request: Request, route: string, options: RateLimitOptions): Response | null {
  const result = checkRateLimit(`figures-${route}:${clientKeyFromRequest(request)}`, options);
  return result.allowed ? null : rateLimitResponse(result);
}

/** Reads the JSON body through the shared guard; a Response to return on refusal, else the parsed body. */
export async function readBody(request: Request, maxBytes: number): Promise<{ body: unknown } | { refusal: Response }> {
  try {
    return { body: await readJsonWithLimit<unknown>(request, maxBytes) };
  } catch (error) {
    if (error instanceof RequestRejectedError) return { refusal: rejectedResponse(error) };
    return { refusal: NextResponse.json({ error: "Invalid JSON" }, { status: 400 }) };
  }
}

/**
 * Turns a store error into the response. Unknown failures log only the error's name and
 * code — never the error itself, because a database error can carry the values being written
 * and figures never go in a log (privacy review, rule 2).
 */
export function storeErrorResponse(route: string, error: unknown): Response {
  if (error instanceof VentureNotFoundError) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }
  if (error instanceof FigureInputError) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  const name = error instanceof Error ? error.name : "unknown";
  const code = typeof (error as { code?: unknown })?.code === "string" ? (error as { code: string }).code : "-";
  console.error(`[figures/${route}] failed (${name}, ${code})`);
  return NextResponse.json({ error: "No database reachable — nothing was changed." }, { status: 503 });
}

/** Pulls `ventureId` and a list of ids out of an agree/discard/retract body, or says what is wrong. */
export function parseIdsBody(body: unknown): { ventureId: string; figureIds: unknown } | { error: string } {
  const b = (typeof body === "object" && body !== null ? body : {}) as { ventureId?: unknown; figureIds?: unknown };
  if (typeof b.ventureId !== "string" || b.ventureId.length === 0) return { error: "Say which idea this is for." };
  return { ventureId: b.ventureId, figureIds: b.figureIds };
}
